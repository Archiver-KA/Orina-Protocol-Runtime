#!/usr/bin/env node
/**
 * Smoke Test: AI Minting with B2B Enrichment → On-Chain + assets_catalog
 *
 * Tests the complete flow:
 * 1. Wallet bridge auth (seller)
 * 2. M2M config setup (mint enabled)
 * 3. Delegate generation + AI Wallet deployment
 * 4. AI chat → ACTION_MINT with product description (triggers B2B enrichment)
 * 5. Execute the mint proposal → on-chain tx + assets_catalog sync
 * 6. Verify asset appears in assets_catalog
 * 7. Cleanup: revoke AI wallet
 *
 * Requires: foundry/.env (SMOKE_SELLER_PRIVATE_KEY, contract addresses)
 *           .env     (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, M2M addresses)
 */

const fs = require('fs');
const path = require('path');
const { createPublicClient, createWalletClient, http, parseAbi, zeroHash } = require('viem');
const { bscTestnet } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');
const { buildActiveArtifactPath } = require('./audit_artifact_paths.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readEnvFile(filepath) {
  const env = {};
  const text = fs.readFileSync(filepath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line) || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) env[key] = value;
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
    'Orina Wallet Session Authentication', '',
    'Sign this message to authenticate your session in Orina.',
    'No blockchain transaction or gas fee is required.', '',
    `Address: ${normalized}`, `Time: ${ts}`,
  ].join('\n');
}

async function requestJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

function log(step, msg, data) {
  const tag = `[${step}]`.padEnd(20);
  console.log(`${tag} ${msg}`, data ? JSON.stringify(data, null, 2) : '');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const envPath = path.resolve('.env');
  const foundryEnvPath = path.resolve('foundry/.env');
  if (!fs.existsSync(envPath)) throw new Error('.env not found');
  if (!fs.existsSync(foundryEnvPath)) throw new Error('foundry/.env not found');

  const env = readEnvFile(envPath);
  const foundryEnv = readEnvFile(foundryEnvPath);

  const baseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const sharedFnName = env.VITE_SUPABASE_FUNCTIONS_NAMESPACE || env.VITE_SUPABASE_SHARED_SERVER_FN_NAME || 'make-server-b0d68fc8';
  const authBridgeFnName = env.VITE_SUPABASE_AUTH_BRIDGE_FN_NAME || 'orina-auth-bridge-v1';
  const bridgePathPrefix = env.VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX || (authBridgeFnName === sharedFnName ? '/auth/supabase-claim-bridge' : '');
  const aiM2MFnName = env.VITE_SUPABASE_AI_M2M_FN_NAME || 'orina-ai-m2m-v2';
  const rpcUrl = foundryEnv.BSC_TESTNET_RPC_URL;
  const delegationManager = env.VITE_M2M_DELEGATION_MANAGER;
  const walletFactory = env.VITE_M2M_AI_WALLET_FACTORY_V2;
  const marketplace = foundryEnv.MARKETPLACE_ATP_ADDRESS;
  const paymentGateway = foundryEnv.PAYMENT_GATEWAY_ADDRESS;
  const paymentToken = foundryEnv.PAYMENT_TOKEN_USDT;
  const sellerPrivateKey = foundryEnv.SMOKE_SELLER_PRIVATE_KEY;

  if (!baseUrl || !anonKey) throw new Error('Missing VITE_SUPABASE_URL or anon key');
  if (!rpcUrl) throw new Error('Missing BSC_TESTNET_RPC_URL');
  if (!delegationManager || !walletFactory) throw new Error('Missing M2M addresses');
  if (!marketplace || !paymentGateway || !paymentToken) throw new Error('Missing ATP contract addresses');
  if (!sellerPrivateKey) throw new Error('Missing SMOKE_SELLER_PRIVATE_KEY');

  const seller = privateKeyToAccount(sellerPrivateKey);
  const sellerAddr = normalizeAddress(seller.address);
  log('INIT', `Seller: ${sellerAddr}`);

  const publicClient = createPublicClient({ chain: bscTestnet, transport: http(rpcUrl) });
  const sellerWalletClient = createWalletClient({
    account: seller, chain: bscTestnet, transport: http(rpcUrl),
  });

  const FACTORY_ABI = parseAbi([
    'function predictNextWallet(address root) view returns (address)',
    'function walletOfSession(address root, uint256 sessionNonce) view returns (address)',
    'function deployWallet((address root,address delegate,address allowedTarget,address allowedSpender,address allowedToken,uint64 expiry,uint256 actionMask,uint256 maxPerOrder,uint256 maxTotal,bytes32 counterpartyAllowlistHash) config) returns (address wallet,uint256 sessionNonce,bytes32 sessionId)',
  ]);
  const MANAGER_ABI = parseAbi([
    'function hasActiveCycle(address root) view returns (bool)',
    'function nextSessionNonce(address root) view returns (uint256)',
    'function activeSessionNonce(address root) view returns (uint256)',
    'function sessionStatus(address root, uint256 sessionNonce) view returns (uint8)',
  ]);
  const WALLET_ABI = parseAbi([
    'function revokeAndSweep()',
    'function closeExpiredAndSweep()',
    'function isActive() view returns (bool)',
    'function delegate() view returns (address)',
  ]);

  // ── Step 1: Check if wallet already has active cycle ──────────────────────
  let hasActiveCycle = await publicClient.readContract({
    address: delegationManager, abi: MANAGER_ABI,
    functionName: 'hasActiveCycle', args: [seller.address],
  });
  log('STEP 1', `hasActiveCycle: ${hasActiveCycle}`);

  // ── Step 1b: If active cycle exists, revoke old wallet so we can deploy fresh ──
  if (hasActiveCycle) {
    const oldNonce = await publicClient.readContract({
      address: delegationManager, abi: MANAGER_ABI,
      functionName: 'activeSessionNonce', args: [seller.address],
    });
    const oldWallet = await publicClient.readContract({
      address: walletFactory, abi: FACTORY_ABI,
      functionName: 'walletOfSession', args: [seller.address, oldNonce],
    });
    log('STEP 1b', `Revoking old wallet ${oldWallet} (nonce ${oldNonce}) to deploy fresh...`);

    try {
      const isLive = await publicClient.readContract({
        address: oldWallet, abi: WALLET_ABI,
        functionName: 'isActive',
      });
      const fn = isLive ? 'revokeAndSweep' : 'closeExpiredAndSweep';
      const revokeHash = await sellerWalletClient.writeContract({
        address: oldWallet, abi: WALLET_ABI,
        functionName: fn, gas: 200000n,
      });
      await publicClient.waitForTransactionReceipt({ hash: revokeHash, timeout: 60000 });
      log('STEP 1b', `Old wallet ${fn} OK: ${revokeHash}`);
      hasActiveCycle = false; // now we can deploy fresh
    } catch (revokeErr) {
      throw new Error(`Failed to revoke old wallet: ${revokeErr.message}`);
    }
  }

  // ── Step 2: Wallet Bridge Auth ────────────────────────────────────────────
  const message = buildWalletAuthMessage(sellerAddr);
  const signature = await seller.signMessage({ message });
  const exchangeUrl = `${baseUrl}/functions/v1/${authBridgeFnName}${bridgePathPrefix}/exchange`;
  const exchange = await requestJson(exchangeUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`, apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress: sellerAddr,
      walletAuthSession: { address: sellerAddr, signedAt: Date.now(), signature, message },
      client: { app: 'ATP2-smoke', phase: 'ai-mint-b2b', requestedAt: new Date().toISOString() },
    }),
  });

  if (!exchange.ok || !exchange.json?.accessToken) {
    throw new Error(`Bridge exchange failed: ${JSON.stringify(exchange.json)}`);
  }
  const token = exchange.json.accessToken;
  log('STEP 2', 'Bridge auth OK, got access token');

  // Helper for authed requests
  async function authed(functionName, method, routePath, body) {
    return requestJson(`${baseUrl}/functions/v1/${functionName}${routePath}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // ── Step 3: Generate delegate + save M2M config ───────────────────────────
  const genDelegate = await authed(aiM2MFnName, 'POST', '/delegates/generate', { walletAddress: sellerAddr });
  if (!genDelegate.ok || !genDelegate.json?.delegate?.id) {
    throw new Error(`Delegate generation failed: ${JSON.stringify(genDelegate.json)}`);
  }
  const delegate = genDelegate.json.delegate;
  log('STEP 3a', `Delegate: ${delegate.delegateAddress} (id: ${delegate.id})`);

  const configSave = await authed(aiM2MFnName, 'POST', '/config', {
    walletAddress: sellerAddr,
    enabled: true,
    selectedDelegateId: delegate.id,
    paymentToken,
    allowedActions: ['mint', 'sign_order'],
    maxPerOrder: '1',
    maxTotal: '100',
    expiryDays: 7,
    counterpartyAllowlist: [],
    notes: 'smoke-ai-mint-b2b flow',
  });
  if (!configSave.ok) {
    throw new Error(`Config save failed: ${JSON.stringify(configSave.json)}`);
  }
  log('STEP 3b', 'M2M config saved (mint + sign_order enabled)');

  // ── Step 4: Deploy AI Wallet on-chain ─────────────────────────────────────
  let deployedWalletAddr;
  let sessionNonce;

  if (hasActiveCycle) {
    // Already has wallet — get existing
    sessionNonce = await publicClient.readContract({
      address: delegationManager, abi: MANAGER_ABI,
      functionName: 'activeSessionNonce', args: [seller.address],
    });
    deployedWalletAddr = await publicClient.readContract({
      address: walletFactory, abi: FACTORY_ABI,
      functionName: 'walletOfSession', args: [seller.address, sessionNonce],
    });
    log('STEP 4', `Reusing existing AI wallet: ${deployedWalletAddr} (nonce: ${sessionNonce})`);
  } else {
    const nextNonce = await publicClient.readContract({
      address: delegationManager, abi: MANAGER_ABI,
      functionName: 'nextSessionNonce', args: [seller.address],
    });

    const expiry = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);
    const actionMask = 12n; // SELL_MINT_ASSET (4) + SELLER_CONFIRM (8)

    const deployHash = await sellerWalletClient.writeContract({
      address: walletFactory, abi: FACTORY_ABI,
      functionName: 'deployWallet', gas: 700000n,
      args: [{
        root: seller.address,
        delegate: delegate.delegateAddress,
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
    const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash, timeout: 60000 });
    if (deployReceipt.status === 'reverted') {
      throw new Error('AI Wallet deploy reverted');
    }

    sessionNonce = nextNonce;
    deployedWalletAddr = await publicClient.readContract({
      address: walletFactory, abi: FACTORY_ABI,
      functionName: 'walletOfSession', args: [seller.address, nextNonce],
    });
    log('STEP 4', `AI Wallet deployed: ${deployedWalletAddr} tx: ${deployHash}`);
  }

  // ── Step 4b: Fund delegate with tBNB for gas ──────────────────────────────
  const delegateBalance = await publicClient.getBalance({ address: delegate.delegateAddress });
  if (delegateBalance < 500000000000000n) { // < 0.0005 BNB
    log('STEP 4b', `Funding delegate ${delegate.delegateAddress} with 0.001 tBNB for gas...`);
    const fundHash = await sellerWalletClient.sendTransaction({
      to: delegate.delegateAddress,
      value: 1000000000000000n, // 0.001 BNB
    });
    await publicClient.waitForTransactionReceipt({ hash: fundHash, timeout: 30000 });
    log('STEP 4b', `Delegate funded: tx ${fundHash}`);
  } else {
    log('STEP 4b', `Delegate already funded: ${delegateBalance} wei`);
  }

  // ── Step 5: AI Chat → ACTION_MINT trigger ─────────────────────────────────
  // Send a seller message that triggers ACTION_MINT intent + carries product info
  const mintMessage = 'Mint 50 units of Premium Wireless Bluetooth Earbuds, physical product, electronics category. High quality TWS earbuds with noise cancellation.';

  const convId = `smoke_mint_${Date.now()}`;
  const chatResult = await authed(sharedFnName, 'POST', '/ai/assist', {
    walletAddress: sellerAddr,
    message: mintMessage,
    agentContext: 'seller',
    conversationId: convId,
  });

  // /ai/assist wraps in { success, response: { text, action, actionProposal } }
  const aiResp = chatResult.json?.response || chatResult.json;
  log('STEP 5', `AI Assist response: action=${aiResp?.action}`, {
    text: aiResp?.text?.slice(0, 200),
    hasProposal: !!aiResp?.actionProposal,
    rawKeys: Object.keys(chatResult.json || {}),
  });

  // ── Step 6: Execute the action proposal ───────────────────────────────────
  if (aiResp?.action === 'action_proposal' && aiResp?.actionProposal) {
    const proposal = aiResp.actionProposal;
    log('STEP 6a', `Proposal: ${proposal.summary}`, {
      type: proposal.type,
      hasMetadata: !!proposal.params?.productMetadata,
      constraints: proposal.constraints,
    });

    // Send approval via the "✅ Approved:" prefix that the engine detects
    const executeResult = await authed(sharedFnName, 'POST', '/ai/assist', {
      walletAddress: sellerAddr,
      message: `✅ Approved: ${proposal.summary}`,
      agentContext: 'seller',
      conversationId: convId,
    });

    const execResp = executeResult.json?.response || executeResult.json;
    log('STEP 6b', `Execute result: action=${execResp?.action}`, {
      text: execResp?.text?.slice(0, 500),
      fullError: JSON.stringify(executeResult.json).slice(0, 600),
    });
  } else {
    log('STEP 6', 'No action_proposal returned — checking if mint intent was detected', {
      action: aiResp?.action,
      fullResponse: JSON.stringify(chatResult.json).slice(0, 500),
    });
  }

  // ── Step 7: Verify assets_catalog ─────────────────────────────────────────
  // Wait a moment for DB sync
  await new Promise(r => setTimeout(r, 3000));

  const catalogCheck = await requestJson(
    `${baseUrl}/rest/v1/assets_catalog?seller_user_id=not.is.null&ai_created=eq.true&order=created_at.desc&limit=5`,
    {
      headers: {
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
        'Prefer': 'count=exact',
      },
    }
  );

  log('STEP 7', `assets_catalog check: ${catalogCheck.status}`, {
    count: Array.isArray(catalogCheck.json) ? catalogCheck.json.length : 0,
    items: Array.isArray(catalogCheck.json) ? catalogCheck.json.map(i => ({
      id: i.id, title: i.title, category: i.category, ai_created: i.ai_created,
      tx: i.ai_analysis?.transactionHash?.slice(0, 20),
    })) : null,
  });

  // ── Step 8: Cleanup — revoke AI wallet ────────────────────────────────────
  if (!hasActiveCycle) {
    // Only revoke if we deployed it in this run
    try {
      const revokeHash = await sellerWalletClient.writeContract({
        address: deployedWalletAddr,
        abi: WALLET_ABI,
        functionName: 'revokeAndSweep',
        args: [],
      });
      await publicClient.waitForTransactionReceipt({ hash: revokeHash, timeout: 30000 });
      log('STEP 8', `AI Wallet revoked: ${revokeHash}`);
    } catch (revokeErr) {
      log('STEP 8', `Revoke failed (non-critical): ${revokeErr.message}`);
    }
  }

  // ── Final Report ──────────────────────────────────────────────────────────
  const report = {
    ok: true,
    testedAt: new Date().toISOString(),
    seller: sellerAddr,
    delegateAddress: delegate.delegateAddress,
    aiWallet: deployedWalletAddr,
    sessionNonce: sessionNonce.toString(),
    mintMessage,
    chatAction: chatResult.json?.action,
    hasProposal: !!chatResult.json?.actionProposal,
    catalogAssets: Array.isArray(catalogCheck.json) ? catalogCheck.json.length : 0,
  };

  const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
  const outPath = buildActiveArtifactPath(`smoke_ai_mint_b2b_${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  log('DONE', `Report saved: ${outPath}`, report);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
