#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  maxUint256,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bscTestnet } from 'viem/chains';

const CAMPAIGN_ROOT = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign';
const WALLETS_PATH = path.join(CAMPAIGN_ROOT, 'secrets/generated/20260418T114746Z/wallets.json');
const MINT_LEDGER_PATH = path.join(CAMPAIGN_ROOT, 'mint-executions/v3_5_beta_seed_assets_001/ledger.json');
const EXECUTION_DIR = path.join(CAMPAIGN_ROOT, 'protocol-order-smoke/v3_5_beta_ai_auto_seller_confirm');
const RUNS_DIR = path.join(EXECUTION_DIR, 'runs');

const CHAIN_ID = 97;
const DEFAULT_RPC_URL = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/';
const MARKETPLACE = '0x18E1C8ab257FAf16Ec8257A9715d07661194150B';
const PAYMENT_GATEWAY = '0x082d75D8cA96C6e97B6b451Ad4857454A53D5C15';
const PAYMENT_TOKENS = {
  wbnb: '0xae13d989dac2f0debff460ac112a837c89baa7cd',
  usdt: '0x8800279B4a5528628ef069698169C58B89377809',
  usdc: '0xbdcA834A71F5BFF1420eb5D1B0491d58a33141E5',
};
const TESTNET_TOKEN_FAUCET = '0x6527262782C140e0A4724bef06431786556AfDE0';

const ORDER_DOMAIN = {
  name: 'MarketplaceATP',
  version: '3.4',
  chainId: CHAIN_ID,
  verifyingContract: MARKETPLACE,
};

const ORDER_TYPES = {
  Order: [
    { name: 'orderId', type: 'uint256' },
    { name: 'buyer', type: 'address' },
    { name: 'seller', type: 'address' },
    { name: 'paymentToken', type: 'address' },
    { name: 'assetId', type: 'uint256' },
    { name: 'grossPrice', type: 'uint256' },
    { name: 'amount', type: 'uint256' },
    { name: 'estDeliverySeconds', type: 'uint256' },
  ],
};

const MARKETPLACE_ABI = [
  { type: 'function', name: 'nextOrderId', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    type: 'function',
    name: 'createOrder',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'seller', type: 'address' },
      { name: 'paymentToken', type: 'address' },
      { name: 'assetId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'grossPriceProposed', type: 'uint256' },
      { name: 'proposedEstDeliverySeconds', type: 'uint256' },
      { name: 'buyerSig1', type: 'bytes' },
    ],
    outputs: [{ name: 'orderId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'payOrder',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'buyerSig2', type: 'bytes' },
    ],
    outputs: [],
  },
  { type: 'function', name: 'confirmDelivery', stateMutability: 'nonpayable', inputs: [{ name: 'orderId', type: 'uint256' }], outputs: [] },
  {
    type: 'function',
    name: 'orders',
    stateMutability: 'view',
    inputs: [{ name: 'orderId', type: 'uint256' }],
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
      { name: 'split', type: 'tuple', components: [{ name: 'buyerShareBps', type: 'uint256' }, { name: 'sellerShareBps', type: 'uint256' }] },
      { name: 'platformFeeBpsSnapshot', type: 'uint256' },
      { name: 'daoFeeBpsSnapshot', type: 'uint256' },
      { name: 'referralFeeBpsSnapshot', type: 'uint256' },
      { name: 'finalized', type: 'bool' },
      { name: 'sellerConfirmed', type: 'bool' },
      { name: 'buyerSig1', type: 'bytes' },
      { name: 'sellerSig', type: 'bytes' },
      { name: 'buyerSig2', type: 'bytes' },
    ],
  },
  {
    type: 'event',
    name: 'OrderProposed',
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: true, name: 'seller', type: 'address' },
    ],
  },
];

const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
];

const WBNB_ABI = [
  ...ERC20_ABI,
  { type: 'function', name: 'deposit', stateMutability: 'payable', inputs: [], outputs: [] },
];

const TESTNET_TOKEN_FAUCET_ABI = [
  { type: 'function', name: 'claimUSDT', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'claimUSDC', stateMutability: 'nonpayable', inputs: [], outputs: [] },
];

function parseArgs(argv) {
  const options = {
    sellerProfile: 'P001',
    buyerProfile: 'P038',
    payment: 'usdt',
    priceWei: 1n,
    amount: 1n,
    proposedEstDeliverySeconds: 86_400n,
    sellerEstDeliverySeconds: 86_400n,
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || process.env.RPC_URL || DEFAULT_RPC_URL,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--seller-profile') options.sellerProfile = String(argv[++index] || '').toUpperCase();
    else if (arg === '--buyer-profile') options.buyerProfile = String(argv[++index] || '').toUpperCase();
    else if (arg === '--payment') options.payment = String(argv[++index] || '').toLowerCase();
    else if (arg === '--price-wei') options.priceWei = BigInt(argv[++index] || '1');
    else if (arg === '--rpc-url') options.rpcUrl = String(argv[++index] || '').trim();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!PAYMENT_TOKENS[options.payment]) throw new Error(`Unsupported payment token alias: ${options.payment}`);
  return options;
}

function readEnvText(text) {
  const env = {};
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index <= 0) continue;
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

async function loadEnv() {
  return readEnvText(await fs.readFile('.env', 'utf8'));
}

function normalizeAddress(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePrivateKey(value) {
  const key = String(value || '').trim().toLowerCase();
  if (!/^0x[a-f0-9]{64}$/.test(key)) throw new Error('Invalid private key');
  return key;
}

function toWallet(wallet) {
  const account = privateKeyToAccount(normalizePrivateKey(wallet.privateKey));
  return {
    id: String(wallet.id || '').trim().toUpperCase(),
    walletAddress: normalizeAddress(wallet.walletAddress),
    account,
  };
}

function createRunId(now = new Date()) {
  return now.toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildOrderMessage({ orderId, buyer, seller, paymentToken, assetId, grossPrice, amount, estDeliverySeconds }) {
  return { orderId, buyer, seller, paymentToken, assetId, grossPrice, amount, estDeliverySeconds };
}

async function signOrder(account, message) {
  return account.signTypedData({
    domain: ORDER_DOMAIN,
    types: ORDER_TYPES,
    primaryType: 'Order',
    message,
  });
}

function createWalletClientFor(account, rpcUrl) {
  return createWalletClient({ account, chain: bscTestnet, transport: http(rpcUrl) });
}

async function writeContractAndWait({ publicClient, walletClient, address, abi, functionName, args, value, gas }) {
  await publicClient.simulateContract({
    account: walletClient.account,
    address,
    abi,
    functionName,
    args,
    ...(value ? { value } : {}),
  });
  const txHash = await walletClient.writeContract({
    address,
    abi,
    functionName,
    args,
    ...(value ? { value } : {}),
    ...(gas ? { gas } : {}),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
  return { txHash, receipt };
}

async function ensureTokenBalance({ publicClient, walletClient, paymentToken, paymentAlias, amount }) {
  const balance = await publicClient.readContract({ address: paymentToken, abi: ERC20_ABI, functionName: 'balanceOf', args: [walletClient.account.address] });
  if (balance >= amount) return null;
  if (paymentAlias === 'wbnb') {
    return writeContractAndWait({
      publicClient,
      walletClient,
      address: paymentToken,
      abi: WBNB_ABI,
      functionName: 'deposit',
      args: [],
      value: amount - balance,
    });
  }

  if (paymentAlias === 'usdt' || paymentAlias === 'usdc') {
    const claimResult = await writeContractAndWait({
      publicClient,
      walletClient,
      address: TESTNET_TOKEN_FAUCET,
      abi: TESTNET_TOKEN_FAUCET_ABI,
      functionName: paymentAlias === 'usdt' ? 'claimUSDT' : 'claimUSDC',
      args: [],
    });
    const nextBalance = await publicClient.readContract({ address: paymentToken, abi: ERC20_ABI, functionName: 'balanceOf', args: [walletClient.account.address] });
    if (nextBalance >= amount) return claimResult;
  }

  throw new Error(`Insufficient ${paymentAlias} balance for ${walletClient.account.address}: ${balance.toString()} < ${amount.toString()}`);
}

async function ensureAllowance({ publicClient, walletClient, paymentToken, spender, amount }) {
  const allowance = await publicClient.readContract({ address: paymentToken, abi: ERC20_ABI, functionName: 'allowance', args: [walletClient.account.address, spender] });
  if (allowance >= amount) return null;
  return writeContractAndWait({ publicClient, walletClient, address: paymentToken, abi: ERC20_ABI, functionName: 'approve', args: [spender, maxUint256] });
}

function extractOrderProposed(receipt) {
  for (const log of receipt.logs || []) {
    if (normalizeAddress(log.address) !== normalizeAddress(MARKETPLACE)) continue;
    try {
      const decoded = decodeEventLog({ abi: MARKETPLACE_ABI, data: log.data, topics: log.topics });
      if (decoded.eventName === 'OrderProposed') return decoded.args.orderId;
    } catch {
      // Ignore unrelated logs.
    }
  }
  return null;
}

function selectSellerAsset(mintLedger, sellerProfile) {
  const item = (mintLedger.items || []).find((entry) => (
    String(entry.profileId || '').toUpperCase() === sellerProfile
    && entry.status === 'success'
    && entry.assetId
  ));
  if (!item) throw new Error(`No successful minted asset found for ${sellerProfile}`);
  return item;
}

async function readOrderWithFinalityRetry(publicClient, orderId) {
  let order = await publicClient.readContract({ address: MARKETPLACE, abi: MARKETPLACE_ABI, functionName: 'orders', args: [orderId] });
  for (let attempt = 0; attempt < 6 && !Boolean(order[19]); attempt += 1) {
    await sleep(1500);
    order = await publicClient.readContract({ address: MARKETPLACE, abi: MARKETPLACE_ABI, functionName: 'orders', args: [orderId] });
  }
  return order;
}

async function callSellerConfirmExecutor({ env, orderId, estDeliverySeconds, dryRun }) {
  const url = `${env.VITE_SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/orina-ai-m2m-v2/seller-confirm/run`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'x-ai-m2m-autoconfirm-secret': env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderIds: [orderId.toString()],
      estDeliverySeconds: estDeliverySeconds.toString(),
      dryRun,
      confirmations: 1,
    }),
  });
  const json = await response.json();
  return { status: response.status, ok: response.ok, json };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const env = await loadEnv();
  const runId = createRunId();
  const wallets = JSON.parse(await fs.readFile(WALLETS_PATH, 'utf8')).map(toWallet);
  const walletById = new Map(wallets.map((wallet) => [wallet.id, wallet]));
  const seller = walletById.get(options.sellerProfile);
  const buyer = walletById.get(options.buyerProfile);
  if (!seller || !buyer) throw new Error('Seller or buyer profile not found');
  if (seller.walletAddress === buyer.walletAddress) throw new Error('Seller and buyer must differ');
  const mintLedger = JSON.parse(await fs.readFile(MINT_LEDGER_PATH, 'utf8'));
  const asset = selectSellerAsset(mintLedger, seller.id);
  const paymentToken = PAYMENT_TOKENS[options.payment];

  const publicClient = createPublicClient({ chain: bscTestnet, transport: http(options.rpcUrl) });
  const buyerClient = createWalletClientFor(buyer.account, options.rpcUrl);
  const setupTxs = [];
  const orderTxs = {};

  const setupTokenFunding = await ensureTokenBalance({
    publicClient,
    walletClient: buyerClient,
    paymentToken,
    paymentAlias: options.payment,
    amount: options.priceWei,
  });
  if (setupTokenFunding) {
    setupTxs.push({ type: options.payment === 'wbnb' ? 'deposit' : `claim:${options.payment}`, txHash: setupTokenFunding.txHash });
  }

  for (const spender of [PAYMENT_GATEWAY, MARKETPLACE]) {
    const approval = await ensureAllowance({ publicClient, walletClient: buyerClient, paymentToken, spender, amount: options.priceWei });
    if (approval) setupTxs.push({ type: `approve:${spender}`, txHash: approval.txHash });
  }

  const predictedOrderId = await publicClient.readContract({ address: MARKETPLACE, abi: MARKETPLACE_ABI, functionName: 'nextOrderId' });
  const assetId = BigInt(asset.assetId);
  const buyerSig1 = await signOrder(buyer.account, buildOrderMessage({
    orderId: predictedOrderId,
    buyer: buyer.account.address,
    seller: seller.account.address,
    paymentToken,
    assetId,
    grossPrice: options.priceWei,
    amount: options.amount,
    estDeliverySeconds: options.proposedEstDeliverySeconds,
  }));

  const createResult = await writeContractAndWait({
    publicClient,
    walletClient: buyerClient,
    address: MARKETPLACE,
    abi: MARKETPLACE_ABI,
    functionName: 'createOrder',
    args: [
      seller.account.address,
      paymentToken,
      assetId,
      options.amount,
      options.priceWei,
      options.proposedEstDeliverySeconds,
      buyerSig1,
    ],
  });
  const orderId = extractOrderProposed(createResult.receipt) || predictedOrderId;
  orderTxs.createOrder = createResult.txHash;

  const dryRun = await callSellerConfirmExecutor({
    env,
    orderId,
    estDeliverySeconds: options.sellerEstDeliverySeconds,
    dryRun: true,
  });
  if (!dryRun.ok || dryRun.json?.eligible !== 1) {
    throw new Error(`Seller confirm executor dry-run failed: ${JSON.stringify(dryRun.json)}`);
  }

  const confirmRun = await callSellerConfirmExecutor({
    env,
    orderId,
    estDeliverySeconds: options.sellerEstDeliverySeconds,
    dryRun: false,
  });
  if (!confirmRun.ok || confirmRun.json?.confirmed !== 1) {
    throw new Error(`Seller confirm executor failed: ${JSON.stringify(confirmRun.json)}`);
  }
  orderTxs.sellerConfirmFor = confirmRun.json.results?.[0]?.txHash;

  const sellerConfirmedOrder = await publicClient.readContract({ address: MARKETPLACE, abi: MARKETPLACE_ABI, functionName: 'orders', args: [orderId] });
  if (!sellerConfirmedOrder[20]) {
    throw new Error('Order was not marked sellerConfirmed after executor run');
  }

  if (Number(sellerConfirmedOrder[13]) !== 1 && BigInt(sellerConfirmedOrder[9]) === 0n) {
    const buyerSig2 = await signOrder(buyer.account, buildOrderMessage({
      orderId,
      buyer: buyer.account.address,
      seller: seller.account.address,
      paymentToken,
      assetId,
      grossPrice: options.priceWei,
      amount: options.amount,
      estDeliverySeconds: options.sellerEstDeliverySeconds,
    }));
    const payResult = await writeContractAndWait({
      publicClient,
      walletClient: buyerClient,
      address: MARKETPLACE,
      abi: MARKETPLACE_ABI,
      functionName: 'payOrder',
      args: [orderId, buyerSig2],
    });
    orderTxs.payOrder = payResult.txHash;
  } else {
    orderTxs.payOrder = 'skipped_already_paid_by_seller_confirm_for';
  }

  const deliveryResult = await writeContractAndWait({
    publicClient,
    walletClient: buyerClient,
    address: MARKETPLACE,
    abi: MARKETPLACE_ABI,
    functionName: 'confirmDelivery',
    args: [orderId],
  });
  orderTxs.confirmDelivery = deliveryResult.txHash;

  const finalOrder = await readOrderWithFinalityRetry(publicClient, orderId);
  const report = {
    ok: true,
    runId,
    orderId: orderId.toString(),
    sellerProfile: seller.id,
    buyerProfile: buyer.id,
    assetId: assetId.toString(),
    assetUid: asset.assetUid,
    payment: options.payment,
    paymentToken,
    setupTxs,
    orderTxs,
    executorDryRun: dryRun.json,
    executorRun: confirmRun.json,
    finalState: {
      state: Number(finalOrder[13]),
      finalized: Boolean(finalOrder[19]),
      sellerConfirmed: Boolean(finalOrder[20]),
      paidAt: finalOrder[9].toString(),
    },
  };

  await fs.mkdir(RUNS_DIR, { recursive: true });
  const reportPath = path.join(RUNS_DIR, `${runId}.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
