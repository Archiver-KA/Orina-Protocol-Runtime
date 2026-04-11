#!/usr/bin/env node

const [baseUrlArg, anonKeyArg, fnNameArg = 'orina-auth-bridge-v1', routePrefixArg] = process.argv.slice(2);

if (!baseUrlArg || !anonKeyArg) {
  console.error(
    'Usage: node supabase/audit/test_h1_claim_bridge_http.cjs <supabaseUrl> <anonJwt> [functionName=orina-auth-bridge-v1]'
  );
  process.exit(1);
}

const baseUrl = baseUrlArg.replace(/\/+$/, '');
const anonKey = anonKeyArg;
const fnName = fnNameArg;

const functionBase = `${baseUrl}/functions/v1/${fnName}`;
const routePrefix =
  typeof routePrefixArg === 'string'
    ? routePrefixArg
    : fnName === 'make-server-b0d68fc8'
      ? '/auth/supabase-claim-bridge'
      : '';

function buildRoutePath(prefix, routePath) {
  const normalizedRoutePath = String(routePath || '').replace(/^\/+/, '');
  const normalizedPrefix = String(prefix || '').trim().replace(/\/+$/, '');

  if (!normalizedRoutePath) {
    return normalizedPrefix || '';
  }

  return normalizedPrefix ? `${normalizedPrefix}/${normalizedRoutePath}` : `/${normalizedRoutePath}`;
}

function buildOrinaMessage(walletAddress, timeIso) {
  return [
    'Orina Wallet Session Authentication',
    '',
    'Sign this message to authenticate your session in Orina.',
    'No blockchain transaction or gas fee is required.',
    '',
    `Address: ${walletAddress}`,
    `Time: ${timeIso}`,
  ].join('\n');
}

async function request(path, init = {}) {
  const url = `${functionBase}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { url, status: res.status, json };
}

function randomWallet() {
  const chars = 'abcdef0123456789';
  let out = '0x';
  for (let i = 0; i < 40; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function fakeSignature() {
  return `0x${'1a'.repeat(65)}`;
}

(async () => {
  const probePaths = [
    '/health',
    buildRoutePath(routePrefix, 'health'),
  ];
  const probes = [];
  for (const p of [...new Set(probePaths)]) {
    probes.push({ kind: 'probe', path: p, ...(await request(p)) });
  }

  const wallet = randomWallet();
  const exchangePath = buildRoutePath(routePrefix, 'exchange');
  const nowIso = new Date().toISOString();
  const exchange = await request(exchangePath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({
      walletAddress: wallet,
      walletAuthSession: {
        address: wallet,
        signedAt: Date.now(),
        signature: fakeSignature(),
        message: buildOrinaMessage(wallet, nowIso),
      },
      client: {
        app: 'ATP2',
        phase: 'H1-http-test',
        requestedAt: new Date().toISOString(),
      },
    }),
  });
  const result = {
    context: {
      functionBase,
      fnName,
      routePrefix,
      testedAt: new Date().toISOString(),
    },
    probes,
    exchange: { kind: 'exchange', path: exchangePath, ...exchange },
  };
  console.log(JSON.stringify(result, null, 2));
})();
