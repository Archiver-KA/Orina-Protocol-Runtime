/**
 * Receipt NFT Sync — On-chain → Supabase projection
 *
 * Fetches ReceiptMinted events from the RWAReceiptNFT contract and upserts
 * them into the `protocol_receipts` table.
 *
 * Endpoints:
 *   POST /orina-receipt-sync-v1/sync
 *     Body: { fromBlock?: number }
 *     Auth: service-role only (called by cron / admin)
 *
 *   GET /orina-receipt-sync-v1/health
 *     Public health check
 */

import { Context, Hono } from "npm:hono@4.12.29";
import { createClient } from "npm:@supabase/supabase-js@2.100.1";
import { readBoundedJson } from "./bounded-response.ts";
import { requireAuthenticatedWallet } from "./request-auth.ts";
import { checkRateLimit, rateLimitExceededResponse } from "./rate-limiter.ts";

const receiptSyncRouter = new Hono();

// ── Contract constants ──────────────────────────────────────────────────────

const RECEIPT_NFT_ADDRESS =
  Deno.env.get("RECEIPT_NFT_ADDRESS") ||
  "0x73719A7364c72cB0Ee77595773E9596976e298d1";

const BSC_TESTNET_RPC =
  Deno.env.get("BSC_TESTNET_RPC") || "https://data-seed-prebsc-1-s1.binance.org:8545";

const CHAIN_ID = Number(Deno.env.get("RECEIPT_CHAIN_ID") || "97");

// keccak256("ReceiptMinted(uint256,uint256,address,uint256,uint8)")
// Verified via: cast keccak "ReceiptMinted(uint256,uint256,address,uint256,uint8)"
const RECEIPT_MINTED_EVENT_TOPIC =
  "0x69648846b4d81dbed39e23805e28389a593e4eda60f4c02c8b4e5373bf2d7f9f";

// ── Helpers ─────────────────────────────────────────────────────────────────

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

function hexToNumber(hex: string): number {
  return parseInt(hex, 16);
}

function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

function topicToAddress(topic: string): string {
  // indexed address is zero-padded to 32 bytes
  return "0x" + topic.slice(26).toLowerCase();
}

function normalizeAddress(address: string): string {
  return String(address || "").trim().toLowerCase();
}

function isServiceRoleRequest(c: Context): boolean {
  const serviceKey = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  if (!serviceKey) return false;
  const authorization = String(c.req.header("Authorization") || "").trim();
  const apiKey = String(c.req.header("apikey") || "").trim();
  return authorization === `Bearer ${serviceKey}` || apiKey === serviceKey;
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), min), max);
}

interface ReceiptLog {
  tokenId: bigint;
  orderId: bigint;
  ownerAddress: string;
  amount: bigint;
  assetType: number;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  blockTime: Date | null;
}

interface ProtocolReceiptProjectionRow {
  token_id: string;
  order_id: string;
  owner_address: string;
  amount: string;
  asset_type: number;
  chain_id: number;
  contract_address: string;
  tx_hash: string;
  log_index: number;
  block_number: number;
  block_time: string | null;
}

function decodeReceiptMintedLog(log: {
  topics: string[];
  data: string;
  transactionHash: string;
  logIndex: string;
  blockNumber: string;
}): ReceiptLog | null {
  try {
    // topics[0] = event signature
    // topics[1] = indexed tokenId (uint256)
    // topics[2] = indexed orderId (uint256)
    // topics[3] = indexed to (address)
    const tokenId = hexToBigInt(log.topics[1]);
    const orderId = hexToBigInt(log.topics[2]);
    const ownerAddress = topicToAddress(log.topics[3]);

    // data = abi.encode(uint256 amount, uint8 assetType)
    // amount occupies bytes 0..31, assetType occupies bytes 32..63
    const data = log.data.startsWith("0x") ? log.data.slice(2) : log.data;
    const amount = BigInt("0x" + data.slice(0, 64));
    const assetType = parseInt(data.slice(64, 128), 16);

    return {
      tokenId,
      orderId,
      ownerAddress,
      amount,
      assetType,
      txHash: log.transactionHash,
      logIndex: hexToNumber(log.logIndex),
      blockNumber: hexToNumber(log.blockNumber),
      blockTime: null, // filled later from block data if needed
    };
  } catch (err) {
    console.error("[ReceiptSync] Failed to decode log:", err, log);
    return null;
  }
}

// ── JSON-RPC helpers ────────────────────────────────────────────────────────

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(BSC_TESTNET_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const json = await readBoundedJson<any>(res, 1024 * 1024);
  if (json.error) throw new Error('RPC returned an error');
  return json.result;
}

async function getBlockNumber(): Promise<number> {
  const hex = (await rpcCall("eth_blockNumber", [])) as string;
  return hexToNumber(hex);
}

async function getLogs(
  fromBlock: number,
  toBlock: number,
  eventTopic: string,
): Promise<any[]> {
  const result = await rpcCall("eth_getLogs", [
    {
      fromBlock: "0x" + fromBlock.toString(16),
      toBlock: "0x" + toBlock.toString(16),
      address: RECEIPT_NFT_ADDRESS,
      topics: [eventTopic],
    },
  ]);
  return (result as any[]) || [];
}

// ── Sync logic ──────────────────────────────────────────────────────────────

async function readWalletReceiptRows(
  supabase: ReturnType<typeof getServiceClient>,
  walletAddress: string,
): Promise<ProtocolReceiptProjectionRow[]> {
  const { data, error } = await supabase
    .from("protocol_receipts")
    .select("token_id,order_id,owner_address,amount,asset_type,chain_id,contract_address,tx_hash,log_index,block_number,block_time")
    .eq("owner_address", walletAddress)
    .eq("chain_id", CHAIN_ID)
    .eq("contract_address", RECEIPT_NFT_ADDRESS.toLowerCase())
    .order("block_number", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`protocol_receipts wallet lookup failed: ${error.message}`);
  }

  return (data || []) as ProtocolReceiptProjectionRow[];
}

export async function syncReceipts(fromBlock?: number, toBlockOverride?: number): Promise<{
  synced: number;
  errors: number;
  fromBlock: number;
  toBlock: number;
}> {
  const supabase = getServiceClient();
  const chainHead = await getBlockNumber();
  const confirmations = boundedInteger(Deno.env.get("RECEIPT_SYNC_CONFIRMATIONS"), 12, 0, 64);
  const finalizedHead = Math.max(0, chainHead - confirmations);
  const maxSyncSpan = boundedInteger(Deno.env.get("RECEIPT_SYNC_MAX_BLOCK_SPAN"), 50_000, 1, 50_000);

  // Determine start block: use provided value, or last synced block + 1
  let startBlock = fromBlock ?? 0;
  if (fromBlock === undefined) {
    const { data: latest } = await supabase
      .from("protocol_receipts")
      .select("block_number")
      .order("block_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const configuredDeploymentBlock = boundedInteger(
      Deno.env.get("RECEIPT_DEPLOYMENT_BLOCK"),
      0,
      0,
      Number.MAX_SAFE_INTEGER,
    );
    startBlock = latest
      ? Number(latest.block_number) + 1
      : Math.max(configuredDeploymentBlock, finalizedHead - maxSyncSpan + 1);
  }

  if (!Number.isSafeInteger(startBlock) || startBlock < 0) {
    throw new Error("fromBlock must be a non-negative safe integer");
  }
  if (toBlockOverride !== undefined && (!Number.isSafeInteger(toBlockOverride) || toBlockOverride < 0)) {
    throw new Error("toBlock must be a non-negative safe integer");
  }
  const currentBlock = Math.min(
    finalizedHead,
    toBlockOverride === undefined ? finalizedHead : Math.floor(toBlockOverride),
  );
  if (currentBlock < startBlock) {
    return { synced: 0, errors: 0, fromBlock: startBlock, toBlock: currentBlock };
  }
  if (currentBlock - startBlock + 1 > maxSyncSpan) {
    throw new Error(`Requested receipt sync range exceeds ${maxSyncSpan} blocks`);
  }

  // BSC Testnet RPC typically limits to 5000 blocks per getLogs call
  const MAX_RANGE = 5000;
  let synced = 0;
  let errors = 0;

  for (let from = startBlock; from <= currentBlock; from += MAX_RANGE) {
    const to = Math.min(from + MAX_RANGE - 1, currentBlock);

    // We need the actual event topic hash. If the placeholder is still set,
    // try to compute it or use a fallback filter approach.
    let eventTopic = RECEIPT_MINTED_EVENT_TOPIC;

    // Attempt to get logs with the topic
    let logs: any[];
    try {
      logs = await getLogs(from, to, eventTopic);
    } catch (err) {
      console.error(`[ReceiptSync] getLogs failed for range ${from}-${to}:`, err);
      errors++;
      continue;
    }

    if (logs.length === 0) continue;

    const receipts = logs
      .map(decodeReceiptMintedLog)
      .filter((r): r is ReceiptLog => r !== null);

    if (receipts.length === 0) continue;

    // Upsert into protocol_receipts (idempotent via tx_hash + log_index unique)
    const rows = receipts.map((r) => ({
      token_id: r.tokenId.toString(),
      order_id: r.orderId.toString(),
      owner_address: r.ownerAddress,
      amount: r.amount.toString(),
      asset_type: r.assetType,
      chain_id: CHAIN_ID,
      contract_address: RECEIPT_NFT_ADDRESS.toLowerCase(),
      tx_hash: r.txHash,
      log_index: r.logIndex,
      block_number: r.blockNumber,
      block_time: r.blockTime?.toISOString() ?? null,
    }));

    const tokenIds = Array.from(new Set(rows.map((row) => row.token_id)));
    if (tokenIds.length > 0) {
      const { error: deleteSyntheticError } = await supabase
        .from("protocol_receipts")
        .delete()
        .eq("chain_id", CHAIN_ID)
        .eq("contract_address", RECEIPT_NFT_ADDRESS.toLowerCase())
        .lt("log_index", 0)
        .in("token_id", tokenIds);

      if (deleteSyntheticError) {
        console.warn("[ReceiptSync] failed to remove synthetic wallet-state rows:", deleteSyntheticError.message);
      }
    }

    const { error: upsertErr } = await supabase
      .from("protocol_receipts")
      .upsert(rows, { onConflict: "tx_hash,log_index", ignoreDuplicates: true });

    if (upsertErr) {
      console.error("[ReceiptSync] upsert error:", upsertErr.message);
      errors += rows.length;
    } else {
      synced += rows.length;
    }
  }

  return { synced, errors, fromBlock: startBlock, toBlock: currentBlock };
}

// ── Routes ──────────────────────────────────────────────────────────────────

receiptSyncRouter.get("/health", (c: Context) => {
  return c.json({
    ok: true,
    name: "receipt-sync",
    contract: RECEIPT_NFT_ADDRESS,
    chainId: CHAIN_ID,
  });
});

/**
 * Trigger a sync of ReceiptMinted events.
 * Requires service-role authentication (called by cron or admin trigger).
 */
receiptSyncRouter.post("/sync", async (c: Context) => {
  if (!isServiceRoleRequest(c)) {
    return c.json({ error: "Unauthorized — service role required" }, 403);
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    const fromBlock = typeof body.fromBlock === "number" ? body.fromBlock : undefined;
    const toBlock = typeof body.toBlock === "number" ? body.toBlock : undefined;

    const result = await syncReceipts(fromBlock, toBlock);
    if (result.errors > 0) {
      return c.json({ error: "Sync completed with projection errors", ...result }, 502);
    }

    return c.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[ReceiptSync] sync error:", error);
    return c.json(
      {
        error: "Sync failed",
      },
      500
    );
  }
});

receiptSyncRouter.post("/sync-wallet", async (c: Context) => {
  const auth = await requireAuthenticatedWallet(c);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const walletAddress = auth.identity.walletAddress;
    const rateCheck = await checkRateLimit("receipt_wallet_read", walletAddress);
    if (!rateCheck.allowed) return rateLimitExceededResponse(c, rateCheck);

    const supabase = getServiceClient();
    const receipts = await readWalletReceiptRows(supabase, walletAddress);

    return c.json({
      success: true,
      walletAddress,
      syncMode: "projection-read",
      receiptCount: receipts.length,
      receipts,
    });
  } catch (error) {
    console.error("[ReceiptSync] wallet sync error:", error);
    return c.json(
      {
        error: "Wallet receipt sync failed",
      },
      500,
    );
  }
});

export default receiptSyncRouter;
