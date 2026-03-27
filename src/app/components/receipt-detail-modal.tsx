import { Copy, Package, Shield, ShoppingBag } from 'lucide-react';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import type { MyAssetReceipt } from '@/app/components/cards/my-asset-cards';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

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

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="studio-portal-backdrop fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="studio-modal-theme studio-glass-modal relative w-full max-w-[920px] rounded-[2rem] border border-ui-border-subtle bg-[rgba(18,18,18,0.9)] backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="studio-glass-header border-b border-[rgba(255,255,255,0.06)] bg-[rgba(18,18,18,0.86)] p-5 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-white tracking-tight">{receipt.name}</h1>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Canonical Receipt Snapshot
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="studio-glass-chip inline-flex h-7 items-center rounded-full border border-violet-400/20 bg-violet-500/15 px-3 text-[9px] font-bold uppercase tracking-widest text-violet-300">
                  Receipt NFT
                </span>
                <span className="studio-glass-chip inline-flex h-7 items-center rounded-full border border-orange-400/20 bg-orange-500/15 px-3 text-[9px] font-bold uppercase tracking-widest text-orange-300">
                  Non-Transferable
                </span>
                <StudioModalCloseButton onClick={onClose} className="studio-glass-secondary" />
              </div>
            </div>
          </div>

          <section className="grid gap-6 p-5 md:grid-cols-[360px_1fr] md:p-6">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(24,24,27,0.5)]">
                <div className="relative aspect-square">
                  <img
                    src={receipt.image}
                    alt={receipt.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-black/60 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-violet-300 backdrop-blur-md">
                    <Package size={10} />
                    Receipt
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(24,24,27,0.4)] p-5">
                <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                  <Shield size={12} className="text-primary" />
                  Transfer Rules
                </div>
                <p className="text-sm leading-6 text-zinc-300">
                  Receipt NFTs in the RWA branch are minted only at finalization and remain permanently non-transferable.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(24,24,27,0.4)] p-5">
                <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                  <ShoppingBag size={12} className="text-primary" />
                  Purchase Snapshot
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Order ID</p>
                    <p className="mt-1 text-sm font-semibold text-white">{receipt.orderId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Purchase Value</p>
                    <p className="mt-1 text-sm font-semibold text-white">{receipt.purchaseValue}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Purchase Date</p>
                    <p className="mt-1 text-sm font-semibold text-white">{receipt.purchaseDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Blockchain</p>
                    <p className="mt-1 text-sm font-semibold text-white">{receipt.blockchain}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Seller Snapshot</p>
                    <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-black/30 px-3 py-2">
                      <span className="truncate font-mono text-xs text-zinc-300">{receipt.seller}</span>
                      <button
                        type="button"
                        className="text-zinc-500 transition-colors hover:text-white"
                        onClick={() => {
                          void navigator.clipboard?.writeText(receipt.seller);
                        }}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(24,24,27,0.4)] p-5">
                <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Data Source Audit
                </div>
                <div className="space-y-3 text-sm leading-6 text-zinc-300">
                  <p>
                    This receipt surface now renders only the canonical snapshot available to the wallet asset view.
                  </p>
                  <p>
                    Advanced receipt metadata such as vault QR codes, custodian identity, and detailed ownership matrix is not indexed yet in the current Supabase/UI flow.
                  </p>
                  <p className="text-zinc-500">
                    Until receipt projection is implemented end-to-end, this modal intentionally avoids synthetic data.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
