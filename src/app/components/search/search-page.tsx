import { Search, List, Grid3x3 } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { ToggleSwitch } from '@/app/components/ui/toggle-switch';
import { FilterTags } from './filter-tags';
import { SearchResultCard } from '@/app/components/search-result-card';
import { ProfileSearchCard } from '@/app/components/profile-search-card';
import { CollectionCard } from '@/app/components/collection-card';
import { CollectionDetailsModal } from '@/app/components/collections/collection-details-modal';
import { PriceRangeSlider } from './price-range-slider';
import { SearchFilters } from '@/types/search';
import { MarketplaceAsset } from '@/app/types/asset';
import { getDefaultFilters, filterMarketplaceResults, getMarketplacePriceRange, saveSearchToHistory, countActiveFilters } from '@/utils/searchUtils';
import { motion, AnimatePresence } from 'motion/react';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { AssetDetailsModal } from '@/app/components/asset-details-modal';
import { loadFavorites, toggleFavorite } from '@/utils/favoritesUtils';
import { getMockSellerProfiles } from '@/utils/mockSellerProfiles';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { EmptyStateCard } from '@/app/components/ui/empty-state-card';
import { StudioPageHeader } from '@/app/components/ui/studio-page-header';
import { StudioPillGroup, StudioPillButton } from '@/app/components/ui/studio-pill-group';
import { StudioSidebarShell, StudioSidebarHeader, StudioSidebarScroll } from '@/app/components/ui/studio-sidebar';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { COLLECTIONS_SYNC_EVENT, loadCollectionFavorites, loadRuntimeCollections, toggleCollectionFavorite } from '@/utils/collectionsUtils';
import type { CollectionSummary } from '@/types/collection';
import {
  getMarketplaceCatalogAssetById,
  getMarketplaceCatalogBlockchains,
  getMarketplaceCatalogCategories,
  hydrateMarketplaceCatalogFromSupabase,
  loadMarketplaceCatalogSync,
  MARKETPLACE_CATALOG_SYNC_EVENT,
} from '@/utils/marketplaceCatalog';
import {
  getCategoryDisplayLabel,
  getCategoryOptionsFromValues,
  getTaxonomySearchText,
  normalizeCategoryFilterValue,
  normalizeTaxonomySearchKey,
} from '@/utils/taxonomy';

interface SearchPageProps {
  initialQuery?: string;
  onNavigateToAsset?: (assetId: string) => void;
  onNavigateToPage?: (page: string) => void;
  onNavigateToUserProfile?: (walletAddress: string) => void;
}

export function SearchPage({ initialQuery = '', onNavigateToAsset, onNavigateToPage, onNavigateToUserProfile }: SearchPageProps) {
  const [filters, setFilters] = useState<SearchFilters>(() => ({
    ...getDefaultFilters(),
    query: initialQuery,
  }));
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [contentMode, setContentMode] = useState<'assets' | 'profiles' | 'collections'>('assets');
  const [likedAssets, setLikedAssets] = useState<Set<string>>(new Set());
  const [likedCollections, setLikedCollections] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<MarketplaceAsset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const { address } = useAccount();
  const [sellerProfiles, setSellerProfiles] = useState(() => getMockSellerProfiles());
  const [runtimeCollections, setRuntimeCollections] = useState<CollectionSummary[]>(() => loadRuntimeCollections());
  const [marketplaceAssets, setMarketplaceAssets] = useState<MarketplaceAsset[]>(() => loadMarketplaceCatalogSync());

  useEffect(() => {
    const refresh = () => setSellerProfiles(getMockSellerProfiles());
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // Update query when initialQuery changes
  useEffect(() => {
    if (initialQuery) {
      setFilters(prev => ({ ...prev, query: initialQuery }));
    }
  }, [initialQuery]);

  const marketplaceCategories = useMemo(() => getMarketplaceCatalogCategories(marketplaceAssets), [marketplaceAssets]);
  const marketplaceCategoryOptions = useMemo(
    () => marketplaceCategories.map((category) => ({ value: category, label: getCategoryDisplayLabel(category) })),
    [marketplaceCategories]
  );
  const collectionCategoryOptions = useMemo(
    () => getCategoryOptionsFromValues(runtimeCollections.map((collection) => collection.category)),
    [runtimeCollections]
  );
  const marketplaceBlockchains = useMemo(() => getMarketplaceCatalogBlockchains(marketplaceAssets), [marketplaceAssets]);
  const marketplacePriceRange = useMemo(() => getMarketplacePriceRange(marketplaceAssets), [marketplaceAssets]);
  const visibleCategoryOptions = contentMode === 'collections' ? collectionCategoryOptions : marketplaceCategoryOptions;

  useEffect(() => {
    const syncCatalog = () => {
      setMarketplaceAssets(loadMarketplaceCatalogSync());
    };

    syncCatalog();
    void hydrateMarketplaceCatalogFromSupabase().then(syncCatalog);
    window.addEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, syncCatalog as EventListener);
    return () => {
      window.removeEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, syncCatalog as EventListener);
    };
  }, []);

  // Filter results
  const filteredAssets = useMemo(() => {
    return filterMarketplaceResults(marketplaceAssets, filters);
  }, [marketplaceAssets, filters]);

  const filteredCollections = useMemo(() => {
    let filtered = [...runtimeCollections];

    if (filters.query.trim()) {
      const query = normalizeTaxonomySearchKey(filters.query);
      filtered = filtered.filter((collection) =>
        normalizeTaxonomySearchKey(collection.name).includes(query) ||
        normalizeTaxonomySearchKey(collection.description).includes(query) ||
        normalizeTaxonomySearchKey(getTaxonomySearchText(collection.category)).includes(query) ||
        collection.tags.some((tag) => normalizeTaxonomySearchKey(tag).includes(query))
      );
    }

    if (filters.categories.length > 0) {
      filtered = filtered.filter((collection) =>
        filters.categories.includes(normalizeCategoryFilterValue(collection.category))
      );
    }

    if (filters.verifiedOnly) {
      filtered = filtered.filter((collection) => collection.verified);
    }

    return filtered;
  }, [filters.categories, filters.query, filters.verifiedOnly, runtimeCollections]);

  const filteredProfiles = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const base = q
      ? sellerProfiles.filter((profile) =>
      profile.displayName.toLowerCase().includes(q) ||
      profile.username.toLowerCase().includes(q) ||
      profile.address.toLowerCase().includes(q)
    )
      : sellerProfiles;
    return filters.verifiedOnly ? base.filter((p) => p.verified) : base;
  }, [filters.query, sellerProfiles, filters.verifiedOnly]);

  // Save search to history when query changes
  useEffect(() => {
    if (filters.query.trim()) {
      const timer = setTimeout(() => {
        saveSearchToHistory(filters.query, filters);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [filters.query]);

  useEffect(() => {
    const syncLikes = () => {
      if (!address) {
        setLikedAssets(new Set());
        setLikedCollections(new Set());
        return;
      }
      const favorites = loadFavorites(address);
      setLikedAssets(new Set(favorites.map((fav) => fav.assetId)));
      const collectionFavorites = loadCollectionFavorites(address);
      setLikedCollections(new Set(collectionFavorites.map((favorite) => favorite.collectionId)));
    };

    syncLikes();
    window.addEventListener(COLLECTIONS_SYNC_EVENT, syncLikes as EventListener);
    return () => {
      window.removeEventListener(COLLECTIONS_SYNC_EVENT, syncLikes as EventListener);
    };
  }, [address]);

  useEffect(() => {
    const syncCollections = () => {
      setRuntimeCollections(loadRuntimeCollections());
    };

    window.addEventListener(COLLECTIONS_SYNC_EVENT, syncCollections as EventListener);
    return () => {
      window.removeEventListener(COLLECTIONS_SYNC_EVENT, syncCollections as EventListener);
    };
  }, []);

  useEffect(() => {
    if (contentMode === 'profiles') {
      if (filters.categories.length > 0 || filters.blockchains.length > 0 || filters.priceRange.min !== null || filters.priceRange.max !== null) {
        setFilters((prev) => ({
          ...prev,
          categories: [],
          blockchains: [],
          priceRange: { min: null, max: null },
        }));
      }
      return;
    }

    if (contentMode === 'collections') {
      const nextCategories = filters.categories.filter((category) =>
        collectionCategoryOptions.some((option) => option.value === category)
      );
      if (
        nextCategories.length !== filters.categories.length ||
        filters.blockchains.length > 0 ||
        filters.priceRange.min !== null ||
        filters.priceRange.max !== null
      ) {
        setFilters((prev) => ({
          ...prev,
          categories: nextCategories,
          blockchains: [],
          priceRange: { min: null, max: null },
        }));
      }
    }
  }, [collectionCategoryOptions, contentMode, filters.blockchains.length, filters.categories, filters.priceRange.max, filters.priceRange.min]);

  const handleRemoveFilter = (key: string, value?: any) => {
    let newFilters = { ...filters };

    switch (key) {
      case 'query':
        newFilters.query = '';
        break;
      case 'category':
        newFilters.categories = newFilters.categories.filter((c) => c !== value);
        break;
      case 'blockchain':
        newFilters.blockchains = newFilters.blockchains.filter((b) => b !== value);
        break;
      case 'priceMin':
        newFilters.priceRange.min = null;
        break;
      case 'priceMax':
        newFilters.priceRange.max = null;
        break;
      case 'verified':
        newFilters.verifiedOnly = false;
        break;
      case 'sortBy':
        newFilters.sortBy = 'date-desc';
        break;
    }

    setFilters(newFilters);
  };

  const handleClearAllFilters = () => {
    setFilters(getDefaultFilters());
  };

  const activeFilterCount = countActiveFilters(filters);

  const handleLike = (assetId: string) => {
    if (!address) {
      toast.error('Please connect wallet to use favorites');
      return;
    }
    const isFav = toggleFavorite(address, assetId);
    setLikedAssets(prev => {
      const next = new Set(prev);
      if (isFav) next.add(assetId);
      else next.delete(assetId);
      return next;
    });
  };

  const handleCollectionLike = (collectionId: string) => {
    if (!address) {
      toast.error('Please connect wallet to use collection favorites');
      return;
    }
    const isFav = toggleCollectionFavorite(address, collectionId);
    setLikedCollections((prev) => {
      const next = new Set(prev);
      if (isFav) next.add(collectionId);
      else next.delete(collectionId);
      return next;
    });
    toast.success(isFav ? 'Added collection to favorites' : 'Removed collection from favorites');
  };

  const handleAssetClick = (assetId: string) => {
    const asset = getMarketplaceCatalogAssetById(assetId, marketplaceAssets);
    if (asset) {
      setSelectedAsset(asset);
      setIsModalOpen(true);
    }
  };

  const handleCollectionClick = (collectionId: string) => {
    setSelectedCollectionId(collectionId);
    setIsCollectionModalOpen(true);
  };

  const handleProfileFollowChange = () => {
    setSellerProfiles(getMockSellerProfiles());
  };

  const resultCount =
    contentMode === 'profiles'
      ? filteredProfiles.length
      : contentMode === 'collections'
      ? filteredCollections.length
      : filteredAssets.length;

  const handleContentModeChange = (nextMode: 'assets' | 'profiles' | 'collections') => {
    setContentMode(nextMode);
    if (nextMode !== 'assets') {
      setFilters((prev) => ({
        ...prev,
        categories: nextMode === 'collections'
          ? prev.categories.filter((category) =>
              collectionCategoryOptions.some((option) => option.value === category)
            )
          : [],
        blockchains: [],
        priceRange: { min: null, max: null },
      }));
    }
  };

  return (
    <div className="search-page-theme h-full bg-ui-page overflow-hidden">
      <style>{`
        div::-webkit-scrollbar { width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: var(--t-border-medium); border-radius: 10px; }
      `}</style>

      <div className="h-full flex overflow-hidden">
      <div className="flex-1 min-w-0 p-2.5 pr-0 overflow-hidden">

      {/* Center Column - Results */}
      <section className="h-full overflow-y-auto custom-scrollbar relative z-10">
        <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <StudioPageHeader
          title={
            <>
              {filters.query ? (
                <>Results for "{filters.query}"</>
              ) : (
                contentMode === 'profiles'
                  ? 'Browse Profiles'
                  : contentMode === 'collections'
                  ? 'Browse Collections'
                  : 'Browse All Assets'
              )}
            </>
          }
          subtitle={
            <>
              {resultCount} {contentMode === 'profiles' ? 'profiles' : contentMode === 'collections' ? 'collections' : 'items'} found in marketplace
            </>
          }
          actions={
            <StudioPillGroup className="rounded-xl" compact>
            <StudioPillButton
              onClick={() => handleContentModeChange('assets')}
              active={contentMode === 'assets'}
              className={contentMode === 'assets' ? 'bg-[var(--t-surface-10)] text-ui-primary rounded-lg px-3 py-1.5 shadow-none' : 'text-ui-muted hover:text-ui-primary px-3 py-1.5 rounded-lg'}
            >
              Assets
            </StudioPillButton>
            <StudioPillButton
              onClick={() => handleContentModeChange('profiles')}
              active={contentMode === 'profiles'}
              className={contentMode === 'profiles' ? 'bg-[var(--t-surface-10)] text-ui-primary rounded-lg px-3 py-1.5 shadow-none' : 'text-ui-muted hover:text-ui-primary px-3 py-1.5 rounded-lg'}
            >
              Profiles
            </StudioPillButton>
            <StudioPillButton
              onClick={() => handleContentModeChange('collections')}
              active={contentMode === 'collections'}
              className={contentMode === 'collections' ? 'bg-[var(--t-surface-10)] text-ui-primary rounded-lg px-3 py-1.5 shadow-none' : 'text-ui-muted hover:text-ui-primary px-3 py-1.5 rounded-lg'}
            >
              Collections
            </StudioPillButton>
            <StudioPillButton
              onClick={() => setViewMode('list')}
              active={viewMode === 'list'}
              className={viewMode === 'list' ? 'bg-[var(--t-surface-10)] text-ui-primary rounded-lg px-3 py-1.5 shadow-none' : 'text-ui-muted hover:text-ui-primary px-3 py-1.5 rounded-lg'}
            >
              <List size={18} />
            </StudioPillButton>
            <StudioPillButton
              onClick={() => setViewMode('grid')}
              active={viewMode === 'grid'}
              className={viewMode === 'grid' ? 'bg-[var(--t-surface-10)] text-ui-primary rounded-lg px-3 py-1.5 shadow-none' : 'text-ui-muted hover:text-ui-primary px-3 py-1.5 rounded-lg'}
            >
              <Grid3x3 size={18} />
            </StudioPillButton>
            </StudioPillGroup>
          }
        />

        {/* Result Count & Filters Section */}
        <div className="flex flex-col gap-5 mb-10">
          {/* Result Count */}
          <div className="flex items-center">
            <div className="text-ui-secondary text-sm">
              <span className="text-ui-primary font-bold">{resultCount}</span> results
              {filters.query && (
                <>
                  {' '}for <span className="text-[#2CC295] font-medium">"{filters.query}"</span>
                </>
              )}
            </div>
          </div>

          {/* Filter Tags */}
          {activeFilterCount > 0 && (
            <FilterTags
              filters={filters}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAllFilters}
            />
          )}
        </div>

        {/* Results */}
        {(contentMode === 'assets' && filteredAssets.length === 0) || (contentMode === 'profiles' && filteredProfiles.length === 0) || (contentMode === 'collections' && filteredCollections.length === 0) ? (
          // Empty State
          <EmptyStateCard
            icon={<Search size={30} className="text-ui-muted" />}
            title={contentMode === 'assets' ? 'No results found' : contentMode === 'profiles' ? 'No profiles found' : 'No collections found'}
            description={
              filters.query
                ? `We couldn't find any ${contentMode === 'profiles' ? 'profiles' : contentMode === 'collections' ? 'collections' : 'assets'} matching "${filters.query}". Try adjusting your search or filters.`
                : 'Try adjusting your filters to see more results.'
            }
            className="py-20"
            action={activeFilterCount > 0 ? (
              <StudioActionButton
                onClick={handleClearAllFilters}
                variant="primary"
                className="px-6 py-3 text-sm rounded-lg"
              >
                Clear All Filters
              </StudioActionButton>
            ) : undefined}
          />
        ) : (
          // Results List/Grid
          <div className={`
            ${contentMode === 'profiles'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
              : contentMode === 'collections'
              ? viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
              : viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
            }
          `}>
            {contentMode === 'assets' ? (
              <AnimatePresence mode="popLayout">
                {filteredAssets.map((asset) => (
                  <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SearchResultCard
                      asset={asset}
                      viewMode={viewMode}
                      onLike={handleLike}
                      onClick={handleAssetClick}
                      isLiked={likedAssets.has(asset.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : contentMode === 'profiles' ? (
              filteredProfiles.map((profile) => (
                <ProfileSearchCard
                  key={profile.address}
                  profile={profile}
                  viewMode={viewMode}
                  onViewProfile={onNavigateToUserProfile}
                  onFollowChange={handleProfileFollowChange}
                />
              ))
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredCollections.map((collection) => (
                  <motion.div
                    key={collection.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CollectionCard
                      collection={collection}
                      viewMode={viewMode}
                      onLike={handleCollectionLike}
                      onClick={handleCollectionClick}
                      isLiked={likedCollections.has(collection.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        )}
        </div>
      </section>
      </div>

      {/* Right Sidebar - Filters */}
      <StudioSidebarShell widthClassName="w-[344px]" className="bg-ui-page border-l-0 p-2.5">
        <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <StudioSidebarHeader className="p-5 border-b border-[var(--t-border-subtle)]">
          <h2 className="text-ui-primary font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Search className="text-primary" size={18} />
            Search Filters
          </h2>
          <p className="text-xs text-ui-muted mt-1">Refine your search results</p>
        </StudioSidebarHeader>

        {/* Scrollable Content */}
        <StudioSidebarScroll className="p-4 space-y-4">
          {/* Filters */}
          <div className="space-y-4">
            {contentMode === 'assets' && (
              <div className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px]">
                <label className="text-[10px] font-bold text-ui-muted uppercase block mb-4">
                  Price Range (ETH)
                </label>
                <PriceRangeSlider
                  min={marketplacePriceRange.min}
                  max={marketplacePriceRange.max}
                  value={[
                    filters.priceRange.min ?? marketplacePriceRange.min,
                    filters.priceRange.max ?? marketplacePriceRange.max
                  ]}
                  onChange={(value) => {
                    setFilters({
                      ...filters,
                      priceRange: { min: value[0], max: value[1] }
                    });
                  }}
                  step={0.01}
                />
              </div>
            )}

            {/* Blockchain */}
            {contentMode === 'assets' && (
              <div className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px]">
                <label className="text-[10px] font-bold text-ui-muted uppercase block mb-4">
                  Blockchain
                </label>
                <CustomDropdown
                  defaultValue={filters.blockchains[0] || 'all'}
                  onChange={(value) => {
                    setFilters({ ...filters, blockchains: value === 'all' ? [] : [value] });
                  }}
                  options={[
                    { value: 'all', label: 'All Blockchains' },
                    ...marketplaceBlockchains.map((blockchain) => ({ value: blockchain, label: blockchain })),
                  ]}
                  variant="compact"
                  className="w-full"
                />
              </div>
            )}

            {/* Status */}
            <div className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px]">
              <label className="text-[10px] font-bold text-ui-muted uppercase block mb-4">
                Status
              </label>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer group p-2 rounded-lg hover:bg-[var(--t-surface-hover)] transition-colors">
                  <span className="text-sm text-ui-secondary group-hover:text-ui-primary transition-colors">
                    Verified Only
                  </span>
                  <ToggleSwitch
                    checked={filters.verifiedOnly}
                    onChange={(checked) => setFilters({ ...filters, verifiedOnly: checked })}
                  />
                </label>
                {contentMode === 'assets' && (
                  <>
                    <label className="flex items-center justify-between cursor-pointer group p-2 rounded-lg hover:bg-[var(--t-surface-hover)] transition-colors">
                      <span className="text-sm text-ui-secondary group-hover:text-ui-primary transition-colors">
                        On Sale
                      </span>
                      <ToggleSwitch
                        checked={false}
                        onChange={() => {}}
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer group p-2 rounded-lg hover:bg-[var(--t-surface-hover)] transition-colors">
                      <span className="text-sm text-ui-secondary group-hover:text-ui-primary transition-colors">
                        New Drops
                      </span>
                      <ToggleSwitch
                        checked={false}
                        onChange={() => {}}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Categories */}
            {contentMode !== 'profiles' && (
              <div className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px]">
                <label className="text-[10px] font-bold text-ui-muted uppercase block mb-4">
                  Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {visibleCategoryOptions.map((category) => (
                    <button
                      key={category.value}
                      onClick={() => {
                        const newCategories = filters.categories.includes(category.value)
                          ? filters.categories.filter(c => c !== category.value)
                          : [...filters.categories, category.value];
                        setFilters({ ...filters, categories: newCategories });
                      }}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors
                        ${filters.categories.includes(category.value)
                          ? 'bg-[#2CC295]/10 text-[#2CC295] border-[#2CC295]/20'
                          : 'bg-ui-input text-ui-secondary border-ui-border-subtle hover:bg-[var(--t-surface-hover)]'
                        }
                      `}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Market Trends */}
          <div className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[11px] uppercase font-bold text-ui-muted">Market Trends</h2>
              <span className="text-[10px] text-[#2CC295] bg-[#2CC295]/10 px-2 py-0.5 rounded font-bold uppercase">
                Live
              </span>
            </div>
            <div className="space-y-4">
              <StudioPanel className="p-4 rounded-xl bg-[var(--t-surface-5)]">
                <p className="text-[10px] font-bold text-ui-muted uppercase mb-1">Floor Price Trend</p>
                <div className="flex items-end justify-between">
                  <span className="text-xl font-bold text-ui-primary">1.12 ETH</span>
                  <span className="text-xs text-[#2CC295] font-bold flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    +12.4%
                  </span>
                </div>
                {/* Mini Chart */}
                <div className="mt-4 flex items-end gap-1 h-12">
                  <div className="flex-1 bg-[var(--t-surface-10)] rounded-t-sm" style={{ height: '40%' }}></div>
                  <div className="flex-1 bg-[var(--t-surface-10)] rounded-t-sm" style={{ height: '60%' }}></div>
                  <div className="flex-1 bg-[var(--t-surface-10)] rounded-t-sm" style={{ height: '50%' }}></div>
                  <div className="flex-1 bg-[var(--t-surface-10)] rounded-t-sm" style={{ height: '80%' }}></div>
                  <div className="flex-1 bg-[#2CC295] rounded-t-sm" style={{ height: '95%' }}></div>
                  <div className="flex-1 bg-[#2CC295] rounded-t-sm" style={{ height: '100%' }}></div>
                </div>
              </StudioPanel>
            </div>
          </div>
        </StudioSidebarScroll>
        </div>
      </StudioSidebarShell>

      {/* Product Modal */}
      {isModalOpen && selectedAsset && (
        <AssetDetailsModal
          asset={selectedAsset}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      <CollectionDetailsModal
        isOpen={isCollectionModalOpen}
        collectionId={selectedCollectionId}
        onClose={() => {
          setIsCollectionModalOpen(false);
          setSelectedCollectionId(null);
        }}
      />
      </div>
    </div>
  );
}
