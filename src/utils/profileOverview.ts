import { OrderState } from '@/config/contracts';
import { formatOrderGrossPrice } from '@/utils/orderDisplay';
import type { MyAssetRwa } from '@/app/components/cards/my-asset-cards';
import type { MarketplaceAsset } from '@/app/types/asset';
import type { OrderUiRecord } from '@/types/order';
import type { RuntimeMintedAssetRecord } from '@/utils/runtimeMintedAssets';
import { getCategoryDisplayLabel } from '@/utils/taxonomy';

export interface ProfileTopProduct {
  key: string;
  assetName: string;
  assetImage: string;
  category: string;
  assetRouteId?: string;
  finalizedOrderCount: number;
  unitsSold: bigint;
  unitsSoldLabel: string;
  grossVolume: bigint;
  grossVolumeLabel: string;
  lastPurchasedAt: number;
}

export interface ProfileMintedMarketplaceAssets {
  ownerCards: MyAssetRwa[];
  visitorCards: MarketplaceAsset[];
}

function normalizeAddress(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function toTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
}

function formatMintedDate(value: unknown) {
  const timestamp = toTimestamp(value);
  if (!timestamp) return 'Unknown';
  return new Date(timestamp).toISOString().slice(0, 10);
}

function compareBigIntDesc(left: bigint, right: bigint) {
  if (left === right) return 0;
  return left > right ? -1 : 1;
}

function buildRuntimeIdentifierSet(runtimeRecords: RuntimeMintedAssetRecord[]) {
  const identifiers = new Set<string>();
  for (const record of runtimeRecords) {
    const recordId = normalizeAddress(record.id);
    if (recordId) identifiers.add(recordId);

    const tokenId = String(record.details.tokenId || '').trim().toLowerCase();
    if (tokenId) identifiers.add(tokenId);
  }
  return identifiers;
}

function findMarketplaceAssetForOrder(
  order: OrderUiRecord,
  marketplaceAssets: MarketplaceAsset[],
): MarketplaceAsset | undefined {
  const orderAssetId = order.assetId.toString();
  return marketplaceAssets.find((asset) => {
    const assetId = String(asset.id || '').trim();
    const tokenId = String(asset.tokenId || '').trim();
    return assetId === orderAssetId || tokenId === orderAssetId;
  });
}

function findRuntimeRecordForMarketplaceAsset(
  asset: MarketplaceAsset,
  runtimeRecords: RuntimeMintedAssetRecord[],
): RuntimeMintedAssetRecord | undefined {
  const assetId = String(asset.id || '').trim().toLowerCase();
  const tokenId = String(asset.tokenId || '').trim();
  return runtimeRecords.find((record) => {
    const recordId = String(record.id || '').trim().toLowerCase();
    const recordTokenId = String(record.details.tokenId || '').trim();
    return recordId === assetId || (tokenId.length > 0 && recordTokenId === tokenId);
  });
}

function toOwnerMintedCard(
  asset: MarketplaceAsset,
  runtimeRecord?: RuntimeMintedAssetRecord,
): MyAssetRwa {
  const runtimeCard =
    runtimeRecord?.assetType === 'RWA'
      ? (runtimeRecord.myAsset as MyAssetRwa)
      : null;

  const availableAmount =
    typeof asset.availableSlots === 'number'
      ? asset.availableSlots
      : runtimeCard?.availableAmount ?? 0;
  const totalAmount =
    typeof asset.totalSlots === 'number'
      ? asset.totalSlots
      : runtimeCard?.totalAmount ?? availableAmount;

  return {
    id: asset.id,
    name: asset.name,
    type: 'RWA',
    category: getCategoryDisplayLabel(asset.category),
    image: asset.image,
    status:
      runtimeCard?.status ??
      ((typeof availableAmount === 'number' && availableAmount > 0) ? 'Active' : 'Sold Out'),
    availableAmount,
    totalAmount,
    minPrice: runtimeCard?.minPrice ?? asset.price,
    mintedDate: runtimeCard?.mintedDate ?? formatMintedDate(asset.createdAt),
  };
}

function toOwnerMintedCardFromRuntime(record: RuntimeMintedAssetRecord): MyAssetRwa | null {
  if (record.assetType !== 'RWA') return null;
  return record.myAsset as MyAssetRwa;
}

export function buildProfileTopProducts(
  profileAddress: string | undefined,
  orders: OrderUiRecord[],
  marketplaceAssets: MarketplaceAsset[],
): ProfileTopProduct[] {
  const normalizedProfile = normalizeAddress(profileAddress);
  if (!normalizedProfile) return [];

  const grouped = new Map<
    string,
    {
      assetName: string;
      assetImage: string;
      category: string;
      assetRouteId?: string;
      finalizedOrderCount: number;
      unitsSold: bigint;
      grossVolume: bigint;
      paymentTokenSymbol?: string;
      paymentTokenDecimals?: number;
      lastPurchasedAt: number;
      unitName?: string;
      unitLabel?: string;
    }
  >();

  for (const order of orders) {
    const isSellerOrder = normalizeAddress(order.seller) === normalizedProfile;
    const isFinalized = order.finalized || order.state === OrderState.FINALIZED;
    if (!isSellerOrder || !isFinalized) continue;

    const key = order.assetId.toString();
    const matchedAsset = findMarketplaceAssetForOrder(order, marketplaceAssets);
    const current = grouped.get(key);
    const lastPurchasedAt = order.updatedAt ?? order.createdAt ?? Number(order.proposedAt || 0n) * 1000;

    if (!current) {
      grouped.set(key, {
        assetName: order.assetName || matchedAsset?.name || `Asset #${key}`,
        assetImage: order.assetImage || matchedAsset?.image || '',
        category: matchedAsset?.category ? getCategoryDisplayLabel(matchedAsset.category) : 'Marketplace',
        assetRouteId: matchedAsset?.id,
        finalizedOrderCount: 1,
        unitsSold: order.amount,
        grossVolume: order.grossPrice,
        paymentTokenSymbol: order.paymentTokenSymbol,
        paymentTokenDecimals: order.paymentTokenDecimals,
        lastPurchasedAt,
        unitName: order.unitName,
        unitLabel: order.unitLabel,
      });
      continue;
    }

    current.finalizedOrderCount += 1;
    current.unitsSold += order.amount;
    current.grossVolume += order.grossPrice;
    current.lastPurchasedAt = Math.max(current.lastPurchasedAt, lastPurchasedAt);
    if (!current.assetRouteId && matchedAsset?.id) current.assetRouteId = matchedAsset.id;
    if (!current.assetImage && matchedAsset?.image) current.assetImage = matchedAsset.image;
    if (!current.category && matchedAsset?.category) current.category = getCategoryDisplayLabel(matchedAsset.category);
    if (!current.unitLabel && order.unitLabel) current.unitLabel = order.unitLabel;
    if (!current.unitName && order.unitName) current.unitName = order.unitName;
  }

  return Array.from(grouped.entries())
    .map(([key, value]) => ({
      key,
      assetName: value.assetName,
      assetImage: value.assetImage,
      category: value.category,
      assetRouteId: value.assetRouteId,
      finalizedOrderCount: value.finalizedOrderCount,
      unitsSold: value.unitsSold,
      unitsSoldLabel: value.unitLabel || value.unitName
        ? `${value.unitsSold.toString()} ${value.unitLabel || value.unitName}`
        : `${value.unitsSold.toString()} unit${value.unitsSold === 1n ? '' : 's'}`,
      grossVolume: value.grossVolume,
      grossVolumeLabel: formatOrderGrossPrice(
        value.grossVolume,
        value.paymentTokenSymbol,
        value.paymentTokenDecimals,
      ),
      lastPurchasedAt: value.lastPurchasedAt,
    }))
    .sort((left, right) => {
      if (left.finalizedOrderCount !== right.finalizedOrderCount) {
        return right.finalizedOrderCount - left.finalizedOrderCount;
      }
      const unitsComparison = compareBigIntDesc(left.unitsSold, right.unitsSold);
      if (unitsComparison !== 0) return unitsComparison;
      const volumeComparison = compareBigIntDesc(left.grossVolume, right.grossVolume);
      if (volumeComparison !== 0) return volumeComparison;
      return right.lastPurchasedAt - left.lastPurchasedAt;
    })
    .slice(0, 2);
}

export function buildProfileMintedMarketplaceAssets(
  profileAddress: string | undefined,
  marketplaceAssets: MarketplaceAsset[],
  runtimeRecords: RuntimeMintedAssetRecord[],
): ProfileMintedMarketplaceAssets {
  const normalizedProfile = normalizeAddress(profileAddress);
  if (!normalizedProfile) {
    return { ownerCards: [], visitorCards: [] };
  }

  const runtimeIdentifiers = buildRuntimeIdentifierSet(runtimeRecords);
  const visitorCards = marketplaceAssets
    .filter((asset) => {
      if (normalizeAddress(asset.seller?.address) === normalizedProfile) {
        return true;
      }

      if (runtimeIdentifiers.size === 0) {
        return false;
      }

      const assetId = normalizeAddress(asset.id);
      const tokenId = String(asset.tokenId || '').trim().toLowerCase();
      return runtimeIdentifiers.has(assetId) || (tokenId.length > 0 && runtimeIdentifiers.has(tokenId));
    })
    .sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt));

  const ownerCards = visitorCards.map((asset) =>
    toOwnerMintedCard(asset, findRuntimeRecordForMarketplaceAsset(asset, runtimeRecords))
  );
  const runtimeOnlyOwnerCards = runtimeRecords
    .map(toOwnerMintedCardFromRuntime)
    .filter((value): value is MyAssetRwa => Boolean(value))
    .filter((runtimeCard) => !ownerCards.some((card) => card.id === runtimeCard.id));

  return { ownerCards: [...runtimeOnlyOwnerCards, ...ownerCards], visitorCards };
}
