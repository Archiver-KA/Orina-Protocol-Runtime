import { AnalyticsInsight } from '@/types/analytics';
import { TrendingUp, TrendingDown, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface InsightsPanelProps {
  insights: AnalyticsInsight[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) {
    return null;
  }

  const getInsightIcon = (type: AnalyticsInsight['type']) => {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'warning':
        return AlertCircle;
      case 'danger':
        return TrendingDown;
      case 'info':
        return Info;
      default:
        return Info;
    }
  };

  const getInsightColor = (type: AnalyticsInsight['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-500/5',
          border: 'border-green-500/20',
          icon: 'text-green-400',
          title: 'text-green-400',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/5',
          border: 'border-yellow-500/20',
          icon: 'text-yellow-400',
          title: 'text-yellow-400',
        };
      case 'danger':
        return {
          bg: 'bg-red-500/5',
          border: 'border-red-500/20',
          icon: 'text-red-400',
          title: 'text-red-400',
        };
      case 'info':
        return {
          bg: 'bg-blue-500/5',
          border: 'border-blue-500/20',
          icon: 'text-blue-400',
          title: 'text-blue-400',
        };
      default:
        return {
          bg: 'bg-zinc-500/5',
          border: 'border-zinc-500/20',
          icon: 'text-zinc-400',
          title: 'text-zinc-400',
        };
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return '↗';
    if (trend === 'down') return '↘';
    return '→';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="p-6 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl"
    >
      <h3 className="text-heading-sm font-bold text-white mb-4">Insights & Recommendations</h3>

      <div className="space-y-3">
        {insights.map((insight, index) => {
          const Icon = getInsightIcon(insight.type);
          const colors = getInsightColor(insight.type);

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={`p-4 rounded-xl border ${colors.bg} ${colors.border}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <Icon size={18} className={colors.icon} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-label px-2 py-0.5 rounded bg-zinc-900 text-zinc-400">
                      {insight.category}
                    </span>
                    {insight.trend && (
                      <span className={`text-label ${getTrendIcon(insight.trend) === '↗' ? 'text-green-400' : getTrendIcon(insight.trend) === '↘' ? 'text-red-400' : 'text-zinc-500'}`}>
                        {getTrendIcon(insight.trend)}
                      </span>
                    )}
                  </div>

                  <h4 className={`text-body-sm font-bold mb-1 ${colors.title}`}>
                    {insight.title}
                  </h4>

                  <p className="text-body-sm text-zinc-300 mb-2">
                    {insight.message}
                  </p>

                  {insight.value && (
                    <div className="inline-flex items-center gap-2 px-2 py-1 bg-zinc-900 rounded">
                      <span className="text-label font-bold text-white">
                        {insight.value}
                      </span>
                    </div>
                  )}

                  {insight.actionable && (
                    <div className="mt-2 flex items-start gap-2">
                      <span className="text-lg">💡</span>
                      <p className="text-label text-zinc-500 italic">
                        {insight.actionable}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}