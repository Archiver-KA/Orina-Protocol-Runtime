import { useState } from 'react';
import { Shield, Star, TrendingUp, Clock, AlertCircle, CheckCircle, Users, Award } from 'lucide-react';
import { ReputationScore, Rating } from '@/types/reputation';
import { 
  getLevelInfo, 
  getReputationLevels,
  getTrustBadges,
  getReputationInsights,
  getScoreComparison,
  getStarDisplay,
  getRatingColor,
  formatTimeAgo,
} from '@/utils/reputationUtils';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

interface ReputationModalProps {
  score: ReputationScore;
  ratings: Rating[];
  onClose: () => void;
}

export function ReputationModal({ score, ratings, onClose }: ReputationModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'ratings' | 'levels'>('overview');
  
  const levelInfo = getLevelInfo(score.level);
  const badges = getTrustBadges(score);
  const insights = getReputationInsights(score);
  const comparison = getScoreComparison(score.overallScore);
  const levels = getReputationLevels();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="studio-modal-theme w-full max-w-4xl bg-ui-card border border-ui-border-subtle rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2CC295]/10 rounded-lg">
              <Shield size={24} className="text-[#2CC295]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Reputation Score</h2>
              <p className="text-sm text-zinc-500">Detailed trust & performance metrics</p>
            </div>
          </div>
          <StudioModalCloseButton onClick={onClose} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-zinc-800">
          {[
            { id: 'overview' as const, label: 'Overview' },
            { id: 'breakdown' as const, label: 'Score Breakdown' },
            { id: 'ratings' as const, label: `Ratings (${ratings.length})` },
            { id: 'levels' as const, label: 'All Levels' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-3 text-sm font-semibold transition-colors relative
                ${activeTab === tab.id
                  ? 'text-[#2CC295]'
                  : 'text-zinc-500 hover:text-white'
                }
              `}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeReputationTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2CC295]"
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <OverviewTab score={score} badges={badges} insights={insights} comparison={comparison} />
          )}
          {activeTab === 'breakdown' && (
            <BreakdownTab score={score} />
          )}
          {activeTab === 'ratings' && (
            <RatingsTab ratings={ratings} />
          )}
          {activeTab === 'levels' && (
            <LevelsTab levels={levels} currentLevel={score.level} currentScore={score.overallScore} />
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ 
  score, 
  badges, 
  insights,
  comparison,
}: { 
  score: ReputationScore; 
  badges: any[];
  insights: any[];
  comparison: any;
}) {
  const levelInfo = getLevelInfo(score.level);

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="p-6 bg-gradient-to-br from-[#2CC295]/10 via-zinc-900 to-zinc-900 border border-zinc-800 rounded-xl">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="text-6xl">{levelInfo.icon}</div>
            <div>
              <h3 className={`text-3xl font-semibold ${levelInfo.color}`}>
                {levelInfo.name}
              </h3>
              <p className="text-zinc-400 mt-1">
                {levelInfo.minScore}-{levelInfo.maxScore} reputation score
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={24} className="text-[#2CC295]" />
              <span className="text-4xl font-semibold text-white">
                {score.overallScore}
              </span>
            </div>
            <p className="text-sm text-zinc-500">out of 100</p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-500">Progress to next level</span>
            <span className="text-white font-semibold">
              {Math.round(((score.overallScore - levelInfo.minScore) / (levelInfo.maxScore - levelInfo.minScore + 1)) * 100)}%
            </span>
          </div>
          <div className="h-3 bg-zinc-900 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((score.overallScore - levelInfo.minScore) / (levelInfo.maxScore - levelInfo.minScore + 1)) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-[#2CC295] to-[#25a882]"
            />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Star}
          iconColor="text-yellow-400"
          label="Average Rating"
          value={score.metrics.averageRating > 0 ? score.metrics.averageRating.toFixed(1) : 'N/A'}
          subtitle={`${score.metrics.totalReviews} reviews`}
        />
        <MetricCard
          icon={TrendingUp}
          iconColor="text-[#2CC295]"
          label="Success Rate"
          value={`${score.metrics.completionRate.toFixed(0)}%`}
          subtitle={`${score.metrics.successfulTransactions} completed`}
        />
        <MetricCard
          icon={Clock}
          iconColor="text-blue-400"
          label="Response Time"
          value={`${score.metrics.averageResponseTime}m`}
          subtitle="Average"
        />
        <MetricCard
          icon={AlertCircle}
          iconColor="text-orange-400"
          label="Dispute Rate"
          value={`${score.metrics.disputeRate.toFixed(1)}%`}
          subtitle={`${score.metrics.disputesResolved}/${score.metrics.disputesTotal} resolved`}
        />
      </div>

      {/* Trust Badges */}
      {badges.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Trust Badges
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {badges.map(badge => (
              <div
                key={badge.id}
                className={`p-4 rounded-xl ${badge.color} border border-zinc-800`}
              >
                <div className="text-3xl mb-2">{badge.icon}</div>
                <p className="font-semibold text-sm mb-1">{badge.name}</p>
                <p className="text-xs opacity-80">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Reputation Insights
          </h4>
          <div className="space-y-2">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${
                  insight.type === 'positive'
                    ? 'bg-green-500/5 border-green-500/20'
                    : insight.type === 'negative'
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-blue-500/5 border-blue-500/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        insight.type === 'positive'
                          ? 'bg-green-500/20 text-green-400'
                          : insight.type === 'negative'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {insight.category}
                      </span>
                      <span className={`text-xs font-semibold ${
                        insight.impact === 'high'
                          ? 'text-orange-400'
                          : insight.impact === 'medium'
                          ? 'text-yellow-400'
                          : 'text-zinc-500'
                      }`}>
                        {insight.impact.toUpperCase()} IMPACT
                      </span>
                    </div>
                    <p className="text-sm text-white font-medium">{insight.message}</p>
                    {insight.suggestion && (
                      <p className="text-xs text-zinc-500 mt-1">💡 {insight.suggestion}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500 mb-1">Your Score vs Platform Average</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold text-white">{comparison.userScore}</span>
              <span className="text-zinc-500">vs</span>
              <span className="text-lg font-semibold text-zinc-400">{comparison.averageScore}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-500 mb-1">Top Percentile</p>
            <span className="text-2xl font-semibold text-[#2CC295]">{comparison.percentile}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Breakdown Tab
function BreakdownTab({ score }: { score: ReputationScore }) {
  const components = [
    {
      name: 'Transactions',
      score: score.transactionScore,
      icon: TrendingUp,
      color: 'text-[#2CC295]',
      description: 'Based on transaction count and volume',
    },
    {
      name: 'Ratings',
      score: score.ratingScore,
      icon: Star,
      color: 'text-yellow-400',
      description: 'Based on average rating and review count',
    },
    {
      name: 'Response Time',
      score: score.responseScore,
      icon: Clock,
      color: 'text-blue-400',
      description: 'Based on average response time',
    },
    {
      name: 'Completion',
      score: score.completionScore,
      icon: CheckCircle,
      color: 'text-green-400',
      description: 'Based on successful transaction rate',
    },
    {
      name: 'Disputes',
      score: score.disputeScore,
      icon: AlertCircle,
      color: 'text-orange-400',
      description: 'Based on dispute rate and resolution',
    },
    {
      name: 'Verification',
      score: score.verificationScore,
      icon: Award,
      color: 'text-purple-400',
      description: 'Based on verification status and account age',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
        <p className="text-sm text-zinc-400">
          Your overall reputation score is calculated from multiple factors.
          Each component is weighted differently to create a comprehensive trust score.
        </p>
      </div>

      {components.map((component, idx) => {
        const Icon = component.icon;
        return (
          <motion.div
            key={component.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-4 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Icon size={20} className={component.color} />
                <div>
                  <h4 className="font-semibold text-white">{component.name}</h4>
                  <p className="text-xs text-zinc-500">{component.description}</p>
                </div>
              </div>
              <span className="text-2xl font-semibold text-white">{component.score}</span>
            </div>
            <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${component.score}%` }}
                transition={{ duration: 1, delay: idx * 0.1, ease: 'easeOut' }}
                className={`h-full bg-gradient-to-r ${
                  component.score >= 80
                    ? 'from-green-500 to-green-400'
                    : component.score >= 60
                    ? 'from-[#2CC295] to-[#25a882]'
                    : component.score >= 40
                    ? 'from-yellow-500 to-yellow-400'
                    : 'from-orange-500 to-orange-400'
                }`}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// Ratings Tab
function RatingsTab({ ratings }: { ratings: Rating[] }) {
  if (ratings.length === 0) {
    return (
      <div className="text-center py-20">
        <Star size={48} className="mx-auto mb-4 text-zinc-700" />
        <p className="text-zinc-500">No ratings yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ratings.map((rating, idx) => (
        <motion.div
          key={rating.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="p-4 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center">
                <Users size={18} className="text-zinc-600" />
              </div>
              <div>
                <p className="font-semibold text-white">@{rating.fromUsername}</p>
                <p className="text-xs text-zinc-500">
                  {formatDistanceToNow(new Date(rating.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 mb-1">
                <Star size={16} className={`${getRatingColor(rating.overallRating)} fill-current`} />
                <span className="font-semibold text-white">{rating.overallRating.toFixed(1)}</span>
              </div>
              {rating.verified && (
                <span className="text-xs px-2 py-0.5 rounded bg-[#2CC295]/10 text-[#2CC295]">
                  Verified
                </span>
              )}
            </div>
          </div>

          {/* Category Ratings */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-zinc-900/50 rounded">
              <p className="text-xs text-zinc-500 mb-1">Communication</p>
              <p className="text-sm font-semibold text-white">{rating.communicationRating.toFixed(1)}</p>
            </div>
            <div className="text-center p-2 bg-zinc-900/50 rounded">
              <p className="text-xs text-zinc-500 mb-1">Delivery</p>
              <p className="text-sm font-semibold text-white">{rating.deliveryRating.toFixed(1)}</p>
            </div>
            <div className="text-center p-2 bg-zinc-900/50 rounded">
              <p className="text-xs text-zinc-500 mb-1">Accuracy</p>
              <p className="text-sm font-semibold text-white">{rating.accuracyRating.toFixed(1)}</p>
            </div>
          </div>

          {/* Review */}
          {rating.review && (
            <p className="text-sm text-zinc-300 mb-2">{rating.review}</p>
          )}

          {/* Asset */}
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Asset: {rating.assetName}</span>
            {rating.helpful > 0 && (
              <span>{rating.helpful} found helpful</span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Levels Tab
function LevelsTab({ 
  levels, 
  currentLevel, 
  currentScore 
}: { 
  levels: any[]; 
  currentLevel: string; 
  currentScore: number;
}) {
  return (
    <div className="space-y-4">
      {levels.map((level, idx) => {
        const isCurrent = level.level === currentLevel;
        const isPassed = currentScore > level.maxScore;
        
        return (
          <motion.div
            key={level.level}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-6 rounded-xl border-2 transition-all ${
              isCurrent
                ? 'bg-[#2CC295]/5 border-[#2CC295]'
                : isPassed
                ? 'bg-zinc-900/50 border-zinc-800'
                : 'bg-zinc-900/30 border-zinc-800'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="text-5xl">{level.icon}</div>
                <div>
                  <h3 className={`text-2xl font-semibold ${level.color}`}>
                    {level.name}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Score {level.minScore}-{level.maxScore}
                  </p>
                </div>
              </div>
              {isCurrent && (
                <span className="px-3 py-1 bg-[#2CC295] text-black text-xs font-semibold rounded-full">
                  CURRENT
                </span>
              )}
              {isPassed && (
                <CheckCircle size={24} className="text-green-400" />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Benefits:</p>
              <ul className="space-y-1">
                {level.benefits.map((benefit: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle size={14} className="text-[#2CC295]" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// Metric Card Component
function MetricCard({
  icon: Icon,
  iconColor,
  label,
  value,
  subtitle,
}: {
  icon: any;
  iconColor: string;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="p-4 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={iconColor} />
        <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
          {label}
        </span>
      </div>
      <p className="text-2xl font-semibold text-white mb-1">{value}</p>
      <p className="text-xs text-zinc-500">{subtitle}</p>
    </div>
  );
}
