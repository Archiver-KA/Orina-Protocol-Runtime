#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  CAMPAIGN_ROOT,
  buildNetworkAssetUid,
  explorerTxUrl,
  resolveRpcUrl,
  resolveV35TestnetNetwork,
} from './lib/v35-testnet-seed-networks.mjs';

const ASSET_INDEX_PATH = path.join(CAMPAIGN_ROOT, 'seed-assets-index.json');
const WALLETS_PATH = path.join(CAMPAIGN_ROOT, 'secrets/generated/20260418T114746Z/wallets.json');
const SEED_BATCH = 'v3.5-beta-seed-assets-001';

const ORINA_RWA_MINT_ABI = [
  {
    type: 'function',
    name: 'mintAsset',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'unitId', type: 'uint256' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'expiryAt', type: 'uint256' },
      { name: 'assetType', type: 'uint8' },
    ],
    outputs: [{ name: 'assetId', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'AssetMinted',
    anonymous: false,
    inputs: [
      { indexed: true, name: 'assetId', type: 'uint256' },
      { indexed: true, name: 'seller', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'assetType', type: 'uint8' },
    ],
  },
];

const UNIT_IDS = {
  piece: 0,
  kg: 1,
  ton: 2,
  lit: 3,
  m: 4,
  m2: 5,
  m3: 6,
  hour: 7,
  set: 8,
  package: 8,
  box: 8,
  seat: 0,
};

function parseArgs(argv) {
  const options = {
    network: 'bnb-testnet',
    dryRun: false,
    syncOnly: false,
    limitAssets: 0,
    profileIds: [],
    assetUids: [],
    delayMs: 500,
    confirmations: 1,
    rpcUrl: '',
    cloneCatalog: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--network') options.network = String(argv[++index] || '').trim();
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--sync-only') options.syncOnly = true;
    else if (arg === '--limit-assets') options.limitAssets = Math.max(1, Number.parseInt(argv[++index] || '1', 10) || 1);
    else if (arg === '--profile-id') options.profileIds.push(String(argv[++index] || '').trim().toUpperCase());
    else if (arg === '--asset-uid') options.assetUids.push(String(argv[++index] || '').trim().toLowerCase());
    else if (arg === '--delay-ms') options.delayMs = Math.max(0, Number.parseInt(argv[++index] || '0', 10) || 0);
    else if (arg === '--confirmations') options.confirmations = Math.max(1, Number.parseInt(argv[++index] || '1', 10) || 1);
    else if (arg === '--rpc-url') options.rpcUrl = String(argv[++index] || '').trim();
    else if (arg === '--no-clone-catalog') options.cloneCatalog = false;
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
  const normalized = String(value || '').trim().toLowerCase();
  if (!/^0x[a-f0-9]{64}$/.test(normalized)) throw new Error('Invalid private key in wallets.json');
  return normalized;
}

function createRunId(now = new Date()) {
  return now.toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z');
}

function unitIdForAsset(asset) {
  const key = String(asset.unitName || '').trim().toLowerCase();
  if (!(key in UNIT_IDS)) throw new Error(`No UnitRegistry mapping for ${asset.assetUid} unitName=${asset.unitName}`);
  return UNIT_IDS[key];
}

function assetTypeToEnum(asset) {
  return String(asset.assetClass || '').trim() === 'digital_assets' ? 1 : 0;
}

function formatError(error) {
  const parts = [];
  if (typeof error?.shortMessage === 'string') parts.push(error.shortMessage);
  if (typeof error?.message === 'string' && !parts.includes(error.message)) parts.push(error.message);
  return parts.filter(Boolean).join(' | ') || String(error);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildMintRequest({ publicClient, network, account, item }) {
  if (network.key !== 'arbitrum-sepolia') {
    const simulation = await publicClient.simulateContract({
      account,
      address: network.assetContract,
      abi: ORINA_RWA_MINT_ABI,
      functionName: 'mintAsset',
      args: item.mintArgs,
    });
    return simulation.request;
  }

  const block = await publicClient.getBlock();
  const estimatedFees = await publicClient.estimateFeesPerGas().catch(() => ({}));
  const baseFeePerGas = block.baseFeePerGas || 20_000_000n;
  const estimatedMaxFee = estimatedFees.maxFeePerGas || 0n;
  const maxFeeFloor = baseFeePerGas * 3n;
  const maxFeeCeiling = 300_000_000n;
  const maxFeePerGas = [estimatedMaxFee, maxFeeFloor]
    .filter((value) => value > 0n)
    .reduce((max, value) => (value > max ? value : max), 0n);

  return {
    account,
    address: network.assetContract,
    abi: ORINA_RWA_MINT_ABI,
    functionName: 'mintAsset',
    args: item.mintArgs,
    gas: 300_000n,
    maxFeePerGas: maxFeePerGas > maxFeeCeiling ? maxFeeCeiling : maxFeePerGas,
    maxPriorityFeePerGas: estimatedFees.maxPriorityFeePerGas || 0n,
  };
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

function executionPaths(network) {
  const executionDir = path.join(CAMPAIGN_ROOT, 'mint-executions', network.executionSegment);
  return {
    ledgerPath: path.join(executionDir, 'ledger.json'),
    runsDir: path.join(executionDir, 'runs'),
  };
}

function extractMintedEvent(receipt, network) {
  for (const log of receipt.logs || []) {
    if (normalizeAddress(log.address) !== normalizeAddress(network.assetContract)) continue;
    try {
      const decoded = decodeEventLog({
        abi: ORINA_RWA_MINT_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== 'AssetMinted') continue;
      return {
        assetId: decoded.args.assetId.toString(),
        seller: normalizeAddress(decoded.args.seller),
        amount: decoded.args.amount.toString(),
        assetType: Number(decoded.args.assetType),
        logIndex: Number(log.logIndex ?? 0),
      };
    } catch {
      // Ignore unrelated logs.
    }
  }
  return null;
}

function buildAssetQueue(assets, wallets, options, network) {
  const walletsByProfile = new Map(
    wallets.map((wallet) => [String(wallet.id || '').trim().toUpperCase(), {
      ...wallet,
      id: String(wallet.id || '').trim().toUpperCase(),
      walletAddress: normalizeAddress(wallet.walletAddress),
      privateKey: normalizePrivateKey(wallet.privateKey),
    }]),
  );
  const allowedProfiles = new Set(options.profileIds);
  const allowedAssets = new Set(options.assetUids);
  const filtered = assets.filter((asset) => {
    const profileId = String(asset.sourceProfileId || '').trim().toUpperCase();
    const sourceAssetUid = String(asset.assetUid || '').trim().toLowerCase();
    const targetAssetUid = buildNetworkAssetUid(network, sourceAssetUid);
    if (allowedProfiles.size > 0 && !allowedProfiles.has(profileId)) return false;
    if (allowedAssets.size > 0 && !allowedAssets.has(sourceAssetUid) && !allowedAssets.has(targetAssetUid)) return false;
    return true;
  });
  const limited = options.limitAssets > 0 ? filtered.slice(0, options.limitAssets) : filtered;

  return limited.map((asset) => {
    const profileId = String(asset.sourceProfileId || '').trim().toUpperCase();
    const wallet = walletsByProfile.get(profileId);
    if (!wallet) throw new Error(`No wallet found for profile ${profileId}`);
    if (normalizeAddress(asset.sellerWallet) !== wallet.walletAddress) throw new Error(`Wallet mismatch for ${asset.assetUid}`);
    const account = privateKeyToAccount(wallet.privateKey);
    if (normalizeAddress(account.address) !== wallet.walletAddress) throw new Error(`Private key mismatch for ${profileId}`);
    return {
      asset,
      sourceAssetUid: String(asset.assetUid || '').trim().toLowerCase(),
      targetAssetUid: buildNetworkAssetUid(network, asset.assetUid),
      wallet,
      mintArgs: [
        BigInt(unitIdForAsset(asset)),
        BigInt(String(asset.totalAmount || 0)),
        0n,
        assetTypeToEnum(asset),
      ],
    };
  });
}

function initialLedger(network, items) {
  return {
    version: 1,
    seedBatch: SEED_BATCH,
    network: network.key,
    chainId: network.chainId,
    assetContract: normalizeAddress(network.assetContract),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items,
  };
}

function createLedgerItem(queue) {
  return {
    assetUid: queue.targetAssetUid,
    sourceAssetUid: queue.sourceAssetUid,
    profileId: queue.wallet.id,
    walletAddress: queue.wallet.walletAddress,
    title: queue.asset.title,
    status: 'pending',
    txHash: '',
    assetId: '',
    blockNumber: '',
    logIndex: null,
    error: '',
    serverSync: null,
    attempts: [],
  };
}

async function requestJson(baseUrl, serviceRoleKey, restPath, init = {}) {
  const response = await fetch(`${baseUrl}/rest/v1${restPath}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }
  if (!response.ok) throw new Error(`${restPath} failed ${response.status}: ${JSON.stringify(json)}`);
  return json;
}

function supabaseContext(env) {
  const baseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.ATP2_SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceRoleKey) throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return { baseUrl, serviceRoleKey };
}

function patchNetworkMetadata(value, asset, network, targetAssetUid, sourceAssetUid, tokenId = null, txHash = null) {
  const metadata = value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
  const seller = metadata.seller && typeof metadata.seller === 'object' && !Array.isArray(metadata.seller)
    ? { ...metadata.seller }
    : {};
  return {
    ...metadata,
    asset_uid: targetAssetUid,
    source_asset_uid: sourceAssetUid,
    seed_catalog_only: tokenId ? false : metadata.seed_catalog_only,
    projection_state: tokenId ? 'onchain_minted_event_synced' : 'catalog_seed_pending_onchain_mint',
    mint_state: tokenId ? 'minted' : 'pending_onchain_mint',
    blockchain: network.blockchain,
    network: 'testnet',
    chainId: network.chainId,
    contractAddress: network.assetContract,
    tokenId: tokenId || metadata.tokenId || null,
    onchainAssetId: tokenId || metadata.onchainAssetId || null,
    assetId: tokenId || metadata.assetId || null,
    mintTxHash: txHash || metadata.mintTxHash || null,
    seller_wallet: normalizeAddress(asset.sellerWallet),
    seller: {
      ...seller,
      address: normalizeAddress(asset.sellerWallet),
    },
    multichain_seed_projection: {
      source: 'v3_5_beta_seed_assets_multichain',
      sourceAssetUid,
      targetAssetUid,
      network: network.key,
      chainId: network.chainId,
      updatedAt: new Date().toISOString(),
    },
  };
}

async function ensureCatalogProjection({ env, asset, network, sourceAssetUid, targetAssetUid, cloneCatalog }) {
  const { baseUrl, serviceRoleKey } = supabaseContext(env);
  const targetRows = await requestJson(
    baseUrl,
    serviceRoleKey,
    `/assets_catalog?asset_uid=eq.${encodeURIComponent(targetAssetUid)}&select=*&limit=1`,
  );
  if (Array.isArray(targetRows) && targetRows[0]?.id) return targetRows[0];
  if (!cloneCatalog) throw new Error(`Catalog row not found for ${targetAssetUid}`);

  const sourceRows = await requestJson(
    baseUrl,
    serviceRoleKey,
    `/assets_catalog?asset_uid=eq.${encodeURIComponent(sourceAssetUid)}&select=*&limit=1`,
  );
  const source = Array.isArray(sourceRows) ? sourceRows[0] : null;
  if (!source?.id) throw new Error(`Source catalog row not found for ${sourceAssetUid}`);

  const sourceSlug = String(source.slug || sourceAssetUid).trim().toLowerCase();
  const payload = {
    asset_uid: targetAssetUid,
    title: source.title,
    slug: `${network.key}-${sourceSlug}`.slice(0, 240),
    category: source.category,
    subcategory: source.subcategory,
    description: source.description,
    cover_image_url: source.cover_image_url,
    gallery_images: Array.isArray(source.gallery_images) ? source.gallery_images : [],
    attributes: source.attributes && typeof source.attributes === 'object' ? source.attributes : {},
    metadata: patchNetworkMetadata(source.metadata, asset, network, targetAssetUid, sourceAssetUid),
    seller_user_id: source.seller_user_id,
    contract_address: normalizeAddress(network.assetContract),
    token_id: null,
    chain_id: network.chainId,
    is_active: true,
    metadata_version: source.metadata_version || 1,
  };
  const created = await requestJson(baseUrl, serviceRoleKey, '/assets_catalog', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([payload]),
  });
  const row = Array.isArray(created) ? created[0] : null;
  if (!row?.id) throw new Error(`Failed to create catalog projection for ${targetAssetUid}`);
  return row;
}

async function syncProjection({ env, asset, network, ledgerItem, sourceAssetUid, targetAssetUid, cloneCatalog }) {
  const { baseUrl, serviceRoleKey } = supabaseContext(env);
  const catalogRow = await ensureCatalogProjection({
    env,
    asset,
    network,
    sourceAssetUid,
    targetAssetUid,
    cloneCatalog,
  });

  const mintedAt = ledgerItem.lastAttemptAt || new Date().toISOString();
  const tokenId = String(ledgerItem.assetId);
  const txHash = String(ledgerItem.txHash);
  const owner = normalizeAddress(asset.sellerWallet);
  const existingMetadata = catalogRow.metadata && typeof catalogRow.metadata === 'object' ? catalogRow.metadata : {};
  const existingAttributes = catalogRow.attributes && typeof catalogRow.attributes === 'object' ? catalogRow.attributes : {};
  const totalAmount = Number(asset.totalAmount || 0);
  const nextMetadata = {
    ...patchNetworkMetadata(existingMetadata, asset, network, targetAssetUid, sourceAssetUid, tokenId, txHash),
    mintedAt,
    availableSlots: totalAmount,
    totalSlots: totalAmount,
    runtime_mint_sync: {
      source: 'v3_5_beta_seed_asset_multichain_mint_script',
      syncedAt: new Date().toISOString(),
      txHash,
      blockNumber: ledgerItem.blockNumber,
      logIndex: ledgerItem.logIndex,
    },
  };
  const nextAttributes = {
    ...existingAttributes,
    on_chain_asset_id: tokenId,
    on_chain_unit_id: String(unitIdForAsset(asset)),
    on_chain_total_amount: totalAmount,
    on_chain_available_amount: totalAmount,
  };

  await requestJson(baseUrl, serviceRoleKey, `/assets_catalog?id=eq.${encodeURIComponent(catalogRow.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      contract_address: normalizeAddress(network.assetContract),
      token_id: tokenId,
      chain_id: network.chainId,
      attributes: nextAttributes,
      metadata: nextMetadata,
      updated_at: new Date().toISOString(),
    }),
  });

  const protocolRows = await requestJson(baseUrl, serviceRoleKey, '/protocol_assets?on_conflict=chain_id,asset_contract,token_id', {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify([{
      chain_id: network.chainId,
      asset_contract: normalizeAddress(network.assetContract),
      token_id: tokenId,
      owner_address: owner,
      status: 'active',
      available_amount: String(totalAmount),
      total_amount: String(totalAmount),
      metadata: {
        projection_state: 'onchain_minted_event_synced',
        source: 'v3_5_beta_seed_asset_multichain_mint_script',
        assetUid: targetAssetUid,
        sourceAssetUid,
        seedBatch: SEED_BATCH,
        network: network.key,
        txHash,
        blockNumber: ledgerItem.blockNumber,
        logIndex: ledgerItem.logIndex,
        ownerAddress: owner,
        chainSnapshot: {
          assetId: tokenId,
          totalAmount: String(totalAmount),
          availableAmount: String(totalAmount),
          assetType: assetTypeToEnum(asset),
          unitId: String(unitIdForAsset(asset)),
        },
      },
    }]),
  });
  const protocolAssetId = Array.isArray(protocolRows) ? protocolRows[0]?.id : null;

  await requestJson(
    baseUrl,
    serviceRoleKey,
    `/asset_protocol_links?asset_id=eq.${encodeURIComponent(catalogRow.id)}&chain_id=eq.${network.chainId}&contract_address=ilike.${encodeURIComponent(normalizeAddress(network.assetContract))}`,
    { method: 'DELETE' },
  );
  await requestJson(baseUrl, serviceRoleKey, '/asset_protocol_links', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([{
      asset_id: catalogRow.id,
      chain_id: network.chainId,
      contract_address: normalizeAddress(network.assetContract),
      token_id: tokenId,
      link_type: 'primary',
    }]),
  });

  if (protocolAssetId) {
    await requestJson(baseUrl, serviceRoleKey, '/protocol_asset_events?on_conflict=chain_id,tx_hash,log_index', {
      method: 'POST',
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify([{
        protocol_asset_id: protocolAssetId,
        event_name: 'AssetMinted',
        chain_id: network.chainId,
        tx_hash: txHash,
        log_index: Number(ledgerItem.logIndex || 0),
        block_number: Number(ledgerItem.blockNumber || 0),
        block_time: mintedAt,
        payload: {
          assetUid: targetAssetUid,
          sourceAssetUid,
          assetId: tokenId,
          seller: owner,
          amount: String(totalAmount),
          assetType: assetTypeToEnum(asset),
        },
      }]),
    });
  }

  return { catalogAssetId: catalogRow.id, protocolAssetId };
}

async function refreshMarketplaceIndex(env) {
  const { baseUrl, serviceRoleKey } = supabaseContext(env);
  await requestJson(baseUrl, serviceRoleKey, '/rpc/refresh_marketplace_asset_browse_index_v1', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const network = resolveV35TestnetNetwork(options.network);
  const rpcUrl = resolveRpcUrl(network, options);
  const runId = createRunId();
  const { ledgerPath, runsDir } = executionPaths(network);
  const [env, assets, wallets] = await Promise.all([
    loadEnv(),
    fs.readFile(ASSET_INDEX_PATH, 'utf8').then(JSON.parse),
    fs.readFile(WALLETS_PATH, 'utf8').then(JSON.parse),
  ]);
  const queue = buildAssetQueue(assets, wallets, options, network);
  if (queue.length === 0) throw new Error('No seed assets matched filters');

  const publicClient = createPublicClient({
    chain: network.viemChain,
    transport: http(rpcUrl),
  });
  const chainId = await publicClient.getChainId();
  if (chainId !== network.chainId) throw new Error(`RPC chain id ${chainId} != expected ${network.chainId}`);
  const code = await publicClient.getCode({ address: network.assetContract });
  if (!code || code === '0x') throw new Error(`No contract code at ${network.assetContract}`);

  const existingLedger = await readJsonIfExists(ledgerPath, null);
  const ledgerByUid = new Map((existingLedger?.items || []).map((item) => [String(item.assetUid || '').toLowerCase(), item]));
  const ledger = existingLedger || initialLedger(network, []);
  ledger.network = network.key;
  ledger.chainId = network.chainId;
  ledger.assetContract = normalizeAddress(network.assetContract);

  for (const item of queue) {
    const uid = item.targetAssetUid;
    if (!ledgerByUid.has(uid)) {
      const next = createLedgerItem(item);
      ledgerByUid.set(uid, next);
      ledger.items.push(next);
    }
  }

  const runReport = {
    runId,
    dryRun: options.dryRun,
    syncOnly: options.syncOnly,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    seedBatch: SEED_BATCH,
    network: network.key,
    chainId: network.chainId,
    assetContract: normalizeAddress(network.assetContract),
    planned: queue.map((item) => ({
      assetUid: item.targetAssetUid,
      sourceAssetUid: item.sourceAssetUid,
      profileId: item.wallet.id,
      walletAddress: item.wallet.walletAddress,
      title: item.asset.title,
      unitId: item.mintArgs[0].toString(),
      totalAmount: item.mintArgs[1].toString(),
      assetType: item.mintArgs[3],
    })),
    results: [],
  };

  if (options.dryRun) {
    const first = queue[0];
    await publicClient.simulateContract({
      account: privateKeyToAccount(first.wallet.privateKey),
      address: network.assetContract,
      abi: ORINA_RWA_MINT_ABI,
      functionName: 'mintAsset',
      args: first.mintArgs,
    });
    runReport.finishedAt = new Date().toISOString();
    runReport.summary = { total: queue.length, planned: queue.length };
    await writeJson(path.join(runsDir, `${runId}.json`), runReport);
    console.log(JSON.stringify({ ok: true, dryRun: true, network: network.key, planned: queue.length, simulatedFirstAsset: first.targetAssetUid }, null, 2));
    return;
  }

  for (const item of queue) {
    const uid = item.targetAssetUid;
    const ledgerItem = ledgerByUid.get(uid);
    const startedAt = new Date().toISOString();

    if (ledgerItem.status === 'success' && !options.syncOnly) {
      runReport.results.push({ assetUid: uid, status: 'skipped_existing_success', txHash: ledgerItem.txHash, assetId: ledgerItem.assetId });
      continue;
    }

    try {
      if (!options.syncOnly && ledgerItem.status !== 'success') {
        const account = privateKeyToAccount(item.wallet.privateKey);
        const walletClient = createWalletClient({
          account,
          chain: network.viemChain,
          transport: http(rpcUrl),
        });
        const request = await buildMintRequest({
          publicClient,
          network,
          account,
          item,
        });
        const txHash = await walletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: options.confirmations,
        });
        if (receipt.status === 'reverted') throw new Error('Mint transaction reverted');
        const minted = extractMintedEvent(receipt, network);
        if (!minted?.assetId) throw new Error('AssetMinted event not found in receipt');
        if (minted.seller !== item.wallet.walletAddress) throw new Error(`Minted seller mismatch: ${minted.seller}`);
        Object.assign(ledgerItem, {
          status: 'success',
          txHash,
          assetId: minted.assetId,
          blockNumber: receipt.blockNumber.toString(),
          logIndex: minted.logIndex,
          error: '',
          lastAttemptAt: new Date().toISOString(),
          explorerUrl: explorerTxUrl(network, txHash),
          attempts: [
            ...(Array.isArray(ledgerItem.attempts) ? ledgerItem.attempts : []),
            {
              startedAt,
              finishedAt: new Date().toISOString(),
              status: 'success',
              txHash,
              assetId: minted.assetId,
              blockNumber: receipt.blockNumber.toString(),
            },
          ],
        });
        ledger.updatedAt = new Date().toISOString();
        await writeJson(ledgerPath, ledger);
      }

      const serverSync = await syncProjection({
        env,
        asset: item.asset,
        network,
        ledgerItem,
        sourceAssetUid: item.sourceAssetUid,
        targetAssetUid: item.targetAssetUid,
        cloneCatalog: options.cloneCatalog,
      });
      ledgerItem.serverSync = {
        status: 'success',
        syncedAt: new Date().toISOString(),
        ...serverSync,
      };
      ledger.updatedAt = new Date().toISOString();
      await writeJson(ledgerPath, ledger);

      runReport.results.push({
        assetUid: uid,
        status: 'success',
        txHash: ledgerItem.txHash,
        assetId: ledgerItem.assetId,
        blockNumber: ledgerItem.blockNumber,
        serverSync: 'success',
      });
      console.log(`${uid} minted=${ledgerItem.assetId} tx=${ledgerItem.txHash}`);
    } catch (error) {
      const message = formatError(error);
      ledgerItem.status = ledgerItem.status === 'success' ? ledgerItem.status : 'failed';
      ledgerItem.error = message;
      ledgerItem.lastAttemptAt = new Date().toISOString();
      ledgerItem.attempts = [
        ...(Array.isArray(ledgerItem.attempts) ? ledgerItem.attempts : []),
        {
          startedAt,
          finishedAt: new Date().toISOString(),
          status: 'failed',
          error: message,
        },
      ];
      ledger.updatedAt = new Date().toISOString();
      await writeJson(ledgerPath, ledger);
      runReport.results.push({ assetUid: uid, status: 'failed', error: message });
      console.error(`${uid} failed: ${message}`);
    }

    if (options.delayMs > 0) await sleep(options.delayMs);
  }

  runReport.finishedAt = new Date().toISOString();
  runReport.summary = runReport.results.reduce((acc, result) => {
    acc.total += 1;
    acc[result.status] = (acc[result.status] || 0) + 1;
    if (result.serverSync === 'success') acc.serverSyncSuccess += 1;
    return acc;
  }, { total: 0, success: 0, failed: 0, skipped_existing_success: 0, serverSyncSuccess: 0 });
  if (runReport.summary.serverSyncSuccess > 0) await refreshMarketplaceIndex(env);
  await writeJson(path.join(runsDir, `${runId}.json`), runReport);
  console.log(JSON.stringify({ ok: runReport.summary.failed === 0, network: network.key, summary: runReport.summary, runReport: path.join(runsDir, `${runId}.json`) }, null, 2));
  process.exit(runReport.summary.failed === 0 ? 0 : 2);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: formatError(error) }, null, 2));
  process.exit(1);
});
