#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const CAMPAIGN_ROOT = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign';
const ASSET_INDEX_PATH = path.join(CAMPAIGN_ROOT, 'seed-assets-index.json');
const MEDIA_MANIFEST_PATH = 'supabase/audit/v3_5_beta_seed_asset_media_ipfs_manifest.json';
const OUTPUT_PATH = 'supabase/migrations/000080_v3_5_beta_seed_assets_catalog.sql';
const SEED_BATCH = 'v3.5-beta-seed-assets-001';
const IPFS_GATEWAY_RE = /^https:\/\/gateway\.pinata\.cloud\/ipfs\/[A-Za-z0-9]+/;

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

function getManifestMedia(manifest, assetUid, key) {
  const entry = manifest?.assets?.[assetUid]?.media?.[key];
  if (!entry?.url || !entry?.ipfsHash) {
    throw new Error(`Missing ${key} IPFS entry for ${assetUid}`);
  }
  if (!IPFS_GATEWAY_RE.test(entry.url)) {
    throw new Error(`Non-IPFS ${key} URL for ${assetUid}: ${entry.url}`);
  }
  return entry;
}

function buildMetadata(asset, cover, gallery) {
  const metadata = {
    ...(asset.metadata || {}),
    seed_source: 'orina_v3_5_beta_seed_assets_catalog',
    seed_batch: SEED_BATCH,
    seed_catalog_only: true,
    projection_state: 'catalog_seed_pending_onchain_mint',
    mint_state: 'pending_onchain_mint',
    media_flow: 'campaign media file -> Pinata/IPFS -> assets_catalog',
    source_media_license: {
      source: 'Pixabay',
      licenseUrl: 'https://pixabay.com/service/license-summary/',
      audit: 'supabase/audit/v3_5_beta_seed_asset_media_pixabay_sources.json',
    },
    license_gate: {
      required: true,
      status: 'verified_pixabay_seed_source',
      rule: 'Imported only after campaign media files were downloaded, audited, and pinned to Pinata/IPFS.',
    },
    image: cover.url,
    images: [cover.url, ...gallery.map((entry) => entry.url)],
    tags: asset.tags || [],
    price: asset.price,
    priceUSD: `$${Number(asset.priceNumber || 0).toFixed(2)}`,
    currency: asset.currency || 'USDT',
    verified: true,
    featured: Boolean(asset.assetClass === 'agent_services' || asset.assetClass === 'service_rights'),
    views: 0,
    likes: 0,
    availableSlots: asset.availableAmount,
    totalSlots: asset.totalAmount,
    minPurchaseSlots: asset.minPurchaseSlots,
    maxPurchaseSlots: asset.maxPurchaseSlots,
    unitName: asset.unitName,
    unitLabel: asset.unitLabel,
    assetLocationSnapshot: asset.assetLocationSnapshot || null,
    deliverySnapshot: asset.deliverySnapshot || null,
    configurableAttributes: asset.configurableAttributes || [],
  };

  return metadata;
}

function buildAttributes(asset) {
  return {
    seed_source: 'orina_v3_5_beta_seed_assets_catalog',
    asset_class: asset.assetClass,
    unit_name: asset.unitName,
    unit_label: asset.unitLabel,
    total_amount: asset.totalAmount,
    available_amount: asset.availableAmount,
    on_chain_total_amount: asset.totalAmount,
    on_chain_available_amount: asset.availableAmount,
    estimated_price: {
      suggested: asset.priceNumber,
      currency: asset.currency || 'USDT',
    },
    quality_specs: asset.qualitySpecs || [],
    condition: asset.condition,
  };
}

function buildSql(assets, manifest) {
  const lines = [
    '-- ============================================================',
    '-- 000080 - v3.5 beta seed assets catalog',
    '-- ============================================================',
    '-- Catalog-only seed data for marketplace/search/map beta testing.',
    '-- Media URLs are Pinata/IPFS URLs generated from campaign files.',
    '-- This migration does not create protocol_assets rows or fake token ids.',
    '-- On-chain mint projection must still come from the normal mint/event flow.',
    '-- ============================================================',
    '',
    'begin;',
    '',
    `delete from public.assets_catalog where metadata ->> 'seed_batch' = ${sqlString(SEED_BATCH)};`,
    '',
  ];

  for (const asset of assets) {
    const cover = getManifestMedia(manifest, asset.assetUid, 'cover');
    const gallery = [
      getManifestMedia(manifest, asset.assetUid, 'gallery-1'),
      getManifestMedia(manifest, asset.assetUid, 'gallery-2'),
    ];
    const galleryUrls = gallery.map((entry) => entry.url);
    const allMedia = [cover, ...gallery];
    const metadata = buildMetadata(asset, cover, gallery);
    const attributes = buildAttributes(asset);
    const tags = Array.from(new Set(asset.tags || [])).filter(Boolean);

    lines.push(
      'with seller_profile as (',
      '  select id',
      '  from public.profiles',
      `  where wallet_address = lower(${sqlString(asset.sellerWallet)})`,
      '  limit 1',
      '), upsert_asset as (',
      '  insert into public.assets_catalog (',
      '    asset_uid, title, slug, category, subcategory, description, cover_image_url,',
      '    gallery_images, attributes, metadata, seller_user_id, contract_address, token_id, chain_id, is_active',
      '  )',
      '  select',
      `    ${sqlString(asset.assetUid)},`,
      `    ${sqlString(asset.title)},`,
      `    ${sqlString(asset.slug)},`,
      `    ${sqlString(asset.category)},`,
      `    ${sqlString(asset.subcategory)},`,
      `    ${sqlString(asset.description)},`,
      `    ${sqlString(cover.url)},`,
      `    ${sqlJson(galleryUrls)},`,
      `    ${sqlJson(attributes)},`,
      `    ${sqlJson(metadata)},`,
      '    seller_profile.id,',
      '    null,',
      '    null,',
      '    97,',
      '    true',
      '  from seller_profile',
      '  on conflict (asset_uid) do update set',
      '    title = excluded.title,',
      '    slug = excluded.slug,',
      '    category = excluded.category,',
      '    subcategory = excluded.subcategory,',
      '    description = excluded.description,',
      '    cover_image_url = excluded.cover_image_url,',
      '    gallery_images = excluded.gallery_images,',
      '    attributes = excluded.attributes,',
      '    metadata = excluded.metadata,',
      '    seller_user_id = excluded.seller_user_id,',
      '    contract_address = excluded.contract_address,',
      '    token_id = excluded.token_id,',
      '    chain_id = excluded.chain_id,',
      '    is_active = excluded.is_active,',
      '    updated_at = now()',
      '  returning id',
      '), deleted_media as (',
      '  delete from public.asset_media',
      '  where asset_id in (select id from upsert_asset)',
      '), inserted_media as (',
      '  insert into public.asset_media (asset_id, media_type, url, sort_order, metadata)',
      allMedia.map((entry, index) => [
        index === 0 ? '  select id, ' : '  union all select id, ',
        `${sqlString('image')}, ${sqlString(entry.url)}, ${index}, `,
        `${sqlJson({
          seed_batch: SEED_BATCH,
          media_key: index === 0 ? 'cover' : `gallery-${index}`,
          ipfsHash: entry.ipfsHash,
          source: 'pinata_ipfs',
        })} from upsert_asset`,
      ].join('')).join('\n'),
      '  returning asset_id',
      '), tag_values as (',
      `  select unnest(${sqlString(`{${tags.map((tag) => String(tag).replace(/"/g, '\\"')).join(',')}}`)}::text[]) as tag`,
      '), upsert_tags as (',
      '  insert into public.asset_tags (tag)',
      '  select distinct lower(trim(tag))',
      '  from tag_values',
      "  where trim(tag) <> ''",
      '  on conflict (tag) do update set tag = excluded.tag',
      '  returning id, tag',
      '), deleted_tag_map as (',
      '  delete from public.asset_tag_map',
      '  where asset_id in (select id from upsert_asset)',
      '), selected_tags as (',
      '  select id',
      '  from public.asset_tags',
      '  where tag in (select lower(trim(tag)) from tag_values)',
      ')',
      'insert into public.asset_tag_map (asset_id, tag_id)',
      'select upsert_asset.id, selected_tags.id',
      'from upsert_asset',
      'cross join selected_tags',
      'on conflict do nothing;',
      '',
    );
  }

  lines.push(
    "select public.refresh_marketplace_asset_browse_index_v1();",
    '',
    'commit;',
    '',
  );

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [assets, manifest] = await Promise.all([
    fs.readFile(ASSET_INDEX_PATH, 'utf8').then(JSON.parse),
    fs.readFile(MEDIA_MANIFEST_PATH, 'utf8').then(JSON.parse),
  ]);

  if (!Array.isArray(assets) || assets.length === 0) {
    throw new Error(`No assets found in ${ASSET_INDEX_PATH}`);
  }

  const sql = buildSql(assets, manifest);

  if (!args.dryRun) {
    await fs.writeFile(OUTPUT_PATH, sql, 'utf8');
  }

  console.log(JSON.stringify({
    ok: true,
    dryRun: args.dryRun,
    assets: assets.length,
    mediaManifestAssets: Object.keys(manifest.assets || {}).length,
    output: OUTPUT_PATH,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
