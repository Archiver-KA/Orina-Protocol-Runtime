import { Check, XCircle, AlertTriangle, Package, Award, Coins, X, Star } from 'lucide-react';
import { formatEther } from 'viem';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AssetThumb } from '@/app/components/asset-thumb';

interface ConfirmDeliveryModalProps {
  order: {
    orderId: bigint;
    assetName: string;
    assetImage: string;
    grossPrice: bigint;
    amount: bigint;
    seller: `0x${string}`;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeliveryModal({ order, onConfirm, onCancel }: ConfirmDeliveryModalProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');

  const handleConfirm = () => {
    // Save rating & review to localStorage (or send to backend)
    if (rating > 0) {
      const reviewData = {
        orderId: order.orderId.toString(),
        rating,
        review,
        timestamp: Date.now(),
      };
      console.log('[Confirm Delivery] Review submitted:', reviewData);
      
      // Save to localStorage for demo
      const existingReviews = JSON.parse(localStorage.getItem('orina_order_reviews') || '[]');
      existingReviews.push(reviewData);
      localStorage.setItem('orina_order_reviews', JSON.stringify(existingReviews));
    }
    
    setIsSuccess(true);
    
    // Auto close after 1.5 seconds
    setTimeout(() => {
      onConfirm();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-[#0f0f11] border border-[#27272a] rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#27272a] bg-zinc-900/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-sm uppercase tracking-wider">Confirm Delivery</h2>
                  <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-widest">Order #{order.orderId.toString().slice(-6)}</p>
                </div>
                <button
                  onClick={onCancel}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#27272a] bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
                >
                  <X size={18} className="text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Content - Horizontal Layout */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left Column */}
                <div className="space-y-5">
                  {/* Product Info */}
                  <div className="flex items-center gap-3 p-4 bg-zinc-900/30 border border-[#27272a] rounded-lg">
                    <AssetThumb
                      src={order.assetImage}
                      alt="Product"
                      className="w-14 h-14 rounded-lg bg-zinc-800 border border-[#27272a] shrink-0"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white leading-tight">{order.assetName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Quantity:</span>
                        <span className="text-xs font-bold text-[#2CC295]">
                          {order.amount.toString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Value */}
                  <div className="flex items-center justify-between py-4 px-4 bg-zinc-900/30 border border-[#27272a] rounded-lg">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Order Value</span>
                    <span className="text-2xl font-bold text-white">
                      {formatEther(order.grossPrice)} ETH
                    </span>
                  </div>

                  {/* Rating & Review Section - Photographic Style */}
                  <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="text-[#2CC295] fill-[#2CC295]" size={16} />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Rate Your Experience</h4>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      Help others by sharing your experience with this seller
                    </p>

                    {/* Star Rating */}
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          className="transition-all hover:scale-110"
                        >
                          <Star
                            size={28}
                            className={`transition-colors ${
                              star <= (hoveredRating || rating)
                                ? 'text-[#2CC295] fill-[#2CC295]'
                                : 'text-zinc-700 fill-zinc-800'
                            }`}
                          />
                        </button>
                      ))}
                      {rating > 0 && (
                        <span className="ml-2 text-sm font-bold text-[#2CC295]">
                          {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
                        </span>
                      )}
                    </div>

                    {/* Review Text */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                        Your Review (Optional)
                      </label>
                      <textarea
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        placeholder="Share your thoughts about the product quality, seller communication, and overall experience..."
                        maxLength={500}
                        className="w-full h-24 px-4 py-3 bg-zinc-950 border border-[#27272a] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#2CC295]/30 focus:border-[#2CC295] resize-none"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[9px] text-zinc-600">
                          Your review will be visible to other buyers
                        </p>
                        <p className="text-[9px] text-zinc-600 font-mono">
                          {review.length}/500
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Warning Notice */}
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertTriangle className="text-orange-400 shrink-0 mt-0.5" size={16} />
                      <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                        Important - Please Confirm
                      </p>
                    </div>
                    <ul className="text-[11px] text-zinc-400 space-y-2 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400 shrink-0 mt-0.5">•</span>
                        <span>I have received the product/asset in good condition</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400 shrink-0 mt-0.5">•</span>
                        <span>The delivered item matches the order description</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400 shrink-0 mt-0.5">•</span>
                        <span>This action is <strong className="text-orange-200">irreversible</strong> - funds will be released immediately</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Right Column - What Happens Next */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    What Happens Next:
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#2CC295]/10 border border-[#2CC295]/20 flex items-center justify-center shrink-0">
                        <Coins className="text-[#2CC295]" size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white">Funds Released to Seller</p>
                        <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                          {formatEther(order.grossPrice)} ETH will be transferred to seller's wallet
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Award className="text-blue-400" size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white">NFT Receipt Minted</p>
                        <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                          Proof-of-ownership NFT will be minted to your wallet (for RWA assets)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                        <Check className="text-green-400" size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white">Order Finalized</p>
                        <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                          Order #ORD-{order.orderId.toString()} status will be marked as FINALIZED
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 pb-6 border-t border-[#27272a] pt-6 flex gap-3 flex-shrink-0">
              <button
                onClick={onCancel}
                className="px-6 py-3 bg-zinc-900/50 hover:bg-zinc-800 border border-[#27272a] text-white font-bold text-sm rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-6 py-3 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold text-sm rounded-xl transition-all shadow-lg shadow-[#2CC295]/20"
              >
                Confirm & Finalize
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="bg-[#0f0f11] border border-[#2CC295]/30 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="p-12 flex flex-col items-center justify-center space-y-6 text-center">
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="relative"
              >
                <div className="w-24 h-24 rounded-full bg-[#2CC295]/20 border-4 border-[#2CC295]/30 flex items-center justify-center">
                  <Check className="text-[#2CC295]" size={48} strokeWidth={3} />
                </div>
                {/* Pulse rings */}
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-2 border-[#2CC295]"
                />
              </motion.div>

              {/* Success Message */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Order Finalized!</h3>
                <p className="text-sm text-zinc-400">
                  Transaction successful. Redirecting to orders...
                </p>
              </div>

              {/* Order Summary */}
              <div className="w-full p-4 bg-zinc-900/30 border border-[#27272a] rounded-lg">
                <div className="flex items-center gap-3">
                  <AssetThumb
                    src={order.assetImage}
                    alt="Product"
                    className="w-12 h-12 rounded-lg bg-zinc-800 border border-[#27272a] shrink-0"
                  />
                  <div className="flex-1 text-left">
                    <p className="text-xs font-bold text-white leading-tight">{order.assetName}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {formatEther(order.grossPrice)} ETH
                    </p>
                  </div>
                  <Check className="text-[#2CC295]" size={20} />
                </div>
              </div>

              {/* Loading bar */}
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.5, ease: 'linear' }}
                  className="h-full bg-[#2CC295]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
