const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CONTRACTS_TS = path.join(ROOT, 'src', 'config', 'contracts.ts');
const ROOT_ENV_PATH = path.join(ROOT, '.env');
const FOUNDRY_ENV_PATH = path.join(ROOT, 'foundry', '.env');

const CURRENT_DEFAULTS = {
  chainId: 97,
  rpcUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/',
  contracts: {
    MARKETPLACE_ATP: '0x18e1c8ab257faf16ec8257a9715d07661194150b',
    ORINA_RWA: '0x3a591ab1ab3a281f999aad1644b020cbec463c47',
    RECEIPT_NFT: '0x16a35bdd00dcfb9010504fbd1b2b97e26bb315ca',
    PAYMENT_GATEWAY: '0x082d75d8ca96c6e97b6b451ad4857454a53d5c15',
    FEE_MANAGER: '0xd32fc966835d8eb7d26a12beccca86c749a60efb3',
    AUTOTIME_MANAGER: '0x5639792243617841800df8f1450b86223c3d86f4',
    DISPUTE_MANAGER: '0xcd27b85e7ea6fb1fdc484ae9083286ddcc14dc21',
    UNIT_REGISTRY: '0x4ea45450064cd5b7c88ecaae6a145652fedd5df0',
    SHIPPING_REGISTRY: '0x16402c8c883a01dbfd2d7e58a46d3e9434396836',
    TIMELOCK: '0x5452ce749eda1be82132743aa224e7c86023a7f4',
    GNOSIS_SAFE: '0x554c4f489846e293ba251fb8b863fe1241306138',
  },
  m2m: {
    DELEGATION_MANAGER: '0xb27c8ecc266423dda3323983ae3a2ef691ed8a13',
    AI_WALLET_FACTORY_V2: '0xd838268fa8df6afd1fd79d9c0fd243a3d23d0441',
  },
  paymentTokens: {
    USDT: '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd',
    USDC: '0x64544969ed7ebf5f083679233325356ebe738930',
    WBNB: '0xae13d989dac2f0debff460ac112a837c89baa7cd',
    ORI: '0x093969c2bb194e7424534918eca5119fa72a61d6',
  },
};

function parseEnvFile(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    map[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return map;
}

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

function parseContractsTs() {
  if (!fs.existsSync(CONTRACTS_TS)) {
    return { contractEntries: {}, paymentTokens: {}, activeChainId: null, rpcUrls: {} };
  }

  const src = fs.readFileSync(CONTRACTS_TS, 'utf8');
  const chainConfig = {};
  for (const match of src.matchAll(/([A-Z_]+):\s*(\d+),/g)) {
    if (['PRIMARY_CHAIN_ID', 'TESTNET_CHAIN_ID', 'DEV_CHAIN_ID'].includes(match[1])) {
      chainConfig[match[1]] = Number(match[2]);
    }
  }

  let activeChainId = null;
  const activeRef = src.match(/export const ACTIVE_CHAIN_ID = CHAIN_CONFIG\.([A-Z_]+);/);
  if (activeRef && chainConfig[activeRef[1]] != null) {
    activeChainId = chainConfig[activeRef[1]];
  } else {
    const activeRaw = src.match(/export const ACTIVE_CHAIN_ID = (\d+);/);
    if (activeRaw) activeChainId = Number(activeRaw[1]);
  }

  const rpcUrls = {};
  const rpcBlockMatch = src.match(/export const RPC_URLS = \{([\s\S]*?)\n\} as const;/);
  if (rpcBlockMatch) {
    for (const match of rpcBlockMatch[1].matchAll(/\[(\d+)\]:\s*'([^']+)'/g)) {
      rpcUrls[Number(match[1])] = match[2];
    }
  }

  const contractEntries = {};
  const contractsBlockMatch = src.match(/export const CONTRACTS = \{([\s\S]*?)\n\} as const;/);
  if (contractsBlockMatch) {
    for (const match of contractsBlockMatch[1].matchAll(/([A-Z_]+):\s*'(0x[a-fA-F0-9]{40})'/g)) {
      contractEntries[match[1]] = normalizeAddress(match[2]);
    }
  }

  const paymentTokens = {};
  const paymentBlockMatch = src.match(/export const PAYMENT_TOKENS = \{([\s\S]*?)\n\} as const;/);
  if (paymentBlockMatch) {
    for (const match of paymentBlockMatch[1].matchAll(/([A-Z0-9_]+):\s*'(0x[a-fA-F0-9]{40})'/g)) {
      paymentTokens[match[1]] = normalizeAddress(match[2]);
    }
  }

  return { contractEntries, paymentTokens, activeChainId, rpcUrls };
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
}

function pickAddress(keys, sources, fallback) {
  for (const key of keys) {
    for (const source of sources) {
      const value = source?.[key];
      if (value) return normalizeAddress(value);
    }
  }
  return normalizeAddress(fallback);
}

function getRuntimeConfig() {
  const rootEnv = parseEnvFile(ROOT_ENV_PATH);
  const foundryEnv = parseEnvFile(FOUNDRY_ENV_PATH);
  const contractConfig = parseContractsTs();
  const runtimeEnv = process.env;

  const chainId = Number(
    firstNonEmpty(
      runtimeEnv.CHAIN_ID,
      foundryEnv.EXPECTED_CHAIN_ID,
      contractConfig.activeChainId,
      CURRENT_DEFAULTS.chainId,
    ),
  );

  const rpcUrl = String(
    firstNonEmpty(
      runtimeEnv.RPC_URL,
      foundryEnv.BSC_TESTNET_RPC_URL,
      contractConfig.rpcUrls[chainId],
      CURRENT_DEFAULTS.rpcUrl,
    ),
  ).trim();

  const contractSources = [runtimeEnv, foundryEnv, rootEnv, contractConfig.contractEntries];
  const paymentSources = [runtimeEnv, rootEnv, foundryEnv, contractConfig.paymentTokens];

  const addresses = {
    marketplace: pickAddress(['MARKETPLACE_ATP_ADDRESS', 'MARKETPLACE_ATP'], contractSources, CURRENT_DEFAULTS.contracts.MARKETPLACE_ATP),
    orinaRwa: pickAddress(['ORINA_RWA_ADDRESS', 'ORINA_RWA'], contractSources, CURRENT_DEFAULTS.contracts.ORINA_RWA),
    receiptNft: pickAddress(['RECEIPT_NFT_ADDRESS', 'RECEIPT_NFT'], contractSources, CURRENT_DEFAULTS.contracts.RECEIPT_NFT),
    paymentGateway: pickAddress(['PAYMENT_GATEWAY_ADDRESS', 'PAYMENT_GATEWAY'], contractSources, CURRENT_DEFAULTS.contracts.PAYMENT_GATEWAY),
    feeManager: pickAddress(['FEE_MANAGER_ADDRESS', 'FEE_MANAGER'], contractSources, CURRENT_DEFAULTS.contracts.FEE_MANAGER),
    autotimeManager: pickAddress(['AUTOTIME_MANAGER_ADDRESS', 'AUTOTIME_MANAGER'], contractSources, CURRENT_DEFAULTS.contracts.AUTOTIME_MANAGER),
    disputeManager: pickAddress(['DISPUTE_MANAGER_ADDRESS', 'DISPUTE_MANAGER'], contractSources, CURRENT_DEFAULTS.contracts.DISPUTE_MANAGER),
    unitRegistry: pickAddress(['UNIT_REGISTRY_ADDRESS', 'UNIT_REGISTRY'], contractSources, CURRENT_DEFAULTS.contracts.UNIT_REGISTRY),
    shippingRegistry: pickAddress(['SHIPPING_REGISTRY_ADDRESS', 'SHIPPING_REGISTRY'], contractSources, CURRENT_DEFAULTS.contracts.SHIPPING_REGISTRY),
    timelock: pickAddress(['TIMELOCK_ADDRESS', 'TIMELOCK'], contractSources, CURRENT_DEFAULTS.contracts.TIMELOCK),
    gnosisSafe: pickAddress(['GNOSIS_SAFE_ADDRESS', 'GNOSIS_SAFE'], contractSources, CURRENT_DEFAULTS.contracts.GNOSIS_SAFE),
  };

  const m2m = {
    delegationManager: pickAddress(
      ['DELEGATION_MANAGER_ADDRESS', 'VITE_M2M_DELEGATION_MANAGER'],
      [runtimeEnv, rootEnv, foundryEnv],
      CURRENT_DEFAULTS.m2m.DELEGATION_MANAGER,
    ),
    aiWalletFactoryV2: pickAddress(
      ['AI_WALLET_FACTORY_V2_ADDRESS', 'VITE_M2M_AI_WALLET_FACTORY_V2'],
      [runtimeEnv, rootEnv, foundryEnv],
      CURRENT_DEFAULTS.m2m.AI_WALLET_FACTORY_V2,
    ),
  };

  const paymentTokens = {
    usdt: pickAddress(['PAYMENT_TOKEN_USDT', 'USDT'], paymentSources, CURRENT_DEFAULTS.paymentTokens.USDT),
    usdc: pickAddress(['PAYMENT_TOKEN_USDC', 'USDC'], paymentSources, CURRENT_DEFAULTS.paymentTokens.USDC),
    wbnb: pickAddress(['PAYMENT_TOKEN_WBNB', 'WBNB'], paymentSources, CURRENT_DEFAULTS.paymentTokens.WBNB),
    ori: pickAddress(['PAYMENT_TOKEN_ORI', 'ORI'], paymentSources, CURRENT_DEFAULTS.paymentTokens.ORI),
  };

  const sharedFnName = String(
    firstNonEmpty(
      runtimeEnv.VITE_SUPABASE_FUNCTIONS_NAMESPACE,
      rootEnv.VITE_SUPABASE_FUNCTIONS_NAMESPACE,
      runtimeEnv.VITE_SUPABASE_SHARED_SERVER_FN_NAME,
      rootEnv.VITE_SUPABASE_SHARED_SERVER_FN_NAME,
      'make-server-b0d68fc8',
    ),
  ).trim();
  const bridgeFnName = String(
    firstNonEmpty(runtimeEnv.VITE_SUPABASE_AUTH_BRIDGE_FN_NAME, rootEnv.VITE_SUPABASE_AUTH_BRIDGE_FN_NAME, 'orina-auth-bridge-v1'),
  ).trim();
  const aiM2MFnName = String(
    firstNonEmpty(runtimeEnv.VITE_SUPABASE_AI_M2M_FN_NAME, rootEnv.VITE_SUPABASE_AI_M2M_FN_NAME, 'orina-ai-m2m-v2'),
  ).trim();

  return {
    ROOT,
    chainId,
    rpcUrl,
    rootEnv,
    foundryEnv,
    addresses,
    m2m,
    paymentTokens,
    frontend: {
      supabaseUrl: String(firstNonEmpty(runtimeEnv.VITE_SUPABASE_URL, rootEnv.VITE_SUPABASE_URL)).replace(/\/+$/, ''),
      anonKey: String(firstNonEmpty(runtimeEnv.VITE_SUPABASE_ANON_KEY, rootEnv.VITE_SUPABASE_ANON_KEY, rootEnv.VITE_SUPABASE_PUBLISHABLE_KEY)).trim(),
      publishableKey: String(firstNonEmpty(runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY, rootEnv.VITE_SUPABASE_PUBLISHABLE_KEY)).trim(),
      sharedFnName,
      bridgeFnName,
      bridgePathPrefix: String(firstNonEmpty(runtimeEnv.VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX, rootEnv.VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX, bridgeFnName === sharedFnName ? '/auth/supabase-claim-bridge' : '')).trim(),
      aiM2MFnName,
      aiM2MPathPrefix: String(firstNonEmpty(runtimeEnv.VITE_SUPABASE_AI_M2M_PATH_PREFIX, rootEnv.VITE_SUPABASE_AI_M2M_PATH_PREFIX, aiM2MFnName === sharedFnName ? '/ai/m2m' : '')).trim(),
    },
    artifacts: {
      coreDeployRunJson: path.join(ROOT, 'foundry', 'broadcast', 'DeployFullSystemDirect.s.sol', String(chainId), 'run-latest.json'),
      m2mDeployRunJson: path.join(ROOT, 'foundry', 'broadcast', 'DeployM2MSystem.s.sol', String(chainId), 'run-latest.json'),
      broadcastDir: path.join(ROOT, 'foundry', 'broadcast'),
      projectionSqlOut: path.join(ROOT, 'supabase', 'audit', 'generated_protocol_projection_backfill.sql'),
      orderEventsSqlOut: path.join(ROOT, 'supabase', 'audit', 'generated_protocol_order_events_backfill.sql'),
      smokeMintCreateRunJson: path.join(ROOT, 'foundry', 'broadcast', 'SmokeMintAndCreateOrder.s.sol', String(chainId), 'run-latest.json'),
      smokeSellerConfirmRunJson: path.join(ROOT, 'foundry', 'broadcast', 'SmokeSellerConfirm.s.sol', String(chainId), 'run-latest.json'),
    },
    namespace: String(firstNonEmpty(runtimeEnv.DEPLOY_NAMESPACE, foundryEnv.DEPLOY_NAMESPACE, '')),
    contractConfig,
  };
}

module.exports = {
  ROOT,
  CONTRACTS_TS,
  CURRENT_DEFAULTS,
  parseEnvFile,
  normalizeAddress,
  parseContractsTs,
  getRuntimeConfig,
};
