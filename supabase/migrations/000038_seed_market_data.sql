-- ============================================================================
-- ATP2 Migration 000038: Seed Market Data
-- Purpose: Populate market_trends with initial data for 5 categories
-- ============================================================================

INSERT INTO market_trends (
  category, price_avg, price_min, price_max, price_std_dev,
  demand_score, listing_velocity, sell_through_rate,
  competitive_sellers, average_condition,
  period_start, period_end
) VALUES
  -- Clothing (3 months of data)
  ('clothing', 250, 120, 500, 85, 85, 150, 35, 45, 'good',
    NOW() - INTERVAL '90 days', NOW() - INTERVAL '60 days'),
  ('clothing', 280, 150, 550, 90, 82, 145, 38, 48, 'good',
    NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days'),
  ('clothing', 300, 160, 600, 95, 80, 140, 40, 50, 'good',
    NOW() - INTERVAL '30 days', NOW()),

  -- Electronics (3 months of data)
  ('electronics', 2500, 1000, 8000, 1500, 75, 80, 28, 60, 'excellent',
    NOW() - INTERVAL '90 days', NOW() - INTERVAL '60 days'),
  ('electronics', 2600, 1100, 8500, 1600, 78, 85, 30, 62, 'excellent',
    NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days'),
  ('electronics', 2800, 1200, 9000, 1700, 80, 90, 32, 65, 'excellent',
    NOW() - INTERVAL '30 days', NOW()),

  -- Vehicles (1 period)
  ('vehicles', 35000, 15000, 80000, 15000, 65, 20, 25, 30, 'good',
    NOW() - INTERVAL '30 days', NOW()),

  -- Real Estate (1 period)
  ('real_estate', 450000, 100000, 2000000, 350000, 55, 5, 15, 20, 'excellent',
    NOW() - INTERVAL '30 days', NOW()),

  -- Luxury (1 period)
  ('luxury', 12000, 2000, 50000, 10000, 70, 30, 30, 35, 'excellent',
    NOW() - INTERVAL '30 days', NOW());

-- ============================================================================
-- END OF MIGRATION 000038
-- ============================================================================
