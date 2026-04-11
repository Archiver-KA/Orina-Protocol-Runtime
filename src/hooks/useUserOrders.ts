import { useEffect, useMemo, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { DISPUTE_MANAGER_ABI, MARKETPLACE_ABI, ORINA_RWA_ABI, UNIT_REGISTRY_ABI } from '@/config/abis';
import { OrderState } from '@/config/contracts';
import type { OrderUiRecord } from '@/types/order';
import {
  ProtocolOrderRow,
  loadRuntimeOrders,
  mergeOrderRecords,
  removeRuntimeOrders,
  readProjectedOrdersForWallet,
  type RuntimeOrderScope,
  subscribeToRuntimeOrders,
} from '@/utils/runtimeOrders';
import { reconcileOrderFromChain, type MarketplaceOrderSnapshot } from '@/utils/orderLifecycle';
import { isOrderCancelled, isOrderCompleted } from '@/utils/orderSemantics';
import { encodeIn, isSupabaseRestEnabled, restSelect } from '@/utils/supabaseRest';
import {
  getUnitDisplayLabel,
  normalizeAssetResult,
  normalizeUnitResult,
} from '@/utils/onchainNormalization';
import { sortOrdersNewestFirst } from '@/utils/orderSorting';
import { useProtocolDataNetwork } from './useProtocolDataNetwork';

type DisputeSnapshot = readonly [boolean, number, bigint, bigint, boolean, bigint, bigint];
interface ProtocolOrderEventRow {
  id?: string | null;
  order_id?: string | null;
  event_name?: string | null;
  tx_hash?: string | null;
  log_index?: number | null;
  block_number?: number | null;
  block_time?: string | null;
  payload?: Record<string, unknown> | null;
}

export type OrderData = OrderUiRecord;

type OrderPublicClient = NonNullable<ReturnType<typeof usePublicClient>>;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function isUninitializedMarketplaceOrderSnapshot(snapshot: MarketplaceOrderSnapshot) {
  const [
    buyer,
    seller,
    payer,
    refundRecipient,
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
    split,
    platformFeeBpsSnapshot,
    daoFeeBpsSnapshot,
    burnFeeBpsSnapshot,
    referralFeeBpsSnapshot,
    finalized,
    sellerConfirmed,
    buyerSig1,
    sellerSig,
    buyerSig2,
  ] = snapshot;

  return (
    buyer.toLowerCase() === ZERO_ADDRESS
    && seller.toLowerCase() === ZERO_ADDRESS
    && payer.toLowerCase() === ZERO_ADDRESS
    && refundRecipient.toLowerCase() === ZERO_ADDRESS
    && paymentToken.toLowerCase() === ZERO_ADDRESS
    && assetId === 0n
    && amount === 0n
    && grossPrice === 0n
    && proposedAt === 0n
    && paidAt === 0n
    && autoReleaseAt === 0n
    && estDeliverySeconds === 0n
    && payDeadline === 0n
    && Number(stateValue) === 0
    && Number(settlementTypeValue) === 0
    && isZeroSplitSettlementSnapshot(split)
    && platformFeeBpsSnapshot === 0n
    && daoFeeBpsSnapshot === 0n
    && burnFeeBpsSnapshot === 0n
    && referralFeeBpsSnapshot === 0n
    && finalized === false
    && sellerConfirmed === false
    && buyerSig1 === '0x'
    && sellerSig === '0x'
    && buyerSig2 === '0x'
  );
}

function isZeroBigIntLike(value: unknown) {
  return value === 0n || value === 0 || value === '0';
}

function isZeroSplitSettlementSnapshot(value: unknown) {
  if (Array.isArray(value)) {
    return value.every((entry) => isZeroBigIntLike(entry));
  }

  if (value && typeof value === 'object') {
    const split = value as {
      verdict?: unknown;
      buyerShareBps?: unknown;
      sellerShareBps?: unknown;
    };

    return isZeroBigIntLike(split.verdict ?? 0)
      && isZeroBigIntLike(split.buyerShareBps ?? 0)
      && isZeroBigIntLike(split.sellerShareBps ?? 0);
  }

  return false;
}
async function readCanonicalOrdersFromChain(
  publicClient: OrderPublicClient,
  baseOrders: OrderUiRecord[],
  scope: RuntimeOrderScope,
) {
  if (baseOrders.length === 0) return [] as OrderUiRecord[];
  if (!scope.chainId || !scope.marketplaceContract) {
    return baseOrders;
  }

  const results = await publicClient.multicall({
    allowFailure: true,
    contracts: baseOrders.map((order) => ({
      address: scope.marketplaceContract as `0x${string}`,
      chainId: scope.chainId,
      abi: MARKETPLACE_ABI,
      functionName: 'orders',
      args: [order.orderId] as const,
    })),
  });

  const disputeResults = scope.disputeManagerAddress
    ? await publicClient.multicall({
        allowFailure: true,
        contracts: baseOrders.map((order) => ({
          address: scope.disputeManagerAddress as `0x${string}`,
          chainId: scope.chainId,
          abi: DISPUTE_MANAGER_ABI,
          functionName: 'disputes',
          args: [order.orderId] as const,
        })),
      })
    : baseOrders.map(() => ({ status: 'failure' as const }));

  return baseOrders.flatMap((order, index) => {
    const result = results[index];
    if (result.status !== 'success') {
      return [order];
    }

    const snapshot = result.result as unknown as MarketplaceOrderSnapshot;
    if (isUninitializedMarketplaceOrderSnapshot(snapshot)) {
      return [];
    }

    const chainOrder = reconcileOrderFromChain(order, snapshot);

    const disputeResult = disputeResults[index];
    if (disputeResult.status !== 'success') {
      return [chainOrder];
    }

    const [active, verdict, openedAt, deadline, extended, buyerShareBps, sellerShareBps] =
      disputeResult.result as unknown as DisputeSnapshot;

    if (!active && openedAt === 0n && verdict === 0 && buyerShareBps === 0n && sellerShareBps === 0n) {
      return [chainOrder];
    }

    return [{
      ...chainOrder,
      disputeOpenedAt: openedAt > 0n ? openedAt : chainOrder.disputeOpenedAt,
      disputeDeadline: deadline > 0n ? deadline : chainOrder.disputeDeadline,
      disputeExtended: extended,
      disputeVerdict: Number(verdict),
      disputeBuyerShareBps: buyerShareBps > 0n ? buyerShareBps : chainOrder.disputeBuyerShareBps,
      disputeSellerShareBps: sellerShareBps > 0n ? sellerShareBps : chainOrder.disputeSellerShareBps,
      disputed: active || chainOrder.disputed,
    }];
  });
}

async function enrichOrdersWithOnchainMetadata(
  publicClient: OrderPublicClient,
  baseOrders: OrderUiRecord[],
  scope: RuntimeOrderScope,
) {
  if (baseOrders.length === 0) return [] as OrderUiRecord[];
  if (!scope.chainId || !scope.assetContract || !scope.unitRegistryAddress) {
    return baseOrders;
  }

  const uniqueAssetIds = Array.from(
    new Set(
      baseOrders
        .map((order) => order.assetId)
        .filter((assetId) => assetId > 0n)
        .map((assetId) => assetId.toString()),
    ),
  ).map((value) => BigInt(value));

  if (uniqueAssetIds.length === 0) {
    return baseOrders;
  }

  const assetResults = await publicClient.multicall({
    allowFailure: true,
    contracts: uniqueAssetIds.map((assetId) => ({
      address: scope.assetContract as `0x${string}`,
      chainId: scope.chainId,
      abi: ORINA_RWA_ABI,
      functionName: 'getAsset',
      args: [assetId] as const,
    })),
  });

  const assetById = new Map<string, ReturnType<typeof normalizeAssetResult>>();
  const uniqueUnitIds: bigint[] = [];
  const unitIdSet = new Set<string>();

  assetResults.forEach((result, index) => {
    if (result.status !== 'success') return;
    const normalized = normalizeAssetResult(result.result);
    if (!normalized) return;

    const assetId = uniqueAssetIds[index];
    assetById.set(assetId.toString(), normalized);

    const unitKey = normalized.unitId.toString();
    if (!unitIdSet.has(unitKey)) {
      unitIdSet.add(unitKey);
      uniqueUnitIds.push(normalized.unitId);
    }
  });

  const unitById = new Map<string, { name: string; label: string }>();
  if (uniqueUnitIds.length > 0) {
    const unitResults = await publicClient.multicall({
      allowFailure: true,
      contracts: uniqueUnitIds.map((unitId) => ({
        address: scope.unitRegistryAddress as `0x${string}`,
        chainId: scope.chainId,
        abi: UNIT_REGISTRY_ABI,
        functionName: 'getUnit',
        args: [unitId] as const,
      })),
    });

    unitResults.forEach((result, index) => {
      if (result.status !== 'success') return;
      const normalized = normalizeUnitResult(result.result);
      if (!normalized) return;

      const unitId = uniqueUnitIds[index];
      unitById.set(unitId.toString(), {
        name: normalized.name,
        label: getUnitDisplayLabel(unitId, normalized.name),
      });
    });
  }

  return baseOrders.map((order) => {
    const assetSnapshot = assetById.get(order.assetId.toString());
    const resolvedUnitId = assetSnapshot?.unitId ?? order.unitId;
    const unitSnapshot =
      resolvedUnitId !== undefined ? unitById.get(resolvedUnitId.toString()) : undefined;

    return {
      ...order,
      tokenId: order.tokenId ?? order.assetId.toString(),
      assetContract: order.assetContract ?? (scope.assetContract as `0x${string}`),
      unitId: resolvedUnitId,
      unitName: unitSnapshot?.name ?? order.unitName,
      unitLabel: unitSnapshot?.label ?? order.unitLabel ?? order.unitName,
    };
  });
}

/**
 * Hook to fetch canonical orders for a specific user.
 * Source priority: projection rows + local optimistic rows, then canonical chain overlay.
 */
export function useUserOrders(userAddress?: string) {
  const {
    assetAddress,
    chainId,
    disputeManagerAddress,
    marketplaceAddress,
    unitRegistryAddress,
  } = useProtocolDataNetwork();
  const publicClient = usePublicClient({ chainId: chainId ?? undefined });
  const [orders, setOrders] = useState<OrderUiRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const scope = useMemo(() => ({
    chainId,
    marketplaceContract: marketplaceAddress,
    assetContract: assetAddress,
    disputeManagerAddress,
    unitRegistryAddress,
  }), [assetAddress, chainId, disputeManagerAddress, marketplaceAddress, unitRegistryAddress]);

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
          readProjectedOrdersForWallet(userAddress, scope),
          Promise.resolve(loadRuntimeOrders(userAddress, scope)),
        ]);

        const mergedBase = mergeOrderRecords(runtimeOrders, projectedOrders);
        const canonicalOrders = publicClient
          ? await readCanonicalOrdersFromChain(publicClient, mergedBase, scope)
          : mergedBase;
        const resolvedOrders = publicClient
          ? await enrichOrdersWithOnchainMetadata(publicClient, canonicalOrders, scope)
          : canonicalOrders;

        const resolvedIds = new Set(resolvedOrders.map((order) => order.orderId.toString()));
        const droppedRuntimeOrderIds = runtimeOrders
          .filter((order) => !resolvedIds.has(order.orderId.toString()))
          .map((order) => order.orderId);

        if (droppedRuntimeOrderIds.length > 0) {
          removeRuntimeOrders(droppedRuntimeOrderIds, scope);
        }

        if (cancelled) return;

        setOrders(sortOrdersNewestFirst(resolvedOrders));
      } catch (error) {
        console.warn('[useUserOrders] Failed to load canonical orders', error);
        if (!cancelled) {
          setOrders(sortOrdersNewestFirst(loadRuntimeOrders(userAddress, scope)));
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
  }, [publicClient, refreshNonce, scope, userAddress]);

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
    completedOrders: orders.filter((order) => isOrderCompleted(order)).length,
    cancelledOrders: orders.filter((order) => isOrderCancelled(order)).length,
  }), [orders, userAddress]);

  return { stats, isLoading, refresh };
}

/**
 * Hook to fetch order events from blockchain
 */
export function useOrderEvents(userAddress?: string, fromBlock?: bigint) {
  const [events, setEvents] = useState<ProtocolOrderEventRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      if (!userAddress || !isSupabaseRestEnabled() || !scope.chainId || !scope.marketplaceContract) {
        setEvents([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const normalized = userAddress.toLowerCase();
        const orderRows = await restSelect<ProtocolOrderRow>(
          'protocol_orders',
          `?select=id,order_uid,buyer_address,seller_address&chain_id=eq.${scope.chainId}&marketplace_contract=eq.${String(scope.marketplaceContract || '').toLowerCase()}&or=(buyer_address.eq.${normalized},seller_address.eq.${normalized})`,
        );
        const orderIds = orderRows
          .map((row) => row.id)
          .filter((value): value is string => Boolean(value && value.length > 0));

        if (orderIds.length === 0) {
          if (!cancelled) setEvents([]);
          return;
        }

        const minBlockFilter =
          typeof fromBlock === 'bigint'
            ? `&block_number=gte.${fromBlock.toString()}`
            : '';
        const rows = await restSelect<ProtocolOrderEventRow>(
          'protocol_order_events',
          `?select=id,order_id,event_name,tx_hash,log_index,block_number,block_time,payload&order=block_time.desc.nullslast,created_at.desc&order_id=${encodeIn(orderIds)}${minBlockFilter}`,
        );

        if (!cancelled) {
          setEvents(rows);
        }
      } catch (error) {
        console.warn('[useOrderEvents] Failed to load projected order events', error);
        if (!cancelled) {
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadEvents();
    const poller = window.setInterval(() => {
      void loadEvents();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(poller);
    };
  }, [fromBlock, scope.chainId, scope.marketplaceContract, userAddress]);

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
        .filter((order) => order.seller.toLowerCase() === userAddress?.toLowerCase() && isOrderCompleted(order))
        .reduce((sum, order) => sum + Number(order.grossPrice), 0),

      activeOrders: orders.filter((order) =>
        order.state === OrderState.PENDING_CONFIRM
        || order.state === OrderState.PAID
        || order.state === OrderState.DISPUTED,
      ).length,

      completedDeals: orders.filter((order) => isOrderCompleted(order)).length,

      averageOrderValue: orders.length > 0
        ? orders.reduce((sum, order) => sum + Number(order.grossPrice), 0) / orders.length
        : 0,
    };
  }, [orders, userAddress]);

  return { metrics, isLoading, refresh };
}
