-- Phase 5: Relational AI tables.
-- Replaces KV-backed AI storage (kv_store_b0d68fc8) with proper
-- relational schema for AI conversations, messages, config, and usage.

-- Agent configuration per wallet
CREATE TABLE IF NOT EXISTS agent_configs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet_address  TEXT NOT NULL UNIQUE,
  persona         TEXT NOT NULL DEFAULT 'assistant',
  system_prompt   TEXT,
  model_id        TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperature     REAL NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens      INT NOT NULL DEFAULT 2048,
  auto_reply      BOOLEAN NOT NULL DEFAULT false,
  auto_reply_delay_ms INT NOT NULL DEFAULT 3000,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_configs_wallet ON agent_configs (wallet_address);

-- AI conversation threads
CREATE TABLE IF NOT EXISTS agent_threads (
  id              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  wallet_address  TEXT NOT NULL,
  title           TEXT,
  model_id        TEXT,
  message_count   INT NOT NULL DEFAULT 0,
  token_total     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_threads_wallet ON agent_threads (wallet_address);
CREATE INDEX IF NOT EXISTS idx_agent_threads_updated ON agent_threads (updated_at DESC);

-- AI messages within threads
CREATE TABLE IF NOT EXISTS agent_messages (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  thread_id       TEXT NOT NULL REFERENCES agent_threads(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  model_id        TEXT,
  token_count     INT,
  latency_ms      INT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_thread ON agent_messages (thread_id, created_at);

-- AI usage tracking
CREATE TABLE IF NOT EXISTS agent_usage (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet_address  TEXT NOT NULL,
  model_id        TEXT NOT NULL,
  operation       TEXT NOT NULL DEFAULT 'chat',  -- chat, image, search
  input_tokens    INT NOT NULL DEFAULT 0,
  output_tokens   INT NOT NULL DEFAULT 0,
  latency_ms      INT,
  cost_usd        NUMERIC(12,6),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_usage_wallet ON agent_usage (wallet_address, created_at DESC);
-- Daily aggregate queries can filter on wallet_address + created_at range instead

-- RLS: service-role only (access via edge functions)
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_usage ENABLE ROW LEVEL SECURITY;

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_agent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agent_configs_updated_at
  BEFORE UPDATE ON agent_configs
  FOR EACH ROW EXECUTE FUNCTION update_agent_updated_at();

CREATE TRIGGER trg_agent_threads_updated_at
  BEFORE UPDATE ON agent_threads
  FOR EACH ROW EXECUTE FUNCTION update_agent_updated_at();
