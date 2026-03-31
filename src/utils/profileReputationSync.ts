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
  restSelect,
  restUpsert,
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

type DbProfileReputationSummaryRow = {
  user_id: string;
  wallet_address: string;
  overall_score: number | string;
  level: string;
  transaction_score: number | string;
  rating_score: number | string;
  response_score: number | string;
  completion_score: number | string;
  dispute_score: number | string;
  verification_score: number | string;
  total_transactions: number | string;
  successful_transactions: number | string;
  failed_transactions: number | string;
  total_volume: number | string;
  average_rating: number | string;
  total_reviews: number | string;
  average_response_time: number | string;
  completion_rate: number | string;
  dispute_rate: number | string;
  disputes_resolved: number | string;
  disputes_total: number | string;
  account_age_days: number | string;
  is_verified: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  kyc_verified: boolean;
  has_escrow: boolean;
  premium_member: boolean;
  last_transaction_date: string | null;
  last_updated: string | null;
};

type SubmitProfileReviewInput = {
  reviewerAddress: string;
  reviewedAddress: string;
  reviewerName?: string;
  orderUid?: string | null;
  assetId?: string | null;
  assetName?: string | null;
  rating: number;
  review?: string;
  ratingType: 'seller' | 'buyer';
  communicationRating?: number;
  deliveryRating?: number;
  accuracyRating?: number;
  verified?: boolean;
  helpful?: number;
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

function normalizeReputationLevel(value: unknown): ReputationScore['level'] {
  if (
    value === 'newcomer' ||
    value === 'bronze' ||
    value === 'silver' ||
    value === 'gold' ||
    value === 'platinum' ||
    value === 'diamond'
  ) {
    return value;
  }
  return 'newcomer';
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
        assetId: String(getOrderMetadata(order).asset_uid || order.order_uid || `order-${index}`),
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
        assetId: String(getOrderMetadata(order).asset_uid || order.order_uid || `asset-${index}`),
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

function mapSummaryRowToReputationScore(
  address: string,
  summary: DbProfileReputationSummaryRow,
  ratings: Rating[]
): ReputationScore {
  const normalized = normalizeWallet(address);
  const overallScore = Math.round(toNumber(summary.overall_score));
  const level = normalizeReputationLevel(summary.level);

  return {
    userId: normalized,
    overallScore,
    level,
    transactionScore: Math.round(toNumber(summary.transaction_score)),
    ratingScore: Math.round(toNumber(summary.rating_score)),
    responseScore: Math.round(toNumber(summary.response_score)),
    completionScore: Math.round(toNumber(summary.completion_score)),
    disputeScore: Math.round(toNumber(summary.dispute_score)),
    verificationScore: Math.round(toNumber(summary.verification_score)),
    metrics: {
      totalTransactions: Math.max(0, Math.round(toNumber(summary.total_transactions))),
      successfulTransactions: Math.max(0, Math.round(toNumber(summary.successful_transactions))),
      failedTransactions: Math.max(0, Math.round(toNumber(summary.failed_transactions))),
      totalVolume: toNumber(summary.total_volume),
      averageRating: toNumber(summary.average_rating),
      totalReviews: Math.max(0, Math.round(toNumber(summary.total_reviews))),
      averageResponseTime: toNumber(summary.average_response_time),
      completionRate: toNumber(summary.completion_rate),
      disputeRate: toNumber(summary.dispute_rate),
      disputesResolved: Math.max(0, Math.round(toNumber(summary.disputes_resolved))),
      disputesTotal: Math.max(0, Math.round(toNumber(summary.disputes_total))),
      accountAge: Math.max(0, Math.round(toNumber(summary.account_age_days))),
    },
    trustIndicators: {
      isVerified: !!summary.is_verified,
      emailVerified: !!summary.email_verified,
      phoneVerified: !!summary.phone_verified,
      kycVerified: !!summary.kyc_verified,
      hasEscrow: !!summary.has_escrow,
      premiumMember: !!summary.premium_member,
    },
    scoreHistory: [],
    recentRatings: ratings.slice(0, 5),
    lastUpdated: toTimestamp(summary.last_updated) || Date.now(),
    lastTransactionDate: toTimestamp(summary.last_transaction_date),
  };
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

    const [summaryRows, reviewRows] = await Promise.all([
      restSelect<DbProfileReputationSummaryRow>(
        'profile_reputation_summaries',
        toQuery({
          select: '*',
          wallet_address: encodeEq(normalized),
          limit: '1',
        })
      ).catch(() => []),
      restSelect<DbProfileReviewRow>(
        'profile_reviews',
        toQuery({
          select: 'id,reviewer_user_id,reviewed_user_id,order_uid,asset_uid,asset_name,review_text,overall_rating,communication_rating,delivery_rating,accuracy_rating,rating_type,response_text,response_date,verified,helpful_count,created_at,updated_at',
          reviewed_user_id: encodeEq(reviewedUserId),
          order: 'created_at.desc',
        })
      ).catch(() => []),
    ]);

    const reviewerWalletById = await fetchWalletsByProfileIds(reviewRows.map((row) => row.reviewer_user_id));
    const ratings: Rating[] = reviewRows.map((row, index) => ({
      id: row.id,
      fromUserId: reviewerWalletById[row.reviewer_user_id] || row.reviewer_user_id,
      fromUsername:
        (reviewerWalletById[row.reviewer_user_id] || row.reviewer_user_id).slice(2, 10) ||
        `reviewer_${index + 1}`,
      toUserId: normalized,
      transactionId: row.order_uid || row.id,
      assetId: row.asset_uid || row.order_uid || row.id,
      assetName: row.asset_name || 'Order review',
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
    }));

    const summary = summaryRows[0] || null;
    const score = summary
      ? mapSummaryRowToReputationScore(normalized, summary, ratings)
      : computeReputationSnapshot(
          normalized,
          ratings,
          await fetchOrdersForWallet(normalized).catch(() => [])
        );
    saveReputationSnapshot(normalized, ratings, score);
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
  if (!reviewerAddress || !reviewedAddress || reviewerAddress === reviewedAddress) return null;

  const timestamp = input.timestamp || Date.now();
  const ratingValue = clampRating(input.rating);
  const rating: Rating = {
    id:
      input.orderUid
        ? `profile-review-${input.orderUid}-${reviewerAddress.slice(2, 8)}-${input.ratingType}`
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
    verified: input.verified ?? true,
    helpful: input.helpful ?? 0,
    timestamp,
  };

  const nextRatings = mergeRatingIntoLocalCache(reviewedAddress, rating);
  refreshCachedReputationFromLocalData(reviewedAddress, nextRatings);
  dispatchSyncEvent(REPUTATION_SYNC_EVENT);

  if (!isSupabaseRestEnabled()) {
    return rating;
  }

  try {
    const [reviewerUserId, reviewedUserId] = await Promise.all([
      ensureRemoteProfileIdForWallet(reviewerAddress),
      ensureRemoteProfileIdForWallet(reviewedAddress),
    ]);

    if (reviewerUserId && reviewedUserId) {
      await restUpsert(
        'profile_reviews',
        [{
          reviewer_user_id: reviewerUserId,
          reviewed_user_id: reviewedUserId,
          order_uid: input.orderUid || null,
          asset_uid: input.assetId || null,
          asset_name: input.assetName || null,
          review_text: rating.review || null,
          overall_rating: rating.overallRating,
          communication_rating: rating.communicationRating,
          delivery_rating: rating.deliveryRating,
          accuracy_rating: rating.accuracyRating,
          rating_type: rating.ratingType,
          response_text: null,
          response_date: null,
          verified: rating.verified,
          helpful_count: rating.helpful,
          metadata: {
            source: input.source || 'ui',
            reviewer_address: reviewerAddress,
            reviewed_address: reviewedAddress,
          },
        }],
        { onConflict: 'reviewer_user_id,reviewed_user_id,order_uid,rating_type' }
      );
    }
  } catch (error) {
    console.debug('[Reputation] Remote review sync skipped:', error);
  } finally {
    void hydrateReputationFromSupabase(reviewedAddress, { force: true });
  }

  return rating;
}
