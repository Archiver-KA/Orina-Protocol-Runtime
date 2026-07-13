#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  http,
  keccak256,
  parseAbi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bscTestnet } from 'viem/chains';

const CAMPAIGN_ROOT = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign';
const WALLETS_PATH = path.join(CAMPAIGN_ROOT, 'secrets/generated/20260418T114746Z/wallets.json');
const EXECUTION_DIR = path.join(CAMPAIGN_ROOT, 'ai-wallet-setup/v3_5_beta_seed_100_no_expiry');
const LEDGER_PATH = path.join(EXECUTION_DIR, 'ledger.json');
const RUNS_DIR = path.join(EXECUTION_DIR, 'runs');

const CHAIN_ID = 97;
const DEFAULT_RPC_URL = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/';
const MARKETPLACE = '0x18E1C8ab257FAf16Ec8257A9715d07661194150B';
const PAYMENT_GATEWAY = '0x082d75D8cA96C6e97B6b451Ad4857454A53D5C15';
const PAYMENT_TOKEN_USDT = '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd';
const DELEGATION_MANAGER = '0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13';
const AI_WALLET_FACTORY_V2 = '0xD838268fa8dF6AFD1Fd79D9C0Fd243A3D23D0441';
const NO_EXPIRY_UINT64 = (2n ** 64n) - 1n;
const ACTION_MASK_MINT_AND_SELLER_CONFIRM = (1n << 2n) | (1n << 3n);
const MAX_DELIVERY_SECONDS = 10n * 24n * 60n * 60n;

const FACTORY_ABI = parseAbi([
  'function predictNextWallet(address root) view returns (address wallet, uint256 sessionNonce)',
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

function parseArgs(argv) {
  const options = {
    limit: 100,
    dryRun: false,
    delayMs: 350,
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || process.env.RPC_URL || DEFAULT_RPC_URL,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--limit') options.limit = Math.max(1, Number.parseInt(argv[++index] || '1', 10) || 1);
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--delay-ms') options.delayMs = Math.max(0, Number.parseInt(argv[++index] || '0', 10) || 0);
    else if (arg === '--rpc-url') options.rpcUrl = String(argv[++index] || '').trim();
    else throw new Error(`Unknown argument: ${arg}`);
  }
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

function resolveCounterparty(wallet, wallets) {
  const index = wallets.findIndex((item) => item.walletAddress === wallet.walletAddress);
  if (index === -1) throw new Error(`Cannot resolve counterparty for ${wallet.id}`);
  let candidate = wallets[(index + 37) % wallets.length];
  if (candidate.walletAddress === wallet.walletAddress) {
    candidate = wallets[(index + 38) % wallets.length];
  }
  return candidate;
}

function counterpartyHash(address) {
  return keccak256(encodeAbiParameters([{ type: 'address' }], [address]));
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
        app: 'ATP2-seed-ai-wallet-setup',
        phase: 'v3.5-beta-seed-ai-wallet-no-expiry',
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

function isGoodSellerSession(session, expectedCounterpartyAllowlistHash = null) {
  if (!session?.exists || Number(session.status) !== 1) return false;
  const mask = BigInt(session.actionMask ?? 0n);
  const expectedHash = expectedCounterpartyAllowlistHash
    ? String(expectedCounterpartyAllowlistHash).toLowerCase()
    : null;
  return (
    session.validUntil === NO_EXPIRY_UINT64
    && (mask & ACTION_MASK_MINT_AND_SELLER_CONFIRM) === ACTION_MASK_MINT_AND_SELLER_CONFIRM
    && normalizeAddress(session.paymentToken) === normalizeAddress(PAYMENT_TOKEN_USDT)
    && normalizeAddress(session.payerVault) !== '0x0000000000000000000000000000000000000000'
    && (!expectedHash || String(session.counterpartyAllowlistHash).toLowerCase() === expectedHash)
  );
}

function initialLedger(wallets) {
  return {
    version: 1,
    chainId: CHAIN_ID,
    marketplace: MARKETPLACE,
    paymentGateway: PAYMENT_GATEWAY,
    paymentToken: PAYMENT_TOKEN_USDT,
    delegationManager: DELEGATION_MANAGER,
    aiWalletFactoryV2: AI_WALLET_FACTORY_V2,
    policy: {
      expiry: 'NO_EXPIRY_UINT64',
      expiryValue: NO_EXPIRY_UINT64.toString(),
      allowedActions: ['mint', 'sign_order'],
      actionMask: ACTION_MASK_MINT_AND_SELLER_CONFIRM.toString(),
      maxPerOrder: '0',
      maxTotal: '0',
      counterpartyAllowlistHash: 'per_seed_counterparty',
      restrictAssetId: false,
      assetId: '0',
      maxAmount: '1000',
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
      delegateId: '',
      delegateAddress: '',
      allowedCounterpartyAddress: '',
      sessionNonce: '',
      aiWalletAddress: '',
      deployTxHash: '',
      blockNumber: '',
      gasUsed: '',
      error: '',
    })),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const env = await loadEnv();
  const runId = createRunId();
  const allWallets = JSON.parse(await fs.readFile(WALLETS_PATH, 'utf8')).map(toSeedWallet);
  const wallets = allWallets.slice(0, options.limit);
  const existingLedger = await readJsonIfExists(LEDGER_PATH, null);
  const ledger = existingLedger || initialLedger(wallets);
  const itemByAddress = new Map(ledger.items.map((item) => [normalizeAddress(item.rootWalletAddress), item]));

  ledger.policy = {
    ...initialLedger([]).policy,
    ...(ledger.policy || {}),
    counterpartyAllowlistHash: 'per_seed_counterparty',
  };

  for (const wallet of wallets) {
    if (!itemByAddress.has(wallet.walletAddress)) {
      const fresh = initialLedger([wallet]).items[0];
      ledger.items.push(fresh);
      itemByAddress.set(wallet.walletAddress, fresh);
    }
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
    requestedWallets: wallets.length,
    createdSessions: 0,
    alreadyActive: 0,
    skipped: 0,
    failed: 0,
    items: [],
  };

  for (const wallet of wallets) {
    const item = itemByAddress.get(wallet.walletAddress);
    const counterparty = resolveCounterparty(wallet, allWallets);
    const allowlistHash = counterpartyHash(counterparty.account.address);
    if (item) {
      item.allowedCounterpartyAddress = counterparty.walletAddress;
      item.requestedCounterpartyAllowlistHash = allowlistHash;
    }
    if (!item || item.status === 'active' || item.status === 'already_active') {
      run.skipped += 1;
      continue;
    }

    try {
      const hasActive = await publicClient.readContract({
        address: DELEGATION_MANAGER,
        abi: MANAGER_ABI,
        functionName: 'hasActiveCycle',
        args: [wallet.account.address],
      });

      if (hasActive) {
        const activeSessionNonce = await publicClient.readContract({
          address: DELEGATION_MANAGER,
          abi: MANAGER_ABI,
          functionName: 'activeSessionNonce',
          args: [wallet.account.address],
        });
        const [session, aiWalletAddress, status] = await Promise.all([
          publicClient.readContract({
            address: DELEGATION_MANAGER,
            abi: MANAGER_ABI,
            functionName: 'getSession',
            args: [wallet.account.address, activeSessionNonce],
          }),
          publicClient.readContract({
            address: AI_WALLET_FACTORY_V2,
            abi: FACTORY_ABI,
            functionName: 'walletOfSession',
            args: [wallet.account.address, activeSessionNonce],
          }),
          publicClient.readContract({
            address: DELEGATION_MANAGER,
            abi: MANAGER_ABI,
            functionName: 'sessionStatus',
            args: [wallet.account.address, activeSessionNonce],
          }),
        ]);
        item.status = isGoodSellerSession(session, allowlistHash) ? 'already_active' : 'active_policy_drift';
        item.sessionNonce = activeSessionNonce.toString();
        item.aiWalletAddress = aiWalletAddress;
        item.onchainSessionStatus = Number(status);
        item.activePolicyMatchesRequested = isGoodSellerSession(session, allowlistHash);
        item.activeCounterpartyAllowlistHash = session.counterpartyAllowlistHash;
        ledger.updatedAt = new Date().toISOString();
        await writeJson(LEDGER_PATH, ledger);
        run.alreadyActive += 1;
        run.items.push({
          profileId: wallet.id,
          rootWalletAddress: wallet.walletAddress,
          status: item.status,
          sessionNonce: item.sessionNonce,
          aiWalletAddress: item.aiWalletAddress,
        });
        continue;
      }

      if (options.dryRun) {
        item.status = 'dry_run_ready';
        run.items.push({ profileId: wallet.id, rootWalletAddress: wallet.walletAddress, status: item.status });
        continue;
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

      const normalizeDelegate = {
        id: delegate.id,
        delegateAddress: delegate.delegateAddress || delegate.address,
      };
      if (!normalizeDelegate.id || !normalizeDelegate.delegateAddress) {
        throw new Error(`Invalid delegate record: ${JSON.stringify(delegate)}`);
      }

      const saveDelegate = await authedM2MRequest({
        env,
        token,
        method: 'POST',
        routePath: 'config',
        body: {
          walletAddress: wallet.walletAddress,
          enabled: true,
          selectedDelegateId: normalizeDelegate.id,
          paymentToken: null,
          allowedActions: ['mint', 'sign_order'],
          maxPerOrder: '',
          maxTotal: '',
          expiryDays: 0,
          counterpartyAllowlist: [counterparty.walletAddress],
          notes: 'v3.5 beta seed AI wallet: mint + seller confirm, no expiry, no buyer funding.',
        },
      });
      if (!saveDelegate.ok) {
        throw new Error(`Config pre-save failed: ${JSON.stringify(saveDelegate.json)}`);
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

      const walletClient = createWalletClient({
        account: wallet.account,
        chain: bscTestnet,
        transport: http(options.rpcUrl),
      });

      const deployArgs = [{
        root: wallet.account.address,
        delegate: normalizeDelegate.delegateAddress,
        allowedTarget: MARKETPLACE,
        allowedSpender: PAYMENT_GATEWAY,
        allowedToken: PAYMENT_TOKEN_USDT,
        expiry: NO_EXPIRY_UINT64,
        actionMask: ACTION_MASK_MINT_AND_SELLER_CONFIRM,
        maxPerOrder: 0n,
        maxTotal: 0n,
        counterpartyAllowlistHash: allowlistHash,
        restrictAssetId: false,
        assetId: 0n,
        maxAmount: 1000n,
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
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash, confirmations: 1 });
      const deployedWallet = await publicClient.readContract({
        address: AI_WALLET_FACTORY_V2,
        abi: FACTORY_ABI,
        functionName: 'walletOfSession',
        args: [wallet.account.address, nextSessionNonce],
      });

      const saveConfig = await authedM2MRequest({
        env,
        token,
        method: 'POST',
        routePath: 'config',
        body: {
          walletAddress: wallet.walletAddress,
          enabled: true,
          selectedDelegateId: delegate.id,
          paymentToken: null,
          allowedActions: ['mint', 'sign_order'],
          maxPerOrder: '',
          maxTotal: '',
          expiryDays: 0,
          counterpartyAllowlist: [counterparty.walletAddress],
          notes: 'v3.5 beta seed AI wallet: mint + seller confirm, no expiry, no buyer funding.',
        },
      });
      if (!saveConfig.ok) {
        throw new Error(`Config mirror save failed: ${JSON.stringify(saveConfig.json)}`);
      }

      item.status = 'active';
      item.delegateId = normalizeDelegate.id;
      item.delegateAddress = normalizeAddress(normalizeDelegate.delegateAddress);
      item.sessionNonce = nextSessionNonce.toString();
      item.aiWalletAddress = deployedWallet;
      item.predictedWalletAddress = predicted;
      item.deployTxHash = deployTxHash;
      item.blockNumber = receipt.blockNumber.toString();
      item.gasUsed = receipt.gasUsed.toString();
      item.error = '';
      ledger.updatedAt = new Date().toISOString();
      await writeJson(LEDGER_PATH, ledger);
      run.createdSessions += 1;
      run.items.push({
        profileId: wallet.id,
        rootWalletAddress: wallet.walletAddress,
        status: item.status,
        sessionNonce: item.sessionNonce,
        aiWalletAddress: item.aiWalletAddress,
        deployTxHash,
        blockNumber: item.blockNumber,
      });
    } catch (error) {
      item.status = 'failed';
      item.error = formatError(error);
      ledger.updatedAt = new Date().toISOString();
      await writeJson(LEDGER_PATH, ledger);
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
  await writeJson(LEDGER_PATH, ledger);
  run.finishedAt = new Date().toISOString();
  await writeJson(path.join(RUNS_DIR, `${runId}.json`), run);
  console.log(JSON.stringify({
    ok: true,
    runId,
    requestedWallets: run.requestedWallets,
    createdSessions: run.createdSessions,
    alreadyActive: run.alreadyActive,
    skipped: run.skipped,
    failed: run.failed,
    ledgerPath: LEDGER_PATH,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: formatError(error) }, null, 2));
  process.exit(1);
});
