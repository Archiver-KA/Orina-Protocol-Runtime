import type {
  CollectionAssetItem,
  CollectionDetails,
  CollectionDraft,
  CollectionFavorite,
  CollectionFollow,
  CollectionMembership,
  CollectionSummary,
} from '@/types/collection';
import { MOCK_COLLECTIONS } from '@/utils/mockCollectionsData';
import {
  getMarketplaceCatalogAssetById,
  loadMarketplaceCatalogSync,
} from '@/utils/marketplaceCatalog';
import {
  encodeEq,
  isSupabaseRestEnabled,
  restDelete,
  restSelect,
  restUpsert,
  toQuery,
} from '@/utils/supabaseRest';
import {
  getDeterministicOwnedAssetDetailsById,
  getTestWalletMyAssets,
} from '@/utils/testWalletAssetFixtures';
import { getRuntimeMintedAssetDetailsById, loadRuntimeMyAssets } from '@/utils/runtimeMintedAssets';
import { ensureRemoteProfileIdForWallet, getCachedRemoteProfileId } from '@/utils/profileRemoteIdentity';

const COLLECTION_FAVORITES_PREFIX = 'orina_collection_favorites_';
const COLLECTION_FOLLOWS_PREFIX = 'orina_collection_follows_';
const RUNTIME_COLLECTIONS_KEY = 'orina_runtime_collections_v1';
const DELETED_COLLECTION_IDS_KEY = 'orina_deleted_collections_v1';
const DEFAULT_COLLECTION_COVER = 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1600&auto=format&fit=crop';
const COLLECTIONS_HYDRATE_TTL_MS = 30_000;

export const COLLECTIONS_SYNC_EVENT = 'orina:collections-changed';

const collectionFavoritesHydrateInFlight = new Set<string>();
const collectionFollowsHydrateInFlight = new Set<string>();
const collectionFavoritesSyncTimers = new Map<string, number>();
const collectionFollowsSyncTimers = new Map<string, number>();
const collectionEntitySyncTimers = new Map<string, number>();
const collectionBackfillInFlight = new Set<string>();
const collectionBackfillLastAttemptAt = new Map<string, number>();
let collectionsHydrateInFlight = false;
let collectionsLastHydratedAt = 0;
let collectionsStorageBridgeAttached = false;
const COLLECTION_BACKFILL_TTL_MS = 60_000;

type DbCollectionFavoriteRow = {
  user_id: string;
  collection_id: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type DbCollectionFollowRow = {
  user_id: string;
  collection_id: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type DbCollectionRow = {
  id: string;
  owner_user_id: string;
  owner_wallet_snapshot: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  cover_image: string;
  bio: string;
  tags: string[] | null;
  verified: boolean;
  featured: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type DbCollectionAssetRow = {
  collection_id: string;
  asset_id: string;
  added_by_user_id: string;
  added_by_wallet_snapshot: string;
  metadata: Record<string, unknown> | null;
  added_at: string;
};

function walletKey(walletAddress: string): string {
  return String(walletAddress || '').toLowerCase();
}

function getCollectionFavoritesKey(walletAddress: string): string {
  return `${COLLECTION_FAVORITES_PREFIX}${walletKey(walletAddress)}`;
}

function getCollectionFollowsKey(walletAddress: string): string {
  return `${COLLECTION_FOLLOWS_PREFIX}${walletKey(walletAddress)}`;
}

function readLocalArraySafe<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function saveLocalArray<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function queueSync(map: Map<string, number>, key: string, job: () => void): void {
  if (typeof window === 'undefined') return;
  const prev = map.get(key);
  if (prev) window.clearTimeout(prev);
  const timer = window.setTimeout(() => {
    map.delete(key);
    job();
  }, 250);
  map.set(key, timer);
}

function dispatchCollectionsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(COLLECTIONS_SYNC_EVENT));
}

function invalidateCollectionsHydration(): void {
  collectionsLastHydratedAt = 0;
}

function isCollectionsStorageKey(key?: string | null): boolean {
  if (!key) return false;
  return (
    key === RUNTIME_COLLECTIONS_KEY ||
    key === DELETED_COLLECTION_IDS_KEY ||
    key.startsWith(COLLECTION_FAVORITES_PREFIX) ||
    key.startsWith(COLLECTION_FOLLOWS_PREFIX)
  );
}

function ensureCollectionsStorageBridge(): void {
  if (typeof window === 'undefined' || collectionsStorageBridgeAttached) return;

  window.addEventListener('storage', (event) => {
    if (!isCollectionsStorageKey(event.key)) return;
    invalidateCollectionsHydration();
    dispatchCollectionsChanged();
  });

  collectionsStorageBridgeAttached = true;
}

function shortWallet(walletAddress: string): string {
  if (!walletAddress) return 'unknown wallet';
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

function parseEthAmount(value: string): number {
  const parsed = Number.parseFloat(String(value || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatEthAmount(value: number): string {
  if (value <= 0) return '0 ETH';
  return `${value.toFixed(value >= 10 ? 0 : 2).replace(/\.00$/, '')} ETH`;
}

function slugify(value: string): string {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `collection-${Date.now().toString(36)}`;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function buildMarketplaceCollectionAsset(assetId: string): CollectionAssetItem | null {
  const asset = getMarketplaceCatalogAssetById(assetId, loadMarketplaceCatalogSync());
  if (!asset) return null;

  return {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    image: asset.image,
    price: asset.price,
    ownerWallet: asset.seller.address,
    source: 'marketplace',
    sourceLabel: 'Marketplace Listing',
    blockchain: asset.blockchain,
  };
}

function buildOwnedCollectionAsset(assetId: string): CollectionAssetItem | null {
  const asset =
    getRuntimeMintedAssetDetailsById(assetId) ||
    getDeterministicOwnedAssetDetailsById(assetId);
  if (!asset) return null;

  return {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    image: asset.image,
    price: asset.currentPrice,
    ownerWallet: asset.currentOwner,
    source: 'owned',
    sourceLabel: 'Owned Asset',
    blockchain: asset.blockchain,
  };
}

function resolveCollectionAsset(assetId: string): CollectionAssetItem | null {
  return buildMarketplaceCollectionAsset(assetId) || buildOwnedCollectionAsset(assetId);
}

function resolveCollectionAssets(itemIds: string[]): CollectionAssetItem[] {
  return uniqueStrings(itemIds)
    .map((assetId) => resolveCollectionAsset(assetId))
    .filter((asset): asset is CollectionAssetItem => Boolean(asset));
}

function buildCollectionMemberships(collection: CollectionSummary): CollectionMembership[] {
  return collection.itemIds.map((assetId, index) => ({
    collectionId: collection.id,
    assetId,
    addedByWallet: collection.ownerWallet,
    addedAt: collection.createdAt + index * 60_000,
  }));
}

function normalizeCollectionSummary(collection: CollectionSummary): CollectionSummary {
  const itemIds = uniqueStrings(collection.itemIds);
  const assets = resolveCollectionAssets(itemIds);
  const floorPrice = assets.length > 0 ? Math.min(...assets.map((asset) => parseEthAmount(asset.price))) : 0;
  const volume = assets.reduce((sum, asset) => sum + parseEthAmount(asset.price), 0);
  const description = (collection.description || collection.bio || `Curated collection by ${shortWallet(collection.ownerWallet)}`).trim();
  const bio = (collection.bio || description).trim();

  return {
    ...collection,
    slug: slugify(collection.slug || collection.name),
    description,
    bio,
    tags: uniqueStrings(collection.tags),
    itemIds,
    itemCount: assets.length,
    floorPrice: formatEthAmount(floorPrice),
    volume: formatEthAmount(volume),
    followerCount: Math.max(0, Number(collection.followerCount || 0)),
    likedCount: Math.max(0, Number(collection.likedCount || 0)),
    coverImage: collection.coverImage || assets[0]?.image || DEFAULT_COLLECTION_COVER,
    createdAt: collection.createdAt || Date.now(),
    updatedAt: collection.updatedAt || collection.createdAt || Date.now(),
    verified: Boolean(collection.verified),
    featured: Boolean(collection.featured),
  };
}

function sortCollections(collections: CollectionSummary[]): CollectionSummary[] {
  return [...collections].sort((a, b) => {
    if (Boolean(a.featured) !== Boolean(b.featured)) {
      return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    }
    return b.updatedAt - a.updatedAt;
  });
}

function mergeCollectionFavoritesPreferLocal(
  localItems: CollectionFavorite[],
  remoteItems: CollectionFavorite[]
): CollectionFavorite[] {
  const byCollectionId = new Map<string, CollectionFavorite>();

  for (const item of remoteItems) {
    if (!item?.collectionId) continue;
    byCollectionId.set(item.collectionId, {
      collectionId: item.collectionId,
      userId: walletKey(item.userId),
      addedAt: item.addedAt || Date.now(),
    });
  }

  for (const item of localItems) {
    if (!item?.collectionId) continue;
    const existing = byCollectionId.get(item.collectionId);
    if (!existing || (item.addedAt || 0) >= (existing.addedAt || 0)) {
      byCollectionId.set(item.collectionId, {
        collectionId: item.collectionId,
        userId: walletKey(item.userId),
        addedAt: item.addedAt || Date.now(),
      });
    }
  }

  return Array.from(byCollectionId.values()).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

function mergeCollectionFollowsPreferLocal(
  localItems: CollectionFollow[],
  remoteItems: CollectionFollow[]
): CollectionFollow[] {
  const byCollectionId = new Map<string, CollectionFollow>();

  for (const item of remoteItems) {
    if (!item?.collectionId) continue;
    byCollectionId.set(item.collectionId, {
      collectionId: item.collectionId,
      userId: walletKey(item.userId),
      followedAt: item.followedAt || Date.now(),
    });
  }

  for (const item of localItems) {
    if (!item?.collectionId) continue;
    const existing = byCollectionId.get(item.collectionId);
    if (!existing || (item.followedAt || 0) >= (existing.followedAt || 0)) {
      byCollectionId.set(item.collectionId, {
        collectionId: item.collectionId,
        userId: walletKey(item.userId),
        followedAt: item.followedAt || Date.now(),
      });
    }
  }

  return Array.from(byCollectionId.values()).sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0));
}

function readStoredRuntimeCollections(): CollectionSummary[] {
  return readLocalArraySafe<CollectionSummary>(RUNTIME_COLLECTIONS_KEY);
}

function saveStoredRuntimeCollections(collections: CollectionSummary[]): void {
  saveLocalArray(RUNTIME_COLLECTIONS_KEY, collections);
}

function readDeletedCollectionIds(): string[] {
  return readLocalArraySafe<string>(DELETED_COLLECTION_IDS_KEY).filter(Boolean);
}

function saveDeletedCollectionIds(ids: string[]): void {
  saveLocalArray(DELETED_COLLECTION_IDS_KEY, Array.from(new Set(ids.filter(Boolean))));
}

function mapCollectionToDbRow(collection: CollectionSummary, ownerUserId: string): DbCollectionRow {
  return {
    id: collection.id,
    owner_user_id: ownerUserId,
    owner_wallet_snapshot: walletKey(collection.ownerWallet),
    slug: slugify(collection.slug || collection.name),
    name: collection.name,
    category: collection.category,
    description: collection.description,
    cover_image: collection.coverImage,
    bio: collection.bio,
    tags: uniqueStrings(collection.tags),
    verified: Boolean(collection.verified),
    featured: Boolean(collection.featured),
    metadata: {},
    created_at: new Date(collection.createdAt || Date.now()).toISOString(),
    updated_at: new Date(collection.updatedAt || Date.now()).toISOString(),
  };
}

function mapCollectionAssetRowsToItemIds(rows: DbCollectionAssetRow[]): string[] {
  return uniqueStrings(
    rows
      .sort((a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime())
      .map((row) => row.asset_id)
  );
}

function mapDbCollectionToSummary(
  row: DbCollectionRow,
  membershipRows: DbCollectionAssetRow[]
): CollectionSummary {
  return normalizeCollectionSummary({
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    coverImage: row.cover_image,
    ownerWallet: walletKey(row.owner_wallet_snapshot),
    bio: row.bio,
    tags: Array.isArray(row.tags) ? row.tags : [],
    itemIds: mapCollectionAssetRowsToItemIds(membershipRows),
    itemCount: 0,
    floorPrice: '0 ETH',
    volume: '0 ETH',
    followerCount: 0,
    likedCount: 0,
    verified: Boolean(row.verified),
    featured: Boolean(row.featured),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  });
}

function mergeRemoteCollectionsPreferLocal(
  localCollections: CollectionSummary[],
  remoteCollections: CollectionSummary[]
): CollectionSummary[] {
  const byId = new Map<string, CollectionSummary>();

  for (const collection of localCollections) {
    byId.set(collection.id, normalizeCollectionSummary(collection));
  }

  for (const remote of remoteCollections) {
    const existing = byId.get(remote.id);
    if (!existing || remote.updatedAt >= existing.updatedAt) {
      byId.set(remote.id, normalizeCollectionSummary(remote));
    }
  }

  return sortCollections(Array.from(byId.values()));
}

async function syncCollectionToSupabase(collection: CollectionSummary): Promise<void> {
  if (!isSupabaseRestEnabled()) return;

  try {
    const ownerWallet = walletKey(collection.ownerWallet);
    const ownerUserId = await ensureRemoteProfileIdForWallet(ownerWallet);
    if (!ownerUserId) return;

    await restUpsert('collections', [mapCollectionToDbRow(collection, ownerUserId)], {
      onConflict: 'id',
    });

    await restDelete('collection_assets', toQuery({ collection_id: encodeEq(collection.id) }));

    if (collection.itemIds.length > 0) {
      await restUpsert(
        'collection_assets',
        collection.itemIds.map((assetId, index) => ({
          collection_id: collection.id,
          asset_id: assetId,
          added_by_user_id: ownerUserId,
          added_by_wallet_snapshot: ownerWallet,
          metadata: {},
          added_at: new Date((collection.updatedAt || Date.now()) + index).toISOString(),
        })),
        { onConflict: 'collection_id,asset_id' }
      );
    }
  } catch (error) {
    console.debug('[Collections] Entity sync skipped:', error);
  }
}

function queueCollectionEntitySync(collection: CollectionSummary): void {
  const normalized = normalizeCollectionSummary(collection);
  queueSync(collectionEntitySyncTimers, normalized.id, () => {
    void syncCollectionToSupabase(normalized);
  });
}

export function queueCollectionsBackfillForWallet(walletAddress: string): void {
  if (typeof window === 'undefined' || !isSupabaseRestEnabled()) return;

  const normalizedWallet = walletKey(walletAddress);
  if (!normalizedWallet) return;
  if (collectionBackfillInFlight.has(normalizedWallet)) return;

  const lastAttemptAt = collectionBackfillLastAttemptAt.get(normalizedWallet) || 0;
  if (Date.now() - lastAttemptAt < COLLECTION_BACKFILL_TTL_MS) return;

  collectionBackfillInFlight.add(normalizedWallet);
  collectionBackfillLastAttemptAt.set(normalizedWallet, Date.now());

  void (async () => {
    try {
      const ownerUserId = await ensureRemoteProfileIdForWallet(normalizedWallet);
      if (!ownerUserId) return;

      const deletedIds = new Set(readDeletedCollectionIds());
      const localCollections = readStoredRuntimeCollections()
        .filter((collection) => walletKey(collection.ownerWallet) === normalizedWallet)
        .filter((collection) => !deletedIds.has(collection.id))
        .map((collection) => normalizeCollectionSummary(collection));

      for (const collection of localCollections) {
        await syncCollectionToSupabase(collection);
      }

      invalidateCollectionsHydration();
      dispatchCollectionsChanged();
    } catch (error) {
      console.debug('[Collections] Backfill skipped:', error);
    } finally {
      collectionBackfillInFlight.delete(normalizedWallet);
    }
  })();
}

async function hydrateCollectionsFromSupabase(): Promise<void> {
  if (
    collectionsHydrateInFlight ||
    !isSupabaseRestEnabled() ||
    typeof window === 'undefined' ||
    Date.now() - collectionsLastHydratedAt < COLLECTIONS_HYDRATE_TTL_MS
  ) {
    return;
  }

  collectionsHydrateInFlight = true;
  collectionsLastHydratedAt = Date.now();

  try {
    const deletedIds = new Set(readDeletedCollectionIds());
    const [rows, membershipRows] = await Promise.all([
      restSelect<DbCollectionRow>(
        'collections',
        toQuery({
          select:
            'id,owner_user_id,owner_wallet_snapshot,slug,name,category,description,cover_image,bio,tags,verified,featured,metadata,created_at,updated_at',
          order: 'updated_at.desc',
        })
      ),
      restSelect<DbCollectionAssetRow>(
        'collection_assets',
        toQuery({
          select: 'collection_id,asset_id,added_by_user_id,added_by_wallet_snapshot,metadata,added_at',
          order: 'added_at.asc',
        })
      ),
    ]);

    const membershipsByCollectionId = new Map<string, DbCollectionAssetRow[]>();
    for (const row of membershipRows) {
      const bucket = membershipsByCollectionId.get(row.collection_id) || [];
      bucket.push(row);
      membershipsByCollectionId.set(row.collection_id, bucket);
    }

    const remoteCollections = rows
      .filter((row) => !deletedIds.has(row.id))
      .map((row) => mapDbCollectionToSummary(row, membershipsByCollectionId.get(row.id) || []));

    const merged = mergeRemoteCollectionsPreferLocal(readStoredRuntimeCollections(), remoteCollections);
    saveStoredRuntimeCollections(merged);
    dispatchCollectionsChanged();
  } catch (error) {
    console.debug('[Collections] Public hydrate skipped:', error);
  } finally {
    collectionsHydrateInFlight = false;
  }
}

function upsertStoredRuntimeCollection(
  collection: CollectionSummary,
  options?: { queueRemoteSync?: boolean }
): CollectionSummary {
  const normalized = normalizeCollectionSummary(collection);
  const current = readStoredRuntimeCollections().filter((item) => item.id !== normalized.id);
  current.push(normalized);
  saveStoredRuntimeCollections(current);
  saveDeletedCollectionIds(readDeletedCollectionIds().filter((id) => id !== normalized.id));
  invalidateCollectionsHydration();
  dispatchCollectionsChanged();
  if (options?.queueRemoteSync !== false) {
    queueCollectionEntitySync(normalized);
  }
  return normalized;
}

function getStoredWalletKeys(prefix: string): string[] {
  if (typeof localStorage === 'undefined') return [];

  const wallets: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix)) {
      wallets.push(walletKey(key.slice(prefix.length)));
    }
  }

  return Array.from(new Set(wallets.filter(Boolean)));
}

function loadCollectionFavoritesSnapshotForWallet(walletAddress: string): CollectionFavorite[] {
  const normalizedWallet = walletKey(walletAddress);
  const key = getCollectionFavoritesKey(normalizedWallet);
  return readLocalArraySafe<CollectionFavorite>(key);
}

function loadCollectionFollowsSnapshotForWallet(walletAddress: string): CollectionFollow[] {
  const normalizedWallet = walletKey(walletAddress);
  const key = getCollectionFollowsKey(normalizedWallet);
  return readLocalArraySafe<CollectionFollow>(key);
}

async function hydrateCollectionFavoritesFromSupabase(walletAddress: string): Promise<void> {
  const key = walletKey(walletAddress);
  if (!key || collectionFavoritesHydrateInFlight.has(key) || !isSupabaseRestEnabled()) return;

  collectionFavoritesHydrateInFlight.add(key);
  try {
    const userId = getCachedRemoteProfileId(key) || await ensureRemoteProfileIdForWallet(key);
    if (!userId) return;

    const rows = await restSelect<DbCollectionFavoriteRow>(
      'user_collection_favorites',
      toQuery({
        select: 'user_id,collection_id,created_at,metadata',
        user_id: encodeEq(userId),
        order: 'created_at.desc',
      })
    );

    const mapped: CollectionFavorite[] = rows
      .map((row) => ({
        collectionId: String(row.metadata?.collection_id || row.collection_id || '').trim(),
        userId: key,
        addedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      }))
      .filter((item) => Boolean(item.collectionId));

    const localKey = getCollectionFavoritesKey(key);
    const existingLocal = readLocalArraySafe<CollectionFavorite>(localKey);
    if (mapped.length === 0 && existingLocal.length > 0) return;

    const next = mergeCollectionFavoritesPreferLocal(existingLocal, mapped);
    localStorage.setItem(localKey, JSON.stringify(next));
    dispatchCollectionsChanged();
  } catch (error) {
    console.debug('[Collections] Favorites hydrate skipped:', error);
  } finally {
    collectionFavoritesHydrateInFlight.delete(key);
  }
}

async function hydrateCollectionFollowsFromSupabase(walletAddress: string): Promise<void> {
  const key = walletKey(walletAddress);
  if (!key || collectionFollowsHydrateInFlight.has(key) || !isSupabaseRestEnabled()) return;

  collectionFollowsHydrateInFlight.add(key);
  try {
    const userId = getCachedRemoteProfileId(key) || await ensureRemoteProfileIdForWallet(key);
    if (!userId) return;

    const rows = await restSelect<DbCollectionFollowRow>(
      'user_collection_follows',
      toQuery({
        select: 'user_id,collection_id,created_at,metadata',
        user_id: encodeEq(userId),
        order: 'created_at.desc',
      })
    );

    const mapped: CollectionFollow[] = rows
      .map((row) => ({
        collectionId: String(row.metadata?.collection_id || row.collection_id || '').trim(),
        userId: key,
        followedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      }))
      .filter((item) => Boolean(item.collectionId));

    const localKey = getCollectionFollowsKey(key);
    const existingLocal = readLocalArraySafe<CollectionFollow>(localKey);
    if (mapped.length === 0 && existingLocal.length > 0) return;

    const next = mergeCollectionFollowsPreferLocal(existingLocal, mapped);
    localStorage.setItem(localKey, JSON.stringify(next));
    dispatchCollectionsChanged();
  } catch (error) {
    console.debug('[Collections] Follows hydrate skipped:', error);
  } finally {
    collectionFollowsHydrateInFlight.delete(key);
  }
}

async function syncCollectionFavoritesToSupabase(
  walletAddress: string,
  favorites: CollectionFavorite[]
): Promise<void> {
  if (!isSupabaseRestEnabled()) return;

  try {
    const userId = await ensureRemoteProfileIdForWallet(walletAddress);
    if (!userId) return;

    if (favorites.length === 0) {
      await restDelete('user_collection_favorites', toQuery({ user_id: encodeEq(userId) }));
      return;
    }

    await restDelete('user_collection_favorites', toQuery({ user_id: encodeEq(userId) }));
    await restUpsert(
      'user_collection_favorites',
      favorites.map((favorite) => ({
        user_id: userId,
        collection_id: favorite.collectionId,
        metadata: { collection_id: favorite.collectionId },
        created_at: new Date(favorite.addedAt || Date.now()).toISOString(),
      })),
      { onConflict: 'user_id,collection_id' }
    );
  } catch (error) {
    console.debug('[Collections] Favorites sync skipped:', error);
  }
}

async function syncCollectionFollowsToSupabase(
  walletAddress: string,
  follows: CollectionFollow[]
): Promise<void> {
  if (!isSupabaseRestEnabled()) return;

  try {
    const userId = await ensureRemoteProfileIdForWallet(walletAddress);
    if (!userId) return;

    if (follows.length === 0) {
      await restDelete('user_collection_follows', toQuery({ user_id: encodeEq(userId) }));
      return;
    }

    await restDelete('user_collection_follows', toQuery({ user_id: encodeEq(userId) }));
    await restUpsert(
      'user_collection_follows',
      follows.map((follow) => ({
        user_id: userId,
        collection_id: follow.collectionId,
        metadata: { collection_id: follow.collectionId },
        created_at: new Date(follow.followedAt || Date.now()).toISOString(),
      })),
      { onConflict: 'user_id,collection_id' }
    );
  } catch (error) {
    console.debug('[Collections] Follows sync skipped:', error);
  }
}

function saveCollectionFavorites(walletAddress: string, favorites: CollectionFavorite[]): void {
  const normalized = walletKey(walletAddress);
  saveLocalArray(getCollectionFavoritesKey(normalized), favorites);
  dispatchCollectionsChanged();

  queueSync(collectionFavoritesSyncTimers, normalized, () => {
    void syncCollectionFavoritesToSupabase(normalized, favorites);
  });
}

function saveCollectionFollows(walletAddress: string, follows: CollectionFollow[]): void {
  const normalized = walletKey(walletAddress);
  saveLocalArray(getCollectionFollowsKey(normalized), follows);
  dispatchCollectionsChanged();

  queueSync(collectionFollowsSyncTimers, normalized, () => {
    void syncCollectionFollowsToSupabase(normalized, follows);
  });
}

function loadAllCollectionFavoritesSnapshot(): CollectionFavorite[] {
  const wallets = getStoredWalletKeys(COLLECTION_FAVORITES_PREFIX);

  const seen = new Set<string>();
  return wallets.flatMap((walletAddress) =>
    loadCollectionFavoritesSnapshotForWallet(walletAddress).filter((favorite) => {
      const key = `${walletKey(favorite.userId)}:${favorite.collectionId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
  );
}

function loadAllCollectionFollowsSnapshot(): CollectionFollow[] {
  const wallets = getStoredWalletKeys(COLLECTION_FOLLOWS_PREFIX);

  const seen = new Set<string>();
  return wallets.flatMap((walletAddress) =>
    loadCollectionFollowsSnapshotForWallet(walletAddress).filter((follow) => {
      const key = `${walletKey(follow.userId)}:${follow.collectionId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
  );
}

function getCollectionFavoriteCounts(): Map<string, number> {
  return loadAllCollectionFavoritesSnapshot().reduce((counts, favorite) => {
    counts.set(favorite.collectionId, (counts.get(favorite.collectionId) || 0) + 1);
    return counts;
  }, new Map<string, number>());
}

function getCollectionFollowCounts(): Map<string, number> {
  return loadAllCollectionFollowsSnapshot().reduce((counts, follow) => {
    counts.set(follow.collectionId, (counts.get(follow.collectionId) || 0) + 1);
    return counts;
  }, new Map<string, number>());
}

export function loadRuntimeCollections(): CollectionSummary[] {
  ensureCollectionsStorageBridge();
  if (typeof window !== 'undefined') {
    void hydrateCollectionsFromSupabase();
  }

  const collectionMap = new Map<string, CollectionSummary>();
  const favoriteCounts = getCollectionFavoriteCounts();
  const followCounts = getCollectionFollowCounts();
  const deletedIds = new Set(readDeletedCollectionIds());

  if (!isSupabaseRestEnabled()) {
    MOCK_COLLECTIONS.forEach((collection) => {
      if (deletedIds.has(collection.id)) return;
      collectionMap.set(collection.id, normalizeCollectionSummary(collection));
    });
  }

  readStoredRuntimeCollections().forEach((collection) => {
    if (deletedIds.has(collection.id)) return;
    collectionMap.set(collection.id, normalizeCollectionSummary(collection));
  });

  return sortCollections(Array.from(collectionMap.values())).map((collection) => ({
    ...collection,
    likedCount: favoriteCounts.get(collection.id) ?? collection.likedCount,
    followerCount: followCounts.get(collection.id) ?? collection.followerCount,
  }));
}

export function loadRuntimeCollectionDetails(): CollectionDetails[] {
  return loadRuntimeCollections().map((collection) => ({
    ...collection,
    assets: resolveCollectionAssets(collection.itemIds),
    memberships: buildCollectionMemberships(collection),
  }));
}

export function loadCollectionsByOwner(walletAddress: string): CollectionSummary[] {
  const normalizedWallet = walletKey(walletAddress);
  return loadRuntimeCollections().filter((collection) => walletKey(collection.ownerWallet) === normalizedWallet);
}

export function loadCollectionDetailsById(collectionId: string): CollectionDetails | undefined {
  return loadRuntimeCollectionDetails().find((collection) => collection.id === collectionId);
}

export function loadCollectionAssetOptions(walletAddress?: string | null): CollectionAssetItem[] {
  const normalizedWallet = walletKey(walletAddress);
  const marketplaceCatalog = loadMarketplaceCatalogSync();
  const fixture = getTestWalletMyAssets(walletAddress);
  const runtimeAssets = loadRuntimeMyAssets(walletAddress);
  const ownedAssets: CollectionAssetItem[] = fixture
    ? [
        ...fixture.rwaAssets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          category: asset.category,
          image: asset.image,
          price: asset.minPrice,
          ownerWallet: normalizedWallet,
          source: 'owned' as const,
          sourceLabel: 'RWA Minted',
          status: asset.status,
        })),
        ...fixture.receiptAssets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          category: asset.category,
          image: asset.image,
          price: asset.purchaseValue,
          ownerWallet: normalizedWallet,
          source: 'owned' as const,
          sourceLabel: 'Receipt NFT',
          status: asset.blockchain,
        })),
        ...fixture.nftAssets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          category: asset.category,
          image: asset.image,
          price: asset.currentPrice,
          ownerWallet: normalizedWallet,
          source: 'owned' as const,
          sourceLabel: 'Digital NFT',
          status: asset.collection,
        })),
      ]
    : [];
  const runtimeOwnedAssets: CollectionAssetItem[] = [
    ...runtimeAssets.rwaAssets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      category: asset.category,
      image: asset.image,
      price: asset.minPrice,
      ownerWallet: normalizedWallet,
      source: 'owned' as const,
      sourceLabel: 'RWA Minted',
      status: asset.status,
    })),
    ...runtimeAssets.nftAssets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      category: asset.category,
      image: asset.image,
      price: asset.currentPrice,
      ownerWallet: normalizedWallet,
      source: 'owned' as const,
      sourceLabel: 'Digital NFT',
      status: asset.collection,
    })),
  ];

  const listedMarketplaceAssets = marketplaceCatalog
    .filter((asset) => walletKey(asset.seller.address) === normalizedWallet)
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      category: asset.category,
      image: asset.image,
      price: asset.price,
      ownerWallet: normalizedWallet,
      source: 'marketplace' as const,
      sourceLabel: 'Marketplace Listing',
      blockchain: asset.blockchain,
      status: asset.listingDuration,
    }));

  const merged = new Map<string, CollectionAssetItem>();
  [...runtimeOwnedAssets, ...ownedAssets, ...listedMarketplaceAssets].forEach((asset) => {
    merged.set(asset.id, asset);
  });

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function createCollection(walletAddress: string, draft: CollectionDraft): CollectionSummary {
  const now = Date.now();
  const normalizedWallet = walletKey(walletAddress);
  const normalizedName = draft.name.trim() || 'Untitled Collection';
  const summary: CollectionSummary = {
    id: `collection-${slugify(normalizedName)}-${now.toString(36)}`,
    slug: slugify(normalizedName),
    name: normalizedName,
    category: draft.category.trim() || 'Curated',
    description: (draft.bio || `Curated collection by ${shortWallet(walletAddress)}`).trim(),
    coverImage: draft.coverImage.trim(),
    ownerWallet: normalizedWallet,
    bio: draft.bio.trim(),
    tags: uniqueStrings(draft.tags),
    itemIds: uniqueStrings(draft.itemIds),
    itemCount: 0,
    floorPrice: '0 ETH',
    volume: '0 ETH',
    followerCount: 0,
    likedCount: 0,
    verified: false,
    featured: false,
    createdAt: now,
    updatedAt: now,
  };

  return upsertStoredRuntimeCollection(summary);
}

export function updateCollection(
  walletAddress: string,
  collectionId: string,
  updates: Partial<CollectionDraft>
): CollectionSummary | null {
  const existing = loadCollectionsByOwner(walletAddress).find((collection) => collection.id === collectionId);
  if (!existing) return null;

  const next: CollectionSummary = {
    ...existing,
    name: updates.name?.trim() || existing.name,
    slug: slugify(updates.name?.trim() || existing.slug || existing.name),
    category: updates.category?.trim() || existing.category,
    description: (updates.bio ?? existing.bio ?? existing.description).trim() || existing.description,
    bio: (updates.bio ?? existing.bio).trim(),
    tags: updates.tags ? uniqueStrings(updates.tags) : existing.tags,
    coverImage: updates.coverImage?.trim() || existing.coverImage,
    itemIds: updates.itemIds ? uniqueStrings(updates.itemIds) : existing.itemIds,
    updatedAt: Date.now(),
  };

  return upsertStoredRuntimeCollection(next);
}

export function addAssetToCollection(walletAddress: string, collectionId: string, assetId: string): CollectionSummary | null {
  const existing = loadCollectionsByOwner(walletAddress).find((collection) => collection.id === collectionId);
  if (!existing) return null;
  if (existing.itemIds.includes(assetId)) return existing;

  return updateCollection(walletAddress, collectionId, {
    itemIds: [...existing.itemIds, assetId],
  });
}

export function removeAssetFromCollection(walletAddress: string, collectionId: string, assetId: string): CollectionSummary | null {
  const existing = loadCollectionsByOwner(walletAddress).find((collection) => collection.id === collectionId);
  if (!existing) return null;

  return updateCollection(walletAddress, collectionId, {
    itemIds: existing.itemIds.filter((id) => id !== assetId),
  });
}

export function loadCollectionFavorites(walletAddress: string): CollectionFavorite[] {
  ensureCollectionsStorageBridge();
  const normalizedWallet = walletKey(walletAddress);
  const key = getCollectionFavoritesKey(normalizedWallet);
  const existing = readLocalArraySafe<CollectionFavorite>(key);
  if (normalizedWallet) void hydrateCollectionFavoritesFromSupabase(normalizedWallet);
  return existing;
}

export function loadFollowedCollections(walletAddress: string): CollectionFollow[] {
  ensureCollectionsStorageBridge();
  const normalizedWallet = walletKey(walletAddress);
  const key = getCollectionFollowsKey(normalizedWallet);
  const existing = readLocalArraySafe<CollectionFollow>(key);
  if (normalizedWallet) void hydrateCollectionFollowsFromSupabase(normalizedWallet);
  return existing;
}

function pruneCollectionSocialState(collectionId: string): void {
  for (const walletAddress of getStoredWalletKeys(COLLECTION_FAVORITES_PREFIX)) {
    const key = getCollectionFavoritesKey(walletAddress);
    const next = readLocalArraySafe<CollectionFavorite>(key).filter((item) => item.collectionId !== collectionId);
    saveLocalArray(key, next);
  }

  for (const walletAddress of getStoredWalletKeys(COLLECTION_FOLLOWS_PREFIX)) {
    const key = getCollectionFollowsKey(walletAddress);
    const next = readLocalArraySafe<CollectionFollow>(key).filter((item) => item.collectionId !== collectionId);
    saveLocalArray(key, next);
  }
}

async function deleteCollectionFromSupabase(collectionId: string): Promise<void> {
  if (!isSupabaseRestEnabled()) return;

  try {
    await restDelete('collections', toQuery({ id: encodeEq(collectionId) }));
    saveDeletedCollectionIds(readDeletedCollectionIds().filter((id) => id !== collectionId));
  } catch (error) {
    console.debug('[Collections] Delete sync skipped:', error);
  }
}

export function deleteCollection(walletAddress: string, collectionId: string): boolean {
  const existing = loadCollectionsByOwner(walletAddress).find((collection) => collection.id === collectionId);
  if (!existing) return false;

  const next = readStoredRuntimeCollections().filter((collection) => collection.id !== collectionId);
  saveStoredRuntimeCollections(next);
  saveDeletedCollectionIds([...readDeletedCollectionIds(), collectionId]);
  pruneCollectionSocialState(collectionId);
  invalidateCollectionsHydration();
  dispatchCollectionsChanged();
  queueSync(collectionEntitySyncTimers, collectionId, () => {
    void deleteCollectionFromSupabase(collectionId);
  });
  return true;
}

export function isCollectionFavorite(walletAddress: string, collectionId: string): boolean {
  return loadCollectionFavorites(walletAddress).some((item) => item.collectionId === collectionId);
}

export function isCollectionFollowed(walletAddress: string, collectionId: string): boolean {
  return loadFollowedCollections(walletAddress).some((item) => item.collectionId === collectionId);
}

export function loadFavoriteCollectionSummaries(walletAddress: string): CollectionSummary[] {
  const favorites = loadCollectionFavorites(walletAddress);
  const ids = new Set(favorites.map((item) => item.collectionId));
  return loadRuntimeCollections().filter((collection) => ids.has(collection.id));
}

export function loadFollowedCollectionSummaries(walletAddress: string): CollectionSummary[] {
  const follows = loadFollowedCollections(walletAddress);
  const ids = new Set(follows.map((item) => item.collectionId));
  return loadRuntimeCollections().filter((collection) => ids.has(collection.id));
}

export function toggleCollectionFavorite(walletAddress: string, collectionId: string): boolean {
  const current = loadCollectionFavorites(walletAddress);
  const exists = current.some((item) => item.collectionId === collectionId);
  const next = exists
    ? current.filter((item) => item.collectionId !== collectionId)
    : [...current, { collectionId, userId: walletKey(walletAddress), addedAt: Date.now() }];
  saveCollectionFavorites(walletAddress, next);
  return !exists;
}

export function toggleCollectionFollow(walletAddress: string, collectionId: string): boolean {
  const current = loadFollowedCollections(walletAddress);
  const exists = current.some((item) => item.collectionId === collectionId);
  const next = exists
    ? current.filter((item) => item.collectionId !== collectionId)
    : [...current, { collectionId, userId: walletKey(walletAddress), followedAt: Date.now() }];
  saveCollectionFollows(walletAddress, next);
  return !exists;
}
