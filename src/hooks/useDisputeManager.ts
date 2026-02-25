/**
 * useDisputeManager - Dispute Lifecycle Hooks
 * ============================================
 * Hooks for reading dispute state and executing dispute actions.
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { DISPUTE_MANAGER_ABI } from '@/config/abis';

// ── Read Hooks ────────────────────────────────────────────────

/** Get dispute details for an order */
export function useDispute(orderId: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.DISPUTE_MANAGER,
    abi: DISPUTE_MANAGER_ABI,
    functionName: 'disputes',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: orderId !== undefined },
  });
}

/** Read protocol constants */
export function useDisputeConstants() {
  const period = useReadContract({
    address: CONTRACTS.DISPUTE_MANAGER,
    abi: DISPUTE_MANAGER_ABI,
    functionName: 'DISPUTE_PERIOD',
  });
  const feeBps = useReadContract({
    address: CONTRACTS.DISPUTE_MANAGER,
    abi: DISPUTE_MANAGER_ABI,
    functionName: 'DISPUTE_FEE_BPS',
  });

  return {
    disputePeriod: period.data as bigint | undefined,
    disputeFeeBps: feeBps.data as bigint | undefined,
  };
}

// ── Write Hooks ───────────────────────────────────────────────

/** Arbiter extends dispute deadline by 14 days (once) */
export function useExtendDispute() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const extendDispute = async (orderId: bigint) => {
    writeContract({
      address: CONTRACTS.DISPUTE_MANAGER,
      abi: DISPUTE_MANAGER_ABI,
      functionName: 'extendDispute',
      args: [orderId],
    });
  };

  return { extendDispute, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Mutual resolution - both parties agree to 50/50 split */
export function useResolveMutualSplit() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const resolveMutualSplit = async (
    orderId: bigint,
    buyer: `0x${string}`,
    seller: `0x${string}`,
    buyerSig: `0x${string}`,
    sellerSig: `0x${string}`,
  ) => {
    writeContract({
      address: CONTRACTS.DISPUTE_MANAGER,
      abi: DISPUTE_MANAGER_ABI,
      functionName: 'resolveMutualSplit',
      args: [orderId, buyer, seller, buyerSig, sellerSig],
    });
  };

  return { resolveMutualSplit, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Arbiter resolves dispute with verdict */
export function useResolveDispute() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const resolveDispute = async (
    orderId: bigint,
    verdict: number,        // DisputeVerdict enum (1=BUYER_WINS, 2=SELLER_WINS, 3=SPLIT)
    buyerShareBps: bigint,  // Only for SPLIT
    sellerShareBps: bigint, // Only for SPLIT
  ) => {
    writeContract({
      address: CONTRACTS.DISPUTE_MANAGER,
      abi: DISPUTE_MANAGER_ABI,
      functionName: 'resolveDispute',
      args: [orderId, verdict, buyerShareBps, sellerShareBps],
    });
  };

  return { resolveDispute, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Resolve stale dispute (after deadline passes) - permissionless-like */
export function useResolveStaleDispute() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const resolveStaleDispute = async (orderId: bigint) => {
    writeContract({
      address: CONTRACTS.DISPUTE_MANAGER,
      abi: DISPUTE_MANAGER_ABI,
      functionName: 'resolveStaleDispute',
      args: [orderId],
    });
  };

  return { resolveStaleDispute, hash, isPending, isConfirming, isConfirmed, error, reset };
}
