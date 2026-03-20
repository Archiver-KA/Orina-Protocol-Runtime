const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const FOUNDRY_DIR = path.join(ROOT, 'foundry');
const RPC_URL = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/';
const MARKETPLACE = '0x6154d16f4f52c1a4157928f136a53ac3b83b510b';
const ORINA_RWA = '0xa0c34b5a941420626146bc61e15893bc1f86bf39';
const PAYMENT_GATEWAY = '0x318cb728d91a2abd1854f31ba1d32687763b9335';
const DISPUTE_MANAGER = '0x33dceb1e8aec7fe69d8a1390de0cc0e879035949';

function parseEnvFile(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    map[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return map;
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: options.cwd || ROOT,
    env: options.env || process.env,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const message = [
      `${cmd} ${args.join(' ')} failed`,
      result.stdout || '',
      result.stderr || '',
    ].join('\n');
    throw new Error(message.trim());
  }

  return {
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function castValue(contract, signature) {
  return execFileSync(
    'cast',
    ['call', '--rpc-url', RPC_URL, contract, signature],
    { cwd: ROOT, encoding: 'utf8' },
  ).trim();
}

function toDec(hexValue) {
  return execFileSync('cast', ['--to-dec', hexValue], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
}

function shortHashFromBroadcast(scriptName) {
  const broadcastPath = path.join(
    FOUNDRY_DIR,
    'broadcast',
    `${scriptName}.s.sol`,
    '97',
    'run-latest.json',
  );
  const runJson = require(broadcastPath);
  const txs = runJson.transactions || [];
  return txs.map((tx) => ({
    function: tx.function || '',
    hash: tx.hash || '',
    from: tx.transaction?.from || tx.from || '',
  }));
}

function main() {
  const envFile = parseEnvFile(path.join(FOUNDRY_DIR, '.env'));
  const arg1 = process.argv[2];
  const arg2 = process.argv[3];
  const arg1IsNumeric = /^\d+$/.test(String(arg1 || '').trim());
  const buyerPk = (arg1IsNumeric ? '' : arg1) || process.env.SMOKE_BUYER_PRIVATE_KEY || envFile.SMOKE_BUYER_PRIVATE_KEY;
  const estDeliverySeconds =
    (arg1IsNumeric ? arg1 : arg2) || process.env.SMOKE_EST_DELIVERY_SECONDS || envFile.SMOKE_EST_DELIVERY_SECONDS;
  if (!buyerPk) {
    throw new Error('Usage: node supabase/audit/run_smoke_ab.cjs <buyerPrivateKey?> [estDeliverySeconds?]');
  }

  const orderId = toDec(castValue(MARKETPLACE, 'nextOrderId()'));
  const assetId = toDec(castValue(ORINA_RWA, 'nextAssetId()'));

  const sharedEnv = {
    ...process.env,
    SMOKE_BUYER_PRIVATE_KEY: buyerPk,
    SMOKE_ORDER_ID: orderId,
    SMOKE_ASSET_ID: assetId,
    MARKETPLACE_ATP_ADDRESS: MARKETPLACE,
    ORINA_RWA_ADDRESS: ORINA_RWA,
    PAYMENT_GATEWAY_ADDRESS: PAYMENT_GATEWAY,
    DISPUTE_MANAGER_ADDRESS: DISPUTE_MANAGER,
  };
  if (estDeliverySeconds) {
    sharedEnv.SMOKE_EST_DELIVERY_SECONDS = String(estDeliverySeconds);
  }

  run(
    'forge',
    [
      'script',
      'script/SmokeMintAndCreateOrder.s.sol:SmokeMintAndCreateOrder',
      '--rpc-url',
      RPC_URL,
      '--broadcast',
      '-vvvv',
    ],
    { cwd: FOUNDRY_DIR, env: sharedEnv },
  );

  run(
    'forge',
    [
      'script',
      'script/SmokeSellerConfirm.s.sol:SmokeSellerConfirm',
      '--rpc-url',
      RPC_URL,
      '--broadcast',
      '-vvvv',
    ],
    { cwd: FOUNDRY_DIR, env: sharedEnv },
  );

  run(
    'node',
    ['supabase/audit/import_protocol_runtime_smoke_records.cjs'],
    { cwd: ROOT, env: sharedEnv },
  );

  const createBroadcast = shortHashFromBroadcast('SmokeMintAndCreateOrder');
  const sellerBroadcast = shortHashFromBroadcast('SmokeSellerConfirm');

  console.log(JSON.stringify({
    ok: true,
    orderId,
    assetId,
    estDeliverySeconds: estDeliverySeconds || '259200',
    createBroadcast,
    sellerBroadcast,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
}
