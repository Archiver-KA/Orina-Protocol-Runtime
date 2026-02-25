/**
 * usePayOrder - Pay Order Hook (Backward Compatible)
 * ===================================================
 * Updated for ATP v3.3-final: payOrder now requires buyerSig2 (EIP-712).
 * This wrapper maintains the old API for pay-order-modal.tsx.
 *
 * New code should use usePayOrder from useMarketplace.ts directly.
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MARKETPLACE_ABI } from '@/config/abis';
import { CONTRACTS } from '@/config/contracts';

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
  } = useWaitForTransactionReceipt({ hash });

  /**
   * Pay order with DSCA Sig 3.
   *
   * In ATP v3.3, the buyer must provide buyerSig2 (EIP-712 signature
   * accepting seller's estDeliverySeconds). If no sig provided, falls back
   * to a placeholder - this will fail on-chain but maintains UI compatibility.
   *
   * @param orderId - Order to pay
   * @param grossPrice - Gross price (kept for backward compat, not used in v3.3 as it's ERC20-based)
   * @param buyerSig2 - Optional EIP-712 signature (Sig 3)
   */
  const payOrder = async (orderId: bigint, grossPrice: bigint, buyerSig2?: `0x${string}`) => {
    try {
      const sig = buyerSig2 || '0x' as `0x${string}`;

      await writeContract({
        address: CONTRACTS.MARKETPLACE_ATP,
        abi: MARKETPLACE_ABI,
        functionName: 'payOrder',
        args: [orderId, sig],
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
