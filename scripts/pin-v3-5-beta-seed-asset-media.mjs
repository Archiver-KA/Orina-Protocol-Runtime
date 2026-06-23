import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const CAMPAIGN_ROOT = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign';
const ASSET_INDEX_PATH = path.join(CAMPAIGN_ROOT, 'seed-assets-index.json');
const AUDIT_DIR = 'supabase/audit';
const MANIFEST_PATH = path.join(AUDIT_DIR, 'v3_5_beta_seed_asset_media_ipfs_manifest.json');
const SEED_BATCH = 'v3.5-beta-seed-assets-001';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    overwriteManifest: false,
    coverOnly: false,
    limitAssets: Number.POSITIVE_INFINITY,
    delayMs: 100,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--dry-run') args.dryRun = true;
    else if (value === '--overwrite-manifest') args.overwriteManifest = true;
    else if (value === '--cover-only') args.coverOnly = true;
    else if (value === '--limit-assets') args.limitAssets = Math.max(1, Number.parseInt(argv[++index] || '1', 10) || 1);
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

function mimeTypeFromBuffer(buffer, filePath) {
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  throw new Error(`Unsupported media type for ${filePath}`);
}

function gatewayUrl(ipfsHash) {
  return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
}

function mediaTargets(asset, args = {}) {
  const targets = [{ kind: 'cover', filePath: path.join(CAMPAIGN_ROOT, asset.media.coverFile) }];
  if (args.coverOnly) return targets;
  return [
    ...targets,
    ...asset.media.galleryFiles.map((file, index) => ({
      kind: `gallery-${index + 1}`,
      filePath: path.join(CAMPAIGN_ROOT, file),
    })),
  ];
}

async function loadExistingManifest() {
  try {
    return JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function mediaRecordFromManifest(existingManifest, assetUid, kind) {
  const record = existingManifest?.assets?.[assetUid]?.media?.[kind];
  if (!record?.ipfsHash || !record?.url) return null;
  return record;
}

async function uploadToPinata({ pinataJwt, asset, filePath, kind }) {
  const buffer = await fs.readFile(filePath);
  const fileName = path.basename(filePath);
  const mimeType = mimeTypeFromBuffer(buffer, filePath);
  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: mimeType }), fileName);
  formData.append(
    'pinataMetadata',
    JSON.stringify({
      name: `orina-${SEED_BATCH}-${asset.assetUid}-${kind}-${fileName}`,
      keyvalues: {
        seedBatch: SEED_BATCH,
        assetUid: asset.assetUid,
        sourceProfileId: asset.sourceProfileId,
        sellerWallet: asset.sellerWallet,
        mediaKind: kind,
        sourcePath: path.relative(CAMPAIGN_ROOT, filePath).replace(/\\/g, '/'),
      },
    }),
  );

  let response = null;
  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pinataJwt}`,
        },
        body: formData,
      });
      break;
    } catch (error) {
      lastError = error;
      await delay(3000 * (attempt + 1));
    }
  }

  if (!response) {
    throw new Error(`Pinata upload failed for ${asset.assetUid} ${kind}: ${lastError?.message || 'network_error'}`);
  }

  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(`Pinata upload failed for ${asset.assetUid} ${kind}: ${response.status} ${payload ? JSON.stringify(payload) : text}`);
  }
  if (!payload?.IpfsHash) {
    throw new Error(`Pinata upload returned no IpfsHash for ${asset.assetUid} ${kind}`);
  }

  return {
    ipfsHash: payload.IpfsHash,
    url: gatewayUrl(payload.IpfsHash),
    fileName,
    fileSize: buffer.length,
    mimeType,
    sourcePath: path.relative(CAMPAIGN_ROOT, filePath).replace(/\\/g, '/'),
    pinnedAt: new Date().toISOString(),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = await loadEnv();
  const assets = JSON.parse(await fs.readFile(ASSET_INDEX_PATH, 'utf8'))
    .slice(0, Number.isFinite(args.limitAssets) ? args.limitAssets : Number.POSITIVE_INFINITY);

  const missing = [];
  for (const asset of assets) {
    for (const target of mediaTargets(asset, args)) {
      if (!await fileExists(target.filePath)) {
        missing.push({
          assetUid: asset.assetUid,
          kind: target.kind,
          path: target.filePath,
        });
      }
    }
  }

  if (missing.length > 0) {
    console.log(JSON.stringify({
      ok: false,
      reason: 'missing_seed_asset_media_files',
      expectedFlow: 'campaign asset cover/gallery -> Pinata/IPFS -> assets_catalog cover_image_url/gallery_images',
      selectedAssets: assets.length,
      expectedFiles: assets.length * (args.coverOnly ? 1 : 3),
      missingCount: missing.length,
      sampleMissing: missing.slice(0, 10),
    }, null, 2));
    if (!args.dryRun) process.exitCode = 1;
    return;
  }

  if (args.dryRun) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      selectedAssets: assets.length,
      mediaMode: args.coverOnly ? 'cover_only' : 'cover_and_gallery',
      mediaFilesReady: assets.length * (args.coverOnly ? 1 : 3),
      manifest: MANIFEST_PATH,
    }, null, 2));
    return;
  }

  if (!env.PINATA_JWT) {
    throw new Error('PINATA_JWT is required to pin seed asset media');
  }

  await fs.mkdir(AUDIT_DIR, { recursive: true });
  const existingManifest = args.overwriteManifest ? null : await loadExistingManifest();
  const manifest = {
    generatedAt: new Date().toISOString(),
    seedBatch: SEED_BATCH,
    mediaMode: args.coverOnly ? 'cover_only' : 'cover_and_gallery',
    sourceCampaignRoot: CAMPAIGN_ROOT,
    assets: existingManifest?.assets ? { ...existingManifest.assets } : {},
  };
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  for (const asset of assets) {
    const current = manifest.assets[asset.assetUid] || {};
    const media = { ...(current.media || {}) };
    for (const target of mediaTargets(asset, args)) {
      media[target.kind] = mediaRecordFromManifest(existingManifest, asset.assetUid, target.kind)
        || await uploadToPinata({
          pinataJwt: env.PINATA_JWT,
          asset,
          filePath: target.filePath,
          kind: target.kind,
        });
      await delay(args.delayMs);
    }

    manifest.assets[asset.assetUid] = {
      ...current,
      assetUid: asset.assetUid,
      sourceProfileId: asset.sourceProfileId,
      sellerWallet: asset.sellerWallet,
      title: asset.title,
      media,
    };
    await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`${asset.assetUid} cover=${media.cover.ipfsHash}`);
  }

  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    assets: assets.length,
    mediaMode: args.coverOnly ? 'cover_only' : 'cover_and_gallery',
    pinnedFiles: assets.length * (args.coverOnly ? 1 : 3),
    manifest: MANIFEST_PATH,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
