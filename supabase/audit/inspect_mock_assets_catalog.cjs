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
  if (!fs.existsSync(envPath)) {
    throw new Error('.env not found');
  }

  const env = readEnvFile(envPath);
  const baseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL / anon key in .env');
  }

  const mockAssetUids = [
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

  const url = `${baseUrl}/rest/v1/assets_catalog?select=id,asset_uid,title,is_active,metadata&asset_uid=in.(${mockAssetUids.map((uid) => `"${uid}"`).join(',')})`;
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
    is_active: row.is_active,
    asset_namespace: row?.metadata?.asset_namespace || null,
    seed_source: row?.metadata?.seed_source || null,
  }));

  const report = {
    ok: res.ok,
    status: res.status,
    count: normalizedRows.length,
    rows: normalizedRows,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
