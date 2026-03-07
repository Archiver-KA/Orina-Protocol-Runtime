import { Copy, Shield, CheckCircle, Terminal } from 'lucide-react';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

interface ReceiptDetailModalProps {
  receiptId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptDetailModal({ receiptId, isOpen, onClose }: ReceiptDetailModalProps) {
  // Prevent body scroll when modal is open
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

  // Mock data based on receipt ID
  const receiptData = {
    assetName: 'Luxury Chronograph • Series A',
    tokenId: '#9928',
    image: 'https://images.unsplash.com/photo-1606220588913-b3aeb229d8dc?w=1200&h=800&fit=crop',
    status: 'Certified',
    ownershipSlots: 64,
    totalSlots: 100,
    slotPrice: '0.45',
    yieldAPR: '12.4',
    exitLiquidity: 'Instant',
    mintDate: 'OCT-24-2023 14:22:10',
    blockHeight: '18,442,109',
    contractHash: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=RWA-ASSET-9928',
    custodian: {
      name: 'LuxuryReserve.eth',
      avatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop',
      address: '0x92f...a4e5c88b0291',
      trustScore: '99.8',
    },
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", duration: 0.3 }}
        className="relative w-full max-w-[860px] h-[calc(100dvh-3rem)] rounded-[2rem] border-0 bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          .hidden-scrollbar::-webkit-scrollbar { display: none; }
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes zoom-in-95 {
            from { transform: scale(0.95); }
            to { transform: scale(1); }
          }
          .animate-in {
            animation: fade-in 0.3s ease-out, zoom-in-95 0.3s ease-out;
          }
        `}</style>

        {/* Fixed Header */}
        <div className="shrink-0 p-5 md:p-6 pb-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] relative z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white tracking-tight truncate">{receiptData.assetName}</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                Physical Asset Verified by RWA Protocol
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="h-7 px-3 inline-flex items-center bg-[rgba(255,255,255,0.04)] rounded-full border border-[rgba(255,255,255,0.08)] text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                Token ID {receiptData.tokenId}
              </span>
              <span className="h-7 px-3 inline-flex items-center bg-[#2CC295]/15 rounded-full border border-[#2CC295]/30 text-[9px] font-bold text-[#2CC295] uppercase tracking-widest">
                {receiptData.status}
              </span>
              <StudioModalCloseButton onClick={onClose} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <section className="min-w-0 min-h-0 flex-1 overflow-y-auto lg:overflow-hidden hidden-scrollbar relative">
          <div className="h-full p-5 md:p-6 pt-4 relative z-10">
            <div className="w-full h-full max-w-[860px] mx-auto flex flex-col lg:flex-row justify-center items-start gap-6 px-0 md:px-2">
              {/* Left Column (hidden scrollbar, independent scroll) */}
              <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-4 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                <div className="relative w-[350px] h-[350px] max-w-full bg-[rgba(24,24,27,0.5)] rounded-[24px] overflow-hidden">
                  <img
                    alt="Asset"
                    className="w-full h-full object-cover opacity-80"
                    src={receiptData.image}
                  />
                  <div className="absolute left-[17px] top-[17px] flex items-center gap-1 px-2 py-1 bg-black/60 border border-white/10 backdrop-blur-[6px] rounded-[6px]">
                    <Shield size={10} className="text-[#2CC295]" />
                    <span className="text-[9px] leading-[14px] font-bold uppercase text-[#2CC295]">Verified</span>
                  </div>
                  <div className="absolute right-[17px] top-[13px] px-2 py-[2.5px] bg-black/60 border border-white/10 backdrop-blur-[6px] rounded-[6px]">
                    <span className="text-[9px] leading-[14px] font-bold uppercase text-[#A1A1AA]">{receiptData.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <span className="w-8 h-8 rounded-full bg-[#27272A] border-2 border-[#141417] text-[10px] font-bold text-[#D4D4D8] inline-flex items-center justify-center">1</span>
                    <span className="w-8 h-8 rounded-full bg-[#3F3F46] border-2 border-[#141417] text-[10px] font-bold text-[#D4D4D8] inline-flex items-center justify-center">2</span>
                    <span className="w-8 h-8 rounded-full bg-[#52525B] border-2 border-[#141417] text-[10px] font-bold text-[#D4D4D8] inline-flex items-center justify-center">3</span>
                    <span className="w-8 h-8 rounded-full bg-[#2CC295] border-2 border-[#141417] text-[10px] font-bold text-black inline-flex items-center justify-center">11</span>
                  </div>
                  <span className="text-[10px] leading-[15px] font-medium text-[#71717A]">15 Transactions</span>
                </div>
              </div>

              {/* Right Column */}
              <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-6 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                <div className="bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6">
                  <div className="mx-auto w-[152px] h-[152px] bg-white rounded-[24px] p-3 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    <img alt="QR Code" className="w-full h-full" src={receiptData.qrCode} />
                  </div>
                  <p className="mt-6 text-center text-xs font-bold uppercase tracking-[1.2px] text-white">Physical Scan Auth</p>
                  <p className="mt-2 text-center text-[9px] leading-[15px] text-[#71717A]">
                    Scan this code at the physical vault to verify possession and authenticity.
                  </p>
                </div>

                <div className="bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Fractional Ownership</h3>
                    <span className="text-[10px] font-bold uppercase tracking-[1px] text-[#2CC295]">Live Distribution</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[30px] leading-[36px] font-extrabold text-white">
                        {receiptData.ownershipSlots}
                        <span className="text-[#71717A]">/{receiptData.totalSlots}</span>
                      </p>
                      <p className="text-[10px] leading-[15px] font-bold uppercase text-[#71717A]">Slots Acquired</p>
                    </div>
                    <div className="h-2 w-full bg-[#27272A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2CC295] shadow-[0_0_12px_#2CC295] rounded-full"
                        style={{ width: `${(receiptData.ownershipSlots / receiptData.totalSlots) * 100}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] leading-[14px] uppercase font-bold text-[#71717A]">Slot Price</p>
                        <p className="text-xs leading-4 font-bold text-white">{receiptData.slotPrice} ETH</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] leading-[14px] uppercase font-bold text-[#71717A]">Yield APR</p>
                        <p className="text-xs leading-4 font-bold text-[#2CC295]">{receiptData.yieldAPR}%</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] leading-[14px] uppercase font-bold text-[#71717A]">Exit Liquidity</p>
                        <p className="text-xs leading-4 font-bold text-white">{receiptData.exitLiquidity}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Custodian Entity</h3>
                    <CheckCircle size={12} className="text-[#52525B]" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#27272A] overflow-hidden">
                      <img alt="Custodian" className="w-full h-full object-cover" src={receiptData.custodian.avatar} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white uppercase">{receiptData.custodian.name}</p>
                      <p className="text-[9px] font-bold uppercase text-[#2CC295]">Verified Vault</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-black/40 border border-[rgba(255,255,255,0.05)] rounded px-2 py-2">
                      <span className="font-mono text-[10px] text-[#71717A] truncate">{receiptData.custodian.address}</span>
                      <button className="text-[#52525B] hover:text-white transition-colors">
                        <Copy size={12} />
                      </button>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold uppercase text-[#71717A]">Trust Score</span>
                      <span className="font-bold text-[#2CC295]">{receiptData.custodian.trustScore}%</span>
                    </div>
                    <div className="pt-2 border-t border-[rgba(255,255,255,0.05)] flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#2CC295]" />
                      <span className="text-[10px] font-bold uppercase tracking-[1px] text-white">Ownership Matrix: Synced</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Asset Birth Log</h3>
                    <Terminal className="text-[#52525B]" size={14} />
                  </div>
                  <div className="space-y-3 font-mono">
                    <div className="flex justify-between border-b border-[rgba(255,255,255,0.05)] pb-3">
                      <span className="text-[10px] text-[#71717A]">MINT TIME</span>
                      <span className="text-[10px] text-[#D4D4D8]">{receiptData.mintDate}</span>
                    </div>
                    <div className="flex justify-between border-b border-[rgba(255,255,255,0.05)] pb-3">
                      <span className="text-[10px] text-[#71717A]">BLOCK HEIGHT</span>
                      <span className="text-[10px] text-[#D4D4D8]">{receiptData.blockHeight}</span>
                    </div>
                    <div className="space-y-1 pt-1">
                      <span className="text-[9px] uppercase text-[#71717A]">Contract Hash</span>
                      <div className="flex items-center justify-between gap-2 bg-black/40 border border-[rgba(255,255,255,0.05)] rounded px-2 py-2">
                        <span className="text-[9px] text-[#2CC295] truncate">{receiptData.contractHash}</span>
                        <button className="text-[#71717A] hover:text-white transition-colors">
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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
