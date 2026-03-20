import { useEffect, useMemo, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { DISPUTE_MANAGER_ABI, MARKETPLACE_ABI } from '@/config/abis';
import { ACTIVE_CHAIN_ID, CONTRACTS, OrderState } from '@/config/contracts';
import type { OrderUiRecord } from '@/types/order';
import {
  loadRuntimeOrders,
  mergeOrderRecords,
  readProjectedOrdersForWallet,
  subscribeToRuntimeOrders,
} from '@/utils/runtimeOrders';
import { reconcileOrderFromChain, type MarketplaceOrderSnapshot } from '@/utils/orderLifecycle';

type DisputeSnapshot = readonly [boolean, number, bigint, bigint, boolean, bigint, bigint];

export type OrderData = OrderUiRecord;

type OrderPublicClient = NonNullable<ReturnType<typeof usePublicClient>>;

async function readCanonicalOrdersFromChain(
  publicClient: OrderPublicClient,
  baseOrders: OrderUiRecord[],
) {
  if (baseOrders.length === 0) return [] as OrderUiRecord[];

  const results = await publicClient.multicall({
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
    const result = results[index];
    const chainOrder =
      result.status === 'success'
        ? reconcileOrderFromChain(order, result.result as unknown as MarketplaceOrderSnapshot)
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

/**
 * Hook to fetch canonical orders for a specific user.
 * Source priority: projection rows + local optimistic rows, then canonical chain overlay.
 */
export function useUserOrders(userAddress?: string) {
  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN_ID });
  const [orders, setOrders] = useState<OrderUiRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refresh = async () => {
    setRefreshNonce((value) => value + 1);
  };

  useEffect(() => {
    let cancelled = false;

    const loadOrders = async () => {
      if (!userAddress) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [projectedOrders, runtimeOrders] = await Promise.all([
          readProjectedOrdersForWallet(userAddress),
          Promise.resolve(loadRuntimeOrders(userAddress)),
        ]);

        const mergedBase = mergeOrderRecords(runtimeOrders, projectedOrders);
        const canonicalOrders = publicClient
          ? await readCanonicalOrdersFromChain(publicClient, mergedBase)
          : mergedBase;

        if (cancelled) return;

        setOrders(
          [...canonicalOrders].sort((left, right) => Number(right.proposedAt - left.proposedAt)),
        );
      } catch (error) {
        console.warn('[useUserOrders] Failed to load canonical orders', error);
        if (!cancelled) {
          setOrders(loadRuntimeOrders(userAddress));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [userAddress, publicClient, refreshNonce]);

  useEffect(() => {
    if (!userAddress) return () => {};
    return subscribeToRuntimeOrders(() => {
      void refresh();
    });
  }, [userAddress]);

  useEffect(() => {
    if (!userAddress) return () => {};
    const poller = window.setInterval(() => {
      void refresh();
    }, 10_000);
    return () => window.clearInterval(poller);
  }, [userAddress]);

  return {
    orders,
    isLoading,
    refresh,
  };
}

/**
 * Hook to get orders by status for a user
 */
export function useUserOrdersByStatus(
  userAddress?: string,
  status?: number,
) {
  const { orders, isLoading, refresh } = useUserOrders(userAddress);

  const filteredOrders = useMemo(
    () => (status !== undefined ? orders.filter((order) => order.state === status) : orders),
    [orders, status],
  );

  return { orders: filteredOrders, isLoading, refresh };
}

/**
 * Hook to calculate user statistics from orders
 */
export function useUserStats(userAddress?: string) {
  const { orders, isLoading, refresh } = useUserOrders(userAddress);

  const stats = useMemo(() => ({
    totalOrders: orders.length,
    totalVolume: orders.reduce((sum, order) => sum + Number(order.grossPrice), 0),
    asSellerCount: orders.filter((order) => order.seller.toLowerCase() === userAddress?.toLowerCase()).length,
    asBuyerCount: orders.filter((order) => order.buyer.toLowerCase() === userAddress?.toLowerCase()).length,
    completedOrders: orders.filter((order) => order.finalized || order.state === OrderState.FINALIZED).length,
    cancelledOrders: orders.filter((order) => order.state === OrderState.CANCELLED).length,
  }), [orders, userAddress]);

  return { stats, isLoading, refresh };
}

/**
 * Hook to fetch order events from blockchain
 */
export function useOrderEvents(userAddress?: string, fromBlock?: bigint) {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userAddress) {
      setIsLoading(false);
      return;
    }

    // TODO: Replace with event projection / getLogs for full timeline.
    setEvents([]);
    setIsLoading(false);
  }, [userAddress, fromBlock]);

  return { events, isLoading };
}

/**
 * Hook to calculate real-time portfolio metrics
 */
export function usePortfolioMetrics(userAddress?: string) {
  const { orders, isLoading, refresh } = useUserOrders(userAddress);

  const metrics = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        totalSpent: 0,
        totalEarned: 0,
        activeOrders: 0,
        completedDeals: 0,
        averageOrderValue: 0,
      };
    }

    return {
      totalSpent: orders
        .filter((order) => order.buyer.toLowerCase() === userAddress?.toLowerCase())
        .reduce((sum, order) => sum + Number(order.grossPrice), 0),

      totalEarned: orders
        .filter((order) => order.seller.toLowerCase() === userAddress?.toLowerCase() && (order.finalized || order.state === OrderState.FINALIZED))
        .reduce((sum, order) => sum + Number(order.grossPrice), 0),

      activeOrders: orders.filter((order) =>
        order.state === OrderState.PENDING_CONFIRM
        || order.state === OrderState.PAID
        || order.state === OrderState.DISPUTED,
      ).length,

      completedDeals: orders.filter((order) => order.finalized || order.state === OrderState.FINALIZED).length,

      averageOrderValue: orders.length > 0
        ? orders.reduce((sum, order) => sum + Number(order.grossPrice), 0) / orders.length
        : 0,
    };
  }, [orders, userAddress]);

  return { metrics, isLoading, refresh };
}
