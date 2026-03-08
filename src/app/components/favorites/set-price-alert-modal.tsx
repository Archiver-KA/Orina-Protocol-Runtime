import { useState, useEffect } from 'react';
import { Bell, TrendingUp, TrendingDown } from 'lucide-react';
import { WatchlistItem } from '@/types/favorites';
import { AssetDetails } from '@/types/asset';
import { motion, AnimatePresence } from 'motion/react';
import { AssetThumb } from '@/app/components/asset-thumb';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

interface SetPriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WatchlistItem;
  asset?: AssetDetails;
  onSetAlert: (item: WatchlistItem, targetPrice: number, condition: 'above' | 'below') => void;
}

export function SetPriceAlertModal({
  isOpen,
  onClose,
  item,
  asset,
  onSetAlert,
}: SetPriceAlertModalProps) {
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');

  useEffect(() => {
    if (item.priceAlert) {
      setTargetPrice(item.priceAlert.targetPrice.toString());
      setCondition(item.priceAlert.condition);
    } else if (asset) {
      // Default to 10% above current price
      setTargetPrice((asset.price * 1.1).toFixed(4));
      setCondition('above');
    }
  }, [item, asset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    onSetAlert(item, price, condition);
  };

  const currentPrice = asset?.price || 0;
  const targetPriceNum = parseFloat(targetPrice) || 0;
  const percentDiff = currentPrice > 0 
    ? ((targetPriceNum - currentPrice) / currentPrice) * 100 
    : 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="studio-modal-theme w-full max-w-md bg-ui-card border border-ui-border-subtle rounded-2xl shadow-2xl overflow-hidden"
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Bell size={20} className="text-orange-500" />
                </div>
                <h2 className="text-xl font-bold text-white">Set Price Alert</h2>
              </div>
              <StudioModalCloseButton onClick={onClose} />
            </div>

            <div className="p-6 space-y-6">
              {/* Asset Info */}
              {asset && (
                <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  <AssetThumb
                    src={asset.image}
                    alt={asset.name}
                    className="w-12 h-12 rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{asset.name}</p>
                    <p className="text-sm text-zinc-500">
                      Current: {asset.price.toFixed(4)} ETH
                    </p>
                  </div>
                </div>
              )}

              {/* Condition Selection */}
              <div>
                <label className="block text-sm font-bold text-zinc-400 mb-3 uppercase tracking-wider">
                  Alert Condition
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCondition('above')}
                    className={`
                      flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all
                      ${condition === 'above'
                        ? 'bg-green-500/10 border-green-500 text-green-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }
                    `}
                  >
                    <TrendingUp size={20} />
                    <div className="text-left">
                      <p className="text-sm font-bold">Above</p>
                      <p className="text-xs opacity-75">Price rises to</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCondition('below')}
                    className={`
                      flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all
                      ${condition === 'below'
                        ? 'bg-red-500/10 border-red-500 text-red-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }
                    `}
                  >
                    <TrendingDown size={20} />
                    <div className="text-left">
                      <p className="text-sm font-bold">Below</p>
                      <p className="text-xs opacity-75">Price drops to</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Target Price */}
              <div>
                <label className="block text-sm font-bold text-zinc-400 mb-2 uppercase tracking-wider">
                  Target Price (ETH)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="0.0000"
                    className="w-full px-4 py-3 pr-16 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#2CC295] transition-colors"
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-bold">
                    ETH
                  </div>
                </div>

                {/* Price Difference Display */}
                {targetPriceNum > 0 && currentPrice > 0 && (
                  <div className="mt-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Difference:</span>
                      <span className={`font-bold ${percentDiff > 0 ? 'text-green-400' : percentDiff < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                        {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-zinc-500">Change:</span>
                      <span className="font-bold text-white">
                        {(targetPriceNum - currentPrice).toFixed(4)} ETH
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-sm font-bold text-zinc-400 mb-2 uppercase tracking-wider">
                  Quick Presets
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((percent) => (
                    <button
                      key={percent}
                      type="button"
                      onClick={() => {
                        if (currentPrice > 0) {
                          const multiplier = condition === 'above' 
                            ? 1 + (percent / 100)
                            : 1 - (percent / 100);
                          setTargetPrice((currentPrice * multiplier).toFixed(4));
                        }
                      }}
                      className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-white font-bold rounded-lg transition-colors"
                    >
                      {condition === 'above' ? '+' : '-'}{percent}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-400 leading-relaxed">
                  <strong>Note:</strong> You'll receive a notification when the price {condition === 'above' ? 'rises to or above' : 'drops to or below'} your target. 
                  The alert will be automatically deactivated after triggering.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!targetPrice || parseFloat(targetPrice) <= 0}
                className="px-6 py-3 bg-[#2CC295] hover:bg-[#25a882] disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold rounded-lg transition-colors"
              >
                Set Alert
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
