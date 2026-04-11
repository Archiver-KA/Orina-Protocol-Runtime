import type { AIProductResult } from '@/app/types/ai-agent';
import type { MarketplaceAsset } from '@/app/types/asset';
import { getMarketplaceCatalogAssetById } from '@/utils/marketplaceCatalog';

export interface ResolvedAISearchResults {
  assets: MarketplaceAsset[];
  unresolved: AIProductResult[];
}

export function resolveAISearchResults(
  products: AIProductResult[],
  marketplaceAssets: MarketplaceAsset[],
): ResolvedAISearchResults {
  const assets: MarketplaceAsset[] = [];
  const unresolved: AIProductResult[] = [];
  const seenAssetIds = new Set<string>();
  const seenProductIds = new Set<string>();

  for (const product of products) {
    const productId = String(product.id || '').trim();
    if (!productId || seenProductIds.has(productId)) continue;
    seenProductIds.add(productId);

    const matchedAsset = getMarketplaceCatalogAssetById(productId, marketplaceAssets);
    if (matchedAsset) {
      const assetKey = String(matchedAsset.assetUid || matchedAsset.id || productId).trim().toLowerCase();
      if (!seenAssetIds.has(assetKey)) {
        seenAssetIds.add(assetKey);
        assets.push(matchedAsset);
      }
      continue;
    }

    unresolved.push(product);
  }

  return { assets, unresolved };
}
