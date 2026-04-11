import { describe, expect, it } from 'vitest';
import { buildAppHref, parseAppLocation } from '@/utils/appRoutes';

describe('appRoutes', () => {
  it('builds canonical marketplace category paths', () => {
    expect(
      buildAppHref({
        page: 'marketplace',
        category: 'physical_goods',
      }),
    ).toBe('/marketplace/category/physical_goods');
  });

  it('builds canonical search category paths while preserving query text', () => {
    expect(
      buildAppHref({
        page: 'search',
        category: 'luxury_collectibles',
        searchQuery: 'vintage',
      }),
    ).toBe('/search/category/luxury_collectibles?q=vintage');
  });

  it('falls back to query routing for subcategory-specific pages', () => {
    expect(
      buildAppHref({
        page: 'marketplace',
        category: 'physical_goods',
        subcategory: 'watches',
      }),
    ).toBe('/marketplace?category=physical_goods&subcategory=watches');
  });

  it('parses canonical marketplace category paths into navigation state', () => {
    const route = parseAppLocation({
      pathname: '/marketplace/category/physical_goods',
      search: '',
    });

    expect(route.page).toBe('marketplace');
    expect(route.marketplaceNavigationRequest).toEqual({
      category: 'physical_goods',
      subcategory: undefined,
      requestKey: 'marketplace:physical_goods:route',
    });
  });

  it('parses legacy query-based search routes for backward compatibility', () => {
    const route = parseAppLocation({
      pathname: '/search',
      search: '?q=vintage&category=luxury_collectibles&subcategory=watches',
    });

    expect(route.page).toBe('search');
    expect(route.searchQuery).toBe('vintage');
    expect(route.searchNavigationRequest).toEqual({
      category: 'luxury_collectibles',
      subcategory: 'watches',
      requestKey: 'search:luxury_collectibles:route',
    });
  });
});
