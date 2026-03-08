/**
 * MARKETPLACE PAGE
 * ================
 * Marketplace page hiển thị assets đang bán với SearchResultCard component
 * Hỗ trợ Grid/List view, filtering, và search
 */

import { Search, Filter, Grid, List, Map as MapIcon, TrendingUp, Clock, Star, ShieldCheck } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { ToggleSwitch } from '@/app/components/ui/toggle-switch';
import { SearchResultCard } from './search-result-card';
import { ProfileSearchCard } from './profile-search-card';
import { AssetDetailsModal } from './asset-details-modal';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { RealisticWorldMap } from './marketplace/realistic-world-map';
import { useAccount } from 'wagmi';
import { loadFavorites, toggleFavorite } from '@/utils/favoritesUtils';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { getMockSellerProfiles } from '@/utils/mockSellerProfiles';
import { 
  MOCK_MARKETPLACE_ASSETS,
  getMarketplaceStatistics,
  getAllCategories,
  getAllBlockchains 
} from '@/utils/mockMarketplaceData';
import { MarketplaceAsset } from '@/app/types/asset';

interface MarketplaceProps {
  onNavigateToPage?: (page: string) => void;
  onNavigateToUserProfile?: (walletAddress: string) => void;
}

export function Marketplace({ onNavigateToPage, onNavigateToUserProfile }: MarketplaceProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('map');
  const [contentMode, setContentMode] = useState<'assets' | 'profiles'>('assets');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBlockchain, setSelectedBlockchain] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [likedAssets, setLikedAssets] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<MarketplaceAsset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sellerProfiles, setSellerProfiles] = useState(() => getMockSellerProfiles());
  const { address } = useAccount();
  const { requireWalletAction } = useRequireWalletAction(onNavigateToPage);

  const stats = getMarketplaceStatistics();
  const categories = getAllCategories();
  const blockchains = getAllBlockchains();
  useEffect(() => {
    // Keep profile cards in sync with profile edits (displayName/avatar/follow counts).
    const refresh = () => setSellerProfiles(getMockSellerProfiles());
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (!address) {
      setLikedAssets(new Set());
      return;
    }
    const favorites = loadFavorites(address);
    setLikedAssets(new Set(favorites.map((fav) => fav.assetId)));
  }, [address]);

  // Filter assets
  const filteredAssets = useMemo(() => {
    let filtered = [...MOCK_MARKETPLACE_ASSETS];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(query) ||
        asset.description?.toLowerCase().includes(query) ||
        asset.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(asset => asset.category === selectedCategory);
    }

    // Blockchain filter
    if (selectedBlockchain !== 'all') {
      filtered = filtered.filter(asset => asset.blockchain === selectedBlockchain);
    }

    // Verified filter
    if (verifiedOnly) {
      filtered = filtered.filter(asset => asset.verified);
    }

    return filtered;
  }, [searchQuery, selectedCategory, selectedBlockchain, verifiedOnly]);

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = q
      ? sellerProfiles.filter((profile) =>
      profile.displayName.toLowerCase().includes(q) ||
      profile.username.toLowerCase().includes(q) ||
      profile.address.toLowerCase().includes(q)
    )
      : sellerProfiles;
    return verifiedOnly ? base.filter((p) => p.verified) : base;
  }, [searchQuery, sellerProfiles, verifiedOnly]);

  const handleLike = (assetId: string) => {
    if (!address) {
      if (!requireWalletAction({ capability: 'favorite_write', actionLabel: 'use favorites', fallbackPage: 'marketplace' })) return;
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
    const asset = MOCK_MARKETPLACE_ASSETS.find(a => a.id === assetId);
    if (asset) {
      setSelectedAsset(asset);
      setIsModalOpen(true);
    }
  };

  const handleProfileClick = (walletAddress: string) => {
    onNavigateToUserProfile?.(walletAddress);
  };

  const handleProfileFollowChange = () => {
    // Follow state is derived from storage; refresh list so counts/verified merge stays consistent.
    setSellerProfiles(getMockSellerProfiles());
  };

  const handleNavigateToSeller = (sellerAddress: string) => {
    if (onNavigateToPage) {
      onNavigateToPage('seller');
    }
  };

  return (
    <div className="h-full flex flex-col bg-ui-page overflow-hidden relative">
      <style>{`
        div::-webkit-scrollbar { width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
      `}</style>

      {/* Main Content */}
      <div className={`flex-1 relative flex flex-col ${viewMode === 'map' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {/* Secondary Header - View Mode, Stats & Filters */}
        <div className={`relative z-10 px-6 py-3 ${viewMode === 'map' ? 'mb-0' : 'mb-6'}`}>
          <div className="rounded-[24px] bg-[var(--t-card-bg)] border-0 backdrop-blur-[10px] px-3 py-2">
            <div className="flex items-center gap-4">
              {/* Left: View Mode */}
              <div className="flex items-center gap-[2px] bg-[rgba(255,255,255,0.03)] p-1 rounded-[16px] border-0 w-fit shrink-0">
                <button
                  onClick={() => {
                    setContentMode('assets');
                  }}
                  className={`
                    flex items-center justify-center px-3 py-2 rounded-[12px] text-xs font-bold transition-all
                    ${contentMode === 'assets' ? 'bg-[rgba(255,255,255,0.08)] text-ui-primary' : 'text-ui-muted hover:text-ui-secondary'}
                  `}
                >
                  Assets
                </button>
                <button
                  onClick={() => {
                    setContentMode('profiles');
                    if (viewMode === 'map') setViewMode('grid');
                  }}
                  className={`
                    flex items-center justify-center px-3 py-2 rounded-[12px] text-xs font-bold transition-all
                    ${contentMode === 'profiles' ? 'bg-[rgba(255,255,255,0.08)] text-ui-primary' : 'text-ui-muted hover:text-ui-secondary'}
                  `}
                >
                  Profiles
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`
                    flex items-center justify-center p-2 rounded-[12px] transition-all
                    ${viewMode === 'grid'
                      ? 'bg-[rgba(255,255,255,0.08)] text-ui-primary'
                      : 'text-ui-muted hover:text-ui-secondary'
                    }
                  `}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`
                    flex items-center justify-center p-2 rounded-[12px] transition-all
                    ${viewMode === 'list'
                      ? 'bg-[rgba(255,255,255,0.08)] text-ui-primary'
                      : 'text-ui-muted hover:text-ui-secondary'
                    }
                  `}
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  disabled={contentMode === 'profiles'}
                  className={`
                    flex items-center justify-center p-2 rounded-[12px] transition-all
                    ${viewMode === 'map'
                      ? 'bg-[rgba(255,255,255,0.08)] text-ui-primary'
                      : 'text-ui-muted hover:text-ui-secondary'
                    }
                    ${contentMode === 'profiles' ? 'opacity-40 cursor-not-allowed' : ''}
                  `}
                >
                  <MapIcon size={16} />
                </button>
              </div>

              {/* Center: Filters */}
              <div className="flex-1 flex items-center gap-3 min-w-0">
                {/* Search */}
                <div className="relative flex-1 max-w-[500px]">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={contentMode === 'profiles' ? 'Search profiles...' : 'Search assets...'}
                    className="w-full pl-9 pr-3 py-2.5 bg-ui-input border border-ui-border-subtle rounded-full text-sm text-ui-primary placeholder:text-ui-muted focus:outline-none focus:border-[#2CC295] focus:ring-2 focus:ring-[#2CC295]/25 transition-all"
                  />
                </div>

                {/* Category */}
                <div className="w-[210px] shrink-0">
                  <CustomDropdown
                    defaultValue={selectedCategory}
                    onChange={setSelectedCategory}
                    options={[
                      { value: 'all', label: 'All Categories' },
                      ...categories.map(cat => ({ value: cat, label: cat }))
                    ]}
                    variant="compact"
                    className={contentMode === 'profiles' ? 'opacity-50 pointer-events-none' : ''}
                  />
                </div>

                {/* Blockchain */}
                <div className="w-[210px] shrink-0">
                  <CustomDropdown
                    defaultValue={selectedBlockchain}
                    onChange={setSelectedBlockchain}
                    options={[
                      { value: 'all', label: 'All Blockchains' },
                      ...blockchains.map(chain => ({ value: chain, label: chain }))
                    ]}
                    variant="compact"
                    className={contentMode === 'profiles' ? 'opacity-50 pointer-events-none' : ''}
                  />
                </div>

                {/* Verified Toggle */}
                <div className="flex items-center gap-2 shrink-0 pr-1">
                  <ShieldCheck size={16} className={`transition-colors ${verifiedOnly ? 'text-primary' : 'text-ui-muted'}`} />
                  <span className={`text-xs font-bold transition-colors ${verifiedOnly ? 'text-primary' : 'text-ui-muted'}`}>Verified</span>
                  <ToggleSwitch
                    checked={verifiedOnly}
                    onChange={setVerifiedOnly}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {viewMode !== 'map' && <div className="px-8 pb-8">
        {/* Results: Grid/List/Map View */}
        {(contentMode === 'assets' && filteredAssets.length === 0) || (contentMode === 'profiles' && filteredProfiles.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 px-8">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-[#27272a]">
              <Search size={40} className="text-ui-muted" />
            </div>
            <h3 className="text-xl font-bold text-ui-primary mb-2">
              {contentMode === 'assets' ? 'No assets found' : 'No profiles found'}
            </h3>
            <p className="text-sm text-ui-muted text-center max-w-md">
              Try adjusting your filters to see more results.
            </p>
          </div>
        ) : (
          <div className={`
            ${contentMode === 'profiles'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
              : viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
            }
          `}>
            {contentMode === 'assets' ? (
              filteredAssets.map((asset) => (
                <SearchResultCard
                  key={asset.id}
                  asset={asset}
                  viewMode={viewMode}
                  onLike={handleLike}
                  onClick={handleAssetClick}
                  isLiked={likedAssets.has(asset.id)}
                />
              ))
            ) : (
              filteredProfiles.map((profile) => (
                <ProfileSearchCard
                  key={profile.address}
                  profile={profile}
                  viewMode={viewMode === 'list' ? 'list' : 'grid'}
                  onViewProfile={handleProfileClick}
                  onFollowChange={handleProfileFollowChange}
                />
              ))
            )}
          </div>
        )}
        </div>}

        {viewMode === 'map' && contentMode === 'assets' && (
          <div className="flex-1 min-h-0 px-2.5 pb-0 pt-3">
            <div className="h-full rounded-t-[24px] overflow-hidden">
              <RealisticWorldMap
                filteredAssets={filteredAssets.map((asset, index) => ({
                  id: parseInt(asset.id.replace(/\D/g, '')) || index,
                  name: asset.name,
                  collection: asset.category,
                  price: asset.price,
                  usdPrice: asset.priceUSD || '$0',
                  rarity: asset.verified ? 'Legendary' : 'Common',
                  rarityColor: asset.verified ? 'text-primary' : 'text-ui-secondary',
                  image: asset.image,
                  latitude: (Math.random() * 60) - 30, // Mock latitude -30 to 30
                  longitude: (Math.random() * 360) - 180, // Mock longitude -180 to 180
                  city: asset.tags?.[0] || 'Unknown',
                  seller: {
                    name: asset.seller.ensName || asset.seller.address.slice(0, 10),
                    rating: `${asset.seller.reputation}%`
                  },
                  verified: asset.verified
                }))}
                onAssetClick={(mapAsset) => {
                  const asset = filteredAssets.find(a => a.name === mapAsset.name);
                  if (asset) {
                    setSelectedAsset(asset);
                    setIsModalOpen(true);
                  }
                }}
                selectedAssetId={null}
                onMarkerClick={(id) => {}}
                verifiedOnly={verifiedOnly}
                onToggleVerified={setVerifiedOnly}
              />
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {isModalOpen && selectedAsset && (
        <AssetDetailsModal
          asset={selectedAsset}
          onClose={() => setIsModalOpen(false)}
          onNavigateToSeller={handleNavigateToSeller}
        />
      )}
    </div>
  );
}
