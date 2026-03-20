/**
 * usePayOrder - Pay Order Hook (Backward Compatible)
 * ===================================================
 * Updated for ATP v3.4: payOrder is only used when seller revised the delivery time,
 * and now requires Buyer Sig #3 (EIP-712).
 * This wrapper maintains the old API for pay-order-modal.tsx.
 *
 * New code should use usePayOrder from useMarketplace.ts directly.
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MARKETPLACE_ABI } from '@/config/abis';
import { ACTIVE_CHAIN_ID, CONTRACTS } from '@/config/contracts';

export function usePayOrder() {
  const {
    data: hash,
    isPending,
    writeContract,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash, chainId: ACTIVE_CHAIN_ID });

  /**
   * Pay order with Buyer Sig #3.
   *
   * In ATP v3.4, Buyer Sig #3 is required only when the seller changed
   * the delivery time. Same-time seller confirmation now auto-pays on-chain.
   *
   * @param orderId - Order to pay
   * @param grossPrice - Kept for backward compat, not used by the contract
   * @param buyerSig2 - EIP-712 buyer signature on the revised delivery time
   */
  const payOrder = async (orderId: bigint, grossPrice: bigint, buyerSig2?: `0x${string}`) => {
    try {
      if (!buyerSig2) {
        throw new Error('Buyer Sig #3 is required when seller revises the delivery time');
      }

      await writeContract({
        chainId: ACTIVE_CHAIN_ID,
        address: CONTRACTS.MARKETPLACE_ATP,
        abi: MARKETPLACE_ABI,
        functionName: 'payOrder',
        args: [orderId, buyerSig2],
      });
    } catch (err) {
      console.error('Failed to pay order:', err);
      throw err;
    }
  };

  return {
    payOrder,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error: writeError || confirmError,
  };
}
