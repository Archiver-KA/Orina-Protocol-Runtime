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

async function deleteByAssetUid(baseUrl, serviceRoleKey, assetUid) {
  return requestJson(
    `${baseUrl}/rest/v1/assets_catalog?asset_uid=eq.${encodeURIComponent(assetUid)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        Prefer: 'return=representation',
      },
    },
  );
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
    phase: 'asset-metadata-seed-direct-smoke',
    fallbackPrivateKeys: [sellerPrivateKey],
    requireWalletAddress: true,
    clientApp: 'ATP2-smoke',
  });

  const assetUid = `bridge_seed_smoke_${Date.now()}`;
  const assetItems = [
    {
      assetUid,
      title: 'Protected Bridge Seed Smoke Asset',
      slug: `protected-bridge-seed-smoke-${Date.now()}`,
      category: 'Collectibles',
      subcategory: 'Test',
      description: 'Protected auth-bridge asset metadata seed smoke record.',
      coverImageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200&h=1200&fit=crop',
      galleryImages: ['https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200&h=1200&fit=crop'],
      attributes: { smoke: true, source: 'protected_bridge_seed' },
      metadata: { smoke: true, source: 'protected_bridge_seed_direct' },
      contractAddress: '0x72c3477c57097f3791501f3839bb380a019b754f',
      tokenId: `${Date.now()}`,
      chainId: 97,
      isActive: false,
      media: [
        {
          mediaType: 'image',
          url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200&h=1200&fit=crop',
          sortOrder: 0,
        },
      ],
      tags: ['smoke', 'bridge', 'seed'],
    },
  ];

  const seedResponse = await requestJson(`${baseUrl}/functions/v1/${authBridgeFnName}${routePrefix}/asset-metadata-seed`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bridge.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assetItems,
      client: {
        app: 'ATP2-smoke',
        phase: 'asset-metadata-seed-direct',
        requestedAt: new Date().toISOString(),
      },
    }),
  });

  if (!seedResponse.ok || !seedResponse.json?.ok) {
    throw new Error(`Protected asset-metadata-seed failed: ${JSON.stringify(seedResponse.json)}`);
  }

  const catalogResponse = await requestJson(
    `${baseUrl}/rest/v1/assets_catalog?asset_uid=eq.${encodeURIComponent(assetUid)}&select=id,asset_uid,title,is_active,metadata,attributes&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  );

  const mediaResponse = await requestJson(
    `${baseUrl}/rest/v1/asset_media?select=id,asset_id,media_type,url,sort_order&url=eq.${encodeURIComponent(assetItems[0].coverImageUrl)}&limit=5`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  );

  const row = Array.isArray(catalogResponse.json) ? catalogResponse.json[0] : null;
  const mediaRows = Array.isArray(mediaResponse.json) ? mediaResponse.json : [];
  const cleanup = await deleteByAssetUid(baseUrl, serviceRoleKey, assetUid);

  const summary = {
    ok: Boolean(seedResponse.ok && row && mediaRows.length > 0),
    testedAt: new Date().toISOString(),
    walletAddress: bridge.walletAddress,
    assetUid,
    seedRows: seedResponse.json?.rows || [],
    catalogRow: row,
    mediaRowCount: mediaRows.length,
    cleanup: { status: cleanup.status, ok: cleanup.ok },
  };

  const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
  const outPath = buildActiveArtifactPath(`smoke_asset_metadata_seed_direct_${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ outPath, summary }, null, 2));

  process.exit(summary.ok ? 0 : 2);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
