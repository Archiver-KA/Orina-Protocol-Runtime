import { useState, useMemo, useEffect } from 'react';
import { Star, ChevronDown, Filter, Edit } from 'lucide-react';
import { Review, ReviewSortOption, ReviewFilterOption } from '@/types/review';
import { RatingBreakdown } from './rating-breakdown';
import { ReviewCard } from './review-card';
import { WriteReviewModal } from './write-review-modal';
import {
  calculateReviewStats,
  filterReviews,
  sortReviews,
  saveReview,
  deleteReview,
  loadReviewsForAsset,
  canUserReview,
  getUserReview,
  getSortOptionLabel,
  getFilterOptionLabel,
} from '@/utils/reviewUtils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface ReviewsSectionProps {
  assetId: string;
  assetName: string;
  currentUserId?: string;
  currentUserName?: string;
}

export function ReviewsSection({
  assetId,
  assetName,
  currentUserId = 'user_current',
  currentUserName = 'Current User',
}: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sortBy, setSortBy] = useState<ReviewSortOption>('recent');
  const [filterBy, setFilterBy] = useState<ReviewFilterOption>('all');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Load reviews on mount
  useEffect(() => {
    setReviews(loadReviewsForAsset(assetId));
  }, [assetId]);

  // Calculate stats
  const stats = useMemo(() => calculateReviewStats(reviews), [reviews]);

  // Filter and sort
  const processedReviews = useMemo(() => {
    let processed = filterReviews(reviews, filterBy);
    processed = sortReviews(processed, sortBy);
    return processed;
  }, [reviews, filterBy, sortBy]);

  // Display limited reviews initially
  const displayedReviews = showAllReviews ? processedReviews : processedReviews.slice(0, 5);

  // Check if user can review
  const userCanReview = canUserReview(assetId, currentUserId);
  const userReview = getUserReview(assetId, currentUserId);

  const handleWriteReview = () => {
    setEditingReview(null);
    setIsWriteModalOpen(true);
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setIsWriteModalOpen(true);
  };

  const handleDeleteReview = (reviewId: string) => {
    if (confirm('Are you sure you want to delete this review?')) {
      deleteReview(reviewId);
      setReviews(loadReviewsForAsset(assetId));
      toast.success('Review deleted');
    }
  };

  const handleReportReview = (reviewId: string) => {
    toast.success('Review reported. Thank you for helping us maintain quality.');
  };

  const handleSubmitReview = (review: Review) => {
    saveReview(review);
    setReviews(loadReviewsForAsset(assetId));
    setIsWriteModalOpen(false);
    setEditingReview(null);
  };

  const sortOptions: { value: ReviewSortOption; label: string }[] = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'helpful', label: 'Most Helpful' },
    { value: 'highest', label: 'Highest Rating' },
    { value: 'lowest', label: 'Lowest Rating' },
  ];

  const filterOptions: { value: ReviewFilterOption; label: string }[] = [
    { value: 'all', label: `All Reviews (${reviews.length})` },
    { value: 'verified', label: `Verified Purchase (${stats.verifiedPurchaseCount})` },
    { value: 'photos', label: `With Photos (${stats.withPhotosCount})` },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Star size={28} className="text-yellow-500" fill="currentColor" />
          Customer Reviews
        </h2>

        {/* Write Review Button */}
        {userReview ? (
          <button
            onClick={() => handleEditReview(userReview)}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold rounded-lg transition-colors"
          >
            <Edit size={18} />
            Edit Your Review
          </button>
        ) : userCanReview ? (
          <button
            onClick={handleWriteReview}
            className="flex items-center gap-2 px-6 py-3 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold rounded-lg transition-colors"
          >
            <Star size={18} />
            Write a Review
          </button>
        ) : null}
      </div>

      {/* Rating Breakdown */}
      {reviews.length > 0 && (
        <div className="p-6 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl">
          <RatingBreakdown stats={stats} />
        </div>
      )}

      {/* Controls */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ReviewSortOption)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-[#2CC295] transition-colors"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Filter:</span>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as ReviewFilterOption)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-[#2CC295] transition-colors"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Result Count */}
          <div className="ml-auto text-sm text-zinc-500">
            Showing {displayedReviews.length} of {processedReviews.length} reviews
          </div>
        </div>
      )}

      {/* Reviews List */}
      {processedReviews.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Star size={40} className="text-zinc-700" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Reviews Yet</h3>
          <p className="text-sm text-zinc-500 mb-6">
            {filterBy === 'all'
              ? 'Be the first to review this asset!'
              : `No reviews match the selected filter: ${getFilterOptionLabel(filterBy)}`}
          </p>
          {userCanReview && filterBy === 'all' && (
            <button
              onClick={handleWriteReview}
              className="px-6 py-3 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold rounded-lg transition-colors"
            >
              Write the First Review
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {displayedReviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <ReviewCard
                  review={review}
                  currentUserId={currentUserId}
                  onEdit={handleEditReview}
                  onDelete={handleDeleteReview}
                  onReport={handleReportReview}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Load More */}
          {processedReviews.length > 5 && !showAllReviews && (
            <button
              onClick={() => setShowAllReviews(true)}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>Show All {processedReviews.length} Reviews</span>
              <ChevronDown size={18} />
            </button>
          )}
        </div>
      )}

      {/* Write Review Modal */}
      <WriteReviewModal
        isOpen={isWriteModalOpen}
        onClose={() => {
          setIsWriteModalOpen(false);
          setEditingReview(null);
        }}
        assetId={assetId}
        assetName={assetName}
        userId={currentUserId}
        userName={currentUserName}
        existingReview={editingReview}
        onSubmit={handleSubmitReview}
      />
    </div>
  );
}
