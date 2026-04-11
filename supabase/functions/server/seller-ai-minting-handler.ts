import { Context, Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";
import { callNvidiaNIM, parseJSONFromLLM, callNvidiaNIMEmbedding, callNvidiaNIMVision } from "./nvidia-nim-client.ts";
import { normalizeListingTaxonomy } from "./taxonomy-normalizer.ts";
import { assertAuthenticatedWalletMatch, requireAuthenticatedWallet } from "./request-auth.ts";

const sellerMintingRouter = new Hono();

interface GeneratedDraft {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  attributes: Record<string, string>;
  imageUrls: string[];
  estimatedPrice: {
    min: number;
    suggested: number;
    max: number;
    currency: string;
  };
  aiGenerated: boolean;
  confidence: number;
}

// Get Supabase client from environment
function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(url, serviceKey);
}

type SellerAuthResult =
  | { ok: true; sellerId: string }
  | { ok: false; response: Response };

async function requireAuthenticatedSeller(
  c: Context,
  candidateSellerId: string | null | undefined,
  fieldName = "sellerId",
): Promise<SellerAuthResult> {
  const auth = await requireAuthenticatedWallet(c);
  if (!auth.ok) return auth;

  const mismatch = assertAuthenticatedWalletMatch(c, auth.identity, candidateSellerId, fieldName);
  if (mismatch) {
    return { ok: false, response: mismatch };
  }

  return { ok: true, sellerId: auth.identity.walletAddress };
}

// ============================================================================
// Seller Minting Configuration
// ============================================================================

sellerMintingRouter.get("/config/:sellerId", async (c) => {
  try {
    const sellerAuth = await requireAuthenticatedSeller(c, c.req.param("sellerId"));
    if (!sellerAuth.ok) return sellerAuth.response;
    const sellerId = sellerAuth.sellerId;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("seller_minting_config")
      .select("*")
      .eq("seller_id", sellerId)
      .single();

    if (error && error.code === "PGRST116") {
      // Not found - return 404
      return c.json({ error: "Config not found" }, 404);
    }

    if (error) throw error;

    return c.json({ success: true, config: data });
  } catch (error) {
    console.error("Error fetching seller minting config:", error);
    return c.json({ error: "Failed to fetch config" }, 500);
  }
});

sellerMintingRouter.post("/config", async (c) => {
  try {
    const body = await c.req.json();
    const {
      sellerId,
      enabled,
      autoAnalyzeEnabled,
      minPriceUsd,
      maxPriceUsd,
      category,
    } = body;

    const sellerAuth = await requireAuthenticatedSeller(c, sellerId);
    if (!sellerAuth.ok) return sellerAuth.response;
    const resolvedSellerId = sellerAuth.sellerId;

    const supabase = getSupabaseClient();

    // Check if config exists
    const { data: existing } = await supabase
      .from("seller_minting_config")
      .select("id")
      .eq("seller_id", resolvedSellerId)
      .single();

    let result;
    if (existing) {
      // Update
      result = await supabase
        .from("seller_minting_config")
        .update({
          enabled,
          auto_analyze_enabled: autoAnalyzeEnabled,
          min_price_usd: minPriceUsd,
          max_price_usd: maxPriceUsd,
          category,
          updated_at: new Date().toISOString(),
        })
        .eq("seller_id", resolvedSellerId)
        .select()
        .single();
    } else {
      // Create
      result = await supabase
        .from("seller_minting_config")
        .insert({
          seller_id: resolvedSellerId,
          enabled,
          auto_analyze_enabled: autoAnalyzeEnabled,
          min_price_usd: minPriceUsd,
          max_price_usd: maxPriceUsd,
          category,
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return c.json({ success: true, config: result.data });
  } catch (error) {
    console.error("Error updating seller minting config:", error);
    return c.json({ error: "Failed to update config" }, 500);
  }
});

// ============================================================================
// Store Advisor Configuration
// ============================================================================

sellerMintingRouter.get("/advisor/:sellerId", async (c) => {
  try {
    const sellerAuth = await requireAuthenticatedSeller(c, c.req.param("sellerId"));
    if (!sellerAuth.ok) return sellerAuth.response;
    const sellerId = sellerAuth.sellerId;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("store_advisor_config")
      .select("*")
      .eq("seller_id", sellerId)
      .single();

    if (error && error.code === "PGRST116") {
      return c.json({ error: "Config not found" }, 404);
    }
    if (error) throw error;

    return c.json({ success: true, config: data });
  } catch (error) {
    console.error("Error fetching store advisor config:", error);
    return c.json({ error: "Failed to fetch config" }, 500);
  }
});

sellerMintingRouter.post("/advisor", async (c) => {
  try {
    const body = await c.req.json();
    const {
      sellerId,
      enabled,
      storeName,
      behavior,
      autoReply,
      greeting,
      negotiationPolicy,
      preferredLang,
    } = body;

    const sellerAuth = await requireAuthenticatedSeller(c, sellerId);
    if (!sellerAuth.ok) return sellerAuth.response;
    const resolvedSellerId = sellerAuth.sellerId;

    const validBehaviors = ["conservative", "moderate", "proactive"];
    if (behavior && !validBehaviors.includes(behavior)) {
      return c.json({ error: `behavior must be one of: ${validBehaviors.join(", ")}` }, 400);
    }

    const supabase = getSupabaseClient();

    const { data: existing } = await supabase
      .from("store_advisor_config")
      .select("id")
      .eq("seller_id", resolvedSellerId)
      .single();

    const payload = {
      enabled: enabled ?? false,
      store_name: storeName || null,
      behavior: behavior || "moderate",
      auto_reply: autoReply ?? true,
      greeting: greeting || null,
      negotiation_policy: negotiationPolicy || null,
      preferred_lang: preferredLang || "en",
    };

    let result;
    if (existing) {
      result = await supabase
        .from("store_advisor_config")
        .update(payload)
        .eq("seller_id", resolvedSellerId)
        .select()
        .single();
    } else {
      result = await supabase
        .from("store_advisor_config")
        .insert({ seller_id: resolvedSellerId, ...payload })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return c.json({ success: true, config: result.data });
  } catch (error) {
    console.error("Error updating store advisor config:", error);
    return c.json({ error: "Failed to update config" }, 500);
  }
});

// ============================================================================
// Generate Asset Draft (using Cloudflare AI or LLM)
// ============================================================================

sellerMintingRouter.post("/generate-draft", async (c) => {
  try {
    const body = await c.req.json();
    const {
      sellerId,
      imageUrls,
      category,
      subcategory,
      overrideName,
      overrideDescription,
    } = body;

    if (!sellerId || !imageUrls || !category) {
      return c.json(
        { error: "sellerId, imageUrls, and category required" },
        400
      );
    }

    const sellerAuth = await requireAuthenticatedSeller(c, sellerId);
    if (!sellerAuth.ok) return sellerAuth.response;

    const taxonomy = normalizeListingTaxonomy(category, subcategory);
    const canonicalCategory = taxonomy.categorySlug;
    const canonicalSubcategory = taxonomy.subcategorySlug;
    const categoryContext = taxonomy.subcategoryLabel
      ? `${taxonomy.categoryLabel} > ${taxonomy.subcategoryLabel}`
      : taxonomy.categoryLabel;

    // Try LLM-powered draft generation, fallback to template
    let draft: GeneratedDraft = buildFallbackDraft(
      canonicalCategory,
      canonicalSubcategory,
      imageUrls,
      overrideName,
      overrideDescription,
      taxonomy.categoryLabel,
      taxonomy.subcategoryLabel,
    );

    // Step 1: Analyze images with vision model
    let visionDescription = "";
    if (imageUrls.length > 0) {
      try {
        const visionResult = await callNvidiaNIMVision(
          "You are a product image analyst. Describe what you see in detail: product type, condition, color, material, brand (if visible), any defects. Be specific and factual.",
          `Analyze these product images for category: ${categoryContext}. Provide a detailed description.`,
          imageUrls,
          { maxTokens: 1024, timeoutMs: 40000 },
        );
        if (visionResult.success) {
          visionDescription = visionResult.content;
        }
      } catch (err) {
        console.warn("Vision analysis error (non-blocking):", err);
      }
    }

    // Step 2: Find similar products via vector search for pricing context
    let similarContext = "";
    const supabase = getSupabaseClient();
    try {
      const searchText = `${taxonomy.vectorSearchText} ${overrideName || ""}`.trim();
      const embResult = await callNvidiaNIMEmbedding(searchText);
      if (embResult.success) {
        const vectorStr = `[${embResult.embedding.join(",")}]`;
        const { data: similar } = await findSimilarProductsByCategoryCandidates(
          supabase,
          vectorStr,
          taxonomy.categoryQueryCandidates,
          5,
        );
        if (similar && similar.length > 0) {
          similarContext = `\nSimilar products found: ${similar.map((p: any) => `${p.product_name} (similarity: ${(p.similarity_score * 100).toFixed(0)}%)`).join(", ")}`;
        }
      }
    } catch {
      // Vector search is optional — skip silently
    }

    // Step 3: Generate draft with text LLM (enriched with vision + similar products)
    const visionContext = visionDescription
      ? `\nImage Analysis (from vision model): ${visionDescription}`
      : "\nNo image analysis available - generate based on category only.";

    const llmResult = await callNvidiaNIM(
      `You are an expert product analyst for an online marketplace. Given a product category, image analysis, and market context, generate a JSON product listing draft.
Return ONLY valid JSON with this exact structure:
{
  "name": "descriptive product name",
  "description": "compelling 2-3 sentence product description incorporating visual details",
  "attributes": { "condition": "string", "color": "string", "material": "string", "brand": "string" },
  "estimatedPrice": { "min": number, "suggested": number, "max": number, "currency": "USD" },
  "confidence": number between 0.0 and 1.0
}`,
      `Category: ${taxonomy.categoryLabel} (${canonicalCategory})${taxonomy.subcategoryLabel ? `\nSubcategory: ${taxonomy.subcategoryLabel} (${canonicalSubcategory})` : ""}${visionContext}${similarContext}\nGenerate a product listing draft.`,
      { maxTokens: 2048, reasoningEffort: "low", timeoutMs: 25000 },
    );

    if (llmResult.success) {
      const parsed = parseJSONFromLLM<{
        name?: string;
        description?: string;
        attributes?: Record<string, string>;
        estimatedPrice?: { min?: number; suggested?: number; max?: number; currency?: string };
        confidence?: number;
      }>(llmResult.content);

      if (parsed?.name && parsed?.description && parsed?.estimatedPrice) {
        draft = {
          name: overrideName || parsed.name,
          description: overrideDescription || parsed.description,
          category: canonicalCategory,
          subcategory: canonicalSubcategory,
          attributes: parsed.attributes || { condition: "good", color: "varied", material: "mixed" },
          imageUrls,
          estimatedPrice: {
            min: parsed.estimatedPrice.min || 100,
            suggested: parsed.estimatedPrice.suggested || 250,
            max: parsed.estimatedPrice.max || 500,
            currency: parsed.estimatedPrice.currency || "USD",
          },
          aiGenerated: true,
          confidence: parsed.confidence || 0.8,
        };
      }
    }

    // Get market analysis
    const { data: marketTrends } = await getLatestMarketTrendByCandidates(
      supabase,
      taxonomy.categoryQueryCandidates,
    );

    const analysis = marketTrends || {
      category: canonicalCategory,
      subcategory: canonicalSubcategory,
      price_avg: 250,
      price_min: 100,
      price_max: 500,
      priceAverage: 250,
      priceRange: { min: 100, max: 500 },
      demand_score: 75,
      competitive_sellers: 15,
      sell_through_rate: 85,
      listing_velocity: 12,
      demandScore: 75,
      competitiveSellers: 15,
      sellThroughRate: 85,
      listingVelocity: 12,
      recommendations: [
        "Price is competitive for this category",
        "High demand indicates good selling potential",
      ],
    };

    return c.json({
      success: true,
      draft,
      analysis,
    });
  } catch (error) {
    console.error("Error generating draft:", error);
    return c.json({ error: "Failed to generate draft" }, 500);
  }
});

// ============================================================================
// Market Analysis
// ============================================================================

sellerMintingRouter.get("/market-analysis", async (c) => {
  try {
    const category = c.req.query("category");
    const subcategory = c.req.query("subcategory");
    const price = c.req.query("price");
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;
    const requestedSellerId = c.req.query("sellerId");
    if (requestedSellerId) {
      const walletMismatch = assertAuthenticatedWalletMatch(c, auth.identity, requestedSellerId, "sellerId");
      if (walletMismatch) return walletMismatch;
    }
    const sellerId = auth.identity.walletAddress;

    if (!category) {
      return c.json({ error: "category required" }, 400);
    }

    const supabase = getSupabaseClient();
    const taxonomy = normalizeListingTaxonomy(category, subcategory);

    // Use deployed SQL function via RPC
    const { data: trends, error: rpcError } = await getMarketAnalysisByCategoryCandidates(
      supabase,
      taxonomy.categoryQueryCandidates,
      30,
    );

    // Default analysis if no data
    if (!trends || rpcError) {
      const analysis = {
        category: taxonomy.categorySlug,
        subcategory: taxonomy.subcategorySlug,
        priceAverage: 250,
        priceRange: { min: 100, max: 500 },
        demandScore: 50,
        competitiveSellers: 10,
        sellThroughRate: 70,
        listingVelocity: 5,
        recommendations: [
          "No historical data available",
          "Price based on general category trends",
        ],
      };
      return c.json({ success: true, analysis });
    }

    // Optional: volume forecast if price + sellerId provided
    let volumeForecast = null;
    if (price && sellerId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("wallet_address", sellerId)
        .single();

      if (profile) {
        const { data: forecast } = await predictVolumeAtPriceByCategoryCandidates(
          supabase,
          taxonomy.categoryQueryCandidates,
          profile.id,
          parseFloat(price),
        );
        volumeForecast = forecast || null;
      }
    }

    // LLM recommendations with fallback
    const recommendations = await generateLLMRecommendations(
      taxonomy.categoryLabel,
      trends,
      volumeForecast,
    );

    const analysis = {
      category: taxonomy.categorySlug,
      subcategory: taxonomy.subcategorySlug,
      priceAverage: trends.price_avg || 250,
      priceRange: {
        min: trends.price_min || 100,
        max: trends.price_max || 500,
      },
      demandScore: trends.demand_score || 50,
      competitiveSellers: trends.competitive_sellers || 10,
      sellThroughRate: trends.sell_through_rate || 70,
      listingVelocity: trends.listing_velocity || 5,
      recommendations,
      ...(volumeForecast ? { volumeForecast } : {}),
    };

    return c.json({ success: true, analysis });
  } catch (error) {
    console.error("Error fetching market analysis:", error);
    return c.json({ error: "Failed to fetch market analysis" }, 500);
  }
});

// ============================================================================
// Mint Asset
// ============================================================================

sellerMintingRouter.post("/mint-asset", async (c) => {
  try {
    const body = await c.req.json();
    const { sellerId, draft, transactionHash } = body;

    if (!sellerId || !draft || !transactionHash) {
      return c.json(
        { error: "sellerId, draft, and transactionHash required" },
        400
      );
    }

    const sellerAuth = await requireAuthenticatedSeller(c, sellerId);
    if (!sellerAuth.ok) return sellerAuth.response;
    const resolvedSellerId = sellerAuth.sellerId;

    const supabase = getSupabaseClient();
    const taxonomy = normalizeListingTaxonomy(draft.category, draft.subcategory);
    const nowIso = new Date().toISOString();
    const sellerWallet = resolvedSellerId.toLowerCase();
    const estimatedSuggestedPrice = Number(draft.estimatedPrice?.suggested || 0);
    const listingCurrency = String(draft.estimatedPrice?.currency || "USD").trim().toUpperCase() || "USD";

    // Resolve wallet address to profile UUID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("wallet_address", resolvedSellerId)
      .single();

    if (profileError || !profile) {
      return c.json({ error: "Seller profile not found" }, 404);
    }

    // Generate a unique asset_uid
    const assetUid = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Create asset record in assets_catalog
    const { data: asset, error } = await supabase
      .from("assets_catalog")
      .insert({
        asset_uid: assetUid,
        title: draft.name,
        description: draft.description,
        category: taxonomy.categorySlug,
        subcategory: taxonomy.subcategorySlug || null,
        cover_image_url: draft.imageUrls[0] || null,
        gallery_images: draft.imageUrls,
        attributes: {
          ...draft.attributes,
          estimated_price: draft.estimatedPrice,
        },
        metadata: {
          name: draft.name,
          description: draft.description,
          image: draft.imageUrls[0] || null,
          images: draft.imageUrls,
          category: taxonomy.categorySlug,
          subcategory: taxonomy.subcategorySlug || null,
          seller_wallet: sellerWallet,
          seller: {
            address: sellerWallet,
            verified: false,
          },
          price: `${estimatedSuggestedPrice || 0} ${listingCurrency}`,
          priceUSD: listingCurrency === "USD" || listingCurrency === "USDT" || listingCurrency === "USDC"
            ? `$${estimatedSuggestedPrice || 0}`
            : null,
          currency: listingCurrency,
          blockchain: "BSC",
          network: "testnet",
          views: 0,
          likes: 0,
          verified: false,
          featured: false,
          createdAt: nowIso,
          updatedAt: nowIso,
          mintedAt: nowIso,
          mintTxHash: transactionHash,
        },
        seller_user_id: profile.id,
        is_active: true,
        ai_created: true,
        ai_analysis: {
          confidence: draft.confidence,
          generatedAt: nowIso,
          transactionHash,
        },
      })
      .select()
      .single();

    if (error) throw error;

    // Generate and store embedding (best-effort, don't fail the mint)
    try {
      const embeddingText = `${draft.name} ${draft.description} ${taxonomy.categoryLabel} ${taxonomy.subcategoryLabel || ""} ${taxonomy.categorySlug} ${taxonomy.subcategorySlug || ""}`;
      const embResult = await callNvidiaNIMEmbedding(embeddingText);
      if (embResult.success) {
        const vectorStr = `[${embResult.embedding.join(",")}]`;
        await supabase
          .from("assets_catalog")
          .update({ embedding: vectorStr })
          .eq("id", asset.id);
      }
    } catch (embError) {
      console.warn("Embedding storage failed (non-blocking):", embError);
    }

    return c.json({
      success: true,
      assetId: asset.id,
      assetUid,
    });
  } catch (error) {
    console.error("Error minting asset:", error);
    return c.json({ error: "Failed to mint asset" }, 500);
  }
});

// ============================================================================
// Helpers
// ============================================================================

/** Template draft — used when LLM is unavailable or fails */
function buildFallbackDraft(
  category: string,
  subcategory: string | undefined,
  imageUrls: string[],
  overrideName?: string,
  overrideDescription?: string,
  categoryLabel?: string,
  subcategoryLabel?: string,
): GeneratedDraft {
  const displayLabel = subcategoryLabel || categoryLabel || subcategory || category;

  return {
    name: overrideName || `${displayLabel} Item ${Date.now().toString().slice(-4)}`,
    description: overrideDescription || `Beautiful ${displayLabel.toLowerCase()} with excellent condition.`,
    category,
    subcategory,
    attributes: { condition: "excellent", color: "varied", material: "premium" },
    imageUrls,
    estimatedPrice: { min: 100, suggested: 250, max: 500, currency: "USD" },
    aiGenerated: true,
    confidence: 0.75,
  };
}

/** Synchronous fallback recommendations from market data */
function generateRecommendationsFallback(trends: any): string[] {
  const recommendations: string[] = [];

  if (trends.demand_score > 75) {
    recommendations.push(
      "High demand detected - consider pricing toward upper market range"
    );
  } else if (trends.demand_score < 40) {
    recommendations.push("Low demand - price competitively");
  }

  if (trends.competitive_sellers > 50) {
    recommendations.push(
      `${trends.competitive_sellers} competitors in market - differentiate with quality`
    );
  }

  if (trends.sell_through_rate > 80) {
    recommendations.push(
      "Category has high sell-through rate - strong market"
    );
  }

  return recommendations.length > 0
    ? recommendations
    : ["Market data available for informed pricing"];
}

/** LLM-powered recommendations with fallback to rule-based */
async function generateLLMRecommendations(
  category: string,
  marketData: any,
  volumeForecast?: any,
): Promise<string[]> {
  const llmResult = await callNvidiaNIM(
    `You are a marketplace pricing advisor. Given market data for a product category, return a JSON array of 3-5 short, actionable recommendation strings for the seller. Return ONLY a JSON array of strings, no other text.`,
    `Category: ${category}
Market data: avg price $${marketData.price_avg || "N/A"}, range $${marketData.price_min || "N/A"}-$${marketData.price_max || "N/A"}, demand score ${marketData.demand_score || "N/A"}/100, ${marketData.competitive_sellers || "N/A"} competitors, ${marketData.sell_through_rate || "N/A"}% sell-through rate, listing velocity ${marketData.listing_velocity || "N/A"}/week${volumeForecast ? `\nForecast: ${volumeForecast.forecasted_units_weekly} units/week, ${volumeForecast.forecasted_units_monthly} units/month, confidence ${volumeForecast.confidence}` : ""}
Provide 3-5 actionable pricing & listing recommendations.`,
    { maxTokens: 1024, reasoningEffort: "none", timeoutMs: 15000 },
  );

  if (llmResult.success) {
    const parsed = parseJSONFromLLM<string[]>(llmResult.content);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((r) => typeof r === "string")) {
      return parsed.slice(0, 5);
    }
  }

  return generateRecommendationsFallback(marketData);
}

async function findSimilarProductsByCategoryCandidates(
  supabase: ReturnType<typeof getSupabaseClient>,
  vectorStr: string,
  categoryCandidates: string[],
  matchCount: number,
) {
  for (const categoryCandidate of categoryCandidates) {
    const { data, error } = await supabase.rpc("vector_search_products", {
      query_embedding: vectorStr,
      category_name: categoryCandidate,
      match_count: matchCount,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      return { data, matchedCategory: categoryCandidate };
    }
  }

  return { data: null, matchedCategory: null };
}

async function getLatestMarketTrendByCandidates(
  supabase: ReturnType<typeof getSupabaseClient>,
  categoryCandidates: string[],
) {
  for (const categoryCandidate of categoryCandidates) {
    const { data, error } = await supabase
      .from("market_trends")
      .select("*")
      .eq("category", categoryCandidate)
      .order("period_end", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      return { data, matchedCategory: categoryCandidate };
    }
  }

  return { data: null, matchedCategory: null };
}

async function getMarketAnalysisByCategoryCandidates(
  supabase: ReturnType<typeof getSupabaseClient>,
  categoryCandidates: string[],
  daysBack: number,
) {
  for (const categoryCandidate of categoryCandidates) {
    const { data, error } = await supabase.rpc("get_market_analysis", {
      category_name: categoryCandidate,
      days_back: daysBack,
    });

    const trend = data?.[0] || null;
    if (!error && trend) {
      return { data: trend, matchedCategory: categoryCandidate, error: null };
    }
  }

  return { data: null, matchedCategory: null, error: null };
}

async function predictVolumeAtPriceByCategoryCandidates(
  supabase: ReturnType<typeof getSupabaseClient>,
  categoryCandidates: string[],
  sellerProfileId: string,
  price: number,
) {
  for (const categoryCandidate of categoryCandidates) {
    const { data, error } = await supabase.rpc("predict_volume_at_price", {
      category_name: categoryCandidate,
      p_seller_id: sellerProfileId,
      price,
    });

    const forecast = data?.[0] || null;
    if (!error && forecast) {
      return { data: forecast, matchedCategory: categoryCandidate };
    }
  }

  return { data: null, matchedCategory: null };
}

export default sellerMintingRouter;
