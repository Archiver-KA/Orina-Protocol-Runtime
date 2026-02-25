import { ArrowLeft, Copy, Maximize, RotateCcw, Shield, CheckCircle, Info, Terminal, QrCode, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ReceiptDetailModalProps {
  receiptId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptDetailModal({ receiptId, isOpen, onClose }: ReceiptDetailModalProps) {
  const [activeSection, setActiveSection] = useState('provenance');

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      {/* Backdrop Overlay */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-[95vw] h-[90vh] bg-[#0f0f11] rounded-xl shadow-2xl border border-[#27272a] overflow-hidden flex animate-in fade-in zoom-in-95 duration-300">
        <style>{`
          .hidden-scrollbar::-webkit-scrollbar { display: none; }
          .ambient-blob {
            position: absolute;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(44, 194, 149, 0.03) 0%, rgba(18, 18, 18, 0) 70%);
            border-radius: 50%;
            filter: blur(80px);
            z-index: 0;
            pointer-events: none;
          }
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

        {/* Main Content */}
        <section className="flex-1 overflow-y-auto hidden-scrollbar relative">
          {/* Ambient Blobs */}
          <div className="ambient-blob -top-40 -left-40"></div>
          <div className="ambient-blob -bottom-40 -right-40"></div>

          <div className="p-6 md:p-8 relative z-10">
            {/* Header */}
            <div className="pb-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#27272a] bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
                  >
                    <X className="text-zinc-400" size={20} />
                  </button>
                  <div>
                    <h1 className="text-lg font-bold text-white tracking-tight">{receiptData.assetName}</h1>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                      Physical Asset Verified by RWA Protocol
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-zinc-900 rounded-full border border-[#27272a] text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                    Token ID {receiptData.tokenId}
                  </span>
                  <span className="px-3 py-1 bg-[#2CC295]/10 rounded-full border border-[#2CC295]/20 text-[9px] font-bold text-[#2CC295] uppercase tracking-widest">
                    {receiptData.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Asset Image */}
            <div className="relative group mb-8">
              <div className="aspect-video rounded-2xl overflow-hidden border border-[#27272a] relative bg-zinc-950">
                <img
                  alt="Asset"
                  className="w-full h-full object-cover opacity-80"
                  src={receiptData.image}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent"></div>
                
                {/* Image Overlay */}
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                  <div className="space-y-1">
                    <span className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] font-bold text-white uppercase tracking-widest border border-white/10">
                      External View 01
                    </span>
                    <h3 className="text-xl font-bold text-white">42mm Grand Complication</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fractional Ownership */}
              <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Fractional Ownership
                  </h3>
                  <span className="text-[10px] font-mono text-[#2CC295]">Live Distribution</span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-3xl font-black text-white">
                      {receiptData.ownershipSlots}
                      <span className="text-zinc-600 text-xl">/{receiptData.totalSlots}</span>
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                      Slots Acquired
                    </span>
                  </div>
                  
                  <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden border border-[#27272a] p-0.5">
                    <div
                      className="h-full bg-[#2CC295] rounded-full"
                      style={{ width: `${(receiptData.ownershipSlots / receiptData.totalSlots) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1">
                      <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-tight">Slot Price</p>
                      <p className="text-xs font-mono text-white">{receiptData.slotPrice} ETH</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-tight">Yield APR</p>
                      <p className="text-xs font-mono text-[#2CC295]">{receiptData.yieldAPR}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-tight">Exit Liquidity</p>
                      <p className="text-xs font-mono text-white">{receiptData.exitLiquidity}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Asset Birth Log */}
              <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Asset Birth Log
                  </h3>
                  <Terminal className="text-zinc-600" size={14} />
                </div>
                
                <div className="space-y-3 font-mono">
                  <div className="flex justify-between border-b border-[#27272a] pb-2">
                    <span className="text-[9px] text-zinc-500 uppercase">Mint Time</span>
                    <span className="text-[10px] text-zinc-300">{receiptData.mintDate}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#27272a] pb-2">
                    <span className="text-[9px] text-zinc-500 uppercase">Block Height</span>
                    <span className="text-[10px] text-zinc-300">{receiptData.blockHeight}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase">Contract Hash</span>
                    <div className="flex items-center justify-between gap-2 bg-zinc-900/50 p-2 rounded border border-[#27272a]">
                      <span className="text-[10px] text-[#2CC295] truncate">{receiptData.contractHash}</span>
                      <button className="text-zinc-500 hover:text-white transition-colors">
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className="w-80 bg-zinc-900/30 flex flex-col border-l border-[#27272a] overflow-hidden">
          <style>{`
            .hidden-scrollbar::-webkit-scrollbar { display: none; }
          `}</style>

          {/* Asset Systems Header */}
          <div className="p-6 border-b border-[#27272a]">
            <h2 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
              <Shield className="text-[#2CC295]" size={18} />
              Asset Systems
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Main Navigation</p>
          </div>

          {/* Scrollable Content */}
          <div className="flex-grow overflow-y-auto hidden-scrollbar p-6 space-y-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* QR Code */}
            <div className="bg-zinc-900/50 border border-[#27272a] rounded-xl p-6 flex flex-col items-center space-y-4 text-center">
              <div className="w-32 h-32 bg-white p-2 rounded-lg shadow-[0_0_20px_rgba(44,194,149,0.15)]">
                <img
                  alt="QR Code"
                  className="w-full h-full"
                  src={receiptData.qrCode}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Physical Scan Auth</p>
                <p className="text-[9px] text-zinc-500 leading-tight">
                  Scan this code at the physical vault to verify possession and authenticity.
                </p>
              </div>
            </div>

            {/* Mint Receipt Button */}
            <div className="space-y-3">
              <button className="w-full bg-[#2CC295] hover:brightness-110 text-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#2CC295]/10">
                <CheckCircle size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Mint Receipt NFT</span>
              </button>
              <div className="flex items-start gap-2.5 px-2">
                <Info className="text-[#2CC295] mt-0.5 flex-shrink-0" size={14} />
                <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                  The Mint Receipt NFT serves as your official blockchain invoice and provides legal proof of fractional rights.
                </p>
              </div>
            </div>

            <div className="h-px bg-[#27272a]"></div>

            {/* Custodian Entity */}
            <div className="space-y-4">
              <h3 className="text-[9px] uppercase tracking-widest font-black text-zinc-600 px-1">Custodian Entity</h3>
              <div className="bg-zinc-900/50 border border-[#27272a] p-4 rounded-xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      alt="Custodian"
                      className="w-12 h-12 rounded-lg object-cover grayscale"
                      src={receiptData.custodian.avatar}
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#2CC295] rounded-full border-2 border-[#0f0f11] flex items-center justify-center">
                      <CheckCircle size={10} className="text-black" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white uppercase tracking-tight">
                      {receiptData.custodian.name}
                    </h4>
                    <p className="text-[9px] text-[#2CC295] uppercase font-bold tracking-widest">Verified Vault</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="bg-black/40 p-2.5 rounded border border-[#27272a] flex items-center justify-between group">
                    <span className="font-mono text-[9px] text-zinc-400 truncate">
                      {receiptData.custodian.address}
                    </span>
                    <button className="text-zinc-600 hover:text-[#2CC295] transition-colors">
                      <Copy size={12} />
                    </button>
                  </div>
                  <div className="flex justify-between px-1">
                    <span className="text-[9px] text-zinc-500 uppercase">Trust Score</span>
                    <span className="text-[9px] text-[#2CC295] font-bold">{receiptData.custodian.trustScore}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-[#27272a] p-5 bg-zinc-900/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Network Load</span>
              <span className="text-[10px] font-mono text-[#2CC295] font-bold">Low (12 ms)</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 bg-zinc-900/80 rounded border border-[#27272a]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.6)] animate-pulse"></div>
              <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                Ownership Matrix: Synced
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}