import { Copy, ExternalLink, Package, Shield, ShoppingBag } from 'lucide-react';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import type { MyAssetReceipt } from '@/app/components/cards/my-asset-cards';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { EXPLORER_URLS } from '@/config/contracts';
import { dispatchAppNavigation } from '@/utils/appNavigation';

interface ReceiptDetailModalProps {
  receipt: MyAssetReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptDetailModal({ receipt, isOpen, onClose }: ReceiptDetailModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !receipt || typeof document === 'undefined') return null;

  const sectionShellClass = 'rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)]';
  const insetShellClass = 'rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)]';
  const explorerBaseUrl = EXPLORER_URLS[receipt.chainId ?? 97] ?? EXPLORER_URLS[97];
  const mintExplorerUrl = receipt.mintTxHash ? `${explorerBaseUrl}/tx/${receipt.mintTxHash}` : null;

  const handleOpenAssetDetail = () => {
    if (!receipt.linkedAssetId) return;

    onClose();
    dispatchAppNavigation({
      assetId: receipt.linkedAssetId,
      fromPage: 'assets',
    });
  };

  const handleOpenMintTx = () => {
    if (!mintExplorerUrl) return;

    window.open(mintExplorerUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopySeller = () => {
    void navigator.clipboard?.writeText(receipt.seller);
  };

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="studio-portal-backdrop fixed inset-0 z-[75] flex items-center justify-center bg-black/85 p-4 backdrop-blur-[14px] md:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative z-[1] w-full max-w-5xl max-h-[95vh] md:h-[95vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="studio-modal-theme studio-glass-modal flex w-full max-w-5xl max-h-[95vh] flex-col overflow-hidden rounded-[32px] border border-ui-border-subtle bg-ui-card backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] md:h-[95vh]">
            <div className="studio-glass-header shrink-0 border-b border-ui-border-subtle bg-ui-card p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold tracking-tight text-ui-primary">{receipt.name}</h1>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ui-muted">
                    Canonical Receipt Snapshot
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="studio-glass-chip inline-flex h-7 items-center rounded-full border border-violet-400/20 bg-violet-500/15 px-3 text-[9px] font-semibold uppercase tracking-widest text-violet-300">
                    Receipt
                  </span>
                  <span className="studio-glass-chip inline-flex h-7 items-center rounded-full border border-orange-400/20 bg-orange-500/15 px-3 text-[9px] font-semibold uppercase tracking-widest text-orange-300">
                    Non-Transferable
                  </span>
                  <StudioModalCloseButton onClick={onClose} className="studio-glass-secondary rounded-full" />
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar md:overflow-hidden">
              <section className="grid min-h-full gap-6 p-5 md:grid-cols-[360px_1fr] md:h-full md:min-h-0 md:p-6">
                <div className="md:h-full md:min-h-0 md:overflow-hidden">
                  <div className="space-y-4 md:flex md:h-full md:min-h-0 md:flex-col md:overflow-y-auto md:pr-1 custom-scrollbar overscroll-contain">
                    <div className={`${sectionShellClass} overflow-hidden p-0`}>
                      <div className="relative aspect-square">
                        <img
                          src={receipt.image}
                          alt={receipt.name}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-black/65 px-3 py-1 text-[9px] font-semibold uppercase tracking-widest text-violet-300 backdrop-blur-md">
                          <Package size={10} />
                          Receipt
                        </div>
                      </div>
                    </div>

                    <div className={`${sectionShellClass} p-5`}>
                      <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ui-muted">
                        <Shield size={12} className="text-primary" />
                        Transfer Rules
                      </div>
                      <p className="text-sm leading-6 text-ui-secondary">
                        Receipt NFTs in the RWA branch are minted only at finalization and remain permanently non-transferable.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 md:h-full md:min-h-0 md:overflow-y-auto md:pr-1 custom-scrollbar overscroll-contain">
                  <div className={`${sectionShellClass} p-5`}>
                    <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ui-muted">
                      <ShoppingBag size={12} className="text-primary" />
                      Purchase Snapshot
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Order ID</p>
                        <p className="mt-1 text-sm font-semibold text-ui-primary">{receipt.orderId}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Purchase Value</p>
                        <p className="mt-1 text-sm font-semibold text-ui-primary">{receipt.purchaseValue}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Purchase Date</p>
                        <p className="mt-1 text-sm font-semibold text-ui-primary">{receipt.purchaseDate}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Blockchain</p>
                        <p className="mt-1 text-sm font-semibold text-ui-primary">{receipt.blockchain}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Seller Snapshot</p>
                        <div className={`${insetShellClass} mt-2 flex items-center justify-between gap-3 px-3 py-2`}>
                          <span className="truncate font-mono text-xs text-ui-secondary">{receipt.seller}</span>
                          <StudioActionButton
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-ui-secondary hover:text-ui-primary"
                            onClick={handleCopySeller}
                          >
                            <Copy size={14} />
                          </StudioActionButton>
                        </div>
                      </div>
                    </div>

                    {(receipt.linkedAssetId || mintExplorerUrl) && (
                      <div className="mt-5 flex flex-wrap gap-3">
                        {receipt.linkedAssetId && (
                          <StudioActionButton
                            type="button"
                            variant="secondary"
                            size="md"
                            className="min-h-11"
                            onClick={handleOpenAssetDetail}
                          >
                            <Package size={14} />
                            Open Asset Detail
                          </StudioActionButton>
                        )}

                        {mintExplorerUrl && (
                          <StudioActionButton
                            type="button"
                            variant="secondary"
                            size="md"
                            className="min-h-11"
                            onClick={handleOpenMintTx}
                          >
                            <ExternalLink size={14} />
                            View Mint Tx
                          </StudioActionButton>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`${sectionShellClass} p-5`}>
                    <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-ui-muted">
                      Data Source Audit
                    </div>
                    <div className="space-y-3 text-sm leading-6 text-ui-secondary">
                      <p>
                        This receipt surface now renders only the canonical snapshot available to the wallet asset view.
                      </p>
                      <p>
                        Advanced receipt metadata such as vault QR codes, custodian identity, and detailed ownership matrix is not indexed yet in the current Supabase/UI flow.
                      </p>
                      <p className="text-ui-muted">
                        Until receipt projection is implemented end-to-end, this modal intentionally avoids synthetic data.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
