#!/usr/bin/env node

import fs from 'node:fs/promises';
import fsSync from 'node:fs';

const SEED_BATCH = 'v3.5-beta-seed-assets-001';
const PINATA_PIN_LIST_URL = 'https://api.pinata.cloud/data/pinList';
const PINATA_UNPIN_URL = 'https://api.pinata.cloud/pinning/unpin';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    delayMs: 200,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--dry-run') args.dryRun = true;
    else if (value === '--delay-ms') args.delayMs = Math.max(0, Number.parseInt(argv[++index] || '0', 10) || 0);
  }

  return args;
}

function parseEnv(raw) {
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
  return env;
}

async function loadEnv() {
  const fromFile = fsSync.existsSync('.env') ? parseEnv(await fs.readFile('.env', 'utf8')) : {};
  return {
    ...fromFile,
    PINATA_JWT: process.env.PINATA_JWT || fromFile.PINATA_JWT || '',
  };
}

async function delay(ms) {
  if (!ms) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pinataJson(pinataJwt, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${pinataJwt}`,
    },
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(`Pinata request failed ${response.status}: ${payload ? JSON.stringify(payload) : text}`);
  }
  return payload;
}

async function listSeedAssetPins(pinataJwt) {
  const rows = [];
  const pageLimit = 1000;
  for (let pageOffset = 0; ; pageOffset += pageLimit) {
    const params = new URLSearchParams({
      pageLimit: String(pageLimit),
      pageOffset: String(pageOffset),
      status: 'pinned',
    });
    const payload = await pinataJson(pinataJwt, `${PINATA_PIN_LIST_URL}?${params}`);
    rows.push(...(payload.rows || []));
    if (!payload.rows || payload.rows.length < pageLimit) break;
  }

  const byHash = new Map();
  for (const row of rows) {
    const keyvalues = row.metadata?.keyvalues || {};
    if (keyvalues.seedBatch !== SEED_BATCH || !keyvalues.assetUid) continue;
    if (!row.ipfs_pin_hash) continue;
    byHash.set(row.ipfs_pin_hash, {
      ipfsHash: row.ipfs_pin_hash,
      assetUid: keyvalues.assetUid,
      mediaKind: keyvalues.mediaKind || null,
      name: row.metadata?.name || null,
      size: row.size || null,
      datePinned: row.date_pinned || null,
    });
  }
  return Array.from(byHash.values()).sort((left, right) => left.ipfsHash.localeCompare(right.ipfsHash));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = await loadEnv();
  if (!env.PINATA_JWT) {
    throw new Error('PINATA_JWT is required to unpin seed asset media');
  }

  const pins = await listSeedAssetPins(env.PINATA_JWT);
  const byKind = pins.reduce((acc, pin) => {
    const key = pin.mediaKind || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  if (args.dryRun) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      seedBatch: SEED_BATCH,
      pinsToUnpin: pins.length,
      byKind,
      sample: pins.slice(0, 10),
    }, null, 2));
    return;
  }

  let unpinned = 0;
  const failed = [];
  for (const pin of pins) {
    try {
      await pinataJson(env.PINATA_JWT, `${PINATA_UNPIN_URL}/${pin.ipfsHash}`, { method: 'DELETE' });
      unpinned += 1;
      console.log(`unpinned ${pin.ipfsHash} ${pin.assetUid} ${pin.mediaKind || 'unknown'}`);
    } catch (error) {
      failed.push({ ...pin, error: error?.message || String(error) });
    }
    await delay(args.delayMs);
  }

  console.log(JSON.stringify({
    ok: failed.length === 0,
    seedBatch: SEED_BATCH,
    attempted: pins.length,
    unpinned,
    failedCount: failed.length,
    failed: failed.slice(0, 20),
  }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
