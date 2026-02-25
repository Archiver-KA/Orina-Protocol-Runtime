export interface FavoriteAsset {
  assetId: string;
  userId: string;
  addedAt: number;
}

export interface WatchlistItem {
  id: string;
  assetId: string;
  userId: string;
  priceAlert?: {
    targetPrice: number;
    condition: 'above' | 'below';
    isActive: boolean;
  };
  notes?: string;
  addedAt: number;
  lastChecked?: number;
}

export interface WatchlistAlert {
  id: string;
  watchlistItemId: string;
  assetId: string;
  assetName: string;
  type: 'price_target' | 'price_drop' | 'price_rise';
  message: string;
  currentPrice: number;
  targetPrice: number;
  condition: 'above' | 'below';
  triggeredAt: number;
  isRead: boolean;
}

export type FavoriteSortOption = 'recent' | 'name' | 'price-high' | 'price-low' | 'change';

export type FavoriteFilterOption = 'all' | 'art' | 'collectibles' | 'real-estate' | 'luxury';

export interface FavoritesStats {
  totalFavorites: number;
  totalValue: number;
  avgPrice: number;
  categoryBreakdown: Record<string, number>;
}

export interface WatchlistStats {
  totalWatching: number;
  activeAlerts: number;
  triggeredToday: number;
  priceChanges: {
    up: number;
    down: number;
    stable: number;
  };
}