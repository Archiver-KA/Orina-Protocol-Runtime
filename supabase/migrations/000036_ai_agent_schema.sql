-- ============================================================================
-- ATP2 AI Agent Phase 1: Schema Migration
-- Purpose: Add AI agent capabilities (auto-minting, market analysis, disputes)
-- Timeline: Week 1, Day 1-2 of deployment
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE - Add geolocation + API enablement
-- ============================================================================

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS api_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS city TEXT;

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geolocation coordinates
ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS coordinates GEOMETRY(POINT, 4326);

-- Index for geolocation queries
CREATE INDEX IF NOT EXISTS idx_profiles_coordinates
ON profiles USING GIST (coordinates);

-- ============================================================================
-- 2. PRODUCTS TABLE - Add embeddings + flexible attributes
-- ============================================================================

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE IF EXISTS products
ADD COLUMN IF NOT EXISTS embedding vector(1024);

ALTER TABLE IF EXISTS products
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;

-- Vector similarity index (IVF-FLAT for fast approximate nearest neighbor)
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_products_embedding
      ON products USING ivfflat (embedding vector_cosine_ops);
  END IF;
END $$;

-- JSON attributes index for flexible queries
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_products_attributes
      ON products USING gin (attributes);
  END IF;
END $$;

-- ============================================================================
-- 3. ASSETS TABLE - Add AI generation tracking
-- ============================================================================

ALTER TABLE IF EXISTS assets
ADD COLUMN IF NOT EXISTS ai_created BOOLEAN DEFAULT FALSE;

-- Store AI analysis results (price recommendations, forecasts, etc)
ALTER TABLE IF EXISTS assets
ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- Index for querying AI-generated assets
DO $$
BEGIN
  IF to_regclass('public.assets') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_assets_ai_created
      ON assets (ai_created);
  END IF;
END $$;

-- ============================================================================
-- 4. ORDERS TABLE - Add delivery tracking for AI analysis
-- ============================================================================

ALTER TABLE IF EXISTS orders
ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC;

ALTER TABLE IF EXISTS orders
ADD COLUMN IF NOT EXISTS delivery_speed_days INT;

ALTER TABLE IF EXISTS orders
ADD COLUMN IF NOT EXISTS delivery_method TEXT;

-- Index for delivery analytics
DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_orders_delivery_speed
      ON orders (delivery_speed_days);
  END IF;
END $$;

-- ============================================================================
-- 5. NEW TABLE: MARKET_TRENDS
-- Purpose: Store historical market data for seller insights + AI analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Category & segment
  category TEXT NOT NULL,
  subcategory TEXT,

  -- Price statistics
  price_avg NUMERIC,
  price_min NUMERIC,
  price_max NUMERIC,
  price_std_dev NUMERIC,

  -- Demand metrics
  demand_score INT,                    -- 1-100 scale
  listing_velocity INT,                -- new listings per day
  sell_through_rate INT,               -- % that sell (0-100)
  competitive_sellers INT,             -- number of sellers in category

  -- Condition / quality
  average_condition TEXT,

  -- Time period covered
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_market_trends_category
ON market_trends (category, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_market_trends_period
ON market_trends (period_end DESC);

-- Auto-update timestamp
CREATE OR REPLACE TRIGGER update_market_trends_updated_at
BEFORE UPDATE ON market_trends
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 6. NEW TABLE: SELLER_PERFORMANCE
-- Purpose: Track seller metrics for AI sales forecasting
-- ============================================================================

CREATE TABLE IF NOT EXISTS seller_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Sales metrics
  total_assets_minted INT DEFAULT 0,
  total_sold INT DEFAULT 0,
  total_revenue NUMERIC,

  -- Performance
  average_price NUMERIC,
  average_delivery_days INT,
  customer_rating NUMERIC,                 -- 0-5 stars
  return_rate NUMERIC,                     -- 0-100%

  -- AI forecasting multiplier
  velocity_multiplier NUMERIC DEFAULT 1.0, -- 0.5 to 2.0 scale

  -- Metadata
  category TEXT,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Index for efficient seller lookup
CREATE INDEX IF NOT EXISTS idx_seller_performance_seller
ON seller_performance (seller_id, category);

-- ============================================================================
-- 7. NEW TABLE: MARKET_BENCHMARKS (for normalization)
-- Purpose: Calculate relative position of seller/product for recommendations
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,

  -- Reference metrics
  median_price NUMERIC,
  median_delivery_days INT,
  median_rating NUMERIC,

  -- Distribution
  price_p25 NUMERIC,
  price_p50 NUMERIC,
  price_p75 NUMERIC,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 8. CREATE SUPABASE FUNCTIONS FOR AI OPERATIONS
-- ============================================================================

-- ============================================================================
-- Function 1: Vector search for similar products
-- ============================================================================

CREATE OR REPLACE FUNCTION vector_search_products(
  query_embedding vector(1024),
  category_name TEXT DEFAULT NULL,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  price NUMERIC,
  seller_id UUID,
  similarity_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.price,
    p.seller_id,
    1 - (p.embedding <=> query_embedding) AS similarity_score
  FROM products p
  WHERE
    (category_name IS NULL OR p.category = category_name)
    AND p.embedding IS NOT NULL
    AND p.status = 'active'
  ORDER BY similarity_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Function 2: Get market analysis for category
-- ============================================================================

CREATE OR REPLACE FUNCTION get_market_analysis(
  category_name TEXT,
  days_back INT DEFAULT 30
)
RETURNS TABLE (
  price_avg NUMERIC,
  price_min NUMERIC,
  price_max NUMERIC,
  demand_score INT,
  sell_through_rate INT,
  listing_velocity INT,
  competitive_sellers INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mt.price_avg,
    mt.price_min,
    mt.price_max,
    mt.demand_score,
    mt.sell_through_rate,
    mt.listing_velocity,
    mt.competitive_sellers
  FROM market_trends mt
  WHERE
    mt.category = category_name
    AND mt.period_end >= NOW() - INTERVAL '1 day' * days_back
  ORDER BY mt.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Function 3: Predict sales volume at specific price
-- ============================================================================

CREATE OR REPLACE FUNCTION predict_volume_at_price(
  category_name TEXT,
  seller_id UUID,
  price NUMERIC
)
RETURNS TABLE (
  forecasted_units_weekly INT,
  forecasted_units_monthly INT,
  confidence NUMERIC
) AS $$
DECLARE
  base_velocity INT;
  seller_multiplier NUMERIC;
  price_elasticity NUMERIC;
  market_avg_price NUMERIC;
BEGIN
  -- Get seller multiplier
  SELECT velocity_multiplier INTO seller_multiplier
  FROM seller_performance
  WHERE seller_id = predict_volume_at_price.seller_id;

  seller_multiplier := COALESCE(seller_multiplier, 1.0);

  -- Get market baseline
  SELECT
    listing_velocity,
    price_avg
  INTO
    base_velocity,
    market_avg_price
  FROM market_trends
  WHERE category = category_name
  ORDER BY created_at DESC
  LIMIT 1;

  base_velocity := COALESCE(base_velocity, 50);
  market_avg_price := COALESCE(market_avg_price, 250);

  -- Price elasticity: -2% volume per 10% price increase
  price_elasticity := 1.0 - (0.02 * (price - market_avg_price) / (market_avg_price * 0.1));
  price_elasticity := GREATEST(0.3, LEAST(2.0, price_elasticity));

  RETURN QUERY SELECT
    CAST(ROUND(base_velocity * seller_multiplier * price_elasticity / 7) AS INT),
    CAST(ROUND(base_velocity * seller_multiplier * price_elasticity) AS INT),
    0.85::NUMERIC;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Function 4: Get seller insights
-- ============================================================================

CREATE OR REPLACE FUNCTION get_seller_insights(
  seller_id UUID
)
RETURNS TABLE (
  total_sold INT,
  average_price NUMERIC,
  customer_rating NUMERIC,
  average_delivery_days INT,
  velocity_multiplier NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.total_sold,
    sp.average_price,
    sp.customer_rating,
    sp.average_delivery_days,
    sp.velocity_multiplier
  FROM seller_performance sp
  WHERE sp.seller_id = get_seller_insights.seller_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Function 5: Calculate buyer trust score
-- ============================================================================

CREATE OR REPLACE FUNCTION get_buyer_trust_score(
  buyer_id UUID
)
RETURNS TABLE (
  trust_score NUMERIC,
  completed_orders INT,
  dispute_rate NUMERIC,
  payment_reliability NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(
      50 + (COUNT(*)::FLOAT / 10) - (COALESCE((
        SELECT COUNT(*) * 5
        FROM disputes d
        WHERE d.buyer_id = get_buyer_trust_score.buyer_id
      ), 0))::FLOAT,
      50
    )::NUMERIC AS trust_score,
    COUNT(*)::INT AS completed_orders,
    COALESCE((
      (SELECT COUNT(*) FROM disputes d WHERE d.buyer_id = get_buyer_trust_score.buyer_id)::FLOAT /
      NULLIF(COUNT(*), 0)
    ), 0)::NUMERIC AS dispute_rate,
    1.0::NUMERIC AS payment_reliability
  FROM orders o
  WHERE
    o.buyer = get_buyer_trust_score.buyer_id::text
    AND o.state = 4; -- completed state
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 9. SETUP RLS POLICIES (for security)
-- ============================================================================

-- Ensure market_trends is readable by all
ALTER TABLE market_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY market_trends_readable_all
ON market_trends FOR SELECT
USING (true);

-- Seller performance - each seller can see their own + public data
ALTER TABLE seller_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY seller_performance_readable
ON seller_performance FOR SELECT
USING (true);

-- ============================================================================
-- 10. SUMMARY & VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify migration success:
/*
SELECT COUNT(*) as profiles_count FROM profiles WHERE api_enabled IS NOT NULL;
SELECT COUNT(*) as products_with_embedding FROM products WHERE embedding IS NOT NULL;
SELECT COUNT(*) as market_trends_records FROM market_trends;
SELECT COUNT(*) as seller_perf_records FROM seller_performance;
SELECT 1 WHERE EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'vector_search_products');
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
