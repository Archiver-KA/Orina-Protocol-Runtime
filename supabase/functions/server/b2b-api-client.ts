/**
 * B2B API Client — Direct platform API calls for Product Sourcing.
 * Replaces Tavily web scraping with structured product data from:
 *   - Alibaba DataHub (RapidAPI) — B2B wholesale
 *   - Real-Time Amazon Data (RapidAPI) — price reference
 *   - CJ Dropshipping (Direct API v2.0) — dropship-ready
 *   - Tavily (fallback for non-API channels)
 */

import { searchTavily, type TavilyResult } from "./tavily-client.ts";
import { get as kvGet, set as kvSet } from "./kv_store.tsx";

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
      console.warn(`⚠️ Alibaba API ${res.status}:`, await res.text().catch(() => ""));
      return [];
    }

    const data = await res.json();
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
      console.warn(`⚠️ Amazon API ${res.status}:`, await res.text().catch(() => ""));
      return [];
    }

    const data = await res.json();
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

function isCJTokenCache(value: unknown): value is CJTokenCache {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.token === "string" && typeof candidate.expiresAt === "number";
}

async function getCJAccessToken(): Promise<string | null> {
  // 1. Return in-memory cache if valid
  if (cachedCJToken && Date.now() < cachedCJToken.expiresAt) {
    return cachedCJToken.token;
  }

  // 2. Check KV store (persists across cold starts)
  try {
    const stored = await kvGet<CJTokenCache>("cj_access_token");
    if (isCJTokenCache(stored) && Date.now() < stored.expiresAt) {
      cachedCJToken = stored;
      console.log("✅ CJ token restored from KV store");
      return stored.token;
    }
  } catch { /* KV read failed, continue to fresh auth */ }

  // 3. Request fresh token from CJ API
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
    });

    if (!res.ok) {
      console.warn(`⚠️ CJ auth ${res.status}:`, await res.text().catch(() => ""));
      return null;
    }

    const data = await res.json();
    if (data?.code !== 200 || !data?.data?.accessToken) {
      console.warn("⚠️ CJ auth failed:", data?.msg || data?.message);
      return null;
    }

    const token = data.data.accessToken;
    const tokenData: CJTokenCache = {
      token,
      expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days
    };

    // Cache in-memory
    cachedCJToken = tokenData;

    // Persist to KV store
    try { await kvSet("cj_access_token", tokenData); } catch { /* non-fatal */ }

    console.log("✅ CJ access token obtained + persisted");
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
      console.warn(`⚠️ CJ API ${res.status}:`, await res.text().catch(() => ""));
      return [];
    }

    const data = await res.json();
    if (data?.code !== 200) {
      console.warn("⚠️ CJ search failed:", data?.msg || data?.message);
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
  const { maxResults = 8, region, timeoutMs = 12000 } = options;
  const errors: string[] = [];
  const activeSources = new Set<string>();

  // Deduplicate API sources (e.g., ALIBABA + ALIBABA_1688 both map to 'alibaba')
  const apiCalls: Map<ApiSource, string[]> = new Map();
  for (const ch of channels) {
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
          searchAlibaba(query, { maxResults, region, timeoutMs })
            .then(r => { if (r.length) activeSources.add("Alibaba"); return r; })
            .catch(e => { errors.push(`alibaba: ${e}`); return []; })
        );
        break;
      case "amazon":
        promises.push(
          searchAmazon(query, { maxResults: Math.min(maxResults, 5), region, timeoutMs })
            .then(r => { if (r.length) activeSources.add("Amazon"); return r; })
            .catch(e => { errors.push(`amazon: ${e}`); return []; })
        );
        break;
      case "cj":
        promises.push(
          searchCJ(query, { maxResults, timeoutMs })
            .then(r => { if (r.length) activeSources.add("CJ Dropshipping"); return r; })
            .catch(e => { errors.push(`cj: ${e}`); return []; })
        );
        break;
      case "tavily":
        // Run one Tavily search per non-API channel (max 3 to avoid rate limits)
        for (const ch of chs.slice(0, 3)) {
          const name = CHANNEL_NAMES[ch] || ch;
          promises.push(
            searchTavilyFallback(query, name, { maxResults: 3, timeoutMs })
              .then(r => { if (r.length) activeSources.add(name); return r; })
              .catch(e => { errors.push(`tavily(${ch}): ${e}`); return []; })
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
      errors.push(String(s.reason));
    }
  }

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
