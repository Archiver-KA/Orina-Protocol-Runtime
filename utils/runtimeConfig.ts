const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const DEFAULT_SUPABASE_FUNCTIONS_NAMESPACE = 'make-server-b0d68fc8';

function readString(name: string, fallback = ''): string {
  const value = env[name];
  return typeof value === 'string' ? value.trim() : fallback;
}

function readFlag(name: string, fallback = false): boolean {
  const value = readString(name);
  if (!value) return fallback;
  return value.toLowerCase() === 'true';
}

function readNumber(name: string, fallback: number): number {
  const value = Number.parseInt(readString(name), 10);
  return Number.isFinite(value) ? value : fallback;
}

function readFloat(name: string, fallback: number): number {
  const value = Number.parseFloat(readString(name));
  return Number.isFinite(value) ? value : fallback;
}

export const runtimeFlags = {
  // Keep public Supabase fallbacks active by default so Git-pulled Cloudflare builds do not
  // silently degrade into an empty runtime surface when build-time env drifts.
  enableSupabaseConfigFallback: readFlag('VITE_ENABLE_SUPABASE_CONFIG_FALLBACK', true),
  enableTestWalletFixtures: readFlag('VITE_ENABLE_TEST_WALLET_FIXTURES', false),
  enableCommunityMockData: readFlag('VITE_ENABLE_COMMUNITY_MOCK_DATA', false),
  enableSearchDemoPanels: readFlag('VITE_ENABLE_SEARCH_DEMO_PANELS', false),
  enableMarketplacePersonalization: readFlag('VITE_ENABLE_MARKETPLACE_PERSONALIZATION', true),
  enableTestnetStarterKit: readFlag('VITE_ENABLE_TESTNET_STARTER_KIT', true),
} as const;

export const runtimeConfig = {
  supabaseFunctionsNamespace: readString(
    'VITE_SUPABASE_FUNCTIONS_NAMESPACE',
    readString('VITE_SUPABASE_SHARED_SERVER_FN_NAME', DEFAULT_SUPABASE_FUNCTIONS_NAMESPACE),
  ),
  supabaseSellerMintingFunctionName: readString(
    'VITE_SUPABASE_SELLER_MINTING_FN_NAME',
    'orina-seller-minting-v1',
  ),
  supabaseReceiptSyncFunctionName: readString(
    'VITE_SUPABASE_RECEIPT_SYNC_FN_NAME',
    'orina-receipt-sync-v1',
  ),
  sepoliaRpcUrl: readString('VITE_SEPOLIA_RPC_URL', ''),
  approximateEthUsdRate: readFloat('VITE_APPROX_ETH_USD_RATE', 0),
  testnetTokenFaucetAddress: readString('VITE_TESTNET_TOKEN_FAUCET_ADDRESS', ''),
  testnetUsdtAddress: readString('VITE_TESTNET_USDT_T_ADDRESS', ''),
  testnetUsdcAddress: readString('VITE_TESTNET_USDC_T_ADDRESS', ''),
  testnetTbnbFaucetUrl: readString('VITE_TESTNET_TBNB_FAUCET_URL', ''),
  bscTestnetTokenFaucetAddress: readString(
    'VITE_BSC_TESTNET_TOKEN_FAUCET_ADDRESS',
    readString('VITE_TESTNET_TOKEN_FAUCET_ADDRESS', ''),
  ),
  bscTestnetUsdtAddress: readString(
    'VITE_BSC_TESTNET_USDT_T_ADDRESS',
    readString('VITE_TESTNET_USDT_T_ADDRESS', ''),
  ),
  bscTestnetUsdcAddress: readString(
    'VITE_BSC_TESTNET_USDC_T_ADDRESS',
    readString('VITE_TESTNET_USDC_T_ADDRESS', ''),
  ),
  bscTestnetGasFaucetUrl: readString(
    'VITE_BSC_TESTNET_GAS_FAUCET_URL',
    readString('VITE_TESTNET_TBNB_FAUCET_URL', ''),
  ),
  baseSepoliaTokenFaucetAddress: readString('VITE_BASE_SEPOLIA_TOKEN_FAUCET_ADDRESS', ''),
  baseSepoliaUsdtAddress: readString('VITE_BASE_SEPOLIA_USDT_T_ADDRESS', ''),
  baseSepoliaUsdcAddress: readString('VITE_BASE_SEPOLIA_USDC_T_ADDRESS', ''),
  baseSepoliaGasFaucetUrl: readString('VITE_BASE_SEPOLIA_GAS_FAUCET_URL', ''),
  arbitrumSepoliaTokenFaucetAddress: readString('VITE_ARBITRUM_SEPOLIA_TOKEN_FAUCET_ADDRESS', ''),
  arbitrumSepoliaUsdtAddress: readString('VITE_ARBITRUM_SEPOLIA_USDT_T_ADDRESS', ''),
  arbitrumSepoliaUsdcAddress: readString('VITE_ARBITRUM_SEPOLIA_USDC_T_ADDRESS', ''),
  arbitrumSepoliaGasFaucetUrl: readString('VITE_ARBITRUM_SEPOLIA_GAS_FAUCET_URL', ''),
  ethereumSepoliaTokenFaucetAddress: readString('VITE_ETHEREUM_SEPOLIA_TOKEN_FAUCET_ADDRESS', ''),
  ethereumSepoliaUsdtAddress: readString('VITE_ETHEREUM_SEPOLIA_USDT_T_ADDRESS', ''),
  ethereumSepoliaUsdcAddress: readString('VITE_ETHEREUM_SEPOLIA_USDC_T_ADDRESS', ''),
  ethereumSepoliaGasFaucetUrl: readString('VITE_ETHEREUM_SEPOLIA_GAS_FAUCET_URL', ''),
  optimismSepoliaTokenFaucetAddress: readString('VITE_OPTIMISM_SEPOLIA_TOKEN_FAUCET_ADDRESS', ''),
  optimismSepoliaUsdtAddress: readString('VITE_OPTIMISM_SEPOLIA_USDT_T_ADDRESS', ''),
  optimismSepoliaUsdcAddress: readString('VITE_OPTIMISM_SEPOLIA_USDC_T_ADDRESS', ''),
  optimismSepoliaGasFaucetUrl: readString('VITE_OPTIMISM_SEPOLIA_GAS_FAUCET_URL', ''),
  avalancheFujiTokenFaucetAddress: readString('VITE_AVALANCHE_FUJI_TOKEN_FAUCET_ADDRESS', ''),
  avalancheFujiUsdtAddress: readString('VITE_AVALANCHE_FUJI_USDT_T_ADDRESS', ''),
  avalancheFujiUsdcAddress: readString('VITE_AVALANCHE_FUJI_USDC_T_ADDRESS', ''),
  avalancheFujiGasFaucetUrl: readString('VITE_AVALANCHE_FUJI_GAS_FAUCET_URL', ''),
  bscTestnetM2MDelegationManager: readString('VITE_BSC_TESTNET_M2M_DELEGATION_MANAGER', ''),
  bscTestnetM2MAIWalletFactoryV2: readString('VITE_BSC_TESTNET_M2M_AI_WALLET_FACTORY_V2', ''),
  baseSepoliaM2MDelegationManager: readString('VITE_BASE_SEPOLIA_M2M_DELEGATION_MANAGER', ''),
  baseSepoliaM2MAIWalletFactoryV2: readString('VITE_BASE_SEPOLIA_M2M_AI_WALLET_FACTORY_V2', ''),
  arbitrumSepoliaM2MDelegationManager: readString('VITE_ARBITRUM_SEPOLIA_M2M_DELEGATION_MANAGER', ''),
  arbitrumSepoliaM2MAIWalletFactoryV2: readString('VITE_ARBITRUM_SEPOLIA_M2M_AI_WALLET_FACTORY_V2', ''),
  ethereumSepoliaM2MDelegationManager: readString('VITE_ETHEREUM_SEPOLIA_M2M_DELEGATION_MANAGER', ''),
  ethereumSepoliaM2MAIWalletFactoryV2: readString('VITE_ETHEREUM_SEPOLIA_M2M_AI_WALLET_FACTORY_V2', ''),
  optimismSepoliaM2MDelegationManager: readString('VITE_OPTIMISM_SEPOLIA_M2M_DELEGATION_MANAGER', ''),
  optimismSepoliaM2MAIWalletFactoryV2: readString('VITE_OPTIMISM_SEPOLIA_M2M_AI_WALLET_FACTORY_V2', ''),
  avalancheFujiM2MDelegationManager: readString('VITE_AVALANCHE_FUJI_M2M_DELEGATION_MANAGER', ''),
  avalancheFujiM2MAIWalletFactoryV2: readString('VITE_AVALANCHE_FUJI_M2M_AI_WALLET_FACTORY_V2', ''),
} as const;
