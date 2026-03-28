import { CONTRACTS, ACTIVE_CHAIN_ID } from "@/config/contracts";
import {
  dispatchSyncEvent,
  encodeEq,
  isSupabaseRestEnabled,
  restSelect,
  restUpsert,
  toQuery,
} from "@/utils/supabaseRest";
import type { AssetDetails, MyAssetNft, MyAssetRwa } from "@/types/asset";

const CURRENT_ASSET_CONTRACT = CONTRACTS.ORINA_RWA.toLowerCase();
const RUNTIME_MINTED_ASSETS_STORAGE_KEY = `orina_runtime_minted_assets_v2:${ACTIVE_CHAIN_ID}:${CURRENT_ASSET_CONTRACT}`;
export const RUNTIME_MINTED_ASSETS_CHANGED_EVENT = "orina:runtime-minted-assets-changed";
const DEFAULT_ASSET_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="24" fill="#18181b"/><path d="M36 104l24-28 18 22 20-26 26 32H36z" fill="#2CC295" opacity="0.85"/><circle cx="60" cy="56" r="12" fill="#3f3f46"/></svg>',
  );

export interface RuntimeMintedAssetRecord {
  id: string;
  walletAddress: string;
  assetType: "RWA" | "NFT";
  createdAt: number;
  txHash?: string;
  myAsset: MyAssetRwa | MyAssetNft;
  details: AssetDetails;
}

interface PersistedRuntimeMintedAssetRecord extends Omit<RuntimeMintedAssetRecord, "createdAt"> {
  createdAt: string;
}

interface ProtocolAssetRow {
  id?: string;
  chain_id?: number | null;
  asset_contract?: string | null;
  token_id?: string | null;
  owner_address?: string | null;
  status?: string | null;
  available_amount?: string | number | null;
  total_amount?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

function parseNumberLike(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function parseTimestampMs(value?: string | number | null, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsedDate = Date.parse(value);
    if (Number.isFinite(parsedDate)) return parsedDate;
    const parsedNumber = Number(value);
    if (Number.isFinite(parsedNumber)) return parsedNumber;
  }
  return fallback;
}

function coalesceString(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

function normalizeAssetStatusLabel(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return "Active";
  if (normalized === "sold_out") return "Sold Out";
  return normalized
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildGenericDetails(
  row: ProtocolAssetRow,
  metadata: Record<string, unknown>,
  chainSnapshot: Record<string, unknown>,
  tokenId: string,
  ownerAddress: string,
  createdAt: number,
): AssetDetails {
  const name =
    coalesceString(
      metadata.assetName,
      metadata.name,
      typeof chainSnapshot.assetName === "string" ? chainSnapshot.assetName : undefined,
    ) ?? `Asset #${tokenId}`;
  const unitName =
    coalesceString(
      metadata.unitName,
      typeof chainSnapshot.unitName === "string" ? chainSnapshot.unitName : undefined,
    ) ?? "RWA";
  const totalAmount = parseNumberLike(chainSnapshot.totalAmount ?? row.total_amount, 1);
  const availableAmount = parseNumberLike(chainSnapshot.availableAmount ?? row.available_amount, totalAmount);
  return {
    id: tokenId,
    tokenId,
    name,
    description: `On-chain ${unitName} asset #${tokenId}`,
    category: unitName,
    blockchain: "BSC",
    currentPrice: "0",
    currentPriceUsd: "0",
    image: DEFAULT_ASSET_IMAGE,
    images: [DEFAULT_ASSET_IMAGE],
    properties: [
      { trait_type: "Asset ID", value: tokenId },
      { trait_type: "Unit ID", value: String(chainSnapshot.unitId ?? "0") },
      { trait_type: "Unit Name", value: unitName },
      { trait_type: "Status", value: normalizeAssetStatusLabel(row.status) },
    ],
    views: 0,
    favorites: 0,
    totalVolume: "0",
    totalSales: Math.max(0, totalAmount - availableAmount),
    currentOwner: ownerAddress,
    creator: ownerAddress,
    ownerHistory: [
      {
        address: ownerAddress,
        timestamp: createdAt,
      },
    ],
    priceHistory: [],
    contractAddress: String(row.asset_contract || CONTRACTS.ORINA_RWA),
    tokenStandard: Number(chainSnapshot.assetType) === 1 ? "ERC-721-like" : "RWA",
    mintDate: createdAt,
    verified: true,
    seller: {
      name: "On-chain Seller",
      address: ownerAddress,
    },
  };
}

function isRuntimeMintedAssetRecord(value: unknown): value is RuntimeMintedAssetRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RuntimeMintedAssetRecord>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.walletAddress === "string" &&
    (candidate.assetType === "RWA" || candidate.assetType === "NFT") &&
    typeof candidate.createdAt === "number" &&
    !!candidate.myAsset &&
    !!candidate.details
  );
}

function toPersistedRecord(record: RuntimeMintedAssetRecord): PersistedRuntimeMintedAssetRecord {
  return {
    ...record,
    createdAt: String(record.createdAt),
  };
}

function fromPersistedRecord(record: PersistedRuntimeMintedAssetRecord): RuntimeMintedAssetRecord {
  return {
    ...record,
    createdAt: Number(record.createdAt || 0),
  };
}

function readLocalRuntimeMintedAssets(): RuntimeMintedAssetRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RUNTIME_MINTED_ASSETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedRuntimeMintedAssetRecord[];
    return Array.isArray(parsed)
      ? parsed.map(fromPersistedRecord).filter(isRuntimeMintedAssetRecord)
      : [];
  } catch {
    return [];
  }
}

function writeLocalRuntimeMintedAssets(records: RuntimeMintedAssetRecord[]) {
  if (typeof window === "undefined") return;
  const serialized = records.map(toPersistedRecord);
  window.localStorage.setItem(RUNTIME_MINTED_ASSETS_STORAGE_KEY, JSON.stringify(serialized));
  dispatchSyncEvent(RUNTIME_MINTED_ASSETS_CHANGED_EVENT);
}

function dedupeRuntimeMintedAssets(records: RuntimeMintedAssetRecord[]) {
  const seen = new Map<string, RuntimeMintedAssetRecord>();
  for (const record of records) {
    const key = record.id;
    const existing = seen.get(key);
    if (!existing || existing.createdAt < record.createdAt) {
      seen.set(key, record);
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.createdAt - a.createdAt);
}

function mergeRuntimeMintedAssets(
  localRecords: RuntimeMintedAssetRecord[],
  remoteRecords: RuntimeMintedAssetRecord[],
) {
  return dedupeRuntimeMintedAssets([...remoteRecords, ...localRecords]);
}

function extractAmounts(record: RuntimeMintedAssetRecord) {
  const totalAmount =
    typeof record.details.totalSupply === "number"
      ? record.details.totalSupply
      : Number((record.myAsset as { totalSupply?: number }).totalSupply ?? 1);

  const availableAmount =
    typeof record.details.remainingSupply === "number"
      ? record.details.remainingSupply
      : Number((record.myAsset as { remainingSupply?: number }).remainingSupply ?? totalAmount);

  return {
    totalAmount: Number.isFinite(totalAmount) ? totalAmount : 1,
    availableAmount: Number.isFinite(availableAmount) ? availableAmount : 1,
  };
}

function toProtocolAssetRow(record: RuntimeMintedAssetRecord): ProtocolAssetRow {
  const { totalAmount, availableAmount } = extractAmounts(record);
  const ownerAddress = record.walletAddress.toLowerCase();
  const assetContract = (record.details.contractAddress || CONTRACTS.ORINA_RWA).toLowerCase();
  return {
    chain_id: ACTIVE_CHAIN_ID,
    asset_contract: assetContract,
    token_id: record.details.tokenId ?? record.id,
    // Owner-facing runtime shadow. Canonical ownership still comes from trusted chain projection.
    owner_address: ownerAddress,
    status: 'pending_indexing',
    available_amount: String(availableAmount),
    total_amount: String(totalAmount),
    metadata: {
      runtimeMintedAssetVersion: 2,
      projection_state: 'pending_indexing',
      owner_source: 'runtime_shadow',
      canonical_owner_source: 'chain_projection',
      listing_state: 'pending_projection',
      deploymentScope: {
        chainId: ACTIVE_CHAIN_ID,
        assetContract,
      },
      runtimeRecord: toPersistedRecord(record),
      details: record.details,
      myAsset: record.myAsset,
      assetType: record.assetType,
      txHash: record.txHash ?? null,
      createdAt: record.createdAt,
      submittedByWallet: ownerAddress,
      assetLocationSnapshot: record.details.assetLocationSnapshot ?? null,
      deliverySnapshot: record.details.deliverySnapshot ?? null,
      configurableAttributes: record.details.configurableAttributes ?? [],
    },
  };
}

function fromProtocolAssetRow(row: ProtocolAssetRow): RuntimeMintedAssetRecord | null {
  const metadata = row.metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const runtimeRecord = (metadata as { runtimeRecord?: PersistedRuntimeMintedAssetRecord }).runtimeRecord;
  if (!runtimeRecord) return null;
  const record = fromPersistedRecord(runtimeRecord);
  if (isRuntimeMintedAssetRecord(record)) return record;

  const chainSnapshot =
    typeof (metadata as { chainSnapshot?: unknown }).chainSnapshot === "object"
      ? ((metadata as { chainSnapshot?: Record<string, unknown> }).chainSnapshot ?? {})
      : {};
  if (!row.token_id || !row.owner_address) return null;

  const tokenId = String(row.token_id);
  const ownerAddress = String(row.owner_address).toLowerCase();
  const createdAt = parseTimestampMs(
    coalesceString(
      typeof chainSnapshot.mintedBlockTime === "string" ? chainSnapshot.mintedBlockTime : undefined,
      row.created_at,
    ),
    Date.now(),
  );
  const details = buildGenericDetails(row, metadata, chainSnapshot, tokenId, ownerAddress, createdAt);
  const totalAmount = parseNumberLike(chainSnapshot.totalAmount ?? row.total_amount, 1);
  const availableAmount = parseNumberLike(chainSnapshot.availableAmount ?? row.available_amount, totalAmount);
  const assetType = Number(chainSnapshot.assetType) === 1 ? "NFT" : "RWA";

  if (assetType === "NFT") {
    const nftRecord: RuntimeMintedAssetRecord = {
      id: tokenId,
      walletAddress: ownerAddress,
      assetType: "NFT",
      createdAt,
      txHash:
        typeof chainSnapshot.mintedTxHash === "string" && chainSnapshot.mintedTxHash.startsWith("0x")
          ? chainSnapshot.mintedTxHash
          : undefined,
      myAsset: {
        id: tokenId,
        name: details.name,
        type: "NFT",
        category: details.category,
        image: details.image,
        currentPrice: "0",
        floorPrice: "0",
        collection: "On-chain",
        transferable: true,
      },
      details,
    };
    return nftRecord;
  }

  const rwaRecord: RuntimeMintedAssetRecord = {
    id: tokenId,
    walletAddress: ownerAddress,
    assetType: "RWA",
    createdAt,
    txHash:
      typeof chainSnapshot.mintedTxHash === "string" && chainSnapshot.mintedTxHash.startsWith("0x")
        ? chainSnapshot.mintedTxHash
        : undefined,
    myAsset: {
      id: tokenId,
      name: details.name,
      type: "RWA",
      category: details.category,
      image: details.image,
      status: normalizeAssetStatusLabel(row.status),
      availableAmount,
      totalAmount,
      minPrice: "0",
      mintedDate: new Date(createdAt).toISOString().slice(0, 10),
    },
    details: {
      ...details,
      totalVolume: String(Math.max(0, totalAmount - availableAmount)),
    },
  };
  return rwaRecord;
}

async function syncRuntimeMintedAssetToSupabase(record: RuntimeMintedAssetRecord) {
  if (!isSupabaseRestEnabled()) return;
  try {
    await restUpsert<ProtocolAssetRow>("protocol_assets", [toProtocolAssetRow(record)], {
      onConflict: "chain_id,asset_contract,token_id",
    });
    // Marketplace/Search catalog is a public projection and must not be authored directly by clients.
    // The catalog should be populated by a trusted projection/indexing path after chain/runtime settlement.
  } catch (error) {
    console.warn("[runtimeMintedAssets] Failed to sync minted asset to Supabase", error);
  }
}

export async function hydrateRuntimeMintedAssetsFromSupabase(walletAddress?: string | null) {
  if (!isSupabaseRestEnabled() || !walletAddress) {
    return loadRuntimeMintedAssets(walletAddress);
  }

  try {
    const normalized = walletAddress.toLowerCase();
    const remoteRows = await restSelect<ProtocolAssetRow>(
      "protocol_assets",
      toQuery({
        chain_id: encodeEq(ACTIVE_CHAIN_ID),
        asset_contract: encodeEq(CURRENT_ASSET_CONTRACT),
        owner_address: encodeEq(normalized),
      }),
    );
    const remoteRecords = remoteRows
      .map(fromProtocolAssetRow)
      .filter((value): value is RuntimeMintedAssetRecord => !!value)
      .filter((record) => record.walletAddress.toLowerCase() === normalized);
    const merged = mergeRuntimeMintedAssets(readLocalRuntimeMintedAssets(), remoteRecords);
    writeLocalRuntimeMintedAssets(merged);
    return loadRuntimeMintedAssets(walletAddress);
  } catch (error) {
    console.warn("[runtimeMintedAssets] Failed to hydrate minted assets from Supabase", error);
    return loadRuntimeMintedAssets(walletAddress);
  }
}

export function loadRuntimeMintedAssets(walletAddress?: string | null) {
  const records = readLocalRuntimeMintedAssets().filter((record) => {
    const assetContract = String(record.details.contractAddress || CONTRACTS.ORINA_RWA).toLowerCase();
    return assetContract === CURRENT_ASSET_CONTRACT;
  });
  if (!walletAddress) return records;
  const normalized = walletAddress.toLowerCase();
  return records.filter((record) => record.walletAddress.toLowerCase() === normalized);
}

export function saveRuntimeMintedAssets(records: RuntimeMintedAssetRecord[]) {
  writeLocalRuntimeMintedAssets(dedupeRuntimeMintedAssets(records));
}

export function upsertRuntimeMintedAsset(record: RuntimeMintedAssetRecord) {
  const current = readLocalRuntimeMintedAssets();
  const next = dedupeRuntimeMintedAssets([record, ...current.filter((item) => item.id !== record.id)]);
  writeLocalRuntimeMintedAssets(next);
  void syncRuntimeMintedAssetToSupabase(record);
}

export function getRuntimeMintedAssetDetailsById(assetId: string) {
  return readLocalRuntimeMintedAssets().find((record) => record.id === assetId)?.details ?? null;
}

export function loadRuntimeMyAssets(walletAddress?: string | null) {
  const records = loadRuntimeMintedAssets(walletAddress);
  const rwaAssets = records
    .filter((record): record is RuntimeMintedAssetRecord & { assetType: "RWA"; myAsset: MyAssetRwa } => record.assetType === "RWA")
    .map((record) => record.myAsset);

  const nftAssets = records
    .filter((record): record is RuntimeMintedAssetRecord & { assetType: "NFT"; myAsset: MyAssetNft } => record.assetType === "NFT")
    .map((record) => record.myAsset);

  return { rwaAssets, nftAssets };
}

export function subscribeToRuntimeMintedAssets(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(RUNTIME_MINTED_ASSETS_CHANGED_EVENT, handler as EventListener);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(RUNTIME_MINTED_ASSETS_CHANGED_EVENT, handler as EventListener);
    window.removeEventListener("storage", handler);
  };
}
