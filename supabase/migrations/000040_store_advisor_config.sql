-- Store Advisor Configuration (per-seller AI agent settings)
-- Separate from seller_minting_config — this controls the Store Advisor AI
-- that represents the seller in buyer conversations.

CREATE TABLE IF NOT EXISTS store_advisor_config (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id     TEXT NOT NULL UNIQUE,
  enabled       BOOLEAN DEFAULT false,
  store_name    TEXT,                          -- AI agent display name (e.g. "B Premium Realty AI")
  behavior      TEXT DEFAULT 'moderate'
                CHECK (behavior IN ('conservative', 'moderate', 'proactive')),
  auto_reply    BOOLEAN DEFAULT true,          -- auto-respond to buyer messages
  greeting      TEXT,                          -- custom greeting when buyer opens chat
  negotiation_policy TEXT,                     -- price negotiation rules for AI
  preferred_lang TEXT DEFAULT 'en',            -- fallback language for responses
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by seller wallet address
CREATE INDEX IF NOT EXISTS idx_store_advisor_seller ON store_advisor_config(seller_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_store_advisor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_advisor_updated_at ON store_advisor_config;
CREATE TRIGGER trg_store_advisor_updated_at
  BEFORE UPDATE ON store_advisor_config
  FOR EACH ROW EXECUTE FUNCTION update_store_advisor_updated_at();

-- RLS: public read via service role (edge functions use service key)
ALTER TABLE store_advisor_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON store_advisor_config
  FOR ALL USING (true) WITH CHECK (true);
