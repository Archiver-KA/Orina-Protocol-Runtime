#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createPublicClient, http, keccak256, toBytes } = require('viem');
const { bscTestnet } = require('viem/chains');

const ROOT = path.resolve(__dirname, '..', '..');
const FOUNDRY_ENV = path.join(ROOT, 'foundry', '.env');
const DEFAULT_RPC_URL = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/';

const ORDER_STATE_NAMES = {
  0: 'PENDING_CONFIRM',
  1: 'PAID',
  2: 'DISPUTED',
  3: 'FINALIZED',
  4: 'CANCELLED',
};

const SETTLEMENT_TYPE_NAMES = {
  0: 'FULL_RELEASE',
  1: 'FULL_REFUND',
  2: 'SPLIT',
};

const MARKETPLACE_ABI = [
  { type: 'function', name: 'nextOrderId', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  {
    type: 'function',
    name: 'orders',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'buyer', type: 'address' },
      { name: 'seller', type: 'address' },
      { name: 'payer', type: 'address' },
      { name: 'refundRecipient', type: 'address' },
      { name: 'paymentToken', type: 'address' },
      { name: 'assetId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'grossPrice', type: 'uint256' },
      { name: 'proposedAt', type: 'uint256' },
      { name: 'paidAt', type: 'uint256' },
      { name: 'autoReleaseAt', type: 'uint256' },
      { name: 'estDeliverySeconds', type: 'uint256' },
      { name: 'payDeadline', type: 'uint256' },
      { name: 'state', type: 'uint8' },
      { name: 'settlementType', type: 'uint8' },
      {
        name: 'split',
        type: 'tuple',
        components: [
          { name: 'buyerShareBps', type: 'uint256' },
          { name: 'sellerShareBps', type: 'uint256' },
        ],
      },
      { name: 'platformFeeBpsSnapshot', type: 'uint256' },
      { name: 'daoFeeBpsSnapshot', type: 'uint256' },
      { name: 'burnFeeBpsSnapshot', type: 'uint256' },
      { name: 'referralFeeBpsSnapshot', type: 'uint256' },
      { name: 'finalized', type: 'bool' },
      { name: 'sellerConfirmed', type: 'bool' },
      { name: 'buyerSig1', type: 'bytes' },
      { name: 'sellerSig', type: 'bytes' },
      { name: 'buyerSig2', type: 'bytes' },
    ],
  },
  { type: 'function', name: 'paymentGateway', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'autoTimeManager', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'disputeManager', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'delegationManager', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'rwa', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'receiptNft', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'feeManager', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'BUYER_ACTION_WINDOW', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'SELLER_CONFIRM_WINDOW', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'PAY_TIMEOUT', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
];

const PAYMENT_GATEWAY_ABI = [
  { type: 'function', name: 'marketplace', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  {
    type: 'function',
    name: 'escrows',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'buyer', type: 'address' },
      { name: 'payer', type: 'address' },
      { name: 'refundRecipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
  },
  { type: 'function', name: 'totalEscrowedByToken', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  {
    type: 'function',
    name: 'hasRole',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

const DISPUTE_MANAGER_ABI = [
  { type: 'function', name: 'marketplace', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'paymentGateway', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  {
    type: 'function',
    name: 'disputes',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'active', type: 'bool' },
      { name: 'verdict', type: 'uint8' },
      { name: 'openedAt', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'extended', type: 'bool' },
      { name: 'buyerShareBps', type: 'uint256' },
      { name: 'sellerShareBps', type: 'uint256' },
    ],
  },
  { type: 'function', name: 'phase1Deadline', stateMutability: 'view', inputs: [{ name: 'orderId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  {
    type: 'function',
    name: 'hasRole',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

const AUTOTIME_MANAGER_ABI = [
  { type: 'function', name: 'marketplace', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'disputeManager', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  {
    type: 'function',
    name: 'orderTimingSnapshot',
    stateMutability: 'view',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [
      { name: 'proposed', type: 'uint256' },
      { name: 'payDL', type: 'uint256' },
      { name: 'releaseAt', type: 'uint256' },
      { name: 'confirmed', type: 'bool' },
    ],
  },
];

function parseEnvFile(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    map[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return map;
}

function parseArgs(argv) {
  const options = { fromOrder: 0n, summaryOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const next = argv[index + 1];
    if (key === '--from-order' && next) {
      options.fromOrder = BigInt(next);
      index += 1;
      continue;
    }
    if (key === '--to-order' && next) {
      options.toOrder = BigInt(next);
      index += 1;
      continue;
    }
    if (key === '--json-out' && next) {
      options.jsonOut = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }
    if (key === '--summary-only') {
      options.summaryOnly = true;
      continue;
    }
    if (key === '--rpc-url' && next) {
      options.rpcUrl = next;
      index += 1;
    }
  }
  return options;
}

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

function isZeroAddress(address) {
  return normalizeAddress(address) === '0x0000000000000000000000000000000000000000';
}

function boolBytes(value) {
  return typeof value === 'string' && value !== '0x';
}

function toSerializable(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map((entry) => toSerializable(entry));
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = toSerializable(entry);
    }
    return result;
  }
  return value;
}

function marketRole() {
  return keccak256(toBytes('MARKETPLACE_ROLE'));
}

function arbiterRole() {
  return keccak256(toBytes('ARBITER_ROLE'));
}

function autotimeRole() {
  return keccak256(toBytes('AUTOTIME_ROLE'));
}

function parseOrder(tuple, orderId) {
  return {
    orderId,
    buyer: normalizeAddress(tuple[0]),
    seller: normalizeAddress(tuple[1]),
    payer: normalizeAddress(tuple[2]),
    refundRecipient: normalizeAddress(tuple[3]),
    paymentToken: normalizeAddress(tuple[4]),
    assetId: tuple[5],
    amount: tuple[6],
    grossPrice: tuple[7],
    proposedAt: tuple[8],
    paidAt: tuple[9],
    autoReleaseAt: tuple[10],
    estDeliverySeconds: tuple[11],
    payDeadline: tuple[12],
    state: Number(tuple[13]),
    settlementType: Number(tuple[14]),
    split: {
      buyerShareBps: tuple[15]?.buyerShareBps ?? 0n,
      sellerShareBps: tuple[15]?.sellerShareBps ?? 0n,
    },
    platformFeeBpsSnapshot: tuple[16],
    daoFeeBpsSnapshot: tuple[17],
    burnFeeBpsSnapshot: tuple[18],
    referralFeeBpsSnapshot: tuple[19],
    finalized: Boolean(tuple[20]),
    sellerConfirmed: Boolean(tuple[21]),
    buyerSig1Present: boolBytes(tuple[22]),
    sellerSigPresent: boolBytes(tuple[23]),
    buyerSig2Present: boolBytes(tuple[24]),
  };
}

function parseEscrow(tuple) {
  return {
    token: normalizeAddress(tuple[0]),
    buyer: normalizeAddress(tuple[1]),
    payer: normalizeAddress(tuple[2]),
    refundRecipient: normalizeAddress(tuple[3]),
    amount: tuple[4],
  };
}

function parseDispute(tuple, phase1DeadlineValue) {
  return {
    active: Boolean(tuple[0]),
    verdict: Number(tuple[1]),
    openedAt: tuple[2],
    deadline: tuple[3],
    extended: Boolean(tuple[4]),
    buyerShareBps: tuple[5],
    sellerShareBps: tuple[6],
    phase1Deadline: phase1DeadlineValue,
  };
}

function deriveOrderPhase(order, nowSec) {
  if (order.finalized || order.state === 3) return 'finalized';
  if (order.state === 4) return 'cancelled';
  if (order.state === 2) return 'disputed';
  if (order.state === 0) {
    if (order.sellerConfirmed) {
      if (order.payDeadline > 0n && nowSec < order.payDeadline) return 'waiting_buyer_accept';
      return 'buyer_accept_expired';
    }
    return nowSec <= order.proposedAt + 24n * 60n * 60n ? 'waiting_seller_confirm' : 'seller_confirm_expired';
  }
  if (order.state === 1) {
    if (nowSec < order.autoReleaseAt) return 'agreed_delivery';
    if (nowSec <= order.autoReleaseAt + 3n * 24n * 60n * 60n) return 'awaiting_auto_finalize';
    return 'auto_finalize_ready';
  }
  return 'unknown';
}

function readActionability(order, dispute, nowSec) {
  if (order.finalized) {
    return { autoCancelReady: false, autoReleaseReady: false, staleDisputeReady: false };
  }
  if (order.state === 0) {
    const sellerDeadline = order.proposedAt + 24n * 60n * 60n;
    const autoCancelReady = (!order.sellerConfirmed && nowSec >= sellerDeadline) || (order.sellerConfirmed && order.payDeadline > 0n && nowSec >= order.payDeadline);
    return { autoCancelReady, autoReleaseReady: false, staleDisputeReady: false };
  }
  if (order.state === 1) {
    const autoReleaseReady = order.autoReleaseAt > 0n && nowSec >= order.autoReleaseAt + 3n * 24n * 60n * 60n;
    return { autoCancelReady: false, autoReleaseReady, staleDisputeReady: false };
  }
  if (order.state === 2) {
    const staleDisputeReady = dispute.active && dispute.deadline > 0n && nowSec >= dispute.deadline;
    return { autoCancelReady: false, autoReleaseReady: false, staleDisputeReady };
  }
  return { autoCancelReady: false, autoReleaseReady: false, staleDisputeReady: false };
}

function pushIssue(target, scope, code, message, extra = {}) {
  target.push({ scope, code, message, ...toSerializable(extra) });
}

async function readMaybe(client, request) {
  try {
    return { ok: true, value: await client.readContract(request) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function summarizeProbe(result) {
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, value: toSerializable(result.value) };
}

async function main() {
  const env = parseEnvFile(FOUNDRY_ENV);
  const options = parseArgs(process.argv.slice(2));

  const config = {
    chainId: Number(env.EXPECTED_CHAIN_ID || bscTestnet.id),
    rpcUrl: options.rpcUrl || process.env.BSC_TESTNET_RPC_URL || env.BSC_TESTNET_RPC_URL || process.env.RPC_URL || DEFAULT_RPC_URL,
    marketplace: normalizeAddress(process.env.MARKETPLACE_ATP_ADDRESS || env.MARKETPLACE_ATP_ADDRESS),
    paymentGateway: normalizeAddress(process.env.PAYMENT_GATEWAY_ADDRESS || env.PAYMENT_GATEWAY_ADDRESS),
    disputeManager: normalizeAddress(process.env.DISPUTE_MANAGER_ADDRESS || env.DISPUTE_MANAGER_ADDRESS),
    autoTimeManager: normalizeAddress(process.env.AUTOTIME_MANAGER || env.AUTOTIME_MANAGER),
    delegationManager: normalizeAddress(process.env.DELEGATION_MANAGER_ADDRESS || env.DELEGATION_MANAGER_ADDRESS),
    rwa: normalizeAddress(process.env.ORINA_RWA_ADDRESS || env.ORINA_RWA_ADDRESS),
    receiptNft: normalizeAddress(process.env.RECEIPT_NFT || env.RECEIPT_NFT),
    feeManager: normalizeAddress(process.env.FEE_MANAGER_ADDRESS || env.FEE_MANAGER_ADDRESS),
    timelock: normalizeAddress(process.env.TIMELOCK || env.TIMELOCK),
    arbiter: normalizeAddress(process.env.ARBITER_MULTISIG || env.ARBITER_MULTISIG),
  };

  const client = createPublicClient({ chain: bscTestnet, transport: http(config.rpcUrl) });

  const [block, nextOrderId] = await Promise.all([
    client.getBlock(),
    client.readContract({ address: config.marketplace, abi: MARKETPLACE_ABI, functionName: 'nextOrderId' }),
  ]);

  const fromOrder = options.fromOrder;
  const toOrder = options.toOrder !== undefined ? options.toOrder : nextOrderId === 0n ? 0n : nextOrderId - 1n;
  const nowSec = block.timestamp;
  const orderCount = nextOrderId > 0n && toOrder >= fromOrder ? Number(toOrder - fromOrder + 1n) : 0;
  const globalIssues = [];

  const [
    marketPaymentGateway,
    marketAutoTimeManager,
    marketDisputeManager,
    marketDelegationManager,
    marketRwa,
    marketReceiptNft,
    marketFeeManager,
    buyerActionWindow,
    sellerConfirmWindow,
    payTimeout,
    gatewayMarketplace,
    gatewayRoleMarketplace,
    gatewayRoleDisputeManager,
    disputeMarketplace,
    disputePaymentGateway,
    disputeRoleArbiter,
    disputeRoleAutotime,
    autoTimeMarketplace,
    autoTimeDisputeManager,
    autoTimeRuntimeSnapshot,
  ] = await Promise.all([
    client.readContract({ address: config.marketplace, abi: MARKETPLACE_ABI, functionName: 'paymentGateway' }),
    client.readContract({ address: config.marketplace, abi: MARKETPLACE_ABI, functionName: 'autoTimeManager' }),
    client.readContract({ address: config.marketplace, abi: MARKETPLACE_ABI, functionName: 'disputeManager' }),
    client.readContract({ address: config.marketplace, abi: MARKETPLACE_ABI, functionName: 'delegationManager' }),
    client.readContract({ address: config.marketplace, abi: MARKETPLACE_ABI, functionName: 'rwa' }),
    client.readContract({ address: config.marketplace, abi: MARKETPLACE_ABI, functionName: 'receiptNft' }),
    client.readContract({ address: config.marketplace, abi: MARKETPLACE_ABI, functionName: 'feeManager' }),
    client.readContract({ address: config.marketplace, abi: MARKETPLACE_ABI, functionName: 'BUYER_ACTION_WINDOW' }),
    client.readContract({ address: config.marketplace, abi: MARKETPLACE_ABI, functionName: 'SELLER_CONFIRM_WINDOW' }),
    client.readContract({ address: config.marketplace, abi: MARKETPLACE_ABI, functionName: 'PAY_TIMEOUT' }),
    client.readContract({ address: config.paymentGateway, abi: PAYMENT_GATEWAY_ABI, functionName: 'marketplace' }),
    client.readContract({ address: config.paymentGateway, abi: PAYMENT_GATEWAY_ABI, functionName: 'hasRole', args: [marketRole(), config.marketplace] }),
    client.readContract({ address: config.paymentGateway, abi: PAYMENT_GATEWAY_ABI, functionName: 'hasRole', args: [marketRole(), config.disputeManager] }),
    client.readContract({ address: config.disputeManager, abi: DISPUTE_MANAGER_ABI, functionName: 'marketplace' }),
    client.readContract({ address: config.disputeManager, abi: DISPUTE_MANAGER_ABI, functionName: 'paymentGateway' }),
    client.readContract({ address: config.disputeManager, abi: DISPUTE_MANAGER_ABI, functionName: 'hasRole', args: [arbiterRole(), config.arbiter] }),
    client.readContract({ address: config.disputeManager, abi: DISPUTE_MANAGER_ABI, functionName: 'hasRole', args: [autotimeRole(), config.autoTimeManager] }),
    client.readContract({ address: config.autoTimeManager, abi: AUTOTIME_MANAGER_ABI, functionName: 'marketplace' }),
    client.readContract({ address: config.autoTimeManager, abi: AUTOTIME_MANAGER_ABI, functionName: 'disputeManager' }),
    readMaybe(client, { address: config.autoTimeManager, abi: AUTOTIME_MANAGER_ABI, functionName: 'orderTimingSnapshot', args: [0n] }),
  ]);

  const wiring = {
    marketplace: {
      address: config.marketplace,
      paymentGateway: normalizeAddress(marketPaymentGateway),
      autoTimeManager: normalizeAddress(marketAutoTimeManager),
      disputeManager: normalizeAddress(marketDisputeManager),
      delegationManager: normalizeAddress(marketDelegationManager),
      rwa: normalizeAddress(marketRwa),
      receiptNft: normalizeAddress(marketReceiptNft),
      feeManager: normalizeAddress(marketFeeManager),
      buyerActionWindow,
      sellerConfirmWindow,
      payTimeout,
    },
    paymentGateway: {
      address: config.paymentGateway,
      marketplace: normalizeAddress(gatewayMarketplace),
      hasMarketplaceRoleForMarketplace: Boolean(gatewayRoleMarketplace),
      hasMarketplaceRoleForDisputeManager: Boolean(gatewayRoleDisputeManager),
    },
    disputeManager: {
      address: config.disputeManager,
      marketplace: normalizeAddress(disputeMarketplace),
      paymentGateway: normalizeAddress(disputePaymentGateway),
      hasArbiterRoleForConfiguredArbiter: Boolean(disputeRoleArbiter),
      hasAutotimeRoleForConfiguredAutoTime: Boolean(disputeRoleAutotime),
    },
    autoTimeManager: {
      address: config.autoTimeManager,
      marketplace: normalizeAddress(autoTimeMarketplace),
      disputeManager: normalizeAddress(autoTimeDisputeManager),
      orderTimingSnapshotProbe: summarizeProbe(autoTimeRuntimeSnapshot),
    },
  };

  if (wiring.marketplace.paymentGateway !== config.paymentGateway) pushIssue(globalIssues, 'wiring', 'MARKETPLACE_GATEWAY_MISMATCH', 'MarketplaceATP.paymentGateway does not match configured gateway', { expected: config.paymentGateway, actual: wiring.marketplace.paymentGateway });
  if (wiring.marketplace.disputeManager !== config.disputeManager) pushIssue(globalIssues, 'wiring', 'MARKETPLACE_DM_MISMATCH', 'MarketplaceATP.disputeManager does not match configured dispute manager', { expected: config.disputeManager, actual: wiring.marketplace.disputeManager });
  if (wiring.marketplace.autoTimeManager !== config.autoTimeManager) pushIssue(globalIssues, 'wiring', 'MARKETPLACE_AUTOTIME_MISMATCH', 'MarketplaceATP.autoTimeManager does not match configured autotime manager', { expected: config.autoTimeManager, actual: wiring.marketplace.autoTimeManager });
  if (wiring.marketplace.delegationManager !== config.delegationManager) pushIssue(globalIssues, 'wiring', 'MARKETPLACE_DELEGATION_MANAGER_MISMATCH', 'MarketplaceATP.delegationManager does not match configured delegation manager', { expected: config.delegationManager, actual: wiring.marketplace.delegationManager });
  if (wiring.marketplace.rwa !== config.rwa) pushIssue(globalIssues, 'wiring', 'MARKETPLACE_RWA_MISMATCH', 'MarketplaceATP.rwa does not match configured OrinaRWA', { expected: config.rwa, actual: wiring.marketplace.rwa });
  if (wiring.marketplace.receiptNft !== config.receiptNft) pushIssue(globalIssues, 'wiring', 'MARKETPLACE_RECEIPT_MISMATCH', 'MarketplaceATP.receiptNft does not match configured receipt contract', { expected: config.receiptNft, actual: wiring.marketplace.receiptNft });
  if (wiring.marketplace.feeManager !== config.feeManager) pushIssue(globalIssues, 'wiring', 'MARKETPLACE_FEE_MANAGER_MISMATCH', 'MarketplaceATP.feeManager does not match configured fee manager', { expected: config.feeManager, actual: wiring.marketplace.feeManager });
  if (wiring.paymentGateway.marketplace !== config.marketplace) pushIssue(globalIssues, 'wiring', 'GATEWAY_MARKETPLACE_MISMATCH', 'PaymentGateway.marketplace does not match configured marketplace', { expected: config.marketplace, actual: wiring.paymentGateway.marketplace });
  if (!wiring.paymentGateway.hasMarketplaceRoleForMarketplace) pushIssue(globalIssues, 'wiring', 'GATEWAY_MARKETPLACE_ROLE_MISSING', 'PaymentGateway MARKETPLACE_ROLE missing for marketplace', { account: config.marketplace });
  if (!wiring.paymentGateway.hasMarketplaceRoleForDisputeManager) pushIssue(globalIssues, 'wiring', 'GATEWAY_DM_ROLE_MISSING', 'PaymentGateway MARKETPLACE_ROLE missing for dispute manager patch', { account: config.disputeManager });
  if (wiring.disputeManager.marketplace !== config.marketplace) pushIssue(globalIssues, 'wiring', 'DM_MARKETPLACE_MISMATCH', 'DisputeManager.marketplace does not match configured marketplace', { expected: config.marketplace, actual: wiring.disputeManager.marketplace });
  if (wiring.disputeManager.paymentGateway !== config.paymentGateway) pushIssue(globalIssues, 'wiring', 'DM_GATEWAY_MISMATCH', 'DisputeManager.paymentGateway does not match configured payment gateway', { expected: config.paymentGateway, actual: wiring.disputeManager.paymentGateway });
  if (!wiring.disputeManager.hasArbiterRoleForConfiguredArbiter) pushIssue(globalIssues, 'wiring', 'DM_ARBITER_ROLE_MISSING', 'DisputeManager ARBITER_ROLE missing for configured arbiter multisig', { account: config.arbiter });
  if (!wiring.disputeManager.hasAutotimeRoleForConfiguredAutoTime) pushIssue(globalIssues, 'wiring', 'DM_AUTOTIME_ROLE_MISSING', 'DisputeManager AUTOTIME_ROLE missing for configured AutoTimeManager', { account: config.autoTimeManager });
  if (wiring.autoTimeManager.marketplace !== config.marketplace) pushIssue(globalIssues, 'wiring', 'AUTOTIME_MARKETPLACE_MISMATCH', 'AutoTimeManager.marketplace does not match configured marketplace', { expected: config.marketplace, actual: wiring.autoTimeManager.marketplace });
  if (wiring.autoTimeManager.disputeManager !== config.disputeManager) pushIssue(globalIssues, 'wiring', 'AUTOTIME_DM_MISMATCH', 'AutoTimeManager.disputeManager does not match configured dispute manager', { expected: config.disputeManager, actual: wiring.autoTimeManager.disputeManager });
  if (!wiring.autoTimeManager.orderTimingSnapshotProbe.ok) pushIssue(globalIssues, 'runtime', 'AUTOTIME_ORDER_TIMING_PROBE_FAILED', 'AutoTimeManager.orderTimingSnapshot(orderId) probe failed; runtime patch is not active on live core', { error: wiring.autoTimeManager.orderTimingSnapshotProbe.error });

  const orders = [];
  const orderIssues = [];
  const byState = {};
  const actionables = {
    autoCancelReadyOrderIds: [],
    autoReleaseReadyOrderIds: [],
    staleDisputeReadyOrderIds: [],
  };
  const tokenSet = new Set();

  for (let orderId = fromOrder; orderId <= toOrder && orderCount > 0; orderId += 1n) {
    const [orderTuple, escrowTuple, disputeTuple, phase1DeadlineResult] = await Promise.all([
      client.readContract({ address: config.marketplace, abi: MARKETPLACE_ABI, functionName: 'orders', args: [orderId] }),
      client.readContract({ address: config.paymentGateway, abi: PAYMENT_GATEWAY_ABI, functionName: 'escrows', args: [orderId] }),
      client.readContract({ address: config.disputeManager, abi: DISPUTE_MANAGER_ABI, functionName: 'disputes', args: [orderId] }),
      readMaybe(client, { address: config.disputeManager, abi: DISPUTE_MANAGER_ABI, functionName: 'phase1Deadline', args: [orderId] }),
    ]);

    const order = parseOrder(orderTuple, orderId);
    const escrow = parseEscrow(escrowTuple);
    const dispute = parseDispute(disputeTuple, phase1DeadlineResult.ok ? phase1DeadlineResult.value : 0n);
    const phase = deriveOrderPhase(order, nowSec);
    const actionable = readActionability(order, dispute, nowSec);
    const stateName = ORDER_STATE_NAMES[order.state] || 'UNKNOWN';
    const settlementName = SETTLEMENT_TYPE_NAMES[order.settlementType] || 'UNKNOWN';

    byState[stateName] = (byState[stateName] || 0) + 1;
    if (!isZeroAddress(order.paymentToken)) tokenSet.add(order.paymentToken);

    const issues = [];
    if (isZeroAddress(order.buyer)) pushIssue(issues, 'order', 'ORDER_BUYER_ZERO', 'Order buyer is zero address');
    if (isZeroAddress(order.seller)) pushIssue(issues, 'order', 'ORDER_SELLER_ZERO', 'Order seller is zero address');
    if (isZeroAddress(order.payer)) pushIssue(issues, 'order', 'ORDER_PAYER_ZERO', 'Order payer is zero address');
    if (isZeroAddress(order.refundRecipient)) pushIssue(issues, 'order', 'ORDER_REFUND_ZERO', 'Order refund recipient is zero address');
    if (order.refundRecipient !== order.buyer) pushIssue(issues, 'order', 'REFUND_RECIPIENT_NOT_BUYER', 'Order refund recipient diverges from canonical buyer', { buyer: order.buyer, refundRecipient: order.refundRecipient });
    if (escrow.buyer !== order.buyer) pushIssue(issues, 'escrow', 'ESCROW_BUYER_MISMATCH', 'Escrow buyer does not match marketplace buyer', { marketplaceBuyer: order.buyer, escrowBuyer: escrow.buyer });
    if (escrow.payer !== order.payer) pushIssue(issues, 'escrow', 'ESCROW_PAYER_MISMATCH', 'Escrow payer does not match marketplace payer', { marketplacePayer: order.payer, escrowPayer: escrow.payer });
    if (escrow.refundRecipient !== order.refundRecipient) pushIssue(issues, 'escrow', 'ESCROW_REFUND_MISMATCH', 'Escrow refund recipient does not match marketplace refund recipient', { marketplaceRefundRecipient: order.refundRecipient, escrowRefundRecipient: escrow.refundRecipient });
    if (!isZeroAddress(escrow.token) && escrow.token !== order.paymentToken) pushIssue(issues, 'escrow', 'ESCROW_TOKEN_MISMATCH', 'Escrow token does not match marketplace payment token', { marketplacePaymentToken: order.paymentToken, escrowToken: escrow.token });
    if (order.finalized && order.state !== 3) pushIssue(issues, 'order', 'FINALIZED_FLAG_STATE_MISMATCH', 'Order finalized flag true while state is not FINALIZED', { state: stateName });
    if (order.state === 3 && !order.finalized) pushIssue(issues, 'order', 'FINALIZED_STATE_FLAG_MISMATCH', 'Order state FINALIZED while finalized flag is false');
    if (order.state === 4 && !order.finalized) pushIssue(issues, 'order', 'CANCELLED_NOT_FINALIZED', 'Cancelled order is not marked finalized');
    if ((order.state === 3 || order.state === 4) && escrow.amount !== 0n) pushIssue(issues, 'escrow', 'ESCROW_RESIDUAL_AFTER_FINAL_STATE', 'Order is finalized/cancelled but escrow still has remaining balance', { escrowAmount: escrow.amount });
    if ([0, 1, 2].includes(order.state) && order.grossPrice > 0n && escrow.amount === 0n) pushIssue(issues, 'escrow', 'ESCROW_MISSING_FOR_ACTIVE_ORDER', 'Non-final order has zero escrow balance', { state: stateName });
    if (order.state === 0 && order.sellerConfirmed && order.payDeadline === 0n) pushIssue(issues, 'order', 'SELLER_CONFIRMED_WITHOUT_PAY_DEADLINE', 'Pending confirm order has sellerConfirmed=true but payDeadline=0', { sellerSigPresent: order.sellerSigPresent });
    if (order.state === 0 && !order.sellerConfirmed && order.payDeadline !== 0n) pushIssue(issues, 'order', 'PAY_DEADLINE_BEFORE_SELLER_CONFIRM', 'Pending confirm order has payDeadline set before seller confirmation', { payDeadline: order.payDeadline });
    if ((order.state === 1 || order.state === 2) && !order.sellerConfirmed) pushIssue(issues, 'order', 'PAID_OR_DISPUTED_WITHOUT_SELLER_CONFIRM', 'Paid/disputed order is missing seller confirmation');
    if ((order.state === 1 || order.state === 2 || order.state === 3) && order.paidAt === 0n) pushIssue(issues, 'order', 'PAID_FLOW_MISSING_PAID_AT', 'Paid/disputed/finalized order has zero paidAt timestamp', { state: stateName });
    if ((order.state === 1 || order.state === 2) && order.autoReleaseAt === 0n) pushIssue(issues, 'order', 'PAID_FLOW_MISSING_AUTORELEASE', 'Paid/disputed order has zero autoReleaseAt timestamp', { state: stateName });
    if (order.state === 2 && !dispute.active) pushIssue(issues, 'dispute', 'DISPUTED_ORDER_WITHOUT_ACTIVE_RECORD', 'Marketplace order is DISPUTED but DisputeManager has no active dispute record');
    if (order.state !== 2 && dispute.active) pushIssue(issues, 'dispute', 'ACTIVE_DISPUTE_ON_NON_DISPUTED_ORDER', 'DisputeManager has active dispute for order whose marketplace state is not DISPUTED', { state: stateName });
    if (dispute.active && dispute.deadline > 0n && nowSec >= dispute.deadline) pushIssue(issues, 'dispute', 'STALE_DISPUTE_READY', 'Dispute deadline has passed and stale dispute is ready for resolution', { deadline: dispute.deadline });
    if (dispute.active && dispute.phase1Deadline > 0n && dispute.phase1Deadline > dispute.deadline) pushIssue(issues, 'dispute', 'DISPUTE_PHASE1_AFTER_FINAL_DEADLINE', 'Dispute phase1 deadline exceeds final deadline', { phase1Deadline: dispute.phase1Deadline, deadline: dispute.deadline });

    if (actionable.autoCancelReady) actionables.autoCancelReadyOrderIds.push(orderId.toString());
    if (actionable.autoReleaseReady) actionables.autoReleaseReadyOrderIds.push(orderId.toString());
    if (actionable.staleDisputeReady) actionables.staleDisputeReadyOrderIds.push(orderId.toString());

    const entry = {
      orderId: orderId.toString(),
      state: { code: order.state, name: stateName, phase },
      settlement: {
        code: order.settlementType,
        name: settlementName,
        split: {
          buyerShareBps: order.split.buyerShareBps.toString(),
          sellerShareBps: order.split.sellerShareBps.toString(),
        },
      },
      parties: { buyer: order.buyer, seller: order.seller, payer: order.payer, refundRecipient: order.refundRecipient },
      asset: { paymentToken: order.paymentToken, assetId: order.assetId.toString(), amount: order.amount.toString(), grossPrice: order.grossPrice.toString() },
      flags: { finalized: order.finalized, sellerConfirmed: order.sellerConfirmed, buyerSig1Present: order.buyerSig1Present, sellerSigPresent: order.sellerSigPresent, buyerSig2Present: order.buyerSig2Present },
      timestamps: { proposedAt: order.proposedAt.toString(), paidAt: order.paidAt.toString(), autoReleaseAt: order.autoReleaseAt.toString(), payDeadline: order.payDeadline.toString(), estDeliverySeconds: order.estDeliverySeconds.toString() },
      escrow: { token: escrow.token, buyer: escrow.buyer, payer: escrow.payer, refundRecipient: escrow.refundRecipient, amount: escrow.amount.toString() },
      dispute: { active: dispute.active, verdict: dispute.verdict, openedAt: dispute.openedAt.toString(), deadline: dispute.deadline.toString(), phase1Deadline: dispute.phase1Deadline.toString(), extended: dispute.extended, buyerShareBps: dispute.buyerShareBps.toString(), sellerShareBps: dispute.sellerShareBps.toString() },
      actionability: actionable,
      issues,
    };

    orders.push(entry);
    orderIssues.push(...issues.map((issue) => ({ orderId: orderId.toString(), ...issue })));
  }

  const totalEscrowedByToken = {};
  for (const token of tokenSet) {
    const value = await client.readContract({ address: config.paymentGateway, abi: PAYMENT_GATEWAY_ABI, functionName: 'totalEscrowedByToken', args: [token] });
    totalEscrowedByToken[token] = value.toString();
  }

  const activeDisputeCount = orders.filter((entry) => entry.dispute.active).length;
  const staleDisputeCount = orders.filter((entry) => entry.issues.some((issue) => issue.code === 'STALE_DISPUTE_READY')).length;
  const unhealthyOrderCount = orders.filter((entry) => entry.issues.length > 0).length;

  const result = {
    ok: globalIssues.length === 0 && unhealthyOrderCount === 0,
    auditedAt: new Date().toISOString(),
    chain: {
      id: config.chainId,
      rpcUrl: config.rpcUrl,
      blockNumber: block.number.toString(),
      blockTimestamp: block.timestamp.toString(),
    },
    configuredAddresses: config,
    scanRange: {
      fromOrder: fromOrder.toString(),
      toOrder: toOrder.toString(),
      nextOrderId: nextOrderId.toString(),
      scannedOrderCount: orderCount,
    },
    wiring,
    summary: {
      orderStateCounts: byState,
      activeDisputeCount,
      staleDisputeCount,
      unhealthyOrderCount,
      totalEscrowedByToken,
      actionables,
    },
    issues: {
      global: globalIssues,
      orders: orderIssues,
    },
  };

  if (!options.summaryOnly) result.orders = orders;

  const payload = JSON.stringify(toSerializable(result), null, 2);
  if (options.jsonOut) fs.writeFileSync(options.jsonOut, payload, 'utf8');
  console.log(payload);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
