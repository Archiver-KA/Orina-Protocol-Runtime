#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const CAMPAIGN_ROOT = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign';
const ASSET_INDEX_PATH = path.join(CAMPAIGN_ROOT, 'seed-assets-index.json');
const MEDIA_MANIFEST_PATH = 'supabase/audit/v3_5_beta_seed_asset_media_ipfs_manifest.json';
const OPENVERSE_AUDIT_PATH = 'supabase/audit/v3_5_beta_seed_asset_media_openverse_sources.json';
const OUTPUT_PATH = 'supabase/migrations/000081_v3_5_beta_seed_asset_cover_ipfs_refresh.sql';
const SEED_BATCH = 'v3.5-beta-seed-assets-001';
const IPFS_GATEWAY_RE = /^https:\/\/gateway\.pinata\.cloud\/ipfs\/[A-Za-z0-9]+$/;

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
  };
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function getCover(manifest, assetUid) {
  const entry = manifest?.assets?.[assetUid]?.media?.cover;
  if (!entry?.url || !entry?.ipfsHash) {
    throw new Error(`Missing cover IPFS entry for ${assetUid}`);
  }
  if (!IPFS_GATEWAY_RE.test(entry.url)) {
    throw new Error(`Non-IPFS cover URL for ${assetUid}: ${entry.url}`);
  }
  return entry;
}

function sourceByAsset(audit) {
  const map = new Map();
  for (const record of audit.records || []) {
    if (record.kind !== 'cover') continue;
    map.set(record.assetUid, {
      source: 'Openverse',
      provider: record.provider || null,
      title: record.title || null,
      sourceUrl: record.sourceUrl || null,
      descriptionUrl: record.descriptionUrl || null,
      licenseShortName: record.licenseShortName || null,
      licenseUrl: record.licenseUrl || null,
      artist: record.artist || null,
      credit: record.credit || null,
      audit: OPENVERSE_AUDIT_PATH,
    });
  }
  return map;
}

function buildSql(assets, manifest, audit) {
  const sources = sourceByAsset(audit);
  const values = [];
  for (const asset of assets) {
    const cover = getCover(manifest, asset.assetUid);
    const sourceMeta = sources.get(asset.assetUid) || {
      source: 'Openverse',
      audit: OPENVERSE_AUDIT_PATH,
    };
    values.push(`(${[
      sqlString(asset.assetUid),
      sqlString(cover.url),
      sqlString(cover.ipfsHash),
      sqlJson(sourceMeta),
    ].join(', ')})`);
  }

  return [
    '-- ============================================================',
    '-- 000081 - v3.5 beta seed asset cover IPFS refresh',
    '-- ============================================================',
    '-- Refreshes seed asset media after Pinata quota reduction.',
    '-- Only cover media is retained: campaign cover file -> Pinata/IPFS -> assets_catalog.',
    '-- This migration intentionally preserves on-chain projection fields.',
    '-- It does not modify contract_address, token_id, chain_id, mint_state, or protocol tables.',
    '-- ============================================================',
    '',
    'begin;',
    '',
    'create temporary table tmp_v35_seed_asset_cover_refresh (',
    '  asset_uid text primary key,',
    '  cover_url text not null,',
    '  ipfs_hash text not null,',
    '  source_meta jsonb not null',
    ') on commit drop;',
    '',
    'insert into tmp_v35_seed_asset_cover_refresh (asset_uid, cover_url, ipfs_hash, source_meta)',
    'values',
    values.join(',\n'),
    ';',
    '',
    'update public.assets_catalog as asset',
    'set',
    '  cover_image_url = media.cover_url,',
    '  gallery_images = jsonb_build_array(media.cover_url),',
    '  metadata = asset.metadata',
    "    || jsonb_build_object(",
    "      'image', media.cover_url,",
    "      'images', jsonb_build_array(media.cover_url),",
    "      'media_flow', 'campaign cover file -> Pinata/IPFS -> assets_catalog',",
    "      'media_mode', 'cover_only',",
    "      'source_media_license', media.source_meta,",
    "      'license_gate', jsonb_build_object(",
    "        'required', true,",
    "        'status', 'verified_openverse_seed_source',",
    "        'rule', 'Imported only after campaign cover files were downloaded, audited, and pinned to Pinata/IPFS.'",
    '      ),',
    "      'media_refresh', jsonb_build_object(",
    "        'source', 'orina_v3_5_beta_seed_asset_cover_ipfs_refresh',",
    "        'reason', 'pinata_quota_reduction_cover_only_refresh',",
    "        'refreshedAt', now()",
    '      )',
    '    ),',
    '  updated_at = now()',
    'from tmp_v35_seed_asset_cover_refresh as media',
    'where asset.asset_uid = media.asset_uid',
    `  and asset.metadata ->> 'seed_batch' = ${sqlString(SEED_BATCH)};`,
    '',
    'delete from public.asset_media as am',
    'using public.assets_catalog as asset, tmp_v35_seed_asset_cover_refresh as media',
    'where am.asset_id = asset.id',
    '  and asset.asset_uid = media.asset_uid',
    `  and asset.metadata ->> 'seed_batch' = ${sqlString(SEED_BATCH)};`,
    '',
    'insert into public.asset_media (asset_id, media_type, url, sort_order, metadata)',
    'select',
    '  asset.id,',
    "  'image',",
    '  media.cover_url,',
    '  0,',
    "  jsonb_build_object(",
    `    'seed_batch', ${sqlString(SEED_BATCH)},`,
    "    'media_key', 'cover',",
    "    'media_mode', 'cover_only',",
    "    'ipfsHash', media.ipfs_hash,",
    "    'source', 'pinata_ipfs',",
    "    'source_origin', 'openverse',",
    "    'source_meta', media.source_meta",
    '  )',
    'from public.assets_catalog as asset',
    'join tmp_v35_seed_asset_cover_refresh as media',
    '  on media.asset_uid = asset.asset_uid',
    `where asset.metadata ->> 'seed_batch' = ${sqlString(SEED_BATCH)};`,
    '',
    "select public.refresh_marketplace_asset_browse_index_v1();",
    '',
    'commit;',
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [assets, manifest, audit] = await Promise.all([
    fs.readFile(ASSET_INDEX_PATH, 'utf8').then(JSON.parse),
    fs.readFile(MEDIA_MANIFEST_PATH, 'utf8').then(JSON.parse),
    fs.readFile(OPENVERSE_AUDIT_PATH, 'utf8').then(JSON.parse),
  ]);

  if (!Array.isArray(assets) || assets.length !== 300) {
    throw new Error(`Expected 300 assets in ${ASSET_INDEX_PATH}`);
  }

  const sql = buildSql(assets, manifest, audit);
  if (!args.dryRun) {
    await fs.writeFile(OUTPUT_PATH, sql, 'utf8');
  }

  console.log(JSON.stringify({
    ok: true,
    dryRun: args.dryRun,
    assets: assets.length,
    mediaMode: manifest.mediaMode || 'unknown',
    output: OUTPUT_PATH,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
