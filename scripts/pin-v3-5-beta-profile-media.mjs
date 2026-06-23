import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const CAMPAIGN_ROOT = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign';
const SOURCE_INDEX_PATH = path.join(CAMPAIGN_ROOT, 'profiles-index.json');
const AUDIT_DIR = 'supabase/audit';
const MANIFEST_PATH = path.join(AUDIT_DIR, 'v3_5_beta_seed_profile_media_ipfs_manifest.json');
const MIGRATION_PATH = 'supabase/migrations/000079_v3_5_beta_seed_profile_media_ipfs.sql';
const SEED_BATCH = 'v3.5-beta-seed-profiles-001';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    overwriteManifest: false,
    limit: Number.POSITIVE_INFINITY,
    profile: null,
    delayMs: 250,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--dry-run') args.dryRun = true;
    else if (value === '--overwrite-manifest') args.overwriteManifest = true;
    else if (value === '--profile') args.profile = String(argv[++index] || '').trim().toUpperCase();
    else if (value === '--limit') args.limit = Math.max(1, Number.parseInt(argv[++index] || '1', 10) || 1);
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

function mimeTypeFromBuffer(buffer, filePath) {
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9) {
    return 'image/jpeg';
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a')) {
    return 'image/gif';
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  throw new Error(`Unsupported media type for ${filePath}`);
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function normalizeWallet(value) {
  return String(value || '').trim().toLowerCase();
}

function gatewayUrl(ipfsHash) {
  return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
}

async function loadExistingManifest() {
  try {
    return JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function mediaRecordFromManifest(existingManifest, profileId, kind) {
  const record = existingManifest?.profiles?.[profileId]?.[kind];
  if (!record?.ipfsHash || !record?.url) return null;
  return record;
}

async function uploadToPinata({ pinataJwt, filePath, profileId, walletAddress, kind }) {
  const buffer = await fs.readFile(filePath);
  const fileName = path.basename(filePath);
  const mimeType = mimeTypeFromBuffer(buffer, filePath);
  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: mimeType }), fileName);
  formData.append(
    'pinataMetadata',
    JSON.stringify({
      name: `orina-${SEED_BATCH}-${profileId}-${kind}-${fileName}`,
      keyvalues: {
        seedBatch: SEED_BATCH,
        profileId,
        walletAddress,
        mediaKind: kind,
        sourcePath: path.relative(CAMPAIGN_ROOT, filePath).replace(/\\/g, '/'),
      },
    }),
  );

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
    },
    body: formData,
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(`Pinata upload failed for ${profileId} ${kind}: ${response.status} ${payload?.error || text}`);
  }
  if (!payload?.IpfsHash) {
    throw new Error(`Pinata upload returned no IpfsHash for ${profileId} ${kind}`);
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

function buildMigration(payload) {
  const mediaMetadataExpr = `jsonb_build_object(
        'media_source', 'pinata_ipfs',
        'media_manifest', ${sqlString(MANIFEST_PATH.replace(/\\/g, '/'))},
        'avatar_url', media.avatar_url,
        'avatar_ipfs_hash', media.avatar_ipfs_hash,
        'banner_url', media.banner_url,
        'banner_ipfs_hash', media.banner_ipfs_hash
      )`;

  return `-- ============================================================
-- 000079 - v3.5 beta seed profile media IPFS repair
-- ============================================================
-- Updates seed profile avatar/banner media to the existing Pinata/IPFS
-- media flow. No local or placeholder media URLs are introduced.
-- ============================================================

do $$
declare
  payload jsonb := $media$${JSON.stringify(payload)}$media$::jsonb;
begin
  create temporary table tmp_v35_seed_profile_media (
    wallet_address text primary key,
    profile_id text not null,
    avatar_url text not null,
    avatar_ipfs_hash text not null,
    banner_url text not null,
    banner_ipfs_hash text not null
  ) on commit drop;

  insert into tmp_v35_seed_profile_media (
    wallet_address,
    profile_id,
    avatar_url,
    avatar_ipfs_hash,
    banner_url,
    banner_ipfs_hash
  )
  select
    lower(item ->> 'wallet_address'),
    item ->> 'profile_id',
    item ->> 'avatar_url',
    item ->> 'avatar_ipfs_hash',
    item ->> 'banner_url',
    item ->> 'banner_ipfs_hash'
  from jsonb_array_elements(payload) item;

  update public.profiles profiles
  set
    avatar_url = media.avatar_url,
    banner_url = media.banner_url,
    updated_at = now()
  from tmp_v35_seed_profile_media media
  where profiles.wallet_address = media.wallet_address;

  update public.profile_story_documents story
  set
    story_document = story.story_document || jsonb_build_object(
      'seedProfileMetadata',
      coalesce(story.story_document -> 'seedProfileMetadata', '{}'::jsonb) || ${mediaMetadataExpr}
    ),
    updated_at = now()
  from public.profiles profiles
  join tmp_v35_seed_profile_media media
    on media.wallet_address = profiles.wallet_address
  where story.user_id = profiles.id
    and story.story_document -> 'seedProfileMetadata' ->> 'seed_batch' = ${sqlString(SEED_BATCH)};

  update public.user_preferences prefs
  set
    ui_preferences = jsonb_set(
      jsonb_set(
        coalesce(prefs.ui_preferences, '{}'::jsonb),
        '{seed_profile_metadata}',
        coalesce(prefs.ui_preferences -> 'seed_profile_metadata', '{}'::jsonb) || ${mediaMetadataExpr},
        true
      ),
      '{story_document,seedProfileMetadata}',
      coalesce(prefs.ui_preferences #> '{story_document,seedProfileMetadata}', '{}'::jsonb) || ${mediaMetadataExpr},
      true
    ),
    updated_at = now()
  from public.profiles profiles
  join tmp_v35_seed_profile_media media
    on media.wallet_address = profiles.wallet_address
  where prefs.user_id = profiles.id;

  perform public.refresh_marketplace_profile_browse_index_v1();
end $$;
`;
}

async function delay(ms) {
  if (!ms) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = await loadEnv();
  const indexRows = JSON.parse(await fs.readFile(SOURCE_INDEX_PATH, 'utf8'));
  const selectedRows = indexRows
    .filter((row) => !args.profile || row.profileId === args.profile)
    .slice(0, Number.isFinite(args.limit) ? args.limit : indexRows.length);

  const missing = [];
  const targets = selectedRows.map((row) => {
    const avatarPath = path.join(CAMPAIGN_ROOT, row.avatarFile);
    const bannerPath = path.join(CAMPAIGN_ROOT, row.bannerFile);
    return {
      profileId: row.profileId,
      walletAddress: normalizeWallet(row.walletAddress),
      avatarPath,
      bannerPath,
    };
  });

  for (const target of targets) {
    if (!await fileExists(target.avatarPath)) missing.push({ profileId: target.profileId, kind: 'avatar', path: target.avatarPath });
    if (!await fileExists(target.bannerPath)) missing.push({ profileId: target.profileId, kind: 'banner', path: target.bannerPath });
  }

  if (missing.length > 0) {
    console.log(JSON.stringify({
      ok: false,
      reason: 'missing_campaign_media_files',
      expectedFlow: 'campaign avatar.png/banner.png -> Pinata/IPFS -> profiles.avatar_url/banner_url',
      selectedProfiles: targets.length,
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
      selectedProfiles: targets.length,
      mediaFilesReady: targets.length * 2,
      manifest: MANIFEST_PATH,
      migration: MIGRATION_PATH,
    }, null, 2));
    return;
  }

  if (!env.PINATA_JWT) {
    throw new Error('PINATA_JWT is required to pin profile media');
  }

  await fs.mkdir(AUDIT_DIR, { recursive: true });
  const existingManifest = args.overwriteManifest ? null : await loadExistingManifest();
  const manifest = {
    generatedAt: new Date().toISOString(),
    seedBatch: SEED_BATCH,
    sourceCampaignRoot: CAMPAIGN_ROOT,
    profiles: existingManifest?.profiles ? { ...existingManifest.profiles } : {},
  };

  const payload = [];
  for (const target of targets) {
    const current = manifest.profiles[target.profileId] || {};
    const avatar = mediaRecordFromManifest(existingManifest, target.profileId, 'avatar')
      || await uploadToPinata({
        pinataJwt: env.PINATA_JWT,
        filePath: target.avatarPath,
        profileId: target.profileId,
        walletAddress: target.walletAddress,
        kind: 'avatar',
      });
    await delay(args.delayMs);
    const banner = mediaRecordFromManifest(existingManifest, target.profileId, 'banner')
      || await uploadToPinata({
        pinataJwt: env.PINATA_JWT,
        filePath: target.bannerPath,
        profileId: target.profileId,
        walletAddress: target.walletAddress,
        kind: 'banner',
      });
    await delay(args.delayMs);

    manifest.profiles[target.profileId] = {
      ...current,
      walletAddress: target.walletAddress,
      avatar,
      banner,
    };
    payload.push({
      wallet_address: target.walletAddress,
      profile_id: target.profileId,
      avatar_url: avatar.url,
      avatar_ipfs_hash: avatar.ipfsHash,
      banner_url: banner.url,
      banner_ipfs_hash: banner.ipfsHash,
    });
    console.log(`${target.profileId} avatar=${avatar.ipfsHash} banner=${banner.ipfsHash}`);
  }

  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await fs.writeFile(MIGRATION_PATH, buildMigration(payload), 'utf8');
  console.log(JSON.stringify({
    ok: true,
    profiles: payload.length,
    pinnedFiles: payload.length * 2,
    manifest: MANIFEST_PATH,
    migration: MIGRATION_PATH,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
