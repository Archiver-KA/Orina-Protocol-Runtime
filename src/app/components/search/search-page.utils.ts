import type { SearchFilters } from '@/types/search';
import { getDefaultFilters } from '@/utils/searchUtils';
import {
  getSubcategoryDisplayLabel,
  normalizeCategoryFilterValue,
} from '@/utils/taxonomy';

export interface SearchNavigationRequest {
  query?: string;
  category: string;
  subcategory?: string;
  requestKey: string;
}

export function buildSearchNavigationFilters(
  navigationRequest: SearchNavigationRequest | null | undefined,
): SearchFilters | null {
  if (!navigationRequest) return null;

  const rawCategory = String(navigationRequest.category || '').trim();
  const rawSubcategory = String(navigationRequest.subcategory || '').trim();
  if (!rawCategory && !rawSubcategory) {
    return null;
  }

  const normalizedCategory = normalizeCategoryFilterValue(
    navigationRequest.category,
    navigationRequest.subcategory,
  );
  const routeQuery = String(navigationRequest.query || '').trim();
  const subcategoryQuery = navigationRequest.subcategory
    ? getSubcategoryDisplayLabel(navigationRequest.category, navigationRequest.subcategory)
      || String(navigationRequest.subcategory).trim()
    : '';

  if (!normalizedCategory) {
    return null;
  }

  return {
    ...getDefaultFilters(),
    query: routeQuery || subcategoryQuery,
    categories: [normalizedCategory],
  };
}