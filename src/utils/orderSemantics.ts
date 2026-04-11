import { OrderState } from '@/config/contracts';
import type { OrderUiRecord } from '@/types/order';

export type OrderBusinessOutcome = 'open' | 'completed' | 'cancelled' | 'disputed';

type OrderSemanticsInput = Pick<OrderUiRecord, 'state' | 'finalized'>
  & Partial<Pick<OrderUiRecord, 'disputed' | 'paidAt'>>;

export interface ResolvedOrderSemantics {
  businessOutcome: OrderBusinessOutcome;
  isClosed: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  isDisputed: boolean;
  hasPaymentCommitted: boolean;
  deliveryConfirmed: boolean;
}

export function resolveOrderSemantics(order: OrderSemanticsInput): ResolvedOrderSemantics {
  const isCancelled = order.state === OrderState.CANCELLED;
  const isDisputed = !isCancelled && (order.state === OrderState.DISPUTED || Boolean(order.disputed));
  const isCompleted = !isCancelled && !isDisputed && (order.state === OrderState.FINALIZED || order.finalized);
  const paidAt = order.paidAt ?? 0n;
  const hasPaymentCommitted =
    paidAt > 0n
    || order.state === OrderState.PAID
    || order.state === OrderState.DISPUTED
    || order.state === OrderState.FINALIZED;
  const businessOutcome: OrderBusinessOutcome = isCancelled
    ? 'cancelled'
    : isDisputed
      ? 'disputed'
      : isCompleted
        ? 'completed'
        : 'open';

  return {
    businessOutcome,
    isClosed: isCancelled || isCompleted || Boolean(order.finalized),
    isCompleted,
    isCancelled,
    isDisputed,
    hasPaymentCommitted,
    deliveryConfirmed: isCompleted,
  };
}

export function isOrderCompleted(order: OrderSemanticsInput): boolean {
  return resolveOrderSemantics(order).isCompleted;
}

export function isOrderCancelled(order: OrderSemanticsInput): boolean {
  return resolveOrderSemantics(order).isCancelled;
}

export function isOrderDisputed(order: OrderSemanticsInput): boolean {
  return resolveOrderSemantics(order).isDisputed;
}

export function hasOrderPaymentCommitted(order: OrderSemanticsInput): boolean {
  return resolveOrderSemantics(order).hasPaymentCommitted;
}

export function isOrderDeliveryConfirmed(order: OrderSemanticsInput): boolean {
  return resolveOrderSemantics(order).deliveryConfirmed;
}