-- Migration 000051: Minting drafts, search history, recent commands, avatar seed
-- Migrates remaining localStorage-only data to server-side tables.

-- ═══════════════════════════════════════════════════
-- 1. Minting Drafts
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS minting_drafts (
  id              TEXT NOT NULL PRIMARY KEY,
  wallet_address  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',
  asset_type      TEXT NOT NULL DEFAULT 'RWA' CHECK (asset_type IN ('RWA', 'NFT')),
  name            TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL DEFAULT '',
  subcategory     TEXT NOT NULL DEFAULT '',
  blockchain      TEXT NOT NULL DEFAULT '',
  unit_id         TEXT NOT NULL DEFAULT '',
  total_amount    TEXT NOT NULL DEFAULT '',
  price           TEXT NOT NULL DEFAULT '',
  price_currency  TEXT NOT NULL DEFAULT '',
  expiry_type     TEXT NOT NULL DEFAULT 'Non-Expiry' CHECK (expiry_type IN ('Expiry', 'Non-Expiry')),
  expiry_days     TEXT NOT NULL DEFAULT '',
  media_data      JSONB,          -- uploaded media + images
  delivery_state  JSONB,          -- delivery address snapshot
  configurable_attributes JSONB,  -- RWA configurable attribute groups
  preview_image   TEXT,
  completeness    REAL NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_minting_drafts_wallet
  ON minting_drafts (wallet_address, updated_at DESC);

-- ═══════════════════════════════════════════════════
-- 2. Search History
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS search_history (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet_address  TEXT NOT NULL,
  query           TEXT NOT NULL,
  filters         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_history_wallet
  ON search_history (wallet_address, created_at DESC);

-- ═══════════════════════════════════════════════════
-- 3. Recent Commands
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recent_commands (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet_address  TEXT NOT NULL,
  command_id      TEXT NOT NULL,
  label           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recent_commands_wallet
  ON recent_commands (wallet_address, created_at DESC);

-- ═══════════════════════════════════════════════════
-- 4. Avatar Seed on profiles
-- ═══════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_seed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_seed INT;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════
-- 5. RLS (service-role only for new tables)
-- ═══════════════════════════════════════════════════
ALTER TABLE minting_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_commands ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger for minting_drafts
CREATE TRIGGER trg_minting_drafts_updated_at
  BEFORE UPDATE ON minting_drafts
  FOR EACH ROW EXECUTE FUNCTION update_agent_updated_at();
