import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { ACTIVE_CHAIN_ID, CONTRACTS, OrderState } from '@/config/contracts';
import { getOrderLifecycleLabel, getOrderLifecyclePhase } from '@/utils/orderLifecycle';
import { formatOrderGrossPrice } from '@/utils/orderDisplay';
import { encodeIn, isSupabaseRestEnabled, restSelect } from '@/utils/supabaseRest';
import type { ProtocolOrderRow } from '@/utils/runtimeOrders';
import { useUserOrders } from './useUserOrders';

export type TimeRange = '7D' | '30D' | '90D' | '1Y' | 'ALL';

export interface UserAnalyticsMetricSnapshot {
  totalOrders: number;
  activeOrders: number;
  finalizedOrders: number;
  disputedOrders: number;
  cancelledOrders: number;
  asBuyerCount: number;
  asSellerCount: number;
  upcomingActions: number;
}

export interface UserAnalyticsPoint {
  key: string;
  label: string;
  timestamp: number;
  primaryValue: number;
  secondaryValue: number;
  details: Array<{ label: string; value: string }>;
}

export interface UserAnalyticsEvent {
  id: string;
  orderId: string;
  assetName: string;
  title: string;
  detail: string;
  timestamp: number;
  status: 'completed' | 'pending' | 'future';
  kind: string;
  source: 'projection' | 'derived';
  txHash?: string;
}

export interface UserAnalyticsTokenBucket {
  symbol: string;
  decimals: number;
  orderCount: number;
  finalizedCount: number;
  grossVolume: bigint;
}

export interface UserAnalyticsInsight {
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
}

export interface UserAnalyticsResult {
  metrics: UserAnalyticsMetricSnapshot | null;
  activity: UserAnalyticsPoint[];
  calendarEvents: UserAnalyticsEvent[];
  recentEvents: UserAnalyticsEvent[];
  upcomingEvents: UserAnalyticsEvent[];
  lifecycleBreakdown: Array<{ phase: string; label: string; count: number }>;
  paymentBreakdown: UserAnalyticsTokenBucket[];
  insights: UserAnalyticsInsight[];
  isLoading: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

interface ProtocolOrderProjectionRow extends ProtocolOrderRow {
  id?: string | null;
  order_uid?: string | null;
}

interface ProtocolOrderEventRow {
  id?: string | null;
  order_id?: string | null;
  event_name?: string | null;
  chain_id?: number | null;
  tx_hash?: string | null;
  log_index?: number | null;
  block_number?: number | null;
  block_time?: string | null;
  payload?: Record<string, unknown> | null;
  created_at?: string | null;
}

function bigintToNumber(value?: bigint) {
  if (typeof value !== 'bigint') return 0;
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function toMs(value?: bigint, fallbackMs = 0) {
  const seconds = bigintToNumber(value);
  return seconds > 0 ? seconds * 1000 : fallbackMs;
}

function getRangeWindowStart(range: TimeRange) {
  const now = Date.now();
  switch (range) {
    case '7D':
      return now - (7 * DAY_MS);
    case '30D':
      return now - (30 * DAY_MS);
    case '90D':
      return now - (90 * DAY_MS);
    case '1Y':
      return now - (365 * DAY_MS);
    case 'ALL':
    default:
      return 0;
  }
}

function toDayStart(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function buildTimelineEntries(order: ReturnType<typeof useUserOrders>['orders'][number]): UserAnalyticsEvent[] {
  const orderId = order.orderId.toString();
  const entries: UserAnalyticsEvent[] = [];
  const createdAt = toMs(order.proposedAt, order.createdAt ?? 0);
  const sellerConfirmedAt = toMs(order.sellerConfirmedAt);
  const paidAt = toMs(order.paidAt);
  const disputeOpenedAt = toMs(order.disputeOpenedAt);
  const updatedAt = order.updatedAt ?? createdAt;

  if (createdAt > 0) {
    entries.push({
      id: `${orderId}-created`,
      orderId,
      assetName: order.assetName,
      title: 'Order Created',
      detail: `Order #${orderId} created for ${order.assetName}.`,
      timestamp: createdAt,
      status: 'completed',
      kind: 'order_created',
      source: 'derived',
    });
  }

  if (sellerConfirmedAt > 0) {
    entries.push({
      id: `${orderId}-seller-confirm`,
      orderId,
      assetName: order.assetName,
      title: 'Seller Confirmed',
      detail: `Seller confirmed order #${orderId}.`,
      timestamp: sellerConfirmedAt,
      status: 'completed',
      kind: 'seller_confirmed',
      source: 'derived',
    });
  }

  if (paidAt > 0) {
    entries.push({
      id: `${orderId}-paid`,
      orderId,
      assetName: order.assetName,
      title: 'Escrow Locked',
      detail: `${formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals)} locked for order #${orderId}.`,
      timestamp: paidAt,
      status: 'completed',
      kind: 'escrow_locked',
      source: 'derived',
    });
  }

  if (disputeOpenedAt > 0) {
    entries.push({
      id: `${orderId}-dispute`,
      orderId,
      assetName: order.assetName,
      title: 'Dispute Opened',
      detail: `Dispute opened for order #${orderId}.`,
      timestamp: disputeOpenedAt,
      status: 'completed',
      kind: 'dispute_opened',
      source: 'derived',
    });
  }

  if (order.finalized || order.state === OrderState.FINALIZED) {
    entries.push({
      id: `${orderId}-finalized`,
      orderId,
      assetName: order.assetName,
      title: 'Order Finalized',
      detail: `Order #${orderId} finalized on-chain.`,
      timestamp: updatedAt,
      status: 'completed',
      kind: 'order_finalized',
      source: 'derived',
    });
  }

  if (order.state === OrderState.CANCELLED) {
    entries.push({
      id: `${orderId}-cancelled`,
      orderId,
      assetName: order.assetName,
      title: 'Order Cancelled',
      detail: `Order #${orderId} cancelled on-chain.`,
      timestamp: updatedAt,
      status: 'completed',
      kind: 'order_cancelled',
      source: 'derived',
    });
  }

  const phase = getOrderLifecyclePhase(order);
  if (phase === 'waiting_seller_confirm') {
    entries.push({
      id: `${orderId}-waiting-seller`,
      orderId,
      assetName: order.assetName,
      title: 'Waiting Seller Confirm',
      detail: `Seller must confirm, revise, or cancel order #${orderId}.`,
      timestamp: createdAt + DAY_MS,
      status: 'pending',
      kind: 'waiting_seller_confirm',
      source: 'derived',
    });
  }

  if (phase === 'waiting_buyer_accept') {
    entries.push({
      id: `${orderId}-waiting-buyer`,
      orderId,
      assetName: order.assetName,
      title: 'Waiting Buyer Re-Sign',
      detail: `Buyer must re-sign or cancel order #${orderId}.`,
      timestamp: toMs(order.payDeadline),
      status: 'pending',
      kind: 'waiting_buyer_accept',
      source: 'derived',
    });
  }

  if (phase === 'agreed_delivery') {
    entries.push({
      id: `${orderId}-delivery`,
      orderId,
      assetName: order.assetName,
      title: 'Agreed Delivery Ends',
      detail: `Buyer can confirm delivery early for order #${orderId}.`,
      timestamp: toMs(order.autoReleaseAt),
      status: 'future',
      kind: 'agreed_delivery_ends',
      source: 'derived',
    });
  }

  if (phase === 'awaiting_auto_finalize') {
    entries.push({
      id: `${orderId}-buyer-action`,
      orderId,
      assetName: order.assetName,
      title: 'Buyer Action Window',
      detail: `Buyer can confirm delivery or dispute order #${orderId}.`,
      timestamp: toMs(order.disputeDeadline ?? 0n),
      status: 'future',
      kind: 'buyer_action_window',
      source: 'derived',
    });
  }

  if (phase === 'auto_finalize_ready') {
    entries.push({
      id: `${orderId}-auto-finalize-ready`,
      orderId,
      assetName: order.assetName,
      title: 'Auto Finalize Ready',
      detail: `Order #${orderId} is eligible for protocol auto-finalization.`,
      timestamp: Date.now(),
      status: 'pending',
      kind: 'auto_finalize_ready',
      source: 'derived',
    });
  }

  return entries;
}

function parseTimestamp(value?: string | null, fallback = 0) {
  if (!value) return fallback;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function normalizeProjectionEventKind(eventName?: string | null) {
  const normalized = String(eventName || '').trim().toLowerCase();
  if (normalized === 'orderproposed' || normalized === 'ordercreated') return 'order_created';
  if (normalized === 'buyersigned1') return 'buyer_signed_1';
  if (normalized === 'sellersigned') return 'seller_signed';
  if (normalized === 'sellerconfirmed') return 'seller_confirmed';
  if (normalized === 'deliverytimeset') return 'delivery_time_set';
  if (normalized === 'paydeadlineset') return 'pay_deadline_set';
  if (normalized === 'deliverytimeaccepted') return 'delivery_time_accepted';
  if (normalized === 'buyersigned2' || normalized === 'orderpaid') return 'escrow_locked';
  if (normalized === 'disputeopened') return 'dispute_opened';
  if (normalized === 'disputeextended') return 'dispute_extended';
  if (normalized === 'disputeresolvedbyagreement') return 'dispute_resolved_by_agreement';
  if (normalized === 'disputeresolvedbyarbiter') return 'dispute_resolved_by_arbiter';
  if (normalized === 'disputeautosplit') return 'dispute_auto_split';
  if (normalized === 'orderfinalized' || normalized === 'autoreleased') return 'order_finalized';
  if (normalized === 'ordercancelledbyseller') return 'order_cancelled_by_seller';
  if (normalized === 'ordercancelledbybuyer') return 'order_cancelled_by_buyer';
  if (normalized === 'ordercancelled') return 'order_cancelled';
  return normalized || 'order_event';
}

function createProjectedEventDetail(
  kind: string,
  orderId: string,
  assetName: string,
  payload: Record<string, unknown> | null | undefined,
) {
  const args =
    payload && typeof payload.args === 'object' && payload.args
      ? payload.args as Record<string, unknown>
      : null;
  if (kind === 'order_created') return `Order #${orderId} created for ${assetName}.`;
  if (kind === 'buyer_signed_1') return `Buyer signed the initial order proposal for order #${orderId}.`;
  if (kind === 'seller_signed') return `Seller signed the delivery proposal for order #${orderId}.`;
  if (kind === 'seller_confirmed') return `Seller confirmed order #${orderId}.`;
  if (kind === 'delivery_time_set') {
    const seconds = typeof args?.estDeliverySeconds === 'string' ? args.estDeliverySeconds : null;
    return seconds
      ? `Seller set agreed delivery to ${seconds} seconds for order #${orderId}.`
      : `Seller updated agreed delivery for order #${orderId}.`;
  }
  if (kind === 'pay_deadline_set') {
    const deadline = typeof args?.payDeadline === 'string' ? args.payDeadline : null;
    return deadline
      ? `Buyer re-sign deadline recorded for order #${orderId}: ${deadline}.`
      : `Buyer re-sign deadline recorded for order #${orderId}.`;
  }
  if (kind === 'delivery_time_accepted') return `Buyer accepted the revised delivery terms for order #${orderId}.`;
  if (kind === 'escrow_locked') return `Escrow is locked for order #${orderId}.`;
  if (kind === 'dispute_opened') {
    const opener = typeof args?.opener === 'string' ? args.opener : null;
    return opener ? `Dispute opened by ${opener} for order #${orderId}.` : `Dispute opened for order #${orderId}.`;
  }
  if (kind === 'dispute_extended') {
    const finalDeadline = typeof args?.finalDeadline === 'string' ? args.finalDeadline : null;
    return finalDeadline
      ? `Dispute for order #${orderId} extended into phase 2 until ${finalDeadline}.`
      : `Dispute for order #${orderId} extended into phase 2.`;
  }
  if (kind === 'dispute_resolved_by_agreement') {
    const buyerShare = typeof args?.buyerShareBps === 'string' ? args.buyerShareBps : null;
    const sellerShare = typeof args?.sellerShareBps === 'string' ? args.sellerShareBps : null;
    return buyerShare && sellerShare
      ? `Dispute for order #${orderId} closed by 2/3 agreement with ${buyerShare}/${sellerShare} split.`
      : `Dispute for order #${orderId} closed by 2/3 agreement.`;
  }
  if (kind === 'dispute_resolved_by_arbiter') return `Arbiter resolved dispute for order #${orderId}.`;
  if (kind === 'dispute_auto_split') return `Dispute for order #${orderId} auto-settled to 50/50 after deadline.`;
  if (kind === 'order_finalized') return `Order #${orderId} finalized on-chain.`;
  if (kind === 'order_cancelled_by_seller') return `Seller cancelled order #${orderId} during the seller decision window.`;
  if (kind === 'order_cancelled_by_buyer') return `Buyer cancelled order #${orderId} during the buyer re-sign window.`;
  if (kind === 'order_cancelled') return `Order #${orderId} cancelled on-chain.`;
  return `Protocol event recorded for order #${orderId}.`;
}

function createProjectedEventTitle(kind: string, eventName?: string | null) {
  if (kind === 'order_created') return 'Order Created';
  if (kind === 'buyer_signed_1') return 'Buyer Signed';
  if (kind === 'seller_signed') return 'Seller Signed';
  if (kind === 'seller_confirmed') return 'Seller Confirmed';
  if (kind === 'delivery_time_set') return 'Delivery Time Set';
  if (kind === 'pay_deadline_set') return 'Buyer Re-Sign Deadline';
  if (kind === 'delivery_time_accepted') return 'Delivery Accepted';
  if (kind === 'escrow_locked') return 'Escrow Locked';
  if (kind === 'dispute_opened') return 'Dispute Opened';
  if (kind === 'dispute_extended') return 'Dispute Extended';
  if (kind === 'dispute_resolved_by_agreement') return 'Resolved By Agreement';
  if (kind === 'dispute_resolved_by_arbiter') return 'Resolved By Arbiter';
  if (kind === 'dispute_auto_split') return 'Auto Split';
  if (kind === 'order_finalized') return 'Order Finalized';
  if (kind === 'order_cancelled_by_seller') return 'Seller Cancelled';
  if (kind === 'order_cancelled_by_buyer') return 'Buyer Cancelled';
  if (kind === 'order_cancelled') return 'Order Cancelled';
  return String(eventName || 'Order Event');
}

function mergeCompletedEvents(
  derivedEvents: UserAnalyticsEvent[],
  projectedEvents: UserAnalyticsEvent[],
) {
  const projectedKeys = new Set(projectedEvents.map((event) => `${event.orderId}:${event.kind}`));
  const filteredDerived = derivedEvents.filter((event) => !projectedKeys.has(`${event.orderId}:${event.kind}`));
  return [...projectedEvents, ...filteredDerived].sort((left, right) => right.timestamp - left.timestamp);
}

function buildActivityPoints(orders: ReturnType<typeof useUserOrders>['orders'], range: TimeRange): UserAnalyticsPoint[] {
  const now = Date.now();
  const rangeStart = getRangeWindowStart(range);
  const effectiveStart = range === 'ALL'
    ? (orders.length > 0
      ? toDayStart(Math.min(...orders.map((order) => toMs(order.proposedAt, order.createdAt ?? now))))
      : toDayStart(now))
    : toDayStart(rangeStart);
  const days = range === 'ALL'
    ? Math.max(7, Math.ceil((toDayStart(now) - effectiveStart) / DAY_MS) + 1)
    : Math.max(7, Math.ceil((toDayStart(now) - effectiveStart) / DAY_MS) + 1);

  const points = Array.from({ length: days }, (_, index) => {
    const timestamp = effectiveStart + (index * DAY_MS);
    return {
      key: `user-${timestamp}`,
      label: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
      timestamp,
      primaryValue: 0,
      secondaryValue: 0,
      details: [
        { label: 'Orders Created', value: '0' },
        { label: 'Orders Finalized', value: '0' },
        { label: 'Disputes Opened', value: '0' },
      ],
    } satisfies UserAnalyticsPoint;
  });

  for (const order of orders) {
    const createdMs = toMs(order.proposedAt, order.createdAt ?? now);
    const finalizedMs = order.finalized || order.state === OrderState.FINALIZED ? (order.updatedAt ?? createdMs) : 0;
    const disputeMs = toMs(order.disputeOpenedAt);

    const createdIndex = Math.floor((toDayStart(createdMs) - effectiveStart) / DAY_MS);
    if (createdIndex >= 0 && createdIndex < points.length) {
      points[createdIndex].primaryValue += 1;
      points[createdIndex].details[0].value = points[createdIndex].primaryValue.toString();
    }

    const finalizedIndex = Math.floor((toDayStart(finalizedMs) - effectiveStart) / DAY_MS);
    if (finalizedMs > 0 && finalizedIndex >= 0 && finalizedIndex < points.length) {
      points[finalizedIndex].secondaryValue += 1;
      points[finalizedIndex].details[1].value = points[finalizedIndex].secondaryValue.toString();
    }

    const disputeIndex = Math.floor((toDayStart(disputeMs) - effectiveStart) / DAY_MS);
    if (disputeMs > 0 && disputeIndex >= 0 && disputeIndex < points.length) {
      const current = Number(points[disputeIndex].details[2].value);
      points[disputeIndex].details[2].value = String(current + 1);
    }
  }

  return points;
}

export function useAnalytics(timeRange: TimeRange = '30D'): UserAnalyticsResult {
  const { address } = useAccount();
  const { orders, isLoading } = useUserOrders(address);
  const [projectedEvents, setProjectedEvents] = useState<UserAnalyticsEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProjectedEvents = async () => {
      if (!address || !isSupabaseRestEnabled()) {
        setProjectedEvents([]);
        setEventsLoading(false);
        return;
      }

      setEventsLoading(true);
      try {
        const normalized = address.toLowerCase();
        const orderRows = await restSelect<ProtocolOrderProjectionRow>(
          'protocol_orders',
          `?select=id,order_uid,buyer_address,seller_address&chain_id=eq.${ACTIVE_CHAIN_ID}&marketplace_contract=eq.${CONTRACTS.MARKETPLACE_ATP.toLowerCase()}&or=(buyer_address.eq.${normalized},seller_address.eq.${normalized})`,
        );
        const orderIds = orderRows
          .map((row) => row.id)
          .filter((value): value is string => Boolean(value && value.length > 0));

        if (orderIds.length === 0) {
          if (!cancelled) setProjectedEvents([]);
          return;
        }

        const orderIdMap = new Map<string, string>();
        for (const row of orderRows) {
          if (row.id && row.order_uid) {
            orderIdMap.set(row.id, row.order_uid);
          }
        }

        const eventRows = await restSelect<ProtocolOrderEventRow>(
          'protocol_order_events',
          `?order=block_time.desc.nullslast,created_at.desc&order_id=${encodeIn(orderIds)}`,
        );

        const orderMap = new Map(orders.map((order) => [order.orderId.toString(), order]));
        const normalizedEvents = eventRows
          .map((row) => {
            const orderUid = row.order_id ? orderIdMap.get(row.order_id) : null;
            if (!orderUid) return null;
            const order = orderMap.get(orderUid);
            const kind = normalizeProjectionEventKind(row.event_name);
            const timestamp = parseTimestamp(row.block_time, parseTimestamp(row.created_at, 0));
            return {
              id: row.id || `${orderUid}-${kind}-${row.tx_hash || row.log_index || 'event'}`,
              orderId: orderUid,
              assetName: order?.assetName || `Order #${orderUid}`,
              title: createProjectedEventTitle(kind, row.event_name),
              detail: createProjectedEventDetail(kind, orderUid, order?.assetName || `Order #${orderUid}`, row.payload),
              timestamp,
              status: 'completed' as const,
              kind,
              source: 'projection' as const,
              txHash: row.tx_hash || undefined,
            } satisfies UserAnalyticsEvent;
          })
          .filter((value): value is UserAnalyticsEvent => Boolean(value && value.timestamp > 0));

        if (!cancelled) {
          setProjectedEvents(normalizedEvents);
        }
      } catch (error) {
        console.warn('[useAnalytics] Failed to load projected order events', error);
        if (!cancelled) {
          setProjectedEvents([]);
        }
      } finally {
        if (!cancelled) {
          setEventsLoading(false);
        }
      }
    };

    void loadProjectedEvents();
    const poller = window.setInterval(() => {
      void loadProjectedEvents();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(poller);
    };
  }, [address, orders]);

  return useMemo(() => {
    if (!address) {
      return {
        metrics: null,
        activity: [],
        calendarEvents: [],
        recentEvents: [],
        upcomingEvents: [],
        lifecycleBreakdown: [],
        paymentBreakdown: [],
        insights: [],
        isLoading: isLoading || eventsLoading,
      };
    }

    const userOrders = orders.filter((order) => {
      const normalized = address.toLowerCase();
      return order.buyer.toLowerCase() === normalized || order.seller.toLowerCase() === normalized;
    });

    const activeOrders = userOrders.filter((order) => (
      order.state === OrderState.PENDING_CONFIRM
      || order.state === OrderState.PAID
      || order.state === OrderState.DISPUTED
    )).length;
    const finalizedOrders = userOrders.filter((order) => order.finalized || order.state === OrderState.FINALIZED).length;
    const disputedOrders = userOrders.filter((order) => order.state === OrderState.DISPUTED || order.disputed).length;
    const cancelledOrders = userOrders.filter((order) => order.state === OrderState.CANCELLED).length;
    const asBuyerCount = userOrders.filter((order) => order.buyer.toLowerCase() === address.toLowerCase()).length;
    const asSellerCount = userOrders.filter((order) => order.seller.toLowerCase() === address.toLowerCase()).length;

    const timelineEntries = userOrders.flatMap(buildTimelineEntries);
    const completedDerived = timelineEntries.filter((entry) => entry.status === 'completed');
    const completedEvents = mergeCompletedEvents(completedDerived, projectedEvents);
    const upcomingEvents = [...timelineEntries]
      .filter((entry) => entry.status !== 'completed')
      .sort((left, right) => left.timestamp - right.timestamp)
      .slice(0, 10);
    const calendarEvents = [...completedEvents, ...upcomingEvents].sort((left, right) => left.timestamp - right.timestamp);
    const recentEvents = [...completedEvents]
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, 10);

    const lifecycleMap = new Map<string, { phase: string; label: string; count: number }>();
    const paymentMap = new Map<string, UserAnalyticsTokenBucket>();
    for (const order of userOrders) {
      const phase = getOrderLifecyclePhase(order);
      const lifecycle = lifecycleMap.get(phase) ?? {
        phase,
        label: getOrderLifecycleLabel(order),
        count: 0,
      };
      lifecycle.count += 1;
      lifecycleMap.set(phase, lifecycle);

      const symbol = order.paymentTokenSymbol || 'ERC20';
      const token = paymentMap.get(symbol) ?? {
        symbol,
        decimals: order.paymentTokenDecimals ?? 18,
        orderCount: 0,
        finalizedCount: 0,
        grossVolume: 0n,
      };
      token.orderCount += 1;
      token.grossVolume += order.grossPrice;
      if (order.finalized || order.state === OrderState.FINALIZED) {
        token.finalizedCount += 1;
      }
      paymentMap.set(symbol, token);
    }

    const metrics: UserAnalyticsMetricSnapshot = {
      totalOrders: userOrders.length,
      activeOrders,
      finalizedOrders,
      disputedOrders,
      cancelledOrders,
      asBuyerCount,
      asSellerCount,
      upcomingActions: upcomingEvents.length,
    };

    const insights: UserAnalyticsInsight[] = [];
    if (userOrders.length === 0) {
      insights.push({
        type: 'info',
        title: 'No On-Chain Activity Yet',
        message: 'Create or fulfill an order to start building your on-chain activity timeline.',
      });
    } else {
      if (activeOrders > 0) {
        insights.push({
          type: 'warning',
          title: 'Open Workflow Requires Attention',
          message: `${activeOrders} order(s) still need action or protocol completion.`,
        });
      }
      if (finalizedOrders > 0) {
        insights.push({
          type: 'success',
          title: 'Settlements Confirmed On-Chain',
          message: `${finalizedOrders} order(s) have already finalized on-chain.`,
        });
      }
      if (upcomingEvents.length > 0) {
        insights.push({
          type: 'info',
          title: 'Future Deadlines Tracked',
          message: `${upcomingEvents.length} upcoming protocol milestone(s) are being tracked from order lifecycle deadlines.`,
        });
      }
    }

    return {
      metrics,
      activity: buildActivityPoints(userOrders, timeRange),
      calendarEvents,
      recentEvents,
      upcomingEvents,
      lifecycleBreakdown: Array.from(lifecycleMap.values()).sort((left, right) => right.count - left.count),
      paymentBreakdown: Array.from(paymentMap.values()).sort((left, right) => right.orderCount - left.orderCount),
      insights,
      isLoading: isLoading || eventsLoading,
    };
  }, [address, isLoading, eventsLoading, orders, projectedEvents, timeRange]);
}

export function usePortfolioDistribution() {
  const { paymentBreakdown } = useAnalytics('ALL');
  return paymentBreakdown.map((token, index) => ({
    name: token.symbol,
    value: token.orderCount,
    color: ['#2CC295', '#1e8c6c', '#15614a', '#6A4C93'][index % 4],
  }));
}

export function exportAnalytics(result: UserAnalyticsResult) {
  if (!result.metrics) return;

  const rows = [
    ['User Analytics Export'],
    ['Generated', new Date().toLocaleString()],
    [''],
    ['Metric', 'Value'],
    ['Total Orders', String(result.metrics.totalOrders)],
    ['Active Orders', String(result.metrics.activeOrders)],
    ['Finalized Orders', String(result.metrics.finalizedOrders)],
    ['Disputed Orders', String(result.metrics.disputedOrders)],
    ['Cancelled Orders', String(result.metrics.cancelledOrders)],
    ['Buyer Orders', String(result.metrics.asBuyerCount)],
    ['Seller Orders', String(result.metrics.asSellerCount)],
    [''],
    ['Recent Events'],
    ['Timestamp', 'Order', 'Title', 'Detail', 'Status'],
    ...result.recentEvents.map((event) => [
      new Date(event.timestamp).toISOString(),
      event.orderId,
      event.title,
      event.detail,
      event.status,
    ]),
    [''],
    ['Upcoming Events'],
    ['Timestamp', 'Order', 'Title', 'Detail', 'Status'],
    ...result.upcomingEvents.map((event) => [
      new Date(event.timestamp).toISOString(),
      event.orderId,
      event.title,
      event.detail,
      event.status,
    ]),
    [''],
    ['Calendar Events'],
    ['Timestamp', 'Order', 'Title', 'Detail', 'Status', 'Source'],
    ...result.calendarEvents.map((event) => [
      new Date(event.timestamp).toISOString(),
      event.orderId,
      event.title,
      event.detail,
      event.status,
      event.source,
    ]),
  ];

  const csv = rows.map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `user-analytics-${Date.now()}.csv`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
