/**
 * MARKETPLACE PAGE
 * ================
 * Marketplace page hiển thị assets đang bán với SearchResultCard component
 * Hỗ trợ Grid/List view, filtering, và search
 */

import { Search, Grid, List, Map as MapIcon } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, lazy, type ReactNode, type UIEvent } from 'react';
import { toast } from 'sonner';
import { SearchResultCard } from './search-result-card';
import { ProfileSearchCard } from './profile-search-card';
import { CollectionCard } from './collection-card';
import { EmptyStateCard } from '@/app/components/ui/empty-state-card';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { ProgressiveMarketplaceMapSurface } from '@/app/components/marketplace/progressive-marketplace-map-surface';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { StudioPillGroup, StudioPillButton } from '@/app/components/ui/studio-pill-group';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import { loadFavorites, toggleFavorite } from '@/utils/favoritesUtils';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import {
  fetchMarketplaceProfilePageFromSupabase,
  type MarketplaceProfilePageCursor,
  type SellerProfileCardData,
} from '@/utils/sellerDirectory';
import {
  COLLECTIONS_SYNC_EVENT,
  fetchMarketplaceCollectionPageFromSupabase,
  loadCollectionFavorites,
  type MarketplaceCollectionPageCursor,
  toggleCollectionFavorite,
} from '@/utils/collectionsUtils';
import type { MarketplaceAsset } from '@/app/types/asset';
import type { CollectionSummary } from '@/types/collection';
import {
  fetchMarketplaceCatalogPageFromSupabase,
  getMarketplaceCatalogAssetById,
  getMarketplaceCatalogBlockchains,
  getMarketplaceCatalogCategories,
  type MarketplaceCatalogPageCursor,
} from '@/utils/marketplaceCatalog';
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

type RealisticWorldMapModule = typeof import('./marketplace/realistic-world-map');

let realisticWorldMapModule: RealisticWorldMapModule | null = null;
let realisticWorldMapPromise: Promise<RealisticWorldMapModule> | null = null;

function preloadRealisticWorldMap() {
  realisticWorldMapPromise ??= import('./marketplace/realistic-world-map')
    .then((module) => {
      realisticWorldMapModule = module;
      return module;
    })
    .catch((error) => {
      realisticWorldMapPromise = null;
      throw error;
    });
  return realisticWorldMapPromise;
}

function getRealisticWorldMapComponent() {
  return realisticWorldMapModule?.RealisticWorldMap ?? null;
}

const AssetDetailsModal = lazy(async () => {
  const module = await import('./asset-details-modal');
  return { default: module.AssetDetailsModal };
});

const CollectionDetailsModal = lazy(async () => {
  const module = await import('@/app/components/collections/collection-details-modal');
  return { default: module.CollectionDetailsModal };
});

const MARKETPLACE_VIEW_MODE_KEY = 'orina_marketplace_view_mode';
const MARKETPLACE_GRID_INITIAL_RENDER_COUNT = 16;
const MARKETPLACE_LIST_INITIAL_RENDER_COUNT = 8;
const MARKETPLACE_RENDER_INCREMENT = 12;
const MARKETPLACE_SCROLL_PREFETCH_PX = 720;
const MAP_PREFETCH_IDLE_TIMEOUT_MS = 1800;
const MARKETPLACE_CARD_RENDER_ROOT_MARGIN = '720px 0px';
const MARKETPLACE_CATALOG_PAGE_SIZE = 48;

type MarketplaceCatalogHydrationStatus = 'loading' | 'ready' | 'error';
type MarketplaceEntityPageStatus = 'idle' | 'loading' | 'ready' | 'error';

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

function ViewportRenderSlot({
  children,
  className,
  placeholderClassName,
  initiallyRendered = false,
}: {
  children: ReactNode;
  className?: string;
  placeholderClassName: string;
  initiallyRendered?: boolean;
}) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(initiallyRendered);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setShouldRender(true);
      return undefined;
    }

    const node = slotRef.current;
    if (!node) {
      setShouldRender(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShouldRender((current) => (current === entry.isIntersecting ? current : entry.isIntersecting));
      },
      {
        root: null,
        rootMargin: MARKETPLACE_CARD_RENDER_ROOT_MARGIN,
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={slotRef} className={className}>
      {shouldRender ? children : <div aria-hidden="true" className={placeholderClassName} />}
    </div>
  );
}

const marketplaceSkeletonPillClass = 'animate-pulse rounded-full bg-[var(--t-surface-10)]';
const marketplaceSkeletonBlockClass = 'animate-pulse rounded-[var(--t-card-radius-lg)] bg-[var(--t-surface-10)]';

function MarketplaceAssetSkeletonGrid() {
  return (
    <div
      aria-label="Loading marketplace assets"
      className="grid grid-cols-2 gap-[var(--t-market-grid-gap)] md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="market-card-shell search-result-card-shell search-result-card-grid flex h-full min-h-[var(--t-market-card-grid-h)] flex-col overflow-hidden rounded-[var(--t-card-radius-xl)]"
        >
          <div className="relative h-[var(--t-market-card-media-h)] shrink-0 overflow-hidden bg-[var(--t-surface-10)]">
            <div className={`absolute bottom-3 left-3 h-7 w-40 max-w-[calc(100%-4.75rem)] ${marketplaceSkeletonPillClass}`} />
            <div className={`absolute bottom-3 right-3 h-6 w-6 ${marketplaceSkeletonPillClass}`} />
          </div>

          <div className="market-card-info-area search-result-info-area flex min-h-0 flex-1 flex-col px-5 pb-4 pt-3.5">
            <div className="space-y-2">
              <div className={`h-4 w-4/5 ${marketplaceSkeletonPillClass}`} />
              <div className={`h-4 w-3/5 ${marketplaceSkeletonPillClass}`} />
            </div>

            <div className="asset-card-bottom-grid mt-auto">
              <div className="min-w-0 space-y-2">
                <div className={`h-2.5 w-14 ${marketplaceSkeletonPillClass}`} />
                <div className={`h-5 w-24 max-w-full ${marketplaceSkeletonPillClass}`} />
                <div className={`h-2.5 w-16 ${marketplaceSkeletonPillClass}`} />
              </div>
              <div className="asset-card-summary-panel space-y-2">
                <div className={`ml-auto h-2.5 w-16 max-w-full ${marketplaceSkeletonPillClass}`} />
                <div className={`ml-auto h-3.5 w-20 max-w-full ${marketplaceSkeletonPillClass}`} />
              </div>
            </div>

            <div className="asset-card-footer-row">
              <div className="asset-card-footer-stats">
                <div className={`h-3.5 w-9 ${marketplaceSkeletonPillClass}`} />
                <div className={`h-3.5 w-9 ${marketplaceSkeletonPillClass}`} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketplaceProfileSkeletonGrid() {
  return (
    <div
      aria-label="Loading marketplace profiles"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="market-card-shell profile-search-card-shell card-hover-grid w-full overflow-hidden rounded-[var(--t-card-radius-xl)]"
        >
          <div className="relative h-[var(--t-market-profile-media-h)] overflow-hidden bg-[var(--t-surface-10)]">
            <div className={`absolute left-4 top-4 h-7 w-28 ${marketplaceSkeletonPillClass}`} />
            <div className={`absolute right-4 top-4 h-7 w-20 ${marketplaceSkeletonPillClass}`} />
            <div className="absolute inset-x-4 bottom-5 grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((__, statIndex) => (
                <div key={statIndex} className="space-y-2">
                  <div className={`mx-auto h-2 w-10 ${marketplaceSkeletonPillClass}`} />
                  <div className={`mx-auto h-3 w-8 ${marketplaceSkeletonPillClass}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="market-card-info-area px-5 pb-5 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`h-12 w-12 shrink-0 ${marketplaceSkeletonPillClass}`} />
                <div className="min-w-0 space-y-2">
                  <div className={`h-4 w-32 max-w-full ${marketplaceSkeletonPillClass}`} />
                  <div className={`h-3 w-24 max-w-full ${marketplaceSkeletonPillClass}`} />
                </div>
              </div>
              <div className={`h-8 w-20 shrink-0 ${marketplaceSkeletonPillClass}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketplaceCollectionSkeletonGrid() {
  return (
    <div
      aria-label="Loading marketplace collections"
      className="grid grid-cols-1 items-start gap-[var(--t-market-grid-gap)] md:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="market-card-shell collection-card-grid card-hover-grid flex min-h-[var(--t-market-collection-placeholder-h)] flex-col overflow-hidden rounded-[var(--t-card-radius-xl)]"
        >
          <div className="relative h-[var(--t-market-collection-media-h)] shrink-0 overflow-hidden bg-[var(--t-surface-10)]">
            <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-3">
                <div className={`h-7 w-36 max-w-full ${marketplaceSkeletonPillClass}`} />
                <div className={`h-5 w-44 max-w-full ${marketplaceSkeletonPillClass}`} />
                <div className={`h-5 w-32 max-w-full ${marketplaceSkeletonPillClass}`} />
              </div>
              <div className={`h-9 w-9 shrink-0 ${marketplaceSkeletonPillClass}`} />
            </div>
            <div className="absolute inset-x-4 bottom-5 grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((__, statIndex) => (
                <div key={statIndex} className="space-y-2">
                  <div className={`mx-auto h-2 w-10 ${marketplaceSkeletonPillClass}`} />
                  <div className={`mx-auto h-3 w-8 ${marketplaceSkeletonPillClass}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="market-card-info-area flex flex-1 flex-col px-5 pb-5 pt-4">
            <div className="space-y-2">
              <div className={`h-3 w-full ${marketplaceSkeletonPillClass}`} />
              <div className={`h-3 w-4/5 ${marketplaceSkeletonPillClass}`} />
            </div>
            <div className="mt-auto flex flex-col gap-4 pt-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-2">
                <div className={`h-2.5 w-16 ${marketplaceSkeletonPillClass}`} />
                <div className={`h-3.5 w-24 ${marketplaceSkeletonPillClass}`} />
              </div>
              <div className={`h-10 w-36 shrink-0 ${marketplaceSkeletonBlockClass}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketplaceCollectionSkeletonList() {
  return (
    <div aria-label="Loading marketplace collections" className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="market-card-shell collection-card-list card-hover-list flex flex-col overflow-hidden rounded-[var(--t-card-radius-xl)] lg:h-[var(--t-market-collection-list-h)] lg:flex-row"
        >
          <div className="h-[var(--t-market-collection-media-h)] shrink-0 bg-[var(--t-surface-10)] lg:h-full lg:w-[var(--t-market-collection-media-w)]" />
          <div className="market-card-info-area flex min-w-0 flex-1 flex-col px-5 pb-5 pt-4 lg:px-6 lg:py-5">
            <div className="space-y-3">
              <div className={`h-4 w-2/3 ${marketplaceSkeletonPillClass}`} />
              <div className={`h-3 w-full max-w-[32rem] ${marketplaceSkeletonPillClass}`} />
              <div className={`h-3 w-4/5 max-w-[28rem] ${marketplaceSkeletonPillClass}`} />
            </div>
            <div className="mt-auto flex flex-col gap-4 pt-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className={`h-2.5 w-16 ${marketplaceSkeletonPillClass}`} />
                <div className={`h-3.5 w-24 ${marketplaceSkeletonPillClass}`} />
              </div>
              <div className={`h-10 w-36 shrink-0 ${marketplaceSkeletonBlockClass}`} />
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
          className="market-card-shell search-result-card-shell flex flex-col overflow-hidden rounded-[var(--t-card-radius-xl)] lg:h-[var(--t-market-card-list-h)] lg:flex-row"
        >
          <div className="h-[var(--t-market-card-media-h)] shrink-0 animate-pulse bg-[var(--t-surface-10)] lg:h-full lg:w-[var(--t-market-card-list-media-w)]" />
          <div className="flex min-w-0 flex-1 flex-col px-5 pb-5 pt-5 lg:px-6 lg:py-5">
            <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_236px] lg:gap-x-8">
              <div className="space-y-3">
                <div className={`h-4 w-3/5 ${marketplaceSkeletonPillClass}`} />
                <div className={`h-3 w-full max-w-[32rem] ${marketplaceSkeletonPillClass}`} />
                <div className={`h-3 w-4/5 max-w-[28rem] ${marketplaceSkeletonPillClass}`} />
              </div>
              <div className="space-y-4 lg:text-right">
                <div className={`ml-auto h-7 w-28 ${marketplaceSkeletonPillClass}`} />
                <div className={`ml-auto h-9 w-32 ${marketplaceSkeletonPillClass}`} />
                <div className="flex gap-2.5 lg:justify-end">
                  <div className={`h-7 w-16 ${marketplaceSkeletonPillClass}`} />
                  <div className={`h-7 w-16 ${marketplaceSkeletonPillClass}`} />
                </div>
              </div>
            </div>
            <div className="mt-auto flex gap-5 pt-5">
              <div className={`h-10 w-28 ${marketplaceSkeletonBlockClass}`} />
              <div className={`h-10 w-28 ${marketplaceSkeletonBlockClass}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketplaceLoadingState({
  contentMode,
  viewMode,
}: {
  contentMode: 'assets' | 'profiles' | 'collections';
  viewMode: 'grid' | 'list';
}) {
  if (contentMode === 'profiles') return <MarketplaceProfileSkeletonGrid />;
  if (contentMode === 'collections') {
    return viewMode === 'list' ? <MarketplaceCollectionSkeletonList /> : <MarketplaceCollectionSkeletonGrid />;
  }
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

const MARKETPLACE_BLOCKCHAIN_CHAIN_IDS: Record<string, number> = {
  'bnb-testnet': 97,
  bsc: 56,
  ethereum: 1,
  'ethereum-testnet': 11155111,
  polygon: 137,
  arbitrum: 42161,
  base: 8453,
  avalanche: 43114,
};

function getMarketplaceCatalogChainIdFilter(blockchain: string): number | null {
  const normalized = normalizeMarketplaceBlockchainValue(blockchain);
  if (!normalized || normalized === 'all') return null;

  const protocolNetwork = PROTOCOL_NETWORK_OPTIONS.find((network) => network.key === normalized);
  if (typeof protocolNetwork?.chainId === 'number') return protocolNetwork.chainId;

  return MARKETPLACE_BLOCKCHAIN_CHAIN_IDS[normalized] ?? null;
}

function mergeMarketplaceAssetsById(currentAssets: MarketplaceAsset[], nextAssets: MarketplaceAsset[]) {
  if (nextAssets.length === 0) return currentAssets;

  const seen = new Set(currentAssets.map((asset) => asset.assetUid || asset.id));
  const merged = [...currentAssets];
  nextAssets.forEach((asset) => {
    const key = asset.assetUid || asset.id;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(asset);
  });
  return merged;
}

function mergeMarketplaceProfilesByAddress(
  currentProfiles: SellerProfileCardData[],
  nextProfiles: SellerProfileCardData[],
) {
  if (nextProfiles.length === 0) return currentProfiles;

  const seen = new Set(currentProfiles.map((profile) => profile.address.toLowerCase()));
  const merged = [...currentProfiles];
  nextProfiles.forEach((profile) => {
    const key = profile.address.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(profile);
  });
  return merged;
}

function mergeMarketplaceCollectionsById(
  currentCollections: CollectionSummary[],
  nextCollections: CollectionSummary[],
) {
  if (nextCollections.length === 0) return currentCollections;

  const seen = new Set(currentCollections.map((collection) => collection.id));
  const merged = [...currentCollections];
  nextCollections.forEach((collection) => {
    if (seen.has(collection.id)) return;
    seen.add(collection.id);
    merged.push(collection);
  });
  return merged;
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
  const [mapEngineReady, setMapEngineReady] = useState(false);
  const [marketplaceAssets, setMarketplaceAssets] = useState<MarketplaceAsset[]>([]);
  const [catalogHydrationStatus, setCatalogHydrationStatus] = useState<MarketplaceCatalogHydrationStatus>('loading');
  const [catalogPageQueryKey, setCatalogPageQueryKey] = useState('');
  const [marketplaceCatalogCursor, setMarketplaceCatalogCursor] = useState<MarketplaceCatalogPageCursor | null>(null);
  const [hasMoreMarketplaceAssets, setHasMoreMarketplaceAssets] = useState(false);
  const [isLoadingMoreMarketplaceAssets, setIsLoadingMoreMarketplaceAssets] = useState(false);
  const [sellerProfiles, setSellerProfiles] = useState<SellerProfileCardData[]>([]);
  const [profilePageStatus, setProfilePageStatus] = useState<MarketplaceEntityPageStatus>('idle');
  const [profilePageQueryKey, setProfilePageQueryKey] = useState('');
  const [marketplaceProfileCursor, setMarketplaceProfileCursor] = useState<MarketplaceProfilePageCursor | null>(null);
  const [hasMoreMarketplaceProfiles, setHasMoreMarketplaceProfiles] = useState(false);
  const [isLoadingMoreMarketplaceProfiles, setIsLoadingMoreMarketplaceProfiles] = useState(false);
  const [runtimeCollections, setRuntimeCollections] = useState<CollectionSummary[]>([]);
  const [collectionPageStatus, setCollectionPageStatus] = useState<MarketplaceEntityPageStatus>('idle');
  const [collectionPageQueryKey, setCollectionPageQueryKey] = useState('');
  const [marketplaceCollectionCursor, setMarketplaceCollectionCursor] = useState<MarketplaceCollectionPageCursor | null>(null);
  const [hasMoreMarketplaceCollections, setHasMoreMarketplaceCollections] = useState(false);
  const [isLoadingMoreMarketplaceCollections, setIsLoadingMoreMarketplaceCollections] = useState(false);
  const catalogRequestIdRef = useRef(0);
  const profileRequestIdRef = useRef(0);
  const collectionRequestIdRef = useRef(0);
  const mapEngineLoadRequestRef = useRef(0);
  const assetResultRenderLimitRef = useRef(resultRenderLimit);
  const resultsScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const resultsLoadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const [taxonomyVersion, setTaxonomyVersion] = useState(0);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 140);
  const viewer = useEffectiveViewer();
  const { address } = viewer;
  const { requireWalletAction } = useRequireWalletAction(onNavigateToPage);

  useEffect(() => {
    if (contentMode === 'assets') {
      assetResultRenderLimitRef.current = resultRenderLimit;
    }
  }, [contentMode, resultRenderLimit]);

  const preloadMapEngine = useCallback(() => {
    const requestId = mapEngineLoadRequestRef.current + 1;
    mapEngineLoadRequestRef.current = requestId;
    const preloadPromise = preloadRealisticWorldMap();

    void preloadPromise
      .then(() => {
        if (mapEngineLoadRequestRef.current === requestId) {
          setMapEngineReady(true);
        }
      })
      .catch(() => {
        if (mapEngineLoadRequestRef.current === requestId) {
          setMapEngineReady(false);
        }
      });

    return preloadPromise;
  }, []);

  const requestMapEngine = useCallback(() => {
    setMapEngineRequested(true);
    void preloadMapEngine();
  }, [preloadMapEngine]);

  useEffect(() => {
    if (mapEngineRequested && !mapEngineReady) {
      void preloadMapEngine();
    }
  }, [mapEngineReady, mapEngineRequested, preloadMapEngine]);

  useEffect(() => {
    return () => {
      mapEngineLoadRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (contentMode !== 'assets' || viewMode === 'map' || mapEngineRequested || !canPrefetchMapChunk()) {
      return undefined;
    }

    return scheduleMarketplaceIdleTask(() => {
      void preloadMapEngine();
    });
  }, [contentMode, mapEngineRequested, preloadMapEngine, viewMode]);

  const handleSetViewMode = useCallback((nextMode: 'grid' | 'list' | 'map') => {
    if (nextMode === 'map') {
      setMapEngineRequested(true);
      void preloadMapEngine();
    }
    setViewMode(nextMode);
  }, [preloadMapEngine]);

  const assetCategoryOptions = useMemo(
    () => {
      const taxonomyOptions = getTaxonomyCategoryOptions();
      const fallbackOptions = getCategoryOptionsFromValues(getMarketplaceCatalogCategories(marketplaceAssets))
        .filter((option) => !taxonomyOptions.some((taxonomyOption) => taxonomyOption.value === option.value));
      return [...taxonomyOptions, ...fallbackOptions];
    },
    [marketplaceAssets, taxonomyVersion]
  );
  const collectionCategoryOptions = useMemo(
    () => {
      const liveValues = new Set(runtimeCollections.map((collection) => normalizeCategoryFilterValue(collection.category)).filter(Boolean));
      const taxonomyOptions = getTaxonomyCategoryOptions();
      const fallbackOptions = getCategoryOptionsFromValues(Array.from(liveValues))
        .filter((option) => !taxonomyOptions.some((taxonomyOption) => taxonomyOption.value === option.value));
      return [...taxonomyOptions, ...fallbackOptions];
    },
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
  const selectedMarketplaceChainId = useMemo(
    () => getMarketplaceCatalogChainIdFilter(selectedBlockchain),
    [selectedBlockchain],
  );
  const marketplaceCatalogQuery = useMemo(
    () => ({
      searchQuery: debouncedSearchQuery.trim(),
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      blockchain: selectedBlockchain !== 'all' ? selectedBlockchain : undefined,
      chainId: selectedMarketplaceChainId,
      verifiedOnly,
    }),
    [debouncedSearchQuery, selectedBlockchain, selectedCategory, selectedMarketplaceChainId, verifiedOnly],
  );
  const marketplaceCatalogQueryKey = useMemo(
    () => JSON.stringify(marketplaceCatalogQuery),
    [marketplaceCatalogQuery],
  );
  const marketplaceProfileQuery = useMemo(
    () => ({
      searchQuery: debouncedSearchQuery.trim(),
      verifiedOnly,
    }),
    [debouncedSearchQuery, verifiedOnly],
  );
  const marketplaceProfileQueryKey = useMemo(
    () => JSON.stringify(marketplaceProfileQuery),
    [marketplaceProfileQuery],
  );
  const marketplaceCollectionQuery = useMemo(
    () => ({
      searchQuery: debouncedSearchQuery.trim(),
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      verifiedOnly,
    }),
    [debouncedSearchQuery, selectedCategory, verifiedOnly],
  );
  const marketplaceCollectionQueryKey = useMemo(
    () => JSON.stringify(marketplaceCollectionQuery),
    [marketplaceCollectionQuery],
  );

  useEffect(() => {
    catalogRequestIdRef.current += 1;
    const requestId = catalogRequestIdRef.current;
    let cancelled = false;

    if (contentMode !== 'assets') {
      setIsLoadingMoreMarketplaceAssets(false);
      return () => {
        cancelled = true;
      };
    }

    if (
      (catalogHydrationStatus === 'ready' || catalogHydrationStatus === 'error') &&
      catalogPageQueryKey === marketplaceCatalogQueryKey
    ) {
      return () => {
        cancelled = true;
      };
    }

    setCatalogHydrationStatus('loading');
    setIsLoadingMoreMarketplaceAssets(false);
    setHasMoreMarketplaceAssets(false);
    setMarketplaceCatalogCursor(null);
    setMarketplaceAssets([]);

    void fetchMarketplaceCatalogPageFromSupabase({
      ...marketplaceCatalogQuery,
      limit: MARKETPLACE_CATALOG_PAGE_SIZE,
    })
      .then((page) => {
        if (cancelled || catalogRequestIdRef.current !== requestId) return;
        setMarketplaceAssets(page.assets);
        setMarketplaceCatalogCursor(page.nextCursor);
        setHasMoreMarketplaceAssets(page.hasMore);
        setCatalogPageQueryKey(marketplaceCatalogQueryKey);
        setCatalogHydrationStatus('ready');
      })
      .catch(() => {
        if (cancelled || catalogRequestIdRef.current !== requestId) return;
        setMarketplaceAssets([]);
        setMarketplaceCatalogCursor(null);
        setHasMoreMarketplaceAssets(false);
        setCatalogPageQueryKey(marketplaceCatalogQueryKey);
        setCatalogHydrationStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [catalogHydrationStatus, catalogPageQueryKey, contentMode, marketplaceCatalogQuery, marketplaceCatalogQueryKey]);

  useEffect(() => {
    profileRequestIdRef.current += 1;
    const requestId = profileRequestIdRef.current;
    let cancelled = false;

    if (contentMode !== 'profiles') {
      setProfilePageStatus('idle');
      setIsLoadingMoreMarketplaceProfiles(false);
      return () => {
        cancelled = true;
      };
    }

    setProfilePageStatus('loading');
    setIsLoadingMoreMarketplaceProfiles(false);
    setHasMoreMarketplaceProfiles(false);
    setMarketplaceProfileCursor(null);
    setSellerProfiles([]);

    void fetchMarketplaceProfilePageFromSupabase({
      ...marketplaceProfileQuery,
      limit: MARKETPLACE_CATALOG_PAGE_SIZE,
    })
      .then((page) => {
        if (cancelled || profileRequestIdRef.current !== requestId) return;
        setSellerProfiles(page.profiles);
        setMarketplaceProfileCursor(page.nextCursor);
        setHasMoreMarketplaceProfiles(page.hasMore);
        setProfilePageQueryKey(marketplaceProfileQueryKey);
        setProfilePageStatus('ready');
      })
      .catch(() => {
        if (cancelled || profileRequestIdRef.current !== requestId) return;
        setSellerProfiles([]);
        setMarketplaceProfileCursor(null);
        setHasMoreMarketplaceProfiles(false);
        setProfilePageQueryKey(marketplaceProfileQueryKey);
        setProfilePageStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [contentMode, marketplaceProfileQuery, marketplaceProfileQueryKey]);

  useEffect(() => {
    collectionRequestIdRef.current += 1;
    const requestId = collectionRequestIdRef.current;
    let cancelled = false;

    if (contentMode !== 'collections') {
      setCollectionPageStatus('idle');
      setIsLoadingMoreMarketplaceCollections(false);
      return () => {
        cancelled = true;
      };
    }

    setCollectionPageStatus('loading');
    setIsLoadingMoreMarketplaceCollections(false);
    setHasMoreMarketplaceCollections(false);
    setMarketplaceCollectionCursor(null);
    setRuntimeCollections([]);

    void fetchMarketplaceCollectionPageFromSupabase({
      ...marketplaceCollectionQuery,
      limit: MARKETPLACE_CATALOG_PAGE_SIZE,
    })
      .then((page) => {
        if (cancelled || collectionRequestIdRef.current !== requestId) return;
        setRuntimeCollections(page.collections);
        setMarketplaceCollectionCursor(page.nextCursor);
        setHasMoreMarketplaceCollections(page.hasMore);
        setCollectionPageQueryKey(marketplaceCollectionQueryKey);
        setCollectionPageStatus('ready');
      })
      .catch(() => {
        if (cancelled || collectionRequestIdRef.current !== requestId) return;
        setRuntimeCollections([]);
        setMarketplaceCollectionCursor(null);
        setHasMoreMarketplaceCollections(false);
        setCollectionPageQueryKey(marketplaceCollectionQueryKey);
        setCollectionPageStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [contentMode, marketplaceCollectionQuery, marketplaceCollectionQueryKey]);

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

    if (selectedCategory !== 'all' && !assetCategoryOptions.some((option) => option.value === selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [assetCategoryOptions, collectionCategoryOptions, contentMode, selectedBlockchain, selectedCategory]);

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

  const displayedAssets = useMemo(
    () => filteredAssets,
    [filteredAssets],
  );

  const filteredCollections = useMemo(() => {
    return runtimeCollections;
  }, [runtimeCollections]);

  const filteredProfiles = useMemo(() => {
    return sellerProfiles;
  }, [sellerProfiles]);

  const currentResultCount =
    contentMode === 'assets'
      ? displayedAssets.length
      : contentMode === 'profiles'
        ? filteredProfiles.length
        : filteredCollections.length;
  const loadMoreMarketplaceAssets = useCallback(() => {
    if (
      contentMode !== 'assets' ||
      !hasMoreMarketplaceAssets ||
      !marketplaceCatalogCursor ||
      isLoadingMoreMarketplaceAssets ||
      catalogHydrationStatus !== 'ready' ||
      catalogPageQueryKey !== marketplaceCatalogQueryKey
    ) {
      return;
    }

    const requestId = catalogRequestIdRef.current;
    setIsLoadingMoreMarketplaceAssets(true);
    void fetchMarketplaceCatalogPageFromSupabase({
      ...marketplaceCatalogQuery,
      cursor: marketplaceCatalogCursor,
      limit: MARKETPLACE_CATALOG_PAGE_SIZE,
    })
      .then((page) => {
        if (catalogRequestIdRef.current !== requestId) return;
        setMarketplaceAssets((currentAssets) => mergeMarketplaceAssetsById(currentAssets, page.assets));
        setMarketplaceCatalogCursor(page.nextCursor);
        setHasMoreMarketplaceAssets(page.hasMore);
        setResultRenderLimit((currentLimit) => currentLimit + Math.min(MARKETPLACE_RENDER_INCREMENT, page.assets.length));
      })
      .catch(() => undefined)
      .finally(() => {
        if (catalogRequestIdRef.current === requestId) {
          setIsLoadingMoreMarketplaceAssets(false);
        }
      });
  }, [
    catalogHydrationStatus,
    catalogPageQueryKey,
    contentMode,
    hasMoreMarketplaceAssets,
    isLoadingMoreMarketplaceAssets,
    marketplaceCatalogCursor,
    marketplaceCatalogQuery,
    marketplaceCatalogQueryKey,
  ]);
  const loadMoreMarketplaceProfiles = useCallback(() => {
    if (
      contentMode !== 'profiles' ||
      !hasMoreMarketplaceProfiles ||
      !marketplaceProfileCursor ||
      isLoadingMoreMarketplaceProfiles ||
      profilePageStatus !== 'ready' ||
      profilePageQueryKey !== marketplaceProfileQueryKey
    ) {
      return;
    }

    const requestId = profileRequestIdRef.current;
    setIsLoadingMoreMarketplaceProfiles(true);
    void fetchMarketplaceProfilePageFromSupabase({
      ...marketplaceProfileQuery,
      cursor: marketplaceProfileCursor,
      limit: MARKETPLACE_CATALOG_PAGE_SIZE,
    })
      .then((page) => {
        if (profileRequestIdRef.current !== requestId) return;
        setSellerProfiles((currentProfiles) => mergeMarketplaceProfilesByAddress(currentProfiles, page.profiles));
        setMarketplaceProfileCursor(page.nextCursor);
        setHasMoreMarketplaceProfiles(page.hasMore);
        setResultRenderLimit((currentLimit) => currentLimit + Math.min(MARKETPLACE_RENDER_INCREMENT, page.profiles.length));
      })
      .catch(() => undefined)
      .finally(() => {
        if (profileRequestIdRef.current === requestId) {
          setIsLoadingMoreMarketplaceProfiles(false);
        }
      });
  }, [
    contentMode,
    hasMoreMarketplaceProfiles,
    isLoadingMoreMarketplaceProfiles,
    marketplaceProfileCursor,
    marketplaceProfileQuery,
    marketplaceProfileQueryKey,
    profilePageQueryKey,
    profilePageStatus,
  ]);
  const loadMoreMarketplaceCollections = useCallback(() => {
    if (
      contentMode !== 'collections' ||
      !hasMoreMarketplaceCollections ||
      !marketplaceCollectionCursor ||
      isLoadingMoreMarketplaceCollections ||
      collectionPageStatus !== 'ready' ||
      collectionPageQueryKey !== marketplaceCollectionQueryKey
    ) {
      return;
    }

    const requestId = collectionRequestIdRef.current;
    setIsLoadingMoreMarketplaceCollections(true);
    void fetchMarketplaceCollectionPageFromSupabase({
      ...marketplaceCollectionQuery,
      cursor: marketplaceCollectionCursor,
      limit: MARKETPLACE_CATALOG_PAGE_SIZE,
    })
      .then((page) => {
        if (collectionRequestIdRef.current !== requestId) return;
        setRuntimeCollections((currentCollections) => mergeMarketplaceCollectionsById(currentCollections, page.collections));
        setMarketplaceCollectionCursor(page.nextCursor);
        setHasMoreMarketplaceCollections(page.hasMore);
        setResultRenderLimit((currentLimit) => currentLimit + Math.min(MARKETPLACE_RENDER_INCREMENT, page.collections.length));
      })
      .catch(() => undefined)
      .finally(() => {
        if (collectionRequestIdRef.current === requestId) {
          setIsLoadingMoreMarketplaceCollections(false);
        }
      });
  }, [
    collectionPageStatus,
    contentMode,
    hasMoreMarketplaceCollections,
    isLoadingMoreMarketplaceCollections,
    collectionPageQueryKey,
    marketplaceCollectionCursor,
    marketplaceCollectionQuery,
    marketplaceCollectionQueryKey,
  ]);
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
  const hasMoreLoadedResults = viewMode !== 'map' && resultRenderLimit < currentResultCount;
  const hasMoreRemoteAssetResults =
    viewMode !== 'map' &&
    contentMode === 'assets' &&
    catalogHydrationStatus === 'ready' &&
    catalogPageQueryKey === marketplaceCatalogQueryKey &&
    hasMoreMarketplaceAssets;
  const hasMoreRemoteProfileResults =
    viewMode !== 'map' &&
    contentMode === 'profiles' &&
    profilePageStatus === 'ready' &&
    profilePageQueryKey === marketplaceProfileQueryKey &&
    hasMoreMarketplaceProfiles;
  const hasMoreRemoteCollectionResults =
    viewMode !== 'map' &&
    contentMode === 'collections' &&
    collectionPageStatus === 'ready' &&
    collectionPageQueryKey === marketplaceCollectionQueryKey &&
    hasMoreMarketplaceCollections;
  const hasMoreResults =
    hasMoreLoadedResults ||
    hasMoreRemoteAssetResults ||
    hasMoreRemoteProfileResults ||
    hasMoreRemoteCollectionResults;

  useEffect(() => {
    if (
      contentMode === 'assets' &&
      catalogHydrationStatus === 'ready' &&
      catalogPageQueryKey === marketplaceCatalogQueryKey
    ) {
      setResultRenderLimit(assetResultRenderLimitRef.current);
      return;
    }

    setResultRenderLimit(getInitialResultRenderLimit(viewMode));
  }, [
    catalogHydrationStatus,
    catalogPageQueryKey,
    contentMode,
    debouncedSearchQuery,
    marketplaceCatalogQueryKey,
    selectedBlockchain,
    selectedCategory,
    verifiedOnly,
    viewMode,
  ]);

  const increaseResultRenderLimit = useCallback(() => {
    setResultRenderLimit((currentLimit) => (
      currentLimit >= currentResultCount
        ? currentLimit
        : Math.min(currentLimit + MARKETPLACE_RENDER_INCREMENT, currentResultCount)
    ));
  }, [currentResultCount]);

  const requestMoreResults = useCallback(() => {
    if (hasMoreLoadedResults) {
      increaseResultRenderLimit();
      return;
    }

    if (hasMoreRemoteAssetResults) {
      loadMoreMarketplaceAssets();
      return;
    }

    if (hasMoreRemoteProfileResults) {
      loadMoreMarketplaceProfiles();
      return;
    }

    if (hasMoreRemoteCollectionResults) {
      loadMoreMarketplaceCollections();
    }
  }, [
    hasMoreLoadedResults,
    hasMoreRemoteAssetResults,
    hasMoreRemoteCollectionResults,
    hasMoreRemoteProfileResults,
    increaseResultRenderLimit,
    loadMoreMarketplaceAssets,
    loadMoreMarketplaceCollections,
    loadMoreMarketplaceProfiles,
  ]);

  const handleResultsScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    if (!hasMoreResults) return;

    const target = event.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom <= MARKETPLACE_SCROLL_PREFETCH_PX) {
      requestMoreResults();
    }
  }, [hasMoreResults, requestMoreResults]);

  useEffect(() => {
    if (viewMode === 'map' || !hasMoreResults || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const root = resultsScrollContainerRef.current;
    const sentinel = resultsLoadMoreSentinelRef.current;
    if (!root || !sentinel) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          requestMoreResults();
        }
      },
      {
        root,
        rootMargin: `0px 0px ${MARKETPLACE_SCROLL_PREFETCH_PX}px 0px`,
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreResults, requestMoreResults, viewMode]);

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
    setRuntimeCollections((prevCollections) => (
      prevCollections.map((collection) => (
        collection.id === collectionId
          ? {
              ...collection,
              viewerFavorited: isFav,
              likedCount: Math.max(0, collection.likedCount + (isFav ? 1 : -1)),
            }
          : collection
      ))
    ));
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

  const handleProfileFollowChange = useCallback((walletAddress: string, following: boolean) => {
    const normalizedAddress = walletAddress.toLowerCase();
    setSellerProfiles((prevProfiles) => (
      prevProfiles.map((profile) => (
        profile.address.toLowerCase() === normalizedAddress
          ? {
              ...profile,
              isFollowing: following,
              metrics: {
                ...profile.metrics,
                followerCount: Math.max(0, profile.metrics.followerCount + (following ? 1 : -1)),
              },
            }
          : profile
      ))
    ));
  }, []);

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
  const RealisticWorldMapComponent = mapEngineReady ? getRealisticWorldMapComponent() : null;
  const isAssetsCatalogLoading =
    contentMode === 'assets' &&
    catalogHydrationStatus === 'loading' &&
    displayedAssets.length === 0;
  const isProfilesLoading =
    contentMode === 'profiles' &&
    (
      profilePageStatus === 'idle' ||
      profilePageStatus === 'loading' ||
      profilePageQueryKey !== marketplaceProfileQueryKey
    );
  const isCollectionsLoading =
    contentMode === 'collections' &&
    (
      collectionPageStatus === 'idle' ||
      collectionPageStatus === 'loading' ||
      collectionPageQueryKey !== marketplaceCollectionQueryKey
    );
  const isCurrentModeLoading = isAssetsCatalogLoading || isProfilesLoading || isCollectionsLoading;
  const isLoadingMoreResults =
    isLoadingMoreMarketplaceAssets ||
    isLoadingMoreMarketplaceProfiles ||
    isLoadingMoreMarketplaceCollections;
  const showEmptyResults =
    (contentMode === 'assets' && displayedAssets.length === 0 && !isCurrentModeLoading) ||
    (contentMode === 'profiles' && filteredProfiles.length === 0 && !isCurrentModeLoading) ||
    (contentMode === 'collections' && filteredCollections.length === 0 && !isCurrentModeLoading);

  return (
    <div className="marketplace-page-theme h-full flex flex-col bg-ui-page overflow-hidden relative">
      {/* Main Content */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-3 py-2 sm:px-4 lg:px-8 lg:py-3">
          <div className="mobile-command-row px-0 sm:px-1 xl:items-center">
            <div className="mobile-command-cluster">
              <StudioPillGroup className="rounded-full bg-[var(--t-surface-2)] shadow-none">
                <StudioPillButton
                  onClick={() => {
                    setContentMode('assets');
                    setResultRenderLimit(assetResultRenderLimitRef.current);
                  }}
                  active={contentMode === 'assets'}
                  className={contentMode === 'assets' ? 'rounded-full bg-[var(--t-card-bg)] px-3 py-2 text-[11px] text-ui-primary shadow-none sm:px-4 sm:py-2.5 sm:text-xs' : 'rounded-full px-3 py-2 text-[11px] text-ui-muted hover:text-ui-primary sm:px-4 sm:py-2.5 sm:text-xs'}
                >
                  Assets
                </StudioPillButton>
                <StudioPillButton
                  onClick={() => {
                    setContentMode('profiles');
                    if (viewMode === 'map') handleSetViewMode('grid');
                  }}
                  active={contentMode === 'profiles'}
                  className={contentMode === 'profiles' ? 'rounded-full bg-[var(--t-card-bg)] px-3 py-2 text-[11px] text-ui-primary shadow-none sm:px-4 sm:py-2.5 sm:text-xs' : 'rounded-full px-3 py-2 text-[11px] text-ui-muted hover:text-ui-primary sm:px-4 sm:py-2.5 sm:text-xs'}
                >
                  Profiles
                </StudioPillButton>
                <StudioPillButton
                  onClick={() => {
                    setContentMode('collections');
                    if (viewMode === 'map') handleSetViewMode('grid');
                  }}
                  active={contentMode === 'collections'}
                  className={contentMode === 'collections' ? 'rounded-full bg-[var(--t-card-bg)] px-3 py-2 text-[11px] text-ui-primary shadow-none sm:px-4 sm:py-2.5 sm:text-xs' : 'rounded-full px-3 py-2 text-[11px] text-ui-muted hover:text-ui-primary sm:px-4 sm:py-2.5 sm:text-xs'}
                >
                  Collections
                </StudioPillButton>
              </StudioPillGroup>

              <StudioPillGroup className="rounded-full bg-[var(--t-surface-2)] shadow-none">
                <StudioPillButton
                  onClick={() => handleSetViewMode('grid')}
                  active={viewMode === 'grid'}
                  className={viewMode === 'grid' ? 'rounded-full bg-[var(--t-card-bg)] px-2.5 py-2 text-ui-primary shadow-none sm:px-3 sm:py-2.5' : 'rounded-full px-2.5 py-2 text-ui-muted hover:text-ui-primary sm:px-3 sm:py-2.5'}
                >
                  <Grid size={16} />
                </StudioPillButton>
                <StudioPillButton
                  onClick={() => handleSetViewMode('list')}
                  active={viewMode === 'list'}
                  className={viewMode === 'list' ? 'rounded-full bg-[var(--t-card-bg)] px-2.5 py-2 text-ui-primary shadow-none sm:px-3 sm:py-2.5' : 'rounded-full px-2.5 py-2 text-ui-muted hover:text-ui-primary sm:px-3 sm:py-2.5'}
                >
                  <List size={16} />
                </StudioPillButton>
                <StudioPillButton
                  onClick={() => handleSetViewMode('map')}
                  onPointerEnter={() => {
                    if (contentMode === 'assets') {
                      void preloadMapEngine();
                    }
                  }}
                  onFocus={() => {
                    if (contentMode === 'assets') {
                      void preloadMapEngine();
                    }
                  }}
                  active={viewMode === 'map'}
                  disabled={contentMode !== 'assets'}
                  className={`${viewMode === 'map' ? 'rounded-full bg-[var(--t-card-bg)] px-2.5 py-2 text-ui-primary shadow-none sm:px-3 sm:py-2.5' : 'rounded-full px-2.5 py-2 text-ui-muted hover:text-ui-primary sm:px-3 sm:py-2.5'} ${contentMode !== 'assets' ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <MapIcon size={16} />
                </StudioPillButton>
              </StudioPillGroup>
            </div>

            <div className="mobile-command-cluster xl:min-w-0 xl:flex-1 xl:gap-3">
              <div className="relative w-[10rem] shrink-0 sm:w-[14rem] xl:min-w-[280px] xl:flex-[1.25]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-muted sm:left-4" />
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
                  className="h-[var(--t-shell-control-h)] w-full rounded-full border border-ui-border-subtle bg-ui-input pl-9 pr-3 text-[12px] text-ui-primary placeholder:text-ui-muted focus:outline-none focus:border-[#2CC295] focus:ring-2 focus:ring-[#2CC295]/20 transition-all sm:pl-11 sm:pr-4 sm:text-sm"
                />
              </div>

              <div className={`w-[8.75rem] shrink-0 sm:w-[11.75rem] xl:max-w-[212px] xl:flex-[0.78] ${contentMode === 'profiles' ? 'opacity-50 pointer-events-none' : ''}`}>
                <CustomDropdown
                  defaultValue={selectedCategory}
                  onChange={setSelectedCategory}
                  options={[
                    { value: 'all', label: 'All Categories' },
                    ...visibleCategoryOptions
                  ]}
                  variant="compact"
                  className="w-full"
                  triggerClassName="h-[var(--t-shell-control-h)] text-[11px] sm:text-[13px]"
                  menuMinWidth={228}
                />
              </div>

              <div className={`w-[8.75rem] shrink-0 sm:w-[11.75rem] xl:max-w-[212px] xl:flex-[0.78] ${contentMode !== 'assets' ? 'opacity-50 pointer-events-none' : ''}`}>
                <CustomDropdown
                  defaultValue={selectedBlockchain}
                  onChange={setSelectedBlockchain}
                    options={blockchainOptions}
                    variant="compact"
                    className="w-full"
                    triggerClassName="h-[var(--t-shell-control-h)] text-[11px] sm:text-[13px]"
                    menuMinWidth={228}
                  />
                </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 pt-3 sm:pt-5 lg:pt-7">
            {viewMode !== 'map' && (
              <div
                ref={resultsScrollContainerRef}
                className="scrollbar-hidden h-full overflow-y-auto px-0 pb-6 pt-2 sm:px-1"
                onScroll={handleResultsScroll}
                style={{ scrollbarGutter: 'stable both-edges' }}
              >
                {isCurrentModeLoading ? (
                  <MarketplaceLoadingState
                    contentMode={contentMode}
                    viewMode={viewMode === 'list' ? 'list' : 'grid'}
                  />
                ) : showEmptyResults ? (
                  <EmptyStateCard
                    icon={<Search size={30} className="text-ui-muted" />}
                    title={contentMode === 'assets' ? 'No assets found' : contentMode === 'profiles' ? 'No profiles found' : 'No collections found'}
                    description="Try adjusting your filters, search terms, or content mode to reveal more live marketplace results."
                    className="rounded-[var(--t-card-radius-xl)] py-20"
                  />
                ) : (
                  <>
                    <div className={`
                      ${contentMode === 'profiles'
                        ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
                        : contentMode === 'collections'
                        ? viewMode === 'grid'
                          ? 'grid grid-cols-1 items-start gap-[var(--t-market-grid-gap)] md:grid-cols-2 lg:grid-cols-3'
                          : 'space-y-4'
                        : viewMode === 'grid'
                        ? 'grid grid-cols-2 gap-[var(--t-market-grid-gap)] md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                        : 'space-y-4'
                      }
                    `}>
                      {contentMode === 'assets' ? (
                        visibleDisplayedAssets.map((asset, index) => (
                          <ViewportRenderSlot
                            key={asset.id}
                            className={viewMode === 'grid' ? 'h-full min-h-[var(--t-market-card-grid-h)]' : 'min-h-[var(--t-market-card-list-mobile-h)] lg:min-h-[var(--t-market-card-list-h)]'}
                            placeholderClassName={viewMode === 'grid' ? 'h-[var(--t-market-card-grid-h)] rounded-[var(--t-card-radius-xl)]' : 'min-h-[var(--t-market-card-list-mobile-h)] rounded-[var(--t-card-radius-xl)] lg:min-h-[var(--t-market-card-list-h)]'}
                            initiallyRendered={index < (viewMode === 'grid' ? 8 : 4)}
                          >
                            <SearchResultCard
                              asset={asset}
                              viewMode={viewMode}
                              onLike={handleLike}
                              onClick={handleAssetClick}
                              isLiked={likedAssets.has(asset.id)}
                            />
                          </ViewportRenderSlot>
                        ))
                      ) : (
                        contentMode === 'profiles' ? (
                          visibleFilteredProfiles.map((profile, index) => (
                            <ViewportRenderSlot
                              key={profile.address}
                              className="h-full min-h-[var(--t-market-profile-card-h)]"
                              placeholderClassName="h-[var(--t-market-profile-card-h)] rounded-[var(--t-card-radius-xl)]"
                              initiallyRendered={index < (viewMode === 'grid' ? 6 : 4)}
                            >
                              <ProfileSearchCard
                                profile={profile}
                                viewMode={viewMode === 'list' ? 'list' : 'grid'}
                                onViewProfile={handleProfileClick}
                                onFollowChange={handleProfileFollowChange}
                              />
                            </ViewportRenderSlot>
                          ))
                        ) : (
                          visibleFilteredCollections.map((collection, index) => (
                            <ViewportRenderSlot
                              key={collection.id}
                              className="w-full"
                              placeholderClassName={viewMode === 'grid' ? 'h-[var(--t-market-collection-placeholder-h)] rounded-[var(--t-card-radius-xl)]' : 'min-h-[var(--t-market-collection-placeholder-h)] rounded-[var(--t-card-radius-xl)] lg:min-h-[var(--t-market-collection-list-h)]'}
                              initiallyRendered={index < (viewMode === 'grid' ? 6 : 4)}
                            >
                              <CollectionCard
                                collection={collection}
                                viewMode={viewMode}
                                onLike={handleCollectionLike}
                                onClick={handleCollectionClick}
                                isLiked={likedCollections.has(collection.id) || Boolean(collection.viewerFavorited)}
                              />
                            </ViewportRenderSlot>
                          ))
                        )
                      )}
                    </div>
                    {hasMoreResults && (
                      <>
                        <div ref={resultsLoadMoreSentinelRef} aria-hidden="true" className="h-px" />
                        <div className="flex min-h-11 justify-center py-6">
                          {isLoadingMoreResults ? (
                            <StudioLoadingIndicator
                              role="status"
                              aria-live="polite"
                              tone="muted"
                              size={18}
                              label="Loading results..."
                              labelClassName="text-[13px] font-semibold text-ui-secondary"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={requestMoreResults}
                              className="inline-flex h-11 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-5 text-[13px] font-semibold text-ui-secondary transition-colors hover:bg-[var(--t-card-bg)] hover:text-ui-primary"
                            >
                              Load more results
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {viewMode === 'map' && contentMode === 'assets' && (
              <div className="h-full overflow-hidden rounded-[var(--t-card-radius-xl)] bg-[var(--t-surface-2)] shadow-[0_24px_60px_-42px_rgba(0,0,0,0.34)]">
                <ProgressiveMarketplaceMapSurface
                  mapEngineRequested={mapEngineRequested}
                  mapEngineReady={mapEngineReady}
                  onRequestMapEngine={requestMapEngine}
                  filteredAssets={mapAssets}
                  totalListings={marketplaceAssets.length}
                  verifiedCount={verifiedAssetCount}
                  verifiedOnly={verifiedOnly}
                  onToggleVerified={setVerifiedOnly}
                >
                  {RealisticWorldMapComponent && (
                    <RealisticWorldMapComponent
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
                  )}
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
