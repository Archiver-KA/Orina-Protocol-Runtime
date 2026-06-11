import { runtimeConfig, runtimeFlags } from '/utils/runtimeConfig';
import { CHAIN_CONFIG } from '@/config/contracts';

type Address = `0x${string}`;

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

export const TESTNET_STARTER_KIT = {
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

export function isTestnetStarterKitConfigured() {
  return Boolean(
    TESTNET_STARTER_KIT.faucetAddress
      && TESTNET_STARTER_KIT.tokens.USDT.address
      && TESTNET_STARTER_KIT.tokens.USDC.address,
  );
}
