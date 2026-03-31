import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { OrderState } from '@/config/contracts';
import {
  getBuyerDisputeDeadline,
  getOrderLifecycleLabel,
  getOrderLifecyclePhase,
  getSellerConfirmDeadline,
} from '@/utils/orderLifecycle';
import { formatOrderGrossPrice } from '@/utils/orderDisplay';
import { encodeIn, isSupabaseRestEnabled, restSelect } from '@/utils/supabaseRest';
import type { OrderUiRecord } from '@/types/order';
import type { ProtocolOrderRow } from '@/utils/runtimeOrders';
import { useUserOrders } from './useUserOrders';
import { useProtocolDataNetwork } from './useProtocolDataNetwork';

export type TimeRange = '7D' | '30D' | '90D' | '1Y' | 'ALL';
export type UserAnalyticsCalendarPhase =
  | 'new'
  | 'seller'
  | 'buyer'
  | 'delivery'
  | 'action'
  | 'dispute'
  | 'done'
  | 'cancel';
export type UserAnalyticsActionOwner = 'buyer' | 'seller' | 'party' | 'system';
export type UserInsightsCalendarScope = 'all' | 'needs_action' | 'buyer' | 'seller' | 'completed' | 'disputed';

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
  assetImage?: string;
  title: string;
  detail: string;
  timestamp: number;
  status: 'completed' | 'pending' | 'future';
  kind: string;
  source: 'projection' | 'derived';
  phase: UserAnalyticsCalendarPhase;
  phaseLabel: string;
  phaseShortLabel: string;
  phaseColor: string;
  phasePriority: number;
  actionOwner: UserAnalyticsActionOwner;
  viewerCanAct: boolean;
  orderStatusFilter: string;
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

const DAY_MS = 24 * 60 * 60 * 1000;

export const USER_ANALYTICS_PHASE_META: Record<
  UserAnalyticsCalendarPhase,
  {
    label: string;
    shortLabel: string;
    color: string;
    priority: number;
    orderStatusFilter: string;
  }
> = {
  new: { label: 'Order Created', shortLabel: 'NEW', color: '#60A5FA', priority: 0, orderStatusFilter: 'all' },
  seller: { label: 'Seller Confirm', shortLabel: 'SELLER', color: '#F59E0B', priority: 1, orderStatusFilter: 'all' },
  buyer: { label: 'Buyer Re-Sign', shortLabel: 'BUYER', color: '#A78BFA', priority: 2, orderStatusFilter: 'all' },
  delivery: { label: 'Delivery Window', shortLabel: 'DELIV', color: '#2CC295', priority: 3, orderStatusFilter: 'all' },
  action: { label: 'Buyer Action Window', shortLabel: 'ACTION', color: '#F7DC7F', priority: 4, orderStatusFilter: 'all' },
  dispute: { label: 'Dispute', shortLabel: 'DISPUTE', color: '#F97316', priority: 5, orderStatusFilter: 'all' },
  done: { label: 'Finalized', shortLabel: 'DONE', color: '#10B981', priority: 6, orderStatusFilter: 'all' },
  cancel: { label: 'Cancelled', shortLabel: 'CANCEL', color: '#71717A', priority: 7, orderStatusFilter: 'all' },
};

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

function toDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function parseTimestamp(value?: string | null, fallback = 0) {
  if (!value) return fallback;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function resolveMilestoneStatus(timestamp: number, nowMs = Date.now()): 'pending' | 'future' {
  return timestamp <= nowMs ? 'pending' : 'future';
}

function normalizeAddress(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function isBuyerForOrder(order: OrderUiRecord, viewerAddress?: string | null) {
  if (!viewerAddress) return false;
  return normalizeAddress(order.buyer) === normalizeAddress(viewerAddress);
}

function isSellerForOrder(order: OrderUiRecord, viewerAddress?: string | null) {
  if (!viewerAddress) return false;
  return normalizeAddress(order.seller) === normalizeAddress(viewerAddress);
}

function canViewerActForMilestone(
  actionOwner: UserAnalyticsActionOwner,
  order: OrderUiRecord,
  viewerAddress?: string | null,
) {
  if (!viewerAddress) return false;
  if (actionOwner === 'buyer') return isBuyerForOrder(order, viewerAddress);
  if (actionOwner === 'seller') return isSellerForOrder(order, viewerAddress);
  if (actionOwner === 'party') {
    return isBuyerForOrder(order, viewerAddress) || isSellerForOrder(order, viewerAddress);
  }
  return false;
}

function createAnalyticsEvent(args: {
  id: string;
  orderId: string;
  assetName: string;
  assetImage?: string;
  title: string;
  detail: string;
  timestamp: number;
  status: 'completed' | 'pending' | 'future';
  kind: string;
  source: 'projection' | 'derived';
  phase: UserAnalyticsCalendarPhase;
  actionOwner: UserAnalyticsActionOwner;
  viewerCanAct: boolean;
  txHash?: string;
}): UserAnalyticsEvent {
  const meta = USER_ANALYTICS_PHASE_META[args.phase];
  return {
    ...args,
    phaseLabel: meta.label,
    phaseShortLabel: meta.shortLabel,
    phaseColor: meta.color,
    phasePriority: meta.priority,
    orderStatusFilter: meta.orderStatusFilter,
  };
}

function buildLifecycleMilestones(order: OrderUiRecord, viewerAddress?: string | null) {
  const orderId = order.orderId.toString();
  const createdAt = toMs(order.proposedAt, order.createdAt ?? 0);
  const sellerConfirmedAt = toMs(order.sellerConfirmedAt);
  const paidAt = toMs(order.paidAt);
  const disputeOpenedAt = toMs(order.disputeOpenedAt);
  const updatedAt = order.updatedAt ?? createdAt;
  const nowMs = Date.now();
  const milestones: UserAnalyticsEvent[] = [];

  if (createdAt > 0) {
    milestones.push(
      createAnalyticsEvent({
        id: `${orderId}-created`,
        orderId,
        assetName: order.assetName,
        assetImage: order.assetImage,
        title: 'Order Created',
        detail: `Order #${orderId} was created for ${order.assetName}.`,
        timestamp: createdAt,
        status: 'completed',
        kind: 'order_created',
        source: 'derived',
        phase: 'new',
        actionOwner: 'buyer',
        viewerCanAct: false,
      }),
    );
  }

  if (sellerConfirmedAt > 0) {
    milestones.push(
      createAnalyticsEvent({
        id: `${orderId}-seller-confirmed`,
        orderId,
        assetName: order.assetName,
        assetImage: order.assetImage,
        title: 'Seller Confirmed',
        detail: `Seller confirmed order #${orderId}.`,
        timestamp: sellerConfirmedAt,
        status: 'completed',
        kind: 'seller_confirmed',
        source: 'derived',
        phase: 'seller',
        actionOwner: 'seller',
        viewerCanAct: false,
      }),
    );
  }

  if (paidAt > 0) {
    milestones.push(
      createAnalyticsEvent({
        id: `${orderId}-escrow-locked`,
        orderId,
        assetName: order.assetName,
        assetImage: order.assetImage,
        title: 'Escrow Locked',
        detail: `${formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals)} locked for order #${orderId}.`,
        timestamp: paidAt,
        status: 'completed',
        kind: 'escrow_locked',
        source: 'derived',
        phase: 'delivery',
        actionOwner: 'buyer',
        viewerCanAct: false,
      }),
    );
  }

  if (disputeOpenedAt > 0) {
    milestones.push(
      createAnalyticsEvent({
        id: `${orderId}-dispute-opened`,
        orderId,
        assetName: order.assetName,
        assetImage: order.assetImage,
        title: 'Dispute Opened',
        detail: `Dispute opened for order #${orderId}.`,
        timestamp: disputeOpenedAt,
        status: 'completed',
        kind: 'dispute_opened',
        source: 'derived',
        phase: 'dispute',
        actionOwner: 'party',
        viewerCanAct: false,
      }),
    );
  }

  if (order.finalized || order.state === OrderState.FINALIZED) {
    milestones.push(
      createAnalyticsEvent({
        id: `${orderId}-finalized`,
        orderId,
        assetName: order.assetName,
        assetImage: order.assetImage,
        title: 'Order Finalized',
        detail: `Order #${orderId} finalized on-chain.`,
        timestamp: updatedAt,
        status: 'completed',
        kind: 'order_finalized',
        source: 'derived',
        phase: 'done',
        actionOwner: 'system',
        viewerCanAct: false,
      }),
    );
  }

  if (order.state === OrderState.CANCELLED) {
    milestones.push(
      createAnalyticsEvent({
        id: `${orderId}-cancelled`,
        orderId,
        assetName: order.assetName,
        assetImage: order.assetImage,
        title: 'Order Cancelled',
        detail: `Order #${orderId} cancelled on-chain.`,
        timestamp: updatedAt,
        status: 'completed',
        kind: 'order_cancelled',
        source: 'derived',
        phase: 'cancel',
        actionOwner: 'system',
        viewerCanAct: false,
      }),
    );
  }

  const phase = getOrderLifecyclePhase(order, Math.floor(nowMs / 1000));
  if (phase === 'waiting_seller_confirm') {
    const deadlineMs = toMs(getSellerConfirmDeadline(order), createdAt + DAY_MS);
    milestones.push(
      createAnalyticsEvent({
        id: `${orderId}-waiting-seller-confirm`,
        orderId,
        assetName: order.assetName,
        assetImage: order.assetImage,
        title: 'Seller Decision Due',
        detail: `Seller must confirm, revise delivery, or cancel order #${orderId}.`,
        timestamp: deadlineMs,
        status: resolveMilestoneStatus(deadlineMs, nowMs),
        kind: 'waiting_seller_confirm',
        source: 'derived',
        phase: 'seller',
        actionOwner: 'seller',
        viewerCanAct: canViewerActForMilestone('seller', order, viewerAddress),
      }),
    );
  }

  if (phase === 'seller_confirm_expired') {
    const deadlineMs = toMs(getSellerConfirmDeadline(order), updatedAt || nowMs);
    milestones.push(
      createAnalyticsEvent({
        id: `${orderId}-seller-confirm-expired`,
        orderId,
        assetName: order.assetName,
        assetImage: order.assetImage,
        title: 'Seller Window Expired',
        detail: `Seller did not act in time for order #${orderId}. The order is now waiting for protocol cancellation flow.`,
        timestamp: deadlineMs,
        status: 'pending',
        kind: 'seller_confirm_expired',
        source: 'derived',
        phase: 'seller',
        actionOwner: 'system',
        viewerCanAct: false,
      }),
    );
  }

  if (phase === 'waiting_buyer_accept') {
    const deadlineMs = toMs(order.payDeadline, nowMs);
    milestones.push(
      createAnalyticsEvent({
        id: `${orderId}-waiting-buyer-accept`,
        orderId,
        assetName: order.assetName,
        assetImage: order.assetImage,
        title: 'Buyer Re-Sign Due',
        detail: `Buyer must re-sign or cancel order #${orderId}.`,
        timestamp: deadlineMs,
        status: resolveMilestoneStatus(deadlineMs, nowMs),
        kind: 'waiting_buyer_accept',
        source: 'derived',
        phase: 'buyer',
        actionOwner: 'buyer',
        viewerCanAct: canViewerActForMilestone('buyer', order, viewerAddress),
      }),
    );
  }

  if (phase === 'buyer_accept_expired') {
    const deadlineMs = toMs(order.payDeadline, updatedAt || nowMs);
    milestones.push(
      createAnalyticsEvent({
        id: `${orderId}-buyer-accept-expired`,
        orderId,
        assetName: order.assetName,
        assetImage: order.assetImage,
        title: 'Buyer Re-Sign Expired',
        detail: `Buyer did not re-sign in time for order #${orderId}. The order is now waiting for protocol cancellation flow.`,
        timestamp: deadlineMs,
        status: 'pending',
        kind: 'buyer_accept_expired',
        source: 'derived',
        phase: 'buyer',
        actionOwner: 'system',
        viewerCanAct: false,
      }),
    );
  }

  if (phase === 'agreed_delivery') {
    const deadlineMs = toMs(order.autoReleaseAt, nowMs);
    milestones.push(
      createAnalyticsEvent({
        id: `${orderId}-delivery-window`,
        orderId,
        assetName: order.assetName,
        assetImage: order.assetImage,
        title: 'Delivery Window Ends',
        detail: `Buyer can confirm delivery before order #${orderId} enters buyer action window.`,
        timestamp: deadlineMs,
        status: resolveMilestoneStatus(deadlineMs, nowMs),
        kind: 'agreed_delivery',
        source: 'derived',
        phase: 'delivery',
        actionOwner: 'buyer',
        viewerCanAct: canViewerActForMilestone('buyer', order, viewerAddress),
      }),
    );
  }

  if (phase === 'awaiting_auto_finalize') {
    const disputeDeadline = order.disputeDeadline ?? getBuyerDisputeDeadline(order);
    const deadlineMs = toMs(disputeDeadline, nowMs);
    milestones.push(
      createAnalyticsEvent({
        id: `${orderId}-buyer-action-window`,
        orderId,
        assetName: order.assetName,
        assetImage: order.assetImage,
        title: 'Buyer Action Window',
        detail: `Buyer can still confirm delivery or open dispute for order #${orderId}.`,
        timestamp: deadlineMs,
        status: resolveMilestoneStatus(deadlineMs, nowMs),
        kind: 'awaiting_auto_finalize',
        source: 'derived',
        phase: 'action',
        actionOwner: 'buyer',
        viewerCanAct: canViewerActForMilestone('buyer', order, viewerAddress),
      }),
    );
  }

  if (phase === 'auto_finalize_ready') {
    const disputeDeadline = order.disputeDeadline ?? getBuyerDisputeDeadline(order);
    const deadlineMs = toMs(disputeDeadline, updatedAt || nowMs);
    milestones.push(
      createAnalyticsEvent({
        id: `${orderId}-auto-finalize-ready`,
        orderId,
        assetName: order.assetName,
        assetImage: order.assetImage,
        title: 'Auto Finalize Ready',
        detail: `Order #${orderId} is now eligible for protocol auto-finalization.`,
        timestamp: deadlineMs || nowMs,
        status: 'pending',
        kind: 'auto_finalize_ready',
        source: 'derived',
        phase: 'action',
        actionOwner: 'system',
        viewerCanAct: false,
      }),
    );
  }

  if (phase === 'disputed') {
    const deadlineMs = toMs(order.disputeDeadline, updatedAt || nowMs);
    milestones.push(
      createAnalyticsEvent({
        id: `${orderId}-dispute-active`,
        orderId,
        assetName: order.assetName,
        assetImage: order.assetImage,
        title: 'Dispute Active',
        detail: `Order #${orderId} is inside the dispute workflow.`,
        timestamp: deadlineMs || nowMs,
        status: deadlineMs > nowMs ? 'future' : 'pending',
        kind: 'disputed',
        source: 'derived',
        phase: 'dispute',
        actionOwner: 'party',
        viewerCanAct: canViewerActForMilestone('party', order, viewerAddress),
      }),
    );
  }

  return milestones;
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

function projectionEventMeta(kind: string): {
  phase: UserAnalyticsCalendarPhase;
  actionOwner: UserAnalyticsActionOwner;
} {
  if (kind === 'order_created' || kind === 'buyer_signed_1') {
    return { phase: 'new', actionOwner: 'buyer' };
  }
  if (kind === 'seller_signed' || kind === 'seller_confirmed' || kind === 'delivery_time_set') {
    return { phase: 'seller', actionOwner: 'seller' };
  }
  if (kind === 'pay_deadline_set' || kind === 'delivery_time_accepted') {
    return { phase: 'buyer', actionOwner: 'buyer' };
  }
  if (kind === 'escrow_locked') {
    return { phase: 'delivery', actionOwner: 'buyer' };
  }
  if (
    kind === 'dispute_opened'
    || kind === 'dispute_extended'
    || kind === 'dispute_resolved_by_agreement'
    || kind === 'dispute_resolved_by_arbiter'
    || kind === 'dispute_auto_split'
  ) {
    return { phase: 'dispute', actionOwner: 'party' };
  }
  if (kind === 'order_finalized') {
    return { phase: 'done', actionOwner: 'system' };
  }
  if (
    kind === 'order_cancelled_by_seller'
    || kind === 'order_cancelled_by_buyer'
    || kind === 'order_cancelled'
  ) {
    return { phase: 'cancel', actionOwner: 'system' };
  }
  return { phase: 'new', actionOwner: 'system' };
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
  if (kind === 'buyer_signed_1') return `Buyer signed the initial proposal for order #${orderId}.`;
  if (kind === 'seller_signed') return `Seller signed the delivery proposal for order #${orderId}.`;
  if (kind === 'seller_confirmed') return `Seller confirmed order #${orderId}.`;
  if (kind === 'delivery_time_set') {
    const seconds = typeof args?.estDeliverySeconds === 'string' ? args.estDeliverySeconds : null;
    return seconds
      ? `Seller set delivery time to ${seconds} seconds for order #${orderId}.`
      : `Seller updated delivery timing for order #${orderId}.`;
  }
  if (kind === 'pay_deadline_set') {
    const deadline = typeof args?.payDeadline === 'string' ? args.payDeadline : null;
    return deadline
      ? `Buyer re-sign deadline recorded for order #${orderId}: ${deadline}.`
      : `Buyer re-sign deadline recorded for order #${orderId}.`;
  }
  if (kind === 'delivery_time_accepted') return `Buyer accepted revised delivery timing for order #${orderId}.`;
  if (kind === 'escrow_locked') return `Escrow locked for order #${orderId}.`;
  if (kind === 'dispute_opened') return `Dispute opened for order #${orderId}.`;
  if (kind === 'dispute_extended') return `Dispute for order #${orderId} was extended into the next window.`;
  if (kind === 'dispute_resolved_by_agreement') return `Dispute for order #${orderId} resolved by agreement.`;
  if (kind === 'dispute_resolved_by_arbiter') return `Dispute for order #${orderId} resolved by arbiter decision.`;
  if (kind === 'dispute_auto_split') return `Dispute for order #${orderId} auto-split after deadline.`;
  if (kind === 'order_finalized') return `Order #${orderId} finalized on-chain.`;
  if (kind === 'order_cancelled_by_seller') return `Seller cancelled order #${orderId}.`;
  if (kind === 'order_cancelled_by_buyer') return `Buyer cancelled order #${orderId}.`;
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
  const merged = new Map<string, UserAnalyticsEvent>();

  for (const event of [...derivedEvents, ...projectedEvents]) {
    const key = `${event.orderId}:${event.kind}:${toDayKey(event.timestamp)}`;
    const current = merged.get(key);

    if (!current) {
      merged.set(key, event);
      continue;
    }

    const shouldReplace =
      (current.source === 'derived' && event.source === 'projection')
      || (event.timestamp >= current.timestamp && current.source === event.source);

    if (shouldReplace) {
      merged.set(key, event);
    }
  }

  return [...merged.values()].sort((left, right) => right.timestamp - left.timestamp);
}

function buildActivityPoints(orders: OrderUiRecord[], range: TimeRange): UserAnalyticsPoint[] {
  const now = Date.now();
  const rangeStart = getRangeWindowStart(range);
  const effectiveStart = range === 'ALL'
    ? (
      orders.length > 0
        ? toDayStart(Math.min(...orders.map((order) => toMs(order.proposedAt, order.createdAt ?? now))))
        : toDayStart(now)
    )
    : toDayStart(rangeStart);
  const days = Math.max(7, Math.ceil((toDayStart(now) - effectiveStart) / DAY_MS) + 1);

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
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  const { orders, isLoading } = useUserOrders(address);
  const [projectedEvents, setProjectedEvents] = useState<UserAnalyticsEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProjectedEvents = async () => {
      if (!address || !isSupabaseRestEnabled() || !chainId || !marketplaceAddress) {
        setProjectedEvents([]);
        setEventsLoading(false);
        return;
      }

      setEventsLoading(true);
      try {
        const normalizedAddress = address.toLowerCase();
        const orderRows = await restSelect<ProtocolOrderProjectionRow>(
          'protocol_orders',
          `?select=id,order_uid,buyer_address,seller_address&chain_id=eq.${chainId}&marketplace_contract=eq.${marketplaceAddress.toLowerCase()}&or=(buyer_address.eq.${normalizedAddress},seller_address.eq.${normalizedAddress})`,
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
            const meta = projectionEventMeta(kind);
            const timestamp = parseTimestamp(row.block_time, parseTimestamp(row.created_at, 0));
            if (timestamp <= 0) return null;

            return createAnalyticsEvent({
              id: row.id || `${orderUid}-${kind}-${row.tx_hash || row.log_index || 'event'}`,
              orderId: orderUid,
              assetName: order?.assetName || `Order #${orderUid}`,
              assetImage: order?.assetImage,
              title: createProjectedEventTitle(kind, row.event_name),
              detail: createProjectedEventDetail(kind, orderUid, order?.assetName || `Order #${orderUid}`, row.payload),
              timestamp,
              status: 'completed',
              kind,
              source: 'projection',
              phase: meta.phase,
              actionOwner: meta.actionOwner,
              viewerCanAct: false,
              txHash: row.tx_hash || undefined,
            });
          })
          .filter((value): value is UserAnalyticsEvent => Boolean(value));

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
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(poller);
    };
  }, [address, chainId, marketplaceAddress, orders]);

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

    const normalizedAddress = address.toLowerCase();
    const userOrders = orders.filter((order) => (
      order.buyer.toLowerCase() === normalizedAddress
      || order.seller.toLowerCase() === normalizedAddress
    ));

    const activeOrders = userOrders.filter((order) => (
      order.state === OrderState.PENDING_CONFIRM
      || order.state === OrderState.PAID
      || order.state === OrderState.DISPUTED
    )).length;
    const finalizedOrders = userOrders.filter((order) => order.finalized || order.state === OrderState.FINALIZED).length;
    const disputedOrders = userOrders.filter((order) => order.state === OrderState.DISPUTED || order.disputed).length;
    const cancelledOrders = userOrders.filter((order) => order.state === OrderState.CANCELLED).length;
    const asBuyerCount = userOrders.filter((order) => order.buyer.toLowerCase() === normalizedAddress).length;
    const asSellerCount = userOrders.filter((order) => order.seller.toLowerCase() === normalizedAddress).length;

    const lifecycleEntries = userOrders.flatMap((order) => buildLifecycleMilestones(order, normalizedAddress));
    const completedDerived = lifecycleEntries.filter((entry) => entry.status === 'completed');
    const completedEvents = mergeCompletedEvents(completedDerived, projectedEvents);
    const upcomingEvents = lifecycleEntries
      .filter((entry) => entry.status !== 'completed')
      .sort((left, right) => {
        const leftNeedsAction = left.viewerCanAct ? 0 : 1;
        const rightNeedsAction = right.viewerCanAct ? 0 : 1;
        if (leftNeedsAction !== rightNeedsAction) return leftNeedsAction - rightNeedsAction;
        if (left.phasePriority !== right.phasePriority) return left.phasePriority - right.phasePriority;
        return left.timestamp - right.timestamp;
      })
      .slice(0, 16);
    const calendarEvents = [...completedEvents, ...upcomingEvents].sort((left, right) => left.timestamp - right.timestamp);
    const recentEvents = [...completedEvents]
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, 12);

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

    const actionableUpcomingCount = upcomingEvents.filter((event) => event.viewerCanAct).length;
    const metrics: UserAnalyticsMetricSnapshot = {
      totalOrders: userOrders.length,
      activeOrders,
      finalizedOrders,
      disputedOrders,
      cancelledOrders,
      asBuyerCount,
      asSellerCount,
      upcomingActions: actionableUpcomingCount > 0 ? actionableUpcomingCount : upcomingEvents.length,
    };

    const insights: UserAnalyticsInsight[] = [];
    if (userOrders.length === 0) {
      insights.push({
        type: 'info',
        title: 'No On-Chain Activity Yet',
        message: 'Create or fulfill an order to start building your lifecycle calendar.',
      });
    } else {
      if (actionableUpcomingCount > 0) {
        insights.push({
          type: 'warning',
          title: 'Action Needed',
          message: `${actionableUpcomingCount} milestone(s) currently require action from this wallet.`,
        });
      }
      if (finalizedOrders > 0) {
        insights.push({
          type: 'success',
          title: 'Orders Completed',
          message: `${finalizedOrders} order(s) have already finalized on-chain.`,
        });
      }
      if (disputedOrders > 0) {
        insights.push({
          type: 'warning',
          title: 'Dispute Workflow Present',
          message: `${disputedOrders} order(s) entered the dispute lifecycle and should be monitored closely.`,
        });
      }
      if (upcomingEvents.length > 0) {
        insights.push({
          type: 'info',
          title: 'Calendar Milestones Ready',
          message: `${upcomingEvents.length} pending or future lifecycle milestone(s) are mapped from canonical order deadlines.`,
        });
      }
    }

    return {
      metrics,
      activity: buildActivityPoints(userOrders, timeRange),
      calendarEvents,
      recentEvents,
      upcomingEvents,
      lifecycleBreakdown: [...lifecycleMap.values()].sort((left, right) => right.count - left.count),
      paymentBreakdown: [...paymentMap.values()].sort((left, right) => right.orderCount - left.orderCount),
      insights,
      isLoading: isLoading || eventsLoading,
    };
  }, [address, eventsLoading, isLoading, orders, projectedEvents, timeRange]);
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
  if (!result.metrics || typeof window === 'undefined') return;

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
    ['Timestamp', 'Order', 'Title', 'Detail', 'Status', 'Phase'],
    ...result.recentEvents.map((event) => [
      new Date(event.timestamp).toISOString(),
      event.orderId,
      event.title,
      event.detail,
      event.status,
      event.phase,
    ]),
    [''],
    ['Upcoming Events'],
    ['Timestamp', 'Order', 'Title', 'Detail', 'Status', 'Phase'],
    ...result.upcomingEvents.map((event) => [
      new Date(event.timestamp).toISOString(),
      event.orderId,
      event.title,
      event.detail,
      event.status,
      event.phase,
    ]),
    [''],
    ['Calendar Events'],
    ['Timestamp', 'Order', 'Title', 'Detail', 'Status', 'Phase', 'Source'],
    ...result.calendarEvents.map((event) => [
      new Date(event.timestamp).toISOString(),
      event.orderId,
      event.title,
      event.detail,
      event.status,
      event.phase,
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
