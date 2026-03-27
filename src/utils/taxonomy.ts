import taxonomySeed from '../../data/taxonomy/orina_ai_taxonomy_v1.json';
import { readLocalUserAppSettings } from '@/utils/userSettingsUtils';

type LocaleStringMap = Record<string, string>;
type LocaleAliasMap = Record<string, string[]>;

type TaxonomyNode = {
  slug: string;
  parentSlug: string | null;
  nodeType: 'asset_class' | 'category' | 'subcategory';
  assetClassSlug: string;
  marketBucket: string;
  sortOrder: number;
  isActive: boolean;
  supportsCurrentProtocol: boolean;
  labels?: LocaleStringMap;
  aliases?: LocaleAliasMap;
  metadata?: Record<string, unknown>;
};

type TaxonomySeed = {
  defaultLocale?: string;
  fallbackLocale?: string;
  supportedLocales?: string[];
  nodes?: TaxonomyNode[];
};

type NodeIndex = {
  bySlug: Map<string, TaxonomyNode>;
  categoryTerms: Map<string, TaxonomyNode[]>;
  subcategoryTerms: Map<string, TaxonomyNode[]>;
};

export type TaxonomyCategoryOption = {
  value: string;
  label: string;
};

export type NormalizedTaxonomySelection = {
  rawCategory: string;
  rawSubcategory?: string;
  categorySlug: string;
  categoryLabel: string;
  subcategorySlug?: string;
  subcategoryLabel?: string;
  matchedBy: 'category' | 'subcategory_promoted' | 'legacy_redirect' | 'raw_fallback';
};

const seed = taxonomySeed as TaxonomySeed;
const nodes = Array.isArray(seed.nodes) ? seed.nodes : [];
const defaultLocale = seed.defaultLocale || 'en';
const fallbackLocale = seed.fallbackLocale || defaultLocale;
const supportedLocales = Array.isArray(seed.supportedLocales) ? seed.supportedLocales : [defaultLocale];

const LEGACY_NODE_REDIRECTS: Record<string, string> = {
  'real world asset': 'physical_goods',
  'real world assets': 'physical_goods',
  rwa: 'physical_goods',
  goods: 'physical_goods',
  'digital art': 'digital_assets',
  'digital arts': 'digital_assets',
  'digital asset': 'digital_assets',
  'digital assets': 'digital_assets',
  nft: 'digital_assets',
  nfts: 'digital_assets',
  'real estate': 'real_estate',
  property: 'real_estate',
  collectibles: 'luxury_collectibles',
  collectible: 'luxury_collectibles',
  luxury: 'luxury_collectibles',
  'luxury watch': 'watches',
  'luxury watches': 'watches',
};

const TAXONOMY_INDEX = buildNodeIndex(nodes);

export function getTaxonomyCategoryOptions(preferredLocale?: string): TaxonomyCategoryOption[] {
  const locale = resolvePreferredLocale(preferredLocale);
  return nodes
    .filter((node) => node.nodeType === 'category' && node.isActive && node.supportsCurrentProtocol)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((node) => ({
      value: node.slug,
      label: getNodeLabel(node, locale),
    }));
}

export function getCategoryOptionsFromValues(
  values: Array<string | null | undefined>,
  preferredLocale?: string
): TaxonomyCategoryOption[] {
  const locale = resolvePreferredLocale(preferredLocale);
  const options = new Map<string, TaxonomyCategoryOption>();

  values.forEach((value) => {
    const normalized = normalizeTaxonomySelection(value || '', undefined, locale);
    if (!normalized.categorySlug) return;
    options.set(normalized.categorySlug, {
      value: normalized.categorySlug,
      label: normalized.categoryLabel,
    });
  });

  return Array.from(options.values()).sort((left, right) => {
    const leftNode = TAXONOMY_INDEX.bySlug.get(left.value);
    const rightNode = TAXONOMY_INDEX.bySlug.get(right.value);
    const leftSort = leftNode?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightSort = rightNode?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftSort !== rightSort) return leftSort - rightSort;
    return left.label.localeCompare(right.label);
  });
}

export function normalizeCategoryFilterValue(
  category: string | null | undefined,
  subcategory?: string | null,
  preferredLocale?: string
): string {
  return normalizeTaxonomySelection(category || '', subcategory, preferredLocale).categorySlug;
}

export function normalizeCategoryFilterValues(
  categories: Array<string | null | undefined>,
  preferredLocale?: string
): string[] {
  return Array.from(
    new Set(
      categories
        .map((category) => normalizeCategoryFilterValue(category, undefined, preferredLocale))
        .filter(Boolean)
    )
  );
}

export function getCategoryDisplayLabel(
  category: string | null | undefined,
  subcategory?: string | null,
  preferredLocale?: string
): string {
  return normalizeTaxonomySelection(category || '', subcategory, preferredLocale).categoryLabel;
}

export function getSubcategoryDisplayLabel(
  category: string | null | undefined,
  subcategory?: string | null,
  preferredLocale?: string
): string | undefined {
  return normalizeTaxonomySelection(category || '', subcategory, preferredLocale).subcategoryLabel;
}

export function getTaxonomySearchText(
  category: string | null | undefined,
  subcategory?: string | null,
  preferredLocale?: string
): string {
  const locale = resolvePreferredLocale(preferredLocale);
  const normalized = normalizeTaxonomySelection(category || '', subcategory, locale);
  const categoryNode = TAXONOMY_INDEX.bySlug.get(normalized.categorySlug);
  const subcategoryNode = normalized.subcategorySlug
    ? TAXONOMY_INDEX.bySlug.get(normalized.subcategorySlug)
    : undefined;

  const terms = new Set<string>([
    normalized.rawCategory,
    normalized.rawSubcategory || '',
    normalized.categorySlug,
    normalized.categorySlug.replace(/_/g, ' '),
    normalized.categoryLabel,
    normalized.subcategorySlug || '',
    normalized.subcategorySlug?.replace(/_/g, ' ') || '',
    normalized.subcategoryLabel || '',
    ...collectLookupTerms(categoryNode),
    ...collectLookupTerms(subcategoryNode),
  ]);

  return Array.from(terms).filter(Boolean).join(' ');
}

export function normalizeTaxonomySelection(
  category: string,
  subcategory?: string | null,
  preferredLocale?: string
): NormalizedTaxonomySelection {
  const locale = resolvePreferredLocale(preferredLocale);
  const rawCategory = cleanInput(category);
  const rawSubcategory = cleanInput(subcategory);

  const categoryMatch = findNode(rawCategory, 'category');
  const subcategoryMatch = findNode(rawSubcategory, 'subcategory', categoryMatch?.slug);
  const promotedSubcategory = !subcategoryMatch ? findNode(rawCategory, 'subcategory') : undefined;

  const redirectedCategory = !categoryMatch && !promotedSubcategory
    ? findLegacyRedirectNode(rawCategory, 'category')
    : undefined;
  const redirectedSubcategory = !subcategoryMatch && !promotedSubcategory
    ? findLegacyRedirectNode(rawCategory, 'subcategory')
    : undefined;

  const resolvedSubcategory = subcategoryMatch ?? promotedSubcategory ?? redirectedSubcategory;
  const resolvedCategory = categoryMatch
    ?? redirectedCategory
    ?? (resolvedSubcategory ? TAXONOMY_INDEX.bySlug.get(resolvedSubcategory.parentSlug || '') : undefined)
    ?? findLegacyRedirectNode(rawCategory, 'asset_class');

  const matchedBy: NormalizedTaxonomySelection['matchedBy'] = !resolvedCategory
    ? 'raw_fallback'
    : redirectedCategory || redirectedSubcategory
    ? 'legacy_redirect'
    : promotedSubcategory && !categoryMatch
    ? 'subcategory_promoted'
    : 'category';

  const categorySlug = resolvedCategory?.slug || slugifyFallback(rawCategory);
  const categoryLabel = resolvedCategory
    ? getNodeLabel(resolvedCategory, locale)
    : humanizeCategoryValue(rawCategory || categorySlug);
  const subcategorySlug = resolvedSubcategory?.slug;
  const subcategoryLabel = resolvedSubcategory
    ? getNodeLabel(resolvedSubcategory, locale)
    : undefined;

  return {
    rawCategory,
    rawSubcategory: rawSubcategory || undefined,
    categorySlug,
    categoryLabel,
    subcategorySlug,
    subcategoryLabel,
    matchedBy,
  };
}

export function normalizeTaxonomySearchKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s&-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildNodeIndex(allNodes: TaxonomyNode[]): NodeIndex {
  const bySlug = new Map<string, TaxonomyNode>();
  const categoryTerms = new Map<string, TaxonomyNode[]>();
  const subcategoryTerms = new Map<string, TaxonomyNode[]>();

  allNodes.forEach((node) => {
    bySlug.set(node.slug, node);
  });

  allNodes
    .filter((node) => node.nodeType === 'category')
    .forEach((node) => {
      collectLookupTerms(node).forEach((term) => addIndexedNode(categoryTerms, term, node));
    });

  allNodes
    .filter((node) => node.nodeType === 'subcategory')
    .forEach((node) => {
      collectLookupTerms(node).forEach((term) => addIndexedNode(subcategoryTerms, term, node));
    });

  return {
    bySlug,
    categoryTerms,
    subcategoryTerms,
  };
}

function findNode(
  input: string,
  nodeType: 'category' | 'subcategory',
  parentSlug?: string
): TaxonomyNode | undefined {
  const lookupKey = normalizeTaxonomySearchKey(input);
  if (!lookupKey) return undefined;

  const index = nodeType === 'category'
    ? TAXONOMY_INDEX.categoryTerms
    : TAXONOMY_INDEX.subcategoryTerms;

  const matches = (index.get(lookupKey) || [])
    .filter((node) => !parentSlug || node.parentSlug === parentSlug)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return matches[0];
}

function findLegacyRedirectNode(
  input: string,
  nodeType: 'asset_class' | 'category' | 'subcategory'
): TaxonomyNode | undefined {
  const redirectSlug = LEGACY_NODE_REDIRECTS[normalizeTaxonomySearchKey(input)];
  if (!redirectSlug) return undefined;

  const node = TAXONOMY_INDEX.bySlug.get(redirectSlug);
  return node?.nodeType === nodeType ? node : undefined;
}

function collectLookupTerms(node?: TaxonomyNode): string[] {
  if (!node) return [];

  const labelValues = Object.values(node.labels || {});
  const aliasValues = Object.values(node.aliases || {}).flat();
  const metadataCategoryAliases = Array.isArray(node.metadata?.legacyCategoryAliases)
    ? (node.metadata.legacyCategoryAliases as string[])
    : [];
  const metadataSubcategoryAliases = Array.isArray(node.metadata?.legacySubcategoryAliases)
    ? (node.metadata.legacySubcategoryAliases as string[])
    : [];

  return [
    node.slug,
    node.slug.replace(/_/g, ' '),
    ...labelValues,
    ...aliasValues,
    ...metadataCategoryAliases,
    ...metadataSubcategoryAliases,
  ]
    .flatMap((value) => toLookupVariants(value))
    .filter(Boolean);
}

function toLookupVariants(value: string): string[] {
  const cleaned = cleanInput(value);
  if (!cleaned) return [];

  const normalized = normalizeTaxonomySearchKey(cleaned);
  const variants = new Set<string>([normalized]);

  if (cleaned.includes('&')) {
    variants.add(normalizeTaxonomySearchKey(cleaned.replace(/&/g, 'and')));
  }

  return Array.from(variants).filter(Boolean);
}

function addIndexedNode(index: Map<string, TaxonomyNode[]>, key: string, node: TaxonomyNode) {
  if (!key) return;
  const bucket = index.get(key) || [];
  bucket.push(node);
  index.set(key, bucket);
}

function resolvePreferredLocale(preferredLocale?: string): string {
  const explicit = toSupportedLocale(preferredLocale);
  if (explicit) return explicit;

  if (typeof window !== 'undefined') {
    const appLocale = toSupportedLocale(readLocalUserAppSettings().language);
    if (appLocale) return appLocale;

    const documentLocale = toSupportedLocale(document.documentElement.lang);
    if (documentLocale) return documentLocale;

    for (const locale of navigator.languages || []) {
      const supported = toSupportedLocale(locale);
      if (supported) return supported;
    }

    const browserLocale = toSupportedLocale(navigator.language);
    if (browserLocale) return browserLocale;
  }

  return defaultLocale;
}

function toSupportedLocale(value?: string | null): string | null {
  const normalized = cleanInput(value);
  if (!normalized) return null;

  const direct = supportedLocales.find((locale) => locale.toLowerCase() === normalized.toLowerCase());
  if (direct) return direct;

  const baseLocale = normalized.toLowerCase().split('-')[0];
  const baseMatch = supportedLocales.find((locale) => locale.toLowerCase() === baseLocale);
  if (baseMatch) return baseMatch;

  const prefixMatch = supportedLocales.find((locale) => locale.toLowerCase().startsWith(`${baseLocale}-`));
  if (prefixMatch) return prefixMatch;

  return null;
}

function getNodeLabel(node: TaxonomyNode, locale: string): string {
  return (
    node.labels?.[locale] ||
    node.labels?.[locale.split('-')[0]] ||
    node.labels?.[fallbackLocale] ||
    node.labels?.[defaultLocale] ||
    humanizeCategoryValue(node.slug)
  );
}

function humanizeCategoryValue(value: string): string {
  const normalized = cleanInput(value);
  if (!normalized) return 'Uncategorized';
  if (/\s/.test(normalized) && /[A-Z]/.test(normalized)) return normalized;

  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function cleanInput(value?: string | null): string {
  return String(value || '').trim();
}

function slugifyFallback(value: string): string {
  const normalized = normalizeTaxonomySearchKey(value)
    .replace(/&/g, ' and ')
    .replace(/\s+/g, '_');

  return normalized || 'uncategorized';
}
