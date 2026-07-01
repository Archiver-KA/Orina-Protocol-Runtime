/**
 * Orina ATP Protocol v3.5 beta - Contract Configuration
 * =====================================================
 * BSC Testnet beta is the write-enabled runtime; Base Sepolia metadata was verified on 2026-06-27.
 * Arbitrum Sepolia contracts were rebroadcast, bytecode-checked, and M2M-linked on 2026-06-29.
 * Ethereum Sepolia contracts were deployed, bytecode-checked, and M2M-linked on 2026-07-01.
 * Optimism Sepolia contracts were deployed, bytecode-checked, and M2M-linked on 2026-07-01.
 * Fee split no-burn + transferable NFT branch + ORI fee-token option.
 * Namespace: orina-atp-v3.5-fee-split-nft-orifee-bsc-testnet-20260604
 */

import { runtimeConfig } from '/utils/runtimeConfig';

function parseRuntimeAddress(value: string, fallback: `0x${string}`): `0x${string}` {
  const trimmed = String(value || '').trim();
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? (trimmed as `0x${string}`) : fallback;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;
const BASE_SEPOLIA_ORI = '0xd87493F4C02AAD2c67Ce12aa534d188Bf44FCCAB' as `0x${string}`;
const BASE_SEPOLIA_USDT_T = '0x11E6c8f2806b32DaC427E7dF07F67602647Ef87a' as `0x${string}`;
const BASE_SEPOLIA_USDC_T = '0xd6e84789741ea2DE727961CCB383454e4A845035' as `0x${string}`;
const ARBITRUM_SEPOLIA_ORI = '0x5e41f1155AB4E614037C9C481BB8c1d398915cd0' as `0x${string}`;
const ARBITRUM_SEPOLIA_USDT_T = '0x279c62C97c6967d0E0F45f9D2460d38E3929c090' as `0x${string}`;
const ARBITRUM_SEPOLIA_USDC_T = '0x233Fb28c8166807b01DcBE2743bb85cF7cdC8b41' as `0x${string}`;
const ETHEREUM_SEPOLIA_ORI = '0xD87493f4C02aad2c67Ce12aa534d188Bf44FCcAB' as `0x${string}`;
const ETHEREUM_SEPOLIA_USDT_T = '0x11E6c8f2806b32dAC427E7Df07F67602647eF87A' as `0x${string}`;
const ETHEREUM_SEPOLIA_USDC_T = '0xD6E84789741Ea2DE727961cCB383454E4A845035' as `0x${string}`;
const OPTIMISM_SEPOLIA_ORI = '0xD87493f4C02aad2c67Ce12aa534d188Bf44FCcAB' as `0x${string}`;
const OPTIMISM_SEPOLIA_USDT_T = '0x11E6c8f2806b32dAC427E7Df07F67602647eF87A' as `0x${string}`;
const OPTIMISM_SEPOLIA_USDC_T = '0xD6E84789741Ea2DE727961cCB383454E4A845035' as `0x${string}`;

// Contract Addresses (v3.5 beta no-burn fee split - BSC Testnet)
export const CONTRACTS = {
  // Core
  MARKETPLACE_ATP: '0x18E1C8ab257FAf16Ec8257A9715d07661194150B' as `0x${string}`,
  ORINA_RWA:       '0x3a591AB1aB3A281f999AAD1644b020CbEC463C47' as `0x${string}`,
  RECEIPT_NFT:     '0x16A35bdD00dCfb9010504FbD1b2B97e26bB315ca' as `0x${string}`,
  PAYMENT_GATEWAY: '0x082d75D8cA96C6e97B6b451Ad4857454A53D5C15' as `0x${string}`,

  // Management
  FEE_MANAGER:       '0xD32fc966835D8eb7D26A12BEcCa86c749A60eFb3' as `0x${string}`,
  AUTOTIME_MANAGER:  '0x5639792243617841800df8F1450B86223c3d86f4' as `0x${string}`,
  DISPUTE_MANAGER:   '0xCD27B85e7EA6FB1FDC484ae9083286DdCC14DC21' as `0x${string}`,
  DELEGATION_MANAGER: '0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13' as `0x${string}`,
  AI_WALLET_FACTORY_V2: '0xD838268fa8dF6AFD1Fd79D9C0Fd243A3D23D0441' as `0x${string}`,

  // Registries
  UNIT_REGISTRY:     '0x4ea45450064CD5B7c88EcAaE6a145652FEDd5df0' as `0x${string}`,
  SHIPPING_REGISTRY: '0x16402c8C883a01dbfD2D7E58A46D3E9434396836' as `0x${string}`,

  // Governance
  TIMELOCK:    '0x5452CE749EDA1bE82132743AA224e7C86023A7F4' as `0x${string}`,
  GNOSIS_SAFE: '0x554c4F489846e293bA251fb8B863FE1241306138' as `0x${string}`,

  // Fee vaults
  FEE_VAULT:      '0x130fF04D269f0E9C0eaa984C167bd746bB68F82a' as `0x${string}`,
  DAO_VAULT:      '0x8069c3e6E6156707746885d9328a35C874B835CF' as `0x${string}`,
  REFERRAL_VAULT: '0x3FB0B92FcC489A53eb0F172e5D919346e2DeF3c2' as `0x${string}`,
} as const;

// Backward compatibility alias
export const MARKETPLACE = CONTRACTS.MARKETPLACE_ATP;

// Base Sepolia ATP v3.5 deployment. Base is write-ready after the
// 2026-06-28 bytecode and Marketplace M2M delegation checks.
export const BASE_SEPOLIA_CONTRACTS = {
  MARKETPLACE_ATP: '0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14' as `0x${string}`,
  ORINA_RWA:       '0x0a9efc1fb95be24743b1452ac4c974E5E925A453' as `0x${string}`,
  RECEIPT_NFT:     '0x82d2f4e131d1EB34F9B6Ebc8CC37bdD1cca84e95' as `0x${string}`,
  PAYMENT_GATEWAY: '0x1A880Ae46993282dd77C2dDCc5e36498eB616C92' as `0x${string}`,
  FEE_MANAGER:       '0x51aB383A43d79f4127B7E7dCBcd892164FA2838F' as `0x${string}`,
  AUTOTIME_MANAGER:  '0xa12273AD5b73c5F57139e84aa89Db52FE7Af05de' as `0x${string}`,
  DISPUTE_MANAGER:   '0x952aE0562De695c63c1386458DB537193Ce293b4' as `0x${string}`,
  DELEGATION_MANAGER: '0xFC0038B7CC628966f8a7f14414c9386c2d6cB288' as `0x${string}`,
  AI_WALLET_FACTORY_V2: '0x0E5E106A7F81233Fe07115Aeb3777e847adB09cB' as `0x${string}`,
  UNIT_REGISTRY:     '0x5a709d6f4F0a084315C64272FFc158Dc61F0De38' as `0x${string}`,
  SHIPPING_REGISTRY: '0x50fD56DcA706471B7f0Ab59051006aA2712c2DF2' as `0x${string}`,
  TIMELOCK:    '0x989b893118237f710b7Efc8820147B61c68DcaEE' as `0x${string}`,
  GNOSIS_SAFE: '0x554c4F489846e293bA251fb8B863FE1241306138' as `0x${string}`,
  FEE_VAULT:      '0x130fF04D269f0E9C0eaa984C167bd746bB68F82a' as `0x${string}`,
  DAO_VAULT:      '0x8069c3e6E6156707746885d9328a35C874B835CF' as `0x${string}`,
  REFERRAL_VAULT: '0x3FB0B92FcC489A53eb0F172e5D919346e2DeF3c2' as `0x${string}`,
} as const;

// Arbitrum Sepolia ATP v3.5 deployment. This testnet is EOA-governed through a
// zero-delay timelock because multisig signing is unavailable on Arbitrum Sepolia.
// Mainnet must redeploy with a production multisig/Safe and replace this address set.
export const ARBITRUM_SEPOLIA_CONTRACTS = {
  MARKETPLACE_ATP: '0x5863f25A8250EBe20Bd1E3d04FD796081Fc3D72E' as `0x${string}`,
  ORINA_RWA:       '0x0244Ad5ca0BC9Cd8555352Cd53Dc51Fd8eD2f011' as `0x${string}`,
  RECEIPT_NFT:     '0x6A695E8356b6F80664E31402038CbBdBCfffa816' as `0x${string}`,
  PAYMENT_GATEWAY: '0x39F539903b75A0bF0FEF16a443904C8c9DF787EE' as `0x${string}`,
  FEE_MANAGER:       '0x0c4AccB88E2Cc530FEFBAb31Ca77371a2a68Ba20' as `0x${string}`,
  AUTOTIME_MANAGER:  '0x75ac6efE7483c03B971Fb8E635dEE8ed8D527c61' as `0x${string}`,
  DISPUTE_MANAGER:   '0xEE36B67BE61A37672D4ae041A89aEd12B333753E' as `0x${string}`,
  DELEGATION_MANAGER: '0x56D454f55D5d05b060777F70e653BbBEb1167D2e' as `0x${string}`,
  AI_WALLET_FACTORY_V2: '0x143519194A9Df4678b602BEE329C1A96381d1CBD' as `0x${string}`,
  UNIT_REGISTRY:     '0x37D917202211492523659e83010300A444D62C91' as `0x${string}`,
  SHIPPING_REGISTRY: '0x63f85795fAc0F76831a3eB14Dc7729A4052fe7F7' as `0x${string}`,
  TIMELOCK:    '0x66Bf76Fdf268976080f119278982B082f417FbAD' as `0x${string}`,
  GNOSIS_SAFE: '0x282Be18838D7079C215F49749a9606d77e00888b' as `0x${string}`,
  FEE_VAULT:      '0x130fF04D269f0E9C0eaa984C167bd746bB68F82a' as `0x${string}`,
  DAO_VAULT:      '0x8069c3e6E6156707746885d9328a35C874B835CF' as `0x${string}`,
  REFERRAL_VAULT: '0x3FB0B92FcC489A53eb0F172e5D919346e2DeF3c2' as `0x${string}`,
} as const;

// Ethereum Sepolia ATP v3.5 deployment. This testnet follows the temporary
// EOA-governed zero-delay timelock path used for Arbitrum Sepolia. Ethereum
// mainnet must redeploy with a production multisig/Safe and replace this set.
export const ETHEREUM_SEPOLIA_CONTRACTS = {
  MARKETPLACE_ATP: '0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14' as `0x${string}`,
  ORINA_RWA:       '0x0a9efc1fb95be24743b1452ac4c974E5E925A453' as `0x${string}`,
  RECEIPT_NFT:     '0x82d2f4e131d1EB34F9B6Ebc8CC37bdD1cca84e95' as `0x${string}`,
  PAYMENT_GATEWAY: '0x1A880Ae46993282dd77C2dDCc5e36498eB616C92' as `0x${string}`,
  FEE_MANAGER:       '0x51aB383A43d79f4127B7E7dCBcd892164FA2838F' as `0x${string}`,
  AUTOTIME_MANAGER:  '0xa12273AD5b73c5F57139e84aa89Db52FE7Af05de' as `0x${string}`,
  DISPUTE_MANAGER:   '0x952aE0562De695c63c1386458DB537193Ce293b4' as `0x${string}`,
  DELEGATION_MANAGER: '0x52440e44ec34a64e19b92243262fe47819d65539' as `0x${string}`,
  AI_WALLET_FACTORY_V2: '0x7D6b498eDc3F469ED020116e8892EbB361753bCB' as `0x${string}`,
  UNIT_REGISTRY:     '0x5a709d6f4F0a084315C64272FFc158Dc61F0De38' as `0x${string}`,
  SHIPPING_REGISTRY: '0x50fD56DcA706471B7f0Ab59051006aA2712c2DF2' as `0x${string}`,
  TIMELOCK:    '0x5C842728C357B9b18eb8A9A7a840499936132e67' as `0x${string}`,
  GNOSIS_SAFE: '0x282Be18838D7079C215F49749a9606d77e00888b' as `0x${string}`,
  FEE_VAULT:      '0x130fF04D269f0E9C0eaa984C167bd746bB68F82a' as `0x${string}`,
  DAO_VAULT:      '0x8069c3e6E6156707746885d9328a35C874B835CF' as `0x${string}`,
  REFERRAL_VAULT: '0x3FB0B92FcC489A53eb0F172e5D919346e2DeF3c2' as `0x${string}`,
} as const;

// Optimism Sepolia ATP v3.5 deployment. This testnet follows the temporary
// EOA-governed zero-delay timelock path used for Ethereum Sepolia. Optimism
// mainnet must redeploy with a production multisig/Safe and replace this set.
export const OPTIMISM_SEPOLIA_CONTRACTS = {
  MARKETPLACE_ATP: '0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14' as `0x${string}`,
  ORINA_RWA:       '0x0a9efc1fb95be24743b1452ac4c974E5E925A453' as `0x${string}`,
  RECEIPT_NFT:     '0x82d2f4e131d1EB34F9B6Ebc8CC37bdD1cca84e95' as `0x${string}`,
  PAYMENT_GATEWAY: '0x1A880Ae46993282dd77C2dDCc5e36498eB616C92' as `0x${string}`,
  FEE_MANAGER:       '0x51aB383A43d79f4127B7E7dCBcd892164FA2838F' as `0x${string}`,
  AUTOTIME_MANAGER:  '0xa12273AD5b73c5F57139e84aa89Db52FE7Af05de' as `0x${string}`,
  DISPUTE_MANAGER:   '0x952aE0562De695c63c1386458DB537193Ce293b4' as `0x${string}`,
  DELEGATION_MANAGER: '0x52440e44ec34a64e19b92243262fe47819d65539' as `0x${string}`,
  AI_WALLET_FACTORY_V2: '0x7D6b498eDc3F469ED020116e8892EbB361753bCB' as `0x${string}`,
  UNIT_REGISTRY:     '0x5a709d6f4F0a084315C64272FFc158Dc61F0De38' as `0x${string}`,
  SHIPPING_REGISTRY: '0x50fD56DcA706471B7f0Ab59051006aA2712c2DF2' as `0x${string}`,
  TIMELOCK:    '0x5C842728C357B9b18eb8A9A7a840499936132e67' as `0x${string}`,
  GNOSIS_SAFE: '0x282Be18838D7079C215F49749a9606d77e00888b' as `0x${string}`,
  FEE_VAULT:      '0x130fF04D269f0E9C0eaa984C167bd746bB68F82a' as `0x${string}`,
  DAO_VAULT:      '0x8069c3e6E6156707746885d9328a35C874B835CF' as `0x${string}`,
  REFERRAL_VAULT: '0x3FB0B92FcC489A53eb0F172e5D919346e2DeF3c2' as `0x${string}`,
} as const;

// Supported payment tokens. The contract path can accept ERC20 tokens, but
// production needs an explicit allowlist policy. Testnet mock tokens stay
// chain-scoped so adding a new network does not mutate BSC behavior.
export const PAYMENT_TOKENS = {
  USDT: parseRuntimeAddress(runtimeConfig.bscTestnetUsdtAddress, '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd'),
  USDC: parseRuntimeAddress(runtimeConfig.bscTestnetUsdcAddress, '0x64544969ed7ebf5f083679233325356ebe738930'),
  WBNB: '0xae13d989dac2f0debff460ac112a837c89baa7cd' as `0x${string}`,
  ORI:  '0x093969c2bb194e7424534918eca5119fa72a61d6' as `0x${string}`,
} as const;

export const BASE_SEPOLIA_PAYMENT_TOKENS = {
  USDT: parseRuntimeAddress(runtimeConfig.baseSepoliaUsdtAddress, BASE_SEPOLIA_USDT_T),
  USDC: parseRuntimeAddress(runtimeConfig.baseSepoliaUsdcAddress, BASE_SEPOLIA_USDC_T),
  WBNB: ZERO_ADDRESS,
  ORI: parseRuntimeAddress('', BASE_SEPOLIA_ORI),
} as const;

export const ARBITRUM_SEPOLIA_PAYMENT_TOKENS = {
  USDT: parseRuntimeAddress(runtimeConfig.arbitrumSepoliaUsdtAddress, ARBITRUM_SEPOLIA_USDT_T),
  USDC: parseRuntimeAddress(runtimeConfig.arbitrumSepoliaUsdcAddress, ARBITRUM_SEPOLIA_USDC_T),
  WBNB: ZERO_ADDRESS,
  ORI: parseRuntimeAddress('', ARBITRUM_SEPOLIA_ORI),
} as const;

export const ETHEREUM_SEPOLIA_PAYMENT_TOKENS = {
  USDT: parseRuntimeAddress(runtimeConfig.ethereumSepoliaUsdtAddress, ETHEREUM_SEPOLIA_USDT_T),
  USDC: parseRuntimeAddress(runtimeConfig.ethereumSepoliaUsdcAddress, ETHEREUM_SEPOLIA_USDC_T),
  WBNB: ZERO_ADDRESS,
  ORI: parseRuntimeAddress('', ETHEREUM_SEPOLIA_ORI),
} as const;

export const OPTIMISM_SEPOLIA_PAYMENT_TOKENS = {
  USDT: parseRuntimeAddress(runtimeConfig.optimismSepoliaUsdtAddress, OPTIMISM_SEPOLIA_USDT_T),
  USDC: parseRuntimeAddress(runtimeConfig.optimismSepoliaUsdcAddress, OPTIMISM_SEPOLIA_USDC_T),
  WBNB: ZERO_ADDRESS,
  ORI: parseRuntimeAddress('', OPTIMISM_SEPOLIA_ORI),
} as const;

export const PAYMENT_TOKENS_BY_CHAIN_ID = {
  97: PAYMENT_TOKENS,
  84532: BASE_SEPOLIA_PAYMENT_TOKENS,
  421614: ARBITRUM_SEPOLIA_PAYMENT_TOKENS,
  11155111: ETHEREUM_SEPOLIA_PAYMENT_TOKENS,
  11155420: OPTIMISM_SEPOLIA_PAYMENT_TOKENS,
} as const;

export type PaymentTokenSymbol = keyof typeof PAYMENT_TOKENS;
export type PaymentTokenMap = Record<PaymentTokenSymbol, `0x${string}`>;

export function getPaymentTokens(chainId?: number | null): PaymentTokenMap {
  return (
    (chainId ? PAYMENT_TOKENS_BY_CHAIN_ID[chainId as keyof typeof PAYMENT_TOKENS_BY_CHAIN_ID] : undefined)
    ?? PAYMENT_TOKENS
  );
}

export function getPaymentTokenSymbolByAddress(
  address?: string | null,
  chainId?: number | null,
): PaymentTokenSymbol | null {
  const normalized = String(address || '').toLowerCase();
  if (!normalized) return null;

  const chainTokens = getPaymentTokens(chainId);
  const chainMatch = Object.entries(chainTokens).find(
    ([, tokenAddress]) => tokenAddress !== ZERO_ADDRESS && tokenAddress.toLowerCase() === normalized,
  );
  if (chainMatch) return chainMatch[0] as PaymentTokenSymbol;

  for (const tokenMap of Object.values(PAYMENT_TOKENS_BY_CHAIN_ID)) {
    const match = Object.entries(tokenMap).find(
      ([, tokenAddress]) => tokenAddress !== ZERO_ADDRESS && tokenAddress.toLowerCase() === normalized,
    );
    if (match) return match[0] as PaymentTokenSymbol;
  }

  return null;
}

export function resolvePaymentTokenForCurrency(
  currency: string,
  chainId?: number | null,
): { symbol: PaymentTokenSymbol; address: `0x${string}` } {
  const tokens = getPaymentTokens(chainId);
  const normalized = String(currency || '').trim().toUpperCase();

  if (normalized === 'USDC') return { symbol: 'USDC', address: tokens.USDC };
  if (normalized === 'USDT') return { symbol: 'USDT', address: tokens.USDT };
  if (normalized === 'ORI') return { symbol: 'ORI', address: tokens.ORI };
  if ((normalized === 'WBNB' || normalized === 'BNB') && tokens.WBNB !== ZERO_ADDRESS) {
    return { symbol: 'WBNB', address: tokens.WBNB };
  }

  return { symbol: 'USDC', address: tokens.USDC };
}


// â”€â”€ Standard Unit IDs (seeded on deploy) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const UNIT_IDS = {
  PIECE: 0,  // cÃ¡i/chiáº¿c
  KG:    1,  // kilogram
  TON:   2,  // táº¥n
  LIT:   3,  // lÃ­t
  M:     4,  // mÃ©t
  M2:    5,  // mÃ©t vuÃ´ng
  M3:    6,  // mÃ©t khá»‘i
  HOUR:  7,  // giá» (dá»‹ch vá»¥)
  SET:   8,  // bá»™/set
} as const;

// â”€â”€ Chain Configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const CHAIN_CONFIG = {
  PRIMARY_CHAIN_ID: 56,      // BSC Mainnet
  TESTNET_CHAIN_ID: 97,      // BSC Testnet
  BASE_SEPOLIA_CHAIN_ID: 84532,
  ARBITRUM_SEPOLIA_CHAIN_ID: 421614,
  ETHEREUM_SEPOLIA_CHAIN_ID: 11155111,
  OPTIMISM_SEPOLIA_CHAIN_ID: 11155420,
  DEV_CHAIN_ID: 11155111,    // Sepolia alias
} as const;

export const SUPPORTED_CHAINS = [
  CHAIN_CONFIG.PRIMARY_CHAIN_ID,
  CHAIN_CONFIG.TESTNET_CHAIN_ID,
  CHAIN_CONFIG.BASE_SEPOLIA_CHAIN_ID,
  CHAIN_CONFIG.ARBITRUM_SEPOLIA_CHAIN_ID,
  CHAIN_CONFIG.ETHEREUM_SEPOLIA_CHAIN_ID,
  CHAIN_CONFIG.OPTIMISM_SEPOLIA_CHAIN_ID,
] as const;

// Current active chain (toggle for dev vs prod)
export const ACTIVE_CHAIN_ID = CHAIN_CONFIG.TESTNET_CHAIN_ID;

// â”€â”€ Protocol Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const PROTOCOL = {
  VERSION: '3.5',

  // MarketplaceATP
  SELLER_CONFIRM_WINDOW: 24 * 60 * 60,   // 24 hours
  PAY_TIMEOUT: 24 * 60 * 60,             // 24 hours
  BUYER_ACTION_WINDOW: 3 * 24 * 60 * 60, // 3 days (dispute window)

  // DisputeManager
  DISPUTE_PERIOD: 14 * 24 * 60 * 60,     // 14 days
  DISPUTE_FEE_BPS: 500,                  // 5%

  // FeeManager v3.5 no-burn presets. Total protocol fee is platform + DAO + referral.
  DEFAULT_PLATFORM_FEE_BPS: 100,         // 1%
  DEFAULT_DAO_FEE_BPS: 100,              // 1%
  DEFAULT_REFERRAL_FEE_BPS: 0,           // 0% (disabled at launch)
  STABLECOIN_PLATFORM_FEE_BPS: 100,      // 1%
  STABLECOIN_DAO_FEE_BPS: 100,           // 1%
  ORI_PLATFORM_FEE_BPS: 50,              // 0.5%
  ORI_DAO_FEE_BPS: 50,                   // 0.5%

  // Hard caps (contract enforced)
  MAX_PROTOCOL_BPS: 500,                 // platform + DAO <= 5%
  MAX_REFERRAL_BPS: 200,                 // referral â‰¤ 2%
  MAX_TOTAL_BPS: 700,                    // all fees â‰¤ 7%

  // AutoTimeManager
  MAX_BATCH_SIZE: 100,

  // ShippingRegistry
  MAX_SHIPPING_FEE_BPS: 500,            // 5%

  // Dispute Fee Distribution
  DISPUTE_FEE_PLATFORM_SHARE: 5000,     // 50% to platform
  DISPUTE_FEE_DAO_SHARE: 5000,          // 50% to DAO
} as const;

// â”€â”€ Order States (matching Solidity enums) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ RPC Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const RPC_URLS = {
  [56]: 'https://bsc-dataseed.binance.org/',
  [97]: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/',
  [84532]: 'https://sepolia.base.org',
  [421614]: 'https://sepolia-rollup.arbitrum.io/rpc',
  [11155111]: runtimeConfig.sepoliaRpcUrl || 'https://ethereum-sepolia-rpc.publicnode.com',
  [11155420]: 'https://optimism-sepolia-rpc.publicnode.com',
} as const;

// â”€â”€ Block Explorer URLs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const EXPLORER_URLS = {
  [56]: 'https://bscscan.com',
  [97]: 'https://testnet.bscscan.com',
  [84532]: 'https://sepolia.basescan.org',
  [421614]: 'https://sepolia.arbiscan.io',
  [11155111]: 'https://sepolia.etherscan.io',
  [11155420]: 'https://sepolia-optimism.etherscan.io',
} as const;
