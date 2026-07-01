import { runtimeConfig, runtimeFlags } from '/utils/runtimeConfig';
import { CHAIN_CONFIG } from '@/config/contracts';

type Address = `0x${string}`;
type TestnetStarterKitToken = {
  label: string;
  address: Address | null;
  decimals: number;
};

export type TestnetStarterKitConfig = {
  enabled: boolean;
  chainId: number;
  networkKey: string;
  networkLabel: string;
  shortLabel: string;
  nativeTokenLabel: string;
  gasFaucetUrl: string;
  faucetAddress: Address | null;
  tokens: {
    USDT: TestnetStarterKitToken;
    USDC: TestnetStarterKitToken;
  };
};

function normalizeAddress(value: string): Address | null {
  const trimmed = String(value || '').trim();
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? (trimmed as Address) : null;
}

export const TESTNET_TOKEN_FAUCET_ABI = [
  {
    type: 'function',
    name: 'claimUSDT',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimUSDC',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimBoth',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'usdtClaimAmount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'usdcClaimAmount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'claimCooldown',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nextClaimAt',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const BASE_SEPOLIA_FAUCET = '0xbBd53C18F4d9fb98aA6c4837Ea0E8F221E1B5F0F';
const BASE_SEPOLIA_USDT_T = '0x11E6c8f2806b32DaC427E7dF07F67602647Ef87a';
const BASE_SEPOLIA_USDC_T = '0xd6e84789741ea2DE727961CCB383454e4A845035';
const ARBITRUM_SEPOLIA_FAUCET = '0xFA37557E4F6D066f6CF4B69BA865837d007c8D1e';
const ARBITRUM_SEPOLIA_USDT_T = '0x279c62C97c6967d0E0F45f9D2460d38E3929c090';
const ARBITRUM_SEPOLIA_USDC_T = '0x233Fb28c8166807b01DcBE2743bb85cF7cdC8b41';
const ETHEREUM_SEPOLIA_FAUCET = '0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F';
const ETHEREUM_SEPOLIA_USDT_T = '0x11E6c8f2806b32dAC427E7Df07F67602647eF87A';
const ETHEREUM_SEPOLIA_USDC_T = '0xD6E84789741Ea2DE727961cCB383454E4A845035';
const OPTIMISM_SEPOLIA_FAUCET = '0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F';
const OPTIMISM_SEPOLIA_USDT_T = '0x11E6c8f2806b32dAC427E7Df07F67602647eF87A';
const OPTIMISM_SEPOLIA_USDC_T = '0xD6E84789741Ea2DE727961cCB383454E4A845035';

export const TESTNET_STARTER_KITS: Record<number, TestnetStarterKitConfig> = {
  [CHAIN_CONFIG.TESTNET_CHAIN_ID]: {
    enabled: runtimeFlags.enableTestnetStarterKit,
    chainId: CHAIN_CONFIG.TESTNET_CHAIN_ID,
    networkKey: 'bnb-testnet',
    networkLabel: 'BNB Chain Testnet',
    shortLabel: 'BNB Testnet',
    nativeTokenLabel: 'tBNB',
    gasFaucetUrl: runtimeConfig.bscTestnetGasFaucetUrl,
    faucetAddress: normalizeAddress(runtimeConfig.bscTestnetTokenFaucetAddress),
    tokens: {
      USDT: {
        label: 'USDT.t',
        address: normalizeAddress(runtimeConfig.bscTestnetUsdtAddress),
        decimals: 6,
      },
      USDC: {
        label: 'USDC.t',
        address: normalizeAddress(runtimeConfig.bscTestnetUsdcAddress),
        decimals: 6,
      },
    },
  },
  [CHAIN_CONFIG.BASE_SEPOLIA_CHAIN_ID]: {
    enabled: runtimeFlags.enableTestnetStarterKit,
    chainId: CHAIN_CONFIG.BASE_SEPOLIA_CHAIN_ID,
    networkKey: 'base-sepolia',
    networkLabel: 'Base Sepolia',
    shortLabel: 'Base Sepolia',
    nativeTokenLabel: 'ETH',
    gasFaucetUrl: runtimeConfig.baseSepoliaGasFaucetUrl,
    faucetAddress: normalizeAddress(runtimeConfig.baseSepoliaTokenFaucetAddress || BASE_SEPOLIA_FAUCET),
    tokens: {
      USDT: {
        label: 'USDT.t',
        address: normalizeAddress(runtimeConfig.baseSepoliaUsdtAddress || BASE_SEPOLIA_USDT_T),
        decimals: 6,
      },
      USDC: {
        label: 'USDC.t',
        address: normalizeAddress(runtimeConfig.baseSepoliaUsdcAddress || BASE_SEPOLIA_USDC_T),
        decimals: 6,
      },
    },
  },
  [CHAIN_CONFIG.ARBITRUM_SEPOLIA_CHAIN_ID]: {
    enabled: runtimeFlags.enableTestnetStarterKit,
    chainId: CHAIN_CONFIG.ARBITRUM_SEPOLIA_CHAIN_ID,
    networkKey: 'arbitrum-sepolia',
    networkLabel: 'Arbitrum Sepolia',
    shortLabel: 'Arbitrum Sepolia',
    nativeTokenLabel: 'ETH',
    gasFaucetUrl: runtimeConfig.arbitrumSepoliaGasFaucetUrl,
    faucetAddress: normalizeAddress(runtimeConfig.arbitrumSepoliaTokenFaucetAddress || ARBITRUM_SEPOLIA_FAUCET),
    tokens: {
      USDT: {
        label: 'USDT.t',
        address: normalizeAddress(runtimeConfig.arbitrumSepoliaUsdtAddress || ARBITRUM_SEPOLIA_USDT_T),
        decimals: 6,
      },
      USDC: {
        label: 'USDC.t',
        address: normalizeAddress(runtimeConfig.arbitrumSepoliaUsdcAddress || ARBITRUM_SEPOLIA_USDC_T),
        decimals: 6,
      },
    },
  },
  [CHAIN_CONFIG.ETHEREUM_SEPOLIA_CHAIN_ID]: {
    enabled: runtimeFlags.enableTestnetStarterKit,
    chainId: CHAIN_CONFIG.ETHEREUM_SEPOLIA_CHAIN_ID,
    networkKey: 'ethereum-sepolia',
    networkLabel: 'Ethereum Sepolia',
    shortLabel: 'Ethereum Sepolia',
    nativeTokenLabel: 'ETH',
    gasFaucetUrl: runtimeConfig.ethereumSepoliaGasFaucetUrl,
    faucetAddress: normalizeAddress(runtimeConfig.ethereumSepoliaTokenFaucetAddress || ETHEREUM_SEPOLIA_FAUCET),
    tokens: {
      USDT: {
        label: 'USDT.t',
        address: normalizeAddress(runtimeConfig.ethereumSepoliaUsdtAddress || ETHEREUM_SEPOLIA_USDT_T),
        decimals: 6,
      },
      USDC: {
        label: 'USDC.t',
        address: normalizeAddress(runtimeConfig.ethereumSepoliaUsdcAddress || ETHEREUM_SEPOLIA_USDC_T),
        decimals: 6,
      },
    },
  },
  [CHAIN_CONFIG.OPTIMISM_SEPOLIA_CHAIN_ID]: {
    enabled: runtimeFlags.enableTestnetStarterKit,
    chainId: CHAIN_CONFIG.OPTIMISM_SEPOLIA_CHAIN_ID,
    networkKey: 'optimism-sepolia',
    networkLabel: 'Optimism Sepolia',
    shortLabel: 'Optimism Sepolia',
    nativeTokenLabel: 'ETH',
    gasFaucetUrl: runtimeConfig.optimismSepoliaGasFaucetUrl,
    faucetAddress: normalizeAddress(runtimeConfig.optimismSepoliaTokenFaucetAddress || OPTIMISM_SEPOLIA_FAUCET),
    tokens: {
      USDT: {
        label: 'USDT.t',
        address: normalizeAddress(runtimeConfig.optimismSepoliaUsdtAddress || OPTIMISM_SEPOLIA_USDT_T),
        decimals: 6,
      },
      USDC: {
        label: 'USDC.t',
        address: normalizeAddress(runtimeConfig.optimismSepoliaUsdcAddress || OPTIMISM_SEPOLIA_USDC_T),
        decimals: 6,
      },
    },
  },
} as const;

// Backward-compatible BSC alias.
export const TESTNET_STARTER_KIT = TESTNET_STARTER_KITS[CHAIN_CONFIG.TESTNET_CHAIN_ID];

export function getTestnetStarterKit(chainId?: number | null): TestnetStarterKitConfig | null {
  if (!chainId) return null;
  return TESTNET_STARTER_KITS[chainId] ?? null;
}

export function isTestnetStarterKitAvailable(chainId?: number | null) {
  const kit = getTestnetStarterKit(chainId);
  return Boolean(kit?.enabled);
}

export function isTestnetStarterKitConfigured(
  chainIdOrKit?: number | null | TestnetStarterKitConfig,
) {
  const kit = typeof chainIdOrKit === 'object'
    ? chainIdOrKit
    : getTestnetStarterKit(chainIdOrKit) ?? TESTNET_STARTER_KIT;
  return Boolean(
    kit?.faucetAddress
      && kit.tokens.USDT.address
      && kit.tokens.USDC.address,
  );
}

export const LEGACY_BSC_TESTNET_STARTER_KIT = {
  enabled: runtimeFlags.enableTestnetStarterKit,
  chainId: CHAIN_CONFIG.TESTNET_CHAIN_ID,
  faucetAddress: normalizeAddress(runtimeConfig.testnetTokenFaucetAddress),
  tbnbFaucetUrl: runtimeConfig.testnetTbnbFaucetUrl,
  tokens: {
    USDT: {
      label: 'USDT.t',
      address: normalizeAddress(runtimeConfig.testnetUsdtAddress),
      decimals: 6,
    },
    USDC: {
      label: 'USDC.t',
      address: normalizeAddress(runtimeConfig.testnetUsdcAddress),
      decimals: 6,
    },
  },
} as const;
