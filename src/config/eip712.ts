/**
 * EIP-712 Configuration for DSCA 3-Signature Protocol
 * ====================================================
 * Matches the Solidity EIP712("MarketplaceATP", VERSION) domain
 * and ORDER_TYPEHASH used across createOrder(), sellerConfirm(), and payOrder().
 *
 * DSCA Flow:
 *   Sig 1: Buyer proposes order → signed off-chain, passed to createOrder()
 *   Sig 2: Seller confirms or revises estDeliverySeconds → sellerConfirm() verifies on-chain
 *   Sig 3: Buyer re-accepts seller's revised estDeliverySeconds → payOrder() verifies on-chain only when seller changed time
 */

import { CONTRACTS, ACTIVE_CHAIN_ID } from './contracts';

// ── EIP-712 Domain ────────────────────────────────────────────
// Must match: EIP712("MarketplaceATP", VERSION) in Solidity
// MarketplaceATP.sol: string public constant VERSION = "3.4"
export const ORDER_DOMAIN_NAME = 'MarketplaceATP' as const;
export const ORDER_DOMAIN_VERSION = '3.4' as const;

export function getOrderEip712Domain(
  chainId: number,
  verifyingContract: `0x${string}`,
) {
  return {
    name: ORDER_DOMAIN_NAME,
    version: ORDER_DOMAIN_VERSION,
    chainId,
    verifyingContract,
  } as const;
}

export const EIP712_DOMAIN = getOrderEip712Domain(ACTIVE_CHAIN_ID, CONTRACTS.MARKETPLACE_ATP);

// ── EIP-712 Types ─────────────────────────────────────────────
// Must match:
// ORDER_TYPEHASH = keccak256(
//   "Order(uint256 orderId,address buyer,address seller,address paymentToken,uint256 assetId,uint256 grossPrice,uint256 amount,uint256 estDeliverySeconds)"
// )
export const ORDER_TYPES = {
  Order: [
    { name: 'orderId', type: 'uint256' },
    { name: 'buyer', type: 'address' },
    { name: 'seller', type: 'address' },
    { name: 'paymentToken', type: 'address' },
    { name: 'assetId', type: 'uint256' },
    { name: 'grossPrice', type: 'uint256' },
    { name: 'amount', type: 'uint256' },
    { name: 'estDeliverySeconds', type: 'uint256' },
  ],
} as const;

// ── Mutual Split EIP-712 Types (DisputeManager) ──────────────
// Must match:
// MUTUAL_SPLIT_TYPEHASH = keccak256("MutualSplit(uint256 orderId,uint256 openedAt,uint256 deadline)")
export const MUTUAL_SPLIT_TYPES = {
  MutualSplit: [
    { name: 'orderId', type: 'uint256' },
    { name: 'openedAt', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

// ── Dispute Agreement EIP-712 Types (DisputeManager v3.4) ───
// Must match: keccak256("DisputeAgreement(uint256 orderId,uint8 verdict,uint256 buyerShareBps,uint256 sellerShareBps,uint256 openedAt)")
export const DISPUTE_AGREEMENT_DOMAIN_NAME = 'DisputeManager' as const;
export const DISPUTE_AGREEMENT_DOMAIN_VERSION = '3.4' as const;

export function getDisputeAgreementDomain(
  chainId: number,
  verifyingContract: `0x${string}`,
) {
  return {
    name: DISPUTE_AGREEMENT_DOMAIN_NAME,
    version: DISPUTE_AGREEMENT_DOMAIN_VERSION,
    chainId,
    verifyingContract,
  } as const;
}

export const DISPUTE_AGREEMENT_DOMAIN = getDisputeAgreementDomain(
  ACTIVE_CHAIN_ID,
  CONTRACTS.DISPUTE_MANAGER,
);

export const DISPUTE_AGREEMENT_TYPES = {
  DisputeAgreement: [
    { name: 'orderId', type: 'uint256' },
    { name: 'verdict', type: 'uint8' },
    { name: 'buyerShareBps', type: 'uint256' },
    { name: 'sellerShareBps', type: 'uint256' },
    { name: 'openedAt', type: 'uint256' },
  ],
} as const;

// ── Helper: Build order message for signing ───────────────────
export interface OrderSignMessage {
  orderId: bigint;
  buyer: `0x${string}`;
  seller: `0x${string}`;
  paymentToken: `0x${string}`;
  assetId: bigint;
  grossPrice: bigint;
  amount: bigint;
  estDeliverySeconds: bigint;
}

/**
 * Build the EIP-712 typed data object for signing an order.
 * Used by:
 *   - Buyer (Sig 1): Before createOrder (orderId may be predicted from nextOrderId)
 *   - Seller (Sig 2): During sellerConfirm (orderId known, seller can keep or revise estDeliverySeconds)
 *   - Buyer (Sig 3): During payOrder only if seller revised estDeliverySeconds
 */
export function buildOrderTypedData(
  message: OrderSignMessage,
  options?: {
    chainId?: number;
    verifyingContract?: `0x${string}`;
  },
) {
  const domain = options?.chainId && options?.verifyingContract
    ? getOrderEip712Domain(options.chainId, options.verifyingContract)
    : EIP712_DOMAIN;
  return {
    domain,
    types: ORDER_TYPES,
    primaryType: 'Order' as const,
    message: {
      orderId: message.orderId,
      buyer: message.buyer,
      seller: message.seller,
      paymentToken: message.paymentToken,
      assetId: message.assetId,
      grossPrice: message.grossPrice,
      amount: message.amount,
      estDeliverySeconds: message.estDeliverySeconds,
    },
  };
}

export interface MutualSplitSignMessage {
  orderId: bigint;
  openedAt: bigint;
  deadline: bigint;
}

export function buildMutualSplitTypedData(
  message: MutualSplitSignMessage,
  options?: {
    chainId?: number;
    verifyingContract?: `0x${string}`;
  },
) {
  const domain = options?.chainId && options?.verifyingContract
    ? getDisputeAgreementDomain(options.chainId, options.verifyingContract)
    : DISPUTE_AGREEMENT_DOMAIN;
  return {
    domain,
    types: MUTUAL_SPLIT_TYPES,
    primaryType: 'MutualSplit' as const,
    message: {
      orderId: message.orderId,
      openedAt: message.openedAt,
      deadline: message.deadline,
    },
  };
}

export interface DisputeAgreementSignMessage {
  orderId: bigint;
  verdict: number;
  buyerShareBps: bigint;
  sellerShareBps: bigint;
  openedAt: bigint;
}

export function buildDisputeAgreementTypedData(
  message: DisputeAgreementSignMessage,
  options?: {
    chainId?: number;
    verifyingContract?: `0x${string}`;
  },
) {
  const domain = options?.chainId && options?.verifyingContract
    ? getDisputeAgreementDomain(options.chainId, options.verifyingContract)
    : DISPUTE_AGREEMENT_DOMAIN;
  return {
    domain,
    types: DISPUTE_AGREEMENT_TYPES,
    primaryType: 'DisputeAgreement' as const,
    message: {
      orderId: message.orderId,
      verdict: message.verdict,
      buyerShareBps: message.buyerShareBps,
      sellerShareBps: message.sellerShareBps,
      openedAt: message.openedAt,
    },
  };
}
