#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const CAMPAIGN_ROOT = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign';
const ASSET_INDEX_PATH = path.join(CAMPAIGN_ROOT, 'seed-assets-index.json');
const AUDIT_DIR = 'supabase/audit';
const AUDIT_PATH = path.join(AUDIT_DIR, 'v3_5_beta_seed_asset_media_openverse_sources.json');
const OPENVERSE_API_URL = 'https://api.openverse.engineering/v1/images/';
const OPENVERSE_LICENSE_POLICY_URL = 'https://openverse.org/license';
const SEED_BATCH = 'v3.5-beta-seed-assets-001';
const USER_AGENT = 'OrinaATPTestnetSeeder/1.0 (testnet media refresh)';

const queryCache = new Map();
const downloadCache = new Map();
let lastOpenverseRequestAt = 0;

function parseArgs(argv) {
  const args = {
    dryRun: false,
    overwrite: false,
    limitAssets: Number.POSITIVE_INFINITY,
    offsetAssets: 0,
    delayMs: 100,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--dry-run') args.dryRun = true;
    else if (value === '--overwrite') args.overwrite = true;
    else if (value === '--limit-assets') args.limitAssets = Math.max(1, Number.parseInt(argv[++index] || '1', 10) || 1);
    else if (value === '--offset-assets') args.offsetAssets = Math.max(0, Number.parseInt(argv[++index] || '0', 10) || 0);
    else if (value === '--delay-ms') args.delayMs = Math.max(0, Number.parseInt(argv[++index] || '0', 10) || 0);
  }

  return args;
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function mediaTargets(asset) {
  return [
    { kind: 'cover', outputPath: path.join(CAMPAIGN_ROOT, asset.media.coverFile) },
    ...asset.media.galleryFiles.map((file, index) => ({
      kind: `gallery-${index + 1}`,
      outputPath: path.join(CAMPAIGN_ROOT, file),
    })),
  ];
}

function templateQueries(asset) {
  const title = cleanText(asset.title).toLowerCase();
  const category = cleanText(asset.category);
  const assetClass = cleanText(asset.assetClass);

  if (category === 'agri_food') {
    return title.includes('green coffee')
      ? ['green coffee beans', 'coffee beans sack', 'coffee sample bag', 'coffee harvest beans']
      : ['coffee beans bag', 'roasted coffee beans', 'packaged coffee beans', 'coffee sack'];
  }
  if (category === 'fashion_textiles') {
    return title.includes('linen')
      ? ['linen shirt clothing', 'linen garment', 'shirt on hanger', 'clothing rack shirts']
      : ['cotton shirt clothing', 'shirt product photo', 'clothing rack shirts', 'garment shirt'];
  }
  if (category === 'home_living') {
    return title.includes('chair')
      ? ['lounge chair furniture', 'wooden chair furniture', 'modern chair furniture', 'furniture showroom chair']
      : ['wooden shelf furniture', 'bookcase furniture', 'modular shelf', 'wood furniture shelf'];
  }
  if (category === 'consumer_electronics') {
    return title.includes('tablet')
      ? ['tablet computer device', 'digital tablet device', 'touchscreen tablet', 'tablet on desk']
      : ['smartphone product', 'mobile phone device', 'smartphone close up', 'mobile phone on desk'];
  }
  if (category === 'industrial_supply') {
    return title.includes('drill')
      ? ['cordless drill tool', 'power drill tool', 'drill kit', 'workshop drill']
      : ['hand tools set', 'tool set', 'workshop tools', 'precision tools'];
  }
  if (category === 'automotive_parts') {
    return title.includes('brake')
      ? ['brake disc car part', 'brake rotor', 'brake pads', 'automotive brake parts']
      : ['oil filter auto part', 'engine filter car', 'spark plug car part', 'auto parts'];
  }
  if (category === 'raw_materials_packaging') {
    return title.includes('fastener')
      ? ['stainless steel screws', 'fasteners box', 'metal screws', 'hardware fasteners']
      : ['aluminum sheet metal', 'steel sheet metal', 'metal rods', 'metal sheet stack'];
  }
  if (category === 'luxury_collectibles') {
    return title.includes('strap')
      ? ['watch strap', 'leather watch strap', 'watch band', 'wristwatch strap']
      : ['wristwatch close up', 'automatic watch', 'mechanical watch', 'watch product'];
  }
  if (assetClass === 'service_rights') {
    return ['warehouse inspection', 'package inspection warehouse', 'quality control factory', 'shipping boxes warehouse', 'technician tools'];
  }
  if (assetClass === 'agent_services') {
    return ['laptop analytics dashboard', 'business dashboard computer', 'office laptop screen', 'data analytics computer', 'computer dashboard office'];
  }

  return [asset.subcategory, asset.category, asset.title].map(cleanText).filter(Boolean);
}

function shouldRejectText(value) {
  return /\b(logo|icon|map|diagram|coat of arms|flag|seal|svg|symbol|qr|graph|chart|cartoon|illustration|drawing|poster|meme|santa|christmas|spacex|dragon|ikea|nokia|caledos|runner|wallpaper|anime|sexy|amateur|baby|child|school|nuclear|fuel inspection|border|customs|prison|medical warehouse|hospital|ammunition|weapon|military|army|navy|naval|air force|airborne|brigade|tactical|firearm|gun|rifle|missile|bomb|war|police|political|speech|corpse|accident|injury|blood|fire|firemen|flame|smoke|disaster)\b/i.test(value);
}

function isAllowedLicense(record) {
  const license = cleanText(record.license).toLowerCase();
  const licenseUrl = cleanText(record.license_url).toLowerCase();
  if (!license || !licenseUrl) return false;
  if (license.includes('nc') || license.includes('nd') || licenseUrl.includes('/nc') || licenseUrl.includes('/nd')) return false;
  if (license.includes('sampling') || licenseUrl.includes('sampling')) return false;
  return true;
}

function isLikelySupportedImage(record) {
  const url = cleanText(record.url);
  const filetype = cleanText(record.filetype).toLowerCase();
  return /\.(jpe?g|png|webp)(\?|$)/i.test(url) || ['jpg', 'jpeg', 'png', 'webp'].includes(filetype);
}

function normalizeOpenverseRecord(record) {
  const title = cleanText(record.title);
  const url = cleanText(record.url);
  const landingUrl = cleanText(record.foreign_landing_url);
  const provider = cleanText(record.provider || record.source).toLowerCase();
  const haystack = `${title} ${url} ${landingUrl}`;
  if (!url || !landingUrl) return null;
  if (provider === 'wikimedia' || url.includes('upload.wikimedia.org')) return null;
  if (!isAllowedLicense(record)) return null;
  if (!isLikelySupportedImage(record)) return null;
  if (shouldRejectText(haystack)) return null;

  return {
    source: 'openverse',
    provider,
    title,
    sourceUrl: url,
    originalUrl: url,
    descriptionUrl: landingUrl,
    mimeType: cleanText(record.filetype) || null,
    width: record.width || null,
    height: record.height || null,
    licenseShortName: cleanText(record.license).toUpperCase(),
    licenseUrl: cleanText(record.license_url),
    artist: cleanText(record.creator),
    credit: cleanText(record.attribution),
  };
}

function hasAny(value, terms) {
  const text = cleanText(value).toLowerCase();
  return terms.some((term) => text.includes(term));
}

function isRecordRelevantForAsset(asset, record) {
  const title = cleanText(record.title).toLowerCase();
  const category = cleanText(asset.category);
  const assetClass = cleanText(asset.assetClass);
  const assetTitle = cleanText(asset.title).toLowerCase();

  if (category === 'agri_food') {
    return hasAny(title, ['coffee', 'bean', 'beans', 'sack', 'bag', 'roast', 'cherry']);
  }
  if (category === 'fashion_textiles') {
    return assetTitle.includes('linen')
      ? hasAny(title, ['linen', 'shirt', 'clothing', 'garment', 'fabric'])
      : hasAny(title, ['cotton', 'shirt', 'clothing', 'garment', 't-shirt', 'tee', 'fabric']);
  }
  if (category === 'home_living') {
    return assetTitle.includes('chair')
      ? hasAny(title, ['chair', 'lounge', 'sofa', 'furniture'])
      : hasAny(title, ['shelf', 'shelves', 'bookcase', 'furniture', 'wood', 'rack']);
  }
  if (category === 'consumer_electronics') {
    return assetTitle.includes('tablet')
      ? hasAny(title, ['tablet', 'ipad', 'device', 'touchscreen'])
      : hasAny(title, ['smartphone', 'phone', 'mobile', 'iphone', 'device']);
  }
  if (category === 'industrial_supply') {
    return assetTitle.includes('drill')
      ? hasAny(title, ['drill', 'screwdriver', 'bosch', 'dewalt', 'metabo', 'tool'])
      : hasAny(title, ['tool', 'tools', 'wrench', 'plier', 'screwdriver', 'hardware']);
  }
  if (category === 'automotive_parts') {
    return assetTitle.includes('brake')
      ? hasAny(title, ['brake', 'rotor', 'disc'])
      : hasAny(title, ['oil filter', 'filter', 'spark plug', 'engine']);
  }
  if (category === 'raw_materials_packaging') {
    return assetTitle.includes('fastener')
      ? hasAny(title, ['screw', 'fastener', 'bolt', 'hardware', 'stainless'])
      : hasAny(title, ['aluminum', 'aluminium', 'steel', 'metal', 'sheet', 'rod']);
  }
  if (category === 'luxury_collectibles') {
    return assetTitle.includes('strap')
      ? hasAny(title, ['strap', 'watch band', 'watchband', 'leather'])
      : hasAny(title, ['watch', 'wristwatch', 'timepiece']);
  }
  if (assetClass === 'service_rights') {
    return hasAny(title, ['warehouse', 'inspection', 'quality', 'control', 'package', 'shipping', 'cargo', 'logistics', 'supply']);
  }
  if (assetClass === 'agent_services') {
    return hasAny(title, ['dashboard', 'laptop', 'computer', 'analytics', 'data', 'office', 'screen']);
  }

  return true;
}

async function searchOpenverse(query) {
  const normalizedQuery = cleanText(query).toLowerCase();
  if (queryCache.has(normalizedQuery)) return queryCache.get(normalizedQuery);

  const records = [];
  for (let page = 1; page <= 8; page += 1) {
    const elapsed = Date.now() - lastOpenverseRequestAt;
    if (elapsed < 700) {
      await delay(700 - elapsed);
    }

    const params = new URLSearchParams({
      q: normalizedQuery,
      license_type: 'commercial,modification',
      mature: 'false',
      page_size: '20',
      page: String(page),
    });
    lastOpenverseRequestAt = Date.now();
    const response = await fetch(`${OPENVERSE_API_URL}?${params}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
    });
    if (!response.ok) {
      throw new Error(`Openverse search failed ${response.status} for query=${normalizedQuery}`);
    }

    const payload = await response.json();
    records.push(...(payload.results || []).map(normalizeOpenverseRecord).filter(Boolean));
    if (!payload.results || payload.results.length < 20) break;
  }

  const unique = [];
  const seen = new Set();
  for (const record of records) {
    const key = record.sourceUrl;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(record);
  }

  queryCache.set(normalizedQuery, unique);
  return unique;
}

async function chooseOpenverseRecord(asset, kind, usedUrls, assetUsedUrls) {
  const queries = templateQueries(asset);
  for (const query of queries) {
    const records = await searchOpenverse(query);
    const fresh = records.find((record) => isRecordRelevantForAsset(asset, record) && !usedUrls.has(record.sourceUrl) && !assetUsedUrls.has(record.sourceUrl));
    if (fresh) {
      usedUrls.add(fresh.sourceUrl);
      assetUsedUrls.add(fresh.sourceUrl);
      return { ...fresh, query };
    }
  }

  for (const query of queries) {
    const records = await searchOpenverse(query);
    const nonAssetDuplicate = records.find((record) => isRecordRelevantForAsset(asset, record) && !assetUsedUrls.has(record.sourceUrl));
    if (nonAssetDuplicate) {
      assetUsedUrls.add(nonAssetDuplicate.sourceUrl);
      return { ...nonAssetDuplicate, query, reusedGlobally: true };
    }
  }

  throw new Error(`No Openverse image found for ${asset.assetUid} ${kind}`);
}

async function downloadImage(sourceUrl) {
  const cached = downloadCache.get(sourceUrl);
  if (cached) return cached;

  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(sourceUrl, {
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'User-Agent': USER_AGENT,
        },
      });
      if (!response.ok) {
        lastError = new Error(`status ${response.status}`);
        await delay(1000 * (attempt + 1));
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1024) {
        lastError = new Error('image too small');
        await delay(1000 * (attempt + 1));
        continue;
      }
      downloadCache.set(sourceUrl, buffer);
      return buffer;
    } catch (error) {
      lastError = error;
      await delay(1000 * (attempt + 1));
    }
  }

  throw new Error(`Openverse image download failed: ${sourceUrl} (${lastError?.message || 'unknown'})`);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function delay(ms) {
  if (!ms) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function openverseSidecarPath(outputPath, kind) {
  return outputPath.replace(/\.[^.]+$/, `.openverse.${kind}.json`);
}

async function readExistingSidecar(outputPath, kind) {
  try {
    return JSON.parse(await fs.readFile(openverseSidecarPath(outputPath, kind), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeSidecar(outputPath, record) {
  await fs.writeFile(openverseSidecarPath(outputPath, record.kind), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const allAssets = JSON.parse(await fs.readFile(ASSET_INDEX_PATH, 'utf8'));
  const assets = allAssets.slice(
    args.offsetAssets,
    Number.isFinite(args.limitAssets) ? args.offsetAssets + args.limitAssets : Number.POSITIVE_INFINITY,
  );

  const usedUrls = new Set();
  const plan = [];
  for (const asset of assets) {
    const assetUsedUrls = new Set();
    for (const target of mediaTargets(asset)) {
      const openverse = await chooseOpenverseRecord(asset, target.kind, usedUrls, assetUsedUrls);
      plan.push({
        assetUid: asset.assetUid,
        sourceProfileId: asset.sourceProfileId,
        title: asset.title,
        category: asset.category,
        subcategory: asset.subcategory,
        assetClass: asset.assetClass,
        kind: target.kind,
        outputPath: path.relative(CAMPAIGN_ROOT, target.outputPath).replace(/\\/g, '/'),
        ...openverse,
      });
    }
  }

  if (args.dryRun) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      source: 'openverse',
      selectedAssets: assets.length,
      plannedFiles: plan.length,
      uniqueSourceUrls: new Set(plan.map((record) => record.sourceUrl)).size,
      sample: plan.slice(0, 10),
    }, null, 2));
    return;
  }

  await fs.mkdir(AUDIT_DIR, { recursive: true });
  const downloadedAt = new Date().toISOString();
  const records = [];
  let skipped = 0;

  for (const record of plan) {
    const outputPath = path.join(CAMPAIGN_ROOT, record.outputPath);
    const existing = await readExistingSidecar(outputPath, record.kind);
    if (args.overwrite && existing?.sourceUrl === record.sourceUrl && await fileExists(outputPath)) {
      records.push({ ...record, status: 'skipped_existing_openverse', downloadedAt });
      skipped += 1;
      continue;
    }

    if (!args.overwrite && await fileExists(outputPath)) {
      records.push({ ...record, status: 'skipped_existing', downloadedAt });
      skipped += 1;
      continue;
    }

    const buffer = await downloadImage(record.sourceUrl);
    const finalRecord = {
      ...record,
      fileSize: buffer.length,
      status: 'downloaded',
      downloadedAt,
    };
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, buffer);
    await writeSidecar(outputPath, finalRecord);
    records.push(finalRecord);
    console.log(`${record.assetUid} ${record.kind} <- ${record.title}`);
    await delay(args.delayMs);
  }

  await fs.writeFile(AUDIT_PATH, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    seedBatch: SEED_BATCH,
    source: 'openverse',
    licensePolicyUrl: OPENVERSE_LICENSE_POLICY_URL,
    campaignRoot: CAMPAIGN_ROOT,
    assets: assets.length,
    files: records.length,
    skipped,
    uniqueSourceUrls: new Set(records.map((record) => record.sourceUrl)).size,
    records,
  }, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    ok: true,
    assets: assets.length,
    files: records.length,
    skipped,
    uniqueSourceUrls: new Set(records.map((record) => record.sourceUrl)).size,
    audit: AUDIT_PATH,
    next: 'node scripts/pin-v3-5-beta-seed-asset-media.mjs --dry-run',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
