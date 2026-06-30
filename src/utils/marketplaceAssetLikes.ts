import type { MarketplaceAsset } from '@/app/types/asset';

type LikeableAsset = Pick<MarketplaceAsset, 'id' | 'likes'>;

function normalizeAssetId(value: string): string {
  return String(value || '').trim().toLowerCase();
}

export function applyMarketplaceAssetLikeDelta<T extends LikeableAsset>(
  asset: T,
  assetId: string,
  delta: number
): T {
  if (normalizeAssetId(asset.id) !== normalizeAssetId(assetId)) return asset;

  return {
    ...asset,
    likes: Math.max(0, (asset.likes || 0) + delta),
  };
}

export function applyMarketplaceAssetListLikeDelta<T extends LikeableAsset>(
  assets: T[],
  assetId: string,
  delta: number
): T[] {
  return assets.map((asset) => applyMarketplaceAssetLikeDelta(asset, assetId, delta));
}
