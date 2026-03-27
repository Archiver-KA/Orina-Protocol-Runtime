import { ACTIVE_CHAIN_ID } from '@/config/contracts';

const CHAIN_LABELS: Record<number, string> = {
  1: 'Ethereum Mainnet',
  56: 'BNB Smart Chain',
  97: 'BNB Smart Chain Testnet',
  137: 'Polygon',
  8453: 'Base',
  43114: 'Avalanche',
  11155111: 'Ethereum Sepolia',
};

export type ProtocolNetworkStatus = 'live' | 'coming';
export type ProtocolNetworkIcon = 'avalanche' | 'bnb' | 'base' | 'polygon' | 'solana' | 'ethereum' | 'generic';

export interface ProtocolNetworkOption {
  chainId?: number | null;
  key: string;
  label: string;
  shortLabel: string;
  icon: ProtocolNetworkIcon;
  status: ProtocolNetworkStatus;
}

export const PROTOCOL_NETWORK_OPTIONS: ProtocolNetworkOption[] = [
  {
    chainId: 97,
    key: 'bnb-testnet',
    label: 'BNB Chain Testnet',
    shortLabel: 'BNB Testnet',
    icon: 'bnb',
    status: 'live',
  },
  {
    chainId: 43114,
    key: 'avalanche',
    label: 'Avalanche',
    shortLabel: 'Avalanche',
    icon: 'avalanche',
    status: 'coming',
  },
  {
    chainId: 8453,
    key: 'base',
    label: 'Base',
    shortLabel: 'Base',
    icon: 'base',
    status: 'coming',
  },
  {
    chainId: 137,
    key: 'polygon',
    label: 'Polygon',
    shortLabel: 'Polygon',
    icon: 'polygon',
    status: 'coming',
  },
  {
    chainId: null,
    key: 'solana',
    label: 'Solana',
    shortLabel: 'Solana',
    icon: 'solana',
    status: 'coming',
  },
  {
    chainId: 1,
    key: 'ethereum',
    label: 'Ethereum',
    shortLabel: 'Ethereum',
    icon: 'ethereum',
    status: 'coming',
  },
];

export const LIVE_PROTOCOL_NETWORK =
  PROTOCOL_NETWORK_OPTIONS.find((network) => network.status === 'live') ?? PROTOCOL_NETWORK_OPTIONS[0];

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

export const PROTOCOL_CHAIN_LABEL = formatChainLabel(ACTIVE_CHAIN_ID);
