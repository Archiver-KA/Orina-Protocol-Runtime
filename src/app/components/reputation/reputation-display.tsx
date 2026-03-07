import { ReputationScore } from '@/types/reputation';
import { getLevelInfo, getTrustBadges } from '@/utils/reputationUtils';
import { Shield, Star, TrendingUp, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ReputationDisplayProps {
  score: ReputationScore;
  variant?: 'compact' | 'detailed';
  showBadges?: boolean;
  onClick?: () => void;
}

export function ReputationDisplay({
  score,
  variant = 'compact',
  showBadges = true,
  onClick,
}: ReputationDisplayProps) {
  const levelInfo = getLevelInfo(score.level);
  const badges = getTrustBadges(score);
  const isClickable = !!onClick;

  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-2 ${isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
        onClick={onClick}
      >
        {/* Level Badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800`}>
          <span className="text-lg">{levelInfo.icon}</span>
          <div>
            <p className={`text-xs font-bold ${levelInfo.color}`}>
              {levelInfo.name}
            </p>
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-1">
          <Shield size={14} className="text-[#2CC295]" />
          <span className="text-sm font-bold text-white">{score.overallScore}</span>
        </div>

        {/* Rating */}
        {score.metrics.totalReviews > 0 && (
          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold text-white">
              {score.metrics.averageRating.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-500">
              ({score.metrics.totalReviews})
            </span>
          </div>
        )}

        {/* Trust Badges */}
        {showBadges && badges.length > 0 && (
          <div className="flex items-center gap-1">
            {badges.slice(0, 3).map(badge => (
              <span
                key={badge.id}
                className={`px-1.5 py-0.5 text-xs font-bold rounded ${badge.color}`}
                title={badge.description}
              >
                {badge.icon}
              </span>
            ))}
            {badges.length > 3 && (
              <span className="text-xs text-zinc-500">+{badges.length - 3}</span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl ${
        isClickable ? 'cursor-pointer hover:border-zinc-700 transition-colors' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-6">
        {/* Level Info */}
        <div className="flex items-center gap-4">
          <div className="text-5xl">{levelInfo.icon}</div>
          <div>
            <h3 className={`text-2xl font-bold ${levelInfo.color}`}>
              {levelInfo.name}
            </h3>
            <p className="text-sm text-zinc-500">
              Reputation Level
            </p>
          </div>
        </div>

        {/* Overall Score */}
        <div className="text-right">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-[#2CC295]" />
            <span className="text-3xl font-bold text-white">
              {score.overallScore}
            </span>
          </div>
          <p className="text-xs text-zinc-500">out of 100</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-zinc-500">Progress to next level</span>
          <span className="text-white font-bold">
            {score.overallScore}/{levelInfo.maxScore + 1}
          </span>
        </div>
        <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((score.overallScore - levelInfo.minScore) / (levelInfo.maxScore - levelInfo.minScore + 1)) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-[#2CC295] to-[#25a882]"
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-zinc-900/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star size={16} className="text-yellow-400" />
            <span className="text-xl font-bold text-white">
              {score.metrics.averageRating > 0 ? score.metrics.averageRating.toFixed(1) : 'N/A'}
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            {score.metrics.totalReviews} reviews
          </p>
        </div>

        <div className="text-center p-3 bg-zinc-900/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp size={16} className="text-[#2CC295]" />
            <span className="text-xl font-bold text-white">
              {score.metrics.completionRate.toFixed(0)}%
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Success rate
          </p>
        </div>

        <div className="text-center p-3 bg-zinc-900/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertCircle size={16} className="text-blue-400" />
            <span className="text-xl font-bold text-white">
              {score.metrics.disputeRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Dispute rate
          </p>
        </div>
      </div>

      {/* Trust Badges */}
      {showBadges && badges.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider font-bold">
            Trust Badges
          </p>
          <div className="flex flex-wrap gap-2">
            {badges.map(badge => (
              <div
                key={badge.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${badge.color}`}
                title={badge.description}
              >
                <span>{badge.icon}</span>
                <span className="text-xs font-bold">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isClickable && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 text-center">
            Click to view detailed reputation
          </p>
        </div>
      )}
    </motion.div>
  );
}
