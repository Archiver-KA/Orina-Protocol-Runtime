import type { MarketplaceAsset } from '@/app/types/asset';
import {
  findProtocolNetworkOptionByValue,
  getProtocolNetworkOption,
  type ProtocolNetworkStatus,
} from '@/utils/protocolNetwork';

type MarketplaceBlockchain = MarketplaceAsset['blockchain'];
type MarketplaceNetwork = MarketplaceAsset['network'];

export type MarketplaceNetworkFilterOption = {
  value: string;
  label: string;
};

export type MarketplaceChainInfo = {
  blockchain: MarketplaceBlockchain;
  network: MarketplaceNetwork;
  filterValue: string;
  label: string;
  fullName: string;
  chainId: string;
  currency: string;
  explorer: string;
  blockTime: string;
  consensus: string;
  color: string;
  status: ProtocolNetworkStatus;
};

type MarketplaceChainInfoInput = {
  blockchain?: string | null;
  network?: string | null;
  chainId?: number | null;
};

type MarketplaceChainDefinition = Omit<MarketplaceChainInfo, 'status' | 'chainId'> & {
  chainId: number;
};

export function normalizeMarketplaceNetworkValue(value?: string | number | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');
}

function buildChainInfo(definition: MarketplaceChainDefinition): MarketplaceChainInfo {
  const protocolOption = getProtocolNetworkOption(definition.chainId);

  return {
    ...definition,
    chainId: String(definition.chainId),
    status: protocolOption?.status ?? 'coming',
  };
}

const CHAIN_INFOS = {
  'bnb-testnet': buildChainInfo({
    blockchain: 'BSC',
    network: 'testnet',
    filterValue: 'bnb-testnet',
    label: 'BNB Testnet',
    fullName: 'BNB Smart Chain',
    currency: 'tBNB',
    explorer: 'testnet.bscscan.com',
    blockTime: '~3s',
    consensus: 'PoSA',
    color: '#F0B90B',
    chainId: 97,
  }),
  bsc: buildChainInfo({
    blockchain: 'BSC',
    network: 'mainnet',
    filterValue: 'bsc',
    label: 'BNB Chain',
    fullName: 'BNB Smart Chain',
    currency: 'BNB',
    explorer: 'bscscan.com',
    blockTime: '~3s',
    consensus: 'PoSA',
    color: '#F0B90B',
    chainId: 56,
  }),
  ethereum: buildChainInfo({
    blockchain: 'Ethereum',
    network: 'mainnet',
    filterValue: 'ethereum',
    label: 'Ethereum',
    fullName: 'Ethereum',
    currency: 'ETH',
    explorer: 'etherscan.io',
    blockTime: '~12s',
    consensus: 'PoS',
    color: '#627EEA',
    chainId: 1,
  }),
  'ethereum-testnet': buildChainInfo({
    blockchain: 'Ethereum',
    network: 'testnet',
    filterValue: 'ethereum-testnet',
    label: 'Ethereum Sepolia',
    fullName: 'Ethereum',
    currency: 'ETH',
    explorer: 'sepolia.etherscan.io',
    blockTime: '~12s',
    consensus: 'PoS',
    color: '#627EEA',
    chainId: 11155111,
  }),
  polygon: buildChainInfo({
    blockchain: 'Polygon',
    network: 'mainnet',
    filterValue: 'polygon',
    label: 'Polygon',
    fullName: 'Polygon PoS',
    currency: 'MATIC',
    explorer: 'polygonscan.com',
    blockTime: '~2s',
    consensus: 'PoS',
    color: '#8247E5',
    chainId: 137,
  }),
  arbitrum: buildChainInfo({
    blockchain: 'Arbitrum',
    network: 'mainnet',
    filterValue: 'arbitrum',
    label: 'Arbitrum',
    fullName: 'Arbitrum One',
    currency: 'ETH',
    explorer: 'arbiscan.io',
    blockTime: '~0.26s',
    consensus: 'Optimistic',
    color: '#28A0F0',
    chainId: 42161,
  }),
  'arbitrum-sepolia': buildChainInfo({
    blockchain: 'Arbitrum',
    network: 'testnet',
    filterValue: 'arbitrum-sepolia',
    label: 'Arbitrum Sepolia',
    fullName: 'Arbitrum Sepolia',
    currency: 'ETH',
    explorer: 'sepolia.arbiscan.io',
    blockTime: '~0.26s',
    consensus: 'Optimistic',
    color: '#28A0F0',
    chainId: 421614,
  }),
  base: buildChainInfo({
    blockchain: 'Base',
    network: 'mainnet',
    filterValue: 'base',
    label: 'Base',
    fullName: 'Base',
    currency: 'ETH',
    explorer: 'basescan.org',
    blockTime: '~2s',
    consensus: 'Optimistic',
    color: '#0052FF',
    chainId: 8453,
  }),
  'base-sepolia': buildChainInfo({
    blockchain: 'Base',
    network: 'testnet',
    filterValue: 'base-sepolia',
    label: 'Base Sepolia',
    fullName: 'Base Sepolia',
    currency: 'ETH',
    explorer: 'sepolia.basescan.org',
    blockTime: '~2s',
    consensus: 'Optimistic',
    color: '#0052FF',
    chainId: 84532,
  }),
} as const;

const CHAIN_INFO_BY_CHAIN_ID: Record<number, MarketplaceChainInfo> = {
  1: CHAIN_INFOS.ethereum,
  56: CHAIN_INFOS.bsc,
  97: CHAIN_INFOS['bnb-testnet'],
  137: CHAIN_INFOS.polygon,
  8453: CHAIN_INFOS.base,
  84532: CHAIN_INFOS['base-sepolia'],
  42161: CHAIN_INFOS.arbitrum,
  421614: CHAIN_INFOS['arbitrum-sepolia'],
  11155111: CHAIN_INFOS['ethereum-testnet'],
};

const DEFAULT_CHAIN_INFO = CHAIN_INFOS['bnb-testnet'];

function getChainInfoFromProtocolValue(value?: string | number | null): MarketplaceChainInfo | undefined {
  const protocolOption = findProtocolNetworkOptionByValue(value);
  if (!protocolOption) return undefined;

  switch (protocolOption.key) {
    case 'bnb-testnet':
      return CHAIN_INFOS['bnb-testnet'];
    case 'ethereum':
      return CHAIN_INFOS.ethereum;
    case 'polygon':
      return CHAIN_INFOS.polygon;
    case 'arbitrum':
      return CHAIN_INFOS.arbitrum;
    case 'arbitrum-sepolia':
      return CHAIN_INFOS['arbitrum-sepolia'];
    case 'base':
      return CHAIN_INFOS.base;
    case 'base-sepolia':
      return CHAIN_INFOS['base-sepolia'];
    default:
      return undefined;
  }
}

function getChainInfoFromText(
  blockchain?: string | null,
  network?: string | null,
): MarketplaceChainInfo | undefined {
  const normalizedBlockchain = normalizeMarketplaceNetworkValue(blockchain);
  const normalizedNetwork = normalizeMarketplaceNetworkValue(network);

  if (
    normalizedBlockchain === 'bsc' ||
    normalizedBlockchain === 'bnb' ||
    normalizedBlockchain === 'bnb-chain' ||
    normalizedBlockchain === 'bnb-smart-chain' ||
    normalizedBlockchain === 'smartchain' ||
    normalizedBlockchain === 'bsc-testnet' ||
    normalizedBlockchain === 'bnb-testnet' ||
    normalizedBlockchain === 'bnb-smart-chain-testnet'
  ) {
    return normalizedBlockchain.includes('testnet') || normalizedNetwork === 'testnet'
      ? CHAIN_INFOS['bnb-testnet']
      : CHAIN_INFOS.bsc;
  }

  if (
    normalizedBlockchain === 'ethereum-testnet' ||
    normalizedBlockchain === 'ethereum-sepolia' ||
    normalizedBlockchain === 'eth-sepolia' ||
    normalizedBlockchain === 'sepolia'
  ) {
    return CHAIN_INFOS['ethereum-testnet'];
  }

  if (
    normalizedBlockchain === 'ethereum' ||
    normalizedBlockchain === 'eth' ||
    normalizedBlockchain === 'ethereum-mainnet'
  ) {
    return normalizedNetwork === 'testnet' ? CHAIN_INFOS['ethereum-testnet'] : CHAIN_INFOS.ethereum;
  }

  if (
    normalizedBlockchain === 'polygon' ||
    normalizedBlockchain === 'polygon-network' ||
    normalizedBlockchain === 'polygon-pos'
  ) {
    return CHAIN_INFOS.polygon;
  }

  if (
    normalizedBlockchain === 'arbitrum-sepolia' ||
    normalizedBlockchain === 'arb-sepolia' ||
    normalizedBlockchain === 'arbitrum-testnet'
  ) {
    return CHAIN_INFOS['arbitrum-sepolia'];
  }

  if (normalizedBlockchain === 'arbitrum' || normalizedBlockchain === 'arbitrum-one') {
    return normalizedNetwork === 'testnet' ? CHAIN_INFOS['arbitrum-sepolia'] : CHAIN_INFOS.arbitrum;
  }

  if (normalizedBlockchain === 'base-sepolia' || normalizedBlockchain === 'base-testnet') {
    return CHAIN_INFOS['base-sepolia'];
  }

  if (normalizedBlockchain === 'base') {
    return normalizedNetwork === 'testnet' ? CHAIN_INFOS['base-sepolia'] : CHAIN_INFOS.base;
  }

  if (!normalizedBlockchain && normalizedNetwork === 'testnet') {
    return DEFAULT_CHAIN_INFO;
  }

  return undefined;
}

export function getMarketplaceAssetChainInfo(
  input: MarketplaceChainInfoInput,
): MarketplaceChainInfo {
  if (input.chainId && CHAIN_INFO_BY_CHAIN_ID[input.chainId]) {
    return CHAIN_INFO_BY_CHAIN_ID[input.chainId];
  }

  return (
    getChainInfoFromProtocolValue(input.blockchain) ||
    getChainInfoFromProtocolValue(input.network) ||
    getChainInfoFromText(input.blockchain, input.network) ||
    DEFAULT_CHAIN_INFO
  );
}

export function getMarketplaceAssetFilterValue(input: MarketplaceChainInfoInput): string {
  return getMarketplaceAssetChainInfo(input).filterValue;
}

export function getMarketplaceAssetNetworkFilterOption(
  input: MarketplaceChainInfoInput,
): MarketplaceNetworkFilterOption {
  const chainInfo = getMarketplaceAssetChainInfo(input);
  return {
    value: chainInfo.filterValue,
    label: chainInfo.label,
  };
}

export function matchesMarketplaceAssetFilter(
  input: MarketplaceChainInfoInput,
  candidate: string,
): boolean {
  const normalizedCandidate = normalizeMarketplaceNetworkValue(candidate);
  if (!normalizedCandidate) return false;

  const chainInfo = getMarketplaceAssetChainInfo(input);
  const normalizedBlockchain = normalizeMarketplaceNetworkValue(input.blockchain);
  const normalizedNetwork = normalizeMarketplaceNetworkValue(input.network);

  return (
    normalizedCandidate === chainInfo.filterValue ||
    Boolean(normalizedBlockchain && normalizedCandidate === normalizedBlockchain) ||
    Boolean(
      normalizedBlockchain &&
        normalizedNetwork &&
        normalizedCandidate === `${normalizedBlockchain}-${normalizedNetwork}`
    ) ||
    Boolean(normalizedNetwork && normalizedCandidate === normalizedNetwork)
  );
}

export function getMarketplaceNetworkFilterOptionLabel(value: string): string {
  const normalizedValue = normalizeMarketplaceNetworkValue(value);
  if (!normalizedValue) return '';

  const match = Object.values(CHAIN_INFOS).find(
    (info) =>
      normalizeMarketplaceNetworkValue(info.filterValue) === normalizedValue ||
      normalizeMarketplaceNetworkValue(info.label) === normalizedValue,
  );

  return match?.label ?? value;
}
