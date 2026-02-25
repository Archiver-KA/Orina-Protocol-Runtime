/**
 * usePaymentGateway - Escrow & Fund Status
 * =========================================
 * Read-only hooks for escrow state display.
 * Write functions are only callable by MARKETPLACE_ROLE (internal).
 */

import { useReadContract } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { PAYMENT_GATEWAY_ABI, ERC20_ABI } from '@/config/abis';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// ── Read Hooks ────────────────────────────────────────────────

/** Get escrow details for an order */
export function useEscrow(orderId: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.PAYMENT_GATEWAY,
    abi: PAYMENT_GATEWAY_ABI,
    functionName: 'escrows',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: orderId !== undefined },
  });
}

/** Get total escrowed amount for a specific token */
export function useTotalEscrowed(token: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.PAYMENT_GATEWAY,
    abi: PAYMENT_GATEWAY_ABI,
    functionName: 'totalEscrowedByToken',
    args: token ? [token] : undefined,
    query: { enabled: !!token },
  });
}

/** Get fee vault address */
export function useFeeVault() {
  return useReadContract({
    address: CONTRACTS.PAYMENT_GATEWAY,
    abi: PAYMENT_GATEWAY_ABI,
    functionName: 'feeVault',
  });
}

// ── ERC20 Token Hooks (for payment token interactions) ────────

/** Check ERC20 allowance for PaymentGateway */
export function useTokenAllowance(token: `0x${string}` | undefined, owner: `0x${string}` | undefined) {
  return useReadContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: owner && token ? [owner, CONTRACTS.MARKETPLACE_ATP] : undefined,
    query: { enabled: !!token && !!owner },
  });
}

/** Get ERC20 token balance */
export function useTokenBalance(token: `0x${string}` | undefined, account: `0x${string}` | undefined) {
  return useReadContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: !!token && !!account },
  });
}

/** Approve ERC20 token for PaymentGateway spending */
export function useApproveToken() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const approve = async (token: `0x${string}`, amount: bigint) => {
    writeContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.MARKETPLACE_ATP, amount],
    });
  };

  return { approve, hash, isPending, isConfirming, isConfirmed, error, reset };
}
