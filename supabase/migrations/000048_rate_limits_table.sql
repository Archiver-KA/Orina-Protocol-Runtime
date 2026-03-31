-- Rate limit entries for distributed rate limiting across Edge Function instances.
-- Uses Supabase table instead of in-memory Map so limits survive instance restarts
-- and work correctly across horizontal scale.

CREATE TABLE IF NOT EXISTS rate_limit_entries (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scope_key     TEXT NOT NULL,          -- e.g. 'chat:create:0x1234...' or 'ai:assist:0x1234...'
  endpoint      TEXT NOT NULL,          -- endpoint family: 'chat_create', 'chat_send', 'ai_assist', etc.
  wallet        TEXT,                   -- wallet address (nullable for IP-only limits)
  ip_hash       TEXT,                   -- SHA-256 hash of IP for privacy
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INT NOT NULL DEFAULT 1,
  blocked       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup by scope key (one row per wallet+endpoint+window)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_scope
  ON rate_limit_entries (scope_key);

-- Cleanup old entries (older than 24h) — can be called by a scheduled job or on-demand
CREATE INDEX IF NOT EXISTS idx_rate_limit_window
  ON rate_limit_entries (window_start);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_rate_limit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rate_limit_updated ON rate_limit_entries;
CREATE TRIGGER trg_rate_limit_updated
  BEFORE UPDATE ON rate_limit_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_limit_updated_at();

-- RLS: only service role should access this table
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- No public policies — only service_role can read/write
-- This ensures rate limits cannot be tampered with from the client side
