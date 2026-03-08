import { Check, AlertTriangle, Award, Coins, Star } from 'lucide-react';
import { formatEther } from 'viem';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { AssetThumb } from '@/app/components/asset-thumb';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

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

  // Prevent body scroll while modal is mounted
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="studio-portal-backdrop fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]">
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="studio-modal-theme studio-portal-modal confirm-delivery-theme relative w-full max-w-[860px] h-[calc(100dvh-3rem)] rounded-[2rem] border-0 bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              .hidden-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>

            {/* Fixed Header */}
            <div className="studio-portal-header shrink-0 p-5 md:p-6 pb-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] relative z-10">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white tracking-tight truncate">Confirm Delivery</h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                    Release escrow and finalize order #{order.orderId.toString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="studio-portal-chip h-7 px-3 inline-flex items-center bg-[rgba(255,255,255,0.04)] rounded-full border border-[rgba(255,255,255,0.08)] text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                    Order #{order.orderId.toString().slice(-6)}
                  </span>
                  <span className="h-7 px-3 inline-flex items-center bg-[#2CC295]/15 rounded-full border border-[#2CC295]/30 text-[9px] font-bold text-[#2CC295] uppercase tracking-widest">
                    Delivery Check
                  </span>
                  <StudioModalCloseButton onClick={onCancel} />
                </div>
              </div>
            </div>

            {/* Main Content */}
            <section className="min-w-0 min-h-0 flex-1 overflow-y-auto lg:overflow-hidden hidden-scrollbar relative">
              <div className="h-full p-5 md:p-6 pt-4 relative z-10">
                <div className="w-full h-full max-w-[860px] mx-auto flex flex-col lg:flex-row justify-center items-start gap-6 px-0 md:px-2">
                  {/* Left Column */}
                  <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-4 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                    {/* Product Info */}
                    <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
                      <div className="flex items-center gap-4">
                        <AssetThumb
                          src={order.assetImage}
                          alt="Product"
                          className="w-16 h-16 rounded-xl bg-zinc-800 border border-[#27272a] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-base font-bold text-white leading-tight truncate">{order.assetName}</p>
                          <p className="mt-1 text-[10px] text-zinc-500 uppercase tracking-widest">
                            Qty
                            <span className="ml-2 text-[#2CC295] font-bold">{order.amount.toString()}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-4">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Finalization Summary</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">Quantity</span>
                          <span className="text-xs font-bold text-white">{order.amount.toString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">Amount</span>
                          <span className="text-xl font-bold text-white">{formatEther(order.grossPrice)} ETH</span>
                        </div>
                      </div>
                    </div>

                    {/* What happens next */}
                    <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">What Happens Next</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#2CC295]/10 border border-[#2CC295]/20 flex items-center justify-center shrink-0">
                            <Coins className="text-[#2CC295]" size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Funds Released</p>
                            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                              Escrowed funds are transferred to the seller wallet.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                            <Award className="text-blue-400" size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Receipt Finalized</p>
                            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                              Receipt and ownership state are finalized on-chain.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                            <Check className="text-green-400" size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Order Closed</p>
                            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                              Order state becomes FINALIZED and cannot be changed.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-4 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                    {/* Rating & Review */}
                    <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="text-[#2CC295] fill-[#2CC295]" size={16} />
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Rate Your Experience</h4>
                      </div>
                      <div className="flex items-center gap-1.5">
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
                              size={24}
                              className={`transition-colors ${
                                star <= (hoveredRating || rating)
                                  ? 'text-[#2CC295] fill-[#2CC295]'
                                  : 'text-zinc-700 fill-zinc-800'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                          Review (Optional)
                        </label>
                        <textarea
                          value={review}
                          onChange={(e) => setReview(e.target.value)}
                          placeholder="Share your experience..."
                          maxLength={500}
                          className="studio-portal-input confirm-delivery-input-flat w-full h-24 px-4 py-3 bg-black/40 border border-[rgba(255,255,255,0.08)] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#2CC295]/30 focus:border-[#2CC295] resize-none"
                        />
                        <p className="text-[9px] text-zinc-600 font-mono mt-2 text-right">{review.length}/500</p>
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="text-orange-400 shrink-0 mt-0.5" size={16} />
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                          Irreversible Action
                        </p>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Confirm only when you have received the correct asset in good condition. This action releases escrow immediately.
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={onCancel}
                        className="studio-portal-secondary h-12 px-6 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-white font-bold text-base rounded-full transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirm}
                        className="h-12 px-6 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold text-base rounded-full transition-all shadow-lg shadow-[#2CC295]/20"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="studio-modal-theme studio-portal-modal bg-[rgba(18,18,18,0.9)] border-0 rounded-[24px] shadow-2xl max-w-md w-full overflow-hidden"
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
              <div className="studio-portal-subsurface w-full p-4 bg-[rgba(255,255,255,0.02)] border-0 rounded-lg">
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
    </div>,
    document.body
  );
}
