#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const CAMPAIGN_ROOT = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign';
const ASSET_INDEX_PATH = path.join(CAMPAIGN_ROOT, 'seed-assets-index.json');
const AUDIT_DIR = 'supabase/audit';
const AUDIT_PATH = path.join(AUDIT_DIR, 'v3_5_beta_seed_asset_media_commons_sources.json');
const COMMONS_API_URL = 'https://commons.wikimedia.org/w/api.php';
const COMMONS_LICENSE_POLICY_URL = 'https://commons.wikimedia.org/wiki/Commons:Licensing';
const SEED_BATCH = 'v3.5-beta-seed-assets-001';
const USER_AGENT = 'OrinaATPTestnetSeeder/1.0 (testnet media refresh)';

const queryCache = new Map();
const downloadCache = new Map();
let lastCommonsApiRequestAt = 0;
let lastCommonsDownloadAt = 0;

function parseArgs(argv) {
  const args = {
    dryRun: false,
    overwrite: false,
    limitAssets: Number.POSITIVE_INFINITY,
    delayMs: 20,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--dry-run') args.dryRun = true;
    else if (value === '--overwrite') args.overwrite = true;
    else if (value === '--limit-assets') args.limitAssets = Math.max(1, Number.parseInt(argv[++index] || '1', 10) || 1);
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
      ? ['green coffee beans', 'coffee beans sack', 'coffee cherries beans', 'coffee sample bag']
      : ['coffee bag', 'coffee beans bag', 'roasted coffee beans', 'coffee sack'];
  }
  if (category === 'fashion_textiles') {
    return title.includes('linen')
      ? ['linen shirt', 'linen clothing', 'clothes hanger linen', 'shirt product photo']
      : ['cotton shirt', 'clothing rack shirts', 'shirt product photo', 'clothes hanger'];
  }
  if (category === 'home_living') {
    return title.includes('chair')
      ? ['lounge chair', 'upholstered chair', 'wooden chair furniture', 'furniture showroom chair']
      : ['wooden shelf', 'modular shelf', 'bookcase furniture', 'wood furniture shelf'];
  }
  if (category === 'consumer_electronics') {
    return title.includes('tablet')
      ? ['tablet computer', 'tablet device', 'touchscreen tablet', 'digital tablet']
      : ['smartphone product', 'mobile phone device', 'smartphone close up', 'mobile phone'];
  }
  if (category === 'industrial_supply') {
    return title.includes('drill')
      ? ['cordless drill', 'power drill tool', 'drill kit', 'workshop drill']
      : ['hand tools set', 'tool set', 'workshop tools', 'precision tools'];
  }
  if (category === 'automotive_parts') {
    return title.includes('brake')
      ? ['brake disc', 'brake pads', 'automotive brake parts', 'car brake rotor']
      : ['oil filter', 'engine filter', 'spark plug', 'auto parts'];
  }
  if (category === 'raw_materials_packaging') {
    return title.includes('fastener')
      ? ['stainless steel screws', 'fasteners box', 'metal screws', 'hardware fasteners']
      : ['aluminium sheet', 'steel sheet metal', 'metal rods', 'metal sheet stack'];
  }
  if (category === 'luxury_collectibles') {
    return title.includes('strap')
      ? ['watch strap', 'leather watch strap', 'watch band', 'wristwatch strap']
      : ['automatic watch', 'wristwatch product', 'mechanical watch', 'watch close up'];
  }
  if (assetClass === 'service_rights') {
    return [
      'warehouse worker inspection',
      'package inspection warehouse',
      'factory quality control',
      'maintenance technician tools',
      'shipping warehouse boxes',
    ];
  }
  if (assetClass === 'agent_services') {
    return [
      'office laptop dashboard',
      'business dashboard screen',
      'data analytics dashboard',
      'computer analytics office',
      'office computer screen',
    ];
  }

  return [asset.subcategory, asset.category, asset.title].map(cleanText).filter(Boolean);
}

function isAllowedLicense(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return false;
  if (text.includes('fair use') || text.includes('non-free')) return false;
  return true;
}

function shouldRejectTitle(title) {
  return /\b(logo|icon|map|diagram|coat of arms|flag|seal|svg|symbol|qr|graph|chart|ammunition|weapon|military|army|navy|naval|air force|airborne|brigade|tactical|firearm|gun|rifle|missile|bomb|war|police|political|speech|corpse|accident|injury|blood|fire|firemen|flame|smoke|disaster)\b/i.test(title);
}

function normalizeCommonsRecord(page) {
  const imageInfo = page?.imageinfo?.[0];
  if (!imageInfo) return null;
  const title = cleanText(page.title);
  const mime = cleanText(imageInfo.mime).toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) return null;
  if (shouldRejectTitle(title)) return null;

  const metadata = imageInfo.extmetadata || {};
  const licenseShortName = cleanText(metadata.LicenseShortName?.value || metadata.UsageTerms?.value);
  if (!isAllowedLicense(licenseShortName)) return null;

  const sourceUrl = cleanText(imageInfo.thumburl || imageInfo.url);
  if (!sourceUrl) return null;

  return {
    source: 'wikimedia_commons',
    title,
    sourceUrl,
    originalUrl: cleanText(imageInfo.url),
    descriptionUrl: cleanText(imageInfo.descriptionurl),
    mimeType: mime,
    width: imageInfo.thumbwidth || imageInfo.width || null,
    height: imageInfo.thumbheight || imageInfo.height || null,
    licenseShortName,
    licenseUrl: cleanText(metadata.LicenseUrl?.value) || COMMONS_LICENSE_POLICY_URL,
    artist: cleanText(metadata.Artist?.value).replace(/<[^>]+>/g, ''),
    credit: cleanText(metadata.Credit?.value).replace(/<[^>]+>/g, ''),
  };
}

async function searchCommons(query) {
  const normalizedQuery = cleanText(query).toLowerCase();
  if (queryCache.has(normalizedQuery)) return queryCache.get(normalizedQuery);

  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: normalizedQuery,
    gsrnamespace: '6',
    gsrlimit: '50',
    prop: 'imageinfo',
    iiprop: 'url|mime|size|extmetadata',
    iiurlwidth: '1280',
    format: 'json',
    origin: '*',
  });
  const elapsed = Date.now() - lastCommonsApiRequestAt;
  if (elapsed < 3000) {
    await delay(3000 - elapsed);
  }

  let response = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    lastCommonsApiRequestAt = Date.now();
    response = await fetch(`${COMMONS_API_URL}?${params}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
    });
    if (response.status !== 429) break;
    await delay(15000 * (attempt + 1));
  }

  if (!response.ok) {
    throw new Error(`Commons search failed ${response.status} for query=${normalizedQuery}`);
  }

  const payload = await response.json();
  const records = Object.values(payload.query?.pages || {})
    .map(normalizeCommonsRecord)
    .filter(Boolean);
  queryCache.set(normalizedQuery, records);
  return records;
}

async function chooseCommonsRecord(asset, kind, usedUrls, assetUsedUrls) {
  const queries = templateQueries(asset);
  for (const query of queries) {
    const records = await searchCommons(query);
    const fresh = records.find((record) => !usedUrls.has(record.sourceUrl) && !assetUsedUrls.has(record.sourceUrl));
    if (fresh) {
      usedUrls.add(fresh.sourceUrl);
      assetUsedUrls.add(fresh.sourceUrl);
      return { ...fresh, query };
    }
  }

  for (const query of queries) {
    const records = await searchCommons(query);
    const nonAssetDuplicate = records.find((record) => !assetUsedUrls.has(record.sourceUrl));
    if (nonAssetDuplicate) {
      assetUsedUrls.add(nonAssetDuplicate.sourceUrl);
      return { ...nonAssetDuplicate, query, reusedGlobally: true };
    }
  }

  throw new Error(`No Commons image found for ${asset.assetUid} ${kind}`);
}

async function downloadImage(sourceUrl) {
  const cached = downloadCache.get(sourceUrl);
  if (cached) return cached;

  const elapsed = Date.now() - lastCommonsDownloadAt;
  if (elapsed < 3000) {
    await delay(3000 - elapsed);
  }

  let response = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    lastCommonsDownloadAt = Date.now();
    response = await fetch(sourceUrl, {
      headers: {
        Accept: 'image/*,*/*;q=0.8',
        'User-Agent': USER_AGENT,
      },
    });
    if (response.status !== 429 && response.status !== 503) break;
    await delay(30000 * (attempt + 1));
  }

  if (!response.ok) {
    throw new Error(`Commons image download failed ${response.status}: ${sourceUrl}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1024) {
    throw new Error(`Commons image too small: ${sourceUrl}`);
  }
  downloadCache.set(sourceUrl, buffer);
  return buffer;
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

async function writeSidecar(outputPath, record) {
  const sidecarPath = commonsSidecarPath(outputPath, record.kind);
  await fs.writeFile(sidecarPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

function commonsSidecarPath(outputPath, kind) {
  return outputPath.replace(/\.[^.]+$/, `.commons.${kind}.json`);
}

async function readExistingCommonsSidecar(outputPath, kind) {
  try {
    return JSON.parse(await fs.readFile(commonsSidecarPath(outputPath, kind), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const assets = JSON.parse(await fs.readFile(ASSET_INDEX_PATH, 'utf8'))
    .slice(0, Number.isFinite(args.limitAssets) ? args.limitAssets : Number.POSITIVE_INFINITY);

  const usedUrls = new Set();
  const plan = [];
  for (const asset of assets) {
    const assetUsedUrls = new Set();
    for (const target of mediaTargets(asset)) {
      const commons = await chooseCommonsRecord(asset, target.kind, usedUrls, assetUsedUrls);
      plan.push({
        assetUid: asset.assetUid,
        sourceProfileId: asset.sourceProfileId,
        title: asset.title,
        category: asset.category,
        subcategory: asset.subcategory,
        assetClass: asset.assetClass,
        kind: target.kind,
        outputPath: path.relative(CAMPAIGN_ROOT, target.outputPath).replace(/\\/g, '/'),
        ...commons,
      });
    }
  }

  if (args.dryRun) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      source: 'wikimedia_commons',
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
    const existingCommons = await readExistingCommonsSidecar(outputPath, record.kind);
    if (args.overwrite && existingCommons?.sourceUrl === record.sourceUrl && await fileExists(outputPath)) {
      records.push({ ...record, status: 'skipped_existing_commons', downloadedAt });
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
    source: 'wikimedia_commons',
    licensePolicyUrl: COMMONS_LICENSE_POLICY_URL,
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
