import { Star } from 'lucide-react';
import type { Review } from '@/types/review';

interface ReviewCardProps {
  review: Review;
  currentUserId?: string;
  onEdit: (review: Review) => void;
  onDelete: (reviewId: string) => void;
  onReport: (reviewId: string) => void;
}

function formatReviewDate(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return 'Unknown date';
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ReviewCard({
  review,
  currentUserId,
  onEdit,
  onDelete,
  onReport,
}: ReviewCardProps) {
  const isOwner = !!currentUserId && review.userId === currentUserId;
  const filledStars = Math.max(0, Math.min(5, Math.round(review.rating)));

  return (
    <article className="rounded-xl border border-zinc-800 bg-[rgba(255,255,255,0.02)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{review.userName}</p>
            {review.verifiedPurchase && (
              <span className="rounded-full border border-[#2CC295]/35 bg-[#2CC295]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2CC295]">
                Verified
              </span>
            )}
            <span className="text-xs text-zinc-500">{formatReviewDate(review.createdAt)}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={`${review.id}-star-${index}`}
                  size={14}
                  className={index < filledStars ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-700'}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-white">{review.rating.toFixed(1)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => onEdit(review)}
                className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(review.id)}
                className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:border-red-500/35 hover:bg-red-500/10"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onReport(review.id)}
              className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              Report
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <h3 className="text-base font-semibold text-white">{review.title}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{review.content}</p>
        </div>

        {review.photos && review.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {review.photos.map((photo, index) => (
              <img
                key={`${review.id}-photo-${index}`}
                src={photo}
                alt={`Review photo ${index + 1}`}
                className="h-24 w-full rounded-lg border border-zinc-800 object-cover"
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
          <span>{review.helpfulCount} found this helpful</span>
          {review.updatedAt && review.updatedAt > review.createdAt && (
            <span>Updated {formatReviewDate(review.updatedAt)}</span>
          )}
        </div>
      </div>
    </article>
  );
}
