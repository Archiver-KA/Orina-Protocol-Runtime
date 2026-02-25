import { X, Send, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AssetThumb } from '@/app/components/asset-thumb';
import { StudioFieldError, StudioFieldHint, StudioFieldLabel, StudioInputField, StudioNumberField } from '@/app/components/ui/studio-form-fields';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';
import { StudioModalBody, StudioModalFooter, StudioModalHeader, StudioModalPanel, StudioModalShell } from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: string;
    name: string;
    image: string;
  } | null;
}

export function TransferModal({ isOpen, onClose, asset }: TransferModalProps) {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isValidAddress, setIsValidAddress] = useState(true);

  if (!isOpen || !asset) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const validateAddress = (address: string) => {
    // Basic ETH address validation (0x + 40 hex characters)
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRecipientAddress(value);
    if (value.length > 0) {
      setIsValidAddress(validateAddress(value));
    } else {
      setIsValidAddress(true);
    }
  };

  const handleConfirm = () => {
    if (recipientAddress && validateAddress(recipientAddress) && quantity > 0) {
      console.log('Transfer:', { asset: asset.id, to: recipientAddress, quantity });
      // TODO: Implement actual blockchain transfer logic with Wagmi
      onClose();
    }
  };

  const isFormValid = recipientAddress.length > 0 && isValidAddress && quantity > 0;

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
                <h2 className="text-2xl font-bold text-white mb-1">Transfer Asset</h2>
                <p className="text-sm text-zinc-500">Send this asset to another wallet address</p>
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

            {/* Recipient Address */}
            <div className="mb-6">
              <StudioFieldLabel className="text-zinc-500">
                Recipient Address
              </StudioFieldLabel>
              <StudioInputField
                type="text"
                placeholder="0x..."
                value={recipientAddress}
                onChange={handleAddressChange}
                className="p-4"
                invalid={!isValidAddress && recipientAddress.length > 0}
              />
              {!isValidAddress && recipientAddress.length > 0 && (
                <StudioFieldError>
                  <AlertCircle size={12} />
                  <p className="text-xs">Invalid Ethereum address format</p>
                </StudioFieldError>
              )}
            </div>

            {/* Quantity */}
            <div className="mb-8">
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
                You will transfer {quantity} {quantity === 1 ? 'unit' : 'units'} of this asset
              </StudioFieldHint>
            </div>

            {/* Warning Notice */}
            <StudioNoticePanel
              variant="warning"
              className="rounded-xl mb-6 border-orange-500/20 bg-orange-500/10"
              icon={<AlertCircle size={16} className="text-orange-400 mt-0.5 flex-shrink-0" />}
              title="Important Notice"
            >
              Transfers are irreversible. Please double-check the recipient address before confirming.
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
                leftIcon={<Send size={18} />}
              >
                Confirm Transfer
              </StudioActionButton>
            </StudioModalFooter>
          </StudioModalPanel>
        </motion.div>
      </StudioModalShell>
    </AnimatePresence>
  );
}
