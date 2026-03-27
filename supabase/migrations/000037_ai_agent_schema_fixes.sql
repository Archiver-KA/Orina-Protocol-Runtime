-- ============================================================================
-- ATP2 Migration 000037: AI Agent Schema (complete, self-contained)
-- Purpose: Add AI agent capabilities (auto-minting, market analysis, vector search)
-- Replaces deleted 000036 which had wrong table/column/function references.
-- This migration is fully standalone — no dependency on any prior AI migration.
-- ============================================================================

-- ============================================================================
-- 1. ASSETS_CATALOG — Add embedding + AI tracking columns
-- ============================================================================

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Embedding column for semantic vector search
ALTER TABLE IF EXISTS assets_catalog
ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- AI generation tracking
ALTER TABLE IF EXISTS assets_catalog
ADD COLUMN IF NOT EXISTS ai_created BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS assets_catalog
ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- HNSW index for fast approximate nearest neighbor (works on empty tables, unlike IVF-FLAT)
CREATE INDEX IF NOT EXISTS idx_assets_catalog_embedding
ON assets_catalog USING hnsw (embedding vector_cosine_ops);

-- Index for querying AI-generated assets
CREATE INDEX IF NOT EXISTS idx_assets_catalog_ai_created
ON assets_catalog (ai_created) WHERE ai_created = TRUE;

-- ============================================================================
-- 2. PROTOCOL_ORDERS — Add delivery tracking columns
-- ============================================================================

ALTER TABLE IF EXISTS protocol_orders
ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC;

ALTER TABLE IF EXISTS protocol_orders
ADD COLUMN IF NOT EXISTS delivery_speed_days INT;

ALTER TABLE IF EXISTS protocol_orders
ADD COLUMN IF NOT EXISTS delivery_method TEXT;

CREATE INDEX IF NOT EXISTS idx_protocol_orders_delivery_speed
ON protocol_orders (delivery_speed_days);

-- ============================================================================
-- 3. PROFILES — Add geolocation + API enablement
-- ============================================================================

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS api_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS coordinates GEOMETRY(POINT, 4326);

CREATE INDEX IF NOT EXISTS idx_profiles_coordinates
ON profiles USING GIST (coordinates);

-- ============================================================================
-- 4. SELLER_MINTING_CONFIG — Stores per-seller AI minting preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS seller_minting_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT FALSE,
  auto_analyze_enabled BOOLEAN DEFAULT TRUE,
  min_price_usd NUMERIC,
  max_price_usd NUMERIC,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for auto-updating timestamps (uses set_updated_at from 000001)
CREATE OR REPLACE TRIGGER update_seller_minting_config_updated_at
BEFORE UPDATE ON seller_minting_config
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE seller_minting_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY seller_minting_config_all
ON seller_minting_config FOR ALL
USING (true);

-- ============================================================================
-- 5. MARKET_TRENDS — Create table for historical market data
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  subcategory TEXT,
  price_avg NUMERIC,
  price_min NUMERIC,
  price_max NUMERIC,
  price_std_dev NUMERIC,
  demand_score INT,
  listing_velocity INT,
  sell_through_rate INT,
  competitive_sellers INT,
  average_condition TEXT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_trends_category
ON market_trends (category, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_market_trends_period
ON market_trends (period_end DESC);

CREATE OR REPLACE TRIGGER update_market_trends_updated_at
BEFORE UPDATE ON market_trends
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE market_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY market_trends_readable_all
ON market_trends FOR SELECT
USING (true);

-- ============================================================================
-- 6. SELLER_PERFORMANCE — Track seller metrics for AI forecasting
-- ============================================================================

CREATE TABLE IF NOT EXISTS seller_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  total_assets_minted INT DEFAULT 0,
  total_sold INT DEFAULT 0,
  total_revenue NUMERIC,
  average_price NUMERIC,
  average_delivery_days INT,
  customer_rating NUMERIC,
  return_rate NUMERIC,
  velocity_multiplier NUMERIC DEFAULT 1.0,
  category TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_performance_seller
ON seller_performance (seller_id, category);

ALTER TABLE seller_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY seller_performance_readable
ON seller_performance FOR SELECT
USING (true);

-- ============================================================================
-- 7. MARKET_BENCHMARKS — Category-level reference metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  median_price NUMERIC,
  median_delivery_days INT,
  median_rating NUMERIC,
  price_p25 NUMERIC,
  price_p50 NUMERIC,
  price_p75 NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE market_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY market_benchmarks_readable
ON market_benchmarks FOR SELECT
USING (true);

-- ============================================================================
-- 8. SQL FUNCTIONS — Vector search, market analysis, forecasting, trust score
-- ============================================================================

-- Function 1: Vector search for similar assets
CREATE OR REPLACE FUNCTION vector_search_products(
  query_embedding vector(1024),
  category_name TEXT DEFAULT NULL,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  seller_id UUID,
  similarity_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ac.id,
    ac.title,
    ac.seller_user_id,
    (1 - (ac.embedding <=> query_embedding))::NUMERIC AS similarity_score
  FROM assets_catalog ac
  WHERE
    (category_name IS NULL OR ac.category = category_name)
    AND ac.embedding IS NOT NULL
    AND ac.is_active = TRUE
  ORDER BY similarity_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function 2: Get market analysis for category
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
$$ LANGUAGE plpgsql STABLE;

-- Function 3: Predict sales volume at price point
CREATE OR REPLACE FUNCTION predict_volume_at_price(
  category_name TEXT,
  p_seller_id UUID,
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
  SELECT velocity_multiplier INTO seller_multiplier
  FROM seller_performance
  WHERE seller_performance.seller_id = p_seller_id;

  seller_multiplier := COALESCE(seller_multiplier, 1.0);

  SELECT
    mt.listing_velocity,
    mt.price_avg
  INTO
    base_velocity,
    market_avg_price
  FROM market_trends mt
  WHERE mt.category = category_name
  ORDER BY mt.created_at DESC
  LIMIT 1;

  base_velocity := COALESCE(base_velocity, 50);
  market_avg_price := COALESCE(market_avg_price, 250);

  price_elasticity := 1.0 - (0.02 * (price - market_avg_price) / (market_avg_price * 0.1));
  price_elasticity := GREATEST(0.3, LEAST(2.0, price_elasticity));

  RETURN QUERY SELECT
    CAST(ROUND(base_velocity * seller_multiplier * price_elasticity / 7) AS INT),
    CAST(ROUND(base_velocity * seller_multiplier * price_elasticity) AS INT),
    0.85::NUMERIC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function 4: Get seller insights
CREATE OR REPLACE FUNCTION get_seller_insights(
  p_seller_id UUID
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
  WHERE sp.seller_id = p_seller_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function 5: Get buyer trust score
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
      50 + (COUNT(*)::FLOAT / 10),
      50
    )::NUMERIC AS trust_score,
    COUNT(*)::INT AS completed_orders,
    0::NUMERIC AS dispute_rate,
    1.0::NUMERIC AS payment_reliability
  FROM protocol_orders po
  WHERE
    po.buyer_address = (
      SELECT wallet_address FROM profiles WHERE id = get_buyer_trust_score.buyer_id LIMIT 1
    )
    AND po.status = 'completed';
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 9. STORAGE BUCKET — Create seller-assets bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('seller-assets', 'seller-assets', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Allow public reads (idempotent — storage.objects is pre-existing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'seller_assets_public_read' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "seller_assets_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'seller-assets');
  END IF;
END $$;

-- Allow authenticated uploads (idempotent — storage.objects is pre-existing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'seller_assets_upload' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "seller_assets_upload"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'seller-assets');
  END IF;
END $$;

-- ============================================================================
-- END OF MIGRATION 000037 (self-contained, replaces deleted 000036)
-- ============================================================================
