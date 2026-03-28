#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createPublicClient, createWalletClient, http, parseAbi, zeroHash } = require('viem');
const { bscTestnet } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

function readEnvFile(filepath) {
  const env = {};
  const text = fs.readFileSync(filepath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line) || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    env[key] = value;
  }
  return env;
}

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

function buildWalletAuthMessage(address) {
  const normalized = normalizeAddress(address);
  const ts = new Date().toISOString();
  return [
    'Orina Wallet Session Authentication',
    '',
    'Sign this message to authenticate your session in Orina.',
    'No blockchain transaction or gas fee is required.',
    '',
    `Address: ${normalized}`,
    `Time: ${ts}`,
  ].join('\n');
}

async function requestJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, json };
}

async function exchangeBridge({ baseUrl, anonKey, fnName, bridgePathPrefix, account }) {
  const walletAddress = normalizeAddress(account.address);
  const message = buildWalletAuthMessage(walletAddress);
  const signature = await account.signMessage({ message });
  const url = `${baseUrl}/functions/v1/${fnName}${bridgePathPrefix}/exchange`;
  const response = await requestJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
      walletAuthSession: {
        address: walletAddress,
        signedAt: Date.now(),
        signature,
        message,
      },
      client: {
        app: 'ATP2-smoke',
        phase: 'ai-m2m-live-flow',
        requestedAt: new Date().toISOString(),
      },
    }),
  });

  return {
    walletAddress,
    response,
    accessToken: response.json?.accessToken || null,
  };
}

async function authedRequest({ baseUrl, fnName, token, method, routePath, body }) {
  return requestJson(`${baseUrl}/functions/v1/${fnName}${routePath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function main() {
  const envPath = path.resolve('.env');
  const foundryEnvPath = path.resolve('foundry/.env');
  if (!fs.existsSync(envPath)) throw new Error('.env not found');
  if (!fs.existsSync(foundryEnvPath)) throw new Error('foundry/.env not found');

  const env = readEnvFile(envPath);
  const foundryEnv = readEnvFile(foundryEnvPath);

  const baseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const fnName = env.VITE_SUPABASE_AUTH_BRIDGE_FN_NAME || 'make-server-b0d68fc8';
  const bridgePathPrefix = env.VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX || '/auth/supabase-claim-bridge';
  const rpcUrl = foundryEnv.BSC_TESTNET_RPC_URL;
  const delegationManager = env.VITE_M2M_DELEGATION_MANAGER;
  const walletFactory = env.VITE_M2M_AI_WALLET_FACTORY_V2;
  const marketplace = foundryEnv.MARKETPLACE_ATP_ADDRESS;
  const paymentGateway = foundryEnv.PAYMENT_GATEWAY_ADDRESS;
  const paymentToken = foundryEnv.PAYMENT_TOKEN_USDT;
  const buyerPrivateKey = foundryEnv.SMOKE_BUYER_PRIVATE_KEY;
  const sellerPrivateKey = foundryEnv.SMOKE_SELLER_PRIVATE_KEY;

  if (!baseUrl || !anonKey) throw new Error('Missing VITE_SUPABASE_URL or anon key');
  if (!rpcUrl) throw new Error('Missing BSC_TESTNET_RPC_URL');
  if (!delegationManager || !walletFactory) throw new Error('Missing VITE_M2M foundation addresses');
  if (!marketplace || !paymentGateway || !paymentToken) throw new Error('Missing ATP contract addresses in foundry/.env');
  if (!buyerPrivateKey || !sellerPrivateKey) throw new Error('Missing smoke wallet private keys in foundry/.env');

  const FACTORY_ABI = parseAbi([
    'function predictNextWallet(address root) view returns (address)',
    'function walletOfSession(address root, uint256 sessionNonce) view returns (address)',
    'function deployWallet((address root,address delegate,address allowedTarget,address allowedSpender,address allowedToken,uint64 expiry,uint256 actionMask,uint256 maxPerOrder,uint256 maxTotal,bytes32 counterpartyAllowlistHash) config) returns (address wallet,uint256 sessionNonce,bytes32 sessionId)',
  ]);
  const MANAGER_ABI = parseAbi([
    'function hasActiveCycle(address root) view returns (bool)',
    'function nextSessionNonce(address root) view returns (uint256)',
    'function sessionStatus(address root, uint256 sessionNonce) view returns (uint8)',
  ]);
  const WALLET_ABI = parseAbi([
    'function revokeAndSweep()',
  ]);

  const buyer = privateKeyToAccount(buyerPrivateKey);
  const seller = privateKeyToAccount(sellerPrivateKey);
  const publicClient = createPublicClient({ chain: bscTestnet, transport: http(rpcUrl) });

  const candidates = [seller, buyer];
  let rootAccount = null;
  let counterpartyAccount = null;
  for (const candidate of candidates) {
    const hasActiveCycle = await publicClient.readContract({
      address: delegationManager,
      abi: MANAGER_ABI,
      functionName: 'hasActiveCycle',
      args: [candidate.address],
    });
    if (!hasActiveCycle) {
      rootAccount = candidate;
      counterpartyAccount = candidate.address.toLowerCase() === seller.address.toLowerCase() ? buyer : seller;
      break;
    }
  }

  if (!rootAccount || !counterpartyAccount) {
    throw new Error('Both smoke wallets already have an active M2M cycle. Close them first, or rotate smoke keys.');
  }

  const rootWalletClient = createWalletClient({
    account: rootAccount,
    chain: bscTestnet,
    transport: http(rpcUrl),
  });

  const rootExchange = await exchangeBridge({ baseUrl, anonKey, fnName, bridgePathPrefix, account: rootAccount });
  if (!rootExchange.response.ok || !rootExchange.accessToken) {
    throw new Error(`Root bridge exchange failed: ${JSON.stringify(rootExchange.response.json)}`);
  }

  const configBefore = await authedRequest({
    baseUrl,
    fnName,
    token: rootExchange.accessToken,
    method: 'GET',
    routePath: `/ai/m2m/config/${rootExchange.walletAddress}`,
  });
  if (!configBefore.ok) {
    throw new Error(`Config load failed: ${JSON.stringify(configBefore.json)}`);
  }

  const generateDelegate = await authedRequest({
    baseUrl,
    fnName,
    token: rootExchange.accessToken,
    method: 'POST',
    routePath: '/ai/m2m/delegates/generate',
    body: { walletAddress: rootExchange.walletAddress },
  });
  if (!generateDelegate.ok || !generateDelegate.json?.delegate?.id) {
    throw new Error(`Managed delegate generation failed: ${JSON.stringify(generateDelegate.json)}`);
  }

  const generatedDelegate = generateDelegate.json.delegate;
  const saveConfig = await authedRequest({
    baseUrl,
    fnName,
    token: rootExchange.accessToken,
    method: 'POST',
    routePath: '/ai/m2m/config',
    body: {
      walletAddress: rootExchange.walletAddress,
      enabled: true,
      selectedDelegateId: generatedDelegate.id,
      paymentToken,
      allowedActions: ['mint', 'sign_order'],
      maxPerOrder: '1',
      maxTotal: '100',
      expiryDays: 7,
      counterpartyAllowlist: [counterpartyAccount.address],
      notes: 'smoke deploy flow without prefund',
    },
  });
  if (!saveConfig.ok) {
    throw new Error(`Save config mirror failed: ${JSON.stringify(saveConfig.json)}`);
  }

  const nextSessionNonce = await publicClient.readContract({
    address: delegationManager,
    abi: MANAGER_ABI,
    functionName: 'nextSessionNonce',
    args: [rootAccount.address],
  });
  const predictedWallet = await publicClient.readContract({
    address: walletFactory,
    abi: FACTORY_ABI,
    functionName: 'predictNextWallet',
    args: [rootAccount.address],
  });

  const expiry = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);
  const actionMask = 12n;
  const deployHash = await rootWalletClient.writeContract({
    address: walletFactory,
    abi: FACTORY_ABI,
    functionName: 'deployWallet',
    gas: 700000n,
    args: [{
      root: rootAccount.address,
      delegate: generatedDelegate.delegateAddress,
      allowedTarget: marketplace,
      allowedSpender: paymentGateway,
      allowedToken: paymentToken,
      expiry: Number(expiry),
      actionMask,
      maxPerOrder: 1n,
      maxTotal: 100n,
      counterpartyAllowlistHash: zeroHash,
    }],
  });
  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });

  const deployedWallet = await publicClient.readContract({
    address: walletFactory,
    abi: FACTORY_ABI,
    functionName: 'walletOfSession',
    args: [rootAccount.address, nextSessionNonce],
  });
  const sessionStatusAfterDeploy = await publicClient.readContract({
    address: delegationManager,
    abi: MANAGER_ABI,
    functionName: 'sessionStatus',
    args: [rootAccount.address, nextSessionNonce],
  });

  if (normalizeAddress(predictedWallet) !== normalizeAddress(deployedWallet)) {
    throw new Error(`Predicted wallet ${predictedWallet} did not match deployed wallet ${deployedWallet}`);
  }

  const revokeHash = await rootWalletClient.writeContract({
    address: deployedWallet,
    abi: WALLET_ABI,
    functionName: 'revokeAndSweep',
    args: [],
  });
  const revokeReceipt = await publicClient.waitForTransactionReceipt({ hash: revokeHash });

  const hasActiveAfterRevoke = await publicClient.readContract({
    address: delegationManager,
    abi: MANAGER_ABI,
    functionName: 'hasActiveCycle',
    args: [rootAccount.address],
  });
  const sessionStatusAfterRevoke = await publicClient.readContract({
    address: delegationManager,
    abi: MANAGER_ABI,
    functionName: 'sessionStatus',
    args: [rootAccount.address, nextSessionNonce],
  });

  const result = {
    ok: true,
    testedAt: new Date().toISOString(),
    rootWallet: rootExchange.walletAddress,
    counterpartyWallet: normalizeAddress(counterpartyAccount.address),
    delegationManager,
    walletFactory,
    generatedDelegate: generatedDelegate.delegateAddress,
    nextSessionNonce: nextSessionNonce.toString(),
    predictedWallet,
    deployedWallet,
    deployTx: deployHash,
    revokeTx: revokeHash,
    deployReceipt: {
      status: deployReceipt.status,
      gasUsed: deployReceipt.gasUsed.toString(),
    },
    revokeReceipt: {
      status: revokeReceipt.status,
      gasUsed: revokeReceipt.gasUsed.toString(),
    },
    verification: {
      configBeforeStatus: configBefore.status,
      generateDelegateStatus: generateDelegate.status,
      saveConfigStatus: saveConfig.status,
      sessionStatusAfterDeploy: Number(sessionStatusAfterDeploy),
      sessionStatusAfterRevoke: Number(sessionStatusAfterRevoke),
      hasActiveAfterRevoke,
      predictedMatchesDeployed: normalizeAddress(predictedWallet) === normalizeAddress(deployedWallet),
    },
  };

  const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
  const outPath = path.join('supabase', 'audit', `smoke_ai_m2m_flow_${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, outPath }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error?.message || String(error),
  }, null, 2));
  process.exit(1);
});
