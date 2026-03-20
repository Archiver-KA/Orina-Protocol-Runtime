/**
 * useEIP712Sign - DSCA 3-Signature Generation
 * ============================================
 * Implements EIP-712 typed data signing for the ATP protocol.
 *
 * DSCA Flow:
 *   Sig 1 (Buyer): Sign proposed order + delivery time → pass to createOrder()
 *   Sig 2 (Seller): Sign accepted/revised delivery time → pass to sellerConfirm()
 *   Sig 3 (Buyer): Sign again only if seller revised delivery time → pass to payOrder()
 *
 * All 3 signatures sign the same ORDER_TYPEHASH structure:
 *   Order(orderId, buyer, seller, grossPrice, amount, estDeliverySeconds)
 *
 * createOrder() verifies Buyer Sig #1 on the initial digest.
 * sellerConfirm() verifies Seller Sig #2 on the seller-selected digest.
 * payOrder() only verifies Buyer Sig #3 when the seller changed the delivery time.
 */

import { useSignTypedData, useAccount, useReadContract } from 'wagmi';
import { useState, useCallback } from 'react';
import {
  buildDisputeAgreementTypedData,
  EIP712_DOMAIN,
  ORDER_TYPES,
  type DisputeAgreementSignMessage,
  type OrderSignMessage,
} from '@/config/eip712';
import { ACTIVE_CHAIN_ID, CONTRACTS } from '@/config/contracts';
import { MARKETPLACE_ABI } from '@/config/abis';
import { getWalletErrorMessage } from '@/utils/walletErrors';

// ── Types ─────────────────────────────────────────────────────

export interface SignResult {
  signature: `0x${string}` | null;
  isPending: boolean;
  error: Error | null;
}

// ── Hook: Sign Order (Generic) ────────────────────────────────

export function useSignOrder() {
  const { signTypedDataAsync } = useSignTypedData();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [signature, setSignature] = useState<`0x${string}` | null>(null);

  const signOrder = useCallback(async (message: OrderSignMessage): Promise<`0x${string}`> => {
    setIsPending(true);
    setError(null);
    setSignature(null);

    try {
      const sig = await signTypedDataAsync({
        domain: {
          name: EIP712_DOMAIN.name,
          version: EIP712_DOMAIN.version,
          chainId: BigInt(EIP712_DOMAIN.chainId),
          verifyingContract: EIP712_DOMAIN.verifyingContract,
        },
        types: ORDER_TYPES,
        primaryType: 'Order',
        message: {
          orderId: message.orderId,
          buyer: message.buyer,
          seller: message.seller,
          grossPrice: message.grossPrice,
          amount: message.amount,
          estDeliverySeconds: message.estDeliverySeconds,
        },
      });

      setSignature(sig);
      return sig;
    } catch (err) {
      const error = new Error(getWalletErrorMessage(err, 'Signing failed'));
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, [signTypedDataAsync]);

  return {
    signOrder,
    signature,
    isPending,
    error,
    reset: () => {
      setSignature(null);
      setError(null);
    },
  };
}

// ── Hook: Buyer Sig 1 (Create Order) ──────────────────────────

export function useBuyerSign1() {
  const { address } = useAccount();
  const { signOrder, signature, isPending, error, reset } = useSignOrder();

  // Get nextOrderId to predict the orderId for signing
  const { data: nextOrderId } = useReadContract({
    chainId: ACTIVE_CHAIN_ID,
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    functionName: 'nextOrderId',
  });

  const sign = useCallback(async (params: {
    seller: `0x${string}`;
    grossPrice: bigint;
    amount: bigint;
    estDeliverySeconds: bigint;
  }): Promise<`0x${string}`> => {
    if (!address) throw new Error('Wallet not connected');
    if (nextOrderId === undefined) throw new Error('Cannot read nextOrderId');

    return signOrder({
      orderId: nextOrderId as bigint,
      buyer: address,
      seller: params.seller,
      grossPrice: params.grossPrice,
      amount: params.amount,
      estDeliverySeconds: params.estDeliverySeconds,
    });
  }, [address, nextOrderId, signOrder]);

  return {
    sign,
    signature,
    isPending,
    error,
    reset,
    predictedOrderId: nextOrderId as bigint | undefined,
  };
}

// ── Hook: Seller Sig 2 (Confirm Order) ────────────────────────

export function useSellerSign2() {
  const { address } = useAccount();
  const { signOrder, signature, isPending, error, reset } = useSignOrder();

  const sign = useCallback(async (params: {
    orderId: bigint;
    buyer: `0x${string}`;
    grossPrice: bigint;
    amount: bigint;
    estDeliverySeconds: bigint;  // Seller sets this
  }): Promise<`0x${string}`> => {
    if (!address) throw new Error('Wallet not connected');

    return signOrder({
      orderId: params.orderId,
      buyer: params.buyer,
      seller: address,
      grossPrice: params.grossPrice,
      amount: params.amount,
      estDeliverySeconds: params.estDeliverySeconds,
    });
  }, [address, signOrder]);

  return { sign, signature, isPending, error, reset };
}

// ── Hook: Buyer Sig 3 (Pay Order - Accept Delivery Time) ──────

export function useBuyerSign3() {
  const { address } = useAccount();
  const { signOrder, signature, isPending, error, reset } = useSignOrder();

  const sign = useCallback(async (params: {
    orderId: bigint;
    seller: `0x${string}`;
    grossPrice: bigint;
    amount: bigint;
    estDeliverySeconds: bigint;  // Must match seller's estDeliverySeconds
  }): Promise<`0x${string}`> => {
    if (!address) throw new Error('Wallet not connected');

    return signOrder({
      orderId: params.orderId,
      buyer: address,
      seller: params.seller,
      grossPrice: params.grossPrice,
      amount: params.amount,
      estDeliverySeconds: params.estDeliverySeconds,
    });
  }, [address, signOrder]);

  return { sign, signature, isPending, error, reset };
}

// ── Hook: Dispute Agreement Signature ────────────────────────

export function useDisputeAgreementSign() {
  const { signTypedDataAsync } = useSignTypedData();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [signature, setSignature] = useState<`0x${string}` | null>(null);

  const sign = useCallback(async (message: DisputeAgreementSignMessage): Promise<`0x${string}`> => {
    setIsPending(true);
    setError(null);
    setSignature(null);

    try {
      const typedData = buildDisputeAgreementTypedData(message);
      const sig = await signTypedDataAsync({
        domain: {
          name: typedData.domain.name,
          version: typedData.domain.version,
          chainId: BigInt(typedData.domain.chainId),
          verifyingContract: typedData.domain.verifyingContract,
        },
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      });

      setSignature(sig);
      return sig;
    } catch (err) {
      const nextError = new Error(getWalletErrorMessage(err, 'Dispute agreement signing failed'));
      setError(nextError);
      throw nextError;
    } finally {
      setIsPending(false);
    }
  }, [signTypedDataAsync]);

  return {
    sign,
    signature,
    isPending,
    error,
    reset: () => {
      setSignature(null);
      setError(null);
    },
  };
}
