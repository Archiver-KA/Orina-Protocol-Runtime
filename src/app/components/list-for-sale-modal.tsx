import { X, Tag, AlertCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AssetThumb } from '@/app/components/asset-thumb';
import { StudioFieldHint, StudioFieldLabel, StudioNumberField } from '@/app/components/ui/studio-form-fields';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';
import { StudioModalBody, StudioModalFooter, StudioModalHeader, StudioModalPanel, StudioModalShell } from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';

interface ListForSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: string;
    name: string;
    image: string;
  } | null;
}

export function ListForSaleModal({ isOpen, onClose, asset }: ListForSaleModalProps) {
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [duration, setDuration] = useState('7');

  if (!isOpen || !asset) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    const priceNum = parseFloat(price);
    if (price && priceNum > 0 && quantity > 0 && duration) {
      console.log('List for Sale:', { asset: asset.id, price, quantity, duration });
      // TODO: Implement actual marketplace listing logic with Wagmi
      onClose();
    }
  };

  const isFormValid = price.length > 0 && parseFloat(price) > 0 && quantity > 0 && duration.length > 0;

  const durationOptions = [
    { value: '1', label: '1 Day' },
    { value: '3', label: '3 Days' },
    { value: '7', label: '7 Days' },
    { value: '14', label: '14 Days' },
    { value: '30', label: '30 Days' },
  ];

  return (
    <AnimatePresence>
      <StudioModalShell className="z-[60] p-6 bg-black/85 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        onClick={handleOverlayClick}
      />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <StudioModalPanel className="max-w-2xl">
            {/* Header */}
            <StudioModalHeader className="p-6 md:p-8 border-b-0 pb-0">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">List for Sale</h2>
                <p className="text-sm text-zinc-500">Create a marketplace listing for this asset</p>
              </div>
              <StudioActionButton
                onClick={onClose}
                size="icon"
                variant="secondary"
                className="text-zinc-500 hover:text-white"
              >
                <X size={20} />
              </StudioActionButton>
            </div>
            </StudioModalHeader>

            <StudioModalBody className="p-6 md:p-8 pt-0">

            {/* Asset Preview */}
            <div className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-[#27272a] rounded-xl mb-6">
              <AssetThumb
                src={asset.image}
                alt={asset.name}
                className="w-16 h-16 rounded-lg"
              />
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{asset.name}</p>
                <p className="text-xs text-zinc-500">Token ID: {asset.id}</p>
              </div>
            </div>

            {/* Price per Unit */}
            <div className="mb-6">
              <StudioFieldLabel className="text-zinc-500">
                Price per Unit (ETH)
              </StudioFieldLabel>
              <StudioNumberField
                step="0.01"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="p-4"
                rightSlot={<span className="text-xs font-bold text-zinc-500">ETH</span>}
              />
              {price && parseFloat(price) > 0 && (
                <StudioFieldHint>
                  ≈ ${(parseFloat(price) * 2400).toFixed(2)} USD
                </StudioFieldHint>
              )}
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <StudioFieldLabel className="text-zinc-500">
                Quantity
              </StudioFieldLabel>
              <StudioNumberField
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="p-4"
              />
              <StudioFieldHint>
                You will list {quantity} {quantity === 1 ? 'unit' : 'units'} for sale
              </StudioFieldHint>
            </div>

            {/* Listing Duration */}
            <div className="mb-6">
              <label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block">
                Listing Duration
              </label>
              <div className="grid grid-cols-5 gap-2">
                {durationOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDuration(option.value)}
                    className={`p-3 rounded-lg border text-xs font-bold transition-all ${
                      duration === option.value
                        ? 'bg-[#2CC295] text-black border-[#2CC295]'
                        : 'bg-zinc-900/50 text-zinc-400 border-[#27272a] hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Earnings */}
            {price && parseFloat(price) > 0 && (
              <div className="p-4 bg-[#2CC295]/10 border border-[#2CC295]/20 rounded-xl mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-[#2CC295] uppercase font-bold mb-1">Total Earnings</p>
                    <p className="text-xl font-bold text-white">
                      {(parseFloat(price) * quantity).toFixed(4)} ETH
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Marketplace Fee (2.5%)</p>
                    <p className="text-sm font-bold text-zinc-400">
                      {(parseFloat(price) * quantity * 0.025).toFixed(4)} ETH
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Notice */}
            <StudioNoticePanel
              variant="info"
              className="rounded-xl mb-6 border-blue-500/20"
              icon={<Clock size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />}
              title="Listing Information"
            >
              Your asset will be listed on the marketplace for {durationOptions.find(o => o.value === duration)?.label.toLowerCase()}. You can cancel the listing at any time.
            </StudioNoticePanel>

            </StudioModalBody>

            {/* Action Buttons */}
            <StudioModalFooter className="p-6 md:p-8 pt-0 border-t-0">
              <StudioActionButton
                onClick={onClose}
                variant="secondary"
                size="lg"
                className="flex-1"
              >
                Cancel
              </StudioActionButton>
              <StudioActionButton
                onClick={handleConfirm}
                disabled={!isFormValid}
                variant="primary"
                size="lg"
                className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                leftIcon={<Tag size={18} />}
              >
                List for Sale
              </StudioActionButton>
            </StudioModalFooter>
          </StudioModalPanel>
        </motion.div>
      </StudioModalShell>
    </AnimatePresence>
  );
}
