import { useReadContract } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { MARKETPLACE_ABI } from '@/config/abis';
import { useEffect, useState, useMemo } from 'react';

export interface OrderData {
  orderId: bigint;
  buyer: string;
  seller: string;
  assetId: bigint;
  amount: bigint;
  grossPrice: bigint;
  netPrice: bigint;
  fee: bigint;
  status: number; // 0=Proposed, 1=Paid, 2=Released, 3=Cancelled, etc.
  createdAt: bigint;
  paidAt: bigint;
  releasedAt: bigint;
  estimatedDelivery: bigint;
}

/**
 * Hook to fetch all orders for a specific user (as buyer or seller)
 * Returns stable reference to prevent infinite loops
 */
export function useUserOrders(userAddress?: string) {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Get total number of orders
  const { data: totalOrders } = useReadContract({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    functionName: 'nextOrderId',
  });

  useEffect(() => {
    if (!userAddress) {
      if (!hasLoaded) {
        setHasLoaded(true);
      }
      return;
    }

    // Mark as loaded immediately for demo (no real blockchain data yet)
    if (!hasLoaded) {
      setHasLoaded(true);
    }

    // TODO: Fetch real orders from blockchain
    // For now, return empty array (will use mock data in analytics)
  }, [userAddress, hasLoaded]);

  // Memoize to return stable reference - prevents infinite loops
  const memoizedOrders = useMemo(() => orders, [orders.length]);

  return { 
    orders: memoizedOrders, 
    isLoading: !hasLoaded 
  };
}

/**
 * Hook to get orders by status for a user
 */
export function useUserOrdersByStatus(
  userAddress?: string, 
  status?: number
) {
  const { orders, isLoading } = useUserOrders(userAddress);
  
  const filteredOrders = useMemo(() => 
    status !== undefined 
      ? orders.filter(order => order.status === status)
      : orders,
    [orders, status]
  );

  return { orders: filteredOrders, isLoading };
}

/**
 * Hook to calculate user statistics from orders
 */
export function useUserStats(userAddress?: string) {
  const { orders, isLoading } = useUserOrders(userAddress);

  const stats = useMemo(() => ({
    totalOrders: orders.length,
    totalVolume: orders.reduce((sum, order) => sum + Number(order.grossPrice), 0),
    asSellerCount: orders.filter(o => o.seller.toLowerCase() === userAddress?.toLowerCase()).length,
    asBuyerCount: orders.filter(o => o.buyer.toLowerCase() === userAddress?.toLowerCase()).length,
    completedOrders: orders.filter(o => o.status === 2).length, // Released status
    cancelledOrders: orders.filter(o => o.status === 3).length,
  }), [orders, userAddress]);

  return { stats, isLoading };
}

/**
 * Hook to fetch order events from blockchain
 * This is more efficient than polling individual orders
 */
export function useOrderEvents(userAddress?: string, fromBlock?: bigint) {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userAddress) {
      setIsLoading(false);
      return;
    }

    // TODO: Use wagmi's useWatchContractEvent or getLogs
    // For now, return empty events
    setIsLoading(false);
  }, [userAddress, fromBlock]);

  return { events, isLoading };
}

/**
 * Hook to calculate real-time portfolio metrics
 * Returns stable memoized object to prevent re-renders
 */
export function usePortfolioMetrics(userAddress?: string) {
  const { orders, isLoading } = useUserOrders(userAddress);

  // Calculate metrics from actual orders - memoized to prevent re-renders
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
        .filter(o => o.buyer.toLowerCase() === userAddress?.toLowerCase())
        .reduce((sum, o) => sum + Number(o.grossPrice), 0),
      
      totalEarned: orders
        .filter(o => o.seller.toLowerCase() === userAddress?.toLowerCase() && o.status === 2)
        .reduce((sum, o) => sum + Number(o.netPrice), 0),
      
      activeOrders: orders.filter(o => o.status === 1).length,
      
      completedDeals: orders.filter(o => o.status === 2).length,
      
      averageOrderValue: orders.length > 0
        ? orders.reduce((sum, o) => sum + Number(o.grossPrice), 0) / orders.length
        : 0,
    };
  }, [orders, userAddress]);

  return { metrics, isLoading };
}