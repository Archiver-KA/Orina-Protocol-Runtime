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
import { MARKETPLACE_ABI } from '@/config/abis';
import { useProtocolDataNetwork } from './useProtocolDataNetwork';

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
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  const { data: hash, writeContractAsync, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const confirmRelease = async (orderId: bigint) => {
    if (!chainId || !marketplaceAddress) {
      throw new Error('Protocol network is not enabled for release confirmation');
    }

    return writeContractAsync({
      chainId,
      address: marketplaceAddress,
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
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  const { data: hash, writeContractAsync, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: chainId ?? undefined,
  });

  const cancelOrder = async (orderId: bigint) => {
    if (!chainId || !marketplaceAddress) {
      throw new Error('Protocol network is not enabled for order cancellation');
    }

    return writeContractAsync({
      chainId,
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: 'cancelByBuyer', // Updated: cancelOrder is now AUTOTIME-only
      args: [orderId],
    });
  };

  return { cancelOrder, hash, isPending, isConfirming, isConfirmed, error };
}
