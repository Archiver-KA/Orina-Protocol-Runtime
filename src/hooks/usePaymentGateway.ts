/**
 * usePaymentGateway - Escrow & Fund Status
 * =========================================
 * Read-only hooks for escrow state display.
 * Write functions are only callable by MARKETPLACE_ROLE (internal).
 */

import { useReadContract } from 'wagmi';
import { PAYMENT_GATEWAY_ABI, ERC20_ABI } from '@/config/abis';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useProtocolDataNetwork } from './useProtocolDataNetwork';

// ── Read Hooks ────────────────────────────────────────────────

/** Get escrow details for an order */
export function useEscrow(orderId: bigint | undefined) {
  const { chainId, paymentGatewayAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: paymentGatewayAddress,
    abi: PAYMENT_GATEWAY_ABI,
    functionName: 'escrows',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: Boolean(chainId && paymentGatewayAddress && orderId !== undefined) },
  });
}

/** Get total escrowed amount for a specific token */
export function useTotalEscrowed(token: `0x${string}` | undefined) {
  const { chainId, paymentGatewayAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: paymentGatewayAddress,
    abi: PAYMENT_GATEWAY_ABI,
    functionName: 'totalEscrowedByToken',
    args: token ? [token] : undefined,
    query: { enabled: Boolean(chainId && paymentGatewayAddress && token) },
  });
}

/** Get fee vault address */
export function useFeeVault() {
  const { chainId, paymentGatewayAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: paymentGatewayAddress,
    abi: PAYMENT_GATEWAY_ABI,
    functionName: 'feeVault',
    query: { enabled: Boolean(chainId && paymentGatewayAddress) },
  });
}

// ── ERC20 Token Hooks (for payment token interactions) ────────

/** Check ERC20 allowance for PaymentGateway */
export function useTokenAllowance(token: `0x${string}` | undefined, owner: `0x${string}` | undefined) {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: token,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: owner && token && marketplaceAddress ? [owner, marketplaceAddress] : undefined,
    query: { enabled: Boolean(chainId && token && owner && marketplaceAddress) },
  });
}

/** Get ERC20 token balance */
export function useTokenBalance(token: `0x${string}` | undefined, account: `0x${string}` | undefined) {
  const { chainId } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: token,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: Boolean(chainId && token && account) },
  });
}

/** Approve ERC20 token for PaymentGateway spending */
export function useApproveToken() {
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const approve = async (token: `0x${string}`, amount: bigint) => {
    if (!chainId || !marketplaceAddress) {
      throw new Error('Protocol network is not enabled for token approvals');
    }

    writeContract({
      chainId,
      address: token,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [marketplaceAddress, amount],
    });
  };

  return { approve, hash, isPending, isConfirming, isConfirmed, error, reset };
}
