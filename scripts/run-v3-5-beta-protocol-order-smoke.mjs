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
const EXECUTION_DIR = path.join(CAMPAIGN_ROOT, 'protocol-order-smoke/v3_5_beta_protocol_336');
const LEDGER_PATH = path.join(EXECUTION_DIR, 'ledger.json');
const RUNS_DIR = path.join(EXECUTION_DIR, 'runs');

const CHAIN_ID = 97;
const DEFAULT_RPC_URL = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/';
const MARKETPLACE = '0x18E1C8ab257FAf16Ec8257A9715d07661194150B';
const PAYMENT_GATEWAY = '0x082d75D8cA96C6e97B6b451Ad4857454A53D5C15';
const PAYMENT_TOKEN_WBNB = '0xae13d989dac2f0debff460ac112a837c89baa7cd';
const EXPLORER_BASE_URL = 'https://testnet.bscscan.com';

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
  {
    type: 'function',
    name: 'nextOrderId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
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
    name: 'sellerConfirm',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'estDeliverySeconds', type: 'uint256' },
      { name: 'sellerSig', type: 'bytes' },
    ],
    outputs: [],
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
  {
    type: 'function',
    name: 'confirmDelivery',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [],
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
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

const WBNB_ABI = [
  ...ERC20_ABI,
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
];

function parseArgs(argv) {
  const options = {
    orders: 84,
    dryRun: false,
    delayMs: 600,
    priceWei: 1n,
    amount: 1n,
    proposedEstDeliverySeconds: 86_400n,
    sellerEstDeliverySeconds: 172_800n,
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || process.env.RPC_URL || DEFAULT_RPC_URL,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--orders') options.orders = Math.max(1, Number.parseInt(argv[++index] || '1', 10) || 1);
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--delay-ms') options.delayMs = Math.max(0, Number.parseInt(argv[++index] || '0', 10) || 0);
    else if (arg === '--price-wei') options.priceWei = BigInt(argv[++index] || '1');
    else if (arg === '--rpc-url') options.rpcUrl = String(argv[++index] || '').trim();
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function normalizeAddress(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePrivateKey(value) {
  const key = String(value || '').trim().toLowerCase();
  if (!/^0x[a-f0-9]{64}$/.test(key)) throw new Error('Invalid private key in wallets.json');
  return key;
}

function formatError(error) {
  const parts = [];
  if (typeof error?.shortMessage === 'string') parts.push(error.shortMessage);
  if (typeof error?.message === 'string' && !parts.includes(error.message)) parts.push(error.message);
  return parts.join(' | ') || String(error);
}

function createRunId(now = new Date()) {
  return now.toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z');
}

function explorerUrl(txHash) {
  return txHash ? `${EXPLORER_BASE_URL}/tx/${txHash}` : '';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function toAccountRecord(wallet) {
  const account = privateKeyToAccount(normalizePrivateKey(wallet.privateKey));
  const id = String(wallet.id || '').trim().toUpperCase();
  const walletAddress = normalizeAddress(wallet.walletAddress);
  if (normalizeAddress(account.address) !== walletAddress) {
    throw new Error(`Private key mismatch for ${id}`);
  }
  return {
    id,
    walletAddress,
    account,
  };
}

function buildOrderMessage({ orderId, buyer, seller, assetId, grossPrice, amount, estDeliverySeconds }) {
  return {
    orderId,
    buyer,
    seller,
    paymentToken: PAYMENT_TOKEN_WBNB,
    assetId,
    grossPrice,
    amount,
    estDeliverySeconds,
  };
}

async function signOrder(account, message) {
  return account.signTypedData({
    domain: ORDER_DOMAIN,
    types: ORDER_TYPES,
    primaryType: 'Order',
    message,
  });
}

function extractOrderProposed(receipt) {
  for (const log of receipt.logs || []) {
    if (normalizeAddress(log.address) !== normalizeAddress(MARKETPLACE)) continue;
    try {
      const decoded = decodeEventLog({
        abi: MARKETPLACE_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === 'OrderProposed') {
        return {
          orderId: decoded.args.orderId.toString(),
          buyer: normalizeAddress(decoded.args.buyer),
          seller: normalizeAddress(decoded.args.seller),
        };
      }
    } catch {
      // Ignore unrelated logs.
    }
  }
  return null;
}

function createWalletClientFor(accountRecord, rpcUrl) {
  return createWalletClient({
    account: accountRecord.account,
    chain: bscTestnet,
    transport: http(rpcUrl),
  });
}

async function writeContractAndWait({ publicClient, walletClient, address, abi, functionName, args, value }) {
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
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
  return { txHash, receipt };
}

async function ensureWbnb({ publicClient, walletClient, amount }) {
  const balance = await publicClient.readContract({
    address: PAYMENT_TOKEN_WBNB,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [walletClient.account.address],
  });
  if (balance >= amount) return null;
  const value = amount - balance;
  return writeContractAndWait({
    publicClient,
    walletClient,
    address: PAYMENT_TOKEN_WBNB,
    abi: WBNB_ABI,
    functionName: 'deposit',
    args: [],
    value,
  });
}

async function ensureAllowance({ publicClient, walletClient, spender, amount }) {
  const allowance = await publicClient.readContract({
    address: PAYMENT_TOKEN_WBNB,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [walletClient.account.address, spender],
  });
  if (allowance >= amount) return null;
  return writeContractAndWait({
    publicClient,
    walletClient,
    address: PAYMENT_TOKEN_WBNB,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, maxUint256],
  });
}

function buildQueue({ mintLedger, wallets, orders }) {
  const walletById = new Map(wallets.map((wallet) => [wallet.id, wallet]));
  const successAssets = (mintLedger.items || [])
    .filter((item) => item.status === 'success' && item.assetId && walletById.has(String(item.profileId || '').toUpperCase()))
    .slice(0, orders);

  return successAssets.map((item, index) => {
    const seller = walletById.get(String(item.profileId || '').toUpperCase());
    let buyer = wallets[(index + 37) % wallets.length];
    if (buyer.walletAddress === seller.walletAddress) {
      buyer = wallets[(index + 38) % wallets.length];
    }
    return {
      slot: index + 1,
      assetUid: item.assetUid,
      assetTitle: item.title,
      assetId: item.assetId,
      sellerProfileId: seller.id,
      sellerAddress: seller.walletAddress,
      buyerProfileId: buyer.id,
      buyerAddress: buyer.walletAddress,
      status: 'pending',
      orderId: '',
      txs: {},
      blocks: {},
      errors: [],
    };
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runId = createRunId();
  const walletsRaw = await readJson(WALLETS_PATH);
  const wallets = walletsRaw.map(toAccountRecord);
  const walletByAddress = new Map(wallets.map((wallet) => [wallet.walletAddress, wallet]));
  const mintLedger = await readJson(MINT_LEDGER_PATH);
  const existingLedger = await readJsonIfExists(LEDGER_PATH, null);
  const ledger = existingLedger || {
    version: 1,
    chainId: CHAIN_ID,
    marketplace: MARKETPLACE,
    paymentGateway: PAYMENT_GATEWAY,
    paymentToken: PAYMENT_TOKEN_WBNB,
    targetProtocolStageTx: options.orders * 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: buildQueue({ mintLedger, wallets, orders: options.orders }),
  };

  if (ledger.items.length < options.orders) {
    const freshItems = buildQueue({ mintLedger, wallets, orders: options.orders });
    const existingByAsset = new Map(ledger.items.map((item) => [item.assetUid, item]));
    ledger.items = freshItems.map((item) => existingByAsset.get(item.assetUid) || item);
  }

  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http(options.rpcUrl),
  });

  const run = {
    runId,
    dryRun: options.dryRun,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    chainId: CHAIN_ID,
    rpcUrl: options.rpcUrl,
    requestedOrders: options.orders,
    priceWei: options.priceWei.toString(),
    protocolStageTxTarget: options.orders * 4,
    setupTxCount: 0,
    protocolStageTxCount: 0,
    completedOrders: 0,
    failedOrders: 0,
    minBlock: null,
    maxBlock: null,
    items: [],
  };

  for (const item of ledger.items.slice(0, options.orders)) {
    if (item.status === 'finalized') {
      run.completedOrders += 1;
      run.protocolStageTxCount += 4;
      continue;
    }

    const seller = walletByAddress.get(normalizeAddress(item.sellerAddress));
    const buyer = walletByAddress.get(normalizeAddress(item.buyerAddress));
    if (!seller || !buyer) throw new Error(`Missing buyer/seller wallet for ${item.assetUid}`);

    const buyerClient = createWalletClientFor(buyer, options.rpcUrl);
    const sellerClient = createWalletClientFor(seller, options.rpcUrl);
    const assetId = BigInt(item.assetId);
    const amount = options.amount;
    const grossPrice = options.priceWei;

    try {
      if (options.dryRun) {
        item.status = 'dry_run_ready';
        run.items.push({ assetUid: item.assetUid, status: item.status });
        continue;
      }

      const setupDeposit = await ensureWbnb({ publicClient, walletClient: buyerClient, amount: grossPrice });
      if (setupDeposit) {
        item.txs.wbnbDeposit = setupDeposit.txHash;
        item.blocks.wbnbDeposit = setupDeposit.receipt.blockNumber.toString();
        run.setupTxCount += 1;
      }

      for (const spender of [PAYMENT_GATEWAY, MARKETPLACE]) {
        const setupApprove = await ensureAllowance({ publicClient, walletClient: buyerClient, spender, amount: grossPrice });
        if (setupApprove) {
          const key = normalizeAddress(spender) === normalizeAddress(PAYMENT_GATEWAY) ? 'approvePaymentGateway' : 'approveMarketplace';
          item.txs[key] = setupApprove.txHash;
          item.blocks[key] = setupApprove.receipt.blockNumber.toString();
          run.setupTxCount += 1;
        }
      }

      const predictedOrderId = await publicClient.readContract({
        address: MARKETPLACE,
        abi: MARKETPLACE_ABI,
        functionName: 'nextOrderId',
      });
      const buyerSig1 = await signOrder(buyer.account, buildOrderMessage({
        orderId: predictedOrderId,
        buyer: buyer.account.address,
        seller: seller.account.address,
        assetId,
        grossPrice,
        amount,
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
          PAYMENT_TOKEN_WBNB,
          assetId,
          amount,
          grossPrice,
          options.proposedEstDeliverySeconds,
          buyerSig1,
        ],
      });
      const proposed = extractOrderProposed(createResult.receipt);
      const orderId = BigInt(proposed?.orderId || predictedOrderId.toString());
      item.orderId = orderId.toString();
      item.txs.createOrder = createResult.txHash;
      item.blocks.createOrder = createResult.receipt.blockNumber.toString();
      run.protocolStageTxCount += 1;

      const sellerSig = await signOrder(seller.account, buildOrderMessage({
        orderId,
        buyer: buyer.account.address,
        seller: seller.account.address,
        assetId,
        grossPrice,
        amount,
        estDeliverySeconds: options.sellerEstDeliverySeconds,
      }));

      const sellerConfirmResult = await writeContractAndWait({
        publicClient,
        walletClient: sellerClient,
        address: MARKETPLACE,
        abi: MARKETPLACE_ABI,
        functionName: 'sellerConfirm',
        args: [orderId, options.sellerEstDeliverySeconds, sellerSig],
      });
      item.txs.sellerConfirm = sellerConfirmResult.txHash;
      item.blocks.sellerConfirm = sellerConfirmResult.receipt.blockNumber.toString();
      run.protocolStageTxCount += 1;

      const buyerSig2 = await signOrder(buyer.account, buildOrderMessage({
        orderId,
        buyer: buyer.account.address,
        seller: seller.account.address,
        assetId,
        grossPrice,
        amount,
        estDeliverySeconds: options.sellerEstDeliverySeconds,
      }));

      const payOrderResult = await writeContractAndWait({
        publicClient,
        walletClient: buyerClient,
        address: MARKETPLACE,
        abi: MARKETPLACE_ABI,
        functionName: 'payOrder',
        args: [orderId, buyerSig2],
      });
      item.txs.payOrder = payOrderResult.txHash;
      item.blocks.payOrder = payOrderResult.receipt.blockNumber.toString();
      run.protocolStageTxCount += 1;

      const confirmResult = await writeContractAndWait({
        publicClient,
        walletClient: buyerClient,
        address: MARKETPLACE,
        abi: MARKETPLACE_ABI,
        functionName: 'confirmDelivery',
        args: [orderId],
      });
      item.txs.confirmDelivery = confirmResult.txHash;
      item.blocks.confirmDelivery = confirmResult.receipt.blockNumber.toString();
      run.protocolStageTxCount += 1;

      item.status = 'finalized';
      item.finalizedAt = new Date().toISOString();
      item.explorerUrls = Object.fromEntries(
        Object.entries(item.txs)
          .filter(([, hash]) => hash)
          .map(([key, hash]) => [key, explorerUrl(hash)]),
      );
      run.completedOrders += 1;

      for (const block of Object.values(item.blocks)) {
        if (!block) continue;
        const blockNumber = BigInt(block);
        run.minBlock = run.minBlock === null || blockNumber < BigInt(run.minBlock) ? block : run.minBlock;
        run.maxBlock = run.maxBlock === null || blockNumber > BigInt(run.maxBlock) ? block : run.maxBlock;
      }
    } catch (error) {
      item.status = 'failed';
      item.errors.push({
        at: new Date().toISOString(),
        message: formatError(error),
      });
      run.failedOrders += 1;
      run.items.push({
        assetUid: item.assetUid,
        orderId: item.orderId,
        status: item.status,
        error: item.errors[item.errors.length - 1]?.message,
      });
      ledger.updatedAt = new Date().toISOString();
      await writeJson(LEDGER_PATH, ledger);
      throw error;
    }

    run.items.push({
      assetUid: item.assetUid,
      orderId: item.orderId,
      status: item.status,
      txs: item.txs,
      blocks: item.blocks,
    });
    ledger.updatedAt = new Date().toISOString();
    await writeJson(LEDGER_PATH, ledger);
    if (options.delayMs > 0) await sleep(options.delayMs);
  }

  ledger.updatedAt = new Date().toISOString();
  await writeJson(LEDGER_PATH, ledger);
  run.finishedAt = new Date().toISOString();
  await writeJson(path.join(RUNS_DIR, `${runId}.json`), run);
  console.log(JSON.stringify(run, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: formatError(error) }, null, 2));
  process.exit(1);
});
