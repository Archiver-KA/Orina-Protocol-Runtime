import { Search, List, Grid3x3 } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { ToggleSwitch } from '@/app/components/ui/toggle-switch';
import { FilterTags } from './filter-tags';
import { SearchResultCard } from '@/app/components/search-result-card';
import { ProfileSearchCard } from '@/app/components/profile-search-card';
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
import { MOCK_MARKETPLACE_ASSETS, getAllBlockchains as getMarketplaceBlockchains, getAllCategories as getMarketplaceCategories } from '@/utils/mockMarketplaceData';

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
  const [contentMode, setContentMode] = useState<'assets' | 'profiles'>('assets');
  const [likedAssets, setLikedAssets] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<MarketplaceAsset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { address } = useAccount();
  const [sellerProfiles, setSellerProfiles] = useState(() => getMockSellerProfiles());

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

  const marketplaceAssets = useMemo(() => MOCK_MARKETPLACE_ASSETS, []);
  const marketplaceCategories = useMemo(() => getMarketplaceCategories(), []);
  const marketplaceBlockchains = useMemo(() => getMarketplaceBlockchains(), []);
  const marketplacePriceRange = useMemo(() => getMarketplacePriceRange(marketplaceAssets), [marketplaceAssets]);

  // Filter results
  const filteredAssets = useMemo(() => {
    return filterMarketplaceResults(marketplaceAssets, filters);
  }, [marketplaceAssets, filters]);

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
    if (!address) {
      setLikedAssets(new Set());
      return;
    }
    const favorites = loadFavorites(address);
    setLikedAssets(new Set(favorites.map((fav) => fav.assetId)));
  }, [address]);

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

  const handleAssetClick = (assetId: string) => {
    const asset = marketplaceAssets.find((item) => item.id === assetId);
    if (asset) {
      setSelectedAsset(asset);
      setIsModalOpen(true);
    }
  };

  const handleProfileFollowChange = () => {
    setSellerProfiles(getMockSellerProfiles());
  };

  const resultCount = contentMode === 'profiles' ? filteredProfiles.length : filteredAssets.length;

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
                contentMode === 'profiles' ? 'Browse Profiles' : 'Browse All Assets'
              )}
            </>
          }
          subtitle={
            <>
              {resultCount} {contentMode === 'profiles' ? 'profiles' : 'items'} found in marketplace
            </>
          }
          actions={
            <StudioPillGroup className="rounded-xl" compact>
            <StudioPillButton
              onClick={() => setContentMode('assets')}
              active={contentMode === 'assets'}
              className={contentMode === 'assets' ? 'bg-[var(--t-surface-10)] text-ui-primary rounded-lg px-3 py-1.5 shadow-none' : 'text-ui-muted hover:text-ui-primary px-3 py-1.5 rounded-lg'}
            >
              Assets
            </StudioPillButton>
            <StudioPillButton
              onClick={() => setContentMode('profiles')}
              active={contentMode === 'profiles'}
              className={contentMode === 'profiles' ? 'bg-[var(--t-surface-10)] text-ui-primary rounded-lg px-3 py-1.5 shadow-none' : 'text-ui-muted hover:text-ui-primary px-3 py-1.5 rounded-lg'}
            >
              Profiles
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
        {(contentMode === 'assets' && filteredAssets.length === 0) || (contentMode === 'profiles' && filteredProfiles.length === 0) ? (
          // Empty State
          <EmptyStateCard
            icon={<Search size={30} className="text-ui-muted" />}
            title={contentMode === 'assets' ? 'No results found' : 'No profiles found'}
            description={
              filters.query
                ? `We couldn't find any assets matching "${filters.query}". Try adjusting your search or filters.`
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
            ) : (
              filteredProfiles.map((profile) => (
                <ProfileSearchCard
                  key={profile.address}
                  profile={profile}
                  viewMode={viewMode}
                  onViewProfile={onNavigateToUserProfile}
                  onFollowChange={handleProfileFollowChange}
                />
              ))
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
            {/* Price Range */}
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

            {/* Blockchain */}
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
              </div>
            </div>

            {/* Categories */}
            <div className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px]">
              <label className="text-[10px] font-bold text-ui-muted uppercase block mb-4">
                Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {marketplaceCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      const newCategories = filters.categories.includes(category)
                        ? filters.categories.filter(c => c !== category)
                        : [...filters.categories, category];
                      setFilters({ ...filters, categories: newCategories });
                    }}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors
                      ${filters.categories.includes(category)
                        ? 'bg-[#2CC295]/10 text-[#2CC295] border-[#2CC295]/20'
                        : 'bg-ui-input text-ui-secondary border-ui-border-subtle hover:bg-[var(--t-surface-hover)]'
                      }
                    `}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
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
      </div>
    </div>
  );
}
