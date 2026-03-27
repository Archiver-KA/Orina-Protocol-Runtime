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

async function main() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) throw new Error('.env not found');

  const env = readEnvFile(envPath);
  const baseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL / anon key in .env');
  }

  const url =
    `${baseUrl}/rest/v1/assets_catalog` +
    `?select=id,asset_uid,title,category,is_active,metadata,updated_at` +
    `&is_active=eq.true` +
    `&order=updated_at.desc`;

  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      accept: 'application/json',
    },
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  const rows = Array.isArray(json) ? json : [];
  const normalizedRows = rows.map((row) => ({
    id: row.id,
    asset_uid: row.asset_uid,
    title: row.title,
    category: row.category,
    is_active: row.is_active,
    updated_at: row.updated_at,
    asset_namespace: row?.metadata?.asset_namespace || null,
    seed_source: row?.metadata?.seed_source || null,
    seller_wallet: row?.metadata?.seller_wallet || null,
    blockchain: row?.metadata?.blockchain || null,
    network: row?.metadata?.network || row?.metadata?.listing_network || null,
  }));

  console.log(
    JSON.stringify(
      {
        ok: res.ok,
        status: res.status,
        count: normalizedRows.length,
        rows: normalizedRows,
      },
      null,
      2
    )
  );

  if (!res.ok) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
