import type { MarketplaceAsset } from '@/app/types/asset';
import { getWalletIdentity } from '@/utils/walletIdentityStore';
import { loadUserProfileLocalOnlySnapshot, shortenUserDisplayName } from '@/utils/profileUtils';
import { hydrateReputationFromSupabase } from '@/utils/profileReputationSync';
import {
  encodeIn,
  isSupabaseRestEnabled,
  restRpc,
  restSelect,
  toQuery,
  dispatchSyncEvent,
} from '@/utils/supabaseRest';
import {
  hydrateMarketplaceCatalogFromSupabase,
  loadMarketplaceCatalogSync,
} from '@/utils/marketplaceCatalog';

export interface SellerProfileCardData {
  address: string;
  displayName: string;
  username: string;
  bio: string;
  avatarUrl?: string;
  bannerUrl?: string;
  totalSalesEth: string;
  followers: string;
  rating: string;
  hasReviews: boolean;
  floorPriceEth: string;
  itemsListed: string;
  verified: boolean;
  isFollowing?: boolean;
  isSelf?: boolean;
  directoryRank: number;
  rankScore: number;
  rankingVersion?: string;
  personalized?: boolean;
  reasonCodes?: string[];
  metrics: {
    overallScore: number;
    totalVolume: number;
    averageRating: number;
    totalReviews: number;
    followerCount: number;
    itemsListed: number;
    floorPriceEth: number;
  };
}

type DbProfileRow = {
  id: string;
  wallet_address: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  is_verified: boolean;
  status: string | null;
};

type DbUserFollowRow = {
  following_user_id: string;
};

type SellerListingStats = {
  itemsListed: number;
  floorPriceEth: number;
};

type SellerDirectoryOptions = {
  addresses?: string[];
  marketplaceAssets?: MarketplaceAsset[];
};

export type MarketplaceProfilePageCursor = {
  score: number;
  updatedAt: string;
  userId: string;
};

export type MarketplaceProfilePageOptions = {
  limit?: number;
  cursor?: MarketplaceProfilePageCursor | null;
  searchQuery?: string;
  verifiedOnly?: boolean;
};

export type MarketplaceProfilePageResult = {
  profiles: SellerProfileCardData[];
  nextCursor: MarketplaceProfilePageCursor | null;
  hasMore: boolean;
  rankingVersion?: string;
  personalized: boolean;
};

type MarketplaceProfilePageRpcRow = {
  user_id: string | null;
  wallet_address: string | null;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  is_verified: boolean | null;
  reputation_score: number | string | null;
  total_volume: number | string | null;
  average_rating: number | string | null;
  total_reviews: number | string | null;
  follower_count: number | string | null;
  items_listed: number | string | null;
  floor_price_numeric: number | string | null;
  score: number | string | null;
  reason_codes: string[] | null;
  ranking_version: string | null;
  personalized: boolean | null;
  is_self: boolean | null;
  is_following: boolean | null;
  updated_at: string | null;
  page_has_more: boolean | null;
};

export const SELLER_DIRECTORY_SYNC_EVENT = 'orina:seller-directory-changed';

const sellerDirectoryCache = new Map<string, SellerProfileCardData>();
const sellerDirectoryHydrateInFlight = new Map<string, Promise<SellerProfileCardData[]>>();
const MARKETPLACE_PROFILE_PAGE_DEFAULT_LIMIT = 48;
const MARKETPLACE_PROFILE_PAGE_MAX_LIMIT = 96;

function normalizeAddress(address?: string | null): string {
  return String(address || '').trim().toLowerCase();
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parseMarketplacePrice(price?: string | null): number {
  const parsed = Number.parseFloat(String(price || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeProfilePageLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return MARKETPLACE_PROFILE_PAGE_DEFAULT_LIMIT;
  return Math.max(1, Math.min(Math.floor(parsed), MARKETPLACE_PROFILE_PAGE_MAX_LIMIT));
}

function normalizeProfileSearchTerm(value?: string | null): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 96);
}

function formatCompactCount(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${value}`;
}

function formatEth(value: number): string {
  if (!value || value <= 0) return '0 ETH';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K ETH`;
  return `${value.toFixed(2)} ETH`;
}

function resolveRating(address: string): Pick<SellerProfileCardData, 'rating' | 'hasReviews'> {
  const identity = getWalletIdentity(address);
  if (identity.reputation.totalReviews > 0) {
    return {
      rating: identity.reputation.averageRating.toFixed(1),
      hasReviews: true,
    };
  }

  return {
    rating: 'No reviews',
    hasReviews: false,
  };
}

function buildSellerMetrics(
  address: string,
  listingStats: Map<string, SellerListingStats>,
  followerCount?: number,
): SellerProfileCardData['metrics'] {
  const normalized = normalizeAddress(address);
  const localProfile = loadUserProfileLocalOnlySnapshot(normalized);
  const identity = getWalletIdentity(normalized);
  const listing = listingStats.get(normalized) || { itemsListed: 0, floorPriceEth: 0 };

  return {
    overallScore: Math.max(
      0,
      Math.round(identity.reputation.overallScore || 0),
    ),
    totalVolume: Math.max(0, identity.reputation.totalVolume || localProfile?.stats?.totalSales || 0),
    averageRating: Math.max(0, identity.reputation.averageRating || 0),
    totalReviews: Math.max(
      0,
      Math.round(identity.reputation.totalReviews || 0),
    ),
    followerCount: Math.max(0, followerCount ?? localProfile?.followers?.length ?? identity.social.followersCount ?? 0),
    itemsListed: Math.max(0, listing.itemsListed),
    floorPriceEth: Math.max(0, listing.floorPriceEth),
  };
}

function compareSellerProfiles(left: SellerProfileCardData, right: SellerProfileCardData): number {
  const scoreDiff = right.metrics.overallScore - left.metrics.overallScore;
  if (scoreDiff !== 0) return scoreDiff;

  if (left.verified !== right.verified) {
    return Number(right.verified) - Number(left.verified);
  }

  const reviewDiff = right.metrics.totalReviews - left.metrics.totalReviews;
  if (reviewDiff !== 0) return reviewDiff;

  const ratingDiff = right.metrics.averageRating - left.metrics.averageRating;
  if (ratingDiff !== 0) return ratingDiff;

  const volumeDiff = right.metrics.totalVolume - left.metrics.totalVolume;
  if (volumeDiff !== 0) return volumeDiff;

  const followerDiff = right.metrics.followerCount - left.metrics.followerCount;
  if (followerDiff !== 0) return followerDiff;

  const listedDiff = right.metrics.itemsListed - left.metrics.itemsListed;
  if (listedDiff !== 0) return listedDiff;

  const nameDiff = left.displayName.localeCompare(right.displayName);
  if (nameDiff !== 0) return nameDiff;

  return left.address.localeCompare(right.address);
}

function sortAndRankProfiles(profiles: SellerProfileCardData[]): SellerProfileCardData[] {
  return [...profiles]
    .sort(compareSellerProfiles)
    .map((profile, index) => ({
      ...profile,
      directoryRank: index + 1,
      rankScore: profile.metrics.overallScore,
    }));
}

function buildListingStats(assets: MarketplaceAsset[]): Map<string, SellerListingStats> {
  const stats = new Map<string, SellerListingStats>();

  for (const asset of assets) {
    const sellerAddress = normalizeAddress(asset.seller?.address);
    if (!sellerAddress) continue;

    const price = parseMarketplacePrice(asset.price);
    const current = stats.get(sellerAddress) || { itemsListed: 0, floorPriceEth: 0 };
    const nextFloorPrice =
      current.floorPriceEth > 0 && price > 0
        ? Math.min(current.floorPriceEth, price)
        : current.floorPriceEth > 0
          ? current.floorPriceEth
          : price;

    stats.set(sellerAddress, {
      itemsListed: current.itemsListed + 1,
      floorPriceEth: nextFloorPrice,
    });
  }

  return stats;
}

function buildSeedAddresses(options: SellerDirectoryOptions, assets: MarketplaceAsset[]): string[] {
  const seed: string[] = [];
  const seen = new Set<string>();

  const push = (address?: string | null) => {
    const normalized = normalizeAddress(address);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    seed.push(normalized);
  };

  const explicitAddresses = (options.addresses || []).filter(Boolean);
  explicitAddresses.forEach(push);
  if (explicitAddresses.length > 0) {
    return seed;
  }

  assets.forEach((asset) => push(asset.seller?.address));

  return seed;
}

async function fetchActiveDirectoryProfileRows(): Promise<DbProfileRow[]> {
  return restSelect<DbProfileRow>(
    'profiles',
    toQuery({
      select: 'id,wallet_address,display_name,username,bio,avatar_url,banner_url,is_verified,status',
      status: 'eq.active',
      limit: '100',
    }),
  ).catch(() => []);
}

function buildSellerProfileCard(
  address: string,
  listingStats: Map<string, SellerListingStats>,
  profileRow?: DbProfileRow | null,
  followerCount?: number,
): SellerProfileCardData {
  const normalized = normalizeAddress(address);
  const localProfile = loadUserProfileLocalOnlySnapshot(normalized);
  const identity = getWalletIdentity(normalized);
  const ratingSummary = resolveRating(normalized);
  const metrics = buildSellerMetrics(normalized, listingStats, followerCount);
  const username = profileRow?.username || localProfile?.username || `@${normalized.slice(2, 10)}`;
  const displayName =
    profileRow?.display_name ||
    localProfile?.displayName ||
    shortenUserDisplayName(normalized);
  const resolvedVerified = Boolean(profileRow?.is_verified ?? localProfile?.verified ?? identity.verification.isVerified);

  return {
    address: normalized,
    displayName,
    username,
    bio: profileRow?.bio || localProfile?.bio || '',
    avatarUrl: profileRow?.avatar_url || localProfile?.avatarUrl || localProfile?.avatar,
    bannerUrl: profileRow?.banner_url || localProfile?.bannerUrl || localProfile?.banner,
    totalSalesEth: formatEth(metrics.totalVolume),
    followers: formatCompactCount(metrics.followerCount),
    rating: ratingSummary.rating,
    hasReviews: ratingSummary.hasReviews,
    floorPriceEth: formatEth(metrics.floorPriceEth),
    itemsListed: `${metrics.itemsListed}`,
    verified: resolvedVerified,
    directoryRank: 0,
    rankScore: metrics.overallScore,
    metrics,
  };
}

function readCachedProfiles(addresses: string[], listingStats: Map<string, SellerListingStats>): SellerProfileCardData[] {
  return addresses.map((address) => {
    const cached = sellerDirectoryCache.get(address);
    if (!cached) return buildSellerProfileCard(address, listingStats);

    const listing = listingStats.get(address);
    const nextMetrics = {
      ...cached.metrics,
      itemsListed: listing?.itemsListed ?? cached.metrics.itemsListed,
      floorPriceEth:
        listing && listing.floorPriceEth > 0
          ? listing.floorPriceEth
          : cached.metrics.floorPriceEth,
    };

    return {
      ...cached,
      floorPriceEth: formatEth(nextMetrics.floorPriceEth),
      itemsListed: `${nextMetrics.itemsListed}`,
      totalSalesEth: formatEth(nextMetrics.totalVolume),
      followers: formatCompactCount(nextMetrics.followerCount),
      directoryRank: 0,
      rankScore: nextMetrics.overallScore,
      metrics: nextMetrics,
    };
  });
}

function mapMarketplaceProfilePageRow(row: MarketplaceProfilePageRpcRow, index: number): SellerProfileCardData | null {
  const address = normalizeAddress(row.wallet_address);
  if (!address) return null;

  const followerCount = Math.max(0, Math.round(toNumber(row.follower_count)));
  const itemsListed = Math.max(0, Math.round(toNumber(row.items_listed)));
  const floorPriceEth = Math.max(0, toNumber(row.floor_price_numeric));
  const totalVolume = Math.max(0, toNumber(row.total_volume));
  const averageRating = Math.max(0, toNumber(row.average_rating));
  const totalReviews = Math.max(0, Math.round(toNumber(row.total_reviews)));
  const overallScore = Math.max(0, Math.min(100, Math.round(toNumber(row.reputation_score))));
  const score = toNumber(row.score);
  const displayName = row.display_name || shortenUserDisplayName(address);
  const username = row.username || `@${address.slice(2, 10)}`;

  const profile: SellerProfileCardData = {
    address,
    displayName,
    username,
    bio: row.bio || '',
    avatarUrl: row.avatar_url || undefined,
    bannerUrl: row.banner_url || undefined,
    totalSalesEth: formatEth(totalVolume),
    followers: formatCompactCount(followerCount),
    rating: totalReviews > 0 && averageRating > 0 ? averageRating.toFixed(1) : 'No reviews',
    hasReviews: totalReviews > 0,
    floorPriceEth: formatEth(floorPriceEth),
    itemsListed: `${itemsListed}`,
    verified: row.is_verified === true,
    isFollowing: row.is_following === true,
    isSelf: row.is_self === true,
    directoryRank: index + 1,
    rankScore: score,
    rankingVersion: String(row.ranking_version || '').trim() || undefined,
    personalized: row.personalized === true,
    reasonCodes: Array.isArray(row.reason_codes) ? row.reason_codes.filter(Boolean) : [],
    metrics: {
      overallScore,
      totalVolume,
      averageRating,
      totalReviews,
      followerCount,
      itemsListed,
      floorPriceEth,
    },
  };

  sellerDirectoryCache.set(address, profile);
  return profile;
}

function filterFallbackProfilesForPage(
  profiles: SellerProfileCardData[],
  options: MarketplaceProfilePageOptions,
): SellerProfileCardData[] {
  const searchTerm = normalizeProfileSearchTerm(options.searchQuery).toLowerCase();
  let filtered = profiles;

  if (searchTerm) {
    filtered = filtered.filter((profile) => (
      profile.displayName.toLowerCase().includes(searchTerm) ||
      profile.username.toLowerCase().includes(searchTerm) ||
      profile.address.toLowerCase().includes(searchTerm)
    ));
  }

  if (options.verifiedOnly) {
    filtered = filtered.filter((profile) => profile.verified);
  }

  return filtered;
}

function updateCache(nextProfiles: SellerProfileCardData[]): void {
  let changed = false;

  for (const profile of nextProfiles) {
    const prev = sellerDirectoryCache.get(profile.address);
    if (!prev || JSON.stringify(prev) !== JSON.stringify(profile)) {
      sellerDirectoryCache.set(profile.address, profile);
      changed = true;
    }
  }

  if (changed) {
    dispatchSyncEvent(SELLER_DIRECTORY_SYNC_EVENT);
  }
}

async function resolveMarketplaceAssets(options: SellerDirectoryOptions): Promise<MarketplaceAsset[]> {
  if (Array.isArray(options.marketplaceAssets) && options.marketplaceAssets.length > 0) {
    return options.marketplaceAssets;
  }

  const cachedAssets = loadMarketplaceCatalogSync();
  if (cachedAssets.length > 0) return cachedAssets;

  return hydrateMarketplaceCatalogFromSupabase();
}

export function loadSellerDirectorySync(options: SellerDirectoryOptions = {}): SellerProfileCardData[] {
  const marketplaceAssets = options.marketplaceAssets || loadMarketplaceCatalogSync();
  const listingStats = buildListingStats(marketplaceAssets);
  const addresses = buildSeedAddresses(options, marketplaceAssets);
  if (addresses.length === 0) {
    const cachedProfiles = Array.from(sellerDirectoryCache.values());
    if (cachedProfiles.length > 0) {
      return sortAndRankProfiles(cachedProfiles);
    }
  }
  return sortAndRankProfiles(readCachedProfiles(addresses, listingStats));
}

export async function hydrateSellerDirectoryFromSupabase(
  options: SellerDirectoryOptions = {},
): Promise<SellerProfileCardData[]> {
  const marketplaceAssets = await resolveMarketplaceAssets(options);
  const listingStats = buildListingStats(marketplaceAssets);
  const explicitAddresses = (options.addresses || []).filter(Boolean);
  let addresses = buildSeedAddresses(options, marketplaceAssets);
  let profileRows: DbProfileRow[] | null = null;

  if (addresses.length === 0 && explicitAddresses.length === 0) {
    profileRows = await fetchActiveDirectoryProfileRows();
    addresses = profileRows
      .map((row) => normalizeAddress(row.wallet_address))
      .filter(Boolean);
  }

  if (addresses.length === 0) return [];

  const inFlightKey = addresses.slice().sort().join('|');
  const existing = sellerDirectoryHydrateInFlight.get(inFlightKey);
  if (existing) return existing;

  const request = (async () => {
    if (!isSupabaseRestEnabled()) {
      const fallbackProfiles = sortAndRankProfiles(readCachedProfiles(addresses, listingStats));
      updateCache(fallbackProfiles);
      return fallbackProfiles;
    }

    const resolvedProfileRows = profileRows ?? await restSelect<DbProfileRow>(
      'profiles',
      toQuery({
        select: 'id,wallet_address,display_name,username,bio,avatar_url,banner_url,is_verified,status',
        wallet_address: encodeIn(addresses),
      }),
    ).catch(() => []);

    const profileByAddress = new Map(
      resolvedProfileRows
        .filter((row) => !row.status || row.status === 'active')
        .map((row) => [normalizeAddress(row.wallet_address), row] as const),
    );

    const profileIds = resolvedProfileRows.map((row) => row.id).filter(Boolean);

    const [, followerRows] = await Promise.all([
      Promise.all(addresses.map((address) => hydrateReputationFromSupabase(address).catch(() => null))),
      profileIds.length > 0
        ? restSelect<DbUserFollowRow>(
            'user_follows',
            toQuery({
              select: 'following_user_id',
              following_user_id: encodeIn(profileIds),
            }),
          ).catch(() => [])
        : Promise.resolve([] as DbUserFollowRow[]),
    ]);

    const followerCountByProfileId = followerRows.reduce<Map<string, number>>((acc, row) => {
      const current = acc.get(row.following_user_id) || 0;
      acc.set(row.following_user_id, current + 1);
      return acc;
    }, new Map());

    const nextProfiles = addresses.map((address) => {
      const profileRow = profileByAddress.get(address);
      const followerCount = profileRow ? followerCountByProfileId.get(profileRow.id) : undefined;
      return buildSellerProfileCard(
        address,
        listingStats,
        profileRow,
        followerCount,
      );
    });

    const rankedProfiles = sortAndRankProfiles(nextProfiles);
    updateCache(rankedProfiles);
    return rankedProfiles;
  })().finally(() => {
    sellerDirectoryHydrateInFlight.delete(inFlightKey);
  });

  sellerDirectoryHydrateInFlight.set(inFlightKey, request);
  return request;
}

export async function fetchMarketplaceProfilePageFromSupabase(
  options: MarketplaceProfilePageOptions = {},
): Promise<MarketplaceProfilePageResult> {
  const limit = normalizeProfilePageLimit(options.limit);

  if (!isSupabaseRestEnabled()) {
    const fallbackProfiles = filterFallbackProfilesForPage(loadSellerDirectorySync(), options).slice(0, limit);
    return {
      profiles: fallbackProfiles,
      nextCursor: null,
      hasMore: false,
      personalized: false,
    };
  }

  try {
    const rows = await restRpc<MarketplaceProfilePageRpcRow[]>(
      'get_marketplace_profile_page_v1',
      {
        p_limit: limit,
        p_cursor_score: options.cursor?.score ?? null,
        p_cursor_updated_at: options.cursor?.updatedAt || null,
        p_cursor_user_id: options.cursor?.userId || null,
        p_search_query: normalizeProfileSearchTerm(options.searchQuery) || null,
        p_verified_only: Boolean(options.verifiedOnly),
        p_sort: 'personalized',
      },
    );

    const pageRows = Array.isArray(rows) ? rows.slice(0, limit) : [];
    const profiles = pageRows
      .map((row, index) => mapMarketplaceProfilePageRow(row, index))
      .filter((profile): profile is SellerProfileCardData => Boolean(profile));
    const lastRow = pageRows[pageRows.length - 1];

    return {
      profiles,
      nextCursor: lastRow?.user_id && lastRow?.updated_at
        ? {
            score: toNumber(lastRow.score),
            updatedAt: lastRow.updated_at,
            userId: lastRow.user_id,
          }
        : null,
      hasMore: pageRows.some((row) => row.page_has_more === true),
      rankingVersion: profiles[0]?.rankingVersion,
      personalized: profiles.some((profile) => profile.personalized === true),
    };
  } catch (error) {
    console.debug('[SellerDirectory] Profile browse RPC skipped:', error);
    const fallbackProfiles = filterFallbackProfilesForPage(loadSellerDirectorySync(), options).slice(0, limit);
    return {
      profiles: fallbackProfiles,
      nextCursor: null,
      hasMore: false,
      personalized: false,
    };
  }
}
