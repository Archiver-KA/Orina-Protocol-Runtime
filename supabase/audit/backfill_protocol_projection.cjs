#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createPublicClient, http } = require('viem');
const { bscTestnet } = require('viem/chains');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULTS = {
  chainId: 97,
  rpcUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/',
  marketplace: '0x026c9e9a5d007ed46df3de900f53c0786ec650c8',
  disputeManager: '0xa31b543254c138178506244f20c0f7630b6709d5',
  assetContract: '0x5fc61747b359e089e3ced00494f9e71de836b666',
  deployArtifact: path.join(
    ROOT,
    'foundry',
    'broadcast',
    'DeployFullSystemDirect.s.sol',
    '97',
    'run-latest.json',
  ),
  sqlOut: path.join(ROOT, 'supabase', 'audit', 'generated_protocol_projection_backfill.sql'),
  chunkSize: 20n,
};

const MARKETPLACE_EVENT_ABI = [
  { type: 'event', name: 'BuyerSigned1', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }, { indexed: false, name: 'signature', type: 'bytes' }] },
  { type: 'event', name: 'SellerSigned', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }, { indexed: false, name: 'signature', type: 'bytes' }] },
  { type: 'event', name: 'BuyerSigned2', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }, { indexed: false, name: 'signature', type: 'bytes' }] },
  { type: 'event', name: 'OrderProposed', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }, { indexed: true, name: 'buyer', type: 'address' }, { indexed: true, name: 'seller', type: 'address' }] },
  { type: 'event', name: 'SellerConfirmed', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }] },
  { type: 'event', name: 'DeliveryTimeSet', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }, { indexed: false, name: 'estDeliverySeconds', type: 'uint256' }] },
  { type: 'event', name: 'PayDeadlineSet', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }, { indexed: false, name: 'payDeadline', type: 'uint256' }] },
  { type: 'event', name: 'DeliveryTimeAccepted', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }] },
  { type: 'event', name: 'OrderPaid', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }] },
  { type: 'event', name: 'OrderFinalized', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }, { indexed: false, name: 'settlement', type: 'uint8' }] },
  { type: 'event', name: 'OrderCancelled', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }] },
  { type: 'event', name: 'OrderCancelledBySeller', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }] },
  { type: 'event', name: 'OrderCancelledByBuyer', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }] },
  { type: 'event', name: 'AutoReleased', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }] },
  { type: 'event', name: 'DisputeOpened', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }, { indexed: true, name: 'opener', type: 'address' }] },
];

const DISPUTE_EVENT_ABI = [
  { type: 'event', name: 'DisputeExtended', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }, { indexed: false, name: 'phase1Deadline', type: 'uint256' }, { indexed: false, name: 'finalDeadline', type: 'uint256' }] },
  { type: 'event', name: 'DisputeResolvedByAgreement', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }, { indexed: false, name: 'verdict', type: 'uint8' }, { indexed: false, name: 'buyerShareBps', type: 'uint256' }, { indexed: false, name: 'sellerShareBps', type: 'uint256' }, { indexed: false, name: 'signatureCount', type: 'uint256' }] },
  { type: 'event', name: 'DisputeResolvedByArbiter', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }, { indexed: false, name: 'verdict', type: 'uint8' }, { indexed: false, name: 'buyerShareBps', type: 'uint256' }, { indexed: false, name: 'sellerShareBps', type: 'uint256' }] },
  { type: 'event', name: 'DisputeAutoSplit', inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }, { indexed: false, name: 'buyerShareBps', type: 'uint256' }, { indexed: false, name: 'sellerShareBps', type: 'uint256' }, { indexed: false, name: 'extended', type: 'bool' }] },
];

const ASSET_EVENT_ABI = [
  { type: 'event', name: 'AssetMinted', inputs: [{ indexed: true, name: 'assetId', type: 'uint256' }, { indexed: true, name: 'seller', type: 'address' }, { indexed: false, name: 'amount', type: 'uint256' }, { indexed: false, name: 'assetType', type: 'uint8' }] },
  { type: 'event', name: 'AmountLocked', inputs: [{ indexed: true, name: 'assetId', type: 'uint256' }, { indexed: true, name: 'orderId', type: 'uint256' }, { indexed: false, name: 'amount', type: 'uint256' }] },
  { type: 'event', name: 'AmountUnlocked', inputs: [{ indexed: true, name: 'assetId', type: 'uint256' }, { indexed: true, name: 'orderId', type: 'uint256' }, { indexed: false, name: 'amount', type: 'uint256' }] },
  { type: 'event', name: 'AmountConsumed', inputs: [{ indexed: true, name: 'assetId', type: 'uint256' }, { indexed: true, name: 'orderId', type: 'uint256' }, { indexed: false, name: 'amount', type: 'uint256' }] },
  { type: 'event', name: 'AssetFinalized', inputs: [{ indexed: true, name: 'assetId', type: 'uint256' }] },
  { type: 'event', name: 'AssetBurned', inputs: [{ indexed: true, name: 'assetId', type: 'uint256' }] },
];

const MARKETPLACE_READ_ABI = [
  { type: 'function', name: 'nextOrderId', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
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
      { name: 'burnFeeBpsSnapshot', type: 'uint256' },
      { name: 'referralFeeBpsSnapshot', type: 'uint256' },
      { name: 'finalized', type: 'bool' },
      { name: 'sellerConfirmed', type: 'bool' },
      { name: 'buyerSig1', type: 'bytes' },
      { name: 'sellerSig', type: 'bytes' },
      { name: 'buyerSig2', type: 'bytes' },
    ],
  },
];

const DISPUTE_READ_ABI = [
  {
    type: 'function',
    name: 'disputes',
    stateMutability: 'view',
    inputs: [{ name: 'orderId', type: 'uint256' }],
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
];

const ASSET_READ_ABI = [
  { type: 'function', name: 'nextAssetId', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'unitRegistry', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  {
    type: 'function',
    name: 'getAsset',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'uint256' }],
    outputs: [
      {
        name: 'asset',
        type: 'tuple',
        components: [
          { name: 'seller', type: 'address' },
          { name: 'unitId', type: 'uint256' },
          { name: 'totalAmount', type: 'uint256' },
          { name: 'availableAmount', type: 'uint256' },
          { name: 'consumedAmount', type: 'uint256' },
          { name: 'active', type: 'bool' },
          { name: 'expiryAt', type: 'uint256' },
          { name: 'finalized', type: 'bool' },
          { name: 'assetType', type: 'uint8' },
        ],
      },
    ],
  },
];

const UNIT_READ_ABI = [
  {
    type: 'function',
    name: 'getUnit',
    stateMutability: 'view',
    inputs: [{ name: 'unitId', type: 'uint256' }],
    outputs: [
      {
        name: 'unit',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'step', type: 'uint256' },
          { name: 'minAmount', type: 'uint256' },
          { name: 'active', type: 'bool' },
          { name: 'locked', type: 'bool' },
        ],
      },
    ],
  },
];

const ERC20_METADATA_ABI = [
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
];

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

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const next = argv[index + 1];
    if ((key === '--from-block' || key === '--to-block' || key === '--chunk-size') && next) {
      options[key.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = BigInt(next);
      index += 1;
      continue;
    }
    if ((key === '--sql-out' || key === '--deploy-artifact') && next) {
      options[key.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }
    if (key === '--apply-linked') options.applyLinked = true;
    if (key === '--dry-run') options.dryRun = true;
  }
  return options;
}

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

function parseBigIntLike(value, fallback = 0n) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === 'string' && value.length > 0) {
    try {
      return BigInt(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
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

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function readDeploymentStartBlock(artifactPath, targets) {
  if (!fs.existsSync(artifactPath)) throw new Error(`Deployment artifact not found: ${artifactPath}`);
  const runJson = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const receipts = new Map((runJson.receipts || []).map((receipt) => [String(receipt.transactionHash || '').toLowerCase(), receipt]));
  const matched = [];
  for (const tx of runJson.transactions || []) {
    const contractName = String(tx.contractName || '').trim();
    const contractAddress = normalizeAddress(tx.contractAddress || tx.transaction?.to || '');
    const target = targets.find((entry) => entry.contractName === contractName && normalizeAddress(entry.address) === contractAddress);
    if (!target) continue;
    const receipt = receipts.get(String(tx.hash || '').toLowerCase());
    const blockNumber = receipt?.blockNumber ?? tx.receipt?.blockNumber ?? null;
    if (blockNumber !== null && blockNumber !== undefined) matched.push(BigInt(blockNumber));
  }
  if (matched.length === 0) throw new Error('Could not derive deployment start block from artifact');
  return matched.reduce((min, value) => (value < min ? value : min), matched[0]);
}

async function safeReadContract(client, request, fallback = null) {
  try {
    return await client.readContract(request);
  } catch {
    return fallback;
  }
}

async function getLogsInChunks({ client, address, event, entityKind, idKey, sourceContract, fromBlock, toBlock, chunkSize }) {
  const entries = [];
  let cursor = fromBlock;
  let currentChunkSize = chunkSize;
  while (cursor <= toBlock) {
    const end = cursor + currentChunkSize - 1n > toBlock ? toBlock : cursor + currentChunkSize - 1n;
    try {
      const batch = await client.getLogs({ address, event, fromBlock: cursor, toBlock: end });
      for (const log of batch) {
        const entityId = log.args?.[idKey];
        if (entityId === undefined || entityId === null) continue;
        entries.push({
          entityKind,
          entityId: String(entityId),
          sourceContract,
          contractAddress: normalizeAddress(address),
          eventName: event.name,
          args: toSerializable(log.args),
          txHash: String(log.transactionHash).toLowerCase(),
          logIndex: Number(log.logIndex),
          blockNumber: BigInt(log.blockNumber),
        });
      }
      cursor = end + 1n;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (currentChunkSize <= 1n) {
        throw new Error(`eth_getLogs failed for ${address} ${event.name}: ${message}`);
      }
      currentChunkSize = currentChunkSize > 2n ? currentChunkSize / 2n : 1n;
    }
  }
  return entries;
}

async function attachBlockTimes(client, events) {
  const cache = new Map();
  for (const event of events) {
    const key = event.blockNumber.toString();
    if (!cache.has(key)) cache.set(key, client.getBlock({ blockNumber: event.blockNumber }).then((block) => block.timestamp));
  }
  return Promise.all(
    events.map(async (event) => ({
      ...event,
      blockTime: new Date(Number(await cache.get(event.blockNumber.toString())) * 1000).toISOString(),
    })),
  );
}

function normalizeOrderStatus(order, dispute) {
  if (dispute?.active) return 'disputed';
  if (order.finalized || Number(order.state) === 3) return 'finalized';
  if (Number(order.state) === 4) return 'cancelled';
  if (Number(order.state) === 1 || order.paidAt > 0n) return 'paid';
  if (order.sellerConfirmed) return order.payDeadline > 0n ? 'pending_buyer_accept' : 'pending_delivery';
  return 'pending_seller_confirm';
}

function normalizeAssetStatus(asset) {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (asset.finalized) return 'finalized';
  if (!asset.active) return 'inactive';
  if (asset.expiryAt > 0n && asset.expiryAt <= now) return 'expired';
  if (asset.availableAmount === 0n) return 'sold_out';
  return 'active';
}

function humanizeAssetType(assetType) {
  return Number(assetType) === 1 ? 'NFT' : 'RWA';
}

function formatUtcDate(value) {
  const timestamp = Number(parseBigIntLike(value));
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return new Date(timestamp * 1000).toISOString();
}

function runApplyLinked(sqlFile) {
  const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['supabase', 'db', 'query', '--linked', '--file', sqlFile], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(['Failed to apply protocol projection backfill via linked Supabase DB.', result.stdout || '', result.stderr || ''].join('\n').trim());
  }
  return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

function unwrapTupleResult(value) {
  if (Array.isArray(value) && value.length === 1 && value[0] && typeof value[0] === 'object') {
    return value[0];
  }
  return value;
}

async function readTokenMeta(client, tokenAddress, cache) {
  const token = normalizeAddress(tokenAddress);
  if (!token || token === normalizeAddress('0x0000000000000000000000000000000000000000')) {
    return { address: token, symbol: 'ERC20', decimals: 18 };
  }
  if (cache.has(token)) return cache.get(token);
  const [symbol, decimals] = await Promise.all([
    safeReadContract(client, { address: token, abi: ERC20_METADATA_ABI, functionName: 'symbol' }, null),
    safeReadContract(client, { address: token, abi: ERC20_METADATA_ABI, functionName: 'decimals' }, null),
  ]);
  const meta = {
    address: token,
    symbol: typeof symbol === 'string' && symbol.trim() ? symbol.trim() : token,
    decimals: typeof decimals === 'number' ? decimals : Number(parseBigIntLike(decimals, 18n)),
  };
  cache.set(token, meta);
  return meta;
}

async function readUnitMeta(client, unitRegistry, unitId, cache) {
  const key = String(unitId);
  if (cache.has(key)) return cache.get(key);
  const unit = unwrapTupleResult(await safeReadContract(client, { address: unitRegistry, abi: UNIT_READ_ABI, functionName: 'getUnit', args: [BigInt(unitId)] }, null));
  const tuple = unit && typeof unit === 'object' ? unit : null;
  const meta = unit
    ? {
        unitId: key,
        unitName: tuple.name ?? tuple[0],
        unitStep: String(tuple.step ?? tuple[1]),
        unitMinAmount: String(tuple.minAmount ?? tuple[2]),
        unitActive: Boolean(tuple.active ?? tuple[3]),
        unitLocked: Boolean(tuple.locked ?? tuple[4]),
      }
    : {
        unitId: key,
        unitName: `Unit ${key}`,
        unitStep: '0',
        unitMinAmount: '0',
        unitActive: false,
        unitLocked: false,
      };
  cache.set(key, meta);
  return meta;
}

async function readAssetProjection(client, assetContract, unitRegistry, assetId, unitCache, mintEventMap) {
  const raw = unwrapTupleResult(await client.readContract({
    address: assetContract,
    abi: ASSET_READ_ABI,
    functionName: 'getAsset',
    args: [BigInt(assetId)],
  }));
  const tuple = raw && typeof raw === 'object' ? raw : raw;
  const asset = {
    seller: normalizeAddress(tuple.seller ?? tuple[0]),
    unitId: BigInt(tuple.unitId ?? tuple[1]),
    totalAmount: BigInt(tuple.totalAmount ?? tuple[2]),
    availableAmount: BigInt(tuple.availableAmount ?? tuple[3]),
    consumedAmount: BigInt(tuple.consumedAmount ?? tuple[4]),
    active: Boolean(tuple.active ?? tuple[5]),
    expiryAt: BigInt(tuple.expiryAt ?? tuple[6]),
    finalized: Boolean(tuple.finalized ?? tuple[7]),
    assetType: Number(tuple.assetType ?? tuple[8]),
  };
  const unit = await readUnitMeta(client, unitRegistry, asset.unitId, unitCache);
  const mintEvent = mintEventMap.get(String(assetId));
  const totalLocked = asset.totalAmount - asset.availableAmount - asset.consumedAmount;
  return {
    assetId: String(assetId),
    ownerAddress: asset.seller,
    status: normalizeAssetStatus(asset),
    availableAmount: String(asset.availableAmount),
    totalAmount: String(asset.totalAmount),
    metadata: {
      projection_state: 'chain_projection',
      owner_source: 'chain_projection',
      canonical_owner_source: 'chain_projection',
      deploymentScope: {
        chainId: DEFAULTS.chainId,
        assetContract,
      },
      chainSnapshot: {
        assetId: String(assetId),
        seller: asset.seller,
        unitId: unit.unitId,
        unitName: unit.unitName,
        unitStep: unit.unitStep,
        unitMinAmount: unit.unitMinAmount,
        unitActive: unit.unitActive,
        unitLocked: unit.unitLocked,
        totalAmount: String(asset.totalAmount),
        availableAmount: String(asset.availableAmount),
        consumedAmount: String(asset.consumedAmount),
        totalLocked: String(totalLocked > 0n ? totalLocked : 0n),
        active: asset.active,
        expiryAt: String(asset.expiryAt),
        expiryAtIso: formatUtcDate(asset.expiryAt),
        finalized: asset.finalized,
        assetType: asset.assetType,
        assetTypeLabel: humanizeAssetType(asset.assetType),
        mintedTxHash: mintEvent?.txHash ?? null,
        mintedBlockNumber: mintEvent?.blockNumber?.toString() ?? null,
        mintedBlockTime: mintEvent?.blockTime ?? null,
      },
    },
  };
}

async function buildAssetRows(client, assetContract, unitRegistry, nextAssetId, unitCache, mintEventMap) {
  const rows = [];
  for (let assetId = 0n; assetId < nextAssetId; assetId += 1n) {
    const projection = await readAssetProjection(client, assetContract, unitRegistry, assetId, unitCache, mintEventMap);
    rows.push({
      chain_id: DEFAULTS.chainId,
      asset_contract: assetContract,
      token_id: projection.assetId,
      owner_address: projection.ownerAddress,
      status: projection.status,
      available_amount: projection.availableAmount,
      total_amount: projection.totalAmount,
      metadata: projection.metadata,
    });
  }
  return rows;
}

async function buildOrderRows(client, marketplace, disputeManager, assetContract, assetRowMap, tokenCache, nextOrderId) {
  const rows = [];
  for (let orderId = 0n; orderId < nextOrderId; orderId += 1n) {
    const order = await client.readContract({
      address: marketplace,
      abi: MARKETPLACE_READ_ABI,
      functionName: 'orders',
      args: [orderId],
    });
    const dispute = await safeReadContract(client, {
      address: disputeManager,
      abi: DISPUTE_READ_ABI,
      functionName: 'disputes',
      args: [orderId],
    }, [false, 0, 0n, 0n, false, 0n, 0n]);
    const paymentTokenMeta = await readTokenMeta(client, order[4], tokenCache);
    const assetRow = assetRowMap.get(String(order[5]));
    const unitSnapshot = assetRow?.metadata?.chainSnapshot || {};
    const amount = BigInt(order[6]);
    const grossPrice = BigInt(order[7]);
    rows.push({
      order_uid: String(orderId),
      chain_id: DEFAULTS.chainId,
      marketplace_contract: marketplace,
      asset_contract: assetContract,
      asset_token_id: String(order[5]),
      buyer_address: normalizeAddress(order[0]),
      seller_address: normalizeAddress(order[1]),
      status: normalizeOrderStatus({
        state: Number(order[13]),
        paidAt: BigInt(order[9]),
        finalized: Boolean(order[20]),
        sellerConfirmed: Boolean(order[21]),
        payDeadline: BigInt(order[12]),
      }, {
        active: Boolean(dispute[0]),
      }),
      amount: String(amount),
      price_per_unit: String(amount > 0n ? grossPrice / amount : grossPrice),
      total_value: String(grossPrice),
      currency_symbol: paymentTokenMeta.symbol,
      metadata: {
        projection_state: 'chain_projection',
        status_source: 'chain_projection',
        canonical_status_source: 'chain_projection',
        deploymentScope: {
          chainId: DEFAULTS.chainId,
          marketplaceContract: marketplace,
          assetContract,
        },
        paymentToken: paymentTokenMeta.address,
        paymentTokenSymbol: paymentTokenMeta.symbol,
        paymentTokenDecimals: paymentTokenMeta.decimals,
        unitId: unitSnapshot.unitId ?? null,
        unitName: unitSnapshot.unitName ?? null,
        assetName: `Asset #${String(order[5])}`,
        chainSnapshot: {
          buyer: normalizeAddress(order[0]),
          seller: normalizeAddress(order[1]),
          payer: normalizeAddress(order[2]),
          refundRecipient: normalizeAddress(order[3]),
          paymentToken: paymentTokenMeta.address,
          paymentTokenSymbol: paymentTokenMeta.symbol,
          paymentTokenDecimals: paymentTokenMeta.decimals,
          assetId: String(order[5]),
          assetName: `Asset #${String(order[5])}`,
          unitId: unitSnapshot.unitId ?? null,
          unitName: unitSnapshot.unitName ?? null,
          amount: String(order[6]),
          grossPrice: String(order[7]),
          proposedAt: String(order[8]),
          proposedAtIso: formatUtcDate(order[8]),
          paidAt: String(order[9]),
          paidAtIso: formatUtcDate(order[9]),
          autoReleaseAt: String(order[10]),
          autoReleaseAtIso: formatUtcDate(order[10]),
          estDeliverySeconds: String(order[11]),
          payDeadline: String(order[12]),
          payDeadlineIso: formatUtcDate(order[12]),
          state: Number(order[13]),
          settlementType: Number(order[14]),
          split: {
            buyerShareBps: String(order[15]?.buyerShareBps ?? 0n),
            sellerShareBps: String(order[15]?.sellerShareBps ?? 0n),
          },
          platformFeeBpsSnapshot: String(order[16]),
          daoFeeBpsSnapshot: String(order[17]),
          burnFeeBpsSnapshot: String(order[18]),
          referralFeeBpsSnapshot: String(order[19]),
          finalized: Boolean(order[20]),
          sellerConfirmed: Boolean(order[21]),
          sellerConfirmedAt: Boolean(order[21]) ? String(order[8]) : '0',
          sellerConfirmedAtIso: Boolean(order[21]) ? formatUtcDate(order[8]) : null,
          buyerSig1Present: Boolean(order[22] && order[22] !== '0x'),
          sellerSigPresent: Boolean(order[23] && order[23] !== '0x'),
          buyerSig2Present: Boolean(order[24] && order[24] !== '0x'),
          disputedActive: Boolean(dispute[0]),
          disputeVerdict: Number(dispute[1]),
          disputeOpenedAt: String(dispute[2]),
          disputeOpenedAtIso: formatUtcDate(dispute[2]),
          disputeDeadline: String(dispute[3]),
          disputeDeadlineIso: formatUtcDate(dispute[3]),
          disputeExtended: Boolean(dispute[4]),
          disputeBuyerShareBps: String(dispute[5]),
          disputeSellerShareBps: String(dispute[6]),
        },
      },
    });
  }
  return rows;
}

function buildSql({ chainId, marketplace, assetContract, assetRows, orderRows, assetEvents, orderEvents }) {
  const statements = ['begin;'];
  for (const asset of assetRows) {
    statements.push([
      'insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)',
      `values (${chainId}, ${sqlString(assetContract)}, ${sqlString(asset.token_id)}, ${sqlString(asset.owner_address)}, ${sqlString(asset.status)}, ${sqlString(asset.available_amount)}, ${sqlString(asset.total_amount)}, ${sqlJson(asset.metadata)})`,
      'on conflict (chain_id, asset_contract, token_id) do update set',
      '  owner_address = excluded.owner_address,',
      '  status = excluded.status,',
      '  available_amount = excluded.available_amount,',
      '  total_amount = excluded.total_amount,',
      '  metadata = excluded.metadata;',
    ].join('\n'));
  }
  for (const order of orderRows) {
    statements.push([
      'insert into public.protocol_orders (order_uid, chain_id, marketplace_contract, asset_contract, asset_token_id, buyer_address, seller_address, status, amount, price_per_unit, total_value, currency_symbol, metadata)',
      `values (${sqlString(order.order_uid)}, ${chainId}, ${sqlString(marketplace)}, ${sqlString(assetContract)}, ${sqlString(order.asset_token_id)}, ${sqlString(order.buyer_address)}, ${sqlString(order.seller_address)}, ${sqlString(order.status)}, ${sqlString(order.amount)}, ${sqlString(order.price_per_unit)}, ${sqlString(order.total_value)}, ${sqlString(order.currency_symbol)}, ${sqlJson(order.metadata)})`,
      'on conflict (chain_id, marketplace_contract, order_uid) do update set',
      '  asset_contract = excluded.asset_contract,',
      '  asset_token_id = excluded.asset_token_id,',
      '  buyer_address = excluded.buyer_address,',
      '  seller_address = excluded.seller_address,',
      '  status = excluded.status,',
      '  amount = excluded.amount,',
      '  price_per_unit = excluded.price_per_unit,',
      '  total_value = excluded.total_value,',
      '  currency_symbol = excluded.currency_symbol,',
      '  metadata = excluded.metadata;',
    ].join('\n'));
  }
  for (const event of assetEvents) {
    const payload = {
      sourceContract: event.sourceContract,
      contractAddress: event.contractAddress,
      assetId: event.entityId,
      args: event.args,
    };
    statements.push([
      'insert into public.protocol_asset_events (protocol_asset_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload)',
      `values ((select id from public.protocol_assets where chain_id = ${chainId} and asset_contract = ${sqlString(assetContract)} and token_id = ${sqlString(event.entityId)}), ${sqlString(event.eventName)}, ${chainId}, ${sqlString(event.txHash)}, ${event.logIndex}, ${event.blockNumber.toString()}, ${sqlString(event.blockTime)}::timestamptz, ${sqlJson(payload)})`,
      'on conflict (chain_id, tx_hash, log_index) do update set',
      '  protocol_asset_id = excluded.protocol_asset_id,',
      '  event_name = excluded.event_name,',
      '  block_number = excluded.block_number,',
      '  block_time = excluded.block_time,',
      '  payload = excluded.payload;',
    ].join('\n'));
  }
  for (const event of orderEvents) {
    const payload = {
      sourceContract: event.sourceContract,
      contractAddress: event.contractAddress,
      orderUid: event.entityId,
      args: event.args,
    };
    statements.push([
      'insert into public.protocol_order_events (order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload)',
      `values ((select id from public.protocol_orders where chain_id = ${chainId} and marketplace_contract = ${sqlString(marketplace)} and order_uid = ${sqlString(event.entityId)}), ${sqlString(event.eventName)}, ${chainId}, ${sqlString(event.txHash)}, ${event.logIndex}, ${event.blockNumber.toString()}, ${sqlString(event.blockTime)}::timestamptz, ${sqlJson(payload)})`,
      'on conflict (chain_id, tx_hash, log_index) do update set',
      '  order_id = excluded.order_id,',
      '  event_name = excluded.event_name,',
      '  block_number = excluded.block_number,',
      '  block_time = excluded.block_time,',
      '  payload = excluded.payload;',
    ].join('\n'));
  }
  statements.push('commit;', '');
  return statements.join('\n');
}

async function collectEventBatches(client, { marketplace, disputeManager, assetContract, fromBlock, toBlock, chunkSize }) {
  const warnings = [];
  const rawEvents = [];
  const collect = async (events, address, entityKind, idKey, sourceContract) => {
    for (const event of events) {
      try {
        rawEvents.push(...await getLogsInChunks({ client, address, event, entityKind, idKey, sourceContract, fromBlock, toBlock, chunkSize }));
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : String(error));
      }
    }
  };
  await collect(MARKETPLACE_EVENT_ABI, marketplace, 'order', 'orderId', 'marketplace');
  await collect(DISPUTE_EVENT_ABI, disputeManager, 'order', 'orderId', 'dispute_manager');
  await collect(ASSET_EVENT_ABI, assetContract, 'asset', 'assetId', 'orina_rwa');
  return { rawEvents, warnings };
}

async function main() {
  const env = {
    ...parseEnvFile(path.join(ROOT, '.env')),
    ...parseEnvFile(path.join(ROOT, 'foundry', '.env')),
  };
  const options = parseArgs(process.argv.slice(2));
  const marketplace = normalizeAddress(process.env.MARKETPLACE_ATP_ADDRESS || env.MARKETPLACE_ATP_ADDRESS || DEFAULTS.marketplace);
  const disputeManager = normalizeAddress(process.env.DISPUTE_MANAGER_ADDRESS || env.DISPUTE_MANAGER_ADDRESS || DEFAULTS.disputeManager);
  const assetContract = normalizeAddress(process.env.ORINA_RWA_ADDRESS || env.ORINA_RWA_ADDRESS || DEFAULTS.assetContract);
  const sqlOut = options.sqlOut || DEFAULTS.sqlOut;
  const deployArtifact = options.deployArtifact || DEFAULTS.deployArtifact;
  const chunkSize = options.chunkSize || DEFAULTS.chunkSize;
  const client = createPublicClient({ chain: bscTestnet, transport: http(process.env.RPC_URL || env.RPC_URL || DEFAULTS.rpcUrl) });
  const fromBlock = options.fromBlock ?? readDeploymentStartBlock(deployArtifact, [
    { contractName: 'MarketplaceATP', address: marketplace },
    { contractName: 'OrinaRWA', address: assetContract },
    { contractName: 'DisputeManager', address: disputeManager },
  ]);
  const toBlock = options.toBlock ?? await client.getBlockNumber();
  const unitRegistry = normalizeAddress(await client.readContract({ address: assetContract, abi: ASSET_READ_ABI, functionName: 'unitRegistry' }));
  const nextOrderId = BigInt(await client.readContract({ address: marketplace, abi: MARKETPLACE_READ_ABI, functionName: 'nextOrderId' }));
  const nextAssetId = BigInt(await client.readContract({ address: assetContract, abi: ASSET_READ_ABI, functionName: 'nextAssetId' }));

  const { rawEvents, warnings } = await collectEventBatches(client, { marketplace, disputeManager, assetContract, fromBlock, toBlock, chunkSize });
  const deduped = new Map();
  for (const event of rawEvents) deduped.set(`${event.txHash}:${event.logIndex}`, event);
  const events = deduped.size > 0
    ? await attachBlockTimes(client, Array.from(deduped.values()).sort((left, right) => left.blockNumber === right.blockNumber ? left.logIndex - right.logIndex : left.blockNumber < right.blockNumber ? -1 : 1))
    : [];
  const mintEventMap = new Map(events.filter((event) => event.entityKind === 'asset' && event.eventName === 'AssetMinted').map((event) => [event.entityId, event]));
  const unitCache = new Map();
  const tokenCache = new Map();
  const assetRows = await buildAssetRows(client, assetContract, unitRegistry, nextAssetId, unitCache, mintEventMap);
  const assetRowMap = new Map(assetRows.map((row) => [row.token_id, row]));
  const orderRows = await buildOrderRows(client, marketplace, disputeManager, assetContract, assetRowMap, tokenCache, nextOrderId);
  const assetEvents = events.filter((event) => event.entityKind === 'asset');
  const orderEvents = events.filter((event) => event.entityKind === 'order');
  const sql = buildSql({ chainId: DEFAULTS.chainId, marketplace, assetContract, assetRows, orderRows, assetEvents, orderEvents });
  fs.writeFileSync(sqlOut, sql, 'utf8');

  let applyResult = null;
  if (options.applyLinked && !options.dryRun) applyResult = runApplyLinked(sqlOut);

  console.log(JSON.stringify({
    ok: true,
    chainId: DEFAULTS.chainId,
    marketplace,
    disputeManager,
    assetContract,
    unitRegistry,
    fromBlock: fromBlock.toString(),
    toBlock: toBlock.toString(),
    nextOrderId: nextOrderId.toString(),
    nextAssetId: nextAssetId.toString(),
    orderRowCount: orderRows.length,
    assetRowCount: assetRows.length,
    orderEventCount: orderEvents.length,
    assetEventCount: assetEvents.length,
    sqlOut,
    applyLinked: Boolean(options.applyLinked && !options.dryRun),
    applyResult,
    warnings,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
