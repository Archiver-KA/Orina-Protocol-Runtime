/**
 * MARKETPLACE PAGE
 * ================
 * Marketplace page hiển thị assets đang bán với SearchResultCard component
 * Hỗ trợ Grid/List view, filtering, và search
 */

import { Search, Grid, List, Map as MapIcon } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useState, lazy, type UIEvent } from 'react';
import { toast } from 'sonner';
import { SearchResultCard } from './search-result-card';
import { ProfileSearchCard } from './profile-search-card';
import { CollectionCard } from './collection-card';
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
import type { MarketplaceAsset } from '@/app/types/asset';
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

const AssetDetailsModal = lazy(async () => {
  const module = await import('./asset-details-modal');
  return { default: module.AssetDetailsModal };
});

const CollectionDetailsModal = lazy(async () => {
  const module = await import('@/app/components/collections/collection-details-modal');
  return { default: module.CollectionDetailsModal };
});

const MARKETPLACE_VIEW_MODE_KEY = 'orina_marketplace_view_mode';
const MARKETPLACE_GRID_INITIAL_RENDER_COUNT = 32;
const MARKETPLACE_LIST_INITIAL_RENDER_COUNT = 16;
const MARKETPLACE_RENDER_INCREMENT = 24;
const MARKETPLACE_SCROLL_PREFETCH_PX = 720;
const MAP_PREFETCH_IDLE_TIMEOUT_MS = 1800;
const MARKETPLACE_CATALOG_BOOTSTRAP_LIMIT = 160;

type MarketplaceCatalogHydrationStatus = 'loading' | 'ready' | 'error';

function readInitialMarketplaceViewMode(): 'grid' | 'list' | 'map' {
  if (typeof window === 'undefined') return 'grid';

  const storedValue = window.localStorage.getItem(MARKETPLACE_VIEW_MODE_KEY);
  if (storedValue === 'grid' || storedValue === 'list' || storedValue === 'map') {
    return storedValue;
  }

  return 'grid';
}

function getInitialResultRenderLimit(viewMode: 'grid' | 'list' | 'map') {
  return viewMode === 'list' ? MARKETPLACE_LIST_INITIAL_RENDER_COUNT : MARKETPLACE_GRID_INITIAL_RENDER_COUNT;
}

function areMarketplaceAssetListsEquivalent(left: MarketplaceAsset[], right: MarketplaceAsset[]) {
  if (left === right) return true;
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const leftAsset = left[index];
    const rightAsset = right[index];
    if (
      leftAsset.id !== rightAsset.id ||
      leftAsset.updatedAt !== rightAsset.updatedAt ||
      leftAsset.views !== rightAsset.views ||
      leftAsset.likes !== rightAsset.likes ||
      leftAsset.availableSlots !== rightAsset.availableSlots ||
      leftAsset.totalSlots !== rightAsset.totalSlots ||
      leftAsset.price !== rightAsset.price ||
      leftAsset.verified !== rightAsset.verified
    ) {
      return false;
    }
  }

  return true;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debouncedValue;
}

type BrowserConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

type IdleSchedulerWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function canPrefetchMapChunk() {
  if (typeof navigator === 'undefined') return false;

  const connection = (navigator as Navigator & { connection?: BrowserConnection }).connection;
  if (connection?.saveData) return false;
  if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') return false;

  return true;
}

function scheduleMarketplaceIdleTask(task: () => void, timeout = MAP_PREFETCH_IDLE_TIMEOUT_MS) {
  if (typeof window === 'undefined') return () => undefined;

  const idleWindow = window as IdleSchedulerWindow;
  if (typeof idleWindow.requestIdleCallback === 'function') {
    const handle = idleWindow.requestIdleCallback(task, { timeout });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(task, Math.min(timeout, 700));
  return () => window.clearTimeout(handle);
}

function MarketplaceAssetSkeletonGrid() {
  return (
    <div
      aria-label="Loading marketplace assets"
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="market-card-shell search-result-card-shell h-[436px] overflow-hidden rounded-[32px]"
        >
          <div className="h-[240px] animate-pulse bg-[var(--t-surface-10)]" />
          <div className="space-y-5 px-5 pb-5 pt-4">
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-[var(--t-surface-10)]" />
            <div className="flex items-end justify-between gap-5 pt-24">
              <div className="h-8 w-24 animate-pulse rounded-full bg-[var(--t-surface-10)]" />
              <div className="h-10 w-20 animate-pulse rounded-2xl bg-[var(--t-surface-10)]" />
            </div>
            <div className="flex gap-3">
              <div className="h-4 w-12 animate-pulse rounded-full bg-[var(--t-surface-10)]" />
              <div className="h-4 w-12 animate-pulse rounded-full bg-[var(--t-surface-10)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketplaceAssetSkeletonList() {
  return (
    <div aria-label="Loading marketplace assets" className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="market-card-shell search-result-card-shell flex flex-col overflow-hidden rounded-[32px] lg:h-[240px] lg:flex-row"
        >
          <div className="h-[240px] shrink-0 animate-pulse bg-[var(--t-surface-10)] lg:h-full lg:w-[395px]" />
          <div className="flex min-w-0 flex-1 flex-col px-5 pb-5 pt-5 lg:px-6 lg:py-5">
            <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_236px] lg:gap-x-8">
              <div className="space-y-3">
                <div className="h-4 w-3/5 animate-pulse rounded-full bg-[var(--t-surface-10)]" />
                <div className="h-3 w-full max-w-[32rem] animate-pulse rounded-full bg-[var(--t-surface-10)]" />
                <div className="h-3 w-4/5 max-w-[28rem] animate-pulse rounded-full bg-[var(--t-surface-10)]" />
              </div>
              <div className="space-y-4 lg:text-right">
                <div className="ml-auto h-7 w-28 animate-pulse rounded-full bg-[var(--t-surface-10)]" />
                <div className="ml-auto h-9 w-32 animate-pulse rounded-full bg-[var(--t-surface-10)]" />
                <div className="flex gap-2.5 lg:justify-end">
                  <div className="h-7 w-16 animate-pulse rounded-full bg-[var(--t-surface-10)]" />
                  <div className="h-7 w-16 animate-pulse rounded-full bg-[var(--t-surface-10)]" />
                </div>
              </div>
            </div>
            <div className="mt-auto flex gap-5 pt-5">
              <div className="h-10 w-28 animate-pulse rounded-2xl bg-[var(--t-surface-10)]" />
              <div className="h-10 w-28 animate-pulse rounded-2xl bg-[var(--t-surface-10)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketplaceAssetsLoadingState({ viewMode }: { viewMode: 'grid' | 'list' }) {
  return viewMode === 'list' ? <MarketplaceAssetSkeletonList /> : <MarketplaceAssetSkeletonGrid />;
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
  const [initialViewMode] = useState<'grid' | 'list' | 'map'>(() => readInitialMarketplaceViewMode());
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>(initialViewMode);
  const [resultRenderLimit, setResultRenderLimit] = useState(() => getInitialResultRenderLimit(initialViewMode));
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
  const [mapEngineRequested, setMapEngineRequested] = useState(() => initialViewMode === 'map');
  const [initialMarketplaceAssets] = useState<MarketplaceAsset[]>(() => loadMarketplaceCatalogSync());
  const [marketplaceAssets, setMarketplaceAssets] = useState<MarketplaceAsset[]>(initialMarketplaceAssets);
  const [catalogHydrationStatus, setCatalogHydrationStatus] = useState<MarketplaceCatalogHydrationStatus>(
    () => (initialMarketplaceAssets.length > 0 ? 'ready' : 'loading')
  );
  const [sellerProfiles, setSellerProfiles] = useState(() => loadSellerDirectorySync({ marketplaceAssets: initialMarketplaceAssets }));
  const [runtimeCollections, setRuntimeCollections] = useState<CollectionSummary[]>(() => loadRuntimeCollections());
  const [personalizationRows, setPersonalizationRows] = useState<MarketplacePersonalizationRow[]>([]);
  const [taxonomyVersion, setTaxonomyVersion] = useState(0);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 140);
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

  useEffect(() => {
    if (contentMode !== 'assets' || viewMode === 'map' || mapEngineRequested || !canPrefetchMapChunk()) {
      return undefined;
    }

    return scheduleMarketplaceIdleTask(() => {
      void preloadRealisticWorldMap();
    });
  }, [contentMode, mapEngineRequested, viewMode]);

  const handleSetViewMode = useCallback((nextMode: 'grid' | 'list' | 'map') => {
    if (nextMode === 'map') {
      void preloadRealisticWorldMap();
      setMapEngineRequested(true);
    }
    setViewMode(nextMode);
  }, []);

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
    let cancelled = false;

    const syncCatalog = () => {
      const nextAssets = loadMarketplaceCatalogSync();
      if (nextAssets.length > 0 && !cancelled) {
        setCatalogHydrationStatus('ready');
      }
      setMarketplaceAssets((currentAssets) => (
        areMarketplaceAssetListsEquivalent(currentAssets, nextAssets) ? currentAssets : nextAssets
      ));
    };

    syncCatalog();
    if (loadMarketplaceCatalogSync().length === 0) {
      setCatalogHydrationStatus('loading');
    }
    void hydrateMarketplaceCatalogFromSupabase({ limit: MARKETPLACE_CATALOG_BOOTSTRAP_LIMIT })
      .then(() => {
        if (cancelled) return;
        syncCatalog();
        setCatalogHydrationStatus('ready');
        void hydrateMarketplaceCatalogFromSupabase({ force: true })
          .then(() => {
            if (!cancelled) syncCatalog();
          })
          .catch(() => undefined);
      })
      .catch(() => {
        if (cancelled) return;
        syncCatalog();
        setCatalogHydrationStatus(loadMarketplaceCatalogSync().length > 0 ? 'ready' : 'error');
      });
    window.addEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, syncCatalog as EventListener);
    return () => {
      cancelled = true;
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
    if (debouncedSearchQuery) {
      const query = normalizeTaxonomySearchKey(debouncedSearchQuery);
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
  }, [marketplaceAssets, debouncedSearchQuery, selectedCategory, selectedBlockchain, taxonomyVersion, verifiedOnly]);

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

    if (debouncedSearchQuery) {
      const query = normalizeTaxonomySearchKey(debouncedSearchQuery);
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
  }, [runtimeCollections, debouncedSearchQuery, selectedCategory, taxonomyVersion, verifiedOnly]);

  const filteredProfiles = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    const base = q
      ? sellerProfiles.filter((profile) =>
      profile.displayName.toLowerCase().includes(q) ||
      profile.username.toLowerCase().includes(q) ||
      profile.address.toLowerCase().includes(q)
    )
      : sellerProfiles;
    return verifiedOnly ? base.filter((p) => p.verified) : base;
  }, [debouncedSearchQuery, sellerProfiles, verifiedOnly]);

  const currentResultCount =
    contentMode === 'assets'
      ? displayedAssets.length
      : contentMode === 'profiles'
        ? filteredProfiles.length
        : filteredCollections.length;
  const visibleDisplayedAssets = useMemo(
    () => displayedAssets.slice(0, resultRenderLimit),
    [displayedAssets, resultRenderLimit],
  );
  const visibleFilteredProfiles = useMemo(
    () => filteredProfiles.slice(0, resultRenderLimit),
    [filteredProfiles, resultRenderLimit],
  );
  const visibleFilteredCollections = useMemo(
    () => filteredCollections.slice(0, resultRenderLimit),
    [filteredCollections, resultRenderLimit],
  );
  const hasMoreResults = viewMode !== 'map' && resultRenderLimit < currentResultCount;

  useEffect(() => {
    setResultRenderLimit(getInitialResultRenderLimit(viewMode));
  }, [contentMode, viewMode, debouncedSearchQuery, selectedCategory, selectedBlockchain, verifiedOnly]);

  const increaseResultRenderLimit = useCallback(() => {
    setResultRenderLimit((currentLimit) => (
      currentLimit >= currentResultCount
        ? currentLimit
        : Math.min(currentLimit + MARKETPLACE_RENDER_INCREMENT, currentResultCount)
    ));
  }, [currentResultCount]);

  const handleResultsScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    if (!hasMoreResults) return;

    const target = event.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom <= MARKETPLACE_SCROLL_PREFETCH_PX) {
      increaseResultRenderLimit();
    }
  }, [hasMoreResults, increaseResultRenderLimit]);

  const mapAssets = useMemo(
    () => {
      if (contentMode !== 'assets' || viewMode !== 'map') return [];

      return displayedAssets.flatMap((asset, index) => {
        const coordinates = asset.assetLocationSnapshot?.coordinates;
        if (!coordinates) return [];

        return [
          {
            id: parseInt(asset.id.replace(/\D/g, '')) || index,
            name: asset.name,
            category: asset.category,
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
      });
    },
    [contentMode, displayedAssets, taxonomyVersion, viewMode]
  );

  const handleLike = useCallback(async (assetId: string) => {
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
  }, [address, requireWalletAction]);

  const handleCollectionLike = useCallback((collectionId: string) => {
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
  }, [address, requireWalletAction]);

  const handleAssetClick = useCallback((assetId: string) => {
    if (onNavigateToAsset) {
      onNavigateToAsset(assetId, 'marketplace');
      return;
    }
    const asset = getMarketplaceCatalogAssetById(assetId, marketplaceAssets);
    if (asset) {
      setSelectedAsset(asset);
      setIsModalOpen(true);
    }
  }, [marketplaceAssets, onNavigateToAsset]);

  const handleProfileClick = useCallback((walletAddress: string) => {
    onNavigateToUserProfile?.(walletAddress);
  }, [onNavigateToUserProfile]);

  const handleProfileFollowChange = useCallback(() => {
    const syncProfiles = loadSellerDirectorySync({ marketplaceAssets });
    setSellerProfiles((prev) => (syncProfiles.length > 0 || prev.length === 0 ? syncProfiles : prev));
    void hydrateSellerDirectoryFromSupabase({ marketplaceAssets })
      .then((nextProfiles) => {
        setSellerProfiles(nextProfiles);
      })
      .catch(() => undefined);
  }, [marketplaceAssets]);

  const handleCollectionClick = useCallback((collectionId: string) => {
    if (onNavigateToCollection) {
      onNavigateToCollection(collectionId, 'marketplace');
      return;
    }
    setSelectedCollectionId(collectionId);
    setIsCollectionModalOpen(true);
  }, [onNavigateToCollection]);

  const handleNavigateToSeller = useCallback((sellerAddress: string) => {
    onNavigateToUserProfile?.(sellerAddress);
  }, [onNavigateToUserProfile]);

  const handleNavigateToSellerReviews = useCallback((sellerAddress: string) => {
    onNavigateToUserReviews?.(sellerAddress);
  }, [onNavigateToUserReviews]);

  const handleNavigateToSellerMessages = useCallback((sellerAddress: string) => {
    onNavigateToMessages?.(sellerAddress);
  }, [onNavigateToMessages]);

  const verifiedAssetCount = useMemo(
    () => marketplaceAssets.filter((asset) => asset.verified).length,
    [marketplaceAssets]
  );
  const isAssetsCatalogLoading =
    contentMode === 'assets' &&
    catalogHydrationStatus === 'loading' &&
    marketplaceAssets.length === 0;
  const showEmptyResults =
    (contentMode === 'assets' && displayedAssets.length === 0 && !isAssetsCatalogLoading) ||
    (contentMode === 'profiles' && filteredProfiles.length === 0) ||
    (contentMode === 'collections' && filteredCollections.length === 0);

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
                onScroll={handleResultsScroll}
                style={{ scrollbarGutter: 'stable both-edges' }}
              >
                {isAssetsCatalogLoading ? (
                  <MarketplaceAssetsLoadingState viewMode={viewMode === 'list' ? 'list' : 'grid'} />
                ) : showEmptyResults ? (
                  <EmptyStateCard
                    icon={<Search size={30} className="text-ui-muted" />}
                    title={contentMode === 'assets' ? 'No assets found' : contentMode === 'profiles' ? 'No profiles found' : 'No collections found'}
                    description="Try adjusting your filters, search terms, or content mode to reveal more live marketplace results."
                    className="rounded-[32px] py-20"
                  />
                ) : (
                  <>
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
                        visibleDisplayedAssets.map((asset) => (
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
                          visibleFilteredProfiles.map((profile) => (
                            <ProfileSearchCard
                              key={profile.address}
                              profile={profile}
                              viewMode={viewMode === 'list' ? 'list' : 'grid'}
                              onViewProfile={handleProfileClick}
                              onFollowChange={handleProfileFollowChange}
                            />
                          ))
                        ) : (
                          visibleFilteredCollections.map((collection) => (
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
                    {hasMoreResults && (
                      <div className="flex justify-center py-6">
                        <button
                          type="button"
                          onClick={increaseResultRenderLimit}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-5 text-[13px] font-semibold text-ui-secondary transition-colors hover:bg-[var(--t-card-bg)] hover:text-ui-primary"
                        >
                          Load more results
                        </button>
                      </div>
                    )}
                  </>
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
        <Suspense fallback={null}>
          <AssetDetailsModal
            asset={selectedAsset}
            onClose={() => setIsModalOpen(false)}
            onNavigateToSeller={handleNavigateToSeller}
            onNavigateToSellerReviews={handleNavigateToSellerReviews}
            onNavigateToSellerMessages={handleNavigateToSellerMessages}
          />
        </Suspense>
      )}

      {isCollectionModalOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
    </div>
  );
}
