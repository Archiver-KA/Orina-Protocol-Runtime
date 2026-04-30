import { Search, List, Grid3x3, Sparkles } from 'lucide-react';
import { useState, useMemo, useEffect, useRef, useCallback, type UIEvent } from 'react';
import { toast } from 'sonner';
import { ToggleSwitch } from '@/app/components/ui/toggle-switch';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import { FilterTags } from './filter-tags';
import { SearchResultCard } from '@/app/components/search-result-card';
import { ProfileSearchCard } from '@/app/components/profile-search-card';
import { CollectionCard } from '@/app/components/collection-card';
import { CollectionDetailsModal } from '@/app/components/collections/collection-details-modal';
import { PriceRangeSlider } from './price-range-slider';
import { SearchFilters } from '@/types/search';
import { MarketplaceAsset } from '@/app/types/asset';
import type { AIProductResult } from '@/app/types/ai-agent';
import { getDefaultFilters, filterMarketplaceResults, filterMarketplaceResultsWithOptions, getMarketplacePriceRange, saveSearchToHistory, countActiveFilters } from '@/utils/searchUtils';
import { motion, AnimatePresence } from 'motion/react';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { AssetDetailsModal } from '@/app/components/asset-details-modal';
import { loadFavorites, toggleFavorite } from '@/utils/favoritesUtils';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { EmptyStateCard } from '@/app/components/ui/empty-state-card';
import { StudioPageHeader } from '@/app/components/ui/studio-page-header';
import { StudioPillGroup, StudioPillButton } from '@/app/components/ui/studio-pill-group';
import { StudioSidebarShell, StudioSidebarHeader, StudioSidebarScroll } from '@/app/components/ui/studio-sidebar';
import { InlineAIRightRail } from '@/app/components/ui/inline-ai-right-rail';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioTransientState } from '@/app/components/ui/studio-transient-state';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import {
  COLLECTIONS_SYNC_EVENT,
  fetchMarketplaceCollectionPageFromSupabase,
  loadCollectionFavorites,
  toggleCollectionFavorite,
  type MarketplaceCollectionPageCursor,
} from '@/utils/collectionsUtils';
import type { CollectionSummary } from '@/types/collection';
import { runtimeFlags } from '/utils/runtimeConfig';
import { AIAgentClient } from '@/utils/aiAgentClient';
import { resolveAISearchResults } from '@/utils/aiSearchUtils';
import { sanitizeAIVisibleText } from '@/utils/aiTextSanitizer';
import {
  fetchMarketplaceProfilePageFromSupabase,
  type MarketplaceProfilePageCursor,
  type SellerProfileCardData,
} from '@/utils/sellerDirectory';
import {
  getMarketplaceCatalogAssetById,
  getMarketplaceCatalogCategories,
  getMarketplaceCatalogNetworkOptions,
  hydrateMarketplaceCatalogFromSupabase,
  loadMarketplaceCatalogSync,
  MARKETPLACE_CATALOG_SYNC_EVENT,
} from '@/utils/marketplaceCatalog';
import {
  getCategoryDisplayLabel,
  getTaxonomyCategoryOptions,
  hydrateTaxonomyFromSupabase,
  normalizeCategoryFilterValue,
  TAXONOMY_SYNC_EVENT,
} from '@/utils/taxonomy';
import {
  buildSearchNavigationFilters,
  type SearchNavigationRequest,
} from '@/app/components/search/search-page.utils';

interface SearchPageProps {
  initialQuery?: string;
  navigationRequest?: SearchNavigationRequest | null;
  onConsumeNavigationRequest?: (requestKey: string) => void;
  onNavigateToAsset?: (assetId: string) => void;
  onNavigateToCollection?: (collectionId: string, fromPage?: string) => void;
  onNavigateToPage?: (page: string) => void;
  onNavigateToUserProfile?: (walletAddress: string) => void;
  onNavigateToUserReviews?: (walletAddress: string) => void;
  onNavigateToMessages?: (walletAddress: string) => void;
  showAISidebar?: boolean;
  onCloseAISidebar?: () => void;
}

type AISearchStatus = 'idle' | 'loading' | 'success' | 'error';
type SearchEntityPageStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AISearchRequest {
  query: string;
  filterKey: string;
  selectedCategory?: string;
}

const SEARCH_ENTITY_PAGE_SIZE = 48;
const SEARCH_SCROLL_PREFETCH_PX = 720;

function buildAISearchFilterKey(categories: string[]): string {
  return [...categories].sort().join('\u001f');
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [delayMs, value]);

  return debouncedValue;
}

function mergeProfilesByAddress(
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

function mergeCollectionsById(
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

export function SearchPage({
  initialQuery = '',
  navigationRequest,
  onConsumeNavigationRequest,
  onNavigateToAsset,
  onNavigateToCollection,
  onNavigateToPage,
  onNavigateToUserProfile,
  onNavigateToUserReviews,
  onNavigateToMessages,
  showAISidebar = false,
  onCloseAISidebar = () => undefined,
}: SearchPageProps) {
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
  const { address } = useEffectiveViewer();
  const [marketplaceAssets, setMarketplaceAssets] = useState<MarketplaceAsset[]>(() => loadMarketplaceCatalogSync());
  const [sellerProfiles, setSellerProfiles] = useState<SellerProfileCardData[]>([]);
  const [profilePageStatus, setProfilePageStatus] = useState<SearchEntityPageStatus>('idle');
  const [profilePageQueryKey, setProfilePageQueryKey] = useState('');
  const [profilePageCursor, setProfilePageCursor] = useState<MarketplaceProfilePageCursor | null>(null);
  const [hasMoreProfiles, setHasMoreProfiles] = useState(false);
  const [isLoadingMoreProfiles, setIsLoadingMoreProfiles] = useState(false);
  const [runtimeCollections, setRuntimeCollections] = useState<CollectionSummary[]>([]);
  const [collectionPageStatus, setCollectionPageStatus] = useState<SearchEntityPageStatus>('idle');
  const [collectionPageQueryKey, setCollectionPageQueryKey] = useState('');
  const [collectionPageCursor, setCollectionPageCursor] = useState<MarketplaceCollectionPageCursor | null>(null);
  const [hasMoreCollections, setHasMoreCollections] = useState(false);
  const [isLoadingMoreCollections, setIsLoadingMoreCollections] = useState(false);
  const [taxonomyVersion, setTaxonomyVersion] = useState(0);
  const [aiSearchStatus, setAiSearchStatus] = useState<AISearchStatus>('idle');
  const [aiSearchProducts, setAiSearchProducts] = useState<AIProductResult[]>([]);
  const [aiSearchSummary, setAiSearchSummary] = useState('');
  const [aiExtractedQuery, setAiExtractedQuery] = useState('');
  const [aiSearchError, setAiSearchError] = useState('');
  const [isAISemanticSearch, setIsAISemanticSearch] = useState(false);
  const [aiSearchRequest, setAiSearchRequest] = useState<AISearchRequest | null>(null);
  const aiSearchRequestRef = useRef(0);
  const profileRequestIdRef = useRef(0);
  const collectionRequestIdRef = useRef(0);
  const resultsScrollContainerRef = useRef<HTMLElement | null>(null);
  const resultsLoadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const debouncedSearchQuery = useDebouncedValue(filters.query, 160);

  // Update query when initialQuery changes
  useEffect(() => {
    if (initialQuery) {
      setFilters((prev) => (prev.query === initialQuery ? prev : { ...prev, query: initialQuery }));
    }
  }, [initialQuery]);

  useEffect(() => {
    if (!navigationRequest) return;

    const nextFilters = buildSearchNavigationFilters(navigationRequest);

    if (!nextFilters) {
      onConsumeNavigationRequest?.(navigationRequest.requestKey);
      return;
    }

    setContentMode('assets');
    setFilters(nextFilters);
    setSelectedAsset(null);
    setIsModalOpen(false);
    setSelectedCollectionId(null);
    setIsCollectionModalOpen(false);
    onConsumeNavigationRequest?.(navigationRequest.requestKey);
  }, [navigationRequest, onConsumeNavigationRequest]);

  const marketplaceCategoryOptions = useMemo(
    () => {
      const taxonomyOptions = getTaxonomyCategoryOptions();
      const fallbackOptions = getMarketplaceCatalogCategories(marketplaceAssets)
        .filter((category) => !taxonomyOptions.some((option) => option.value === category))
        .map((category) => ({ value: category, label: getCategoryDisplayLabel(category) }));
      return [...taxonomyOptions, ...fallbackOptions];
    },
    [marketplaceAssets, taxonomyVersion]
  );
  const collectionCategoryOptions = useMemo(
    () => {
      const liveValues = new Set(runtimeCollections.map((collection) => normalizeCategoryFilterValue(collection.category)).filter(Boolean));
      const taxonomyOptions = getTaxonomyCategoryOptions();
      const fallbackOptions = Array.from(liveValues)
        .filter((value) => !taxonomyOptions.some((option) => option.value === value))
        .map((value) => ({ value, label: getCategoryDisplayLabel(value) }));
      return [...taxonomyOptions, ...fallbackOptions];
    },
    [runtimeCollections, taxonomyVersion]
  );
  const marketplaceNetworkOptions = useMemo(
    () => getMarketplaceCatalogNetworkOptions(marketplaceAssets),
    [marketplaceAssets]
  );
  const marketplacePriceRange = useMemo(() => getMarketplacePriceRange(marketplaceAssets), [marketplaceAssets]);
  const visibleCategoryOptions = contentMode === 'collections' ? collectionCategoryOptions : marketplaceCategoryOptions;
  const currentAISearchFilterKey = useMemo(
    () => buildAISearchFilterKey(filters.categories),
    [filters.categories],
  );
  const collectionCategoryFilter = contentMode === 'collections' && filters.categories.length === 1
    ? filters.categories[0]
    : undefined;
  const profilePageQuery = useMemo(
    () => ({
      searchQuery: debouncedSearchQuery.trim(),
      verifiedOnly: filters.verifiedOnly,
    }),
    [debouncedSearchQuery, filters.verifiedOnly],
  );
  const profileQueryKey = useMemo(
    () => JSON.stringify(profilePageQuery),
    [profilePageQuery],
  );
  const collectionPageQuery = useMemo(
    () => ({
      searchQuery: debouncedSearchQuery.trim(),
      category: collectionCategoryFilter,
      verifiedOnly: filters.verifiedOnly,
    }),
    [collectionCategoryFilter, debouncedSearchQuery, filters.verifiedOnly],
  );
  const collectionQueryKey = useMemo(
    () => JSON.stringify(collectionPageQuery),
    [collectionPageQuery],
  );

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
    profileRequestIdRef.current += 1;
    const requestId = profileRequestIdRef.current;
    let cancelled = false;

    if (contentMode !== 'profiles') {
      setProfilePageStatus('idle');
      setIsLoadingMoreProfiles(false);
      return () => {
        cancelled = true;
      };
    }

    setProfilePageStatus('loading');
    setIsLoadingMoreProfiles(false);
    setHasMoreProfiles(false);
    setProfilePageCursor(null);
    setSellerProfiles([]);

    void fetchMarketplaceProfilePageFromSupabase({
      ...profilePageQuery,
      limit: SEARCH_ENTITY_PAGE_SIZE,
    })
      .then((page) => {
        if (cancelled || profileRequestIdRef.current !== requestId) return;
        setSellerProfiles(page.profiles);
        setProfilePageCursor(page.nextCursor);
        setHasMoreProfiles(page.hasMore);
        setProfilePageQueryKey(profileQueryKey);
        setProfilePageStatus('ready');
      })
      .catch(() => {
        if (cancelled || profileRequestIdRef.current !== requestId) return;
        setSellerProfiles([]);
        setProfilePageCursor(null);
        setHasMoreProfiles(false);
        setProfilePageQueryKey(profileQueryKey);
        setProfilePageStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [contentMode, profilePageQuery, profileQueryKey]);

  useEffect(() => {
    collectionRequestIdRef.current += 1;
    const requestId = collectionRequestIdRef.current;
    let cancelled = false;

    if (contentMode !== 'collections') {
      setCollectionPageStatus('idle');
      setIsLoadingMoreCollections(false);
      return () => {
        cancelled = true;
      };
    }

    setCollectionPageStatus('loading');
    setIsLoadingMoreCollections(false);
    setHasMoreCollections(false);
    setCollectionPageCursor(null);
    setRuntimeCollections([]);

    void fetchMarketplaceCollectionPageFromSupabase({
      ...collectionPageQuery,
      limit: SEARCH_ENTITY_PAGE_SIZE,
    })
      .then((page) => {
        if (cancelled || collectionRequestIdRef.current !== requestId) return;
        setRuntimeCollections(page.collections);
        setCollectionPageCursor(page.nextCursor);
        setHasMoreCollections(page.hasMore);
        setCollectionPageQueryKey(collectionQueryKey);
        setCollectionPageStatus('ready');
      })
      .catch(() => {
        if (cancelled || collectionRequestIdRef.current !== requestId) return;
        setRuntimeCollections([]);
        setCollectionPageCursor(null);
        setHasMoreCollections(false);
        setCollectionPageQueryKey(collectionQueryKey);
        setCollectionPageStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [collectionPageQuery, collectionQueryKey, contentMode]);

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
    if (!selectedAsset) return;

    const nextSelectedAsset = getMarketplaceCatalogAssetById(selectedAsset.id, marketplaceAssets);
    if (nextSelectedAsset && nextSelectedAsset !== selectedAsset) {
      setSelectedAsset(nextSelectedAsset);
    }
  }, [marketplaceAssets, selectedAsset]);

  useEffect(() => {
    const query = filters.query.trim();
    if (
      contentMode !== 'assets' ||
      !query ||
      aiSearchRequest === null ||
      aiSearchRequest.query !== query ||
      aiSearchRequest.filterKey !== currentAISearchFilterKey
    ) {
      aiSearchRequestRef.current += 1;
      setAiSearchStatus('idle');
      setAiSearchProducts([]);
      setAiSearchSummary('');
      setAiExtractedQuery('');
      setAiSearchError('');
      setIsAISemanticSearch(false);
      if (aiSearchRequest !== null) {
        setAiSearchRequest(null);
      }
      return;
    }

    const requestId = aiSearchRequestRef.current + 1;
    aiSearchRequestRef.current = requestId;
    setAiSearchStatus('loading');
    setAiSearchProducts([]);
    setAiSearchSummary('');
    setAiExtractedQuery('');
    setAiSearchError('');
    setIsAISemanticSearch(false);

    const timer = window.setTimeout(() => {
      void (async () => {
        const language =
          typeof navigator !== 'undefined'
            ? String(navigator.language || '').split('-')[0] || undefined
            : undefined;
        const response = await AIAgentClient.searchProducts(aiSearchRequest.query, {
          category: aiSearchRequest.selectedCategory,
          limit: aiSearchRequest.selectedCategory ? 18 : 12,
          lang: language,
        });

        if (aiSearchRequestRef.current !== requestId) return;

        if (!response) {
          setAiSearchStatus('error');
          setAiSearchProducts([]);
          setAiSearchSummary('');
          setAiExtractedQuery(aiSearchRequest.query);
          setAiSearchError('ORINA AI search is unavailable right now. Showing keyword matches from the marketplace catalog.');
          setIsAISemanticSearch(false);
          return;
        }

        setAiSearchStatus('success');
        setAiSearchProducts(response.results ?? []);
        setAiSearchSummary(sanitizeAIVisibleText(String(response.chatResponse || '')));
        setAiExtractedQuery(String(response.extractedQuery || aiSearchRequest.query).trim() || aiSearchRequest.query);
        setAiSearchError('');
        setIsAISemanticSearch(response.isVectorSearch === true);
      })();
    }, 320);

    return () => {
      window.clearTimeout(timer);
    };
  }, [aiSearchRequest, contentMode, currentAISearchFilterKey, filters.query]);

  // Filter results
  const filteredAssets = useMemo(() => {
    return filterMarketplaceResults(marketplaceAssets, filters);
  }, [marketplaceAssets, filters, taxonomyVersion]);

  const resolvedAISearchResults = useMemo(
    () => resolveAISearchResults(aiSearchProducts, marketplaceAssets),
    [aiSearchProducts, marketplaceAssets],
  );

  const aiFilteredAssets = useMemo(
    () => filterMarketplaceResultsWithOptions(resolvedAISearchResults.assets, filters, { includeQuery: false }),
    [filters, resolvedAISearchResults.assets],
  );

  const filteredCollections = useMemo(() => {
    return runtimeCollections;
  }, [runtimeCollections]);

  const filteredProfiles = useMemo(() => {
    return sellerProfiles;
  }, [sellerProfiles]);

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
      ).slice(0, 1);
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
      case 'network':
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

  const handleLike = async (assetId: string) => {
    if (!address) {
      toast.error('Please connect wallet to use favorites');
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
  };

  const handleAssetClick = (assetId: string) => {
    if (onNavigateToAsset) {
      onNavigateToAsset(assetId);
      return;
    }
    const asset = getMarketplaceCatalogAssetById(assetId, marketplaceAssets);
    if (!asset) {
      onNavigateToAsset?.(assetId);
      return;
    }

    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  const handleCollectionClick = (collectionId: string) => {
    if (onNavigateToCollection) {
      onNavigateToCollection(collectionId, 'search');
      return;
    }
    setSelectedCollectionId(collectionId);
    setIsCollectionModalOpen(true);
  };

  const handleProfileFollowChange = (walletAddress: string, following: boolean) => {
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
  };

  const trimmedQuery = filters.query.trim();
  const aiSearchAvailable = contentMode === 'assets' && trimmedQuery.length > 0;
  const aiSearchActive =
    aiSearchAvailable &&
    aiSearchRequest !== null &&
    aiSearchRequest.query === trimmedQuery &&
    aiSearchRequest.filterKey === currentAISearchFilterKey;
  const canStartAISearch = aiSearchAvailable && aiSearchStatus !== 'loading';
  const showingAISearchResults =
    aiSearchActive &&
    aiSearchStatus === 'success' &&
    aiFilteredAssets.length > 0;
  const displayedAssets = showingAISearchResults ? aiFilteredAssets : filteredAssets;
  const displayedAssetCount = displayedAssets.length;
  const showAssetEmptyState =
    displayedAssetCount === 0 &&
    !(aiSearchActive && aiSearchStatus === 'loading');
  const showAssetLoadingState =
    aiSearchActive && aiSearchStatus === 'loading' && displayedAssets.length === 0;
  const isProfilesLoading =
    contentMode === 'profiles' &&
    (
      profilePageStatus === 'idle' ||
      profilePageStatus === 'loading' ||
      profilePageQueryKey !== profileQueryKey
    );
  const isCollectionsLoading =
    contentMode === 'collections' &&
    (
      collectionPageStatus === 'idle' ||
      collectionPageStatus === 'loading' ||
      collectionPageQueryKey !== collectionQueryKey
    );
  const isEntityLoading = isProfilesLoading || isCollectionsLoading;
  const isLoadingMoreEntityResults = isLoadingMoreProfiles || isLoadingMoreCollections;

  const resultCount =
    contentMode === 'profiles'
      ? filteredProfiles.length
      : contentMode === 'collections'
      ? filteredCollections.length
      : displayedAssetCount;
  const hasMoreEntityResults =
    (
      contentMode === 'profiles' &&
      profilePageStatus === 'ready' &&
      profilePageQueryKey === profileQueryKey &&
      hasMoreProfiles
    ) ||
    (
      contentMode === 'collections' &&
      collectionPageStatus === 'ready' &&
      collectionPageQueryKey === collectionQueryKey &&
      hasMoreCollections
    );

  const loadMoreProfiles = useCallback(() => {
    if (
      contentMode !== 'profiles' ||
      !hasMoreProfiles ||
      !profilePageCursor ||
      isLoadingMoreProfiles ||
      profilePageStatus !== 'ready' ||
      profilePageQueryKey !== profileQueryKey
    ) {
      return;
    }

    const requestId = profileRequestIdRef.current;
    setIsLoadingMoreProfiles(true);
    void fetchMarketplaceProfilePageFromSupabase({
      ...profilePageQuery,
      cursor: profilePageCursor,
      limit: SEARCH_ENTITY_PAGE_SIZE,
    })
      .then((page) => {
        if (profileRequestIdRef.current !== requestId) return;
        setSellerProfiles((currentProfiles) => mergeProfilesByAddress(currentProfiles, page.profiles));
        setProfilePageCursor(page.nextCursor);
        setHasMoreProfiles(page.hasMore);
      })
      .catch(() => undefined)
      .finally(() => {
        if (profileRequestIdRef.current === requestId) {
          setIsLoadingMoreProfiles(false);
        }
      });
  }, [
    contentMode,
    hasMoreProfiles,
    isLoadingMoreProfiles,
    profilePageCursor,
    profilePageQuery,
    profilePageQueryKey,
    profilePageStatus,
    profileQueryKey,
  ]);

  const loadMoreCollections = useCallback(() => {
    if (
      contentMode !== 'collections' ||
      !hasMoreCollections ||
      !collectionPageCursor ||
      isLoadingMoreCollections ||
      collectionPageStatus !== 'ready' ||
      collectionPageQueryKey !== collectionQueryKey
    ) {
      return;
    }

    const requestId = collectionRequestIdRef.current;
    setIsLoadingMoreCollections(true);
    void fetchMarketplaceCollectionPageFromSupabase({
      ...collectionPageQuery,
      cursor: collectionPageCursor,
      limit: SEARCH_ENTITY_PAGE_SIZE,
    })
      .then((page) => {
        if (collectionRequestIdRef.current !== requestId) return;
        setRuntimeCollections((currentCollections) => mergeCollectionsById(currentCollections, page.collections));
        setCollectionPageCursor(page.nextCursor);
        setHasMoreCollections(page.hasMore);
      })
      .catch(() => undefined)
      .finally(() => {
        if (collectionRequestIdRef.current === requestId) {
          setIsLoadingMoreCollections(false);
        }
      });
  }, [
    collectionPageCursor,
    collectionPageQuery,
    collectionPageQueryKey,
    collectionPageStatus,
    collectionQueryKey,
    contentMode,
    hasMoreCollections,
    isLoadingMoreCollections,
  ]);

  const requestMoreEntityResults = useCallback(() => {
    if (contentMode === 'profiles') {
      loadMoreProfiles();
      return;
    }

    if (contentMode === 'collections') {
      loadMoreCollections();
    }
  }, [contentMode, loadMoreCollections, loadMoreProfiles]);

  const handleResultsScroll = useCallback((event: UIEvent<HTMLElement>) => {
    if (!hasMoreEntityResults || isLoadingMoreEntityResults) return;

    const target = event.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom <= SEARCH_SCROLL_PREFETCH_PX) {
      requestMoreEntityResults();
    }
  }, [hasMoreEntityResults, isLoadingMoreEntityResults, requestMoreEntityResults]);

  useEffect(() => {
    if (!hasMoreEntityResults || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const root = resultsScrollContainerRef.current;
    const sentinel = resultsLoadMoreSentinelRef.current;
    if (!root || !sentinel) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isLoadingMoreEntityResults) {
          requestMoreEntityResults();
        }
      },
      {
        root,
        rootMargin: `0px 0px ${SEARCH_SCROLL_PREFETCH_PX}px 0px`,
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreEntityResults, isLoadingMoreEntityResults, requestMoreEntityResults]);

  const handleContentModeChange = (nextMode: 'assets' | 'profiles' | 'collections') => {
    setContentMode(nextMode);
    if (nextMode !== 'assets') {
      setFilters((prev) => ({
        ...prev,
        categories: nextMode === 'collections'
          ? prev.categories.filter((category) =>
              collectionCategoryOptions.some((option) => option.value === category)
            ).slice(0, 1)
          : [],
        blockchains: [],
        priceRange: { min: null, max: null },
      }));
    }
  };

  const handleStartAISearch = () => {
    const query = filters.query.trim();
    if (contentMode !== 'assets' || !query) return;

    setAiSearchRequest({
      query,
      filterKey: currentAISearchFilterKey,
      selectedCategory: filters.categories.length === 1 ? filters.categories[0] : undefined,
    });
  };

  const handleRetryAISearch = () => {
    handleStartAISearch();
  };

  const resultLabel =
    contentMode === 'profiles'
      ? 'profiles'
      : contentMode === 'collections'
        ? 'collections'
        : 'items';
  const searchTitle = filters.query
    ? `Results for "${filters.query}"`
    : contentMode === 'profiles'
      ? 'Browse Profiles'
      : contentMode === 'collections'
        ? 'Browse Collections'
        : 'Browse All Assets';
  const searchSubtitle = filters.query
    ? 'Search stays connected to the live marketplace catalog and your active filters.'
    : contentMode === 'profiles'
      ? 'Review verified seller profiles and marketplace reputation signals in one place.'
      : contentMode === 'collections'
        ? 'Browse collection surfaces mapped from the same canonical marketplace system.'
        : 'Search the live catalog with keyword discovery while keeping filters visible.';
  const filterSectionClassName =
    'rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)] p-5 shadow-none';

  return (
    <div className="search-page-theme h-full bg-ui-page overflow-hidden">
      <style>{`
        div::-webkit-scrollbar { width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: var(--t-border-medium); border-radius: 10px; }
      `}</style>

      <div className="flex h-full min-w-0 overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden px-5 py-5 lg:px-7 lg:py-6">

      {/* Center Column - Results */}
      <section
        ref={resultsScrollContainerRef}
        className="relative z-10 h-full overflow-y-auto overflow-x-hidden custom-scrollbar"
        onScroll={handleResultsScroll}
      >
        <div className="mx-auto w-full max-w-6xl">
        <StudioPanel className="mb-8 rounded-[32px] p-5 sm:p-6">
          <StudioPageHeader
            className="mb-6 flex-col items-start gap-5 xl:flex-row xl:items-end xl:justify-between"
            title={<span className="text-[32px] font-semibold tracking-[-0.03em] text-ui-primary">{searchTitle}</span>}
            subtitle={<span className="max-w-2xl text-[15px] leading-7 text-ui-secondary">{searchSubtitle}</span>}
          />

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <StudioPillGroup className="rounded-full bg-[var(--t-surface-2)] shadow-none" compact>
                  <StudioPillButton
                    onClick={() => handleContentModeChange('assets')}
                    active={contentMode === 'assets'}
                    className={contentMode === 'assets' ? 'rounded-full bg-[var(--t-card-bg)] px-4 py-2.5 text-ui-primary shadow-none' : 'rounded-full px-4 py-2.5 text-ui-muted hover:text-ui-primary'}
                  >
                    Assets
                  </StudioPillButton>
                  <StudioPillButton
                    onClick={() => handleContentModeChange('profiles')}
                    active={contentMode === 'profiles'}
                    className={contentMode === 'profiles' ? 'rounded-full bg-[var(--t-card-bg)] px-4 py-2.5 text-ui-primary shadow-none' : 'rounded-full px-4 py-2.5 text-ui-muted hover:text-ui-primary'}
                  >
                    Profiles
                  </StudioPillButton>
                  <StudioPillButton
                    onClick={() => handleContentModeChange('collections')}
                    active={contentMode === 'collections'}
                    className={contentMode === 'collections' ? 'rounded-full bg-[var(--t-card-bg)] px-4 py-2.5 text-ui-primary shadow-none' : 'rounded-full px-4 py-2.5 text-ui-muted hover:text-ui-primary'}
                  >
                    Collections
                  </StudioPillButton>
                </StudioPillGroup>

                <StudioPillGroup className="rounded-full bg-[var(--t-surface-2)] shadow-none" compact>
                  <StudioPillButton
                    onClick={() => setViewMode('list')}
                    active={viewMode === 'list'}
                    className={viewMode === 'list' ? 'rounded-full bg-[var(--t-card-bg)] px-3 py-2.5 text-ui-primary shadow-none' : 'rounded-full px-3 py-2.5 text-ui-muted hover:text-ui-primary'}
                  >
                    <List size={18} />
                  </StudioPillButton>
                  <StudioPillButton
                    onClick={() => setViewMode('grid')}
                    active={viewMode === 'grid'}
                    className={viewMode === 'grid' ? 'rounded-full bg-[var(--t-card-bg)] px-3 py-2.5 text-ui-primary shadow-none' : 'rounded-full px-3 py-2.5 text-ui-muted hover:text-ui-primary'}
                  >
                    <Grid3x3 size={18} />
                  </StudioPillButton>
                </StudioPillGroup>

                {contentMode === 'assets' && (
                  <StudioActionButton
                    type="button"
                    onClick={handleStartAISearch}
                    disabled={!canStartAISearch}
                    variant={aiSearchActive ? 'primary' : 'secondary'}
                    size="icon"
                    aria-label="Search with ORINA AI"
                    title="Search with ORINA AI"
                    className="h-11 w-11 border-[#2CC295]/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Sparkles size={18} aria-hidden="true" />
                    <span className="sr-only">Search with ORINA AI</span>
                  </StudioActionButton>
                )}
              </div>

              <div className="text-sm text-ui-secondary">
                <span className="font-semibold text-ui-primary">{resultCount.toLocaleString()}</span> {resultLabel}
                {filters.query ? (
                  <>
                    {' '}for <span className="font-medium text-primary">"{filters.query}"</span>
                  </>
                ) : null}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <FilterTags
                filters={filters}
                onRemoveFilter={handleRemoveFilter}
                onClearAll={handleClearAllFilters}
              />
            )}
          </div>
        </StudioPanel>

        {aiSearchActive && (
          <StudioPanel className="mb-6 overflow-hidden rounded-[24px] border border-[var(--t-border-subtle)] bg-[var(--t-surface-2)] p-5">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2CC295]">
                    <Sparkles size={12} />
                    ORINA AI Search
                  </span>
                  {aiSearchStatus === 'success' && (
                    <span className="rounded-full border border-[var(--t-border-subtle)] bg-[var(--t-surface-5)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ui-muted">
                      {isAISemanticSearch ? 'AI ranked' : 'Catalog match'}
                    </span>
                  )}
                  {showingAISearchResults && resolvedAISearchResults.assets.length > 0 && (
                    <span className="rounded-full border border-[var(--t-border-subtle)] bg-[var(--t-surface-5)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ui-muted">
                      {resolvedAISearchResults.assets.length} matching listings
                    </span>
                  )}
                </div>

                {aiSearchStatus === 'loading' ? (
                  <StudioLoadingIndicator
                    tone="muted"
                    label="Checking listings"
                    subLabel="Reviewing matching products in the marketplace catalog."
                    className="text-sm text-ui-secondary"
                    labelClassName="text-ui-primary"
                    subLabelClassName="text-ui-muted"
                  />
                ) : aiSearchStatus === 'error' ? (
                  <StudioTransientState
                    variant="error"
                    inline={false}
                    title="AI search did not return a usable response"
                    description={aiSearchError}
                  />
                ) : aiSearchStatus === 'success' ? (
                  <div className="space-y-2">
                    <p className="max-w-full break-words text-sm leading-6 text-ui-secondary">
                      {resolvedAISearchResults.assets.length > 0
                        ? aiSearchSummary || 'AI search completed. Matching marketplace listings are shown below.'
                        : 'AI search did not find active listings for this query. Showing keyword matches from the marketplace catalog.'}
                    </p>
                    {aiExtractedQuery && aiExtractedQuery !== filters.query.trim() && (
                      <p className="text-xs text-ui-muted">
                        AI interpreted your request as <span className="font-semibold text-ui-primary">"{aiExtractedQuery}"</span>.
                      </p>
                    )}
                    {resolvedAISearchResults.assets.length === 0 && (
                      <StudioTransientState
                        variant="info"
                        inline={false}
                        title="No active listings found"
                        description="Adjust the query or filters to look across the current marketplace catalog."
                      />
                    )}
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2 lg:pl-4">
                <StudioActionButton
                  onClick={handleRetryAISearch}
                  variant="secondary"
                  className="px-4 py-2 text-xs"
                >
                  Retry AI Search
                </StudioActionButton>
              </div>
            </div>
          </StudioPanel>
        )}

        {/* Results */}
        {showAssetLoadingState || isEntityLoading ? (
          <StudioPanel className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-[var(--t-border-subtle)] bg-[var(--t-surface-2)]">
            <StudioLoadingIndicator
              layout="stacked"
              size={24}
              tone="muted"
              label={
                showAssetLoadingState
                  ? 'ORINA AI is searching the catalog'
                  : contentMode === 'profiles'
                    ? 'Loading profiles'
                    : 'Loading collections'
              }
              subLabel={
                showAssetLoadingState
                  ? 'Matching listings will appear here when the response is ready.'
                  : 'Fetching the first ranked page from the marketplace index.'
              }
              labelClassName="text-ui-primary"
              subLabelClassName="text-ui-muted"
            />
          </StudioPanel>
        ) : (contentMode === 'assets' && showAssetEmptyState) || (contentMode === 'profiles' && filteredProfiles.length === 0) || (contentMode === 'collections' && filteredCollections.length === 0) ? (
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
                className="px-6 py-3 text-sm"
              >
                Clear All Filters
              </StudioActionButton>
            ) : undefined}
          />
        ) : (
          // Results List/Grid
          <>
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
                  {displayedAssets.map((asset) => (
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
                        isLiked={likedCollections.has(collection.id) || Boolean(collection.viewerFavorited)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
            {hasMoreEntityResults && (
              <>
                <div ref={resultsLoadMoreSentinelRef} aria-hidden="true" className="h-px" />
                <div className="flex justify-center py-6">
                  <StudioActionButton
                    type="button"
                    onClick={requestMoreEntityResults}
                    disabled={isLoadingMoreEntityResults}
                    variant="secondary"
                    className="px-5 py-2.5 text-sm"
                  >
                    {isLoadingMoreEntityResults ? 'Loading results...' : 'Load more results'}
                  </StudioActionButton>
                </div>
              </>
            )}
          </>
        )}
        </div>
      </section>
      </div>

      {/* Right Sidebar - Filters */}
      <InlineAIRightRail
        activePage="search"
        showAI={showAISidebar}
        onCloseAI={onCloseAISidebar}
        widthClassName="w-[368px]"
        shellClassName="bg-transparent border-l-0 p-4"
      >
      <StudioSidebarShell widthClassName="w-[368px]" className="bg-transparent border-l-0 p-4">
        <div className="flex h-full flex-col overflow-hidden rounded-[28px] bg-[var(--t-card-bg)] shadow-[0_24px_60px_-42px_rgba(0,0,0,0.34)]">
        {/* Header - Fixed */}
        <StudioSidebarHeader className="border-b border-ui-border-subtle px-6 py-5">
          <h2 className="text-ui-primary font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Search className="text-primary" size={18} />
            Search Filters
          </h2>
          <p className="text-xs text-ui-muted mt-1">Refine your search results</p>
        </StudioSidebarHeader>

        {/* Scrollable Content */}
        <StudioSidebarScroll className="space-y-5 p-5">
          {/* Filters */}
          <div className="space-y-5">
            {contentMode === 'assets' && (
              <StudioPanel className={filterSectionClassName}>
                <label className="text-[10px] font-medium text-ui-muted uppercase block mb-4">
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
              </StudioPanel>
            )}

            {/* Network */}
            {contentMode === 'assets' && (
              <StudioPanel className={filterSectionClassName}>
                <label className="text-[10px] font-medium text-ui-muted uppercase block mb-4">
                  Network
                </label>
                <CustomDropdown
                  defaultValue={filters.blockchains[0] || 'all'}
                  onChange={(value) => {
                    setFilters({ ...filters, blockchains: value === 'all' ? [] : [value] });
                  }}
                  options={[
                    { value: 'all', label: 'All Networks' },
                    ...marketplaceNetworkOptions,
                  ]}
                  variant="compact"
                  className="w-full"
                />
              </StudioPanel>
            )}

            {/* Status */}
            <StudioPanel className={filterSectionClassName}>
              <label className="text-[10px] font-medium text-ui-muted uppercase block mb-4">
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
                {contentMode === 'assets' && runtimeFlags.enableSearchDemoPanels && (
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
            </StudioPanel>

            {/* Categories */}
            {contentMode !== 'profiles' && (
              <StudioPanel className={filterSectionClassName}>
                <label className="text-[10px] font-medium text-ui-muted uppercase block mb-4">
                  Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {visibleCategoryOptions.map((category) => (
                    <button
                      key={category.value}
                      onClick={() => {
                        const newCategories = contentMode === 'collections'
                          ? filters.categories.includes(category.value)
                            ? []
                            : [category.value]
                          : filters.categories.includes(category.value)
                            ? filters.categories.filter(c => c !== category.value)
                            : [...filters.categories, category.value];
                        setFilters({ ...filters, categories: newCategories });
                      }}
                      className={`
                        px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
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
              </StudioPanel>
            )}
          </div>

          {runtimeFlags.enableSearchDemoPanels ? (
            <StudioPanel className={filterSectionClassName}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[11px] uppercase font-semibold text-ui-muted">Market Trends</h2>
                <span className="text-[10px] text-[#2CC295] bg-[#2CC295]/10 px-2 py-0.5 rounded font-semibold uppercase">
                  Live
                </span>
              </div>
              <div className="space-y-4">
                <StudioPanel className="p-4 rounded-xl bg-[var(--t-surface-5)]">
                  <p className="text-[10px] font-medium text-ui-muted uppercase mb-1">Floor Price Trend</p>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-semibold text-ui-primary">1.12 ETH</span>
                    <span className="text-xs text-[#2CC295] font-semibold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      +12.4%
                    </span>
                  </div>
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
            </StudioPanel>
          ) : null}
        </StudioSidebarScroll>
        </div>
      </StudioSidebarShell>
      </InlineAIRightRail>

      {/* Product Modal */}
      {isModalOpen && selectedAsset && (
        <AssetDetailsModal
          asset={selectedAsset}
          onClose={() => setIsModalOpen(false)}
          onNavigateToSeller={onNavigateToUserProfile}
          onNavigateToSellerReviews={onNavigateToUserReviews}
          onNavigateToSellerMessages={onNavigateToMessages}
        />
      )}

      <CollectionDetailsModal
        isOpen={isCollectionModalOpen}
        collectionId={selectedCollectionId}
        onClose={() => {
          setIsCollectionModalOpen(false);
          setSelectedCollectionId(null);
        }}
        onNavigateToSeller={onNavigateToUserProfile}
        onNavigateToSellerReviews={onNavigateToUserReviews}
        onNavigateToSellerMessages={onNavigateToMessages}
      />
      </div>
    </div>
  );
}
