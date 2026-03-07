import { FavoriteAsset, WatchlistItem, WatchlistAlert, FavoriteSortOption, FavoritesStats, WatchlistStats } from '@/types/favorites';
import { AssetDetails } from '@/types/asset';
import { getMarketplaceAssetById } from '@/utils/mockMarketplaceData';
import { getTestWalletMyAssets } from '@/utils/testWalletAssetFixtures';
import { ensureAssetMetadataSeedForIds } from '@/utils/assetMetadataSync';
import { isGuestModeForced } from '@/utils/guestMode';
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

// Helper to convert AssetDetails to number price
function getAssetPrice(asset: AssetDetails): number {
  const priceStr = asset.currentPrice.replace(' ETH', '').replace(',', '');
  return parseFloat(priceStr) || 0;
}

function shouldBlockGuestWrite(op: string): boolean {
  if (!isGuestModeForced()) return false;
  console.warn(`[Favorites] Blocked guest-mode write: ${op}`);
  return true;
}

// 🔒 PHASE 1 FIX: Address-based storage for privacy isolation
const LEGACY_FAVORITES_KEY = 'studio_favorites'; // For migration
const LEGACY_WATCHLIST_KEY = 'studio_watchlist';
const LEGACY_WATCHLIST_ALERTS_KEY = 'studio_watchlist_alerts';

/**
 * Get storage keys (address-based)
 */
function getFavoritesKey(walletAddress: string): string {
  return `orina_favorites_${walletAddress.toLowerCase()}`;
}

function getWatchlistKey(walletAddress: string): string {
  return `orina_watchlist_${walletAddress.toLowerCase()}`;
}

function getWatchlistAlertsKey(walletAddress: string): string {
  return `orina_watchlist_alerts_${walletAddress.toLowerCase()}`;
}

const FAVORITES_MIGRATION_BACKUP_SUFFIX = '_backup_legacy_ids';
const FAVORITES_SYNC_EVENT = 'orina:favorites-changed';
const favoritesHydrateInFlight = new Set<string>();
const watchlistHydrateInFlight = new Set<string>();
const alertsHydrateInFlight = new Set<string>();
const favoritesSyncTimers = new Map<string, number>();
const watchlistSyncTimers = new Map<string, number>();
const alertsSyncTimers = new Map<string, number>();

type DbAssetRow = { id: string; asset_uid: string; title: string | null; category: string | null; subcategory: string | null };
type DbFavoriteRow = { user_id: string; asset_id: string; created_at: string; metadata: Record<string, any> | null };
type DbWatchlistRow = { user_id: string; asset_id: string; created_at: string; notes: string | null; metadata: Record<string, any> | null };
type DbWatchlistAlertRow = {
  id: string;
  user_id: string;
  asset_id: string;
  alert_type: string;
  threshold_value: number | null;
  payload: Record<string, any> | null;
  is_active: boolean;
  is_read: boolean;
  created_at: string;
};

function isCanonicalFavoriteAssetId(assetId: string): boolean {
  return /^asset-\d{3}$/i.test(assetId);
}

function walletKey(walletAddress: string): string {
  return String(walletAddress || '').toLowerCase();
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

function seedDeterministicFavoritesForTestWallet(walletAddress: string): FavoriteAsset[] | null {
  const fixture = getTestWalletMyAssets(walletAddress);
  if (!fixture?.favoriteListingAssetIds?.length) return null;
  const key = getFavoritesKey(walletAddress);
  const existing = readLocalArraySafe<FavoriteAsset>(key);
  if (existing.length > 0) return existing;

  const baseTs = Date.parse('2026-02-25T00:00:00Z');
  const seeded = fixture.favoriteListingAssetIds.map((assetId, index) => ({
    assetId,
    userId: walletKey(walletAddress),
    addedAt: baseTs + index * 60_000,
  }));

  try {
    localStorage.setItem(key, JSON.stringify(seeded));
    return seeded;
  } catch {
    return seeded;
  }
}

function seedDeterministicWatchlistForTestWallet(walletAddress: string): WatchlistItem[] | null {
  const fixture = getTestWalletMyAssets(walletAddress);
  if (!fixture?.watchlistListingAssetIds?.length) return null;
  const key = getWatchlistKey(walletAddress);
  const existing = readLocalArraySafe<WatchlistItem>(key);
  if (existing.length > 0) return existing;

  const baseTs = Date.parse('2026-02-25T01:00:00Z');
  const seeded = fixture.watchlistListingAssetIds.map((assetId, index) => ({
    id: `twf_watch_${walletKey(walletAddress)}_${assetId}`,
    assetId,
    userId: walletKey(walletAddress),
    addedAt: baseTs + index * 60_000,
    notes: `Fixture watchlist ${index + 1}`,
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
    byAssetId.set(canonical, { ...item, assetId: canonical, addedAt: item.addedAt || Date.now() });
  }

  for (const item of localItems) {
    if (!item?.assetId) continue;
    const canonical = toCanonicalFavoriteAssetId(item.assetId);
    const existing = byAssetId.get(canonical);
    if (!existing || (item.addedAt || 0) >= (existing.addedAt || 0)) {
      byAssetId.set(canonical, { ...item, assetId: canonical, addedAt: item.addedAt || Date.now() });
    }
  }

  return Array.from(byAssetId.values()).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

async function ensureRemoteAssetId(assetId: string): Promise<string | null> {
  const assetUid = localAssetMapKey(assetId);
  const cached = getLocalSupabaseId('asset', assetUid);
  if (cached) return cached;
  if (!isSupabaseRestEnabled()) return null;

  try {
    const rows = await restSelect<DbAssetRow>(
      'assets_catalog',
      toQuery({ select: 'id,asset_uid,title,category,subcategory', asset_uid: encodeEq(assetUid), limit: '1' })
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

  // C2.3: hardened RLS blocks client writes to assets_*; seed via bridge (service_role) first.
  try {
    await ensureAssetMetadataSeedForIds([assetUid]);
    const rows = await restSelect<DbAssetRow>(
      'assets_catalog',
      toQuery({ select: 'id,asset_uid,title,category,subcategory', asset_uid: encodeEq(assetUid), limit: '1' })
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

  const marketplace = getMarketplaceAssetById(assetUid);
  const title = marketplace?.name || `Asset ${assetUid}`;
  const category = marketplace?.category || 'Marketplace';

  try {
    const rows = await restUpsert<DbAssetRow>(
      'assets_catalog',
      [{
        asset_uid: assetUid,
        title,
        slug: assetUid,
        category,
        subcategory: null,
        description: marketplace?.description || null,
      }],
      { onConflict: 'asset_uid' }
    );
    const saved = rows[0];
    if (saved?.id) {
      setLocalSupabaseId('asset', assetUid, saved.id);
      setLocalSupabaseId('asset_rev', saved.id, assetUid);
      return saved.id;
    }
  } catch (error) {
    console.debug('[Favorites] Asset create blocked/skipped:', error);
  }
  return null;
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
      toQuery({ select: 'id,asset_uid,title,category,subcategory', id: encodeIn(missing) })
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
    const uidByDbId = await resolveAssetUidsByDbIds(rows.map((r) => r.asset_id));
    const mapped: FavoriteAsset[] = rows
      .map((row) => ({
        assetId: uidByDbId[row.asset_id] || (row.metadata?.asset_uid as string) || row.asset_id,
        userId: key,
        addedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      }))
      .filter((x) => !!x.assetId);
    const localKey = getFavoritesKey(key);
    const existingLocal = readLocalArraySafe<FavoriteAsset>(localKey);
    if (mapped.length === 0 && existingLocal.length > 0) {
      console.debug('[Favorites] Hydrate returned empty; preserving local favorites');
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

async function hydrateWatchlistFromSupabase(walletAddress: string): Promise<void> {
  const key = walletKey(walletAddress);
  if (!key || watchlistHydrateInFlight.has(key) || !isSupabaseRestEnabled()) return;
  watchlistHydrateInFlight.add(key);
  try {
    const userId = getCachedRemoteProfileId(key) || await ensureRemoteProfileIdForWallet(key);
    if (!userId) return;
    const rows = await restSelect<DbWatchlistRow>(
      'user_watchlist',
      toQuery({ select: 'user_id,asset_id,created_at,notes,metadata', user_id: encodeEq(userId), order: 'created_at.desc' })
    );
    const uidByDbId = await resolveAssetUidsByDbIds(rows.map((r) => r.asset_id));
    const mapped: WatchlistItem[] = rows
      .map((row) => {
        const assetUid = uidByDbId[row.asset_id] || row.metadata?.asset_uid;
        if (!assetUid) return null;
        return {
          id: row.metadata?.clientId || `watchlist_${assetUid}`,
          assetId: assetUid,
          userId: key,
          priceAlert: row.metadata?.priceAlert,
          notes: row.notes || row.metadata?.notes,
          addedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          lastChecked: row.metadata?.lastChecked,
        } as WatchlistItem;
      })
      .filter(Boolean) as WatchlistItem[];
    const localKey = getWatchlistKey(key);
    const existingLocal = readLocalArraySafe<WatchlistItem>(localKey);
    if (mapped.length === 0 && existingLocal.length > 0) {
      console.debug('[Watchlist] Hydrate returned empty; preserving local watchlist');
      return;
    }
    localStorage.setItem(localKey, JSON.stringify(mapped));
    dispatchSyncEvent(FAVORITES_SYNC_EVENT);
  } catch (error) {
    console.debug('[Watchlist] Supabase hydrate skipped:', error);
  } finally {
    watchlistHydrateInFlight.delete(key);
  }
}

async function hydrateWatchlistAlertsFromSupabase(walletAddress: string): Promise<void> {
  const key = walletKey(walletAddress);
  if (!key || alertsHydrateInFlight.has(key) || !isSupabaseRestEnabled()) return;
  alertsHydrateInFlight.add(key);
  try {
    const userId = getCachedRemoteProfileId(key) || await ensureRemoteProfileIdForWallet(key);
    if (!userId) return;
    const rows = await restSelect<DbWatchlistAlertRow>(
      'watchlist_alerts',
      toQuery({ select: 'id,user_id,asset_id,alert_type,threshold_value,payload,is_active,is_read,created_at', user_id: encodeEq(userId), order: 'created_at.desc' })
    );
    const uidByDbId = await resolveAssetUidsByDbIds(rows.map((r) => r.asset_id));
    const mapped: WatchlistAlert[] = rows
      .map((row) => {
        const payload = row.payload || {};
        const assetUid = uidByDbId[row.asset_id] || payload.assetId;
        if (!assetUid) return null;
        return {
          id: payload.clientAlertId || row.id,
          watchlistItemId: payload.watchlistItemId || `watchlist_${assetUid}`,
          assetId: assetUid,
          assetName: payload.assetName || `Asset ${assetUid}`,
          type: payload.type || row.alert_type || 'price_target',
          message: payload.message || 'Watchlist alert',
          currentPrice: typeof payload.currentPrice === 'number' ? payload.currentPrice : 0,
          targetPrice: typeof payload.targetPrice === 'number' ? payload.targetPrice : Number(row.threshold_value || 0),
          condition: payload.condition || 'above',
          triggeredAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          isRead: !!row.is_read,
        } as WatchlistAlert;
      })
      .filter(Boolean) as WatchlistAlert[];
    const localKey = getWatchlistAlertsKey(key);
    const existingLocal = readLocalArraySafe<WatchlistAlert>(localKey);
    if (mapped.length === 0 && existingLocal.length > 0) {
      console.debug('[Watchlist Alerts] Hydrate returned empty; preserving local alerts');
      return;
    }
    localStorage.setItem(localKey, JSON.stringify(mapped));
    dispatchSyncEvent(FAVORITES_SYNC_EVENT);
  } catch (error) {
    console.debug('[Watchlist Alerts] Supabase hydrate skipped:', error);
  } finally {
    alertsHydrateInFlight.delete(key);
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
    for (const fav of favorites) {
      const assetDbId = await ensureRemoteAssetId(fav.assetId);
      if (!assetDbId) continue;
      rows.push({
        user_id: userId,
        asset_id: assetDbId,
        metadata: { asset_uid: localAssetMapKey(fav.assetId) },
        created_at: new Date(fav.addedAt || Date.now()).toISOString(),
      });
    }
    if (rows.length !== favorites.length) {
      console.debug('[Favorites] Supabase sync skipped: unresolved asset IDs', { requested: favorites.length, resolved: rows.length });
      return;
    }
    await restDelete('user_favorites', toQuery({ user_id: encodeEq(userId) }));
    await restUpsert('user_favorites', rows, { onConflict: 'user_id,asset_id' });
  } catch (error) {
    console.debug('[Favorites] Supabase sync skipped:', error);
  }
}

async function syncWatchlistToSupabase(walletAddress: string, watchlist: WatchlistItem[]): Promise<void> {
  if (!isSupabaseRestEnabled()) return;
  try {
    const userId = await ensureRemoteProfileIdForWallet(walletAddress);
    if (!userId) return;
    if (watchlist.length === 0) {
      await restDelete('user_watchlist', toQuery({ user_id: encodeEq(userId) }));
      return;
    }
    const rows = [];
    for (const item of watchlist) {
      const assetDbId = await ensureRemoteAssetId(item.assetId);
      if (!assetDbId) continue;
      rows.push({
        user_id: userId,
        asset_id: assetDbId,
        notes: item.notes || null,
        metadata: {
          clientId: item.id,
          asset_uid: localAssetMapKey(item.assetId),
          priceAlert: item.priceAlert || null,
          lastChecked: item.lastChecked || null,
          notes: item.notes || null,
        },
        created_at: new Date(item.addedAt || Date.now()).toISOString(),
      });
    }
    if (rows.length !== watchlist.length) {
      console.debug('[Watchlist] Supabase sync skipped: unresolved asset IDs', { requested: watchlist.length, resolved: rows.length });
      return;
    }
    await restDelete('user_watchlist', toQuery({ user_id: encodeEq(userId) }));
    await restUpsert('user_watchlist', rows, { onConflict: 'user_id,asset_id' });
  } catch (error) {
    console.debug('[Watchlist] Supabase sync skipped:', error);
  }
}

async function syncWatchlistAlertsToSupabase(walletAddress: string, alerts: WatchlistAlert[]): Promise<void> {
  if (!isSupabaseRestEnabled()) return;
  try {
    const userId = await ensureRemoteProfileIdForWallet(walletAddress);
    if (!userId) return;
    if (alerts.length === 0) {
      await restDelete('watchlist_alerts', toQuery({ user_id: encodeEq(userId) }));
      return;
    }
    const rows = [];
    for (const alert of alerts) {
      const assetDbId = await ensureRemoteAssetId(alert.assetId);
      if (!assetDbId) continue;
      rows.push({
        user_id: userId,
        asset_id: assetDbId,
        alert_type: alert.type,
        threshold_value: alert.targetPrice ?? null,
        payload: {
          clientAlertId: alert.id,
          watchlistItemId: alert.watchlistItemId,
          assetId: localAssetMapKey(alert.assetId),
          assetName: alert.assetName,
          type: alert.type,
          message: alert.message,
          currentPrice: alert.currentPrice,
          targetPrice: alert.targetPrice,
          condition: alert.condition,
        },
        is_active: true,
        is_read: !!alert.isRead,
        created_at: new Date(alert.triggeredAt || Date.now()).toISOString(),
      });
    }
    if (rows.length !== alerts.length) {
      console.debug('[Watchlist Alerts] Supabase sync skipped: unresolved asset IDs', { requested: alerts.length, resolved: rows.length });
      return;
    }
    await restDelete('watchlist_alerts', toQuery({ user_id: encodeEq(userId) }));
    await restUpsert('watchlist_alerts', rows);
  } catch (error) {
    console.debug('[Watchlist Alerts] Supabase sync skipped:', error);
  }
}

function toCanonicalFavoriteAssetId(assetId: string): string {
  const raw = String(assetId || '').trim();
  if (!raw) return raw;

  const direct = getMarketplaceAssetById(raw);
  if (direct) return direct.id;

  if (isCanonicalFavoriteAssetId(raw)) {
    const normalized = raw.toLowerCase();
    return getMarketplaceAssetById(normalized)?.id || normalized;
  }

  const numericMatch = raw.match(/^\d+$/);
  if (numericMatch) {
    const candidate = `asset-${raw.padStart(3, '0')}`;
    if (getMarketplaceAssetById(candidate)) return candidate;
  }

  const prefixedNumericMatch = raw.match(/^asset[-_ ]?(\d+)$/i);
  if (prefixedNumericMatch) {
    const candidate = `asset-${prefixedNumericMatch[1].padStart(3, '0')}`;
    if (getMarketplaceAssetById(candidate)) return candidate;
  }

  return raw;
}

function migrateFavoriteIdsToCanonical(walletAddress: string, favorites: FavoriteAsset[]): FavoriteAsset[] {
  if (!Array.isArray(favorites) || favorites.length === 0) return [];

  let changed = false;
  const deduped = new Map<string, FavoriteAsset>();

  for (const fav of favorites) {
    if (!fav || typeof fav.assetId !== 'string') {
      changed = true;
      continue;
    }

    const canonicalId = toCanonicalFavoriteAssetId(fav.assetId);
    if (canonicalId !== fav.assetId) changed = true;

    const normalizedFavorite = {
      ...fav,
      assetId: canonicalId,
      addedAt: typeof fav.addedAt === 'number' ? fav.addedAt : Date.now(),
    };

    const existing = deduped.get(canonicalId);
    if (!existing) {
      deduped.set(canonicalId, normalizedFavorite);
      continue;
    }

    changed = true;
    if ((normalizedFavorite.addedAt || 0) > (existing.addedAt || 0)) {
      deduped.set(canonicalId, normalizedFavorite);
    }
  }

  const migrated = Array.from(deduped.values());
  if (migrated.length !== favorites.length) changed = true;

  if (!changed) return favorites;

  try {
    const key = getFavoritesKey(walletAddress);
    const backupKey = `${key}${FAVORITES_MIGRATION_BACKUP_SUFFIX}`;
    if (!localStorage.getItem(backupKey)) {
      localStorage.setItem(backupKey, JSON.stringify(favorites));
    }
    if (!isGuestModeForced()) {
      localStorage.setItem(key, JSON.stringify(migrated));
    }
    console.log(`[Favorites Migration] Canonicalized IDs for ${walletAddress}: ${favorites.length} -> ${migrated.length}`);
  } catch (error) {
    console.error('[Favorites Migration] Failed to persist canonical IDs:', error);
  }

  return migrated;
}

/**
 * Load favorites for a specific wallet address
 * @param walletAddress - The wallet address to load favorites for
 */
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

/**
 * Save favorites for a specific wallet address
 */
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

/**
 * Add asset to favorites
 * @param walletAddress - The wallet address
 * @param assetId - The asset ID to favorite
 */
export function addFavorite(walletAddress: string, assetId: string): void {
  try {
    if (shouldBlockGuestWrite('addFavorite')) return;
    const favorites = loadFavorites(walletAddress);
    
    // Check if already favorited
    const exists = favorites.some(fav => fav.assetId === assetId);
    
    if (!exists) {
      favorites.push({
        assetId,
        addedAt: Date.now(),
      });
      saveFavorites(walletAddress, favorites);
    }
  } catch (error) {
    console.error('[Favorites] Failed to add:', error);
  }
}

/**
 * Remove asset from favorites
 * @param walletAddress - The wallet address
 * @param assetId - The asset ID to remove
 */
export function removeFavorite(walletAddress: string, assetId: string): void {
  try {
    if (shouldBlockGuestWrite('removeFavorite')) return;
    const favorites = loadFavorites(walletAddress);
    const filtered = favorites.filter(fav => fav.assetId !== assetId);
    saveFavorites(walletAddress, filtered);
  } catch (error) {
    console.error('[Favorites] Failed to remove:', error);
  }
}

/**
 * Check if asset is favorited
 * @param walletAddress - The wallet address
 * @param assetId - The asset ID to check
 */
export function isFavorite(walletAddress: string, assetId: string): boolean {
  const favorites = loadFavorites(walletAddress);
  return favorites.some((fav) => fav.assetId === assetId);
}

/**
 * Toggle favorite status
 * @param walletAddress - The wallet address
 * @param assetId - The asset ID to toggle
 */
export function toggleFavorite(walletAddress: string, assetId: string): boolean {
  if (isFavorite(walletAddress, assetId)) {
    removeFavorite(walletAddress, assetId);
    return false;
  } else {
    addFavorite(walletAddress, assetId);
    return true;
  }
}

/**
 * Load watchlist for a user
 * @param walletAddress - The wallet address
 */
export function loadWatchlist(walletAddress: string): WatchlistItem[] {
  try {
    const key = getWatchlistKey(walletAddress);
    const stored = localStorage.getItem(key);
    if (!stored) {
      const seeded = seedDeterministicWatchlistForTestWallet(walletAddress);
      if (seeded) {
        if (walletAddress) void hydrateWatchlistFromSupabase(walletAddress);
        return seeded;
      }
      if (walletAddress) void hydrateWatchlistFromSupabase(walletAddress);
      return [];
    }
    const parsed = JSON.parse(stored);
    if (walletAddress) void hydrateWatchlistFromSupabase(walletAddress);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Watchlist] Failed to load:', error);
    return [];
  }
}

/**
 * Save watchlist for a user
 */
function saveWatchlist(walletAddress: string, watchlist: WatchlistItem[]): void {
  try {
    if (shouldBlockGuestWrite('saveWatchlist')) return;
    const key = getWatchlistKey(walletAddress);
    localStorage.setItem(key, JSON.stringify(watchlist));
    dispatchSyncEvent(FAVORITES_SYNC_EVENT);
    queueSync(watchlistSyncTimers, walletKey(walletAddress), () => {
      void syncWatchlistToSupabase(walletKey(walletAddress), watchlist);
    });
  } catch (error) {
    console.error('[Watchlist] Failed to save:', error);
  }
}

/**
 * Add asset to watchlist
 * @param walletAddress - The wallet address
 * @param assetId - The asset ID
 * @param priceAlert - Optional price alert configuration
 */
export function addToWatchlist(
  walletAddress: string,
  assetId: string,
  priceAlert?: { targetPrice: number; condition: 'above' | 'below' }
): void {
  try {
    if (shouldBlockGuestWrite('addToWatchlist')) return;
    const watchlist = loadWatchlist(walletAddress);
    
    // Check if already in watchlist
    const exists = watchlist.some(item => item.assetId === assetId);
    
    if (!exists) {
      const newItem: WatchlistItem = {
        id: `watchlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        assetId,
        priceAlert: priceAlert ? { ...priceAlert, isActive: true } : undefined,
        addedAt: Date.now(),
      };
      
      watchlist.push(newItem);
      saveWatchlist(walletAddress, watchlist);
    }
  } catch (error) {
    console.error('[Watchlist] Failed to add:', error);
  }
}

/**
 * Remove from watchlist
 * @param walletAddress - The wallet address
 * @param assetId - The asset ID to remove
 */
export function removeFromWatchlist(walletAddress: string, assetId: string): void {
  try {
    if (shouldBlockGuestWrite('removeFromWatchlist')) return;
    const watchlist = loadWatchlist(walletAddress);
    const filtered = watchlist.filter(item => item.assetId !== assetId);
    saveWatchlist(walletAddress, filtered);
  } catch (error) {
    console.error('[Watchlist] Failed to remove:', error);
  }
}

/**
 * Check if asset is in watchlist
 * @param walletAddress - The wallet address
 * @param assetId - The asset ID to check
 */
export function isInWatchlist(walletAddress: string, assetId: string): boolean {
  const watchlist = loadWatchlist(walletAddress);
  return watchlist.some((item) => item.assetId === assetId);
}

/**
 * Update watchlist item
 * @param walletAddress - The wallet address
 * @param item - The updated watchlist item
 */
export function updateWatchlistItem(walletAddress: string, item: WatchlistItem): void {
  try {
    if (shouldBlockGuestWrite('updateWatchlistItem')) return;
    const watchlist = loadWatchlist(walletAddress);
    const index = watchlist.findIndex((w: WatchlistItem) => w.id === item.id);
    
    if (index !== -1) {
      watchlist[index] = item;
      saveWatchlist(walletAddress, watchlist);
    }
  } catch (error) {
    console.error('[Watchlist] Failed to update:', error);
  }
}

/**
 * Load watchlist alerts
 * @param walletAddress - The wallet address
 */
export function loadWatchlistAlerts(walletAddress: string): WatchlistAlert[] {
  try {
    const key = getWatchlistAlertsKey(walletAddress);
    const stored = localStorage.getItem(key);
    if (!stored) {
      if (walletAddress) void hydrateWatchlistAlertsFromSupabase(walletAddress);
      return [];
    }
    const parsed = JSON.parse(stored);
    if (walletAddress) void hydrateWatchlistAlertsFromSupabase(walletAddress);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Watchlist Alerts] Failed to load:', error);
    return [];
  }
}

/**
 * Save watchlist alerts
 */
function saveWatchlistAlerts(walletAddress: string, alerts: WatchlistAlert[]): void {
  try {
    if (shouldBlockGuestWrite('saveWatchlistAlerts')) return;
    const key = getWatchlistAlertsKey(walletAddress);
    localStorage.setItem(key, JSON.stringify(alerts));
    dispatchSyncEvent(FAVORITES_SYNC_EVENT);
    queueSync(alertsSyncTimers, walletKey(walletAddress), () => {
      void syncWatchlistAlertsToSupabase(walletKey(walletAddress), alerts);
    });
  } catch (error) {
    console.error('[Watchlist Alerts] Failed to save:', error);
  }
}

/**
 * Create watchlist alert
 * @param walletAddress - The wallet address
 * @param alert - The alert to create
 */
export function createWatchlistAlert(walletAddress: string, alert: WatchlistAlert): void {
  try {
    if (shouldBlockGuestWrite('createWatchlistAlert')) return;
    const alerts = loadWatchlistAlerts(walletAddress);
    alerts.push(alert);
    saveWatchlistAlerts(walletAddress, alerts);
  } catch (error) {
    console.error('[Watchlist Alerts] Failed to create:', error);
  }
}

/**
 * Seed mock alerts for demo
 * @param walletAddress - The wallet address
 */
export function seedMockAlerts(walletAddress: string): void {
  const watchlist = loadWatchlist(walletAddress);
  if (watchlist.length === 0) return;
  
  const existingAlerts = loadWatchlistAlerts(walletAddress);
  if (existingAlerts.length > 0) return; // Already seeded
  
  // Create some mock alerts
  const mockAlerts: WatchlistAlert[] = [
    {
      id: `alert_${Date.now()}_1`,
      watchlistItemId: watchlist[0]?.id || 'mock_1',
      assetId: '1',
      assetName: 'Ethereum',
      type: 'price_target',
      message: 'Ethereum hit target price',
      currentPrice: 2.45,
      targetPrice: 2.20,
      condition: 'above',
      triggeredAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago
      isRead: false,
    },
    {
      id: `alert_${Date.now()}_2`,
      watchlistItemId: watchlist[1]?.id || 'mock_2',
      assetId: '4',
      assetName: 'Cyber Series #4201',
      type: 'price_drop',
      message: 'Cyber Series #4201 Price Drop',
      currentPrice: 4.10,
      targetPrice: 4.20,
      condition: 'below',
      triggeredAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      isRead: false,
    },
    {
      id: `alert_${Date.now()}_3`,
      watchlistItemId: watchlist[0]?.id || 'mock_3',
      assetId: '2',
      assetName: 'Bitcoin',
      type: 'price_rise',
      message: 'Bitcoin reached new high',
      currentPrice: 65000,
      targetPrice: 64000,
      condition: 'above',
      triggeredAt: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
      isRead: false,
    },
  ];
  
  const alerts = loadWatchlistAlerts(walletAddress);
  alerts.push(...mockAlerts);
  saveWatchlistAlerts(walletAddress, alerts);
}

/**
 * Mark alert as read
 * @param walletAddress - The wallet address
 * @param alertId - The alert ID to mark as read
 */
export function markAlertAsRead(walletAddress: string, alertId: string): void {
  try {
    if (shouldBlockGuestWrite('markAlertAsRead')) return;
    const alerts = loadWatchlistAlerts(walletAddress);
    const index = alerts.findIndex((a: WatchlistAlert) => a.id === alertId);
    
    if (index !== -1) {
      alerts[index].isRead = true;
      saveWatchlistAlerts(walletAddress, alerts);
    }
  } catch (error) {
    console.error('[Watchlist Alerts] Failed to mark as read:', error);
  }
}

/**
 * Sort favorites
 */
export function sortFavoriteAssets(
  assets: AssetDetails[],
  sortBy: FavoriteSortOption,
  favorites: FavoriteAsset[]
): AssetDetails[] {
  const sorted = [...assets];
  
  switch (sortBy) {
    case 'recent':
      // Sort by when they were favorited
      sorted.sort((a, b) => {
        const favA = favorites.find(f => f.assetId === a.id);
        const favB = favorites.find(f => f.assetId === b.id);
        return (favB?.addedAt || 0) - (favA?.addedAt || 0);
      });
      break;
      
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
      
    case 'price-high':
      sorted.sort((a, b) => getAssetPrice(b) - getAssetPrice(a));
      break;
      
    case 'price-low':
      sorted.sort((a, b) => getAssetPrice(a) - getAssetPrice(b));
      break;
      
    case 'change':
      sorted.sort((a, b) => (b.priceChange24h || 0) - (a.priceChange24h || 0));
      break;
  }
  
  return sorted;
}

/**
 * Calculate favorites statistics
 */
export function calculateFavoritesStats(assets: AssetDetails[]): FavoritesStats {
  const totalFavorites = assets.length;
  const totalValue = assets.reduce((sum, asset) => sum + getAssetPrice(asset), 0);
  const avgPrice = totalFavorites > 0 ? totalValue / totalFavorites : 0;
  
  const categoryBreakdown: Record<string, number> = {};
  assets.forEach((asset) => {
    categoryBreakdown[asset.category] = (categoryBreakdown[asset.category] || 0) + 1;
  });
  
  return {
    totalFavorites,
    totalValue,
    avgPrice,
    categoryBreakdown,
  };
}

/**
 * Calculate watchlist statistics
 */
export function calculateWatchlistStats(
  watchlist: WatchlistItem[],
  alerts: WatchlistAlert[],
  assets: AssetDetails[]
): WatchlistStats {
  const totalWatching = watchlist.length;
  const activeAlerts = watchlist.filter(w => w.priceAlert?.isActive).length;
  
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const triggeredToday = alerts.filter(a => a.triggeredAt > oneDayAgo).length;
  
  // Calculate price changes
  let up = 0;
  let down = 0;
  let stable = 0;
  
  assets.forEach((asset) => {
    const change = asset.priceChange24h || 0;
    if (change > 0.5) up++;
    else if (change < -0.5) down++;
    else stable++;
  });
  
  return {
    totalWatching,
    activeAlerts,
    triggeredToday,
    priceChanges: { up, down, stable },
  };
}

/**
 * Check price alerts and create notifications
 * @param walletAddress - The wallet address
 * @param watchlist - The watchlist items
 * @param assets - The assets to check
 */
export function checkPriceAlerts(
  walletAddress: string,
  watchlist: WatchlistItem[],
  assets: AssetDetails[]
): WatchlistAlert[] {
  const newAlerts: WatchlistAlert[] = [];
  
  watchlist.forEach((item) => {
    if (!item.priceAlert?.isActive) return;
    
    const asset = assets.find(a => a.id === item.assetId);
    if (!asset) return;
    
    const { targetPrice, condition } = item.priceAlert;
    let shouldAlert = false;
    
    if (condition === 'above' && getAssetPrice(asset) >= targetPrice) {
      shouldAlert = true;
    } else if (condition === 'below' && getAssetPrice(asset) <= targetPrice) {
      shouldAlert = true;
    }
    
    if (shouldAlert) {
      const alert: WatchlistAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        watchlistItemId: item.id,
        assetId: asset.id,
        assetName: asset.name,
        currentPrice: getAssetPrice(asset),
        targetPrice,
        condition,
        triggeredAt: Date.now(),
        isRead: false,
      };
      
      newAlerts.push(alert);
      createWatchlistAlert(walletAddress, alert);
      
      // Deactivate alert after triggering
      item.priceAlert.isActive = false;
      updateWatchlistItem(walletAddress, item);
    }
  });
  
  return newAlerts;
}

/**
 * Get sort option label
 */
export function getSortOptionLabel(sort: FavoriteSortOption): string {
  switch (sort) {
    case 'recent':
      return 'Recently Added';
    case 'name':
      return 'Name (A-Z)';
    case 'price-high':
      return 'Price (High to Low)';
    case 'price-low':
      return 'Price (Low to High)';
    case 'change':
      return 'Price Change (24h)';
    default:
      return sort;
  }
}

/**
 * Format price with currency
 */
export function formatPrice(price: number, currency: string = 'ETH'): string {
  return `${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${currency}`;
}

/**
 * Format percentage change
 */
export function formatPercentChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

/**
 * 🔄 MIGRATION: Migrate favorites from legacy storage to address-based storage
 * @param walletAddress - The wallet address to migrate data for
 * @param userId - The legacy userId (if available)
 */
export function migrateFavoritesToAddressBased(walletAddress: string, userId?: string): void {
  try {
    if (shouldBlockGuestWrite('migrateFavoritesToAddressBased')) return;
    console.log(`[Favorites Migration] Starting migration for ${walletAddress}`);
    
    // Check if already migrated
    const newFavoritesKey = getFavoritesKey(walletAddress);
    const existing = localStorage.getItem(newFavoritesKey);
    if (existing && JSON.parse(existing).length > 0) {
      console.log(`[Favorites Migration] Already migrated (${JSON.parse(existing).length} favorites found)`);
      return;
    }
    
    // Load from legacy global storage
    const legacyFavorites = localStorage.getItem(LEGACY_FAVORITES_KEY);
    const legacyWatchlist = localStorage.getItem(LEGACY_WATCHLIST_KEY);
    const legacyAlerts = localStorage.getItem(LEGACY_WATCHLIST_ALERTS_KEY);
    
    let migratedCount = 0;
    
    // Migrate favorites
    if (legacyFavorites) {
      const allFavorites: (FavoriteAsset & { userId?: string })[] = JSON.parse(legacyFavorites);
      
      // Filter by userId if available, otherwise take all
      const userFavorites = userId 
        ? allFavorites.filter(f => f.userId === userId)
        : allFavorites;
      
      if (userFavorites.length > 0) {
        // Remove userId field before saving
        const cleanedFavorites = userFavorites.map(({ userId, ...rest }) => rest);
        saveFavorites(walletAddress, cleanedFavorites);
        migratedCount += cleanedFavorites.length;
        console.log(`[Favorites Migration] ✅ Migrated ${cleanedFavorites.length} favorites`);
      }
    }
    
    // Migrate watchlist
    if (legacyWatchlist) {
      const allWatchlist: (WatchlistItem & { userId?: string })[] = JSON.parse(legacyWatchlist);
      
      const userWatchlist = userId
        ? allWatchlist.filter(w => w.userId === userId)
        : allWatchlist;
      
      if (userWatchlist.length > 0) {
        // Remove userId field before saving
        const cleanedWatchlist = userWatchlist.map(({ userId, ...rest }) => rest);
        saveWatchlist(walletAddress, cleanedWatchlist);
        migratedCount += cleanedWatchlist.length;
        console.log(`[Favorites Migration] ✅ Migrated ${cleanedWatchlist.length} watchlist items`);
      }
    }
    
    // Migrate alerts
    if (legacyAlerts && userId) {
      const allAlerts: WatchlistAlert[] = JSON.parse(legacyAlerts);
      const userWatchlist = loadWatchlist(walletAddress);
      const watchlistIds = new Set(userWatchlist.map(w => w.id));
      
      // Filter alerts that belong to user's watchlist items
      const userAlerts = allAlerts.filter(a => watchlistIds.has(a.watchlistItemId));
      
      if (userAlerts.length > 0) {
        saveWatchlistAlerts(walletAddress, userAlerts);
        console.log(`[Favorites Migration] ✅ Migrated ${userAlerts.length} watchlist alerts`);
      }
    }
    
    if (migratedCount > 0) {
      console.log(`[Favorites Migration] ✅ Migration complete for ${walletAddress} (${migratedCount} items)`);
    } else {
      console.log(`[Favorites Migration] No data to migrate for ${walletAddress}`);
    }
  } catch (error) {
    console.error('[Favorites Migration] Failed:', error);
  }
}
