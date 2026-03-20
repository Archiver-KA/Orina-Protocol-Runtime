/**
 * useOrders - Backward-Compatible Order Hooks
 * ============================================
 * Re-exports from useMarketplace.ts for backward compatibility.
 * New code should import directly from useMarketplace.ts.
 *
 * Updated to match ATP v3.3-final contract signatures:
 *   - sellerConfirm now takes estDeliverySeconds param
 *   - payOrder now takes buyerSig2 param (EIP-712)
 *   - cancelOrder renamed to cancelByBuyer (cancelOrder is AutoTime-only)
 *   - cancelBySeller added for the phase-1 seller window
 *   - confirmRelease renamed to confirmDelivery (matches Solidity)
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ACTIVE_CHAIN_ID, CONTRACTS } from '@/config/contracts';
import { MARKETPLACE_ABI } from '@/config/abis';

// ── Re-export new hooks for use in existing components ────────

export {
  useCreateOrder,
  useNextOrderId,
  useOrder,
  useOrderStatus,
  useSellerConfirm,
  useConfirmDelivery,
  useCancelBySeller,
  useCancelByBuyer,
  useOpenDispute,
} from './useMarketplace';

export {
  usePayOrder,
} from './useMarketplace';

// ── Legacy Compatibility Hooks ────────────────────────────────

/**
 * @deprecated Use useConfirmDelivery from useMarketplace instead.
 * Kept for backward compatibility with confirm-release-modal.tsx
 */
export function useConfirmRelease() {
  const { data: hash, writeContractAsync, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash, chainId: ACTIVE_CHAIN_ID });

  const confirmRelease = async (orderId: bigint) => {
    return writeContractAsync({
      chainId: ACTIVE_CHAIN_ID,
      address: CONTRACTS.MARKETPLACE_ATP,
      abi: MARKETPLACE_ABI,
      functionName: 'confirmDelivery', // Updated: was 'confirmRelease', now 'confirmDelivery' in v3.3
      args: [orderId],
    });
  };

  return { confirmRelease, hash, isPending, isConfirming, isConfirmed, error };
}

/**
 * @deprecated Use useCancelByBuyer from useMarketplace instead.
 * cancelOrder in v3.3 is AUTOTIME_ROLE only. Use cancelByBuyer for buyer cancellation.
 */
export function useCancelOrder() {
  const { data: hash, writeContractAsync, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash, chainId: ACTIVE_CHAIN_ID });

  const cancelOrder = async (orderId: bigint) => {
    return writeContractAsync({
      chainId: ACTIVE_CHAIN_ID,
      address: CONTRACTS.MARKETPLACE_ATP,
      abi: MARKETPLACE_ABI,
      functionName: 'cancelByBuyer', // Updated: cancelOrder is now AUTOTIME-only
      args: [orderId],
    });
  };

  return { cancelOrder, hash, isPending, isConfirming, isConfirmed, error };
}
