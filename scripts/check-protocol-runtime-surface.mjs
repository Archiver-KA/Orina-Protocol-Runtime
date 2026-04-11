import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const envPath = path.join(repoRoot, '.env');
const requiredTables = [
  'assets_catalog',
  'asset_protocol_links',
  'protocol_assets',
  'protocol_orders',
];

function parseDotEnv(text) {
  return text
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return acc;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex <= 0) return acc;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      acc[key] = value;
      return acc;
    }, {});
}

async function readLocalEnv() {
  try {
    const text = await readFile(envPath, 'utf8');
    return parseDotEnv(text);
  } catch {
    return {};
  }
}

function resolveEnvValue(localEnv, ...keys) {
  for (const key of keys) {
    const processValue = process.env[key];
    if (typeof processValue === 'string' && processValue.trim()) {
      return processValue.trim();
    }

    const localValue = localEnv[key];
    if (typeof localValue === 'string' && localValue.trim()) {
      return localValue.trim();
    }
  }

  return '';
}

async function probeTable(baseUrl, anonKey, table) {
  const response = await fetch(`${baseUrl}/rest/v1/${table}?select=*&limit=1`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  return {
    table,
    ok: response.ok,
    status: response.status,
    payload,
  };
}

async function main() {
  const localEnv = await readLocalEnv();
  const supabaseUrl = resolveEnvValue(localEnv, 'VITE_SUPABASE_URL');
  const anonKey = resolveEnvValue(localEnv, 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_LEGACY_ANON_KEY');

  if (!supabaseUrl || !anonKey) {
    console.log('[protocol-runtime-surface] Skipped: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
    return;
  }

  const baseUrl = supabaseUrl.replace(/\/+$/, '');
  const results = [];
  for (const table of requiredTables) {
    results.push(await probeTable(baseUrl, anonKey, table));
  }

  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    console.error('[protocol-runtime-surface] Projection/runtime surface check failed.');
    for (const failure of failures) {
      console.error(` - ${failure.table}: HTTP ${failure.status} ${JSON.stringify(failure.payload)}`);
    }
    process.exit(1);
  }

  console.log(`[protocol-runtime-surface] Verified ${results.length} runtime tables.`);
}

main().catch((error) => {
  console.error('[protocol-runtime-surface] Unexpected failure:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});