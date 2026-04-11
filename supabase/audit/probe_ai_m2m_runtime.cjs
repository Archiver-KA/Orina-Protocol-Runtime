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

function buildFunctionBase(baseUrl, functionName) {
  return `${baseUrl}/functions/v1/${functionName}`;
}

function buildRoutePath(prefix, routePath) {
  const normalizedRoutePath = String(routePath || '').replace(/^\/+/, '');
  const normalizedPrefix = String(prefix || '').trim().replace(/\/+$/, '');

  if (!normalizedRoutePath) {
    return normalizedPrefix || '';
  }

  return normalizedPrefix ? `${normalizedPrefix}/${normalizedRoutePath}` : `/${normalizedRoutePath}`;
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
  const sharedFnName = env.VITE_SUPABASE_FUNCTIONS_NAMESPACE || env.VITE_SUPABASE_SHARED_SERVER_FN_NAME || 'make-server-b0d68fc8';
  const authBridgeFnName = env.VITE_SUPABASE_AUTH_BRIDGE_FN_NAME || 'orina-auth-bridge-v1';
  const bridgePathPrefix =
    env.VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX
    || (authBridgeFnName === sharedFnName ? '/auth/supabase-claim-bridge' : '');
  const aiM2MFnName = env.VITE_SUPABASE_AI_M2M_FN_NAME || 'orina-ai-m2m-v2';
  const aiM2MPathPrefix =
    env.VITE_SUPABASE_AI_M2M_PATH_PREFIX
    || (aiM2MFnName === sharedFnName ? '/ai/m2m' : '');

  if (!baseUrl || !anonKey) {
    console.error(JSON.stringify({ ok: false, error: 'Missing VITE_SUPABASE_URL or anon key in .env' }, null, 2));
    process.exit(1);
  }

  const authBridgeBase = buildFunctionBase(baseUrl, authBridgeFnName);
  const aiM2MBase = buildFunctionBase(baseUrl, aiM2MFnName);
  const headers = {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    'Content-Type': 'application/json',
  };
  const wallet = randomWallet();

  const probes = [
    { key: 'bridgeFunctionHealth', method: 'GET', url: `${authBridgeBase}/health` },
    { key: 'bridgeHealth', method: 'GET', url: `${authBridgeBase}${buildRoutePath(bridgePathPrefix, 'health')}` },
    { key: 'm2mConfig', method: 'GET', url: `${aiM2MBase}${buildRoutePath(aiM2MPathPrefix, `config/${wallet}`)}` },
    {
      key: 'm2mGenerate',
      method: 'POST',
      url: `${aiM2MBase}${buildRoutePath(aiM2MPathPrefix, 'delegates/generate')}`,
      body: { walletAddress: wallet },
    },
    {
      key: 'm2mInvite',
      method: 'POST',
      url: `${aiM2MBase}${buildRoutePath(aiM2MPathPrefix, 'delegates/invite')}`,
      body: { walletAddress: wallet },
    },
    {
      key: 'm2mAccept',
      method: 'POST',
      url: `${aiM2MBase}${buildRoutePath(aiM2MPathPrefix, 'delegates/accept-invite')}`,
      body: { inviteId: 'm2m_probe' },
    },
  ];

  const results = {};
  for (const probe of probes) {
    results[probe.key] = await requestJson(probe.url, {
      method: probe.method,
      headers,
      body: probe.body ? JSON.stringify(probe.body) : undefined,
    });
  }

  const statusSummary = Object.fromEntries(
    Object.entries(results).map(([key, value]) => [key, value.status]),
  );

  const pass = {
    bridgeFunctionHealth: results.bridgeFunctionHealth.status === 200,
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
      sharedFnName,
      authBridgeFnName,
      aiM2MFnName,
      authBridgeBase,
      aiM2MBase,
      bridgePathPrefix,
      aiM2MPathPrefix,
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
