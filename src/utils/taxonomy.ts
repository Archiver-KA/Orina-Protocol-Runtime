import { readLocalUserAppSettings } from '@/utils/userSettingsUtils';
import {
  dispatchSyncEvent,
  isSupabaseRestEnabled,
  restSelect,
  toQuery,
} from '@/utils/supabaseRest';
import taxonomySeed from '../../data/taxonomy/orina_ai_taxonomy_v1.json';

type LocaleStringMap = Record<string, string>;
type LocaleAliasMap = Record<string, string[]>;

export type TaxonomyNode = {
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

type TaxonomyNodeRow = {
  slug: string | null;
  parent_slug: string | null;
  node_type: string | null;
  asset_class_slug: string | null;
  market_bucket: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  supports_current_protocol: boolean | null;
  labels: Record<string, unknown> | null;
  aliases: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

type TaxonomyStoredNode = {
  slug?: string | null;
  parentSlug?: string | null;
  parent_slug?: string | null;
  nodeType?: string | null;
  node_type?: string | null;
  assetClassSlug?: string | null;
  asset_class_slug?: string | null;
  marketBucket?: string | null;
  market_bucket?: string | null;
  sortOrder?: number | null;
  sort_order?: number | null;
  isActive?: boolean | null;
  is_active?: boolean | null;
  supportsCurrentProtocol?: boolean | null;
  supports_current_protocol?: boolean | null;
  labels?: Record<string, unknown> | null;
  aliases?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

type NodeIndex = {
  bySlug: Map<string, TaxonomyNode>;
  assetClassTerms: Map<string, TaxonomyNode[]>;
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
  matchedBy: 'asset_class' | 'category' | 'subcategory_promoted' | 'legacy_redirect' | 'raw_fallback';
};

const DEFAULT_LOCALE = 'en';
const FALLBACK_LOCALE = DEFAULT_LOCALE;
const TAXONOMY_CACHE_KEY = 'orina_taxonomy_nodes_cache_v1';
const TAXONOMY_HYDRATE_TTL_MS = 5 * 60_000;

export const TAXONOMY_SYNC_EVENT = 'orina:taxonomy-changed';

const LEGACY_NODE_REDIRECTS: Record<string, string> = {
  'real world asset': 'physical_goods',
  'real world assets': 'physical_goods',
  rwa: 'physical_goods',
  goods: 'physical_goods',
  'digital art': 'digital_assets',
  'digital arts': 'digital_assets',
  'digital asset': 'digital_assets',
  'digital assets': 'digital_assets',
  'digital license': 'digital_license',
  'digital licenses': 'digital_license',
  'digital media': 'digital_media',
  nft: 'digital_assets',
  nfts: 'digital_assets',
  'real estate': 'real_estate',
  property: 'real_estate',
  service: 'service_rights',
  services: 'service_rights',
  'service right': 'service_rights',
  'service rights': 'service_rights',
  'agent service': 'agent_services',
  'agent services': 'agent_services',
  'ai agent': 'agent_services',
  'ai agents': 'agent_services',
  automation: 'agent_services',
  'automation service': 'agent_services',
  collectibles: 'luxury_collectibles',
  collectible: 'luxury_collectibles',
  luxury: 'luxury_collectibles',
  'luxury watch': 'watches',
  'luxury watches': 'watches',
};

let cachedNodes = loadTaxonomyCacheFromStorage();
if (cachedNodes.length === 0) {
  cachedNodes = loadDefaultTaxonomyNodes();
}
let taxonomyIndex = buildNodeIndex(cachedNodes);
let supportedLocales = deriveSupportedLocales(cachedNodes);
let hydratePromise: Promise<TaxonomyNode[]> | null = null;
let lastHydratedAt = cachedNodes.length > 0 ? Date.now() : 0;
let storageBridgeAttached = false;

export function loadTaxonomyNodesSync(): TaxonomyNode[] {
  scheduleTaxonomyHydrate();
  return cachedNodes;
}

export async function hydrateTaxonomyFromSupabase(force = false): Promise<TaxonomyNode[]> {
  ensureTaxonomyStorageBridge();

  if (!isBrowser() || !isSupabaseRestEnabled()) {
    return cachedNodes;
  }

  if (!force && hydratePromise) {
    return hydratePromise;
  }

  if (!force && lastHydratedAt > 0 && Date.now() - lastHydratedAt < TAXONOMY_HYDRATE_TTL_MS) {
    return cachedNodes;
  }

  hydratePromise = (async () => {
    try {
      const rows = await restSelect<TaxonomyNodeRow>(
        'taxonomy_nodes',
        toQuery({
          select:
            'slug,parent_slug,node_type,asset_class_slug,market_bucket,sort_order,is_active,supports_current_protocol,labels,aliases,metadata',
          order: 'sort_order.asc',
        })
      );

      const nextNodes = rows
        .map(mapRemoteRowToTaxonomyNode)
        .filter((node): node is TaxonomyNode => Boolean(node));

      if (nextNodes.length > 0) {
        replaceCachedNodes(nextNodes);
      }
      return cachedNodes;
    } catch (error) {
      console.debug('[Taxonomy] Remote hydrate skipped:', error);
      lastHydratedAt = Date.now();
      return cachedNodes;
    } finally {
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

export function getTaxonomyCategoryOptions(preferredLocale?: string): TaxonomyCategoryOption[] {
  scheduleTaxonomyHydrate();
  const locale = resolvePreferredLocale(preferredLocale);
  return cachedNodes
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
  scheduleTaxonomyHydrate();
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
    const leftNode = taxonomyIndex.bySlug.get(left.value);
    const rightNode = taxonomyIndex.bySlug.get(right.value);
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
  scheduleTaxonomyHydrate();
  const locale = resolvePreferredLocale(preferredLocale);
  const normalized = normalizeTaxonomySelection(category || '', subcategory, locale);
  const categoryNode = taxonomyIndex.bySlug.get(normalized.categorySlug);
  const subcategoryNode = normalized.subcategorySlug
    ? taxonomyIndex.bySlug.get(normalized.subcategorySlug)
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
  scheduleTaxonomyHydrate();
  const locale = resolvePreferredLocale(preferredLocale);
  const rawCategory = cleanInput(category);
  const rawSubcategory = cleanInput(subcategory);

  const assetClassMatch = findNode(rawCategory, 'asset_class');
  const categoryMatch = findNode(rawCategory, 'category');
  const subcategoryMatch = findNode(rawSubcategory, 'subcategory', categoryMatch?.slug ?? assetClassMatch?.slug);
  const promotedSubcategory = !subcategoryMatch ? findNode(rawCategory, 'subcategory') : undefined;

  const redirectedCategory = !categoryMatch && !promotedSubcategory
    ? findLegacyRedirectNode(rawCategory, 'category')
    : undefined;
  const redirectedSubcategory = !subcategoryMatch && !promotedSubcategory
    ? findLegacyRedirectNode(rawCategory, 'subcategory')
    : undefined;

  const resolvedSubcategory = subcategoryMatch ?? promotedSubcategory ?? redirectedSubcategory;
  const resolvedCategory = categoryMatch
    ?? assetClassMatch
    ?? redirectedCategory
    ?? (resolvedSubcategory ? taxonomyIndex.bySlug.get(resolvedSubcategory.parentSlug || '') : undefined)
    ?? findLegacyRedirectNode(rawCategory, 'asset_class');

  const matchedBy: NormalizedTaxonomySelection['matchedBy'] = !resolvedCategory
    ? 'raw_fallback'
    : redirectedCategory || redirectedSubcategory
    ? 'legacy_redirect'
    : resolvedCategory.nodeType === 'asset_class'
    ? 'asset_class'
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

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeLocaleStringMap(value: unknown): LocaleStringMap {
  return Object.fromEntries(
    Object.entries(safeObject(value))
      .map(([key, entry]) => [key, String(entry || '').trim()])
      .filter(([, entry]) => Boolean(entry))
  );
}

function safeLocaleAliasMap(value: unknown): LocaleAliasMap {
  return Object.fromEntries(
    Object.entries(safeObject(value))
      .map(([key, entry]) => [
        key,
        Array.isArray(entry)
          ? entry.map((item) => String(item || '').trim()).filter(Boolean)
          : [],
      ])
      .filter(([, entry]) => entry.length > 0)
  );
}

function normalizeNodeType(value: unknown): TaxonomyNode['nodeType'] | null {
  const normalized = String(value || '').trim();
  if (normalized === 'asset_class' || normalized === 'category' || normalized === 'subcategory') {
    return normalized;
  }
  return null;
}

function mapRemoteRowToTaxonomyNode(row: TaxonomyNodeRow): TaxonomyNode | null {
  return mapUnknownToTaxonomyNode(row);
}

function mapUnknownToTaxonomyNode(value: TaxonomyStoredNode): TaxonomyNode | null {
  const slug = String(value.slug || '').trim();
  const nodeType = normalizeNodeType(value.node_type ?? value.nodeType);
  if (!slug || !nodeType) return null;

  return {
    slug,
    parentSlug: cleanInput(value.parent_slug ?? value.parentSlug) || null,
    nodeType,
    assetClassSlug: String(value.asset_class_slug ?? value.assetClassSlug ?? '').trim(),
    marketBucket: String(value.market_bucket ?? value.marketBucket ?? '').trim(),
    sortOrder: Number.isFinite(Number(value.sort_order ?? value.sortOrder))
      ? Number(value.sort_order ?? value.sortOrder)
      : 0,
    isActive: (value.is_active ?? value.isActive) !== false,
    supportsCurrentProtocol: (value.supports_current_protocol ?? value.supportsCurrentProtocol) === true,
    labels: safeLocaleStringMap(value.labels),
    aliases: safeLocaleAliasMap(value.aliases),
    metadata: safeObject(value.metadata),
  };
}

function loadTaxonomyCacheFromStorage(): TaxonomyNode[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(TAXONOMY_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => mapUnknownToTaxonomyNode(entry as TaxonomyStoredNode))
      .filter((node): node is TaxonomyNode => Boolean(node));
  } catch {
    return [];
  }
}

function saveTaxonomyCacheToStorage(nodes: TaxonomyNode[]): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(TAXONOMY_CACHE_KEY, JSON.stringify(nodes));
  } catch {
    // best-effort cache only
  }
}

function deriveSupportedLocales(allNodes: TaxonomyNode[]): string[] {
  const locales = new Set<string>([DEFAULT_LOCALE]);
  allNodes.forEach((node) => {
    Object.keys(node.labels || {}).forEach((locale) => {
      if (locale.trim()) locales.add(locale);
    });
  });
  return Array.from(locales);
}

function replaceCachedNodes(nextNodes: TaxonomyNode[]): void {
  cachedNodes = [...nextNodes].sort((left, right) => left.sortOrder - right.sortOrder);
  taxonomyIndex = buildNodeIndex(cachedNodes);
  supportedLocales = deriveSupportedLocales(cachedNodes);
  lastHydratedAt = Date.now();
  saveTaxonomyCacheToStorage(cachedNodes);
  dispatchSyncEvent(TAXONOMY_SYNC_EVENT);
}

function ensureTaxonomyStorageBridge(): void {
  if (!isBrowser() || storageBridgeAttached) return;

  window.addEventListener('storage', (event) => {
    if (event.key !== TAXONOMY_CACHE_KEY) return;
    cachedNodes = loadTaxonomyCacheFromStorage();
    taxonomyIndex = buildNodeIndex(cachedNodes);
    supportedLocales = deriveSupportedLocales(cachedNodes);
    lastHydratedAt = Date.now();
    dispatchSyncEvent(TAXONOMY_SYNC_EVENT);
  });

  storageBridgeAttached = true;
}

function scheduleTaxonomyHydrate(force = false): void {
  ensureTaxonomyStorageBridge();

  if (!isBrowser() || !isSupabaseRestEnabled()) return;
  if (hydratePromise) return;
  if (!force && lastHydratedAt > 0 && Date.now() - lastHydratedAt < TAXONOMY_HYDRATE_TTL_MS) return;

  void hydrateTaxonomyFromSupabase(force).catch(() => undefined);
}

function buildNodeIndex(allNodes: TaxonomyNode[]): NodeIndex {
  const bySlug = new Map<string, TaxonomyNode>();
  const assetClassTerms = new Map<string, TaxonomyNode[]>();
  const categoryTerms = new Map<string, TaxonomyNode[]>();
  const subcategoryTerms = new Map<string, TaxonomyNode[]>();

  allNodes.forEach((node) => {
    bySlug.set(node.slug, node);
  });

  allNodes
    .filter((node) => node.nodeType === 'asset_class')
    .forEach((node) => {
      collectLookupTerms(node).forEach((term) => addIndexedNode(assetClassTerms, term, node));
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
    assetClassTerms,
    categoryTerms,
    subcategoryTerms,
  };
}

function loadDefaultTaxonomyNodes(): TaxonomyNode[] {
  const seed = taxonomySeed as { nodes?: TaxonomyStoredNode[] };
  return Array.isArray(seed.nodes)
    ? seed.nodes
        .map((entry) => mapUnknownToTaxonomyNode(entry))
        .filter((node): node is TaxonomyNode => Boolean(node))
    : [];
}

function findNode(
  input: string,
  nodeType: 'asset_class' | 'category' | 'subcategory',
  parentSlug?: string
): TaxonomyNode | undefined {
  const lookupKey = normalizeTaxonomySearchKey(input);
  if (!lookupKey) return undefined;

  const index = nodeType === 'asset_class'
    ? taxonomyIndex.assetClassTerms
    : nodeType === 'category'
    ? taxonomyIndex.categoryTerms
    : taxonomyIndex.subcategoryTerms;

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

  const node = taxonomyIndex.bySlug.get(redirectSlug);
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

  if (isBrowser()) {
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

  return DEFAULT_LOCALE;
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
    node.labels?.[FALLBACK_LOCALE] ||
    node.labels?.[DEFAULT_LOCALE] ||
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

if (isBrowser()) {
  ensureTaxonomyStorageBridge();
  scheduleTaxonomyHydrate();
}
