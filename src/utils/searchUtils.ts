import { SearchFilters, SearchResult, SearchHistoryItem, SortOption } from '@/types/search';
import { MarketplaceAsset } from '@/app/types/asset';
import {
  getCategoryDisplayLabel,
  getTaxonomySearchText,
  normalizeCategoryFilterValue,
  normalizeCategoryFilterValues,
  normalizeTaxonomySearchKey,
} from '@/utils/taxonomy';

/** @deprecated Session-only. Server-side search_history table available for wallet-scoped persistence. */
const SEARCH_HISTORY_KEY = 'studio_search_history';
const MAX_HISTORY_ITEMS = 10;

/**
 * Get default filters
 */
export function getDefaultFilters(): SearchFilters {
  return {
    query: '',
    categories: [],
    priceRange: {
      min: null,
      max: null,
    },
    blockchains: [],
    verifiedOnly: false,
    sortBy: 'date-desc',
  };
}

/**
 * Filter search results based on filters
 */
export function filterResults(results: SearchResult[], filters: SearchFilters): SearchResult[] {
  let filtered = [...results];
  const normalizedCategoryFilters = normalizeCategoryFilterValues(filters.categories);

  // Text search
  if (filters.query.trim()) {
    const query = normalizeTaxonomySearchKey(filters.query);
    filtered = filtered.filter((item) => 
      normalizeTaxonomySearchKey(item.name).includes(query) ||
      normalizeTaxonomySearchKey(item.description).includes(query) ||
      normalizeTaxonomySearchKey(getTaxonomySearchText(item.category)).includes(query)
    );
  }

  // Category filter
  if (normalizedCategoryFilters.length > 0) {
    filtered = filtered.filter((item) => 
      normalizedCategoryFilters.includes(normalizeCategoryFilterValue(item.category))
    );
  }

  // Price range filter
  if (filters.priceRange.min !== null) {
    filtered = filtered.filter((item) => 
      item.priceNumeric >= filters.priceRange.min!
    );
  }
  if (filters.priceRange.max !== null) {
    filtered = filtered.filter((item) => 
      item.priceNumeric <= filters.priceRange.max!
    );
  }

  // Blockchain filter
  if (filters.blockchains.length > 0) {
    filtered = filtered.filter((item) => 
      filters.blockchains.includes(item.blockchain)
    );
  }

  // Verified filter
  if (filters.verifiedOnly) {
    filtered = filtered.filter((item) => item.verified);
  }

  // Sort results
  filtered = sortResults(filtered, filters.sortBy);

  return filtered;
}

function parseMarketplacePrice(price: string): number {
  const parsed = Number.parseFloat(String(price).replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Filter marketplace assets based on search filters
 */
export function filterMarketplaceResults(results: MarketplaceAsset[], filters: SearchFilters): MarketplaceAsset[] {
  let filtered = [...results];
  const normalizedCategoryFilters = normalizeCategoryFilterValues(filters.categories);

  if (filters.query.trim()) {
    const query = normalizeTaxonomySearchKey(filters.query);
    filtered = filtered.filter((item) =>
      normalizeTaxonomySearchKey(item.name).includes(query) ||
      normalizeTaxonomySearchKey(item.description || '').includes(query) ||
      normalizeTaxonomySearchKey(getTaxonomySearchText(item.category)).includes(query) ||
      item.tags?.some((tag) => normalizeTaxonomySearchKey(tag).includes(query)) ||
      normalizeTaxonomySearchKey(item.seller.ensName || '').includes(query) ||
      normalizeTaxonomySearchKey(item.seller.address).includes(query)
    );
  }

  if (normalizedCategoryFilters.length > 0) {
    filtered = filtered.filter((item) =>
      normalizedCategoryFilters.includes(normalizeCategoryFilterValue(item.category))
    );
  }

  if (filters.priceRange.min !== null) {
    filtered = filtered.filter((item) => parseMarketplacePrice(item.price) >= filters.priceRange.min!);
  }

  if (filters.priceRange.max !== null) {
    filtered = filtered.filter((item) => parseMarketplacePrice(item.price) <= filters.priceRange.max!);
  }

  if (filters.blockchains.length > 0) {
    filtered = filtered.filter((item) => filters.blockchains.includes(item.blockchain));
  }

  if (filters.verifiedOnly) {
    filtered = filtered.filter((item) => item.verified);
  }

  return sortMarketplaceResults(filtered, filters.sortBy);
}

/**
 * Sort marketplace assets by option
 */
export function sortMarketplaceResults(results: MarketplaceAsset[], sortBy: SortOption): MarketplaceAsset[] {
  const sorted = [...results];

  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => parseMarketplacePrice(a.price) - parseMarketplacePrice(b.price));
    case 'price-desc':
      return sorted.sort((a, b) => parseMarketplacePrice(b.price) - parseMarketplacePrice(a.price));
    case 'date-asc':
      return sorted.sort((a, b) => a.listedAt - b.listedAt);
    case 'date-desc':
      return sorted.sort((a, b) => b.listedAt - a.listedAt);
    case 'popularity':
      return sorted.sort((a, b) => (b.views + b.likes) - (a.views + a.likes));
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    default:
      return sorted;
  }
}

/**
 * Sort results by option
 */
export function sortResults(results: SearchResult[], sortBy: SortOption): SearchResult[] {
  const sorted = [...results];

  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => a.priceNumeric - b.priceNumeric);
    case 'price-desc':
      return sorted.sort((a, b) => b.priceNumeric - a.priceNumeric);
    case 'date-asc':
      return sorted.sort((a, b) => a.mintDate - b.mintDate);
    case 'date-desc':
      return sorted.sort((a, b) => b.mintDate - a.mintDate);
    case 'popularity':
      return sorted.sort((a, b) => (b.views + b.favorites) - (a.views + a.favorites));
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    default:
      return sorted;
  }
}

/**
 * Count active filters
 */
export function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  
  if (filters.query.trim()) count++;
  if (filters.categories.length > 0) count += filters.categories.length;
  if (filters.priceRange.min !== null || filters.priceRange.max !== null) count++;
  if (filters.blockchains.length > 0) count += filters.blockchains.length;
  if (filters.verifiedOnly) count++;
  
  return count;
}

/**
 * Check if filters are default
 */
export function hasActiveFilters(filters: SearchFilters): boolean {
  return countActiveFilters(filters) > 0 || filters.sortBy !== 'date-desc';
}

/**
 * Load search history
 */
export function loadSearchHistory(): SearchHistoryItem[] {
  try {
    const stored = sessionStorage.getItem(SEARCH_HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load search history:', error);
    return [];
  }
}

/**
 * Save search to history
 */
export function saveSearchToHistory(query: string, filters?: Partial<SearchFilters>): void {
  if (!query.trim()) return;

  try {
    const history = loadSearchHistory();
    
    // Check if query already exists
    const existingIndex = history.findIndex((item) => item.query === query);
    if (existingIndex !== -1) {
      history.splice(existingIndex, 1);
    }

    // Add to beginning
    history.unshift({
      query,
      timestamp: Date.now(),
      filters,
    });

    // Keep only latest items
    const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
    
    sessionStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save search history:', error);
  }
}

/**
 * Clear search history
 */
export function clearSearchHistory(): void {
  try {
    sessionStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear search history:', error);
  }
}

/**
 * Delete search history item
 */
export function deleteSearchHistoryItem(query: string): void {
  try {
    const history = loadSearchHistory();
    const filtered = history.filter((item) => item.query !== query);
    sessionStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete search history item:', error);
  }
}

/**
 * Get category counts from results
 */
export function getCategoryCounts(results: SearchResult[]): Record<string, number> {
  const counts: Record<string, number> = {};
  results.forEach((item) => {
    const categorySlug = normalizeCategoryFilterValue(item.category);
    counts[categorySlug] = (counts[categorySlug] || 0) + 1;
  });
  return counts;
}

/**
 * Get blockchain counts from results
 */
export function getBlockchainCounts(results: SearchResult[]): Record<string, number> {
  const counts: Record<string, number> = {};
  results.forEach((item) => {
    counts[item.blockchain] = (counts[item.blockchain] || 0) + 1;
  });
  return counts;
}

/**
 * Get price range from results
 */
export function getPriceRange(results: SearchResult[]): { min: number; max: number } {
  if (results.length === 0) return { min: 0, max: 100 };
  
  const prices = results.map((item) => item.priceNumeric);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

/**
 * Get price range from marketplace assets
 */
export function getMarketplacePriceRange(results: MarketplaceAsset[]): { min: number; max: number } {
  if (results.length === 0) return { min: 0, max: 100 };

  const prices = results.map((item) => parseMarketplacePrice(item.price));
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

/**
 * Format filter tag label
 */
export function getFilterTagLabel(key: string, value: any): string {
  switch (key) {
    case 'query':
      return `"${value}"`;
    case 'category':
      return getCategoryDisplayLabel(value);
    case 'blockchain':
      return value;
    case 'priceMin':
      return `Min: ${value} ETH`;
    case 'priceMax':
      return `Max: ${value} ETH`;
    case 'verified':
      return 'Verified Only';
    case 'sortBy':
      return getSortLabel(value);
    default:
      return value;
  }
}

/**
 * Get sort option label
 */
export function getSortLabel(sortBy: SortOption): string {
  switch (sortBy) {
    case 'price-asc':
      return 'Price: Low to High';
    case 'price-desc':
      return 'Price: High to Low';
    case 'date-asc':
      return 'Date: Oldest First';
    case 'date-desc':
      return 'Date: Newest First';
    case 'popularity':
      return 'Most Popular';
    case 'name-asc':
      return 'Name: A to Z';
    case 'name-desc':
      return 'Name: Z to A';
    default:
      return sortBy;
  }
}

/**
 * Highlight search query in text
 */
export function highlightQuery(text: string, query: string): string {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark class="bg-[#2CC295]/20 text-[#2CC295]">$1</mark>');
}
