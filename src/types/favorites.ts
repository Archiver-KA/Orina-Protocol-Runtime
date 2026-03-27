export interface FavoriteAsset {
  assetId: string;
  addedAt: number;
}

export type FavoriteSortOption = 'recent' | 'name' | 'price-high' | 'price-low' | 'change';

export type FavoriteFilterOption = 'all' | string;

export interface FavoritesStats {
  totalFavorites: number;
  totalValue: number;
  avgPrice: number;
  categoryBreakdown: Record<string, number>;
}
