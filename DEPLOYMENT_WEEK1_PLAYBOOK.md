# 🚀 ATP2 Agent Deployment - Week 1 Playbook

**Start Date:** TODAY
**Duration:** Week 1, Days 1-5
**Objective:** Prepare schema + Supabase functions for AI agents

---

## 📋 Day 1-2: Database Migration

### Prerequisites
- Supabase project: `vcixsdudkizgfikhmfuv`
- Admin access to Supabase
- Local PostgreSQL client (optional for testing)

### Step 1: Backup Current Database (CRITICAL)
```bash
# Via Supabase Dashboard:
1. Go to: https://app.supabase.com/project/vcixsdudkizgfikhmfuv/database/backups
2. Click: [Create Manual Backup]
3. Wait for completion (~5 min)
4. Verify backup in list
5. Note backup timestamp
```

### Step 2: Review Migration File
```bash
# Check migration script location:
cat c:/ORINA/ATPProtocol2/ATP2/supabase/migrations/000036_ai_agent_phase1_schema.sql

# Key changes:
✓ profiles: +api_enabled, +address, +coordinates
✓ products: +embedding vector(1024), +attributes JSONB
✓ assets: +ai_created, +ai_analysis
✓ orders: +delivery metrics
✓ NEW: market_trends table
✓ NEW: seller_performance table
✓ NEW: 5 Supabase functions
```

### Step 3: Apply Migration in Supabase

**Option A: Via Supabase Dashboard (Easier)**
```
1. Dashboard → SQL Editor
2. New Query
3. Copy entire content of 000036_ai_agent_phase1_schema.sql
4. Paste into editor
5. Click [Run]
6. Wait for success (should complete in < 30 seconds)
7. Verify in Table Editor
```

**Option B: Via Supabase CLI (Faster)**
```bash
# Install CLI if not present:
npm install -g @supabase/cli

# Login (if not already):
supabase login

# Link to project:
cd c:/ORINA/ATPProtocol2/ATP2
supabase link --project-ref vcixsdudkizgfikhmfuv

# Run migration:
supabase db push

# Verify:
supabase status
```

### Step 4: Verification Queries
Run these in Supabase SQL Editor to verify migration success:

```sql
-- 1. Check profiles table modifications
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name='profiles'
  AND column_name IN ('api_enabled', 'address', 'coordinates');
-- Expected: 3 rows with correct types

-- 2. Check products embeddings
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name='products'
  AND column_name IN ('embedding', 'attributes');
-- Expected: 2 rows (vector, JSONB)

-- 3. Verify market_trends table exists
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'market_trends';
-- Expected: 1

-- 4. Verify seller_performance table exists
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'seller_performance';
-- Expected: 1

-- 5. Test vector search function (dry run)
SELECT 1 WHERE EXISTS(
  SELECT 1 FROM pg_proc
  WHERE proname = 'vector_search_products'
);
-- Expected: 1

-- 6. Test market analysis function
SELECT 1 WHERE EXISTS(
  SELECT 1 FROM pg_proc
  WHERE proname = 'get_market_analysis'
);
-- Expected: 1
```

---

## 📊 Day 3-4: Populate Initial Data

### Step 1: Seed Market Trends Data

```sql
-- Insert 3 months of Market Trends for testing
INSERT INTO market_trends (
  category, price_avg, price_min, price_max, demand_score,
  listing_velocity, sell_through_rate, period_start, period_end
) VALUES
  -- Clothing
  ('clothing', 250, 120, 500, 85, 150, 35, NOW() - INTERVAL '90 days', NOW() - INTERVAL '60 days'),
  ('clothing', 280, 150, 550, 82, 145, 38, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days'),
  ('clothing', 300, 160, 600, 80, 140, 40, NOW() - INTERVAL '30 days', NOW()),

  -- Electronics
  ('electronics', 2500, 1000, 8000, 75, 80, 28, NOW() - INTERVAL '90 days', NOW() - INTERVAL '60 days'),
  ('electronics', 2600, 1100, 8500, 78, 85, 30, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days'),
  ('electronics', 2800, 1200, 9000, 80, 90, 32, NOW() - INTERVAL '30 days', NOW());

-- Verify insertion
SELECT category, COUNT(*) as count,
  ROUND(AVG(price_avg)) as avg_price,
  MAX(demand_score) as peak_demand
FROM market_trends
GROUP BY category;
```

### Step 2: Update Seller Performance for Existing Sellers

```sql
-- Get active sellers and calculate their performance
INSERT INTO seller_performance (
  seller_id, category, total_sold, average_price,
  velocity_multiplier, customer_rating
)
SELECT
  p.id,
  'general' as category,
  COALESCE(COUNT(o.id), 0) as total_sold,
  COALESCE(AVG(o.price), 0) as average_price,
  CASE
    WHEN COUNT(o.id) > 100 THEN 1.5
    WHEN COUNT(o.id) > 50 THEN 1.3
    WHEN COUNT(o.id) > 20 THEN 1.1
    ELSE 0.9
  END as velocity_multiplier,
  4.5 as customer_rating
FROM profiles p
LEFT JOIN products pr ON p.id = pr.seller_id
LEFT JOIN orders o ON pr.id = o.product_id
WHERE p.role = 'seller'
GROUP BY p.id
ON CONFLICT (seller_id) DO UPDATE SET
  total_sold = EXCLUDED.total_sold,
  average_price = EXCLUDED.average_price,
  velocity_multiplier = EXCLUDED.velocity_multiplier;

-- Verify
SELECT COUNT(*) as seller_profiles FROM seller_performance;
```

### Step 3: Enable API for Test Sellers (Optional)

```sql
-- Enable API for first 5 sellers (for testing)
UPDATE profiles
SET api_enabled = TRUE
WHERE id IN (
  SELECT id FROM profiles
  WHERE role = 'seller'
  LIMIT 5
);

-- Verify
SELECT COUNT(*) as api_enabled_sellers
FROM profiles
WHERE api_enabled = TRUE;
```

---

## 🧪 Day 5: Testing Functions

### Test 1: Vector Search Function

```sql
-- Create test embedding (simulated)
WITH test_embedding AS (
  SELECT array_to_vector(array_fill(0.5::float, ARRAY[1024]))::vector(1024) as vec
)
SELECT * FROM vector_search_products(
  (SELECT vec FROM test_embedding),
  'clothing',
  10
) LIMIT 5;

-- Expected: 0-5 products (depends on existing data)
```

### Test 2: Market Analysis Function

```sql
SELECT * FROM get_market_analysis('clothing', 30);

-- Expected result:
-- price_avg | price_min | price_max | demand_score | sell_through_rate
-- 300       | 160       | 600       | 80          | 40
```

### Test 3: Volume Prediction

```sql
SELECT * FROM predict_volume_at_price(
  'clothing',
  (SELECT id FROM profiles WHERE role = 'seller' LIMIT 1),
  280  -- price to test
);

-- Expected: weekly and monthly forecast numbers
```

### Test 4: Seller Insights

```sql
SELECT * FROM get_seller_insights(
  (SELECT id FROM profiles WHERE role = 'seller' LIMIT 1)
);

-- Expected: seller's total_sold, average_price, rating, delivery_days
```

### Test 5: Buyer Trust Score

```sql
SELECT * FROM get_buyer_trust_score(
  (SELECT id FROM profiles WHERE role = 'buyer' LIMIT 1)
);

-- Expected: trust_score, completed_orders, dispute_rate
```

---

## ✅ Completion Checklist

### Database Schema
- [ ] Backup created in Supabase
- [ ] Migration 000036 applied successfully
- [ ] All 5 ALTER TABLE statements executed
- [ ] New tables created: market_trends, seller_performance
- [ ] All indexes created
- [ ] All RLS policies enabled

### Verification Tests
- [ ] Profiles table: api_enabled, address, coordinates exist
- [ ] Products table: embedding vector(1024), attributes JSONB exist
- [ ] Assets table: ai_created, ai_analysis exist
- [ ] Orders table: delivery_* columns exist
- [ ] market_trends table exists with test data
- [ ] seller_performance table exists with test data

### Functions
- [ ] vector_search_products() created + tested
- [ ] get_market_analysis() created + tested
- [ ] predict_volume_at_price() created + tested
- [ ] get_seller_insights() created + tested
- [ ] get_buyer_trust_score() created + tested

### Data Population
- [ ] Market trends data seeded (3 months)
- [ ] Seller performance data populated
- [ ] API enabled for test sellers
- [ ] Sample queries return expected results

---

## 🆘 Troubleshooting

### Issue: "Extension 'vector' does not exist"
```sql
-- Solution:
CREATE EXTENSION IF NOT EXISTS vector;
```

### Issue: "Extension 'postgis' does not exist"
```sql
-- Solution:
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Issue: Function already exists error
```sql
-- Solution: Already handled by CREATE OR REPLACE
-- Just re-run migration
```

### Issue: Foreign key constraint violations
```sql
-- Check for orphaned profiles:
SELECT COUNT(*) FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- If exists, delete:
DELETE FROM products WHERE seller_id NOT IN (SELECT id FROM profiles);
```

### Rollback (If needed)
```sql
-- Drop new tables (backup first!)
DROP TABLE IF EXISTS market_trends CASCADE;
DROP TABLE IF EXISTS seller_performance CASCADE;

-- Restore backup via Supabase Dashboard:
Settings → Database → Backups → Restore
```

---

## 📈 Success Indicators

✅ **Schema Ready:**
- No errors in migration execution
- All functions accessible via RPC
- Sample queries return data

✅ **Performance:**
- Queries complete in < 100ms
- Vector search index created
- No missing indexes

✅ **Data Integrity:**
- Existing orders/products unchanged
- New columns are nullable (no breaking changes)
- RLS policies in place

---

## 🎯 Next Steps (After Day 5)

Once schema is ready, proceed to **Week 2:**
- [ ] Day 1: Create Cloudflare Workers project
- [ ] Day 2: Implement shared agent endpoints
- [ ] Day 3: Test locally with wrangler dev
- [ ] Day 4-5: Deploy to Cloudflare

**See:** `ATP2_AGENT_IMPLEMENTATION.md` Section 8 (Week 2 Plan)

---

## 📞 Support

**Supabase Issues:**
- Dashboard: https://app.supabase.com/project/vcixsdudkizgfikhmfuv
- Docs: https://supabase.com/docs

**PostgreSQL Issues:**
- Quick fix: Restart database via Dashboard → Settings → Restart

**Questions:**
- Check ATP2_AGENT_IMPLEMENTATION.md for full context
- Review this playbook's troubleshooting section
