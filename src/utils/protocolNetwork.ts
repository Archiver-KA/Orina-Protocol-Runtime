import { ACTIVE_CHAIN_ID } from '@/config/contracts';

const CHAIN_LABELS: Record<number, string> = {
  1: 'Ethereum Mainnet',
  56: 'BNB Smart Chain',
  97: 'BNB Smart Chain Testnet',
  11155111: 'Ethereum Sepolia',
};

export function getChainLabel(chainId?: number | null) {
  if (!chainId || chainId <= 0) return 'Unknown Network';
  return CHAIN_LABELS[chainId] ?? `Chain ${chainId}`;
}

export function formatChainLabel(chainId?: number | null) {
  if (!chainId || chainId <= 0) return 'Unknown Network';
  return `${getChainLabel(chainId)} (id: ${chainId})`;
}

export const PROTOCOL_CHAIN_LABEL = formatChainLabel(ACTIVE_CHAIN_ID);
