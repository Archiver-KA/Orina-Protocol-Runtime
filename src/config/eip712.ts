/**
 * EIP-712 Configuration for DSCA 3-Signature Protocol
 * ====================================================
 * Matches the Solidity EIP712("MarketplaceATP", VERSION) domain
 * and ORDER_TYPEHASH used in sellerConfirm() and payOrder().
 *
 * DSCA Flow:
 *   Sig 1: Buyer proposes order → signed off-chain, passed to createOrder()
 *   Sig 2: Seller confirms with estDeliverySeconds → sellerConfirm() verifies on-chain
 *   Sig 3: Buyer accepts seller's estDeliverySeconds → payOrder() verifies all 3 on-chain
 */

import { CONTRACTS, ACTIVE_CHAIN_ID } from './contracts';

// ── EIP-712 Domain ────────────────────────────────────────────
// Must match: EIP712("MarketplaceATP", "3.3-final") in Solidity
export const EIP712_DOMAIN = {
  name: 'MarketplaceATP',
  version: '3.3-final',
  chainId: ACTIVE_CHAIN_ID,
  verifyingContract: CONTRACTS.MARKETPLACE_ATP,
} as const;

// ── EIP-712 Types ─────────────────────────────────────────────
// Must match: ORDER_TYPEHASH = keccak256("Order(uint256 orderId,address buyer,address seller,uint256 grossPrice,uint256 amount,uint256 estDeliverySeconds)")
export const ORDER_TYPES = {
  Order: [
    { name: 'orderId', type: 'uint256' },
    { name: 'buyer', type: 'address' },
    { name: 'seller', type: 'address' },
    { name: 'grossPrice', type: 'uint256' },
    { name: 'amount', type: 'uint256' },
    { name: 'estDeliverySeconds', type: 'uint256' },
  ],
} as const;

// ── Mutual Split EIP-712 Types (DisputeManager) ──────────────
// Must match: MUTUAL_SPLIT_TYPEHASH = keccak256("MutualSplit(uint256 orderId,uint256 deadline)")
// Note: DisputeManager uses a simple digest, not EIP-712 with domain separator.
// It uses: keccak256(abi.encodePacked("\x19\x01", block.chainid, keccak256(abi.encode(MUTUAL_SPLIT_TYPEHASH, orderId, d.deadline))))
// This is a custom EIP-191 + chainId scheme, not standard EIP-712.
export const MUTUAL_SPLIT_TYPES = {
  MutualSplit: [
    { name: 'orderId', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

// ── Helper: Build order message for signing ───────────────────
export interface OrderSignMessage {
  orderId: bigint;
  buyer: `0x${string}`;
  seller: `0x${string}`;
  grossPrice: bigint;
  amount: bigint;
  estDeliverySeconds: bigint;
}

/**
 * Build the EIP-712 typed data object for signing an order.
 * Used by:
 *   - Buyer (Sig 1): Before createOrder (orderId may be predicted from nextOrderId)
 *   - Seller (Sig 2): During sellerConfirm (orderId known, seller sets estDeliverySeconds)
 *   - Buyer (Sig 3): During payOrder (orderId known, accepts seller's estDeliverySeconds)
 */
export function buildOrderTypedData(message: OrderSignMessage) {
  return {
    domain: EIP712_DOMAIN,
    types: ORDER_TYPES,
    primaryType: 'Order' as const,
    message: {
      orderId: message.orderId,
      buyer: message.buyer,
      seller: message.seller,
      grossPrice: message.grossPrice,
      amount: message.amount,
      estDeliverySeconds: message.estDeliverySeconds,
    },
  };
}

/**
 * Build the mutual split digest for signing in DisputeManager.
 * Note: This uses a custom scheme, not standard EIP-712.
 * The frontend needs to sign a message that hashes to the same digest as the contract.
 * 
 * Solidity: keccak256(abi.encodePacked("\x19\x01", block.chainid, keccak256(abi.encode(MUTUAL_SPLIT_TYPEHASH, orderId, deadline))))
 * 
 * For wagmi signMessage, we construct the raw bytes and use personal_sign.
 * For more accurate signing, use viem's custom signing utilities.
 */
export interface MutualSplitSignMessage {
  orderId: bigint;
  deadline: bigint;
}
