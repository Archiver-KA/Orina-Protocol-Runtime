const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = process.cwd();

const orderId = process.argv[2];
const assetId = process.argv[3];
const extraArgs = process.argv.slice(4);

if (!orderId || !assetId) {
  console.error('Usage: node supabase/audit/run_import_smoke_record.cjs <orderId> <assetId>');
  process.exit(1);
}

const result = spawnSync('node', ['supabase/audit/import_protocol_runtime_smoke_records.cjs', ...extraArgs], {
  cwd: ROOT,
  env: {
    ...process.env,
    SMOKE_ORDER_ID: String(orderId),
    SMOKE_ASSET_ID: String(assetId),
  },
  encoding: 'utf8',
});

process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
process.exit(result.status ?? 1);
