import type { OrderUiRecord } from '@/types/order';

export function getOrderNewestFirstSortValue(order: OrderUiRecord) {
  if (typeof order.createdAt === 'number' && Number.isFinite(order.createdAt) && order.createdAt > 0) {
    return order.createdAt;
  }
  if (typeof order.updatedAt === 'number' && Number.isFinite(order.updatedAt) && order.updatedAt > 0) {
    return order.updatedAt;
  }
  return order.proposedAt > 0n ? Number(order.proposedAt) * 1000 : 0;
}

export function compareOrdersNewestFirst(left: OrderUiRecord, right: OrderUiRecord) {
  const timeDelta = getOrderNewestFirstSortValue(right) - getOrderNewestFirstSortValue(left);
  if (timeDelta !== 0) return timeDelta;
  if (right.orderId === left.orderId) return 0;
  return right.orderId > left.orderId ? 1 : -1;
}

export function sortOrdersNewestFirst<T extends OrderUiRecord>(orders: T[]) {
  return [...orders].sort(compareOrdersNewestFirst);
}