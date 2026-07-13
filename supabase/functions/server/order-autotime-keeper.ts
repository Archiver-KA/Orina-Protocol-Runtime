import { Context, Hono } from "npm:hono@4.12.29";
import { createClient } from "npm:@supabase/supabase-js@2.100.1";
import { createPublicClient, createWalletClient, decodeEventLog, http } from "npm:viem@2.53.1";
import { privateKeyToAccount } from "npm:viem@2.53.1/accounts";
import { bscTestnet } from "npm:viem@2.53.1/chains";
import { syncReceipts } from "./sync-receipt-nfts.ts";

const router = new Hono();
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEFAULT_CHAIN_ID = Number(Deno.env.get("ORDER_KEEPER_CHAIN_ID") || "97");
const DEFAULT_RPC_URL =
  Deno.env.get("BSC_TESTNET_RPC")
  || Deno.env.get("BSC_TESTNET_RPC_URL")
  || Deno.env.get("RPC_URL")
  || "https://data-seed-prebsc-1-s1.bnbchain.org:8545/";
const DEFAULT_MARKETPLACE =
  Deno.env.get("MARKETPLACE_ATP_ADDRESS")
  || Deno.env.get("MARKETPLACE_ATP")
  || "0xbc6f46000b2709714c3908bb6b71bab67a2d1495";
const DEFAULT_AUTOTIME =
  Deno.env.get("AUTOTIME_MANAGER_ADDRESS")
  || Deno.env.get("AUTOTIME_MANAGER")
  || "0xe8d1ac4463fe0805eb7234ebee51dd85d091622c";
const DEFAULT_DISPUTE =
  Deno.env.get("DISPUTE_MANAGER_ADDRESS")
  || Deno.env.get("DISPUTE_MANAGER")
  || "0x550debf6291a7ea8aa27acc9aca92397972ec47e";
const DEFAULT_ASSET =
  Deno.env.get("ORINA_RWA_ADDRESS")
  || Deno.env.get("ORINA_RWA")
  || "0x72c3477c57097f3791501f3839bb380a019b754f";
const DEFAULT_LIMIT = 50;
const DEFAULT_BATCH_SIZE = 20;
const MAX_LIMIT = 200;
const MAX_BATCH_SIZE = 100;
const DEFAULT_STATUSES = [
  "paid",
  "disputed",
  "pending_delivery",
  "pending_buyer_accept",
  "pending_seller_confirm",
];
const ALLOWED_KEEPER_STATUSES = new Set(DEFAULT_STATUSES);

const MARKETPLACE_READ_ABI = [{
  type: "function",
  name: "orders",
  stateMutability: "view",
  inputs: [{ name: "orderId", type: "uint256" }],
  outputs: [
    { name: "buyer", type: "address" },
    { name: "seller", type: "address" },
    { name: "payer", type: "address" },
    { name: "refundRecipient", type: "address" },
    { name: "paymentToken", type: "address" },
    { name: "assetId", type: "uint256" },
    { name: "amount", type: "uint256" },
    { name: "grossPrice", type: "uint256" },
    { name: "proposedAt", type: "uint256" },
    { name: "paidAt", type: "uint256" },
    { name: "autoReleaseAt", type: "uint256" },
    { name: "estDeliverySeconds", type: "uint256" },
    { name: "payDeadline", type: "uint256" },
    { name: "state", type: "uint8" },
    { name: "settlementType", type: "uint8" },
    {
      name: "split",
      type: "tuple",
      components: [
        { name: "buyerShareBps", type: "uint256" },
        { name: "sellerShareBps", type: "uint256" },
      ],
    },
    { name: "platformFeeBpsSnapshot", type: "uint256" },
    { name: "daoFeeBpsSnapshot", type: "uint256" },
    { name: "burnFeeBpsSnapshot", type: "uint256" },
    { name: "referralFeeBpsSnapshot", type: "uint256" },
    { name: "finalized", type: "bool" },
    { name: "sellerConfirmed", type: "bool" },
    { name: "buyerSig1", type: "bytes" },
    { name: "sellerSig", type: "bytes" },
    { name: "buyerSig2", type: "bytes" },
  ],
}] as const;

const AUTOTIME_WRITE_ABI = [
  {
    type: "function",
    name: "checkAndExecute",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "batchCheckAndExecute",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderIds", type: "uint256[]" }],
    outputs: [],
  },
] as const;

const DISPUTE_READ_ABI = [{
  type: "function",
  name: "disputes",
  stateMutability: "view",
  inputs: [{ name: "orderId", type: "uint256" }],
  outputs: [
    { name: "active", type: "bool" },
    { name: "verdict", type: "uint8" },
    { name: "openedAt", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "extended", type: "bool" },
    { name: "buyerShareBps", type: "uint256" },
    { name: "sellerShareBps", type: "uint256" },
  ],
}] as const;

const ASSET_READ_ABI = [
  { type: "function", name: "unitRegistry", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "getAsset",
    stateMutability: "view",
    inputs: [{ name: "assetId", type: "uint256" }],
    outputs: [{
      name: "asset",
      type: "tuple",
      components: [
        { name: "seller", type: "address" },
        { name: "unitId", type: "uint256" },
        { name: "totalAmount", type: "uint256" },
        { name: "availableAmount", type: "uint256" },
        { name: "consumedAmount", type: "uint256" },
        { name: "active", type: "bool" },
        { name: "expiryAt", type: "uint256" },
        { name: "finalized", type: "bool" },
        { name: "assetType", type: "uint8" },
      ],
    }],
  },
] as const;

const UNIT_READ_ABI = [{
  type: "function",
  name: "getUnit",
  stateMutability: "view",
  inputs: [{ name: "unitId", type: "uint256" }],
  outputs: [{
    name: "unit",
    type: "tuple",
    components: [
      { name: "name", type: "string" },
      { name: "step", type: "uint256" },
      { name: "minAmount", type: "uint256" },
      { name: "active", type: "bool" },
      { name: "locked", type: "bool" },
    ],
  }],
}] as const;

const ERC20_META_ABI = [
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

const ORDER_EVENT_ABI = [
  { type: "event", name: "OrderFinalized", inputs: [{ indexed: true, name: "orderId", type: "uint256" }, { indexed: false, name: "settlement", type: "uint8" }] },
  { type: "event", name: "OrderCancelled", inputs: [{ indexed: true, name: "orderId", type: "uint256" }] },
  { type: "event", name: "OrderCancelledBySeller", inputs: [{ indexed: true, name: "orderId", type: "uint256" }] },
  { type: "event", name: "OrderCancelledByBuyer", inputs: [{ indexed: true, name: "orderId", type: "uint256" }] },
  { type: "event", name: "AutoReleased", inputs: [{ indexed: true, name: "orderId", type: "uint256" }] },
  { type: "event", name: "DisputeExtended", inputs: [{ indexed: true, name: "orderId", type: "uint256" }, { indexed: false, name: "phase1Deadline", type: "uint256" }, { indexed: false, name: "finalDeadline", type: "uint256" }] },
  { type: "event", name: "DisputeResolvedByAgreement", inputs: [{ indexed: true, name: "orderId", type: "uint256" }, { indexed: false, name: "verdict", type: "uint8" }, { indexed: false, name: "buyerShareBps", type: "uint256" }, { indexed: false, name: "sellerShareBps", type: "uint256" }, { indexed: false, name: "signatureCount", type: "uint256" }] },
  { type: "event", name: "DisputeResolvedByArbiter", inputs: [{ indexed: true, name: "orderId", type: "uint256" }, { indexed: false, name: "verdict", type: "uint8" }, { indexed: false, name: "buyerShareBps", type: "uint256" }, { indexed: false, name: "sellerShareBps", type: "uint256" }] },
  { type: "event", name: "DisputeAutoSplit", inputs: [{ indexed: true, name: "orderId", type: "uint256" }, { indexed: false, name: "buyerShareBps", type: "uint256" }, { indexed: false, name: "sellerShareBps", type: "uint256" }, { indexed: false, name: "extended", type: "bool" }] },
] as const;

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

function norm(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function validAddress(value: unknown): value is `0x${string}` {
  return /^0x[a-f0-9]{40}$/.test(norm(value));
}

function keeperPrivateKey() {
  for (const value of [
    Deno.env.get("ORDER_AUTOTIME_KEEPER_PRIVATE_KEY"),
    Deno.env.get("ATP2_ORDER_AUTOTIME_KEEPER_PRIVATE_KEY"),
  ]) {
    const normalized = String(value || "").trim().toLowerCase();
    if (/^0x[a-f0-9]{64}$/.test(normalized)) return normalized as `0x${string}`;
  }
  return null;
}

function config() {
  const privateKey = keeperPrivateKey();
  const marketplace = norm(DEFAULT_MARKETPLACE);
  const autoTimeManager = norm(DEFAULT_AUTOTIME);
  const disputeManager = norm(DEFAULT_DISPUTE);
  const assetContract = norm(DEFAULT_ASSET);
  if (!privateKey) throw new Error("Keeper private key is not configured");
  if (!validAddress(marketplace) || !validAddress(autoTimeManager) || !validAddress(disputeManager) || !validAddress(assetContract)) {
    throw new Error("Runtime contract address configuration is invalid");
  }
  return { privateKey, marketplace, autoTimeManager, disputeManager, assetContract };
}

function requireKeeperAuth(c: Context) {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const cronSecret = String(Deno.env.get("ORDER_AUTOTIME_CRON_SECRET") || "").trim();
  const auth = c.req.header("Authorization") || "";
  const apikey = c.req.header("apikey") || "";
  const providedCronSecret = String(c.req.header("x-order-autotime-secret") || "").trim();
  if (cronSecret.length >= 32 && providedCronSecret === cronSecret) return null;
  if (!serviceKey) return c.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }, 500);
  if (auth !== `Bearer ${serviceKey}` && apikey !== serviceKey) {
    return c.json({ error: "Unauthorized — service role required" }, 403);
  }
  return null;
}

function utc(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

function serialize(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map((entry) => serialize(entry));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) out[key] = serialize(entry);
    return out;
  }
  return value;
}

function parseIds(input: unknown) {
  if (!Array.isArray(input)) return [] as bigint[];
  const out: bigint[] = [];
  const seen = new Set<string>();
  for (const value of input) {
    try {
      const id = BigInt(String(value).trim());
      if (id < 0n || seen.has(id.toString())) continue;
      seen.add(id.toString());
      out.push(id);
      if (out.length >= MAX_LIMIT) break;
    } catch { /* ignore */ }
  }
  return out;
}

function parseStatuses(input: unknown) {
  if (!Array.isArray(input)) return [...DEFAULT_STATUSES];
  const out = input
    .slice(0, DEFAULT_STATUSES.length)
    .map((value) => String(value || "").trim().toLowerCase())
    .filter((value) => ALLOWED_KEEPER_STATUSES.has(value));
  return out.length > 0 ? Array.from(new Set(out)) : [...DEFAULT_STATUSES];
}

function boundedInt(input: unknown, fallback: number, min: number, max: number) {
  const n = Math.trunc(Number(input));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function splitValues(split: any) {
  if (Array.isArray(split)) return { buyer: String(split[0] || 0n), seller: String(split[1] || 0n) };
  return { buyer: String(split?.buyerShareBps || 0n), seller: String(split?.sellerShareBps || 0n) };
}

async function safeRead(client: any, request: any, fallback: any) {
  try {
    return await client.readContract(request);
  } catch {
    return fallback;
  }
}

async function readSnapshot(publicClient: any, cfg: any, orderId: bigint) {
  const [order, dispute] = await Promise.all([
    safeRead(publicClient, { address: cfg.marketplace, abi: MARKETPLACE_READ_ABI, functionName: "orders", args: [orderId] }, null),
    safeRead(publicClient, { address: cfg.disputeManager, abi: DISPUTE_READ_ABI, functionName: "disputes", args: [orderId] }, [false, 0, 0n, 0n, false, 0n, 0n]),
  ]);
  if (!order) return null;
  if (norm(order[0]) === ZERO_ADDRESS && norm(order[1]) === ZERO_ADDRESS && BigInt(order[8] || 0) === 0n) return null;
  return { orderId, order, dispute };
}

function normalizeOrderStatus(snapshot: any) {
  const state = Number(snapshot.order[13]);
  if (Boolean(snapshot.dispute[0])) return "disputed";
  if (Boolean(snapshot.order[20]) || state === 3) return "finalized";
  if (state === 4) return "cancelled";
  if (state === 1 || BigInt(snapshot.order[9]) > 0n) return "paid";
  if (Boolean(snapshot.order[21])) return BigInt(snapshot.order[12]) > 0n ? "pending_buyer_accept" : "pending_delivery";
  return "pending_seller_confirm";
}

function resolveActionable(snapshot: any, nowSec: bigint) {
  const state = Number(snapshot.order[13]);
  if (Boolean(snapshot.order[20]) || state === 3 || state === 4) return null;
  if (state === 0) {
    const proposedAt = BigInt(snapshot.order[8]);
    const payDeadline = BigInt(snapshot.order[12]);
    const sellerConfirmed = Boolean(snapshot.order[21]);
    const sellerDeadline = proposedAt + 24n * 60n * 60n;
    if ((!sellerConfirmed && nowSec >= sellerDeadline) || (sellerConfirmed && payDeadline > 0n && nowSec >= payDeadline)) {
      return { orderId: snapshot.orderId, reason: "auto_cancel", stateName: "PENDING_CONFIRM" };
    }
    return null;
  }
  if (state === 1) {
    const autoReleaseAt = BigInt(snapshot.order[10]);
    const autoFinalizeAt = autoReleaseAt > 0n ? autoReleaseAt + 3n * 24n * 60n * 60n : 0n;
    if (autoFinalizeAt > 0n && nowSec >= autoFinalizeAt) {
      return { orderId: snapshot.orderId, reason: "auto_release", stateName: "PAID", autoFinalizeAt: utc(autoFinalizeAt) };
    }
    return null;
  }
  if (state === 2) {
    const deadline = BigInt(snapshot.dispute[3]);
    if (Boolean(snapshot.dispute[0]) && deadline > 0n && nowSec >= deadline) {
      return { orderId: snapshot.orderId, reason: "stale_dispute", stateName: "DISPUTED", disputeDeadline: utc(deadline) };
    }
  }
  return null;
}

async function readTokenMeta(publicClient: any, tokenAddress: string, cache: Map<string, { address: string; symbol: string; decimals: number }>) {
  const token = norm(tokenAddress);
  if (!token || token === ZERO_ADDRESS) return { address: token, symbol: "ERC20", decimals: 18 };
  const cached = cache.get(token);
  if (cached) return cached;
  const [symbol, decimals] = await Promise.all([
    safeRead(publicClient, { address: token, abi: ERC20_META_ABI, functionName: "symbol" }, null),
    safeRead(publicClient, { address: token, abi: ERC20_META_ABI, functionName: "decimals" }, null),
  ]);
  const meta = { address: token, symbol: typeof symbol === "string" && symbol.trim() ? symbol.trim() : token, decimals: typeof decimals === "number" ? decimals : Number(decimals || 18) };
  cache.set(token, meta);
  return meta;
}

async function buildAssetRows(publicClient: any, cfg: any, snapshots: any[]) {
  const assetIds = Array.from(new Set(snapshots.map((snapshot) => snapshot.order[5].toString()))).map((value) => BigInt(value));
  const unitRegistry = await safeRead(publicClient, { address: cfg.assetContract, abi: ASSET_READ_ABI, functionName: "unitRegistry" }, null);
  const unitCache = new Map<string, any>();
  const rows = [];
  for (const assetId of assetIds) {
    const tuple = await safeRead(publicClient, { address: cfg.assetContract, abi: ASSET_READ_ABI, functionName: "getAsset", args: [assetId] }, null);
    const asset = Array.isArray(tuple) ? tuple[0] : tuple;
    if (!asset || norm(asset.seller) === ZERO_ADDRESS) continue;
    let unit = unitCache.get(asset.unitId.toString());
    if (!unit && validAddress(unitRegistry)) {
      const unitTuple = await safeRead(publicClient, { address: unitRegistry, abi: UNIT_READ_ABI, functionName: "getUnit", args: [asset.unitId] }, null);
      const unitData = Array.isArray(unitTuple) ? unitTuple[0] : unitTuple;
      unit = { unitId: asset.unitId.toString(), unitName: unitData?.name || null };
      unitCache.set(asset.unitId.toString(), unit);
    }
    rows.push({
      chain_id: DEFAULT_CHAIN_ID,
      asset_contract: cfg.assetContract,
      token_id: assetId.toString(),
      owner_address: norm(asset.seller),
      status: asset.finalized ? "finalized" : !asset.active ? "inactive" : asset.availableAmount === 0n ? "sold_out" : "active",
      available_amount: asset.availableAmount.toString(),
      total_amount: asset.totalAmount.toString(),
      metadata: {
        projection_state: "chain_projection",
        owner_source: "chain_projection",
        canonical_owner_source: "chain_projection",
        deploymentScope: { chainId: DEFAULT_CHAIN_ID, assetContract: cfg.assetContract },
        chainSnapshot: {
          assetId: assetId.toString(),
          seller: norm(asset.seller),
          unitId: asset.unitId.toString(),
          unitName: unit?.unitName || null,
          totalAmount: asset.totalAmount.toString(),
          availableAmount: asset.availableAmount.toString(),
          consumedAmount: asset.consumedAmount.toString(),
          totalLocked: (asset.totalAmount - asset.availableAmount - asset.consumedAmount).toString(),
          active: Boolean(asset.active),
          expiryAt: asset.expiryAt.toString(),
          expiryAtIso: utc(asset.expiryAt),
          finalized: Boolean(asset.finalized),
          assetType: Number(asset.assetType),
          assetTypeLabel: Number(asset.assetType) === 1 ? "NFT" : "RWA",
        },
      },
    });
  }
  return rows;
}

async function buildOrderRows(publicClient: any, cfg: any, snapshots: any[], assetRows: any[]) {
  const assetMap = new Map(assetRows.map((row) => [String(row.token_id), row]));
  const tokenCache = new Map<string, { address: string; symbol: string; decimals: number }>();
  const rows = [];
  for (const snapshot of snapshots) {
    const meta = await readTokenMeta(publicClient, snapshot.order[4], tokenCache);
    const assetRow = assetMap.get(snapshot.order[5].toString());
    const unitName = assetRow?.metadata?.chainSnapshot?.unitName || null;
    const split = splitValues(snapshot.order[15]);
    rows.push({
      order_uid: snapshot.orderId.toString(),
      chain_id: DEFAULT_CHAIN_ID,
      marketplace_contract: cfg.marketplace,
      asset_contract: cfg.assetContract,
      asset_token_id: snapshot.order[5].toString(),
      buyer_address: norm(snapshot.order[0]),
      seller_address: norm(snapshot.order[1]),
      status: normalizeOrderStatus(snapshot),
      amount: snapshot.order[6].toString(),
      price_per_unit: (BigInt(snapshot.order[6]) > 0n ? BigInt(snapshot.order[7]) / BigInt(snapshot.order[6]) : BigInt(snapshot.order[7])).toString(),
      total_value: snapshot.order[7].toString(),
      currency_symbol: meta.symbol,
      metadata: {
        projection_state: "chain_projection",
        status_source: "chain_projection",
        canonical_status_source: "chain_projection",
        deploymentScope: { chainId: DEFAULT_CHAIN_ID, marketplaceContract: cfg.marketplace, assetContract: cfg.assetContract },
        paymentToken: meta.address,
        paymentTokenSymbol: meta.symbol,
        paymentTokenDecimals: meta.decimals,
        unitId: assetRow?.metadata?.chainSnapshot?.unitId || null,
        unitName,
        assetName: `Asset #${snapshot.order[5].toString()}`,
        chainSnapshot: {
          buyer: norm(snapshot.order[0]),
          seller: norm(snapshot.order[1]),
          payer: norm(snapshot.order[2]),
          refundRecipient: norm(snapshot.order[3]),
          paymentToken: meta.address,
          paymentTokenSymbol: meta.symbol,
          paymentTokenDecimals: meta.decimals,
          assetId: snapshot.order[5].toString(),
          assetName: `Asset #${snapshot.order[5].toString()}`,
          unitId: assetRow?.metadata?.chainSnapshot?.unitId || null,
          unitName,
          amount: snapshot.order[6].toString(),
          grossPrice: snapshot.order[7].toString(),
          proposedAt: snapshot.order[8].toString(),
          proposedAtIso: utc(snapshot.order[8]),
          paidAt: snapshot.order[9].toString(),
          paidAtIso: utc(snapshot.order[9]),
          autoReleaseAt: snapshot.order[10].toString(),
          autoReleaseAtIso: utc(snapshot.order[10]),
          estDeliverySeconds: snapshot.order[11].toString(),
          payDeadline: snapshot.order[12].toString(),
          payDeadlineIso: utc(snapshot.order[12]),
          state: Number(snapshot.order[13]),
          settlementType: Number(snapshot.order[14]),
          split: { buyerShareBps: split.buyer, sellerShareBps: split.seller },
          platformFeeBpsSnapshot: snapshot.order[16].toString(),
          daoFeeBpsSnapshot: snapshot.order[17].toString(),
          burnFeeBpsSnapshot: snapshot.order[18].toString(),
          referralFeeBpsSnapshot: snapshot.order[19].toString(),
          finalized: Boolean(snapshot.order[20]),
          sellerConfirmed: Boolean(snapshot.order[21]),
          sellerConfirmedAt: Boolean(snapshot.order[21]) ? snapshot.order[8].toString() : "0",
          sellerConfirmedAtIso: Boolean(snapshot.order[21]) ? utc(snapshot.order[8]) : null,
          buyerSig1Present: String(snapshot.order[22] || "").toLowerCase() !== "0x",
          sellerSigPresent: String(snapshot.order[23] || "").toLowerCase() !== "0x",
          buyerSig2Present: String(snapshot.order[24] || "").toLowerCase() !== "0x",
          disputedActive: Boolean(snapshot.dispute[0]),
          disputeVerdict: Number(snapshot.dispute[1]),
          disputeOpenedAt: snapshot.dispute[2].toString(),
          disputeOpenedAtIso: utc(snapshot.dispute[2]),
          disputeDeadline: snapshot.dispute[3].toString(),
          disputeDeadlineIso: utc(snapshot.dispute[3]),
          disputeExtended: Boolean(snapshot.dispute[4]),
          disputeBuyerShareBps: snapshot.dispute[5].toString(),
          disputeSellerShareBps: snapshot.dispute[6].toString(),
        },
      },
    });
  }
  return rows;
}

async function candidateIds(supabase: any, cfg: any, statuses: string[], limit: number) {
  let query = supabase.from("protocol_orders").select("order_uid,status").eq("chain_id", DEFAULT_CHAIN_ID).eq("marketplace_contract", cfg.marketplace).limit(limit).order("updated_at", { ascending: true });
  if (statuses.length > 0) query = query.in("status", statuses);
  const { data, error } = await query;
  if (error) throw new Error(`protocol_orders lookup failed: ${error.message}`);
  return parseIds((data || []).map((row: any) => row.order_uid).filter(Boolean));
}

async function executeChunk(publicClient: any, walletClient: any, cfg: any, chunk: bigint[]) {
  const functionName = chunk.length === 1 ? "checkAndExecute" : "batchCheckAndExecute";
  const args = chunk.length === 1 ? [chunk[0]] : [chunk];
  const simulation = await publicClient.simulateContract({ account: walletClient.account, address: cfg.autoTimeManager, abi: AUTOTIME_WRITE_ABI, functionName, args });
  const hash = await walletClient.writeContract(simulation.request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return {
    hash,
    blockNumber: BigInt(receipt.blockNumber),
    inputOrderIds: chunk.map((value) => value.toString()),
    logs: receipt.logs.map((log: any) => ({
      address: norm(log.address),
      data: String(log.data || "0x"),
      topics: (log.topics || []).map((topic: any) => String(topic)),
      transactionHash: String(log.transactionHash || hash).toLowerCase(),
      logIndex: Number(log.logIndex),
      blockNumber: BigInt(log.blockNumber),
    })),
  };
}

async function runExecutions(publicClient: any, walletClient: any, cfg: any, orderIds: bigint[], batchSize: number) {
  const receipts = [];
  const failures = [];
  for (let index = 0; index < orderIds.length; index += batchSize) {
    const chunk = orderIds.slice(index, index + batchSize);
    try {
      receipts.push(await executeChunk(publicClient, walletClient, cfg, chunk));
    } catch (error) {
      if (chunk.length === 1) {
        failures.push({ orderIds: chunk.map((value) => value.toString()), error: error instanceof Error ? error.message : String(error) });
        continue;
      }
      for (const orderId of chunk) {
        try {
          receipts.push(await executeChunk(publicClient, walletClient, cfg, [orderId]));
        } catch (singleError) {
          failures.push({ orderIds: [orderId.toString()], error: singleError instanceof Error ? singleError.message : String(singleError) });
        }
      }
    }
  }
  return { receipts, failures };
}

async function decodeOrderEvents(publicClient: any, receipts: any[], cfg: any) {
  const blockTimes = new Map<string, string>();
  const rows = [];
  for (const receipt of receipts) {
    const blockKey = receipt.blockNumber.toString();
    if (!blockTimes.has(blockKey)) {
      const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
      blockTimes.set(blockKey, new Date(Number(block.timestamp) * 1000).toISOString());
    }
    for (const log of receipt.logs) {
      if (log.address !== cfg.marketplace && log.address !== cfg.disputeManager) continue;
      try {
        const topics = log.topics as [`0x${string}`, ...`0x${string}`[]];
        const decoded = decodeEventLog({ abi: ORDER_EVENT_ABI, data: log.data, topics });
        const orderId = String((decoded.args as any).orderId || "");
        if (!orderId) continue;
        rows.push({
          order_uid: orderId,
          event_name: decoded.eventName,
          chain_id: DEFAULT_CHAIN_ID,
          tx_hash: log.transactionHash,
          log_index: log.logIndex,
          block_number: Number(log.blockNumber),
          block_time: blockTimes.get(blockKey) || null,
          payload: {
            sourceContract: log.address === cfg.marketplace ? "marketplace" : "dispute_manager",
            contractAddress: log.address,
            orderUid: orderId,
            args: serialize(decoded.args),
          },
        });
      } catch { /* ignore unrelated logs */ }
    }
  }
  return rows;
}

router.get("/health", (c: Context) => c.json({
  ok: true,
  name: "order-autotime-keeper",
  chainId: DEFAULT_CHAIN_ID,
  marketplace: norm(DEFAULT_MARKETPLACE),
  autoTimeManager: norm(DEFAULT_AUTOTIME),
  disputeManager: norm(DEFAULT_DISPUTE),
  assetContract: norm(DEFAULT_ASSET),
}));

router.post("/run", async (c: Context) => {
  const denied = requireKeeperAuth(c);
  if (denied) return denied;
  try {
    const body = await c.req.json().catch(() => ({}));
    const cfg = config();
    const supabase = serviceClient();
    const publicClient = createPublicClient({ chain: bscTestnet, transport: http(DEFAULT_RPC_URL) });
    const account = privateKeyToAccount(cfg.privateKey);
    const walletClient = createWalletClient({ account, chain: bscTestnet, transport: http(DEFAULT_RPC_URL) });

    const explicitIds = parseIds(body.orderIds);
    const limit = boundedInt(body.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const batchSize = boundedInt(body.batchSize, DEFAULT_BATCH_SIZE, 1, MAX_BATCH_SIZE);
    const dryRun = body.dryRun === true;
    const syncReceiptProjection = body.syncReceipts !== false;
    const statuses = parseStatuses(body.statuses);

    const orderIds = explicitIds.length > 0 ? explicitIds : await candidateIds(supabase, cfg, statuses, limit);
    const block = await publicClient.getBlock();
    const nowSec = BigInt(block.timestamp);
    const snapshots = (await Promise.all(orderIds.map((orderId) => readSnapshot(publicClient, cfg, orderId)))).filter(Boolean);
    const actionable = snapshots.map((snapshot) => resolveActionable(snapshot, nowSec)).filter(Boolean);

    if (dryRun) {
      return c.json({
        success: true,
        mode: "dry_run",
        keeperAddress: norm(account.address),
        blockTimestamp: nowSec.toString(),
        candidateOrderIds: snapshots.map((snapshot: any) => snapshot.orderId.toString()),
        actionable: serialize(actionable),
      });
    }

    const actionableIds = actionable.map((entry: any) => entry.orderId);
    const executions = actionableIds.length > 0
      ? await runExecutions(publicClient, walletClient, cfg, actionableIds, batchSize)
      : { receipts: [], failures: [] };

    const refreshIds = explicitIds.length > 0
      ? explicitIds
      : Array.from(new Set(executions.receipts.flatMap((receipt: any) => receipt.inputOrderIds))).map((value) => BigInt(value));
    const refreshedSnapshots = (await Promise.all(refreshIds.map((orderId) => readSnapshot(publicClient, cfg, orderId)))).filter(Boolean);
    const assetRows = await buildAssetRows(publicClient, cfg, refreshedSnapshots);
    const orderRows = await buildOrderRows(publicClient, cfg, refreshedSnapshots, assetRows);

    let upsertedOrders: Array<{ id?: string; order_uid?: string }> = [];
    if (orderRows.length > 0) {
      const { data, error: orderUpsertError } = await supabase
        .from("protocol_orders")
        .upsert(orderRows, { onConflict: "chain_id,marketplace_contract,order_uid" })
        .select("id,order_uid");
      if (orderUpsertError) throw new Error(`protocol_orders upsert failed: ${orderUpsertError.message}`);
      upsertedOrders = (data || []) as Array<{ id?: string; order_uid?: string }>;
    }

    if (assetRows.length > 0) {
      const { error: assetUpsertError } = await supabase
        .from("protocol_assets")
        .upsert(assetRows, { onConflict: "chain_id,asset_contract,token_id" });
      if (assetUpsertError) throw new Error(`protocol_assets upsert failed: ${assetUpsertError.message}`);
    }

    const orderIdMap = new Map((upsertedOrders || []).map((row: any) => [String(row.order_uid), String(row.id)]));
    const orderEventRows = (await decodeOrderEvents(publicClient, executions.receipts, cfg))
      .map((row: any) => ({ ...row, order_id: orderIdMap.get(row.order_uid) || null }))
      .filter((row: any) => !!row.order_id)
      .map((row: any) => ({
        order_id: row.order_id,
        event_name: row.event_name,
        chain_id: row.chain_id,
        tx_hash: row.tx_hash,
        log_index: row.log_index,
        block_number: row.block_number,
        block_time: row.block_time,
        payload: row.payload,
      }));

    if (orderEventRows.length > 0) {
      const { error: eventError } = await supabase
        .from("protocol_order_events")
        .upsert(orderEventRows, { onConflict: "chain_id,tx_hash,log_index" });
      if (eventError) throw new Error(`protocol_order_events upsert failed: ${eventError.message}`);
    }

    let receiptProjection = null;
    if (syncReceiptProjection && executions.receipts.length > 0) {
      const blocks = executions.receipts.map((receipt: any) => Number(receipt.blockNumber));
      receiptProjection = await syncReceipts(Math.min(...blocks), Math.max(...blocks));
      if (receiptProjection.errors > 0) {
        throw new Error("Receipt projection sync completed with errors");
      }
    }

    return c.json({
      success: true,
      keeperAddress: norm(account.address),
      blockTimestamp: nowSec.toString(),
      candidateOrderIds: snapshots.map((snapshot: any) => snapshot.orderId.toString()),
      actionable: serialize(actionable),
      executedTxs: executions.receipts.map((receipt: any) => ({ hash: receipt.hash, blockNumber: receipt.blockNumber.toString(), orderIds: receipt.inputOrderIds })),
      failures: executions.failures,
      projection: {
        orderRows: orderRows.length,
        assetRows: assetRows.length,
        orderEvents: orderEventRows.length,
        refreshedOrderIds: orderRows.map((row: any) => row.order_uid),
        refreshedAssetIds: assetRows.map((row: any) => row.token_id),
      },
      receiptProjection,
    });
  } catch (error) {
    console.error("[OrderAutotimeKeeper] run failed:", error);
    return c.json({ error: error instanceof Error ? error.message : "Order autotime keeper failed" }, 500);
  }
});

export default router;
