import { AlertTriangle, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { MultiImageUpload } from '@/app/components/multi-image-upload';
import { UploadedImage } from '@/app/components/image-upload';
import { AssetThumb } from '@/app/components/asset-thumb';
import { ProtocolChainBanner } from '@/app/components/ui/protocol-chain-banner';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { useProtocolChain } from '@/hooks/useProtocolChain';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import type { OrderShippingAddressSnapshot } from '@/types/order';
import {
  formatOrderGrossPrice,
  formatOrderQuantity,
  getOrderShippingDetails,
  hasOrderShippingDetails,
} from '@/utils/orderDisplay';

interface OpenDisputeModalProps {
  order: {
    orderId: bigint;
    assetName: string;
    assetImage: string;
    grossPrice: bigint;
    amount: bigint;
    unitLabel?: string;
    unitName?: string;
    seller: `0x${string}`;
    paymentTokenSymbol?: string;
    paymentTokenDecimals?: number;
    shippingAddressSnapshot?: OrderShippingAddressSnapshot | null;
    shippingMethodLabel?: string;
  };
  onConfirm: (reason: string[], comment: string, evidenceUrls: string[]) => Promise<void> | void;
  onCancel: () => void;
}

const DISPUTE_REASONS = [
  { id: 'not_received', label: 'Asset not received' },
  { id: 'wrong_item', label: 'Wrong asset delivered' },
  { id: 'damaged', label: 'Asset damaged or defective' },
  { id: 'not_as_described', label: 'Asset not as described' },
  { id: 'counterfeit', label: 'Suspected counterfeit asset' },
  { id: 'missing_parts', label: 'Missing parts or incomplete asset' },
  { id: 'other', label: 'Other issues' },
];

export function OpenDisputeModal({ order, onConfirm, onCancel }: OpenDisputeModalProps) {
  const { address } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [uploadedEvidence, setUploadedEvidence] = useState<UploadedImage[]>([]);
  const { requireWalletActionAsync } = useRequireWalletAction();
  const protocolChain = useProtocolChain();
  const quantityLabel = formatOrderQuantity(order.amount, order.unitLabel, order.unitName);
  const grossPriceLabel = formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals);
  const shippingDetails = getOrderShippingDetails(order.shippingAddressSnapshot, order.shippingMethodLabel);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleReasonToggle = (reasonId: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reasonId) ? prev.filter((id) => id !== reasonId) : [...prev, reasonId]
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (selectedReasons.length === 0) {
      alert('Please select at least one reason for dispute');
      return;
    }
    if (!comment.trim()) {
      alert('Please provide a detailed description');
      return;
    }

    const continueOpenDispute = async () => {
      const evidenceUrls = uploadedEvidence.map((file) => file.url);
      try {
        setIsSubmitting(true);
        await onConfirm(selectedReasons, comment, evidenceUrls);
      } finally {
        setIsSubmitting(false);
      }
    };

    if (
      !(await requireWalletActionAsync({
        capability: 'protocol_dispute_write',
        actionLabel: 'open disputes',
        fallbackPage: 'orders',
        onSecurityCheckConfirmed: continueOpenDispute,
      }))
    ) {
      return;
    }

    await continueOpenDispute();
  };

  const primaryLabel = isSubmitting
    ? 'Open Wallet...'
    : !protocolChain.isConnected
      ? 'Connect Wallet'
      : !protocolChain.isOnProtocolChain
        ? 'Switch Network'
        : 'Submit Dispute';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="studio-portal-backdrop fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="studio-modal-theme studio-portal-modal relative w-full max-w-[860px] h-[calc(100dvh-3rem)] rounded-[2rem] border-0 bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
            <style>{`
              .hidden-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>

            {/* Fixed Header */}
            <div className="studio-portal-header shrink-0 p-5 md:p-6 pb-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] relative z-10">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-white tracking-tight truncate">Open Dispute</h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                    Escrow freeze and arbiter review for order #{order.orderId.toString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="studio-portal-chip h-7 px-3 inline-flex items-center bg-[rgba(255,255,255,0.04)] rounded-full border border-[rgba(255,255,255,0.08)] text-[9px] font-semibold text-zinc-400 uppercase tracking-widest">
                    Order #{order.orderId.toString().slice(-6)}
                  </span>
                  <span className="h-7 px-3 inline-flex items-center bg-orange-500/15 rounded-full border border-orange-500/30 text-[9px] font-semibold text-orange-400 uppercase tracking-widest">
                    Dispute
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
                          alt="Asset"
                          className="w-16 h-16 rounded-xl bg-zinc-800 border border-[#27272a] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-white leading-tight truncate">{order.assetName}</p>
                          <p className="mt-1 text-[10px] text-zinc-500 uppercase tracking-widest">
                            Qty
                            <span className="ml-2 text-white font-semibold">{quantityLabel}</span>
                          </p>
                          <p className="mt-2 text-[11px] text-zinc-400">{grossPriceLabel}</p>
                        </div>
                      </div>
                    </div>

                    {hasOrderShippingDetails(shippingDetails) ? (
                      <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
                        <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Shipping Snapshot</h4>
                        {shippingDetails.methodLabel ? <p className="text-xs font-semibold text-orange-300">{shippingDetails.methodLabel}</p> : null}
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

                    {/* Dispute Reasons */}
                    <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-4">
                      <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                        Select Reason(s) <span className="text-orange-400">*</span>
                      </h4>
                      <div className="grid grid-cols-1 gap-2.5">
                        {DISPUTE_REASONS.map((reason) => (
                          <button
                            key={reason.id}
                            type="button"
                            onClick={() => handleReasonToggle(reason.id)}
                            className={`
                              flex items-center gap-3 rounded-full border px-4 py-3 transition-all text-left
                              ${
                                selectedReasons.includes(reason.id)
                                  ? 'bg-orange-500/10 border-orange-500/40 text-white'
                                  : 'studio-portal-subsurface bg-black/40 border-[rgba(255,255,255,0.08)] text-zinc-400 hover:border-zinc-600'
                              }
                            `}
                          >
                            <div
                              className={`
                                w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors
                                ${selectedReasons.includes(reason.id) ? 'bg-orange-500 border-orange-500' : 'border-zinc-600'}
                              `}
                            >
                              {selectedReasons.includes(reason.id) && (
                                <Check size={14} className="text-black" strokeWidth={3} />
                              )}
                            </div>
                            <span className="text-xs font-medium">{reason.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
                      <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                        Detailed Description <span className="text-orange-400">*</span>
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Please provide detailed information about the issue..."
                        maxLength={1000}
                        className="studio-portal-input w-full h-32 px-4 py-3 bg-black/40 border border-[rgba(255,255,255,0.08)] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] text-zinc-600">Be specific and include relevant details</p>
                        <p className="text-[9px] text-zinc-600 font-mono">{comment.length}/1000</p>
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
                      onSwitch={() => protocolChain.ensureProtocolChainAsync('open dispute')}
                      showWhenMatched={false}
                    />

                    {/* Evidence Upload */}
                    <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
                      <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Evidence (Photos)</h4>
                      <MultiImageUpload
                        walletAddress={address}
                        value={uploadedEvidence}
                        onImagesChange={setUploadedEvidence}
                        maxImages={5}
                        minImages={0}
                      />
                    </div>

                    {/* Dispute Process */}
                    <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={16} />
                        <p className="text-[10px] font-semibold text-yellow-500 uppercase tracking-widest">Dispute Process</p>
                      </div>
                      <ul className="text-xs text-zinc-400 space-y-1.5 leading-relaxed">
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-500 shrink-0">•</span>
                          <span>Arbiter reviews evidence from both parties within 14 days.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-500 shrink-0">•</span>
                          <span>Funds remain in escrow during dispute resolution on {protocolChain.targetChainLabel}.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-500 shrink-0">•</span>
                          <span>False information may reduce your dispute outcome.</span>
                        </li>
                      </ul>
                      {isSubmitting ? (
                        <p className="mt-3 text-[11px] text-orange-400 leading-relaxed">
                          Waiting for wallet confirmation...
                        </p>
                      ) : null}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <StudioActionButton
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        variant="secondary"
                        size="lg"
                        className="studio-portal-secondary flex-1 text-base text-ui-primary"
                      >
                        Cancel
                      </StudioActionButton>
                      <StudioActionButton
                        type="button"
                        onClick={handleSubmit}
                        disabled={selectedReasons.length === 0 || !comment.trim() || isSubmitting}
                        variant="primary"
                        size="lg"
                        className="flex-1 bg-orange-500 text-base text-black shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-orange-500"
                      >
                        {primaryLabel}
                      </StudioActionButton>
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
