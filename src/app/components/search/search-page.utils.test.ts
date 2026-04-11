import { describe, expect, it } from 'vitest';
import { buildSearchNavigationFilters } from '@/app/components/search/search-page.utils';

describe('buildSearchNavigationFilters', () => {
  it('prefers explicit route query over derived subcategory query', () => {
    const result = buildSearchNavigationFilters({
      requestKey: 'req-1',
      query: '  copper inventory  ',
      category: 'metals',
      subcategory: 'industrial-copper',
    });

    expect(result).toMatchObject({
      query: 'copper inventory',
      categories: ['metals'],
    });
  });

  it('falls back to the subcategory display label when route query is empty', () => {
    const result = buildSearchNavigationFilters({
      requestKey: 'req-2',
      category: 'energy',
      subcategory: 'solar',
    });

    expect(result?.categories).toEqual(['energy']);
    expect(result?.query.length).toBeGreaterThan(0);
  });

  it('returns null when no valid category can be normalized', () => {
    const result = buildSearchNavigationFilters({
      requestKey: 'req-3',
      category: '   ',
      subcategory: '   ',
    });

    expect(result).toBeNull();
  });
});