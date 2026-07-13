/**
 * B2B API Client — Direct platform API calls for Product Sourcing.
 * Replaces Tavily web scraping with structured product data from:
 *   - Alibaba DataHub (RapidAPI) — B2B wholesale
 *   - Real-Time Amazon Data (RapidAPI) — price reference
 *   - CJ Dropshipping (Direct API v2.0) — dropship-ready
 *   - Tavily (fallback for non-API channels)
 */

import { searchTavily, type TavilyResult } from "./tavily-client.ts";
import { readBoundedJson } from "./bounded-response.ts";

// ─── Unified Product Interface ──────────────────────────────────────────────

export interface SourcedProduct {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  source: 'alibaba' | 'amazon' | 'cj' | 'tavily';

  // Pricing
  price: number;
  priceMax?: number;
  currency: string;
  moq?: number;
  suggestedRetailPrice?: number;

  // Supplier
  supplierName?: string;
  supplierCountry?: string;
  supplierYears?: number;
  verified?: boolean;
  tradeAssurance?: boolean;

  // Metrics
  rating?: number;
  reviewCount?: number;
  salesVolume?: string;
  isBestSeller?: boolean;

  // Dropship (CJ)
  inventory?: number;
  shippingDays?: number;
  variants?: number;

  // Relevance
  relevanceScore: number;
}

export type ApiSource = 'alibaba' | 'amazon' | 'cj' | 'tavily';

interface SearchOptions {
  maxResults?: number;
  region?: string;
  timeoutMs?: number;
}

interface CJTokenCache {
  token: string;
  expiresAt: number;
}

const MAX_VENDOR_RESPONSE_BYTES = 4 * 1024 * 1024;

function sanitizeUntrustedText(value: unknown, maxLength: number): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>\[\]{}()`*_#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function safePublicHttpsUrl(value: unknown): string {
  try {
    const parsed = new URL(String(value || '').trim());
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (parsed.protocol !== 'https:' || !hostname || parsed.username || parsed.password) return '';
    if (parsed.port && parsed.port !== '443') return '';
    if (
      hostname === 'localhost'
      || hostname.endsWith('.localhost')
      || hostname.endsWith('.local')
      || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
      || hostname.includes(':')
    ) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function finiteNumber(value: unknown, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

export function sanitizeSourcedProduct(product: SourcedProduct, index: number): SourcedProduct | null {
  const source: ApiSource = ['alibaba', 'amazon', 'cj', 'tavily'].includes(product.source)
    ? product.source
    : 'tavily';
  const url = safePublicHttpsUrl(product.url);
  const title = sanitizeUntrustedText(product.title, 240);
  if (!url || !title) return null;
  const imageUrl = safePublicHttpsUrl(product.imageUrl);
  const currency = sanitizeUntrustedText(product.currency, 8).toUpperCase();
  return {
    ...product,
    id: sanitizeUntrustedText(product.id, 128) || `${source}-${index}`,
    title,
    url,
    imageUrl,
    source,
    price: finiteNumber(product.price, 0, 1_000_000_000),
    priceMax: product.priceMax === undefined ? undefined : finiteNumber(product.priceMax, 0, 1_000_000_000),
    currency: /^[A-Z]{3,8}$/.test(currency) ? currency : 'USD',
    moq: product.moq === undefined ? undefined : Math.trunc(finiteNumber(product.moq, 0, 1_000_000_000)),
    suggestedRetailPrice: product.suggestedRetailPrice === undefined
      ? undefined
      : finiteNumber(product.suggestedRetailPrice, 0, 1_000_000_000),
    supplierName: product.supplierName ? sanitizeUntrustedText(product.supplierName, 200) : undefined,
    supplierCountry: product.supplierCountry ? sanitizeUntrustedText(product.supplierCountry, 100) : undefined,
    supplierYears: product.supplierYears === undefined ? undefined : Math.trunc(finiteNumber(product.supplierYears, 0, 1000)),
    rating: product.rating === undefined ? undefined : finiteNumber(product.rating, 0, 5),
    reviewCount: product.reviewCount === undefined ? undefined : Math.trunc(finiteNumber(product.reviewCount, 0, 1_000_000_000)),
    salesVolume: product.salesVolume ? sanitizeUntrustedText(product.salesVolume, 100) : undefined,
    inventory: product.inventory === undefined ? undefined : Math.trunc(finiteNumber(product.inventory, 0, 1_000_000_000)),
    shippingDays: product.shippingDays === undefined ? undefined : Math.trunc(finiteNumber(product.shippingDays, 0, 3650)),
    variants: product.variants === undefined ? undefined : Math.trunc(finiteNumber(product.variants, 0, 1_000_000)),
    relevanceScore: finiteNumber(product.relevanceScore, 0, 1),
  };
}

// ─── RapidAPI Shared Config ─────────────────────────────────────────────────

function getRapidAPIKey(): string {
  return Deno.env.get("RAPIDAPI_KEY") || "";
}

function rapidHeaders(host: string): Record<string, string> {
  return {
    "x-rapidapi-key": getRapidAPIKey(),
    "x-rapidapi-host": host,
    "Content-Type": "application/json",
  };
}

// ─── 1. Alibaba DataHub Search ──────────────────────────────────────────────

export async function searchAlibaba(
  query: string,
  options: SearchOptions = {},
): Promise<SourcedProduct[]> {
  const key = getRapidAPIKey();
  if (!key) {
    console.warn("⚠️ RAPIDAPI_KEY not set, skipping Alibaba search");
    return [];
  }

  const { maxResults = 10, timeoutMs = 12000 } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://alibaba-datahub.p.rapidapi.com/item_search?q=${encodeURIComponent(query)}&page=1&limit=${maxResults}`;
    const res = await fetch(url, {
      method: "GET",
      headers: rapidHeaders("alibaba-datahub.p.rapidapi.com"),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`Alibaba API returned status ${res.status}`);
      return [];
    }

    const data = await readBoundedJson<any>(res, MAX_VENDOR_RESPONSE_BYTES);
    const resultList: unknown[] = data?.result?.resultList || [];
    if (!Array.isArray(resultList)) return [];

    return resultList.slice(0, maxResults).map((entry: any, i: number) => {
      const item = entry?.item || {};
      const seller = entry?.seller || {};
      const company = entry?.company || {};
      const sku = item?.sku?.def || {};
      const priceModule = sku?.priceModule || {};
      const qtyModule = sku?.quantityModule || {};

      // Parse price range "2.9-3.98" or single price
      const priceStr = priceModule?.price || "";
      const priceParts = priceStr.split("-").map((p: string) => parseFloat(p));
      const minPrice = priceParts[0] || 0;
      const maxPrice = priceParts.length > 1 ? priceParts[1] : undefined;

      // Parse MOQ from quantityModule
      const moqVal = parseInt(qtyModule?.minOrder?.quantity || 0) || undefined;

      // Parse store age (years)
      const storeYears = parseInt(seller?.storeAge || 0) || undefined;

      // Parse average rating from storeEvaluates
      const evaluates = seller?.storeEvaluates || [];
      const avgRating = evaluates.length > 0
        ? evaluates.reduce((sum: number, e: any) => sum + (parseFloat(e?.score) || 0), 0) / evaluates.length
        : undefined;

      return {
        id: String(item.itemId || `ali-${i}`),
        title: item.title || "Alibaba Product",
        url: item.itemUrl ? `https:${item.itemUrl}` : `https://www.alibaba.com/product-detail/_${item.itemId}.html`,
        imageUrl: item.image ? `https:${item.image}` : "",
        source: "alibaba" as const,

        price: minPrice,
        priceMax: maxPrice,
        currency: "USD",
        moq: moqVal,

        supplierName: company.companyName || undefined,
        supplierCountry: company.companyAddress?.country || "China",
        supplierYears: storeYears,
        verified: company.status?.gold === true || company.status?.verified === true,
        tradeAssurance: company.status?.tradeAssurance === "1" || company.status?.tradeAssurance === true,

        rating: avgRating ? parseFloat(avgRating.toFixed(1)) : undefined,
        reviewCount: undefined,
        salesVolume: undefined,

        relevanceScore: 1 - (i / maxResults),
      };
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(`⚠️ Alibaba API timeout (${timeoutMs}ms)`);
    } else {
      console.error("❌ Alibaba search error:", err);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ─── 2. Real-Time Amazon Search (Price Reference) ───────────────────────────

export async function searchAmazon(
  query: string,
  options: SearchOptions = {},
): Promise<SourcedProduct[]> {
  const key = getRapidAPIKey();
  if (!key) {
    console.warn("⚠️ RAPIDAPI_KEY not set, skipping Amazon search");
    return [];
  }

  const { maxResults = 8, region = "US", timeoutMs = 12000 } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const country = region === "Vietnam" || region === "VN" ? "US" : (region?.length === 2 ? region : "US");
    const url = `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&country=${country}&sort_by=RELEVANCE`;
    const res = await fetch(url, {
      method: "GET",
      headers: rapidHeaders("real-time-amazon-data.p.rapidapi.com"),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`Amazon API returned status ${res.status}`);
      return [];
    }

    const data = await readBoundedJson<any>(res, MAX_VENDOR_RESPONSE_BYTES);
    const products: unknown[] = data?.data?.products || data?.products || data?.results || [];
    if (!Array.isArray(products)) return [];

    return products.slice(0, maxResults).map((p: any, i: number) => ({
      id: p.asin || `amz-${i}`,
      title: p.product_title || p.title || "Amazon Product",
      url: p.product_url || p.url || `https://www.amazon.com/dp/${p.asin || ""}`,
      imageUrl: p.product_photo || p.thumbnail || p.image || "",
      source: "amazon" as const,

      price: parseFloat(String(p.product_price || p.price || "0").replace(/[^0-9.]/g, "")) || 0,
      priceMax: undefined,
      currency: p.currency || "USD",
      suggestedRetailPrice: parseFloat(String(p.product_original_price || "0").replace(/[^0-9.]/g, "")) || undefined,

      rating: parseFloat(p.product_star_rating || p.rating || 0) || undefined,
      reviewCount: parseInt(p.product_num_ratings || p.reviews || 0) || undefined,
      salesVolume: p.sales_volume || undefined,
      isBestSeller: p.is_best_seller === true,

      relevanceScore: 1 - (i / maxResults),
    }));
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(`⚠️ Amazon API timeout (${timeoutMs}ms)`);
    } else {
      console.error("❌ Amazon search error:", err);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ─── 3. CJ Dropshipping Search ─────────────────────────────────────────────

let cachedCJToken: CJTokenCache | null = null;

async function getCJAccessToken(): Promise<string | null> {
  // 1. Return in-memory cache if valid
  if (cachedCJToken && Date.now() < cachedCJToken.expiresAt) {
    return cachedCJToken.token;
  }

  // Request a fresh token from CJ. Vendor bearer tokens stay in memory and
  // are never persisted to the generic database KV table.
  const apiKey = Deno.env.get("CJ_API_KEY");
  if (!apiKey) {
    console.warn("⚠️ CJ_API_KEY not set");
    return null;
  }

  try {
    const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      console.warn(`CJ auth returned status ${res.status}`);
      return null;
    }

    const data = await readBoundedJson<any>(res, 256 * 1024);
    if (data?.code !== 200 || !data?.data?.accessToken) {
      console.warn("CJ auth returned an invalid response");
      return null;
    }

    const token = String(data.data.accessToken || '').trim();
    if (token.length < 20 || token.length > 4096) {
      console.warn('CJ auth returned an invalid token');
      return null;
    }
    const tokenData: CJTokenCache = {
      token,
      expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days
    };

    cachedCJToken = tokenData;
    return token;
  } catch (err) {
    console.error("❌ CJ auth error:", err);
    return null;
  }
}

export async function searchCJ(
  query: string,
  options: SearchOptions = {},
): Promise<SourcedProduct[]> {
  const token = await getCJAccessToken();
  if (!token) return [];

  const { maxResults = 10, timeoutMs = 12000 } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://developers.cjdropshipping.com/api2.0/v1/product/listV2?keyWord=${encodeURIComponent(query)}&page=1&size=${maxResults}&orderBy=0`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "CJ-Access-Token": token,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`CJ API returned status ${res.status}`);
      return [];
    }

    const data = await readBoundedJson<any>(res, MAX_VENDOR_RESPONSE_BYTES);
    if (data?.code !== 200) {
      console.warn("CJ search returned an invalid response");
      return [];
    }

    const items: unknown[] = data?.data?.list || data?.data || [];
    if (!Array.isArray(items)) return [];

    return items.slice(0, maxResults).map((item: any, i: number) => ({
      id: item.id || item.pid || `cj-${i}`,
      title: item.nameEn || item.productNameEn || item.productName || "CJ Product",
      url: `https://cjdropshipping.com/product/${item.id || item.pid || ""}`,
      imageUrl: item.bigImage || item.image || "",
      source: "cj" as const,

      price: parseFloat(item.sellPrice || item.nowPrice || 0),
      priceMax: undefined,
      currency: "USD",
      suggestedRetailPrice: parseFloat(item.suggestSellPrice || 0) || undefined,

      supplierName: item.supplierName || "CJ Dropshipping",
      supplierCountry: "China",
      verified: true, // CJ is a verified platform

      inventory: parseInt(item.warehouseInventoryNum || item.totalVerifiedInventory || 0) || undefined,
      variants: item.variantCount || undefined,
      salesVolume: item.listedNum ? `${item.listedNum} listings` : undefined,

      relevanceScore: 1 - (i / maxResults),
    }));
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(`⚠️ CJ API timeout (${timeoutMs}ms)`);
    } else {
      console.error("❌ CJ search error:", err);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ─── 4. Tavily Fallback (for non-API channels) ─────────────────────────────

async function searchTavilyFallback(
  query: string,
  channelName: string,
  options: SearchOptions = {},
): Promise<SourcedProduct[]> {
  const { maxResults = 5 } = options;
  const searchQuery = `${query} ${channelName} supplier wholesale B2B`;

  const result = await searchTavily(searchQuery, {
    maxResults,
    searchDepth: "basic",
    includeImages: true,
  });

  if (!result.success) return [];

  return result.results.map((r: TavilyResult, i: number) => {
    const domain = (() => {
      try { return new URL(r.url).hostname.replace("www.", ""); }
      catch { return "web"; }
    })();
    return {
      id: `tavily-${i}`,
      title: r.title || "Web Result",
      url: r.url,
      imageUrl: "",
      source: "tavily" as const,
      price: 0,
      currency: "USD",
      supplierName: domain,
      relevanceScore: r.score || (1 - i / maxResults),
    };
  });
}

// ─── 5. Unified Search Entry Point ──────────────────────────────────────────

/** Channel key → API source mapping */
const CHANNEL_API_MAP: Record<string, ApiSource> = {
  ALIBABA: "alibaba",
  ALIBABA_1688: "alibaba",
  CJ_DROP: "cj",
  AMAZON: "amazon",
  ALIEXPRESS: "tavily",
  GOOGLE_SHOPPING: "tavily",
  SHOPEE: "tavily",
  GLOBAL_SOURCES: "tavily",
  THOMASNET: "tavily",
  FAIRE: "tavily",
  INDIAMART: "tavily",
  MADE_IN_CHINA: "tavily",
  ETSY: "tavily",
  OPENSEA: "tavily",
  MAGIC_EDEN: "tavily",
  REAL_ESTATE_PORTALS: "tavily",
};

/** Friendly channel names for Tavily fallback queries */
const CHANNEL_NAMES: Record<string, string> = {
  GLOBAL_SOURCES: "Global Sources",
  THOMASNET: "ThomasNet",
  FAIRE: "Faire",
  INDIAMART: "IndiaMART",
  MADE_IN_CHINA: "Made-in-China",
  ALIEXPRESS: "AliExpress",
  SHOPEE: "Shopee",
  ETSY: "Etsy",
  OPENSEA: "OpenSea",
  MAGIC_EDEN: "Magic Eden",
  REAL_ESTATE_PORTALS: "real estate",
  GOOGLE_SHOPPING: "Google Shopping",
};

export async function searchProducts(
  query: string,
  channels: string[],
  options: SearchOptions = {},
): Promise<{ products: SourcedProduct[]; sources: string[]; errors: string[] }> {
  const maxResults = Math.min(20, Math.max(1, Math.trunc(Number(options.maxResults ?? 8)) || 8));
  const timeoutMs = Math.min(20_000, Math.max(1_000, Math.trunc(Number(options.timeoutMs ?? 12_000)) || 12_000));
  const region = sanitizeUntrustedText(options.region, 32);
  const safeQuery = sanitizeUntrustedText(query, 300);
  const safeChannels = Array.isArray(channels) ? channels.slice(0, 20) : [];
  const errors: string[] = [];
  const activeSources = new Set<string>();
  if (!safeQuery) return { products: [], sources: [], errors: ['empty query'] };

  // Deduplicate API sources (e.g., ALIBABA + ALIBABA_1688 both map to 'alibaba')
  const apiCalls: Map<ApiSource, string[]> = new Map();
  for (const ch of safeChannels) {
    const src = CHANNEL_API_MAP[ch] || "tavily";
    if (!apiCalls.has(src)) apiCalls.set(src, []);
    apiCalls.get(src)!.push(ch);
  }

  // Build parallel promises
  const promises: Promise<SourcedProduct[]>[] = [];

  for (const [src, chs] of apiCalls) {
    switch (src) {
      case "alibaba":
        promises.push(
          searchAlibaba(safeQuery, { maxResults, region, timeoutMs })
            .then(r => { if (r.length) activeSources.add("Alibaba"); return r; })
            .catch(() => { errors.push('alibaba request failed'); return []; })
        );
        break;
      case "amazon":
        promises.push(
          searchAmazon(safeQuery, { maxResults: Math.min(maxResults, 5), region, timeoutMs })
            .then(r => { if (r.length) activeSources.add("Amazon"); return r; })
            .catch(() => { errors.push('amazon request failed'); return []; })
        );
        break;
      case "cj":
        promises.push(
          searchCJ(safeQuery, { maxResults, timeoutMs })
            .then(r => { if (r.length) activeSources.add("CJ Dropshipping"); return r; })
            .catch(() => { errors.push('cj request failed'); return []; })
        );
        break;
      case "tavily":
        // Run one Tavily search per non-API channel (max 3 to avoid rate limits)
        for (const ch of chs.slice(0, 3)) {
          const name = CHANNEL_NAMES[ch] || ch;
          promises.push(
            searchTavilyFallback(safeQuery, name, { maxResults: 3, timeoutMs })
              .then(r => { if (r.length) activeSources.add(name); return r; })
              .catch(() => { errors.push(`tavily(${sanitizeUntrustedText(ch, 32)}) request failed`); return []; })
          );
        }
        break;
    }
  }

  // Run all API calls in parallel
  const settled = await Promise.allSettled(promises);
  let allProducts: SourcedProduct[] = [];

  for (const s of settled) {
    if (s.status === "fulfilled") {
      allProducts = allProducts.concat(s.value);
    } else {
      errors.push('supplier request failed');
    }
  }

  allProducts = allProducts
    .map(sanitizeSourcedProduct)
    .filter((product): product is SourcedProduct => product !== null)
    .slice(0, 60);

  // Sort: B2B first (alibaba, cj), then price reference (amazon), then web (tavily)
  const sourceOrder: Record<ApiSource, number> = { alibaba: 0, cj: 1, amazon: 2, tavily: 3 };
  allProducts.sort((a, b) => {
    const orderDiff = (sourceOrder[a.source] ?? 9) - (sourceOrder[b.source] ?? 9);
    if (orderDiff !== 0) return orderDiff;
    return b.relevanceScore - a.relevanceScore;
  });

  console.log(`📦 searchProducts: ${allProducts.length} results from ${activeSources.size} sources`, {
    sources: [...activeSources],
    errors: errors.length,
  });

  return {
    products: allProducts,
    sources: [...activeSources],
    errors,
  };
}
