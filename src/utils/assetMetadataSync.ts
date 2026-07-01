import {
  getDeterministicOwnedAssetDetailsById,
  getTestWalletMyAssets,
} from '@/utils/testWalletAssetFixtures';
import type { RuntimeMintedAssetRecord } from '@/utils/runtimeMintedAssets';
import {
  getLocalSupabaseId,
  isSupabaseRestEnabled,
  restSelect,
  setLocalSupabaseId,
  toQuery,
  encodeIn,
} from '@/utils/supabaseRest';
import { sendAssetMetadataSeedViaBridge } from '@/utils/supabaseAuthClaimBridge';
import { normalizeTaxonomySelection } from '@/utils/taxonomy';

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
  if (b === 'optimism' || b === 'optimism-sepolia' || b === 'op-sepolia') return n === 'testnet' || b.includes('sepolia') ? 11155420 : 10;
  if (b === 'polygon') return 137;
  if (b === 'arbitrum' || b === 'arbitrum-sepolia') return n === 'testnet' || b.includes('sepolia') ? 421614 : 42161;
  if (b === 'base' || b === 'base-sepolia') return n === 'testnet' || b.includes('sepolia') ? 84532 : 8453;
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

function inferNetworkFromChainId(chainId: number | null | undefined): 'mainnet' | 'testnet' | null {
  if (chainId === 97 || chainId === 11155111 || chainId === 11155420 || chainId === 84532 || chainId === 421614) return 'testnet';
  if (chainId === 56 || chainId === 1 || chainId === 10 || chainId === 137 || chainId === 42161 || chainId === 8453) return 'mainnet';
  return null;
}

function extractCurrencyFromPrice(value: string | null | undefined): string | null {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return parts[parts.length - 1]?.toUpperCase() || null;
}

function buildSeedItemFromRuntimeMintedRecord(
  record: RuntimeMintedAssetRecord,
  chainId?: number | null,
): AssetMetadataSeedItem | null {
  if (record.assetType !== 'RWA') return null;

  const assetUid = normalizeAssetUid(record.details.assetUid || record.id);
  const title = String(record.details.name || record.myAsset.name || '').trim();
  if (!assetUid || !title) return null;

  const galleryImages = uniqueStrings(record.details.images?.length ? record.details.images : [record.details.image]);
  const media = galleryImages.map((url, index) => ({
    mediaType: 'image' as const,
    url,
    sortOrder: index,
    metadata: index === 0 ? { role: 'cover' } : {},
  }));

  const normalizedTaxonomy = record.details.category
    ? normalizeTaxonomySelection(record.details.category, record.details.subcategory)
    : null;
  const normalizedCategory = normalizedTaxonomy?.categorySlug || null;
  const resolvedChainId = chainId ?? mapChainId(record.details.blockchain, undefined);
  const resolvedNetwork = inferNetworkFromChainId(resolvedChainId);
  const totalSlots = Number(record.myAsset.totalAmount || 0) || 0;
  const availableSlots = Number(record.myAsset.availableAmount || 0) || 0;
  const price = String(record.myAsset.minPrice || record.details.currentPrice || '').trim();
  const currency = extractCurrencyFromPrice(price);
  const mintedAt = record.details.mintDate ?? record.createdAt;

  const tags = uniqueStrings([
    normalizedCategory || '',
    String(record.details.blockchain || '').toLowerCase(),
    'runtime_minted',
    'rwa',
  ]).map((tag) => slugify(tag)).filter(Boolean);

  return {
    assetUid,
    title,
    slug: slugify(`${assetUid}-${title}`) || assetUid,
    category: normalizedCategory,
    subcategory: normalizedTaxonomy?.subcategorySlug || null,
    description: record.details.description || null,
    coverImageUrl: record.details.image || null,
    galleryImages,
    attributes: {
      ...propertiesToAttributes(record.details.properties),
      on_chain_unit_id: record.details.unitId || null,
      on_chain_total_amount: totalSlots || null,
      estimated_price: price ? { suggested: price, currency } : null,
    },
    metadata: {
      seed_source: 'runtime_minted_asset_bridge_v1',
      asset_namespace: 'runtime_minted',
      local_asset_id: record.id,
      onchain_asset_id: record.details.onchainAssetId || record.details.tokenId || record.id,
      name: title,
      description: record.details.description || null,
      image: record.details.image || null,
      images: galleryImages,
      seller: record.details.seller || {
        address: record.walletAddress,
        verified: false,
      },
      seller_wallet: record.walletAddress,
      price: price || null,
      priceUSD: record.details.currentPriceUsd || null,
      currency,
      availableSlots,
      totalSlots,
      minPurchaseSlots: totalSlots > 0 ? 1 : null,
      maxPurchaseSlots: totalSlots > 0 ? totalSlots : null,
      listedAt: mintedAt,
      expiresAt: null,
      listingDuration: null,
      views: record.details.views ?? 0,
      likes: record.details.favorites ?? 0,
      rank: null,
      verified: !!record.details.verified,
      featured: false,
      blockchain: record.details.blockchain || null,
      network: resolvedNetwork,
      listing_network: resolvedNetwork,
      listing_stats: null,
      configurableAttributes: record.details.configurableAttributes ?? null,
      deliverySnapshot: record.details.deliverySnapshot ?? null,
      assetLocationSnapshot: record.details.assetLocationSnapshot ?? null,
      tags,
      createdAt: mintedAt,
      updatedAt: record.createdAt,
      mintTxHash: record.txHash || null,
      mintedAt,
      unitId: record.details.unitId || null,
      unitName: record.details.unitName || null,
      unitLabel: record.details.unitLabel || null,
    },
    contractAddress: record.details.contractAddress || null,
    tokenId: record.details.onchainAssetId || record.details.tokenId || record.id,
    chainId: resolvedChainId,
    isActive: true,
    media,
    tags,
  };
}

function buildSeedItemFromAssetId(assetId: string): AssetMetadataSeedItem | null {
  const normalized = normalizeAssetUid(assetId);
  if (!normalized) return null;

  const details = getDeterministicOwnedAssetDetailsById(normalized);
  if (!details) return null;
  const galleryImages = uniqueStrings(details.images?.length ? details.images : [details.image]);
  const media = galleryImages.map((url, index) => ({
    mediaType: 'image' as const,
    url,
    sortOrder: index,
    metadata: index === 0 ? { role: 'cover' } : {},
  }));

  const namespace = isOwnedFixtureAssetId(normalized) ? 'owned_fixture' : 'owned_asset';
  const normalizedTaxonomy = details.category
    ? normalizeTaxonomySelection(details.category, details.subcategory)
    : null;
  const normalizedCategory = normalizedTaxonomy?.categorySlug || null;

  const tags = uniqueStrings([
    normalizedCategory || '',
    namespace,
    String(details.blockchain || '').toLowerCase(),
  ]).map((tag) => slugify(tag)).filter(Boolean);

  const title = details.name || normalized;
  const slug = slugify(`${normalized}-${title}`) || slugify(normalized) || normalized;
  const chainId = mapChainId(details.blockchain, isOwnedFixtureAssetId(normalized) ? 'testnet' : undefined);

  return {
    assetUid: normalized,
    title,
    slug,
    category: normalizedCategory,
    subcategory: normalizedTaxonomy?.subcategorySlug || null,
    description: details.description || null,
    coverImageUrl: details.image || null,
    galleryImages,
    attributes: propertiesToAttributes(details.properties),
    metadata: {
      seed_source: 'c2_asset_metadata_seed_bridge_v1',
      asset_namespace: namespace,
      local_asset_id: normalized,
      name: title,
      description: details.description || null,
      image: details.image || null,
      images: galleryImages,
      seller: details.seller || null,
      price: null,
      priceUSD: null,
      currency: null,
      availableSlots: null,
      totalSlots: null,
      minPurchaseSlots: null,
      maxPurchaseSlots: null,
      listedAt: null,
      expiresAt: null,
      listingDuration: null,
      views: details.views ?? null,
      likes: details.favorites ?? null,
      rank: null,
      verified: !!details.verified,
      featured: false,
      seller_wallet: details.seller?.address || null,
      blockchain: details.blockchain || null,
      network: isOwnedFixtureAssetId(normalized) ? 'testnet' : null,
      listing_network: null,
      listing_stats: null,
      configurableAttributes: null,
      deliverySnapshot: null,
      assetLocationSnapshot: null,
      tags,
      createdAt: details.mintDate || null,
      updatedAt: details.lastSale || details.mintDate || null,
    },
    contractAddress: details.contractAddress || null,
    tokenId: details.tokenId || null,
    chainId,
    // Owned fixture metadata must never leak into the public marketplace/search catalog.
    isActive: false,
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

export async function ensureAssetMetadataSeedForIds(
  assetIds: string[],
  walletAddress?: string | null,
): Promise<void> {
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

    const result = await sendAssetMetadataSeedViaBridge(seedItems, walletAddress);
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
  ];

  await ensureAssetMetadataSeedForIds(assetIds, walletAddress);
}

export async function syncRuntimeMintedAssetToMarketplace(
  record: RuntimeMintedAssetRecord,
  walletAddress?: string | null,
  chainId?: number | null,
): Promise<{ ok: boolean; assetId?: string | null }> {
  if (!isSupabaseRestEnabled()) return { ok: false, assetId: null };

  const seedItem = buildSeedItemFromRuntimeMintedRecord(record, chainId);
  if (!seedItem) return { ok: false, assetId: null };

  const result = await sendAssetMetadataSeedViaBridge([seedItem], walletAddress || record.walletAddress);
  if (!result?.ok) return { ok: false, assetId: null };

  const row = (result.rows || []).find((entry) => normalizeAssetUid(entry.assetUid) === normalizeAssetUid(seedItem.assetUid)) || null;
  if (row?.assetId) {
    setLocalSupabaseId('asset', normalizeAssetUid(seedItem.assetUid), row.assetId);
    setLocalSupabaseId('asset_rev', row.assetId, normalizeAssetUid(seedItem.assetUid));
  }

  dispatchAssetMetadataChangedEvent();
  return { ok: true, assetId: row?.assetId ?? null };
}

export async function syncRuntimeMintedAssetsToMarketplace(
  records: RuntimeMintedAssetRecord[],
  walletAddress?: string | null,
  chainId?: number | null,
): Promise<{ ok: boolean; count: number }> {
  if (!isSupabaseRestEnabled() || !records.length) return { ok: false, count: 0 };

  const seedItems = records
    .map((record) => buildSeedItemFromRuntimeMintedRecord(record, chainId))
    .filter(Boolean) as AssetMetadataSeedItem[];

  if (!seedItems.length) return { ok: false, count: 0 };

  const dedupedSeedItems = Array.from(
    new Map(seedItems.map((item) => [normalizeAssetUid(item.assetUid), item] as const)).values(),
  );

  const result = await sendAssetMetadataSeedViaBridge(dedupedSeedItems, walletAddress);
  if (!result?.ok) return { ok: false, count: 0 };

  for (const row of result.rows || []) {
    const uid = normalizeAssetUid(row.assetUid);
    if (!uid || !row.assetId) continue;
    setLocalSupabaseId('asset', uid, row.assetId);
    setLocalSupabaseId('asset_rev', row.assetId, uid);
  }

  dispatchAssetMetadataChangedEvent();
  return { ok: true, count: dedupedSeedItems.length };
}
