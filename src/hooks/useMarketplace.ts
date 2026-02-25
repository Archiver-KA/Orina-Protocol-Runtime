/**
 * useMarketplace - MarketplaceATP Contract Hooks
 * ===============================================
 * Complete hooks for the order lifecycle.
 * All write functions include proper tx tracking.
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { MARKETPLACE_ABI } from '@/config/abis';

// ── Read Hooks ────────────────────────────────────────────────

/** Get total number of orders */
export function useNextOrderId() {
  return useReadContract({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    functionName: 'nextOrderId',
  });
}

/** Get order data by ID (public mapping auto-getter) */
export function useOrder(orderId: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    functionName: 'orders',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: orderId !== undefined },
  });
}

/** Get enriched order status with remaining time and text */
export function useOrderStatus(orderId: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    functionName: 'getOrderStatus',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: orderId !== undefined },
  });
}

/** Check individual order state flags */
export function useIsPendingConfirm(orderId: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    functionName: 'isPendingConfirm',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: orderId !== undefined },
  });
}

export function useIsPaid(orderId: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    functionName: 'isPaid',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: orderId !== undefined },
  });
}

export function useIsOrderDisputed(orderId: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    functionName: 'isOrderDisputed',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: orderId !== undefined },
  });
}

export function useIsFinalized(orderId: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    functionName: 'isFinalized',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: orderId !== undefined },
  });
}

export function useIsSellerConfirmed(orderId: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    functionName: 'isSellerConfirmed',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: orderId !== undefined },
  });
}

/** Read protocol constants */
export function useProtocolConstants() {
  const sellerWindow = useReadContract({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    functionName: 'SELLER_CONFIRM_WINDOW',
  });
  const payTimeout = useReadContract({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    functionName: 'PAY_TIMEOUT',
  });
  const buyerWindow = useReadContract({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    functionName: 'BUYER_ACTION_WINDOW',
  });

  return {
    sellerConfirmWindow: sellerWindow.data as bigint | undefined,
    payTimeout: payTimeout.data as bigint | undefined,
    buyerActionWindow: buyerWindow.data as bigint | undefined,
  };
}

// ── Write Hooks ───────────────────────────────────────────────

/** Buyer creates order (Sig 1) */
export function useCreateOrder() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const createOrder = async (
    seller: `0x${string}`,
    paymentToken: `0x${string}`,
    assetId: bigint,
    amount: bigint,
    grossPriceProposed: bigint,
    proposedEstDeliverySeconds: bigint,
    buyerSig1: `0x${string}`,
  ) => {
    writeContract({
      address: CONTRACTS.MARKETPLACE_ATP,
      abi: MARKETPLACE_ABI,
      functionName: 'createOrder',
      args: [seller, paymentToken, assetId, amount, grossPriceProposed, proposedEstDeliverySeconds, buyerSig1],
    });
  };

  return { createOrder, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Seller confirms with delivery time (Sig 2) */
export function useSellerConfirm() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const sellerConfirm = async (
    orderId: bigint,
    estDeliverySeconds: bigint,
    sellerSig: `0x${string}`,
  ) => {
    writeContract({
      address: CONTRACTS.MARKETPLACE_ATP,
      abi: MARKETPLACE_ABI,
      functionName: 'sellerConfirm',
      args: [orderId, estDeliverySeconds, sellerSig],
    });
  };

  return { sellerConfirm, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Buyer pays order (Sig 3 - accepts seller's delivery time) */
export function usePayOrder() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const payOrder = async (orderId: bigint, buyerSig2: `0x${string}`) => {
    writeContract({
      address: CONTRACTS.MARKETPLACE_ATP,
      abi: MARKETPLACE_ABI,
      functionName: 'payOrder',
      args: [orderId, buyerSig2],
    });
  };

  return { payOrder, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Buyer confirms delivery → finalize with FULL_RELEASE */
export function useConfirmDelivery() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const confirmDelivery = async (orderId: bigint) => {
    writeContract({
      address: CONTRACTS.MARKETPLACE_ATP,
      abi: MARKETPLACE_ABI,
      functionName: 'confirmDelivery',
      args: [orderId],
    });
  };

  return { confirmDelivery, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Buyer voluntary cancel (before payment) */
export function useCancelByBuyer() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const cancelByBuyer = async (orderId: bigint) => {
    writeContract({
      address: CONTRACTS.MARKETPLACE_ATP,
      abi: MARKETPLACE_ABI,
      functionName: 'cancelByBuyer',
      args: [orderId],
    });
  };

  return { cancelByBuyer, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Open dispute (buyer or seller, within 3-day window after autoReleaseAt) */
export function useOpenDispute() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const openDispute = async (orderId: bigint) => {
    writeContract({
      address: CONTRACTS.MARKETPLACE_ATP,
      abi: MARKETPLACE_ABI,
      functionName: 'openDispute',
      args: [orderId],
    });
  };

  return { openDispute, hash, isPending, isConfirming, isConfirmed, error, reset };
}
