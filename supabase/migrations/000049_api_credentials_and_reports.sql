-- Server-side API credential vault.
-- Replaces browser localStorage-based API key storage with cryptographically
-- secure server-side credential management.
--
-- Keys are generated server-side and the raw key is returned ONCE to the client.
-- Only a SHA-256 hash is stored; the raw key cannot be recovered.

CREATE TABLE IF NOT EXISTS api_credentials (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet_address  TEXT NOT NULL,
  key_name        TEXT NOT NULL DEFAULT 'Default',
  key_hash        TEXT NOT NULL,                   -- SHA-256 hash of the raw API key
  key_prefix      TEXT NOT NULL,                   -- First 8 chars for display/lookup (e.g. "sk_sell…")
  permissions     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- e.g. ["read_orders","write_listings"]
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ,                     -- null = no expiry
  last_used_at    TIMESTAMPTZ,
  usage_count     BIGINT NOT NULL DEFAULT 0,
  revoked_at      TIMESTAMPTZ                      -- null = not revoked
);

CREATE INDEX IF NOT EXISTS idx_api_credentials_wallet
  ON api_credentials (wallet_address);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_credentials_hash
  ON api_credentials (key_hash);

-- RLS: service-role only (wallet reads/writes go through the handler)
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;

-- Moderation reports — replaces localStorage 'orina_user_reports'
CREATE TABLE IF NOT EXISTS message_reports (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id TEXT,                            -- optional link to conversation
  reporter_wallet TEXT NOT NULL,
  target_wallet   TEXT NOT NULL,
  target_name     TEXT,
  reason          TEXT NOT NULL,
  details         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'  -- pending, reviewed, dismissed, actioned
    CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     TEXT
);

CREATE INDEX IF NOT EXISTS idx_message_reports_reporter
  ON message_reports (reporter_wallet);

CREATE INDEX IF NOT EXISTS idx_message_reports_target
  ON message_reports (target_wallet);

CREATE INDEX IF NOT EXISTS idx_message_reports_status
  ON message_reports (status);

-- RLS: service-role only
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;
