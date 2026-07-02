import { arbitrumSepolia, avalancheFuji, baseSepolia, bscTestnet, optimismSepolia, sepolia, worldchainSepolia } from 'viem/chains';

export const CAMPAIGN_ROOT = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign';

export const V35_TESTNET_NETWORKS = {
  'bnb-testnet': {
    key: 'bnb-testnet',
    aliases: ['bsc', 'bsc-testnet', 'bnb', 'bnb-testnet', '97'],
    label: 'BNB Chain Testnet',
    shortLabel: 'BSC Testnet',
    blockchain: 'BSC',
    chainId: 97,
    viemChain: bscTestnet,
    defaultRpcUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/',
    rpcEnvVars: ['BSC_TESTNET_RPC_URL', 'RPC_URL'],
    explorerBaseUrl: 'https://testnet.bscscan.com',
    assetContract: '0x3a591AB1aB3A281f999AAD1644b020CbEC463C47',
    marketplace: '0x18E1C8ab257FAf16Ec8257A9715d07661194150B',
    paymentGateway: '0x082d75D8cA96C6e97B6b451Ad4857454A53D5C15',
    delegationManager: '0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13',
    aiWalletFactoryV2: '0xD838268fa8dF6AFD1Fd79D9C0Fd243A3D23D0441',
    faucet: '0x6527262782C140e0A4724bef06431786556AfDE0',
    tokens: {
      usdt: '0x8800279B4a5528628ef069698169C58B89377809',
      usdc: '0xbdcA834A71F5BFF1420eb5D1B0491d58a33141E5',
      wbnb: '0xae13d989dac2f0debff460ac112a837c89baa7cd',
    },
    nativeSymbol: 'BNB',
    catalogUidPrefix: '',
    executionSegment: 'v3_5_beta_seed_assets_001',
  },
  'base-sepolia': {
    key: 'base-sepolia',
    aliases: ['base', 'base-sepolia', '84532'],
    label: 'Base Sepolia',
    shortLabel: 'Base Sepolia',
    blockchain: 'Base',
    chainId: 84532,
    viemChain: baseSepolia,
    defaultRpcUrl: 'https://sepolia.base.org',
    rpcEnvVars: ['BASE_SEPOLIA_RPC_URL', 'RPC_URL'],
    explorerBaseUrl: 'https://sepolia.basescan.org',
    assetContract: '0x0a9efc1fb95be24743b1452ac4c974E5E925A453',
    marketplace: '0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14',
    paymentGateway: '0x1A880Ae46993282dd77C2dDCc5e36498eB616C92',
    delegationManager: '0xFC0038B7CC628966f8a7f14414c9386c2d6cB288',
    aiWalletFactoryV2: '0x0E5E106A7F81233Fe07115Aeb3777e847adB09cB',
    faucet: '0xbBd53C18F4d9fb98aA6c4837Ea0E8F221E1B5F0F',
    tokens: {
      ori: '0xD87493f4C02aad2c67Ce12aa534d188Bf44FCcAB',
      usdt: '0x11E6c8f2806b32dAC427E7Df07F67602647eF87A',
      usdc: '0xD6E84789741Ea2DE727961cCB383454E4A845035',
    },
    nativeSymbol: 'ETH',
    catalogUidPrefix: 'base-sepolia-',
    executionSegment: 'v3_5_beta_seed_assets_001_base_sepolia',
  },
  'arbitrum-sepolia': {
    key: 'arbitrum-sepolia',
    aliases: ['arb', 'arbitrum', 'arbitrum-sepolia', '421614'],
    label: 'Arbitrum Sepolia',
    shortLabel: 'Arbitrum Sepolia',
    blockchain: 'Arbitrum',
    chainId: 421614,
    viemChain: arbitrumSepolia,
    defaultRpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    rpcEnvVars: ['ARBITRUM_SEPOLIA_RPC_URL', 'ARB_SEPOLIA_RPC_URL', 'RPC_URL'],
    explorerBaseUrl: 'https://sepolia.arbiscan.io',
    assetContract: '0x0244Ad5ca0BC9Cd8555352Cd53Dc51Fd8eD2f011',
    marketplace: '0x5863f25A8250EBe20Bd1E3d04FD796081Fc3D72E',
    paymentGateway: '0x39F539903b75A0bF0FEF16a443904C8c9DF787EE',
    delegationManager: '0x56D454f55D5d05b060777F70e653BbBEb1167D2e',
    aiWalletFactoryV2: '0x143519194A9Df4678b602BEE329C1A96381d1CBD',
    faucet: '0xFA37557E4F6D066f6CF4B69BA865837d007c8D1e',
    tokens: {
      ori: '0x5e41f1155AB4E614037C9C481BB8c1d398915cd0',
      usdt: '0x279c62C97c6967d0E0F45f9D2460d38E3929c090',
      usdc: '0x233Fb28c8166807b01DcBE2743bb85cF7cdC8b41',
    },
    nativeSymbol: 'ETH',
    catalogUidPrefix: 'arbitrum-sepolia-',
    executionSegment: 'v3_5_beta_seed_assets_001_arbitrum_sepolia',
  },
  'ethereum-sepolia': {
    key: 'ethereum-sepolia',
    aliases: ['eth', 'ethereum', 'ethereum-sepolia', 'ethereum-testnet', 'sepolia', '11155111'],
    label: 'Ethereum Sepolia',
    shortLabel: 'Ethereum Sepolia',
    blockchain: 'Ethereum',
    chainId: 11155111,
    viemChain: sepolia,
    defaultRpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    rpcEnvVars: ['ETHEREUM_SEPOLIA_RPC_URL', 'SEPOLIA_RPC_URL', 'RPC_URL'],
    explorerBaseUrl: 'https://sepolia.etherscan.io',
    assetContract: '0x0a9efc1fb95be24743b1452ac4c974E5E925A453',
    marketplace: '0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14',
    paymentGateway: '0x1A880Ae46993282dd77C2dDCc5e36498eB616C92',
    delegationManager: '0x52440e44ec34a64e19b92243262fe47819d65539',
    aiWalletFactoryV2: '0x7D6b498eDc3F469ED020116e8892EbB361753bCB',
    faucet: '0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F',
    tokens: {
      ori: '0xD87493f4C02aad2c67Ce12aa534d188Bf44FCcAB',
      usdt: '0x11E6c8f2806b32dAC427E7Df07F67602647eF87A',
      usdc: '0xD6E84789741Ea2DE727961cCB383454E4A845035',
    },
    nativeSymbol: 'ETH',
    catalogUidPrefix: 'ethereum-sepolia-',
    executionSegment: 'v3_5_beta_seed_assets_001_ethereum_sepolia',
  },
  'optimism-sepolia': {
    key: 'optimism-sepolia',
    aliases: ['op', 'optimism', 'op-sepolia', 'optimism-sepolia', 'optimism-testnet', '11155420'],
    label: 'Optimism Sepolia',
    shortLabel: 'Optimism Sepolia',
    blockchain: 'Optimism',
    chainId: 11155420,
    viemChain: optimismSepolia,
    defaultRpcUrl: 'https://optimism-sepolia-rpc.publicnode.com',
    rpcEnvVars: ['OPTIMISM_SEPOLIA_RPC_URL', 'OP_SEPOLIA_RPC_URL', 'RPC_URL'],
    explorerBaseUrl: 'https://sepolia-optimism.etherscan.io',
    assetContract: '0x0a9efc1fb95be24743b1452ac4c974E5E925A453',
    marketplace: '0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14',
    paymentGateway: '0x1A880Ae46993282dd77C2dDCc5e36498eB616C92',
    delegationManager: '0x52440e44ec34a64e19b92243262fe47819d65539',
    aiWalletFactoryV2: '0x7D6b498eDc3F469ED020116e8892EbB361753bCB',
    faucet: '0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F',
    tokens: {
      ori: '0xD87493f4C02aad2c67Ce12aa534d188Bf44FCcAB',
      usdt: '0x11E6c8f2806b32dAC427E7Df07F67602647eF87A',
      usdc: '0xD6E84789741Ea2DE727961cCB383454E4A845035',
    },
    nativeSymbol: 'ETH',
    catalogUidPrefix: 'optimism-sepolia-',
    executionSegment: 'v3_5_beta_seed_assets_001_optimism_sepolia',
  },
  'avalanche-fuji': {
    key: 'avalanche-fuji',
    aliases: ['avax', 'avalanche', 'fuji', 'avalanche-fuji', 'avalanche-testnet', '43113'],
    label: 'Avalanche Fuji',
    shortLabel: 'Avalanche Fuji',
    blockchain: 'Avalanche',
    chainId: 43113,
    viemChain: avalancheFuji,
    defaultRpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    rpcEnvVars: ['AVALANCHE_FUJI_RPC_URL', 'FUJI_RPC_URL', 'RPC_URL'],
    explorerBaseUrl: 'https://testnet.snowscan.xyz',
    assetContract: '0x0a9efc1fb95be24743b1452ac4c974E5E925A453',
    marketplace: '0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14',
    paymentGateway: '0x1A880Ae46993282dd77C2dDCc5e36498eB616C92',
    delegationManager: '0x52440e44ec34a64e19b92243262fe47819d65539',
    aiWalletFactoryV2: '0x7D6b498eDc3F469ED020116e8892EbB361753bCB',
    faucet: '0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F',
    tokens: {
      ori: '0xD87493f4C02aad2c67Ce12aa534d188Bf44FCcAB',
      usdt: '0x11E6c8f2806b32dAC427E7Df07F67602647eF87A',
      usdc: '0xD6E84789741Ea2DE727961cCB383454E4A845035',
    },
    nativeSymbol: 'AVAX',
    catalogUidPrefix: 'avalanche-fuji-',
    executionSegment: 'v3_5_beta_seed_assets_001_avalanche_fuji',
  },
  'worldchain-sepolia': {
    key: 'worldchain-sepolia',
    aliases: ['world', 'worldchain', 'world-chain', 'world-sepolia', 'worldchain-sepolia', 'worldchain-testnet', '4801'],
    label: 'World Chain Sepolia',
    shortLabel: 'World Sepolia',
    blockchain: 'World Chain',
    chainId: 4801,
    viemChain: worldchainSepolia,
    defaultRpcUrl: 'https://worldchain-sepolia.g.alchemy.com/public',
    rpcEnvVars: ['WORLDCHAIN_SEPOLIA_RPC_URL', 'WORLD_SEPOLIA_RPC_URL', 'RPC_URL'],
    explorerBaseUrl: 'https://worldchain-sepolia.explorer.alchemy.com',
    assetContract: '0x0a9efc1fb95be24743b1452ac4c974E5E925A453',
    marketplace: '0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14',
    paymentGateway: '0x1A880Ae46993282dd77C2dDCc5e36498eB616C92',
    delegationManager: '0x5e41f1155AB4E614037C9C481BB8c1d398915cd0',
    aiWalletFactoryV2: '0x279c62C97c6967d0E0F45f9D2460d38E3929c090',
    faucet: '0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F',
    tokens: {
      ori: '0xD87493f4C02aad2c67Ce12aa534d188Bf44FCcAB',
      usdt: '0x11E6c8f2806b32dAC427E7Df07F67602647eF87A',
      usdc: '0xD6E84789741Ea2DE727961cCB383454E4A845035',
    },
    nativeSymbol: 'ETH',
    catalogUidPrefix: 'worldchain-sepolia-',
    executionSegment: 'v3_5_beta_seed_assets_001_worldchain_sepolia',
  },
};

export function resolveV35TestnetNetwork(value = 'bnb-testnet') {
  const normalized = String(value || 'bnb-testnet').trim().toLowerCase();
  for (const network of Object.values(V35_TESTNET_NETWORKS)) {
    if (network.key === normalized || network.aliases.includes(normalized)) return network;
  }
  throw new Error(`Unsupported testnet network: ${value}`);
}

export function resolveRpcUrl(network, options = {}) {
  if (options.rpcUrl) return options.rpcUrl;
  for (const key of network.rpcEnvVars || []) {
    const value = process.env[key];
    if (value) return value;
  }
  return network.defaultRpcUrl;
}

export function buildNetworkAssetUid(network, sourceAssetUid) {
  const normalized = String(sourceAssetUid || '').trim().toLowerCase();
  return `${network.catalogUidPrefix || ''}${normalized}`;
}

export function explorerTxUrl(network, txHash) {
  return txHash ? `${network.explorerBaseUrl}/tx/${txHash}` : '';
}

const EIP1559_BASE_FEE_BUFFER_MULTIPLIER = 3n;

export function buildBufferedEip1559FeeOverrides({
  baseFeePerGas,
  estimatedMaxFeePerGas,
  estimatedMaxPriorityFeePerGas,
} = {}) {
  const latestBaseFee = baseFeePerGas ?? 0n;
  if (latestBaseFee <= 0n) return {};

  const estimatedMaxFee = estimatedMaxFeePerGas ?? 0n;
  const bufferedMaxFee = latestBaseFee * EIP1559_BASE_FEE_BUFFER_MULTIPLIER;
  return {
    maxFeePerGas: estimatedMaxFee > bufferedMaxFee ? estimatedMaxFee : bufferedMaxFee,
    maxPriorityFeePerGas: estimatedMaxPriorityFeePerGas ?? 0n,
  };
}

export async function resolveBufferedEip1559FeeOverrides(publicClient) {
  if (!publicClient) return {};

  try {
    const [block, estimatedFees] = await Promise.all([
      publicClient.getBlock({ blockTag: 'latest' }),
      publicClient.estimateFeesPerGas?.().catch(() => ({})) ?? Promise.resolve({}),
    ]);
    return buildBufferedEip1559FeeOverrides({
      baseFeePerGas: block.baseFeePerGas,
      estimatedMaxFeePerGas: estimatedFees.maxFeePerGas,
      estimatedMaxPriorityFeePerGas: estimatedFees.maxPriorityFeePerGas,
    });
  } catch {
    return {};
  }
}
