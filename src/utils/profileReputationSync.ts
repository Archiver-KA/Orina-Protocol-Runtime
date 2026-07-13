import type { ActivityItem } from '@/types/profile';
import type { DisputeRecord, Rating, ReputationScore } from '@/types/reputation';
import { ensureRemoteProfileIdForWallet } from '@/utils/profileRemoteIdentity';
import { loadUserProfile } from '@/utils/profileUtils';
import {
  calculateReputationScore,
  getReputationLevel,
  loadRatings,
  loadReputationScore,
  saveRatings,
  saveReputationScore,
} from '@/utils/reputationUtils';
import { normalizeAddress } from '@/utils/storageScope';
import {
  dispatchSyncEvent,
  encodeEq,
  encodeIn,
  isSupabaseRestEnabled,
  restRpc,
  restSelect,
  toQuery,
} from '@/utils/supabaseRest';

export const REPUTATION_SYNC_EVENT = 'orina:reputation-changed';

const REPUTATION_HYDRATE_MIN_INTERVAL_MS = 15_000;
const reputationHydrateInFlight = new Map<string, Promise<ReputationScore | null>>();
const reputationHydrateLastAt = new Map<string, number>();

type DbProfileReviewRow = {
  id: string;
  reviewer_user_id: string;
  reviewed_user_id: string;
  order_uid: string | null;
  asset_uid: string | null;
  asset_name: string | null;
  review_text: string | null;
  overall_rating: number;
  communication_rating: number;
  delivery_rating: number;
  accuracy_rating: number;
  rating_type: 'seller' | 'buyer';
  response_text: string | null;
  response_date: string | null;
  verified: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
};

type DbProtocolOrderRow = {
  order_uid: string;
  buyer_address: string | null;
  seller_address: string | null;
  status: string;
  total_value: number | string | null;
  amount: number | string | null;
  price_per_unit: number | string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type SubmitProfileReviewInput = {
  reviewerAddress: string;
  reviewedAddress: string;
  reviewerName?: string;
  chainId: number;
  marketplaceContract: string;
  orderUid: string;
  assetId?: string | null;
  assetName?: string | null;
  rating: number;
  review?: string;
  ratingType: 'seller' | 'buyer';
  communicationRating?: number;
  deliveryRating?: number;
  accuracyRating?: number;
  timestamp?: number;
  source?: string;
};

function normalizeWallet(address?: string | null): string {
  return normalizeAddress(address || '');
}

function toTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(1, Math.min(5, Math.round(value * 10) / 10));
}

function normalizeOrderStatus(status: string | null | undefined): ActivityItem['status'] {
  const normalized = (status || '').trim().toLowerCase();
  if (!normalized) return 'pending';
  if (
    normalized.includes('complete') ||
    normalized.includes('final') ||
    normalized.includes('deliver') ||
    normalized.includes('release') ||
    normalized.includes('settl') ||
    normalized.includes('success')
  ) {
    return 'completed';
  }
  if (
    normalized.includes('cancel') ||
    normalized.includes('fail') ||
    normalized.includes('expire') ||
    normalized.includes('reject') ||
    normalized.includes('revert')
  ) {
    return 'failed';
  }
  return 'pending';
}

function isDisputedStatus(status: string | null | undefined): boolean {
  return (status || '').toLowerCase().includes('disput');
}

function getOrderMetadata(order: DbProtocolOrderRow): Record<string, unknown> {
  return order.metadata && typeof order.metadata === 'object' ? order.metadata : {};
}

function getOrderAssetName(order: DbProtocolOrderRow): string {
  const metadata = getOrderMetadata(order);
  const candidates = [
    metadata.asset_name,
    metadata.assetName,
    metadata.title,
    metadata.assetTitle,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return order.order_uid ? `Order ${order.order_uid}` : 'Order';
}

function getOrderAssetId(order: DbProtocolOrderRow): string | null {
  const metadata = getOrderMetadata(order);
  const candidates = [
    metadata.asset_uid,
    metadata.assetUid,
    metadata.asset_id,
    metadata.assetId,
    metadata.on_chain_asset_id,
    metadata.onchainAssetId,
  ];

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    const normalized = String(candidate).trim();
    if (normalized) return normalized;
  }

  return null;
}

function getOrderValue(order: DbProtocolOrderRow): number {
  const direct = toNumber(order.total_value);
  if (direct > 0) return direct;
  const amount = toNumber(order.amount);
  const unitPrice = toNumber(order.price_per_unit);
  return amount > 0 && unitPrice > 0 ? amount * unitPrice : 0;
}

function dedupeOrders(rows: DbProtocolOrderRow[]): DbProtocolOrderRow[] {
  const next = new Map<string, DbProtocolOrderRow>();
  rows.forEach((row) => {
    const key =
      row.order_uid ||
      `${normalizeWallet(row.buyer_address)}:${normalizeWallet(row.seller_address)}:${row.created_at}`;
    const existing = next.get(key);
    if (!existing) {
      next.set(key, row);
      return;
    }
    const existingStamp = toTimestamp(existing.updated_at) || toTimestamp(existing.created_at) || 0;
    const nextStamp = toTimestamp(row.updated_at) || toTimestamp(row.created_at) || 0;
    if (nextStamp >= existingStamp) {
      next.set(key, row);
    }
  });
  return Array.from(next.values());
}

function buildActivitiesFromOrders(address: string, orders: DbProtocolOrderRow[]): ActivityItem[] {
  const normalized = normalizeWallet(address);
  return orders
    .filter((order) => {
      const buyer = normalizeWallet(order.buyer_address);
      const seller = normalizeWallet(order.seller_address);
      return buyer === normalized || seller === normalized;
    })
    .map((order, index) => {
      const buyer = normalizeWallet(order.buyer_address);
      const isBuyerSide = buyer === normalized;
      const timestamp = toTimestamp(order.updated_at) || toTimestamp(order.created_at) || Date.now();
      return {
        id: order.order_uid || `order-${normalized}-${index}`,
        userId: normalized,
        type: isBuyerSide ? 'purchase' : 'sale',
        assetId: getOrderAssetId(order) || order.order_uid || `order-${index}`,
        assetName: getOrderAssetName(order),
        assetImage: '',
        price: getOrderValue(order),
        from: isBuyerSide ? normalizeWallet(order.seller_address) : normalizeWallet(order.buyer_address),
        to: isBuyerSide ? normalizeWallet(order.buyer_address) : normalizeWallet(order.seller_address),
        timestamp,
        status: normalizeOrderStatus(order.status),
      };
    });
}

function buildDisputesFromOrders(address: string, orders: DbProtocolOrderRow[]): DisputeRecord[] {
  const normalized = normalizeWallet(address);
  return orders
    .filter((order) => isDisputedStatus(order.status))
    .map((order, index) => {
      const buyer = normalizeWallet(order.buyer_address);
      const seller = normalizeWallet(order.seller_address);
      const createdAt = toTimestamp(order.created_at) || Date.now();
      return {
        id: order.order_uid || `dispute-${normalized}-${index}`,
        transactionId: order.order_uid || `dispute-${index}`,
        assetId: getOrderAssetId(order) || order.order_uid || `asset-${index}`,
        assetName: getOrderAssetName(order),
        initiatedBy: buyer || normalized,
        against: seller || normalized,
        reason: 'Order dispute',
        description: `Protocol order marked as ${order.status}`,
        status: order.status.toLowerCase().includes('resolve') ? 'resolved' : 'pending',
        timeline: [],
        createdAt,
      };
    });
}

function buildSyntheticActivitiesFromMetrics(userId: string, score: ReputationScore): ActivityItem[] {
  const { metrics } = score;
  const totalSynthetic = metrics.successfulTransactions + metrics.failedTransactions;
  const avgValue =
    metrics.successfulTransactions > 0
      ? metrics.totalVolume / metrics.successfulTransactions
      : 0;
  const activities: ActivityItem[] = [];

  for (let index = 0; index < totalSynthetic; index += 1) {
    const isSuccessful = index < metrics.successfulTransactions;
    activities.push({
      id: `synthetic-activity-${userId}-${index}`,
      userId,
      type: index % 2 === 0 ? 'purchase' : 'sale',
      assetId: `synthetic-asset-${index}`,
      assetName: 'Synthetic order',
      assetImage: '',
      price: isSuccessful ? avgValue : 0,
      timestamp: score.lastTransactionDate || score.lastUpdated || Date.now(),
      status: isSuccessful ? 'completed' : 'failed',
    });
  }

  return activities;
}

function buildSyntheticDisputesFromMetrics(score: ReputationScore): DisputeRecord[] {
  return Array.from({ length: score.metrics.disputesTotal }, (_, index) => ({
    id: `synthetic-dispute-${score.userId}-${index}`,
    transactionId: `synthetic-tx-${index}`,
    assetId: `synthetic-asset-${index}`,
    assetName: 'Synthetic order',
    initiatedBy: score.userId,
    against: score.userId,
    reason: 'Synthetic dispute record',
    description: 'Cached dispute summary',
    status: index < score.metrics.disputesResolved ? 'resolved' : 'pending',
    timeline: [],
    createdAt: score.lastUpdated || Date.now(),
  }));
}

export function buildNeutralReputationScore(
  userId: string,
  accountAge: number,
  isVerified: boolean
): ReputationScore {
  const verificationScore = Math.min(Math.round((Math.max(accountAge, 0) / 365) * 20), 20) + (isVerified ? 30 : 0);
  const transactionScore = 0;
  const ratingScore = 50;
  const responseScore = 50;
  const completionScore = 50;
  const disputeScore = 50;
  const overallScore = Math.round(
    transactionScore * 0.25 +
    ratingScore * 0.25 +
    responseScore * 0.15 +
    completionScore * 0.15 +
    disputeScore * 0.10 +
    verificationScore * 0.10
  );

  return {
    userId,
    overallScore,
    level: getReputationLevel(overallScore),
    transactionScore,
    ratingScore,
    responseScore,
    completionScore,
    disputeScore,
    verificationScore,
    metrics: {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      totalVolume: 0,
      averageRating: 0,
      totalReviews: 0,
      averageResponseTime: 0,
      completionRate: 0,
      disputeRate: 0,
      disputesResolved: 0,
      disputesTotal: 0,
      accountAge,
    },
    trustIndicators: {
      isVerified,
      emailVerified: isVerified,
      phoneVerified: false,
      kycVerified: false,
      hasEscrow: false,
      premiumMember: false,
    },
    scoreHistory: [],
    recentRatings: [],
    lastUpdated: Date.now(),
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
      acc[row.id] = normalizeWallet(row.wallet_address);
      return acc;
    }, {});
  } catch {
    return {};
  }
}

async function fetchOrdersForWallet(address: string): Promise<DbProtocolOrderRow[]> {
  const normalized = normalizeWallet(address);
  if (!normalized) return [];

  const query = toQuery({
    select: 'order_uid,buyer_address,seller_address,status,total_value,amount,price_per_unit,metadata,created_at,updated_at',
  });

  const [buyerRows, sellerRows] = await Promise.all([
    restSelect<DbProtocolOrderRow>('protocol_orders', `${query}&buyer_address=${encodeEq(normalized)}`).catch(() => []),
    restSelect<DbProtocolOrderRow>('protocol_orders', `${query}&seller_address=${encodeEq(normalized)}`).catch(() => []),
  ]);

  return dedupeOrders([...buyerRows, ...sellerRows]);
}

async function fetchOrdersByUid(orderUids: Array<string | null | undefined>): Promise<Map<string, DbProtocolOrderRow>> {
  const uniqueOrderUids = Array.from(
    new Set(orderUids.map((orderUid) => String(orderUid || '').trim()).filter(Boolean)),
  );
  if (uniqueOrderUids.length === 0) return new Map();

  try {
    const rows = await restSelect<DbProtocolOrderRow>(
      'protocol_orders',
      toQuery({
        select: 'order_uid,buyer_address,seller_address,status,total_value,amount,price_per_unit,metadata,created_at,updated_at',
        order_uid: encodeIn(uniqueOrderUids),
      }),
    );

    return new Map(
      rows
        .filter((row) => String(row.order_uid || '').trim())
        .map((row) => [String(row.order_uid).trim(), row] as const),
    );
  } catch {
    return new Map();
  }
}

function resolveReviewAssetId(row: DbProfileReviewRow, order?: DbProtocolOrderRow | null): string {
  const storedAssetId = String(row.asset_uid || '').trim();
  const fallbackAssetId = order ? getOrderAssetId(order) : null;

  if (fallbackAssetId && (!storedAssetId || storedAssetId === String(row.order_uid || '').trim())) {
    return fallbackAssetId;
  }

  return storedAssetId || String(row.order_uid || '').trim() || row.id;
}

function resolveReviewAssetName(row: DbProfileReviewRow, order?: DbProtocolOrderRow | null): string {
  const storedAssetName = String(row.asset_name || '').trim();
  if (storedAssetName) return storedAssetName;
  if (order) return getOrderAssetName(order);
  return 'Order review';
}

function computeReputationSnapshot(
  address: string,
  ratings: Rating[],
  orders: DbProtocolOrderRow[]
): ReputationScore {
  const normalized = normalizeWallet(address);
  const profile = loadUserProfile(normalized);
  const accountAge = profile
    ? Math.max(0, Math.floor((Date.now() - profile.stats.joinedDate) / (1000 * 60 * 60 * 24)))
    : 30;
  const isVerified = !!profile?.verified;
  const activities = buildActivitiesFromOrders(normalized, orders);
  const disputes = buildDisputesFromOrders(normalized, orders);

  if (activities.length === 0 && ratings.length === 0) {
    return buildNeutralReputationScore(normalized, accountAge, isVerified);
  }

  const score = calculateReputationScore(activities, ratings, disputes, accountAge, isVerified);
  const lastTransactionDate = activities.length > 0
    ? Math.max(...activities.map((activity) => activity.timestamp))
    : undefined;

  return {
    ...score,
    userId: normalized,
    recentRatings: ratings.slice(0, 5),
    lastTransactionDate,
    lastUpdated: Date.now(),
  };
}

function saveReputationSnapshot(address: string, ratings: Rating[], score: ReputationScore): void {
  const normalized = normalizeWallet(address);
  if (!normalized) return;
  saveRatings(normalized, ratings);
  saveReputationScore({
    ...score,
    userId: normalized,
    recentRatings: ratings.slice(0, 5),
    lastUpdated: Date.now(),
  });
  dispatchSyncEvent(REPUTATION_SYNC_EVENT);
}


function buildRatingMergeKey(rating: Rating): string {
  const transactionId = String(rating.transactionId || '').trim().toLowerCase();
  const fromUserId = normalizeWallet(rating.fromUserId) || String(rating.fromUserId || '').trim().toLowerCase();
  const ratingType = String(rating.ratingType || '').trim().toLowerCase();

  if (transactionId && fromUserId && ratingType) {
    return `${transactionId}::${fromUserId}::${ratingType}`;
  }

  return String(rating.id || '').trim().toLowerCase();
}

function coalesceRatingText(primary?: string, fallback?: string): string | undefined {
  const normalizedPrimary = typeof primary === 'string' ? primary.trim() : '';
  if (normalizedPrimary) return normalizedPrimary;

  const normalizedFallback = typeof fallback === 'string' ? fallback.trim() : '';
  return normalizedFallback || undefined;
}

function mergeRatingRecords(primary: Rating, fallback?: Rating | null): Rating {
  if (!fallback) return primary;

  return {
    ...fallback,
    ...primary,
    id: coalesceRatingText(primary.id, fallback.id) || fallback.id,
    fromUserId: coalesceRatingText(primary.fromUserId, fallback.fromUserId) || fallback.fromUserId,
    fromUsername:
      coalesceRatingText(primary.fromUsername, fallback.fromUsername)
      || fallback.fromUsername,
    toUserId: coalesceRatingText(primary.toUserId, fallback.toUserId) || fallback.toUserId,
    transactionId:
      coalesceRatingText(primary.transactionId, fallback.transactionId)
      || fallback.transactionId,
    assetId: coalesceRatingText(primary.assetId, fallback.assetId) || fallback.assetId,
    assetName: coalesceRatingText(primary.assetName, fallback.assetName) || fallback.assetName,
    overallRating: primary.overallRating || fallback.overallRating,
    communicationRating: primary.communicationRating || fallback.communicationRating,
    deliveryRating: primary.deliveryRating || fallback.deliveryRating,
    accuracyRating: primary.accuracyRating || fallback.accuracyRating,
    review: coalesceRatingText(primary.review, fallback.review),
    pros: primary.pros && primary.pros.length > 0 ? primary.pros : fallback.pros,
    cons: primary.cons && primary.cons.length > 0 ? primary.cons : fallback.cons,
    ratingType: primary.ratingType || fallback.ratingType,
    response: coalesceRatingText(primary.response, fallback.response),
    responseDate: primary.responseDate ?? fallback.responseDate,
    verified: primary.verified || fallback.verified,
    helpful: Math.max(primary.helpful || 0, fallback.helpful || 0),
    timestamp: Math.max(primary.timestamp || 0, fallback.timestamp || 0),
  };
}

function mergeRatingsWithLocalCache(remoteRatings: Rating[], localRatings: Rating[]): Rating[] {
  const merged = new Map<string, Rating>();

  localRatings.forEach((rating) => {
    const key = buildRatingMergeKey(rating);
    if (key) merged.set(key, rating);
  });

  remoteRatings.forEach((rating) => {
    const key = buildRatingMergeKey(rating);
    if (!key) return;
    merged.set(key, mergeRatingRecords(rating, merged.get(key)));
  });

  return Array.from(merged.values()).sort((left, right) => right.timestamp - left.timestamp);
}
function mergeRatingIntoLocalCache(reviewedAddress: string, rating: Rating): Rating[] {
  const normalized = normalizeWallet(reviewedAddress);
  const nextRatings = loadRatings(normalized).filter((item) => {
    if (item.id === rating.id) return false;
    if (rating.transactionId && item.transactionId === rating.transactionId && item.fromUserId === rating.fromUserId) {
      return false;
    }
    return true;
  });
  nextRatings.unshift(rating);
  nextRatings.sort((left, right) => right.timestamp - left.timestamp);
  saveRatings(normalized, nextRatings);
  return nextRatings;
}

function refreshCachedReputationFromLocalData(address: string, ratings: Rating[]): void {
  const normalized = normalizeWallet(address);
  if (!normalized) return;

  const cached = loadReputationScore(normalized);
  if (!cached) {
    const profile = loadUserProfile(normalized);
    const accountAge = profile
      ? Math.max(0, Math.floor((Date.now() - profile.stats.joinedDate) / (1000 * 60 * 60 * 24)))
      : 30;
    const nextScore =
      ratings.length > 0
        ? calculateReputationScore([], ratings, [], accountAge, !!profile?.verified)
        : buildNeutralReputationScore(normalized, accountAge, !!profile?.verified);
    saveReputationSnapshot(normalized, ratings, {
      ...nextScore,
      userId: normalized,
    });
    return;
  }

  const nextScore = calculateReputationScore(
    buildSyntheticActivitiesFromMetrics(normalized, cached),
    ratings,
    buildSyntheticDisputesFromMetrics(cached),
    cached.metrics.accountAge,
    cached.trustIndicators.isVerified
  );

  saveReputationSnapshot(normalized, ratings, {
    ...nextScore,
    userId: normalized,
    lastTransactionDate: cached.lastTransactionDate,
  });
}

export async function hydrateReputationFromSupabase(
  address: string,
  options: { force?: boolean } = {}
): Promise<ReputationScore | null> {
  const normalized = normalizeWallet(address);
  if (!normalized) return null;
  if (!isSupabaseRestEnabled()) {
    return loadReputationScore(normalized);
  }

  const now = Date.now();
  const lastHydratedAt = reputationHydrateLastAt.get(normalized) || 0;
  if (!options.force && now - lastHydratedAt < REPUTATION_HYDRATE_MIN_INTERVAL_MS) {
    return loadReputationScore(normalized);
  }

  const existing = reputationHydrateInFlight.get(normalized);
  if (existing) return existing;

  const request = (async (): Promise<ReputationScore | null> => {
    const reviewedUserId = await ensureRemoteProfileIdForWallet(normalized);
    if (!reviewedUserId) return loadReputationScore(normalized);

    const reviewRows = await restSelect<DbProfileReviewRow>(
        'profile_reviews',
        toQuery({
          select: 'id,reviewer_user_id,reviewed_user_id,order_uid,asset_uid,asset_name,review_text,overall_rating,communication_rating,delivery_rating,accuracy_rating,rating_type,response_text,response_date,verified,helpful_count,created_at,updated_at',
          reviewed_user_id: encodeEq(reviewedUserId),
          order: 'created_at.desc',
        })
      ).catch(() => []);

    const [reviewerWalletById, orderByUid] = await Promise.all([
      fetchWalletsByProfileIds(reviewRows.map((row) => row.reviewer_user_id)),
      fetchOrdersByUid(reviewRows.map((row) => row.order_uid)),
    ]);
    const remoteRatings: Rating[] = reviewRows.map((row, index) => {
      const linkedOrder = row.order_uid ? orderByUid.get(row.order_uid) : undefined;

      return {
        id: row.id,
        fromUserId: reviewerWalletById[row.reviewer_user_id] || row.reviewer_user_id,
        fromUsername:
          (reviewerWalletById[row.reviewer_user_id] || row.reviewer_user_id).slice(2, 10) ||
          `reviewer_${index + 1}`,
        toUserId: normalized,
        transactionId: row.order_uid || row.id,
        assetId: resolveReviewAssetId(row, linkedOrder),
        assetName: resolveReviewAssetName(row, linkedOrder),
        overallRating: clampRating(toNumber(row.overall_rating)),
        communicationRating: clampRating(toNumber(row.communication_rating)),
        deliveryRating: clampRating(toNumber(row.delivery_rating)),
        accuracyRating: clampRating(toNumber(row.accuracy_rating)),
        review: row.review_text || undefined,
        ratingType: row.rating_type,
        response: row.response_text || undefined,
        responseDate: toTimestamp(row.response_date),
        verified: !!row.verified,
        helpful: Number(row.helpful_count || 0),
        timestamp: toTimestamp(row.created_at) || Date.now(),
      };
    });
    const localRatings = loadRatings(normalized);
    const mergedRatings = mergeRatingsWithLocalCache(remoteRatings, localRatings);

    const score = computeReputationSnapshot(
      normalized,
      mergedRatings,
      await fetchOrdersForWallet(normalized).catch(() => [])
    );
    saveReputationSnapshot(normalized, mergedRatings, score);
    reputationHydrateLastAt.set(normalized, Date.now());
    return score;
  })();

  reputationHydrateInFlight.set(normalized, request);
  try {
    return await request;
  } finally {
    reputationHydrateInFlight.delete(normalized);
  }
}

export async function submitProfileReview(input: SubmitProfileReviewInput): Promise<Rating | null> {
  const reviewerAddress = normalizeWallet(input.reviewerAddress);
  const reviewedAddress = normalizeWallet(input.reviewedAddress);
  if (
    !reviewerAddress
    || !reviewedAddress
    || reviewerAddress === reviewedAddress
    || !Number.isSafeInteger(input.chainId)
    || input.chainId <= 0
    || !/^0x[a-f0-9]{40}$/i.test(input.marketplaceContract)
    || !String(input.orderUid || '').trim()
    || !isSupabaseRestEnabled()
  ) return null;

  const timestamp = input.timestamp || Date.now();
  const ratingValue = clampRating(input.rating);
  const rating: Rating = {
    id:
      input.orderUid
        ? `profile-review-${input.chainId}-${input.orderUid}-${reviewerAddress.slice(2, 8)}-${input.ratingType}`
        : `profile-review-${timestamp}-${reviewerAddress.slice(2, 8)}`,
    fromUserId: reviewerAddress,
    fromUsername: input.reviewerName?.trim() || reviewerAddress.slice(2, 10),
    toUserId: reviewedAddress,
    transactionId: input.orderUid || `manual-${timestamp}`,
    assetId: input.assetId || input.orderUid || `asset-${timestamp}`,
    assetName: input.assetName || 'Order review',
    overallRating: ratingValue,
    communicationRating: clampRating(input.communicationRating ?? ratingValue),
    deliveryRating: clampRating(input.deliveryRating ?? ratingValue),
    accuracyRating: clampRating(input.accuracyRating ?? ratingValue),
    review: input.review?.trim() || undefined,
    ratingType: input.ratingType,
    verified: true,
    helpful: 0,
    timestamp,
  };

  try {
    await restRpc('submit_profile_review_v2', {
      p_chain_id: input.chainId,
      p_marketplace_contract: input.marketplaceContract.toLowerCase(),
      p_order_uid: input.orderUid,
      p_reviewed_wallet: reviewedAddress,
      p_rating_type: rating.ratingType,
      p_overall_rating: rating.overallRating,
      p_communication_rating: rating.communicationRating,
      p_delivery_rating: rating.deliveryRating,
      p_accuracy_rating: rating.accuracyRating,
      p_review_text: rating.review || null,
      p_asset_uid: input.assetId || null,
      p_asset_name: input.assetName || null,
    });
    const nextRatings = mergeRatingIntoLocalCache(reviewedAddress, rating);
    refreshCachedReputationFromLocalData(reviewedAddress, nextRatings);
    dispatchSyncEvent(REPUTATION_SYNC_EVENT);
    return rating;
  } catch (error) {
    console.debug('[Reputation] Verified review submission failed:', error);
    return null;
  } finally {
    void hydrateReputationFromSupabase(reviewedAddress, { force: true });
  }
}
