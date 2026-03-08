import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock3,
  DollarSign,
  History,
  Package,
  Settings2,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

interface SellerAsset {
  id: string;
  name: string;
  category: string;
  image: string;
  totalAmount: string;
  availableAmount: string;
  minPrice: string;
  status: string;
  mintedDate: string;
}

interface SellerAssetManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: SellerAsset | null;
}

type SellerTab = 'overview' | 'active' | 'history' | 'manage';

export function SellerAssetManagementModal({
  isOpen,
  onClose,
  asset,
}: SellerAssetManagementModalProps) {
  const [activeTab, setActiveTab] = useState<SellerTab>('overview');

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

  const soldUnits = useMemo(() => {
    if (!asset) return 0;
    const total = Number.parseInt(asset.totalAmount, 10) || 0;
    const available = Number.parseInt(asset.availableAmount, 10) || 0;
    return Math.max(0, total - available);
  }, [asset]);

  if (!isOpen || !asset || typeof document === 'undefined') return null;

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
          className="studio-modal-theme studio-glass-modal relative w-full max-w-[860px] h-[calc(100dvh-3rem)] rounded-[2rem] border border-ui-border-subtle bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            .hidden-scrollbar::-webkit-scrollbar { display: none; }
          `}</style>

          <div className="studio-glass-header shrink-0 p-5 md:p-6 pb-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-white tracking-tight truncate">Manage Asset</h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                  Seller Dashboard
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="studio-glass-chip h-7 px-3 inline-flex items-center bg-[rgba(255,255,255,0.04)] rounded-full border border-[rgba(255,255,255,0.08)] text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                  Token ID #{asset.id.slice(-4)}
                </span>
                <span
                  className={`h-7 px-3 inline-flex items-center rounded-full border text-[9px] font-bold uppercase tracking-widest ${
                    asset.status.toLowerCase() === 'active'
                      ? 'bg-[#2CC295]/15 border-[#2CC295]/30 text-[#2CC295]'
                      : 'studio-glass-chip bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-zinc-400'
                  }`}
                >
                  {asset.status}
                </span>
                <StudioModalCloseButton onClick={onClose} className="studio-glass-secondary" />
              </div>
            </div>
          </div>

          <section className="min-w-0 min-h-0 flex-1 overflow-y-auto lg:overflow-hidden hidden-scrollbar relative">
            <div className="h-full p-5 md:p-6 pt-4 relative z-10">
              <div className="w-full h-full max-w-[860px] mx-auto flex flex-col lg:flex-row justify-center items-start gap-6 px-0 md:px-2">
                <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-4 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                  <div className="studio-glass-surface relative w-full aspect-square max-w-full bg-[rgba(24,24,27,0.5)] rounded-[24px] overflow-hidden">
                    <img
                      src={asset.image}
                      alt={asset.name}
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="studio-glass-chip absolute left-[17px] top-[17px] flex items-center gap-1 px-2 py-1 bg-black/60 border border-white/10 backdrop-blur-[6px] rounded-[6px]">
                      <Shield size={10} className="text-[#2CC295]" />
                      <span className="text-[9px] leading-[14px] font-bold uppercase text-[#2CC295]">Verified</span>
                    </div>
                    <div className="studio-glass-chip absolute right-[17px] top-[13px] px-2 py-[2.5px] bg-black/60 border border-white/10 backdrop-blur-[6px] rounded-[6px]">
                      <span className="text-[9px] leading-[14px] font-bold uppercase text-zinc-400">
                        {asset.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <span className="studio-glass-chip w-8 h-8 rounded-full bg-[#27272A] border-2 border-[#141417] text-[10px] font-bold text-zinc-300 inline-flex items-center justify-center">
                        1
                      </span>
                      <span className="studio-glass-chip w-8 h-8 rounded-full bg-[#3F3F46] border-2 border-[#141417] text-[10px] font-bold text-zinc-300 inline-flex items-center justify-center">
                        2
                      </span>
                      <span className="studio-glass-chip w-8 h-8 rounded-full bg-[#52525B] border-2 border-[#141417] text-[10px] font-bold text-zinc-300 inline-flex items-center justify-center">
                        3
                      </span>
                      <span className="w-8 h-8 rounded-full bg-[#2CC295] border-2 border-[#141417] text-[10px] font-bold text-black inline-flex items-center justify-center">
                        {soldUnits}
                      </span>
                    </div>
                    <span className="text-[10px] leading-[15px] font-medium text-[#71717A]">
                      Minted {asset.mintedDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <StatTile label="Total Minted" value={asset.totalAmount} />
                    <StatTile label="Available" value={asset.availableAmount} valueClassName="text-[#2CC295]" />
                    <StatTile label="Sold Units" value={`${soldUnits}`} />
                    <StatTile label="Min Price" value={asset.minPrice} />
                  </div>
                </div>

                <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-6 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                  <div className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-3">
                    <div className="grid grid-cols-4 gap-2">
                      <TabButton
                        label="Overview"
                        icon={<BarChart3 size={12} />}
                        isActive={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                      />
                      <TabButton
                        label="Active"
                        icon={<Clock3 size={12} />}
                        isActive={activeTab === 'active'}
                        onClick={() => setActiveTab('active')}
                      />
                      <TabButton
                        label="History"
                        icon={<History size={12} />}
                        isActive={activeTab === 'history'}
                        onClick={() => setActiveTab('history')}
                      />
                      <TabButton
                        label="Manage"
                        icon={<Settings2 size={12} />}
                        isActive={activeTab === 'manage'}
                        onClick={() => setActiveTab('manage')}
                      />
                    </div>
                  </div>

                  {activeTab === 'overview' && <OverviewTab asset={asset} soldUnits={soldUnits} />}
                  {activeTab === 'active' && <ActiveTab />}
                  {activeTab === 'history' && <HistoryTab />}
                  {activeTab === 'manage' && <ManageTab asset={asset} />}
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

function TabButton({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-10 rounded-full border text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${
        isActive
          ? 'bg-[#2CC295]/10 border-[#2CC295]/30 text-[#2CC295]'
          : 'studio-glass-chip bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function StatTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="studio-glass-subsurface bg-[rgba(24,24,27,0.4)] rounded-[16px] p-3">
      <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mb-1 leading-tight">{label}</p>
      <p className={`text-sm font-bold text-white leading-tight ${valueClassName ?? ''}`}>{value}</p>
    </div>
  );
}

function OverviewTab({
  asset,
  soldUnits,
}: {
  asset: SellerAsset;
  soldUnits: number;
}) {
  return (
    <div className="space-y-6">
      <div className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Asset Information</h3>
          <Shield size={14} className="text-[#2CC295]" />
        </div>
        <div className="space-y-3">
          <InfoRow label="Name" value={asset.name} />
          <InfoRow label="Category" value={asset.category} />
          <InfoRow label="Minted Date" value={asset.mintedDate} />
          <InfoRow label="Sold Units" value={`${soldUnits}/${asset.totalAmount}`} />
        </div>
      </div>

      <div className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6">
        <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A] mb-4">Live Snapshot</h3>
        <div className="grid grid-cols-2 gap-4">
          <MiniStat icon={<DollarSign size={14} className="text-[#2CC295]" />} label="Revenue" value="47.5 ETH" />
          <MiniStat icon={<Package size={14} className="text-blue-400" />} label="Orders" value="55" />
          <MiniStat icon={<Activity size={14} className="text-purple-400" />} label="Active" value="3" />
          <MiniStat icon={<TrendingUp size={14} className="text-amber-400" />} label="Growth" value="+12.4%" />
        </div>
      </div>

      <div className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 h-40 flex items-center justify-center">
        <div className="text-center">
          <TrendingUp size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-xs text-zinc-500">Sales chart coming soon</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MiniStat icon={<DollarSign size={14} className="text-[#2CC295]" />} label="Avg Price" value="2.64 ETH" />
        <MiniStat icon={<Activity size={14} className="text-blue-400" />} label="Conversion" value="68%" />
      </div>
    </div>
  );
}

function ActiveTab() {
  const orders = [
    { id: 'ORD-1245', buyer: '0x742d...9c4F', amount: '2', total: '5.0 ETH', status: 'Pending Payment' },
    { id: 'ORD-1244', buyer: '0x8f3a...2b1D', amount: '1', total: '2.5 ETH', status: 'Paid - Awaiting Release' },
    { id: 'ORD-1243', buyer: '0x1c7e...5a9B', amount: '3', total: '7.5 ETH', status: 'Pending Payment' },
  ];

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white">{order.id}</p>
              <p className="text-[10px] text-zinc-500 mt-1">Buyer: {order.buyer}</p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                order.status.includes('Paid')
                  ? 'bg-green-500/20 text-green-300 border-green-500/30'
                  : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
              }`}
            >
              {order.status}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">
              Amount: <span className="text-white font-bold">{order.amount}</span>
            </span>
            <span className="text-[#2CC295] font-bold">{order.total}</span>
          </div>
          <button className="w-full h-[45px] rounded-full bg-[#2CC295] text-black text-sm font-bold tracking-tight hover:brightness-110 transition-all">
            Release Asset
          </button>
        </div>
      ))}
    </div>
  );
}

function HistoryTab() {
  const sales = [
    { id: 'ORD-1240', buyer: '0x9a2b...3c4D', amount: '1', total: '2.5 ETH', date: '2024-02-01' },
    { id: 'ORD-1238', buyer: '0x5e6f...7g8H', amount: '2', total: '5.0 ETH', date: '2024-01-28' },
    { id: 'ORD-1235', buyer: '0x1i2j...3k4L', amount: '1', total: '2.5 ETH', date: '2024-01-25' },
  ];

  return (
    <div className="space-y-4">
      {sales.map((sale) => (
        <div key={sale.id} className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-white">{sale.id}</p>
              <p className="text-[10px] text-zinc-500 mt-1">Buyer: {sale.buyer}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 rounded-full border border-green-500/30">
              <CheckCircle2 size={10} className="text-green-400" />
              <span className="text-[9px] font-bold text-green-300 uppercase tracking-widest">Finalized</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">
              Amount: <span className="text-white font-bold">{sale.amount}</span>
            </span>
            <span className="text-[#2CC295] font-bold">{sale.total}</span>
          </div>
          <p className="text-[10px] text-zinc-600">{sale.date}</p>
        </div>
      ))}
    </div>
  );
}

function ManageTab({ asset }: { asset: SellerAsset }) {
  const [minPrice, setMinPrice] = useState(asset.minPrice);
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="space-y-6">
      <div className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Listing Settings</h3>
        <div>
          <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Min Price per Unit</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="studio-glass-input flex-1 h-[45px] px-4 bg-zinc-950 border border-[#27272a] rounded-full text-white text-sm focus:outline-none focus:border-[#2CC295]"
              placeholder="2.5 ETH"
            />
            <button className="h-[45px] px-6 rounded-full bg-[#2CC295] text-black text-sm font-bold tracking-tight hover:brightness-110 transition-all">
              Update
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`w-full h-[45px] rounded-full border text-sm font-bold transition-all ${
            isPaused
              ? 'bg-green-500/20 text-green-300 border-green-500/30'
              : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
          }`}
        >
          {isPaused ? 'Resume Listing' : 'Pause Listing'}
        </button>
      </div>

      <div className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400" />
          <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-red-400">Danger Zone</h3>
        </div>
        <p className="text-xs text-zinc-500">Permanently remove this listing from marketplace.</p>
        <button className="w-full h-[45px] rounded-full bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-bold tracking-tight hover:bg-red-500/30 transition-all">
          Delist Asset
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs font-bold text-white text-right">{value}</span>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="studio-glass-subsurface bg-[rgba(255,255,255,0.02)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">{label}</p>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
