import type { MarketplaceAsset } from '@/app/types/asset';
import { ASSET_METADATA_CHANGED_EVENT } from '@/utils/assetMetadataSync';
import {
  getMarketplaceAssetChainInfo,
  getMarketplaceAssetNetworkFilterOption,
  type MarketplaceNetworkFilterOption,
} from '@/utils/marketplaceNetwork';
import {
  dispatchSyncEvent,
  encodeIn,
  isSupabaseRestEnabled,
  restPublicRpc,
  restSelect,
  toQuery,
} from '@/utils/supabaseRest';
import {
  getCategoryDisplayLabel,
  getCategoryOptionsFromValues,
  getSubcategoryDisplayLabel,
  normalizeCategoryFilterValue,
} from '@/utils/taxonomy';
import { normalizeMarketplaceLocationSnapshot } from '@/utils/marketplaceLocation';

export const MARKETPLACE_CATALOG_SYNC_EVENT = 'orina:marketplace-catalog-changed';
const MARKETPLACE_LOCAL_VIEW_COUNTS_KEY = 'orina:marketplace-local-view-counts';
const MARKETPLACE_LOCAL_LIKE_DELTAS_KEY = 'orina:marketplace-local-like-deltas';
const MARKETPLACE_VIEWER_KEY = 'orina:marketplace-viewer-key';
// REMOVED: localStorage cache — data served from in-memory cache + Supabase hydration only
// const MARKETPLACE_CATALOG_CACHE_KEY = 'orina_marketplace_catalog_cache_v2';

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
  seller_user_id: string | null;
  contract_address: string | null;
  token_id: string | null;
  chain_id: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type AssetCatalogPageRpcRow = AssetCatalogRemoteRow & {
  page_has_more?: boolean | null;
};

type AssetCatalogSellerProfileRow = {
  id: string;
  wallet_address: string | null;
  display_name: string | null;
  username: string | null;
  is_verified: boolean | null;
  status: string | null;
};

type AssetListingStatsRow = {
  asset_uid: string;
  views: number | null;
  likes: number | null;
  counted?: boolean | null;
};

type AssetProtocolLinkRow = {
  asset_id: string;
  chain_id: number | null;
  contract_address: string | null;
  token_id: string | null;
  link_type: string | null;
};

type ProtocolAssetAvailabilityRow = {
  chain_id: number | null;
  asset_contract: string | null;
  token_id: string | null;
  available_amount: number | string | null;
  total_amount: number | string | null;
  metadata: Record<string, unknown> | null;
};

type ProtocolOrderAvailabilityRow = {
  chain_id: number | null;
  marketplace_contract: string | null;
  asset_contract: string | null;
  asset_token_id: string | null;
  status: string | null;
  amount: number | string | null;
  metadata: Record<string, unknown> | null;
};

type MarketplaceCatalogStats = {
  totalAssets: number;
  totalVolume: string;
  floorPrice: string;
  averagePrice: string;
};

function loadCatalogCacheFromStorage(): MarketplaceAsset[] {
  // localStorage cache removed — always start empty, hydrate from Supabase
  return [];
}

function saveCatalogCacheToStorage(_assets: MarketplaceAsset[]): void {
  // localStorage cache removed — no-op
}

let cachedAssets: MarketplaceAsset[] = (() => {
  const stored = loadCatalogCacheFromStorage();
  if (stored.length > 0) return stored;
  return [];
})();
let hydratePromise: Promise<MarketplaceAsset[]> | null = null;
const MARKETPLACE_REST_IN_CHUNK_SIZE = 120;

type MarketplaceCatalogHydrateOptions = {
  force?: boolean;
  limit?: number;
};

export type MarketplaceCatalogPageCursor = {
  updatedAt: string;
  id: string;
};

export type MarketplaceCatalogPageOptions = {
  limit?: number;
  cursor?: MarketplaceCatalogPageCursor | null;
  searchQuery?: string;
  category?: string;
  blockchain?: string;
  chainId?: number | null;
  verifiedOnly?: boolean;
};

export type MarketplaceCatalogPageResult = {
  assets: MarketplaceAsset[];
  nextCursor: MarketplaceCatalogPageCursor | null;
  hasMore: boolean;
};

const MARKETPLACE_CATALOG_SELECT =
  'id,asset_uid,title,category,description,cover_image_url,gallery_images,attributes,metadata,seller_user_id,contract_address,token_id,chain_id,is_active,created_at,updated_at';
const MARKETPLACE_CATALOG_DEFAULT_PAGE_LIMIT = 48;
const MARKETPLACE_CATALOG_MAX_PAGE_LIMIT = 96;

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

function normalizeHydrateLimit(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.max(1, Math.floor(parsed));
}

function normalizeCatalogPageLimit(value: unknown): number {
  const parsed = normalizeHydrateLimit(value);
  if (!parsed) return MARKETPLACE_CATALOG_DEFAULT_PAGE_LIMIT;
  return Math.min(parsed, MARKETPLACE_CATALOG_MAX_PAGE_LIMIT);
}

function encodePostgrestFilterValue(value: string | number | boolean): string {
  return encodeURIComponent(String(value));
}

function normalizeCatalogSearchTerm(value?: string | null): string {
  return String(value || '')
    .replace(/[*,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 96);
}

function normalizeCatalogCursorUpdatedAt(value?: string | number | null): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  const rawValue = String(value || '').trim();
  if (!rawValue) return '';
  const parsed = Date.parse(rawValue);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : rawValue;
}

function buildMarketplaceCatalogPageQuery(options: MarketplaceCatalogPageOptions, requestLimit: number): string {
  const params: Record<string, string | undefined> = {
    select: MARKETPLACE_CATALOG_SELECT,
    is_active: 'eq.true',
    order: 'updated_at.desc,id.desc',
    limit: String(requestLimit),
  };
  const logicalClauses: string[] = [];
  const category = String(options.category || '').trim();
  const blockchain = String(options.blockchain || '').trim();
  const chainId = typeof options.chainId === 'number' && Number.isFinite(options.chainId)
    ? Math.floor(options.chainId)
    : null;
  const searchTerm = normalizeCatalogSearchTerm(options.searchQuery);
  const cursorUpdatedAt = normalizeCatalogCursorUpdatedAt(options.cursor?.updatedAt);
  const cursorId = String(options.cursor?.id || '').trim();

  if (category && category !== 'all') {
    params.category = `eq.${encodePostgrestFilterValue(category)}`;
  }

  if (chainId !== null) {
    params.chain_id = `eq.${chainId}`;
  } else if (blockchain && blockchain !== 'all') {
    params['metadata->>blockchain'] = `ilike.${encodePostgrestFilterValue(blockchain)}`;
  }

  if (options.verifiedOnly) {
    params['metadata->>verified'] = 'eq.true';
  }

  if (cursorUpdatedAt && cursorId) {
    logicalClauses.push(
      `or(updated_at.lt.${encodePostgrestFilterValue(cursorUpdatedAt)},and(updated_at.eq.${encodePostgrestFilterValue(cursorUpdatedAt)},id.lt.${encodePostgrestFilterValue(cursorId)}))`,
    );
  }

  if (searchTerm) {
    const encodedTerm = encodePostgrestFilterValue(searchTerm);
    logicalClauses.push(
      `or(title.ilike.*${encodedTerm}*,description.ilike.*${encodedTerm}*,category.ilike.*${encodedTerm}*)`,
    );
  }

  if (logicalClauses.length === 1) {
    const clause = logicalClauses[0];
    params[clause.startsWith('or(') ? 'or' : 'and'] = clause.replace(/^(or|and)\((.*)\)$/, '($2)');
  } else if (logicalClauses.length > 1) {
    params.and = `(${logicalClauses.join(',')})`;
  }

  return toQuery(params);
}

async function fetchMarketplaceCatalogPageRowsViaRpc(
  options: MarketplaceCatalogPageOptions,
  limit: number,
): Promise<AssetCatalogPageRpcRow[] | null> {
  try {
    return await restPublicRpc<AssetCatalogPageRpcRow[]>(
      'get_marketplace_catalog_page_v1',
      {
        p_limit: limit,
        p_cursor_updated_at: options.cursor?.updatedAt || null,
        p_cursor_id: options.cursor?.id || null,
        p_search_query: normalizeCatalogSearchTerm(options.searchQuery) || null,
        p_category: options.category && options.category !== 'all' ? options.category : null,
        p_chain_id: typeof options.chainId === 'number' && Number.isFinite(options.chainId)
          ? Math.floor(options.chainId)
          : null,
        p_blockchain: options.blockchain && options.blockchain !== 'all' ? options.blockchain : null,
        p_verified_only: Boolean(options.verifiedOnly),
      },
    );
  } catch (error) {
    console.debug('[MarketplaceCatalog] Indexed catalog RPC unavailable, falling back to REST page:', error);
    return null;
  }
}

function uniqueNormalizedValues(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function chunkArray<T>(values: T[], chunkSize = MARKETPLACE_REST_IN_CHUNK_SIZE): T[][] {
  if (values.length === 0) return [];
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asRoundedCount(value: unknown): number | null {
  const parsed = asNumber(value);
  return parsed === null ? null : Math.max(0, Math.round(parsed));
}

function asTimestamp(...values: Array<unknown>): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;

    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function coalesceString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return undefined;
}

function normalizeContractAddress(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function buildProtocolAssetProjectionKey(
  chainId: number | null | undefined,
  contractAddress: unknown,
  tokenId: unknown,
): string {
  const normalizedTokenId = normalizeAssetUid(tokenId ? String(tokenId) : '');
  if (!normalizedTokenId) return '';

  const normalizedChainId = Number.isFinite(Number(chainId)) ? String(Number(chainId)) : '';
  const normalizedContract = normalizeContractAddress(contractAddress);
  return `${normalizedChainId}:${normalizedContract}:${normalizedTokenId}`;
}

function buildProtocolAssetFallbackKeys(
  chainId: number | null | undefined,
  contractAddress: unknown,
  tokenId: unknown,
): string[] {
  return Array.from(
    new Set(
      [
        buildProtocolAssetProjectionKey(chainId, '', tokenId),
        buildProtocolAssetProjectionKey(null, contractAddress, tokenId),
        buildProtocolAssetProjectionKey(null, '', tokenId),
      ].filter(Boolean),
    ),
  );
}

function buildProtocolAssetResolutionKeys(
  chainId: number | null | undefined,
  contractAddress: unknown,
  tokenId: unknown,
): string[] {
  return Array.from(
    new Set(
      [
        buildProtocolAssetProjectionKey(chainId, contractAddress, tokenId),
        ...buildProtocolAssetFallbackKeys(chainId, contractAddress, tokenId),
      ].filter(Boolean),
    ),
  );
}

function normalizeProtocolOrderStatus(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function shouldReserveProtocolOrderAmount(status: unknown): boolean {
  const normalized = normalizeProtocolOrderStatus(status);
  if (!normalized) return false;

  if (
    normalized.includes('cancel')
    || normalized.includes('fail')
    || normalized.includes('reject')
    || normalized.includes('expire')
    || normalized.includes('revert')
  ) {
    return false;
  }

  return true;
}

function getCatalogProtocolProjection(row: AssetCatalogRemoteRow, protocolLink?: AssetProtocolLinkRow | null) {
  const metadata = asRecord(row.metadata) ?? {};
  const attributes = asRecord(row.attributes) ?? {};

  return {
    chainId:
      protocolLink?.chain_id
      ?? row.chain_id
      ?? asNumber(metadata.chainId)
      ?? asNumber(metadata.chain_id),
    contractAddress: coalesceString(
      protocolLink?.contract_address,
      row.contract_address,
      metadata.contractAddress,
      metadata.assetContract,
    ),
    tokenId: coalesceString(
      protocolLink?.token_id,
      row.token_id,
      metadata.tokenId,
      metadata.onchainAssetId,
      attributes.on_chain_asset_id,
    ),
  };
}

function resolveProtocolAssetAvailability(
  projection: ReturnType<typeof getCatalogProtocolProjection>,
  protocolAvailabilityByProjectionKey?: Map<string, ProtocolAssetAvailabilityRow>,
): ProtocolAssetAvailabilityRow | null {
  if (!protocolAvailabilityByProjectionKey) return null;

  for (const key of buildProtocolAssetResolutionKeys(
    projection.chainId,
    projection.contractAddress,
    projection.tokenId,
  )) {
    const match = protocolAvailabilityByProjectionKey.get(key);
    if (match) return match;
  }

  return null;
}

function resolveProtocolReservedAmount(
  projection: ReturnType<typeof getCatalogProtocolProjection>,
  reservedAmountsByProjectionKey?: Map<string, number>,
): number | null {
  if (!reservedAmountsByProjectionKey) return null;

  for (const key of buildProtocolAssetResolutionKeys(
    projection.chainId,
    projection.contractAddress,
    projection.tokenId,
  )) {
    const match = reservedAmountsByProjectionKey.get(key);
    if (typeof match === 'number' && Number.isFinite(match)) {
      return match;
    }
  }

  return null;
}

function readLocalStatMap(storageKey: string): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<Record<string, number>>((acc, [key, value]) => {
      const normalizedKey = normalizeAssetUid(key);
      const roundedValue = asRoundedCount(value);
      if (normalizedKey && roundedValue !== null && roundedValue > 0) {
        acc[normalizedKey] = roundedValue;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function writeLocalStatMap(storageKey: string, values: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = Object.entries(values).reduce<Record<string, number>>((acc, [key, value]) => {
      const normalizedKey = normalizeAssetUid(key);
      const roundedValue = asRoundedCount(value);
      if (normalizedKey && roundedValue !== null && roundedValue > 0) {
        acc[normalizedKey] = roundedValue;
      }
      return acc;
    }, {});

    if (Object.keys(normalized).length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(normalized));
  } catch {
    // Ignore storage failures.
  }
}

function readLocalStatValue(storageKey: string, assetId: string): number {
  const normalizedId = normalizeAssetUid(assetId);
  if (!normalizedId) return 0;
  return readLocalStatMap(storageKey)[normalizedId] || 0;
}

function adjustLocalStatValue(storageKey: string, assetId: string, delta: number): number {
  const normalizedId = normalizeAssetUid(assetId);
  if (!normalizedId || !Number.isFinite(delta) || delta === 0) {
    return readLocalStatValue(storageKey, assetId);
  }

  const nextMap = readLocalStatMap(storageKey);
  const nextValue = Math.max(0, (nextMap[normalizedId] || 0) + Math.trunc(delta));
  if (nextValue > 0) {
    nextMap[normalizedId] = nextValue;
  } else {
    delete nextMap[normalizedId];
  }

  writeLocalStatMap(storageKey, nextMap);
  return nextValue;
}

function clearLocalStatValue(storageKey: string, assetId: string): void {
  const normalizedId = normalizeAssetUid(assetId);
  if (!normalizedId) return;

  const nextMap = readLocalStatMap(storageKey);
  if (!(normalizedId in nextMap)) return;
  delete nextMap[normalizedId];
  writeLocalStatMap(storageKey, nextMap);
}

function getMarketplaceViewerKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = window.localStorage.getItem(MARKETPLACE_VIEWER_KEY);
    if (existing) return existing;

    const nextValue = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `viewer_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(MARKETPLACE_VIEWER_KEY, nextValue);
    return nextValue;
  } catch {
    return null;
  }
}

function isMatchingMarketplaceAssetId(asset: MarketplaceAsset, targetId: string): boolean {
  return (
    normalizeAssetUid(asset.id) === targetId ||
    normalizeAssetUid(asset.assetUid) === targetId ||
    normalizeAssetUid(asset.onchainAssetId) === targetId ||
    normalizeAssetUid(asset.tokenId) === targetId
  );
}

async function fetchCanonicalListingStats(assetIds: string[]): Promise<Map<string, AssetListingStatsRow>> {
  const uniqueIds = Array.from(new Set(assetIds.map(normalizeAssetUid).filter(Boolean)));
  if (uniqueIds.length === 0 || !isSupabaseRestEnabled()) {
    return new Map();
  }

  try {
    const rowGroups = await Promise.all(
      chunkArray(uniqueIds).map(async (assetUidChunk) => {
        try {
          const rows = await restPublicRpc<AssetListingStatsRow[]>('get_asset_listing_stats_v1', {
            p_asset_uids: assetUidChunk,
          });
          return Array.isArray(rows) ? rows : [];
        } catch (error) {
          console.debug('[MarketplaceCatalog] Stats RPC chunk hydrate skipped:', error);
          return [];
        }
      }),
    );
    const rows = rowGroups.flat();

    return new Map(
      rows
        .filter((row) => normalizeAssetUid(row.asset_uid))
        .map((row) => [normalizeAssetUid(row.asset_uid), row] as const),
    );
  } catch (error) {
    console.debug('[MarketplaceCatalog] Stats RPC hydrate skipped:', error);
    return new Map();
  }
}

function applyCanonicalStatsToCache(
  assetId: string,
  stats: Pick<AssetListingStatsRow, 'views' | 'likes'>,
  options: { clearView?: boolean; clearLike?: boolean } = {},
): void {
  const targetId = normalizeAssetUid(assetId);
  if (!targetId) return;

  if (options.clearView) {
    clearLocalStatValue(MARKETPLACE_LOCAL_VIEW_COUNTS_KEY, targetId);
  }
  if (options.clearLike) {
    clearLocalStatValue(MARKETPLACE_LOCAL_LIKE_DELTAS_KEY, targetId);
  }

  const nextViews = asRoundedCount(stats.views);
  const nextLikes = asRoundedCount(stats.likes);
  cachedAssets = cachedAssets.map((asset) => {
    if (!isMatchingMarketplaceAssetId(asset, targetId)) return asset;
    return {
      ...asset,
      views: nextViews ?? asset.views,
      likes: nextLikes ?? asset.likes,
    };
  });
  dispatchSyncEvent(MARKETPLACE_CATALOG_SYNC_EVENT);
}

async function syncCanonicalListingStats(
  assetId: string,
  options: { clearView?: boolean; clearLike?: boolean } = {},
): Promise<void> {
  const targetId = normalizeAssetUid(assetId);
  if (!targetId) return;

  const statsByAssetUid = await fetchCanonicalListingStats([targetId]);
  const stats = statsByAssetUid.get(targetId);
  if (!stats) return;
  applyCanonicalStatsToCache(targetId, stats, options);
}

function formatDerivedPrice(amount: number, currency?: string): string {
  const normalizedCurrency = String(currency || '').trim().toUpperCase();
  const formattedAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: amount > 0 && amount < 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return normalizedCurrency ? `${formattedAmount} ${normalizedCurrency}` : formattedAmount;
}

function formatDerivedUsdValue(amount: number, currency?: string): string | undefined {
  const normalizedCurrency = String(currency || '').trim().toUpperCase();
  if (!normalizedCurrency || (normalizedCurrency !== 'USD' && normalizedCurrency !== 'USDC' && normalizedCurrency !== 'USDT')) {
    return undefined;
  }

  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: amount > 0 && amount < 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

async function fetchSellerProfilesById(
  sellerUserIds: string[],
): Promise<Map<string, AssetCatalogSellerProfileRow>> {
  const uniqueIds = uniqueNormalizedValues(sellerUserIds);
  if (uniqueIds.length === 0 || !isSupabaseRestEnabled()) {
    return new Map();
  }

  try {
    const rowGroups = await Promise.all(
      chunkArray(uniqueIds).map(async (idChunk) => {
        try {
          return await restSelect<AssetCatalogSellerProfileRow>(
            'profiles',
            toQuery({
              select: 'id,wallet_address,display_name,username,is_verified,status',
              id: encodeIn(idChunk),
            }),
          );
        } catch (error) {
          console.debug('[MarketplaceCatalog] Seller profile chunk hydrate skipped:', error);
          return [];
        }
      }),
    );
    const rows = rowGroups.flat();

    return new Map(
      rows
        .filter((row: AssetCatalogSellerProfileRow) => !row.status || row.status === 'active')
        .map((row: AssetCatalogSellerProfileRow) => [row.id, row] as const),
    );
  } catch (error) {
    console.debug('[MarketplaceCatalog] Seller profile hydrate skipped:', error);
    return new Map();
  }
}

async function fetchAssetProtocolLinksByAssetId(
  assetIds: string[],
): Promise<Map<string, AssetProtocolLinkRow>> {
  const uniqueIds = uniqueNormalizedValues(assetIds);
  if (uniqueIds.length === 0 || !isSupabaseRestEnabled()) {
    return new Map();
  }

  try {
    const rowGroups = await Promise.all(
      chunkArray(uniqueIds).map(async (assetIdChunk) => {
        try {
          return await restSelect<AssetProtocolLinkRow>(
            'asset_protocol_links',
            toQuery({
              select: 'asset_id,chain_id,contract_address,token_id,link_type',
              asset_id: encodeIn(assetIdChunk),
            }),
          );
        } catch (error) {
          console.debug('[MarketplaceCatalog] Asset protocol link chunk hydrate skipped:', error);
          return [];
        }
      }),
    );
    const rows = rowGroups.flat();

    const byAssetId = new Map<string, AssetProtocolLinkRow>();
    for (const row of rows) {
      const assetId = String(row.asset_id || '').trim();
      if (!assetId) continue;

      const current = byAssetId.get(assetId);
      const isPrimary = String(row.link_type || '').trim().toLowerCase() === 'primary';
      const currentIsPrimary = String(current?.link_type || '').trim().toLowerCase() === 'primary';

      if (!current || (isPrimary && !currentIsPrimary)) {
        byAssetId.set(assetId, row);
      }
    }

    return byAssetId;
  } catch (error) {
    console.debug('[MarketplaceCatalog] Asset protocol link hydrate skipped:', error);
    return new Map();
  }
}

async function fetchProtocolAssetAvailabilityByProjection(
  rows: AssetCatalogRemoteRow[],
  protocolLinksByAssetId: Map<string, AssetProtocolLinkRow>,
): Promise<Map<string, ProtocolAssetAvailabilityRow>> {
  if (!rows.length || !isSupabaseRestEnabled()) {
    return new Map();
  }

  const projections = rows
    .map((row) => getCatalogProtocolProjection(row, protocolLinksByAssetId.get(row.id)))
    .filter((projection) => String(projection.tokenId || '').trim());
  const uniqueTokenIds = Array.from(
    new Set(projections.map((projection) => normalizeAssetUid(projection.tokenId)).filter(Boolean)),
  );
  if (uniqueTokenIds.length === 0) {
    return new Map();
  }

  const targetKeys = new Set(
    projections
      .flatMap((projection) => buildProtocolAssetResolutionKeys(
        projection.chainId,
        projection.contractAddress,
        projection.tokenId,
      )),
  );
  if (targetKeys.size === 0) {
    return new Map();
  }

  try {
    const rowGroups = await Promise.all(
      chunkArray(uniqueTokenIds).map(async (tokenIdChunk) => {
        try {
          return await restSelect<ProtocolAssetAvailabilityRow>(
            'protocol_assets',
            toQuery({
              select: 'chain_id,asset_contract,token_id,available_amount,total_amount,metadata',
              token_id: encodeIn(tokenIdChunk),
              limit: String(Math.max(200, tokenIdChunk.length * 4)),
            }),
          );
        } catch (error) {
          console.debug('[MarketplaceCatalog] Protocol asset availability chunk hydrate skipped:', error);
          return [];
        }
      }),
    );
    const protocolRows = rowGroups.flat();

    const exactMatches = new Map<string, ProtocolAssetAvailabilityRow>();
    const aliasBuckets = new Map<string, ProtocolAssetAvailabilityRow[]>();

    const addAliasBucket = (key: string, row: ProtocolAssetAvailabilityRow) => {
      if (!key) return;
      const current = aliasBuckets.get(key);
      if (current) {
        current.push(row);
        return;
      }
      aliasBuckets.set(key, [row]);
    };

    for (const row of protocolRows) {
      const exactKey = buildProtocolAssetProjectionKey(row.chain_id, row.asset_contract, row.token_id);
      if (exactKey) {
        exactMatches.set(exactKey, row);
      }

      buildProtocolAssetFallbackKeys(row.chain_id, row.asset_contract, row.token_id).forEach((key) => {
        addAliasBucket(key, row);
      });
    }

    const next = new Map<string, ProtocolAssetAvailabilityRow>();

    exactMatches.forEach((row, key) => {
      if (targetKeys.has(key)) {
        next.set(key, row);
      }
    });

    aliasBuckets.forEach((bucket, key) => {
      if (!targetKeys.has(key) || bucket.length !== 1 || next.has(key)) return;
      next.set(key, bucket[0]);
    });

    return next;
  } catch (error) {
    console.debug('[MarketplaceCatalog] Protocol asset availability hydrate skipped:', error);
    return new Map();
  }
}

async function fetchProtocolOrderReservedAmountsByProjection(
  rows: AssetCatalogRemoteRow[],
  protocolLinksByAssetId: Map<string, AssetProtocolLinkRow>,
): Promise<Map<string, number>> {
  if (!rows.length || !isSupabaseRestEnabled()) {
    return new Map();
  }

  const projections = rows
    .map((row) => getCatalogProtocolProjection(row, protocolLinksByAssetId.get(row.id)))
    .filter((projection) => String(projection.tokenId || '').trim());
  const uniqueTokenIds = Array.from(
    new Set(projections.map((projection) => normalizeAssetUid(projection.tokenId)).filter(Boolean)),
  );
  if (uniqueTokenIds.length === 0) {
    return new Map();
  }

  const targetKeys = new Set(
    projections.flatMap((projection) => buildProtocolAssetResolutionKeys(
      projection.chainId,
      projection.contractAddress,
      projection.tokenId,
    )),
  );
  if (targetKeys.size === 0) {
    return new Map();
  }

  try {
    const rowGroups = await Promise.all(
      chunkArray(uniqueTokenIds).map(async (tokenIdChunk) => {
        try {
          return await restSelect<ProtocolOrderAvailabilityRow>(
            'protocol_orders',
            toQuery({
              select: 'chain_id,marketplace_contract,asset_contract,asset_token_id,status,amount,metadata',
              asset_token_id: encodeIn(tokenIdChunk),
              limit: String(Math.max(300, tokenIdChunk.length * 20)),
            }),
          );
        } catch (error) {
          console.debug('[MarketplaceCatalog] Protocol order availability chunk hydrate skipped:', error);
          return [];
        }
      }),
    );
    const orderRows = rowGroups.flat();

    const exactTotals = new Map<string, number>();
    const aliasBuckets = new Map<string, ProtocolOrderAvailabilityRow[]>();

    const addAliasBucket = (key: string, row: ProtocolOrderAvailabilityRow) => {
      if (!key) return;
      const current = aliasBuckets.get(key);
      if (current) {
        current.push(row);
        return;
      }
      aliasBuckets.set(key, [row]);
    };

    for (const row of orderRows) {
      if (!shouldReserveProtocolOrderAmount(row.status)) continue;

      const reservedAmount = asRoundedCount(row.amount) ?? 0;
      if (reservedAmount <= 0) continue;

      const exactKey = buildProtocolAssetProjectionKey(row.chain_id, row.asset_contract, row.asset_token_id);
      if (exactKey) {
        exactTotals.set(exactKey, (exactTotals.get(exactKey) || 0) + reservedAmount);
      }

      buildProtocolAssetFallbackKeys(row.chain_id, row.asset_contract, row.asset_token_id).forEach((key) => {
        addAliasBucket(key, row);
      });
    }

    const next = new Map<string, number>();

    exactTotals.forEach((value, key) => {
      if (targetKeys.has(key)) {
        next.set(key, value);
      }
    });

    aliasBuckets.forEach((bucket, key) => {
      if (!targetKeys.has(key) || bucket.length !== 1 || next.has(key)) return;

      const reservedAmount = asRoundedCount(bucket[0].amount) ?? 0;
      if (reservedAmount > 0) {
        next.set(key, reservedAmount);
      }
    });

    return next;
  } catch (error) {
    console.debug('[MarketplaceCatalog] Protocol order availability hydrate skipped:', error);
    return new Map();
  }
}

type MarketplaceAssetMapOptions = {
  fallback?: MarketplaceAsset;
  sellerProfile?: AssetCatalogSellerProfileRow | null;
  listingStats?: AssetListingStatsRow | null;
  protocolLink?: AssetProtocolLinkRow | null;
  protocolAsset?: ProtocolAssetAvailabilityRow | null;
  protocolReservedAmount?: number | null;
};

function mapRemoteRowToMarketplaceAsset(
  row: AssetCatalogRemoteRow,
  options: MarketplaceAssetMapOptions = {},
): MarketplaceAsset | null {
  const fallback = options.fallback;
  const sellerProfile = options.sellerProfile;
  const listingStats = options.listingStats;
  const protocolLink = options.protocolLink;
  const protocolAsset = options.protocolAsset;
  const protocolReservedAmount =
    typeof options.protocolReservedAmount === 'number' && Number.isFinite(options.protocolReservedAmount)
      ? Math.max(0, Math.round(options.protocolReservedAmount))
      : null;
  const metadata = asRecord(row.metadata) ?? {};
  const attributes = asRecord(row.attributes) ?? {};
  const metadataSeller = asRecord(metadata.seller);
  const runtimeRecord = asRecord(metadata.runtimeRecord);
  const chainSnapshot = asRecord(metadata.chainSnapshot);
  const runtimeMyAsset = asRecord(runtimeRecord?.myAsset);
  const details = asRecord(metadata.details);
  const detailsSeller = asRecord(details?.seller);
  const protocolAssetMetadata = asRecord(protocolAsset?.metadata);
  const assetUid = normalizeAssetUid(row.asset_uid || fallback?.id);
  const seedSource = String(metadata.seed_source || '').trim().toLowerCase();
  const isRuntimeSeedProjection = seedSource === 'runtime_minted_asset_bridge_v1';
  const estimatedPrice = asRecord(attributes.estimated_price);
  const estimatedPriceValue =
    asNumber(estimatedPrice?.suggested)
    ?? asNumber(estimatedPrice?.min)
    ?? asNumber(estimatedPrice?.max);
  const estimatedPriceCurrency = coalesceString(estimatedPrice?.currency);
  const onChainTotalAmount =
    asRoundedCount(chainSnapshot?.totalAmount)
    ?? asRoundedCount(protocolAsset?.total_amount)
    ?? asRoundedCount(protocolAssetMetadata?.totalAmount)
    ?? asRoundedCount(runtimeMyAsset?.totalAmount)
    ??
    asRoundedCount(attributes.on_chain_total_amount)
    ?? asRoundedCount(attributes.total_amount);
  const onChainAvailableAmount =
    asRoundedCount(chainSnapshot?.availableAmount)
    ?? asRoundedCount(protocolAsset?.available_amount)
    ?? asRoundedCount(protocolAssetMetadata?.availableAmount)
    ?? asRoundedCount(runtimeMyAsset?.availableAmount)
    ?? asRoundedCount(attributes.on_chain_available_amount)
    ?? asRoundedCount(attributes.available_amount);
  const orderBackedAvailableAmount =
    !protocolAsset
    && onChainTotalAmount !== null
    && protocolReservedAmount !== null
    && protocolReservedAmount > 0
      ? Math.max(0, onChainTotalAmount - protocolReservedAmount)
      : null;
  const resolvedAvailableAmount =
    orderBackedAvailableAmount !== null
    && (
      onChainAvailableAmount === null
      || onChainAvailableAmount === onChainTotalAmount
      || (isRuntimeSeedProjection && onChainAvailableAmount > orderBackedAvailableAmount)
    )
      ? orderBackedAvailableAmount
      : onChainAvailableAmount;
  const baseViewCount =
    asRoundedCount(listingStats?.views)
    ??
    asRoundedCount(metadata.views)
    ?? asRoundedCount(asRecord(metadata.listing_stats)?.views)
    ?? fallback?.views
    ?? 0;
  const baseLikeCount =
    asRoundedCount(listingStats?.likes)
    ??
    asRoundedCount(metadata.likes)
    ?? asRoundedCount(asRecord(metadata.listing_stats)?.likes)
    ?? fallback?.likes
    ?? 0;
  const localViewCount = assetUid ? readLocalStatValue(MARKETPLACE_LOCAL_VIEW_COUNTS_KEY, assetUid) : 0;
  const localLikeDelta = assetUid ? readLocalStatValue(MARKETPLACE_LOCAL_LIKE_DELTAS_KEY, assetUid) : 0;
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

  const resolvedCategory = coalesceString(row.category, metadata.category, fallback?.category) || 'uncategorized';
  const resolvedSubcategory = coalesceString(metadata.subcategory);
  const categorySlug = normalizeCategoryFilterValue(resolvedCategory, resolvedSubcategory);
  const categoryLabel = getCategoryDisplayLabel(categorySlug, resolvedSubcategory);
  const subcategoryLabel = getSubcategoryDisplayLabel(categorySlug, resolvedSubcategory);
  const resolvedChain = getMarketplaceAssetChainInfo({
    blockchain: coalesceString(metadata.blockchain, fallback?.blockchain),
    network: coalesceString(metadata.network, metadata.listing_network, fallback?.network),
    chainId: row.chain_id ?? protocolLink?.chain_id ?? undefined,
  });
  const createdAt =
    asTimestamp(metadata.createdAt, row.created_at, fallback?.createdAt) ?? Date.now();
  const updatedAt =
    asTimestamp(metadata.updatedAt, row.updated_at, fallback?.updatedAt, createdAt) ?? createdAt;
  const listedAt =
    asTimestamp(metadata.listedAt, fallback?.listedAt, updatedAt, createdAt) ?? updatedAt;
  const expiresAt = asTimestamp(metadata.expiresAt, fallback?.expiresAt) ?? undefined;
  const currency =
    coalesceString(metadata.currency, estimatedPriceCurrency, fallback?.currency)
    || resolvedChain.currency;
  const derivedPrice =
    estimatedPriceValue !== null && estimatedPriceValue !== undefined
      ? formatDerivedPrice(estimatedPriceValue, estimatedPriceCurrency || currency)
      : undefined;
  const derivedPriceUsd =
    estimatedPriceValue !== null && estimatedPriceValue !== undefined
      ? formatDerivedUsdValue(estimatedPriceValue, estimatedPriceCurrency)
      : undefined;
  const sellerDisplayName = coalesceString(
    metadataSeller?.ensName,
    detailsSeller?.ensName,
    sellerProfile?.display_name,
    sellerProfile?.username,
    fallback?.seller?.ensName,
  );

  return {
    ...(fallback || {}),
    id: assetUid || fallback?.id || row.id,
    assetUid: assetUid || fallback?.assetUid || fallback?.id || row.id,
    tokenId: coalesceString(
      row.token_id,
      metadata.tokenId,
      attributes.on_chain_asset_id,
      protocolLink?.token_id,
      fallback?.tokenId,
    ) || '',
    onchainAssetId:
      coalesceString(
        metadata.onchainAssetId,
        metadata.assetId,
        attributes.on_chain_asset_id,
        protocolLink?.token_id,
        row.token_id,
        fallback?.onchainAssetId,
        fallback?.tokenId,
      ),
    contractAddress:
      coalesceString(row.contract_address, metadata.contractAddress, protocolLink?.contract_address, fallback?.contractAddress) || '',
    unitId: coalesceString(metadata.unitId, attributes.on_chain_unit_id, fallback?.unitId),
    unitName: coalesceString(metadata.unitName, fallback?.unitName),
    unitLabel: coalesceString(metadata.unitLabel, metadata.unitName, fallback?.unitLabel, fallback?.unitName),
    name: coalesceString(row.title, metadata.name, fallback?.name) || assetUid || 'Untitled Asset',
    category: categorySlug,
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
        coalesceString(
          metadataSeller?.address,
          detailsSeller?.address,
          metadata.seller_wallet,
          sellerProfile?.wallet_address,
          metadata.ownerAddress,
          metadata.walletAddress,
          metadata.submittedByWallet,
          runtimeRecord?.walletAddress,
          fallback?.seller?.address,
        ) || '',
      ensName: sellerDisplayName,
      verified: asBoolean(
        metadataSeller?.verified ?? detailsSeller?.verified ?? sellerProfile?.is_verified,
        fallback?.seller?.verified ?? false,
      ),
      reputation: Math.max(
        0,
        Math.min(
          100,
          asNumber(metadataSeller?.reputation)
          ?? asNumber(detailsSeller?.reputation)
          ?? fallback?.seller?.reputation
          ?? 0,
        )
      ),
    },
    price: coalesceString(metadata.price, derivedPrice, fallback?.price) || `0 ${currency}`,
    priceUSD: coalesceString(metadata.priceUSD, derivedPriceUsd, fallback?.priceUSD),
    currency,
    availableSlots:
      resolvedAvailableAmount
      ?? asRoundedCount(metadata.availableSlots)
      ?? fallback?.availableSlots
      ?? onChainTotalAmount
      ?? 0,
    totalSlots:
      onChainTotalAmount
      ?? asRoundedCount(metadata.totalSlots)
      ?? fallback?.totalSlots
      ?? onChainTotalAmount
      ?? 0,
    minPurchaseSlots:
      asRoundedCount(metadata.minPurchaseSlots)
      ?? fallback?.minPurchaseSlots
      ?? (onChainTotalAmount ? 1 : undefined),
    maxPurchaseSlots:
      asRoundedCount(metadata.maxPurchaseSlots)
      ?? fallback?.maxPurchaseSlots
      ?? onChainAvailableAmount
      ?? onChainTotalAmount
      ?? undefined,
    listedAt,
    expiresAt,
    listingDuration: coalesceString(metadata.listingDuration, fallback?.listingDuration),
    views: Math.max(0, baseViewCount + localViewCount),
    likes: Math.max(0, baseLikeCount + localLikeDelta),
    rank: asNumber(metadata.rank) ?? asNumber(asRecord(metadata.listing_stats)?.rank) ?? fallback?.rank,
    verified: asBoolean(metadata.verified, fallback?.verified ?? false),
    featured: asBoolean(metadata.featured, fallback?.featured ?? false),
    blockchain: resolvedChain.blockchain,
    network: resolvedChain.network,
    tags: Array.from(
      new Set([
        ...(fallback?.tags || []),
        ...asStringArray(metadata.tags),
        categorySlug,
        categoryLabel,
        subcategoryLabel || '',
      ].filter(Boolean))
    ),
    createdAt,
    updatedAt,
    assetLocationSnapshot: normalizeMarketplaceLocationSnapshot(
      metadata.assetLocationSnapshot,
      fallback?.assetLocationSnapshot,
    ),
    deliverySnapshot:
      (asRecord(metadata.deliverySnapshot) as MarketplaceAsset['deliverySnapshot']) ??
      fallback?.deliverySnapshot,
    configurableAttributes:
      (Array.isArray(metadata.configurableAttributes)
        ? (metadata.configurableAttributes as MarketplaceAsset['configurableAttributes'])
        : fallback?.configurableAttributes),
  };
}

function buildCatalogFromRemoteRows(
  rows: AssetCatalogRemoteRow[],
  options: {
    fallbackAssets?: MarketplaceAsset[];
    sellerProfilesById?: Map<string, AssetCatalogSellerProfileRow>;
    listingStatsByAssetUid?: Map<string, AssetListingStatsRow>;
    protocolLinksByAssetId?: Map<string, AssetProtocolLinkRow>;
    protocolAvailabilityByProjectionKey?: Map<string, ProtocolAssetAvailabilityRow>;
    protocolReservedAmountsByProjectionKey?: Map<string, number>;
  } = {},
): MarketplaceAsset[] {
  const fallbackByAssetUid = new Map(
    (options.fallbackAssets || []).map((asset) => [normalizeAssetUid(asset.assetUid || asset.id), asset] as const),
  );

  return rows
    // Public marketplace/search catalog only shows assets whose projection is explicitly active.
    .filter((row) => row.is_active === true)
    .map((row) => {
      const protocolLink = options.protocolLinksByAssetId?.get(row.id);
      const projection = getCatalogProtocolProjection(row, protocolLink);
      return mapRemoteRowToMarketplaceAsset(row, {
        fallback: fallbackByAssetUid.get(normalizeAssetUid(row.asset_uid)),
        sellerProfile: row.seller_user_id ? options.sellerProfilesById?.get(row.seller_user_id) : undefined,
        listingStats: options.listingStatsByAssetUid?.get(normalizeAssetUid(row.asset_uid)),
        protocolLink,
        protocolAsset: resolveProtocolAssetAvailability(
          projection,
          options.protocolAvailabilityByProjectionKey,
        ),
        protocolReservedAmount: resolveProtocolReservedAmount(
          projection,
          options.protocolReservedAmountsByProjectionKey,
        ),
      });
    })
    .filter((asset): asset is MarketplaceAsset => Boolean(asset));
}

function updateCache(nextAssets: MarketplaceAsset[]): MarketplaceAsset[] {
  cachedAssets = nextAssets;
  saveCatalogCacheToStorage(nextAssets);
  dispatchSyncEvent(MARKETPLACE_CATALOG_SYNC_EVENT);
  return cachedAssets;
}

async function buildCatalogFromFetchedRows(
  rows: AssetCatalogRemoteRow[],
  fallbackAssets: MarketplaceAsset[] = cachedAssets,
): Promise<MarketplaceAsset[]> {
  const [sellerProfilesById, listingStatsByAssetUid, protocolLinksByAssetId] = await Promise.all([
    fetchSellerProfilesById(
      rows.map((row: AssetCatalogRemoteRow) => row.seller_user_id || '').filter(Boolean),
    ),
    fetchCanonicalListingStats(
      rows.map((row: AssetCatalogRemoteRow) => row.asset_uid),
    ),
    fetchAssetProtocolLinksByAssetId(
      rows.map((row: AssetCatalogRemoteRow) => row.id),
    ),
  ]);
  const [
    protocolAvailabilityByProjectionKey,
    protocolReservedAmountsByProjectionKey,
  ] = await Promise.all([
    fetchProtocolAssetAvailabilityByProjection(
      rows,
      protocolLinksByAssetId,
    ),
    fetchProtocolOrderReservedAmountsByProjection(
      rows,
      protocolLinksByAssetId,
    ),
  ]);

  return buildCatalogFromRemoteRows(rows, {
    fallbackAssets,
    sellerProfilesById,
    listingStatsByAssetUid,
    protocolLinksByAssetId,
    protocolAvailabilityByProjectionKey,
    protocolReservedAmountsByProjectionKey,
  });
}

export function loadMarketplaceCatalogSync(): MarketplaceAsset[] {
  if (cachedAssets.length > 0) return cachedAssets;
  return [];
}

export async function hydrateMarketplaceCatalogFromSupabase(
  options: MarketplaceCatalogHydrateOptions = {},
): Promise<MarketplaceAsset[]> {
  if (!isSupabaseRestEnabled()) {
    return cachedAssets;
  }

  if (hydratePromise) {
    if (!options.force) return hydratePromise;
    return hydratePromise.then(
      () => hydrateMarketplaceCatalogFromSupabase({ ...options, force: false }),
      () => hydrateMarketplaceCatalogFromSupabase({ ...options, force: false }),
    );
  }

  const hydrateLimit = normalizeHydrateLimit(options.limit);

  hydratePromise = (async () => {
    try {
      const rows = await restSelect<AssetCatalogRemoteRow>(
        'assets_catalog',
        toQuery({
          select: MARKETPLACE_CATALOG_SELECT,
          is_active: 'eq.true',
          order: 'updated_at.desc',
          limit: hydrateLimit ? String(hydrateLimit) : undefined,
        })
      );
      const remoteCatalog = await buildCatalogFromFetchedRows(rows, cachedAssets);
      return updateCache(remoteCatalog);
    } catch (error) {
      console.debug('[MarketplaceCatalog] Remote hydrate skipped:', error);
      return cachedAssets;
    } finally {
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

export async function fetchMarketplaceCatalogPageFromSupabase(
  options: MarketplaceCatalogPageOptions = {},
): Promise<MarketplaceCatalogPageResult> {
  if (!isSupabaseRestEnabled()) {
    const limit = normalizeCatalogPageLimit(options.limit);
    const fallbackAssets = cachedAssets.slice(0, limit);
    return {
      assets: fallbackAssets,
      nextCursor: null,
      hasMore: cachedAssets.length > fallbackAssets.length,
    };
  }

  const limit = normalizeCatalogPageLimit(options.limit);
  const rpcRows = await fetchMarketplaceCatalogPageRowsViaRpc(options, limit);
  if (rpcRows) {
    const pageRows = rpcRows.slice(0, limit);
    const assets = await buildCatalogFromFetchedRows(pageRows, cachedAssets);
    const lastRow = pageRows[pageRows.length - 1];

    return {
      assets,
      nextCursor: lastRow?.updated_at && lastRow?.id
        ? {
            updatedAt: lastRow.updated_at,
            id: lastRow.id,
          }
        : null,
      hasMore: rpcRows.some((row) => row.page_has_more === true),
    };
  }

  const rows = await restSelect<AssetCatalogRemoteRow>(
    'assets_catalog',
    buildMarketplaceCatalogPageQuery(options, limit + 1),
  );
  const pageRows = rows.slice(0, limit);
  const assets = await buildCatalogFromFetchedRows(pageRows, cachedAssets);
  const lastRow = pageRows[pageRows.length - 1];

  return {
    assets,
    nextCursor: lastRow?.updated_at && lastRow?.id
      ? {
          updatedAt: lastRow.updated_at,
          id: lastRow.id,
        }
      : null,
    hasMore: rows.length > limit,
  };
}

export function getMarketplaceCatalogAssetById(
  assetId: string,
  assets: MarketplaceAsset[] = cachedAssets
): MarketplaceAsset | undefined {
  const targetId = normalizeAssetUid(assetId);
  return assets.find((asset) => isMatchingMarketplaceAssetId(asset, targetId));
}

export function incrementMarketplaceAssetView(assetId: string): void {
  const targetId = normalizeAssetUid(assetId);
  if (!targetId) return;

  adjustLocalStatValue(MARKETPLACE_LOCAL_VIEW_COUNTS_KEY, targetId, 1);
  cachedAssets = cachedAssets.map((asset) => {
    if (!isMatchingMarketplaceAssetId(asset, targetId)) return asset;
    return {
      ...asset,
      views: Math.max(0, (asset.views || 0) + 1),
    };
  });
  dispatchSyncEvent(MARKETPLACE_CATALOG_SYNC_EVENT);

  const viewerKey = getMarketplaceViewerKey();
  if (!viewerKey || !isSupabaseRestEnabled()) return;

  void restPublicRpc<null>('record_asset_view_v1', {
    p_asset_uid: targetId,
    p_viewer_key: viewerKey,
    p_wallet_address: null,
  })
    .then(() => syncCanonicalListingStats(targetId, { clearView: true }))
    .catch((error: unknown) => {
      console.debug('[MarketplaceCatalog] View RPC sync skipped:', error);
    });
}

export function adjustMarketplaceAssetLikeCount(assetId: string, delta: number): void {
  const targetId = normalizeAssetUid(assetId);
  if (!targetId || !Number.isFinite(delta) || delta === 0) return;

  adjustLocalStatValue(MARKETPLACE_LOCAL_LIKE_DELTAS_KEY, targetId, delta);
  cachedAssets = cachedAssets.map((asset) => {
    if (!isMatchingMarketplaceAssetId(asset, targetId)) return asset;
    return {
      ...asset,
      likes: Math.max(0, (asset.likes || 0) + Math.trunc(delta)),
    };
  });
  dispatchSyncEvent(MARKETPLACE_CATALOG_SYNC_EVENT);

  void syncCanonicalListingStats(targetId, { clearLike: true });
}

export function getMarketplaceCatalogStatistics(
  assets: MarketplaceAsset[] = cachedAssets
): MarketplaceCatalogStats {
  if (!assets.length) {
    return {
      totalAssets: 0,
      totalVolume: '0.00 ETH',
      floorPrice: '0.00 ETH',
      averagePrice: '0.00 ETH',
    };
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
  if (!assets.length) return [];
  return getCategoryOptionsFromValues(assets.map((asset) => asset.category)).map(
    (option: { value: string }) => option.value,
  );
}

export function getMarketplaceCatalogBlockchains(
  assets: MarketplaceAsset[] = cachedAssets
): string[] {
  if (!assets.length) return [];
  return Array.from(new Set(assets.map((asset) => asset.blockchain).filter(Boolean))).sort();
}

export function getMarketplaceCatalogNetworkOptions(
  assets: MarketplaceAsset[] = cachedAssets,
): MarketplaceNetworkFilterOption[] {
  if (!assets.length) return [];

  const uniqueOptions = new Map<string, MarketplaceNetworkFilterOption>();
  for (const asset of assets) {
    const option = getMarketplaceAssetNetworkFilterOption(asset);
    if (!uniqueOptions.has(option.value)) {
      uniqueOptions.set(option.value, option);
    }
  }

  return Array.from(uniqueOptions.values()).sort((left, right) => left.label.localeCompare(right.label));
}

if (typeof window !== 'undefined') {
  window.addEventListener(ASSET_METADATA_CHANGED_EVENT, () => {
    void hydrateMarketplaceCatalogFromSupabase();
  });
}
