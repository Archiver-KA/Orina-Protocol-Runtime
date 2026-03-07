import { AlertTriangle, Check } from 'lucide-react';
import { formatEther } from 'viem';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { MultiImageUpload } from '@/app/components/multi-image-upload';
import { UploadedImage } from '@/app/components/image-upload';
import { AssetThumb } from '@/app/components/asset-thumb';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';

interface OpenDisputeModalProps {
  order: {
    orderId: bigint;
    assetName: string;
    assetImage: string;
    grossPrice: bigint;
    amount: bigint;
    seller: `0x${string}`;
  };
  onConfirm: (reason: string[], comment: string, evidenceUrls: string[]) => void;
  onCancel: () => void;
}

const DISPUTE_REASONS = [
  { id: 'not_received', label: 'Product not received' },
  { id: 'wrong_item', label: 'Wrong item delivered' },
  { id: 'damaged', label: 'Product damaged or defective' },
  { id: 'not_as_described', label: 'Not as described in listing' },
  { id: 'counterfeit', label: 'Suspected counterfeit' },
  { id: 'missing_parts', label: 'Missing parts or incomplete' },
  { id: 'other', label: 'Other issues' },
];

export function OpenDisputeModal({ order, onConfirm, onCancel }: OpenDisputeModalProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [uploadedEvidence, setUploadedEvidence] = useState<UploadedImage[]>([]);
  const { requireWalletActionAsync } = useRequireWalletAction();

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
    if (selectedReasons.length === 0) {
      alert('Please select at least one reason for dispute');
      return;
    }
    if (!comment.trim()) {
      alert('Please provide a detailed description');
      return;
    }

    if (
      !(await requireWalletActionAsync({
        capability: 'protocol_dispute_write',
        actionLabel: 'open disputes',
        fallbackPage: 'orders',
      }))
    ) {
      return;
    }

    setIsSuccess(true);

    const evidenceUrls = uploadedEvidence.map((file) => file.url);

    setTimeout(() => {
      onConfirm(selectedReasons, comment, evidenceUrls);
    }, 1500);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-[860px] h-[calc(100dvh-3rem)] rounded-[2rem] border-0 bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              .hidden-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>

            {/* Fixed Header */}
            <div className="shrink-0 p-5 md:p-6 pb-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] relative z-10">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white tracking-tight truncate">Open Dispute</h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                    Escrow freeze and arbiter review for order #{order.orderId.toString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="h-7 px-3 inline-flex items-center bg-[rgba(255,255,255,0.04)] rounded-full border border-[rgba(255,255,255,0.08)] text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                    Order #{order.orderId.toString().slice(-6)}
                  </span>
                  <span className="h-7 px-3 inline-flex items-center bg-orange-500/15 rounded-full border border-orange-500/30 text-[9px] font-bold text-orange-400 uppercase tracking-widest">
                    Dispute
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
                    <div className="bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
                      <div className="flex items-center gap-4">
                        <AssetThumb
                          src={order.assetImage}
                          alt="Product"
                          className="w-16 h-16 rounded-xl bg-zinc-800 border border-[#27272a] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-base font-bold text-white leading-tight truncate">{order.assetName}</p>
                          <p className="mt-1 text-[10px] text-zinc-500 uppercase tracking-widest">
                            Value
                            <span className="ml-2 text-white font-bold">{formatEther(order.grossPrice)} ETH</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dispute Reasons */}
                    <div className="bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-4">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        Select Reason(s) <span className="text-orange-400">*</span>
                      </h4>
                      <div className="grid grid-cols-1 gap-2.5">
                        {DISPUTE_REASONS.map((reason) => (
                          <button
                            key={reason.id}
                            onClick={() => handleReasonToggle(reason.id)}
                            className={`
                              flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left
                              ${
                                selectedReasons.includes(reason.id)
                                  ? 'bg-orange-500/10 border-orange-500/40 text-white'
                                  : 'bg-black/40 border-[rgba(255,255,255,0.08)] text-zinc-400 hover:border-zinc-600'
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
                    <div className="bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        Detailed Description <span className="text-orange-400">*</span>
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Please provide detailed information about the issue..."
                        maxLength={1000}
                        className="w-full h-32 px-4 py-3 bg-black/40 border border-[rgba(255,255,255,0.08)] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] text-zinc-600">Be specific and include relevant details</p>
                        <p className="text-[9px] text-zinc-600 font-mono">{comment.length}/1000</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-4 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                    {/* Evidence Upload */}
                    <div className="bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Evidence (Photos)</h4>
                      <MultiImageUpload
                        maxFiles={5}
                        onUploadSuccess={(images) => {
                          setUploadedEvidence(images);
                          console.log('Dispute evidence uploaded to IPFS:', images);
                        }}
                        onUploadError={(error) => {
                          console.error('Dispute evidence upload error:', error);
                        }}
                        currentImages={uploadedEvidence.map((img) => img.url)}
                        label=""
                        description="PNG, JPG up to 100MB (max 5 images)"
                      />
                    </div>

                    {/* Dispute Process */}
                    <div className="bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={16} />
                        <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Dispute Process</p>
                      </div>
                      <ul className="text-xs text-zinc-400 space-y-1.5 leading-relaxed">
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-500 shrink-0">•</span>
                          <span>Arbiter reviews evidence from both parties within 14 days.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-500 shrink-0">•</span>
                          <span>Funds remain in escrow during dispute resolution.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-500 shrink-0">•</span>
                          <span>False information may reduce your dispute outcome.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={onCancel}
                        className="h-12 px-6 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-white font-bold text-base rounded-full transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={selectedReasons.length === 0 || !comment.trim()}
                        className="h-12 px-6 bg-orange-500 hover:bg-orange-600 text-black font-bold text-base rounded-full transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-500"
                      >
                        Submit Dispute
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
            className="bg-[rgba(18,18,18,0.9)] border-0 rounded-[24px] shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="p-12 flex flex-col items-center justify-center space-y-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="relative"
              >
                <div className="w-24 h-24 rounded-full bg-orange-500/20 flex items-center justify-center border-4 border-orange-500/30">
                  <AlertTriangle className="text-orange-500" size={48} strokeWidth={3} />
                </div>
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-2 border-orange-500"
                />
              </motion.div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Dispute Opened!</h3>
                <p className="text-sm text-zinc-400">Arbiter notified. Redirecting to orders...</p>
              </div>

              <div className="w-full p-4 bg-[rgba(255,255,255,0.02)] border-0 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <AssetThumb
                    src={order.assetImage}
                    alt="Product"
                    className="w-12 h-12 rounded-lg bg-zinc-800 border border-[#27272a] shrink-0"
                  />
                  <div className="flex-1 text-left">
                    <p className="text-xs font-bold text-white leading-tight">{order.assetName}</p>
                    <p className="text-[11px] text-orange-400 mt-1">Under Review</p>
                  </div>
                  <AlertTriangle className="text-orange-500" size={20} />
                </div>
              </div>

              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.5, ease: 'linear' }}
                  className="h-full bg-orange-500"
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
