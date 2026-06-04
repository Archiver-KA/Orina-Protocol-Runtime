import { OrderState, PROTOCOL } from '@/config/contracts';
import type { OrderUiRecord } from '@/types/order';
import {
  type OrderBusinessOutcome,
  hasOrderPaymentCommitted,
  resolveOrderSemantics,
} from '@/utils/orderSemantics';

export type OrderLifecyclePhase =
  | 'waiting_seller_confirm'
  | 'seller_confirm_expired'
  | 'waiting_buyer_accept'
  | 'buyer_accept_expired'
  | 'agreed_delivery'
  | 'awaiting_auto_finalize'
  | 'auto_finalize_ready'
  | 'disputed'
  | 'finalized'
  | 'cancelled';

export type OrderViewerRole = 'buyer' | 'seller' | 'none';

export interface OrderLifecycleActionFlags {
  sellerConfirm: boolean;
  sellerCancel: boolean;
  buyerAcceptRevisedTime: boolean;
  buyerCancel: boolean;
  confirmDelivery: boolean;
  openDispute: boolean;
}

type OrderLifecycleInput = Pick<
  OrderUiRecord,
  'state' | 'finalized' | 'sellerConfirmed' | 'payDeadline' | 'autoReleaseAt' | 'proposedAt'
> & Partial<Pick<OrderUiRecord, 'buyer' | 'seller' | 'disputeDeadline' | 'disputed' | 'paidAt'>>;

export interface ResolvedOrderLifecycle {
  phase: OrderLifecyclePhase;
  label: string;
  countdownDeadline: bigint;
  businessOutcome: OrderBusinessOutcome;
  viewerRole: OrderViewerRole;
  isClosed: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  isDisputed: boolean;
  deliveryConfirmed: boolean;
  allowedActions: OrderLifecycleActionFlags;
}

export type MarketplaceOrderSnapshot = readonly [
  `0x${string}`,
  `0x${string}`,
  `0x${string}`,
  `0x${string}`,
  `0x${string}`,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  number,
  number,
  readonly [bigint, bigint],
  bigint,
  bigint,
  bigint,
  boolean,
  boolean,
  `0x${string}`,
  `0x${string}`,
  `0x${string}`,
];

const LIFECYCLE_LABELS: Record<OrderLifecyclePhase, string> = {
  waiting_seller_confirm: 'Waiting Seller Confirm',
  seller_confirm_expired: 'Seller Confirm Expired',
  waiting_buyer_accept: 'Waiting Buyer Re-Sign',
  buyer_accept_expired: 'Buyer Re-Sign Expired',
  agreed_delivery: 'Agreed Delivery',
  awaiting_auto_finalize: 'Awaiting Auto Finalize',
  auto_finalize_ready: 'Auto Finalize Ready',
  disputed: 'Disputed',
  finalized: 'Finalized',
  cancelled: 'Cancelled',
};

function normalizeAddress(value?: string | null) {
  return value?.toLowerCase() ?? '';
}

function bigintToSafeNumber(value: bigint) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function resolveViewerRole(order: Partial<Pick<OrderUiRecord, 'buyer' | 'seller'>>, viewerAddress?: string): OrderViewerRole {
  if (!viewerAddress) return 'none';
  if (order.buyer && normalizeAddress(order.buyer) === normalizeAddress(viewerAddress)) return 'buyer';
  if (order.seller && normalizeAddress(order.seller) === normalizeAddress(viewerAddress)) return 'seller';
  return 'none';
}

function resolvePhase(order: OrderLifecycleInput, nowSec: number): OrderLifecyclePhase {
  const semantics = resolveOrderSemantics(order);

  if (semantics.isCancelled) return 'cancelled';
  if (semantics.isDisputed) return 'disputed';
  if (semantics.isCompleted) return 'finalized';

  if (order.state === OrderState.PENDING_CONFIRM) {
    if (!order.sellerConfirmed) {
      return nowSec < bigintToSafeNumber(getSellerConfirmDeadline(order))
        ? 'waiting_seller_confirm'
        : 'seller_confirm_expired';
    }

    if (order.payDeadline > 0n) {
      return nowSec < bigintToSafeNumber(order.payDeadline)
        ? 'waiting_buyer_accept'
        : 'buyer_accept_expired';
    }

    return 'agreed_delivery';
  }

  if (order.state === OrderState.PAID) {
    if (nowSec < bigintToSafeNumber(order.autoReleaseAt)) {
      return 'agreed_delivery';
    }

    const disputeDeadline = getBuyerDisputeDeadline(order);
    if (disputeDeadline > 0n && nowSec <= bigintToSafeNumber(disputeDeadline)) {
      return 'awaiting_auto_finalize';
    }

    return 'auto_finalize_ready';
  }

  return 'cancelled';
}

function resolveCountdownDeadline(order: OrderLifecycleInput, phase: OrderLifecyclePhase) {
  switch (phase) {
    case 'waiting_seller_confirm':
    case 'seller_confirm_expired':
      return getSellerConfirmDeadline(order);
    case 'waiting_buyer_accept':
    case 'buyer_accept_expired':
      return getBuyerAcceptanceDeadline(order);
    case 'agreed_delivery':
      return order.autoReleaseAt;
    case 'awaiting_auto_finalize':
      return order.disputeDeadline ?? getBuyerDisputeDeadline(order);
    default:
      return 0n;
  }
}

function resolveAllowedActions(
  order: OrderLifecycleInput,
  phase: OrderLifecyclePhase,
  viewerRole: OrderViewerRole,
): OrderLifecycleActionFlags {
  const sellerWindow = phase === 'waiting_seller_confirm';
  const buyerWindow = phase === 'waiting_buyer_accept';
  const buyerReviewWindow = (phase === 'agreed_delivery' || phase === 'awaiting_auto_finalize')
    && order.state === OrderState.PAID;

  return {
    sellerConfirm: viewerRole === 'seller' && sellerWindow,
    sellerCancel: viewerRole === 'seller' && sellerWindow,
    buyerAcceptRevisedTime: viewerRole === 'buyer' && buyerWindow,
    buyerCancel: viewerRole === 'buyer' && buyerWindow,
    confirmDelivery: viewerRole === 'buyer' && buyerReviewWindow,
    openDispute: viewerRole === 'buyer' && phase === 'awaiting_auto_finalize',
  };
}

export function resolveOrderLifecycle(
  order: OrderLifecycleInput,
  options: { viewerAddress?: string; nowSec?: number } = {},
): ResolvedOrderLifecycle {
  const nowSec = options.nowSec ?? Math.floor(Date.now() / 1000);
  const semantics = resolveOrderSemantics(order);
  const phase = resolvePhase(order, nowSec);
  const viewerRole = resolveViewerRole(order, options.viewerAddress);

  return {
    phase,
    label: LIFECYCLE_LABELS[phase],
    countdownDeadline: resolveCountdownDeadline(order, phase),
    businessOutcome: semantics.businessOutcome,
    viewerRole,
    isClosed: semantics.isClosed,
    isCompleted: semantics.isCompleted,
    isCancelled: semantics.isCancelled,
    isDisputed: semantics.isDisputed,
    deliveryConfirmed: semantics.deliveryConfirmed,
    allowedActions: resolveAllowedActions(order, phase, viewerRole),
  };
}

export function getSellerConfirmDeadline(order: Pick<OrderUiRecord, 'proposedAt'>) {
  return order.proposedAt + BigInt(PROTOCOL.SELLER_CONFIRM_WINDOW);
}

export function getBuyerAcceptanceDeadline(order: Pick<OrderUiRecord, 'payDeadline'>) {
  return order.payDeadline;
}

export function getBuyerDisputeDeadline(order: Pick<OrderUiRecord, 'autoReleaseAt'>) {
  if (order.autoReleaseAt <= 0n) return 0n;
  return order.autoReleaseAt + BigInt(PROTOCOL.BUYER_ACTION_WINDOW);
}

export function getOrderLifecyclePhase(
  order: Pick<OrderUiRecord, 'state' | 'finalized' | 'sellerConfirmed' | 'payDeadline' | 'autoReleaseAt' | 'proposedAt'>,
  nowSec = Math.floor(Date.now() / 1000),
): OrderLifecyclePhase {
  return resolveOrderLifecycle(order, { nowSec }).phase;
}

export function deriveOrderProgress(
  state: number,
  finalized: boolean,
  sellerConfirmed: boolean,
  payDeadline = 0n,
  autoReleaseAt = 0n,
  proposedAt = 0n,
) {
  const phase = getOrderLifecyclePhase(
    {
      state,
      finalized,
      sellerConfirmed,
      payDeadline,
      autoReleaseAt,
      proposedAt,
    },
    Math.floor(Date.now() / 1000),
  );

  if (phase === 'finalized' || phase === 'cancelled') return 100;
  if (phase === 'disputed') return 80;
  if (phase === 'awaiting_auto_finalize' || phase === 'auto_finalize_ready') return 90;
  if (phase === 'agreed_delivery') return 85;
  if (phase === 'waiting_buyer_accept' || phase === 'buyer_accept_expired') return 45;
  return 15;
}

export function hasCanonicalOrderDelta(currentOrder: OrderUiRecord, nextOrder: OrderUiRecord) {
  return (
    currentOrder.state !== nextOrder.state
    || currentOrder.finalized !== nextOrder.finalized
    || currentOrder.sellerConfirmed !== nextOrder.sellerConfirmed
    || currentOrder.payDeadline !== nextOrder.payDeadline
    || currentOrder.autoReleaseAt !== nextOrder.autoReleaseAt
    || currentOrder.paidAt !== nextOrder.paidAt
    || currentOrder.estDeliverySeconds !== nextOrder.estDeliverySeconds
    || currentOrder.progress !== nextOrder.progress
    || currentOrder.deliveryConfirmed !== nextOrder.deliveryConfirmed
  );
}

export function reconcileOrderFromChain(
  order: OrderUiRecord,
  chainOrder: MarketplaceOrderSnapshot,
  options: { feeToken?: `0x${string}` } = {},
): OrderUiRecord {
  const [
    buyer,
    seller,
    _payer,
    _refundRecipient,
    paymentToken,
    assetId,
    amount,
    grossPrice,
    proposedAt,
    paidAt,
    autoReleaseAt,
    estDeliverySeconds,
    payDeadline,
    stateValue,
    settlementTypeValue,
    _splitSettlement,
    platformFeeBpsSnapshot,
    daoFeeBpsSnapshot,
    _referralFeeBpsSnapshot,
    finalized,
    sellerConfirmed,
    buyerSig1,
    sellerSig,
    buyerSig2,
  ] = chainOrder;
  const state = Number(stateValue);
  const settlementType = Number(settlementTypeValue);
  const feeToken = options.feeToken ?? order.feeToken ?? paymentToken;
  const semantics = resolveOrderSemantics({
    state,
    finalized,
    disputed: state === OrderState.DISPUTED,
    paidAt,
  });
  const paymentActive = hasOrderPaymentCommitted({ state, finalized, paidAt });
  const disputeDeadline =
    autoReleaseAt > 0n
      ? autoReleaseAt + BigInt(PROTOCOL.BUYER_ACTION_WINDOW)
      : order.disputeDeadline;

  return {
    ...order,
    buyer,
    seller,
    paymentToken,
    feeToken,
    feeTokenSymbol: order.feeTokenSymbol ?? order.paymentTokenSymbol,
    feeTokenDecimals: order.feeTokenDecimals ?? order.paymentTokenDecimals,
    assetId,
    amount,
    grossPrice,
    payDeadline,
    autoReleaseAt,
    disputeDeadline,
    state,
    finalized,
    proposedAt,
    paidAt,
    depositedAt: paidAt > 0n ? paidAt : order.depositedAt,
    sellerConfirmedAt: sellerConfirmed ? (order.sellerConfirmedAt > 0n ? order.sellerConfirmedAt : proposedAt) : 0n,
    estDeliverySeconds,
    platformFeeBpsSnapshot,
    daoFeeBpsSnapshot,
    burnFeeBpsSnapshot: 0n,
    settlementType,
    sellerConfirmed,
    disputed: state === OrderState.DISPUTED,
    paymentSent: paymentActive,
    deliveryConfirmed: semantics.deliveryConfirmed,
    createdAt: order.createdAt ?? Number(proposedAt) * 1000,
    updatedAt: Date.now(),
    deliveryDeadline: autoReleaseAt > 0n ? Number(autoReleaseAt) * 1000 : order.deliveryDeadline,
    progress: deriveOrderProgress(state, finalized, sellerConfirmed, payDeadline, autoReleaseAt, proposedAt),
    signatures: {
      buyer1: buyerSig1 !== '0x',
      seller: sellerConfirmed || sellerSig !== '0x',
      buyer2: buyerSig2 !== '0x' || semantics.isCompleted || paymentActive || (sellerConfirmed && payDeadline === 0n),
    },
  };
}

export function getOrderLifecycleLabel(order: OrderUiRecord, nowSec = Math.floor(Date.now() / 1000)) {
  return resolveOrderLifecycle(order, { nowSec }).label;
}

export function getOrderCountdownDeadline(order: OrderUiRecord, nowSec = Math.floor(Date.now() / 1000)) {
  return resolveOrderLifecycle(order, { nowSec }).countdownDeadline;
}

export function isBuyerForOrder(order: Pick<OrderUiRecord, 'buyer'>, viewerAddress?: string) {
  if (!viewerAddress) return false;
  return normalizeAddress(order.buyer) === normalizeAddress(viewerAddress);
}

export function isSellerForOrder(order: Pick<OrderUiRecord, 'seller'>, viewerAddress?: string) {
  if (!viewerAddress) return false;
  return normalizeAddress(order.seller) === normalizeAddress(viewerAddress);
}

export function isPartyForOrder(order: Pick<OrderUiRecord, 'buyer' | 'seller'>, viewerAddress?: string) {
  return isBuyerForOrder(order, viewerAddress) || isSellerForOrder(order, viewerAddress);
}

export function canSellerConfirm(order: OrderUiRecord) {
  return resolveOrderLifecycle(order).phase === 'waiting_seller_confirm';
}

export function canSellerCancelOrder(order: OrderUiRecord) {
  return resolveOrderLifecycle(order).phase === 'waiting_seller_confirm';
}

export function canBuyerAcceptRevisedTime(order: OrderUiRecord) {
  return resolveOrderLifecycle(order).phase === 'waiting_buyer_accept';
}

export function canBuyerCancelOrder(order: OrderUiRecord) {
  return resolveOrderLifecycle(order).phase === 'waiting_buyer_accept';
}

export function canConfirmDelivery(order: OrderUiRecord, nowSec = Math.floor(Date.now() / 1000)) {
  const lifecycle = resolveOrderLifecycle(order, { nowSec, viewerAddress: order.buyer });
  return lifecycle.allowedActions.confirmDelivery;
}

export function canOpenDispute(order: OrderUiRecord, nowSec = Math.floor(Date.now() / 1000)) {
  const lifecycle = resolveOrderLifecycle(order, { nowSec, viewerAddress: order.buyer });
  return lifecycle.allowedActions.openDispute;
}

export function isAutoFinalizeReady(order: OrderUiRecord, nowSec = Math.floor(Date.now() / 1000)) {
  return getOrderLifecyclePhase(order, nowSec) === 'auto_finalize_ready';
}

export function canViewerSellerConfirm(order: OrderUiRecord, viewerAddress?: string, nowSec = Math.floor(Date.now() / 1000)) {
  return resolveOrderLifecycle(order, { viewerAddress, nowSec }).allowedActions.sellerConfirm;
}

export function canViewerSellerCancelOrder(order: OrderUiRecord, viewerAddress?: string, nowSec = Math.floor(Date.now() / 1000)) {
  return resolveOrderLifecycle(order, { viewerAddress, nowSec }).allowedActions.sellerCancel;
}

export function canViewerBuyerAcceptRevisedTime(order: OrderUiRecord, viewerAddress?: string, nowSec = Math.floor(Date.now() / 1000)) {
  return resolveOrderLifecycle(order, { viewerAddress, nowSec }).allowedActions.buyerAcceptRevisedTime;
}

export function canViewerBuyerCancelOrder(order: OrderUiRecord, viewerAddress?: string, nowSec = Math.floor(Date.now() / 1000)) {
  return resolveOrderLifecycle(order, { viewerAddress, nowSec }).allowedActions.buyerCancel;
}

export function canViewerConfirmDelivery(order: OrderUiRecord, viewerAddress?: string, nowSec = Math.floor(Date.now() / 1000)) {
  return resolveOrderLifecycle(order, { viewerAddress, nowSec }).allowedActions.confirmDelivery;
}

export function canViewerOpenDispute(order: OrderUiRecord, viewerAddress?: string, nowSec = Math.floor(Date.now() / 1000)) {
  return resolveOrderLifecycle(order, { viewerAddress, nowSec }).allowedActions.openDispute;
}
