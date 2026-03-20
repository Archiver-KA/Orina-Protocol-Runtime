#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DEFAULTS = {
  chainId: 97,
  marketplaceContract: '0x6154d16f4f52c1a4157928f136a53ac3b83b510b',
  assetContract: '0xa0c34b5a941420626146bc61e15893bc1f86bf39',
  paymentToken: '0xae13d989dac2f0debff460ac112a837c89baa7cd',
  orderId: '0',
  assetId: '0',
  buyerAddress: '0xB43F3f31fae56C4e8C0be36EC6f84dD5B1571c14',
  sellerAddress: '0x282Be18838D7079C215F49749a9606d77e00888b',
  grossPriceWei: '1000000000000000',
  amount: '1',
  totalAmount: '10',
  estDeliverySeconds: 3 * 24 * 60 * 60,
  platformFeeBps: '100',
  daoFeeBps: '50',
  burnFeeBps: '50',
  assetNamePrefix: 'Smoke RWA Asset',
  assetImage: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=1200&h=1200&fit=crop',
  bridgeFnName: 'make-server-b0d68fc8',
  bridgePathPrefix: '/auth/supabase-claim-bridge',
  mintCreateBroadcast: path.join(
    ROOT_DIR,
    'foundry',
    'broadcast',
    'SmokeMintAndCreateOrder.s.sol',
    '97',
    'run-latest.json'
  ),
  sellerConfirmBroadcast: path.join(
    ROOT_DIR,
    'foundry',
    'broadcast',
    'SmokeSellerConfirm.s.sol',
    '97',
    'run-latest.json'
  ),
};

function parseEnvFile(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    map[key] = value;
  }
  return map;
}

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

function shortAddress(address) {
  const normalized = String(address || '').trim();
  if (normalized.length < 10) return normalized;
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

function formatMintedDate(timestampMs) {
  return new Date(timestampMs).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getReceiptMap(runJson) {
  return new Map((runJson.receipts || []).map((receipt) => [String(receipt.transactionHash).toLowerCase(), receipt]));
}

function findTx(runJson, matcher) {
  const tx = (runJson.transactions || []).find(matcher);
  if (!tx) {
    throw new Error('Required transaction not found in broadcast artifact');
  }
  return tx;
}

function hexToNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.startsWith('0x')) return parseInt(value, 16);
  return Number(value || 0);
}

function toIsoFromHexTimestamp(hexValue) {
  return new Date(hexToNumber(hexValue) * 1000).toISOString();
}

function buildAssetRuntimeRecord(ctx) {
  const mintedAtMs = ctx.mintTimestampSec * 1000;
  const availableAmount = Math.max(0, Number(ctx.totalAmount) - Number(ctx.orderAmount));
  const currentPriceLabel = '0.001 WBNB';

  const details = {
    id: ctx.assetId,
    tokenId: ctx.assetId,
    name: ctx.assetName,
    description: `BSC Testnet smoke-minted RWA imported from on-chain tx ${ctx.mintTxHash}.`,
    category: 'Real World Asset',
    blockchain: 'BSC',
    currentPrice: currentPriceLabel,
    currentPriceUsd: '0',
    image: ctx.assetImage,
    images: [ctx.assetImage],
    properties: [
      { trait_type: 'Unit', value: 'Piece' },
      { trait_type: 'Total Amount', value: Number(ctx.totalAmount) },
      { trait_type: 'Locked Amount', value: Number(ctx.orderAmount) },
    ],
    configurableAttributes: [],
    views: 0,
    favorites: 0,
    totalVolume: '0',
    totalSales: 0,
    currentOwner: ctx.sellerAddress,
    creator: ctx.sellerAddress,
    ownerHistory: [
      {
        address: ctx.sellerAddress,
        timestamp: mintedAtMs,
        txHash: ctx.mintTxHash,
      },
    ],
    priceHistory: [
      {
        timestamp: mintedAtMs,
        price: 0.001,
        priceUsd: 0,
        eventType: 'mint',
      },
    ],
    contractAddress: ctx.assetContract,
    tokenStandard: 'ERC-721',
    mintDate: mintedAtMs,
    verified: false,
    ipfsUrl: `ipfs://runtime-minted/${ctx.assetId}`,
    seller: {
      name: shortAddress(ctx.sellerAddress),
      address: ctx.sellerAddress,
    },
  };

  const myAsset = {
    id: ctx.assetId,
    name: ctx.assetName,
    type: 'RWA',
    category: 'Real World Asset',
    image: ctx.assetImage,
    status: availableAmount > 0 ? 'Active' : 'Sold Out',
    availableAmount,
    totalAmount: Number(ctx.totalAmount),
    minPrice: currentPriceLabel,
    mintedDate: formatMintedDate(mintedAtMs),
  };

  return {
    id: ctx.assetId,
    walletAddress: ctx.sellerAddress,
    assetType: 'RWA',
    createdAt: mintedAtMs,
    txHash: ctx.mintTxHash,
    myAsset,
    details,
  };
}

function buildOrderRuntimeRecord(ctx) {
  const proposedAtMs = ctx.createOrderTimestampSec * 1000;
  const sellerConfirmedAtMs = ctx.sellerConfirmTimestampSec * 1000;
  const autoReleaseAtSec = ctx.sellerConfirmTimestampSec + ctx.estDeliverySeconds;

  return {
    orderId: ctx.orderId,
    buyer: ctx.buyerAddress,
    seller: ctx.sellerAddress,
    assetId: ctx.assetId,
    assetName: ctx.assetName,
    network: 'bnb',
    assetImage: ctx.assetImage,
    amount: ctx.orderAmount,
    grossPrice: ctx.grossPriceWei,
    payDeadline: '0',
    autoReleaseAt: String(autoReleaseAtSec),
    state: 1,
    finalized: false,
    disputed: false,
    sellerConfirmed: true,
    paymentSent: true,
    deliveryConfirmed: false,
    createdAt: proposedAtMs,
    updatedAt: sellerConfirmedAtMs,
    deliveryDeadline: autoReleaseAtSec * 1000,
    proposedAt: String(ctx.createOrderTimestampSec),
    paidAt: String(ctx.sellerConfirmTimestampSec),
    depositedAt: String(ctx.createOrderTimestampSec),
    sellerConfirmedAt: String(ctx.sellerConfirmTimestampSec),
    estDeliverySeconds: String(ctx.estDeliverySeconds),
    paymentToken: ctx.paymentToken,
    platformFeeBpsSnapshot: ctx.platformFeeBps,
    daoFeeBpsSnapshot: ctx.daoFeeBps,
    burnFeeBpsSnapshot: ctx.burnFeeBps,
    selectedAttributes: [],
    settlementType: 0,
    progress: 85,
    signatures: {
      buyer1: true,
      seller: true,
      buyer2: true,
    },
  };
}

async function requestJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!res.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      payload?.hint ||
      `Request failed with status ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function exchangeBridgeToken(ctx) {
  const now = Date.now();
  const url = `${ctx.supabaseUrl}/functions/v1/${ctx.bridgeFnName}${ctx.bridgePathPrefix}/exchange`;
  const payload = await requestJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.anonKey}`,
      apikey: ctx.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress: ctx.sellerAddress,
      walletAuthSession: {
        address: ctx.sellerAddress,
        signedAt: now,
        signature: `0x${'1a'.repeat(65)}`,
        message: `ATP2 runtime importer\nAddress: ${ctx.sellerAddress}\nTime: ${new Date(now).toISOString()}`,
      },
      client: {
        app: 'ATP2',
        phase: 'runtime-importer-smoke',
        requestedAt: new Date().toISOString(),
      },
    }),
  });

  if (!payload?.accessToken) {
    throw new Error('Claim bridge exchange returned no accessToken');
  }

  return payload.accessToken;
}

async function restUpsert(ctx, table, rows, onConflict) {
  const query = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  return requestJson(`${ctx.supabaseUrl}/rest/v1/${table}${query}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      apikey: ctx.anonKey,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
}

async function restSelect(ctx, table, query) {
  return requestJson(`${ctx.supabaseUrl}/rest/v1/${table}${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      apikey: ctx.anonKey,
      Accept: 'application/json',
    },
  });
}

async function main() {
  const env = parseEnvFile(path.join(ROOT_DIR, '.env'));
  const supabaseUrl = String(env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = String(env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  }

  const mintCreateRun = readJson(DEFAULTS.mintCreateBroadcast);
  const sellerConfirmRun = readJson(DEFAULTS.sellerConfirmBroadcast);

  const mintTx = findTx(
    mintCreateRun,
    (tx) => String(tx.function || '').startsWith('mintAsset(')
  );
  const createOrderTx = findTx(
    mintCreateRun,
    (tx) => String(tx.function || '').startsWith('createOrder(')
  );
  const sellerConfirmTx = findTx(
    sellerConfirmRun,
    (tx) => String(tx.function || '').startsWith('sellerConfirm(')
  );

  const mintReceipt = getReceiptMap(mintCreateRun).get(String(mintTx.hash).toLowerCase());
  const createOrderReceipt = getReceiptMap(mintCreateRun).get(String(createOrderTx.hash).toLowerCase());
  const sellerConfirmReceipt = getReceiptMap(sellerConfirmRun).get(String(sellerConfirmTx.hash).toLowerCase());

  if (!mintReceipt || !createOrderReceipt || !sellerConfirmReceipt) {
    throw new Error('Missing receipt(s) in broadcast artifact');
  }

  const ctx = {
    supabaseUrl,
    anonKey,
    bridgeFnName: env.VITE_SUPABASE_AUTH_BRIDGE_FN_NAME || DEFAULTS.bridgeFnName,
    bridgePathPrefix: env.VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX || DEFAULTS.bridgePathPrefix,
    chainId: DEFAULTS.chainId,
    marketplaceContract: DEFAULTS.marketplaceContract,
    assetContract: DEFAULTS.assetContract,
    paymentToken: DEFAULTS.paymentToken,
    orderId: String(process.env.SMOKE_ORDER_ID || env.SMOKE_ORDER_ID || DEFAULTS.orderId),
    assetId: String(process.env.SMOKE_ASSET_ID || env.SMOKE_ASSET_ID || DEFAULTS.assetId),
    buyerAddress: normalizeAddress(createOrderTx.transaction?.from || createOrderTx.from || DEFAULTS.buyerAddress),
    sellerAddress: normalizeAddress(mintTx.transaction?.from || mintTx.from || sellerConfirmTx.transaction?.from || sellerConfirmTx.from || DEFAULTS.sellerAddress),
    grossPriceWei: DEFAULTS.grossPriceWei,
    orderAmount: DEFAULTS.amount,
    totalAmount: DEFAULTS.totalAmount,
    estDeliverySeconds: Number(process.env.SMOKE_EST_DELIVERY_SECONDS || env.SMOKE_EST_DELIVERY_SECONDS || DEFAULTS.estDeliverySeconds),
    platformFeeBps: DEFAULTS.platformFeeBps,
    daoFeeBps: DEFAULTS.daoFeeBps,
    burnFeeBps: DEFAULTS.burnFeeBps,
    assetName:
      String(process.env.SMOKE_ASSET_NAME || env.SMOKE_ASSET_NAME || '').trim() ||
      `${DEFAULTS.assetNamePrefix} #${String(process.env.SMOKE_ASSET_ID || env.SMOKE_ASSET_ID || DEFAULTS.assetId)}`,
    assetImage: DEFAULTS.assetImage,
    mintTxHash: String(mintTx.hash).toLowerCase(),
    createOrderTxHash: String(createOrderTx.hash).toLowerCase(),
    sellerConfirmTxHash: String(sellerConfirmTx.hash).toLowerCase(),
    mintTimestampSec: hexToNumber(mintReceipt.logs?.[0]?.blockTimestamp || mintReceipt.blockNumber),
    createOrderTimestampSec: hexToNumber(createOrderReceipt.logs?.[0]?.blockTimestamp || createOrderReceipt.blockNumber),
    sellerConfirmTimestampSec: hexToNumber(sellerConfirmReceipt.logs?.[1]?.blockTimestamp || sellerConfirmReceipt.blockNumber),
  };

  const assetRuntimeRecord = buildAssetRuntimeRecord(ctx);
  const orderRuntimeRecord = buildOrderRuntimeRecord(ctx);

  const assetRow = {
    chain_id: ctx.chainId,
    asset_contract: ctx.assetContract,
    token_id: ctx.assetId,
    owner_address: ctx.sellerAddress,
    status: 'pending_indexing',
    available_amount: String(assetRuntimeRecord.myAsset.availableAmount),
    total_amount: String(assetRuntimeRecord.myAsset.totalAmount),
    metadata: {
      runtimeMintedAssetVersion: 2,
      projection_state: 'pending_indexing',
      owner_source: 'runtime_shadow',
      canonical_owner_source: 'chain_projection',
      listing_state: 'pending_projection',
      deploymentScope: {
        chainId: ctx.chainId,
        assetContract: ctx.assetContract,
      },
      runtimeRecord: assetRuntimeRecord,
      details: assetRuntimeRecord.details,
      myAsset: assetRuntimeRecord.myAsset,
      assetType: assetRuntimeRecord.assetType,
      txHash: ctx.mintTxHash,
      createdAt: assetRuntimeRecord.createdAt,
      submittedByWallet: ctx.sellerAddress,
      assetLocationSnapshot: null,
      deliverySnapshot: null,
      configurableAttributes: [],
      chainSnapshot: {
        mintTxHash: ctx.mintTxHash,
        sellerConfirmTxHash: ctx.sellerConfirmTxHash,
        blockTime: toIsoFromHexTimestamp(mintReceipt.logs?.[0]?.blockTimestamp || '0x0'),
        totalAmount: Number(ctx.totalAmount),
        lockedAmount: Number(ctx.orderAmount),
      },
    },
  };

  const orderRow = {
    order_uid: ctx.orderId,
    chain_id: ctx.chainId,
    marketplace_contract: ctx.marketplaceContract,
    asset_contract: ctx.assetContract,
    asset_token_id: ctx.assetId,
    buyer_address: ctx.buyerAddress,
    seller_address: ctx.sellerAddress,
    status: 'pending_settlement',
    amount: ctx.orderAmount,
    price_per_unit: ctx.grossPriceWei,
    total_value: ctx.grossPriceWei,
    currency_symbol: ctx.paymentToken,
    metadata: {
      runtimeOrderVersion: 2,
      projection_state: 'pending_settlement',
      status_source: 'runtime_shadow',
      canonical_status_source: 'chain_projection',
      deploymentScope: {
        chainId: ctx.chainId,
        marketplaceContract: ctx.marketplaceContract,
        assetContract: ctx.assetContract,
      },
      runtimeOrder: orderRuntimeRecord,
      selectedAttributes: [],
      chainSnapshot: {
        createOrderTxHash: ctx.createOrderTxHash,
        sellerConfirmTxHash: ctx.sellerConfirmTxHash,
        proposedAt: ctx.createOrderTimestampSec,
        sellerConfirmedAt: ctx.sellerConfirmTimestampSec,
        autoReleaseAt: ctx.sellerConfirmTimestampSec + ctx.estDeliverySeconds,
        state: 'PAID',
        sellerConfirmed: true,
        payDeadline: 0,
      },
    },
  };

  ctx.accessToken = await exchangeBridgeToken(ctx);

  const assetUpsert = await restUpsert(ctx, 'protocol_assets', [assetRow], 'chain_id,asset_contract,token_id');
  const orderUpsert = await restUpsert(ctx, 'protocol_orders', [orderRow], 'chain_id,marketplace_contract,order_uid');

  const [assetVerify] = await restSelect(
    ctx,
    'protocol_assets',
    `?select=id,chain_id,asset_contract,token_id,status,owner_address,metadata&chain_id=eq.${ctx.chainId}&asset_contract=eq.${ctx.assetContract}&token_id=eq.${ctx.assetId}`
  );
  const [orderVerify] = await restSelect(
    ctx,
    'protocol_orders',
    `?select=id,chain_id,marketplace_contract,order_uid,status,buyer_address,seller_address,metadata&chain_id=eq.${ctx.chainId}&marketplace_contract=eq.${ctx.marketplaceContract}&order_uid=eq.${ctx.orderId}`
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        importedAt: new Date().toISOString(),
        assetUpserted: assetUpsert.length,
        orderUpserted: orderUpsert.length,
        asset: {
          id: assetVerify?.id || null,
          token_id: assetVerify?.token_id || null,
          status: assetVerify?.status || null,
          owner_address: assetVerify?.owner_address || null,
        },
        order: {
          id: orderVerify?.id || null,
          order_uid: orderVerify?.order_uid || null,
          status: orderVerify?.status || null,
          buyer_address: orderVerify?.buyer_address || null,
          seller_address: orderVerify?.seller_address || null,
        },
        tx: {
          mint: ctx.mintTxHash,
          createOrder: ctx.createOrderTxHash,
          sellerConfirm: ctx.sellerConfirmTxHash,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        status: error?.status ?? null,
        payload: error?.payload ?? null,
      },
      null,
      2
    )
  );
  process.exit(1);
});
