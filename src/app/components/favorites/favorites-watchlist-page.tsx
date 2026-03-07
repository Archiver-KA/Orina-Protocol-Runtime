import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Heart, UserPlus, DollarSign, TrendingUp } from 'lucide-react';
import { AssetDetails } from '@/types/asset';
import { FavoriteFilterOption, FavoriteSortOption } from '@/types/favorites';
import { SearchResultCard } from '@/app/components/search-result-card';
import { ProfileSearchCard } from '@/app/components/profile-search-card';
import { MarketplaceAsset } from '@/app/types/asset';
import {
  loadFavorites,
  sortFavoriteAssets,
  calculateFavoritesStats,
  toggleFavorite,
} from '@/utils/favoritesUtils';
import { getMockSellerProfiles, SellerProfileCardData } from '@/utils/mockSellerProfiles';
import { createDefaultProfile, loadUserProfile, shortenUserDisplayName } from '@/utils/profileUtils';
import { getMarketplaceAssetById } from '@/utils/mockMarketplaceData';
import { generateMockAsset } from '@/utils/mockAssetData';
import { ASSET_METADATA_CHANGED_EVENT } from '@/utils/assetMetadataSync';
import { toast } from 'sonner';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { EmptyStateCard } from '@/app/components/ui/empty-state-card';
import { StudioPillGroup, StudioPillButton } from '@/app/components/ui/studio-pill-group';
import { StudioPageHeader } from '@/app/components/ui/studio-page-header';
import { StudioStatsCard } from '@/app/components/ui/studio-stats-card';

interface FavoritesWatchlistPageProps {
  currentUserId?: string;
  initialTab?: 'favorites' | 'following';
  onNavigateToAsset?: (assetId: string) => void;
  onNavigateToUserProfile?: (walletAddress: string) => void;
}

type TabType = 'favorites' | 'following';

export function FavoritesWatchlistPage({
  currentUserId = 'user_current',
  initialTab = 'favorites',
  onNavigateToAsset,
  onNavigateToUserProfile,
}: FavoritesWatchlistPageProps) {
  const { address } = useAccount();
  const storageUserId = address || currentUserId;

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [sortBy, setSortBy] = useState<FavoriteSortOption>('recent');
  const [filterBy, setFilterBy] = useState<FavoriteFilterOption>('all');
  const [favoriteAssets, setFavoriteAssets] = useState<AssetDetails[]>([]);
  const [followingProfiles, setFollowingProfiles] = useState<SellerProfileCardData[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    loadFavoritesData();
    loadFollowingData();
  }, [storageUserId]);

  useEffect(() => {
    const refresh = () => {
      loadFollowingData();
      loadFavoritesData();
    };
    window.addEventListener('focus', refresh);
    window.addEventListener(ASSET_METADATA_CHANGED_EVENT, refresh as EventListener);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener(ASSET_METADATA_CHANGED_EVENT, refresh as EventListener);
      window.removeEventListener('storage', refresh);
    };
  }, [storageUserId]);

  const loadFavoritesData = () => {
    const favorites = loadFavorites(storageUserId);
    const assets = favorites.map((fav) => {
      const marketplaceAsset = getMarketplaceAssetById(fav.assetId);
      if (marketplaceAsset) {
        return {
          id: marketplaceAsset.id,
          tokenId: marketplaceAsset.tokenId,
          name: marketplaceAsset.name,
          description: marketplaceAsset.description || '',
          category: marketplaceAsset.category,
          blockchain: marketplaceAsset.blockchain,
          currentPrice: marketplaceAsset.price,
          currentPriceUsd: marketplaceAsset.priceUSD || '$0',
          image: marketplaceAsset.image,
          properties: [],
          views: marketplaceAsset.views,
          favorites: marketplaceAsset.likes,
          totalVolume: '0 ETH',
          totalSales: 0,
          currentOwner: marketplaceAsset.seller.address,
          creator: marketplaceAsset.seller.address,
          ownerHistory: [],
          priceHistory: [],
          contractAddress: marketplaceAsset.contractAddress,
          tokenStandard: 'ERC-721',
          mintDate: marketplaceAsset.createdAt,
          lastSale: marketplaceAsset.listedAt,
          verified: marketplaceAsset.verified,
        } as AssetDetails;
      }

      if (/^\d+$/.test(fav.assetId)) {
        return generateMockAsset(fav.assetId);
      }

      return {
        id: fav.assetId,
        tokenId: fav.assetId,
        name: `Asset ${fav.assetId.slice(0, 8)}`,
        description: 'Legacy favorite item',
        category: 'Marketplace',
        blockchain: 'BSC',
        currentPrice: '0 ETH',
        currentPriceUsd: '$0',
        image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800',
        properties: [],
        views: 0,
        favorites: 0,
        totalVolume: '0 ETH',
        totalSales: 0,
        currentOwner: '0x0000000000000000000000000000000000000000',
        creator: '0x0000000000000000000000000000000000000000',
        ownerHistory: [],
        priceHistory: [],
        contractAddress: '0x0000000000000000000000000000000000000000',
        tokenStandard: 'ERC-721',
        mintDate: Date.now(),
        verified: false,
      } as AssetDetails;
    });
    setFavoriteAssets(assets);
  };

  const loadFollowingData = () => {
    if (!storageUserId) {
      setFollowingProfiles([]);
      return;
    }

    const currentProfile = loadUserProfile(storageUserId) || createDefaultProfile(storageUserId);
    const followingAddresses = (currentProfile.following || []).map((addr) => addr.toLowerCase());
    if (followingAddresses.length === 0) {
      setFollowingProfiles([]);
      return;
    }

    const profileMap = new Map(
      getMockSellerProfiles().map((profile) => [profile.address.toLowerCase(), profile])
    );

    const normalizedProfiles = followingAddresses.map((address) => {
      const existing = profileMap.get(address);
      if (existing) return existing;

      const saved = loadUserProfile(address);
      const displayName = saved?.displayName || shortenUserDisplayName(address);
      return {
        address,
        displayName,
        username: saved?.username || `@${address.slice(2, 10)}`,
        bio: saved?.bio || 'Community profile',
        avatarUrl: saved?.avatarUrl || saved?.avatar,
        bannerUrl: saved?.bannerUrl || saved?.banner,
        totalSalesEth: saved?.stats?.totalSales ? `${saved.stats.totalSales.toFixed(2)} ETH` : '0 ETH',
        followers: `${saved?.followers?.length ?? 0}`,
        rating: '4.5',
        floorPriceEth: '0 ETH',
        itemsListed: `${saved?.stats?.assetsOwned ?? 0}`,
        verified: !!saved?.verified,
      } as SellerProfileCardData;
    });

    setFollowingProfiles(normalizedProfiles);
  };

  const filteredAssets = useMemo(() => {
    if (filterBy === 'all') return favoriteAssets;
    return favoriteAssets.filter((asset) => asset.category.toLowerCase() === filterBy.toLowerCase());
  }, [favoriteAssets, filterBy]);

  const sortedAssets = useMemo(() => {
    const favorites = loadFavorites(storageUserId);
    return sortFavoriteAssets(filteredAssets, sortBy, favorites);
  }, [filteredAssets, sortBy, storageUserId]);

  const favoriteMarketplaceAssets = useMemo(() => {
    return sortedAssets.map((asset) => {
      const exactMarketplaceAsset = getMarketplaceAssetById(String(asset.id));
      if (exactMarketplaceAsset) {
        return exactMarketplaceAsset;
      }

      return {
        id: asset.id,
        tokenId: asset.tokenId,
        contractAddress: asset.contractAddress,
        name: asset.name,
        category: asset.category,
        description: asset.description,
        image: asset.image,
        seller: {
          address: asset.currentOwner,
          verified: asset.verified,
        },
        price: asset.currentPrice,
        priceUSD: asset.currentPriceUsd,
        currency: 'ETH',
        listedAt: asset.lastSale || asset.mintDate || Date.now(),
        views: asset.views || 0,
        likes: asset.favorites || 0,
        verified: asset.verified,
        blockchain: (['Ethereum', 'Polygon', 'Arbitrum', 'Base', 'BSC'].includes(asset.blockchain)
          ? asset.blockchain
          : 'BSC') as MarketplaceAsset['blockchain'],
        network: 'mainnet',
        createdAt: asset.mintDate || Date.now(),
        updatedAt: Date.now(),
      };
    });
  }, [sortedAssets]);

  const favoritesStats = useMemo(() => calculateFavoritesStats(favoriteAssets), [favoriteAssets]);

  const handleToggleFavorite = (assetId: string) => {
    const isFav = toggleFavorite(storageUserId, assetId);
    loadFavoritesData();
    toast.success(isFav ? 'Added to favorites' : 'Removed from favorites');
  };

  const handleFollowChange = (walletAddress: string, following: boolean) => {
    if (!following) {
      setFollowingProfiles((prev) =>
        prev.filter((profile) => profile.address.toLowerCase() !== walletAddress.toLowerCase())
      );
    } else {
      loadFollowingData();
    }
  };

  return (
    <div className="h-full bg-ui-page overflow-hidden">
      <div className="h-full p-2.5 overflow-hidden">
        <section className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] overflow-y-auto custom-scrollbar relative z-10">
          <div className="p-6 space-y-8">
          <StudioPageHeader
            title="Favorites & Following"
            subtitle="Manage your saved assets and followed profiles."
            actions={
              <StudioPillGroup>
                <StudioPillButton
                  onClick={() => setActiveTab('favorites')}
                  active={activeTab === 'favorites'}
                  className="px-6"
                >
                  Favorites
                </StudioPillButton>
                <StudioPillButton
                  onClick={() => setActiveTab('following')}
                  active={activeTab === 'following'}
                  className="px-6"
                >
                  Following
                </StudioPillButton>
              </StudioPillGroup>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <StudioStatsCard
              label="Total Favorites"
              value={`${favoriteAssets.length} Assets`}
              icon={<Heart size={20} className="text-[#2CC295]" />}
              meta={<span className="text-[#2CC295]">+{Math.floor(favoriteAssets.length * 0.1)} this week</span>}
            />

            <StudioStatsCard
              label="Total Value"
              value={`${favoritesStats.totalValue.toFixed(2)} ETH`}
              icon={<DollarSign size={20} className="text-[#2CC295]" />}
              meta={<span className="text-zinc-500">~${(favoritesStats.totalValue * 2800).toFixed(2)} USD</span>}
            />

            <StudioStatsCard
              label="Following"
              value={`${followingProfiles.length} Profiles`}
              icon={<UserPlus size={20} className="text-[#2CC295]" />}
              meta={<span className="text-zinc-500">Updated from your follow actions</span>}
            />
          </div>

            {activeTab === 'favorites' ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Favorites Management</h3>
              </div>

              <StudioPillGroup className="flex-wrap mb-6">
                {[
                  ['all', 'All Items'],
                  ['art', 'Art'],
                  ['collectibles', 'Collectibles'],
                  ['luxury', 'Utility'],
                ].map(([value, label]) => (
                  <StudioPillButton
                    key={value}
                    onClick={() => setFilterBy(value as FavoriteFilterOption)}
                    active={filterBy === value}
                  >
                    {label}
                  </StudioPillButton>
                ))}
              </StudioPillGroup>

              {sortedAssets.length === 0 ? (
                <EmptyStateCard
                  icon={<Heart size={30} className="text-zinc-700" />}
                  title="No favorites yet"
                  description="Start adding assets to your favorites"
                  className="py-16 px-6 text-center"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                  {favoriteMarketplaceAssets.map((asset) => (
                    <div key={asset.id} className="w-full">
                      <SearchResultCard
                        asset={asset}
                        viewMode="grid"
                        onLike={handleToggleFavorite}
                        onClick={onNavigateToAsset}
                        isLiked={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Following Profiles</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <TrendingUp size={14} className="text-[#2CC295]" />
                  Follow in Marketplace/Search to populate this tab
                </div>
              </div>

              {followingProfiles.length === 0 ? (
                <EmptyStateCard
                  icon={<UserPlus size={28} className="text-zinc-700" />}
                  title="No following profiles yet"
                  description="Follow profile cards from Marketplace or Search."
                  className="py-16 px-6 text-center"
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                  {followingProfiles.map((profile) => (
                    <div key={profile.address} className="w-full">
                      <ProfileSearchCard
                        profile={profile}
                        viewMode="grid"
                        onViewProfile={onNavigateToUserProfile}
                        onFollowChange={handleFollowChange}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
