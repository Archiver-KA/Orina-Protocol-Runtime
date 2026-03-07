import { getMarketplaceAssetById } from '@/utils/mockMarketplaceData';
import { generateMockAsset } from '@/utils/mockAssetData';
import { getTestWalletMyAssets } from '@/utils/testWalletAssetFixtures';
import {
  getLocalSupabaseId,
  isSupabaseRestEnabled,
  restSelect,
  setLocalSupabaseId,
  toQuery,
  encodeIn,
} from '@/utils/supabaseRest';
import { sendAssetMetadataSeedViaBridge } from '@/utils/supabaseAuthClaimBridge';

type AssetCatalogRow = {
  id: string;
  asset_uid: string;
};

type AssetMetadataSeedItem = {
  assetUid: string;
  title: string;
  slug: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  coverImageUrl: string | null;
  galleryImages: string[];
  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  contractAddress: string | null;
  tokenId: string | null;
  chainId: number | null;
  isActive: boolean;
  media: Array<{
    mediaType: 'image' | 'video' | 'document';
    url: string;
    sortOrder: number;
    metadata?: Record<string, unknown>;
  }>;
  tags: string[];
};

export const ASSET_METADATA_CHANGED_EVENT = 'orina:asset-metadata-changed';

const inFlightSeeds = new Map<string, Promise<void>>();

function normalizeAssetUid(assetId: string): string {
  return String(assetId || '').trim().toLowerCase();
}

function isListingAssetId(assetId: string): boolean {
  return /^asset-\d{3}$/i.test(assetId);
}

function isOwnedFixtureAssetId(assetId: string): boolean {
  return /^twf-[a-z0-9-]+$/i.test(assetId);
}

function slugify(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((v) => String(v || '').trim()).filter(Boolean))
  );
}

function mapChainId(blockchain?: string, network?: string): number | null {
  const b = String(blockchain || '').toLowerCase();
  const n = String(network || '').toLowerCase();

  if (b === 'bsc') return n === 'testnet' ? 97 : 56;
  if (b === 'ethereum') return n === 'testnet' ? 11155111 : 1;
  if (b === 'polygon') return 137;
  if (b === 'arbitrum') return 42161;
  if (b === 'base') return 8453;
  return null;
}

function propertiesToAttributes(
  properties: Array<{ trait_type: string; value: string | number }> | undefined
): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  for (const prop of properties || []) {
    if (!prop?.trait_type) continue;
    attrs[prop.trait_type] = prop.value;
  }
  return attrs;
}

function buildSeedItemFromAssetId(assetId: string): AssetMetadataSeedItem | null {
  const normalized = normalizeAssetUid(assetId);
  if (!normalized) return null;

  const listing = getMarketplaceAssetById(normalized);
  const details = generateMockAsset(normalized);
  const galleryImages = uniqueStrings(details.images?.length ? details.images : [details.image]);
  const media = galleryImages.map((url, index) => ({
    mediaType: 'image' as const,
    url,
    sortOrder: index,
    metadata: index === 0 ? { role: 'cover' } : {},
  }));

  const namespace = isOwnedFixtureAssetId(normalized)
    ? 'owned_fixture'
    : isListingAssetId(normalized)
      ? 'marketplace_listing'
      : 'generic_mock';

  const tags = uniqueStrings([
    ...(listing?.tags || []),
    String(details.category || '').toLowerCase(),
    namespace,
    String(details.blockchain || '').toLowerCase(),
  ]).map((tag) => slugify(tag)).filter(Boolean);

  const title = details.name || listing?.name || normalized;
  const slug = slugify(`${normalized}-${title}`) || slugify(normalized) || normalized;
  const chainId = listing
    ? mapChainId(listing.blockchain, listing.network)
    : mapChainId(details.blockchain, isOwnedFixtureAssetId(normalized) ? 'testnet' : undefined);

  return {
    assetUid: normalized,
    title,
    slug,
    category: details.category || listing?.category || null,
    subcategory: null,
    description: details.description || listing?.description || null,
    coverImageUrl: details.image || listing?.image || null,
    galleryImages,
    attributes: propertiesToAttributes(details.properties),
    metadata: {
      seed_source: 'c2_asset_metadata_seed_bridge_v1',
      asset_namespace: namespace,
      local_asset_id: normalized,
      verified: !!details.verified,
      seller_wallet: listing?.seller?.address || details.seller?.address || null,
      listing_network: listing?.network || null,
      listing_stats: listing ? { views: listing.views, likes: listing.likes, rank: listing.rank ?? null } : null,
    },
    contractAddress: details.contractAddress || listing?.contractAddress || null,
    tokenId: details.tokenId || listing?.tokenId || null,
    chainId,
    // Critical separation invariant:
    // - marketplace/search/favorites assets (asset-*) are active listings
    // - My Assets fixture rows (twf-*) are owned metadata, not public listings
    isActive: isListingAssetId(normalized),
    media,
    tags,
  };
}

function dispatchAssetMetadataChangedEvent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(ASSET_METADATA_CHANGED_EVENT));
  } catch (error) {
    console.debug('[AssetMetadataSync] Event dispatch skipped:', error);
  }
}

async function resolveExistingCatalogRows(assetUids: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(assetUids.map(normalizeAssetUid).filter(Boolean)));
  if (!unique.length || !isSupabaseRestEnabled()) return {};

  const known: Record<string, string> = {};
  const missing: string[] = [];

  for (const uid of unique) {
    const cachedId = getLocalSupabaseId('asset', uid);
    if (cachedId) {
      known[uid] = cachedId;
    } else {
      missing.push(uid);
    }
  }

  if (!missing.length) return known;

  try {
    const rows = await restSelect<AssetCatalogRow>(
      'assets_catalog',
      toQuery({ select: 'id,asset_uid', asset_uid: encodeIn(missing) })
    );
    for (const row of rows) {
      const uid = normalizeAssetUid(row.asset_uid);
      known[uid] = row.id;
      setLocalSupabaseId('asset', uid, row.id);
      setLocalSupabaseId('asset_rev', row.id, uid);
    }
  } catch (error) {
    console.debug('[AssetMetadataSync] Existing catalog lookup skipped:', error);
  }

  return known;
}

export async function ensureAssetMetadataSeedForIds(assetIds: string[]): Promise<void> {
  if (!isSupabaseRestEnabled()) return;

  const normalizedIds = Array.from(new Set(assetIds.map(normalizeAssetUid).filter(Boolean)));
  if (!normalizedIds.length) return;

  const key = normalizedIds.slice().sort().join('|');
  const existingInFlight = inFlightSeeds.get(key);
  if (existingInFlight) return existingInFlight;

  const job = (async () => {
    const existing = await resolveExistingCatalogRows(normalizedIds);
    const unresolved = normalizedIds.filter((uid) => !existing[uid]);
    if (!unresolved.length) return;

    const seedItems = unresolved
      .map(buildSeedItemFromAssetId)
      .filter(Boolean) as AssetMetadataSeedItem[];
    if (!seedItems.length) return;

    const result = await sendAssetMetadataSeedViaBridge(seedItems);
    if (!result?.ok) return;

    let updatedRows = 0;
    for (const row of result.rows || []) {
      const uid = normalizeAssetUid(row.assetUid);
      if (!uid || !row.assetId) continue;
      setLocalSupabaseId('asset', uid, row.assetId);
      setLocalSupabaseId('asset_rev', row.assetId, uid);
      updatedRows += 1;
    }

    if (updatedRows > 0) {
      dispatchAssetMetadataChangedEvent();
    }
  })()
    .catch((error) => {
      console.debug('[AssetMetadataSync] Seed via bridge skipped:', error);
    })
    .finally(() => {
      inFlightSeeds.delete(key);
    });

  inFlightSeeds.set(key, job);
  return job;
}

export async function ensureAssetMetadataSeedForWalletFixtures(walletAddress?: string | null): Promise<void> {
  const fixture = getTestWalletMyAssets(walletAddress);
  if (!fixture) return;

  const assetIds = [
    ...fixture.rwaAssets.map((a) => a.id),
    ...fixture.receiptAssets.map((a) => a.id),
    ...fixture.nftAssets.map((a) => a.id),
    ...fixture.favoriteListingAssetIds,
    ...fixture.watchlistListingAssetIds,
  ];

  await ensureAssetMetadataSeedForIds(assetIds);
}
