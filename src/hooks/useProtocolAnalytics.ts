import { useEffect, useMemo, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { DISPUTE_MANAGER_ABI, MARKETPLACE_ABI } from '@/config/abis';
import { ACTIVE_CHAIN_ID, CONTRACTS, OrderState } from '@/config/contracts';
import type { OrderUiRecord } from '@/types/order';
import { getOrderLifecycleLabel, getOrderLifecyclePhase, reconcileOrderFromChain, type MarketplaceOrderSnapshot } from '@/utils/orderLifecycle';
import { fromProtocolOrderRow, type ProtocolOrderRow } from '@/utils/runtimeOrders';
import { isSupabaseRestEnabled, restSelect } from '@/utils/supabaseRest';

type ProtocolTimeRange = '24H' | '7D' | '30D';
type OrderPublicClient = NonNullable<ReturnType<typeof usePublicClient>>;
type DisputeSnapshot = readonly [boolean, number, bigint, bigint, boolean, bigint, bigint];

export interface ProtocolMetricCard {
  label: string;
  value: number;
  helper: string;
}

export interface ProtocolChartPoint {
  key: string;
  label: string;
  timestamp: number;
  primaryValue: number;
  secondaryValue: number;
  details: Array<{ label: string; value: string }>;
}

export interface ProtocolTokenBreakdown {
  symbol: string;
  decimals: number;
  orderCount: number;
  activeCount: number;
  finalizedCount: number;
  disputedCount: number;
  grossVolume: bigint;
}

export interface ProtocolTimelineEntry {
  id: string;
  orderId: string;
  assetName: string;
  title: string;
  detail: string;
  timestamp: number;
  status: 'completed' | 'pending' | 'future';
}

export interface ProtocolAnalyticsSnapshot {
  metrics: ProtocolMetricCard[];
  chartPoints: ProtocolChartPoint[];
  tokenBreakdown: ProtocolTokenBreakdown[];
  lifecycleBreakdown: Array<{ phase: string; label: string; count: number }>;
  recentEvents: ProtocolTimelineEntry[];
  upcomingActions: ProtocolTimelineEntry[];
  isLoading: boolean;
  orderCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function bigintToNumber(value?: bigint) {
  if (typeof value !== 'bigint') return 0;
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function toMs(value?: bigint, fallbackMs = 0) {
  const asNumber = bigintToNumber(value);
  return asNumber > 0 ? asNumber * 1000 : fallbackMs;
}

function normalizeMsToDayStart(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function formatDayLabel(timestamp: number, range: ProtocolTimeRange) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: range === '24H' ? '2-digit' : undefined,
  }).toUpperCase();
}

async function readCanonicalOrdersFromChain(
  publicClient: OrderPublicClient,
  baseOrders: OrderUiRecord[],
) {
  if (baseOrders.length === 0) return [] as OrderUiRecord[];

  const orderResults = await publicClient.multicall({
    allowFailure: true,
    contracts: baseOrders.map((order) => ({
      address: CONTRACTS.MARKETPLACE_ATP,
      chainId: ACTIVE_CHAIN_ID,
      abi: MARKETPLACE_ABI,
      functionName: 'orders',
      args: [order.orderId] as const,
    })),
  });

  const disputeResults = await publicClient.multicall({
    allowFailure: true,
    contracts: baseOrders.map((order) => ({
      address: CONTRACTS.DISPUTE_MANAGER,
      chainId: ACTIVE_CHAIN_ID,
      abi: DISPUTE_MANAGER_ABI,
      functionName: 'disputes',
      args: [order.orderId] as const,
    })),
  });

  return baseOrders.map((order, index) => {
    const orderResult = orderResults[index];
    const chainOrder =
      orderResult.status === 'success'
        ? reconcileOrderFromChain(order, orderResult.result as unknown as MarketplaceOrderSnapshot)
        : order;

    const disputeResult = disputeResults[index];
    if (disputeResult.status !== 'success') {
      return chainOrder;
    }

    const [active, verdict, openedAt, deadline, extended, buyerShareBps, sellerShareBps] =
      disputeResult.result as unknown as DisputeSnapshot;

    if (!active && openedAt === 0n && verdict === 0 && buyerShareBps === 0n && sellerShareBps === 0n) {
      return chainOrder;
    }

    return {
      ...chainOrder,
      disputeOpenedAt: openedAt > 0n ? openedAt : chainOrder.disputeOpenedAt,
      disputeDeadline: deadline > 0n ? deadline : chainOrder.disputeDeadline,
      disputeExtended: extended,
      disputeVerdict: Number(verdict),
      disputeBuyerShareBps: buyerShareBps > 0n ? buyerShareBps : chainOrder.disputeBuyerShareBps,
      disputeSellerShareBps: sellerShareBps > 0n ? sellerShareBps : chainOrder.disputeSellerShareBps,
      disputed: active || chainOrder.disputed,
    };
  });
}

function deriveTimelineEntries(order: OrderUiRecord): ProtocolTimelineEntry[] {
  const orderId = order.orderId.toString();
  const base = {
    orderId,
    assetName: order.assetName,
  };
  const entries: ProtocolTimelineEntry[] = [];
  const phase = getOrderLifecyclePhase(order);

  const proposedAt = toMs(order.proposedAt, order.createdAt ?? 0);
  if (proposedAt > 0) {
    entries.push({
      ...base,
      id: `${orderId}-proposed`,
      title: 'Order Created',
      detail: `Buyer submitted order #${orderId}.`,
      timestamp: proposedAt,
      status: 'completed',
    });
  }

  const sellerConfirmedAt = toMs(order.sellerConfirmedAt);
  if (sellerConfirmedAt > 0) {
    entries.push({
      ...base,
      id: `${orderId}-seller-confirmed`,
      title: 'Seller Confirmed',
      detail: `Seller confirmed order #${orderId}.`,
      timestamp: sellerConfirmedAt,
      status: 'completed',
    });
  }

  const paidAt = toMs(order.paidAt);
  if (paidAt > 0) {
    entries.push({
      ...base,
      id: `${orderId}-locked`,
      title: 'Escrow Locked',
      detail: `Escrow locked for order #${orderId}.`,
      timestamp: paidAt,
      status: 'completed',
    });
  }

  const disputeOpenedAt = toMs(order.disputeOpenedAt);
  if (disputeOpenedAt > 0) {
    entries.push({
      ...base,
      id: `${orderId}-dispute-opened`,
      title: 'Dispute Opened',
      detail: `Buyer opened a dispute for order #${orderId}.`,
      timestamp: disputeOpenedAt,
      status: 'completed',
    });
  }

  if (order.finalized || order.state === OrderState.FINALIZED) {
    entries.push({
      ...base,
      id: `${orderId}-finalized`,
      title: 'Order Finalized',
      detail: `Settlement finalized for order #${orderId}.`,
      timestamp: order.updatedAt ?? Date.now(),
      status: 'completed',
    });
  }

  if (order.state === OrderState.CANCELLED) {
    entries.push({
      ...base,
      id: `${orderId}-cancelled`,
      title: 'Order Cancelled',
      detail: `Order #${orderId} was cancelled.`,
      timestamp: order.updatedAt ?? Date.now(),
      status: 'completed',
    });
  }

  if (phase === 'waiting_seller_confirm') {
    entries.push({
      ...base,
      id: `${orderId}-seller-window`,
      title: 'Seller Action Pending',
      detail: `Seller must confirm, revise, or cancel order #${orderId}.`,
      timestamp: toMs(order.proposedAt) + (24 * 60 * 60 * 1000),
      status: 'pending',
    });
  }

  if (phase === 'waiting_buyer_accept') {
    entries.push({
      ...base,
      id: `${orderId}-buyer-window`,
      title: 'Buyer Re-Sign Pending',
      detail: `Buyer must re-sign or cancel order #${orderId}.`,
      timestamp: toMs(order.payDeadline),
      status: 'pending',
    });
  }

  if (phase === 'agreed_delivery') {
    entries.push({
      ...base,
      id: `${orderId}-delivery-window`,
      title: 'Agreed Delivery Ends',
      detail: `Agreed delivery ends for order #${orderId}.`,
      timestamp: toMs(order.autoReleaseAt),
      status: 'future',
    });
  }

  if (phase === 'awaiting_auto_finalize') {
    entries.push({
      ...base,
      id: `${orderId}-buyer-window-dispute`,
      title: 'Buyer Action Window',
      detail: `Buyer can confirm delivery or dispute order #${orderId}.`,
      timestamp: toMs(order.disputeDeadline ?? 0n),
      status: 'future',
    });
  }

  if (phase === 'auto_finalize_ready') {
    entries.push({
      ...base,
      id: `${orderId}-auto-finalize-ready`,
      title: 'Auto Finalize Ready',
      detail: `Order #${orderId} is waiting for protocol auto-finalization.`,
      timestamp: Date.now(),
      status: 'pending',
    });
  }

  return entries;
}

function buildChartPoints(orders: OrderUiRecord[], range: ProtocolTimeRange): ProtocolChartPoint[] {
  const pointCount = range === '24H' ? 24 : range === '7D' ? 7 : 30;
  const bucketSize = range === '24H' ? 60 * 60 * 1000 : DAY_MS;
  const now = Date.now();
  const firstBucketStart = range === '24H'
    ? now - ((pointCount - 1) * bucketSize)
    : normalizeMsToDayStart(now - ((pointCount - 1) * bucketSize));

  const points = Array.from({ length: pointCount }, (_, index) => {
    const bucketStart = firstBucketStart + (index * bucketSize);
    return {
      key: `${range}-${bucketStart}`,
      label: formatDayLabel(bucketStart, range),
      timestamp: bucketStart,
      primaryValue: 0,
      secondaryValue: 0,
      details: [
        { label: 'Created Orders', value: '0' },
        { label: 'Finalized Orders', value: '0' },
        { label: 'Disputes Opened', value: '0' },
      ],
    } satisfies ProtocolChartPoint;
  });

  for (const order of orders) {
    const createdMs = toMs(order.proposedAt, order.createdAt ?? 0);
    const finalizedMs = order.finalized || order.state === OrderState.FINALIZED ? (order.updatedAt ?? createdMs) : 0;
    const disputeMs = toMs(order.disputeOpenedAt);

    const createdIndex = Math.floor((createdMs - firstBucketStart) / bucketSize);
    if (createdIndex >= 0 && createdIndex < points.length) {
      points[createdIndex].primaryValue += 1;
      points[createdIndex].details[0].value = points[createdIndex].primaryValue.toString();
    }

    const finalizedIndex = Math.floor((finalizedMs - firstBucketStart) / bucketSize);
    if (finalizedMs > 0 && finalizedIndex >= 0 && finalizedIndex < points.length) {
      points[finalizedIndex].secondaryValue += 1;
      points[finalizedIndex].details[1].value = points[finalizedIndex].secondaryValue.toString();
    }

    const disputeIndex = Math.floor((disputeMs - firstBucketStart) / bucketSize);
    if (disputeMs > 0 && disputeIndex >= 0 && disputeIndex < points.length) {
      const current = Number(points[disputeIndex].details[2].value);
      points[disputeIndex].details[2].value = String(current + 1);
    }
  }

  return points;
}

function buildProtocolSnapshot(orders: OrderUiRecord[], range: ProtocolTimeRange): ProtocolAnalyticsSnapshot {
  const activeEscrows = orders.filter((order) => (
    order.state === OrderState.PENDING_CONFIRM
    || order.state === OrderState.PAID
    || order.state === OrderState.DISPUTED
  )).length;
  const finalizedOrders = orders.filter((order) => order.finalized || order.state === OrderState.FINALIZED).length;
  const disputedOrders = orders.filter((order) => order.state === OrderState.DISPUTED || order.disputed).length;
  const awaitingAutoFinalize = orders.filter((order) => getOrderLifecyclePhase(order) === 'awaiting_auto_finalize').length;
  const avgDeliveryHours = orders.length > 0
    ? Math.round(orders.reduce((sum, order) => sum + bigintToNumber(order.estDeliverySeconds), 0) / orders.length / 3600)
    : 0;

  const metrics: ProtocolMetricCard[] = [
    {
      label: 'Total Orders',
      value: orders.length,
      helper: 'Canonical protocol orders on BSC Testnet',
    },
    {
      label: 'Active Escrows',
      value: activeEscrows,
      helper: 'Pending confirm, paid, or disputed',
    },
    {
      label: 'Finalized',
      value: finalizedOrders,
      helper: 'Orders fully settled on-chain',
    },
    {
      label: 'Disputed',
      value: disputedOrders,
      helper: `${awaitingAutoFinalize} currently inside buyer action window`,
    },
  ];

  const tokenMap = new Map<string, ProtocolTokenBreakdown>();
  for (const order of orders) {
    const symbol = order.paymentTokenSymbol || 'ERC20';
    const decimals = order.paymentTokenDecimals ?? 18;
    const existing = tokenMap.get(symbol) ?? {
      symbol,
      decimals,
      orderCount: 0,
      activeCount: 0,
      finalizedCount: 0,
      disputedCount: 0,
      grossVolume: 0n,
    };
    existing.orderCount += 1;
    existing.grossVolume += order.grossPrice;
    if (order.finalized || order.state === OrderState.FINALIZED) existing.finalizedCount += 1;
    if (
      order.state === OrderState.PENDING_CONFIRM
      || order.state === OrderState.PAID
      || order.state === OrderState.DISPUTED
    ) {
      existing.activeCount += 1;
    }
    if (order.state === OrderState.DISPUTED || order.disputed) existing.disputedCount += 1;
    tokenMap.set(symbol, existing);
  }

  const lifecycleMap = new Map<string, { phase: string; label: string; count: number }>();
  for (const order of orders) {
    const phase = getOrderLifecyclePhase(order);
    const current = lifecycleMap.get(phase) ?? {
      phase,
      label: getOrderLifecycleLabel(order),
      count: 0,
    };
    current.count += 1;
    lifecycleMap.set(phase, current);
  }

  const allEntries = orders.flatMap(deriveTimelineEntries);
  const recentEvents = [...allEntries]
    .filter((entry) => entry.status === 'completed')
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 8);
  const upcomingActions = [...allEntries]
    .filter((entry) => entry.status !== 'completed')
    .sort((left, right) => left.timestamp - right.timestamp)
    .slice(0, 8);

  return {
    metrics,
    chartPoints: buildChartPoints(orders, range),
    tokenBreakdown: Array.from(tokenMap.values()).sort((left, right) => right.orderCount - left.orderCount),
    lifecycleBreakdown: Array.from(lifecycleMap.values()).sort((left, right) => right.count - left.count),
    recentEvents,
    upcomingActions,
    isLoading: false,
    orderCount: orders.length,
  };
}

export function useProtocolAnalytics(range: ProtocolTimeRange = '7D'): ProtocolAnalyticsSnapshot {
  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN_ID });
  const [orders, setOrders] = useState<OrderUiRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadOrders = async () => {
      if (!isSupabaseRestEnabled()) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const rows = await restSelect<ProtocolOrderRow>(
          'protocol_orders',
          `?chain_id=eq.${ACTIVE_CHAIN_ID}&marketplace_contract=eq.${CONTRACTS.MARKETPLACE_ATP.toLowerCase()}`,
        );
        const projectedOrders = rows
          .map(fromProtocolOrderRow)
          .filter((value): value is OrderUiRecord => Boolean(value));
        const canonicalOrders = publicClient
          ? await readCanonicalOrdersFromChain(publicClient, projectedOrders)
          : projectedOrders;

        if (!cancelled) {
          setOrders(
            canonicalOrders.sort((left, right) => Number((right.proposedAt || 0n) - (left.proposedAt || 0n))),
          );
        }
      } catch (error) {
        console.warn('[useProtocolAnalytics] Failed to load protocol analytics', error);
        if (!cancelled) {
          setOrders([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadOrders();
    const poller = window.setInterval(() => {
      void loadOrders();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(poller);
    };
  }, [publicClient]);

  const snapshot = useMemo(() => buildProtocolSnapshot(orders, range), [orders, range]);
  return {
    ...snapshot,
    isLoading,
  };
}
