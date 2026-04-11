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
  console.error('[run_runtime_projection_repair_from_env] Missing .env');
  process.exit(1);
}

const envFile = parseEnv(fs.readFileSync(envPath, 'utf8'));
const baseUrl = envFile.VITE_SUPABASE_URL;
const anonKey = envFile.VITE_SUPABASE_ANON_KEY || envFile.VITE_SUPABASE_PUBLISHABLE_KEY;
const fnName = envFile.VITE_SUPABASE_AUTH_BRIDGE_FN_NAME || 'orina-auth-bridge-v1';
const routePrefix =
  envFile.VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX !== undefined
    ? envFile.VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX
    : fnName === 'make-server-b0d68fc8'
      ? '/auth/supabase-claim-bridge'
      : '';
const extraArgs = process.argv.slice(2);

if (!baseUrl || !anonKey) {
  console.error('[run_runtime_projection_repair_from_env] Missing VITE_SUPABASE_URL or anon key in .env');
  process.exit(1);
}

const scriptPath = path.resolve(process.cwd(), 'supabase', 'audit', 'backfill_runtime_minted_projection_repair.cjs');
const spawnArgs = [scriptPath, baseUrl, anonKey, fnName];
if (routePrefix) {
  spawnArgs.push(routePrefix);
}
spawnArgs.push(...extraArgs);

const result = cp.spawnSync(process.execPath, spawnArgs, {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);