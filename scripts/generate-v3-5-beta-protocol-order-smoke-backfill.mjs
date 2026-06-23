#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { createPublicClient, decodeEventLog, http } from 'viem';
import { bscTestnet } from 'viem/chains';

const CAMPAIGN_ROOT = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign';
const LEDGER_PATH = path.join(CAMPAIGN_ROOT, 'protocol-order-smoke/v3_5_beta_protocol_336/ledger.json');
const DEFAULT_SQL_OUT = 'supabase/audit/generated_v3_5_beta_protocol_336_order_events.sql';

const CHAIN_ID = 97;
const DEFAULT_RPC_URL = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/';
const MARKETPLACE = '0x18e1c8ab257faf16ec8257a9715d07661194150b';
const ASSET_CONTRACT = '0x3a591ab1ab3a281f999aad1644b020cbec463c47';

const EVENT_ABI = [
  {
    type: 'event',
    name: 'BuyerSigned1',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'signature', type: 'bytes' },
    ],
  },
  {
    type: 'event',
    name: 'SellerSigned',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'signature', type: 'bytes' },
    ],
  },
  {
    type: 'event',
    name: 'BuyerSigned2',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'signature', type: 'bytes' },
    ],
  },
  {
    type: 'event',
    name: 'OrderProposed',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: true, name: 'seller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'SellerConfirmed',
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'DeliveryTimeSet',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'estDeliverySeconds', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'PayDeadlineSet',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'payDeadline', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'DeliveryTimeAccepted',
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'OrderPaid',
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'OrderFinalized',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'settlement', type: 'uint8' },
    ],
  },
];

function parseArgs(argv) {
  const options = {
    sqlOut: DEFAULT_SQL_OUT,
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || process.env.RPC_URL || DEFAULT_RPC_URL,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--sql-out') options.sqlOut = argv[++index] || DEFAULT_SQL_OUT;
    else if (arg === '--rpc-url') options.rpcUrl = argv[++index] || DEFAULT_RPC_URL;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function normalizeAddress(value) {
  return String(value || '').trim().toLowerCase();
}

function jsonSafe(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]));
  }
  return value;
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(jsonSafe(value)))}::jsonb`;
}

function formatUtc(timestampSec) {
  return new Date(Number(timestampSec) * 1000).toISOString();
}

function buildProtocolOrderStatement(item, eventHints) {
  const amount = 1n;
  const grossPrice = 1n;
  const orderUid = item.orderId;
  const row = {
    order_uid: orderUid,
    chain_id: CHAIN_ID,
    marketplace_contract: MARKETPLACE,
    asset_contract: ASSET_CONTRACT,
    asset_token_id: String(item.assetId),
    buyer_address: normalizeAddress(item.buyerAddress),
    seller_address: normalizeAddress(item.sellerAddress),
    status: 'finalized',
    amount: String(amount),
    price_per_unit: amount > 0n ? String(grossPrice / amount) : String(grossPrice),
    total_value: String(grossPrice),
    currency_symbol: '0xae13d989dac2f0debff460ac112a837c89baa7cd',
    metadata: {
      projection_state: 'chain_receipt_backfill',
      status_source: 'chain_receipt_backfill',
      canonical_status_source: 'chain_projection',
      smoke: {
        campaign: 'v3_5_beta_protocol_336',
        sourceLedger: LEDGER_PATH,
        setupTxKeys: ['wbnbDeposit', 'approvePaymentGateway', 'approveMarketplace'].filter((key) => item.txs?.[key]),
        protocolStageTxKeys: ['createOrder', 'sellerConfirm', 'payOrder', 'confirmDelivery'],
      },
      deploymentScope: {
        chainId: CHAIN_ID,
        marketplaceContract: MARKETPLACE,
        assetContract: ASSET_CONTRACT,
      },
      ledger: {
        assetUid: item.assetUid,
        assetTitle: item.assetTitle,
        sellerProfileId: item.sellerProfileId,
        buyerProfileId: item.buyerProfileId,
        txs: item.txs,
        blocks: item.blocks,
      },
      chainSnapshot: {
        state: 3,
        stateLabel: 'FINALIZED',
        settlementType: 0,
        finalized: true,
        sellerConfirmed: true,
        buyerSig1Present: true,
        sellerSigPresent: true,
        buyerSig2Present: true,
        proposedBlock: item.blocks?.createOrder || null,
        sellerConfirmedBlock: item.blocks?.sellerConfirm || null,
        paidBlock: item.blocks?.payOrder || null,
        finalizedBlock: item.blocks?.confirmDelivery || null,
        eventHints,
      },
    },
  };

  return [
    'insert into public.protocol_orders (',
    '  order_uid, chain_id, marketplace_contract, asset_contract, asset_token_id, buyer_address, seller_address,',
    '  status, amount, price_per_unit, total_value, currency_symbol, metadata',
    ') values (',
    `  ${sqlString(row.order_uid)},`,
    `  ${row.chain_id},`,
    `  ${sqlString(row.marketplace_contract)},`,
    `  ${sqlString(row.asset_contract)},`,
    `  ${sqlString(row.asset_token_id)},`,
    `  ${sqlString(row.buyer_address)},`,
    `  ${sqlString(row.seller_address)},`,
    `  ${sqlString(row.status)},`,
    `  ${sqlString(row.amount)},`,
    `  ${sqlString(row.price_per_unit)},`,
    `  ${sqlString(row.total_value)},`,
    `  ${sqlString(row.currency_symbol)},`,
    `  ${sqlJson(row.metadata)}`,
    ')',
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
  ].join('\n');
}

function buildEventStatement(event) {
  const payload = {
    sourceContract: 'marketplace',
    contractAddress: MARKETPLACE,
    orderUid: event.orderUid,
    args: event.args,
    backfillSource: 'v3_5_beta_protocol_336_receipt',
  };

  return [
    'insert into public.protocol_order_events (',
    '  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload',
    ') values (',
    `  (select id from public.protocol_orders where chain_id = ${CHAIN_ID} and marketplace_contract = ${sqlString(MARKETPLACE)} and order_uid = ${sqlString(event.orderUid)}),`,
    `  ${sqlString(event.eventName)},`,
    `  ${CHAIN_ID},`,
    `  ${sqlString(event.txHash)},`,
    `  ${event.logIndex},`,
    `  ${event.blockNumber},`,
    `  ${sqlString(event.blockTime)}::timestamptz,`,
    `  ${sqlJson(payload)}`,
    ')',
    'on conflict (chain_id, tx_hash, log_index) do update set',
    '  order_id = excluded.order_id,',
    '  event_name = excluded.event_name,',
    '  block_number = excluded.block_number,',
    '  block_time = excluded.block_time,',
    '  payload = excluded.payload;',
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const ledger = JSON.parse(await fs.readFile(LEDGER_PATH, 'utf8'));
  const items = (ledger.items || []).filter((item) => item.status === 'finalized' && item.orderId);
  const client = createPublicClient({
    chain: bscTestnet,
    transport: http(options.rpcUrl),
  });

  const blockTimes = new Map();
  const orderStatements = [];
  const eventRows = [];

  for (const item of items) {
    const itemEvents = [];
    for (const txHash of Object.values(item.txs || {})) {
      if (!txHash || typeof txHash !== 'string') continue;
      const receipt = await client.getTransactionReceipt({ hash: txHash });
      const blockNumber = receipt.blockNumber.toString();
      if (!blockTimes.has(blockNumber)) {
        const block = await client.getBlock({ blockNumber: receipt.blockNumber });
        blockTimes.set(blockNumber, formatUtc(block.timestamp));
      }
      const blockTime = blockTimes.get(blockNumber);

      for (const log of receipt.logs || []) {
        if (normalizeAddress(log.address) !== MARKETPLACE) continue;
        try {
          const decoded = decodeEventLog({
            abi: EVENT_ABI,
            data: log.data,
            topics: log.topics,
          });
          const decodedOrderId = String(decoded.args.orderId ?? '');
          if (decodedOrderId !== item.orderId) continue;
          eventRows.push({
            orderUid: item.orderId,
            eventName: decoded.eventName,
            txHash: receipt.transactionHash,
            logIndex: Number(log.logIndex ?? 0),
            blockNumber,
            blockTime,
            args: decoded.args,
          });
          itemEvents.push(decoded.eventName);
        } catch {
          // Ignore non-order marketplace logs.
        }
      }
    }
    orderStatements.push(buildProtocolOrderStatement(item, itemEvents));
  }

  const eventStatements = eventRows
    .sort((left, right) => {
      if (BigInt(left.blockNumber) !== BigInt(right.blockNumber)) {
        return BigInt(left.blockNumber) < BigInt(right.blockNumber) ? -1 : 1;
      }
      return left.logIndex - right.logIndex;
    })
    .map(buildEventStatement);

  const sql = [
    'begin;',
    ...orderStatements,
    ...eventStatements,
    'commit;',
    '',
  ].join('\n');

  const sqlOut = path.resolve(process.cwd(), options.sqlOut);
  await fs.mkdir(path.dirname(sqlOut), { recursive: true });
  await fs.writeFile(sqlOut, sql, 'utf8');

  const counts = {};
  for (const event of eventRows) counts[event.eventName] = (counts[event.eventName] || 0) + 1;
  console.log(JSON.stringify({
    ok: true,
    sqlOut,
    orderCount: items.length,
    eventCount: eventRows.length,
    perEventCounts: counts,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
