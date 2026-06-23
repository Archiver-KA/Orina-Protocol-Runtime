#!/usr/bin/env node

import fs from 'node:fs/promises';
import {
  createPublicClient,
  decodeEventLog,
  http,
} from 'viem';
import { bscTestnet } from 'viem/chains';

const CHAIN_ID = 97;
const MARKETPLACE = '0x18E1C8ab257FAf16Ec8257A9715d07661194150B';
const ASSET_CONTRACT = '0x3a591AB1aB3A281f999AAD1644b020CbEC463C47';
const DEFAULT_RPC_URL = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/';

const MARKETPLACE_ABI = [
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
];

const ERC20_ABI = [
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
];

function parseEnv(text) {
  const result = {};
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index <= 0) continue;
    result[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^["']|["']$/g, '');
  }
  return result;
}

function jsonSafe(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]));
  }
  return value;
}

async function restRequest({ baseUrl, key, path, method = 'GET', body, prefer }) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} failed ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function statusFromOrder(order) {
  if (order[19]) return 'finalized';
  if (Number(order[13]) === 2) return 'disputed';
  if (Number(order[13]) === 1) return 'paid';
  return order[20] ? 'pending_payment' : 'pending_seller_confirm';
}

async function syncReport({ reportPath, env, client }) {
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  const orderId = BigInt(report.orderId);
  const order = await client.readContract({ address: MARKETPLACE, abi: MARKETPLACE_ABI, functionName: 'orders', args: [orderId] });
  const [symbol, decimals, catalogRows] = await Promise.all([
    client.readContract({ address: order[4], abi: ERC20_ABI, functionName: 'symbol' }),
    client.readContract({ address: order[4], abi: ERC20_ABI, functionName: 'decimals' }),
    restRequest({
      baseUrl: env.VITE_SUPABASE_URL,
      key: env.SUPABASE_SERVICE_ROLE_KEY || env.ATP2_SUPABASE_SERVICE_ROLE_KEY,
      path: `assets_catalog?select=asset_uid,title&chain_id=eq.${CHAIN_ID}&contract_address=ilike.${ASSET_CONTRACT}&token_id=eq.${order[5]}&limit=1`,
    }),
  ]);
  const catalog = catalogRows?.[0] || null;
  const txHashes = Object.values(report.orderTxs || {}).filter((value) => /^0x[a-fA-F0-9]{64}$/.test(String(value)));
  const events = [];

  for (const txHash of txHashes) {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    const block = await client.getBlock({ blockNumber: receipt.blockNumber });
    for (const log of receipt.logs || []) {
      if (String(log.address).toLowerCase() !== MARKETPLACE.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({ abi: MARKETPLACE_ABI, data: log.data, topics: log.topics });
        if (String(decoded.args.orderId ?? '') !== orderId.toString()) continue;
        events.push({
          event_name: decoded.eventName,
          chain_id: CHAIN_ID,
          tx_hash: receipt.transactionHash.toLowerCase(),
          log_index: Number(log.logIndex ?? 0),
          block_number: receipt.blockNumber.toString(),
          block_time: new Date(Number(block.timestamp) * 1000).toISOString(),
          payload: {
            sourceContract: 'marketplace',
            contractAddress: MARKETPLACE.toLowerCase(),
            orderUid: orderId.toString(),
            args: jsonSafe(decoded.args),
            backfillSource: 'v3_5_beta_dual_token_smoke_report',
          },
        });
      } catch {
        // Ignore unrelated marketplace logs.
      }
    }
  }

  const row = {
    order_uid: orderId.toString(),
    chain_id: CHAIN_ID,
    marketplace_contract: MARKETPLACE.toLowerCase(),
    asset_contract: ASSET_CONTRACT.toLowerCase(),
    asset_token_id: order[5].toString(),
    buyer_address: String(order[0]).toLowerCase(),
    seller_address: String(order[1]).toLowerCase(),
    status: statusFromOrder(order),
    amount: order[6].toString(),
    price_per_unit: order[6] > 0n ? (order[7] / order[6]).toString() : order[7].toString(),
    total_value: order[7].toString(),
    currency_symbol: symbol,
    metadata: {
      projection_state: 'chain_receipt_backfill',
      status_source: 'chain_receipt_backfill',
      canonical_status_source: 'chain_projection',
      phase: 'v3.5-beta-dual-token-phase-2',
      sourceReport: reportPath,
      assetUid: catalog?.asset_uid || report.assetUid,
      assetName: catalog?.title || null,
      paymentToken: String(order[4]).toLowerCase(),
      paymentTokenSymbol: symbol,
      paymentTokenDecimals: Number(decimals),
      orderTxs: report.orderTxs,
      chainSnapshot: {
        state: Number(order[13]),
        finalized: Boolean(order[19]),
        sellerConfirmed: Boolean(order[20]),
        paidAt: order[9].toString(),
      },
    },
  };

  const orderRows = await restRequest({
    baseUrl: env.VITE_SUPABASE_URL,
    key: env.SUPABASE_SERVICE_ROLE_KEY || env.ATP2_SUPABASE_SERVICE_ROLE_KEY,
    path: 'protocol_orders?on_conflict=chain_id,marketplace_contract,order_uid',
    method: 'POST',
    body: [row],
    prefer: 'resolution=merge-duplicates,return=representation',
  });
  const protocolOrder = orderRows?.[0];
  if (!protocolOrder?.id) throw new Error(`Projection upsert returned no id for order ${orderId}`);

  if (events.length > 0) {
    await restRequest({
      baseUrl: env.VITE_SUPABASE_URL,
      key: env.SUPABASE_SERVICE_ROLE_KEY || env.ATP2_SUPABASE_SERVICE_ROLE_KEY,
      path: 'protocol_order_events?on_conflict=chain_id,tx_hash,log_index',
      method: 'POST',
      body: events.map((event) => ({ ...event, order_id: protocolOrder.id })),
      prefer: 'resolution=merge-duplicates,return=minimal',
    });
  }

  return { orderId: orderId.toString(), symbol, eventCount: events.length, status: row.status };
}

async function main() {
  const reportPaths = process.argv.slice(2);
  if (reportPaths.length === 0) throw new Error('Provide one or more smoke report JSON paths');
  const env = parseEnv(await fs.readFile('.env', 'utf8'));
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.ATP2_SUPABASE_SERVICE_ROLE_KEY;
  if (!env.VITE_SUPABASE_URL || !key) throw new Error('Supabase URL/service role env is missing');
  const client = createPublicClient({
    chain: bscTestnet,
    transport: http(process.env.BSC_TESTNET_RPC_URL || process.env.RPC_URL || DEFAULT_RPC_URL),
  });
  const results = [];
  for (const reportPath of reportPaths) results.push(await syncReport({ reportPath, env, client }));
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
