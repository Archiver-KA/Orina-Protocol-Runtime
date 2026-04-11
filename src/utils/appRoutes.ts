import type { CollectionSummary } from '@/types/collection';
import type { ProfileTab } from '@/types/profile';

type NavigationRequest = {
  category: string;
  subcategory?: string;
  requestKey: string;
};

export type ParsedAppRoute = {
  page: string;
  searchQuery: string;
  profileAddress: string | null;
  profileTab: ProfileTab | null;
  assetId: string | null;
  collectionId: string | null;
  collectionSlug: string | null;
  marketplaceNavigationRequest: NavigationRequest | null;
  searchNavigationRequest: NavigationRequest | null;
};

const ROUTE_PAGE_BY_SEGMENT = new Map<string, string>([
  ['overview', 'overview'],
  ['orders', 'orders'],
  ['marketplace', 'marketplace'],
  ['market-insights', 'market-insights'],
  ['minting', 'minting'],
  ['assets', 'assets'],
  ['messages', 'messages'],
  ['community', 'community'],
  ['history', 'history'],
  ['favorites', 'favorites'],
  ['settings', 'settings'],
  ['agent-settings', 'agent-settings'],
]);

function normalizeRoutePath(pathname: string) {
  return pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
}

function createNavigationRequestKey(prefix: string, value?: string) {
  return `${prefix}:${value || 'default'}:route`;
}

function slugify(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function encodeRouteSegment(value: string) {
  return encodeURIComponent(String(value || '').trim());
}

function decodeRouteSegment(value?: string | null) {
  if (!value) return '';

  try {
    return decodeURIComponent(String(value).trim());
  } catch {
    return String(value).trim();
  }
}

function buildCategoryRoutePath(
  page: 'marketplace' | 'search',
  category?: string | null,
  subcategory?: string | null,
) {
  const normalizedCategory = String(category || '').trim();
  const normalizedSubcategory = String(subcategory || '').trim();
  const primaryCategory = normalizedCategory || normalizedSubcategory;
  const secondarySubcategory =
    normalizedSubcategory && normalizedSubcategory !== primaryCategory
      ? normalizedSubcategory
      : '';

  if (!primaryCategory) {
    return `/${page}`;
  }

  const segments = [
    page,
    'category',
    encodeRouteSegment(primaryCategory),
    secondarySubcategory ? encodeRouteSegment(secondarySubcategory) : '',
  ].filter(Boolean);

  return `/${segments.join('/')}`;
}

export function buildCollectionRouteSegment(
  collection: Pick<CollectionSummary, 'id' | 'slug' | 'name'> | { id: string; slug?: string; name?: string }
) {
  const baseSlug = slugify(collection.slug || collection.name || '') || 'collection';
  return `${baseSlug}--${collection.id}`;
}

export function parseCollectionRouteSegment(segment: string) {
  const decoded = decodeURIComponent(String(segment || '').trim());
  const [maybeSlug, maybeId] = decoded.split(/--(?=[^-]+$)/);

  if (maybeId) {
    return {
      slug: maybeSlug || decoded,
      id: maybeId,
    };
  }

  return {
    slug: decoded || null,
    id: decoded || null,
  };
}

function buildQuery(params: Record<string, string | null | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    searchParams.set(key, normalized);
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export function buildAppHref(input: {
  page: string;
  searchQuery?: string;
  profileAddress?: string | null;
  profileTab?: ProfileTab | null;
  assetId?: string | null;
  collection?: Pick<CollectionSummary, 'id' | 'slug' | 'name'> | null;
  collectionId?: string | null;
  collectionSlug?: string | null;
  category?: string | null;
  subcategory?: string | null;
}) {
  const page = String(input.page || 'home').trim();

  switch (page) {
    case 'home':
      return '/';
    case 'marketplace': {
      const normalizedCategory = String(input.category || '').trim();
      const normalizedSubcategory = String(input.subcategory || '').trim();

      if (normalizedSubcategory && normalizedSubcategory !== normalizedCategory) {
        return `/marketplace${buildQuery({
          category: normalizedCategory || normalizedSubcategory,
          subcategory: normalizedSubcategory,
        })}`;
      }

      return buildCategoryRoutePath('marketplace', normalizedCategory, normalizedSubcategory);
    }
    case 'search':
      {
        const normalizedCategory = String(input.category || '').trim();
        const normalizedSubcategory = String(input.subcategory || '').trim();

        if (normalizedSubcategory && normalizedSubcategory !== normalizedCategory) {
          return `/search${buildQuery({
            q: input.searchQuery,
            category: normalizedCategory || normalizedSubcategory,
            subcategory: normalizedSubcategory,
          })}`;
        }

        return `${buildCategoryRoutePath('search', normalizedCategory, normalizedSubcategory)}${buildQuery({
          q: input.searchQuery,
        })}`;
      }
    case 'profile':
      return input.profileAddress
        ? `/profile/${encodeURIComponent(input.profileAddress)}${buildQuery({
            tab: input.profileTab && input.profileTab !== 'overview' ? input.profileTab : null,
          })}`
        : '/profile';
    case 'asset-details':
      return input.assetId ? `/asset/${encodeURIComponent(input.assetId)}` : '/asset';
    case 'collection-details': {
      const explicitSegment =
        input.collection
          ? buildCollectionRouteSegment(input.collection)
          : input.collectionId
            ? `${slugify(input.collectionSlug || '') || 'collection'}--${input.collectionId}`
            : input.collectionSlug || '';

      return explicitSegment ? `/collections/${encodeURIComponent(explicitSegment)}` : '/collections';
    }
    default:
      return `/${page}`;
  }
}

export function parseAppLocation(locationLike: Pick<Location, 'pathname' | 'search'>): ParsedAppRoute {
  const normalizedPath = normalizeRoutePath(locationLike.pathname);
  const searchParams = new URLSearchParams(locationLike.search || '');
  const segments = normalizedPath === '/' ? [] : normalizedPath.slice(1).split('/').filter(Boolean);

  const baseState: ParsedAppRoute = {
    page: 'home',
    searchQuery: '',
    profileAddress: null,
    profileTab: null,
    assetId: null,
    collectionId: null,
    collectionSlug: null,
    marketplaceNavigationRequest: null,
    searchNavigationRequest: null,
  };

  if (segments.length === 0) {
    return baseState;
  }

  const segment = segments[0];
  const value = segments[1];

  if (segment === 'profile') {
    return {
      ...baseState,
      page: 'profile',
      profileAddress: value ? decodeURIComponent(value) : null,
      profileTab: (searchParams.get('tab') as ProfileTab | null) || null,
    };
  }

  if (segment === 'asset') {
    return {
      ...baseState,
      page: 'asset-details',
      assetId: value ? decodeURIComponent(value) : null,
    };
  }

  if (segment === 'collections') {
    const parsed = parseCollectionRouteSegment(value || '');
    return {
      ...baseState,
      page: 'collection-details',
      collectionId: parsed.id,
      collectionSlug: parsed.slug,
    };
  }

  if (segment === 'marketplace') {
    const categoryFromPath = segments[1] === 'category' ? decodeRouteSegment(segments[2]) : '';
    const subcategoryFromPath = segments[1] === 'category' ? decodeRouteSegment(segments[3]) : '';
    const category = categoryFromPath || searchParams.get('category') || '';
    const subcategory = subcategoryFromPath || searchParams.get('subcategory') || '';

    return {
      ...baseState,
      page: 'marketplace',
      marketplaceNavigationRequest: category || subcategory
        ? {
            category: category || subcategory,
            subcategory: subcategory || undefined,
            requestKey: createNavigationRequestKey('marketplace', category || subcategory),
          }
        : null,
    };
  }

  if (segment === 'search') {
    const searchQuery = searchParams.get('q') || '';
    const categoryFromPath = segments[1] === 'category' ? decodeRouteSegment(segments[2]) : '';
    const subcategoryFromPath = segments[1] === 'category' ? decodeRouteSegment(segments[3]) : '';
    const category = categoryFromPath || searchParams.get('category') || '';
    const subcategory = subcategoryFromPath || searchParams.get('subcategory') || '';

    return {
      ...baseState,
      page: 'search',
      searchQuery,
      searchNavigationRequest: category || subcategory
        ? {
            category: category || subcategory,
            subcategory: subcategory || undefined,
            requestKey: createNavigationRequestKey('search', category || subcategory || searchQuery),
          }
        : null,
    };
  }

  return {
    ...baseState,
    page: ROUTE_PAGE_BY_SEGMENT.get(segment) || 'home',
  };
}
