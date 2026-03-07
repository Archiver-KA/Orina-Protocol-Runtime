import { Send, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { AssetThumb } from '@/app/components/asset-thumb';
import { StudioFieldError, StudioFieldHint, StudioFieldLabel, StudioInputField, StudioNumberField } from '@/app/components/ui/studio-form-fields';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';
import { StudioModalBody, StudioModalCloseButton, StudioModalFooter, StudioModalHeader, StudioModalPanel } from '@/app/components/ui/studio-modal';
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

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !asset || typeof document === 'undefined') return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
      <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative z-[1] w-full max-w-2xl h-[calc(100dvh-3rem)]"
          onClick={(e) => e.stopPropagation()}
        >
          <StudioModalPanel className="max-w-2xl h-[calc(100dvh-3rem)]">
            {/* Header */}
            <StudioModalHeader className="p-6 md:p-8 border-b-0 pb-3 md:pb-4">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight mb-1">Transfer Asset</h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Send this asset to another wallet address</p>
              </div>
              <StudioModalCloseButton onClick={onClose} />
            </div>
            </StudioModalHeader>

            <StudioModalBody className="p-6 md:p-8 pt-0">

            {/* Asset Preview */}
            <div className="flex items-center gap-4 p-4 bg-[rgba(255,255,255,0.03)] border-0 rounded-[20px] mb-5 md:mb-6 backdrop-blur-[8px]">
              <AssetThumb
                src={asset.image}
                alt={asset.name}
                className="w-16 h-16 rounded-lg"
              />
              <div className="flex-1">
                <p className="text-base font-bold tracking-tight text-white">{asset.name}</p>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Token ID: {asset.id}</p>
              </div>
            </div>

            {/* Recipient Address */}
            <div className="mb-6">
              <StudioFieldLabel className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
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
              <StudioFieldLabel className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
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
                className="flex-1 text-sm font-bold tracking-tight"
              >
                Cancel
              </StudioActionButton>
              <StudioActionButton
                onClick={handleConfirm}
                disabled={!isFormValid}
                variant="primary"
                size="lg"
                className="flex-1 text-sm font-bold tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
                leftIcon={<Send size={18} />}
              >
                Confirm Transfer
              </StudioActionButton>
            </StudioModalFooter>
          </StudioModalPanel>
      </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
