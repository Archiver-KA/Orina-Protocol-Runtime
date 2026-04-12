import { useEffect } from 'react';
import { loadCollectionDetailsById } from '@/utils/collectionsUtils';
import { getMarketplaceCatalogAssetById, loadMarketplaceCatalogSync } from '@/utils/marketplaceCatalog';
import { loadUserProfile } from '@/utils/profileUtils';
import { normalizeTaxonomySelection } from '@/utils/taxonomy';

type AppSeoProps = {
  activePage: string;
  searchQuery?: string;
  selectedAssetId?: string | null;
  selectedProfileAddress?: string | null;
  selectedCollectionId?: string | null;
};

const SITE_NAME = 'Orina Protocol';
const DEFAULT_SITE_URL = 'https://app.orina.io';
const DEFAULT_OG_IMAGE = '/orina-social-card.svg';
const DEFAULT_DESCRIPTION =
  'Discover Orina Protocol, the agent-to-agent marketplace for RWAs and NFTs with wallet-native access, live marketplace search, seller profiles, collections, and order workflows.';

function resolveSiteUrl() {
  const configured =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL
      ? String(import.meta.env.VITE_SITE_URL)
      : DEFAULT_SITE_URL;

  return configured.replace(/\/+$/, '');
}

function resolveAbsoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${resolveSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return;

  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  if (typeof document === 'undefined') return;

  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function upsertStructuredData(id: string, payload: Record<string, unknown>) {
  if (typeof document === 'undefined') return;

  let element = document.head.querySelector<HTMLScriptElement>(`script[data-seo-id="${id}"]`);
  if (!element) {
    element = document.createElement('script');
    element.type = 'application/ld+json';
    element.setAttribute('data-seo-id', id);
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(payload);
}

function shortenAddress(value?: string | null) {
  if (!value || value.length < 10) return '';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function decodeRouteSegment(value?: string | null) {
  if (!value) return '';

  try {
    return decodeURIComponent(String(value).trim());
  } catch {
    return String(value).trim();
  }
}

function readRouteTaxonomyContext(activePage: string) {
  if (typeof window === 'undefined') return null;
  if (activePage !== 'marketplace' && activePage !== 'search') return null;

  const searchParams = new URLSearchParams(window.location.search || '');
  const segments = String(window.location.pathname || '/')
    .replace(/\/+$/, '')
    .split('/')
    .filter(Boolean);

  const categoryFromPath = segments[0] === activePage && segments[1] === 'category'
    ? decodeRouteSegment(segments[2])
    : '';
  const subcategoryFromPath = segments[0] === activePage && segments[1] === 'category'
    ? decodeRouteSegment(segments[3])
    : '';
  const rawCategory = categoryFromPath || String(searchParams.get('category') || '').trim();
  const rawSubcategory = subcategoryFromPath || String(searchParams.get('subcategory') || '').trim();

  if (!rawCategory && !rawSubcategory) return null;

  return normalizeTaxonomySelection(rawCategory || rawSubcategory, rawSubcategory || undefined);
}

function buildSeoCopy({
  activePage,
  searchQuery,
  selectedAssetId,
  selectedProfileAddress,
  selectedCollectionId,
}: AppSeoProps) {
  const query = String(searchQuery || '').trim();
  const profile = selectedProfileAddress ? loadUserProfile(selectedProfileAddress) : null;
  const asset = selectedAssetId ? getMarketplaceCatalogAssetById(selectedAssetId, loadMarketplaceCatalogSync()) : null;
  const collection = selectedCollectionId ? loadCollectionDetailsById(selectedCollectionId) : null;
  const taxonomyContext = readRouteTaxonomyContext(activePage);
  const shortProfile = shortenAddress(selectedProfileAddress);
  const shortAsset = shortenAddress(selectedAssetId);
  const profileLabel = String(profile?.displayName || '').trim() || shortProfile;
  const assetLabel = String(asset?.name || '').trim() || shortAsset;
  const collectionLabel = String(collection?.name || '').trim();
  const categoryTrail = taxonomyContext
    ? [taxonomyContext.categoryLabel, taxonomyContext.subcategoryLabel].filter(Boolean).join(' / ')
    : '';

  switch (activePage) {
    case 'home':
      return {
        title: `${SITE_NAME} | Agent-to-Agent Marketplace for RWA and NFTs`,
        description:
          'Discover Orina Protocol, the agent-to-agent marketplace for RWAs and NFTs with wallet-native access, AI-assisted discovery, and on-chain marketplace flows.',
      };
    case 'overview':
      return {
        title: `Dashboard | ${SITE_NAME}`,
        description:
          'Monitor marketplace activity, wallet-connected workflows, and live protocol surfaces inside the Orina Protocol dashboard.',
      };
    case 'marketplace':
      return {
        title: categoryTrail
          ? `${categoryTrail} Marketplace | ${SITE_NAME}`
          : `Marketplace | ${SITE_NAME}`,
        description: categoryTrail
          ? `Browse ${categoryTrail} listings, seller profiles, and curated collections in the public Orina Protocol marketplace.`
          : 'Explore verified RWA and NFT listings, seller profiles, and curated collections in the live Orina Protocol marketplace.',
      };
    case 'market-insights':
      return {
        title: `Market Insights | ${SITE_NAME}`,
        description:
          'Track market activity, protocol analytics, and order movement across Orina Protocol.',
      };
    case 'orders':
      return {
        title: `Orders | ${SITE_NAME}`,
        description:
          'Track payment, delivery, settlement, and dispute states across Orina Protocol order workflows.',
      };
    case 'assets':
      return {
        title: `Assets | ${SITE_NAME}`,
        description:
          'Manage owned RWA and NFT assets, listings, collections, and inventory across Orina Protocol.',
      };
    case 'community':
      return {
        title: `Community | ${SITE_NAME}`,
        description:
          'Follow marketplace conversations, updates, and community activity across Orina Protocol.',
      };
    case 'messages':
      return {
        title: `Messages | ${SITE_NAME}`,
        description:
          'Coordinate conversations and buyer-seller communication inside Orina Protocol.',
      };
    case 'history':
      return {
        title: `History | ${SITE_NAME}`,
        description:
          'Review protocol activity and historical marketplace events inside Orina Protocol.',
      };
    case 'profile':
      return {
        title: profileLabel ? `${profileLabel} | ${SITE_NAME}` : `Profile | ${SITE_NAME}`,
        description:
          'View seller reputation, active listings, collections, and marketplace performance on Orina Protocol.',
      };
    case 'search':
      return {
        title: query
          ? categoryTrail
            ? `Search ${categoryTrail} for "${query}" | ${SITE_NAME}`
            : `Search "${query}" | ${SITE_NAME}`
          : categoryTrail
            ? `${categoryTrail} Search | ${SITE_NAME}`
            : `Search | ${SITE_NAME}`,
        description: query
          ? categoryTrail
            ? `Search ${categoryTrail} assets, collections, and seller profiles for "${query}" across Orina Protocol.`
            : `Search Orina Protocol assets, collections, and seller profiles for "${query}" across the live marketplace catalog.`
          : categoryTrail
            ? `Search ${categoryTrail} assets, collections, and seller profiles across the public Orina Protocol marketplace.`
            : 'Search Orina Protocol assets, collections, and seller profiles across the live marketplace catalog.',
      };
    case 'favorites':
      return {
        title: `Favorites | ${SITE_NAME}`,
        description:
          'Review saved assets, followed profiles, and tracked collections inside Orina Protocol.',
      };
    case 'settings':
      return {
        title: `Settings | ${SITE_NAME}`,
        description:
          'Configure wallet, profile, delivery, and application preferences for Orina Protocol.',
      };
    case 'agent-settings':
      return {
        title: `AI Agent Settings | ${SITE_NAME}`,
        description:
          'Configure AI agents, runtime tools, and automation surfaces for Orina Protocol.',
      };
    case 'asset-details':
      return {
        title: assetLabel ? `${assetLabel} | ${SITE_NAME}` : `Asset Details | ${SITE_NAME}`,
        description:
          'Review asset metadata, seller information, pricing, and marketplace context on Orina Protocol.',
      };
    case 'collection-details':
      return {
        title: collectionLabel ? `${collectionLabel} | ${SITE_NAME}` : `Collection | ${SITE_NAME}`,
        description:
          'Review curated collection assets, collection stats, and curator context on Orina Protocol.',
      };
    default:
      return {
        title: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
      };
  }
}

export function AppSeo(props: AppSeoProps) {
  useEffect(() => {
    const { title, description } = buildSeoCopy(props);
    const siteUrl = resolveSiteUrl();
    const taxonomyContext = readRouteTaxonomyContext(props.activePage);
    const categoryTrail = taxonomyContext
      ? [taxonomyContext.categoryLabel, taxonomyContext.subcategoryLabel].filter(Boolean).join(' / ')
      : '';
    const currentPath =
      typeof window !== 'undefined'
        ? `${window.location.pathname || '/'}${window.location.search || ''}`
        : '/';
    const canonicalUrl = `${siteUrl}${currentPath}`;
    const ogImage = resolveAbsoluteUrl(DEFAULT_OG_IMAGE);

    document.title = title;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'application-name', SITE_NAME);
    upsertMeta('name', 'theme-color', '#0a0a0a');
    upsertMeta(
      'name',
      'robots',
      'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
    );
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:image:alt', 'Orina Protocol brand artwork');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', ogImage);

    upsertLink('canonical', canonicalUrl);
    upsertLink('icon', '/favicon.svg');
    upsertLink('shortcut icon', '/favicon.svg');
    upsertLink('apple-touch-icon', '/favicon.svg');
    upsertLink('manifest', '/site.webmanifest');

    const graph: Array<Record<string, unknown>> = [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: `${siteUrl}/`,
        logo: {
          '@type': 'ImageObject',
          url: resolveAbsoluteUrl('/favicon.svg'),
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        publisher: {
          '@id': `${siteUrl}/#organization`,
        },
        inLanguage: 'en',
      },
    ];

    if (props.activePage === 'marketplace') {
      graph.push({
        '@type': 'CollectionPage',
        name: categoryTrail ? `${categoryTrail} Marketplace | ${SITE_NAME}` : `Marketplace | ${SITE_NAME}`,
        url: canonicalUrl,
        description,
      });
    }

    if (props.activePage === 'search') {
      graph.push({
        '@type': 'SearchResultsPage',
        name: categoryTrail ? `${categoryTrail} Search | ${SITE_NAME}` : `Search | ${SITE_NAME}`,
        url: canonicalUrl,
        description,
      });
    }

    upsertStructuredData('orina-protocol-website', {
      '@context': 'https://schema.org',
      '@graph': graph,
    });
  }, [
    props.activePage,
    props.searchQuery,
    props.selectedAssetId,
    props.selectedProfileAddress,
    props.selectedCollectionId,
  ]);

  return null;
}
