const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

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
  enableSupabaseConfigFallback: readFlag('VITE_ENABLE_SUPABASE_CONFIG_FALLBACK', false),
  enableTestWalletFixtures: readFlag('VITE_ENABLE_TEST_WALLET_FIXTURES', false),
  enableCommunityMockData: readFlag('VITE_ENABLE_COMMUNITY_MOCK_DATA', false),
  enableSearchDemoPanels: readFlag('VITE_ENABLE_SEARCH_DEMO_PANELS', false),
} as const;

export const runtimeConfig = {
  supabaseFunctionsNamespace: readString(
    'VITE_SUPABASE_FUNCTIONS_NAMESPACE',
    readString('VITE_SUPABASE_SHARED_SERVER_FN_NAME', ''),
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
} as const;
