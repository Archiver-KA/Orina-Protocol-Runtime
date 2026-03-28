#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createPublicClient, decodeEventLog, http } = require('viem');
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
  sqlOut: path.join(ROOT, 'supabase', 'audit', 'generated_protocol_order_events_backfill.sql'),
  chunkSize: 5_000n,
  broadcastDir: path.join(ROOT, 'foundry', 'broadcast'),
};

const MARKETPLACE_EVENT_ABI = [
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
  {
    type: 'event',
    name: 'OrderCancelled',
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'OrderCancelledBySeller',
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'OrderCancelledByBuyer',
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'AutoReleased',
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'DisputeOpened',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: true, name: 'opener', type: 'address' },
    ],
  },
];

const DISPUTE_MANAGER_EVENT_ABI = [
  {
    type: 'event',
    name: 'DisputeExtended',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'phase1Deadline', type: 'uint256' },
      { indexed: false, name: 'finalDeadline', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'DisputeResolvedByAgreement',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'verdict', type: 'uint8' },
      { indexed: false, name: 'buyerShareBps', type: 'uint256' },
      { indexed: false, name: 'sellerShareBps', type: 'uint256' },
      { indexed: false, name: 'signatureCount', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'DisputeResolvedByArbiter',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'verdict', type: 'uint8' },
      { indexed: false, name: 'buyerShareBps', type: 'uint256' },
      { indexed: false, name: 'sellerShareBps', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'DisputeAutoSplit',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'buyerShareBps', type: 'uint256' },
      { indexed: false, name: 'sellerShareBps', type: 'uint256' },
      { indexed: false, name: 'extended', type: 'bool' },
    ],
  },
];

const MARKETPLACE_ORDER_READ_ABI = [
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
      {
        name: 'split',
        type: 'tuple',
        components: [
          { name: 'buyerShareBps', type: 'uint256' },
          { name: 'sellerShareBps', type: 'uint256' },
        ],
      },
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

function parseEnvFile(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
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
    if (key === '--from-block' && next) {
      options.fromBlock = BigInt(next);
      index += 1;
      continue;
    }
    if (key === '--to-block' && next) {
      options.toBlock = BigInt(next);
      index += 1;
      continue;
    }
    if (key === '--chunk-size' && next) {
      options.chunkSize = BigInt(next);
      index += 1;
      continue;
    }
    if (key === '--sql-out' && next) {
      options.sqlOut = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }
    if (key === '--deploy-artifact' && next) {
      options.deployArtifact = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }
    if (key === '--apply-linked') {
      options.applyLinked = true;
      continue;
    }
    if (key === '--dry-run') {
      options.dryRun = true;
      continue;
    }
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
    if (value.startsWith('0x')) {
      try {
        return BigInt(value);
      } catch {
        return fallback;
      }
    }
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
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Deployment artifact not found: ${artifactPath}`);
  }

  const runJson = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const receipts = new Map(
    (runJson.receipts || []).map((receipt) => [
      String(receipt.transactionHash || '').toLowerCase(),
      receipt,
    ]),
  );

  const matched = [];
  for (const tx of runJson.transactions || []) {
    const contractName = String(tx.contractName || '').trim();
    const contractAddress = normalizeAddress(tx.contractAddress || tx.transaction?.to || '');
    const target = targets.find(
      (entry) => entry.contractName === contractName && normalizeAddress(entry.address) === contractAddress,
    );
    if (!target) continue;
    const receipt = receipts.get(String(tx.hash || '').toLowerCase());
    const blockNumber = receipt?.blockNumber ?? tx.receipt?.blockNumber ?? null;
    if (blockNumber === null || blockNumber === undefined) continue;
    matched.push(BigInt(blockNumber));
  }

  if (matched.length === 0) {
    throw new Error('Could not derive deployment start block from artifact');
  }

  return matched.reduce((min, value) => (value < min ? value : min), matched[0]);
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(
      payload?.message ||
      payload?.error ||
      payload?.hint ||
      `HTTP ${response.status}`,
    );
  }
  return payload;
}

async function fetchOrderIdMap({ supabaseUrl, anonKey, chainId, marketplaceAddress }) {
  const baseUrl = String(supabaseUrl || '').replace(/\/+$/, '');
  if (!baseUrl || !anonKey) {
    throw new Error('Missing Supabase URL / anon key for protocol_orders lookup');
  }

  const url =
    `${baseUrl}/rest/v1/protocol_orders` +
    `?select=id,order_uid,chain_id,marketplace_contract` +
    `&chain_id=eq.${chainId}` +
    `&marketplace_contract=eq.${normalizeAddress(marketplaceAddress)}` +
    `&limit=5000`;

  const rows = await fetchJson(url, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      accept: 'application/json',
    },
  });

  const orderIdMap = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.id && row?.order_uid) {
      orderIdMap.set(String(row.order_uid), String(row.id));
    }
  }

  return orderIdMap;
}

async function getDecodedLogsInChunks({
  client,
  address,
  event,
  sourceContract,
  fromBlock,
  toBlock,
  chunkSize,
}) {
  const logs = [];
  let cursor = fromBlock;
  let currentChunkSize = chunkSize;
  while (cursor <= toBlock) {
    const end = cursor + currentChunkSize - 1n > toBlock ? toBlock : cursor + currentChunkSize - 1n;
    try {
      const batch = await client.getLogs({
        address,
        event,
        fromBlock: cursor,
        toBlock: end,
      });
      logs.push(
        ...batch
          .filter((log) => log.args && log.args.orderId !== undefined && log.args.orderId !== null)
          .map((log) => ({
            sourceContract,
            contractAddress: normalizeAddress(address),
            eventName: event.name,
            orderUid: String(log.args.orderId),
            args: toSerializable(log.args),
            txHash: String(log.transactionHash).toLowerCase(),
            logIndex: Number(log.logIndex),
            blockNumber: BigInt(log.blockNumber),
          })),
      );
      cursor = end + 1n;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (currentChunkSize <= 100n) {
        throw new Error(`eth_getLogs failed even at minimal chunk size for ${address} ${event.name}: ${message}`);
      }
      currentChunkSize = currentChunkSize / 2n;
      continue;
    }
  }
  return logs;
}

async function enrichWithBlockTime(client, events) {
  const cache = new Map();
  for (const event of events) {
    const key = event.blockNumber.toString();
    if (!cache.has(key)) {
      cache.set(
        key,
        client.getBlock({ blockNumber: event.blockNumber }).then((block) => block.timestamp),
      );
    }
  }

  const enriched = [];
  for (const event of events) {
    const timestamp = await cache.get(event.blockNumber.toString());
    enriched.push({
      ...event,
      blockTime: new Date(Number(timestamp) * 1000).toISOString(),
    });
  }
  return enriched;
}

function listBroadcastArtifacts(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listBroadcastArtifacts(resolved));
      continue;
    }
    if (entry.isFile() && entry.name === 'run-latest.json') {
      files.push(resolved);
    }
  }
  return files;
}

function decodeArtifactLogs(logs, abi, sourceContract, contractAddress, txHash, blockNumber, blockTimestamp) {
  const decoded = [];
  for (const log of Array.isArray(logs) ? logs : []) {
    if (normalizeAddress(log.address) !== normalizeAddress(contractAddress)) continue;
    try {
      const event = decodeEventLog({
        abi,
        data: log.data || '0x',
        topics: log.topics || [],
        strict: false,
      });
      if (event.args?.orderId === undefined || event.args?.orderId === null) continue;
      decoded.push({
        sourceContract,
        contractAddress: normalizeAddress(contractAddress),
        eventName: event.eventName,
        orderUid: String(event.args.orderId),
        args: toSerializable(event.args),
        txHash: String(txHash).toLowerCase(),
        logIndex: Number(parseBigIntLike(log.logIndex)),
        blockNumber: parseBigIntLike(log.blockNumber, blockNumber),
        blockTime: (() => {
          const timestamp = parseBigIntLike(log.blockTimestamp, blockTimestamp);
          return timestamp > 0n ? new Date(Number(timestamp) * 1000).toISOString() : undefined;
        })(),
      });
    } catch {
      // ignore non-target logs
    }
  }
  return decoded;
}

function collectEventsFromBroadcasts({ broadcastDir, marketplace, disputeManager }) {
  const files = listBroadcastArtifacts(broadcastDir);
  const events = [];
  for (const file of files) {
    const runJson = JSON.parse(fs.readFileSync(file, 'utf8'));
    const receipts = new Map(
      (runJson.receipts || []).map((receipt) => [
        String(receipt.transactionHash || '').toLowerCase(),
        receipt,
      ]),
    );

    for (const tx of runJson.transactions || []) {
      const txHash = String(tx.hash || '').toLowerCase();
      const receipt = receipts.get(txHash);
      if (!receipt) continue;
      const blockNumber = parseBigIntLike(receipt.blockNumber);
      const blockTimestamp = parseBigIntLike(
        receipt.logs?.find?.((entry) => entry?.blockTimestamp)?.blockTimestamp,
        0n,
      );

      events.push(
        ...decodeArtifactLogs(
          receipt.logs,
          MARKETPLACE_EVENT_ABI,
          'marketplace',
          marketplace,
          txHash,
          blockNumber,
          blockTimestamp,
        ),
      );
      events.push(
        ...decodeArtifactLogs(
          receipt.logs,
          DISPUTE_MANAGER_EVENT_ABI,
          'dispute_manager',
          disputeManager,
          txHash,
          blockNumber,
          blockTimestamp,
        ),
      );
    }
  }
  return events;
}

function buildSql(events) {
  const orderStatements = (events.missingOrders || []).map((order) => [
    'insert into public.protocol_orders (',
    '  order_uid, chain_id, marketplace_contract, asset_contract, asset_token_id, buyer_address, seller_address,',
    '  status, amount, price_per_unit, total_value, currency_symbol, metadata',
    ') values (',
    `  ${sqlString(order.order_uid)},`,
    `  ${order.chain_id},`,
    `  ${sqlString(order.marketplace_contract)},`,
    `  ${sqlString(order.asset_contract)},`,
    `  ${sqlString(order.asset_token_id)},`,
    `  ${sqlString(order.buyer_address)},`,
    `  ${sqlString(order.seller_address)},`,
    `  ${sqlString(order.status)},`,
    `  ${sqlString(order.amount)},`,
    `  ${sqlString(order.price_per_unit)},`,
    `  ${sqlString(order.total_value)},`,
    `  ${sqlString(order.currency_symbol)},`,
    `  ${sqlJson(order.metadata)}`,
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
  ].join('\n'));

  const statements = (events.rows || []).map((event) => {
    const payload = {
      sourceContract: event.sourceContract,
      contractAddress: event.contractAddress,
      orderUid: event.orderUid,
      args: event.args,
    };
    const orderIdSql = event.orderIdSql || sqlString(event.orderRowId);

    return [
      'insert into public.protocol_order_events (',
      '  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload',
      ') values (',
      `  ${orderIdSql},`,
      `  ${sqlString(event.eventName)},`,
      `  ${event.chainId},`,
      `  ${sqlString(event.txHash)},`,
      `  ${event.logIndex},`,
      `  ${event.blockNumber.toString()},`,
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
  });

  return ['begin;', ...orderStatements, ...statements, 'commit;', ''].join('\n');
}

function normalizeBackfilledOrderStatus(snapshot) {
  const state = Number(snapshot.state);
  if (snapshot.finalized || state === 3) return 'finalized';
  if (state === 4) return 'cancelled';
  if (state === 2) return 'disputed';
  if (state === 1) return 'paid';
  if (state === 0 && snapshot.sellerConfirmed) return 'pending_buyer_accept';
  return 'pending_seller_confirm';
}

async function buildMissingProtocolOrderRows({
  client,
  marketplace,
  assetContract,
  chainId,
  missingOrderUids,
}) {
  const rows = [];
  for (const orderUid of missingOrderUids) {
    const result = await client.readContract({
      address: marketplace,
      abi: MARKETPLACE_ORDER_READ_ABI,
      functionName: 'orders',
      args: [BigInt(orderUid)],
    });

    const row = {
      order_uid: orderUid,
      chain_id: chainId,
      marketplace_contract: marketplace,
      asset_contract: assetContract,
      asset_token_id: String(result[5]),
      buyer_address: normalizeAddress(result[0]),
      seller_address: normalizeAddress(result[1]),
      status: normalizeBackfilledOrderStatus({
        state: result[13],
        finalized: result[20],
        sellerConfirmed: result[21],
      }),
      amount: String(result[6]),
      price_per_unit:
        result[6] > 0n
          ? String(result[7] / result[6])
          : String(result[7]),
      total_value: String(result[7]),
      currency_symbol: normalizeAddress(result[4]),
      metadata: {
        projection_state: 'chain_backfill',
        status_source: 'chain_backfill',
        canonical_status_source: 'chain_projection',
        deploymentScope: {
          chainId,
          marketplaceContract: marketplace,
          assetContract,
        },
        chainSnapshot: {
          proposedAt: String(result[8]),
          paidAt: String(result[9]),
          autoReleaseAt: String(result[10]),
          estDeliverySeconds: String(result[11]),
          payDeadline: String(result[12]),
          state: Number(result[13]),
          settlementType: Number(result[14]),
          split: {
            buyerShareBps: String(result[15]?.buyerShareBps ?? 0n),
            sellerShareBps: String(result[15]?.sellerShareBps ?? 0n),
          },
          platformFeeBpsSnapshot: String(result[16]),
          daoFeeBpsSnapshot: String(result[17]),
          burnFeeBpsSnapshot: String(result[18]),
          referralFeeBpsSnapshot: String(result[19]),
          finalized: Boolean(result[20]),
          sellerConfirmed: Boolean(result[21]),
          buyerSig1Present: Boolean(result[22] && result[22] !== '0x'),
          sellerSigPresent: Boolean(result[23] && result[23] !== '0x'),
          buyerSig2Present: Boolean(result[24] && result[24] !== '0x'),
        },
      },
    };
    rows.push(row);
  }
  return rows;
}

function runApplyLinked(sqlFile) {
  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['supabase', 'db', 'query', '--linked', '--file', sqlFile],
    {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe'],
    },
  );

  if (result.status !== 0) {
    throw new Error(
      [
        'Failed to apply protocol_order_events backfill via linked Supabase DB.',
        result.stdout || '',
        result.stderr || '',
      ].join('\n').trim(),
    );
  }

  return {
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

async function main() {
  const env = parseEnvFile(path.join(ROOT, '.env'));
  const options = parseArgs(process.argv.slice(2));

  const marketplace = normalizeAddress(process.env.MARKETPLACE_ATP_ADDRESS || DEFAULTS.marketplace);
  const disputeManager = normalizeAddress(process.env.DISPUTE_MANAGER_ADDRESS || DEFAULTS.disputeManager);
  const assetContract = normalizeAddress(process.env.ORINA_RWA_ADDRESS || DEFAULTS.assetContract);
  const chainId = DEFAULTS.chainId;
  const sqlOut = options.sqlOut || DEFAULTS.sqlOut;
  const deployArtifact = options.deployArtifact || DEFAULTS.deployArtifact;
  const chunkSize = options.chunkSize || DEFAULTS.chunkSize;
  const broadcastDir = DEFAULTS.broadcastDir;
  const fromBlock = options.fromBlock ?? readDeploymentStartBlock(deployArtifact, [
    { contractName: 'MarketplaceATP', address: marketplace },
    { contractName: 'DisputeManager', address: disputeManager },
  ]);

  const client = createPublicClient({
    chain: bscTestnet,
    transport: http(process.env.RPC_URL || DEFAULTS.rpcUrl),
  });

  const toBlock = options.toBlock ?? await client.getBlockNumber();
  const orderIdMap = await fetchOrderIdMap({
    supabaseUrl: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY,
    chainId,
    marketplaceAddress: marketplace,
  });

  const decoded = [];
  const warnings = [];
  try {
    for (const event of MARKETPLACE_EVENT_ABI) {
      decoded.push(
        ...(await getDecodedLogsInChunks({
          client,
          address: marketplace,
          event,
          sourceContract: 'marketplace',
          fromBlock,
          toBlock,
          chunkSize,
        })),
      );
    }

    for (const event of DISPUTE_MANAGER_EVENT_ABI) {
      decoded.push(
        ...(await getDecodedLogsInChunks({
          client,
          address: disputeManager,
          event,
          sourceContract: 'dispute_manager',
          fromBlock,
          toBlock,
          chunkSize,
        })),
      );
    }
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }

  decoded.push(
    ...collectEventsFromBroadcasts({
      broadcastDir,
      marketplace,
      disputeManager,
    }),
  );

  const deduped = new Map();
  for (const event of decoded) {
    deduped.set(`${event.txHash}:${event.logIndex}`, event);
  }

  const sortedEvents = Array.from(deduped.values()).sort((left, right) => {
    if (left.blockNumber !== right.blockNumber) {
      return left.blockNumber < right.blockNumber ? -1 : 1;
    }
    return left.logIndex - right.logIndex;
  });

  const needsBlockTime = sortedEvents.some((event) => !event.blockTime);
  const enriched = needsBlockTime ? await enrichWithBlockTime(client, sortedEvents) : sortedEvents;

  const indexedEvents = [];
  let skippedEvents = [];
  const missingOrderUids = new Set();

  for (const event of enriched) {
    const orderRowId = orderIdMap.get(event.orderUid);
    if (!orderRowId) {
      missingOrderUids.add(event.orderUid);
      skippedEvents.push({
        orderUid: event.orderUid,
        eventName: event.eventName,
        txHash: event.txHash,
        logIndex: event.logIndex,
      });
      continue;
    }

    indexedEvents.push({
      ...event,
      orderRowId,
      chainId,
    });
  }

  const missingOrders = await buildMissingProtocolOrderRows({
    client,
    marketplace,
    assetContract,
    chainId,
    missingOrderUids: Array.from(missingOrderUids.values()),
  });
  for (const order of missingOrders) {
    orderIdMap.set(order.order_uid, `__resolve_on_conflict__:${order.order_uid}`);
  }

  const finalIndexedEvents = [];
  const perEventCounts = {};
  for (const event of enriched) {
    finalIndexedEvents.push({
      ...event,
      orderRowId: orderIdMap.get(event.orderUid) || `__resolve_on_conflict__:${event.orderUid}`,
      chainId,
    });
    perEventCounts[event.eventName] = (perEventCounts[event.eventName] || 0) + 1;
  }

  skippedEvents = [];
  const sql = buildSql({
    missingOrders,
    rows: finalIndexedEvents.map((event) => {
      if (!String(event.orderRowId).startsWith('__resolve_on_conflict__:')) {
        return event;
      }
      return {
        ...event,
        orderIdSql: `(select id from public.protocol_orders where chain_id = ${chainId} and marketplace_contract = ${sqlString(marketplace)} and order_uid = ${sqlString(event.orderUid)})`,
      };
    }),
  });
  fs.writeFileSync(sqlOut, sql, 'utf8');

  let applyResult = null;
  if (options.applyLinked && !options.dryRun) {
    applyResult = runApplyLinked(sqlOut);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        chainId,
        marketplace,
        disputeManager,
        fromBlock: fromBlock.toString(),
        toBlock: toBlock.toString(),
        sqlOut,
        indexedEventCount: finalIndexedEvents.length,
        skippedEventCount: skippedEvents.length,
        skippedEvents: skippedEvents.slice(0, 25),
        perEventCounts,
        orderRowsSeen: orderIdMap.size,
        missingOrderRowsBackfilled: missingOrders.length,
        applyLinked: Boolean(options.applyLinked && !options.dryRun),
        applyResult,
        warnings,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
