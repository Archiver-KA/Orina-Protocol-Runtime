import { ReviewStats } from '@/types/review';
import { StarRating } from './star-rating';
import { getRatingPercentage, formatRating } from '@/utils/reviewUtils';
import { Star } from 'lucide-react';

interface RatingBreakdownProps {
  stats: ReviewStats;
}

export function RatingBreakdown({ stats }: RatingBreakdownProps) {
  const { averageRating, totalReviews, ratingBreakdown } = stats;

  return (
    <div className="space-y-6">
      {/* Overall Rating */}
      <div className="flex items-start gap-6">
        <div className="text-center">
          <div className="text-5xl font-bold text-white mb-2">
            {formatRating(averageRating)}
          </div>
          <StarRating rating={averageRating} size={20} />
          <p className="text-sm text-zinc-500 mt-2">
            {totalReviews.toLocaleString()} {totalReviews === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        {/* Breakdown Bars */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingBreakdown[rating as keyof typeof ratingBreakdown];
            const percentage = getRatingPercentage(count, totalReviews);

            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm text-zinc-400">{rating}</span>
                  <Star size={14} className="text-yellow-500" fill="currentColor" />
                </div>

                {/* Progress Bar */}
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      rating >= 4 ? 'bg-green-500' :
                      rating === 3 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <span className="text-sm text-zinc-500 w-12 text-right">
                  {percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
        <div className="text-center p-3 bg-zinc-900/50 rounded-lg">
          <p className="text-sm text-zinc-500 mb-1">Verified Purchase</p>
          <p className="text-xl font-bold text-green-400">
            {stats.verifiedPurchaseCount}
          </p>
        </div>
        <div className="text-center p-3 bg-zinc-900/50 rounded-lg">
          <p className="text-sm text-zinc-500 mb-1">With Photos</p>
          <p className="text-xl font-bold text-blue-400">
            {stats.withPhotosCount}
          </p>
        </div>
      </div>
    </div>
  );
}
