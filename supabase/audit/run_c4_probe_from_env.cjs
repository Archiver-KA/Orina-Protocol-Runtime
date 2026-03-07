const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
}

const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error('[run_c4_probe_from_env] Missing .env');
  process.exit(1);
}

const envFile = parseEnv(fs.readFileSync(envPath, 'utf8'));
const baseUrl = envFile.VITE_SUPABASE_URL;
const anonKey = envFile.VITE_SUPABASE_ANON_KEY;

if (!baseUrl || !anonKey) {
  console.error('[run_c4_probe_from_env] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const probeScript = path.resolve(
  process.cwd(),
  'supabase',
  'audit',
  'batch_c4_notifications_event_matrix_auto_probe.cjs'
);
const result = cp.spawnSync(process.execPath, [probeScript, baseUrl, anonKey], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
