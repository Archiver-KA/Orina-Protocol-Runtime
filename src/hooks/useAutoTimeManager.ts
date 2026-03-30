/**
 * useAutoTimeManager - Permissionless Timeout Execution
 * =====================================================
 * Anyone can call checkAndExecute to trigger timeouts:
 *   - Seller confirm timeout → auto cancel
 *   - Buyer pay timeout → auto cancel
 *   - Delivery timeout → auto release
 *   - Stale dispute → 50/50 split
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { AUTO_TIME_MANAGER_ABI } from '@/config/abis';
import { useProtocolDataNetwork } from './useProtocolDataNetwork';

// ── Read Hooks ────────────────────────────────────────────────

export function useAutoTimeConstants() {
  const { autoTimeManagerAddress, chainId } = useProtocolDataNetwork();
  const timeout = useReadContract({
    chainId: chainId ?? undefined,
    address: autoTimeManagerAddress,
    abi: AUTO_TIME_MANAGER_ABI,
    functionName: 'SELLER_CONFIRM_TIMEOUT',
    query: { enabled: Boolean(chainId && autoTimeManagerAddress) },
  });
  const maxBatch = useReadContract({
    chainId: chainId ?? undefined,
    address: autoTimeManagerAddress,
    abi: AUTO_TIME_MANAGER_ABI,
    functionName: 'MAX_BATCH_SIZE',
    query: { enabled: Boolean(chainId && autoTimeManagerAddress) },
  });

  return {
    sellerConfirmTimeout: timeout.data as bigint | undefined,
    maxBatchSize: maxBatch.data as bigint | undefined,
  };
}

// ── Write Hooks (Permissionless) ──────────────────────────────

/** Check and execute timeout for a single order */
export function useCheckAndExecute() {
  const { autoTimeManagerAddress, chainId } = useProtocolDataNetwork();
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const checkAndExecute = async (orderId: bigint) => {
    if (!chainId || !autoTimeManagerAddress) {
      throw new Error('Protocol network is not enabled for timeout execution');
    }
    writeContract({
      chainId,
      address: autoTimeManagerAddress,
      abi: AUTO_TIME_MANAGER_ABI,
      functionName: 'checkAndExecute',
      args: [orderId],
    });
  };

  return { checkAndExecute, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Batch check and execute for multiple orders (max 100) */
export function useBatchCheckAndExecute() {
  const { autoTimeManagerAddress, chainId } = useProtocolDataNetwork();
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const batchCheckAndExecute = async (orderIds: bigint[]) => {
    if (orderIds.length > 100) {
      throw new Error('Batch size exceeds maximum of 100');
    }
    if (!chainId || !autoTimeManagerAddress) {
      throw new Error('Protocol network is not enabled for timeout execution');
    }
    writeContract({
      chainId,
      address: autoTimeManagerAddress,
      abi: AUTO_TIME_MANAGER_ABI,
      functionName: 'batchCheckAndExecute',
      args: [orderIds],
    });
  };

  return { batchCheckAndExecute, hash, isPending, isConfirming, isConfirmed, error, reset };
}
