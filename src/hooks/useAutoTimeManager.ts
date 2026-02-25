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
import { CONTRACTS } from '@/config/contracts';
import { AUTO_TIME_MANAGER_ABI } from '@/config/abis';

// ── Read Hooks ────────────────────────────────────────────────

export function useAutoTimeConstants() {
  const timeout = useReadContract({
    address: CONTRACTS.AUTOTIME_MANAGER,
    abi: AUTO_TIME_MANAGER_ABI,
    functionName: 'SELLER_CONFIRM_TIMEOUT',
  });
  const maxBatch = useReadContract({
    address: CONTRACTS.AUTOTIME_MANAGER,
    abi: AUTO_TIME_MANAGER_ABI,
    functionName: 'MAX_BATCH_SIZE',
  });

  return {
    sellerConfirmTimeout: timeout.data as bigint | undefined,
    maxBatchSize: maxBatch.data as bigint | undefined,
  };
}

// ── Write Hooks (Permissionless) ──────────────────────────────

/** Check and execute timeout for a single order */
export function useCheckAndExecute() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const checkAndExecute = async (orderId: bigint) => {
    writeContract({
      address: CONTRACTS.AUTOTIME_MANAGER,
      abi: AUTO_TIME_MANAGER_ABI,
      functionName: 'checkAndExecute',
      args: [orderId],
    });
  };

  return { checkAndExecute, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Batch check and execute for multiple orders (max 100) */
export function useBatchCheckAndExecute() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const batchCheckAndExecute = async (orderIds: bigint[]) => {
    if (orderIds.length > 100) {
      throw new Error('Batch size exceeds maximum of 100');
    }
    writeContract({
      address: CONTRACTS.AUTOTIME_MANAGER,
      abi: AUTO_TIME_MANAGER_ABI,
      functionName: 'batchCheckAndExecute',
      args: [orderIds],
    });
  };

  return { batchCheckAndExecute, hash, isPending, isConfirming, isConfirmed, error, reset };
}
