import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULTS = {
  cdpUrl: 'http://127.0.0.1:9222',
  matchUrl: 'localhost:5173',
  gotoUrl: 'http://localhost:5173/',
  timeoutMs: 15_000,
  smokeTimeoutMs: 20_000,
  walletRequestTimeoutMs: 45_000,
  cleanup: true,
  requireChainId: 97,
  keyPrefix: 'API Key Smoke',
};

const AGENT_SETTINGS_LABEL = 'Agent Setting';
const OPEN_MODAL_LABELS = ['Generate New Key', 'Create First Key'];
const GENERATE_BUTTON_LABEL = 'Generate Key';
const SUCCESS_MARKERS = ['API Key Generated!', 'Your API Key'];
const SECURITY_PROMPT_LABELS = ['Unlock API Keys', 'Continue to MetaMask', 'Security Check'];
const KEY_INPUT_PLACEHOLDER_FRAGMENTS = ['chatgpt agent', 'production bot'];
const METAMASK_ACTION_LABELS = ['Next', 'Connect', 'Sign', 'Approve', 'Confirm'];
const API_KEY_RE = /sk_orina_[a-z0-9]+/gi;
let currentSummary = null;

function parseArgs(argv) {
  const options = {
    ...DEFAULTS,
    sharedBaseUrl: '',
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
      options.gotoUrl = String(argv[index + 1] || options.gotoUrl);
      index += 1;
      continue;
    }
    if (arg === '--timeout-ms') {
      options.timeoutMs = parsePositiveNumber(argv[index + 1], options.timeoutMs);
      index += 1;
      continue;
    }
    if (arg === '--smoke-timeout-ms') {
      options.smokeTimeoutMs = parsePositiveNumber(argv[index + 1], options.smokeTimeoutMs);
      index += 1;
      continue;
    }
    if (arg === '--wallet-request-timeout-ms') {
      options.walletRequestTimeoutMs = parsePositiveNumber(argv[index + 1], options.walletRequestTimeoutMs);
      index += 1;
      continue;
    }
    if (arg === '--shared-base-url') {
      options.sharedBaseUrl = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (arg === '--require-chain') {
      options.requireChainId = parseChainId(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--key-prefix') {
      options.keyPrefix = String(argv[index + 1] || options.keyPrefix).trim() || options.keyPrefix;
      index += 1;
      continue;
    }
    if (arg === '--no-cleanup') {
      options.cleanup = false;
      continue;
    }
  }

  return options;
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseChainId(value) {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  if (raw.startsWith('0x')) {
    const parsed = Number.parseInt(raw.slice(2), 16);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sanitizeText(value) {
  return normalizeText(String(value || '').replace(API_KEY_RE, '[REDACTED_API_KEY]'));
}

function setsEqual(left, right) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readLocalEnv() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const envPath = path.join(repoRoot, '.env');

  try {
    const raw = await readFile(envPath, 'utf8');
    return raw.split(/\r?\n/).reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return acc;
      const separator = trimmed.indexOf('=');
      if (separator <= 0) return acc;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      acc[key] = value;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function resolveSharedBaseUrl(env, override) {
  const explicitBase = normalizeBaseUrl(override);
  if (explicitBase) return explicitBase;

  const supabaseUrl = normalizeBaseUrl(firstNonEmpty(
    process.env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_URL,
  ));
  const sharedFunctionName = firstNonEmpty(
    process.env.VITE_SUPABASE_FUNCTIONS_NAMESPACE,
    process.env.VITE_SUPABASE_SHARED_SERVER_FN_NAME,
    env.VITE_SUPABASE_FUNCTIONS_NAMESPACE,
    env.VITE_SUPABASE_SHARED_SERVER_FN_NAME,
  );

  if (!supabaseUrl || !sharedFunctionName) return '';
  return `${supabaseUrl}/functions/v1/${sharedFunctionName}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while requesting ${url}`);
  }
  return response.json();
}

async function createTarget(baseUrl, targetUrl) {
  const targetParam = encodeURIComponent(targetUrl);
  const attempts = [{ method: 'PUT' }, undefined];
  let lastError = null;

  for (const init of attempts) {
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

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function selectTarget(targets, matchUrl) {
  return targets.find((target) => target.type === 'page' && String(target.url || '').includes(matchUrl)) || null;
}

function selectTargets(targets, matchUrl) {
  return targets.filter((target) => target.type === 'page' && (!matchUrl || String(target.url || '').includes(matchUrl)));
}

function resolveGotoUrl(requestedGotoUrl, selectedTargetUrl) {
  const selectedUrl = new URL(selectedTargetUrl);
  const selectedOriginRoot = new URL('/', selectedUrl).href;
  if (!requestedGotoUrl) return selectedOriginRoot;

  try {
    const requestedUrl = new URL(requestedGotoUrl);
    return requestedUrl.origin === selectedUrl.origin ? requestedUrl.href : selectedOriginRoot;
  } catch {
    return selectedOriginRoot;
  }
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
      throw new Error('Global WebSocket is not available in this Node runtime. Use Node 22+ or later.');
    }

    this.socket = new WebSocket(this.webSocketUrl);
    this.socket.addEventListener('message', (event) => {
      const payload = JSON.parse(String(event.data || '{}'));
      if (!payload.id) return;
      const pending = this.pending.get(payload.id);
      if (!pending) return;
      this.pending.delete(payload.id);
      clearTimeout(pending.timer);
      if (payload.error) {
        pending.reject(new Error(payload.error.message || `CDP error on ${pending.method}`));
        return;
      }
      pending.resolve(payload.result || {});
    });

    this.socket.addEventListener('close', () => {
      for (const [, pending] of this.pending.entries()) {
        clearTimeout(pending.timer);
        pending.reject(new Error(`CDP socket closed before ${pending.method}`));
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

async function openTargetSession(browserWebSocketUrl, target, timeoutMs) {
  if (String(target.url || '').startsWith('chrome-extension://') && target.webSocketDebuggerUrl) {
    const pageSession = new CdpSession(target.webSocketDebuggerUrl, timeoutMs);
    await pageSession.connect();
    try {
      await pageSession.send('Page.bringToFront');
    } catch {
      // Ignore extension pages that do not expose Page domain methods.
    }
    return {
      connection: pageSession,
      sessionId: null,
      mode: 'page-direct',
    };
  }

  const browserSession = new CdpSession(browserWebSocketUrl, timeoutMs);
  await browserSession.connect();
  await browserSession.send('Target.activateTarget', { targetId: target.id });
  const attachment = await browserSession.send('Target.attachToTarget', { targetId: target.id, flatten: true });
  const sessionId = attachment.sessionId || null;
  if (!sessionId) {
    await browserSession.close();
    throw new Error(`Failed to attach to target ${target.id}`);
  }

  await browserSession.send('Page.bringToFront', {}, sessionId);
  return {
    connection: browserSession,
    sessionId,
    mode: 'browser-attached',
  };
}

async function evaluate(session, expression) {
  const result = await session.connection.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, session.sessionId);
  return result.result?.value;
}

async function navigate(session, url) {
  await session.connection.send('Page.navigate', { url }, session.sessionId);
}

async function inspectWalletState(session) {
  return evaluate(session, `(() => ({
    href: location.href,
    title: document.title,
    readyState: document.readyState,
    hasEthereum: !!window.ethereum,
    isMetaMask: !!window.ethereum?.isMetaMask,
    selectedAddress: window.ethereum?.selectedAddress ?? null,
    chainId: window.ethereum?.chainId ?? null,
  }))()`);
}

async function waitForWalletState(session, timeoutMs, requiredChainId) {
  const startedAt = Date.now();
  let current = null;

  while (Date.now() - startedAt < timeoutMs) {
    current = await inspectWalletState(session);
    const actualChainId = parseChainId(current?.chainId);
    const chainMatches = requiredChainId === null || actualChainId === requiredChainId;
    if (current?.selectedAddress && chainMatches) {
      return {
        ok: true,
        waitedMs: Date.now() - startedAt,
        walletState: current,
      };
    }
    await sleep(400);
  }

  return {
    ok: false,
    waitedMs: Date.now() - startedAt,
    walletState: current,
  };
}

async function probePageTarget(browserWebSocketUrl, target, timeoutMs) {
  const session = await openTargetSession(browserWebSocketUrl, target, timeoutMs);
  try {
    const walletState = await inspectWalletState(session);
    const bridgeSession = await getBridgeSession(session);
    return {
      target,
      walletState,
      bridgeSession,
      hasBridgeAccessToken: Boolean(bridgeSession?.accessToken),
    };
  } finally {
    await session.connection.close().catch(() => {});
  }
}

function rankProbe(probe, requiredChainId) {
  let score = 0;
  if (probe.hasBridgeAccessToken) score += 10;
  if (probe.walletState?.selectedAddress) score += 5;

  const actualChainId = parseChainId(probe.walletState?.chainId);
  if (requiredChainId === null || actualChainId === requiredChainId) {
    score += 2;
  }

  return score;
}

async function pickBestTarget(browserWebSocketUrl, candidateTargets, timeoutMs, requiredChainId) {
  const probes = [];

  for (const candidate of candidateTargets) {
    try {
      const probe = await probePageTarget(browserWebSocketUrl, candidate, timeoutMs);
      probes.push(probe);
    } catch {
      // Ignore pages that cannot be attached to during probing.
    }
  }

  if (probes.length === 0) {
    return { target: null, probes: [] };
  }

  const sorted = [...probes].sort((left, right) => rankProbe(right, requiredChainId) - rankProbe(left, requiredChainId));
  return {
    target: sorted[0]?.target || null,
    probes,
  };
}

async function inspectTargetContent(session) {
  return evaluate(session, `(() => {
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
      element.getAttribute('placeholder') ||
      element.value || ''
    );

    return {
      href: location.href,
      title: document.title,
      headings: Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]')).filter(isVisible).map(readLabel).filter(Boolean).slice(0, 20),
      buttons: Array.from(document.querySelectorAll('button, [role="button"], a, input[type="button"], input[type="submit"]')).filter(isVisible).map(readLabel).filter(Boolean).slice(0, 40),
      body: normalize(document.body?.innerText || '').slice(0, 5000),
    };
  })()`);
}

async function clickText(session, labels) {
  const requestedLabels = Array.isArray(labels) ? labels : [labels];

  return evaluate(session, `(() => {
    const labels = ${JSON.stringify(requestedLabels)};
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const simplify = (value) => normalize(value).toLowerCase();
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
      element.value || ''
    );

    const candidates = Array.from(document.querySelectorAll('button, [role="button"], a, input[type="button"], input[type="submit"]')).filter(isVisible);
    for (const requested of labels) {
      const normalizedRequested = simplify(requested);
      const target = candidates.find((element) => {
        const current = simplify(readLabel(element));
        if (!current) return false;
        return current === normalizedRequested || current.includes(normalizedRequested) || normalizedRequested.includes(current);
      });
      if (!target) continue;
      target.scrollIntoView({ block: 'center', inline: 'center' });
      target.focus?.();
      target.click?.();
      return { ok: true, requested, label: readLabel(target) };
    }

    return {
      ok: false,
      requested: labels,
      available: candidates.map(readLabel).filter(Boolean).slice(0, 30),
    };
  })()`);
}

async function waitForCondition(session, expression, timeoutMs, intervalMs = 300) {
  const startedAt = Date.now();
  let lastValue = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await evaluate(session, expression);
    if (lastValue?.ok) {
      return {
        ...lastValue,
        waitedMs: Date.now() - startedAt,
      };
    }
    await sleep(intervalMs);
  }

  return {
    ...(lastValue || { ok: false }),
    waitedMs: Date.now() - startedAt,
  };
}

async function openAgentSettings(session, summary, timeoutMs) {
  const currentInspect = await inspectTargetContent(session);
  if (currentInspect.body.includes('Agent Settings')) {
    summary.steps.push({ stage: 'agent_settings_already_open' });
    return { ok: true, inspect: currentInspect };
  }

  const navigation = await clickText(session, AGENT_SETTINGS_LABEL);
  summary.steps.push({ stage: 'open_agent_settings', navigation });
  if (!navigation?.ok) {
    return { ok: false, reason: 'agent_settings_nav_not_found', navigation };
  }

  const settled = await waitForCondition(session, `(() => {
    const body = String(document.body?.innerText || '');
    return { ok: body.includes('Agent Settings'), body: body.slice(0, 2000) };
  })()`, timeoutMs);
  return settled;
}

async function openGenerateModal(session, summary, timeoutMs) {
  const currentInspect = await inspectTargetContent(session);
  if (currentInspect.body.includes('Generate New API Key')) {
    summary.steps.push({ stage: 'generate_modal_already_open' });
    return { ok: true, surface: 'modal', inspect: currentInspect };
  }
  if (SECURITY_PROMPT_LABELS.some((label) => currentInspect.body.includes(label))) {
    summary.steps.push({ stage: 'api_key_security_prompt_already_open' });
    return { ok: true, surface: 'security_prompt', inspect: currentInspect };
  }

  const triggerReady = await waitForCondition(session, `(() => {
    const body = String(document.body?.innerText || '');
    if (body.includes('Generate New API Key')) {
      return { ok: true, surface: 'modal', body: body.slice(0, 2000) };
    }
    const securityMarkers = ${JSON.stringify(SECURITY_PROMPT_LABELS)};
    if (securityMarkers.some((marker) => body.includes(marker))) {
      return { ok: true, surface: 'security_prompt', body: body.slice(0, 2000) };
    }
    const triggerLabels = ${JSON.stringify(OPEN_MODAL_LABELS)};
    if (triggerLabels.some((label) => body.includes(label))) {
      return { ok: true, surface: 'trigger_ready', body: body.slice(0, 2000) };
    }
    return { ok: false, surface: null, body: body.slice(0, 2000) };
  })()`, timeoutMs, 300);

  if (triggerReady?.surface === 'modal' || triggerReady?.surface === 'security_prompt') {
    return triggerReady;
  }
  if (!triggerReady?.ok) {
    return triggerReady;
  }

  const click = await clickText(session, OPEN_MODAL_LABELS);
  summary.steps.push({ stage: 'open_generate_modal', click });
  if (!click?.ok) {
    return { ok: false, reason: 'generate_modal_trigger_not_found', click };
  }

  return waitForCondition(session, `(() => {
    const body = String(document.body?.innerText || '');
    if (body.includes('Generate New API Key')) {
      return { ok: true, surface: 'modal', body: body.slice(0, 2000) };
    }
    const securityMarkers = ${JSON.stringify(SECURITY_PROMPT_LABELS)};
    if (securityMarkers.some((marker) => body.includes(marker))) {
      return { ok: true, surface: 'security_prompt', body: body.slice(0, 2000) };
    }
    return { ok: false, surface: null, body: body.slice(0, 2000) };
  })()`, timeoutMs);
}

async function fillKeyNameInput(session, keyName) {
  const focusResult = await evaluate(session, `(() => {
    const fragments = ${JSON.stringify(KEY_INPUT_PLACEHOLDER_FRAGMENTS)};
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const input = Array.from(document.querySelectorAll('input[type="text"], input:not([type]), textarea')).find((element) => {
      if (!isVisible(element) || element.disabled || element.readOnly) return false;
      const placeholder = normalize(element.getAttribute('placeholder'));
      return fragments.some((fragment) => placeholder.includes(fragment));
    });

    if (!input) {
      return { ok: false, reason: 'key_name_input_not_found' };
    }

    const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor?.set?.call(input, '');
    input.focus?.();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      ok: true,
      placeholder: input.getAttribute('placeholder') || '',
      activeTag: document.activeElement?.tagName || null,
    };
  })()`);

  if (!focusResult?.ok) return focusResult;

  await session.connection.send('Input.insertText', { text: keyName }, session.sessionId);
  await sleep(250);

  const verifyResult = await evaluate(session, `(() => {
    const fragments = ${JSON.stringify(KEY_INPUT_PLACEHOLDER_FRAGMENTS)};
    const nextValue = ${JSON.stringify(keyName)};
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const input = Array.from(document.querySelectorAll('input[type="text"], input:not([type]), textarea')).find((element) => {
      if (!isVisible(element) || element.disabled || element.readOnly) return false;
      const placeholder = normalize(element.getAttribute('placeholder'));
      return fragments.some((fragment) => placeholder.includes(fragment));
    });
    if (!input) return { ok: false, reason: 'key_name_input_not_found_after_type' };

    if (String(input.value || '').includes(nextValue)) {
      return { ok: true, method: 'insertText', value: String(input.value || '') };
    }

    const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor?.set?.call(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      ok: String(input.value || '').includes(nextValue),
      method: 'fallback_setter',
      value: String(input.value || ''),
    };
  })()`);

  return verifyResult;
}

async function waitForSuccessPanel(session, timeoutMs) {
  return waitForCondition(session, `(() => {
    const body = String(document.body?.innerText || '');
    const normalizedBody = body.toLowerCase();
    const markers = ${JSON.stringify(SUCCESS_MARKERS.map((marker) => marker.toLowerCase()))};
    return {
      ok: markers.every((marker) => normalizedBody.includes(marker)),
      body: body.slice(0, 4000),
    };
  })()`, timeoutMs, 400);
}

async function getBridgeSession(session) {
  return evaluate(session, `(() => {
    try {
      const raw = localStorage.getItem('orina_supabase_auth_claim_bridge_session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })()`);
}

async function waitForBridgeSession(session, timeoutMs) {
  const startedAt = Date.now();
  let current = null;

  while (Date.now() - startedAt < timeoutMs) {
    current = await getBridgeSession(session);
    if (current?.accessToken) {
      return {
        ok: true,
        waitedMs: Date.now() - startedAt,
        session: current,
      };
    }
    await sleep(400);
  }

  return {
    ok: false,
    waitedMs: Date.now() - startedAt,
    session: current,
  };
}

async function apiRequest(baseUrl, accessToken, routePath, init = {}) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (body?.key?.rawKey) {
    body.key.rawKey = '[REDACTED_API_KEY]';
  }
  return {
    status: response.status,
    ok: response.ok,
    body,
  };
}

async function waitForRemoteKey(baseUrl, accessToken, runMarker, timeoutMs) {
  const startedAt = Date.now();
  let lastList = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastList = await apiRequest(baseUrl, accessToken, '/ai/api-keys/list');
    const keys = Array.isArray(lastList.body?.keys) ? lastList.body.keys : [];
    const matches = keys.filter((key) => String(key.name || '').includes(runMarker));
    if (matches.length > 0) {
      return {
        ok: true,
        waitedMs: Date.now() - startedAt,
        keys: matches,
        list: lastList,
      };
    }
    await sleep(500);
  }

  return {
    ok: false,
    waitedMs: Date.now() - startedAt,
    keys: [],
    list: lastList,
  };
}

async function reloadAgentSettings(session, gotoUrl, timeoutMs, summary) {
  await navigate(session, gotoUrl);
  await sleep(1_000);

  const agentSettings = await openAgentSettings(session, summary, timeoutMs);
  if (!agentSettings?.ok) return agentSettings;

  return waitForCondition(session, `(() => {
    const body = String(document.body?.innerText || '');
    return {
      ok: body.includes('API KEYS') || body.includes('API Keys'),
      body: body.slice(0, 4000),
    };
  })()`, timeoutMs, 300);
}

async function confirmUiKeyVisible(session, gotoUrl, runMarker, timeoutMs, summary) {
  const reloadResult = await reloadAgentSettings(session, gotoUrl, timeoutMs, summary);
  if (!reloadResult?.ok) return reloadResult;

  return waitForCondition(session, `(() => {
    const body = String(document.body?.innerText || '');
    return {
      ok: body.includes(${JSON.stringify(runMarker)}) && !body.includes('404 Not Found'),
      body: body.slice(0, 4000),
    };
  })()`, timeoutMs, 500);
}

async function confirmUiSettledWithout404(session, gotoUrl, timeoutMs, summary) {
  const reloadResult = await reloadAgentSettings(session, gotoUrl, timeoutMs, summary);
  if (!reloadResult?.ok) return reloadResult;

  return waitForCondition(session, `(() => {
    const body = String(document.body?.innerText || '');
    const loading = body.includes('Loading API Keys') || body.includes('Fetching your latest API keys');
    return {
      ok: !loading && !body.includes('404 Not Found') && body.includes('API KEYS'),
      body: body.slice(0, 4000),
    };
  })()`, timeoutMs, 400);
}

async function findMetaMaskPrompt(cdpBase, browserWebSocketUrl, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const targets = await fetchJson(`${cdpBase}/json/list`);
    const extensionTargets = targets.filter((target) => target.type === 'page' && String(target.url || '').startsWith('chrome-extension://'));

    for (const target of [...extensionTargets].reverse()) {
      let session = null;
      try {
        session = await openTargetSession(browserWebSocketUrl, target, timeoutMs);
        const inspect = await inspectTargetContent(session);
        const action = METAMASK_ACTION_LABELS.find((label) =>
          inspect.buttons.some((button) => button.toLowerCase().includes(label.toLowerCase())),
        );

        if (action) {
          return { ok: true, session, target, inspect, action };
        }
      } catch {
        if (session) {
          await session.connection.close().catch(() => {});
        }
      }

      if (session) {
        await session.connection.close().catch(() => {});
      }
    }

    await sleep(500);
  }

  return { ok: false };
}

async function approveMetaMaskPrompt(cdpBase, browserWebSocketUrl, timeoutMs) {
  const prompt = await findMetaMaskPrompt(cdpBase, browserWebSocketUrl, timeoutMs);
  if (!prompt?.ok || !prompt.session) {
    return prompt;
  }

  try {
    const click = await clickText(prompt.session, METAMASK_ACTION_LABELS);
    return {
      ok: Boolean(click?.ok),
      action: click?.label || prompt.action,
      target: {
        id: prompt.target.id,
        title: prompt.target.title,
        url: prompt.target.url,
      },
      inspect: prompt.inspect,
    };
  } finally {
    await prompt.session.connection.close().catch(() => {});
  }
}

async function cleanupKeys(baseUrl, accessToken, keyIds) {
  const results = [];
  for (const keyId of keyIds) {
    results.push(await apiRequest(baseUrl, accessToken, `/ai/api-keys/${keyId}`, { method: 'DELETE' }));
  }
  return results;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const env = await readLocalEnv();
  const sharedBaseUrl = resolveSharedBaseUrl(env, options.sharedBaseUrl);
  if (!sharedBaseUrl) {
    throw new Error('Could not resolve the shared Supabase function base URL. Set VITE_SUPABASE_URL and VITE_SUPABASE_FUNCTIONS_NAMESPACE or pass --shared-base-url.');
  }

  const cdpBase = normalizeBaseUrl(options.cdpUrl);
  const version = await fetchJson(`${cdpBase}/json/version`);
  let targets = await fetchJson(`${cdpBase}/json/list`);
  let candidateTargets = selectTargets(targets, options.matchUrl);
  let target = null;
  let targetProbes = [];
  if (candidateTargets.length > 0) {
    const selection = await pickBestTarget(
      version.webSocketDebuggerUrl,
      candidateTargets,
      options.timeoutMs,
      options.requireChainId,
    );
    target = selection.target;
    targetProbes = selection.probes;
  }
  if (!target && options.gotoUrl) {
    await createTarget(cdpBase, options.gotoUrl);
    targets = await fetchJson(`${cdpBase}/json/list`);
    candidateTargets = selectTargets(targets, options.matchUrl);
    const selection = await pickBestTarget(
      version.webSocketDebuggerUrl,
      candidateTargets,
      options.timeoutMs,
      options.requireChainId,
    );
    target = selection.target;
    targetProbes = selection.probes;
  }
  if (!target) {
    throw new Error(`No Chrome page target matched ${options.matchUrl}`);
  }

  const gotoUrl = resolveGotoUrl(options.gotoUrl, target.url);

  const runMarker = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const keyName = `${options.keyPrefix} ${runMarker}`;
  const summary = {
    pass: false,
    cdpUrl: options.cdpUrl,
    targetUrl: target.url,
    gotoUrl,
    sharedBaseUrl,
    keyName,
    cleanupEnabled: options.cleanup,
    candidateTargets: targetProbes.map((probe) => ({
      url: probe.target.url,
      title: probe.target.title,
      hasBridgeAccessToken: probe.hasBridgeAccessToken,
      selectedAddress: probe.walletState?.selectedAddress || null,
      chainId: probe.walletState?.chainId || null,
    })),
    wallet: null,
    initialBridgeSessionPresent: false,
    initialList: null,
    successPanel: null,
    securityPrompt: null,
    metamaskApproval: null,
    remoteConfirmation: null,
    uiConfirmation: null,
    cleanup: null,
    finalUiState: null,
    steps: [],
  };
  currentSummary = summary;

  const page = await openTargetSession(version.webSocketDebuggerUrl, target, options.timeoutMs);
  try {
    if (gotoUrl) {
      await navigate(page, gotoUrl);
      await sleep(1_000);
    }

    const walletStateResult = await waitForWalletState(page, options.smokeTimeoutMs, options.requireChainId);
    const walletState = walletStateResult.walletState;
    summary.wallet = walletState;
    summary.steps.push({
      stage: 'wallet_state_after_navigation',
      ok: walletStateResult.ok,
      waitedMs: walletStateResult.waitedMs,
      selectedAddress: walletState?.selectedAddress || null,
      chainId: walletState?.chainId || null,
    });
    if (!walletStateResult.ok || !walletState?.selectedAddress) {
      throw new Error('No connected wallet address was found in the target Chrome session.');
    }

    const actualChainId = parseChainId(walletState.chainId);
    if (options.requireChainId !== null && actualChainId !== options.requireChainId) {
      throw new Error(`Expected chain ${options.requireChainId}, but the target Chrome session is on ${walletState.chainId || 'unknown'}.`);
    }

    const initialBridgeSession = await getBridgeSession(page);
    summary.initialBridgeSessionPresent = Boolean(initialBridgeSession?.accessToken);
    let baselineKeyIds = null;
    if (initialBridgeSession?.accessToken) {
      const initialList = await apiRequest(sharedBaseUrl, initialBridgeSession.accessToken, '/ai/api-keys/list');
      const initialKeys = Array.isArray(initialList.body?.keys) ? initialList.body.keys : [];
      baselineKeyIds = new Set(initialKeys.map((key) => String(key.id)));
      summary.initialList = {
        status: initialList.status,
        ok: initialList.ok,
        count: initialKeys.length,
        ids: [...baselineKeyIds],
      };
    }

    const agentSettingsResult = await openAgentSettings(page, summary, options.smokeTimeoutMs);
    if (!agentSettingsResult?.ok) {
      throw new Error('Could not open Agent Settings in the target app tab.');
    }

    const modalResult = await openGenerateModal(page, summary, options.smokeTimeoutMs);
    if (!modalResult?.ok) {
      throw new Error('Could not open the Generate New API Key modal.');
    }

    if (modalResult.surface === 'security_prompt') {
      const securityClick = await clickText(page, ['Unlock API Keys', 'Continue to MetaMask']);
      summary.securityPrompt = {
        ok: Boolean(securityClick?.ok),
        phase: 'pre_generate_modal',
        click: securityClick,
      };
      if (!securityClick?.ok) {
        throw new Error('The API key security prompt appeared before the modal, but could not be confirmed.');
      }

      const metamaskApproval = await approveMetaMaskPrompt(cdpBase, version.webSocketDebuggerUrl, options.walletRequestTimeoutMs);
      summary.metamaskApproval = metamaskApproval;
      if (!metamaskApproval?.ok) {
        throw new Error('MetaMask confirmation did not complete for the API key pre-check prompt.');
      }

      const bridgeSessionAfterPrecheck = await waitForBridgeSession(page, options.smokeTimeoutMs);
      summary.steps.push({
        stage: 'bridge_session_after_precheck',
        ok: bridgeSessionAfterPrecheck.ok,
        waitedMs: bridgeSessionAfterPrecheck.waitedMs,
      });
      if (!bridgeSessionAfterPrecheck?.ok) {
        throw new Error('The API key pre-check did not establish a bridge session.');
      }

      const retriedModalResult = await openGenerateModal(page, summary, options.smokeTimeoutMs);
      if (!retriedModalResult?.ok || retriedModalResult.surface !== 'modal') {
        throw new Error('The Generate New API Key modal did not open after the security pre-check completed.');
      }
    }

    const fillResult = await fillKeyNameInput(page, keyName);
    summary.steps.push({ stage: 'fill_key_name', fillResult });
    if (!fillResult?.ok) {
      throw new Error('Could not fill the API key name input.');
    }

    const clickGenerate = await clickText(page, GENERATE_BUTTON_LABEL);
    summary.steps.push({ stage: 'click_generate', clickGenerate });
    if (!clickGenerate?.ok) {
      throw new Error('Could not click Generate Key.');
    }

    await sleep(1_000);
    const postClickInspect = await inspectTargetContent(page);
    const needsSecurityPrompt = SECURITY_PROMPT_LABELS.some((label) => postClickInspect.body.includes(label));
    if (needsSecurityPrompt) {
      const securityClick = await clickText(page, ['Unlock API Keys', 'Continue to MetaMask']);
      summary.securityPrompt = {
        ok: Boolean(securityClick?.ok),
        click: securityClick,
      };
      if (!securityClick?.ok) {
        throw new Error('The security prompt appeared, but could not be confirmed.');
      }

      const metamaskApproval = await approveMetaMaskPrompt(cdpBase, version.webSocketDebuggerUrl, options.walletRequestTimeoutMs);
      summary.metamaskApproval = metamaskApproval;
      if (!metamaskApproval?.ok) {
        throw new Error('MetaMask confirmation did not complete for the API key security prompt.');
      }

      await sleep(2_000);
      const retryGenerate = await clickText(page, GENERATE_BUTTON_LABEL);
      summary.steps.push({ stage: 'retry_generate_after_security', retryGenerate });
    }

    const successPanel = await waitForSuccessPanel(page, options.smokeTimeoutMs);
    summary.successPanel = {
      ok: Boolean(successPanel?.ok),
      waitedMs: successPanel?.waitedMs || 0,
      excerpt: sanitizeText(successPanel?.body || ''),
    };

    const bridgeSessionResult = await waitForBridgeSession(page, options.smokeTimeoutMs);
    summary.steps.push({
      stage: 'bridge_session_after_generate',
      ok: bridgeSessionResult.ok,
      waitedMs: bridgeSessionResult.waitedMs,
    });
    if (!bridgeSessionResult?.ok || !bridgeSessionResult.session?.accessToken) {
      throw new Error('The generate flow did not establish a Supabase bridge session in the app tab.');
    }
    const bridgeSession = bridgeSessionResult.session;

    const remoteConfirmation = await waitForRemoteKey(sharedBaseUrl, bridgeSession.accessToken, runMarker, options.smokeTimeoutMs);
    const createdKeys = remoteConfirmation.keys || [];
    summary.remoteConfirmation = {
      ok: Boolean(remoteConfirmation?.ok),
      waitedMs: remoteConfirmation?.waitedMs || 0,
      keys: createdKeys.map((key) => ({
        id: String(key.id),
        name: String(key.name || ''),
        keyPreview: String(key.keyPreview || ''),
      })),
      listStatus: remoteConfirmation?.list?.status || null,
    };
    if (!remoteConfirmation?.ok || createdKeys.length === 0) {
      throw new Error('The live API key list did not show the generated smoke key.');
    }

    if (summary.successPanel.ok) {
      const doneResult = await clickText(page, 'Done');
      summary.steps.push({ stage: 'close_success_panel', doneResult });
    }

    const uiConfirmation = await confirmUiKeyVisible(page, gotoUrl, runMarker, options.smokeTimeoutMs, summary);
    summary.uiConfirmation = {
      ok: Boolean(uiConfirmation?.ok),
      waitedMs: uiConfirmation?.waitedMs || 0,
      excerpt: sanitizeText(uiConfirmation?.body || ''),
    };
    if (!uiConfirmation?.ok) {
      throw new Error('The API key row did not render in the UI after the generate flow.');
    }

    if (options.cleanup) {
      const cleanupResults = await cleanupKeys(
        sharedBaseUrl,
        bridgeSession.accessToken,
        createdKeys.map((key) => String(key.id)),
      );
      const finalList = await apiRequest(sharedBaseUrl, bridgeSession.accessToken, '/ai/api-keys/list');
      const finalKeys = Array.isArray(finalList.body?.keys) ? finalList.body.keys : [];
      const finalKeyIds = new Set(finalKeys.map((key) => String(key.id)));
      const remainingSmokeKeys = finalKeys.filter((key) => String(key.name || '').includes(runMarker));
      summary.cleanup = {
        ok: cleanupResults.every((result) => result.ok)
          && remainingSmokeKeys.length === 0
          && (!baselineKeyIds || setsEqual(baselineKeyIds, finalKeyIds)),
        deleted: cleanupResults.map((result, index) => ({
          id: String(createdKeys[index]?.id || ''),
          status: result.status,
          ok: result.ok,
        })),
        finalCount: finalKeys.length,
        finalIds: [...finalKeyIds],
        remainingSmokeKeys: remainingSmokeKeys.map((key) => ({
          id: String(key.id),
          name: String(key.name || ''),
        })),
      };
      if (!summary.cleanup.ok) {
        throw new Error('Smoke cleanup failed to restore the baseline API key list.');
      }
    }

    const finalUiState = await confirmUiSettledWithout404(page, gotoUrl, options.smokeTimeoutMs, summary);
    summary.finalUiState = {
      ok: Boolean(finalUiState?.ok),
      waitedMs: finalUiState?.waitedMs || 0,
      excerpt: sanitizeText(finalUiState?.body || ''),
    };
    if (!finalUiState?.ok) {
      throw new Error('The API key section did not settle cleanly after the smoke run.');
    }

    summary.pass = true;
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await page.connection.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    pass: false,
    error: error instanceof Error ? error.message : String(error),
    summary: currentSummary,
  }, null, 2));
  process.exitCode = 1;
});