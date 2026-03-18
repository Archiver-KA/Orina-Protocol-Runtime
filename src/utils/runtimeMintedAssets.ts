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

const RUNTIME_MINTED_ASSETS_STORAGE_KEY = "orina_runtime_minted_assets_v1";
export const RUNTIME_MINTED_ASSETS_CHANGED_EVENT = "orina:runtime-minted-assets-changed";

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
  metadata?: Record<string, unknown> | null;
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
  return {
    chain_id: ACTIVE_CHAIN_ID,
    asset_contract: record.details.contractAddress || CONTRACTS.ORINA_RWA,
    token_id: record.details.tokenId ?? record.id,
    // Owner-facing runtime shadow. Canonical ownership still comes from trusted chain projection.
    owner_address: ownerAddress,
    status: 'pending_indexing',
    available_amount: String(availableAmount),
    total_amount: String(totalAmount),
    metadata: {
      runtimeMintedAssetVersion: 1,
      projection_state: 'pending_indexing',
      owner_source: 'runtime_shadow',
      canonical_owner_source: 'chain_projection',
      listing_state: 'pending_projection',
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
  return isRuntimeMintedAssetRecord(record) ? record : null;
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
        owner_address: encodeEq(normalized),
        status: encodeEq('pending_indexing'),
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
  const records = readLocalRuntimeMintedAssets();
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
