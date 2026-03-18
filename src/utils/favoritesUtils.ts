import type { FavoriteAsset } from '@/types/favorites';
import { getTestWalletMyAssets } from '@/utils/testWalletAssetFixtures';
import { ensureAssetMetadataSeedForIds } from '@/utils/assetMetadataSync';
import { isGuestModeForced } from '@/utils/guestMode';
import { getMarketplaceCatalogAssetById, loadMarketplaceCatalogSync } from '@/utils/marketplaceCatalog';
import {
  dispatchSyncEvent,
  encodeEq,
  encodeIn,
  getLocalSupabaseId,
  isSupabaseRestEnabled,
  restDelete,
  restSelect,
  restUpsert,
  setLocalSupabaseId,
  toQuery,
} from '@/utils/supabaseRest';
import { ensureRemoteProfileIdForWallet, getCachedRemoteProfileId } from '@/utils/profileUtils';

const LEGACY_FAVORITES_KEY = 'studio_favorites';
const FAVORITES_SYNC_EVENT = 'orina:favorites-changed';
const FAVORITES_MIGRATION_BACKUP_SUFFIX = '_backup_legacy_ids';

const favoritesHydrateInFlight = new Set<string>();
const favoritesSyncTimers = new Map<string, number>();

type DbAssetRow = {
  id: string;
  asset_uid: string;
};

type DbFavoriteRow = {
  user_id: string;
  asset_id: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

function shouldBlockGuestWrite(op: string): boolean {
  if (!isGuestModeForced()) return false;
  console.warn(`[Favorites] Blocked guest-mode write: ${op}`);
  return true;
}

function walletKey(walletAddress: string): string {
  return String(walletAddress || '').toLowerCase();
}

function getFavoritesKey(walletAddress: string): string {
  return `orina_favorites_${walletKey(walletAddress)}`;
}

function isCanonicalFavoriteAssetId(assetId: string): boolean {
  return /^asset-\d{3}$/i.test(assetId);
}

function localAssetMapKey(assetUid: string): string {
  return toCanonicalFavoriteAssetId(assetUid).toLowerCase();
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

function seedDeterministicFavoritesForTestWallet(walletAddress: string): FavoriteAsset[] | null {
  const fixture = getTestWalletMyAssets(walletAddress);
  if (!fixture?.favoriteListingAssetIds?.length) return null;

  const key = getFavoritesKey(walletAddress);
  const existing = readLocalArraySafe<FavoriteAsset>(key);
  if (existing.length > 0) return existing;

  const baseTs = Date.parse('2026-02-25T00:00:00Z');
  const seeded = fixture.favoriteListingAssetIds.map((assetId, index) => ({
    assetId: toCanonicalFavoriteAssetId(assetId),
    addedAt: baseTs + index * 60_000,
  }));

  try {
    localStorage.setItem(key, JSON.stringify(seeded));
    return seeded;
  } catch {
    return seeded;
  }
}

function mergeFavoritesPreferLocal(localItems: FavoriteAsset[], remoteItems: FavoriteAsset[]): FavoriteAsset[] {
  const byAssetId = new Map<string, FavoriteAsset>();

  for (const item of remoteItems) {
    if (!item?.assetId) continue;
    const canonical = toCanonicalFavoriteAssetId(item.assetId);
    byAssetId.set(canonical, { assetId: canonical, addedAt: item.addedAt || Date.now() });
  }

  for (const item of localItems) {
    if (!item?.assetId) continue;
    const canonical = toCanonicalFavoriteAssetId(item.assetId);
    const existing = byAssetId.get(canonical);
    if (!existing || (item.addedAt || 0) >= (existing.addedAt || 0)) {
      byAssetId.set(canonical, { assetId: canonical, addedAt: item.addedAt || Date.now() });
    }
  }

  return Array.from(byAssetId.values()).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

function toCanonicalFavoriteAssetId(assetId: string): string {
  const raw = String(assetId || '').trim();
  if (!raw) return raw;

  const direct = getMarketplaceCatalogAssetById(raw, loadMarketplaceCatalogSync());
  if (direct) return direct.id;

  if (isCanonicalFavoriteAssetId(raw)) {
    const normalized = raw.toLowerCase();
    return getMarketplaceCatalogAssetById(normalized, loadMarketplaceCatalogSync())?.id || normalized;
  }

  const numericMatch = raw.match(/^\d+$/);
  if (numericMatch) {
    const candidate = `asset-${raw.padStart(3, '0')}`;
    if (getMarketplaceCatalogAssetById(candidate, loadMarketplaceCatalogSync())) return candidate;
  }

  const prefixedNumericMatch = raw.match(/^asset[-_ ]?(\d+)$/i);
  if (prefixedNumericMatch) {
    const candidate = `asset-${prefixedNumericMatch[1].padStart(3, '0')}`;
    if (getMarketplaceCatalogAssetById(candidate, loadMarketplaceCatalogSync())) return candidate;
  }

  return raw.toLowerCase();
}

function migrateFavoriteIdsToCanonical(walletAddress: string, favorites: FavoriteAsset[]): FavoriteAsset[] {
  if (!Array.isArray(favorites) || favorites.length === 0) return [];

  const deduped = mergeFavoritesPreferLocal([], favorites);
  const changed =
    deduped.length !== favorites.length ||
    deduped.some((favorite, index) => favorite.assetId !== favorites[index]?.assetId);

  if (!changed) return deduped;

  try {
    const key = getFavoritesKey(walletAddress);
    localStorage.setItem(key, JSON.stringify(deduped));
    localStorage.setItem(`${key}${FAVORITES_MIGRATION_BACKUP_SUFFIX}`, JSON.stringify(favorites));
  } catch (error) {
    console.debug('[Favorites] Canonical migration persistence skipped:', error);
  }

  return deduped;
}

async function resolveAssetUidsByDbIds(assetIds: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(assetIds.filter(Boolean)));
  if (unique.length === 0) return {};

  const cached: Record<string, string> = {};
  const missing: string[] = [];

  unique.forEach((id) => {
    const uid = getLocalSupabaseId('asset_rev', id);
    if (uid) cached[id] = uid;
    else missing.push(id);
  });

  if (missing.length === 0) return cached;

  try {
    const rows = await restSelect<DbAssetRow>(
      'assets_catalog',
      toQuery({ select: 'id,asset_uid', id: encodeIn(missing) })
    );
    rows.forEach((row) => {
      cached[row.id] = row.asset_uid;
      setLocalSupabaseId('asset', localAssetMapKey(row.asset_uid), row.id);
      setLocalSupabaseId('asset_rev', row.id, row.asset_uid);
    });
  } catch (error) {
    console.debug('[Favorites] Asset reverse lookup failed:', error);
  }

  return cached;
}

async function ensureRemoteAssetId(assetId: string): Promise<string | null> {
  const assetUid = localAssetMapKey(assetId);
  const cached = getLocalSupabaseId('asset', assetUid);
  if (cached) return cached;
  if (!isSupabaseRestEnabled()) return null;

  try {
    const rows = await restSelect<DbAssetRow>(
      'assets_catalog',
      toQuery({ select: 'id,asset_uid', asset_uid: encodeEq(assetUid), limit: '1' })
    );
    const found = rows[0];
    if (found?.id) {
      setLocalSupabaseId('asset', assetUid, found.id);
      setLocalSupabaseId('asset_rev', found.id, assetUid);
      return found.id;
    }
  } catch (error) {
    console.debug('[Favorites] Asset lookup failed:', error);
  }

  try {
    await ensureAssetMetadataSeedForIds([assetUid]);
    const rows = await restSelect<DbAssetRow>(
      'assets_catalog',
      toQuery({ select: 'id,asset_uid', asset_uid: encodeEq(assetUid), limit: '1' })
    );
    const seeded = rows[0];
    if (seeded?.id) {
      setLocalSupabaseId('asset', assetUid, seeded.id);
      setLocalSupabaseId('asset_rev', seeded.id, assetUid);
      return seeded.id;
    }
  } catch (error) {
    console.debug('[Favorites] Asset seed bridge skipped:', error);
  }

  return null;
}

async function hydrateFavoritesFromSupabase(walletAddress: string): Promise<void> {
  const key = walletKey(walletAddress);
  if (!key || favoritesHydrateInFlight.has(key) || !isSupabaseRestEnabled()) return;

  favoritesHydrateInFlight.add(key);
  try {
    const userId = getCachedRemoteProfileId(key) || await ensureRemoteProfileIdForWallet(key);
    if (!userId) return;

    const rows = await restSelect<DbFavoriteRow>(
      'user_favorites',
      toQuery({ select: 'user_id,asset_id,created_at,metadata', user_id: encodeEq(userId), order: 'created_at.desc' })
    );

    const uidByDbId = await resolveAssetUidsByDbIds(rows.map((row) => row.asset_id));
    const mapped: FavoriteAsset[] = rows
      .map((row) => ({
        assetId: toCanonicalFavoriteAssetId(
          uidByDbId[row.asset_id] || String(row.metadata?.asset_uid || row.asset_id)
        ),
        addedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      }))
      .filter((item) => Boolean(item.assetId));

    const localKey = getFavoritesKey(key);
    const existingLocal = readLocalArraySafe<FavoriteAsset>(localKey);
    if (mapped.length === 0 && existingLocal.length > 0) {
      return;
    }

    const next = mergeFavoritesPreferLocal(existingLocal, mapped);
    localStorage.setItem(localKey, JSON.stringify(next));
    dispatchSyncEvent(FAVORITES_SYNC_EVENT);
  } catch (error) {
    console.debug('[Favorites] Supabase hydrate skipped:', error);
  } finally {
    favoritesHydrateInFlight.delete(key);
  }
}

async function syncFavoritesToSupabase(walletAddress: string, favorites: FavoriteAsset[]): Promise<void> {
  if (!isSupabaseRestEnabled()) return;

  try {
    const userId = await ensureRemoteProfileIdForWallet(walletAddress);
    if (!userId) return;

    if (favorites.length === 0) {
      await restDelete('user_favorites', toQuery({ user_id: encodeEq(userId) }));
      return;
    }

    const rows = [];
    for (const favorite of favorites) {
      const assetDbId = await ensureRemoteAssetId(favorite.assetId);
      if (!assetDbId) continue;
      rows.push({
        user_id: userId,
        asset_id: assetDbId,
        metadata: { asset_uid: localAssetMapKey(favorite.assetId) },
        created_at: new Date(favorite.addedAt || Date.now()).toISOString(),
      });
    }

    if (rows.length !== favorites.length) {
      console.debug('[Favorites] Supabase sync skipped: unresolved asset IDs', {
        requested: favorites.length,
        resolved: rows.length,
      });
      return;
    }

    await restDelete('user_favorites', toQuery({ user_id: encodeEq(userId) }));
    await restUpsert('user_favorites', rows, { onConflict: 'user_id,asset_id' });
  } catch (error) {
    console.debug('[Favorites] Supabase sync skipped:', error);
  }
}

function saveFavorites(walletAddress: string, favorites: FavoriteAsset[]): void {
  try {
    if (shouldBlockGuestWrite('saveFavorites')) return;

    const key = getFavoritesKey(walletAddress);
    localStorage.setItem(key, JSON.stringify(favorites));
    dispatchSyncEvent(FAVORITES_SYNC_EVENT);

    queueSync(favoritesSyncTimers, walletKey(walletAddress), () => {
      void syncFavoritesToSupabase(walletKey(walletAddress), favorites);
    });
  } catch (error) {
    console.error('[Favorites] Failed to save:', error);
  }
}

export function loadFavorites(walletAddress: string): FavoriteAsset[] {
  try {
    const key = getFavoritesKey(walletAddress);
    const stored = localStorage.getItem(key);

    if (!stored) {
      const seeded = seedDeterministicFavoritesForTestWallet(walletAddress);
      if (seeded) {
        if (walletAddress) void hydrateFavoritesFromSupabase(walletAddress);
        return seeded;
      }
      if (walletAddress) void hydrateFavoritesFromSupabase(walletAddress);
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const migrated = migrateFavoriteIdsToCanonical(walletAddress, parsed as FavoriteAsset[]);
    if (walletAddress) void hydrateFavoritesFromSupabase(walletAddress);
    return migrated;
  } catch (error) {
    console.error('[Favorites] Failed to load:', error);
    return [];
  }
}

export function addFavorite(walletAddress: string, assetId: string): void {
  try {
    if (shouldBlockGuestWrite('addFavorite')) return;

    const canonicalAssetId = toCanonicalFavoriteAssetId(assetId);
    const favorites = loadFavorites(walletAddress);
    if (favorites.some((favorite) => favorite.assetId === canonicalAssetId)) return;

    favorites.push({
      assetId: canonicalAssetId,
      addedAt: Date.now(),
    });
    saveFavorites(walletAddress, favorites);
  } catch (error) {
    console.error('[Favorites] Failed to add:', error);
  }
}

export function removeFavorite(walletAddress: string, assetId: string): void {
  try {
    if (shouldBlockGuestWrite('removeFavorite')) return;

    const canonicalAssetId = toCanonicalFavoriteAssetId(assetId);
    const favorites = loadFavorites(walletAddress);
    const filtered = favorites.filter((favorite) => favorite.assetId !== canonicalAssetId);
    saveFavorites(walletAddress, filtered);
  } catch (error) {
    console.error('[Favorites] Failed to remove:', error);
  }
}

export function isFavorite(walletAddress: string, assetId: string): boolean {
  const canonicalAssetId = toCanonicalFavoriteAssetId(assetId);
  return loadFavorites(walletAddress).some((favorite) => favorite.assetId === canonicalAssetId);
}

export function toggleFavorite(walletAddress: string, assetId: string): boolean {
  if (isFavorite(walletAddress, assetId)) {
    removeFavorite(walletAddress, assetId);
    return false;
  }

  addFavorite(walletAddress, assetId);
  return true;
}

export function migrateFavoritesToAddressBased(walletAddress: string): void {
  try {
    if (shouldBlockGuestWrite('migrateFavoritesToAddressBased')) return;

    const newFavoritesKey = getFavoritesKey(walletAddress);
    const existing = readLocalArraySafe<FavoriteAsset>(newFavoritesKey);
    if (existing.length > 0) return;

    const legacyFavorites = readLocalArraySafe<Array<FavoriteAsset & { userAddress?: string }>>(LEGACY_FAVORITES_KEY);
    if (legacyFavorites.length === 0) return;

    const scoped = legacyFavorites
      .filter((favorite) => {
        if (!favorite?.assetId) return false;
        if (!favorite.userAddress) return true;
        return walletKey(favorite.userAddress) === walletKey(walletAddress);
      })
      .map((favorite) => ({
        assetId: toCanonicalFavoriteAssetId(favorite.assetId),
        addedAt: favorite.addedAt || Date.now(),
      }));

    if (scoped.length === 0) return;

    const migrated = mergeFavoritesPreferLocal([], scoped);
    localStorage.setItem(newFavoritesKey, JSON.stringify(migrated));
    localStorage.setItem(`${newFavoritesKey}${FAVORITES_MIGRATION_BACKUP_SUFFIX}`, JSON.stringify(legacyFavorites));
    dispatchSyncEvent(FAVORITES_SYNC_EVENT);
  } catch (error) {
    console.error('[Favorites Migration] Failed:', error);
  }
}
