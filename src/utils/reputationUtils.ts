/**
 * @deprecated Phase 2 — Legacy localStorage reputation utils.
 * Reputation/rating persistence (load/save) should migrate to the
 * server-side profile_reputation_summary view and profile_reviews
 * table (see migrations 000045, 000047). Pure-computation helpers
 * (calculateReputationScore, getReputationLevel, getTrustBadges,
 * getReputationInsights, etc.) remain safe to use.
 * See spec: 15-local-api-audit-and-server-migration-plan.md § F6
 */
import {
  ReputationScore,
  ReputationLevel,
  ReputationLevelInfo,
  Rating,
  TrustBadge,
  ReputationInsight,
  ScoreHistoryItem,
  DisputeRecord,
  ReputationComparison,
} from '@/types/reputation';
import { ActivityItem } from '@/types/profile';
import { normalizeAddress } from '@/utils/storageScope';

// REMOVED: localStorage keys — data now lives in profile_reputation_summary (000047)
// const REPUTATION_KEY = 'studio_reputation';
// const RATINGS_KEY = 'studio_ratings';
// const DISPUTES_KEY = 'studio_disputes';

function normalizeStorageUserId(userId: string): string {
  if (/^0x[a-fA-F0-9]{40}$/.test(userId)) {
    return normalizeAddress(userId);
  }
  return userId;
}

/**
 * Reputation level information
 */
export function getReputationLevels(): ReputationLevelInfo[] {
  return [
    {
      level: 'newcomer',
      name: 'Newcomer',
      minScore: 0,
      maxScore: 19,
      color: 'text-zinc-400',
      icon: '🌱',
      benefits: ['Access to marketplace', 'Basic support'],
    },
    {
      level: 'bronze',
      name: 'Bronze',
      minScore: 20,
      maxScore: 39,
      color: 'text-orange-600',
      icon: '🥉',
      benefits: ['Priority listings', 'Email support', 'Basic analytics'],
    },
    {
      level: 'silver',
      name: 'Silver',
      minScore: 40,
      maxScore: 59,
      color: 'text-zinc-300',
      icon: '🥈',
      benefits: ['Featured listings', 'Chat support', 'Advanced analytics', 'Lower fees (2%)'],
    },
    {
      level: 'gold',
      name: 'Gold',
      minScore: 60,
      maxScore: 79,
      color: 'text-yellow-500',
      icon: '🥇',
      benefits: ['Premium placement', 'Priority support', 'Pro analytics', 'Lowest fees (1.5%)'],
    },
    {
      level: 'platinum',
      name: 'Platinum',
      minScore: 80,
      maxScore: 89,
      color: 'text-cyan-400',
      icon: '💎',
      benefits: ['VIP placement', '24/7 support', 'Custom analytics', 'Minimal fees (1%)', 'Verified badge'],
    },
    {
      level: 'diamond',
      name: 'Diamond',
      minScore: 90,
      maxScore: 100,
      color: 'text-purple-400',
      icon: '👑',
      benefits: ['Top placement', 'Dedicated manager', 'All features', 'No fees', 'Elite badge'],
    },
  ];
}

/**
 * Get reputation level from score
 */
export function getReputationLevel(score: number): ReputationLevel {
  if (score >= 90) return 'diamond';
  if (score >= 80) return 'platinum';
  if (score >= 60) return 'gold';
  if (score >= 40) return 'silver';
  if (score >= 20) return 'bronze';
  return 'newcomer';
}

/**
 * Get level info
 */
export function getLevelInfo(level: ReputationLevel): ReputationLevelInfo {
  return getReputationLevels().find(l => l.level === level)!;
}

/**
 * Calculate reputation score
 */
export function calculateReputationScore(
  activities: ActivityItem[],
  ratings: Rating[],
  disputes: DisputeRecord[],
  accountAge: number, // days
  isVerified: boolean
): ReputationScore {
  const userId = normalizeStorageUserId(activities[0]?.userId || ratings[0]?.toUserId || 'unknown');
  
  // Transaction metrics
  const totalTransactions = activities.filter(a => 
    ['purchase', 'sale'].includes(a.type) && a.status === 'completed'
  ).length;
  
  const successfulTransactions = activities.filter(a => 
    ['purchase', 'sale'].includes(a.type) && a.status === 'completed'
  ).length;
  
  const failedTransactions = activities.filter(a => 
    ['purchase', 'sale'].includes(a.type) && a.status === 'failed'
  ).length;
  
  const totalVolume = activities
    .filter(a => ['purchase', 'sale'].includes(a.type) && a.status === 'completed')
    .reduce((sum, a) => sum + (a.price || 0), 0);
  
  // Rating metrics
  const averageRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.overallRating, 0) / ratings.length
    : 0;
  
  const totalReviews = ratings.length;
  
  // Response time (mock - would be calculated from actual data)
  const averageResponseTime = 45; // minutes
  
  // Completion rate
  const completionRate = totalTransactions > 0
    ? (successfulTransactions / totalTransactions) * 100
    : 100;
  
  // Dispute metrics
  const disputesTotal = disputes.length;
  const disputesResolved = disputes.filter(d => d.status === 'resolved').length;
  const disputeRate = totalTransactions > 0
    ? (disputesTotal / totalTransactions) * 100
    : 0;
  
  // Component scores (each 0-100)
  const transactionScore = calculateTransactionScore(totalTransactions, totalVolume);
  const ratingScore = calculateRatingScore(averageRating, totalReviews);
  const responseScore = calculateResponseScore(averageResponseTime);
  const completionScore = completionRate;
  const disputeScore = calculateDisputeScore(disputeRate, disputesResolved, disputesTotal);
  const verificationScore = calculateVerificationScore(isVerified, accountAge);
  
  // Overall score (weighted average)
  const overallScore = Math.round(
    transactionScore * 0.25 +
    ratingScore * 0.25 +
    responseScore * 0.15 +
    completionScore * 0.15 +
    disputeScore * 0.10 +
    verificationScore * 0.10
  );
  
  const level = getReputationLevel(overallScore);
  
  return {
    userId,
    overallScore,
    level,
    transactionScore,
    ratingScore,
    responseScore,
    completionScore,
    disputeScore,
    verificationScore,
    metrics: {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      totalVolume,
      averageRating,
      totalReviews,
      averageResponseTime,
      completionRate,
      disputeRate,
      disputesResolved,
      disputesTotal,
      accountAge,
    },
    trustIndicators: {
      isVerified,
      emailVerified: isVerified,
      phoneVerified: false,
      kycVerified: false,
      hasEscrow: totalTransactions > 0,
      premiumMember: level === 'platinum' || level === 'diamond',
    },
    scoreHistory: [],
    recentRatings: ratings.slice(0, 5),
    lastUpdated: Date.now(),
  };
}

/**
 * Calculate transaction score (0-100)
 */
function calculateTransactionScore(count: number, volume: number): number {
  const countScore = Math.min((count / 50) * 50, 50); // Max 50 points for 50+ transactions
  const volumeScore = Math.min((volume / 100) * 50, 50); // Max 50 points for 100+ ETH volume
  return Math.round(countScore + volumeScore);
}

/**
 * Calculate rating score (0-100)
 */
function calculateRatingScore(average: number, count: number): number {
  if (count === 0) return 50; // Neutral score for no ratings
  
  const avgScore = (average / 5) * 70; // Max 70 points for 5-star average
  const countScore = Math.min((count / 20) * 30, 30); // Max 30 points for 20+ reviews
  
  return Math.round(avgScore + countScore);
}

/**
 * Calculate response score (0-100)
 */
function calculateResponseScore(avgMinutes: number): number {
  if (avgMinutes <= 15) return 100;
  if (avgMinutes <= 30) return 90;
  if (avgMinutes <= 60) return 80;
  if (avgMinutes <= 120) return 70;
  if (avgMinutes <= 240) return 60;
  if (avgMinutes <= 480) return 50;
  return 40;
}

/**
 * Calculate dispute score (0-100)
 */
function calculateDisputeScore(rate: number, resolved: number, total: number): number {
  if (total === 0) return 100; // No disputes = perfect score
  
  const rateScore = Math.max(100 - rate * 2, 0); // Penalty for high dispute rate
  const resolutionBonus = total > 0 ? (resolved / total) * 20 : 0; // Bonus for resolving disputes
  
  return Math.round(Math.min(rateScore + resolutionBonus, 100));
}

/**
 * Calculate verification score (0-100)
 */
function calculateVerificationScore(isVerified: boolean, accountAge: number): number {
  const verifiedScore = isVerified ? 50 : 0;
  const ageScore = Math.min((accountAge / 365) * 50, 50); // Max 50 points for 1+ year
  return Math.round(verifiedScore + ageScore);
}

/**
 * Load reputation score
 */
/**
 * @deprecated Use server-side profile_reputation_summary view.
 */
export function loadReputationScore(_userId: string): ReputationScore | null {
  console.warn('[reputationUtils] loadReputationScore() is deprecated — use server API');
  return null;
}

/**
 * Save reputation score
 */
/**
 * @deprecated Use server-side profile_reputation_summary view.
 */
export function saveReputationScore(_score: ReputationScore): void {
  console.warn('[reputationUtils] saveReputationScore() is deprecated — use server API');
}

/**
 * Load ratings
 */
/**
 * @deprecated Use server-side profile_reviews table.
 */
export function loadRatings(_userId: string): Rating[] {
  console.warn('[reputationUtils] loadRatings() is deprecated — use server API');
  return [];
}

/**
 * Save ratings
 */
/**
 * @deprecated Use server-side profile_reviews table.
 */
export function saveRatings(_userId: string, _ratings: Rating[]): void {
  console.warn('[reputationUtils] saveRatings() is deprecated — use server API');
}

/**
 * Add rating
 */
export function addRating(rating: Rating): void {
  const normalizedToUserId = normalizeStorageUserId(rating.toUserId);
  const ratings = loadRatings(normalizedToUserId);
  ratings.unshift(rating);
  saveRatings(normalizedToUserId, ratings);
}

/**
 * Get trust badges
 */
export function getTrustBadges(score: ReputationScore): TrustBadge[] {
  const badges: TrustBadge[] = [];
  
  // Verified badge
  if (score.trustIndicators.isVerified) {
    badges.push({
      id: 'verified',
      type: 'verified',
      name: 'Verified User',
      description: 'Identity verified',
      icon: '✓',
      color: 'text-[#2CC295] bg-[#2CC295]/10',
      earnedDate: Date.now(),
    });
  }
  
  // Top seller (high rating + many transactions)
  if (score.metrics.averageRating >= 4.5 && score.metrics.totalTransactions >= 20) {
    badges.push({
      id: 'top_seller',
      type: 'top_seller',
      name: 'Top Seller',
      description: '4.5+ stars with 20+ transactions',
      icon: '⭐',
      color: 'text-yellow-400 bg-yellow-400/10',
      earnedDate: Date.now(),
    });
  }
  
  // Fast responder
  if (score.metrics.totalTransactions > 0 && score.metrics.averageResponseTime > 0 && score.metrics.averageResponseTime <= 30) {
    badges.push({
      id: 'fast_responder',
      type: 'fast_responder',
      name: 'Fast Responder',
      description: 'Responds within 30 minutes',
      icon: '⚡',
      color: 'text-orange-400 bg-orange-400/10',
      earnedDate: Date.now(),
    });
  }
  
  // Reliable (high completion rate)
  if (score.metrics.totalTransactions > 0 && score.metrics.completionRate >= 95) {
    badges.push({
      id: 'reliable',
      type: 'reliable',
      name: 'Reliable',
      description: '95%+ completion rate',
      icon: '🛡️',
      color: 'text-blue-400 bg-blue-400/10',
      earnedDate: Date.now(),
    });
  }
  
  // Premium member
  if (score.trustIndicators.premiumMember) {
    badges.push({
      id: 'premium',
      type: 'premium',
      name: 'Premium Member',
      description: 'Platinum or Diamond level',
      icon: '💎',
      color: 'text-purple-400 bg-purple-400/10',
      earnedDate: Date.now(),
    });
  }
  
  // Trusted (high overall score)
  if (score.overallScore >= 80) {
    badges.push({
      id: 'trusted',
      type: 'trusted',
      name: 'Trusted',
      description: '80+ reputation score',
      icon: '🏆',
      color: 'text-cyan-400 bg-cyan-400/10',
      earnedDate: Date.now(),
    });
  }
  
  return badges;
}

/**
 * Get reputation insights
 */
export function getReputationInsights(score: ReputationScore): ReputationInsight[] {
  const insights: ReputationInsight[] = [];
  
  // Transaction volume
  if (score.metrics.totalVolume >= 50) {
    insights.push({
      type: 'positive',
      category: 'Transactions',
      message: `High transaction volume (${score.metrics.totalVolume.toFixed(1)} ETH)`,
      impact: 'high',
    });
  } else if (score.metrics.totalTransactions < 5) {
    insights.push({
      type: 'negative',
      category: 'Transactions',
      message: 'Low transaction history',
      impact: 'medium',
      suggestion: 'Complete more transactions to build trust',
    });
  }
  
  // Rating
  if (score.metrics.averageRating >= 4.5) {
    insights.push({
      type: 'positive',
      category: 'Ratings',
      message: `Excellent rating (${score.metrics.averageRating.toFixed(1)}/5.0)`,
      impact: 'high',
    });
  } else if (score.metrics.averageRating < 3.5 && score.metrics.totalReviews > 0) {
    insights.push({
      type: 'negative',
      category: 'Ratings',
      message: 'Below average rating',
      impact: 'high',
      suggestion: 'Improve communication and delivery quality',
    });
  }
  
  // Response time
  if (score.metrics.totalTransactions > 0 && score.metrics.averageResponseTime > 0 && score.metrics.averageResponseTime <= 30) {
    insights.push({
      type: 'positive',
      category: 'Response',
      message: 'Very fast response time',
      impact: 'medium',
    });
  } else if (score.metrics.totalTransactions > 0 && score.metrics.averageResponseTime > 120) {
    insights.push({
      type: 'negative',
      category: 'Response',
      message: 'Slow response time',
      impact: 'medium',
      suggestion: 'Try to respond within 1 hour',
    });
  }
  
  // Disputes
  if (score.metrics.totalTransactions > 0 && score.metrics.disputeRate === 0) {
    insights.push({
      type: 'positive',
      category: 'Disputes',
      message: 'No disputes filed',
      impact: 'medium',
    });
  } else if (score.metrics.disputeRate > 5) {
    insights.push({
      type: 'negative',
      category: 'Disputes',
      message: 'High dispute rate',
      impact: 'high',
      suggestion: 'Ensure accurate listings and clear communication',
    });
  }
  
  // Verification
  if (!score.trustIndicators.isVerified) {
    insights.push({
      type: 'neutral',
      category: 'Verification',
      message: 'Account not verified',
      impact: 'medium',
      suggestion: 'Verify your account to increase trust',
    });
  }
  
  return insights;
}

/**
 * Generate mock ratings
 */
export function generateMockRatings(userId: string, count: number = 10): Rating[] {
  const ratings: Rating[] = [];
  const reviewTexts = [
    'Great seller! Fast delivery and excellent communication.',
    'Amazing asset, exactly as described. Highly recommend!',
    'Professional and reliable. Will buy again.',
    'Good experience overall. Minor delay but resolved quickly.',
    'Outstanding service. Asset quality exceeded expectations.',
    'Smooth transaction. Very responsive to questions.',
    'Excellent communication throughout the process.',
    'Asset is perfect. Seller went above and beyond!',
    'Very happy with the purchase. Thank you!',
    'Quick and easy transaction. No issues at all.',
  ];
  
  for (let i = 0; i < count; i++) {
    const rating = 3 + Math.random() * 2; // 3-5 stars mostly
    
    ratings.push({
      id: `rating_${Date.now()}_${i}`,
      fromUserId: `user_${Math.floor(Math.random() * 1000)}`,
      fromUsername: `user${Math.floor(Math.random() * 1000)}`,
      toUserId: userId,
      transactionId: `tx_${Math.floor(Math.random() * 10000)}`,
      assetId: `${Math.floor(Math.random() * 100)}`,
      assetName: `Asset #${Math.floor(Math.random() * 100)}`,
      overallRating: Math.round(rating * 10) / 10,
      communicationRating: Math.round((rating + Math.random() * 0.5 - 0.25) * 10) / 10,
      deliveryRating: Math.round((rating + Math.random() * 0.5 - 0.25) * 10) / 10,
      accuracyRating: Math.round((rating + Math.random() * 0.5 - 0.25) * 10) / 10,
      review: reviewTexts[i % reviewTexts.length],
      ratingType: Math.random() > 0.5 ? 'seller' : 'buyer',
      verified: Math.random() > 0.3,
      helpful: Math.floor(Math.random() * 20),
      timestamp: Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000, // Last 90 days
    });
  }
  
  return ratings.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get star display
 */
export function getStarDisplay(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  let stars = '⭐'.repeat(fullStars);
  if (hasHalfStar) stars += '✨';
  
  return stars;
}

/**
 * Get rating color
 */
export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return 'text-green-400';
  if (rating >= 4.0) return 'text-[#2CC295]';
  if (rating >= 3.5) return 'text-yellow-400';
  if (rating >= 3.0) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get score comparison
 */
export function getScoreComparison(score: number): ReputationComparison {
  const averageScore = 65; // Platform average
  const percentile = Math.min(Math.round((score / 100) * 100), 100);
  
  return {
    userId: 'current',
    userScore: score,
    averageScore,
    percentile,
  };
}

/**
 * Format time ago
 */
export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}
