import type { MarketplaceAsset } from '@/app/types/asset';
import type { FavoriteAsset, FavoriteFilterOption, FavoriteSortOption, FavoritesStats } from '@/types/favorites';
import { loadFavorites } from '@/utils/favoritesUtils';
import { getMarketplaceCatalogAssetById, loadMarketplaceCatalogSync } from '@/utils/marketplaceCatalog';
import { getRuntimeMintedAssetDetailsById } from '@/utils/runtimeMintedAssets';
import { getDeterministicOwnedAssetDetailsById } from '@/utils/testWalletAssetFixtures';
import { getCategoryDisplayLabel, normalizeCategoryFilterValue } from '@/utils/taxonomy';

function parseMarketplacePrice(price: string): number {
  const parsed = Number.parseFloat(String(price || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function assetDetailsToMarketplaceAsset(assetId: string): MarketplaceAsset | null {
  const asset =
    getRuntimeMintedAssetDetailsById(assetId) ||
    getDeterministicOwnedAssetDetailsById(assetId);
  if (!asset) return null;

  const rawChain = String(asset.blockchain || 'BSC');
  const blockchain: MarketplaceAsset['blockchain'] = (
    ['Ethereum', 'Polygon', 'Arbitrum', 'Base', 'BSC'].includes(rawChain) ? rawChain : 'BSC'
  ) as MarketplaceAsset['blockchain'];

  return {
    id: String(asset.id),
    assetUid: asset.assetUid || String(asset.id),
    tokenId: String(asset.tokenId || asset.id),
    onchainAssetId: asset.onchainAssetId || String(asset.tokenId || asset.id),
    contractAddress: asset.contractAddress || '0x0000000000000000000000000000000000000000',
    unitId: asset.unitId,
    unitName: asset.unitName,
    unitLabel: asset.unitLabel || asset.unitName,
    name: asset.name || 'Unnamed Asset',
    category: normalizeCategoryFilterValue(asset.category || 'physical_goods'),
    description: asset.description || '',
    image: asset.image || 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800',
    seller: {
      address: asset.seller?.address || asset.currentOwner || asset.creator || '0x0000000000000000000000000000000000000000',
      verified: Boolean(asset.verified),
    },
    price: asset.currentPrice || '0 ETH',
    priceUSD: asset.currentPriceUsd || '$0',
    currency: 'ETH',
    listedAt: asset.lastSale || asset.mintDate || Date.now(),
    views: Number(asset.views || 0),
    likes: Number(asset.favorites || 0),
    verified: Boolean(asset.verified),
    blockchain,
    network: 'testnet',
    createdAt: asset.mintDate || Date.now(),
    updatedAt: Date.now(),
  };
}

export function resolveFavoriteMarketplaceAsset(assetId: string): MarketplaceAsset | null {
  return (
    getMarketplaceCatalogAssetById(assetId, loadMarketplaceCatalogSync()) ||
    assetDetailsToMarketplaceAsset(assetId)
  );
}

export function loadFavoriteMarketplaceAssets(walletAddress: string): MarketplaceAsset[] {
  return loadFavorites(walletAddress)
    .map((favorite) => resolveFavoriteMarketplaceAsset(favorite.assetId))
    .filter((asset): asset is MarketplaceAsset => !!asset);
}

export function matchesFavoriteFilter(asset: MarketplaceAsset, filterBy: FavoriteFilterOption): boolean {
  if (filterBy === 'all') return true;
  return normalizeCategoryFilterValue(asset.category) === filterBy;
}

export function sortFavoriteMarketplaceAssets(
  assets: MarketplaceAsset[],
  sortBy: FavoriteSortOption,
  favorites: FavoriteAsset[]
): MarketplaceAsset[] {
  const sorted = [...assets];

  switch (sortBy) {
    case 'recent':
      sorted.sort((a, b) => {
        const favA = favorites.find((favorite) => favorite.assetId === a.id);
        const favB = favorites.find((favorite) => favorite.assetId === b.id);
        return (favB?.addedAt || 0) - (favA?.addedAt || 0);
      });
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'price-high':
      sorted.sort((a, b) => parseMarketplacePrice(b.price) - parseMarketplacePrice(a.price));
      break;
    case 'price-low':
      sorted.sort((a, b) => parseMarketplacePrice(a.price) - parseMarketplacePrice(b.price));
      break;
    case 'change':
      sorted.sort((a, b) => (b.views + b.likes) - (a.views + a.likes));
      break;
  }

  return sorted;
}

export function calculateMarketplaceFavoritesStats(assets: MarketplaceAsset[]): FavoritesStats {
  const totalFavorites = assets.length;
  const totalValue = assets.reduce((sum, asset) => sum + parseMarketplacePrice(asset.price), 0);
  const avgPrice = totalFavorites > 0 ? totalValue / totalFavorites : 0;

  const categoryBreakdown: Record<string, number> = {};
  assets.forEach((asset) => {
    const categoryLabel = getCategoryDisplayLabel(asset.category);
    categoryBreakdown[categoryLabel] = (categoryBreakdown[categoryLabel] || 0) + 1;
  });

  return {
    totalFavorites,
    totalValue,
    avgPrice,
    categoryBreakdown,
  };
}
