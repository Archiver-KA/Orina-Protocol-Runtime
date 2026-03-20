/**
 * Orina ATP Protocol v3.4 - Contract Configuration
 * ======================================================
 * BSC Testnet deployment — 2026-03-20
 * Namespace: orina-atp-v3.4-rwa-split-unit-fix-bsc-testnet-20260320
 */

// ── Contract Addresses (v3.4 RWA split-unit branch — BSC Testnet) ─
export const CONTRACTS = {
  // Core
  MARKETPLACE_ATP: '0x6154d16f4f52c1a4157928f136a53ac3b83b510b' as `0x${string}`,
  ORINA_RWA:       '0xa0c34b5a941420626146bc61e15893bc1f86bf39' as `0x${string}`,
  RECEIPT_NFT:     '0x63db5c2e0935314b3b4f924c38771cf034cc6a2f' as `0x${string}`,
  PAYMENT_GATEWAY: '0x318cb728d91a2abd1854f31ba1d32687763b9335' as `0x${string}`,

  // Management
  FEE_MANAGER:       '0x768f5d3eb747d029cd4cbd15ff70688394c9141d' as `0x${string}`,
  AUTOTIME_MANAGER:  '0xb0986ad420b5d7babd2a7b797b3cb47a76780050' as `0x${string}`,
  DISPUTE_MANAGER:   '0x33dceb1e8aec7fe69d8a1390de0cc0e879035949' as `0x${string}`,

  // Registries
  UNIT_REGISTRY:     '0xcf55ba3f1ade6e2ea84fb92ac11e473c55535a3e' as `0x${string}`,
  SHIPPING_REGISTRY: '0xc648fb2152e6c4d60fcc65ede51f9061ea157ae4' as `0x${string}`,

  // Governance
  TIMELOCK:    '0x4f2209c00ef899eb2eebda1a2160869d254710a1' as `0x${string}`,
  GNOSIS_SAFE: '0x554c4F489846e293bA251fb8B863FE1241306138' as `0x${string}`,

  // Fee vaults (v3.4: dao vault riêng)
  FEE_VAULT:      '0x130fF04D269f0E9C0eaa984C167bd746bB68F82a' as `0x${string}`,
  DAO_VAULT:      '0x8069c3e6E6156707746885d9328a35C874B835CF' as `0x${string}`,
  REFERRAL_VAULT: '0x3FB0B92FcC489A53eb0F172e5D919346e2DeF3c2' as `0x${string}`,
  BURN_ADDRESS:   '0x8A251D3340Fff21BA5Db0164fA3F3735B051a16d' as `0x${string}`,
} as const;

// Backward compatibility alias
export const MARKETPLACE = CONTRACTS.MARKETPLACE_ATP;

// ── Supported Payment Tokens (BSC Testnet) ────────────────────
// Bất kỳ ERC20 nào đều được — whitelist UI để UX tốt hơn
// BNB native KHÔNG hỗ trợ trực tiếp → dùng WBNB
export const PAYMENT_TOKENS = {
  USDT: '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd' as `0x${string}`, // BSC Testnet USDT
  USDC: '0x64544969ed7ebf5f083679233325356ebe738930' as `0x${string}`, // BSC Testnet USDC
  WBNB: '0xae13d989dac2f0debff460ac112a837c89baa7cd' as `0x${string}`, // Wrapped BNB testnet
  ORI:  '0x093969c2bb194e7424534918eca5119fa72a61d6' as `0x${string}`, // ORI token
} as const;

export type PaymentTokenSymbol = keyof typeof PAYMENT_TOKENS;

// ── Standard Unit IDs (seeded on deploy) ──────────────────────
export const UNIT_IDS = {
  PIECE: 0,  // cái/chiếc
  KG:    1,  // kilogram
  TON:   2,  // tấn
  LIT:   3,  // lít
  M:     4,  // mét
  M2:    5,  // mét vuông
  M3:    6,  // mét khối
  HOUR:  7,  // giờ (dịch vụ)
  SET:   8,  // bộ/set
} as const;

// ── Chain Configuration ───────────────────────────────────────
export const CHAIN_CONFIG = {
  PRIMARY_CHAIN_ID: 56,      // BSC Mainnet
  TESTNET_CHAIN_ID: 97,      // BSC Testnet
  DEV_CHAIN_ID: 11155111,    // Sepolia
} as const;

// Current active chain (toggle for dev vs prod)
export const ACTIVE_CHAIN_ID = CHAIN_CONFIG.TESTNET_CHAIN_ID;

export const SUPPORTED_CHAINS = [
  CHAIN_CONFIG.PRIMARY_CHAIN_ID,
  CHAIN_CONFIG.TESTNET_CHAIN_ID,
  CHAIN_CONFIG.DEV_CHAIN_ID,
] as const;

// ── Protocol Constants ────────────────────────────────────────
export const PROTOCOL = {
  VERSION: '3.4',

  // MarketplaceATP
  SELLER_CONFIRM_WINDOW: 24 * 60 * 60,   // 24 hours
  PAY_TIMEOUT: 24 * 60 * 60,             // 24 hours
  BUYER_ACTION_WINDOW: 3 * 24 * 60 * 60, // 3 days (dispute window)

  // DisputeManager
  DISPUTE_PERIOD: 14 * 24 * 60 * 60,     // 14 days
  DISPUTE_FEE_BPS: 500,                  // 5%

  // FeeManager v3.4 defaults (at deploy)
  DEFAULT_PLATFORM_FEE_BPS: 100,         // 1%
  DEFAULT_DAO_FEE_BPS: 50,               // 0.5%
  DEFAULT_BURN_FEE_BPS: 50,              // 0.5%
  DEFAULT_REFERRAL_FEE_BPS: 0,           // 0% (disabled at launch)
  STABLECOIN_PLATFORM_FEE_BPS: 200,      // 2% preset
  ORI_PLATFORM_FEE_BPS: 100,             // 1% preset

  // Hard caps (contract enforced)
  MAX_PROTOCOL_BPS: 500,                 // platform+dao+burn ≤ 5%
  MAX_REFERRAL_BPS: 200,                 // referral ≤ 2%
  MAX_TOTAL_BPS: 700,                    // all fees ≤ 7%

  // AutoTimeManager
  MAX_BATCH_SIZE: 100,

  // ShippingRegistry
  MAX_SHIPPING_FEE_BPS: 500,            // 5%

  // Dispute Fee Distribution
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
  RWA = 0,  // RWA asset -> finalizes into non-transferable receipt
  NFT = 1,  // Reserved for future direct-buy transferable NFT branch
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
  [97]: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/',
  [11155111]: 'https://eth-sepolia.g.alchemy.com/v2/demo',
} as const;

// ── Block Explorer URLs ───────────────────────────────────────
export const EXPLORER_URLS = {
  [56]: 'https://bscscan.com',
  [97]: 'https://testnet.bscscan.com',
  [11155111]: 'https://sepolia.etherscan.io',
} as const;
