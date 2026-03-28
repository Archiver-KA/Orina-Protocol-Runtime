/**
 * Orina ATP Protocol v3.4-m2m - TypeScript Types
 * ==============================================
 * Matching current Solidity structs and enums for type-safe frontend.
 */

import {
  OrderState,
  SettlementType,
  OrderStatus,
  AssetType,
  DisputeVerdict,
  ShippingType,
} from '@/config/contracts';

// Re-export enums for convenience
export {
  OrderState,
  SettlementType,
  OrderStatus,
  AssetType,
  DisputeVerdict,
  ShippingType,
};

// ── MarketplaceATP ────────────────────────────────────────────

export interface SplitSettlement {
  buyerShareBps: bigint;
  sellerShareBps: bigint;
}

export interface Order {
  buyer: `0x${string}`;
  seller: `0x${string}`;
  payer: `0x${string}`;
  refundRecipient: `0x${string}`;
  paymentToken: `0x${string}`;
  assetId: bigint;
  amount: bigint;
  grossPrice: bigint;
  proposedAt: bigint;
  paidAt: bigint;
  autoReleaseAt: bigint;
  estDeliverySeconds: bigint;
  payDeadline: bigint;
  state: OrderState;
  settlementType: SettlementType;
  split: SplitSettlement;
  platformFeeBpsSnapshot: bigint;
  daoFeeBpsSnapshot: bigint;
  burnFeeBpsSnapshot: bigint;
  referralFeeBpsSnapshot: bigint;
  finalized: boolean;
  sellerConfirmed: boolean;
  buyerSig1: `0x${string}`;
  sellerSig: `0x${string}`;
  buyerSig2: `0x${string}`;
}

/** Client-derived order status view used by frontend hooks */
export interface OrderStatusResult {
  status: OrderStatus;
  remainingTime: bigint;
  statusText: string;
}

// ── OrinaRWA ──────────────────────────────────────────────────

export interface Asset {
  seller: `0x${string}`;
  unitId: bigint;
  totalAmount: bigint;
  availableAmount: bigint;
  consumedAmount: bigint;
  active: boolean;
  expiryAt: bigint;
  finalized: boolean;
  assetType: AssetType;
}

export interface LockedAmount {
  amount: bigint;
  lockedAt: bigint;
}

// ── RWAReceiptNFT ─────────────────────────────────────────────

export interface Receipt {
  orderId: bigint;
  assetId: bigint;
  amount: bigint;
  assetType: AssetType;
}

// ── DisputeManager ────────────────────────────────────────────

export interface Dispute {
  active: boolean;
  verdict: DisputeVerdict;
  openedAt: bigint;
  deadline: bigint;
  extended: boolean;
  buyerShareBps: bigint;
  sellerShareBps: bigint;
}

// ── PaymentGateway ────────────────────────────────────────────

export interface Escrow {
  token: `0x${string}`;
  buyer: `0x${string}`;
  payer: `0x${string}`;
  refundRecipient: `0x${string}`;
  amount: bigint;
}

export interface OrderFunding {
  buyer: `0x${string}`;
  payer: `0x${string}`;
  refundRecipient: `0x${string}`;
}

export interface DelegationSession {
  root: `0x${string}`;
  delegate: `0x${string}`;
  payerVault: `0x${string}`;
  paymentToken: `0x${string}`;
  maxPerOrder: bigint;
  maxTotal: bigint;
  spentTotal: bigint;
  validFrom: bigint;
  validUntil: bigint;
  actionMask: bigint;
  sessionEpoch: bigint;
  counterpartyAllowlistHash: `0x${string}`;
  status: bigint;
  exists: boolean;
}

// ── UnitRegistry ──────────────────────────────────────────────

export interface Unit {
  name: string;
  step: bigint;
  minAmount: bigint;
  active: boolean;
  locked: boolean;
}

// ── ShippingRegistry ──────────────────────────────────────────

export interface ShippingOption {
  shipType: ShippingType;
  estTimeMin: bigint;
  estTimeMax: bigint;
  feeBps: bigint;
  active: boolean;
}

// ── FeeManager ────────────────────────────────────────────────

export interface FeeBreakdown {
  platform: bigint;
  dao: bigint;
  burn: bigint;
}

export interface FeeRates {
  platformFeeBps: bigint;
  daoFeeBps: bigint;
  burnFeeBps: bigint;
  totalFeeBps: bigint;
}

// ── DSCA Signature Data ───────────────────────────────────────

export interface DSCASignatures {
  buyerSig1: `0x${string}` | null;
  sellerSig: `0x${string}` | null;
  buyerSig2: `0x${string}` | null;
}

export interface DSCAProgress {
  step: 1 | 2 | 3;
  label: string;
  signed: boolean;
}

// ── Frontend-enriched Order ───────────────────────────────────
// Extended with computed fields for UI

export interface EnrichedOrder extends Order {
  orderId: bigint;
  // Computed fields
  statusResult?: OrderStatusResult;
  dispute?: Dispute;
  escrow?: Escrow;
  assetName?: string;
  assetImage?: string;
  // DSCA progress
  dscaProgress: DSCAProgress[];
  // Time helpers
  sellerConfirmDeadline: bigint;
  isExpired: boolean;
}
