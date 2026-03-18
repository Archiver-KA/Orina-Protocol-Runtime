import type { MarketplaceAsset } from '@/app/types/asset';
import { ASSET_METADATA_CHANGED_EVENT } from '@/utils/assetMetadataSync';
import { dispatchSyncEvent, isSupabaseRestEnabled, restSelect, toQuery } from '@/utils/supabaseRest';
import {
  MOCK_MARKETPLACE_ASSETS,
  getAllBlockchains as getMockMarketplaceBlockchains,
  getAllCategories as getMockMarketplaceCategories,
  getMarketplaceStatistics as getMockMarketplaceStatistics,
} from '@/utils/mockMarketplaceData';

export const MARKETPLACE_CATALOG_SYNC_EVENT = 'orina:marketplace-catalog-changed';
const MARKETPLACE_CATALOG_CACHE_KEY = 'orina_marketplace_catalog_cache_v1';

type AssetCatalogRemoteRow = {
  id: string;
  asset_uid: string;
  title: string | null;
  category: string | null;
  description: string | null;
  cover_image_url: string | null;
  gallery_images: unknown;
  attributes: unknown;
  metadata: Record<string, unknown> | null;
  contract_address: string | null;
  token_id: string | null;
  chain_id: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type MarketplaceCatalogStats = {
  totalAssets: number;
  totalVolume: string;
  floorPrice: string;
  averagePrice: string;
};

function loadCatalogCacheFromStorage(): MarketplaceAsset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MARKETPLACE_CATALOG_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MarketplaceAsset[]) : [];
  } catch {
    return [];
  }
}

function saveCatalogCacheToStorage(assets: MarketplaceAsset[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MARKETPLACE_CATALOG_CACHE_KEY, JSON.stringify(assets));
  } catch {
    // best-effort cache only
  }
}

function getMockFallbackCatalog(): MarketplaceAsset[] {
  return [...MOCK_MARKETPLACE_ASSETS];
}

let cachedAssets: MarketplaceAsset[] = (() => {
  const stored = loadCatalogCacheFromStorage();
  if (stored.length > 0) return stored;
  return isSupabaseRestEnabled() ? [] : getMockFallbackCatalog();
})();
let hydratePromise: Promise<MarketplaceAsset[]> | null = null;

function normalizeAssetUid(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || '').trim()).filter(Boolean);
}

function asNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function coalesceString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return undefined;
}

function mapRemoteRowToMarketplaceAsset(
  row: AssetCatalogRemoteRow,
  fallback?: MarketplaceAsset
): MarketplaceAsset | null {
  const metadata = asRecord(row.metadata) ?? {};
  const metadataSeller = asRecord(metadata.seller);
  const assetUid = normalizeAssetUid(row.asset_uid || fallback?.id);
  if (!assetUid && !fallback) return null;

  const image =
    coalesceString(
      row.cover_image_url,
      metadata.image,
      ...asStringArray(row.gallery_images),
      ...asStringArray(metadata.images),
      fallback?.image
    ) || '';

  if (!image) return fallback || null;

  return {
    ...(fallback || {}),
    id: assetUid || fallback?.id || row.id,
    tokenId: coalesceString(row.token_id, metadata.tokenId, fallback?.tokenId) || '',
    contractAddress:
      coalesceString(row.contract_address, metadata.contractAddress, fallback?.contractAddress) || '',
    name: coalesceString(row.title, metadata.name, fallback?.name) || assetUid || 'Untitled Asset',
    category: coalesceString(row.category, metadata.category, fallback?.category) || 'Uncategorized',
    description: coalesceString(row.description, metadata.description, fallback?.description),
    image,
    images: Array.from(
      new Set([
        image,
        ...asStringArray(row.gallery_images),
        ...asStringArray(metadata.images),
        ...(fallback?.images || []),
      ].filter(Boolean))
    ),
    seller: {
      address:
        coalesceString(metadataSeller?.address, metadata.seller_wallet, fallback?.seller?.address) || '',
      ensName: coalesceString(metadataSeller?.ensName, fallback?.seller?.ensName),
      verified: asBoolean(metadataSeller?.verified, fallback?.seller?.verified ?? false),
      reputation: Math.max(
        0,
        Math.min(100, asNumber(metadataSeller?.reputation) ?? fallback?.seller?.reputation ?? 0)
      ),
    },
    price: coalesceString(metadata.price, fallback?.price) || '0 ETH',
    priceUSD: coalesceString(metadata.priceUSD, fallback?.priceUSD),
    currency: coalesceString(metadata.currency, fallback?.currency) || 'ETH',
    availableSlots: asNumber(metadata.availableSlots) ?? fallback?.availableSlots ?? 0,
    totalSlots: asNumber(metadata.totalSlots) ?? fallback?.totalSlots ?? 0,
    minPurchaseSlots: asNumber(metadata.minPurchaseSlots) ?? fallback?.minPurchaseSlots,
    maxPurchaseSlots: asNumber(metadata.maxPurchaseSlots) ?? fallback?.maxPurchaseSlots,
    listedAt:
      coalesceString(metadata.listedAt, fallback?.listedAt) || new Date().toISOString(),
    expiresAt: coalesceString(metadata.expiresAt, fallback?.expiresAt),
    listingDuration: coalesceString(metadata.listingDuration, fallback?.listingDuration),
    views: asNumber(metadata.views) ?? asNumber(asRecord(metadata.listing_stats)?.views) ?? fallback?.views ?? 0,
    likes: asNumber(metadata.likes) ?? asNumber(asRecord(metadata.listing_stats)?.likes) ?? fallback?.likes ?? 0,
    rank: asNumber(metadata.rank) ?? asNumber(asRecord(metadata.listing_stats)?.rank) ?? fallback?.rank,
    verified: asBoolean(metadata.verified, fallback?.verified ?? false),
    featured: asBoolean(metadata.featured, fallback?.featured ?? false),
    blockchain: coalesceString(metadata.blockchain, fallback?.blockchain) || 'Ethereum',
    network: coalesceString(metadata.network, metadata.listing_network, fallback?.network) || 'Mainnet',
    tags: Array.from(new Set([...(fallback?.tags || []), ...asStringArray(metadata.tags)])),
    createdAt: coalesceString(metadata.createdAt, row.created_at, fallback?.createdAt),
    updatedAt: coalesceString(metadata.updatedAt, row.updated_at, fallback?.updatedAt),
    assetLocationSnapshot:
      (asRecord(metadata.assetLocationSnapshot) as MarketplaceAsset['assetLocationSnapshot']) ??
      fallback?.assetLocationSnapshot,
    deliverySnapshot:
      (asRecord(metadata.deliverySnapshot) as MarketplaceAsset['deliverySnapshot']) ??
      fallback?.deliverySnapshot,
    configurableAttributes:
      (Array.isArray(metadata.configurableAttributes)
        ? (metadata.configurableAttributes as MarketplaceAsset['configurableAttributes'])
        : fallback?.configurableAttributes),
  };
}

function buildCatalogFromRemoteRows(rows: AssetCatalogRemoteRow[]): MarketplaceAsset[] {
  return rows
    // Public marketplace/search catalog only shows assets whose projection is explicitly active.
    .filter((row) => row.is_active === true)
    .map((row) => mapRemoteRowToMarketplaceAsset(row))
    .filter((asset): asset is MarketplaceAsset => Boolean(asset));
}

function updateCache(nextAssets: MarketplaceAsset[]): MarketplaceAsset[] {
  cachedAssets = nextAssets;
  saveCatalogCacheToStorage(nextAssets);
  dispatchSyncEvent(MARKETPLACE_CATALOG_SYNC_EVENT);
  return cachedAssets;
}

export function loadMarketplaceCatalogSync(): MarketplaceAsset[] {
  if (cachedAssets.length > 0) return cachedAssets;
  return isSupabaseRestEnabled() ? [] : getMockFallbackCatalog();
}

export async function hydrateMarketplaceCatalogFromSupabase(): Promise<MarketplaceAsset[]> {
  if (!isSupabaseRestEnabled()) {
    return updateCache(getMockFallbackCatalog());
  }

  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const rows = await restSelect<AssetCatalogRemoteRow>(
        'assets_catalog',
        toQuery({
          select:
            'id,asset_uid,title,category,description,cover_image_url,gallery_images,attributes,metadata,contract_address,token_id,chain_id,is_active,created_at,updated_at',
          order: 'updated_at.desc',
        })
      );
      const remoteCatalog = buildCatalogFromRemoteRows(rows);
      if (remoteCatalog.length > 0) {
        return updateCache(remoteCatalog);
      }

      // Transitional fallback only: when remote catalog is empty/unavailable, keep the UI operable
      // with cached or bundled data until the authoritative projection is populated.
      if (cachedAssets.length > 0) {
        return cachedAssets;
      }

      return updateCache(getMockFallbackCatalog());
    } catch (error) {
      console.debug('[MarketplaceCatalog] Remote hydrate skipped:', error);
      if (cachedAssets.length > 0) return cachedAssets;
      return updateCache(getMockFallbackCatalog());
    } finally {
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

export function getMarketplaceCatalogAssetById(
  assetId: string,
  assets: MarketplaceAsset[] = cachedAssets
): MarketplaceAsset | undefined {
  const targetId = normalizeAssetUid(assetId);
  return assets.find((asset) => normalizeAssetUid(asset.id) === targetId);
}

export function getMarketplaceCatalogStatistics(
  assets: MarketplaceAsset[] = cachedAssets
): MarketplaceCatalogStats {
  if (!assets.length) {
    return getMockMarketplaceStatistics();
  }

  const totalAssets = assets.length;
  const numericPrices = assets
    .map((asset) => parseFloat(String(asset.price).replace(/[^\d.]/g, '')))
    .filter((price) => Number.isFinite(price) && price > 0);
  const totalVolume = numericPrices.reduce((sum, price) => sum + price, 0);
  const floorPrice = numericPrices.length ? Math.min(...numericPrices) : 0;
  const averagePrice = numericPrices.length ? totalVolume / numericPrices.length : 0;

  return {
    totalAssets,
    totalVolume: `${totalVolume.toFixed(2)} ETH`,
    floorPrice: `${floorPrice.toFixed(2)} ETH`,
    averagePrice: `${averagePrice.toFixed(2)} ETH`,
  };
}

export function getMarketplaceCatalogCategories(
  assets: MarketplaceAsset[] = cachedAssets
): string[] {
  if (!assets.length) return getMockMarketplaceCategories();
  return Array.from(new Set(assets.map((asset) => asset.category).filter(Boolean))).sort();
}

export function getMarketplaceCatalogBlockchains(
  assets: MarketplaceAsset[] = cachedAssets
): string[] {
  if (!assets.length) return getMockMarketplaceBlockchains();
  return Array.from(new Set(assets.map((asset) => asset.blockchain).filter(Boolean))).sort();
}

if (typeof window !== 'undefined') {
  window.addEventListener(ASSET_METADATA_CHANGED_EVENT, () => {
    void hydrateMarketplaceCatalogFromSupabase();
  });
}
