#!/usr/bin/env node

const path = require('path');
const {
  buildRoutePath,
  loadFoundryEnv,
  parseNamedArgs,
  requestJson,
  resolveBridgePrincipal,
} = require('./bridge_auth_client.cjs');

const argv = process.argv.slice(2);
const baseUrlArg = argv[0];
const anonKeyArg = argv[1];
const fnNameArg = argv[2] || 'orina-auth-bridge-v1';
const hasRoutePrefixArg = typeof argv[3] === 'string' && !String(argv[3]).startsWith('--');
const routePrefixArg = hasRoutePrefixArg ? argv[3] : undefined;
const namedArgs = parseNamedArgs(argv.slice(hasRoutePrefixArg ? 4 : 3));

if (!baseUrlArg || !anonKeyArg) {
  console.error(
    'Usage: node supabase/audit/backfill_runtime_minted_projection_repair.cjs <supabaseUrl> <anonJwt> [functionName=orina-auth-bridge-v1] [routePrefix] [--apply] [--limit <n>] [--asset-uid <uid>] [--asset-uids <a,b>] [--chain-id <id>] [--contract-address <0x...>] [--token-id <token>]'
  );
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..', '..');
const foundryEnv = loadFoundryEnv(ROOT);
const baseUrl = baseUrlArg.replace(/\/+$/, '');
const anonKey = anonKeyArg;
const fnName = String(fnNameArg || '').trim() || 'orina-auth-bridge-v1';
const routePrefix =
  typeof routePrefixArg === 'string'
    ? String(routePrefixArg).trim()
    : fnName === 'make-server-b0d68fc8'
      ? '/auth/supabase-claim-bridge'
      : '';

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return '';
}

function parsePositiveInt(value) {
  const raw = firstNonEmpty(value);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer: ${raw}`);
  }
  return Math.floor(parsed);
}

function parseCsv(values) {
  const list = [];
  for (const value of values) {
    const normalized = firstNonEmpty(value);
    if (!normalized) continue;
    for (const part of normalized.split(',')) {
      const trimmed = part.trim();
      if (trimmed) list.push(trimmed);
    }
  }
  return Array.from(new Set(list));
}

async function main() {
  const apply = String(namedArgs.apply || '').toLowerCase() === 'true';
  const dryRun = apply ? false : String(namedArgs['dry-run'] || 'true').toLowerCase() !== 'false';
  const limit = parsePositiveInt(namedArgs.limit);
  const assetUids = parseCsv([namedArgs['asset-uid'], namedArgs['asset-uids']]);
  const chainId = parsePositiveInt(namedArgs['chain-id']);
  const contractAddress = firstNonEmpty(namedArgs['contract-address']);
  const tokenId = firstNonEmpty(namedArgs['token-id']);

  const principal = await resolveBridgePrincipal({
    baseUrl,
    anonKey,
    fnName,
    routePrefix,
    namedArgs,
    phase: 'runtime-minted-projection-repair',
    fallbackPrivateKeys: [foundryEnv.PRIVATE_KEY, foundryEnv.SMOKE_SELLER_PRIVATE_KEY],
    requireWalletAddress: true,
  });

  const payload = {
    dryRun,
    limit: limit ?? undefined,
    assetUids: assetUids.length > 0 ? assetUids : undefined,
    chainId: chainId ?? undefined,
    contractAddress: contractAddress || undefined,
    tokenId: tokenId || undefined,
  };

  const response = await requestJson(
    `${baseUrl}/functions/v1/${fnName}${buildRoutePath(routePrefix, 'repair/runtime-minted-projections')}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${principal.accessToken}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  const output = {
    ok: response.ok,
    status: response.status,
    operatorWallet: principal.walletAddress,
    authSource: principal.authSource,
    payload,
    result: response.json,
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(response.ok ? 0 : 2);
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});