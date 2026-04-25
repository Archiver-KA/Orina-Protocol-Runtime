#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { buildActiveArtifactPath } = require('./audit_artifact_paths.cjs');
const { loadFoundryEnv, requestJson, resolveBridgePrincipal } = require('./bridge_auth_client.cjs');

function readEnvFile(filePath) {
  const env = {};
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line) || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) env[key] = value;
  }
  return env;
}

async function main() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env not found');
  }

  const env = readEnvFile(envPath);
  const foundryEnv = loadFoundryEnv(process.cwd());
  const baseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.ATP2_SUPABASE_SERVICE_ROLE_KEY || '';
  const authBridgeFnName = env.VITE_SUPABASE_AUTH_BRIDGE_FN_NAME || 'orina-auth-bridge-v1';
  const receiptSyncFnName = env.VITE_SUPABASE_RECEIPT_SYNC_FN_NAME || 'orina-receipt-sync-v1';
  const routePrefix = env.VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX || '';
  const buyerPrivateKey = foundryEnv.SMOKE_BUYER_PRIVATE_KEY || '';
  const receiptContract = (foundryEnv.RECEIPT_NFT || env.VITE_RECEIPT_NFT_ADDRESS || '0x73719A7364c72cB0Ee77595773E9596976e298d1').toLowerCase();

  if (!baseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Missing Supabase URL, anon key, or service role key in .env');
  }
  if (!buyerPrivateKey) {
    throw new Error('Missing SMOKE_BUYER_PRIVATE_KEY in foundry/.env');
  }

  const bridge = await resolveBridgePrincipal({
    baseUrl,
    anonKey,
    fnName: authBridgeFnName,
    routePrefix,
    phase: 'receipt-sync-wallet-direct-smoke',
    fallbackPrivateKeys: [buyerPrivateKey],
    requireWalletAddress: true,
    clientApp: 'ATP2-smoke',
  });

  const syncResponse = await requestJson(`${baseUrl}/functions/v1/${receiptSyncFnName}/sync-wallet`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bridge.accessToken}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!syncResponse.ok || !syncResponse.json?.success) {
    throw new Error(`Wallet receipt sync failed: ${JSON.stringify(syncResponse.json)}`);
  }

  const receiptRowsResponse = await requestJson(
    `${baseUrl}/rest/v1/protocol_receipts?owner_address=eq.${encodeURIComponent(bridge.walletAddress)}&chain_id=eq.97&contract_address=eq.${encodeURIComponent(receiptContract)}&select=token_id,order_id,owner_address,amount,asset_type,chain_id,contract_address,tx_hash,log_index,block_number,block_time&order=token_id.asc`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  );

  const orderRowsResponse = await requestJson(
    `${baseUrl}/rest/v1/protocol_orders?buyer_address=eq.${encodeURIComponent(bridge.walletAddress)}&select=order_uid,status,asset_token_id,updated_at&order=order_uid.asc`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  );

  const receiptRows = Array.isArray(receiptRowsResponse.json) ? receiptRowsResponse.json : [];
  const orderRows = Array.isArray(orderRowsResponse.json) ? orderRowsResponse.json : [];
  const mintedOrderIds = receiptRows.map((row) => String(row.order_id));
  const mintedOrders = orderRows.filter((row) => mintedOrderIds.includes(String(row.order_uid)));

  const summary = {
    ok: Boolean(syncResponse.json?.receiptCount > 0 && receiptRows.length > 0),
    testedAt: new Date().toISOString(),
    walletAddress: bridge.walletAddress,
    syncResponse: syncResponse.json,
    receiptRowCount: receiptRows.length,
    receiptRows,
    mintedOrders,
  };

  const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
  const outPath = buildActiveArtifactPath(`smoke_receipt_sync_wallet_direct_${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ outPath, summary }, null, 2));

  process.exit(summary.ok ? 0 : 2);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
