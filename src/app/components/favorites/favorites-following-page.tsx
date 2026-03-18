import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Heart, UserPlus, DollarSign, TrendingUp } from 'lucide-react';
import { FavoriteSortOption } from '@/types/favorites';
import { SearchResultCard } from '@/app/components/search-result-card';
import { ProfileSearchCard } from '@/app/components/profile-search-card';
import { CollectionCard } from '@/app/components/collection-card';
import { CollectionDetailsModal } from '@/app/components/collections/collection-details-modal';
import { MarketplaceAsset } from '@/app/types/asset';
import type { CollectionSummary } from '@/types/collection';
import {
  loadFavorites,
  toggleFavorite,
} from '@/utils/favoritesUtils';
import {
  COLLECTIONS_SYNC_EVENT,
  loadFavoriteCollectionSummaries,
  loadFollowedCollectionSummaries,
  toggleCollectionFavorite,
} from '@/utils/collectionsUtils';
import {
  calculateMarketplaceFavoritesStats,
  loadFavoriteMarketplaceAssets,
  sortFavoriteMarketplaceAssets,
} from '@/utils/favoriteMarketplaceUtils';
import { getMockSellerProfiles, SellerProfileCardData } from '@/utils/mockSellerProfiles';
import { createDefaultProfile, loadUserProfile, shortenUserDisplayName } from '@/utils/profileUtils';
import { ASSET_METADATA_CHANGED_EVENT } from '@/utils/assetMetadataSync';
import { toast } from 'sonner';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { EmptyStateCard } from '@/app/components/ui/empty-state-card';
import { StudioPillGroup, StudioPillButton } from '@/app/components/ui/studio-pill-group';
import { StudioPageHeader } from '@/app/components/ui/studio-page-header';
import { StudioStatsCard } from '@/app/components/ui/studio-stats-card';

interface FavoritesFollowingPageProps {
  currentUserId?: string;
  initialTab?: 'favorites' | 'following';
  onNavigateToAsset?: (assetId: string) => void;
  onNavigateToUserProfile?: (walletAddress: string) => void;
}

type TabType = 'favorites' | 'following';
type FavoritesViewMode = 'assets' | 'collections';
type FollowingViewMode = 'profiles' | 'collections';

export function FavoritesFollowingPage({
  currentUserId = 'user_current',
  initialTab = 'favorites',
  onNavigateToAsset,
  onNavigateToUserProfile,
}: FavoritesFollowingPageProps) {
  const { address } = useAccount();
  const storageUserId = address || currentUserId;

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [sortBy, setSortBy] = useState<FavoriteSortOption>('recent');
  const [favoriteAssets, setFavoriteAssets] = useState<MarketplaceAsset[]>([]);
  const [favoriteCollections, setFavoriteCollections] = useState<CollectionSummary[]>([]);
  const [followingProfiles, setFollowingProfiles] = useState<SellerProfileCardData[]>([]);
  const [followingCollections, setFollowingCollections] = useState<CollectionSummary[]>([]);
  const [favoritesViewMode, setFavoritesViewMode] = useState<FavoritesViewMode>('assets');
  const [followingViewMode, setFollowingViewMode] = useState<FollowingViewMode>('profiles');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    loadFavoritesData();
    loadFavoriteCollectionsData();
    loadFollowingData();
    loadFollowingCollectionsData();
  }, [storageUserId]);

  useEffect(() => {
    const refresh = () => {
      loadFollowingData();
      loadFollowingCollectionsData();
      loadFavoritesData();
      loadFavoriteCollectionsData();
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('orina:profile-changed', refresh as EventListener);
    window.addEventListener(ASSET_METADATA_CHANGED_EVENT, refresh as EventListener);
    window.addEventListener(COLLECTIONS_SYNC_EVENT, refresh as EventListener);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('orina:profile-changed', refresh as EventListener);
      window.removeEventListener(ASSET_METADATA_CHANGED_EVENT, refresh as EventListener);
      window.removeEventListener(COLLECTIONS_SYNC_EVENT, refresh as EventListener);
      window.removeEventListener('storage', refresh);
    };
  }, [storageUserId]);

  const loadFavoritesData = () => {
    setFavoriteAssets(loadFavoriteMarketplaceAssets(storageUserId));
  };

  const loadFavoriteCollectionsData = () => {
    setFavoriteCollections(loadFavoriteCollectionSummaries(storageUserId));
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

  const loadFollowingCollectionsData = () => {
    setFollowingCollections(loadFollowedCollectionSummaries(storageUserId));
  };

  const sortedAssets = useMemo(() => {
    const favorites = loadFavorites(storageUserId);
    return sortFavoriteMarketplaceAssets(favoriteAssets, sortBy, favorites);
  }, [favoriteAssets, sortBy, storageUserId]);

  const favoritesStats = useMemo(() => calculateMarketplaceFavoritesStats(favoriteAssets), [favoriteAssets]);

  const handleToggleFavorite = (assetId: string) => {
    const isFav = toggleFavorite(storageUserId, assetId);
    loadFavoritesData();
    toast.success(isFav ? 'Added to favorites' : 'Removed from favorites');
  };

  const handleToggleCollectionFavorite = (collectionId: string) => {
    const isFav = toggleCollectionFavorite(storageUserId, collectionId);
    loadFavoriteCollectionsData();
    toast.success(isFav ? 'Added collection to favorites' : 'Removed collection from favorites');
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

  const handleCollectionClick = (collectionId: string) => {
    setSelectedCollectionId(collectionId);
    setIsCollectionModalOpen(true);
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
              value={`${favoriteAssets.length + favoriteCollections.length} Items`}
              icon={<Heart size={20} className="text-[#2CC295]" />}
              meta={<span className="text-[#2CC295]">{favoriteAssets.length} assets · {favoriteCollections.length} collections</span>}
            />

            <StudioStatsCard
              label="Total Value"
              value={`${favoritesStats.totalValue.toFixed(2)} ETH`}
              icon={<DollarSign size={20} className="text-[#2CC295]" />}
              meta={<span className="text-zinc-500">~${(favoritesStats.totalValue * 2800).toFixed(2)} USD</span>}
            />

            <StudioStatsCard
              label="Following"
              value={`${followingProfiles.length + followingCollections.length} Items`}
              icon={<UserPlus size={20} className="text-[#2CC295]" />}
              meta={<span className="text-zinc-500">{followingProfiles.length} profiles · {followingCollections.length} collections</span>}
            />
          </div>

            {activeTab === 'favorites' ? (
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Favorites Management</h3>
                <StudioPillGroup compact>
                  <StudioPillButton active={favoritesViewMode === 'assets'} onClick={() => setFavoritesViewMode('assets')}>
                    Assets
                  </StudioPillButton>
                  <StudioPillButton active={favoritesViewMode === 'collections'} onClick={() => setFavoritesViewMode('collections')}>
                    Collections
                  </StudioPillButton>
                </StudioPillGroup>
              </div>

              {favoritesViewMode === 'assets' ? (
                sortedAssets.length === 0 ? (
                  <EmptyStateCard
                    icon={<Heart size={30} className="text-zinc-700" />}
                    title="No favorites yet"
                    description="Start adding assets to your favorites"
                    className="py-16 px-6 text-center"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                    {sortedAssets.map((asset) => (
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
                )
              ) : favoriteCollections.length === 0 ? (
                <EmptyStateCard
                  icon={<Heart size={30} className="text-zinc-700" />}
                  title="No favorite collections yet"
                  description="Start adding collections to your favorites from Marketplace or Search."
                  className="py-16 px-6 text-center"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                  {favoriteCollections.map((collection) => (
                    <div key={collection.id} className="w-full">
                      <CollectionCard
                        collection={collection}
                        viewMode="grid"
                        onLike={handleToggleCollectionFavorite}
                        onClick={handleCollectionClick}
                        isLiked={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            ) : (
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                    {followingViewMode === 'profiles' ? 'Following Profiles' : 'Following Collections'}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                    <TrendingUp size={14} className="text-[#2CC295]" />
                    {followingViewMode === 'profiles'
                      ? 'Follow in Marketplace/Search to populate this tab'
                      : 'Collection follows are synced per wallet'}
                  </div>
                </div>
                <StudioPillGroup compact>
                  <StudioPillButton active={followingViewMode === 'profiles'} onClick={() => setFollowingViewMode('profiles')}>
                    Profiles
                  </StudioPillButton>
                  <StudioPillButton active={followingViewMode === 'collections'} onClick={() => setFollowingViewMode('collections')}>
                    Collections
                  </StudioPillButton>
                </StudioPillGroup>
              </div>

              {followingViewMode === 'profiles' ? (
                followingProfiles.length === 0 ? (
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
                )
              ) : followingCollections.length === 0 ? (
                <EmptyStateCard
                  icon={<UserPlus size={28} className="text-zinc-700" />}
                  title="No followed collections yet"
                  description="Collection follows for your wallet will appear here."
                  className="py-16 px-6 text-center"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                  {followingCollections.map((collection) => (
                    <div key={collection.id} className="w-full">
                      <CollectionCard
                        collection={collection}
                        viewMode="grid"
                        onLike={handleToggleCollectionFavorite}
                        onClick={handleCollectionClick}
                        isLiked={favoriteCollections.some((item) => item.id === collection.id)}
                        statusLabel="Following"
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

      <CollectionDetailsModal
        isOpen={isCollectionModalOpen}
        collectionId={selectedCollectionId}
        onClose={() => {
          setIsCollectionModalOpen(false);
          setSelectedCollectionId(null);
        }}
      />
    </div>
  );
}
