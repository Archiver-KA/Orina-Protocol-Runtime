import { Send, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { AssetThumb } from '@/app/components/asset-thumb';
import { StudioFieldError, StudioFieldHint, StudioFieldLabel, StudioInputField } from '@/app/components/ui/studio-form-fields';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';
import { StudioModalBody, StudioModalCloseButton, StudioModalFooter, StudioModalHeader, StudioModalPanel } from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { useTheme } from '@/app/contexts/ThemeContext';

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
  const { theme } = useTheme();
  const [isLightTheme, setIsLightTheme] = useState(theme === 'light');
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

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    const detectTheme = () => {
      const attrTheme = root.getAttribute('data-theme') || '';
      const hasLightClass = root.classList.contains('light');
      const pageBgVar = getComputedStyle(root).getPropertyValue('--t-page-bg').trim().toLowerCase();
      const inferredByVar =
        pageBgVar.includes('eef1f4') ||
        pageBgVar.includes('238, 241, 244');

      setIsLightTheme(theme === 'light' || attrTheme === 'light' || hasLightClass || inferredByVar);
    };

    detectTheme();
    const observer = new MutationObserver(detectTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    return () => observer.disconnect();
  }, [theme]);

  if (!isOpen || !asset || typeof document === 'undefined') return null;

  const lightBackdropStyle = isLightTheme
    ? {
        background:
          'radial-gradient(circle at top, rgba(255, 255, 255, 0.5) 0%, rgba(226, 232, 240, 0.38) 42%, rgba(15, 23, 42, 0.28) 100%)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
      }
    : undefined;

  const quantityButtonClass = `taf-surface w-12 h-12 rounded-[14px] bg-[var(--t-surface-5)] border border-ui-border-subtle text-ui-secondary text-2xl leading-none flex items-center justify-center hover:bg-[var(--t-surface-10)] transition-colors ${
    isLightTheme ? '!bg-[#F3F5F8] !border-[var(--t-border-subtle)] hover:!bg-[#ECEFF3]' : ''
  }`;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="studio-form-backdrop fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
        style={lightBackdropStyle}
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
          <StudioModalPanel className="studio-form-modal transfer-asset-theme max-w-2xl h-[calc(100dvh-3rem)]">
            {/* Header */}
            <StudioModalHeader className="p-6 md:p-8 border-b-0 pb-3 md:pb-4">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div>
                <h2 className="text-lg font-semibold text-ui-primary tracking-tight mb-1">Transfer Asset</h2>
                <p className="text-[10px] text-ui-muted uppercase tracking-widest">Send this asset to another wallet address</p>
              </div>
              <StudioModalCloseButton onClick={onClose} />
            </div>
            </StudioModalHeader>

            <StudioModalBody className="p-6 md:p-8 pt-0">

            {/* Asset Preview */}
            <div className={`taf-surface flex items-center gap-4 p-4 bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-[20px] mb-5 md:mb-6 backdrop-blur-[8px] ${
              isLightTheme ? '!bg-[#F3F5F8] !border-[var(--t-border-subtle)]' : ''
            }`}>
              <AssetThumb
                src={asset.image}
                alt={asset.name}
                className="w-16 h-16 rounded-lg"
              />
              <div className="flex-1">
                <p className="text-base font-semibold tracking-tight text-ui-primary">{asset.name}</p>
                <p className="text-[10px] uppercase tracking-widest text-ui-muted">Token ID: {asset.id}</p>
              </div>
            </div>

            {/* Recipient Address */}
            <div className="mb-6">
              <StudioFieldLabel className="text-ui-muted text-[10px] uppercase tracking-widest font-semibold">
                Recipient Address
              </StudioFieldLabel>
              <StudioInputField
                type="text"
                placeholder="0x..."
                value={recipientAddress}
                onChange={handleAddressChange}
                className={`taf-input p-4 !bg-[var(--t-surface-5)] !border !border-ui-border-subtle ${
                  isLightTheme ? '!bg-[#F3F5F8] !border-[var(--t-border-subtle)]' : ''
                }`}
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
            <div className="mb-6">
              <StudioFieldLabel className="text-ui-muted text-[10px] uppercase tracking-widest font-semibold">
                Quantity
              </StudioFieldLabel>
              <div className={`taf-surface rounded-[24px] bg-[var(--t-surface-5)] border border-ui-border-subtle p-4 flex items-center justify-between gap-4 ${
                isLightTheme ? '!bg-[#F3F5F8] !border-[var(--t-border-subtle)]' : ''
              }`}>
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className={quantityButtonClass}
                >
                  -
                </button>
                <div className="flex-1 text-center">
                  <p className="text-5xl font-semibold text-ui-primary leading-none">{quantity}</p>
                  <p className="text-sm text-ui-muted mt-2">Units to transfer</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => prev + 1)}
                  className={quantityButtonClass}
                >
                  +
                </button>
              </div>
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
                className={`taf-surface flex-1 text-sm font-semibold tracking-tight ${
                  isLightTheme ? '!bg-[#F3F5F8] !border !border-[var(--t-border-subtle)] hover:!bg-[#ECEFF3]' : ''
                }`}
              >
                Cancel
              </StudioActionButton>
              <StudioActionButton
                onClick={handleConfirm}
                disabled={!isFormValid}
                variant="primary"
                size="lg"
                className="flex-1 text-sm font-semibold tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
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
