#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { buildActiveArtifactPath } = require('./audit_artifact_paths.cjs');

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

function inList(values) {
  return `(${values.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(',')})`;
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

async function main() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) {
    console.error(JSON.stringify({ ok: false, error: '.env not found' }, null, 2));
    process.exit(1);
  }

  const env = readEnvFile(envPath);
  const baseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const sharedFnName = env.VITE_SUPABASE_FUNCTIONS_NAMESPACE || env.VITE_SUPABASE_SHARED_SERVER_FN_NAME || 'make-server-b0d68fc8';
  if (!baseUrl || !anonKey) {
    console.error(JSON.stringify({ ok: false, error: 'Missing VITE_SUPABASE_URL / anon key in .env' }, null, 2));
    process.exit(1);
  }

  const restBase = `${baseUrl}/rest/v1`;
  const functionBase = `${baseUrl}/functions/v1/${sharedFnName}`;

  const ownedFixtureAssetUids = [
    'twf-a-rwa-001',
    'twf-a-receipt-001',
    'twf-a-nft-001',
    'twf-b-rwa-001',
    'twf-b-receipt-001',
    'twf-b-nft-001',
  ];

  const listingFixtureAssetUids = [
    'asset-001',
    'asset-002',
    'asset-003',
    'asset-004',
    'asset-005',
    'asset-009',
    'asset-010',
    'asset-011',
    'asset-013',
    'asset-014',
  ];

  const expectedAll = [...ownedFixtureAssetUids, ...listingFixtureAssetUids];

  const ownedSeedPayloadByUid = {
    'twf-a-rwa-001': {
      assetUid: 'twf-a-rwa-001',
      title: 'Da Nang Boutique Villa Fraction #A01',
      slug: 'twf-a-rwa-001-da-nang-boutique-villa-fraction-a01',
      category: 'Real Estate',
      description: 'Owned fixture asset (A/RWA) for ATP2 Phase C C2 metadata testing',
      coverImageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&auto=format&fit=crop',
      galleryImages: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&auto=format&fit=crop'],
      attributes: { Fixture: 'Test Wallet Deterministic', Variant: 'MyAssetRwaCard' },
      metadata: { seed_source: 'batch_c2_probe_v1', asset_namespace: 'owned_fixture' },
      contractAddress: '0x1111111111111111111111111111111111111111',
      tokenId: '12001',
      chainId: 97,
      isActive: false,
      media: [{ mediaType: 'image', url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&auto=format&fit=crop', sortOrder: 0 }],
      tags: ['owned_fixture', 'real-estate', 'rwa'],
    },
    'twf-a-receipt-001': {
      assetUid: 'twf-a-receipt-001',
      title: 'Arabica Reserve Vault Fraction #B02 Receipt',
      slug: 'twf-a-receipt-001-arabica-reserve-vault-fraction-b02-receipt',
      category: 'Collectibles',
      description: 'Owned fixture asset (A/Receipt) for ATP2 Phase C C2 metadata testing',
      coverImageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop',
      galleryImages: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop'],
      attributes: { Fixture: 'Test Wallet Deterministic', Variant: 'MyAssetReceiptCard', OrderId: 'ORD-B2A-0001' },
      metadata: { seed_source: 'batch_c2_probe_v1', asset_namespace: 'owned_fixture' },
      contractAddress: '0x1111111111111111111111111111111111111111',
      tokenId: '12002',
      chainId: 97,
      isActive: false,
      media: [{ mediaType: 'image', url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop', sortOrder: 0 }],
      tags: ['owned_fixture', 'collectibles', 'receipt'],
    },
    'twf-a-nft-001': {
      assetUid: 'twf-a-nft-001',
      title: 'Orina Signal Frame #A11',
      slug: 'twf-a-nft-001-orina-signal-frame-a11',
      category: 'Digital Art',
      description: 'Owned fixture asset (A/NFT) for ATP2 Phase C C2 metadata testing',
      coverImageUrl: 'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=800&auto=format&fit=crop',
      galleryImages: ['https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=800&auto=format&fit=crop'],
      attributes: { Fixture: 'Test Wallet Deterministic', Variant: 'MyAssetNftCard' },
      metadata: { seed_source: 'batch_c2_probe_v1', asset_namespace: 'owned_fixture' },
      contractAddress: '0x1111111111111111111111111111111111111111',
      tokenId: '12003',
      chainId: 97,
      isActive: false,
      media: [{ mediaType: 'image', url: 'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=800&auto=format&fit=crop', sortOrder: 0 }],
      tags: ['owned_fixture', 'digital-art', 'nft'],
    },
    'twf-b-rwa-001': {
      assetUid: 'twf-b-rwa-001',
      title: 'Arabica Reserve Vault Fraction #B02',
      slug: 'twf-b-rwa-001-arabica-reserve-vault-fraction-b02',
      category: 'Collectibles',
      description: 'Owned fixture asset (B/RWA) for ATP2 Phase C C2 metadata testing',
      coverImageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&auto=format&fit=crop',
      galleryImages: ['https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&auto=format&fit=crop'],
      attributes: { Fixture: 'Test Wallet Deterministic', Variant: 'MyAssetRwaCard' },
      metadata: { seed_source: 'batch_c2_probe_v1', asset_namespace: 'owned_fixture' },
      contractAddress: '0x1111111111111111111111111111111111111111',
      tokenId: '22001',
      chainId: 97,
      isActive: false,
      media: [{ mediaType: 'image', url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&auto=format&fit=crop', sortOrder: 0 }],
      tags: ['owned_fixture', 'collectibles', 'rwa'],
    },
    'twf-b-receipt-001': {
      assetUid: 'twf-b-receipt-001',
      title: 'Da Nang Boutique Villa Fraction #A01 Receipt',
      slug: 'twf-b-receipt-001-da-nang-boutique-villa-fraction-a01-receipt',
      category: 'Real Estate',
      description: 'Owned fixture asset (B/Receipt) for ATP2 Phase C C2 metadata testing',
      coverImageUrl: 'https://images.unsplash.com/photo-1613977257365-aaae5a9817ff?w=800&auto=format&fit=crop',
      galleryImages: ['https://images.unsplash.com/photo-1613977257365-aaae5a9817ff?w=800&auto=format&fit=crop'],
      attributes: { Fixture: 'Test Wallet Deterministic', Variant: 'MyAssetReceiptCard', OrderId: 'ORD-A2B-0001' },
      metadata: { seed_source: 'batch_c2_probe_v1', asset_namespace: 'owned_fixture' },
      contractAddress: '0x1111111111111111111111111111111111111111',
      tokenId: '22002',
      chainId: 97,
      isActive: false,
      media: [{ mediaType: 'image', url: 'https://images.unsplash.com/photo-1613977257365-aaae5a9817ff?w=800&auto=format&fit=crop', sortOrder: 0 }],
      tags: ['owned_fixture', 'real-estate', 'receipt'],
    },
    'twf-b-nft-001': {
      assetUid: 'twf-b-nft-001',
      title: 'Orina Trade Pass #B07',
      slug: 'twf-b-nft-001-orina-trade-pass-b07',
      category: 'Gaming',
      description: 'Owned fixture asset (B/NFT) for ATP2 Phase C C2 metadata testing',
      coverImageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop',
      galleryImages: ['https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop'],
      attributes: { Fixture: 'Test Wallet Deterministic', Variant: 'MyAssetNftCard' },
      metadata: { seed_source: 'batch_c2_probe_v1', asset_namespace: 'owned_fixture' },
      contractAddress: '0x1111111111111111111111111111111111111111',
      tokenId: '22003',
      chainId: 97,
      isActive: false,
      media: [{ mediaType: 'image', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop', sortOrder: 0 }],
      tags: ['owned_fixture', 'gaming', 'nft'],
    },
  };

  const headers = {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    'Content-Type': 'application/json',
  };

  const summary = {
    context: {
      testedAt: new Date().toISOString(),
      baseUrl,
      sharedFnName,
      functionBase,
    },
    expected: {
      ownedFixtureAssetUids,
      listingFixtureAssetUids,
      total: expectedAll.length,
    },
    checks: {},
    raw: {},
  };

  // Route reachability probe (empty payload should be valid no-op)
  summary.raw.seedRouteProbe = await requestJson(`${functionBase}/asset-metadata-seed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ assetItems: [] }),
  });
  summary.checks.seed_route_reachable =
    summary.raw.seedRouteProbe.status === 200 &&
    summary.raw.seedRouteProbe.json &&
    summary.raw.seedRouteProbe.json.ok === true;

  async function fetchCatalogRows() {
    return requestJson(
      `${restBase}/assets_catalog?select=id,asset_uid,title,is_active,metadata_version,cover_image_url&asset_uid=in.${inList(expectedAll)}`,
      { headers }
    );
  }

  summary.raw.catalogRows = await fetchCatalogRows();

  const catalogRows = Array.isArray(summary.raw.catalogRows.json) ? summary.raw.catalogRows.json : [];
  const catalogByUid = new Map(catalogRows.map((r) => [String(r.asset_uid).toLowerCase(), r]));
  const catalogIds = catalogRows.map((r) => r.id).filter(Boolean);

  const missingCatalog = expectedAll.filter((uid) => !catalogByUid.has(uid));

  // Auto-seed missing owned fixture rows (common if UI test did not open My Assets page on both browsers).
  const missingOwnedFixture = missingCatalog.filter((uid) => ownedFixtureAssetUids.includes(uid));
  if (missingOwnedFixture.length > 0) {
    const seedItems = missingOwnedFixture.map((uid) => ownedSeedPayloadByUid[uid]).filter(Boolean);
    if (seedItems.length > 0) {
      summary.raw.autoSeedOwnedFixtures = await requestJson(`${functionBase}/asset-metadata-seed`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ assetItems: seedItems, client: { app: 'ATP2', phase: 'C2-probe-autoseed', requestedAt: new Date().toISOString() } }),
      });
      summary.raw.catalogRowsAfterAutoSeed = await fetchCatalogRows();
      const rowsAfter = Array.isArray(summary.raw.catalogRowsAfterAutoSeed.json) ? summary.raw.catalogRowsAfterAutoSeed.json : [];
      catalogRows.length = 0;
      catalogRows.push(...rowsAfter);
      catalogByUid.clear?.();
      for (const row of rowsAfter) catalogByUid.set(String(row.asset_uid).toLowerCase(), row);
    }
  }

  const publicVisibleCatalog = expectedAll.filter((uid) => catalogByUid.has(uid));
  const missingCatalogAfterSeed = expectedAll.filter((uid) => !catalogByUid.has(uid));
  const autoSeedRows = Array.isArray(summary.raw.autoSeedOwnedFixtures?.json?.rows)
    ? summary.raw.autoSeedOwnedFixtures.json.rows
    : [];
  const autoSeededOwnedSet = new Set(
    autoSeedRows.map((r) => String(r.assetUid || '').toLowerCase()).filter(Boolean)
  );

  const missingOwnedViaSeedAck = ownedFixtureAssetUids.filter((uid) => !autoSeededOwnedSet.has(uid));
  const ownedUnexpectedlyPublicVisible = ownedFixtureAssetUids.filter((uid) => publicVisibleCatalog.includes(uid));
  const listingActiveWrong = listingFixtureAssetUids.filter((uid) => catalogByUid.get(uid)?.is_active !== true);

  summary.checks.catalog_public_rows_present_for_listing_set =
    listingFixtureAssetUids.every((uid) => catalogByUid.has(uid));
  summary.checks.owned_fixture_seed_acknowledged =
    missingOwnedViaSeedAck.length === 0;
  summary.checks.owned_fixture_hidden_from_public_catalog =
    ownedUnexpectedlyPublicVisible.length === 0;
  summary.checks.listing_rows_active = listingActiveWrong.length === 0;

  summary.raw.assetMediaRows = catalogIds.length
    ? await requestJson(
        `${restBase}/asset_media?select=id,asset_id,media_type,url,sort_order&asset_id=in.${inList(catalogIds)}`,
        { headers }
      )
    : { status: 0, ok: false, json: [] };

  const mediaRows = Array.isArray(summary.raw.assetMediaRows.json) ? summary.raw.assetMediaRows.json : [];
  const mediaCountByAssetId = new Map();
  for (const row of mediaRows) {
    const key = String(row.asset_id);
    mediaCountByAssetId.set(key, (mediaCountByAssetId.get(key) || 0) + 1);
  }
  const mediaMissingAssetUids = catalogRows
    .filter((row) => (mediaCountByAssetId.get(String(row.id)) || 0) < 1)
    .map((row) => String(row.asset_uid));
  summary.checks.media_rows_present_for_each_catalog = mediaMissingAssetUids.length === 0;

  summary.raw.assetTagMapRows = catalogIds.length
    ? await requestJson(
        `${restBase}/asset_tag_map?select=asset_id,tag_id&asset_id=in.${inList(catalogIds)}`,
        { headers }
      )
    : { status: 0, ok: false, json: [] };

  const tagMapRows = Array.isArray(summary.raw.assetTagMapRows.json) ? summary.raw.assetTagMapRows.json : [];
  const tagMapCountByAssetId = new Map();
  for (const row of tagMapRows) {
    const key = String(row.asset_id);
    tagMapCountByAssetId.set(key, (tagMapCountByAssetId.get(key) || 0) + 1);
  }
  const tagMapMissingAssetUids = catalogRows
    .filter((row) => (tagMapCountByAssetId.get(String(row.id)) || 0) < 1)
    .map((row) => String(row.asset_uid));
  summary.checks.tag_map_rows_present_for_each_catalog = tagMapMissingAssetUids.length === 0;

  summary.diagnostics = {
    missingCatalogPublicRead: missingCatalogAfterSeed,
    missingOwnedViaSeedAck,
    ownedUnexpectedlyPublicVisible,
    listingActiveWrong,
    mediaMissingAssetUids,
    tagMapMissingAssetUids,
    counts: {
      catalogRowsPublicVisible: catalogRows.length,
      mediaRows: mediaRows.length,
      tagMapRows: tagMapRows.length,
    },
  };

  summary.pass = Object.values(summary.checks).every(Boolean);

  const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
  const outPath = buildActiveArtifactPath(`batch_c2_asset_metadata_seed_smoke_probe_${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ pass: summary.pass, outPath, checks: summary.checks, diagnostics: summary.diagnostics }, null, 2));

  process.exit(summary.pass ? 0 : 3);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
