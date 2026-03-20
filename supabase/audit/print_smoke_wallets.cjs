const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const FILES = [
  path.join(ROOT, '.env'),
  path.join(ROOT, 'foundry', '.env'),
];
const KEYS = ['PRIVATE_KEY', 'SMOKE_BUYER_PRIVATE_KEY', 'SMOKE_SELLER_PRIVATE_KEY'];

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      }),
  );
}

function walletAddress(privateKey) {
  return execFileSync('cast', ['wallet', 'address', '--private-key', privateKey], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
}

const result = FILES.map((filePath) => {
  const env = parseEnv(filePath);
  const values = {};
  for (const key of KEYS) {
    if (!env[key]) continue;
    try {
      values[key] = walletAddress(env[key]);
    } catch (error) {
      values[key] = `INVALID:${error instanceof Error ? error.message : String(error)}`;
    }
  }
  return {
    file: path.relative(ROOT, filePath) || '.',
    values,
  };
});

console.log(JSON.stringify(result, null, 2));
