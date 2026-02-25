export interface ReputationScore {
  userId: string;
  overallScore: number; // 0-100
  level: ReputationLevel;
  
  // Component scores (each 0-100)
  transactionScore: number;
  ratingScore: number;
  responseScore: number;
  completionScore: number;
  disputeScore: number;
  verificationScore: number;
  
  // Metrics
  metrics: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalVolume: number; // ETH
    averageRating: number; // 0-5
    totalReviews: number;
    averageResponseTime: number; // minutes
    completionRate: number; // 0-100%
    disputeRate: number; // 0-100%
    disputesResolved: number;
    disputesTotal: number;
    accountAge: number; // days
  };
  
  // Trust indicators
  trustIndicators: {
    isVerified: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    kycVerified: boolean;
    hasEscrow: boolean;
    premiumMember: boolean;
  };
  
  // History
  scoreHistory: ScoreHistoryItem[];
  recentRatings: Rating[];
  
  // Timestamps
  lastUpdated: number;
  lastTransactionDate?: number;
}

export interface ScoreHistoryItem {
  timestamp: number;
  score: number;
  change: number;
  reason: string;
}

export interface Rating {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  transactionId: string;
  assetId: string;
  assetName: string;
  
  // Ratings (1-5)
  overallRating: number;
  communicationRating: number;
  deliveryRating: number;
  accuracyRating: number;
  
  // Review
  review?: string;
  pros?: string[];
  cons?: string[];
  
  // Type
  ratingType: 'seller' | 'buyer';
  
  // Response
  response?: string;
  responseDate?: number;
  
  // Status
  verified: boolean;
  helpful: number;
  
  timestamp: number;
}

export type ReputationLevel = 
  | 'newcomer'      // 0-19
  | 'bronze'        // 20-39
  | 'silver'        // 40-59
  | 'gold'          // 60-79
  | 'platinum'      // 80-89
  | 'diamond';      // 90-100

export interface ReputationLevelInfo {
  level: ReputationLevel;
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
  icon: string;
  benefits: string[];
}

export interface DisputeRecord {
  id: string;
  transactionId: string;
  assetId: string;
  assetName: string;
  
  initiatedBy: string;
  against: string;
  
  reason: string;
  description: string;
  
  status: 'pending' | 'investigating' | 'resolved' | 'closed';
  resolution?: 'favor_buyer' | 'favor_seller' | 'compromise' | 'no_fault';
  
  timeline: DisputeTimelineItem[];
  
  createdAt: number;
  resolvedAt?: number;
}

export interface DisputeTimelineItem {
  timestamp: number;
  action: string;
  actor: string;
  details: string;
}

export interface TrustBadge {
  id: string;
  type: 'verified' | 'top_seller' | 'fast_responder' | 'reliable' | 'premium' | 'trusted';
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedDate: number;
}

export interface ReputationInsight {
  type: 'positive' | 'negative' | 'neutral';
  category: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  suggestion?: string;
}

export interface ReputationComparison {
  userId: string;
  userScore: number;
  averageScore: number;
  percentile: number; // 0-100 (top X%)
  rank?: number;
  totalUsers?: number;
}
