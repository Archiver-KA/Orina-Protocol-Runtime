#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readEnvFile(filepath) {
  const env = {};
  const text = fs.readFileSync(filepath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line) || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    env[key] = value;
  }
  return env;
}

async function requestJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, json };
}

function randomWallet() {
  const chars = 'abcdef0123456789';
  let out = '0x';
  for (let i = 0; i < 40; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function main() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) {
    console.error(JSON.stringify({ ok: false, error: '.env not found' }, null, 2));
    process.exit(1);
  }

  const env = readEnvFile(envPath);
  const baseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const fnName = env.VITE_SUPABASE_AUTH_BRIDGE_FN_NAME || 'make-server-b0d68fc8';
  const bridgePathPrefix = env.VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX || '/auth/supabase-claim-bridge';

  if (!baseUrl || !anonKey) {
    console.error(JSON.stringify({ ok: false, error: 'Missing VITE_SUPABASE_URL or anon key in .env' }, null, 2));
    process.exit(1);
  }

  const functionBase = `${baseUrl}/functions/v1/${fnName}`;
  const headers = {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    'Content-Type': 'application/json',
  };
  const wallet = randomWallet();

  const probes = [
    { key: 'functionHealth', method: 'GET', path: '/health' },
    { key: 'bridgeHealth', method: 'GET', path: `${bridgePathPrefix}/health` },
    { key: 'm2mConfig', method: 'GET', path: `/ai/m2m/config/${wallet}` },
    { key: 'm2mGenerate', method: 'POST', path: '/ai/m2m/delegates/generate', body: { walletAddress: wallet } },
    { key: 'm2mInvite', method: 'POST', path: '/ai/m2m/delegates/invite', body: { walletAddress: wallet } },
    { key: 'm2mAccept', method: 'POST', path: '/ai/m2m/delegates/accept-invite', body: { inviteId: 'm2m_probe' } },
  ];

  const results = {};
  for (const probe of probes) {
    const url = `${functionBase}${probe.path}`;
    results[probe.key] = await requestJson(url, {
      method: probe.method,
      headers,
      body: probe.body ? JSON.stringify(probe.body) : undefined,
    });
  }

  const statusSummary = Object.fromEntries(
    Object.entries(results).map(([key, value]) => [key, value.status]),
  );

  const pass = {
    functionHealth: results.functionHealth.status === 200,
    bridgeHealth: results.bridgeHealth.status === 200,
    bridgeVerificationModeHardened:
      results.bridgeHealth.json &&
      results.bridgeHealth.json.verificationMode === 'wallet_session_row',
    m2mConfigRoutePresent: results.m2mConfig.status !== 404,
    m2mGenerateRoutePresent: results.m2mGenerate.status !== 404,
    m2mInviteRoutePresent: results.m2mInvite.status !== 404,
    m2mAcceptRoutePresent: results.m2mAccept.status !== 404,
  };

  const out = {
    ok: Object.values(pass).every(Boolean),
    context: {
      testedAt: new Date().toISOString(),
      functionBase,
      wallet,
    },
    pass,
    statusSummary,
    results,
  };

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 3);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
