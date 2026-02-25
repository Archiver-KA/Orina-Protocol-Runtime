export interface Review {
  id: string;
  assetId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  title: string;
  content: string;
  photos?: string[]; // Image URLs
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: number;
  updatedAt?: number;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  verifiedPurchaseCount: number;
  withPhotosCount: number;
}

export type ReviewSortOption = 'recent' | 'helpful' | 'highest' | 'lowest';

export type ReviewFilterOption = 'all' | 'verified' | 'photos';

export interface ReviewFormData {
  rating: number;
  title: string;
  content: string;
  photos: string[];
}

export interface UserReviewAction {
  reviewId: string;
  helpful: boolean; // true if user marked as helpful
}
