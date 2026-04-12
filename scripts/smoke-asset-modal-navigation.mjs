import process from 'node:process';

const DEFAULTS = {
  cdpUrl: 'http://127.0.0.1:9222',
  matchUrl: 'localhost:5173',
  gotoUrl: 'http://localhost:5173/marketplace',
  timeoutMs: 10_000,
  settleMs: 1_200,
  assetTitle: '',
};

function parseArgs(argv) {
  const options = { ...DEFAULTS };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--cdp-url') {
      options.cdpUrl = String(argv[index + 1] || options.cdpUrl);
      index += 1;
      continue;
    }
    if (arg === '--match-url') {
      options.matchUrl = String(argv[index + 1] || options.matchUrl);
      index += 1;
      continue;
    }
    if (arg === '--goto') {
      options.gotoUrl = String(argv[index + 1] || options.gotoUrl);
      index += 1;
      continue;
    }
    if (arg === '--timeout-ms') {
      const parsed = Number(argv[index + 1]);
      if (Number.isFinite(parsed) && parsed > 0) options.timeoutMs = parsed;
      index += 1;
      continue;
    }
    if (arg === '--settle-ms') {
      const parsed = Number(argv[index + 1]);
      if (Number.isFinite(parsed) && parsed > 0) options.settleMs = parsed;
      index += 1;
      continue;
    }
    if (arg === '--asset-title') {
      options.assetTitle = String(argv[index + 1] || '').trim();
      index += 1;
    }
  }

  return options;
}

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while requesting ${url}`);
  }
  return response.json();
}

class CdpSession {
  constructor(webSocketUrl, timeoutMs) {
    this.webSocketUrl = webSocketUrl;
    this.timeoutMs = timeoutMs;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl);

    this.socket.addEventListener('message', (event) => {
      const payload = JSON.parse(String(event.data || '{}'));
      if (!payload.id) return;
      const entry = this.pending.get(payload.id);
      if (!entry) return;
      this.pending.delete(payload.id);
      clearTimeout(entry.timer);
      if (payload.error) {
        entry.reject(new Error(payload.error.message || `CDP error on ${entry.method}`));
        return;
      }
      entry.resolve(payload.result || {});
    });

    this.socket.addEventListener('close', () => {
      for (const [id, entry] of this.pending.entries()) {
        clearTimeout(entry.timer);
        entry.reject(new Error(`CDP socket closed before response for ${entry.method} (${id})`));
      }
      this.pending.clear();
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out connecting to ${this.webSocketUrl}`)), this.timeoutMs);
      this.socket.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.socket.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error(`Failed to connect to ${this.webSocketUrl}`));
      }, { once: true });
    });
  }

  async send(method, params = {}, sessionId = null) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('CDP socket is not open');
    }

    const id = this.nextId;
    this.nextId += 1;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for ${method}`));
      }, this.timeoutMs);

      this.pending.set(id, { resolve, reject, timer, method });
      this.socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    });
  }

  async close() {
    if (!this.socket) return;
    if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
      await new Promise((resolve) => {
        this.socket.addEventListener('close', () => resolve(), { once: true });
        this.socket.close();
      });
    }
  }
}

async function openTargetSession(browserWebSocketUrl, selectedTarget, timeoutMs) {
  const browserSession = new CdpSession(browserWebSocketUrl, timeoutMs);
  await browserSession.connect();
  await browserSession.send('Target.activateTarget', {
    targetId: selectedTarget.id,
  });
  const attachment = await browserSession.send('Target.attachToTarget', {
    targetId: selectedTarget.id,
    flatten: true,
  });

  const sessionId = attachment.sessionId || null;
  if (!sessionId) {
    await browserSession.close();
    throw new Error(`Failed to attach to target ${selectedTarget.id}.`);
  }

  await browserSession.send('Page.enable', {}, sessionId);
  await browserSession.send('Runtime.enable', {}, sessionId);
  await browserSession.send('Page.bringToFront', {}, sessionId);
  await sleep(200);

  return {
    connection: browserSession,
    sessionId,
  };
}

async function evaluateJson(targetSession, expression) {
  const result = await targetSession.connection.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, targetSession.sessionId);
  return result.result?.value;
}

async function inspect(session) {
  return evaluateJson(session, `(() => {
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const readLabel = (element) => normalize(
      element.textContent ||
      element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      element.value ||
      ''
    );

    return {
      href: location.href,
      title: document.title,
      headings: Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]'))
        .filter(isVisible)
        .map(readLabel)
        .filter(Boolean)
        .slice(0, 20),
      buttons: Array.from(document.querySelectorAll('button, [role="button"], a'))
        .filter(isVisible)
        .map(readLabel)
        .filter(Boolean)
        .slice(0, 40),
      bodyExcerpt: normalize(document.body?.innerText || '').slice(0, 1200),
    };
  })()`);
}

async function waitFor(session, label, predicateExpression, timeoutMs, intervalMs = 250) {
  const startedAt = Date.now();
  let lastValue = null;
  while ((Date.now() - startedAt) < timeoutMs) {
    lastValue = await evaluateJson(session, predicateExpression);
    if (lastValue?.ok) {
      return lastValue;
    }
    await sleep(intervalMs);
  }
  throw new Error(`${label} timed out: ${JSON.stringify(lastValue)}`);
}

async function clickMarketplaceCard(session, assetTitle = '') {
  return evaluateJson(session, `(() => {
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const simplify = (value) => normalize(value).toLowerCase();
    const wanted = simplify(${JSON.stringify(assetTitle)});
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const cards = Array.from(document.querySelectorAll('.search-result-card-grid, .search-result-card-list')).filter(isVisible);
    const target = (wanted
      ? cards.find((card) => simplify(card.innerText).includes(wanted))
      : null) || cards[0];
    if (!target) {
      return { ok: false, reason: 'card_not_found' };
    }

    target.scrollIntoView({ block: 'center', inline: 'center' });
    const text = normalize(target.innerText);
    target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, composed: true }));
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true }));
    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, composed: true }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
    if (typeof target.click === 'function') {
      target.click();
    }
    return {
      ok: true,
      text: text.slice(0, 240),
    };
  })()`);
}

async function clickSellerProfile(session) {
  return evaluateJson(session, `(() => {
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const contactButton = Array.from(document.querySelectorAll('button[aria-label="Contact seller"], button[title="Contact seller"]'))
      .find(isVisible);
    if (!contactButton) {
      return { ok: false, reason: 'contact_seller_button_not_found' };
    }

    const profileButton = contactButton.previousElementSibling;
    if (!(profileButton instanceof HTMLElement) || !isVisible(profileButton)) {
      return { ok: false, reason: 'seller_profile_button_not_found' };
    }

    const label = normalize(profileButton.innerText);
    profileButton.scrollIntoView({ block: 'center', inline: 'center' });
    profileButton.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, composed: true }));
    profileButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true }));
    profileButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, composed: true }));
    profileButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
    profileButton.click?.();

    return {
      ok: true,
      label,
    };
  })()`);
}

async function clickViewSellerReviews(session) {
  return evaluateJson(session, `(() => {
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const button = Array.from(document.querySelectorAll('button'))
      .find((element) => isVisible(element) && normalize(element.innerText) === 'View Seller Reviews');
    if (!button) {
      return { ok: false, reason: 'view_seller_reviews_button_not_found' };
    }

    button.scrollIntoView({ block: 'center', inline: 'center' });
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
    button.click?.();
    return {
      ok: true,
      label: normalize(button.innerText),
    };
  })()`);
}

async function clickButtonByText(session, label) {
  return evaluateJson(session, `(() => {
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const targetLabel = normalize(${JSON.stringify('')} + ${JSON.stringify(label)});
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const button = Array.from(document.querySelectorAll('button, [role="button"], a'))
      .find((element) => isVisible(element) && normalize(element.innerText || element.getAttribute('aria-label') || element.getAttribute('title')) === targetLabel);
    if (!button) {
      return { ok: false, reason: 'button_not_found', label: targetLabel };
    }

    button.scrollIntoView({ block: 'center', inline: 'center' });
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
    button.click?.();
    return {
      ok: true,
      label: targetLabel,
    };
  })()`);
}

async function clickContactSeller(session) {
  return evaluateJson(session, `(() => {
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const button = Array.from(document.querySelectorAll('button[aria-label="Contact seller"], button[title="Contact seller"]'))
      .find(isVisible);
    if (!button) {
      return { ok: false, reason: 'contact_seller_button_not_found' };
    }

    button.scrollIntoView({ block: 'center', inline: 'center' });
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
    button.click?.();
    return {
      ok: true,
      label: button.getAttribute('aria-label') || button.getAttribute('title') || 'Contact seller',
    };
  })()`);
}

async function navigate(session, href, settleMs) {
  await session.connection.send('Page.navigate', { url: href }, session.sessionId);
  await sleep(settleMs);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cdpBase = normalizeBaseUrl(options.cdpUrl);
  const version = await fetchJson(`${cdpBase}/json/version`);
  let targets = await fetchJson(`${cdpBase}/json/list`);
  let selectedTarget = targets.find((target) => target.type === 'page' && String(target.url || '').includes(options.matchUrl)) || null;

  if (!selectedTarget) {
    await fetchJson(`${cdpBase}/json/new?${encodeURIComponent(options.gotoUrl)}`);
    await sleep(500);
    targets = await fetchJson(`${cdpBase}/json/list`);
    selectedTarget = targets.find((target) => target.type === 'page' && String(target.url || '').includes(options.matchUrl)) || null;
  }

  if (!selectedTarget) {
    throw new Error(`No Chrome page target matched ${options.matchUrl}`);
  }

  const session = await openTargetSession(version.webSocketDebuggerUrl, selectedTarget, options.timeoutMs);
  const summary = {
    marketplaceCard: null,
    assetHref: null,
    sellerProfile: null,
    sellerReviews: null,
    contactSeller: null,
    finalInspect: null,
  };

  try {
    await navigate(session, options.gotoUrl, options.settleMs);
    await waitFor(
      session,
      'marketplace cards',
      `(() => ({ ok: document.querySelector('.search-result-card-grid, .search-result-card-list') !== null, href: location.href }))()`,
      options.timeoutMs,
    );

    summary.marketplaceCard = await clickMarketplaceCard(session, options.assetTitle);
    if (!summary.marketplaceCard?.ok) {
      throw new Error(`Unable to click marketplace card: ${JSON.stringify(summary.marketplaceCard)}`);
    }

    const openedAsset = await waitFor(
      session,
      'asset details route',
      `(() => ({ ok: location.pathname.startsWith('/asset/'), href: location.href, title: document.title }))()`,
      options.timeoutMs,
    );
    summary.assetHref = openedAsset.href;
    await sleep(options.settleMs);

    const profileClick = await clickSellerProfile(session);
    if (!profileClick?.ok) {
      throw new Error(`Seller profile click failed: ${JSON.stringify(profileClick)}`);
    }
    const profileNav = await waitFor(
      session,
      'profile route',
      `(() => ({ ok: location.pathname.startsWith('/profile/'), href: location.href, title: document.title }))()`,
      options.timeoutMs,
    );
    summary.sellerProfile = {
      click: profileClick,
      route: profileNav,
    };

    await navigate(session, summary.assetHref, options.settleMs);
    await waitFor(
      session,
      'return to asset details',
      `(() => ({ ok: location.pathname.startsWith('/asset/'), href: location.href }))()`,
      options.timeoutMs,
    );

    const detailsTabClick = await clickButtonByText(session, 'Details');
    if (!detailsTabClick?.ok) {
      throw new Error(`Details tab click failed: ${JSON.stringify(detailsTabClick)}`);
    }
    await sleep(600);

    const reviewsClick = await clickViewSellerReviews(session);
    if (!reviewsClick?.ok) {
      throw new Error(`Seller reviews click failed: ${JSON.stringify(reviewsClick)}`);
    }
    const reviewsNav = await waitFor(
      session,
      'profile reviews route',
      `(() => {
        const params = new URLSearchParams(location.search);
        return {
          ok: location.pathname.startsWith('/profile/') && params.get('tab') === 'reviews',
          href: location.href,
          title: document.title,
        };
      })()`,
      options.timeoutMs,
    );
    summary.sellerReviews = {
      click: reviewsClick,
      route: reviewsNav,
    };

    await navigate(session, summary.assetHref, options.settleMs);
    await waitFor(
      session,
      'return to asset details again',
      `(() => ({ ok: location.pathname.startsWith('/asset/'), href: location.href }))()`,
      options.timeoutMs,
    );

    const contactClick = await clickContactSeller(session);
    if (!contactClick?.ok) {
      throw new Error(`Contact seller click failed: ${JSON.stringify(contactClick)}`);
    }
    const messagesNav = await waitFor(
      session,
      'messages route',
      `(() => ({ ok: location.pathname === '/messages', href: location.href, title: document.title, body: (document.body?.innerText || '').slice(0, 600) }))()`,
      options.timeoutMs,
    );
    summary.contactSeller = {
      click: contactClick,
      route: messagesNav,
    };

    summary.finalInspect = await inspect(session);
    console.log(JSON.stringify({ ok: true, summary }, null, 2));
  } finally {
    await session.connection.close();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
});
