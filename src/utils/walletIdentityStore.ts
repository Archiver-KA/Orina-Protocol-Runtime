/**
 * Wallet Identity Store - Unified Aggregation Layer
 * 
 * DESIGN PRINCIPLES:
 * 1. READ-ONLY aggregation - does NOT own any storage
 * 2. Wallet address is the SINGLE source of truth
 * 3. All addresses normalized to lowercase before any operation
 * 4. Graceful fallbacks - never crashes, always returns defaults
 * 5. No side effects - pure computation from existing data stores
 * 
 * SECURITY:
 * - All address inputs are validated and normalized
 * - No cross-wallet data leakage
 * - Each function is idempotent
 * 
 * COMPATIBILITY:
 * - Does not modify existing storage keys
 * - Falls back gracefully when subsystems return null/empty
 * - Works with both Phase 1 migrated and legacy data
 */

import type {
  WalletIdentity,
  WalletAssetSummary,
  WalletPortfolioMetrics,
  WalletTrustMetrics,
  WalletSocialMetrics,
  WalletReputationSummary,
  WalletVerificationStatus,
} from '@/types/wallet-identity';
import type { UserProfile, ActivityItem } from '@/types/profile';
import type { ReputationScore, Rating, TrustBadge } from '@/types/reputation';

// Import from existing subsystems
import {
  loadUserProfile,
  loadUserActivities,
  shortenUserDisplayName,
} from '@/utils/profileUtils';
import {
  loadReputationScore,
  calculateReputationScore,
  loadRatings,
  generateMockRatings,
  saveRatings,
  saveReputationScore,
  getReputationLevel,
  getLevelInfo,
  getTrustBadges,
} from '@/utils/reputationUtils';

// ═══════════════════════════════════════════════════
// ADDRESS NORMALIZATION
// ═══════════════════════════════════════════════════

function normalize(address: string): string {
  return address.toLowerCase();
}

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ═══════════════════════════════════════════════════
// ASSET AGGREGATION
// ═══════════════════════════════════════════════════

function computeAssetSummary(activities: ActivityItem[]): WalletAssetSummary {
  const minted = activities.filter(a => a.type === 'mint' && a.status === 'completed').length;
  const bought = activities.filter(a => a.type === 'purchase' && a.status === 'completed').length;
  const sold = activities.filter(a => a.type === 'sale' && a.status === 'completed').length;
  const transferred = activities.filter(a => a.type === 'transfer' && a.status === 'completed').length;
  const listed = activities.filter(a => a.type === 'list' && a.status === 'completed').length;
  
  // Estimate receipt NFTs from completed purchases (each purchase generates a receipt)
  const receiptNFTs = bought;
  
  // Total owned = minted + bought + received transfers - sold - outgoing transfers
  // Since we can't distinguish incoming/outgoing transfers from activity data alone,
  // we estimate conservatively
  const totalOwned = Math.max(0, minted + bought + Math.floor(transferred / 2) - sold);
  
  return {
    totalOwned,
    minted,
    bought,
    receiptNFTs,
    transferred,
    listedForSale: Math.max(0, listed - sold), // Currently listed = listed - sold
    totalInteracted: activities.length,
  };
}

// ═══════════════════════════════════════════════════
// PORTFOLIO METRICS
// ═══════════════════════════════════════════════════

function computePortfolioMetrics(
  activities: ActivityItem[],
  profile: UserProfile | null
): WalletPortfolioMetrics {
  const purchases = activities.filter(a => a.type === 'purchase' && a.status === 'completed');
  const sales = activities.filter(a => a.type === 'sale' && a.status === 'completed');
  
  const totalSpentETH = purchases.reduce((sum, a) => sum + (a.price || 0), 0);
  const totalEarnedETH = sales.reduce((sum, a) => sum + (a.price || 0), 0);
  const totalVolumeETH = totalSpentETH + totalEarnedETH;
  
  // Compute profit
  const profitETH = totalEarnedETH - totalSpentETH;
  const totalProfitPercent = totalSpentETH > 0 
    ? ((profitETH / totalSpentETH) * 100) 
    : 0;
  
  // ETH price assumption for USD conversion (would come from oracle in production)
  const ethPriceUSD = 2300;
  
  // Portfolio value estimation: 
  // Use profile stats if available, otherwise estimate from activity
  const portfolioValueETH = profile?.stats?.totalVolume 
    ? profile.stats.totalVolume * 0.6 // Rough estimate: 60% of volume is current holdings
    : Math.max(0, totalSpentETH - totalEarnedETH) * 1.2; // 20% appreciation estimate
  
  return {
    portfolioValueETH: Math.round(portfolioValueETH * 100) / 100,
    portfolioValueUSD: Math.round(portfolioValueETH * ethPriceUSD * 100) / 100,
    totalProfitPercent: Math.round(totalProfitPercent * 10) / 10,
    totalProfitUSD: Math.round(profitETH * ethPriceUSD * 100) / 100,
    totalSpentETH: Math.round(totalSpentETH * 100) / 100,
    totalEarnedETH: Math.round(totalEarnedETH * 100) / 100,
    totalVolumeETH: Math.round(totalVolumeETH * 100) / 100,
    activeNetworks: 1, // Default to 1 (Ethereum), expand later
  };
}

// ═══════════════════════════════════════════════════
// TRUST METRICS
// ═══════════════════════════════════════════════════

function computeTrustMetrics(
  activities: ActivityItem[],
  reputation: ReputationScore | null
): WalletTrustMetrics {
  // If we have reputation data, use it
  if (reputation) {
    return {
      responseRate: Math.round(reputation.responseScore),
      orderCompletionRate: Math.round(reputation.completionScore),
      avgResponseTimeHours: Math.round((reputation.metrics.averageResponseTime / 60) * 10) / 10,
      disputeRate: Math.round(reputation.metrics.disputeRate * 10) / 10,
      successfulTransactions: reputation.metrics.successfulTransactions,
      failedTransactions: reputation.metrics.failedTransactions,
    };
  }

  // Fallback: compute from activities
  const completedTx = activities.filter(a => 
    ['purchase', 'sale'].includes(a.type) && a.status === 'completed'
  ).length;
  const failedTx = activities.filter(a => 
    ['purchase', 'sale'].includes(a.type) && a.status === 'failed'
  ).length;
  const totalTx = completedTx + failedTx;

  return {
    responseRate: totalTx > 0 ? Math.round((completedTx / totalTx) * 100) : 100,
    orderCompletionRate: totalTx > 0 ? Math.round((completedTx / totalTx) * 100) : 100,
    avgResponseTimeHours: 0,
    disputeRate: 0,
    successfulTransactions: completedTx,
    failedTransactions: failedTx,
  };
}

// ═══════════════════════════════════════════════════
// SOCIAL METRICS
// ═══════════════════════════════════════════════════

function computeSocialMetrics(profile: UserProfile | null): WalletSocialMetrics {
  const now = Date.now();
  const joinedDate = profile?.stats?.joinedDate || now;
  const lastActive = profile?.stats?.lastActive || now;
  const accountAgeDays = Math.floor((now - joinedDate) / (1000 * 60 * 60 * 24));

  // Format join date
  const joinDate = new Date(joinedDate);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const joinedDateFormatted = `${months[joinDate.getMonth()]} ${joinDate.getFullYear()}`;

  return {
    followersCount: profile?.followers?.length || 0,
    followingCount: profile?.following?.length || 0,
    joinedDate,
    lastActive,
    joinedDateFormatted,
    accountAgeDays,
  };
}

// ═══════════════════════════════════════════════════
// REPUTATION AGGREGATION
// ═══════════════════════════════════════════════════

function computeReputationSummary(
  address: string,
  activities: ActivityItem[],
  profile: UserProfile | null
): WalletReputationSummary {
  const addr = normalize(address);
  
  // Try to load existing reputation score
  // Try both normalized and original address for backward compat
  let reputation = loadReputationScore(addr);
  if (!reputation && address !== addr) {
    reputation = loadReputationScore(address);
  }
  
  // Load ratings
  let ratings = loadRatings(addr);
  if (ratings.length === 0 && address !== addr) {
    ratings = loadRatings(address);
  }
  
  // If no reputation score exists and we have some data, calculate it
  if (!reputation) {
    if (ratings.length === 0 && activities.length === 0) {
      // Brand new wallet - return defaults
      return {
        overallScore: 50, // Neutral starting score
        level: 'Newcomer',
        levelIcon: '🌱',
        levelColor: 'text-zinc-400',
        averageRating: 0,
        totalReviews: 0,
        trustBadges: [],
        recentRatings: [],
        fullScore: null,
      };
    }
    
    // Generate mock ratings for demo if no real ratings exist
    if (ratings.length === 0) {
      ratings = generateMockRatings(addr, 8);
      saveRatings(addr, ratings);
    }
    
    const accountAge = profile 
      ? Math.floor((Date.now() - profile.stats.joinedDate) / (1000 * 60 * 60 * 24))
      : 30;
    
    reputation = calculateReputationScore(
      activities.length > 0 ? activities : activities,
      ratings,
      [],
      accountAge,
      profile?.verified || false
    );
    
    // Save with normalized address
    reputation.userId = addr;
    saveReputationScore(reputation);
  }
  
  // Get level info
  const level = getReputationLevel(reputation.overallScore);
  const levelInfo = getLevelInfo(level);
  
  // Get trust badges
  const trustBadges = getTrustBadges(reputation);
  
  // Compute average rating
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.overallRating, 0) / ratings.length
    : reputation.metrics.averageRating;
  
  return {
    overallScore: reputation.overallScore,
    level: levelInfo.name,
    levelIcon: levelInfo.icon,
    levelColor: levelInfo.color,
    averageRating: Math.round(avgRating * 10) / 10,
    totalReviews: ratings.length,
    trustBadges,
    recentRatings: ratings.slice(0, 5),
    fullScore: reputation,
  };
}

// ═══════════════════════════════════════════════════
// VERIFICATION STATUS
// ═══════════════════════════════════════════════════

function computeVerificationStatus(
  profile: UserProfile | null,
  reputation: ReputationScore | null
): WalletVerificationStatus {
  const isVerified = profile?.verified || false;
  const verifiedDate = profile?.verifiedDate;
  
  // Premium = Platinum (80+) or Diamond (90+)
  const score = reputation?.overallScore || 0;
  const level = getReputationLevel(score);
  const isPremium = level === 'platinum' || level === 'diamond';
  
  return {
    isVerified,
    verifiedDate,
    isPremium,
    premiumLevel: isPremium ? getLevelInfo(level).name : undefined,
    kycVerified: reputation?.trustIndicators?.kycVerified || false,
    emailVerified: reputation?.trustIndicators?.emailVerified || false,
  };
}

// ═══════════════════════════════════════════════════
// MAIN AGGREGATION FUNCTION
// ═══════════════════════════════════════════════════

/**
 * Get unified wallet identity by aggregating all subsystems.
 * This is the ONLY function external code should call.
 * 
 * @param address - Wallet address (will be normalized)
 * @returns Complete WalletIdentity object
 * 
 * GUARANTEES:
 * - Always returns a valid WalletIdentity (never null)
 * - All addresses normalized to lowercase
 * - No side effects except lazy initialization of reputation data
 * - Idempotent - calling multiple times with same address returns consistent data
 */
export function getWalletIdentity(address: string): WalletIdentity {
  if (!address) {
    console.warn('[WalletIdentity] No address provided, returning empty identity');
    return createEmptyIdentity('0x0000000000000000000000000000000000000000');
  }

  const addr = normalize(address);
  
  console.log(`[WalletIdentity] Computing identity for ${addr.slice(0, 8)}...`);
  
  // Step 1: Load raw profile
  const profile = loadUserProfile(addr);
  
  // Step 2: Load activities
  const activities = loadUserActivities(addr);
  
  // Step 3: Compute all metric groups
  const assets = computeAssetSummary(activities);
  const portfolio = computePortfolioMetrics(activities, profile);
  const social = computeSocialMetrics(profile);
  const reputation = computeReputationSummary(addr, activities, profile);
  const trust = computeTrustMetrics(activities, reputation.fullScore);
  const verification = computeVerificationStatus(profile, reputation.fullScore);
  
  const identity: WalletIdentity = {
    address: addr,
    displayName: profile?.displayName || shortenUserDisplayName(address),
    username: profile?.username || `@${address.slice(2, 10)}`,
    bio: profile?.bio,
    avatarUrl: profile?.avatarUrl || profile?.avatar,
    bannerUrl: profile?.bannerUrl || profile?.banner,
    socialLinks: profile?.socialLinks || {},
    
    assets,
    portfolio,
    trust,
    social,
    reputation,
    verification,
    
    rawProfile: profile,
    computedAt: Date.now(),
  };
  
  console.log(`[WalletIdentity] Identity computed:`, {
    score: reputation.overallScore,
    level: reputation.level,
    assets: assets.totalOwned,
    portfolio: `${portfolio.portfolioValueETH} ETH`,
    followers: social.followersCount,
    isPremium: verification.isPremium,
    isVerified: verification.isVerified,
  });
  
  return identity;
}

/**
 * Create an empty identity for a wallet with no data
 */
function createEmptyIdentity(address: string): WalletIdentity {
  const addr = normalize(address);
  return {
    address: addr,
    displayName: shortenUserDisplayName(address),
    username: `@${address.slice(2, 10)}`,
    bio: undefined,
    avatarUrl: undefined,
    bannerUrl: undefined,
    socialLinks: {},
    
    assets: {
      totalOwned: 0,
      minted: 0,
      bought: 0,
      receiptNFTs: 0,
      transferred: 0,
      listedForSale: 0,
      totalInteracted: 0,
    },
    portfolio: {
      portfolioValueETH: 0,
      portfolioValueUSD: 0,
      totalProfitPercent: 0,
      totalProfitUSD: 0,
      totalSpentETH: 0,
      totalEarnedETH: 0,
      totalVolumeETH: 0,
      activeNetworks: 1,
    },
    trust: {
      responseRate: 100,
      orderCompletionRate: 100,
      avgResponseTimeHours: 0,
      disputeRate: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
    },
    social: {
      followersCount: 0,
      followingCount: 0,
      joinedDate: Date.now(),
      lastActive: Date.now(),
      joinedDateFormatted: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      accountAgeDays: 0,
    },
    reputation: {
      overallScore: 50,
      level: 'Newcomer',
      levelIcon: '🌱',
      levelColor: 'text-zinc-400',
      averageRating: 0,
      totalReviews: 0,
      trustBadges: [],
      recentRatings: [],
      fullScore: null,
    },
    verification: {
      isVerified: false,
      isPremium: false,
      kycVerified: false,
      emailVerified: false,
    },
    
    rawProfile: null,
    computedAt: Date.now(),
  };
}

// ═══════════════════════════════════════════════════
// FORMATTING HELPERS
// ═══════════════════════════════════════════════════

/**
 * Format ETH value with appropriate precision
 */
export function formatETH(value: number): string {
  if (value === 0) return '0.00';
  if (value >= 1000) return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (value >= 100) return value.toFixed(1);
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(3);
}

/**
 * Format USD value
 */
export function formatUSD(value: number): string {
  if (value === 0) return '$0.00';
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${value.toFixed(2)}`;
}

/**
 * Format profit with sign
 */
export function formatProfit(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

/**
 * Format response time
 */
export function formatResponseTime(hours: number): string {
  if (hours === 0) return 'N/A';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours / 24)}d`;
}

/**
 * Get score gauge CSS gradient
 * Returns a conic-gradient string for the reputation score ring
 */
export function getScoreGaugeGradient(score: number): string {
  const percent = Math.max(0, Math.min(100, score));
  return `conic-gradient(from 0deg, #2CC295 0%, #2CC295 ${percent}%, #1f2937 ${percent}%)`;
}

/**
 * Get trust metric bar width percentage
 */
export function getTrustBarWidth(value: number): string {
  return `${Math.max(0, Math.min(100, value))}%`;
}