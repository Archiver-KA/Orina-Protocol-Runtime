#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const CURRENT_CANONICAL_SCOPE = {
  chainId: 97,
  assetContract: '0x72c3477c57097f3791501f3839bb380a019b754f',
  marketplaceContract: '0xbc6f46000b2709714c3908bb6b71bab67a2d1495',
  receiptContract: '0x73719a7364c72cb0ee77595773e9596976e298d1',
  assetTokenIds: Array.from({ length: 12 }, (_, index) => String(index)),
  orderIds: Array.from({ length: 9 }, (_, index) => String(index)),
};

const LEGACY_SHADOW_SCOPE = {
  chainId: 97,
  marketplaceContracts: [
    '0xf9a6900ffd8b7d42df1a41ad9d990938607d5b97',
    '0x6154d16f4f52c1a4157928f136a53ac3b83b510b',
    '0xa97fa9d4c3bf7d4ef9b55de4fb92b9d367a5ef0f',
  ],
  assetContracts: [
    '0x068e73af038fbf58dd56413b8ae70dd0ebda9c79',
    '0x0fce357207f5dd56703847789ba82a134dabdba9',
    '0x9c7a0cbe9bfee78a74c370518ce04f610ff11c11',
    '0xa0c34b5a941420626146bc61e15893bc1f86bf39',
    '0xce6cf259137c7bbbc255b2ef59d9356f7d8e6959',
  ],
};

function parseEnvFile(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = String(line || '').trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    map[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1).trim();
  }
  return map;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const raw = String(argv[index] || '');
    if (!raw.startsWith('--')) continue;
    const key = raw.slice(2);
    const next = argv[index + 1];
    if (!next || String(next).startsWith('--')) {
      options[key] = 'true';
      continue;
    }
    options[key] = String(next);
    index += 1;
  }
  return options;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function normalizeAddress(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function encodeEq(value) {
  if (value === null) return 'is.null';
  return `eq.${encodeURIComponent(String(value))}`;
}

function encodeIn(values) {
  const normalized = values.map((value) => `"${String(value || '').replace(/"/g, '\\"')}"`).join(',');
  return `in.(${normalized})`;
}

function toQuery(params) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && String(value).length > 0);
  if (entries.length === 0) return '';
  return `?${entries.map(([key, value]) => `${key}=${value}`).join('&')}`;
}

async function requestJsonOrThrow(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      payload?.hint ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function buildHeaders(ctx, extra = {}) {
  return {
    apikey: ctx.serviceRoleKey,
    authorization: `Bearer ${ctx.serviceRoleKey}`,
    'content-type': 'application/json',
    ...extra,
  };
}

async function restSelect(ctx, table, query = '') {
  return requestJsonOrThrow(`${ctx.supabaseUrl}/rest/v1/${table}${query}`, {
    headers: buildHeaders(ctx),
  });
}

async function restUpsert(ctx, table, rows, onConflict) {
  const query = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  return requestJsonOrThrow(`${ctx.supabaseUrl}/rest/v1/${table}${query}`, {
    method: 'POST',
    headers: buildHeaders(ctx, {
      Prefer: 'return=representation,resolution=merge-duplicates',
    }),
    body: JSON.stringify(rows),
  });
}

async function restDelete(ctx, table, query) {
  return requestJsonOrThrow(`${ctx.supabaseUrl}/rest/v1/${table}${query}`, {
    method: 'DELETE',
    headers: buildHeaders(ctx, {
      Prefer: 'return=representation',
    }),
  });
}

function loadContext() {
  const rootEnv = parseEnvFile(path.join(ROOT, '.env'));
  const foundryEnv = parseEnvFile(path.join(ROOT, 'foundry', '.env'));
  const supabaseUrl = String(
    firstNonEmpty(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_URL,
      rootEnv.VITE_SUPABASE_URL,
      foundryEnv.VITE_SUPABASE_URL,
    ),
  ).replace(/\/+$/, '');
  const serviceRoleKey = firstNonEmpty(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.ATP2_SUPABASE_SERVICE_ROLE_KEY,
    rootEnv.SUPABASE_SERVICE_ROLE_KEY,
    rootEnv.ATP2_SUPABASE_SERVICE_ROLE_KEY,
    foundryEnv.SUPABASE_SERVICE_ROLE_KEY,
    foundryEnv.ATP2_SUPABASE_SERVICE_ROLE_KEY,
  );

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / ATP2_SUPABASE_SERVICE_ROLE_KEY');
  }

  return {
    supabaseUrl,
    serviceRoleKey,
  };
}

function buildCurrentVisibilityRows() {
  const assets = CURRENT_CANONICAL_SCOPE.assetTokenIds.map((tokenId) => ({
    entity_type: 'asset',
    chain_id: CURRENT_CANONICAL_SCOPE.chainId,
    contract_address: CURRENT_CANONICAL_SCOPE.assetContract,
    entity_uid: tokenId,
    hidden: true,
    archived: true,
    reason: 'runtime canonical smoke archive',
    metadata: {
      cleanup_scope: 'current_canonical_smoke',
      cleanup_source: 'runtime_smoke_cleanup',
      entity_kind: 'asset',
      receipt_contract: CURRENT_CANONICAL_SCOPE.receiptContract,
    },
  }));

  const orders = CURRENT_CANONICAL_SCOPE.orderIds.map((orderId) => ({
    entity_type: 'order',
    chain_id: CURRENT_CANONICAL_SCOPE.chainId,
    contract_address: CURRENT_CANONICAL_SCOPE.marketplaceContract,
    entity_uid: orderId,
    hidden: true,
    archived: true,
    reason: 'runtime canonical smoke archive',
    metadata: {
      cleanup_scope: 'current_canonical_smoke',
      cleanup_source: 'runtime_smoke_cleanup',
      entity_kind: 'order',
      asset_contract: CURRENT_CANONICAL_SCOPE.assetContract,
    },
  }));

  return [...assets, ...orders];
}

async function fetchLegacyRows(ctx) {
  const [allOrders, allAssets, allLinks] = await Promise.all([
    restSelect(
      ctx,
      'protocol_orders',
      toQuery({
        select: 'id,order_uid,chain_id,marketplace_contract,asset_contract,status,metadata,updated_at',
        chain_id: encodeEq(LEGACY_SHADOW_SCOPE.chainId),
        limit: '500',
      }),
    ),
    restSelect(
      ctx,
      'protocol_assets',
      toQuery({
        select: 'id,chain_id,asset_contract,token_id,status,metadata,updated_at',
        chain_id: encodeEq(LEGACY_SHADOW_SCOPE.chainId),
        limit: '500',
      }),
    ),
    restSelect(
      ctx,
      'asset_protocol_links',
      toQuery({
        select: 'asset_id,chain_id,contract_address,token_id,link_type',
        chain_id: encodeEq(LEGACY_SHADOW_SCOPE.chainId),
        limit: '500',
      }),
    ).catch(() => []),
  ]);

  const legacyMarketplaceSet = new Set(LEGACY_SHADOW_SCOPE.marketplaceContracts.map((value) => normalizeAddress(value)));
  const legacyAssetSet = new Set(LEGACY_SHADOW_SCOPE.assetContracts.map((value) => normalizeAddress(value)));

  const orders = allOrders.filter((row) => (
    legacyMarketplaceSet.has(normalizeAddress(row.marketplace_contract))
    || legacyAssetSet.has(normalizeAddress(row.asset_contract))
  ));
  const assets = allAssets.filter((row) => legacyAssetSet.has(normalizeAddress(row.asset_contract)));
  const links = allLinks.filter((row) => legacyAssetSet.has(normalizeAddress(row.contract_address)));

  const orderIds = orders
    .map((row) => normalizeText(row.id))
    .filter(Boolean);
  const assetIds = assets
    .map((row) => normalizeText(row.id))
    .filter(Boolean);

  const [orderEvents, assetEvents] = await Promise.all([
    orderIds.length > 0
      ? restSelect(
          ctx,
          'protocol_order_events',
          toQuery({
            select: 'id,order_id,event_name,created_at',
            order_id: encodeIn(orderIds),
            limit: '500',
          }),
        )
      : [],
    assetIds.length > 0
      ? restSelect(
          ctx,
          'protocol_asset_events',
          toQuery({
            select: 'id,protocol_asset_id,event_name,created_at',
            protocol_asset_id: encodeIn(assetIds),
            limit: '500',
          }),
        )
      : [],
  ]);

  return { orders, assets, orderEvents, assetEvents, links };
}

async function fetchCurrentCanonicalSummary(ctx) {
  const [visibilityRows, protocolOrders, protocolAssets, catalogRows] = await Promise.all([
    restSelect(
      ctx,
      'protocol_projection_visibility',
      toQuery({
        select: 'entity_type,chain_id,contract_address,entity_uid,hidden,archived,reason,updated_at',
        chain_id: encodeEq(CURRENT_CANONICAL_SCOPE.chainId),
        contract_address: encodeIn([
          CURRENT_CANONICAL_SCOPE.assetContract,
          CURRENT_CANONICAL_SCOPE.marketplaceContract,
        ]),
        limit: '100',
      }),
    ).catch(() => []),
    restSelect(
      ctx,
      'protocol_orders',
      toQuery({
        select: 'id,order_uid,status,updated_at',
        chain_id: encodeEq(CURRENT_CANONICAL_SCOPE.chainId),
        marketplace_contract: encodeEq(CURRENT_CANONICAL_SCOPE.marketplaceContract),
        limit: '100',
      }),
    ),
    restSelect(
      ctx,
      'protocol_assets',
      toQuery({
        select: 'id,token_id,status,updated_at',
        chain_id: encodeEq(CURRENT_CANONICAL_SCOPE.chainId),
        asset_contract: encodeEq(CURRENT_CANONICAL_SCOPE.assetContract),
        limit: '100',
      }),
    ),
    restSelect(
      ctx,
      'assets_catalog',
      toQuery({
        select: 'id,asset_uid,title,is_active,token_id,updated_at',
        chain_id: encodeEq(CURRENT_CANONICAL_SCOPE.chainId),
        contract_address: encodeEq(CURRENT_CANONICAL_SCOPE.assetContract),
        limit: '100',
      }),
    ).catch(() => []),
  ]);

  return {
    visibilityRows,
    protocolOrders,
    protocolAssets,
    catalogRows,
  };
}

function writeSnapshotFile(snapshot) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(__dirname, `generated_runtime_smoke_cleanup_snapshot_${stamp}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2));
  return outputPath;
}

async function archiveCurrentCanonical(ctx, apply) {
  const summary = await fetchCurrentCanonicalSummary(ctx);
  const rows = buildCurrentVisibilityRows();

  if (!apply) {
    return {
      action: 'archive-current-canonical',
      apply: false,
      currentSummary: {
        protocolOrders: summary.protocolOrders.length,
        protocolAssets: summary.protocolAssets.length,
        catalogRows: summary.catalogRows.length,
        visibilityRows: summary.visibilityRows.length,
      },
      rowsToUpsert: rows,
    };
  }

  const upserted = await restUpsert(
    ctx,
    'protocol_projection_visibility',
    rows,
    'entity_type,chain_id,contract_address,entity_uid',
  );

  return {
    action: 'archive-current-canonical',
    apply: true,
    upsertedCount: Array.isArray(upserted) ? upserted.length : 0,
    upsertedRows: upserted,
  };
}

async function purgeLegacyShadow(ctx, apply) {
  const snapshot = await fetchLegacyRows(ctx);

  if (!apply) {
    return {
      action: 'purge-legacy-shadow',
      apply: false,
      counts: {
        orders: snapshot.orders.length,
        orderEvents: snapshot.orderEvents.length,
        assets: snapshot.assets.length,
        assetEvents: snapshot.assetEvents.length,
        assetProtocolLinks: snapshot.links.length,
      },
      scope: LEGACY_SHADOW_SCOPE,
    };
  }

  const snapshotPath = writeSnapshotFile({
    generatedAt: new Date().toISOString(),
    scope: LEGACY_SHADOW_SCOPE,
    snapshot,
  });

  const orderIds = snapshot.orders.map((row) => normalizeText(row.id)).filter(Boolean);
  const assetIds = snapshot.assets.map((row) => normalizeText(row.id)).filter(Boolean);

  const deletedOrderEvents = orderIds.length > 0
    ? await restDelete(
        ctx,
        'protocol_order_events',
        toQuery({
          order_id: encodeIn(orderIds),
        }),
      )
    : [];

  const deletedAssetEvents = assetIds.length > 0
    ? await restDelete(
        ctx,
        'protocol_asset_events',
        toQuery({
          protocol_asset_id: encodeIn(assetIds),
        }),
      )
    : [];

  const deletedOrders = orderIds.length > 0
    ? await restDelete(
        ctx,
        'protocol_orders',
        toQuery({
          id: encodeIn(orderIds),
        }),
      )
    : [];

  const deletedLinks = snapshot.links.length > 0
    ? await restDelete(
        ctx,
        'asset_protocol_links',
        toQuery({
          contract_address: encodeIn(snapshot.links.map((row) => normalizeText(row.contract_address)).filter(Boolean)),
        }),
      )
    : [];

  const deletedAssets = assetIds.length > 0
    ? await restDelete(
        ctx,
        'protocol_assets',
        toQuery({
          id: encodeIn(assetIds),
        }),
      )
    : [];

  return {
    action: 'purge-legacy-shadow',
    apply: true,
    snapshotPath,
    deleted: {
      orderEvents: Array.isArray(deletedOrderEvents) ? deletedOrderEvents.length : 0,
      assetEvents: Array.isArray(deletedAssetEvents) ? deletedAssetEvents.length : 0,
      orders: Array.isArray(deletedOrders) ? deletedOrders.length : 0,
      assetProtocolLinks: Array.isArray(deletedLinks) ? deletedLinks.length : 0,
      assets: Array.isArray(deletedAssets) ? deletedAssets.length : 0,
    },
  };
}

async function report(ctx) {
  const [currentSummary, legacySummary] = await Promise.all([
    fetchCurrentCanonicalSummary(ctx),
    fetchLegacyRows(ctx),
  ]);

  return {
    action: 'report',
    currentCanonical: {
      scope: CURRENT_CANONICAL_SCOPE,
      protocolOrders: currentSummary.protocolOrders.length,
      protocolAssets: currentSummary.protocolAssets.length,
      catalogRows: currentSummary.catalogRows.length,
      visibilityRows: currentSummary.visibilityRows.length,
    },
    legacyShadow: {
      scope: LEGACY_SHADOW_SCOPE,
      protocolOrders: legacySummary.orders.length,
      protocolOrderEvents: legacySummary.orderEvents.length,
      protocolAssets: legacySummary.assets.length,
      protocolAssetEvents: legacySummary.assetEvents.length,
      assetProtocolLinks: legacySummary.links.length,
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const action = normalizeText(options.action || 'report').toLowerCase();
  const apply = String(options.apply || '').trim().toLowerCase() === 'true';
  const ctx = loadContext();

  let result;
  if (action === 'archive-current-canonical') {
    result = await archiveCurrentCanonical(ctx, apply);
  } else if (action === 'purge-legacy-shadow') {
    result = await purgeLegacyShadow(ctx, apply);
  } else if (action === 'report') {
    result = await report(ctx);
  } else {
    throw new Error(`Unsupported --action "${action}"`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error?.message || String(error),
    status: error?.status || null,
    payload: error?.payload || null,
  }, null, 2));
  process.exit(1);
});
