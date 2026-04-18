import { Search, List, Grid3x3, Sparkles } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
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
import { REPUTATION_SYNC_EVENT } from '@/utils/profileReputationSync';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { EmptyStateCard } from '@/app/components/ui/empty-state-card';
import { StudioPageHeader } from '@/app/components/ui/studio-page-header';
import { StudioPillGroup, StudioPillButton } from '@/app/components/ui/studio-pill-group';
import { StudioSidebarShell, StudioSidebarHeader, StudioSidebarScroll } from '@/app/components/ui/studio-sidebar';
import { InlineAIRightRail } from '@/app/components/ui/inline-ai-right-rail';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioTransientState } from '@/app/components/ui/studio-transient-state';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { COLLECTIONS_SYNC_EVENT, loadCollectionFavorites, loadRuntimeCollections, toggleCollectionFavorite } from '@/utils/collectionsUtils';
import type { CollectionSummary } from '@/types/collection';
import { runtimeFlags } from '/utils/runtimeConfig';
import { PROFILE_SYNC_EVENT } from '@/utils/profileUtils';
import { AIAgentClient } from '@/utils/aiAgentClient';
import { resolveAISearchResults } from '@/utils/aiSearchUtils';
import {
  hydrateSellerDirectoryFromSupabase,
  loadSellerDirectorySync,
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
  getCategoryOptionsFromValues,
  getSubcategoryDisplayLabel,
  getTaxonomySearchText,
  hydrateTaxonomyFromSupabase,
  normalizeCategoryFilterValue,
  normalizeTaxonomySearchKey,
  TAXONOMY_SYNC_EVENT,
} from '@/utils/taxonomy';
import { navigateToMarketplaceCategory } from '@/utils/appNavigation';
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

const AI_SEARCH_REASONING_MARKERS = [
  'we should output',
  'the user says',
  'that\'s contradictory',
  'we need to summarize',
  'we need 1-2 short sentences',
  'make sure it\'s english',
  'the user wrote in english',
  'let\'s craft:',
  'could add another',
  'that\'s one sentence',
  'done',
] as const;

function normalizeAISearchSummaryWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function sanitizeAISearchSummary(value: string): string {
  const normalized = normalizeAISearchSummaryWhitespace(
    String(value || '')
      .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
      .replace(/```[\s\S]*?```/g, ' '),
  );

  if (!normalized) return '';

  const lowered = normalized.toLowerCase();
  const looksLikeReasoningLeak = AI_SEARCH_REASONING_MARKERS.some((marker) => lowered.includes(marker));
  if (!looksLikeReasoningLeak) {
    return normalized;
  }

  const quotedCandidates = Array.from(normalized.matchAll(/"([^"\r\n]{16,})"/g))
    .map((match) => normalizeAISearchSummaryWhitespace(match[1]))
    .filter((candidate) => {
      if (candidate.split(/\s+/).length < 5) return false;
      const candidateLowered = candidate.toLowerCase();
      return !AI_SEARCH_REASONING_MARKERS.some((marker) => candidateLowered.includes(marker));
    });

  if (quotedCandidates.length > 0) {
    return quotedCandidates.slice(-2).join(' ');
  }

  const labeledCandidate = normalized.match(
    /(?:final answer|answer|summary|summarize|let's craft)\s*:\s*(.+)$/i,
  )?.[1];

  if (labeledCandidate) {
    const cleanedCandidate = normalizeAISearchSummaryWhitespace(
      labeledCandidate
        .replace(/\s+(?:That|Could|Make sure|Done|We need|The user)\b[\s\S]*$/i, '')
        .replace(/^"+|"+$/g, ''),
    );

    if (cleanedCandidate.split(/\s+/).length >= 5) {
      return cleanedCandidate;
    }
  }

  return '';
}

interface AISearchFallbackCardProps {
  product: AIProductResult;
  viewMode: 'grid' | 'list';
}

function AISearchFallbackCard({ product, viewMode }: AISearchFallbackCardProps) {
  const similarityLabel =
    typeof product.similarity === 'number' ? `${product.similarity}% match` : 'AI match';
  const categoryLabel = getCategoryDisplayLabel(product.category);
  const handleCategoryRoute = () => {
    navigateToMarketplaceCategory({ category: product.category });
  };
  const shellClass =
    'group w-full overflow-hidden rounded-[24px] border border-[var(--t-border-subtle)] bg-[var(--t-surface-2)] transition-colors hover:bg-[var(--t-surface-5)]';

  if (viewMode === 'grid') {
    return (
      <div className={`${shellClass} flex h-full flex-col`}>
        <div className="relative h-[240px] overflow-hidden bg-black">
          <ImageWithFallback
            src={product.imageUrl || ''}
            alt={product.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-[#2CC295]/20 bg-[rgba(255,255,255,0.84)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1f9f7d] shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)] dark:bg-[rgba(18,19,23,0.78)] dark:text-[#7CF0CB]">
            <Sparkles size={12} />
            {similarityLabel}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCategoryRoute}
              className="truncate rounded-full border border-ui-border-subtle bg-[var(--t-surface-5)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ui-muted transition-colors hover:border-[#2CC295]/24 hover:bg-[#2CC295]/10 hover:text-[#2CC295]"
            >
              {categoryLabel}
            </button>
            <span className="rounded-full border border-[var(--t-border-subtle)] bg-[var(--t-surface-5)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ui-muted">
              Syncing
            </span>
          </div>

          <h3 className="line-clamp-2 text-[18px] font-semibold leading-[1.3] text-ui-primary">
            {product.title}
          </h3>

          <p className="text-sm leading-6 text-ui-secondary">
            Catalog details are syncing for this AI match. Retry the search in a moment to open the full listing.
          </p>

          <div className="mt-auto flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ui-muted">Price</p>
              <p className="mt-1 text-lg font-semibold text-ui-primary">{product.price || 'Pending sync'}</p>
            </div>
            <span className="text-[11px] font-medium text-[#7CF0CB]">AI semantic candidate</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${shellClass} flex flex-col lg:h-[240px] lg:flex-row`}>
      <div className="relative h-[240px] shrink-0 overflow-hidden bg-black lg:h-full lg:w-[395px]">
        <ImageWithFallback
          src={product.imageUrl || ''}
          alt={product.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-[#2CC295]/20 bg-[rgba(255,255,255,0.84)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1f9f7d] shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)] dark:bg-[rgba(18,19,23,0.78)] dark:text-[#7CF0CB]">
          <Sparkles size={12} />
          {similarityLabel}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 px-5 pb-5 pt-5 lg:px-6 lg:py-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCategoryRoute}
            className="truncate rounded-full border border-ui-border-subtle bg-[var(--t-surface-5)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ui-muted transition-colors hover:border-[#2CC295]/24 hover:bg-[#2CC295]/10 hover:text-[#2CC295]"
          >
            {categoryLabel}
          </button>
          <span className="rounded-full border border-[var(--t-border-subtle)] bg-[var(--t-surface-5)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ui-muted">
            Syncing
          </span>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[20px] font-semibold leading-[1.25] text-ui-primary">
              {product.title}
            </h3>
            <p className="mt-2 max-w-[32rem] text-sm leading-6 text-ui-secondary">
              AI found this listing, but the full marketplace projection has not hydrated into the page yet.
            </p>
          </div>

          <div className="shrink-0 lg:min-w-[150px] lg:text-right">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ui-muted">Price</p>
            <p className="mt-1 text-[24px] font-semibold leading-none text-ui-primary">
              {product.price || 'Pending sync'}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-[#7CF0CB]">AI semantic candidate</span>
          <span className="text-xs text-ui-muted">Refresh search if details do not appear yet.</span>
        </div>
      </div>
    </div>
  );
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
  const [sellerProfiles, setSellerProfiles] = useState(() => loadSellerDirectorySync({ marketplaceAssets: loadMarketplaceCatalogSync() }));
  const [runtimeCollections, setRuntimeCollections] = useState<CollectionSummary[]>(() => loadRuntimeCollections());
  const [taxonomyVersion, setTaxonomyVersion] = useState(0);
  const [aiSearchStatus, setAiSearchStatus] = useState<AISearchStatus>('idle');
  const [aiSearchProducts, setAiSearchProducts] = useState<AIProductResult[]>([]);
  const [aiSearchSummary, setAiSearchSummary] = useState('');
  const [aiExtractedQuery, setAiExtractedQuery] = useState('');
  const [aiSearchError, setAiSearchError] = useState('');
  const [isAISemanticSearch, setIsAISemanticSearch] = useState(false);
  const [aiSearchNonce, setAiSearchNonce] = useState(0);
  const aiSearchRequestRef = useRef(0);

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

  const marketplaceCategories = useMemo(() => getMarketplaceCatalogCategories(marketplaceAssets), [marketplaceAssets]);
  const marketplaceCategoryOptions = useMemo(
    () => marketplaceCategories.map((category) => ({ value: category, label: getCategoryDisplayLabel(category) })),
    [marketplaceCategories, taxonomyVersion]
  );
  const collectionCategoryOptions = useMemo(
    () => getCategoryOptionsFromValues(runtimeCollections.map((collection) => collection.category)),
    [runtimeCollections, taxonomyVersion]
  );
  const marketplaceNetworkOptions = useMemo(
    () => getMarketplaceCatalogNetworkOptions(marketplaceAssets),
    [marketplaceAssets]
  );
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
    if (contentMode !== 'assets' || !query) {
      aiSearchRequestRef.current += 1;
      setAiSearchStatus('idle');
      setAiSearchProducts([]);
      setAiSearchSummary('');
      setAiExtractedQuery('');
      setAiSearchError('');
      setIsAISemanticSearch(false);
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
        const selectedCategory = filters.categories.length === 1 ? filters.categories[0] : undefined;
        const language =
          typeof navigator !== 'undefined'
            ? String(navigator.language || '').split('-')[0] || undefined
            : undefined;
        const response = await AIAgentClient.searchProducts(query, {
          category: selectedCategory,
          limit: selectedCategory ? 18 : 12,
          lang: language,
        });

        if (aiSearchRequestRef.current !== requestId) return;

        if (!response) {
          setAiSearchStatus('error');
          setAiSearchProducts([]);
          setAiSearchSummary('');
          setAiExtractedQuery(query);
          setAiSearchError('ORINA AI search is unavailable right now. Showing keyword matches from the marketplace catalog.');
          setIsAISemanticSearch(false);
          return;
        }

        setAiSearchStatus('success');
        setAiSearchProducts(response.results ?? []);
        setAiSearchSummary(sanitizeAISearchSummary(String(response.chatResponse || '')));
        setAiExtractedQuery(String(response.extractedQuery || query).trim() || query);
        setAiSearchError('');
        setIsAISemanticSearch(response.isVectorSearch === true);
      })();
    }, 320);

    return () => {
      window.clearTimeout(timer);
    };
  }, [aiSearchNonce, contentMode, filters.categories, filters.query]);

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

  const hasAdvancedAssetRefinements =
    filters.blockchains.length > 0 ||
    filters.priceRange.min !== null ||
    filters.priceRange.max !== null ||
    filters.verifiedOnly;

  const aiFallbackProducts = useMemo(() => {
    if (hasAdvancedAssetRefinements) return [];

    const normalizedCategories = filters.categories.map((category) => normalizeCategoryFilterValue(category));
    if (normalizedCategories.length === 0) {
      return resolvedAISearchResults.unresolved;
    }

    return resolvedAISearchResults.unresolved.filter((product) =>
      normalizedCategories.includes(normalizeCategoryFilterValue(product.category)),
    );
  }, [filters.categories, hasAdvancedAssetRefinements, resolvedAISearchResults.unresolved]);

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
  }, [filters.categories, filters.query, filters.verifiedOnly, runtimeCollections, taxonomyVersion]);

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

  const handleProfileFollowChange = () => {
    const syncProfiles = loadSellerDirectorySync({ marketplaceAssets });
    setSellerProfiles((prev) => (syncProfiles.length > 0 || prev.length === 0 ? syncProfiles : prev));
    void hydrateSellerDirectoryFromSupabase({ marketplaceAssets })
      .then((nextProfiles) => {
        setSellerProfiles(nextProfiles);
      })
      .catch(() => undefined);
  };

  const aiSearchActive = contentMode === 'assets' && filters.query.trim().length > 0;
  const showingAISearchResults =
    aiSearchActive &&
    aiSearchStatus === 'success' &&
    (aiFilteredAssets.length > 0 || aiFallbackProducts.length > 0);
  const displayedAssets = showingAISearchResults ? aiFilteredAssets : filteredAssets;
  const displayedAssetCount =
    displayedAssets.length + (showingAISearchResults ? aiFallbackProducts.length : 0);
  const showAssetEmptyState =
    displayedAssetCount === 0 &&
    !(aiSearchActive && aiSearchStatus === 'loading');
  const showAssetLoadingState =
    aiSearchActive && aiSearchStatus === 'loading' && displayedAssets.length === 0;

  const resultCount =
    contentMode === 'profiles'
      ? filteredProfiles.length
      : contentMode === 'collections'
      ? filteredCollections.length
      : displayedAssetCount;

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

  const handleRetryAISearch = () => {
    setAiSearchNonce((value) => value + 1);
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
    ? 'Search stays connected to the live marketplace catalog, semantic AI results, and your active filters.'
    : contentMode === 'profiles'
      ? 'Review verified seller profiles and marketplace reputation signals in one place.'
      : contentMode === 'collections'
        ? 'Browse collection surfaces mapped from the same canonical marketplace system.'
        : 'Search the live catalog with keyword and semantic discovery while keeping filters visible.';
  const filterSectionClassName =
    'rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)] p-5 shadow-none';

  return (
    <div className="search-page-theme h-full bg-ui-page overflow-hidden">
      <style>{`
        div::-webkit-scrollbar { width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: var(--t-border-medium); border-radius: 10px; }
      `}</style>

      <div className="h-full flex overflow-hidden">
      <div className="flex-1 min-w-0 overflow-hidden px-6 py-6 lg:px-8 lg:py-8">

      {/* Center Column - Results */}
      <section className="h-full overflow-y-auto custom-scrollbar relative z-10">
        <div className="mx-auto max-w-6xl">
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

        {contentMode === 'assets' && filters.query.trim() && (
          <StudioPanel className="mb-6 rounded-[24px] border border-[var(--t-border-subtle)] bg-[var(--t-surface-2)] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2CC295]">
                    <Sparkles size={12} />
                    ORINA AI Search
                  </span>
                  {aiSearchStatus === 'success' && (
                    <span className="rounded-full border border-[var(--t-border-subtle)] bg-[var(--t-surface-5)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ui-muted">
                      {isAISemanticSearch ? 'Vector semantic' : 'Keyword fallback'}
                    </span>
                  )}
                  {showingAISearchResults && resolvedAISearchResults.assets.length > 0 && (
                    <span className="rounded-full border border-[var(--t-border-subtle)] bg-[var(--t-surface-5)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ui-muted">
                      {resolvedAISearchResults.assets.length} synced cards
                    </span>
                  )}
                  {showingAISearchResults && aiFallbackProducts.length > 0 && (
                    <span className="rounded-full border border-[var(--t-border-subtle)] bg-[var(--t-surface-5)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ui-muted">
                      {aiFallbackProducts.length} pending sync
                    </span>
                  )}
                </div>

                {aiSearchStatus === 'loading' ? (
                  <StudioLoadingIndicator
                    tone="muted"
                    label="Analyzing search intent"
                    subLabel="Checking semantic matches in the marketplace catalog."
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
                    <p className="text-sm leading-6 text-ui-secondary">
                      {aiSearchSummary || 'AI search completed. Rendering semantic marketplace matches below.'}
                    </p>
                    {aiExtractedQuery && aiExtractedQuery !== filters.query.trim() && (
                      <p className="text-xs text-ui-muted">
                        AI interpreted your request as <span className="font-semibold text-ui-primary">"{aiExtractedQuery}"</span>.
                      </p>
                    )}
                    {aiSearchProducts.length === 0 && (
                      <StudioTransientState
                        variant="info"
                        inline={false}
                        title="No semantic matches found"
                        description="Showing keyword matches from the marketplace catalog so the page still stays useful."
                      />
                    )}
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
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
        {showAssetLoadingState ? (
          <StudioPanel className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-[var(--t-border-subtle)] bg-[var(--t-surface-2)]">
            <StudioLoadingIndicator
              layout="stacked"
              size={24}
              tone="muted"
              label="ORINA AI is searching the catalog"
              subLabel="Semantic results will appear here when the response is ready."
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
                {showingAISearchResults &&
                  aiFallbackProducts.map((product) => (
                    <motion.div
                      key={`ai-fallback-${product.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                    >
                      <AISearchFallbackCard product={product} viewMode={viewMode} />
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
                        const newCategories = filters.categories.includes(category.value)
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
