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
  const serviceRoleKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  const authBridgeFnName = env.VITE_SUPABASE_AUTH_BRIDGE_FN_NAME || 'orina-auth-bridge-v1';
  const sellerMintFnName = env.VITE_SUPABASE_SELLER_MINTING_FN_NAME || 'orina-seller-minting-v1';
  const routePrefix = env.VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX || '';
  const sellerPrivateKey = foundryEnv.SMOKE_SELLER_PRIVATE_KEY || '';

  if (!baseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Missing Supabase URL, anon key, or service role key in .env');
  }
  if (!sellerPrivateKey) {
    throw new Error('Missing SMOKE_SELLER_PRIVATE_KEY in foundry/.env');
  }

  const bridge = await resolveBridgePrincipal({
    baseUrl,
    anonKey,
    fnName: authBridgeFnName,
    routePrefix,
    phase: 'seller-mint-direct-smoke',
    fallbackPrivateKeys: [sellerPrivateKey],
    requireWalletAddress: true,
    clientApp: 'ATP2-smoke',
  });

  const requestBody = {
    sellerId: bridge.walletAddress,
    transactionHash: `0x${'d1'.repeat(32)}`,
    draft: {
      name: `Direct Seller Mint Smoke ${Date.now()}`,
      description: 'Direct dedicated seller mint smoke to verify orina-seller-minting-v1/mint-asset writes a rich catalog row.',
      category: 'electronics',
      subcategory: 'audio',
      attributes: {
        condition: 'new',
        color: 'black',
        material: 'polycarbonate',
        smoke: 'true',
      },
      imageUrls: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=1200&fit=crop'],
      estimatedPrice: {
        min: 59,
        suggested: 79,
        max: 99,
        currency: 'USD',
      },
      aiGenerated: true,
      confidence: 0.94,
    },
  };

  const mintResponse = await requestJson(`${baseUrl}/functions/v1/${sellerMintFnName}/mint-asset`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bridge.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!mintResponse.ok || !mintResponse.json?.success) {
    throw new Error(`Direct seller mint failed: ${JSON.stringify(mintResponse.json)}`);
  }

  const assetUid = String(mintResponse.json.assetUid || '');
  if (!assetUid) {
    throw new Error(`Direct seller mint response missing assetUid: ${JSON.stringify(mintResponse.json)}`);
  }

  const verifyResponse = await requestJson(
    `${baseUrl}/rest/v1/assets_catalog?asset_uid=eq.${encodeURIComponent(assetUid)}&select=id,asset_uid,title,category,subcategory,metadata,attributes,ai_analysis,is_active,ai_created,seller_user_id&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  );

  const row = Array.isArray(verifyResponse.json) ? verifyResponse.json[0] : null;
  const richMetadata = Boolean(
    row && row.metadata && row.metadata.name && row.metadata.image && row.metadata.seller && row.metadata.price,
  );

  const cleanup = row?.id
    ? await requestJson(
        `${baseUrl}/rest/v1/assets_catalog?id=eq.${encodeURIComponent(String(row.id))}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
            Prefer: 'return=representation',
          },
        },
      )
    : null;

  const summary = {
    ok: Boolean(mintResponse.ok && row && richMetadata),
    testedAt: new Date().toISOString(),
    walletAddress: bridge.walletAddress,
    assetUid,
    assetId: mintResponse.json.assetId || null,
    richMetadata,
    row,
    cleanup: cleanup ? { status: cleanup.status, ok: cleanup.ok } : null,
  };

  const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
  const outPath = buildActiveArtifactPath(`smoke_seller_minting_direct_${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ outPath, summary }, null, 2));

  process.exit(summary.ok ? 0 : 2);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
