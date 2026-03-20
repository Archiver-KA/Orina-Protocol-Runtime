import { OrderState, PROTOCOL } from '@/config/contracts';
import type { OrderUiRecord } from '@/types/order';

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

export type MarketplaceOrderSnapshot = readonly [
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
  readonly [number, bigint, bigint],
  bigint,
  bigint,
  bigint,
  bigint,
  boolean,
  boolean,
  `0x${string}`,
  `0x${string}`,
  `0x${string}`,
];

function normalizeAddress(value?: string | null) {
  return value?.toLowerCase() ?? '';
}

function bigintToSafeNumber(value: bigint) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
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
  if (order.finalized || order.state === OrderState.FINALIZED) return 'finalized';
  if (order.state === OrderState.CANCELLED) return 'cancelled';
  if (order.state === OrderState.DISPUTED) return 'disputed';

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
): OrderUiRecord {
  const [
    buyer,
    seller,
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
    burnFeeBpsSnapshot,
    _referralFeeBpsSnapshot,
    finalized,
    sellerConfirmed,
    buyerSig1,
    sellerSig,
    buyerSig2,
  ] = chainOrder;
  const state = Number(stateValue);
  const settlementType = Number(settlementTypeValue);
  const paymentActive = state >= OrderState.PAID || paidAt > 0n;
  const disputeDeadline =
    autoReleaseAt > 0n
      ? autoReleaseAt + BigInt(PROTOCOL.BUYER_ACTION_WINDOW)
      : order.disputeDeadline;

  return {
    ...order,
    buyer,
    seller,
    paymentToken,
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
    burnFeeBpsSnapshot,
    settlementType,
    sellerConfirmed,
    disputed: state === OrderState.DISPUTED,
    paymentSent: paymentActive,
    deliveryConfirmed: finalized || state === OrderState.FINALIZED,
    createdAt: order.createdAt ?? Number(proposedAt) * 1000,
    updatedAt: Date.now(),
    deliveryDeadline: autoReleaseAt > 0n ? Number(autoReleaseAt) * 1000 : order.deliveryDeadline,
    progress: deriveOrderProgress(state, finalized, sellerConfirmed, payDeadline, autoReleaseAt, proposedAt),
    signatures: {
      buyer1: buyerSig1 !== '0x',
      seller: sellerConfirmed || sellerSig !== '0x',
      buyer2: buyerSig2 !== '0x' || finalized || paymentActive || (sellerConfirmed && payDeadline === 0n),
    },
  };
}

export function getOrderLifecycleLabel(order: OrderUiRecord, nowSec = Math.floor(Date.now() / 1000)) {
  switch (getOrderLifecyclePhase(order, nowSec)) {
    case 'waiting_seller_confirm':
      return 'Waiting Seller Confirm';
    case 'seller_confirm_expired':
      return 'Seller Confirm Expired';
    case 'waiting_buyer_accept':
      return 'Waiting Buyer Re-Sign';
    case 'buyer_accept_expired':
      return 'Buyer Re-Sign Expired';
    case 'agreed_delivery':
      return 'Agreed Delivery';
    case 'awaiting_auto_finalize':
      return 'Awaiting Auto Finalize';
    case 'auto_finalize_ready':
      return 'Auto Finalize Ready';
    case 'disputed':
      return 'Disputed';
    case 'finalized':
      return 'Finalized';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

export function getOrderCountdownDeadline(order: OrderUiRecord, nowSec = Math.floor(Date.now() / 1000)) {
  switch (getOrderLifecyclePhase(order, nowSec)) {
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
  return getOrderLifecyclePhase(order) === 'waiting_seller_confirm';
}

export function canSellerCancelOrder(order: OrderUiRecord) {
  return getOrderLifecyclePhase(order) === 'waiting_seller_confirm';
}

export function canBuyerAcceptRevisedTime(order: OrderUiRecord) {
  return getOrderLifecyclePhase(order) === 'waiting_buyer_accept';
}

export function canBuyerCancelOrder(order: OrderUiRecord) {
  return getOrderLifecyclePhase(order) === 'waiting_buyer_accept';
}

export function canConfirmDelivery(order: OrderUiRecord, nowSec = Math.floor(Date.now() / 1000)) {
  const phase = getOrderLifecyclePhase(order, nowSec);
  return (phase === 'agreed_delivery' || phase === 'awaiting_auto_finalize') && order.state === OrderState.PAID;
}

export function canOpenDispute(order: OrderUiRecord, nowSec = Math.floor(Date.now() / 1000)) {
  return getOrderLifecyclePhase(order, nowSec) === 'awaiting_auto_finalize';
}

export function isAutoFinalizeReady(order: OrderUiRecord, nowSec = Math.floor(Date.now() / 1000)) {
  return getOrderLifecyclePhase(order, nowSec) === 'auto_finalize_ready';
}

export function canViewerSellerConfirm(order: OrderUiRecord, viewerAddress?: string, nowSec = Math.floor(Date.now() / 1000)) {
  return isSellerForOrder(order, viewerAddress) && getOrderLifecyclePhase(order, nowSec) === 'waiting_seller_confirm';
}

export function canViewerSellerCancelOrder(order: OrderUiRecord, viewerAddress?: string, nowSec = Math.floor(Date.now() / 1000)) {
  return isSellerForOrder(order, viewerAddress) && getOrderLifecyclePhase(order, nowSec) === 'waiting_seller_confirm';
}

export function canViewerBuyerAcceptRevisedTime(order: OrderUiRecord, viewerAddress?: string, nowSec = Math.floor(Date.now() / 1000)) {
  return isBuyerForOrder(order, viewerAddress) && getOrderLifecyclePhase(order, nowSec) === 'waiting_buyer_accept';
}

export function canViewerBuyerCancelOrder(order: OrderUiRecord, viewerAddress?: string, nowSec = Math.floor(Date.now() / 1000)) {
  return isBuyerForOrder(order, viewerAddress)
    && getOrderLifecyclePhase(order, nowSec) === 'waiting_buyer_accept';
}

export function canViewerConfirmDelivery(order: OrderUiRecord, viewerAddress?: string, nowSec = Math.floor(Date.now() / 1000)) {
  return isBuyerForOrder(order, viewerAddress) && canConfirmDelivery(order, nowSec);
}

export function canViewerOpenDispute(order: OrderUiRecord, viewerAddress?: string, nowSec = Math.floor(Date.now() / 1000)) {
  return isBuyerForOrder(order, viewerAddress) && canOpenDispute(order, nowSec);
}
