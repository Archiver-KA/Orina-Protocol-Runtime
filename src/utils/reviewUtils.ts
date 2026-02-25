import { Review, ReviewStats, ReviewSortOption, ReviewFilterOption, UserReviewAction } from '@/types/review';

const REVIEWS_STORAGE_KEY = 'studio_reviews';
const USER_ACTIONS_KEY = 'studio_review_actions';

/**
 * Calculate review statistics
 */
export function calculateReviewStats(reviews: Review[]): ReviewStats {
  const totalReviews = reviews.length;
  
  if (totalReviews === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      verifiedPurchaseCount: 0,
      withPhotosCount: 0,
    };
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / totalReviews;

  const ratingBreakdown = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  const verifiedPurchaseCount = reviews.filter((r) => r.verifiedPurchase).length;
  const withPhotosCount = reviews.filter((r) => r.photos && r.photos.length > 0).length;

  return {
    averageRating,
    totalReviews,
    ratingBreakdown,
    verifiedPurchaseCount,
    withPhotosCount,
  };
}

/**
 * Filter reviews
 */
export function filterReviews(reviews: Review[], filter: ReviewFilterOption): Review[] {
  switch (filter) {
    case 'verified':
      return reviews.filter((r) => r.verifiedPurchase);
    case 'photos':
      return reviews.filter((r) => r.photos && r.photos.length > 0);
    case 'all':
    default:
      return reviews;
  }
}

/**
 * Sort reviews
 */
export function sortReviews(reviews: Review[], sort: ReviewSortOption): Review[] {
  const sorted = [...reviews];

  switch (sort) {
    case 'recent':
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
    case 'helpful':
      return sorted.sort((a, b) => b.helpfulCount - a.helpfulCount);
    case 'highest':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'lowest':
      return sorted.sort((a, b) => a.rating - b.rating);
    default:
      return sorted;
  }
}

/**
 * Get rating color
 */
export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return 'text-green-400';
  if (rating >= 4.0) return 'text-green-500';
  if (rating >= 3.0) return 'text-yellow-500';
  if (rating >= 2.0) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Get rating label
 */
export function getRatingLabel(rating: number): string {
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 4.0) return 'Very Good';
  if (rating >= 3.0) return 'Good';
  if (rating >= 2.0) return 'Fair';
  return 'Poor';
}

/**
 * Format rating (e.g., "4.5" or "5.0")
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/**
 * Validate review form
 */
export function validateReviewForm(data: Partial<Review>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.rating || data.rating < 1 || data.rating > 5) {
    errors.push('Please select a rating');
  }

  if (!data.title || data.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters');
  }

  if (!data.content || data.content.trim().length < 20) {
    errors.push('Review must be at least 20 characters');
  }

  if (data.title && data.title.length > 100) {
    errors.push('Title must be less than 100 characters');
  }

  if (data.content && data.content.length > 2000) {
    errors.push('Review must be less than 2000 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Load all reviews from localStorage
 */
export function loadAllReviews(): Review[] {
  try {
    const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load reviews:', error);
    return [];
  }
}

/**
 * Load reviews for specific asset
 */
export function loadReviewsForAsset(assetId: string): Review[] {
  const allReviews = loadAllReviews();
  return allReviews.filter((r) => r.assetId === assetId);
}

/**
 * Save review
 */
export function saveReview(review: Review): void {
  try {
    const allReviews = loadAllReviews();
    const existingIndex = allReviews.findIndex((r) => r.id === review.id);

    if (existingIndex !== -1) {
      // Update existing
      allReviews[existingIndex] = { ...review, updatedAt: Date.now() };
    } else {
      // Add new
      allReviews.push(review);
    }

    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(allReviews));
  } catch (error) {
    console.error('Failed to save review:', error);
  }
}

/**
 * Delete review
 */
export function deleteReview(reviewId: string): void {
  try {
    const allReviews = loadAllReviews();
    const filtered = allReviews.filter((r) => r.id !== reviewId);
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete review:', error);
  }
}

/**
 * Load user review actions (helpful votes)
 */
export function loadUserActions(): UserReviewAction[] {
  try {
    const stored = localStorage.getItem(USER_ACTIONS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load user actions:', error);
    return [];
  }
}

/**
 * Check if user marked review as helpful
 */
export function isMarkedHelpful(reviewId: string): boolean {
  const actions = loadUserActions();
  return actions.some((a) => a.reviewId === reviewId && a.helpful);
}

/**
 * Toggle helpful vote
 */
export function toggleHelpful(reviewId: string): boolean {
  try {
    const actions = loadUserActions();
    const existingIndex = actions.findIndex((a) => a.reviewId === reviewId);

    let isHelpful = false;

    if (existingIndex !== -1) {
      // Toggle existing
      actions[existingIndex].helpful = !actions[existingIndex].helpful;
      isHelpful = actions[existingIndex].helpful;
    } else {
      // Add new
      actions.push({ reviewId, helpful: true });
      isHelpful = true;
    }

    localStorage.setItem(USER_ACTIONS_KEY, JSON.stringify(actions));

    // Update review helpful count
    const allReviews = loadAllReviews();
    const reviewIndex = allReviews.findIndex((r) => r.id === reviewId);
    if (reviewIndex !== -1) {
      allReviews[reviewIndex].helpfulCount += isHelpful ? 1 : -1;
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(allReviews));
    }

    return isHelpful;
  } catch (error) {
    console.error('Failed to toggle helpful:', error);
    return false;
  }
}

/**
 * Get percentage for rating breakdown
 */
export function getRatingPercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

/**
 * Generate review ID
 */
export function generateReviewId(): string {
  return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if user can review (not already reviewed)
 */
export function canUserReview(assetId: string, userId: string): boolean {
  const reviews = loadReviewsForAsset(assetId);
  return !reviews.some((r) => r.userId === userId);
}

/**
 * Get user's review for asset
 */
export function getUserReview(assetId: string, userId: string): Review | null {
  const reviews = loadReviewsForAsset(assetId);
  return reviews.find((r) => r.userId === userId) || null;
}

/**
 * Get sort option label
 */
export function getSortOptionLabel(sort: ReviewSortOption): string {
  switch (sort) {
    case 'recent':
      return 'Most Recent';
    case 'helpful':
      return 'Most Helpful';
    case 'highest':
      return 'Highest Rating';
    case 'lowest':
      return 'Lowest Rating';
    default:
      return sort;
  }
}

/**
 * Get filter option label
 */
export function getFilterOptionLabel(filter: ReviewFilterOption): string {
  switch (filter) {
    case 'all':
      return 'All Reviews';
    case 'verified':
      return 'Verified Purchase';
    case 'photos':
      return 'With Photos';
    default:
      return filter;
  }
}
