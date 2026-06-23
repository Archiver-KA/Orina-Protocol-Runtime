import fs from 'node:fs/promises';
import path from 'node:path';

const CAMPAIGN_ROOT = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign';
const SOURCE_INDEX_PATH = path.join(CAMPAIGN_ROOT, 'profiles-index.json');
const AUDIT_DIR = 'supabase/audit';
const AUDIT_PATH = path.join(AUDIT_DIR, 'v3_5_beta_seed_profile_media_pixabay_sources.json');
const LICENSE_URL = 'https://pixabay.com/service/license-summary/';
const SEED_BATCH = 'v3.5-beta-seed-profiles-001';
const downloadCache = new Map();

const PIXABAY_POOLS = {
  'agri_food/coffee': [
    'https://cdn.pixabay.com/photo/2021/04/22/02/36/barista-6197867_640.jpg',
    'https://cdn.pixabay.com/photo/2018/01/31/09/57/coffee-3120750_640.jpg',
    'https://cdn.pixabay.com/photo/2019/11/11/15/32/coffee-4618705_640.jpg',
    'https://cdn.pixabay.com/photo/2016/11/29/09/16/architecture-1868667_640.jpg',
  ],
  'fashion_textiles/garments': [
    'https://cdn.pixabay.com/photo/2016/11/22/19/08/hangers-1850082_1280.jpg',
    'https://cdn.pixabay.com/photo/2020/01/09/08/49/dress-4752316_640.jpg',
    'https://cdn.pixabay.com/photo/2021/11/15/05/25/boutique-6796399_640.jpg',
    'https://cdn.pixabay.com/photo/2016/04/19/13/39/store-1338629_640.jpg',
  ],
  'home_living/furniture': [
    'https://cdn.pixabay.com/photo/2016/11/18/17/20/couch-1835923_640.jpg',
    'https://cdn.pixabay.com/photo/2016/11/18/17/46/house-1836070_640.jpg',
    'https://cdn.pixabay.com/photo/2017/06/13/22/42/kitchen-2400367_640.jpg',
  ],
  'consumer_electronics/mobile_devices': [
    'https://cdn.pixabay.com/photo/2015/06/24/15/45/ipad-820272_640.jpg',
    'https://cdn.pixabay.com/photo/2015/05/31/10/55/man-791049_640.jpg',
  ],
  'industrial_supply/tools_equipment': [
    'https://cdn.pixabay.com/photo/2020/02/19/21/49/workshop-4863393_1280.jpg',
    'https://cdn.pixabay.com/photo/2016/10/17/18/06/axe-1748305_640.jpg',
    'https://cdn.pixabay.com/photo/2022/08/12/12/58/hardware-7381713_640.jpg',
  ],
  'automotive_parts/engine_parts': [
    'https://cdn.pixabay.com/photo/2020/01/09/15/32/auto-parts-4753080_1280.jpg',
    'https://cdn.pixabay.com/photo/2017/09/16/13/45/clutch-2755548_640.jpg',
    'https://cdn.pixabay.com/photo/2016/09/11/20/27/truck-butt-1662497_640.jpg',
    'https://cdn.pixabay.com/photo/2022/05/10/14/04/mechanical-7187202_640.jpg',
  ],
  'raw_materials_packaging/metals': [
    'https://cdn.pixabay.com/photo/2014/10/05/08/11/iron-rods-474792_1280.jpg',
    'https://cdn.pixabay.com/photo/2016/04/18/14/35/texture-1336597_640.jpg',
    'https://cdn.pixabay.com/photo/2023/12/05/15/26/screw-8431918_640.jpg',
    'https://cdn.pixabay.com/photo/2022/05/09/19/42/metal-7185450_640.jpg',
  ],
  'luxury_collectibles/watches': [
    'https://cdn.pixabay.com/photo/2016/11/22/19/15/hand-1850120_640.jpg',
  ],
};

function parseArgs(argv) {
  const args = {
    dryRun: false,
    overwrite: false,
    limit: Number.POSITIVE_INFINITY,
    profile: null,
    delayMs: 150,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--dry-run') args.dryRun = true;
    else if (value === '--overwrite') args.overwrite = true;
    else if (value === '--profile') args.profile = String(argv[++index] || '').trim().toUpperCase();
    else if (value === '--limit') args.limit = Math.max(1, Number.parseInt(argv[++index] || '1', 10) || 1);
    else if (value === '--delay-ms') args.delayMs = Math.max(0, Number.parseInt(argv[++index] || '0', 10) || 0);
  }

  return args;
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

function pickMediaUrl(row, kind) {
  const pool = PIXABAY_POOLS[row.lane];
  if (!pool?.length) {
    throw new Error(`No Pixabay media pool configured for lane ${row.lane}`);
  }

  const profileNumber = Number.parseInt(String(row.profileId).replace(/\D/g, ''), 10) || 1;
  const offset = kind === 'banner' ? 1 : 0;
  return pool[(profileNumber + offset) % pool.length];
}

function assertSupportedImage(buffer, sourceUrl) {
  const isJpeg = buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (!isJpeg && !isPng && !isWebp) {
    throw new Error(`Downloaded file is not a supported raster image: ${sourceUrl}`);
  }
}

async function downloadImage(sourceUrl) {
  const cached = downloadCache.get(sourceUrl);
  if (cached) return cached;

  const response = await fetch(sourceUrl, {
    headers: {
      Accept: 'image/*,*/*;q=0.8',
      Referer: 'https://pixabay.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`Pixabay CDN download failed: ${response.status} ${sourceUrl}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  assertSupportedImage(buffer, sourceUrl);
  downloadCache.set(sourceUrl, buffer);
  return buffer;
}

function sourceRecord(row, kind, sourceUrl, outputPath, fileSize = null) {
  return {
    profileId: row.profileId,
    profileName: row.profileName,
    walletAddress: String(row.walletAddress || '').toLowerCase(),
    lane: row.lane,
    kind,
    source: 'pixabay',
    sourceUrl,
    licenseUrl: LICENSE_URL,
    outputPath: path.relative(CAMPAIGN_ROOT, outputPath).replace(/\\/g, '/'),
    fileSize,
  };
}

async function writeSourceSidecar(outputPath, record) {
  const sidecarPath = outputPath.replace(/\.[^.]+$/, `.pixabay.${record.kind}.json`);
  await fs.writeFile(sidecarPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const indexRows = JSON.parse(await fs.readFile(SOURCE_INDEX_PATH, 'utf8'));
  const selectedRows = indexRows
    .filter((row) => !args.profile || row.profileId === args.profile)
    .slice(0, Number.isFinite(args.limit) ? args.limit : indexRows.length);

  const planned = [];
  for (const row of selectedRows) {
    const avatarPath = path.join(CAMPAIGN_ROOT, row.avatarFile);
    const bannerPath = path.join(CAMPAIGN_ROOT, row.bannerFile);
    planned.push(sourceRecord(row, 'avatar', pickMediaUrl(row, 'avatar'), avatarPath));
    planned.push(sourceRecord(row, 'banner', pickMediaUrl(row, 'banner'), bannerPath));
  }

  if (args.dryRun) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      source: 'pixabay',
      licenseUrl: LICENSE_URL,
      selectedProfiles: selectedRows.length,
      plannedFiles: planned.length,
      sample: planned.slice(0, 8),
    }, null, 2));
    return;
  }

  await fs.mkdir(AUDIT_DIR, { recursive: true });
  const downloadedAt = new Date().toISOString();
  const records = [];
  let skipped = 0;

  for (const record of planned) {
    const outputPath = path.join(CAMPAIGN_ROOT, record.outputPath);
    if (!args.overwrite && await fileExists(outputPath)) {
      records.push({ ...record, status: 'skipped_existing', downloadedAt });
      skipped += 1;
      continue;
    }

    const buffer = await downloadImage(record.sourceUrl);
    const finalRecord = { ...record, fileSize: buffer.length, status: 'downloaded', downloadedAt };
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, buffer);
    await writeSourceSidecar(outputPath, finalRecord);
    records.push(finalRecord);
    console.log(`${record.profileId} ${record.kind} <- ${record.sourceUrl}`);
    await delay(args.delayMs);
  }

  const audit = {
    generatedAt: new Date().toISOString(),
    seedBatch: SEED_BATCH,
    source: 'pixabay',
    licenseUrl: LICENSE_URL,
    campaignRoot: CAMPAIGN_ROOT,
    profiles: selectedRows.length,
    files: records.length,
    skipped,
    records,
  };
  await fs.writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    ok: true,
    profiles: selectedRows.length,
    files: records.length,
    skipped,
    audit: AUDIT_PATH,
    next: 'node scripts/pin-v3-5-beta-profile-media.mjs --dry-run',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
