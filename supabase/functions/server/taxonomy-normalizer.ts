import taxonomySeed from "../../../data/taxonomy/orina_ai_taxonomy_v1.json" with { type: "json" };

type LocaleStringMap = Record<string, string>;
type LocaleAliasMap = Record<string, string[]>;

type TaxonomyNode = {
  slug: string;
  parentSlug: string | null;
  nodeType: "asset_class" | "category" | "subcategory";
  assetClassSlug: string;
  marketBucket: string;
  sortOrder: number;
  isActive: boolean;
  supportsCurrentProtocol: boolean;
  labels?: LocaleStringMap;
  aliases?: LocaleAliasMap;
  attributeTemplateRefs?: string[];
  metadata?: Record<string, unknown>;
};

type TaxonomySeed = {
  nodes?: TaxonomyNode[];
};

type NodeIndex = {
  bySlug: Map<string, TaxonomyNode>;
  categories: TaxonomyNode[];
  subcategories: TaxonomyNode[];
  categoryTerms: Map<string, TaxonomyNode[]>;
  subcategoryTerms: Map<string, TaxonomyNode[]>;
};

export type NormalizedTaxonomyMatch = {
  rawCategory: string;
  rawSubcategory?: string;
  categorySlug: string;
  categoryLabel: string;
  subcategorySlug?: string;
  subcategoryLabel?: string;
  categoryQueryCandidates: string[];
  vectorSearchText: string;
  matchedBy: "category" | "subcategory_promoted" | "raw_fallback";
};

const seed = taxonomySeed as TaxonomySeed;
const nodes = seed.nodes ?? [];

const TAXONOMY_INDEX: NodeIndex = buildNodeIndex(nodes);

export function normalizeListingTaxonomy(
  category: string,
  subcategory?: string | null,
): NormalizedTaxonomyMatch {
  const rawCategory = cleanInput(category);
  const rawSubcategory = cleanInput(subcategory);

  const categoryMatch = findNode(rawCategory, "category");
  const subcategoryMatch = findNode(
    rawSubcategory,
    "subcategory",
    categoryMatch?.slug,
  );

  const promotedSubcategory = !subcategoryMatch
    ? findNode(rawCategory, "subcategory")
    : undefined;

  const resolvedSubcategory = subcategoryMatch ?? promotedSubcategory;
  const resolvedCategory = categoryMatch
    ?? (resolvedSubcategory ? TAXONOMY_INDEX.bySlug.get(resolvedSubcategory.parentSlug ?? "") : undefined);

  const matchedBy: NormalizedTaxonomyMatch["matchedBy"] = resolvedCategory
    ? (promotedSubcategory && !categoryMatch ? "subcategory_promoted" : "category")
    : "raw_fallback";

  const canonicalCategorySlug = resolvedCategory?.slug ?? slugifyFallback(rawCategory);
  const canonicalCategoryLabel = resolvedCategory?.labels?.en ?? canonicalCategorySlug;
  const canonicalSubcategorySlug = resolvedSubcategory?.slug;
  const canonicalSubcategoryLabel = resolvedSubcategory?.labels?.en ?? canonicalSubcategorySlug;

  return {
    rawCategory,
    rawSubcategory: rawSubcategory || undefined,
    categorySlug: canonicalCategorySlug,
    categoryLabel: canonicalCategoryLabel,
    subcategorySlug: canonicalSubcategorySlug,
    subcategoryLabel: canonicalSubcategoryLabel,
    categoryQueryCandidates: buildCategoryQueryCandidates(
      resolvedCategory,
      rawCategory,
    ),
    vectorSearchText: [canonicalCategoryLabel, canonicalSubcategoryLabel, rawCategory, rawSubcategory]
      .filter(Boolean)
      .filter((value, index, list) => list.indexOf(value) === index)
      .join(" "),
    matchedBy,
  };
}

function buildNodeIndex(allNodes: TaxonomyNode[]): NodeIndex {
  const bySlug = new Map<string, TaxonomyNode>();
  const categories = allNodes.filter((node) => node.nodeType === "category");
  const subcategories = allNodes.filter((node) => node.nodeType === "subcategory");
  const categoryTerms = new Map<string, TaxonomyNode[]>();
  const subcategoryTerms = new Map<string, TaxonomyNode[]>();

  for (const node of allNodes) {
    bySlug.set(node.slug, node);
  }

  for (const node of categories) {
    for (const term of collectLookupTerms(node)) {
      addIndexedNode(categoryTerms, term, node);
    }
  }

  for (const node of subcategories) {
    for (const term of collectLookupTerms(node)) {
      addIndexedNode(subcategoryTerms, term, node);
    }
  }

  return {
    bySlug,
    categories,
    subcategories,
    categoryTerms,
    subcategoryTerms,
  };
}

function findNode(
  input: string,
  nodeType: "category" | "subcategory",
  parentSlug?: string,
): TaxonomyNode | undefined {
  if (!input) return undefined;

  const lookupKey = normalizeSearchKey(input);
  if (!lookupKey) return undefined;

  const index = nodeType === "category"
    ? TAXONOMY_INDEX.categoryTerms
    : TAXONOMY_INDEX.subcategoryTerms;

  const matches = (index.get(lookupKey) ?? [])
    .filter((node) => !parentSlug || node.parentSlug === parentSlug)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return matches[0];
}

function buildCategoryQueryCandidates(
  categoryNode: TaxonomyNode | undefined,
  rawCategory: string,
): string[] {
  const candidates = new Set<string>();

  if (categoryNode) {
    candidates.add(categoryNode.slug);
    candidates.add(categoryNode.slug.replace(/_/g, " "));

    const englishLabel = categoryNode.labels?.en;
    if (englishLabel) {
      candidates.add(englishLabel);
      candidates.add(englishLabel.toLowerCase());
    }

    for (const alias of getLegacyCategoryAliases(categoryNode)) {
      candidates.add(alias);
    }
  }

  if (rawCategory) {
    candidates.add(rawCategory);
    candidates.add(rawCategory.toLowerCase());
  }

  return Array.from(candidates).filter(Boolean);
}

function getLegacyCategoryAliases(node: TaxonomyNode): string[] {
  const legacyFromMetadata = Array.isArray(node.metadata?.legacyCategoryAliases)
    ? node.metadata?.legacyCategoryAliases as string[]
    : [];

  return [
    ...legacyFromMetadata,
    ...(node.aliases?.en ?? []),
  ]
    .map(cleanInput)
    .filter(Boolean);
}

function collectLookupTerms(node: TaxonomyNode): string[] {
  const labelValues = Object.values(node.labels ?? {});
  const aliasValues = Object.values(node.aliases ?? {}).flat();
  const metadataAliases = Array.isArray(node.metadata?.legacyCategoryAliases)
    ? node.metadata?.legacyCategoryAliases as string[]
    : Array.isArray(node.metadata?.legacySubcategoryAliases)
    ? node.metadata?.legacySubcategoryAliases as string[]
    : [];

  return [
    node.slug,
    node.slug.replace(/_/g, " "),
    ...labelValues,
    ...aliasValues,
    ...metadataAliases,
  ]
    .flatMap(toLookupVariants)
    .filter(Boolean);
}

function toLookupVariants(value: string): string[] {
  const cleaned = cleanInput(value);
  if (!cleaned) return [];

  const normalized = normalizeSearchKey(cleaned);
  const variants = new Set<string>([normalized]);

  if (cleaned.includes("&")) {
    variants.add(normalizeSearchKey(cleaned.replace(/&/g, "and")));
  }

  return Array.from(variants).filter(Boolean);
}

function addIndexedNode(index: Map<string, TaxonomyNode[]>, key: string, node: TaxonomyNode) {
  if (!key) return;
  const existing = index.get(key) ?? [];
  existing.push(node);
  index.set(key, existing);
}

function cleanInput(value?: string | null): string {
  return (value ?? "").trim();
}

function normalizeSearchKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[^\p{L}\p{N}\s&-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyFallback(value: string): string {
  const normalized = normalizeSearchKey(value)
    .replace(/&/g, " and ")
    .replace(/\s+/g, "_");

  return normalized || "uncategorized";
}
