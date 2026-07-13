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
const approvedOrigin = String(process.env.ATP2_SMOKE_ORIGIN || 'https://app.orina.io').trim();

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
  const challengePath = buildRoutePath(routePrefix, 'challenge');
  const challenge = await request(challengePath, {
    method: 'POST',
    headers: {
      Origin: approvedOrigin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ walletAddress: wallet, chainId: 97 }),
  });
  const exchangePath = buildRoutePath(routePrefix, 'exchange');
  const exchange = await request(exchangePath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Origin: approvedOrigin,
    },
    body: JSON.stringify({
      walletAddress: wallet,
      walletAuthSession: {
        address: wallet,
        signedAt: Date.parse(String(challenge.json?.issuedAt || '')) || Date.now(),
        signature: fakeSignature(),
        message: String(challenge.json?.message || ''),
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
    challenge: { kind: 'challenge', path: challengePath, status: challenge.status },
    exchange: { kind: 'exchange', path: exchangePath, ...exchange },
  };
  console.log(JSON.stringify(result, null, 2));
})();
