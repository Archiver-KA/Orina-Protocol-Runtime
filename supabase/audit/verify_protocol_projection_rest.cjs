#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULTS = {
  chainId: 97,
  marketplace: '0x026c9e9a5d007ed46df3de900f53c0786ec650c8',
  assetContract: '0x5fc61747b359e089e3ced00494f9e71de836b666',
  buyer: '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14',
  seller: '0x282be18838d7079c215f49749a9606d77e00888b',
};

function parseEnvFile(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    map[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return map;
}

async function requestJson(url, headers) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${json?.message || json?.error || text}`);
  }
  return json;
}

async function main() {
  const env = parseEnvFile(path.join(ROOT, '.env'));
  const supabaseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = String(env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY/VITE_SUPABASE_PUBLISHABLE_KEY');
  }

  const headers = {
    apikey: anonKey,
    authorization: `Bearer ${anonKey}`,
    accept: 'application/json',
  };

  const orders = await requestJson(
    `${supabaseUrl}/rest/v1/protocol_orders?select=id,order_uid,status,buyer_address,seller_address,asset_token_id,metadata&chain_id=eq.${DEFAULTS.chainId}&marketplace_contract=eq.${DEFAULTS.marketplace}&or=(buyer_address.eq.${DEFAULTS.buyer},seller_address.eq.${DEFAULTS.seller})&order=order_uid.asc`,
    headers,
  );

  const orderIds = orders.map((row) => row.id).filter(Boolean);
  const events =
    orderIds.length > 0
      ? await requestJson(
          `${supabaseUrl}/rest/v1/protocol_order_events?select=order_id,event_name,tx_hash,log_index,block_number&order_id=in.(${orderIds.join(',')})&order=block_number.asc,log_index.asc`,
          headers,
        )
      : [];

  const assetIds = Array.from(new Set(orders.map((row) => row.asset_token_id).filter(Boolean)));
  const assetFilter =
    assetIds.length > 0
      ? `&token_id=in.(${assetIds.join(',')})`
      : '';
  const assets = await requestJson(
    `${supabaseUrl}/rest/v1/protocol_assets?select=id,token_id,owner_address,status,metadata&chain_id=eq.${DEFAULTS.chainId}&asset_contract=eq.${DEFAULTS.assetContract}${assetFilter}&order=token_id.asc`,
    headers,
  );

  const eventCounts = {};
  for (const event of events) {
    eventCounts[event.event_name] = (eventCounts[event.event_name] || 0) + 1;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        orders: orders.map((row) => ({
          id: row.id,
        order_uid: row.order_uid,
        status: row.status,
        buyer_address: row.buyer_address,
        seller_address: row.seller_address,
        asset_token_id: row.asset_token_id,
        hasRuntimeOrderMetadata: Boolean(row.metadata?.runtimeOrder),
        paymentTokenSymbol: row.metadata?.paymentTokenSymbol ?? row.metadata?.chainSnapshot?.paymentTokenSymbol ?? null,
        paymentTokenDecimals: row.metadata?.paymentTokenDecimals ?? row.metadata?.chainSnapshot?.paymentTokenDecimals ?? null,
        unitId: row.metadata?.unitId ?? row.metadata?.chainSnapshot?.unitId ?? null,
        unitName: row.metadata?.unitName ?? row.metadata?.chainSnapshot?.unitName ?? null,
        metadataKeys: row.metadata ? Object.keys(row.metadata) : [],
      })),
      assets: assets.map((row) => ({
        id: row.id,
        token_id: row.token_id,
        owner_address: row.owner_address,
        status: row.status,
        unitId: row.metadata?.chainSnapshot?.unitId ?? null,
        unitName: row.metadata?.chainSnapshot?.unitName ?? null,
        assetType: row.metadata?.chainSnapshot?.assetTypeLabel ?? null,
        metadataKeys: row.metadata ? Object.keys(row.metadata) : [],
      })),
        eventCount: events.length,
        eventCounts,
      },
      null,
      2,
    ),
  );
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
