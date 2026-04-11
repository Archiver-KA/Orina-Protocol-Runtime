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
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { formatUnits } from 'viem';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { StudioStatusBadge } from '@/app/components/ui/studio-status-badge';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import { useUserOrders } from '@/hooks/useUserOrders';
import { OrderState } from '@/config/contracts';
import type { OrderUiRecord } from '@/types/order';
import { formatAddress } from '@/utils/format';
import { formatOrderGrossPrice, formatOrderQuantity } from '@/utils/orderDisplay';
import { getOrderLifecycleLabel, getOrderLifecyclePhase } from '@/utils/orderLifecycle';
import { extractNumericValue, preventInvalidNumberKeyDown } from '@/utils/numericInput';
import { getCategoryDisplayLabel } from '@/utils/taxonomy';

interface SellerAsset {
  id: string;
  name: string;
  category: string;
  image: string;
  totalAmount: string | number;
  availableAmount: string | number;
  minPrice: string;
  status: string;
  mintedDate: string;
  tokenId?: string;
}

interface SellerAssetManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: SellerAsset | null;
}

type SellerTab = 'overview' | 'active' | 'history' | 'manage';

function normalize(value?: string | number | bigint | null) {
  return String(value ?? '').trim().toLowerCase();
}

function parseAmount(value: string | number, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function trimNumericString(value: string) {
  return value.replace(/\.?0+$/, '');
}

function formatAggregateOrderValue(orders: OrderUiRecord[]) {
  if (orders.length === 0) return '0';

  const totals = new Map<string, { symbol: string; decimals: number; value: bigint }>();
  for (const order of orders) {
    const decimals = Number.isFinite(order.paymentTokenDecimals) ? order.paymentTokenDecimals ?? 18 : 18;
    const symbol = order.paymentTokenSymbol?.trim() || 'ERC20';
    const key = `${symbol}:${decimals}`;
    const current = totals.get(key);
    totals.set(key, {
      symbol,
      decimals,
      value: (current?.value ?? 0n) + order.grossPrice,
    });
  }

  return Array.from(totals.values())
    .map((entry) => `${trimNumericString(formatUnits(entry.value, entry.decimals))} ${entry.symbol}`)
    .join(' + ');
}

function formatOrderDate(order: OrderUiRecord) {
  const timestampMs =
    (typeof order.updatedAt === 'number' && order.updatedAt > 0 ? order.updatedAt : 0)
    || (order.proposedAt > 0n ? Number(order.proposedAt) * 1000 : 0)
    || (typeof order.createdAt === 'number' ? order.createdAt : 0);

  if (!timestampMs || !Number.isFinite(timestampMs)) return 'Unknown time';
  return new Date(timestampMs).toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPhaseBadgeVariant(order: OrderUiRecord): 'success' | 'warning' | 'danger' | 'muted' {
  const phase = getOrderLifecyclePhase(order);
  switch (phase) {
    case 'finalized':
      return 'success';
    case 'awaiting_auto_finalize':
    case 'seller_confirm_expired':
    case 'buyer_accept_expired':
      return 'warning';
    case 'cancelled':
      return 'danger';
    default:
      return 'muted';
  }
}

function matchOrderToAsset(order: OrderUiRecord, asset: SellerAsset) {
  const orderAssetId = normalize(order.assetId.toString());
  const assetId = normalize(asset.id);
  const assetTokenId = normalize(asset.tokenId);
  if (assetId && orderAssetId === assetId) return true;
  if (assetTokenId && orderAssetId === assetTokenId) return true;

  const orderName = normalize(order.assetName);
  const assetName = normalize(asset.name);
  if (assetName && orderName === assetName) return true;

  const orderImage = normalize(order.assetImage);
  const assetImage = normalize(asset.image);
  return Boolean(orderImage && assetImage && orderImage === assetImage && orderName === assetName);
}

function EmptyOrderPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 text-center">
      <Package size={28} className="text-zinc-700 mx-auto mb-3" />
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="text-xs text-zinc-500 mt-2 leading-5">{description}</p>
    </div>
  );
}

export function SellerAssetManagementModal({
  isOpen,
  onClose,
  asset,
}: SellerAssetManagementModalProps) {
  const { address } = useEffectiveViewer();
  const { orders, isLoading } = useUserOrders(address);
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
    const total = parseAmount(asset.totalAmount, 0);
    const available = parseAmount(asset.availableAmount, 0);
    return Math.max(0, Math.trunc(total - available));
  }, [asset]);

  const sellerOrders = useMemo(() => {
    if (!address) return [] as OrderUiRecord[];
    const normalizedAddress = address.toLowerCase();
    return orders.filter((order) => order.seller.toLowerCase() === normalizedAddress);
  }, [address, orders]);

  const assetOrders = useMemo(() => {
    if (!asset) return [] as OrderUiRecord[];
    return [...sellerOrders]
      .filter((order) => matchOrderToAsset(order, asset))
      .sort((left, right) => Number(right.proposedAt - left.proposedAt));
  }, [asset, sellerOrders]);

  const activeOrders = useMemo(
    () =>
      assetOrders.filter((order) => {
        const phase = getOrderLifecyclePhase(order);
        return phase !== 'finalized' && phase !== 'cancelled';
      }),
    [assetOrders],
  );

  const historyOrders = useMemo(
    () =>
      assetOrders.filter((order) => {
        const phase = getOrderLifecyclePhase(order);
        return phase === 'finalized' || phase === 'cancelled';
      }),
    [assetOrders],
  );

  const metrics = useMemo(() => {
    const finalizedOrders = assetOrders.filter(
      (order) => order.finalized || order.state === OrderState.FINALIZED,
    );
    const cancelledOrders = assetOrders.filter((order) => order.state === OrderState.CANCELLED);
    const totalSupply = Math.max(1, parseAmount(asset?.totalAmount ?? 0, 1));
    const sellThrough = `${Math.round((soldUnits / totalSupply) * 100)}%`;

    return {
      totalOrders: assetOrders.length,
      finalizedOrders: finalizedOrders.length,
      cancelledOrders: cancelledOrders.length,
      activeOrders: activeOrders.length,
      revenueLabel: formatAggregateOrderValue(finalizedOrders),
      averageOrderValueLabel:
        finalizedOrders.length > 0
          ? formatAggregateOrderValue([
              {
                ...finalizedOrders[0],
                grossPrice:
                  finalizedOrders.reduce((sum, order) => sum + order.grossPrice, 0n)
                  / BigInt(finalizedOrders.length),
              },
            ])
          : '0',
      sellThrough,
      latestOrders: assetOrders.slice(0, 3),
    };
  }, [activeOrders.length, asset?.totalAmount, assetOrders, soldUnits]);

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
                        {getCategoryDisplayLabel(asset.category)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <span className="studio-glass-chip w-8 h-8 rounded-full bg-[#27272A] border-2 border-[#141417] text-[10px] font-bold text-zinc-300 inline-flex items-center justify-center">
                        A
                      </span>
                      <span className="studio-glass-chip w-8 h-8 rounded-full bg-[#3F3F46] border-2 border-[#141417] text-[10px] font-bold text-zinc-300 inline-flex items-center justify-center">
                        O
                      </span>
                      <span className="studio-glass-chip w-8 h-8 rounded-full bg-[#52525B] border-2 border-[#141417] text-[10px] font-bold text-zinc-300 inline-flex items-center justify-center">
                        H
                      </span>
                      <span className="w-8 h-8 rounded-full bg-[#2CC295] border-2 border-[#141417] text-[10px] font-bold text-black inline-flex items-center justify-center">
                        {assetOrders.length}
                      </span>
                    </div>
                    <span className="text-[10px] leading-[15px] font-medium text-[#71717A]">
                      Minted {asset.mintedDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <StatTile label="Total Minted" value={String(asset.totalAmount)} />
                    <StatTile label="Available" value={String(asset.availableAmount)} valueClassName="text-[#2CC295]" />
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

                  {activeTab === 'overview' && (
                    <OverviewTab
                      asset={asset}
                      soldUnits={soldUnits}
                      metrics={metrics}
                      orders={assetOrders}
                      isLoading={isLoading}
                    />
                  )}
                  {activeTab === 'active' && <ActiveTab orders={activeOrders} isLoading={isLoading} />}
                  {activeTab === 'history' && <HistoryTab orders={historyOrders} isLoading={isLoading} />}
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
  metrics,
  orders,
  isLoading,
}: {
  asset: SellerAsset;
  soldUnits: number;
  metrics: {
    totalOrders: number;
    finalizedOrders: number;
    cancelledOrders: number;
    activeOrders: number;
    revenueLabel: string;
    averageOrderValueLabel: string;
    sellThrough: string;
    latestOrders: OrderUiRecord[];
  };
  orders: OrderUiRecord[];
  isLoading: boolean;
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
          <InfoRow label="Category" value={getCategoryDisplayLabel(asset.category)} />
          <InfoRow label="Minted Date" value={asset.mintedDate} />
          <InfoRow label="Sold Units" value={`${soldUnits}/${asset.totalAmount}`} />
          <InfoRow label="Seller Orders" value={`${metrics.totalOrders}`} />
        </div>
      </div>

      <div className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6">
        <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A] mb-4">Live Snapshot</h3>
        <div className="grid grid-cols-2 gap-4">
          <MiniStat icon={<DollarSign size={14} className="text-[#2CC295]" />} label="Revenue" value={metrics.revenueLabel} />
          <MiniStat icon={<Package size={14} className="text-blue-400" />} label="Finalized" value={`${metrics.finalizedOrders}`} />
          <MiniStat icon={<Activity size={14} className="text-purple-400" />} label="Active" value={`${metrics.activeOrders}`} />
          <MiniStat icon={<TrendingUp size={14} className="text-amber-400" />} label="Sell Through" value={metrics.sellThrough} />
        </div>
      </div>

      <div className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Recent Order Activity</h3>
          <StudioStatusBadge variant="muted">{metrics.totalOrders} Orders</StudioStatusBadge>
        </div>
        {isLoading ? (
          <p className="text-xs text-zinc-500">Loading canonical seller orders…</p>
        ) : metrics.latestOrders.length === 0 ? (
          <p className="text-xs text-zinc-500">No seller-side orders linked to this asset yet.</p>
        ) : (
          <div className="space-y-4">
            {metrics.latestOrders.map((order, index) => (
              <div key={order.orderId.toString()} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-white">#{order.orderId.toString()}</p>
                  <StudioStatusBadge variant={getPhaseBadgeVariant(order)}>
                    {getOrderLifecycleLabel(order)}
                  </StudioStatusBadge>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Buyer {formatAddress(order.buyer)} · {formatOrderQuantity(order.amount, order.unitLabel, order.unitName)}
                </p>
                <p className="text-[11px] text-zinc-500">{formatOrderDate(order)}</p>
                {index < metrics.latestOrders.length - 1 ? <div className="pt-2 border-b border-white/5" /> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MiniStat icon={<DollarSign size={14} className="text-[#2CC295]" />} label="Avg Order" value={metrics.averageOrderValueLabel} />
        <MiniStat
          icon={<CheckCircle2 size={14} className="text-blue-400" />}
          label="Cancelled"
          value={`${metrics.cancelledOrders}`}
        />
      </div>

      {!isLoading && orders.length === 0 ? (
        <div className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6">
          <p className="text-xs text-zinc-500 leading-5">
            This asset does not have any canonical seller orders yet. It can still appear in warehouse inventory and listing management while waiting for marketplace activity.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ActiveTab({
  orders,
  isLoading,
}: {
  orders: OrderUiRecord[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <EmptyOrderPanel title="Loading active orders" description="Reading canonical seller-side order state from the current runtime and chain overlay." />;
  }

  if (orders.length === 0) {
    return <EmptyOrderPanel title="No active orders" description="Active seller-side orders for this asset will appear here once buyers start the protocol flow." />;
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.orderId.toString()} className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white">#{order.orderId.toString()}</p>
              <p className="text-[10px] text-zinc-500 mt-1">Buyer: {formatAddress(order.buyer)}</p>
            </div>
            <StudioStatusBadge variant={getPhaseBadgeVariant(order)} size="sm">
              {getOrderLifecycleLabel(order)}
            </StudioStatusBadge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <p className="text-zinc-500 uppercase tracking-widest font-bold">Quantity</p>
              <p className="text-white font-bold mt-1">{formatOrderQuantity(order.amount, order.unitLabel, order.unitName)}</p>
            </div>
            <div>
              <p className="text-zinc-500 uppercase tracking-widest font-bold">Gross Value</p>
              <p className="text-[#2CC295] font-bold mt-1">
                {formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals)}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Lifecycle</p>
            <p className="text-xs text-zinc-300">
              {getOrderLifecycleLabel(order)} · submitted {formatOrderDate(order)}
            </p>
            {order.shippingMethodLabel ? (
              <p className="text-[10px] text-zinc-500">Shipping: {order.shippingMethodLabel}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({
  orders,
  isLoading,
}: {
  orders: OrderUiRecord[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <EmptyOrderPanel title="Loading order history" description="Canonical finalized and cancelled seller orders are being hydrated." />;
  }

  if (orders.length === 0) {
    return <EmptyOrderPanel title="No order history" description="Finalized or cancelled seller-side orders for this asset will appear here once the lifecycle is completed." />;
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.orderId.toString()} className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white">#{order.orderId.toString()}</p>
              <p className="text-[10px] text-zinc-500 mt-1">Buyer: {formatAddress(order.buyer)}</p>
            </div>
            <StudioStatusBadge variant={getPhaseBadgeVariant(order)} size="sm">
              {getOrderLifecycleLabel(order)}
            </StudioStatusBadge>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">
              Amount: <span className="text-white font-bold">{formatOrderQuantity(order.amount, order.unitLabel, order.unitName)}</span>
            </span>
            <span className="text-[#2CC295] font-bold">
              {formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600">{formatOrderDate(order)}</p>
        </div>
      ))}
    </div>
  );
}

function ManageTab({ asset }: { asset: SellerAsset }) {
  const [minPrice, setMinPrice] = useState(() => extractNumericValue(asset.minPrice));
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="space-y-6">
      <div className="studio-glass-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Listing Settings</h3>
        <div>
          <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Min Price per Unit</label>
          <div className="flex gap-3">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.0001"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              onKeyDown={preventInvalidNumberKeyDown}
              className="studio-glass-input flex-1 h-[45px] px-4 bg-zinc-950 border border-[#27272a] rounded-full text-white text-sm focus:outline-none focus:border-[#2CC295]"
              placeholder="2.5"
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
