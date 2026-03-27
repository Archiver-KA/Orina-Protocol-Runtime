// ================================================================
//  ORINA PRODUCT SOURCING AI
//  Feature: Prompt chip "Tìm sản phẩm để bán"
//  Scope: Global supplier discovery · SKU matching · Seller profiling
//  Categories: Real estate · E-commerce · NFT/Digital · Cross-border
//  Channels: 20+ global channels with trust scoring
//  Output: Product cards (AI selects layout by context)
//  Stack: Claude Sonnet + web_search tool
// ================================================================

// ─── 1. GLOBAL SUPPLIER CHANNEL REGISTRY ────────────────────────
export const SUPPLIER_CHANNELS = {

  // ── TIER 1: API-first, highest trust ──────────────────────────
  ALIBABA: {
    name: "Alibaba", url: "https://www.alibaba.com",
    apiDocs: "https://developer.alibaba.com/docs",
    hasSKU: true, hasAPI: true, trustScore: 95,
    categories: ["goods", "cross_border", "manufacturing"],
    regions: ["global"],
    strengths: ["B2B wholesale", "factory direct", "OEM", "Trade Assurance"],
    searchPattern: "{query} supplier wholesale alibaba",
  },
  ALIBABA_1688: {
    name: "1688 (China Direct)", url: "https://www.1688.com",
    apiDocs: "https://open.1688.com",
    hasSKU: true, hasAPI: true, trustScore: 92,
    categories: ["goods", "manufacturing", "cross_border"],
    regions: ["china", "asia"],
    strengths: ["Lowest price", "factory direct", "dropship ready"],
    searchPattern: "{query} 1688 wholesale China factory",
  },
  AMAZON: {
    name: "Amazon", url: "https://www.amazon.com",
    apiDocs: "https://developer-docs.amazon.com/sp-api",
    hasSKU: true, hasAPI: true, trustScore: 98,
    categories: ["goods", "digital", "cross_border"],
    regions: ["us", "eu", "global"],
    strengths: ["FBA logistics", "Prime trust", "bestseller data", "global reach"],
    searchPattern: "{query} amazon best seller 2025",
  },
  EBAY: {
    name: "eBay", url: "https://www.ebay.com",
    apiDocs: "https://developer.ebay.com",
    hasSKU: true, hasAPI: true, trustScore: 90,
    categories: ["goods", "digital", "nft", "cross_border"],
    regions: ["us", "eu", "global"],
    strengths: ["Secondhand market", "rare items", "auction pricing", "collectibles"],
    searchPattern: "{query} ebay sold listings trending",
  },
  ALIEXPRESS: {
    name: "AliExpress", url: "https://www.aliexpress.com",
    apiDocs: "https://developers.aliexpress.com",
    hasSKU: true, hasAPI: true, trustScore: 85,
    categories: ["goods", "dropship", "cross_border"],
    regions: ["global"],
    strengths: ["Retail + dropship", "no MOQ", "fast shipping options"],
    searchPattern: "{query} aliexpress trending free shipping",
  },
  SHOPIFY_DSERS: {
    name: "Shopify / DSers", url: "https://www.dsers.com",
    apiDocs: "https://www.dsers.com/api",
    hasSKU: true, hasAPI: true, trustScore: 88,
    categories: ["goods", "dropship"],
    regions: ["global"],
    strengths: ["Dropship zero inventory", "AliExpress sync", "auto-fulfill"],
    searchPattern: "{query} dsers dropship trending product",
  },
  GOOGLE_SHOPPING: {
    name: "Google Shopping", url: "https://shopping.google.com",
    apiDocs: "https://developers.google.com/shopping-content",
    hasSKU: true, hasAPI: true, trustScore: 96,
    categories: ["goods", "cross_border"],
    regions: ["global"],
    strengths: ["Price comparison", "multi-merchant", "trending detection"],
    searchPattern: "{query} google shopping price compare 2025",
  },

  // ── TIER 2: Regional powerhouses ──────────────────────────────
  SHOPEE: {
    name: "Shopee", url: "https://shopee.vn",
    apiDocs: "https://open.shopee.com",
    hasSKU: true, hasAPI: true, trustScore: 91,
    categories: ["goods", "digital", "cross_border"],
    regions: ["vietnam", "sea"],
    strengths: ["SEA #1", "live commerce", "flash sales", "Shopee Mall"],
    searchPattern: "{query} shopee bán chạy 2025",
  },
  LAZADA: {
    name: "Lazada", url: "https://www.lazada.vn",
    apiDocs: "https://open.lazada.com",
    hasSKU: true, hasAPI: true, trustScore: 88,
    categories: ["goods", "cross_border"],
    regions: ["vietnam", "sea"],
    strengths: ["SEA reach", "Alibaba ecosystem", "LazMall verified"],
    searchPattern: "{query} lazada best seller SEA",
  },
  TIKI: {
    name: "Tiki", url: "https://tiki.vn",
    apiDocs: "https://open.tiki.vn/docs",
    hasSKU: true, hasAPI: true, trustScore: 90,
    categories: ["goods", "digital"],
    regions: ["vietnam"],
    strengths: ["Vietnam #1 trust", "TikiNOW fast delivery", "authentic"],
    searchPattern: "{query} tiki bán chạy",
  },
  SENDO: {
    name: "Sendo", url: "https://www.sendo.vn",
    apiDocs: null,
    hasSKU: true, hasAPI: false, trustScore: 82,
    categories: ["goods"],
    regions: ["vietnam"],
    strengths: ["Vietnam SME", "rural reach", "local brands"],
    searchPattern: "{query} sendo.vn",
  },

  // ── TIER 3: Specialized channels ──────────────────────────────
  ETSY: {
    name: "Etsy", url: "https://www.etsy.com",
    apiDocs: "https://developers.etsy.com",
    hasSKU: true, hasAPI: true, trustScore: 87,
    categories: ["goods", "digital", "nft"],
    regions: ["us", "eu", "global"],
    strengths: ["Handmade/unique", "digital downloads", "niche creative"],
    searchPattern: "{query} etsy bestseller handmade",
  },
  OPENSEA: {
    name: "OpenSea", url: "https://opensea.io",
    apiDocs: "https://docs.opensea.io/reference/api-overview",
    hasSKU: true, hasAPI: true, trustScore: 88,
    categories: ["nft", "digital"],
    regions: ["global"],
    strengths: ["NFT #1", "on-chain verified", "floor price data", "volume stats"],
    searchPattern: "{query} opensea NFT floor price volume",
  },
  MAGIC_EDEN: {
    name: "Magic Eden", url: "https://magiceden.io",
    apiDocs: "https://api.magiceden.dev",
    hasSKU: true, hasAPI: true, trustScore: 85,
    categories: ["nft", "digital"],
    regions: ["global"],
    strengths: ["Solana NFT leader", "cross-chain", "launchpad"],
    searchPattern: "{query} magic eden trending NFT collection",
  },
  FAIRE: {
    name: "Faire (B2B Wholesale)", url: "https://www.faire.com",
    apiDocs: "https://faire.com/api",
    hasSKU: true, hasAPI: true, trustScore: 90,
    categories: ["goods", "cross_border"],
    regions: ["us", "eu"],
    strengths: ["Independent brands", "net 60 terms", "curated wholesale"],
    searchPattern: "{query} faire wholesale independent brand",
  },
  GLOBAL_SOURCES: {
    name: "Global Sources", url: "https://www.globalsources.com",
    apiDocs: null,
    hasSKU: true, hasAPI: false, trustScore: 88,
    categories: ["goods", "manufacturing", "cross_border"],
    regions: ["asia", "global"],
    strengths: ["Verified manufacturers", "trade-show vetted", "electronics focus"],
    searchPattern: "{query} global sources verified manufacturer",
  },
  THOMASNET: {
    name: "ThomasNet", url: "https://www.thomasnet.com",
    apiDocs: "https://www.thomasnet.com/api",
    hasSKU: true, hasAPI: true, trustScore: 92,
    categories: ["manufacturing", "cross_border", "goods"],
    regions: ["us"],
    strengths: ["US industrial suppliers", "certified manufacturers", "RFQ"],
    searchPattern: "{query} thomasnet certified US supplier",
  },
  RAKUTEN: {
    name: "Rakuten", url: "https://global.rakuten.com",
    apiDocs: "https://webservice.rakuten.co.jp",
    hasSKU: true, hasAPI: true, trustScore: 89,
    categories: ["goods", "cross_border"],
    regions: ["japan", "global"],
    strengths: ["Japan market", "authentic Japanese goods", "loyalty data"],
    searchPattern: "{query} rakuten japan popular",
  },
  REAL_ESTATE_PORTALS: {
    name: "Realtor / Zillow / PropertyGuru",
    url: "https://www.realtor.com",
    apiDocs: "https://www.zillow.com/howto/api",
    hasSKU: false, hasAPI: true, trustScore: 93,
    categories: ["real_estate"],
    regions: ["global"],
    strengths: ["Property listings", "price history", "yield data", "verified agents"],
    searchPattern: "{query} real estate investment ROI yield 2025",
  },
};

// ─── 2. CATEGORY → CHANNEL MAPPING ──────────────────────────────
export const CATEGORY_CHANNEL_MAP = {
  real_estate:   ["REAL_ESTATE_PORTALS", "GOOGLE_SHOPPING"],
  goods:         ["ALIBABA", "ALIBABA_1688", "ALIEXPRESS", "SHOPIFY_DSERS",
                  "AMAZON", "SHOPEE", "LAZADA", "TIKI", "GOOGLE_SHOPPING"],
  nft:           ["OPENSEA", "MAGIC_EDEN", "EBAY", "ETSY"],
  digital:       ["ETSY", "AMAZON", "OPENSEA", "SHOPEE", "TIKI"],
  cross_border:  ["ALIBABA", "ALIBABA_1688", "GLOBAL_SOURCES", "THOMASNET",
                  "FAIRE", "LAZADA", "RAKUTEN"],
  manufacturing: ["ALIBABA", "ALIBABA_1688", "GLOBAL_SOURCES", "THOMASNET"],
};

// ─── 3. SYSTEM PROMPT ────────────────────────────────────────────
export const PRODUCT_SOURCING_PROMPT = `
You are ORINA SOURCING ADVISOR — a specialized AI for sellers on ORINA Marketplace
to discover products and trusted suppliers globally.

You are activated when a seller taps the prompt chip: "🔍 Tìm sản phẩm để bán"
Your mission: search the web, surface the best matching products from trusted global
suppliers, evaluate supplier credibility, match results to the seller's profile,
and present findings as clean product cards.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## IDENTITY & SCOPE
- You operate exclusively in product sourcing and discovery mode.
- You do NOT handle orders, disputes, or store management.
- You speak the seller's language — auto-detected, 26 languages supported.
- You are proactive: if query is vague, infer intent from [SELLER_PROFILE].

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⚡ KA() — SILENT CHECK BEFORE EVERY RESPONSE

  [1] SOURCE GROUNDING
      "Is every product card backed by a real web search result or known source?"
      → YES → proceed.
      → NO  → mark [ESTIMATED] or skip. Never invent products, prices, or ratings.

  [2] SUPPLIER CREDIBILITY CHECK
      "Have I verified supplier trust signals before recommending?"
      → Check: years active · reviews · verified badge · API availability
      → Unverifiable → flag ⚠️, show with caveat, do not hide from seller.

  [3] PROFILE FIT CHECK
      "Does this product match THIS seller's categories, price range, and buyers?"
      → Cross-check [SELLER_PROFILE] before ranking.
      → Prioritize fit over raw popularity.

  [4] TRENDING VALIDATION
      "Is the 'trending' claim backed by data?"
      → YES → cite source: "Amazon Best Seller #3 in Electronics"
      → NO  → remove trending badge. Do not claim trending without evidence.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SEARCH STRATEGY

### Step 1 — Profile-aware channel selection
Read [SELLER_PROFILE] and [SEARCH_CONFIG] injected before the query.
Select up to 5 channels based on:
- seller's store_categories → CATEGORY_CHANNEL_MAP
- buyer_base_regions → prioritize regional channels
- avg_listing_price → filter appropriate supplier tiers

### Step 2 — Multi-channel web search
Run web searches across selected channels using these patterns:
  Goods:        "{query} supplier wholesale best seller 2025"
  Trending:     "{query} trending product 2025 sales rank"
  Real estate:  "{query} property investment yield ROI 2025"
  NFT/Digital:  "{query} NFT collection floor price volume"
  Cross-border: "{query} verified manufacturer export MOQ"
  Vietnam:      "{query} bán chạy nhập hàng 2025"

Always run at least one trending search to surface hot products.

### Step 3 — Extract per product:
For each result, identify:
  • Product name (original language + translation if needed)
  • Supplier name + platform channel
  • Price range (unit price / MOQ / dropship price)
  • Product image URL (thumbnail for display)
  • Short link (condensed, readable — NOT raw 200-char URLs)
  • Key specs: 2–3 bullet points only
  • Trending signal: sales rank, review velocity, or platform badge
  • Seller profile fit: 1–5 ⭐ based on category + price + region match

### Step 4 — Supplier credibility rating:
  ✅ Highly Trusted  (85–100): verified badge + years active + high reviews + API
  🟡 Trusted         (70–84):  good reviews, active, minor gaps
  ⚠️ Verify First    (50–69):  limited history, low reviews
  🔴 Caution         (<50):    unverified, flagged history

### Step 5 — Layout selection (AI decides by count + category):
  ≤ 3 results              → List view (vertical, detailed)
  4–6 results, 1 category  → Grid 2-col
  4–6 results, mixed cats  → Grouped by category section
  7–12 results             → Grid 3-col compact cards
  (Never exceed 12 cards)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## OUTPUT FORMAT

### 1. Pre-search header (always first):
  🔍 Đang tìm kiếm "[query]" trên [N] kênh...
  Kênh: [Channel 1] · [Channel 2] · [Channel 3]...

### 2. Product card (repeat per result):
  ─────────────────────────────────────
  🖼️ [product thumbnail — small, inline]
  **[Product Name]** · [Channel]
  [TRUST BADGE]
  💰 [Price range]
  • [Spec 1]
  • [Spec 2]
  📈 [Trending signal — only if verified]
  ⭐ Độ phù hợp: [X]/5 — [reason]
  🔗 [short readable link]
  ─────────────────────────────────────

### 3. Category section headers (when grouped):
  ## 🏆 Nổi bật / Bán chạy
  ## 🌏 Nhà cung cấp toàn cầu (B2B)
  ## 🇻🇳 Kênh Việt Nam
  ## 🖼️ NFT / Digital Assets
  ## 🏠 Bất động sản

### 4. Summary footer (always last):
  📊 Tìm thấy [N] sản phẩm từ [M] kênh
  🏆 Phù hợp nhất với store của bạn: [top pick + 1-line reason]
  💡 Gợi ý: [one actionable sourcing tip from seller profile data]
  🔄 Muốn tìm thêm? Gõ từ khóa cụ thể hơn hoặc chọn kênh ưu tiên.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SELLER PROFILE FIT SCORING (internal)

  Category match    → same as seller's top categories     → +2⭐
  Price range fit   → within ±30% of avg listing price   → +1⭐
  Regional demand   → strong in seller's buyer regions    → +1⭐
  Trending + region → trending in seller's target market → +1⭐
  Max: 5⭐ · Min: 1⭐ (low fit still shown, flagged)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## INJECTED CONTEXT (auto-injected before every query)

[SELLER_PROFILE]
seller_id, display_name, store_categories, top_products,
avg_listing_price (USD), buyer_base_regions, trust_score
[/SELLER_PROFILE]

[SEARCH_CONFIG]
selected_channels, channel_names, query
[/SEARCH_CONFIG]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## LANGUAGE RULES
- Respond in seller's detected language.
- Product names: original + [translation] if in different language.
- Prices: USD equivalent + local currency if known.
- Channel names: always English (brand names).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## HARD GUARDRAILS
- Never invent product specs, prices, images, or supplier ratings.
- Never show trust score < 50 without explicit 🔴 Caution warning.
- Never promise stock availability — always link to source.
- Never fabricate trending claims — cite data or remove badge.
- No results from web search → say so, suggest refined query.
- Max 12 cards per response.
- Competitor pricing data → market data only, no strategic advice.
`;

// ─── 4. KA() — SOURCING EDITION ─────────────────────────────────
/**
 * KA: validates product results before card generation.
 *
 * @param {Array}  results        - Raw search results
 * @param {Object} sellerProfile  - For fit context
 * @returns {{ pass, flags, filteredResults }}
 */
export function KA(results = [], sellerProfile = {}) {
  const flags           = [];
  const filteredResults = [];

  for (const r of results) {
    // [1] Must have valid URL
    if (!r.url?.startsWith("http")) {
      flags.push(`[KA-FAIL] Invalid URL for "${r.title}" — dropped`);
      continue;
    }
    // [2] Trending badge requires source
    if (r.trending && !r.trendingSource) {
      r.trending = false;
      flags.push(`[KA-WARN] Trending badge removed from "${r.title}" — no source`);
    }
    // [3] Low trust supplier
    if ((r.supplierTrustScore || 100) < 50) {
      r.trustLabel = "🔴 Caution";
      flags.push(`[KA-WARN] Low trust supplier: "${r.supplierName}" — flagged`);
    }
    // [4] No price
    if (!r.price && !r.priceRange) {
      r.priceRange = "Liên hệ nhà cung cấp";
      flags.push(`[KA-WARN] No price for "${r.title}" — set to contact`);
    }
    filteredResults.push(r);
  }

  return {
    pass: !flags.some(f => f.includes("FAIL")),
    flags,
    filteredResults,
  };
}

// ─── 5. SUPPLIER TRUST SCORER ───────────────────────────────────
export function scoreSupplierTrust(supplierData) {
  const ch    = SUPPLIER_CHANNELS[supplierData.channelKey?.toUpperCase()];
  let score   = 0;

  score += ch ? (ch.trustScore / 100) * 30 : 15;                         // registry (30)
  score += Math.min(25, (supplierData.yearsActive || 0) / 10 * 15
           + (supplierData.responseRate >= 90 ? 5 : 0)
           + (supplierData.verified ? 5 : 0));                            // activity (25)
  score += ((supplierData.rating || 0) / 5) * 15
           + Math.min(10, (supplierData.reviewCount || 0) / 1000 * 10);  // product (25)
  score += (ch?.hasAPI ? 8 : 0) + (ch?.hasSKU ? 7 : 0)
           + (supplierData.dropship ? 5 : 0);                            // tech (20)

  const final = Math.min(100, Math.round(score));
  return {
    score: final,
    label: final >= 85 ? "✅ Highly Trusted"
         : final >= 70 ? "🟡 Trusted"
         : final >= 50 ? "⚠️ Verify First"
         :               "🔴 Caution",
  };
}

// ─── 6. PROFILE FIT SCORER ──────────────────────────────────────
export function scoreProfileFit(product, sellerProfile) {
  let score     = 0;
  const reasons = [];

  if ((sellerProfile.store_categories || []).includes(product.category)) {
    score += 2; reasons.push(`Đúng danh mục ${product.category}`);
  }
  const avg   = sellerProfile.avg_listing_price || 0;
  const ratio = avg > 0 && product.unitPrice ? product.unitPrice / avg : null;
  if (ratio && ratio >= 0.7 && ratio <= 1.3) {
    score += 1; reasons.push("Phù hợp tầm giá của bạn");
  }
  const regionMatch = (sellerProfile.buyer_base_regions || [])
    .some(r => (product.strongRegions || []).includes(r));
  if (regionMatch) {
    score += 1; reasons.push("Nhu cầu cao ở khu vực mua hàng của bạn");
  }
  if (product.trending && regionMatch) {
    score += 1; reasons.push("Đang trending tại thị trường mục tiêu");
  }

  const s = Math.max(1, Math.min(5, score));
  return { score: s, stars: "⭐".repeat(s) + "☆".repeat(5 - s), reasons };
}

// ─── 7. URL CONDENSER ───────────────────────────────────────────
export function shortenURL(url, maxLen = 42) {
  try {
    const u      = new URL(url);
    const domain = u.hostname.replace("www.", "");
    const path   = u.pathname.replace(/\/$/, "").slice(0, 22);
    const s      = `${domain}${path}`;
    return s.length > maxLen ? s.slice(0, maxLen - 1) + "…" : s;
  } catch { return url.slice(0, maxLen); }
}

// ─── 8. LAYOUT SELECTOR ─────────────────────────────────────────
export function selectLayout(results) {
  const count  = results.length;
  const cats   = [...new Set(results.map(r => r.category))];
  if (count <= 3)                    return "list";
  if (count <= 6 && cats.length <= 2) return "grid2";
  if (count <= 6 && cats.length > 2)  return "grouped";
  return "grid3";
}

// ─── 9. MAIN ORCHESTRATOR ───────────────────────────────────────
/**
 * Full sourcing pipeline.
 * Seller query + profile → channel selection → Claude + web_search
 * → KA validation → formatted product cards.
 *
 * @param {string}  sellerQuery   - Seller's product search query
 * @param {Object}  sellerProfile - Seller's store profile
 * @param {string}  anthropicKey  - Anthropic API key
 * @param {Array}   history       - Chat history
 * @returns {Promise<Object>}     - { answer, channelsSearched }
 */
export async function runProductSourcing(
  sellerQuery, sellerProfile, anthropicKey, history = []
) {
  // Select channels by seller categories (max 5)
  const cats        = sellerProfile.store_categories || ["goods"];
  const channelKeys = [...new Set(
    cats.flatMap(c => CATEGORY_CHANNEL_MAP[c] || [])
  )].slice(0, 5);
  const channelNames = channelKeys.map(k => SUPPLIER_CHANNELS[k]?.name || k).join(" · ");

  // Build context injection
  const ctx = `
[SELLER_PROFILE]
seller_id: ${sellerProfile.seller_id}
display_name: ${sellerProfile.display_name}
store_categories: ${JSON.stringify(cats)}
top_products: ${JSON.stringify(sellerProfile.top_products || [])}
avg_listing_price: ${sellerProfile.avg_listing_price || "unknown"} USD
buyer_base_regions: ${JSON.stringify(sellerProfile.buyer_base_regions || [])}
trust_score: ${sellerProfile.trust_score}
[/SELLER_PROFILE]

[SEARCH_CONFIG]
selected_channels: ${JSON.stringify(channelKeys)}
channel_names: ${channelNames}
query: ${sellerQuery}
[/SEARCH_CONFIG]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: PRODUCT_SOURCING_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        ...history,
        { role: "user", content: `${ctx}\n\nSeller query: ${sellerQuery}` },
      ],
    }),
  });

  const data   = await res.json();
  const answer = data.content
    ?.filter(b => b.type === "text")
    ?.map(b => b.text)
    ?.join("\n") ?? "";

  return { answer, channelsSearched: channelKeys };
}

// ─── 10. PROMPT CHIP CONFIG ──────────────────────────────────────
export const SOURCING_PROMPT_CHIP = {
  id:    "product_sourcing",
  mode:  "product_sourcing",
  icon:  "search",
  color: "amber",
  labelI18n: {
    vi: "🔍 Tìm sản phẩm để bán",
    en: "🔍 Find products to sell",
    zh: "🔍 查找要销售的产品",
    ja: "🔍 販売する商品を探す",
    ko: "🔍 판매할 제품 찾기",
    ar: "🔍 ابحث عن منتجات للبيع",
    es: "🔍 Buscar productos para vender",
    fr: "🔍 Trouver des produits à vendre",
    th: "🔍 ค้นหาสินค้าเพื่อขาย",
    id: "🔍 Temukan produk untuk dijual",
  },
  placeholder: "Nhập sản phẩm muốn tìm... (vd: đèn LED, túi da, NFT art, villa)",
  onTap: (sellerProfile) => {
    const hints = {
      real_estate:   "Tìm bất động sản đầu tư sinh lời cao",
      goods:         "Tìm sản phẩm bán chạy để nhập hàng",
      nft:           "Tìm NFT collection có volume tốt",
      cross_border:  "Tìm nhà cung cấp xuất khẩu uy tín",
      manufacturing: "Tìm nhà sản xuất OEM giá tốt",
    };
    const top = sellerProfile.store_categories?.[0];
    return hints[top] || "Tìm sản phẩm phù hợp để bán trên ORINA";
  },
};

// ─── 11. FULL MODE ROUTER (all 5 modes) ─────────────────────────
/**
 * Central router — maps session context to the correct system prompt.
 * All modes share one Claude Sonnet endpoint.
 *
 * @param {string} mode    - Session context string
 * @param {Object} payload - { sellerProfile?, messages, ... }
 * @returns {Object}       - Full Anthropic API body
 */
export function routeToMode(mode, payload) {
  // Import other prompts in your actual app
  const PROMPTS = {
    general:          "[ORINA_SYSTEM_PROMPT]",         // orina_system_prompt.js
    seller_advisor:   "[STORE_ADVISOR_PROMPT]",         // orina_store_advisor_standalone.js
    seller_agent:     "[buildSellerAgentPrompt()]",     // orina_seller_agent.js
    arbitration:      "[ARBITRATION_SYSTEM_PROMPT]",    // orina_arbitration_prompt.js
    product_sourcing: PRODUCT_SOURCING_PROMPT,          // this file ← active
  };

  const systemPrompt = PROMPTS[mode];
  if (!systemPrompt) throw new Error(`Unknown mode: ${mode}`);

  return {
    model:      "claude-sonnet-4-20250514",
    max_tokens: mode === "arbitration" || mode === "product_sourcing" ? 2000 : 1000,
    system:     systemPrompt,
    tools:      mode === "product_sourcing"
                  ? [{ type: "web_search_20250305", name: "web_search" }]
                  : undefined,
    messages: payload.messages,
  };
}

/*
─── USAGE ────────────────────────────────────────────────────────

import { runProductSourcing, SOURCING_PROMPT_CHIP } from "./orina_product_sourcing.js";

const sellerProfile = {
  seller_id:           "SELLER-001",
  display_name:        "Nguyen Van A",
  store_categories:    ["goods", "cross_border"],
  top_products:        ["đèn LED", "túi da handmade"],
  avg_listing_price:   45,
  buyer_base_regions:  ["vietnam", "sea"],
  trust_score:         82,
};

// Seller taps chip → types query
const { answer } = await runProductSourcing(
  "đèn LED bán chạy nhập từ Trung Quốc",
  sellerProfile,
  process.env.ANTHROPIC_API_KEY
);
console.log(answer);

// Session router (full 5-mode system):
// "general"          → ORINA AI general       (orina_system_prompt.js)
// "seller_advisor"   → Store Advisor           (orina_store_advisor_standalone.js)
// "seller_agent"     → Seller AI Agent         (orina_seller_agent.js)
// "arbitration"      → Arbitration AI          (orina_arbitration_prompt.js)
// "product_sourcing" → Product Sourcing AI     (orina_product_sourcing.js) ← THIS
*/