import { AlertTriangle, Clock, Info, Zap, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  useAutoReleaseWarning, 
  getWarningColors, 
  formatTimeRemaining,
  WarningLevel 
} from '@/hooks/useAutoReleaseWarning';
import { useState } from 'react';

interface AutoReleaseIndicatorProps {
  autoReleaseAt: bigint;
  state: number;
  finalized: boolean;
  variant?: 'card' | 'banner' | 'compact';
  showTooltip?: boolean;
}

export function AutoReleaseIndicator({
  autoReleaseAt,
  state,
  finalized,
  variant = 'card',
  showTooltip = true,
}: AutoReleaseIndicatorProps) {
  const warning = useAutoReleaseWarning({ autoReleaseAt, state, finalized });
  const [showExplanation, setShowExplanation] = useState(false);

  // Don't render if warning shouldn't be shown
  if (!warning.shouldShowWarning) {
    return null;
  }

  const colors = getWarningColors(warning.level);
  const timeFormatted = formatTimeRemaining(warning.timeRemaining);

  const getIcon = (level: WarningLevel) => {
    const iconProps = { size: 18 };
    switch (level) {
      case 'critical':
        return <AlertTriangle {...iconProps} className={colors.text} />;
      case 'warning':
        return <Clock {...iconProps} className={colors.text} />;
      case 'info':
        return <Info {...iconProps} className={colors.text} />;
      default:
        return <Zap {...iconProps} className={colors.text} />;
    }
  };

  // Compact variant (for small spaces)
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors.bg} ${colors.border} ${colors.glow} ${colors.pulse}`}
      >
        {getIcon(warning.level)}
        <span className={`text-xs font-bold ${colors.text}`}>
          {timeFormatted.value} {timeFormatted.unit}
        </span>
      </motion.div>
    );
  }

  // Banner variant (for top of cards)
  if (variant === 'banner') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`border-b ${colors.border} ${colors.bg} ${colors.glow}`}
        >
          <div className="px-4 py-3">
            <div className="flex items-start gap-3">
              <div className={colors.pulse}>
                {getIcon(warning.level)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${colors.text} mb-1`}>
                  {warning.message}
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-zinc-900/50 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className={`h-full ${warning.level === 'critical' ? 'bg-red-500' : warning.level === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}
                      initial={{ width: `${warning.percentage}%` }}
                      animate={{ width: `${warning.percentage}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  
                  <span className={`text-[10px] font-mono ${colors.text} flex-shrink-0`}>
                    {timeFormatted.full}
                  </span>
                </div>
              </div>

              {showTooltip && (
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="p-1 hover:bg-zinc-800/50 rounded transition-colors"
                  title="Learn more"
                >
                  <HelpCircle size={14} className="text-zinc-500" />
                </button>
              )}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {showExplanation && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 pt-3 border-t border-zinc-800"
                >
                  <div className="bg-zinc-900/50 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-white mb-2">What is Auto-Release?</h4>
                    <ul className="text-[10px] text-zinc-400 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-[#2CC295] mt-0.5">•</span>
                        <span>After payment, the seller has a limited time to confirm delivery</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#2CC295] mt-0.5">•</span>
                        <span>If not confirmed, payment is automatically released to the seller</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#2CC295] mt-0.5">•</span>
                        <span>This protects sellers from non-responsive buyers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>Seller should confirm delivery before auto-release to maintain trust</span>
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Card variant (default - standalone card)
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className={`bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border rounded-xl p-4 ${colors.border} ${colors.glow} ${colors.pulse}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getIcon(warning.level)}
            <h3 className={`text-sm font-bold ${colors.text}`}>
              Auto-Release Warning
            </h3>
          </div>

          {showTooltip && (
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
              title="Learn more"
            >
              <HelpCircle size={14} className="text-zinc-500 hover:text-zinc-400" />
            </button>
          )}
        </div>

        {/* Message */}
        <p className={`text-xs ${colors.text} mb-3`}>
          {warning.message}
        </p>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">
              Time Remaining
            </span>
            <span className={`text-xs font-mono font-bold ${colors.text}`}>
              {timeFormatted.full}
            </span>
          </div>

          <div className="relative bg-zinc-900/50 rounded-full h-2 overflow-hidden">
            <motion.div
              className={`absolute inset-y-0 left-0 rounded-full ${
                warning.level === 'critical'
                  ? 'bg-gradient-to-r from-red-600 to-red-500'
                  : warning.level === 'warning'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500'
                  : 'bg-gradient-to-r from-blue-600 to-blue-500'
              }`}
              initial={{ width: `${warning.percentage}%` }}
              animate={{ width: `${warning.percentage}%` }}
              transition={{ duration: 0.5 }}
            />
            
            {/* Pulse effect for critical */}
            {warning.level === 'critical' && (
              <motion.div
                className="absolute inset-y-0 left-0 bg-red-400/30 rounded-full"
                animate={{
                  width: [`${warning.percentage}%`, `${Math.min(100, warning.percentage + 10)}%`, `${warning.percentage}%`],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
          </div>

          {/* Time breakdown */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="bg-zinc-950/50 rounded-lg px-2 py-1.5 text-center">
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">
                Days
              </p>
              <p className={`text-sm font-bold font-mono ${colors.text}`}>
                {Math.floor(warning.timeRemaining / 86400)}
              </p>
            </div>
            <div className="bg-zinc-950/50 rounded-lg px-2 py-1.5 text-center">
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">
                Hours
              </p>
              <p className={`text-sm font-bold font-mono ${colors.text}`}>
                {Math.floor((warning.timeRemaining % 86400) / 3600)}
              </p>
            </div>
            <div className="bg-zinc-950/50 rounded-lg px-2 py-1.5 text-center">
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">
                Mins
              </p>
              <p className={`text-sm font-bold font-mono ${colors.text}`}>
                {Math.floor((warning.timeRemaining % 3600) / 60)}
              </p>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 pt-3 border-t border-zinc-800"
            >
              <div className="bg-zinc-900/50 rounded-lg p-3">
                <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                  <Info size={12} className="text-[#2CC295]" />
                  What is Auto-Release?
                </h4>
                <ul className="text-[10px] text-zinc-400 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-[#2CC295] mt-0.5">•</span>
                    <span>After payment, the seller has a limited time to confirm delivery</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2CC295] mt-0.5">•</span>
                    <span>If not confirmed before deadline, payment is automatically released to the seller</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2CC295] mt-0.5">•</span>
                    <span>This protects sellers from non-responsive or dishonest buyers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">⚠</span>
                    <span className="font-bold">Best practice: Seller should manually confirm delivery before auto-release</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
