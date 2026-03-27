-- ============================================================================
-- ATP2 Migration 000039: KV Store + AI Assist conversation index
-- Purpose: Create persistent KV store for edge function state (AI conversations,
--          agent configs, API key indexes, etc.)
-- ============================================================================

-- KV store backing table used by supabase/functions/server/kv_store.tsx
CREATE TABLE IF NOT EXISTS kv_store_b0d68fc8 (
  key   TEXT  NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

-- Prefix-scan index used by kv.getByPrefix()
CREATE INDEX IF NOT EXISTS kv_store_b0d68fc8_key_prefix_idx
  ON kv_store_b0d68fc8 (key text_pattern_ops);

-- ============================================================================
-- END OF MIGRATION 000039
-- ============================================================================
