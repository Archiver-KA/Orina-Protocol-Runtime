import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showLabel?: boolean;
}

export function StarRating({ rating, size = 18, interactive = false, onChange, showLabel = false }: StarRatingProps) {
  const handleClick = (value: number) => {
    if (interactive && onChange) {
      onChange(value);
    }
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return 'text-green-400';
    if (rating >= 4.0) return 'text-green-500';
    if (rating >= 3.0) return 'text-yellow-500';
    if (rating >= 2.0) return 'text-orange-500';
    return 'text-red-500';
  };

  const getRatingLabel = (rating: number): string => {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4.0) return 'Very Good';
    if (rating >= 3.0) return 'Good';
    if (rating >= 2.0) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => {
        const isFilled = value <= Math.round(rating);
        const isHalfFilled = value === Math.ceil(rating) && rating % 1 !== 0;

        return (
          <button
            key={value}
            onClick={() => handleClick(value)}
            disabled={!interactive}
            className={`
              relative transition-all
              ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
            `}
          >
            {isHalfFilled ? (
              <div className="relative">
                <Star size={size} className="text-zinc-700" fill="currentColor" />
                <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                  <Star size={size} className={getRatingColor(rating)} fill="currentColor" />
                </div>
              </div>
            ) : (
              <Star
                size={size}
                className={isFilled ? getRatingColor(rating) : 'text-zinc-700'}
                fill={isFilled ? 'currentColor' : 'none'}
              />
            )}
          </button>
        );
      })}

      {showLabel && (
        <span className={`ml-2 text-sm font-bold ${getRatingColor(rating)}`}>
          {getRatingLabel(rating)}
        </span>
      )}
    </div>
  );
}
