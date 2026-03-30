/**
 * useDisputeManager - Dispute Lifecycle Hooks
 * ============================================
 * Hooks for reading dispute state and executing dispute actions.
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { DISPUTE_MANAGER_ABI } from '@/config/abis';
import { useProtocolDataNetwork } from './useProtocolDataNetwork';

// ── Read Hooks ────────────────────────────────────────────────

/** Get dispute details for an order */
export function useDispute(orderId: bigint | undefined) {
  const { chainId, disputeManagerAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: disputeManagerAddress,
    abi: DISPUTE_MANAGER_ABI,
    functionName: 'disputes',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: Boolean(chainId && disputeManagerAddress && orderId !== undefined) },
  });
}

/** Read protocol constants */
export function useDisputeConstants() {
  const { chainId, disputeManagerAddress } = useProtocolDataNetwork();
  const period = useReadContract({
    chainId: chainId ?? undefined,
    address: disputeManagerAddress,
    abi: DISPUTE_MANAGER_ABI,
    functionName: 'DISPUTE_PERIOD',
    query: { enabled: Boolean(chainId && disputeManagerAddress) },
  });
  const feeBps = useReadContract({
    chainId: chainId ?? undefined,
    address: disputeManagerAddress,
    abi: DISPUTE_MANAGER_ABI,
    functionName: 'DISPUTE_FEE_BPS',
    query: { enabled: Boolean(chainId && disputeManagerAddress) },
  });
  const version = useReadContract({
    chainId: chainId ?? undefined,
    address: disputeManagerAddress,
    abi: DISPUTE_MANAGER_ABI,
    functionName: 'VERSION',
    query: { enabled: Boolean(chainId && disputeManagerAddress) },
  });

  return {
    disputePeriod: period.data as bigint | undefined,
    disputeFeeBps: feeBps.data as bigint | undefined,
    version: version.data as string | undefined,
  };
}

export function useDisputePhase1Deadline(orderId: bigint | undefined) {
  const { chainId, disputeManagerAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: disputeManagerAddress,
    abi: DISPUTE_MANAGER_ABI,
    functionName: 'phase1Deadline',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: Boolean(chainId && disputeManagerAddress && orderId !== undefined) },
  });
}

export function useDisputeAgreementDigest(
  orderId: bigint | undefined,
  verdict: number | undefined,
  buyerShareBps: bigint | undefined,
  sellerShareBps: bigint | undefined,
) {
  const { chainId, disputeManagerAddress } = useProtocolDataNetwork();
  const enabled =
    Boolean(chainId && disputeManagerAddress) &&
    orderId !== undefined
    && verdict !== undefined
    && buyerShareBps !== undefined
    && sellerShareBps !== undefined;

  return useReadContract({
    chainId: chainId ?? undefined,
    address: disputeManagerAddress,
    abi: DISPUTE_MANAGER_ABI,
    functionName: 'agreementDigest',
    args: enabled ? [orderId!, verdict!, buyerShareBps!, sellerShareBps!] : undefined,
    query: { enabled },
  });
}

// ── Write Hooks ───────────────────────────────────────────────

/** Arbiter extends dispute deadline by 14 days (once) */
export function useExtendDispute() {
  const { chainId, disputeManagerAddress } = useProtocolDataNetwork();
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const extendDispute = async (orderId: bigint) => {
    if (!chainId || !disputeManagerAddress) {
      throw new Error('Protocol network is not enabled for dispute actions');
    }

    return writeContractAsync({
      chainId,
      address: disputeManagerAddress,
      abi: DISPUTE_MANAGER_ABI,
      functionName: 'extendDispute',
      args: [orderId],
    });
  };

  return { extendDispute, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Mutual resolution - both parties agree to 50/50 split */
export function useResolveMutualSplit() {
  const { chainId, disputeManagerAddress } = useProtocolDataNetwork();
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const resolveMutualSplit = async (
    orderId: bigint,
    buyer: `0x${string}`,
    seller: `0x${string}`,
    buyerSig: `0x${string}`,
    sellerSig: `0x${string}`,
  ) => {
    if (!chainId || !disputeManagerAddress) {
      throw new Error('Protocol network is not enabled for dispute actions');
    }

    return writeContractAsync({
      chainId,
      address: disputeManagerAddress,
      abi: DISPUTE_MANAGER_ABI,
      functionName: 'resolveMutualSplit',
      args: [orderId, buyer, seller, buyerSig, sellerSig],
    });
  };

  return { resolveMutualSplit, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** 2/3 agreement resolution - buyer/seller/arbiter any 2 valid signatures */
export function useResolveByAgreement() {
  const { chainId, disputeManagerAddress } = useProtocolDataNetwork();
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const resolveByAgreement = async (
    orderId: bigint,
    verdict: number,
    buyerShareBps: bigint,
    sellerShareBps: bigint,
    buyerSig: `0x${string}`,
    sellerSig: `0x${string}`,
    arbiterSig: `0x${string}`,
  ) => {
    if (!chainId || !disputeManagerAddress) {
      throw new Error('Protocol network is not enabled for dispute actions');
    }

    return writeContractAsync({
      chainId,
      address: disputeManagerAddress,
      abi: DISPUTE_MANAGER_ABI,
      functionName: 'resolveByAgreement',
      args: [orderId, verdict, buyerShareBps, sellerShareBps, buyerSig, sellerSig, arbiterSig],
    });
  };

  return { resolveByAgreement, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Arbiter resolves dispute with verdict */
export function useResolveDispute() {
  const { chainId, disputeManagerAddress } = useProtocolDataNetwork();
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const resolveDispute = async (
    orderId: bigint,
    verdict: number,        // DisputeVerdict enum (1=BUYER_WINS, 2=SELLER_WINS, 3=SPLIT)
    buyerShareBps: bigint,  // Only for SPLIT
    sellerShareBps: bigint, // Only for SPLIT
  ) => {
    if (!chainId || !disputeManagerAddress) {
      throw new Error('Protocol network is not enabled for dispute actions');
    }

    return writeContractAsync({
      chainId,
      address: disputeManagerAddress,
      abi: DISPUTE_MANAGER_ABI,
      functionName: 'resolveDispute',
      args: [orderId, verdict, buyerShareBps, sellerShareBps],
    });
  };

  return { resolveDispute, hash, isPending, isConfirming, isConfirmed, error, reset };
}

/** Resolve stale dispute (after deadline passes) - permissionless-like */
export function useResolveStaleDispute() {
  const { chainId, disputeManagerAddress } = useProtocolDataNetwork();
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const resolveStaleDispute = async (orderId: bigint) => {
    if (!chainId || !disputeManagerAddress) {
      throw new Error('Protocol network is not enabled for dispute actions');
    }

    return writeContractAsync({
      chainId,
      address: disputeManagerAddress,
      abi: DISPUTE_MANAGER_ABI,
      functionName: 'resolveStaleDispute',
      args: [orderId],
    });
  };

  return { resolveStaleDispute, hash, isPending, isConfirming, isConfirmed, error, reset };
}
