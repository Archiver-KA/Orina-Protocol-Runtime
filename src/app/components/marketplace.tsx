/**
 * MARKETPLACE PAGE
 * ================
 * Marketplace page hiển thị assets đang bán với SearchResultCard component
 * Hỗ trợ Grid/List view, filtering, và search
 */

import { Search, Grid, List, Map as MapIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, lazy } from 'react';
import { toast } from 'sonner';
import { SearchResultCard } from './search-result-card';
import { ProfileSearchCard } from './profile-search-card';
import { CollectionCard } from './collection-card';
import { AssetDetailsModal } from './asset-details-modal';
import { CollectionDetailsModal } from '@/app/components/collections/collection-details-modal';
import { EmptyStateCard } from '@/app/components/ui/empty-state-card';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { ProgressiveMarketplaceMapSurface } from '@/app/components/marketplace/progressive-marketplace-map-surface';
import { StudioPillGroup, StudioPillButton } from '@/app/components/ui/studio-pill-group';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import { loadFavorites, toggleFavorite } from '@/utils/favoritesUtils';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { REPUTATION_SYNC_EVENT } from '@/utils/profileReputationSync';
import { PROFILE_SYNC_EVENT } from '@/utils/profileUtils';
import {
  hydrateSellerDirectoryFromSupabase,
  loadSellerDirectorySync,
} from '@/utils/sellerDirectory';
import {
  COLLECTIONS_SYNC_EVENT,
  loadCollectionFavorites,
  loadRuntimeCollections,
  toggleCollectionFavorite,
} from '@/utils/collectionsUtils';
import { MarketplaceAsset } from '@/app/types/asset';
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
  fetchMarketplacePersonalizationRows,
  sortMarketplaceAssetsWithPersonalization,
  type MarketplacePersonalizationRow,
} from '@/utils/marketplacePersonalization';
import { PROTOCOL_NETWORK_OPTIONS } from '@/utils/protocolNetwork';
import {
  getCategoryDisplayLabel,
  getCategoryOptionsFromValues,
  getTaxonomyCategoryOptions,
  getTaxonomySearchText,
  hydrateTaxonomyFromSupabase,
  normalizeCategoryFilterValue,
  normalizeTaxonomySearchKey,
  TAXONOMY_SYNC_EVENT,
} from '@/utils/taxonomy';
import { runtimeFlags } from '/utils/runtimeConfig';

let realisticWorldMapPromise: Promise<typeof import('./marketplace/realistic-world-map')> | null = null;

function preloadRealisticWorldMap() {
  realisticWorldMapPromise ??= import('./marketplace/realistic-world-map');
  return realisticWorldMapPromise;
}

const RealisticWorldMap = lazy(async () => {
  const module = await preloadRealisticWorldMap();
  return { default: module.RealisticWorldMap };
});

const MARKETPLACE_VIEW_MODE_KEY = 'orina_marketplace_view_mode';

function readInitialMarketplaceViewMode(): 'grid' | 'list' | 'map' {
  if (typeof window === 'undefined') return 'grid';

  const storedValue = window.localStorage.getItem(MARKETPLACE_VIEW_MODE_KEY);
  if (storedValue === 'grid' || storedValue === 'list' || storedValue === 'map') {
    return storedValue;
  }

  return 'grid';
}

interface MarketplaceProps {
  onNavigateToPage?: (page: string) => void;
  onNavigateToAsset?: (assetId: string, fromPage?: string) => void;
  onNavigateToCollection?: (collectionId: string, fromPage?: string) => void;
  onNavigateToUserProfile?: (walletAddress: string) => void;
  onNavigateToUserReviews?: (walletAddress: string) => void;
  onNavigateToMessages?: (walletAddress: string) => void;
  navigationRequest?: {
    category: string;
    subcategory?: string;
    requestKey: string;
  } | null;
  onConsumeNavigationRequest?: (requestKey: string) => void;
}

type MarketplaceBlockchainDropdownOption = {
  value: string;
  label: string;
};

const MARKETPLACE_PROTOCOL_BLOCKCHAIN_OPTIONS: MarketplaceBlockchainDropdownOption[] =
  PROTOCOL_NETWORK_OPTIONS.map((network) => ({
    value: network.key,
    label: network.shortLabel,
  }));

function normalizeMarketplaceBlockchainValue(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');
}

function getMarketplaceAssetBlockchainValue(asset: MarketplaceAsset) {
  const blockchain = normalizeMarketplaceBlockchainValue(asset.blockchain);
  const network = normalizeMarketplaceBlockchainValue(asset.network);

  if (blockchain === 'ethereum-mainnet') return 'ethereum';
  if (blockchain === 'polygon-network') return 'polygon';
  if (blockchain === 'arbitrum-one') return 'arbitrum';

  if (
    blockchain === 'bsc' ||
    blockchain === 'bnb' ||
    blockchain === 'bnb-chain' ||
    blockchain === 'bnb-smart-chain' ||
    blockchain === 'smartchain'
  ) {
    return network === 'testnet' ? 'bnb-testnet' : 'bsc';
  }

  return blockchain;
}

function getMarketplaceCatalogBlockchainOption(
  blockchain: string,
): MarketplaceBlockchainDropdownOption | null {
  const normalized = normalizeMarketplaceBlockchainValue(blockchain);
  if (!normalized) return null;

  switch (normalized) {
    case 'ethereum':
    case 'ethereum-mainnet':
      return { value: 'ethereum', label: 'Ethereum' };
    case 'polygon':
    case 'polygon-network':
      return { value: 'polygon', label: 'Polygon' };
    case 'base':
      return { value: 'base', label: 'Base' };
    case 'avalanche':
      return { value: 'avalanche', label: 'Avalanche' };
    case 'solana':
      return { value: 'solana', label: 'Solana' };
    case 'arbitrum':
    case 'arbitrum-one':
      return { value: 'arbitrum', label: 'Arbitrum' };
    case 'bsc':
      return { value: 'bsc', label: 'BSC' };
    default:
      return {
        value: normalized,
        label: blockchain,
      };
  }
}

export function Marketplace({
  onNavigateToPage,
  onNavigateToAsset,
  onNavigateToCollection,
  onNavigateToUserProfile,
  onNavigateToUserReviews,
  onNavigateToMessages,
  navigationRequest,
  onConsumeNavigationRequest,
}: MarketplaceProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>(() => readInitialMarketplaceViewMode());
  const [contentMode, setContentMode] = useState<'assets' | 'profiles' | 'collections'>('assets');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBlockchain, setSelectedBlockchain] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [marketplaceMapViewState, setMarketplaceMapViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 2,
  });
  const [likedAssets, setLikedAssets] = useState<Set<string>>(new Set());
  const [likedCollections, setLikedCollections] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<MarketplaceAsset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [mapEngineRequested, setMapEngineRequested] = useState(false);
  const [marketplaceAssets, setMarketplaceAssets] = useState<MarketplaceAsset[]>(() => loadMarketplaceCatalogSync());
  const [sellerProfiles, setSellerProfiles] = useState(() => loadSellerDirectorySync({ marketplaceAssets: loadMarketplaceCatalogSync() }));
  const [runtimeCollections, setRuntimeCollections] = useState<CollectionSummary[]>(() => loadRuntimeCollections());
  const [personalizationRows, setPersonalizationRows] = useState<MarketplacePersonalizationRow[]>([]);
  const [taxonomyVersion, setTaxonomyVersion] = useState(0);
  const { address } = useEffectiveViewer();
  const { requireWalletAction } = useRequireWalletAction(onNavigateToPage);

  const requestMapEngine = useCallback(() => {
    setMapEngineRequested((current) => {
      if (!current) {
        void preloadRealisticWorldMap();
      }
      return true;
    });
  }, []);

  const handleSetViewMode = (nextMode: 'grid' | 'list' | 'map') => {
    if (nextMode === 'map') {
      void preloadRealisticWorldMap();
    }
    setViewMode(nextMode);
  };

  const assetCategoryOptions = useMemo(
    () => {
      const liveValues = new Set(getMarketplaceCatalogCategories(marketplaceAssets));
      const taxonomyOptions = getTaxonomyCategoryOptions();
      if (!liveValues.size) return taxonomyOptions;

      const orderedLiveOptions = taxonomyOptions.filter((option) => liveValues.has(option.value));
      const knownValues = new Set(orderedLiveOptions.map((option) => option.value));
      const fallbackOptions = Array.from(liveValues)
        .filter((value) => !knownValues.has(value))
        .map((value) => ({ value, label: getCategoryDisplayLabel(value) }));

      return [...orderedLiveOptions, ...fallbackOptions];
    },
    [marketplaceAssets, taxonomyVersion]
  );
  const collectionCategoryOptions = useMemo(
    () => getCategoryOptionsFromValues(runtimeCollections.map((collection) => collection.category)),
    [runtimeCollections, taxonomyVersion]
  );
  const blockchains = useMemo(() => getMarketplaceCatalogBlockchains(marketplaceAssets), [marketplaceAssets]);
  const blockchainOptions = useMemo(() => {
    const protocolValues = new Set(MARKETPLACE_PROTOCOL_BLOCKCHAIN_OPTIONS.map((option) => option.value));
    const mergedOptions = [...MARKETPLACE_PROTOCOL_BLOCKCHAIN_OPTIONS];

    blockchains.forEach((blockchain) => {
      const option = getMarketplaceCatalogBlockchainOption(blockchain);
      if (!option || protocolValues.has(option.value)) return;
      protocolValues.add(option.value);
      mergedOptions.push(option);
    });

    return [
      { value: 'all', label: 'All Blockchains' },
      ...mergedOptions,
    ];
  }, [blockchains]);
  const visibleCategoryOptions = contentMode === 'collections' ? collectionCategoryOptions : assetCategoryOptions;
  useEffect(() => {
    const refresh = () => {
      const syncProfiles = loadSellerDirectorySync({ marketplaceAssets });
      setSellerProfiles((prev) => (syncProfiles.length > 0 || prev.length === 0 ? syncProfiles : prev));
      void hydrateSellerDirectoryFromSupabase({ marketplaceAssets })
        .then((nextProfiles) => {
          setSellerProfiles(nextProfiles);
        })
        .catch(() => undefined);
    };

    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener(PROFILE_SYNC_EVENT, refresh as EventListener);
    window.addEventListener(REPUTATION_SYNC_EVENT, refresh as EventListener);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener(PROFILE_SYNC_EVENT, refresh as EventListener);
      window.removeEventListener(REPUTATION_SYNC_EVENT, refresh as EventListener);
    };
  }, [marketplaceAssets]);

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

  useEffect(() => {
    if (!selectedAsset) return;

    const nextSelectedAsset = getMarketplaceCatalogAssetById(selectedAsset.id, marketplaceAssets);
    if (nextSelectedAsset && nextSelectedAsset !== selectedAsset) {
      setSelectedAsset(nextSelectedAsset);
    }
  }, [marketplaceAssets, selectedAsset]);

  useEffect(() => {
    const syncTaxonomy = () => {
      setTaxonomyVersion((value) => value + 1);
    };

    void hydrateTaxonomyFromSupabase().catch(() => undefined);
    window.addEventListener(TAXONOMY_SYNC_EVENT, syncTaxonomy as EventListener);
    return () => {
      window.removeEventListener(TAXONOMY_SYNC_EVENT, syncTaxonomy as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!navigationRequest) return;

    const normalizedCategory = normalizeCategoryFilterValue(
      navigationRequest.category,
      navigationRequest.subcategory,
    );

    setContentMode('assets');
    setSearchQuery('');
    setSelectedBlockchain('all');
    setVerifiedOnly(false);
    setSelectedCategory(normalizedCategory || 'all');

    onConsumeNavigationRequest?.(navigationRequest.requestKey);
  }, [navigationRequest, onConsumeNavigationRequest]);

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
      if (selectedCategory !== 'all') setSelectedCategory('all');
      if (selectedBlockchain !== 'all') setSelectedBlockchain('all');
      return;
    }

    if (contentMode === 'collections') {
      if (selectedBlockchain !== 'all') setSelectedBlockchain('all');
      if (selectedCategory !== 'all' && !collectionCategoryOptions.some((option) => option.value === selectedCategory)) {
        setSelectedCategory('all');
      }
      return;
    }

    if (selectedBlockchain !== 'all' && !blockchainOptions.some((option) => option.value === selectedBlockchain)) {
      setSelectedBlockchain('all');
    }

    if (selectedCategory !== 'all' && !assetCategoryOptions.some((option) => option.value === selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [assetCategoryOptions, blockchainOptions, collectionCategoryOptions, contentMode, selectedBlockchain, selectedCategory]);

  useEffect(() => {
    if (contentMode !== 'assets' || viewMode !== 'map') {
      setVerifiedOnly(false);
    }
  }, [contentMode, viewMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MARKETPLACE_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  // Filter assets
  const filteredAssets = useMemo(() => {
    let filtered = [...marketplaceAssets];

    // Search filter
    if (searchQuery) {
      const query = normalizeTaxonomySearchKey(searchQuery);
      filtered = filtered.filter(asset =>
        normalizeTaxonomySearchKey(asset.name).includes(query) ||
        normalizeTaxonomySearchKey(asset.description || '').includes(query) ||
        normalizeTaxonomySearchKey(getTaxonomySearchText(asset.category)).includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((asset) => normalizeCategoryFilterValue(asset.category) === selectedCategory);
    }

    // Blockchain filter
    if (selectedBlockchain !== 'all') {
      filtered = filtered.filter((asset) => getMarketplaceAssetBlockchainValue(asset) === selectedBlockchain);
    }

    // Verified filter
    if (verifiedOnly) {
      filtered = filtered.filter(asset => asset.verified);
    }

    return filtered;
  }, [marketplaceAssets, searchQuery, selectedCategory, selectedBlockchain, taxonomyVersion, verifiedOnly]);

  useEffect(() => {
    if (contentMode !== 'assets' || !runtimeFlags.enableMarketplacePersonalization) {
      setPersonalizationRows([]);
      return;
    }

    if (filteredAssets.length === 0) {
      setPersonalizationRows([]);
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(() => {
      void fetchMarketplacePersonalizationRows(filteredAssets, {
        surface: 'marketplace_browse',
        limit: filteredAssets.length,
      }).then((rows) => {
        if (cancelled) return;
        setPersonalizationRows(rows);
      });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [address, contentMode, filteredAssets]);

  const displayedAssets = useMemo(
    () => (
      runtimeFlags.enableMarketplacePersonalization && contentMode === 'assets'
        ? sortMarketplaceAssetsWithPersonalization(filteredAssets, personalizationRows)
        : filteredAssets
    ),
    [contentMode, filteredAssets, personalizationRows],
  );

  const filteredCollections = useMemo(() => {
    let filtered = [...runtimeCollections];

    if (searchQuery) {
      const query = normalizeTaxonomySearchKey(searchQuery);
      filtered = filtered.filter((collection) =>
        normalizeTaxonomySearchKey(collection.name).includes(query) ||
        normalizeTaxonomySearchKey(collection.description).includes(query) ||
        normalizeTaxonomySearchKey(getTaxonomySearchText(collection.category)).includes(query) ||
        collection.tags.some((tag) => normalizeTaxonomySearchKey(tag).includes(query))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (collection) => normalizeCategoryFilterValue(collection.category) === selectedCategory
      );
    }

    if (verifiedOnly) {
      filtered = filtered.filter((collection) => collection.verified);
    }

    return filtered;
  }, [runtimeCollections, searchQuery, selectedCategory, taxonomyVersion, verifiedOnly]);

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

  const mapAssets = useMemo(
    () =>
      displayedAssets.flatMap((asset, index) => {
        const coordinates = asset.assetLocationSnapshot?.coordinates;
        if (!coordinates) return [];

        return [
          {
            id: parseInt(asset.id.replace(/\D/g, '')) || index,
            name: asset.name,
            categoryLabel: getCategoryDisplayLabel(asset.category),
            price: asset.price,
            usdPrice: asset.priceUSD || '$0',
            image: asset.image,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            city:
              asset.assetLocationSnapshot?.geoPath[asset.assetLocationSnapshot.geoPath.length - 1]?.name ||
              asset.assetLocationSnapshot?.countryNameSnapshot ||
              'Unknown',
            countryCode: asset.assetLocationSnapshot?.countryCode || '',
            locationPrecision: asset.assetLocationSnapshot?.precision || 'unstructured',
            assetKey: asset.id,
            supplierKey: asset.seller.address || asset.seller.ensName || 'unknown-supplier',
            trustScore: Math.max(0, Math.min(100, asset.seller.reputation ?? (asset.seller.verified ? 80 : 50))),
            successfulSales: Math.max(0, (asset.totalSlots || 0) - (asset.availableSlots || 0)),
            views: asset.views || 0,
            likes: asset.likes || 0,
            rank: asset.rank,
            totalSlots: asset.totalSlots || 0,
            availableSlots: asset.availableSlots || 0,
            displayScore:
              Math.max(0, Math.min(100, asset.seller.reputation ?? (asset.seller.verified ? 80 : 50))) * 0.45 +
              Math.max(0, (asset.totalSlots || 0) - (asset.availableSlots || 0)) * 3 +
              Math.log1p(asset.views || 0) * 7 +
              Math.log1p(asset.likes || 0) * 10 +
              (asset.verified ? 18 : 0) +
              (typeof asset.rank === 'number' && asset.rank > 0 ? Math.max(0, 40 - asset.rank) : 0),
            seller: {
              name: asset.seller.ensName || asset.seller.address.slice(0, 10),
              rating: `${asset.seller.reputation}%`,
            },
            verified: asset.verified,
          },
        ];
      }),
    [displayedAssets, taxonomyVersion]
  );

  const handleLike = async (assetId: string) => {
    if (!address) {
      if (!requireWalletAction({ capability: 'favorite_write', actionLabel: 'use favorites', fallbackPage: 'marketplace' })) return;
      return;
    }
    const isFav = await toggleFavorite(address, assetId);
    setLikedAssets(prev => {
      const next = new Set(prev);
      if (isFav) next.add(assetId);
      else next.delete(assetId);
      return next;
    });
  };

  const handleCollectionLike = (collectionId: string) => {
    if (!address) {
      if (!requireWalletAction({ capability: 'favorite_write', actionLabel: 'use collection favorites', fallbackPage: 'marketplace' })) return;
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
    if (onNavigateToAsset) {
      onNavigateToAsset(assetId, 'marketplace');
      return;
    }
    const asset = getMarketplaceCatalogAssetById(assetId, marketplaceAssets);
    if (asset) {
      setSelectedAsset(asset);
      setIsModalOpen(true);
    }
  };

  const handleProfileClick = (walletAddress: string) => {
    onNavigateToUserProfile?.(walletAddress);
  };

  const handleProfileFollowChange = () => {
    const syncProfiles = loadSellerDirectorySync({ marketplaceAssets });
    setSellerProfiles((prev) => (syncProfiles.length > 0 || prev.length === 0 ? syncProfiles : prev));
    void hydrateSellerDirectoryFromSupabase({ marketplaceAssets })
      .then((nextProfiles) => {
        setSellerProfiles(nextProfiles);
      })
      .catch(() => undefined);
  };

  const handleCollectionClick = (collectionId: string) => {
    if (onNavigateToCollection) {
      onNavigateToCollection(collectionId, 'marketplace');
      return;
    }
    setSelectedCollectionId(collectionId);
    setIsCollectionModalOpen(true);
  };

  const handleNavigateToSeller = (sellerAddress: string) => {
    onNavigateToUserProfile?.(sellerAddress);
  };

  const handleNavigateToSellerReviews = (sellerAddress: string) => {
    onNavigateToUserReviews?.(sellerAddress);
  };

  const handleNavigateToSellerMessages = (sellerAddress: string) => {
    onNavigateToMessages?.(sellerAddress);
  };

  const verifiedAssetCount = useMemo(
    () => marketplaceAssets.filter((asset) => asset.verified).length,
    [marketplaceAssets]
  );
  return (
    <div className="marketplace-page-theme h-full flex flex-col bg-ui-page overflow-hidden relative">
      {/* Main Content */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-6 py-3 lg:px-8">
          <div className="flex flex-col gap-3 px-1 xl:flex-row xl:items-center">
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <StudioPillGroup className="rounded-full bg-[var(--t-surface-2)] shadow-none">
                <StudioPillButton
                  onClick={() => setContentMode('assets')}
                  active={contentMode === 'assets'}
                  className={contentMode === 'assets' ? 'rounded-full bg-[var(--t-card-bg)] px-4 py-2.5 text-ui-primary shadow-none' : 'rounded-full px-4 py-2.5 text-ui-muted hover:text-ui-primary'}
                >
                  Assets
                </StudioPillButton>
                <StudioPillButton
                  onClick={() => {
                    setContentMode('profiles');
                    if (viewMode === 'map') handleSetViewMode('grid');
                  }}
                  active={contentMode === 'profiles'}
                  className={contentMode === 'profiles' ? 'rounded-full bg-[var(--t-card-bg)] px-4 py-2.5 text-ui-primary shadow-none' : 'rounded-full px-4 py-2.5 text-ui-muted hover:text-ui-primary'}
                >
                  Profiles
                </StudioPillButton>
                <StudioPillButton
                  onClick={() => {
                    setContentMode('collections');
                    if (viewMode === 'map') handleSetViewMode('grid');
                  }}
                  active={contentMode === 'collections'}
                  className={contentMode === 'collections' ? 'rounded-full bg-[var(--t-card-bg)] px-4 py-2.5 text-ui-primary shadow-none' : 'rounded-full px-4 py-2.5 text-ui-muted hover:text-ui-primary'}
                >
                  Collections
                </StudioPillButton>
              </StudioPillGroup>

              <StudioPillGroup className="rounded-full bg-[var(--t-surface-2)] shadow-none">
                <StudioPillButton
                  onClick={() => handleSetViewMode('grid')}
                  active={viewMode === 'grid'}
                  className={viewMode === 'grid' ? 'rounded-full bg-[var(--t-card-bg)] px-3 py-2.5 text-ui-primary shadow-none' : 'rounded-full px-3 py-2.5 text-ui-muted hover:text-ui-primary'}
                >
                  <Grid size={16} />
                </StudioPillButton>
                <StudioPillButton
                  onClick={() => handleSetViewMode('list')}
                  active={viewMode === 'list'}
                  className={viewMode === 'list' ? 'rounded-full bg-[var(--t-card-bg)] px-3 py-2.5 text-ui-primary shadow-none' : 'rounded-full px-3 py-2.5 text-ui-muted hover:text-ui-primary'}
                >
                  <List size={16} />
                </StudioPillButton>
                <StudioPillButton
                  onClick={() => handleSetViewMode('map')}
                  onPointerEnter={() => {
                    if (contentMode === 'assets') {
                      void preloadRealisticWorldMap();
                    }
                  }}
                  onFocus={() => {
                    if (contentMode === 'assets') {
                      void preloadRealisticWorldMap();
                    }
                  }}
                  active={viewMode === 'map'}
                  disabled={contentMode !== 'assets'}
                  className={`${viewMode === 'map' ? 'rounded-full bg-[var(--t-card-bg)] px-3 py-2.5 text-ui-primary shadow-none' : 'rounded-full px-3 py-2.5 text-ui-muted hover:text-ui-primary'} ${contentMode !== 'assets' ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <MapIcon size={16} />
                </StudioPillButton>
              </StudioPillGroup>
            </div>

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 xl:flex-nowrap">
              <div className="relative min-w-[280px] flex-[1.25]">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ui-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    contentMode === 'profiles'
                      ? 'Search profiles...'
                      : contentMode === 'collections'
                        ? 'Search collections...'
                        : 'Search assets...'
                  }
                  className="h-[44px] w-full rounded-full border border-ui-border-subtle bg-ui-input pl-11 pr-4 text-sm text-ui-primary placeholder:text-ui-muted focus:outline-none focus:border-[#2CC295] focus:ring-2 focus:ring-[#2CC295]/20 transition-all"
                />
              </div>

              <div className={`min-w-[188px] flex-[0.78] xl:max-w-[212px] ${contentMode === 'profiles' ? 'opacity-50 pointer-events-none' : ''}`}>
                <CustomDropdown
                  defaultValue={selectedCategory}
                  onChange={setSelectedCategory}
                  options={[
                    { value: 'all', label: 'All Categories' },
                    ...visibleCategoryOptions
                  ]}
                  variant="compact"
                  className="w-full"
                  triggerClassName="h-[44px] text-[13px]"
                  menuMinWidth={228}
                />
              </div>

              <div className={`min-w-[188px] flex-[0.78] xl:max-w-[212px] ${contentMode !== 'assets' ? 'opacity-50 pointer-events-none' : ''}`}>
                <CustomDropdown
                  defaultValue={selectedBlockchain}
                  onChange={setSelectedBlockchain}
                    options={blockchainOptions}
                    variant="compact"
                    className="w-full"
                    triggerClassName="h-[44px] text-[13px]"
                    menuMinWidth={228}
                  />
                </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 pt-7">
            {viewMode !== 'map' && (
              <div
                className="scrollbar-hidden h-full overflow-y-auto px-1 pb-6 pt-2"
                style={{ scrollbarGutter: 'stable both-edges' }}
              >
                {(contentMode === 'assets' && displayedAssets.length === 0) || (contentMode === 'profiles' && filteredProfiles.length === 0) || (contentMode === 'collections' && filteredCollections.length === 0) ? (
                  <EmptyStateCard
                    icon={<Search size={30} className="text-ui-muted" />}
                    title={contentMode === 'assets' ? 'No assets found' : contentMode === 'profiles' ? 'No profiles found' : 'No collections found'}
                    description="Try adjusting your filters, search terms, or content mode to reveal more live marketplace results."
                    className="rounded-[32px] py-20"
                  />
                ) : (
                  <div className={`
                    ${contentMode === 'profiles'
                      ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
                      : contentMode === 'collections'
                      ? viewMode === 'grid'
                        ? 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'
                        : 'space-y-4'
                      : viewMode === 'grid'
                      ? 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                      : 'space-y-4'
                    }
                  `}>
                    {contentMode === 'assets' ? (
                      displayedAssets.map((asset) => (
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
                      contentMode === 'profiles' ? (
                        filteredProfiles.map((profile) => (
                          <ProfileSearchCard
                            key={profile.address}
                            profile={profile}
                            viewMode={viewMode === 'list' ? 'list' : 'grid'}
                            onViewProfile={handleProfileClick}
                            onFollowChange={handleProfileFollowChange}
                          />
                        ))
                      ) : (
                        filteredCollections.map((collection) => (
                          <CollectionCard
                            key={collection.id}
                            collection={collection}
                            viewMode={viewMode}
                            onLike={handleCollectionLike}
                            onClick={handleCollectionClick}
                            isLiked={likedCollections.has(collection.id)}
                          />
                        ))
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {viewMode === 'map' && contentMode === 'assets' && (
              <div className="h-full overflow-hidden rounded-[32px] bg-[var(--t-surface-2)] shadow-[0_24px_60px_-42px_rgba(0,0,0,0.34)]">
                <ProgressiveMarketplaceMapSurface
                  mapEngineRequested={mapEngineRequested}
                  onRequestMapEngine={requestMapEngine}
                  filteredAssets={mapAssets}
                  totalListings={marketplaceAssets.length}
                  verifiedCount={verifiedAssetCount}
                  verifiedOnly={verifiedOnly}
                  onToggleVerified={setVerifiedOnly}
                >
                  <RealisticWorldMap
                    filteredAssets={mapAssets}
                    totalListings={marketplaceAssets.length}
                    verifiedCount={verifiedAssetCount}
                    viewState={marketplaceMapViewState}
                    onViewStateChange={setMarketplaceMapViewState}
                    onAssetClick={(mapAsset) => {
                      const asset = displayedAssets.find(
                        (a, index) => (parseInt(a.id.replace(/\D/g, '')) || index) === mapAsset.id
                      );
                      if (asset) {
                        if (onNavigateToAsset) {
                          onNavigateToAsset(asset.id, 'marketplace');
                          return;
                        }
                        setSelectedAsset(asset);
                        setIsModalOpen(true);
                      }
                    }}
                    selectedAssetId={null}
                    onMarkerClick={() => {}}
                    verifiedOnly={verifiedOnly}
                    onToggleVerified={setVerifiedOnly}
                  />
                </ProgressiveMarketplaceMapSurface>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {isModalOpen && selectedAsset && (
        <AssetDetailsModal
          asset={selectedAsset}
          onClose={() => setIsModalOpen(false)}
          onNavigateToSeller={handleNavigateToSeller}
          onNavigateToSellerReviews={handleNavigateToSellerReviews}
          onNavigateToSellerMessages={handleNavigateToSellerMessages}
        />
      )}

      <CollectionDetailsModal
        isOpen={isCollectionModalOpen}
        collectionId={selectedCollectionId}
        onClose={() => {
          setIsCollectionModalOpen(false);
          setSelectedCollectionId(null);
        }}
        onNavigateToSeller={handleNavigateToSeller}
        onNavigateToSellerReviews={handleNavigateToSellerReviews}
        onNavigateToSellerMessages={handleNavigateToSellerMessages}
      />
    </div>
  );
}
