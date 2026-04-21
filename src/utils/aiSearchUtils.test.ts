import { describe, expect, it } from 'vitest';
import type { MarketplaceAsset } from '@/app/types/asset';
import type { AIProductResult } from '@/app/types/ai-agent';
import { resolveAISearchResults } from '@/utils/aiSearchUtils';

function makeAsset(overrides: Partial<MarketplaceAsset> = {}): MarketplaceAsset {
  const id = overrides.id || 'asset-1';

  return {
    id,
    assetUid: overrides.assetUid || id,
    tokenId: overrides.tokenId || id,
    contractAddress: overrides.contractAddress || '0xasset',
    name: overrides.name || 'Live Catalog Asset',
    category: overrides.category || 'goods',
    image: overrides.image || 'https://example.com/asset.jpg',
    seller: overrides.seller || {
      address: '0xseller',
      verified: true,
      reputation: 90,
    },
    price: overrides.price || '1 ETH',
    currency: overrides.currency || 'ETH',
    listedAt: overrides.listedAt || 1,
    views: overrides.views || 0,
    likes: overrides.likes || 0,
    verified: overrides.verified ?? true,
    blockchain: overrides.blockchain || 'Ethereum',
    network: overrides.network || 'mainnet',
    createdAt: overrides.createdAt || 1,
    updatedAt: overrides.updatedAt || 1,
    ...overrides,
  };
}

describe('resolveAISearchResults', () => {
  it('keeps unresolved AI products out of rendered catalog assets', () => {
    const products: AIProductResult[] = [
      { id: 'live-asset', title: 'Live result', category: 'goods' },
      { id: 'smoke-asset-1', title: 'Smoke result', category: 'goods' },
    ];
    const catalog = [makeAsset({ id: 'live-asset' })];

    const result = resolveAISearchResults(products, catalog);

    expect(result.assets.map((asset) => asset.id)).toEqual(['live-asset']);
    expect(result.unresolved.map((product) => product.id)).toEqual(['smoke-asset-1']);
  });

  it('deduplicates AI products that resolve to the same catalog asset', () => {
    const products: AIProductResult[] = [
      { id: 'catalog-uid', title: 'Asset UID match', category: 'goods' },
      { id: 'token-123', title: 'Token match', category: 'goods' },
    ];
    const catalog = [makeAsset({ id: 'catalog-id', assetUid: 'catalog-uid', tokenId: 'token-123' })];

    const result = resolveAISearchResults(products, catalog);

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].id).toBe('catalog-id');
    expect(result.unresolved).toEqual([]);
  });
});
