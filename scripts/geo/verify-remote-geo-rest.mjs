import fs from 'node:fs';
import path from 'node:path';

const env = readEnv(path.resolve(process.cwd(), '.env'));
const supabaseUrl = String(env.VITE_SUPABASE_URL || '').trim();
const anonKey = String(env.VITE_SUPABASE_ANON_KEY || '').trim();
const mode = String(process.argv[2] || 'full').trim().toLowerCase();

if (!supabaseUrl || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

await main();

async function main() {
  const latestVersions = await fetchJson('/geo_dataset_versions?select=dataset_key,dataset_version,imported_at&order=imported_at.desc&limit=5');

  if (mode === 'version-only') {
    console.log(JSON.stringify({ latestVersions }, null, 2));
    return;
  }

  const counts = {
    geoCountries: await fetchCount('/geo_countries?select=code&limit=1'),
    geoPlaces: await fetchCount('/geo_places?select=id&limit=1'),
    geoDatasetVersions: await fetchCount('/geo_dataset_versions?select=id&limit=1'),
    usLocalities: await fetchCount('/geo_places?country_code=eq.US&place_kind=eq.locality&select=id&limit=1'),
    caLocalities: await fetchCount('/geo_places?country_code=eq.CA&place_kind=eq.locality&select=id&limit=1'),
    gbLocalities: await fetchCount('/geo_places?country_code=eq.GB&place_kind=eq.locality&select=id&limit=1'),
    vnLocalities: await fetchCount('/geo_places?country_code=eq.VN&place_kind=eq.locality&select=id&limit=1'),
    jpLocalities: await fetchCount('/geo_places?country_code=eq.JP&place_kind=eq.locality&select=id&limit=1'),
    deLocalities: await fetchCount('/geo_places?country_code=eq.DE&place_kind=eq.locality&select=id&limit=1'),
  };

  console.log(JSON.stringify({ counts, latestVersions }, null, 2));
}

async function fetchCount(queryPath) {
  const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1${queryPath}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Count request failed for ${queryPath}: ${response.status} ${text}`);
  }

  const contentRange = response.headers.get('content-range') || '';
  const total = contentRange.split('/')[1];
  return Number.parseInt(total || '0', 10);
}

async function fetchJson(queryPath) {
  const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1${queryPath}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`JSON request failed for ${queryPath}: ${response.status} ${text}`);
  }

  return response.json();
}

function readEnv(filePath) {
  const result = {};
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex <= 0) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    result[key] = value;
  }
  return result;
}
