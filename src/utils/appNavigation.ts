export const APP_NAVIGATION_EVENT = 'orina:app-navigation';

export interface AppNavigationEventDetail {
  page?: string;
  assetId?: string;
  orderId?: string;
  fromPage?: string;
  query?: string;
  category?: string;
  subcategory?: string;
}

export function dispatchAppNavigation(detail: AppNavigationEventDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<AppNavigationEventDetail>(APP_NAVIGATION_EVENT, {
      detail,
    }),
  );
}

function navigateToCategoryPage(page: 'marketplace' | 'search', options: {
  category: string;
  subcategory?: string;
}) {
  const category = String(options.category || '').trim();
  const subcategory = String(options.subcategory || '').trim();
  if (!category && !subcategory) return;

  dispatchAppNavigation({
    page,
    category: category || subcategory,
    subcategory: subcategory || undefined,
  });
}

export function navigateToMarketplaceCategory(options: {
  category: string;
  subcategory?: string;
}) {
  navigateToCategoryPage('marketplace', options);
}

export function navigateToSearchCategory(options: {
  category: string;
  subcategory?: string;
}) {
  navigateToCategoryPage('search', options);
}

export function navigateToSearchResults(options: {
  query?: string;
  category?: string;
  subcategory?: string;
}) {
  const query = String(options.query || '').trim();
  const category = String(options.category || '').trim();
  const subcategory = String(options.subcategory || '').trim();
  if (!query && !category && !subcategory) return;

  dispatchAppNavigation({
    page: 'search',
    query: query || undefined,
    category: category || undefined,
    subcategory: subcategory || undefined,
  });
}