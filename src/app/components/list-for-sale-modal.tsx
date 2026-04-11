import { Tag, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { AssetThumb } from '@/app/components/asset-thumb';
import { StudioFieldHint, StudioFieldLabel, StudioNumberField } from '@/app/components/ui/studio-form-fields';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';
import {
  StudioModalBody,
  StudioModalCloseButton,
  StudioModalFooter,
  StudioModalHeader,
  StudioModalPanel,
} from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { useTheme } from '@/app/contexts/ThemeContext';

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
  const { theme } = useTheme();
  const [isLightTheme, setIsLightTheme] = useState(theme === 'light');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [duration, setDuration] = useState('7');
  const maxQuantity = 22;

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

      const resolvedLight = theme === 'light' || attrTheme === 'light' || hasLightClass || inferredByVar;
      setIsLightTheme(resolvedLight);
    };

    detectTheme();
    const observer = new MutationObserver(detectTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    return () => observer.disconnect();
  }, [theme, isOpen]);

  if (!isOpen || !asset || typeof document === 'undefined') return null;

  const lightBackdropStyle = isLightTheme
    ? {
        background:
          'radial-gradient(circle at top, rgba(255, 255, 255, 0.5) 0%, rgba(226, 232, 240, 0.38) 42%, rgba(15, 23, 42, 0.28) 100%)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
      }
    : undefined;

  const lightPanelStyle = isLightTheme
    ? {
        background:
          'linear-gradient(145deg, rgba(255, 255, 255, 0.74), rgba(255, 255, 255, 0.5))',
        border: '1px solid rgba(255, 255, 255, 0.52)',
        boxShadow:
          '0 32px 80px -36px rgba(15, 23, 42, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(24px) saturate(165%)',
        WebkitBackdropFilter: 'blur(24px) saturate(165%)',
        opacity: 1,
      }
    : undefined;

  const lightSurfaceStyle = isLightTheme
    ? {
        background:
          'linear-gradient(180deg, rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0.3))',
        borderColor: 'rgba(255, 255, 255, 0.42)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.58)',
        backdropFilter: 'blur(18px) saturate(150%)',
        WebkitBackdropFilter: 'blur(18px) saturate(150%)',
      }
    : undefined;

  const lightInfoNoticeStyle = isLightTheme
    ? {
        background:
          'linear-gradient(180deg, rgba(219, 234, 254, 0.72), rgba(219, 234, 254, 0.5))',
        borderColor: 'rgba(96, 165, 250, 0.34)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.64)',
      }
    : undefined;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
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
          <StudioModalPanel
            className="list-for-sale-theme max-w-2xl h-[calc(100dvh-3rem)]"
            style={lightPanelStyle}
          >
            {/* Header */}
            <StudioModalHeader className="p-6 md:p-8 border-b-0 pb-3 md:pb-4">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div>
                <h2 className="text-lg font-semibold text-ui-primary tracking-tight mb-1">List for Sale</h2>
                <p className="text-[10px] text-ui-muted uppercase tracking-widest">Create a marketplace listing for this asset</p>
              </div>
              <StudioModalCloseButton onClick={onClose} />
            </div>
            </StudioModalHeader>

            <StudioModalBody className="p-6 md:p-8 pt-0">

            {/* Asset Preview */}
            <div
              className={`lsf-surface flex items-center gap-4 p-4 bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-[20px] mb-5 md:mb-6 backdrop-blur-[8px] ${
                isLightTheme ? '!bg-[#F3F5F8] !border-[var(--t-border-subtle)]' : ''
              }`}
              style={lightSurfaceStyle}
            >
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

            {/* Price per Unit */}
            <div className="mb-6">
              <StudioFieldLabel className="text-ui-muted text-[10px] uppercase tracking-widest font-semibold">
                Price per Unit (ETH)
              </StudioFieldLabel>
              <StudioNumberField
                step="0.01"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={`lsf-input p-4 text-base md:text-lg font-semibold !bg-[var(--t-surface-5)] !border !border-ui-border-subtle ${
                  isLightTheme ? '!bg-[#F3F5F8] !border-[var(--t-border-subtle)]' : ''
                }`}
                style={lightSurfaceStyle}
                rightSlot={<span className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">ETH</span>}
              />
              {price && parseFloat(price) > 0 && (
                <StudioFieldHint>
                  ≈ ${(parseFloat(price) * 2400).toFixed(2)} USD
                </StudioFieldHint>
              )}
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <StudioFieldLabel className="text-ui-muted text-[10px] uppercase tracking-widest font-semibold">
                Quantity
              </StudioFieldLabel>
              <div
                className={`lsf-surface rounded-[24px] bg-[var(--t-surface-5)] border border-ui-border-subtle p-4 flex items-center justify-between gap-4 ${
                  isLightTheme ? '!bg-[#F3F5F8] !border-[var(--t-border-subtle)]' : ''
                }`}
                style={lightSurfaceStyle}
              >
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className={`lsf-surface w-12 h-12 rounded-[14px] bg-[var(--t-surface-5)] border border-ui-border-subtle text-ui-secondary text-2xl leading-none flex items-center justify-center hover:bg-[var(--t-surface-10)] transition-colors ${
                    isLightTheme ? '!bg-[#F3F5F8] !border-[var(--t-border-subtle)] hover:!bg-[#ECEFF3]' : ''
                  }`}
                  style={lightSurfaceStyle}
                >
                  -
                </button>
                <div className="flex-1 text-center">
                  <p className="text-5xl font-semibold text-ui-primary leading-none">{quantity}</p>
                  <p className="text-sm text-ui-muted mt-2">of {maxQuantity} available</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.min(maxQuantity, prev + 1))}
                  className={`lsf-surface w-12 h-12 rounded-[14px] bg-[var(--t-surface-5)] border border-ui-border-subtle text-ui-secondary text-2xl leading-none flex items-center justify-center hover:bg-[var(--t-surface-10)] transition-colors ${
                    isLightTheme ? '!bg-[#F3F5F8] !border-[var(--t-border-subtle)] hover:!bg-[#ECEFF3]' : ''
                  }`}
                  style={lightSurfaceStyle}
                >
                  +
                </button>
              </div>
              <StudioFieldHint>
                You will list {quantity} {quantity === 1 ? 'unit' : 'units'} for sale
              </StudioFieldHint>
            </div>

            {/* Listing Duration */}
            <div className="mb-6">
              <label className="text-[10px] text-ui-muted uppercase font-semibold mb-2 block">
                Listing Duration
              </label>
              <div className="grid grid-cols-5 gap-2">
                {durationOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDuration(option.value)}
                    className={`p-3 rounded-full border text-xs font-semibold transition-all ${
                      duration === option.value
                        ? 'bg-[#2CC295] border-[#2CC295] text-black'
                        : `lsf-surface bg-[var(--t-surface-5)] border-ui-border-subtle text-ui-secondary hover:text-ui-primary hover:bg-[var(--t-surface-10)] ${
                            isLightTheme ? '!bg-[#F3F5F8] !border-[var(--t-border-subtle)] hover:!bg-[#ECEFF3]' : ''
                          }`
                    }`}
                    style={duration !== option.value ? lightSurfaceStyle : undefined}
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
                    <p className="text-[10px] text-[#2CC295] uppercase font-semibold mb-1">Total Earnings</p>
                    <p className="text-xl font-semibold text-ui-primary">
                      {(parseFloat(price) * quantity).toFixed(4)} ETH
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-ui-muted uppercase font-semibold mb-1">Marketplace Fee (2.5%)</p>
                    <p className="text-sm font-semibold text-ui-secondary">
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
              style={lightInfoNoticeStyle}
              icon={
                <Clock
                  size={16}
                  className={`${isLightTheme ? 'text-sky-700' : 'text-blue-400'} mt-0.5 flex-shrink-0`}
                />
              }
              title={
                <span className={isLightTheme ? 'text-sky-800' : undefined}>
                  Listing Information
                </span>
              }
            >
              <span className={isLightTheme ? 'text-slate-700' : undefined}>
                Your asset will be listed on the marketplace for {durationOptions.find(o => o.value === duration)?.label.toLowerCase()}. You can cancel the listing at any time.
              </span>
            </StudioNoticePanel>

            </StudioModalBody>

            {/* Action Buttons */}
            <StudioModalFooter className="p-6 md:p-8 pt-0 border-t-0">
              <StudioActionButton
                onClick={onClose}
                variant="secondary"
                size="lg"
                className={`lsf-surface flex-1 text-sm font-semibold tracking-tight ${
                  isLightTheme ? '!bg-[#F3F5F8] !border !border-[var(--t-border-subtle)] hover:!bg-[#ECEFF3]' : ''
                }`}
                style={lightSurfaceStyle}
              >
                Cancel
              </StudioActionButton>
              <StudioActionButton
                onClick={handleConfirm}
                disabled={!isFormValid}
                variant="primary"
                size="lg"
                className="flex-1 text-sm font-semibold tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
                leftIcon={<Tag size={18} />}
              >
                List for Sale
              </StudioActionButton>
            </StudioModalFooter>
          </StudioModalPanel>
      </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
