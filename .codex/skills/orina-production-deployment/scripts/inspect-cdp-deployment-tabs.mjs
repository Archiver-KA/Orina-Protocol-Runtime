#!/usr/bin/env node

const DEFAULT_CDP_URL = 'http://127.0.0.1:9222';
const DEPLOYMENT_HOSTS = new Set(['github.com', 'dash.cloudflare.com', 'supabase.com']);

function redact(value) {
  return String(value || '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b(gho|ghp|github_pat)_[A-Za-z0-9_]{12,}\b/g, '[redacted-github-token]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-jwt]')
    .replace(/\b(sk|pk)_(live|test)_[A-Za-z0-9_-]{8,}\b/g, '[redacted-key]')
    .replace(/\b[AALW][A-Za-z0-9_-]{40,}\b/g, '[redacted-token]')
    .slice(0, 500);
}

function sanitizeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return '';
  }
}

function hostOf(rawUrl) {
  try {
    return new URL(rawUrl).host;
  } catch {
    return '';
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} while requesting ${url}`);
  return response.json();
}

class CdpSession {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
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
    if (!payload.id || !this.pending.has(payload.id)) return;
    const { resolve, reject } = this.pending.get(payload.id);
    this.pending.delete(payload.id);
    if (payload.error) reject(new Error(payload.error.message || `CDP error ${payload.id}`));
    else resolve(payload.result || {});
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.ws?.close();
    } catch {
      // Best-effort cleanup.
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

async function inspectTarget(target) {
  const session = new CdpSession(target.webSocketDebuggerUrl);
  await session.connect();
  try {
    await session.send('Runtime.enable');
    const snapshot = await evaluate(session, `(() => {
      const body = (document.body?.innerText || '').replace(/\\s+/g, ' ');
      const labels = Array.from(document.querySelectorAll('h1,h2,h3,[role="heading"],button,a'))
        .map((node) => (node.innerText || node.textContent || '').trim().replace(/\\s+/g, ' '))
        .filter(Boolean)
        .filter((text) => text.length <= 120);
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map((node) => ({
          text: (node.innerText || node.textContent || '').trim().replace(/\\s+/g, ' '),
          href: node.href
        }))
        .filter((link) => /build|deploy|production|settings|github|branch|rules|worker|function/i.test((link.text || '') + ' ' + (link.href || '')))
        .slice(0, 80);
      const lowerBody = body.toLowerCase();
      return {
        title: document.title,
        origin: location.origin,
        path: location.pathname,
        labels: Array.from(new Set(labels)).slice(0, 60),
        links,
        signals: {
          mentionsMain: /\\bmain\\b/i.test(body),
          mentionsProduction: lowerBody.includes('production'),
          mentionsBranchProtection: lowerBody.includes('branch protection'),
          mentionsProtectedBranches: lowerBody.includes('protected branches'),
          mentionsRulesets: lowerBody.includes('rulesets'),
          mentionsRequiredChecks: lowerBody.includes('required checks') || lowerBody.includes('status checks'),
          mentionsProtocolReleaseGate: lowerBody.includes('protocol release gate'),
          mentionsCloudflareWorkerBuilds: lowerBody.includes('worker builds') || lowerBody.includes('builds'),
          mentionsApporinaio: lowerBody.includes('apporinaio'),
          mentionsSupabaseProject: lowerBody.includes('vcixsdudkizgfikhmfuv') || lowerBody.includes('atp'),
          mentionsRlsDisabled: lowerBody.includes('rls disabled in public'),
          mentionsSecurityAdvisorErrors: lowerBody.includes('errors 1 errors') || lowerBody.includes('security advisor')
        }
      };
    })()`);
    return {
      id: target.id,
      host: hostOf(target.url),
      type: target.type,
      url: sanitizeUrl(target.url),
      title: redact(snapshot?.title || target.title),
      path: snapshot?.path || '',
      labels: (snapshot?.labels || []).map(redact),
      links: (snapshot?.links || []).map((link) => ({
        text: redact(link.text || ''),
        href: sanitizeUrl(link.href || ''),
      })),
      signals: snapshot?.signals || {},
    };
  } finally {
    session.close();
  }
}

async function main() {
  const cdpUrl = process.argv[2] || DEFAULT_CDP_URL;
  const payload = await fetchJson(`${cdpUrl.replace(/\/+$/, '')}/json/list`);
  const targets = Array.isArray(payload) ? payload : payload.value || [];
  const pages = targets.filter((target) => (
    target.type === 'page' &&
    DEPLOYMENT_HOSTS.has(hostOf(target.url)) &&
    target.webSocketDebuggerUrl
  ));

  const inspected = [];
  for (const target of pages) {
    inspected.push(await inspectTarget(target));
  }

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    cdpUrl,
    inspectedCount: inspected.length,
    inspected,
    secretValuesInspected: false,
    mutationAttempted: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    pass: false,
    error: redact(error.message),
    secretValuesInspected: false,
    mutationAttempted: false,
  }, null, 2));
  process.exit(1);
});
