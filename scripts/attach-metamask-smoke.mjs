import process from 'node:process';

const DEFAULT_WALLET_REQUEST_TIMEOUT_MS = 20_000;
const DEFAULT_SMOKE_TIMEOUT_MS = 12_000;

const CHAIN_PRESETS = {
  '97': {
    chainId: 97,
    hexChainId: '0x61',
    chainName: 'BNB Smart Chain Testnet',
    nativeCurrency: {
      name: 'tBNB',
      symbol: 'tBNB',
      decimals: 18,
    },
    rpcUrls: ['https://data-seed-prebsc-1-s1.bnbchain.org:8545/'],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
  },
};

const CONNECTED_SMOKE_PAGES = [
  {
    label: 'Orders',
    acceptGroups: [
      ['Search by Order ID...', 'Filter Status'],
      ['Total Orders', 'Active Escrow'],
      ['Order Summary', 'Total Orders'],
    ],
  },
  {
    label: 'Insights',
    acceptGroups: [
      ['Insights', 'Order Activity'],
      ['Order Activity', 'How To Read This'],
      ['Order Activity', 'Status Breakdown'],
    ],
  },
  {
    label: 'Messages',
    acceptGroups: [
      ['Messages', 'Search conversations'],
      ['Messages', 'No Conversation Selected'],
      ['Unlock Secure Messages', 'Protected Area'],
    ],
  },
];

const PROTECTED_MINT_FORM_MARKERS = ['Asset Name', 'Description', 'Price', 'Mint Asset'];
const PROTECTED_MINT_SUCCESS_GROUPS = [
  ['Asset minted successfully!', 'View Assets'],
  ['Marketplace sync is still pending.', 'View Assets'],
  ['View Assets', 'View Tx'],
];
const METAMASK_ACTION_LABELS = ['Next', 'Connect', 'Sign', 'Approve', 'Confirm'];

function parseArgs(argv) {
  const options = {
    cdpUrl: 'http://127.0.0.1:9222',
    matchUrl: '127.0.0.1:4173',
    gotoUrl: '',
    listOnly: false,
    targetId: '',
    timeoutMs: 5000,
    ensureChainId: null,
    smokeConnected: false,
    walletRequestTimeoutMs: DEFAULT_WALLET_REQUEST_TIMEOUT_MS,
    smokeTimeoutMs: DEFAULT_SMOKE_TIMEOUT_MS,
    inspectTarget: false,
    clickText: '',
    smokeProtectedMint: false,
  };

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
      options.gotoUrl = String(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (arg === '--target-id') {
      options.targetId = String(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (arg === '--timeout-ms') {
      const parsed = Number(argv[index + 1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.timeoutMs = parsed;
      }
      index += 1;
      continue;
    }
    if (arg === '--ensure-chain') {
      options.ensureChainId = parseChainOption(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--wallet-request-timeout-ms') {
      const parsed = Number(argv[index + 1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.walletRequestTimeoutMs = parsed;
      }
      index += 1;
      continue;
    }
    if (arg === '--smoke-timeout-ms') {
      const parsed = Number(argv[index + 1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.smokeTimeoutMs = parsed;
      }
      index += 1;
      continue;
    }
    if (arg === '--list') {
      options.listOnly = true;
      continue;
    }
    if (arg === '--smoke-connected') {
      options.smokeConnected = true;
      continue;
    }
    if (arg === '--inspect-target') {
      options.inspectTarget = true;
      continue;
    }
    if (arg === '--smoke-protected-mint') {
      options.smokeProtectedMint = true;
      continue;
    }
    if (arg === '--click-text') {
      options.clickText = String(argv[index + 1] || '');
      index += 1;
    }
  }

  return options;
}

function parseChainOption(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'bnb-testnet' || normalized === 'bsc-testnet' || normalized === 'mainnet-v3') {
    return 97;
  }

  const parsed = Number(normalized);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return null;
}

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to reach Chrome DevTools endpoint at ${url}. ${reason}. ` +
      'If Chrome was launched while another instance already owned the same profile, the remote-debugging flag may have been ignored. Close all Chrome windows for that profile and relaunch.',
    );
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while requesting ${url}`);
  }
  return response.json();
}

async function createTarget(baseUrl, targetUrl) {
  const targetParam = encodeURIComponent(targetUrl);
  const candidateRequests = [
    { method: 'PUT' },
    undefined,
  ];

  let lastError = null;
  for (const init of candidateRequests) {
    try {
      const response = await fetch(`${baseUrl}/json/new?${targetParam}`, init);
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} while requesting ${baseUrl}/json/new`);
        continue;
      }
      return response.json();
    } catch (error) {
      lastError = error;
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Failed to create a Chrome target for ${targetUrl}. ${reason}`);
}

function selectTarget(targets, options) {
  const pageTargets = targets.filter((target) => target.type === 'page');
  if (options.targetId) {
    return pageTargets.find((target) => target.id === options.targetId) || null;
  }
  if (options.matchUrl) {
    return pageTargets.find((target) => String(target.url || '').includes(options.matchUrl)) || null;
  }
  return pageTargets[0] || null;
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
    if (typeof WebSocket !== 'function') {
      throw new Error('Global WebSocket is not available in this Node runtime. Use Node 22+ or install a WebSocket client.');
    }

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
  if (String(selectedTarget.url || '').startsWith('chrome-extension://') && selectedTarget.webSocketDebuggerUrl) {
    const directSession = new CdpSession(selectedTarget.webSocketDebuggerUrl, timeoutMs);
    await directSession.connect();
    try {
      await directSession.send('Page.bringToFront');
    } catch {
      // Some extension pages do not expose Page.bringToFront.
    }
    return {
      connection: directSession,
      sessionId: null,
      mode: 'page-direct',
    };
  }

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

  await browserSession.send('Page.bringToFront', {}, sessionId);
  try {
    await browserSession.send('Runtime.runIfWaitingForDebugger', {}, sessionId);
  } catch {
    // Ignore targets that are not waiting for a debugger.
  }
  try {
    await browserSession.send('Debugger.enable', {}, sessionId);
    await browserSession.send('Debugger.resume', {}, sessionId);
  } catch {
    // Ignore targets that are not currently paused.
  }
  await sleep(250);

  return {
    connection: browserSession,
    sessionId,
    mode: 'browser-attached',
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

async function inspectWalletState(session) {
  return evaluateJson(session, `(() => ({
    href: location.href,
    title: document.title,
    readyState: document.readyState,
    hasEthereum: !!window.ethereum,
    isMetaMask: !!window.ethereum?.isMetaMask,
    selectedAddress: window.ethereum?.selectedAddress ?? null,
    chainId: window.ethereum?.chainId ?? null,
    accounts: Array.isArray(window.ethereum?.accounts) ? window.ethereum.accounts : null,
    navItems: Array.from(document.querySelectorAll('aside nav button, aside nav a'))
      .map((element) => (element.textContent || element.getAttribute('title') || '').trim())
      .filter(Boolean)
      .slice(0, 20),
  }))()`);
}

async function findClickableByText(session, selectors, label) {
  return evaluateJson(session, `(() => {
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const simplify = (value) => normalize(value).toLowerCase();
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const targetLabel = ${JSON.stringify(label)};
    const simplifiedTargetLabel = simplify(targetLabel);
    const candidates = Array.from(document.querySelectorAll(${JSON.stringify(selectors)})).filter(isVisible);
    const matchesTarget = (candidate) => Boolean(candidate) && (
      candidate === simplifiedTargetLabel ||
      candidate.includes(simplifiedTargetLabel) ||
      simplifiedTargetLabel.includes(candidate)
    );
    const target = candidates.find((element) => {
      const visibleText = normalize(
        element.textContent ||
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.value ||
        ''
      );
      const fallbackTitle = normalize(element.getAttribute('title'));
      const simplifiedVisibleText = simplify(visibleText);
      const simplifiedFallbackTitle = simplify(fallbackTitle);
      return (
        visibleText === targetLabel ||
        fallbackTitle === targetLabel ||
        matchesTarget(simplifiedVisibleText) ||
        matchesTarget(simplifiedFallbackTitle)
      );
    });

    if (!target) {
      return {
        ok: false,
        available: candidates
          .map((element) => normalize(element.textContent) || normalize(element.getAttribute('title')))
          .filter(Boolean)
          .slice(0, 20),
      };
    }

    target.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = target.getBoundingClientRect();
    const clickId = 'copilot-click-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    target.setAttribute('data-copilot-click-id', clickId);

    return {
      ok: true,
      label: normalize(
        target.textContent ||
        target.getAttribute('aria-label') ||
        target.getAttribute('title') ||
        target.value ||
        targetLabel
      ),
      tagName: target.tagName,
      x: Math.round(rect.left + (rect.width / 2)),
      y: Math.round(rect.top + (rect.height / 2)),
      clickId,
    };
  })()`);
}

async function dispatchClick(session, point) {
  const dispatchMouseClick = async () => {
    await session.connection.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: point.x,
      y: point.y,
      buttons: 0,
    }, session.sessionId);
    await session.connection.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: point.x,
      y: point.y,
      button: 'left',
      clickCount: 1,
      buttons: 1,
    }, session.sessionId);
    await session.connection.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: point.x,
      y: point.y,
      button: 'left',
      clickCount: 1,
      buttons: 0,
    }, session.sessionId);
  };

  if (session.mode === 'page-direct') {
    await dispatchMouseClick();
    return {
      ok: true,
      label: point.label,
      tagName: point.tagName,
      x: point.x,
      y: point.y,
    };
  }

  try {
    await dispatchMouseClick();
    if (point.clickId) {
      await evaluateJson(session, `(() => {
        const target = document.querySelector('[data-copilot-click-id="${point.clickId}"]');
        target?.focus?.();
        target?.click?.();
        target?.removeAttribute('data-copilot-click-id');
        return true;
      })()`);
    }

    return {
      ok: true,
      label: point.label,
      tagName: point.tagName,
      x: point.x,
      y: point.y,
      clickId: point.clickId,
    };
  } catch {
    return evaluateJson(session, `(() => {
    const x = ${JSON.stringify(point.x)};
    const y = ${JSON.stringify(point.y)};
    const fallbackLabel = ${JSON.stringify(point.label || '')};
    const clickId = ${JSON.stringify(point.clickId || '')};
    const target = clickId
      ? document.querySelector('[data-copilot-click-id="' + clickId + '"]')
      : document.elementFromPoint(x, y);
    if (!target) {
      return {
        ok: false,
        reason: clickId ? 'target_not_found_by_click_id' : 'target_not_found_at_point',
        x,
        y,
        clickId,
      };
    }

    const fire = (type, EventCtor, extra = {}) => {
      target.dispatchEvent(new EventCtor(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: x,
        clientY: y,
        ...extra,
      }));
    };

    setTimeout(() => {
      target.focus?.();
      fire('pointerdown', PointerEvent, { button: 0, buttons: 1, pointerType: 'mouse' });
      fire('mousedown', MouseEvent, { button: 0, buttons: 1 });
      fire('pointerup', PointerEvent, { button: 0, buttons: 0, pointerType: 'mouse' });
      fire('mouseup', MouseEvent, { button: 0, buttons: 0 });
      fire('click', MouseEvent, { button: 0, buttons: 0 });
      if (typeof target.click === 'function') {
        target.click();
      }
      target.removeAttribute?.('data-copilot-click-id');
    }, 50);

    return {
      ok: true,
      label: String(target.textContent || target.getAttribute('aria-label') || target.getAttribute('title') || fallbackLabel || '').replace(/\s+/g, ' ').trim(),
      tagName: target.tagName,
      x,
      y,
      clickId,
    };
    })()`);
  }
}

async function clickNavItem(session, label) {
  const target = await findClickableByText(session, 'aside nav button, aside nav a', label);
  if (!target?.ok) {
    return target;
  }
  return dispatchClick(session, target);
}

async function clickText(session, label) {
  const target = await findClickableByText(session, 'button, [role="button"], a, input[type="button"], input[type="submit"]', label);
  if (!target?.ok) {
    return target;
  }
  return dispatchClick(session, target);
}

async function clickAnyText(session, labels) {
  for (const label of labels) {
    const result = await clickText(session, label);
    if (result?.ok) {
      return {
        ...result,
        matchedLabel: label,
      };
    }
  }

  return {
    ok: false,
    requested: labels,
  };
}

async function findFieldByLabel(session, label) {
  return evaluateJson(session, `(() => {
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const simplify = (value) => normalize(value).toLowerCase();
    const targetLabel = ${JSON.stringify(label)};
    const simplifiedTargetLabel = simplify(targetLabel);
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const readAssociatedLabel = (element) => {
      const directLabels = element.labels ? Array.from(element.labels).map((node) => node.textContent || '') : [];
      const fallbackLabels = [
        element.getAttribute('placeholder'),
        element.getAttribute('aria-label'),
        element.name,
        element.id,
        element.type,
      ];
      const containerLabels = [];
      let current = element.parentElement;
      let depth = 0;
      while (current && depth < 4) {
        containerLabels.push(
          ...Array.from(current.children)
            .filter((node) => node.tagName === 'LABEL')
            .map((node) => node.textContent || '')
        );

        let sibling = current.previousElementSibling;
        let siblingDepth = 0;
        while (sibling && siblingDepth < 3) {
          if (sibling.tagName === 'LABEL') {
            containerLabels.push(sibling.textContent || '');
          } else {
            const nestedLabel = sibling.querySelector?.('label');
            if (nestedLabel) {
              containerLabels.push(nestedLabel.textContent || '');
            }
          }
          sibling = sibling.previousElementSibling;
          siblingDepth += 1;
        }

        current = current.parentElement;
        depth += 1;
      }
      return normalize([...directLabels, ...fallbackLabels, ...containerLabels].filter(Boolean).join(' '));
    };
    const matchesTarget = (candidate) => Boolean(candidate) && (
      candidate === simplifiedTargetLabel ||
      candidate.includes(simplifiedTargetLabel) ||
      simplifiedTargetLabel.includes(candidate)
    );
    const candidates = Array.from(document.querySelectorAll('input, textarea'))
      .filter((element) => isVisible(element) && !element.disabled && !element.readOnly);
    const field = candidates.find((element) => matchesTarget(simplify(readAssociatedLabel(element))));

    if (!field) {
      return {
        ok: false,
        available: candidates.map((element) => readAssociatedLabel(element)).filter(Boolean).slice(0, 20),
      };
    }

    const fillId = 'copilot-fill-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    field.setAttribute('data-copilot-fill-id', fillId);
    field.scrollIntoView({ block: 'center', inline: 'center' });

    return {
      ok: true,
      fillId,
      tagName: field.tagName,
      type: field.getAttribute('type') || '',
      label: readAssociatedLabel(field),
    };
  })()`);
}

async function fillField(session, label, value) {
  const field = await findFieldByLabel(session, label);
  if (!field?.ok || !field.fillId) {
    return field;
  }

  return evaluateJson(session, `(() => {
    const fillId = ${JSON.stringify(field.fillId)};
    const nextValue = ${JSON.stringify(String(value))};
    const target = document.querySelector('[data-copilot-fill-id="' + fillId + '"]');
    if (!target) {
      return { ok: false, reason: 'field_not_found', fillId };
    }

    const prototype = target.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor?.set?.call(target, nextValue);
    target.focus?.();
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    target.blur?.();
    target.removeAttribute('data-copilot-fill-id');

    return {
      ok: true,
      label: ${JSON.stringify(label)},
      value: nextValue,
    };
  })()`);
}

async function inspectTargetContent(session) {
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
      title: document.title,
      href: location.href,
      readyState: document.readyState,
      headings: Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]'))
        .filter(isVisible)
        .map(readLabel)
        .filter(Boolean)
        .slice(0, 20),
      buttons: Array.from(document.querySelectorAll('button, [role="button"], a, input[type="button"], input[type="submit"]'))
        .filter(isVisible)
        .map(readLabel)
        .filter(Boolean)
        .slice(0, 40),
      inputs: Array.from(document.querySelectorAll('input, textarea'))
        .filter(isVisible)
        .map((element) => normalize(element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.name || element.id || element.type || ''))
        .filter(Boolean)
        .slice(0, 20),
      bodyExcerpt: normalize(document.body?.innerText || '').slice(0, 1000),
    };
  })()`);
}

function normalizeLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function extensionTargetCandidates(targets) {
  return targets.filter((target) => target.type === 'page' && String(target.url || '').startsWith('chrome-extension://'));
}

async function findMetaMaskActionTarget(cdpBase, browserWebSocketUrl, timeoutMs) {
  const startedAt = Date.now();
  let lastTargets = [];

  while (Date.now() - startedAt < timeoutMs) {
    lastTargets = extensionTargetCandidates(await fetchJson(`${cdpBase}/json/list`));

    for (const target of [...lastTargets].reverse()) {
      let popupSession = null;
      try {
        popupSession = await openTargetSession(browserWebSocketUrl, target, Math.max(timeoutMs, 5000));
        const inspect = await inspectTargetContent(popupSession);
        const availableButtons = Array.isArray(inspect?.buttons) ? inspect.buttons : [];
        const matchedAction = METAMASK_ACTION_LABELS.find((label) =>
          availableButtons.some((buttonLabel) => normalizeLabel(buttonLabel).includes(normalizeLabel(label)))
        );

        if (matchedAction) {
          return {
            ok: true,
            target: { id: target.id, title: target.title, url: target.url },
            inspect,
            matchedAction,
            popupSession,
          };
        }
      } catch {
        if (popupSession) {
          await popupSession.connection.close().catch(() => {});
        }
        popupSession = null;
      }

      if (popupSession) {
        await popupSession.connection.close().catch(() => {});
      }
    }

    await sleep(300);
  }

  return {
    ok: false,
    availableTargets: lastTargets.map((target) => ({ id: target.id, title: target.title, url: target.url })),
  };
}

async function approveMetaMaskPrompt(cdpBase, browserWebSocketUrl, walletRequestTimeoutMs) {
  const targetResult = await findMetaMaskActionTarget(cdpBase, browserWebSocketUrl, walletRequestTimeoutMs);
  if (!targetResult?.ok || !targetResult.popupSession) {
    return targetResult;
  }

  const { popupSession, matchedAction, inspect, target } = targetResult;
  try {
    const clickResult = await clickAnyText(popupSession, METAMASK_ACTION_LABELS);
    await sleep(800);
    return {
      ok: Boolean(clickResult?.ok),
      target,
      inspect,
      matchedAction: clickResult?.matchedLabel || matchedAction,
      click: clickResult,
    };
  } finally {
    await popupSession.connection.close().catch(() => {});
  }
}

function buildMarkerSnapshotExpression(markers) {
  return `(() => {
    const markers = ${JSON.stringify(markers)};
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const readLabel = (element) => String(
      element.textContent ||
      element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      element.getAttribute('placeholder') ||
      element.name ||
      element.id ||
      element.value ||
      ''
    ).replace(/\s+/g, ' ').trim();
    const searchableTexts = [
      document.body?.innerText || '',
      ...Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]')).filter(isVisible).map(readLabel),
      ...Array.from(document.querySelectorAll('button, [role="button"], a, input[type="button"], input[type="submit"]')).filter(isVisible).map(readLabel),
      ...Array.from(document.querySelectorAll('input, textarea, select')).filter(isVisible).map(readLabel),
    ].map(normalize).filter(Boolean);
    const hasMarker = (marker) => {
      const normalizedMarker = normalize(marker);
      return searchableTexts.some((text) => text.includes(normalizedMarker) || normalizedMarker.includes(text));
    };
    const present = markers.filter((marker) => hasMarker(marker));
    const missing = markers.filter((marker) => !hasMarker(marker));
    return {
      ok: missing.length === 0,
      present,
      missing,
      title: document.title,
      href: location.href,
    };
  })()`;
}

function buildPageSnapshotExpression(page) {
  return `(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const groups = ${JSON.stringify(page.acceptGroups || [])};
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const readLabel = (element) => String(
      element.textContent ||
      element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      element.getAttribute('placeholder') ||
      element.name ||
      element.id ||
      element.value ||
      ''
    ).replace(/\s+/g, ' ').trim();
    const bodyText = document.body?.innerText || '';
    const searchableTexts = [
      bodyText,
      ...Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]')).filter(isVisible).map(readLabel),
      ...Array.from(document.querySelectorAll('button, [role="button"], a, input[type="button"], input[type="submit"]')).filter(isVisible).map(readLabel),
      ...Array.from(document.querySelectorAll('input, textarea, select')).filter(isVisible).map(readLabel),
    ].map(normalize).filter(Boolean);
    const hasMarker = (marker) => {
      const normalizedMarker = normalize(marker);
      return searchableTexts.some((text) => text.includes(normalizedMarker) || normalizedMarker.includes(text));
    };
    const groupSnapshots = groups.map((markers) => ({
      markers,
      present: markers.filter((marker) => hasMarker(marker)),
      missing: markers.filter((marker) => !hasMarker(marker)),
    }));
    const satisfiedGroup = groupSnapshots.find((group) => group.missing.length === 0) || null;
    return {
      ok: Boolean(satisfiedGroup),
      satisfiedGroup,
      groupSnapshots,
      title: document.title,
      href: location.href,
      excerpt: String(bodyText || '').replace(/\s+/g, ' ').trim().slice(0, 800),
    };
  })()`;
}

async function waitForMarkers(session, markers, timeoutMs) {
  const startedAt = Date.now();
  let lastSnapshot = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastSnapshot = await evaluateJson(session, buildMarkerSnapshotExpression(markers));
    if (lastSnapshot?.ok) {
      return {
        ...lastSnapshot,
        waitedMs: Date.now() - startedAt,
      };
    }
    await sleep(250);
  }

  return {
    ...(lastSnapshot || { ok: false, present: [], missing: markers, title: null, href: null }),
    ok: false,
    waitedMs: Date.now() - startedAt,
  };
}

async function waitForPageState(session, page, timeoutMs) {
  const startedAt = Date.now();
  let lastSnapshot = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastSnapshot = await evaluateJson(session, buildPageSnapshotExpression(page));
    if (lastSnapshot?.ok) {
      return {
        ...lastSnapshot,
        waitedMs: Date.now() - startedAt,
      };
    }
    await sleep(250);
  }

  return {
    ...(lastSnapshot || { ok: false, groupSnapshots: [], satisfiedGroup: null, title: null, href: null, excerpt: '' }),
    ok: false,
    waitedMs: Date.now() - startedAt,
  };
}

function buildEnsureChainExpression(chainPreset, walletRequestTimeoutMs) {
  return `(() => {
    const preset = ${JSON.stringify(chainPreset)};
    const timeoutMs = ${walletRequestTimeoutMs};
    const normalizeChainId = (value) => String(value || '').trim().toLowerCase();
    const withTimeout = (promise) => Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(Object.assign(new Error('Timed out waiting for wallet confirmation'), { code: 'timeout' }));
        }, timeoutMs);
      }),
    ]);

    return (async () => {
      const provider = window.ethereum;
      if (!provider?.request) {
        return { ok: false, status: 'missing_provider', chainId: null };
      }

      const readChainId = async () => {
        try {
          return await provider.request({ method: 'eth_chainId' });
        } catch {
          return provider.chainId ?? null;
        }
      };

      const targetHex = normalizeChainId(preset.hexChainId);
      const currentChainId = normalizeChainId(await readChainId());
      if (currentChainId === targetHex) {
        return { ok: true, status: 'already_on_target', chainId: currentChainId };
      }

      const switchChain = () => provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: preset.hexChainId }],
      });

      const addChain = () => provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: preset.hexChainId,
          chainName: preset.chainName,
          nativeCurrency: preset.nativeCurrency,
          rpcUrls: preset.rpcUrls,
          blockExplorerUrls: preset.blockExplorerUrls,
        }],
      });

      try {
        await withTimeout(switchChain());
        const nextChainId = normalizeChainId(await readChainId());
        return {
          ok: nextChainId === targetHex,
          status: 'switched',
          chainId: nextChainId,
        };
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
        const message = error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : error instanceof Error
            ? error.message
            : String(error);

        if (Number(code) === 4902) {
          try {
            await withTimeout(addChain());
            await withTimeout(switchChain());
            const nextChainId = normalizeChainId(await readChainId());
            return {
              ok: nextChainId === targetHex,
              status: 'added_and_switched',
              chainId: nextChainId,
            };
          } catch (nestedError) {
            const nestedCode = nestedError && typeof nestedError === 'object' && 'code' in nestedError ? nestedError.code : null;
            const nestedMessage = nestedError && typeof nestedError === 'object' && 'message' in nestedError
              ? String(nestedError.message)
              : nestedError instanceof Error
                ? nestedError.message
                : String(nestedError);
            const latestChainId = normalizeChainId(await readChainId());
            return {
              ok: latestChainId === targetHex,
              status:
                nestedCode === 'timeout'
                  ? 'wallet_confirmation_pending'
                  : Number(nestedCode) === -32002
                    ? 'wallet_request_pending'
                    : 'add_or_switch_failed',
              code: nestedCode,
              message: nestedMessage,
              chainId: latestChainId,
            };
          }
        }

        const latestChainId = normalizeChainId(await readChainId());
        return {
          ok: latestChainId === targetHex,
          status:
            code === 'timeout'
              ? 'wallet_confirmation_pending'
              : Number(code) === -32002
                ? 'wallet_request_pending'
                : 'switch_failed',
          code,
          message,
          chainId: latestChainId,
        };
      }
    })();
  })()`;
}

async function ensureChain(session, chainId, walletRequestTimeoutMs) {
  const chainPreset = CHAIN_PRESETS[String(chainId)];
  if (!chainPreset) {
    return {
      ok: false,
      status: 'unsupported_chain',
      chainId: null,
      message: `No ensure-chain preset is configured for chain ${chainId}.`,
    };
  }

  return evaluateJson(session, buildEnsureChainExpression(chainPreset, walletRequestTimeoutMs));
}

async function runConnectedSmoke(session, smokeTimeoutMs) {
  const shellSnapshot = await waitForMarkers(session, ['Orders', 'Insights', 'Messages'], Math.min(smokeTimeoutMs, 3000));
  const pages = [];

  for (const page of CONNECTED_SMOKE_PAGES) {
    const navigation = await clickText(session, page.label);
    if (!navigation?.ok) {
      pages.push({
        label: page.label,
        ok: false,
        reason: 'nav_not_found',
        available: navigation?.available || [],
      });
      continue;
    }

    await sleep(200);
    const snapshot = await waitForPageState(session, page, smokeTimeoutMs);
    pages.push({
      label: page.label,
      ok: Boolean(snapshot?.ok),
      acceptGroups: page.acceptGroups,
      satisfiedGroup: snapshot?.satisfiedGroup?.markers || null,
      groupSnapshots: snapshot?.groupSnapshots || [],
      title: snapshot?.title || null,
      href: snapshot?.href || null,
      waitedMs: snapshot?.waitedMs || 0,
      excerpt: snapshot?.excerpt || '',
    });
  }

  return {
    passed: shellSnapshot?.ok === true && pages.every((page) => page.ok),
    shell: {
      ok: Boolean(shellSnapshot?.ok),
      missing: shellSnapshot?.missing || [],
      waitedMs: shellSnapshot?.waitedMs || 0,
    },
    pages,
  };
}

async function openMintingSurface(session, smokeTimeoutMs) {
  let navigation = await clickNavItem(session, 'Minting');
  if (!navigation?.ok) {
    navigation = await clickText(session, 'Minting');
  }

  const pageSnapshot = await waitForMarkers(session, PROTECTED_MINT_FORM_MARKERS, smokeTimeoutMs);
  return {
    ok: Boolean(navigation?.ok) && Boolean(pageSnapshot?.ok),
    navigation,
    page: pageSnapshot,
  };
}

async function runProtectedMintSmoke(session, options, browserWebSocketUrl) {
  const openResult = await openMintingSurface(session, options.smokeTimeoutMs);
  if (!openResult.ok) {
    return {
      passed: false,
      stage: 'open_minting',
      openResult,
    };
  }

  const assetType = await clickText(session, 'NFT');
  await sleep(250);

  const mintSeed = Date.now().toString(36).slice(-8);
  const form = {
    assetName: `Smoke NFT ${mintSeed}`,
    description: `Protected mint smoke ${mintSeed}`,
    price: '0.0001',
    totalAmount: '1',
  };

  const fillResults = {
    assetName: await fillField(session, 'Asset Name', form.assetName),
    description: await fillField(session, 'Description', form.description),
    price: await fillField(session, 'Price', form.price),
    totalAmount: await fillField(session, 'Total Amount', form.totalAmount),
  };

  const missingRequiredFields = Object.entries(fillResults)
    .filter(([, result]) => !result?.ok)
    .map(([field]) => field);
  if (missingRequiredFields.length > 0) {
    return {
      passed: false,
      stage: 'fill_form',
      assetType,
      form,
      fillResults,
      missingRequiredFields,
    };
  }

  const mintClick = await clickText(session, 'Mint Asset');
  if (!mintClick?.ok) {
    return {
      passed: false,
      stage: 'trigger_mint',
      assetType,
      fillResults,
      mintClick,
    };
  }

  const securityCheck = await waitForMarkers(session, ['Security Check', 'Continue to MetaMask'], 4000);
  let securityModalAction = null;
  let securityPrompt = null;
  if (securityCheck?.ok) {
    securityModalAction = await clickText(session, 'Continue to MetaMask');
    if (!securityModalAction?.ok) {
      return {
        passed: false,
        stage: 'security_modal',
        assetType,
        fillResults,
        mintClick,
        securityCheck,
        securityModalAction,
      };
    }

    securityPrompt = await approveMetaMaskPrompt(
      normalizeBaseUrl(options.cdpUrl),
      browserWebSocketUrl,
      options.walletRequestTimeoutMs,
    );
    if (!securityPrompt?.ok) {
      return {
        passed: false,
        stage: 'security_signature',
        assetType,
        fillResults,
        mintClick,
        securityCheck,
        securityModalAction,
        securityPrompt,
      };
    }
  }

  const transactionPrompt = await approveMetaMaskPrompt(
    normalizeBaseUrl(options.cdpUrl),
    browserWebSocketUrl,
    options.walletRequestTimeoutMs,
  );
  if (!transactionPrompt?.ok) {
    return {
      passed: false,
      stage: 'transaction_confirmation',
      assetType,
      fillResults,
      mintClick,
      securityCheck,
      securityModalAction,
      securityPrompt,
      transactionPrompt,
    };
  }

  const success = await waitForPageState(session, { acceptGroups: PROTECTED_MINT_SUCCESS_GROUPS }, options.smokeTimeoutMs);
  const successCtas = success?.ok
    ? await waitForMarkers(session, ['View Assets', 'View Tx'], Math.min(options.smokeTimeoutMs, 10000))
    : null;

  return {
    passed: Boolean(success?.ok) && Boolean(successCtas?.ok),
    stage: !success?.ok
      ? 'awaiting_success_banner'
      : successCtas?.ok
        ? 'success'
        : 'awaiting_success_ctas',
    assetType,
    form,
    fillResults,
    mintClick,
    securityCheck,
    securityModalAction,
    securityPrompt,
    transactionPrompt,
    success,
    successCtas,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cdpBase = normalizeBaseUrl(options.cdpUrl);
  const version = await fetchJson(`${cdpBase}/json/version`);
  let targets = await fetchJson(`${cdpBase}/json/list`);
  let selectedTarget = selectTarget(targets, options);
  let createdTarget = null;

  if (!selectedTarget && options.gotoUrl) {
    createdTarget = await createTarget(cdpBase, options.gotoUrl);
    targets = await fetchJson(`${cdpBase}/json/list`);
    selectedTarget = selectTarget(targets, {
      ...options,
      targetId: createdTarget.id,
      matchUrl: '',
    });
  }

  const summary = {
    connected: false,
    browser: {
      product: version.Browser || null,
      userAgent: version['User-Agent'] || null,
      webSocketDebuggerUrl: version.webSocketDebuggerUrl || null,
    },
    targets: targets
      .filter((target) => target.type === 'page')
      .map((target) => ({ id: target.id, title: target.title, url: target.url })),
    selectedTarget: selectedTarget
      ? { id: selectedTarget.id, title: selectedTarget.title, url: selectedTarget.url }
      : null,
    createdTarget: createdTarget
      ? { id: createdTarget.id, title: createdTarget.title, url: createdTarget.url }
      : null,
    wallet: null,
    chainRequest: null,
    smoke: null,
    protectedMint: null,
    inspect: null,
    action: null,
  };

  if (options.listOnly) {
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  }

  if (!selectedTarget) {
    console.log(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  const targetSession = await openTargetSession(version.webSocketDebuggerUrl, selectedTarget, options.timeoutMs);
  summary.selectedTarget = {
    ...summary.selectedTarget,
    mode: targetSession.mode,
  };
  try {
    if (options.gotoUrl) {
      await targetSession.connection.send('Page.navigate', { url: options.gotoUrl }, targetSession.sessionId);
      await sleep(1500);
    }

    if (options.clickText) {
      summary.action = await clickText(targetSession, options.clickText);
      await sleep(500);
    }

    if (options.inspectTarget) {
      summary.inspect = await inspectTargetContent(targetSession);
    }

    let walletState = null;
    if (!options.inspectTarget || options.ensureChainId || options.smokeConnected || !options.clickText) {
      walletState = await inspectWalletState(targetSession);
      summary.wallet = walletState;
    }

    if (options.ensureChainId) {
      summary.chainRequest = await ensureChain(targetSession, options.ensureChainId, options.walletRequestTimeoutMs);
      await sleep(500);
      walletState = await inspectWalletState(targetSession);
      summary.wallet = walletState;
    }

    if (options.smokeConnected) {
      summary.smoke = await runConnectedSmoke(targetSession, options.smokeTimeoutMs);
      walletState = await inspectWalletState(targetSession);
      summary.wallet = walletState;
    }

    if (options.smokeProtectedMint) {
      summary.protectedMint = await runProtectedMintSmoke(targetSession, options, version.webSocketDebuggerUrl);
      walletState = await inspectWalletState(targetSession);
      summary.wallet = walletState;
    }

    const genericActionMode = Boolean(options.inspectTarget || options.clickText) && !options.ensureChainId && !options.smokeConnected && !options.smokeProtectedMint;
    const connected = Boolean(walletState?.hasEthereum && (walletState?.selectedAddress || walletState?.accounts?.length));
    const chainReady = !options.ensureChainId || summary.chainRequest?.ok === true;
    const smokePassed = !options.smokeConnected || summary.smoke?.passed === true;
    const protectedMintPassed = !options.smokeProtectedMint || summary.protectedMint?.passed === true;
    const actionReady = !genericActionMode || options.clickText ? summary.action?.ok === true : true;

    summary.connected = connected;
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = genericActionMode
      ? (actionReady ? 0 : 2)
      : (connected && chainReady && smokePassed && protectedMintPassed ? 0 : 2);
  } finally {
    await targetSession.connection.close();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    error: error instanceof Error ? error.message : String(error),
    hint: 'Start Chrome with a dedicated --user-data-dir, make sure no existing Chrome process is already using that profile, and verify http://127.0.0.1:9222/json/version responds before rerunning this script.',
  }, null, 2));
  process.exitCode = 1;
});