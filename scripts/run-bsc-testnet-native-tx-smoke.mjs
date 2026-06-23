#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bscTestnet } from 'viem/chains';

const CAMPAIGN_ROOT = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign';
const WALLETS_PATH = path.join(CAMPAIGN_ROOT, 'secrets/generated/20260418T114746Z/wallets.json');
const EXECUTION_DIR = path.join(CAMPAIGN_ROOT, 'tx-smoke/v3_5_beta_native_336');
const LEDGER_PATH = path.join(EXECUTION_DIR, 'ledger.json');
const RUNS_DIR = path.join(EXECUTION_DIR, 'runs');
const DEFAULT_RPC_URL = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/';
const CHAIN_ID = 97;
const DEFAULT_TX_COUNT = 336;
const DEFAULT_VALUE_WEI = 1n;
const DEFAULT_SAFETY_BUFFER_WEI = 50_000_000_000_000n; // 0.00005 BNB.
const EXPLORER_BASE_URL = 'https://testnet.bscscan.com';

function parseArgs(argv) {
  const options = {
    dryRun: false,
    count: DEFAULT_TX_COUNT,
    valueWei: DEFAULT_VALUE_WEI,
    delayMs: 250,
    confirmations: 1,
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || process.env.RPC_URL || DEFAULT_RPC_URL,
    resetLedger: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--count') options.count = Math.max(1, Number.parseInt(argv[++index] || `${DEFAULT_TX_COUNT}`, 10) || DEFAULT_TX_COUNT);
    else if (arg === '--value-wei') options.valueWei = BigInt(String(argv[++index] || `${DEFAULT_VALUE_WEI}`));
    else if (arg === '--delay-ms') options.delayMs = Math.max(0, Number.parseInt(argv[++index] || '0', 10) || 0);
    else if (arg === '--confirmations') options.confirmations = Math.max(1, Number.parseInt(argv[++index] || '1', 10) || 1);
    else if (arg === '--rpc-url') options.rpcUrl = String(argv[++index] || '').trim();
    else if (arg === '--reset-ledger') options.resetLedger = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function normalizeAddress(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePrivateKey(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!/^0x[a-f0-9]{64}$/.test(normalized)) {
    throw new Error('Invalid private key in wallets.json');
  }
  return normalized;
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

function errorMessage(error) {
  if (!error) return 'unknown_error';
  const parts = [];
  if (typeof error.shortMessage === 'string') parts.push(error.shortMessage);
  if (typeof error.message === 'string' && !parts.includes(error.message)) parts.push(error.message);
  return parts.join(' | ') || String(error);
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function loadWallets() {
  const rawWallets = await fs.readFile(WALLETS_PATH, 'utf8').then(JSON.parse);
  return rawWallets.map((wallet) => {
    const id = String(wallet.id || '').trim().toUpperCase();
    const walletAddress = normalizeAddress(wallet.walletAddress);
    const privateKey = normalizePrivateKey(wallet.privateKey);
    const account = privateKeyToAccount(privateKey);
    if (normalizeAddress(account.address) !== walletAddress) {
      throw new Error(`Private key mismatch for ${id}`);
    }
    return {
      id,
      walletAddress,
      account,
    };
  });
}

function buildPlan(wallets, count, valueWei) {
  const plan = [];
  for (let index = 0; index < count; index += 1) {
    const sender = wallets[index % wallets.length];
    const receiver = wallets[(index + 1) % wallets.length];
    plan.push({
      index: index + 1,
      senderProfileId: sender.id,
      senderAddress: sender.walletAddress,
      receiverProfileId: receiver.id,
      receiverAddress: receiver.walletAddress,
      valueWei: valueWei.toString(),
      status: 'pending',
      txHash: '',
      blockNumber: '',
      gasUsed: '',
      effectiveGasPrice: '',
      explorerUrl: '',
      error: '',
      attempts: [],
    });
  }
  return plan;
}

async function preflightBalances(publicClient, wallets, plan, valueWei) {
  const requiredCounts = new Map();
  for (const item of plan) {
    requiredCounts.set(item.senderAddress, (requiredCounts.get(item.senderAddress) || 0) + 1);
  }

  const gasPrice = await publicClient.getGasPrice();
  const gasCostPerTx = gasPrice * 21_000n;
  const balances = [];
  for (const wallet of wallets) {
    const txCount = requiredCounts.get(wallet.walletAddress) || 0;
    const balance = await publicClient.getBalance({ address: wallet.account.address });
    const required = BigInt(txCount) * (gasCostPerTx + valueWei) + DEFAULT_SAFETY_BUFFER_WEI;
    balances.push({
      profileId: wallet.id,
      address: wallet.walletAddress,
      plannedTxCount: txCount,
      balanceWei: balance.toString(),
      balanceBnb: formatEther(balance),
      requiredWei: required.toString(),
      requiredBnb: formatEther(required),
      ok: balance >= required,
    });
  }

  return {
    gasPriceWei: gasPrice.toString(),
    estimatedGasCostPerTxWei: gasCostPerTx.toString(),
    balances,
    underfunded: balances.filter((item) => !item.ok),
  };
}

function summarizeLedger(items) {
  const counts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  return {
    total: items.length,
    confirmed: counts.confirmed || 0,
    pending: counts.pending || 0,
    failed: counts.failed || 0,
    submitted: counts.submitted || 0,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runId = createRunId();
  const wallets = await loadWallets();
  if (wallets.length < 2) throw new Error('At least two wallets are required');

  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http(options.rpcUrl),
  });
  const chainId = await publicClient.getChainId();
  if (chainId !== CHAIN_ID) {
    throw new Error(`Unexpected chain id ${chainId}; expected ${CHAIN_ID}`);
  }

  const existingLedger = options.resetLedger ? null : await readJsonIfExists(LEDGER_PATH, null);
  const ledger = existingLedger || {
    version: 1,
    runType: 'bsc_testnet_native_transfer_smoke',
    chainId: CHAIN_ID,
    targetTxCount: options.count,
    valueWei: options.valueWei.toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: buildPlan(wallets, options.count, options.valueWei),
  };
  if (ledger.items.length !== options.count) {
    throw new Error(`Existing ledger has ${ledger.items.length} items; expected ${options.count}. Use --reset-ledger to rebuild.`);
  }

  const preflight = await preflightBalances(publicClient, wallets, ledger.items, options.valueWei);
  const runReport = {
    runId,
    dryRun: options.dryRun,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    chainId: CHAIN_ID,
    rpcUrl: options.rpcUrl,
    targetTxCount: options.count,
    valueWei: options.valueWei.toString(),
    preflight,
    results: [],
  };

  if (options.dryRun) {
    runReport.finishedAt = new Date().toISOString();
    await writeJson(path.join(RUNS_DIR, `${runId}.dry-run.json`), runReport);
    console.log(JSON.stringify({
      ok: preflight.underfunded.length === 0,
      dryRun: true,
      wallets: wallets.length,
      targetTxCount: options.count,
      alreadyConfirmed: summarizeLedger(ledger.items).confirmed,
      gasPriceWei: preflight.gasPriceWei,
      underfundedCount: preflight.underfunded.length,
      sampleUnderfunded: preflight.underfunded.slice(0, 5).map((wallet) => ({
        profileId: wallet.profileId,
        address: wallet.address,
        plannedTxCount: wallet.plannedTxCount,
        balanceBnb: wallet.balanceBnb,
        requiredBnb: wallet.requiredBnb,
      })),
      runReport: path.join(RUNS_DIR, `${runId}.dry-run.json`),
    }, null, 2));
    if (preflight.underfunded.length > 0) process.exitCode = 1;
    return;
  }

  if (preflight.underfunded.length > 0) {
    throw new Error(`Underfunded wallets: ${preflight.underfunded.length}; run --dry-run for details`);
  }

  await writeJson(LEDGER_PATH, ledger);
  const walletsByAddress = new Map(wallets.map((wallet) => [wallet.walletAddress, wallet]));

  for (const item of ledger.items) {
    if (item.status === 'confirmed') {
      runReport.results.push({ index: item.index, status: 'skipped_confirmed', txHash: item.txHash });
      continue;
    }

    const sender = walletsByAddress.get(item.senderAddress);
    if (!sender) throw new Error(`No wallet for sender ${item.senderAddress}`);
    const walletClient = createWalletClient({
      account: sender.account,
      chain: bscTestnet,
      transport: http(options.rpcUrl),
    });

    const attempt = {
      startedAt: new Date().toISOString(),
      txHash: '',
      error: '',
    };
    item.status = 'submitted';
    item.error = '';
    item.attempts = Array.isArray(item.attempts) ? item.attempts : [];

    try {
      const txHash = await walletClient.sendTransaction({
        account: sender.account,
        to: item.receiverAddress,
        value: BigInt(item.valueWei),
      });
      attempt.txHash = txHash;
      item.txHash = txHash;
      item.explorerUrl = explorerUrl(txHash);
      await writeJson(LEDGER_PATH, { ...ledger, updatedAt: new Date().toISOString() });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: options.confirmations,
      });
      const tx = await publicClient.getTransaction({ hash: txHash });
      item.status = receipt.status === 'success' ? 'confirmed' : 'failed';
      item.blockNumber = receipt.blockNumber?.toString() || '';
      item.gasUsed = receipt.gasUsed?.toString() || '';
      item.effectiveGasPrice = receipt.effectiveGasPrice?.toString() || '';
      item.nonce = typeof tx.nonce === 'number' ? tx.nonce : null;
      attempt.finishedAt = new Date().toISOString();
      item.attempts.push(attempt);
      runReport.results.push({
        index: item.index,
        status: item.status,
        txHash,
        blockNumber: item.blockNumber,
        senderProfileId: item.senderProfileId,
        receiverProfileId: item.receiverProfileId,
      });
      console.log(`${item.index}/${ledger.items.length} ${item.status} ${txHash}`);
    } catch (error) {
      attempt.error = errorMessage(error);
      attempt.finishedAt = new Date().toISOString();
      item.status = 'failed';
      item.error = attempt.error;
      item.attempts.push(attempt);
      runReport.results.push({
        index: item.index,
        status: 'failed',
        error: item.error,
        senderProfileId: item.senderProfileId,
        receiverProfileId: item.receiverProfileId,
      });
      console.error(`${item.index}/${ledger.items.length} failed ${item.error}`);
    }

    ledger.updatedAt = new Date().toISOString();
    await writeJson(LEDGER_PATH, ledger);
    if (options.delayMs > 0) await sleep(options.delayMs);
  }

  runReport.finishedAt = new Date().toISOString();
  runReport.summary = summarizeLedger(ledger.items);
  await writeJson(path.join(RUNS_DIR, `${runId}.json`), runReport);
  console.log(JSON.stringify({
    ok: runReport.summary.confirmed === options.count,
    summary: runReport.summary,
    ledger: LEDGER_PATH,
    runReport: path.join(RUNS_DIR, `${runId}.json`),
  }, null, 2));
  if (runReport.summary.confirmed !== options.count) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
