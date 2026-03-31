import { Check, AlertTriangle, Award, Coins, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { useAccount } from 'wagmi';
import { AssetThumb } from '@/app/components/asset-thumb';
import { ProtocolChainBanner } from '@/app/components/ui/protocol-chain-banner';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { useProtocolChain } from '@/hooks/useProtocolChain';
import { submitProfileReview } from '@/utils/profileReputationSync';
import type { OrderShippingAddressSnapshot } from '@/types/order';
import {
  formatOrderGrossPrice,
  formatOrderQuantity,
  getOrderShippingDetails,
  hasOrderShippingDetails,
} from '@/utils/orderDisplay';

interface ConfirmDeliveryModalProps {
  order: {
    orderId: bigint;
    assetName: string;
    assetImage: string;
    grossPrice: bigint;
    amount: bigint;
    unitName?: string;
    seller: `0x${string}`;
    paymentTokenSymbol?: string;
    paymentTokenDecimals?: number;
    shippingAddressSnapshot?: OrderShippingAddressSnapshot | null;
    shippingMethodLabel?: string;
  };
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function ConfirmDeliveryModal({ order, onConfirm, onCancel }: ConfirmDeliveryModalProps) {
  const { address } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const protocolChain = useProtocolChain();
  const quantityLabel = formatOrderQuantity(order.amount, order.unitLabel, order.unitName);
  const grossPriceLabel = formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals);
  const shippingDetails = getOrderShippingDetails(order.shippingAddressSnapshot, order.shippingMethodLabel);

  // Prevent body scroll while modal is mounted
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleConfirm = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onConfirm();
      if (rating > 0 && address) {
        await submitProfileReview({
          reviewerAddress: address,
          reviewedAddress: order.seller,
          orderUid: order.orderId.toString(),
          assetId: order.orderId.toString(),
          assetName: order.assetName,
          rating,
          review,
          ratingType: 'seller',
          source: 'confirm_delivery_modal',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryLabel = isSubmitting
    ? 'Open MetaMask...'
    : !protocolChain.isConnected
      ? 'Connect Wallet'
      : !protocolChain.isOnProtocolChain
        ? 'Switch Network'
        : 'Confirm';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="studio-portal-backdrop fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
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
                  <StudioModalCloseButton onClick={onCancel} disabled={isSubmitting} />
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
                            <span className="ml-2 text-[#2CC295] font-bold">{quantityLabel}</span>
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
                          <span className="text-xs font-bold text-white">{quantityLabel}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">Amount</span>
                          <span className="text-xl font-bold text-white">{grossPriceLabel}</span>
                        </div>
                      </div>
                    </div>

                    {hasOrderShippingDetails(shippingDetails) ? (
                      <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Shipping Snapshot</h4>
                        {shippingDetails.methodLabel ? <p className="text-xs font-bold text-[#2CC295]">{shippingDetails.methodLabel}</p> : null}
                        {shippingDetails.recipientName ? <p className="text-xs text-white">{shippingDetails.recipientName}</p> : null}
                        {shippingDetails.address ? <p className="text-[11px] text-zinc-400 leading-relaxed">{shippingDetails.address}</p> : null}
                        {shippingDetails.phone ? <p className="text-[10px] text-zinc-500">{shippingDetails.phone}</p> : null}
                        {shippingDetails.instructions ? (
                          <p className="text-[10px] text-zinc-500 leading-relaxed">
                            Instructions: {shippingDetails.instructions}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

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
                    <ProtocolChainBanner
                      isConnected={protocolChain.isConnected}
                      isOnProtocolChain={protocolChain.isOnProtocolChain}
                      currentChainLabel={protocolChain.currentChainLabel}
                      targetChainLabel={protocolChain.targetChainLabel}
                      isSwitching={protocolChain.isSwitching}
                      onSwitch={() => protocolChain.ensureProtocolChainAsync('confirm delivery')}
                      showWhenMatched={false}
                    />

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
                        Confirm only when you have received the correct asset in good condition. This action releases escrow immediately on {protocolChain.targetChainLabel}.
                      </p>
                      {isSubmitting ? (
                        <p className="mt-3 text-[11px] text-[#2CC295] leading-relaxed">
                          Waiting for MetaMask confirmation...
                        </p>
                      ) : null}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="studio-portal-secondary h-12 px-6 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-white font-bold text-base rounded-full transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="h-12 px-6 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold text-base rounded-full transition-all shadow-lg shadow-[#2CC295]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {primaryLabel}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
      </motion.div>
    </div>,
    document.body
  );
}
