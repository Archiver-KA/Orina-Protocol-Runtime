import {
  ACTIVE_CHAIN_ID,
  ARBITRUM_SEPOLIA_CONTRACTS,
  AVALANCHE_FUJI_CONTRACTS,
  BASE_SEPOLIA_CONTRACTS,
  CONTRACTS,
  ETHEREUM_SEPOLIA_CONTRACTS,
  EXPLORER_URLS,
  OPTIMISM_SEPOLIA_CONTRACTS,
  RPC_URLS,
  WORLDCHAIN_SEPOLIA_CONTRACTS,
} from '@/config/contracts';

const CHAIN_LABELS: Record<number, string> = {
  1: 'Ethereum Mainnet',
  56: 'BNB Smart Chain',
  97: 'BNB Smart Chain Testnet',
  137: 'Polygon',
  42161: 'Arbitrum One',
  421614: 'Arbitrum Sepolia',
  8453: 'Base',
  84532: 'Base Sepolia',
  43114: 'Avalanche',
  43113: 'Avalanche Fuji',
  4801: 'World Chain Sepolia',
  11155111: 'Ethereum Sepolia',
  11155420: 'Optimism Sepolia',
};

export type ProtocolNetworkStatus = 'live' | 'blocked' | 'coming';
export type ProtocolNetworkIcon = 'avalanche' | 'bnb' | 'base' | 'polygon' | 'solana' | 'ethereum' | 'arbitrum' | 'optimism' | 'worldchain' | 'generic';

export interface ProtocolNetworkOption {
  chainId?: number | null;
  key: string;
  label: string;
  shortLabel: string;
  icon: ProtocolNetworkIcon;
  status: ProtocolNetworkStatus;
  statusReason?: string;
  contracts?: typeof CONTRACTS | null;
  rpcUrl?: string | null;
  explorerUrl?: string | null;
  aliases?: string[];
}

export const PROTOCOL_NETWORK_OPTIONS: ProtocolNetworkOption[] = [
  {
    chainId: 97,
    key: 'bnb-testnet',
    label: 'BNB Chain Testnet',
    shortLabel: 'BNB Testnet',
    icon: 'bnb',
    status: 'live',
    contracts: CONTRACTS,
    rpcUrl: RPC_URLS[97],
    explorerUrl: EXPLORER_URLS[97],
    aliases: ['bsc testnet', 'bnb testnet', 'mainnet-v3'],
  },
  {
    chainId: 84532,
    key: 'base-sepolia',
    label: 'Base Sepolia',
    shortLabel: 'Base Sepolia',
    icon: 'base',
    status: 'live',
    contracts: BASE_SEPOLIA_CONTRACTS,
    rpcUrl: RPC_URLS[84532],
    explorerUrl: EXPLORER_URLS[84532],
    aliases: ['base sepolia', 'base testnet'],
  },
  {
    chainId: 421614,
    key: 'arbitrum-sepolia',
    label: 'Arbitrum Sepolia',
    shortLabel: 'Arbitrum Sepolia',
    icon: 'arbitrum',
    status: 'live',
    contracts: ARBITRUM_SEPOLIA_CONTRACTS,
    rpcUrl: RPC_URLS[421614],
    explorerUrl: EXPLORER_URLS[421614],
    aliases: ['arbitrum sepolia', 'arb sepolia', 'arbitrum testnet'],
  },
  {
    chainId: 11155111,
    key: 'ethereum-sepolia',
    label: 'Ethereum Sepolia',
    shortLabel: 'Ethereum Sepolia',
    icon: 'ethereum',
    status: 'live',
    contracts: ETHEREUM_SEPOLIA_CONTRACTS,
    rpcUrl: RPC_URLS[11155111],
    explorerUrl: EXPLORER_URLS[11155111],
    aliases: ['ethereum sepolia', 'eth sepolia', 'sepolia', 'ethereum testnet'],
  },
  {
    chainId: 11155420,
    key: 'optimism-sepolia',
    label: 'Optimism Sepolia',
    shortLabel: 'Optimism Sepolia',
    icon: 'optimism',
    status: 'live',
    contracts: OPTIMISM_SEPOLIA_CONTRACTS,
    rpcUrl: RPC_URLS[11155420],
    explorerUrl: EXPLORER_URLS[11155420],
    aliases: ['optimism sepolia', 'op sepolia', 'optimism testnet'],
  },
  {
    chainId: 43113,
    key: 'avalanche-fuji',
    label: 'Avalanche Fuji',
    shortLabel: 'Avalanche Fuji',
    icon: 'avalanche',
    status: 'live',
    contracts: AVALANCHE_FUJI_CONTRACTS,
    rpcUrl: RPC_URLS[43113],
    explorerUrl: EXPLORER_URLS[43113],
    aliases: ['avalanche fuji', 'fuji', 'avax fuji', 'avalanche testnet'],
  },
  {
    chainId: 4801,
    key: 'worldchain-sepolia',
    label: 'World Chain Sepolia',
    shortLabel: 'World Sepolia',
    icon: 'worldchain',
    status: 'live',
    contracts: WORLDCHAIN_SEPOLIA_CONTRACTS,
    rpcUrl: RPC_URLS[4801],
    explorerUrl: EXPLORER_URLS[4801],
    aliases: ['worldchain sepolia', 'world chain sepolia', 'world sepolia', 'worldchain testnet', 'world testnet'],
  },
  {
    chainId: 43114,
    key: 'avalanche',
    label: 'Avalanche',
    shortLabel: 'Avalanche',
    icon: 'avalanche',
    status: 'coming',
    contracts: null,
    rpcUrl: RPC_URLS[43114] ?? null,
    explorerUrl: EXPLORER_URLS[43114] ?? null,
    aliases: ['avalanche c-chain'],
  },
  {
    chainId: 8453,
    key: 'base',
    label: 'Base',
    shortLabel: 'Base',
    icon: 'base',
    status: 'coming',
    contracts: null,
    rpcUrl: RPC_URLS[8453] ?? null,
    explorerUrl: EXPLORER_URLS[8453] ?? null,
  },
  {
    chainId: 137,
    key: 'polygon',
    label: 'Polygon',
    shortLabel: 'Polygon',
    icon: 'polygon',
    status: 'coming',
    contracts: null,
    rpcUrl: RPC_URLS[137] ?? null,
    explorerUrl: EXPLORER_URLS[137] ?? null,
    aliases: ['polygon network'],
  },
  {
    chainId: null,
    key: 'solana',
    label: 'Solana',
    shortLabel: 'Solana',
    icon: 'solana',
    status: 'coming',
    contracts: null,
    rpcUrl: null,
    explorerUrl: null,
  },
  {
    chainId: 1,
    key: 'ethereum',
    label: 'Ethereum Mainnet',
    shortLabel: 'Ethereum',
    icon: 'ethereum',
    status: 'coming',
    contracts: null,
    rpcUrl: RPC_URLS[1] ?? null,
    explorerUrl: EXPLORER_URLS[1] ?? null,
    aliases: ['ethereum', 'eth', 'ethereum mainnet'],
  },
];

export const LIVE_PROTOCOL_NETWORK =
  PROTOCOL_NETWORK_OPTIONS.find((network) => network.status === 'live') ?? PROTOCOL_NETWORK_OPTIONS[0];

export const LIVE_PROTOCOL_CHAIN_ID = LIVE_PROTOCOL_NETWORK.chainId ?? ACTIVE_CHAIN_ID;
export const LIVE_PROTOCOL_CONTRACTS = LIVE_PROTOCOL_NETWORK.contracts ?? CONTRACTS;
export const LIVE_PROTOCOL_RPC_URL = LIVE_PROTOCOL_NETWORK.rpcUrl ?? RPC_URLS[LIVE_PROTOCOL_CHAIN_ID as keyof typeof RPC_URLS] ?? null;
export const LIVE_PROTOCOL_EXPLORER_URL = LIVE_PROTOCOL_NETWORK.explorerUrl ?? EXPLORER_URLS[LIVE_PROTOCOL_CHAIN_ID as keyof typeof EXPLORER_URLS] ?? null;

export const PROTOCOL_NETWORK_STORAGE_KEY = 'orina:protocol-network-key';

function normalizeNetworkValue(value?: string | number | null) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');
}

export function getChainLabel(chainId?: number | null) {
  if (!chainId || chainId <= 0) return 'Unknown Network';
  return CHAIN_LABELS[chainId] ?? `Chain ${chainId}`;
}

export function formatChainLabel(chainId?: number | null) {
  if (!chainId || chainId <= 0) return 'Unknown Network';
  return `${getChainLabel(chainId)} (id: ${chainId})`;
}

export function getProtocolNetworkOption(chainId?: number | null) {
  if (!chainId || chainId <= 0) return undefined;
  return PROTOCOL_NETWORK_OPTIONS.find((network) => network.chainId === chainId);
}

export function getProtocolNetworkOptionByKey(key?: string | null) {
  const normalizedKey = normalizeNetworkValue(key);
  if (!normalizedKey) return undefined;
  return PROTOCOL_NETWORK_OPTIONS.find((network) => normalizeNetworkValue(network.key) === normalizedKey);
}

export function resolveStoredProtocolNetworkKey(key?: string | null) {
  const storedNetwork = getProtocolNetworkOptionByKey(key);
  if (storedNetwork?.status === 'live' && storedNetwork.contracts) {
    return storedNetwork.key;
  }
  return LIVE_PROTOCOL_NETWORK.key;
}

export function resolveStoredProtocolNetworkOption(key?: string | null) {
  return getProtocolNetworkOptionByKey(resolveStoredProtocolNetworkKey(key)) ?? LIVE_PROTOCOL_NETWORK;
}

export function findProtocolNetworkOptionByValue(value?: string | number | null) {
  const normalized = normalizeNetworkValue(value);
  if (!normalized) return undefined;

  return PROTOCOL_NETWORK_OPTIONS.find((network) => {
    if (normalizeNetworkValue(network.key) === normalized) return true;
    if (normalizeNetworkValue(network.label) === normalized) return true;
    if (normalizeNetworkValue(network.shortLabel) === normalized) return true;
    return Boolean(network.aliases?.some((alias) => normalizeNetworkValue(alias) === normalized));
  });
}

export function getProtocolNetworkLabel(chainId?: number | null) {
  return getProtocolNetworkOption(chainId)?.shortLabel ?? getChainLabel(chainId);
}

export function resolveProtocolNetwork(chainId?: number | null): ProtocolNetworkOption {
  return (
    getProtocolNetworkOption(chainId) ?? {
      chainId,
      key: chainId ? `chain-${chainId}` : 'generic',
      label: getChainLabel(chainId),
      shortLabel: getChainLabel(chainId),
      icon: 'generic',
      status: 'coming',
    }
  );
}

export function isProtocolNetworkLive(chainId?: number | null) {
  return getProtocolNetworkOption(chainId)?.status === 'live';
}

export function isProtocolNetworkWriteEnabled(chainId?: number | null) {
  const network = getProtocolNetworkOption(chainId);
  return Boolean(network && network.status === 'live' && network.contracts);
}

export function getProtocolContracts(chainId?: number | null) {
  return getProtocolNetworkOption(chainId)?.contracts ?? null;
}

export const PROTOCOL_CHAIN_LABEL = formatChainLabel(LIVE_PROTOCOL_CHAIN_ID);
