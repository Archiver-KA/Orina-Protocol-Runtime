#!/usr/bin/env node

import process from 'node:process';

const DEFAULT_CDP_URL = 'http://127.0.0.1:9222';
const DEFAULT_GOTO_URL = 'http://localhost:5173/';
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_CDP_COMMAND_TIMEOUT_MS = 15_000;

function parseArgs(argv) {
  const options = {
    cdpUrl: DEFAULT_CDP_URL,
    gotoUrl: DEFAULT_GOTO_URL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    keepTarget: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--cdp-url') {
      options.cdpUrl = String(argv[index + 1] || options.cdpUrl);
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
    if (arg === '--keep-target') {
      options.keepTarget = true;
    }
  }

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while requesting ${url}`);
  }
  return response.json();
}

async function createTarget(cdpBase, url) {
  const targetParam = encodeURIComponent(url);
  const attempts = [{ method: 'PUT' }, undefined];
  let lastError = null;

  for (const init of attempts) {
    try {
      return await fetchJson(`${cdpBase}/json/new?${targetParam}`, init);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to create CDP target');
}

async function closeTarget(cdpBase, targetId) {
  try {
    await fetch(`${cdpBase}/json/close/${encodeURIComponent(targetId)}`);
  } catch {
    // Best-effort cleanup only.
  }
}

function originOf(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'data:' || parsed.protocol === 'blob:' || parsed.protocol === 'about:') return '';
    if (parsed.protocol === 'chrome-extension:') return 'chrome-extension://';
    return parsed.origin;
  } catch {
    return '';
  }
}

function headerValue(headers, name) {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (String(key).toLowerCase() === wanted) return String(value);
  }
  return '';
}

function redactSensitive(value) {
  return String(value || '')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-jwt]')
    .replace(/\b0x[a-fA-F0-9]{64}\b/g, '[redacted-hex64]')
    .replace(/\bsk_[A-Za-z0-9_-]{12,}\b/g, '[redacted-key]')
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, '[redacted-key]')
    .slice(0, 500);
}

function isApprovedOrigin(origin) {
  if (!origin) return true;
  const patterns = [
    /^http:\/\/localhost(?::\d+)?$/,
    /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
    /^ws:\/\/localhost(?::\d+)?$/,
    /^ws:\/\/127\.0\.0\.1(?::\d+)?$/,
    /^https:\/\/([^/]+\.)?orina\.io$/,
    /^https:\/\/[^/]+\.supabase\.co$/,
    /^wss:\/\/[^/]+\.supabase\.co$/,
    /^https:\/\/data-seed-prebsc-1-s1\.bnbchain\.org:8545$/,
    /^https:\/\/data-seed-prebsc-1-s1\.binance\.org:8545$/,
    /^https:\/\/bsc-dataseed\.binance\.org$/,
    /^wss:\/\/data-stream\.binance\.vision$/,
    /^https:\/\/basemaps\.cartocdn\.com$/,
    /^https:\/\/[^/]+\.basemaps\.cartocdn\.com$/,
    /^https:\/\/server\.arcgisonline\.com$/,
    /^https:\/\/fonts\.googleapis\.com$/,
    /^https:\/\/fonts\.gstatic\.com$/,
    /^https:\/\/images\.unsplash\.com$/,
    /^https:\/\/source\.unsplash\.com$/,
    /^https:\/\/gateway\.pinata\.cloud$/,
    /^https:\/\/ipfs\.io$/,
    /^https:\/\/cloudflare-ipfs\.com$/,
    /^https:\/\/dweb\.link$/,
    // Production Cloudflare Web Analytics script injected by the Worker/dashboard configuration.
    /^https:\/\/static\.cloudflareinsights\.com$/,
    // Supplier media CDN observed through marketplace browse images. This is media-only browser egress.
    /^https:\/\/s\.alicdn\.com$/,
    /^chrome-extension:\/\/$/,
  ];
  return patterns.some((pattern) => pattern.test(origin));
}

function isExpectedAuthGuardConsole(message) {
  return /Please confirm your wallet once in Orina to continue messaging/i.test(message) ||
    /Unlock Secure Messages/i.test(message);
}

class CdpSession {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
  }

  async connect() {
    if (typeof WebSocket !== 'function') {
      throw new Error('This Node runtime does not provide a global WebSocket implementation');
    }

    this.ws = new WebSocket(this.webSocketUrl);
    this.ws.addEventListener('message', (event) => this.handleMessage(event));
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
  }

  handleMessage(event) {
    const payload = JSON.parse(String(event.data || '{}'));
    if (payload.id && this.pending.has(payload.id)) {
      const { resolve, reject } = this.pending.get(payload.id);
      this.pending.delete(payload.id);
      if (payload.error) reject(new Error(payload.error.message || `CDP error ${payload.id}`));
      else resolve(payload.result || {});
      return;
    }
    if (payload.method) {
      this.events.push(payload);
      if (this.onEvent) this.onEvent(payload);
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const message = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, DEFAULT_CDP_COMMAND_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        method,
      });
      this.ws.send(message);
    });
  }

  close() {
    try {
      this.ws?.close();
    } catch {
      // Best-effort cleanup only.
    }
  }
}

async function evaluate(session, expression) {
  const result = await session.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
  }
  return result.result?.value;
}

async function evaluateFunction(session, fn, ...args) {
  return evaluate(session, `(${fn})(...${JSON.stringify(args)})`);
}

async function navigate(session, url) {
  await session.send('Page.navigate', { url });
  await sleep(3500);
}

function pageInspectionScript() {
  const leakPatterns = [
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /SERVICE_ROLE/i,
    /JWT_SECRET/i,
    /PINATA_JWT/i,
    /ANTHROPIC_API_KEY/i,
    /ATP2_M2M_DELEGATE_ENCRYPTION_KEY/i,
    /privateKey/i,
    /seed phrase/i,
    /recovery phrase/i,
    /mnemonic/i,
    /sk_seller_[A-Za-z0-9_-]{12,}/i,
  ];
  const hasLeak = (value) => leakPatterns.some((pattern) => pattern.test(String(value || '')));
  const listWebStorage = (storage) => {
    const keys = [];
    const flaggedKeyNames = [];
    const flaggedValueKeys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      keys.push(key);
      if (hasLeak(key)) flaggedKeyNames.push(key);
      try {
        if (hasLeak(storage.getItem(key))) flaggedValueKeys.push(key);
      } catch {
        flaggedValueKeys.push(`${key}:read-error`);
      }
    }
    return { keys, flaggedKeyNames, flaggedValueKeys };
  };
  const bodyText = document.body?.innerText || '';
  const html = document.documentElement?.innerHTML || '';
  return {
    url: location.href,
    title: document.title,
    bodyTextLength: bodyText.length,
    appLoaded: bodyText.length > 100 && !/This site can't be reached|Internal Server Error/i.test(bodyText),
    markers: {
      marketplace: /Marketplace|Collections|Assets/i.test(bodyText),
      walletUi: /Wallet|Settings|Security|Agent/i.test(bodyText),
      authSessionPrompt: /Security Check|Sign the requested message|wallet security check/i.test(bodyText),
    },
    domLeakPatternNames: leakPatterns.map((pattern) => String(pattern)).filter((pattern) => new RegExp(pattern.slice(1, pattern.lastIndexOf('/')), pattern.split('/').pop()).test(bodyText) || new RegExp(pattern.slice(1, pattern.lastIndexOf('/')), pattern.split('/').pop()).test(html)),
    localStorage: listWebStorage(window.localStorage),
    sessionStorage: listWebStorage(window.sessionStorage),
    walletAuthSessionPresent: window.sessionStorage.getItem('orina_wallet_auth_session') !== null,
    bridgeSessionPresent: window.sessionStorage.getItem('orina_supabase_auth_claim_bridge_session') !== null,
  };
}

function walletInspectionScript() {
  const provider = window.ethereum;
  if (!provider || typeof provider.request !== 'function') {
    return { hasEthereum: Boolean(provider), requestOk: false, accountCount: 0, chainIdPresent: false };
  }
  const withTimeout = (promise) => Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve({ __orinaTimedOut: true }), 8000);
    }),
  ]);
  return Promise.allSettled([
    withTimeout(provider.request({ method: 'eth_accounts' })),
    withTimeout(provider.request({ method: 'eth_chainId' })),
  ]).then(([accountsResult, chainResult]) => {
    const accountsTimedOut = accountsResult.value?.__orinaTimedOut === true;
    const chainTimedOut = chainResult.value?.__orinaTimedOut === true;
    const accounts = accountsResult.status === 'fulfilled' && Array.isArray(accountsResult.value)
      ? accountsResult.value
      : [];
    return {
      hasEthereum: true,
      isMetaMask: provider.isMetaMask === true,
      requestOk: accountsResult.status === 'fulfilled' && !accountsTimedOut,
      requestTimedOut: accountsTimedOut || chainTimedOut,
      accountCount: accounts.length,
      selectedAddressPresent: Boolean(provider.selectedAddress || accounts.length),
      chainIdPresent: chainResult.status === 'fulfilled' && !chainTimedOut && Boolean(chainResult.value),
    };
  });
}

function indexedDbInspectionScript(maxRecordsPerStore) {
  const leakPatterns = [
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /SERVICE_ROLE/i,
    /JWT_SECRET/i,
    /PINATA_JWT/i,
    /ANTHROPIC_API_KEY/i,
    /ATP2_M2M_DELEGATE_ENCRYPTION_KEY/i,
    /privateKey/i,
    /seed phrase/i,
    /recovery phrase/i,
    /mnemonic/i,
    /sk_seller_[A-Za-z0-9_-]{12,}/i,
  ];
  const hasLeak = (value) => leakPatterns.some((pattern) => pattern.test(String(value || '')));
  const requestToPromise = (request) => {
    let timeout;
    return new Promise((resolve, reject) => {
      timeout = setTimeout(() => {
        reject(new Error('IndexedDB request timed out'));
      }, 5000);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    }).finally(() => {
      clearTimeout(timeout);
    });
  };
  return (async () => {
    if (!indexedDB.databases) return { supported: false, databases: [], flaggedStores: [] };
    const databases = await indexedDB.databases();
    const output = [];
    const flaggedStores = [];
    for (const dbInfo of databases) {
      if (!dbInfo.name) continue;
      const db = await requestToPromise(indexedDB.open(dbInfo.name));
      const storeNames = Array.from(db.objectStoreNames);
      output.push({ name: dbInfo.name, version: dbInfo.version, stores: storeNames });
      for (const storeName of storeNames) {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const values = await requestToPromise(store.getAll(undefined, maxRecordsPerStore));
          if (hasLeak(storeName) || hasLeak(JSON.stringify(values))) {
            flaggedStores.push(`${dbInfo.name}/${storeName}`);
          }
        } catch {
          flaggedStores.push(`${dbInfo.name}/${storeName}:read-error`);
        }
      }
      db.close();
    }
    return { supported: true, databases: output, flaggedStores };
  })();
}

async function inspectWalletExtensionTargets(cdpBase) {
  const targets = await fetchJson(`${cdpBase}/json/list`);
  return targets
    .filter((target) => target.type === 'page' && String(target.url || '').startsWith('chrome-extension://'))
    .map((target) => ({
      id: target.id,
      title: redactSensitive(target.title || ''),
      url: target.url,
    }));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cdpBase = normalizeBaseUrl(options.cdpUrl);
  const startUrl = new URL(options.gotoUrl);
  const routes = [
    { name: 'root', url: startUrl.href },
    { name: 'settings', url: new URL('/settings', startUrl).href },
    { name: 'marketplace', url: new URL('/marketplace', startUrl).href },
  ];

  await fetchJson(`${cdpBase}/json/version`);
  const target = await createTarget(cdpBase, 'about:blank');
  const session = new CdpSession(target.webSocketDebuggerUrl);

  const networkOrigins = new Set();
  const unexpectedOrigins = new Set();
  const corsResponses = [];
  const consoleErrors = [];
  const securityConsoleErrors = [];
  const expectedAuthGuardErrors = [];

  session.onEvent = (event) => {
    if (event.method === 'Network.requestWillBeSent') {
      const origin = originOf(event.params?.request?.url || '');
      if (origin) {
        networkOrigins.add(origin);
        if (!isApprovedOrigin(origin)) unexpectedOrigins.add(origin);
      }
    }
    if (event.method === 'Network.responseReceived') {
      const response = event.params?.response || {};
      const origin = originOf(response.url || '');
      if (origin) {
        networkOrigins.add(origin);
        if (!isApprovedOrigin(origin)) unexpectedOrigins.add(origin);
      }
      if (String(response.url || '').includes('/functions/v1/')) {
        corsResponses.push({
          urlOrigin: origin,
          status: response.status,
          accessControlAllowOrigin: headerValue(response.headers, 'access-control-allow-origin'),
          vary: headerValue(response.headers, 'vary'),
        });
      }
    }
    if (event.method === 'Runtime.consoleAPICalled' && event.params?.type === 'error') {
      const message = redactSensitive((event.params.args || []).map((arg) => arg.value || arg.description || '').join(' '));
      consoleErrors.push(message);
      if (isExpectedAuthGuardConsole(message)) {
        expectedAuthGuardErrors.push(message);
        return;
      }
      if (/security|cors|auth|secret|private key|service[_ -]?role|forbidden/i.test(message)) {
        securityConsoleErrors.push(message);
      }
    }
    if (event.method === 'Log.entryAdded' && event.params?.entry?.level === 'error') {
      const message = redactSensitive(event.params.entry.text || '');
      consoleErrors.push(message);
      if (isExpectedAuthGuardConsole(message)) {
        expectedAuthGuardErrors.push(message);
        return;
      }
      if (/security|cors|auth|secret|private key|service[_ -]?role|forbidden/i.test(message)) {
        securityConsoleErrors.push(message);
      }
    }
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    cdpUrl: cdpBase,
    targetId: target.id,
    actions: [],
    wallet: null,
    routes: [],
    storage: null,
    cookies: null,
    console: null,
    network: null,
    cors: null,
    walletConfirmationTargets: [],
    pass: false,
  };

  try {
    await session.connect();
    await session.send('Page.enable');
    await session.send('Runtime.enable');
    await session.send('Network.enable');
    await session.send('Log.enable');

    for (const route of routes) {
      summary.actions.push({ route: route.url, action: 'CDP Page.navigate', destructive: false });
      await navigate(session, route.url);
      const inspection = await evaluateFunction(session, pageInspectionScript);
      summary.routes.push({
        name: route.name,
        route: route.url,
        observedUrl: inspection.url,
        observedResult: {
          appLoaded: inspection.appLoaded,
          bodyTextLength: inspection.bodyTextLength,
          markers: inspection.markers,
          walletAuthSessionPresent: inspection.walletAuthSessionPresent,
          bridgeSessionPresent: inspection.bridgeSessionPresent,
          domLeakPatternNames: inspection.domLeakPatternNames,
        },
        storageKeysInspected: {
          localStorage: inspection.localStorage.keys,
          sessionStorage: inspection.sessionStorage.keys,
        },
        storageLeakKeyMatches: {
          localStorageKeyNames: inspection.localStorage.flaggedKeyNames,
          localStorageValues: inspection.localStorage.flaggedValueKeys,
          sessionStorageKeyNames: inspection.sessionStorage.flaggedKeyNames,
          sessionStorageValues: inspection.sessionStorage.flaggedValueKeys,
        },
      });
    }

    summary.wallet = await evaluateFunction(session, walletInspectionScript);
    const finalStorageInspection = await evaluateFunction(session, pageInspectionScript);
    const indexedDbInspection = await evaluateFunction(session, indexedDbInspectionScript, 25);
    const cookies = await session.send('Network.getCookies', { urls: routes.map((route) => route.url) });
    const cookieSummaries = (cookies.cookies || []).map((cookie) => ({
      name: cookie.name,
      domain: cookie.domain,
      httpOnly: cookie.httpOnly === true,
      secure: cookie.secure === true,
      sameSite: cookie.sameSite || '',
    }));
    const cookieLeakNames = (cookies.cookies || [])
      .filter((cookie) => /service[_-]?role|jwt_secret|private[_-]?key|seed|mnemonic|recovery|pinata|anthropic/i.test(`${cookie.name} ${cookie.value}`))
      .map((cookie) => `${cookie.domain}/${cookie.name}`);

    summary.storage = {
      localStorageKeys: finalStorageInspection.localStorage.keys,
      sessionStorageKeys: finalStorageInspection.sessionStorage.keys,
      indexedDB: indexedDbInspection,
      leakKeyMatches: {
        localStorageKeyNames: finalStorageInspection.localStorage.flaggedKeyNames,
        localStorageValues: finalStorageInspection.localStorage.flaggedValueKeys,
        sessionStorageKeyNames: finalStorageInspection.sessionStorage.flaggedKeyNames,
        sessionStorageValues: finalStorageInspection.sessionStorage.flaggedValueKeys,
        indexedDBStores: indexedDbInspection.flaggedStores || [],
      },
    };
    summary.cookies = {
      inspected: cookieSummaries,
      leakMatches: cookieLeakNames,
    };
    summary.walletConfirmationTargets = await inspectWalletExtensionTargets(cdpBase);
    summary.console = {
      errorCount: consoleErrors.length,
      expectedAuthGuardErrorCount: expectedAuthGuardErrors.length,
      securityErrors: securityConsoleErrors,
    };
    summary.network = {
      origins: [...networkOrigins].sort(),
      unexpectedOrigins: [...unexpectedOrigins].sort(),
    };
    summary.cors = {
      edgeFunctionResponsesObserved: corsResponses,
      wildcardFunctionResponses: corsResponses.filter((entry) => entry.accessControlAllowOrigin === '*'),
    };

    const appLoaded = summary.routes.every((route) => route.observedResult.appLoaded);
    const marketplaceWorks = summary.routes.some((route) => route.name === 'marketplace' && route.observedResult.markers.marketplace);
    const noStorageLeaks = [
      ...summary.storage.leakKeyMatches.localStorageKeyNames,
      ...summary.storage.leakKeyMatches.localStorageValues,
      ...summary.storage.leakKeyMatches.sessionStorageKeyNames,
      ...summary.storage.leakKeyMatches.sessionStorageValues,
      ...summary.storage.leakKeyMatches.indexedDBStores,
      ...summary.cookies.leakMatches,
    ].length === 0;

    summary.pass =
      appLoaded &&
      summary.wallet?.hasEthereum === true &&
      summary.wallet?.requestOk === true &&
      marketplaceWorks &&
      noStorageLeaks &&
      summary.network.unexpectedOrigins.length === 0 &&
      summary.console.securityErrors.length === 0 &&
      summary.cors.wildcardFunctionResponses.length === 0 &&
      summary.walletConfirmationTargets.length === 0;

    console.log(JSON.stringify(summary, null, 2));
    process.exit(summary.pass ? 0 : 1);
  } finally {
    session.close();
    if (!options.keepTarget && target.id) {
      await closeTarget(cdpBase, target.id);
    }
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    pass: false,
    error: redactSensitive(error instanceof Error ? error.message : String(error)),
  }, null, 2));
  process.exit(1);
});
