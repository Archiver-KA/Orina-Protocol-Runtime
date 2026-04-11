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

import { Context, Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAuthenticatedWallet } from "./request-auth.ts";

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

const BALANCE_OF_SELECTOR = "0x70a08231";
const OWNER_OF_SELECTOR = "0x6352211e";
const RECEIPTS_SELECTOR = "0x0f7ee1ec";

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

function encodeUint256(value: number | bigint): string {
  return BigInt(value).toString(16).padStart(64, "0");
}

function encodeAddress(address: string): string {
  return normalizeAddress(address).replace(/^0x/, "").padStart(64, "0");
}

function decodeWord(data: string, index: number): string {
  const normalized = data.startsWith("0x") ? data.slice(2) : data;
  const start = index * 64;
  return normalized.slice(start, start + 64).padStart(64, "0");
}

function decodeAddressResult(data: string): string | null {
  const normalized = data.startsWith("0x") ? data.slice(2) : data;
  if (normalized.length < 64) return null;
  return `0x${normalized.slice(normalized.length - 40)}`.toLowerCase();
}

async function sha256Hex(value: string): Promise<string> {
  const input = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return `0x${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
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
  token_id: number;
  order_id: number;
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
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC error: ${JSON.stringify(json.error)}`);
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

async function ethCall(to: string, data: string): Promise<string> {
  const result = await rpcCall("eth_call", [
    {
      to,
      data,
    },
    "latest",
  ]);
  return String(result || "0x");
}

async function readReceiptBalance(walletAddress: string): Promise<number> {
  const data = await ethCall(
    RECEIPT_NFT_ADDRESS,
    `${BALANCE_OF_SELECTOR}${encodeAddress(walletAddress)}`,
  );
  return Number(hexToBigInt(data));
}

async function readReceiptOwner(tokenId: number): Promise<string | null> {
  try {
    const data = await ethCall(
      RECEIPT_NFT_ADDRESS,
      `${OWNER_OF_SELECTOR}${encodeUint256(tokenId)}`,
    );
    return decodeAddressResult(data);
  } catch {
    return null;
  }
}

async function readReceiptState(tokenId: number): Promise<{
  orderId: number;
  assetId: number;
  amount: string;
  assetType: number;
} | null> {
  try {
    const data = await ethCall(
      RECEIPT_NFT_ADDRESS,
      `${RECEIPTS_SELECTOR}${encodeUint256(tokenId)}`,
    );
    const orderId = Number(BigInt(`0x${decodeWord(data, 0)}`));
    const assetId = Number(BigInt(`0x${decodeWord(data, 1)}`));
    const amount = BigInt(`0x${decodeWord(data, 2)}`).toString();
    const assetType = Number(BigInt(`0x${decodeWord(data, 3)}`));
    return {
      orderId,
      assetId,
      amount,
      assetType,
    };
  } catch {
    return null;
  }
}

async function findHighestReceiptTokenId(): Promise<number> {
  const zeroOwner = await readReceiptOwner(0);
  if (!zeroOwner) return -1;

  let low = 0;
  let high = 1;

  while ((await readReceiptOwner(high)) !== null) {
    low = high;
    high *= 2;
    if (high > 1_000_000) break;
  }

  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    if ((await readReceiptOwner(mid)) !== null) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low;
}

async function buildWalletStateReceiptRows(walletAddress: string): Promise<{
  blockNumber: number;
  blockTime: string;
  balance: number;
  highestTokenId: number;
  rows: ProtocolReceiptProjectionRow[];
}> {
  const normalizedWalletAddress = normalizeAddress(walletAddress);
  const balance = await readReceiptBalance(normalizedWalletAddress);
  const blockNumber = await getBlockNumber();
  const blockTime = new Date().toISOString();

  if (balance <= 0) {
    return {
      blockNumber,
      blockTime,
      balance,
      highestTokenId: -1,
      rows: [],
    };
  }

  const highestTokenId = await findHighestReceiptTokenId();
  const rows: ProtocolReceiptProjectionRow[] = [];

  for (let tokenId = 0; tokenId <= highestTokenId && rows.length < balance; tokenId += 1) {
    const ownerAddress = await readReceiptOwner(tokenId);
    if (!ownerAddress || ownerAddress !== normalizedWalletAddress) {
      continue;
    }

    const receiptState = await readReceiptState(tokenId);
    if (!receiptState) {
      continue;
    }

    rows.push({
      token_id: tokenId,
      order_id: receiptState.orderId,
      owner_address: normalizedWalletAddress,
      amount: receiptState.amount,
      asset_type: receiptState.assetType,
      chain_id: CHAIN_ID,
      contract_address: RECEIPT_NFT_ADDRESS.toLowerCase(),
      tx_hash: await sha256Hex(
        `wallet-state:${CHAIN_ID}:${RECEIPT_NFT_ADDRESS.toLowerCase()}:${normalizedWalletAddress}:${tokenId}:${receiptState.orderId}`,
      ),
      log_index: -1,
      block_number: blockNumber,
      block_time: blockTime,
    });
  }

  return {
    blockNumber,
    blockTime,
    balance,
    highestTokenId,
    rows,
  };
}

async function syncWalletReceiptsFromContract(
  supabase: ReturnType<typeof getServiceClient>,
  walletAddress: string,
  existingRows: ProtocolReceiptProjectionRow[],
): Promise<{
  synced: number;
  balance: number;
  highestTokenId: number;
  blockNumber: number;
  blockTime: string;
}> {
  const state = await buildWalletStateReceiptRows(walletAddress);
  const existingTokenIds = new Set(existingRows.map((row) => Number(row.token_id)));
  const missingRows = state.rows.filter((row) => !existingTokenIds.has(Number(row.token_id)));

  if (missingRows.length > 0) {
    const { error } = await supabase
      .from("protocol_receipts")
      .upsert(missingRows, { onConflict: "tx_hash,log_index", ignoreDuplicates: true });

    if (error) {
      throw new Error(`protocol_receipts wallet state upsert failed: ${error.message}`);
    }
  }

  return {
    synced: missingRows.length,
    balance: state.balance,
    highestTokenId: state.highestTokenId,
    blockNumber: state.blockNumber,
    blockTime: state.blockTime,
  };
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

async function syncReceipts(fromBlock?: number, toBlockOverride?: number): Promise<{
  synced: number;
  errors: number;
  fromBlock: number;
  toBlock: number;
}> {
  const supabase = getServiceClient();

  // Determine start block: use provided value, or last synced block + 1
  let startBlock = fromBlock ?? 0;
  if (!fromBlock) {
    const { data: latest } = await supabase
      .from("protocol_receipts")
      .select("block_number")
      .order("block_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    startBlock = latest ? Number(latest.block_number) + 1 : 0;
  }

  const currentBlock = typeof toBlockOverride === "number"
    ? Math.max(startBlock, Math.floor(toBlockOverride))
    : await getBlockNumber();

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
      token_id: Number(r.tokenId),
      order_id: Number(r.orderId),
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
  // Verify service-role: check the Authorization header contains the service role key
  const authHeader = c.req.header("Authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!serviceKey || !authHeader.includes(serviceKey)) {
    return c.json({ error: "Unauthorized — service role required" }, 403);
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    const fromBlock = typeof body.fromBlock === "number" ? body.fromBlock : undefined;
    const toBlock = typeof body.toBlock === "number" ? body.toBlock : undefined;

    const result = await syncReceipts(fromBlock, toBlock);

    return c.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[ReceiptSync] sync error:", error);
    return c.json(
      {
        error: "Sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
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
    const body = await c.req.json().catch(() => ({}));
    const fromBlock = typeof body.fromBlock === "number" ? body.fromBlock : undefined;
    const toBlock = typeof body.toBlock === "number" ? body.toBlock : undefined;
    const supabase = getServiceClient();
    const walletAddress = auth.identity.walletAddress;
    const existingRows = await readWalletReceiptRows(supabase, walletAddress);
    const requestedSyncMode = typeof fromBlock === "number"
      ? "explicit-range"
      : existingRows.length === 0
        ? "wallet-backfill"
        : "incremental";
    let result = {
      synced: 0,
      errors: 0,
      fromBlock: typeof fromBlock === "number" ? fromBlock : 0,
      toBlock: typeof toBlock === "number" ? toBlock : await getBlockNumber(),
    };
    let logSyncError: string | null = null;

    if (typeof fromBlock === "number" || existingRows.length > 0) {
      try {
        result = await syncReceipts(
          typeof fromBlock === "number" ? fromBlock : undefined,
          toBlock,
        );
      } catch (error) {
        logSyncError = error instanceof Error ? error.message : String(error);
      }
    }

    const stateSync = await syncWalletReceiptsFromContract(supabase, walletAddress, existingRows);
    const receipts = await readWalletReceiptRows(supabase, walletAddress);

    return c.json({
      success: true,
      walletAddress,
      syncMode: stateSync.synced > 0 && requestedSyncMode === "wallet-backfill"
        ? "wallet-state-backfill"
        : requestedSyncMode,
      receiptCount: receipts.length,
      stateSync,
      logSyncError,
      receipts,
      ...result,
    });
  } catch (error) {
    console.error("[ReceiptSync] wallet sync error:", error);
    return c.json(
      {
        error: "Wallet receipt sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

export default receiptSyncRouter;
