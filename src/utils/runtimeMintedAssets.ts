/**
 * @deprecated Phase 4 - Hybrid wallet data: Runtime minted assets.
 * localStorage persistence should migrate to remote-first via the
 * protocol_runtime_minted_assets (000005) server table.
 * See spec: 15-local-api-audit-and-server-migration-plan.md
 */
import { CONTRACTS, ACTIVE_CHAIN_ID } from "@/config/contracts";
import {
  dispatchSyncEvent,
  encodeEq,
  isSupabaseRestEnabled,
  restSelect,
  toQuery,
} from "@/utils/supabaseRest";
import type { AssetDetails, MyAssetNft, MyAssetRwa } from "@/types/asset";
import {
  getProtocolNetworkOptionByKey,
  PROTOCOL_NETWORK_STORAGE_KEY,
} from "@/utils/protocolNetwork";
import { normalizeCategoryFilterValue } from "@/utils/taxonomy";

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

export interface RuntimeMintedAssetScope {
  chainId?: number | null;
  assetContract?: string | null;
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

function looksLikeAddress(value?: string | null) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function readStoredRuntimeMintedAssetScope(): RuntimeMintedAssetScope {
  if (typeof window === "undefined") {
    return {
      chainId: ACTIVE_CHAIN_ID,
      assetContract: CONTRACTS.ORINA_RWA,
    };
  }

  try {
    const selectedNetworkKey = window.localStorage.getItem(PROTOCOL_NETWORK_STORAGE_KEY);
    const selectedNetwork = getProtocolNetworkOptionByKey(selectedNetworkKey);
    return {
      chainId: selectedNetwork?.chainId ?? ACTIVE_CHAIN_ID,
      assetContract: selectedNetwork?.contracts?.ORINA_RWA ?? null,
    };
  } catch {
    return {
      chainId: ACTIVE_CHAIN_ID,
      assetContract: CONTRACTS.ORINA_RWA,
    };
  }
}

function resolveRuntimeMintedAssetScope(scope?: RuntimeMintedAssetScope) {
  const stored = readStoredRuntimeMintedAssetScope();
  const chainId = scope?.chainId ?? stored.chainId ?? ACTIVE_CHAIN_ID;
  const assetContract = String(
    scope?.assetContract
    ?? stored.assetContract
    ?? `unconfigured-asset-${chainId}`,
  ).toLowerCase();

  return {
    chainId,
    assetContract,
    assetContractAddress: looksLikeAddress(assetContract)
      ? (assetContract as `0x${string}`)
      : null,
  };
}

function getRuntimeMintedAssetsStorageKey(scope?: RuntimeMintedAssetScope) {
  const resolvedScope = resolveRuntimeMintedAssetScope(scope);
  return `orina_runtime_minted_assets_v2:${resolvedScope.chainId}:${resolvedScope.assetContract}`;
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
  scope?: RuntimeMintedAssetScope,
  fallback?: AssetDetails | null,
): AssetDetails {
  const resolvedScope = resolveRuntimeMintedAssetScope(scope);
  const name =
    coalesceString(
      metadata.assetName,
      metadata.name,
      typeof chainSnapshot.assetName === "string" ? chainSnapshot.assetName : undefined,
      fallback?.name,
    ) ?? `Asset #${tokenId}`;
  const unitName =
    coalesceString(
      metadata.unitName,
      typeof chainSnapshot.unitName === "string" ? chainSnapshot.unitName : undefined,
      fallback?.unitName,
    ) ?? "RWA";
  const totalAmount = parseNumberLike(chainSnapshot.totalAmount ?? row.total_amount, 1);
  const availableAmount = parseNumberLike(chainSnapshot.availableAmount ?? row.available_amount, totalAmount);
  const image =
    coalesceString(
      metadata.image,
      metadata.coverImageUrl,
      fallback?.image,
    ) ?? DEFAULT_ASSET_IMAGE;
  return {
    ...fallback,
    id: tokenId,
    assetUid:
      coalesceString(
        metadata.assetUid,
        metadata.runtimeAssetUid,
        fallback?.assetUid,
      ) ?? tokenId,
    tokenId,
    onchainAssetId:
      coalesceString(
        metadata.onchainAssetId,
        metadata.assetId,
        tokenId,
        fallback?.onchainAssetId,
      ) ?? tokenId,
    name,
    description: coalesceString(metadata.description, fallback?.description) ?? `On-chain ${unitName} asset #${tokenId}`,
    category: normalizeCategoryFilterValue(coalesceString(metadata.category, fallback?.category) ?? unitName),
    blockchain:
      resolvedScope.chainId === 56 || resolvedScope.chainId === 97
        ? "BSC"
        : `Chain ${resolvedScope.chainId}`,
    currentPrice: fallback?.currentPrice ?? "0",
    currentPriceUsd: fallback?.currentPriceUsd ?? "0",
    image,
    images: Array.from(new Set([image, ...(fallback?.images ?? [])].filter(Boolean))),
    properties: [
      { trait_type: "Asset ID", value: tokenId },
      { trait_type: "Unit ID", value: String(chainSnapshot.unitId ?? "0") },
      { trait_type: "Unit Name", value: unitName },
      { trait_type: "Status", value: normalizeAssetStatusLabel(row.status) },
    ],
    views: fallback?.views ?? 0,
    favorites: fallback?.favorites ?? 0,
    totalVolume: fallback?.totalVolume ?? "0",
    totalSales: fallback?.totalSales ?? Math.max(0, totalAmount - availableAmount),
    currentOwner: ownerAddress,
    creator: fallback?.creator ?? ownerAddress,
    ownerHistory:
      fallback?.ownerHistory?.length
        ? fallback.ownerHistory
        : [
            {
              address: ownerAddress,
              timestamp: createdAt,
            },
          ],
    priceHistory: fallback?.priceHistory ?? [],
    contractAddress: String(
      row.asset_contract
      || fallback?.contractAddress
      || resolvedScope.assetContractAddress
      || CONTRACTS.ORINA_RWA,
    ),
    unitId: coalesceString(
      metadata.unitId,
      typeof chainSnapshot.unitId === "string" || typeof chainSnapshot.unitId === "number"
        ? String(chainSnapshot.unitId)
        : undefined,
      fallback?.unitId,
    ),
    unitName,
    unitLabel:
      coalesceString(
        metadata.unitLabel,
        metadata.unitName,
        typeof chainSnapshot.unitName === "string" ? chainSnapshot.unitName : undefined,
        fallback?.unitLabel,
      ) ?? unitName,
    tokenStandard: fallback?.tokenStandard ?? (Number(chainSnapshot.assetType) === 1 ? "ERC-721-like" : "RWA"),
    mintDate: fallback?.mintDate ?? createdAt,
    verified: fallback?.verified ?? true,
    seller: fallback?.seller ?? {
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

function readLocalRuntimeMintedAssets(scope?: RuntimeMintedAssetScope): RuntimeMintedAssetRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getRuntimeMintedAssetsStorageKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedRuntimeMintedAssetRecord[];
    return Array.isArray(parsed)
      ? parsed.map(fromPersistedRecord).filter(isRuntimeMintedAssetRecord)
      : [];
  } catch {
    return [];
  }
}

function writeLocalRuntimeMintedAssets(records: RuntimeMintedAssetRecord[], scope?: RuntimeMintedAssetScope) {
  if (typeof window === "undefined") return;
  const serialized = records.map(toPersistedRecord);
  window.localStorage.setItem(getRuntimeMintedAssetsStorageKey(scope), JSON.stringify(serialized));
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

function toProtocolAssetRow(record: RuntimeMintedAssetRecord, scope?: RuntimeMintedAssetScope): ProtocolAssetRow {
  const resolvedScope = resolveRuntimeMintedAssetScope(scope);
  const { totalAmount, availableAmount } = extractAmounts(record);
  const ownerAddress = record.walletAddress.toLowerCase();
  const assetContract = (record.details.contractAddress || resolvedScope.assetContract).toLowerCase();
  return {
    chain_id: resolvedScope.chainId,
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
        chainId: resolvedScope.chainId,
        assetContract,
      },
      runtimeRecord: toPersistedRecord(record),
      assetUid: record.details.assetUid ?? record.id,
      onchainAssetId: record.details.onchainAssetId ?? record.details.tokenId ?? record.id,
      unitId: record.details.unitId ?? null,
      unitName: record.details.unitName ?? null,
      unitLabel: record.details.unitLabel ?? record.details.unitName ?? null,
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

function fromProtocolAssetRow(row: ProtocolAssetRow, scope?: RuntimeMintedAssetScope): RuntimeMintedAssetRecord | null {
  const metadata = row.metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const resolvedScope = resolveRuntimeMintedAssetScope(scope);
  const runtimeRecord = (metadata as { runtimeRecord?: PersistedRuntimeMintedAssetRecord }).runtimeRecord;
  const persistedRecord =
    runtimeRecord ? fromPersistedRecord(runtimeRecord) : null;
  const runtimeFallback =
    persistedRecord && isRuntimeMintedAssetRecord(persistedRecord) ? persistedRecord : null;

  const chainSnapshot =
    typeof (metadata as { chainSnapshot?: unknown }).chainSnapshot === "object"
      ? ((metadata as { chainSnapshot?: Record<string, unknown> }).chainSnapshot ?? {})
      : {};
  const tokenId = coalesceString(row.token_id, runtimeFallback?.details.tokenId, runtimeFallback?.id);
  const ownerAddress = coalesceString(row.owner_address, runtimeFallback?.walletAddress)?.toLowerCase();
  if (!tokenId || !ownerAddress) return runtimeFallback;

  const createdAt = parseTimestampMs(
    coalesceString(
      typeof chainSnapshot.mintedBlockTime === "string" ? chainSnapshot.mintedBlockTime : undefined,
      row.created_at,
      runtimeFallback ? String(runtimeFallback.createdAt) : undefined,
    ),
    runtimeFallback?.createdAt ?? Date.now(),
  );
  const details = buildGenericDetails(
    row,
    metadata,
    chainSnapshot,
    tokenId,
    ownerAddress,
    createdAt,
    resolvedScope,
    runtimeFallback?.details,
  );
  const fallbackRwaAsset =
    runtimeFallback?.assetType === "RWA" ? runtimeFallback.myAsset as MyAssetRwa : null;
  const totalAmount = parseNumberLike(
    chainSnapshot.totalAmount ?? row.total_amount,
    parseNumberLike(fallbackRwaAsset?.totalAmount, 1),
  );
  const availableAmount = parseNumberLike(
    chainSnapshot.availableAmount ?? row.available_amount,
    parseNumberLike(fallbackRwaAsset?.availableAmount, totalAmount),
  );
  const assetType =
    Number(chainSnapshot.assetType ?? (runtimeFallback?.assetType === "NFT" ? 1 : 0)) === 1
      ? "NFT"
      : "RWA";
  const txHash =
    typeof chainSnapshot.mintedTxHash === "string" && chainSnapshot.mintedTxHash.startsWith("0x")
      ? chainSnapshot.mintedTxHash
      : runtimeFallback?.txHash;

  if (assetType === "NFT") {
    const nftRecord: RuntimeMintedAssetRecord = {
      id: tokenId,
      walletAddress: ownerAddress,
      assetType: "NFT",
      createdAt,
      txHash,
      myAsset: {
        id: tokenId,
        name: details.name,
        type: "NFT",
        category: normalizeCategoryFilterValue(details.category),
        image: details.image,
        currentPrice:
          runtimeFallback?.assetType === "NFT" ? runtimeFallback.myAsset.currentPrice : details.currentPrice,
        floorPrice:
          runtimeFallback?.assetType === "NFT"
            ? runtimeFallback.myAsset.floorPrice
            : (details.floorPrice ?? "0"),
        collection:
          runtimeFallback?.assetType === "NFT" ? runtimeFallback.myAsset.collection : "On-chain",
        transferable:
          runtimeFallback?.assetType === "NFT" ? runtimeFallback.myAsset.transferable : true,
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
    txHash,
    myAsset: {
      id: tokenId,
      name: details.name,
      type: "RWA",
      category: normalizeCategoryFilterValue(details.category),
      image: details.image,
      status: normalizeAssetStatusLabel(row.status ?? fallbackRwaAsset?.status),
      availableAmount,
      totalAmount,
      minPrice: fallbackRwaAsset?.minPrice ?? details.currentPrice,
      mintedDate: fallbackRwaAsset?.mintedDate ?? new Date(createdAt).toISOString().slice(0, 10),
    },
    details: {
      ...details,
      totalVolume: details.totalVolume ?? String(Math.max(0, totalAmount - availableAmount)),
      totalSales: details.totalSales ?? Math.max(0, totalAmount - availableAmount),
    },
  };
  return rwaRecord;
}

export async function hydrateRuntimeMintedAssetsFromSupabase(
  walletAddress?: string | null,
  scope?: RuntimeMintedAssetScope,
) {
  const resolvedScope = resolveRuntimeMintedAssetScope(scope);
  if (!isSupabaseRestEnabled() || !walletAddress || !resolvedScope.assetContractAddress) {
    return loadRuntimeMintedAssets(walletAddress, resolvedScope);
  }

  try {
    const normalized = walletAddress.toLowerCase();
    const remoteRows = await restSelect<ProtocolAssetRow>(
      "protocol_assets",
      toQuery({
        chain_id: encodeEq(resolvedScope.chainId),
        asset_contract: encodeEq(resolvedScope.assetContract),
        owner_address: encodeEq(normalized),
      }),
    );
    const remoteRecords = remoteRows
      .map((row) => fromProtocolAssetRow(row, resolvedScope))
      .filter((value): value is RuntimeMintedAssetRecord => !!value)
      .filter((record) => record.walletAddress.toLowerCase() === normalized);
    const merged = mergeRuntimeMintedAssets(readLocalRuntimeMintedAssets(resolvedScope), remoteRecords);
    writeLocalRuntimeMintedAssets(merged, resolvedScope);
    return loadRuntimeMintedAssets(walletAddress, resolvedScope);
  } catch (error) {
    console.warn("[runtimeMintedAssets] Failed to hydrate minted assets from Supabase", error);
    return loadRuntimeMintedAssets(walletAddress, resolvedScope);
  }
}

export function loadRuntimeMintedAssets(walletAddress?: string | null, scope?: RuntimeMintedAssetScope) {
  const resolvedScope = resolveRuntimeMintedAssetScope(scope);
  const records = readLocalRuntimeMintedAssets(resolvedScope).filter((record) => {
    const assetContract = String(record.details.contractAddress || resolvedScope.assetContract).toLowerCase();
    return assetContract === resolvedScope.assetContract;
  });
  if (!walletAddress) return records;
  const normalized = walletAddress.toLowerCase();
  return records.filter((record) => record.walletAddress.toLowerCase() === normalized);
}

export function saveRuntimeMintedAssets(records: RuntimeMintedAssetRecord[], scope?: RuntimeMintedAssetScope) {
  writeLocalRuntimeMintedAssets(dedupeRuntimeMintedAssets(records), scope);
}

export function upsertRuntimeMintedAsset(record: RuntimeMintedAssetRecord, scope?: RuntimeMintedAssetScope) {
  const current = readLocalRuntimeMintedAssets(scope);
  const next = dedupeRuntimeMintedAssets([record, ...current.filter((item) => item.id !== record.id)]);
  writeLocalRuntimeMintedAssets(next, scope);
}

export function getRuntimeMintedAssetDetailsById(assetId: string, scope?: RuntimeMintedAssetScope) {
  return readLocalRuntimeMintedAssets(scope).find((record) => record.id === assetId)?.details ?? null;
}

export function loadRuntimeMyAssets(walletAddress?: string | null, scope?: RuntimeMintedAssetScope) {
  const records = loadRuntimeMintedAssets(walletAddress, scope);
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
