/**
 * @deprecated Phase 3 — Hybrid wallet data: Profiles.
 * localStorage-based profile persistence (loadProfile, saveProfile)
 * should migrate to remote-first via the profiles table (see migration
 * 000003). Pure-UI helpers remain safe to use.
 * See spec: 15-local-api-audit-and-server-migration-plan.md § Phase 3
 */
import {
  UserProfile,
  ActivityItem,
  Badge,
  ProfileStats,
  ActivityFilter,
  StoryBlock,
  StoryBlockType,
  StorySettings,
  UserStoryDocument,
} from '@/types/profile';
import { AssetDetails } from '@/types/asset';
import { normalizeAddress, scopedAddress } from '@/utils/storageScope';
import { isGuestModeForced } from '@/utils/guestMode';
import {
  dispatchSyncEvent,
  encodeEq,
  encodeIn,
  isSupabaseRestEnabled,
  restDelete,
  restSelect,
  restUpsert,
  setLocalSupabaseId,
  toQuery,
} from '@/utils/supabaseRest';
import {
  ensureRemoteProfileIdForWallet as ensureRemoteProfileIdCanonical,
  getCachedRemoteProfileId as getCachedRemoteProfileIdCanonical,
} from '@/utils/profileRemoteIdentity';
import {
  appSettingsToProfileSettings,
  DEFAULT_USER_APP_SETTINGS,
  hasLocalUserAppSettings,
  hydrateUserAppSettingsFromSupabase,
  mergeProfileSettingsIntoAppSettings,
  readLocalUserAppSettings,
  saveUserAppSettings,
  saveUserProfileEmail,
  settingsRecordToAppSettings,
} from '@/utils/userSettingsUtils';

// ✅ NEW ARCHITECTURE: Address-based only, no userId concept
const ACTIVITIES_KEY = 'studio_user_activities';
export const PROFILE_SYNC_EVENT = 'orina:profile-changed';
const PROFILE_SYNC_IN_FLIGHT = new Set<string>();
const PROFILE_HYDRATE_LAST_AT = new Map<string, number>();
const PROFILE_HYDRATE_MIN_INTERVAL_MS = 15_000;
const DISPLAY_NAME_PREVIEW_LIMIT = 15;
const DEFAULT_STORY_SETTINGS: StorySettings = {
  category: '',
  tags: '',
};

function createDefaultStoryBlocks(): StoryBlock[] {
  return [];
}

function createDefaultStoryDocument(): UserStoryDocument {
  const blocks = createDefaultStoryBlocks();
  return {
    draftBlocks: blocks.map((block) => ({ ...block })),
    draftSettings: { ...DEFAULT_STORY_SETTINGS },
    publishedBlocks: blocks.map((block) => ({ ...block })),
    publishedSettings: { ...DEFAULT_STORY_SETTINGS },
    updatedAt: Date.now(),
  };
}

function normalizeStoryBlockType(value: unknown): StoryBlockType {
  if (value === 'heading' || value === 'paragraph' || value === 'image') return value;
  return 'paragraph';
}

function normalizeStoryBlocks(rawBlocks: unknown, fallback: StoryBlock[]): StoryBlock[] {
  if (!Array.isArray(rawBlocks)) {
    return fallback.map((block) => ({ ...block }));
  }

  return rawBlocks
    .filter((block): block is Record<string, unknown> => !!block && typeof block === 'object')
    .map((block, index) => ({
      id:
        typeof block.id === 'string' && block.id.trim()
          ? block.id
          : `story-${normalizeStoryBlockType(block.type)}-${index}`,
      type: normalizeStoryBlockType(block.type),
      content: typeof block.content === 'string' ? block.content : '',
    }));
}

function normalizeStorySettings(rawSettings: unknown): StorySettings {
  if (!rawSettings || typeof rawSettings !== 'object') {
    return { ...DEFAULT_STORY_SETTINGS };
  }

  return {
    category:
      typeof (rawSettings as { category?: unknown }).category === 'string' &&
      (rawSettings as { category?: string }).category?.trim()
        ? (rawSettings as { category: string }).category.trim()
        : DEFAULT_STORY_SETTINGS.category,
    tags:
      typeof (rawSettings as { tags?: unknown }).tags === 'string'
        ? (rawSettings as { tags: string }).tags.trim()
        : DEFAULT_STORY_SETTINGS.tags,
  };
}

function getLegacyShortUserDisplayName(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 5)}...${address.slice(-3)}`;
}

function getLegacyWalletDisplayName(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 7)}...${address.slice(-3)}`;
}

export function isDefaultWalletDisplayName(displayName?: string | null, address?: string | null): boolean {
  const trimmedName = String(displayName || '').trim();
  const normalizedAddress = normalizeAddress(String(address || ''));
  if (!trimmedName || !normalizedAddress) return false;

  const supportedVariants = [
    normalizedAddress,
    shortenAddress(normalizedAddress),
    getLegacyShortUserDisplayName(normalizedAddress),
    getLegacyWalletDisplayName(normalizedAddress),
  ];

  return supportedVariants.some((value) => value.toLowerCase() === trimmedName.toLowerCase());
}

export function truncateDisplayName(displayName?: string | null, maxLength: number = DISPLAY_NAME_PREVIEW_LIMIT): string {
  const trimmedName = String(displayName || '').trim();
  if (!trimmedName) return '';
  if (trimmedName.length <= maxLength) return trimmedName;
  return `${trimmedName.slice(0, maxLength)}...`;
}

export function formatUserDisplayName(
  displayName?: string | null,
  address?: string | null,
  maxLength: number = DISPLAY_NAME_PREVIEW_LIMIT
): string {
  const trimmedName = String(displayName || '').trim();
  const normalizedAddress = normalizeAddress(String(address || ''));

  if (!trimmedName) {
    return normalizedAddress ? shortenAddress(normalizedAddress) : '';
  }

  if (normalizedAddress && isDefaultWalletDisplayName(trimmedName, normalizedAddress)) {
    return shortenAddress(normalizedAddress);
  }

  return truncateDisplayName(trimmedName, maxLength);
}

/**
 * ✅ NEW: Get profile storage key from address
 */
function getProfileKey(address: string): string {
  return `user_profile_${scopedAddress(address)}`;
}

function getLegacyProfileKey(address: string): string {
  return `user_profile_${normalizeAddress(address)}`;
}

function shouldBlockGuestProfileWrite(op: string): boolean {
  if (!isGuestModeForced()) return false;
  console.warn(`[Profile] Blocked guest-mode write: ${op}`);
  return true;
}

function normalizeUserProfileShape(address: string, raw: Partial<UserProfile> | null | undefined): UserProfile {
  const normalizedAddress = normalizeAddress(address);
  const parsed = (raw && typeof raw === 'object') ? raw : {};
  const avatarValue = (parsed as any).avatarUrl || (parsed as any).avatar;
  const bannerValue = (parsed as any).bannerUrl || (parsed as any).banner;
  const rawEmailValue = typeof (parsed as any).email === 'string'
    ? (parsed as any).email.trim().toLowerCase()
    : '';
  const emailValue = rawEmailValue || undefined;
  const usernameValue = typeof (parsed as any).username === 'string' && (parsed as any).username.trim()
    ? (parsed as any).username
    : `@${normalizedAddress.slice(2, 10)}`;
  const rawDisplayNameValue = typeof (parsed as any).displayName === 'string'
    ? (parsed as any).displayName.trim()
    : '';
  const displayNameValue = rawDisplayNameValue
    ? (isDefaultWalletDisplayName(rawDisplayNameValue, normalizedAddress)
      ? shortenUserDisplayName(normalizedAddress)
      : rawDisplayNameValue)
    : shortenUserDisplayName(normalizedAddress);
  const canonicalProfileSettings = hasLocalUserAppSettings(normalizedAddress)
    ? appSettingsToProfileSettings(
        settingsRecordToAppSettings(readLocalUserAppSettings(normalizedAddress))
      )
    : undefined;
  const defaultStory = createDefaultStoryDocument();
  const rawStory = (parsed as any).story;
  const normalizedStory: UserStoryDocument = {
    draftBlocks: normalizeStoryBlocks(rawStory?.draftBlocks, defaultStory.draftBlocks),
    draftSettings: normalizeStorySettings(rawStory?.draftSettings),
    publishedBlocks: normalizeStoryBlocks(rawStory?.publishedBlocks, defaultStory.publishedBlocks),
    publishedSettings: normalizeStorySettings(rawStory?.publishedSettings),
    updatedAt:
      typeof rawStory?.updatedAt === 'number' && Number.isFinite(rawStory.updatedAt)
        ? rawStory.updatedAt
        : defaultStory.updatedAt,
    publishedAt:
      typeof rawStory?.publishedAt === 'number' && Number.isFinite(rawStory.publishedAt)
        ? rawStory.publishedAt
        : undefined,
  };

  return {
    ...createDefaultProfile(normalizedAddress),
    ...(parsed as any),
    id: normalizeAddress(((parsed as any).id || normalizedAddress) as string),
    address: normalizedAddress,
    username: usernameValue,
    displayName: displayNameValue,
    email: emailValue,
    avatar: avatarValue,
    banner: bannerValue,
    avatarUrl: avatarValue,
    bannerUrl: bannerValue,
    socialLinks: (parsed as any).socialLinks || {},
    followers: Array.isArray((parsed as any).followers) ? (parsed as any).followers.map(normalizeAddress).filter(Boolean) : [],
    following: Array.isArray((parsed as any).following) ? (parsed as any).following.map(normalizeAddress).filter(Boolean) : [],
    badges: Array.isArray((parsed as any).badges) ? (parsed as any).badges : [],
    story: normalizedStory,
    settings: canonicalProfileSettings || (parsed as any).settings || createDefaultProfile(normalizedAddress).settings,
  };
}

function loadUserProfileLocalOnly(address: string): UserProfile | null {
  try {
    const key = getProfileKey(address);
    const legacyKey = getLegacyProfileKey(address);
    const stored = localStorage.getItem(key) || localStorage.getItem(legacyKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return null;

    const normalized = normalizeAddress(address);
    const repaired = normalizeUserProfileShape(normalized, parsed);
    if (!isGuestModeForced()) {
      localStorage.setItem(key, JSON.stringify(repaired));
      if (legacyKey !== key) localStorage.removeItem(legacyKey);
    }
    return repaired;
  } catch (error) {
    console.error('Failed to load user profile:', error);
    return null;
  }
}

function areProfilesEquivalent(a: UserProfile | null | undefined, b: UserProfile | null | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  try {
    return JSON.stringify(normalizeUserProfileShape(a.address, a)) === JSON.stringify(normalizeUserProfileShape(b.address, b));
  } catch {
    return false;
  }
}

function saveUserProfileLocalOnly(profile: UserProfile): UserProfile {
  const repaired = normalizeUserProfileShape(profile.address, profile);
  localStorage.setItem(getProfileKey(repaired.address), JSON.stringify(repaired));
  return repaired;
}

function profileMapKey(address: string): string {
  return normalizeAddress(address);
}

type DbProfileRow = {
  id: string;
  wallet_address: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  avatar_type: string | null;
  website: string | null;
  twitter: string | null;
  discord: string | null;
  telegram: string | null;
  is_verified: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

type DbUserPreferencesRow = {
  user_id: string;
  notification_settings: Record<string, any>;
  ui_preferences: Record<string, any>;
  privacy_settings: Record<string, any>;
};

type DbProfileStoryRow = {
  user_id: string;
  story_document: Record<string, any>;
};

type DbUserBadgeRow = {
  user_id: string;
  badge_key: string;
};

function mapDbProfileToLocal(
  address: string,
  row: DbProfileRow,
  storyRow?: DbProfileStoryRow | null,
  prefsRow?: DbUserPreferencesRow | null,
  badgeRows?: DbUserBadgeRow[],
  followers?: string[],
  following?: string[],
  canonicalSettings?: ReturnType<typeof settingsRecordToAppSettings>,
  canonicalProfileEmail?: string
): UserProfile {
  const base = loadUserProfileLocalOnly(address) || createDefaultProfile(address);
  const nextSettings = canonicalSettings || base.settings;
  const remoteStory = storyRow?.story_document || prefsRow?.ui_preferences?.story_document;
  const hasRemoteEmail =
    !!prefsRow?.ui_preferences &&
    Object.prototype.hasOwnProperty.call(prefsRow.ui_preferences, 'profile_email');
  const remoteEmail = hasRemoteEmail
    ? (typeof prefsRow?.ui_preferences?.profile_email === 'string'
      ? prefsRow.ui_preferences.profile_email
      : undefined)
    : undefined;

  return normalizeUserProfileShape(address, {
    ...base,
    id: normalizeAddress(address),
    address: normalizeAddress(address),
    username: row.username || base.username,
    displayName: row.display_name || base.displayName,
    bio: row.bio ?? base.bio,
    avatar: row.avatar_url ?? base.avatar,
    banner: row.banner_url ?? base.banner,
    avatarUrl: row.avatar_url ?? base.avatarUrl,
    bannerUrl: row.banner_url ?? base.bannerUrl,
    email: canonicalProfileEmail || remoteEmail || base.email,
    verified: !!row.is_verified,
    socialLinks: {
      ...(base.socialLinks || {}),
      website: row.website || undefined,
      twitter: row.twitter || undefined,
      discord: row.discord || undefined,
      telegram: row.telegram || undefined,
    },
    settings: nextSettings || base.settings,
    story: remoteStory ?? base.story,
    badges: badgeRows?.map((b) => b.badge_key) ?? base.badges,
    followers: followers ?? base.followers,
    following: following ?? base.following,
  });
}

function profileRowFromLocal(profile: UserProfile): Partial<DbProfileRow> {
  return {
    wallet_address: normalizeAddress(profile.address),
    display_name: profile.displayName || null,
    username: profile.username || null,
    bio: profile.bio || null,
    avatar_url: profile.avatarUrl || profile.avatar || null,
    banner_url: profile.bannerUrl || profile.banner || null,
    avatar_type: (profile as any).avatarType || null,
    website: profile.socialLinks?.website || null,
    twitter: profile.socialLinks?.twitter || null,
    discord: profile.socialLinks?.discord || null,
    telegram: profile.socialLinks?.telegram || null,
  };
}

async function fetchWalletsByProfileIds(profileIds: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(profileIds.filter(Boolean)));
  if (unique.length === 0) return {};
  try {
    const rows = await restSelect<{ id: string; wallet_address: string }>(
      'profiles',
      toQuery({
        select: 'id,wallet_address',
        id: encodeIn(unique),
      })
    );
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.id] = normalizeAddress(row.wallet_address);
      return acc;
    }, {});
  } catch {
    return {};
  }
}

async function ensureRemoteProfileId(address: string, seedProfile?: UserProfile): Promise<string | null> {
  const normalized = normalizeAddress(address);
  if (!normalized || !isSupabaseRestEnabled()) return null;
  return ensureRemoteProfileIdCanonical(normalized);
}

async function hydrateProfileFromSupabase(address: string): Promise<void> {
  const normalized = normalizeAddress(address);
  if (!normalized || PROFILE_SYNC_IN_FLIGHT.has(normalized) || !isSupabaseRestEnabled()) return;

  PROFILE_SYNC_IN_FLIGHT.add(normalized);
  try {
    const canonicalSettingsRecord = await hydrateUserAppSettingsFromSupabase(normalized)
      .catch(() => readLocalUserAppSettings(normalized));
    const canonicalSettings = settingsRecordToAppSettings(canonicalSettingsRecord);
    const rows = await restSelect<DbProfileRow>(
      'profiles',
      toQuery({ select: '*', wallet_address: encodeEq(normalized), limit: '1' })
    );
    const row = rows[0];
    if (!row) return;

    setLocalSupabaseId('profile', profileMapKey(normalized), row.id);

    const [storyRows, prefsRows, badgeRows, followingRows, followerRows] = await Promise.all([
      restSelect<DbProfileStoryRow>('profile_story_documents', toQuery({ select: 'user_id,story_document', user_id: encodeEq(row.id), limit: '1' })).catch(() => []),
      restSelect<DbUserPreferencesRow>('user_preferences', toQuery({ select: '*', user_id: encodeEq(row.id), limit: '1' })).catch(() => []),
      restSelect<DbUserBadgeRow>('user_badges', toQuery({ select: 'user_id,badge_key', user_id: encodeEq(row.id) })).catch(() => []),
      restSelect<{ following_user_id: string }>('user_follows', toQuery({ select: 'following_user_id', follower_user_id: encodeEq(row.id) })).catch(() => []),
      restSelect<{ follower_user_id: string }>('user_follows', toQuery({ select: 'follower_user_id', following_user_id: encodeEq(row.id) })).catch(() => []),
    ]);

    const followIds = [
      ...followingRows.map((x) => x.following_user_id),
      ...followerRows.map((x) => x.follower_user_id),
    ];
    const walletById = await fetchWalletsByProfileIds(followIds);

    const merged = mapDbProfileToLocal(
      normalized,
      row,
      storyRows[0] || null,
      prefsRows[0] || null,
      badgeRows,
      followerRows.map((x) => walletById[x.follower_user_id]).filter(Boolean),
      followingRows.map((x) => walletById[x.following_user_id]).filter(Boolean),
      appSettingsToProfileSettings(canonicalSettings),
      canonicalSettingsRecord.profileEmail
    );

    const currentLocal = loadUserProfileLocalOnly(normalized);
    if (!areProfilesEquivalent(currentLocal, merged)) {
      saveUserProfileLocalOnly(merged);
      dispatchSyncEvent(PROFILE_SYNC_EVENT);
    }
    PROFILE_HYDRATE_LAST_AT.set(normalized, Date.now());
  } catch (error) {
    console.debug('[Profile] Remote hydrate skipped:', error);
  } finally {
    PROFILE_SYNC_IN_FLIGHT.delete(normalized);
  }
}

async function syncProfileToSupabase(profile: UserProfile): Promise<void> {
  if (!isSupabaseRestEnabled()) return;
  const normalized = normalizeAddress(profile.address);
  if (!normalized) return;

  const local = normalizeUserProfileShape(normalized, profile);
  const remoteProfileId = await ensureRemoteProfileId(normalized, local);
  if (!remoteProfileId) return;

  try {
    await restUpsert<DbProfileRow>(
      'profiles',
      [profileRowFromLocal(local)],
      { onConflict: 'wallet_address' }
    );
  } catch (error) {
    console.debug('[Profile] Remote profile sync failed:', error);
    return;
  }

  try {
    const badgeKeys = Array.from(new Set((local.badges || []).filter(Boolean)));
    if (badgeKeys.length > 0) {
      await restUpsert(
        'user_badges',
        badgeKeys.map((badgeKey) => ({
          user_id: remoteProfileId,
          badge_key: badgeKey,
        })),
        { onConflict: 'user_id,badge_key' }
      );
    }
  } catch (error) {
    console.debug('[Profile] Remote badges sync skipped:', error);
  }

  try {
    await restUpsert(
      'profile_story_documents',
      [{
        user_id: remoteProfileId,
        story_document: local.story,
      }],
      { onConflict: 'user_id' }
    );
  } catch (error) {
    console.debug('[Profile] Remote story sync failed:', error);
  }

}

async function syncFollowRelation(currentAddress: string, targetAddress: string, follow: boolean): Promise<void> {
  if (!isSupabaseRestEnabled()) return;
  const currentLocal = loadUserProfileLocalOnly(currentAddress) || createDefaultProfile(currentAddress);
  const targetLocal = loadUserProfileLocalOnly(targetAddress) || createDefaultProfile(targetAddress);
  const [currentId, targetId] = await Promise.all([
    ensureRemoteProfileId(currentAddress, currentLocal),
    ensureRemoteProfileId(targetAddress, targetLocal),
  ]);
  if (!currentId || !targetId) return;

  try {
    if (follow) {
      await restUpsert(
        'user_follows',
        [{ follower_user_id: currentId, following_user_id: targetId }],
        { onConflict: 'follower_user_id,following_user_id' }
      );
    } else {
      await restDelete(
        'user_follows',
        toQuery({
          follower_user_id: encodeEq(currentId),
          following_user_id: encodeEq(targetId),
        })
      );
    }
  } catch (error) {
    console.debug('[Profile] Remote follow sync skipped:', error);
  }
}

export function getCachedRemoteProfileId(address: string): string | null {
  return getCachedRemoteProfileIdCanonical(address);
}

export async function ensureRemoteProfileIdForWallet(address: string): Promise<string | null> {
  return ensureRemoteProfileIdCanonical(address);
}

/**
 * ✅ NEW: Load user profile by wallet address (ONLY method)
 */
export function loadUserProfile(address: string): UserProfile | null {
  const normalized = normalizeAddress(address);
  const profile = loadUserProfileLocalOnly(normalized);
  if (!isGuestModeForced()) {
    const lastHydratedAt = PROFILE_HYDRATE_LAST_AT.get(normalized) || 0;
    if (Date.now() - lastHydratedAt >= PROFILE_HYDRATE_MIN_INTERVAL_MS) {
      PROFILE_HYDRATE_LAST_AT.set(normalized, Date.now());
      void hydrateProfileFromSupabase(normalized);
    }
  }
  return profile;
}

export function loadUserProfileLocalOnlySnapshot(address: string): UserProfile | null {
  return loadUserProfileLocalOnly(normalizeAddress(address));
}

export async function forceHydrateProfileFromSupabase(address: string): Promise<void> {
  const normalized = normalizeAddress(address);
  if (!normalized || isGuestModeForced()) return;
  PROFILE_HYDRATE_LAST_AT.set(normalized, 0);
  await hydrateProfileFromSupabase(normalized);
}

/**
 * ✅ NEW: Save user profile by wallet address
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    if (!profile.address) {
      console.error('Cannot save profile without wallet address');
      return;
    }
    const normalizedAddress = normalizeAddress(profile.address);
    const normalizedProfile = normalizeUserProfileShape(normalizedAddress, profile);
    const currentCanonicalRecord = readLocalUserAppSettings(normalizedAddress);
    const currentCanonical = settingsRecordToAppSettings(currentCanonicalRecord);
    const nextCanonical = mergeProfileSettingsIntoAppSettings(currentCanonical, normalizedProfile.settings);
    if ((currentCanonicalRecord.profileEmail || undefined) !== normalizedProfile.email) {
      await saveUserProfileEmail(normalizedAddress, normalizedProfile.email).catch(() => undefined);
    }
    await saveUserAppSettings(normalizedAddress, nextCanonical).catch(() => undefined);

    // Server-first: persist to Supabase, then cache locally
    const repaired = normalizeUserProfileShape(normalizedAddress, {
      ...normalizedProfile,
      address: normalizedAddress,
      settings: appSettingsToProfileSettings(nextCanonical),
    });
    if (!isGuestModeForced()) {
      await syncProfileToSupabase(repaired);
    }
    saveUserProfileLocalOnly(repaired);
    dispatchSyncEvent(PROFILE_SYNC_EVENT);
  } catch (error) {
    console.error('Failed to save user profile:', error);
  }
}

export function saveUserProfileSnapshot(profile: UserProfile): void {
  try {
    if (!profile.address) {
      console.error('Cannot save profile snapshot without wallet address');
      return;
    }
    saveUserProfileLocalOnly(profile);
    dispatchSyncEvent(PROFILE_SYNC_EVENT);
  } catch (error) {
    console.error('Failed to save user profile snapshot:', error);
  }
}

/**
 * ✅ NEW: Create default user profile (address-based)
 */
export function createDefaultProfile(address: string): UserProfile {
  const normalized = normalizeAddress(address);
  return {
    id: normalized, // Use address as ID
    address: normalized,
    username: `@${address.slice(2, 10)}`,
    displayName: shortenUserDisplayName(address),
    email: undefined,
    bio: undefined,
    avatar: undefined,
    banner: undefined,
    socialLinks: {},
    stats: {
      assetsOwned: 0,
      totalSpent: 0,
      totalSales: 0,
      totalVolume: 0,
      joinedDate: Date.now(),
      lastActive: Date.now(),
    },
    followers: [],
    following: [],
    badges: [],
    story: createDefaultStoryDocument(),
    settings: appSettingsToProfileSettings(DEFAULT_USER_APP_SETTINGS),
    verified: false,
  };
}

/**
 * ✅ NEW: Update user profile
 */
export function updateUserProfile(address: string, updates: Partial<UserProfile>): UserProfile {
  const profile = loadUserProfile(address) || createDefaultProfile(address);
  const updated = normalizeUserProfileShape(address, { ...profile, ...updates, address: normalizeAddress(address) });
  saveUserProfile(updated);
  return updated;
}

/**
 * ✅ NEW: Load user activities by address
 */
export function loadUserActivities(address: string): ActivityItem[] {
  try {
    const stored = localStorage.getItem(`${ACTIVITIES_KEY}_${normalizeAddress(address)}`);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load user activities:', error);
    return [];
  }
}

/**
 * ✅ NEW: Save user activities by address
 */
export function saveUserActivities(address: string, activities: ActivityItem[]): void {
  try {
    if (shouldBlockGuestProfileWrite('saveUserActivities')) return;
    localStorage.setItem(`${ACTIVITIES_KEY}_${normalizeAddress(address)}`, JSON.stringify(activities));
  } catch (error) {
    console.error('Failed to save user activities:', error);
  }
}

/**
 * Add activity
 */
export function addActivity(activity: ActivityItem): void {
  if (!activity.userId) return; // userId here represents the wallet address
  if (shouldBlockGuestProfileWrite('addActivity')) return;
  const activities = loadUserActivities(activity.userId);
  activities.unshift(activity); // Add to beginning
  saveUserActivities(activity.userId, activities);
}

/**
 * Filter activities
 */
export function filterActivities(activities: ActivityItem[], filter: ActivityFilter): ActivityItem[] {
  if (filter === 'all') return activities;
  return activities.filter(activity => activity.type === filter);
}

/**
 * Calculate profile statistics
 */
export function calculateProfileStats(
  activities: ActivityItem[],
  ownedAssets: AssetDetails[]
): ProfileStats {
  const purchases = activities.filter(a => a.type === 'purchase');
  const sales = activities.filter(a => a.type === 'sale');
  
  const totalSpent = purchases.reduce((sum, a) => sum + (a.price || 0), 0);
  const totalSales = sales.reduce((sum, a) => sum + (a.price || 0), 0);
  const totalProfit = totalSales - totalSpent;
  
  const portfolioValue = ownedAssets.reduce((sum, asset) => {
    const price = parseFloat(asset.currentPrice.replace(' ETH', '')) || 0;
    return sum + price;
  }, 0);
  
  const avgPurchasePrice = purchases.length > 0 ? totalSpent / purchases.length : 0;
  const avgSalePrice = sales.length > 0 ? totalSales / sales.length : 0;
  
  const mostExpensivePurchase = purchases.reduce((max, a) => {
    return (a.price || 0) > (max.price || 0) ? a : max;
  }, purchases[0] || { assetName: 'N/A', price: 0 });
  
  // Category breakdown
  const categoryCount: Record<string, number> = {};
  ownedAssets.forEach(asset => {
    categoryCount[asset.category] = (categoryCount[asset.category] || 0) + 1;
  });
  
  const topCategory = Object.entries(categoryCount)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
  
  return {
    portfolioValue,
    totalSpent,
    totalSales,
    totalProfit,
    assetsOwned: ownedAssets.length,
    assetsSold: sales.length,
    avgPurchasePrice,
    avgSalePrice,
    mostExpensivePurchase: {
      assetName: mostExpensivePurchase.assetName,
      price: mostExpensivePurchase.price || 0,
    },
    topCategory,
  };
}

/**
 * ✅ NEW: Follow user by address
 */
export function followUser(currentAddress: string, targetAddress: string): void {
  if (shouldBlockGuestProfileWrite('followUser')) return;
  const normalizedCurrent = normalizeAddress(currentAddress);
  const normalizedTarget = normalizeAddress(targetAddress);

  if (!normalizedCurrent || !normalizedTarget || normalizedCurrent === normalizedTarget) return;

  const profile = loadUserProfile(normalizedCurrent) || createDefaultProfile(normalizedCurrent);
  const targetProfile = loadUserProfile(normalizedTarget) || createDefaultProfile(normalizedTarget);

  if (!profile.following.includes(normalizedTarget)) {
    profile.following.push(normalizedTarget);
    saveUserProfileSnapshot(profile);
  }

  if (!targetProfile.followers.includes(normalizedCurrent)) {
    targetProfile.followers.push(normalizedCurrent);
    saveUserProfileSnapshot(targetProfile);
  }
  if (!isGuestModeForced()) {
    void syncFollowRelation(normalizedCurrent, normalizedTarget, true);
  }
}

/**
 * ✅ NEW: Unfollow user by address
 */
export function unfollowUser(currentAddress: string, targetAddress: string): void {
  if (shouldBlockGuestProfileWrite('unfollowUser')) return;
  const normalizedCurrent = normalizeAddress(currentAddress);
  const normalizedTarget = normalizeAddress(targetAddress);
  if (!normalizedCurrent || !normalizedTarget || normalizedCurrent === normalizedTarget) return;

  const profile = loadUserProfile(normalizedCurrent) || createDefaultProfile(normalizedCurrent);
  profile.following = profile.following.filter(addr => addr !== normalizedTarget);
  saveUserProfileSnapshot(profile);
  
  // Remove from target's followers
  const targetProfile = loadUserProfile(normalizedTarget);
  if (targetProfile) {
    targetProfile.followers = targetProfile.followers.filter(addr => addr !== normalizedCurrent);
    saveUserProfileSnapshot(targetProfile);
  }
  if (!isGuestModeForced()) {
    void syncFollowRelation(normalizedCurrent, normalizedTarget, false);
  }
}

/**
 * ✅ NEW: Check if following by address
 */
export function isFollowing(currentAddress: string, targetAddress: string): boolean {
  const profile = loadUserProfile(normalizeAddress(currentAddress));
  if (!profile) return false;
  return profile.following.includes(normalizeAddress(targetAddress));
}

/**
 * Get available badges
 */
export function getAvailableBadges(): Badge[] {
  return [
    {
      id: 'early_adopter',
      name: 'Early Adopter',
      description: 'Joined in the first month',
      icon: '🌟',
      rarity: 'rare',
    },
    {
      id: 'collector',
      name: 'Collector',
      description: 'Own 10+ assets',
      icon: '🎨',
      rarity: 'common',
    },
    {
      id: 'trader',
      name: 'Active Trader',
      description: 'Complete 50+ transactions',
      icon: '💎',
      rarity: 'rare',
    },
    {
      id: 'whale',
      name: 'Whale',
      description: 'Portfolio value > 100 ETH',
      icon: '🐋',
      rarity: 'epic',
    },
    {
      id: 'verified',
      name: 'Verified User',
      description: 'Verified account',
      icon: '✓',
      rarity: 'rare',
    },
    {
      id: 'creator',
      name: 'Creator',
      description: 'Minted 5+ assets',
      icon: '✨',
      rarity: 'common',
    },
    {
      id: 'influencer',
      name: 'Influencer',
      description: '100+ followers',
      icon: '🔥',
      rarity: 'epic',
    },
    {
      id: 'legend',
      name: 'Legend',
      description: 'Achieved legendary status',
      icon: '👑',
      rarity: 'legendary',
    },
  ];
}

/**
 * ✅ NEW: Check and award badges (address-based)
 */
export function checkAndAwardBadges(address: string, activities: ActivityItem[], ownedAssets: AssetDetails[]): string[] {
  if (shouldBlockGuestProfileWrite('checkAndAwardBadges')) return [];
  const profile = loadUserProfile(address);
  if (!profile) return [];
  
  const newBadges: string[] = [];
  const availableBadges = getAvailableBadges();
  
  // Early adopter - joined in first 30 days (mock)
  const daysSinceJoin = (Date.now() - profile.stats.joinedDate) / (1000 * 60 * 60 * 24);
  if (daysSinceJoin < 30 && !profile.badges.includes('early_adopter')) {
    newBadges.push('early_adopter');
  }
  
  // Collector - own 10+ assets
  if (ownedAssets.length >= 10 && !profile.badges.includes('collector')) {
    newBadges.push('collector');
  }
  
  // Trader - 50+ transactions
  if (activities.length >= 50 && !profile.badges.includes('trader')) {
    newBadges.push('trader');
  }
  
  // Whale - portfolio > 100 ETH
  const portfolioValue = ownedAssets.reduce((sum, asset) => {
    const price = parseFloat(asset.currentPrice.replace(' ETH', '')) || 0;
    return sum + price;
  }, 0);
  if (portfolioValue >= 100 && !profile.badges.includes('whale')) {
    newBadges.push('whale');
  }
  
  // Verified
  if (profile.verified && !profile.badges.includes('verified')) {
    newBadges.push('verified');
  }
  
  // Creator - minted 5+ assets
  const mints = activities.filter(a => a.type === 'mint').length;
  if (mints >= 5 && !profile.badges.includes('creator')) {
    newBadges.push('creator');
  }
  
  // Influencer - 100+ followers
  if (profile.followers.length >= 100 && !profile.badges.includes('influencer')) {
    newBadges.push('influencer');
  }
  
  // Update profile with new badges
  if (newBadges.length > 0) {
    profile.badges = [...profile.badges, ...newBadges];
    saveUserProfile(profile);
  }
  
  return newBadges;
}

/**
 * Get badge rarity color
 */
export function getBadgeRarityColor(rarity: Badge['rarity']): string {
  switch (rarity) {
    case 'common':
      return 'text-zinc-400 bg-zinc-800/50';
    case 'rare':
      return 'text-blue-400 bg-blue-500/10';
    case 'epic':
      return 'text-purple-400 bg-purple-500/10';
    case 'legendary':
      return 'text-yellow-400 bg-yellow-500/10';
    default:
      return 'text-zinc-400 bg-zinc-800/50';
  }
}

/**
 * Format activity type label
 */
export function getActivityTypeLabel(type: ActivityItem['type']): string {
  switch (type) {
    case 'mint':
      return 'Minted';
    case 'purchase':
      return 'Purchased';
    case 'sale':
      return 'Sold';
    case 'transfer':
      return 'Transferred';
    case 'list':
      return 'Listed';
    case 'offer':
      return 'Made Offer';
    default:
      return type;
  }
}

/**
 * Get activity type color
 */
export function getActivityTypeColor(type: ActivityItem['type']): string {
  switch (type) {
    case 'mint':
      return 'text-purple-400 bg-purple-500/10';
    case 'purchase':
      return 'text-green-400 bg-green-500/10';
    case 'sale':
      return 'text-blue-400 bg-blue-500/10';
    case 'transfer':
      return 'text-yellow-400 bg-yellow-500/10';
    case 'list':
      return 'text-orange-400 bg-orange-500/10';
    case 'offer':
      return 'text-pink-400 bg-pink-500/10';
    default:
      return 'text-zinc-400 bg-zinc-800/50';
  }
}

/**
 * ✅ NEW: Generate mock activities (address-based)
 */
export function generateMockActivities(address: string, count: number = 20): ActivityItem[] {
  const types: ActivityItem['type'][] = ['mint', 'purchase', 'sale', 'transfer', 'list', 'offer'];
  const activities: ActivityItem[] = [];
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const assetId = `${Math.floor(Math.random() * 100)}`;
    
    activities.push({
      id: `activity_${Date.now()}_${i}`,
      userId: address, // userId represents wallet address
      type,
      assetId,
      assetName: `Asset #${assetId}`,
      assetImage: 'luxury asset premium',
      price: ['purchase', 'sale', 'offer'].includes(type) 
        ? Math.random() * 10 + 0.5 
        : undefined,
      from: type === 'purchase' ? '0x1234...5678' : undefined,
      to: type === 'sale' ? '0x8765...4321' : undefined,
      timestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000, // Last 30 days
      txHash: `0x${Math.random().toString(36).substr(2, 64)}`,
      status: 'completed',
    });
  }
  
  return activities.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Shorten address
 */
export function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Shorten address for user display name (5 chars ... 3 chars)
 */
export function shortenUserDisplayName(address: string): string {
  if (!address) return '';
  return shortenAddress(address);
}

/**
 * Format number with suffix
 */
export function formatNumberWithSuffix(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

/**
 * ✅ NEW: Validate wallet address format
 */
export function isValidWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * ✅ NEW: Migration utility - clean up old userId-based profiles
 * This should be called once on app startup
 */
export function migrateOldProfiles(): void {
  let cleaned = 0;
  
  // Find and remove old profile keys (studio_user_profile_user_*)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('studio_user_profile_user_')) {
      localStorage.removeItem(key);
      cleaned++;
    }
  }
  
  // Remove old mapping table
  localStorage.removeItem('studio_address_to_userid');
  
  console.log(`✅ [Migration] Cleanup complete. Removed ${cleaned} old profiles.`);
}
