#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
  const response = await fetch(url, { headers });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  return {
    status: response.status,
    ok: response.ok,
    payload,
  };
}

async function main() {
  const env = parseEnvFile(path.resolve('.env'));
  const supabaseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = String(env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or anon key');
  }

  const headers = {
    apikey: anonKey,
    authorization: `Bearer ${anonKey}`,
    accept: 'application/json',
  };

  const base = `${supabaseUrl}/rest/v1/protocol_order_events`;
  const noFilter = await requestJson(`${base}?select=event_name,order_id&limit=5`, headers);
  const byChain = await requestJson(`${base}?select=event_name,order_id&chain_id=eq.97&limit=5`, headers);
  const exactOrders = await requestJson(
    `${base}?select=event_name,order_id&order_id=in.(5800cd57-9cc5-4435-811f-8ab127a45cf7,abbd2729-bc21-4130-9bb4-01596daa25a4,4223d6b1-4e0f-475d-b2b7-8bea5ddd7a16)&limit=5`,
    headers,
  );

  console.log(JSON.stringify({
    ok: true,
    noFilter,
    byChain,
    exactOrders,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
