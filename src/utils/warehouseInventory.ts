import type { MarketplaceAsset } from '@/app/types/asset';
import type { MyAssetRwa } from '@/app/components/cards/my-asset-cards';
import type { RuntimeMintedAssetRecord } from '@/utils/runtimeMintedAssets';

export type WarehouseInventoryHealth = 'available' | 'low_stock' | 'sold_out' | 'inactive';

export interface WarehouseInventoryItem {
  id: string;
  asset: MyAssetRwa;
  name: string;
  category: string;
  image: string;
  status: string;
  totalAmount: number;
  availableAmount: number;
  soldAmount: number;
  minPrice: string;
  mintedDate: string;
  listedOnMarketplace: boolean;
  marketplaceAssetId?: string;
  tokenId?: string;
  blockchain?: string;
  locationLabel?: string;
  deliveryLabel?: string;
  updatedAt: number;
  health: WarehouseInventoryHealth;
  configurableAttributeCount: number;
}

interface BuildWarehouseInventoryParams {
  walletAddress?: string | null;
  rwaAssets: MyAssetRwa[];
  runtimeRecords: RuntimeMintedAssetRecord[];
  marketplaceAssets: MarketplaceAsset[];
}

function normalize(value?: string | number | bigint | null) {
  return String(value ?? '').trim().toLowerCase();
}

function parseAmount(value: string | number | undefined, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toIntAmount(value: string | number | undefined, fallback = 0) {
  return Math.max(0, Math.trunc(parseAmount(value, fallback)));
}

function resolveUpdatedAt(record?: RuntimeMintedAssetRecord) {
  const fromDetails = (record?.details as { updatedAt?: number; mintDate?: number } | undefined)?.updatedAt;
  if (typeof fromDetails === 'number' && Number.isFinite(fromDetails) && fromDetails > 0) {
    return fromDetails;
  }
  const mintDate = (record?.details as { mintDate?: number } | undefined)?.mintDate;
  if (typeof mintDate === 'number' && Number.isFinite(mintDate) && mintDate > 0) {
    return mintDate;
  }
  return record?.createdAt ?? 0;
}

function resolveHealth(status: string, availableAmount: number, totalAmount: number): WarehouseInventoryHealth {
  const normalizedStatus = status.trim().toLowerCase();
  if (availableAmount <= 0 || normalizedStatus === 'sold out') return 'sold_out';
  if (normalizedStatus === 'paused' || normalizedStatus === 'inactive' || normalizedStatus === 'delisted') {
    return 'inactive';
  }
  if (totalAmount > 0 && availableAmount / totalAmount <= 0.2) return 'low_stock';
  return 'available';
}

function matchRuntimeRecord(asset: MyAssetRwa, runtimeRecords: RuntimeMintedAssetRecord[]) {
  const assetId = normalize(asset.id);
  const assetName = normalize(asset.name);

  return (
    runtimeRecords.find((record) => {
      const details = record.details as { id?: string; tokenId?: string } | undefined;
      return (
        record.assetType === 'RWA' &&
        (
          normalize(record.id) === assetId ||
          normalize(record.myAsset.id) === assetId ||
          normalize(details?.id) === assetId ||
          normalize(record.myAsset.name) === assetName ||
          normalize(record.details.name) === assetName
        )
      );
    }) || null
  );
}

function matchMarketplaceAsset(
  asset: MyAssetRwa,
  runtimeRecord: RuntimeMintedAssetRecord | null,
  marketplaceAssets: MarketplaceAsset[],
  walletAddress?: string | null,
) {
  const normalizedWallet = normalize(walletAddress);
  const details = runtimeRecord?.details as { tokenId?: string } | undefined;
  const candidates = new Set(
    [
      asset.id,
      runtimeRecord?.id,
      runtimeRecord?.myAsset.id,
      runtimeRecord?.details.id,
      details?.tokenId,
    ]
      .map((value) => normalize(value))
      .filter(Boolean),
  );
  const assetName = normalize(asset.name);

  return (
    marketplaceAssets.find((marketplaceAsset) => {
      const sellerMatches = !normalizedWallet || normalize(marketplaceAsset.seller?.address) === normalizedWallet;
      if (!sellerMatches) return false;

      if (candidates.has(normalize(marketplaceAsset.id))) return true;
      if (candidates.has(normalize(marketplaceAsset.tokenId))) return true;
      return normalize(marketplaceAsset.name) === assetName;
    }) || null
  );
}

export function buildWarehouseInventory({
  walletAddress,
  rwaAssets,
  runtimeRecords,
  marketplaceAssets,
}: BuildWarehouseInventoryParams): WarehouseInventoryItem[] {
  const runtimeRwaRecords = runtimeRecords.filter((record) => record.assetType === 'RWA');

  return rwaAssets.map((asset) => {
    const runtimeRecord = matchRuntimeRecord(asset, runtimeRwaRecords);
    const runtimeDetails = runtimeRecord?.details as {
      totalSupply?: number;
      remainingSupply?: number;
      mintDate?: number;
      blockchain?: string;
      assetLocationSnapshot?: { displayAddress?: string; countryNameSnapshot?: string } | null;
      deliverySnapshot?: { preview?: string; countryNameSnapshot?: string } | null;
      configurableAttributes?: unknown[];
      tokenId?: string;
    } | undefined;

    const totalAmount = Math.max(
      1,
      toIntAmount(runtimeDetails?.totalSupply, toIntAmount(asset.totalAmount, 1)),
    );
    const availableAmount = Math.min(
      totalAmount,
      toIntAmount(runtimeDetails?.remainingSupply, toIntAmount(asset.availableAmount, totalAmount)),
    );
    const soldAmount = Math.max(0, totalAmount - availableAmount);
    const marketplaceAsset = matchMarketplaceAsset(asset, runtimeRecord, marketplaceAssets, walletAddress);
    const updatedAt = resolveUpdatedAt(runtimeRecord);
    const listedOnMarketplace = Boolean(marketplaceAsset);

    return {
      id: asset.id,
      asset,
      name: asset.name,
      category: asset.category,
      image: asset.image,
      status: asset.status,
      totalAmount,
      availableAmount,
      soldAmount,
      minPrice: asset.minPrice,
      mintedDate: asset.mintedDate,
      listedOnMarketplace,
      marketplaceAssetId: marketplaceAsset?.id,
      tokenId: runtimeDetails?.tokenId,
      blockchain: runtimeDetails?.blockchain,
      locationLabel:
        runtimeDetails?.assetLocationSnapshot?.displayAddress ||
        runtimeDetails?.assetLocationSnapshot?.countryNameSnapshot,
      deliveryLabel:
        runtimeDetails?.deliverySnapshot?.preview ||
        runtimeDetails?.deliverySnapshot?.countryNameSnapshot,
      updatedAt,
      health: resolveHealth(asset.status, availableAmount, totalAmount),
      configurableAttributeCount: Array.isArray(runtimeDetails?.configurableAttributes)
        ? runtimeDetails.configurableAttributes.length
        : 0,
    };
  });
}

function getWarehouseSortValue(item: WarehouseInventoryItem) {
  return Number.parseFloat(item.minPrice.replace(/[^0-9.]/g, '')) || 0;
}

function getWarehouseSortDate(item: WarehouseInventoryItem) {
  const runtimeDate = item.updatedAt;
  if (runtimeDate > 0) return runtimeDate;
  const parsed = Date.parse(item.mintedDate);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortWarehouseInventory(items: WarehouseInventoryItem[], sortBy: string) {
  const next = [...items];

  switch (sortBy) {
    case 'Value: High to Low':
      return next.sort((left, right) => getWarehouseSortValue(right) - getWarehouseSortValue(left));
    case 'Value: Low to High':
      return next.sort((left, right) => getWarehouseSortValue(left) - getWarehouseSortValue(right));
    case 'A-Z':
      return next.sort((left, right) => left.name.localeCompare(right.name));
    case 'Z-A':
      return next.sort((left, right) => right.name.localeCompare(left.name));
    case 'Recent':
    default:
      return next.sort((left, right) => getWarehouseSortDate(right) - getWarehouseSortDate(left));
  }
}
