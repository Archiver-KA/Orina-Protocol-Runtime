/**
 * Wallet Identity System - Unified types for per-wallet data aggregation
 * 
 * ARCHITECTURE:
 * This is a READ-ONLY aggregation layer. It does NOT own any storage.
 * It reads from existing subsystems and presents a unified view per wallet address.
 * 
 * Data Sources:
 * - Profile: user_profile_${address} (profileUtils)
 * - Activities: studio_user_activities_${address} (profileUtils)
 * - Reputation: studio_reputation_${address} (reputationUtils)
 * - Ratings: studio_ratings_${address} (reputationUtils)
 * - Favorites: orina_favorites_${address} (favoritesUtils)
 * - Reviews: studio_reviews (reviewUtils - global, filtered by userId)
 */

import type { UserProfile } from './profile';
import type { ReputationScore, Rating, TrustBadge } from './reputation';

// ═══════════════════════════════════════════════════
// ASSET SUMMARY - Breakdown by acquisition type
// ═══════════════════════════════════════════════════

export interface WalletAssetSummary {
  /** Total assets currently owned */
  totalOwned: number;
  /** Assets minted by this wallet */
  minted: number;
  /** Assets purchased from marketplace */
  bought: number;
  /** Receipt NFTs (from completed orders) */
  receiptNFTs: number;
  /** Assets received via transfer */
  transferred: number;
  /** Assets currently listed for sale */
  listedForSale: number;
  /** Total assets ever interacted with */
  totalInteracted: number;
}

// ═══════════════════════════════════════════════════
// PORTFOLIO METRICS - Financial overview
// ═══════════════════════════════════════════════════

export interface WalletPortfolioMetrics {
  /** Current portfolio value in ETH */
  portfolioValueETH: number;
  /** Current portfolio value in USD */
  portfolioValueUSD: number;
  /** Total profit/loss percentage */
  totalProfitPercent: number;
  /** Total profit/loss in USD */
  totalProfitUSD: number;
  /** Total spent on purchases in ETH */
  totalSpentETH: number;
  /** Total earned from sales in ETH */
  totalEarnedETH: number;
  /** Total transaction volume in ETH */
  totalVolumeETH: number;
  /** Number of networks/chains active on */
  activeNetworks: number;
}

// ═══════════════════════════════════════════════════
// TRUST METRICS - Performance indicators
// ═══════════════════════════════════════════════════

export interface WalletTrustMetrics {
  /** Response rate percentage (0-100) */
  responseRate: number;
  /** Order completion rate percentage (0-100) */
  orderCompletionRate: number;
  /** Average response time in hours */
  avgResponseTimeHours: number;
  /** Dispute rate percentage (0-100, lower is better) */
  disputeRate: number;
  /** Total successful transactions */
  successfulTransactions: number;
  /** Total failed transactions */
  failedTransactions: number;
}

// ═══════════════════════════════════════════════════
// SOCIAL METRICS
// ═══════════════════════════════════════════════════

export interface WalletSocialMetrics {
  /** Number of followers */
  followersCount: number;
  /** Number of following */
  followingCount: number;
  /** Join date timestamp */
  joinedDate: number;
  /** Last active timestamp */
  lastActive: number;
  /** Formatted join date string */
  joinedDateFormatted: string;
  /** Account age in days */
  accountAgeDays: number;
}

// ═══════════════════════════════════════════════════
// REPUTATION SUMMARY
// ═══════════════════════════════════════════════════

export interface WalletReputationSummary {
  /** Overall reputation score (0-100) */
  overallScore: number;
  /** Reputation level name */
  level: string;
  /** Level icon emoji */
  levelIcon: string;
  /** Level color class */
  levelColor: string;
  /** Average rating from reviews (0-5) */
  averageRating: number;
  /** Total number of reviews received */
  totalReviews: number;
  /** Trust badges earned */
  trustBadges: TrustBadge[];
  /** Recent ratings (last 5) */
  recentRatings: Rating[];
  /** Full reputation score object (if available) */
  fullScore: ReputationScore | null;
}

// ═══════════════════════════════════════════════════
// VERIFICATION STATUS
// ═══════════════════════════════════════════════════

export interface WalletVerificationStatus {
  /** Is account verified */
  isVerified: boolean;
  /** Verification date */
  verifiedDate?: number;
  /** Is premium member (Platinum/Diamond level) */
  isPremium: boolean;
  /** Premium level name (if premium) */
  premiumLevel?: string;
  /** KYC verified */
  kycVerified: boolean;
  /** Email verified */
  emailVerified: boolean;
}

// ═══════════════════════════════════════════════════
// UNIFIED WALLET IDENTITY
// ═══════════════════════════════════════════════════

export interface WalletIdentity {
  /** Normalized wallet address (lowercase) */
  address: string;
  /** Display name */
  displayName: string;
  /** Username (@handle) */
  username: string;
  /** Bio text */
  bio?: string;
  /** Avatar URL (custom or undefined for default) */
  avatarUrl?: string;
  /** Banner URL */
  bannerUrl?: string;
  /** Social links */
  socialLinks: UserProfile['socialLinks'];

  /** Asset breakdown */
  assets: WalletAssetSummary;
  /** Portfolio financial metrics */
  portfolio: WalletPortfolioMetrics;
  /** Trust & performance metrics */
  trust: WalletTrustMetrics;
  /** Social metrics (followers, joined date, etc.) */
  social: WalletSocialMetrics;
  /** Reputation summary */
  reputation: WalletReputationSummary;
  /** Verification & premium status */
  verification: WalletVerificationStatus;

  /** Raw profile object (for edit operations) */
  rawProfile: UserProfile | null;

  /** Timestamp when this identity was last computed */
  computedAt: number;
}
