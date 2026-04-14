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
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { StudioStatusBadge } from '@/app/components/ui/studio-status-badge';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import { useUserOrders } from '@/hooks/useUserOrders';
import type { OrderUiRecord } from '@/types/order';
import { formatAddress } from '@/utils/format';
import { formatOrderGrossPrice, formatOrderQuantity } from '@/utils/orderDisplay';
import { getOrderLifecycleLabel, getOrderLifecyclePhase } from '@/utils/orderLifecycle';
import { extractNumericValue, preventInvalidNumberKeyDown } from '@/utils/numericInput';
import { isOrderCancelled, isOrderCompleted } from '@/utils/orderSemantics';
import { sortOrdersNewestFirst } from '@/utils/orderSorting';
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

const SECTION_SHELL_CLASS =
  'studio-glass-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)] shadow-[0_24px_60px_-42px_rgba(0,0,0,0.32)]';
const INSET_SHELL_CLASS =
  'studio-glass-surface rounded-[20px] border border-ui-border-subtle bg-[var(--t-surface-2)]';
const META_PILL_CLASS =
  'inline-flex items-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-10)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-secondary';

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

function coerceText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
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
    <div className={`${SECTION_SHELL_CLASS} p-6 text-center`}>
      <Package size={28} className="mx-auto mb-3 text-ui-muted" />
      <p className="text-sm font-semibold text-ui-primary">{title}</p>
      <p className="mt-2 text-xs leading-5 text-ui-secondary">{description}</p>
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
    return sortOrdersNewestFirst(
      sellerOrders.filter((order) => matchOrderToAsset(order, asset)),
    );
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
    const finalizedOrders = assetOrders.filter((order) => isOrderCompleted(order));
    const cancelledOrders = assetOrders.filter((order) => isOrderCancelled(order));
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

  const assetReferenceLabel = asset.tokenId?.trim()
    ? `Token ID #${asset.tokenId.trim()}`
    : `Asset Ref #${asset.id.slice(-4)}`;
  const assetStatusLabel = coerceText(asset.status, 'Unknown');

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="studio-portal-backdrop fixed inset-0 z-[75] flex items-center justify-center bg-black/78 p-6 backdrop-blur-[16px]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="studio-modal-theme studio-glass-modal relative z-[1] flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-ui-border-subtle bg-[var(--t-card-bg)] shadow-[0_24px_60px_-32px_rgba(0,0,0,0.8)] backdrop-blur-[20px] md:h-[95vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            .hidden-scrollbar::-webkit-scrollbar { display: none; }
          `}</style>

          <div className="studio-glass-header relative z-10 shrink-0 border-b border-ui-border-subtle bg-[var(--t-card-bg)] p-5 pb-4 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight text-ui-primary">Manage Asset</h1>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-ui-muted">
                  Seller dashboard for {asset.name}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <span className={META_PILL_CLASS}>{getCategoryDisplayLabel(asset.category)}</span>
                <span className={META_PILL_CLASS}>{assetReferenceLabel}</span>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                    assetStatusLabel.toLowerCase() === 'active'
                      ? 'border-[#2CC295]/20 bg-[#2CC295]/10 text-[#7CF0CB]'
                      : 'border-ui-border-subtle bg-[var(--t-surface-10)] text-ui-secondary'
                  }`}
                >
                  {assetStatusLabel}
                </span>
                <StudioModalCloseButton onClick={onClose} className="studio-glass-secondary rounded-full" />
              </div>
            </div>
          </div>

          <section className="relative min-h-0 min-w-0 flex-1 overflow-y-auto custom-scrollbar hidden-scrollbar md:overflow-hidden">
            <div className="grid min-h-full grid-cols-1 gap-0 md:h-full md:min-h-0 md:grid-cols-[minmax(320px,0.88fr)_minmax(0,1.12fr)]">
              <div className="studio-glass-header border-r border-ui-border-subtle bg-[var(--t-surface-2)] md:h-full md:min-h-0 md:overflow-hidden">
                <div className="custom-scrollbar flex h-full min-h-0 flex-col gap-5 overflow-y-auto p-8 overscroll-contain">
                  <div className={`${SECTION_SHELL_CLASS} relative flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-[2rem] p-4 backdrop-blur-xl`}>
                    <img
                      src={asset.image}
                      alt={asset.name}
                      className="h-full w-full rounded-2xl object-cover"
                    />
                  </div>

                  <div className={`${SECTION_SHELL_CLASS} p-5`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          <span className="studio-glass-chip inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--t-surface-1)] bg-[var(--t-surface-3)] text-[10px] font-semibold text-ui-secondary">
                            A
                          </span>
                          <span className="studio-glass-chip inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--t-surface-1)] bg-[var(--t-surface-4)] text-[10px] font-semibold text-ui-secondary">
                            O
                          </span>
                          <span className="studio-glass-chip inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--t-surface-1)] bg-[var(--t-surface-5)] text-[10px] font-semibold text-ui-secondary">
                            H
                          </span>
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--t-surface-1)] bg-[#2CC295] text-[10px] font-semibold text-black">
                            {assetOrders.length}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ui-muted">Asset Runtime</p>
                          <p className="mt-1 text-sm font-semibold text-ui-primary">Minted {asset.mintedDate}</p>
                        </div>
                      </div>
                      <StudioStatusBadge variant="muted">{assetOrders.length} Orders</StudioStatusBadge>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                      <StatTile label="Total Minted" value={String(asset.totalAmount)} />
                      <StatTile label="Available" value={String(asset.availableAmount)} />
                      <StatTile label="Sold Units" value={`${soldUnits}`} />
                      <StatTile label="Min Price" value={asset.minPrice} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="custom-scrollbar flex min-h-0 flex-col gap-5 p-8 overscroll-contain md:h-full md:overflow-y-auto">
                <div>
                  <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] p-1.5">
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

                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
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
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold tracking-[-0.01em] transition-colors ${
        isActive
          ? 'bg-[var(--t-card-bg)] text-ui-primary shadow-[0_18px_35px_-28px_rgba(0,0,0,0.3)]'
          : 'text-ui-secondary hover:bg-[var(--t-surface-10)] hover:text-ui-primary'
      }`}
    >
      {icon}
      <span>{label}</span>
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
    <div className={`${INSET_SHELL_CLASS} flex min-h-[88px] flex-col justify-between p-3.5`}>
      <p className="text-[9px] font-medium uppercase leading-tight tracking-[0.16em] text-ui-muted">{label}</p>
      <p className={`text-sm font-semibold leading-tight text-ui-primary ${valueClassName ?? ''}`}>{value}</p>
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
      <div className={`${SECTION_SHELL_CLASS} p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Asset Information</h3>
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

      <div className={`${SECTION_SHELL_CLASS} p-6`}>
        <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Live Snapshot</h3>
        <div className="grid grid-cols-2 gap-4">
          <MiniStat icon={<DollarSign size={14} className="text-[#2CC295]" />} label="Revenue" value={metrics.revenueLabel} />
          <MiniStat icon={<Package size={14} className="text-blue-400" />} label="Finalized" value={`${metrics.finalizedOrders}`} />
          <MiniStat icon={<Activity size={14} className="text-purple-400" />} label="Active" value={`${metrics.activeOrders}`} />
          <MiniStat icon={<TrendingUp size={14} className="text-amber-400" />} label="Sell Through" value={metrics.sellThrough} />
        </div>
      </div>

      <div className={`${SECTION_SHELL_CLASS} p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Recent Order Activity</h3>
          <StudioStatusBadge variant="muted">{metrics.totalOrders} Orders</StudioStatusBadge>
        </div>
        {isLoading ? (
          <p className="text-xs text-ui-secondary">Loading canonical seller orders...</p>
        ) : metrics.latestOrders.length === 0 ? (
          <p className="text-xs text-ui-secondary">No seller-side orders linked to this asset yet.</p>
        ) : (
          <div className="space-y-4">
            {metrics.latestOrders.map((order, index) => (
              <div key={order.orderId.toString()} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-ui-primary">#{order.orderId.toString()}</p>
                  <StudioStatusBadge variant={getPhaseBadgeVariant(order)}>
                    {getOrderLifecycleLabel(order)}
                  </StudioStatusBadge>
                </div>
                <p className="text-[11px] text-ui-secondary">
                  Buyer {formatAddress(order.buyer)} - {formatOrderQuantity(order.amount, order.unitLabel, order.unitName)}
                </p>
                <p className="text-[11px] text-ui-muted">{formatOrderDate(order)}</p>
                {index < metrics.latestOrders.length - 1 ? <div className="border-b border-ui-border-subtle pt-2" /> : null}
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
        <div className={`${SECTION_SHELL_CLASS} p-6`}>
          <p className="text-xs leading-5 text-ui-secondary">
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
        <div key={order.orderId.toString()} className={`${SECTION_SHELL_CLASS} p-5 space-y-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-ui-primary">#{order.orderId.toString()}</p>
              <p className="mt-1 text-[10px] text-ui-secondary">Buyer: {formatAddress(order.buyer)}</p>
            </div>
            <StudioStatusBadge variant={getPhaseBadgeVariant(order)} size="sm">
              {getOrderLifecycleLabel(order)}
            </StudioStatusBadge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <p className="font-semibold uppercase tracking-widest text-ui-muted">Quantity</p>
              <p className="mt-1 font-semibold text-ui-primary">{formatOrderQuantity(order.amount, order.unitLabel, order.unitName)}</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-widest text-ui-muted">Gross Value</p>
              <p className="card-price-value mt-1 font-semibold">
                {formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals)}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">Lifecycle</p>
            <p className="text-xs text-ui-secondary">
              {getOrderLifecycleLabel(order)} - submitted {formatOrderDate(order)}
            </p>
            {order.shippingMethodLabel ? (
              <p className="text-[10px] text-ui-muted">Shipping: {order.shippingMethodLabel}</p>
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
        <div key={order.orderId.toString()} className={`${SECTION_SHELL_CLASS} p-5 space-y-3`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-ui-primary">#{order.orderId.toString()}</p>
              <p className="mt-1 text-[10px] text-ui-secondary">Buyer: {formatAddress(order.buyer)}</p>
            </div>
            <StudioStatusBadge variant={getPhaseBadgeVariant(order)} size="sm">
              {getOrderLifecycleLabel(order)}
            </StudioStatusBadge>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-ui-secondary">
              Amount: <span className="font-semibold text-ui-primary">{formatOrderQuantity(order.amount, order.unitLabel, order.unitName)}</span>
            </span>
            <span className="card-price-value font-semibold">
              {formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals)}
            </span>
          </div>
          <p className="text-[10px] text-ui-muted">{formatOrderDate(order)}</p>
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
      <div className={`${SECTION_SHELL_CLASS} space-y-4 p-6`}>
        <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Listing Settings</h3>
        <div>
          <label className="mb-3 block text-[9px] font-semibold uppercase tracking-widest text-ui-muted">Min Price per Unit</label>
          <div className="flex gap-3">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.0001"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              onKeyDown={preventInvalidNumberKeyDown}
              className="studio-glass-input h-[45px] flex-1 rounded-full border border-ui-border-subtle bg-ui-input px-4 text-sm text-ui-primary focus:border-[#2CC295] focus:outline-none"
              placeholder="2.5"
            />
            <StudioActionButton type="button" variant="primary" size="lg" className="h-[45px] px-6 text-sm tracking-tight">
              Update
            </StudioActionButton>
          </div>
        </div>
        <StudioActionButton
          type="button"
          onClick={() => setIsPaused(!isPaused)}
          variant="secondary"
          className={`h-[45px] w-full text-sm ${
            isPaused
              ? 'border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/15'
              : 'border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/15'
          }`}
        >
          {isPaused ? 'Resume Listing' : 'Pause Listing'}
        </StudioActionButton>
      </div>

      <div className={`${SECTION_SHELL_CLASS} space-y-3 p-6`}>
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400" />
          <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-red-400">Danger Zone</h3>
        </div>
        <p className="text-xs text-ui-secondary">Permanently remove this listing from marketplace.</p>
        <StudioActionButton type="button" variant="danger" size="lg" className="h-[45px] w-full text-sm tracking-tight">
          Delist Asset
        </StudioActionButton>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-ui-secondary">{label}</span>
      <span className="text-right text-xs font-semibold text-ui-primary">{value}</span>
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
    <div className={`${INSET_SHELL_CLASS} rounded-[24px] p-4`}>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p className="text-[9px] font-semibold uppercase tracking-widest text-ui-muted">{label}</p>
      </div>
      <p className="text-xl font-semibold text-ui-primary">{value}</p>
    </div>
  );
}
