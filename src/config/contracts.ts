/**
 * Orina ATP Protocol v3.3-final - Contract Configuration
 * ======================================================
 * All contract addresses for BSC deployment.
 * Update these after deploying to BSC mainnet/testnet.
 */

// ── Contract Addresses ────────────────────────────────────────
// TODO: Replace with actual deployed addresses after deployment
export const CONTRACTS = {
  // Core
  MARKETPLACE_ATP: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  ORINA_RWA:       '0x0000000000000000000000000000000000000000' as `0x${string}`,
  RECEIPT_NFT:     '0x0000000000000000000000000000000000000000' as `0x${string}`,
  PAYMENT_GATEWAY: '0x0000000000000000000000000000000000000000' as `0x${string}`,

  // Management
  FEE_MANAGER:       '0x0000000000000000000000000000000000000000' as `0x${string}`,
  AUTOTIME_MANAGER:  '0x0000000000000000000000000000000000000000' as `0x${string}`,
  DISPUTE_MANAGER:   '0x0000000000000000000000000000000000000000' as `0x${string}`,

  // Registries
  UNIT_REGISTRY:     '0x0000000000000000000000000000000000000000' as `0x${string}`,
  SHIPPING_REGISTRY: '0x0000000000000000000000000000000000000000' as `0x${string}`,

  // Governance
  TIMELOCK:     '0x0000000000000000000000000000000000000000' as `0x${string}`,
  GNOSIS_SAFE:  '0x0000000000000000000000000000000000000000' as `0x${string}`,

  // Addresses
  FEE_VAULT:    '0x0000000000000000000000000000000000000000' as `0x${string}`,
  BURN_ADDRESS: '0x000000000000000000000000000000000000dEaD' as `0x${string}`,
} as const;

// Backward compatibility alias
export const MARKETPLACE = CONTRACTS.MARKETPLACE_ATP;

// ── Chain Configuration ───────────────────────────────────────
// Spec: BSC (chainId 56) for low fees
export const CHAIN_CONFIG = {
  // Primary deployment chain
  PRIMARY_CHAIN_ID: 56,        // BSC Mainnet
  TESTNET_CHAIN_ID: 97,        // BSC Testnet

  // For development/testing
  DEV_CHAIN_ID: 11155111,      // Sepolia (Ethereum testnet)
} as const;

// Current active chain (toggle for dev vs prod)
export const ACTIVE_CHAIN_ID = CHAIN_CONFIG.TESTNET_CHAIN_ID;

export const SUPPORTED_CHAINS = [
  CHAIN_CONFIG.PRIMARY_CHAIN_ID,
  CHAIN_CONFIG.TESTNET_CHAIN_ID,
  CHAIN_CONFIG.DEV_CHAIN_ID,
] as const;

// ── Protocol Constants ────────────────────────────────────────
// Matching Solidity contract constants
export const PROTOCOL = {
  VERSION: '3.3-final',

  // MarketplaceATP
  SELLER_CONFIRM_WINDOW: 24 * 60 * 60,   // 24 hours
  PAY_TIMEOUT: 24 * 60 * 60,             // 24 hours
  BUYER_ACTION_WINDOW: 3 * 24 * 60 * 60, // 3 days (dispute open window)

  // DisputeManager
  DISPUTE_PERIOD: 14 * 24 * 60 * 60,     // 14 days
  DISPUTE_FEE_BPS: 500,                  // 5%

  // FeeManager defaults
  DEFAULT_PLATFORM_FEE_BPS: 250,         // 2.5%
  DEFAULT_DAO_FEE_BPS: 50,              // 0.5%
  DEFAULT_BURN_FEE_BPS: 25,             // 0.25%
  MAX_TOTAL_FEE_BPS: 500,               // 5% hard cap

  // AutoTimeManager
  MAX_BATCH_SIZE: 100,

  // ShippingRegistry
  MAX_SHIPPING_FEE_BPS: 500,            // 5%

  // Dispute Fee Distribution (inside deductDisputeFee)
  DISPUTE_FEE_PLATFORM_SHARE: 5000,     // 50% to platform
  DISPUTE_FEE_DAO_SHARE: 3000,          // 30% to DAO
  DISPUTE_FEE_BURN_SHARE: 2000,         // 20% to burn
} as const;

// ── Order States (matching Solidity enums) ────────────────────
export enum OrderState {
  PENDING_CONFIRM = 0,
  PAID = 1,
  DISPUTED = 2,
  FINALIZED = 3,
  CANCELLED = 4,
}

export enum SettlementType {
  FULL_RELEASE = 0,
  FULL_REFUND = 1,
  SPLIT = 2,
}

export enum OrderStatus {
  PENDING_SELLER_CONFIRM = 0,
  PENDING_BUYER_PAY = 1,
  PAID = 2,
  DISPUTABLE = 3,
  DISPUTED = 4,
  FINALIZED = 5,
  CANCELLED = 6,
}

export enum AssetType {
  RWA = 0,  // Receipt non-transferable
  NFT = 1,  // Receipt transferable
}

export enum DisputeVerdict {
  NONE = 0,
  BUYER_WINS = 1,
  SELLER_WINS = 2,
  SPLIT = 3,
}

export enum ShippingType {
  FREE = 0,
  ORINA_API = 1,
  SELF = 2,
}

// ── RPC Endpoints ─────────────────────────────────────────────
export const RPC_URLS = {
  [56]: 'https://bsc-dataseed.binance.org/',
  [97]: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  [11155111]: 'https://eth-sepolia.g.alchemy.com/v2/demo',
} as const;

// ── Block Explorer URLs ───────────────────────────────────────
export const EXPLORER_URLS = {
  [56]: 'https://bscscan.com',
  [97]: 'https://testnet.bscscan.com',
  [11155111]: 'https://sepolia.etherscan.io',
} as const;
