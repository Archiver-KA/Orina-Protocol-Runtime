/**
 * useMarketplace - MarketplaceATP Contract Hooks
 * ===============================================
 * Complete hooks for the order lifecycle.
 * All write functions include proper tx tracking.
 */

import { useMemo } from 'react';
import { useAccount, usePublicClient, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { OrderStatus } from '@/config/contracts';
import { MARKETPLACE_ABI } from '@/config/abis';
import { getBuyerDisputeDeadline, getSellerConfirmDeadline } from '@/utils/orderLifecycle';
import type { OrderStatusResult } from '@/types/contracts';
import { useProtocolDataNetwork } from './useProtocolDataNetwork';

type MarketplaceOrderRead = {
  proposedAt: bigint;
  payDeadline: bigint;
  autoReleaseAt: bigint;
  state: number;
  finalized: boolean;
  sellerConfirmed: boolean;
};

const BSC_SAFE_WALLET_GAS_CAP = 15_000_000n;

function resolveBufferedGasLimit(estimatedGas: bigint, chainId?: number | null) {
  const bufferedGas = estimatedGas + (estimatedGas / 5n) + 100_000n;
  if (chainId === 56 || chainId === 97) {
    return bufferedGas > BSC_SAFE_WALLET_GAS_CAP ? BSC_SAFE_WALLET_GAS_CAP : bufferedGas;
  }
  return bufferedGas;
}

function deriveOrderStatusResult(order?: MarketplaceOrderRead): OrderStatusResult | undefined {
  if (!order) return undefined;

  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  if (order.finalized) {
    return {
      status: OrderStatus.FINALIZED,
      remainingTime: 0n,
      statusText: 'Finalized',
    };
  }

  if (order.state === 4) {
    return {
      status: OrderStatus.CANCELLED,
      remainingTime: 0n,
      statusText: 'Cancelled',
    };
  }

  if (order.state === 0) {
    if (order.sellerConfirmed) {
      if (order.payDeadline !== 0n && nowSec < order.payDeadline) {
        return {
          status: OrderStatus.PENDING_BUYER_PAY,
          remainingTime: order.payDeadline - nowSec,
          statusText: 'Waiting for buyer to accept seller time',
        };
      }

      return {
        status: OrderStatus.PENDING_BUYER_PAY,
        remainingTime: 0n,
        statusText: 'Buyer acceptance expired - auto cancel pending',
      };
    }

    const sellerDeadline = getSellerConfirmDeadline({ proposedAt: order.proposedAt });
    if (nowSec < sellerDeadline) {
      return {
        status: OrderStatus.PENDING_SELLER_CONFIRM,
        remainingTime: sellerDeadline - nowSec,
        statusText: 'Waiting for seller to confirm or cancel',
      };
    }

    return {
      status: OrderStatus.PENDING_SELLER_CONFIRM,
      remainingTime: 0n,
      statusText: 'Seller confirm expired - auto cancel pending',
    };
  }

  if (order.state === 1) {
    if (nowSec < order.autoReleaseAt) {
      return {
        status: OrderStatus.PAID,
        remainingTime: order.autoReleaseAt - nowSec,
        statusText: 'In agreed delivery window',
      };
    }

    const disputeDeadline = getBuyerDisputeDeadline({ autoReleaseAt: order.autoReleaseAt });
    if (disputeDeadline > 0n && nowSec < disputeDeadline) {
      return {
        status: OrderStatus.DISPUTABLE,
        remainingTime: disputeDeadline - nowSec,
        statusText: 'Awaiting auto finalize - buyer may confirm delivery or open dispute',
      };
    }

    return {
      status: OrderStatus.PAID,
      remainingTime: 0n,
      statusText: 'Auto-finalize possible',
    };
  }

  if (order.state === 2) {
    return {
      status: OrderStatus.DISPUTED,
      remainingTime: 0n,
      statusText: 'In dispute',
    };
  }

  return {
    status: OrderStatus.CANCELLED,
    remainingTime: 0n,
    statusText: 'Unknown state',
  };
}

// ── Read Hooks ────────────────────────────────────────────────

/** Get total number of orders */
export function useNextOrderId() {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'nextOrderId',
    query: { enabled: Boolean(chainId && marketplaceAddress) },
  });
}

/** Get order data by ID (public mapping auto-getter) */
export function useOrder(orderId: bigint | undefined) {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'orders',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: Boolean(chainId && marketplaceAddress && orderId !== undefined) },
  });
}

/** Get enriched order status with remaining time and text */
export function useOrderStatus(orderId: bigint | undefined) {
  const orderQuery = useOrder(orderId);
  const data = useMemo(
    () => deriveOrderStatusResult(orderQuery.data as MarketplaceOrderRead | undefined),
    [orderQuery.data],
  );

  return {
    ...orderQuery,
    data,
  };
}

/** Check individual order state flags */
export function useIsPendingConfirm(orderId: bigint | undefined) {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'isPendingConfirm',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: Boolean(chainId && marketplaceAddress && orderId !== undefined) },
  });
}

export function useIsPaid(orderId: bigint | undefined) {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'isPaid',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: Boolean(chainId && marketplaceAddress && orderId !== undefined) },
  });
}

export function useIsOrderDisputed(orderId: bigint | undefined) {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'isOrderDisputed',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: Boolean(chainId && marketplaceAddress && orderId !== undefined) },
  });
}

export function useIsFinalized(orderId: bigint | undefined) {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'isFinalized',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: Boolean(chainId && marketplaceAddress && orderId !== undefined) },
  });
}

export function useIsSellerConfirmed(orderId: bigint | undefined) {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'isSellerConfirmed',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: Boolean(chainId && marketplaceAddress && orderId !== undefined) },
  });
}

/** Read protocol constants */
export function useProtocolConstants() {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  const sellerWindow = useReadContract({
    chainId: chainId ?? undefined,
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'SELLER_CONFIRM_WINDOW',
    query: { enabled: Boolean(chainId && marketplaceAddress) },
  });
  const payTimeout = useReadContract({
    chainId: chainId ?? undefined,
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'PAY_TIMEOUT',
    query: { enabled: Boolean(chainId && marketplaceAddress) },
  });
  const buyerWindow = useReadContract({
    chainId: chainId ?? undefined,
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'BUYER_ACTION_WINDOW',
    query: { enabled: Boolean(chainId && marketplaceAddress) },
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
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: chainId ?? undefined });
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const createOrder = async (
    seller: `0x${string}`,
    paymentToken: `0x${string}`,
    assetId: bigint,
    amount: bigint,
    grossPriceProposed: bigint,
    proposedEstDeliverySeconds: bigint,
    buyerSig1: `0x${string}`,
    feeToken?: `0x${string}`,
  ) => {
    if (!chainId || !marketplaceAddress || !address) {
      throw new Error('Protocol network is not enabled for order creation');
    }

    const useSeparateFeeToken = Boolean(feeToken && feeToken.toLowerCase() !== paymentToken.toLowerCase());
    const functionName = useSeparateFeeToken ? 'createOrderWithFeeToken' : 'createOrder';
    const args = useSeparateFeeToken
      ? [seller, paymentToken, feeToken as `0x${string}`, assetId, amount, grossPriceProposed, proposedEstDeliverySeconds, buyerSig1] as const
      : [seller, paymentToken, assetId, amount, grossPriceProposed, proposedEstDeliverySeconds, buyerSig1] as const;

    let gas: bigint | undefined;
    if (publicClient) {
      try {
        const estimatedGas = await publicClient.estimateContractGas({
          account: address,
          address: marketplaceAddress,
          abi: MARKETPLACE_ABI,
          functionName,
          args,
        });
        gas = resolveBufferedGasLimit(estimatedGas, chainId);
      } catch (estimateError) {
        console.warn('[useCreateOrder] Gas estimation failed; falling back to wallet estimation.', estimateError);
      }
    }

    return writeContractAsync({
      chainId,
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName,
      args,
      ...(gas ? { gas } : {}),
    });
  };

  return { createOrder, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Seller confirms with delivery time (Sig 2) */
export function useSellerConfirm() {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const sellerConfirm = async (
    orderId: bigint,
    estDeliverySeconds: bigint,
    sellerSig: `0x${string}`,
  ) => {
    if (!chainId || !marketplaceAddress) {
      throw new Error('Protocol network is not enabled for seller confirmation');
    }

    return writeContractAsync({
      chainId,
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: 'sellerConfirm',
      args: [orderId, estDeliverySeconds, sellerSig],
    });
  };

  return { sellerConfirm, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Buyer pays order (Sig 3 - accepts seller's delivery time) */
export function usePayOrder() {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const payOrder = async (orderId: bigint, buyerSig2: `0x${string}`) => {
    if (!chainId || !marketplaceAddress) {
      throw new Error('Protocol network is not enabled for payment');
    }

    return writeContractAsync({
      chainId,
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: 'payOrder',
      args: [orderId, buyerSig2],
    });
  };

  return { payOrder, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Buyer confirms delivery → finalize with FULL_RELEASE */
export function useConfirmDelivery() {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const confirmDelivery = async (orderId: bigint) => {
    if (!chainId || !marketplaceAddress) {
      throw new Error('Protocol network is not enabled for delivery confirmation');
    }

    return writeContractAsync({
      chainId,
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: 'confirmDelivery',
      args: [orderId],
    });
  };

  return { confirmDelivery, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Seller voluntary cancel during the initial 24h seller window */
export function useCancelBySeller() {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const cancelBySeller = async (orderId: bigint) => {
    if (!chainId || !marketplaceAddress) {
      throw new Error('Protocol network is not enabled for seller cancellation');
    }

    return writeContractAsync({
      chainId,
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: 'cancelBySeller',
      args: [orderId],
    });
  };

  return { cancelBySeller, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Buyer voluntary cancel during the buyer re-sign window */
export function useCancelByBuyer() {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const cancelByBuyer = async (orderId: bigint) => {
    if (!chainId || !marketplaceAddress) {
      throw new Error('Protocol network is not enabled for buyer cancellation');
    }

    return writeContractAsync({
      chainId,
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: 'cancelByBuyer',
      args: [orderId],
    });
  };

  return { cancelByBuyer, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Open dispute (buyer only, within the 3-day window after agreed delivery ends) */
export function useOpenDispute() {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const openDispute = async (orderId: bigint) => {
    if (!chainId || !marketplaceAddress) {
      throw new Error('Protocol network is not enabled for disputes');
    }

    return writeContractAsync({
      chainId,
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: 'openDispute',
      args: [orderId],
    });
  };

  return { openDispute, hash, isPending, isConfirming, isConfirmed, error, reset };
}
