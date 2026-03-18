import { useState, useEffect, useMemo } from 'react';
import { Heart, Grid, List, TrendingUp, TrendingDown, DollarSign, Filter } from 'lucide-react';
import { FavoriteSortOption, FavoriteFilterOption } from '@/types/favorites';
import { SearchResultCard } from '@/app/components/search-result-card';
import type { MarketplaceAsset } from '@/app/types/asset';
import {
  loadFavorites,
  toggleFavorite,
} from '@/utils/favoritesUtils';
import {
  calculateMarketplaceFavoritesStats,
  loadFavoriteMarketplaceAssets,
  matchesFavoriteFilter,
  sortFavoriteMarketplaceAssets,
} from '@/utils/favoriteMarketplaceUtils';
import { ASSET_METADATA_CHANGED_EVENT } from '@/utils/assetMetadataSync';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface FavoritesPageProps {
  currentUserId?: string;
  onAssetClick?: (assetId: string) => void;
}

export function FavoritesPage({
  currentUserId = 'user_current',
  onAssetClick,
}: FavoritesPageProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<FavoriteSortOption>('recent');
  const [filterBy, setFilterBy] = useState<FavoriteFilterOption>('all');
  const [favoriteAssets, setFavoriteAssets] = useState<MarketplaceAsset[]>([]);

  // Load favorites on mount
  useEffect(() => {
    loadFavoritesData();
  }, [currentUserId]);

  useEffect(() => {
    const refresh = () => loadFavoritesData();
    window.addEventListener('orina:favorites-changed', refresh as EventListener);
    window.addEventListener(ASSET_METADATA_CHANGED_EVENT, refresh as EventListener);
    window.addEventListener('storage', refresh as EventListener);
    return () => {
      window.removeEventListener('orina:favorites-changed', refresh as EventListener);
      window.removeEventListener(ASSET_METADATA_CHANGED_EVENT, refresh as EventListener);
      window.removeEventListener('storage', refresh as EventListener);
    };
  }, [currentUserId]);

  const loadFavoritesData = () => {
    setFavoriteAssets(loadFavoriteMarketplaceAssets(currentUserId));
  };

  // Filter assets by category
  const filteredAssets = useMemo(() => {
    if (filterBy === 'all') return favoriteAssets;
    return favoriteAssets.filter((asset) => matchesFavoriteFilter(asset, filterBy));
  }, [favoriteAssets, filterBy]);

  // Sort assets
  const sortedAssets = useMemo(() => {
    const favorites = loadFavorites(currentUserId);
    return sortFavoriteMarketplaceAssets(filteredAssets, sortBy, favorites);
  }, [filteredAssets, sortBy, currentUserId]);

  // Calculate stats
  const stats = useMemo(() => 
    calculateMarketplaceFavoritesStats(favoriteAssets), 
    [favoriteAssets]
  );

  const handleToggleFavorite = (assetId: string) => {
    const isFav = toggleFavorite(currentUserId, assetId);
    loadFavoritesData();
    toast.success(isFav ? 'Added to favorites' : 'Removed from favorites');
  };

  const sortOptions: { value: FavoriteSortOption; label: string }[] = [
    { value: 'recent', label: 'Recently Added' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'price-high', label: 'Price (High to Low)' },
    { value: 'price-low', label: 'Price (Low to High)' },
    { value: 'change', label: 'Price Change' },
  ];

  const filterOptions: { value: FavoriteFilterOption; label: string }[] = [
    { value: 'all', label: 'All Categories' },
    { value: 'art', label: 'Art' },
    { value: 'collectibles', label: 'Collectibles' },
    { value: 'real-estate', label: 'Real Estate' },
    { value: 'luxury', label: 'Luxury' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <Heart size={28} className="text-red-500" fill="currentColor" />
            </div>
            My Favorites
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {favoriteAssets.length} {favoriteAssets.length === 1 ? 'asset' : 'assets'} saved
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 p-1 bg-zinc-900 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`
              p-2.5 rounded-lg transition-all
              ${viewMode === 'grid'
                ? 'bg-[#2CC295] text-black'
                : 'text-zinc-400 hover:text-white'
              }
            `}
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`
              p-2.5 rounded-lg transition-all
              ${viewMode === 'list'
                ? 'bg-[#2CC295] text-black'
                : 'text-zinc-400 hover:text-white'
              }
            `}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {favoriteAssets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-500">Total Value</span>
              <DollarSign size={16} className="text-[#2CC295]" />
            </div>
            <p className="text-2xl font-bold text-white">
              {stats.totalValue.toFixed(2)} <span className="text-sm text-zinc-500">ETH</span>
            </p>
          </div>

          <div className="p-4 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-500">Average Price</span>
              <DollarSign size={16} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-white">
              {stats.avgPrice.toFixed(2)} <span className="text-sm text-zinc-500">ETH</span>
            </p>
          </div>

          <div className="p-4 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-500">Top Category</span>
              <Filter size={16} className="text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-white">
              {Object.entries(stats.categoryBreakdown)
                .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      {favoriteAssets.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Category:</span>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FavoriteFilterOption)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-[#2CC295] transition-colors"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as FavoriteSortOption)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-[#2CC295] transition-colors"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Result Count */}
          <div className="ml-auto text-sm text-zinc-500">
            Showing {sortedAssets.length} of {favoriteAssets.length} favorites
          </div>
        </div>
      )}

      {/* Assets Grid/List */}
      {sortedAssets.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart size={40} className="text-zinc-700" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {filterBy === 'all' ? 'No favorites yet' : 'No favorites in this category'}
          </h3>
          <p className="text-sm text-zinc-500 mb-6">
            {filterBy === 'all'
              ? 'Start adding assets to your favorites by clicking the heart icon'
              : `You don't have any ${filterBy} assets favorited`}
          </p>
          {filterBy !== 'all' && (
            <button
              onClick={() => setFilterBy('all')}
              className="px-6 py-3 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold rounded-lg transition-colors"
            >
              View All Favorites
            </button>
          )}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            layout
            className={`
              grid gap-6
              ${viewMode === 'grid'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1'
              }
            `}
          >
            {sortedAssets.map((asset) => (
              <motion.div
                key={asset.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <SearchResultCard
                  asset={asset}
                  onClick={(assetId) => onAssetClick?.(assetId)}
                  onLike={handleToggleFavorite}
                  viewMode={viewMode}
                  isLiked
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
