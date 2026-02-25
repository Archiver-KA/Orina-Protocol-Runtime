import { AlertTriangle, XCircle, Upload, Image as ImageIcon, Check, X } from 'lucide-react';
import { formatEther } from 'viem';
import { useState } from 'react';
import { MultiImageUpload } from '@/app/components/multi-image-upload';
import { UploadedImage } from '@/app/components/image-upload';
import { motion, AnimatePresence } from 'motion/react';
import { AssetThumb } from '@/app/components/asset-thumb';
import { StudioModalBody, StudioModalFooter, StudioModalHeader, StudioModalPanel, StudioModalShell } from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';
import { StudioFieldHint, StudioFieldLabel, StudioTextareaField } from '@/app/components/ui/studio-form-fields';
import { StudioTransientState } from '@/app/components/ui/studio-transient-state';
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

  const handleReasonToggle = (reasonId: string) => {
    setSelectedReasons(prev =>
      prev.includes(reasonId)
        ? prev.filter(id => id !== reasonId)
        : [...prev, reasonId]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 images
    const newFiles = [...uploadedEvidence, ...files].slice(0, 5);
    setUploadedEvidence(newFiles);
  };

  const handleRemoveImage = (index: number) => {
    const newFiles = uploadedEvidence.filter((_, i) => i !== index);
    setUploadedEvidence(newFiles);
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

    if (!(await requireWalletActionAsync({
      capability: 'protocol_dispute_write',
      actionLabel: 'open disputes',
      fallbackPage: 'orders',
    }))) {
      return;
    }

    setIsSuccess(true);

    // TODO: Upload images to IPFS/storage and get URLs
    const evidenceUrls = uploadedEvidence.map(file => file.url); // Mock URLs for now

    // Auto close after 1.5 seconds
    setTimeout(() => {
      onConfirm(selectedReasons, comment, evidenceUrls);
    }, 1500);
  };

  return (
    <StudioModalShell className="bg-black/80 backdrop-blur-sm z-50">
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="max-w-2xl w-full"
          >
            <StudioModalPanel className="max-w-2xl rounded-xl bg-[#0f0f11]">
            {/* Header - Photographic Style */}
            <StudioModalHeader className="bg-zinc-900/30 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="text-orange-500" size={20} />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-sm uppercase tracking-wider">Open Dispute</h2>
                    <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-widest">Order #{order.orderId.toString().slice(-6)}</p>
                  </div>
                </div>
                <StudioActionButton
                  onClick={onCancel}
                  size="icon"
                  variant="secondary"
                  className="w-8 h-8 rounded-lg bg-zinc-900/50"
                >
                  <X size={18} className="text-zinc-400" />
                </StudioActionButton>
              </div>
            </StudioModalHeader>

            {/* Content - Scrollable */}
            <StudioModalBody className="p-0">
              <div className="p-6 space-y-6">
                {/* Product Info - Photographic Style */}
                <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),var(--color-panel-bg)] border border-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <AssetThumb
                      src={order.assetImage}
                      alt="Product"
                      className="w-16 h-16 rounded-xl bg-zinc-950 border border-[var(--color-panel-border)] shrink-0"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white leading-tight">{order.assetName}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Quantity:</span>
                          <span className="text-xs font-bold text-[var(--color-primary-custom)]">
                            {order.amount.toString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Value:</span>
                          <span className="text-xs font-bold text-white">
                            {formatEther(order.grossPrice)} ETH
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dispute Reasons - Photographic Style */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Select Reason(s) <span className="text-orange-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {DISPUTE_REASONS.map(reason => (
                      <button
                        key={reason.id}
                        onClick={() => handleReasonToggle(reason.id)}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left
                          ${selectedReasons.includes(reason.id)
                            ? 'bg-orange-500/10 border-orange-500/40 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                            : 'bg-zinc-950/50 border-[#27272a] text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900/30'
                          }
                        `}
                      >
                        <div className={`
                          w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors
                          ${selectedReasons.includes(reason.id)
                            ? 'bg-orange-500 border-orange-500'
                            : 'border-zinc-600'
                          }
                        `}>
                          {selectedReasons.includes(reason.id) && (
                            <Check size={14} className="text-black" strokeWidth={3} />
                          )}
                        </div>
                        <span className="text-xs font-medium">{reason.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment - Photographic Style */}
                <div className="space-y-3">
                  <StudioFieldLabel className="text-zinc-500 mb-0">
                    Detailed Description <span className="text-orange-400">*</span>
                  </StudioFieldLabel>
                  <StudioTextareaField
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Please provide detailed information about the issue. Include relevant dates, conditions, and any communication with the seller..."
                    maxLength={1000}
                    className="h-32 bg-zinc-950 text-xs placeholder:text-zinc-600 border-[var(--color-panel-border)] focus:border-orange-500 focus:ring-orange-500/30"
                  />
                  <div className="flex items-center justify-between">
                    <StudioFieldHint className="mt-0 text-[9px] text-zinc-600">
                      Be specific and include all relevant details
                    </StudioFieldHint>
                    <p className="text-[9px] text-zinc-600 font-mono">
                      {comment.length}/1000
                    </p>
                  </div>
                </div>

                {/* Evidence Upload */}
                <div className="space-y-3">
                  <MultiImageUpload
                    maxFiles={5}
                    onUploadSuccess={(images) => {
                      setUploadedEvidence(images);
                      console.log('Dispute evidence uploaded to IPFS:', images);
                    }}
                    onUploadError={(error) => {
                      console.error('Dispute evidence upload error:', error);
                    }}
                    currentImages={uploadedEvidence.map(img => img.url)}
                    label="Evidence (Photos)"
                    description="PNG, JPG up to 100MB (max 5 images)"
                  />
                </div>

                {/* Warning */}
                <StudioNoticePanel
                  variant="warning"
                  compact
                  title={<span className="uppercase tracking-wider">Dispute Process</span>}
                  icon={<AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={16} />}
                >
                  <ul className="text-xs text-zinc-400 space-y-1.5 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-500 shrink-0">•</span>
                      <span>Arbiter will review evidence from both parties within 14 days</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-500 shrink-0">•</span>
                      <span>Funds will be held in escrow during dispute resolution</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-500 shrink-0">•</span>
                      <span>Providing false information may result in losing the dispute</span>
                    </li>
                  </ul>
                </StudioNoticePanel>
              </div>
            </StudioModalBody>

            {/* Footer - Photographic Style */}
            <StudioModalFooter className="px-6 pb-6 pt-6 flex-shrink-0">
              <StudioActionButton
                onClick={onCancel}
                variant="secondary"
                size="lg"
                className="bg-zinc-900/50"
              >
                Cancel
              </StudioActionButton>
              <StudioActionButton
                onClick={handleSubmit}
                disabled={selectedReasons.length === 0 || !comment.trim()}
                size="lg"
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-black border border-transparent shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-500"
              >
                Submit Dispute
              </StudioActionButton>
            </StudioModalFooter>
            </StudioModalPanel>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="bg-[#1a1a1c] border border-orange-500/30 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="p-12 flex flex-col items-center justify-center space-y-6 text-center">
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="relative"
              >
                <div className="w-24 h-24 rounded-full bg-orange-500/20 flex items-center justify-center border-4 border-orange-500/30">
                  <AlertTriangle className="text-orange-500" size={48} strokeWidth={3} />
                </div>
                {/* Pulse rings */}
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-2 border-orange-500"
                />
              </motion.div>

              {/* Success Message */}
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Dispute Opened!</h3>
                <p className="text-sm text-zinc-400">
                  Arbiter notified. Redirecting to orders...
                </p>
              </div>

              {/* Order Summary */}
              <div className="w-full p-4 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <AssetThumb
                    src={order.assetImage}
                    alt="Product"
                    className="w-12 h-12 rounded-lg bg-zinc-800 border border-[var(--color-panel-border)] shrink-0"
                  />
                  <div className="flex-1 text-left">
                    <p className="text-xs font-bold text-white leading-tight">{order.assetName}</p>
                    <StudioTransientState
                      variant="warning"
                      inline
                      className="mt-1 text-[11px]"
                      description="Under Review"
                      icon={<AlertTriangle className="text-orange-500" size={12} />}
                    />
                  </div>
                  <AlertTriangle className="text-orange-500" size={20} />
                </div>
              </div>

              {/* Loading bar */}
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
    </StudioModalShell>
  );
}
