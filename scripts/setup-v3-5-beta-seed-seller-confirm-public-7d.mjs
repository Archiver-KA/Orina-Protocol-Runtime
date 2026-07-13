#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  zeroAddress,
  zeroHash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  resolveBufferedEip1559FeeOverrides,
  resolveRpcUrl,
  resolveV35TestnetNetwork,
} from './lib/v35-testnet-seed-networks.mjs';

const CAMPAIGN_ROOT = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign';
const WALLETS_PATH = path.join(CAMPAIGN_ROOT, 'secrets/generated/20260418T114746Z/wallets.json');

let ACTIVE_NETWORK = resolveV35TestnetNetwork('bnb-testnet');
let CHAIN_ID = ACTIVE_NETWORK.chainId;
let MARKETPLACE = ACTIVE_NETWORK.marketplace;
let PAYMENT_GATEWAY = ACTIVE_NETWORK.paymentGateway;
let PAYMENT_TOKENS = ACTIVE_NETWORK.tokens;
let DELEGATION_MANAGER = ACTIVE_NETWORK.delegationManager;
let AI_WALLET_FACTORY_V2 = ACTIVE_NETWORK.aiWalletFactoryV2;
const ACTION_SELLER_CONFIRM = 1n << 3n;
const EXPIRY_DAYS = 7;
const EXPIRY_SECONDS = BigInt(EXPIRY_DAYS * 24 * 60 * 60);
const MAX_DELIVERY_SECONDS = 10n * 24n * 60n * 60n;
const DELEGATE_MIN_GAS_BALANCE_WEI = 500000000000000n;
const DELEGATE_FUND_AMOUNT_WEI = 1000000000000000n;

const FACTORY_ABI = parseAbi([
  'function predictWallet(address root, uint256 sessionNonce) view returns (address)',
  'function walletOfSession(address root, uint256 sessionNonce) view returns (address)',
  'function deployWallet((address root,address delegate,address allowedTarget,address allowedSpender,address allowedToken,uint64 expiry,uint256 actionMask,uint256 maxPerOrder,uint256 maxTotal,bytes32 counterpartyAllowlistHash,bool restrictAssetId,uint256 assetId,uint256 maxAmount,uint256 minGrossPrice,uint256 maxGrossPrice,uint256 maxDeliverySeconds) config) returns (address wallet,uint256 sessionNonce,bytes32 sessionId)',
]);

const MANAGER_ABI = parseAbi([
  'function hasActiveCycle(address root) view returns (bool)',
  'function activeSessionNonce(address root) view returns (uint256)',
  'function nextSessionNonce(address root) view returns (uint256)',
  'function sessionStatus(address root, uint256 sessionNonce) view returns (uint8)',
  'function getSession(address root, uint256 sessionNonce) view returns ((address root,address delegate,address payerVault,address paymentToken,uint256 maxPerOrder,uint256 maxTotal,uint256 spentTotal,uint64 validFrom,uint64 validUntil,uint256 actionMask,uint256 sessionEpoch,bytes32 counterpartyAllowlistHash,bool restrictAssetId,uint256 assetId,uint256 maxAmount,uint256 minGrossPrice,uint256 maxGrossPrice,uint256 maxDeliverySeconds,uint8 status,bool exists) session)',
]);

const AI_WALLET_ABI = parseAbi([
  'function isActive() view returns (bool)',
  'function revokeAndSweep()',
  'function closeExpiredAndSweep()',
]);

function parseArgs(argv) {
  const options = {
    limit: 100,
    profileFrom: 1,
    profileTo: 100,
    network: 'bnb-testnet',
    payment: 'usdt',
    dryRun: false,
    delayMs: 350,
    rpcUrl: '',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--network') options.network = String(argv[++index] || '').trim();
    else if (arg === '--limit') options.limit = Math.max(1, Number.parseInt(argv[++index] || '1', 10) || 1);
    else if (arg === '--profile-from') options.profileFrom = Math.max(1, Number.parseInt(argv[++index] || '1', 10) || 1);
    else if (arg === '--profile-to') options.profileTo = Math.min(100, Number.parseInt(argv[++index] || '100', 10) || 100);
    else if (arg === '--payment') options.payment = String(argv[++index] || '').trim().toLowerCase();
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--delay-ms') options.delayMs = Math.max(0, Number.parseInt(argv[++index] || '0', 10) || 0);
    else if (arg === '--rpc-url') options.rpcUrl = String(argv[++index] || '').trim();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.profileFrom > options.profileTo) throw new Error('--profile-from must be <= --profile-to');
  return options;
}

function activateNetwork(options) {
  ACTIVE_NETWORK = resolveV35TestnetNetwork(options.network);
  CHAIN_ID = ACTIVE_NETWORK.chainId;
  MARKETPLACE = ACTIVE_NETWORK.marketplace;
  PAYMENT_GATEWAY = ACTIVE_NETWORK.paymentGateway;
  PAYMENT_TOKENS = ACTIVE_NETWORK.tokens;
  DELEGATION_MANAGER = ACTIVE_NETWORK.delegationManager;
  AI_WALLET_FACTORY_V2 = ACTIVE_NETWORK.aiWalletFactoryV2;
  options.rpcUrl = options.rpcUrl || resolveRpcUrl(ACTIVE_NETWORK, options);
  if (!PAYMENT_TOKENS[options.payment]) throw new Error(`Unsupported payment token for ${ACTIVE_NETWORK.key}: ${options.payment}`);
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

function profileNumber(profileId) {
  const match = String(profileId || '').trim().toUpperCase().match(/^P(\d{3})$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function formatProfileId(value) {
  return `P${String(value).padStart(3, '0')}`;
}

function executionPaths(options) {
  const cohort = `${formatProfileId(options.profileFrom).toLowerCase()}_${formatProfileId(options.profileTo).toLowerCase()}`;
  const executionDir = path.join(
    CAMPAIGN_ROOT,
    `ai-wallet-setup/${ACTIVE_NETWORK.executionSegment}_dual_token_${options.payment}_t_${cohort}_seller_confirm_7d_public`,
  );
  return {
    ledgerPath: path.join(executionDir, 'ledger.json'),
    runsDir: path.join(executionDir, 'runs'),
  };
}

function normalizePrivateKey(value) {
  const key = String(value || '').trim().toLowerCase();
  if (!/^0x[a-f0-9]{64}$/.test(key)) throw new Error('Invalid private key in wallets.json');
  return key;
}

function createRunId(now = new Date()) {
  return now.toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z');
}

function formatError(error) {
  const parts = [];
  if (typeof error?.shortMessage === 'string') parts.push(error.shortMessage);
  if (typeof error?.message === 'string' && !parts.includes(error.message)) parts.push(error.message);
  return parts.join(' | ') || String(error);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function toSeedWallet(wallet) {
  const account = privateKeyToAccount(normalizePrivateKey(wallet.privateKey));
  const id = String(wallet.id || '').trim().toUpperCase();
  const walletAddress = normalizeAddress(wallet.walletAddress);
  if (normalizeAddress(account.address) !== walletAddress) {
    throw new Error(`Private key mismatch for ${id}`);
  }
  return { id, walletAddress, account };
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, ok: response.ok, json };
}

function buildFunctionUrl(baseUrl, functionName, routePath) {
  return `${String(baseUrl).replace(/\/+$/, '')}/functions/v1/${functionName}/${String(routePath || '').replace(/^\/+/, '')}`;
}

async function exchangeBridge({ env, account }) {
  const baseUrl = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const fnName = env.VITE_SUPABASE_AUTH_BRIDGE_FN_NAME || 'orina-auth-bridge-v1';
  const walletAddress = normalizeAddress(account.address);
  const origin = String(process.env.ATP2_SMOKE_ORIGIN || 'https://app.orina.io').trim();
  const challenge = await requestJson(buildFunctionUrl(baseUrl, fnName, 'challenge'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ walletAddress, chainId: 97 }),
  });
  if (!challenge.ok || typeof challenge.json?.message !== 'string') {
    throw new Error(`Auth bridge challenge failed with status ${challenge.status}`);
  }
  const message = challenge.json.message;
  const signedAt = Date.parse(String(challenge.json.issuedAt || ''));
  if (!Number.isFinite(signedAt)) throw new Error('Auth bridge challenge returned invalid issuedAt');
  const signature = await account.signMessage({ message });
  const response = await requestJson(buildFunctionUrl(baseUrl, fnName, 'exchange'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
      walletAuthSession: {
        address: walletAddress,
        signedAt,
        signature,
        message,
      },
      client: {
        app: 'ATP2-seed-seller-confirm-public-setup',
        phase: 'v3.5-beta-seed-seller-confirm-public-7d',
        requestedAt: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok || !response.json?.accessToken) {
    throw new Error(`Auth bridge exchange failed: ${JSON.stringify(response.json)}`);
  }
  return response.json.accessToken;
}

async function authedM2MRequest({ env, token, routePath, method = 'GET', body }) {
  const baseUrl = env.VITE_SUPABASE_URL;
  const fnName = env.VITE_SUPABASE_AI_M2M_FN_NAME || 'orina-ai-m2m-v2';
  return requestJson(buildFunctionUrl(baseUrl, fnName, routePath), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function isDesiredSellerConfirmSession(session, nowSeconds, paymentToken) {
  if (!session?.exists || Number(session.status) !== 1) return false;
  return (
    BigInt(session.validUntil) > nowSeconds + 24n * 60n * 60n
    && BigInt(session.validUntil) < nowSeconds + 8n * 24n * 60n * 60n
    && BigInt(session.actionMask ?? 0n) === ACTION_SELLER_CONFIRM
    && normalizeAddress(session.paymentToken) === normalizeAddress(paymentToken)
    && String(session.counterpartyAllowlistHash).toLowerCase() === zeroHash
    && BigInt(session.maxPerOrder) === 0n
    && BigInt(session.maxTotal) === 0n
    && BigInt(session.maxAmount) === 0n
    && BigInt(session.minGrossPrice) === 1n
    && BigInt(session.maxGrossPrice) === 0n
    && BigInt(session.maxDeliverySeconds) === MAX_DELIVERY_SECONDS
  );
}

function initialLedger(wallets, paymentToken, options) {
  return {
    version: 1,
    chainId: CHAIN_ID,
    marketplace: MARKETPLACE,
    paymentGateway: PAYMENT_GATEWAY,
    paymentToken,
    delegationManager: DELEGATION_MANAGER,
    aiWalletFactoryV2: AI_WALLET_FACTORY_V2,
    policy: {
      payment: options.payment,
      profileFrom: formatProfileId(options.profileFrom),
      profileTo: formatProfileId(options.profileTo),
      expiryDays: EXPIRY_DAYS,
      allowedActions: ['sign_order'],
      actionMask: ACTION_SELLER_CONFIRM.toString(),
      maxPerOrder: '0',
      maxTotal: '0',
      counterpartyAllowlistHash: zeroHash,
      restrictAssetId: false,
      assetId: '0',
      maxAmount: '0',
      minGrossPrice: '1',
      maxGrossPrice: '0',
      maxDeliverySeconds: MAX_DELIVERY_SECONDS.toString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: wallets.map((wallet) => ({
      profileId: wallet.id,
      rootWalletAddress: wallet.walletAddress,
      status: 'pending',
      previousSessionNonce: '',
      previousAiWalletAddress: '',
      previousRevokeTxHash: '',
      delegateId: '',
      delegateAddress: '',
      delegateFundTxHash: '',
      sessionNonce: '',
      aiWalletAddress: '',
      predictedWalletAddress: '',
      deployTxHash: '',
      validUntil: '',
      blockNumber: '',
      gasUsed: '',
      error: '',
    })),
  };
}

async function getActiveSession(publicClient, rootAddress) {
  const hasActive = await publicClient.readContract({
    address: DELEGATION_MANAGER,
    abi: MANAGER_ABI,
    functionName: 'hasActiveCycle',
    args: [rootAddress],
  });
  if (!hasActive) return null;

  const nonce = await publicClient.readContract({
    address: DELEGATION_MANAGER,
    abi: MANAGER_ABI,
    functionName: 'activeSessionNonce',
    args: [rootAddress],
  });
  const [session, aiWalletAddress, status] = await Promise.all([
    publicClient.readContract({
      address: DELEGATION_MANAGER,
      abi: MANAGER_ABI,
      functionName: 'getSession',
      args: [rootAddress, nonce],
    }),
    publicClient.readContract({
      address: AI_WALLET_FACTORY_V2,
      abi: FACTORY_ABI,
      functionName: 'walletOfSession',
      args: [rootAddress, nonce],
    }),
    publicClient.readContract({
      address: DELEGATION_MANAGER,
      abi: MANAGER_ABI,
      functionName: 'sessionStatus',
      args: [rootAddress, nonce],
    }),
  ]);
  return { nonce, session, aiWalletAddress, status };
}

function isNonZeroAddress(value) {
  return typeof value === 'string' && value.toLowerCase() !== zeroAddress.toLowerCase();
}

async function readWalletOfSession(publicClient, rootAddress, sessionNonce) {
  return publicClient.readContract({
    address: AI_WALLET_FACTORY_V2,
    abi: FACTORY_ABI,
    functionName: 'walletOfSession',
    args: [rootAddress, sessionNonce],
  });
}

async function waitForMaterializedWallet(publicClient, rootAddress, sessionNonce) {
  let lastWallet = zeroAddress;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    lastWallet = await readWalletOfSession(publicClient, rootAddress, sessionNonce);
    if (isNonZeroAddress(lastWallet)) {
      const code = await publicClient.getCode({ address: lastWallet }).catch(() => undefined);
      if (code && code !== '0x') return lastWallet;
    }
    await sleep(1000);
  }
  throw new Error(`AI wallet deployment did not materialize for session ${sessionNonce.toString()}; last walletOfSession=${lastWallet}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  activateNetwork(options);
  const env = await loadEnv();
  const runId = createRunId();
  const paymentToken = PAYMENT_TOKENS[options.payment];
  const { ledgerPath, runsDir } = executionPaths(options);
  const wallets = JSON.parse(await fs.readFile(WALLETS_PATH, 'utf8'))
    .map(toSeedWallet)
    .filter((wallet) => {
      const number = profileNumber(wallet.id);
      return number >= options.profileFrom && number <= options.profileTo;
    })
    .slice(0, options.limit);
  const existingLedger = await readJsonIfExists(ledgerPath, null);
  const ledger = existingLedger || initialLedger(wallets, paymentToken, options);
  const itemByAddress = new Map(ledger.items.map((item) => [normalizeAddress(item.rootWalletAddress), item]));

  for (const wallet of wallets) {
    if (!itemByAddress.has(wallet.walletAddress)) {
      const fresh = initialLedger([wallet], paymentToken, options).items[0];
      ledger.items.push(fresh);
      itemByAddress.set(wallet.walletAddress, fresh);
    }
  }

  const publicClient = createPublicClient({
    chain: ACTIVE_NETWORK.viemChain,
    transport: http(options.rpcUrl),
  });

  const run = {
    runId,
    dryRun: options.dryRun,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    requestedWallets: wallets.length,
    revokedPrevious: 0,
    fundedDelegates: 0,
    createdSessions: 0,
    alreadyActive: 0,
    skipped: 0,
    failed: 0,
    items: [],
  };

  for (const wallet of wallets) {
    const item = itemByAddress.get(wallet.walletAddress);
    if (!item) {
      run.skipped += 1;
      continue;
    }

    try {
      const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
        const walletClient = createWalletClient({
          account: wallet.account,
          chain: ACTIVE_NETWORK.viemChain,
          transport: http(options.rpcUrl),
        });

      const active = await getActiveSession(publicClient, wallet.account.address);
      if (active && isDesiredSellerConfirmSession(active.session, nowSeconds, paymentToken)) {
        item.status = 'already_active';
        item.sessionNonce = active.nonce.toString();
        item.aiWalletAddress = active.aiWalletAddress;
        item.delegateAddress = normalizeAddress(active.session.delegate);
        item.validUntil = active.session.validUntil.toString();
        item.error = '';
        ledger.updatedAt = new Date().toISOString();
        await writeJson(ledgerPath, ledger);
        run.alreadyActive += 1;
        run.items.push({ profileId: wallet.id, status: item.status, sessionNonce: item.sessionNonce });
        continue;
      }

      if (options.dryRun) {
        item.status = active ? 'dry_run_needs_replacement' : 'dry_run_ready';
        run.items.push({ profileId: wallet.id, rootWalletAddress: wallet.walletAddress, status: item.status });
        continue;
      }

      if (active) {
        const isActive = await publicClient.readContract({
          address: active.aiWalletAddress,
          abi: AI_WALLET_ABI,
          functionName: 'isActive',
        });
        const revokeFn = isActive ? 'revokeAndSweep' : 'closeExpiredAndSweep';
        const revokeTxHash = await walletClient.writeContract({
          address: active.aiWalletAddress,
          abi: AI_WALLET_ABI,
          functionName: revokeFn,
          gas: 220000n,
          ...(await resolveBufferedEip1559FeeOverrides(publicClient)),
        });
        await publicClient.waitForTransactionReceipt({ hash: revokeTxHash, confirmations: 1 });
        item.previousSessionNonce = active.nonce.toString();
        item.previousAiWalletAddress = active.aiWalletAddress;
        item.previousRevokeTxHash = revokeTxHash;
        run.revokedPrevious += 1;
      }

      const token = await exchangeBridge({ env, account: wallet.account });
      const existingConfig = await authedM2MRequest({
        env,
        token,
        routePath: `config/${wallet.walletAddress}`,
      });
      let delegate = existingConfig.ok
        ? (existingConfig.json?.delegates || []).find((candidate) => (
          candidate?.mode === 'generated'
          && candidate?.status === 'verified'
          && candidate?.delegateAddress
        ))
        : null;

      if (!delegate) {
        const generateDelegate = await authedM2MRequest({
          env,
          token,
          method: 'POST',
          routePath: 'delegates/generate',
          body: { walletAddress: wallet.walletAddress },
        });
        if (!generateDelegate.ok || !generateDelegate.json?.delegate?.id) {
          throw new Error(`Delegate generation failed: ${JSON.stringify(generateDelegate.json)}`);
        }
        delegate = generateDelegate.json.delegate;
      }

      const normalizedDelegate = {
        id: delegate.id,
        delegateAddress: delegate.delegateAddress || delegate.address,
      };
      if (!normalizedDelegate.id || !normalizedDelegate.delegateAddress) {
        throw new Error(`Invalid delegate record: ${JSON.stringify(delegate)}`);
      }

      const saveConfig = await authedM2MRequest({
        env,
        token,
        method: 'POST',
        routePath: 'config',
        body: {
          walletAddress: wallet.walletAddress,
          enabled: true,
          selectedDelegateId: normalizedDelegate.id,
          paymentToken: null,
          allowedActions: ['sign_order'],
          maxPerOrder: '',
          maxTotal: '',
          expiryDays: EXPIRY_DAYS,
          counterpartyAllowlist: [],
          notes: 'v3.5 beta seed AI wallet: public seller confirm for 7 days; buyer pay/delivery remain root-side.',
        },
      });
      if (!saveConfig.ok) {
        throw new Error(`Config save failed: ${JSON.stringify(saveConfig.json)}`);
      }

      const delegateBalance = await publicClient.getBalance({ address: normalizedDelegate.delegateAddress });
      if (delegateBalance < DELEGATE_MIN_GAS_BALANCE_WEI) {
        const fundTxHash = await walletClient.sendTransaction({
          to: normalizedDelegate.delegateAddress,
          value: DELEGATE_FUND_AMOUNT_WEI,
          ...(await resolveBufferedEip1559FeeOverrides(publicClient)),
        });
        await publicClient.waitForTransactionReceipt({ hash: fundTxHash, confirmations: 1 });
        item.delegateFundTxHash = fundTxHash;
        run.fundedDelegates += 1;
      }

      const nextSessionNonce = await publicClient.readContract({
        address: DELEGATION_MANAGER,
        abi: MANAGER_ABI,
        functionName: 'nextSessionNonce',
        args: [wallet.account.address],
      });
      const predicted = await publicClient.readContract({
        address: AI_WALLET_FACTORY_V2,
        abi: FACTORY_ABI,
        functionName: 'predictWallet',
        args: [wallet.account.address, nextSessionNonce],
      });
      const expiry = nowSeconds + EXPIRY_SECONDS;
      const deployArgs = [{
        root: wallet.account.address,
        delegate: normalizedDelegate.delegateAddress,
        allowedTarget: MARKETPLACE,
        allowedSpender: PAYMENT_GATEWAY,
        allowedToken: paymentToken,
        expiry,
        actionMask: ACTION_SELLER_CONFIRM,
        maxPerOrder: 0n,
        maxTotal: 0n,
        counterpartyAllowlistHash: zeroHash,
        restrictAssetId: false,
        assetId: 0n,
        maxAmount: 0n,
        minGrossPrice: 1n,
        maxGrossPrice: 0n,
        maxDeliverySeconds: MAX_DELIVERY_SECONDS,
      }];

      await publicClient.simulateContract({
        account: wallet.account,
        address: AI_WALLET_FACTORY_V2,
        abi: FACTORY_ABI,
        functionName: 'deployWallet',
        args: deployArgs,
      });
      const deployTxHash = await walletClient.writeContract({
        address: AI_WALLET_FACTORY_V2,
        abi: FACTORY_ABI,
        functionName: 'deployWallet',
        gas: 700000n,
        args: deployArgs,
        ...(await resolveBufferedEip1559FeeOverrides(publicClient)),
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash, confirmations: 1 });
      const deployedWallet = await waitForMaterializedWallet(publicClient, wallet.account.address, nextSessionNonce);

      item.status = 'active';
      item.delegateId = normalizedDelegate.id;
      item.delegateAddress = normalizeAddress(normalizedDelegate.delegateAddress);
      item.sessionNonce = nextSessionNonce.toString();
      item.aiWalletAddress = deployedWallet;
      item.predictedWalletAddress = predicted;
      item.deployTxHash = deployTxHash;
      item.validUntil = expiry.toString();
      item.blockNumber = receipt.blockNumber.toString();
      item.gasUsed = receipt.gasUsed.toString();
      item.error = '';
      ledger.updatedAt = new Date().toISOString();
      await writeJson(ledgerPath, ledger);
      run.createdSessions += 1;
      run.items.push({
        profileId: wallet.id,
        rootWalletAddress: wallet.walletAddress,
        status: item.status,
        sessionNonce: item.sessionNonce,
        aiWalletAddress: item.aiWalletAddress,
        deployTxHash,
        validUntil: item.validUntil,
      });
    } catch (error) {
      item.status = 'failed';
      item.error = formatError(error);
      ledger.updatedAt = new Date().toISOString();
      await writeJson(ledgerPath, ledger);
      run.failed += 1;
      run.items.push({
        profileId: wallet.id,
        rootWalletAddress: wallet.walletAddress,
        status: item.status,
        error: item.error,
      });
      throw error;
    }

    if (options.delayMs > 0) await sleep(options.delayMs);
  }

  ledger.updatedAt = new Date().toISOString();
  await writeJson(ledgerPath, ledger);
  run.finishedAt = new Date().toISOString();
  await writeJson(path.join(runsDir, `${runId}.json`), run);
  console.log(JSON.stringify({
    ok: true,
    runId,
    requestedWallets: run.requestedWallets,
    revokedPrevious: run.revokedPrevious,
    fundedDelegates: run.fundedDelegates,
    createdSessions: run.createdSessions,
    alreadyActive: run.alreadyActive,
    skipped: run.skipped,
    failed: run.failed,
    ledgerPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: formatError(error) }, null, 2));
  process.exit(1);
});
