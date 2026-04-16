-- Migration 000065: AI memory + evaluation core tables and thread stat sync helper.

CREATE TABLE IF NOT EXISTS public.agent_turn_evaluations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES public.agent_threads(id) ON DELETE CASCADE,
  assistant_message_id BIGINT NOT NULL REFERENCES public.agent_messages(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  agent_context TEXT NOT NULL
    CHECK (agent_context IN ('buyer', 'seller', 'arbiter', 'guest')),
  evaluator_version TEXT NOT NULL DEFAULT 'v1',
  intent TEXT,
  grounding_score NUMERIC(5,2)
    CHECK (grounding_score IS NULL OR (grounding_score >= 0 AND grounding_score <= 1)),
  completion_score NUMERIC(5,2)
    CHECK (completion_score IS NULL OR (completion_score >= 0 AND completion_score <= 1)),
  safety_score NUMERIC(5,2)
    CHECK (safety_score IS NULL OR (safety_score >= 0 AND safety_score <= 1)),
  response_quality_score NUMERIC(5,2)
    CHECK (response_quality_score IS NULL OR (response_quality_score >= 0 AND response_quality_score <= 1)),
  user_feedback_score NUMERIC(5,2)
    CHECK (user_feedback_score IS NULL OR (user_feedback_score >= 0 AND user_feedback_score <= 1)),
  user_feedback_note TEXT,
  fallback_used BOOLEAN NOT NULL DEFAULT false,
  clarification_used BOOLEAN NOT NULL DEFAULT false,
  issues JSONB NOT NULL DEFAULT '[]'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_turn_evaluations_assistant_message
  ON public.agent_turn_evaluations (assistant_message_id);

CREATE INDEX IF NOT EXISTS idx_agent_turn_evaluations_wallet_created
  ON public.agent_turn_evaluations (wallet_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_turn_evaluations_thread_created
  ON public.agent_turn_evaluations (thread_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_memory_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global'
    CHECK (scope IN ('global', 'buyer', 'seller', 'arbiter', 'conversation')),
  memory_type TEXT NOT NULL
    CHECK (memory_type IN ('preference', 'constraint', 'fact', 'goal', 'profile', 'summary')),
  memory_key TEXT NOT NULL,
  memory_value JSONB NOT NULL,
  confidence NUMERIC(5,2) NOT NULL DEFAULT 0.50
    CHECK (confidence >= 0 AND confidence <= 1),
  salience INTEGER NOT NULL DEFAULT 50
    CHECK (salience >= 0 AND salience <= 100),
  source_thread_id TEXT REFERENCES public.agent_threads(id) ON DELETE SET NULL,
  source_message_id BIGINT REFERENCES public.agent_messages(id) ON DELETE SET NULL,
  last_confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  superseded_by UUID REFERENCES public.agent_memory_records(id),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_memory_records_identity
  ON public.agent_memory_records (wallet_address, scope, memory_type, memory_key);

CREATE INDEX IF NOT EXISTS idx_agent_memory_records_wallet_updated
  ON public.agent_memory_records (wallet_address, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memory_records_type_key
  ON public.agent_memory_records (memory_type, memory_key);

CREATE TABLE IF NOT EXISTS public.agent_memory_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  memory_id UUID REFERENCES public.agent_memory_records(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('extract', 'confirm', 'update', 'downgrade', 'forget', 'merge')),
  actor_type TEXT NOT NULL
    CHECK (actor_type IN ('ai', 'user', 'system')),
  source_thread_id TEXT REFERENCES public.agent_threads(id) ON DELETE SET NULL,
  source_message_id BIGINT REFERENCES public.agent_messages(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_events_memory_created
  ON public.agent_memory_events (memory_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memory_events_wallet_created
  ON public.agent_memory_events (wallet_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memory_events_thread_created
  ON public.agent_memory_events (source_thread_id, created_at DESC);

ALTER TABLE public.agent_turn_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_turn_evaluations_deny_all" ON public.agent_turn_evaluations;
CREATE POLICY "agent_turn_evaluations_deny_all"
  ON public.agent_turn_evaluations
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "agent_memory_records_deny_all" ON public.agent_memory_records;
CREATE POLICY "agent_memory_records_deny_all"
  ON public.agent_memory_records
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "agent_memory_events_deny_all" ON public.agent_memory_events;
CREATE POLICY "agent_memory_events_deny_all"
  ON public.agent_memory_events
  FOR ALL USING (false) WITH CHECK (false);

DROP TRIGGER IF EXISTS trg_agent_memory_records_updated_at ON public.agent_memory_records;
CREATE TRIGGER trg_agent_memory_records_updated_at
  BEFORE UPDATE ON public.agent_memory_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.agent_thread_sync_stats(tid TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stats AS (
    SELECT
      thread_id,
      COUNT(*)::INTEGER AS message_count,
      COALESCE(SUM(COALESCE(token_count, 0)), 0)::INTEGER AS token_total
    FROM public.agent_messages
    WHERE thread_id = tid
    GROUP BY thread_id
  )
  UPDATE public.agent_threads AS thread
  SET
    message_count = COALESCE(stats.message_count, 0),
    token_total = COALESCE(stats.token_total, 0),
    updated_at = NOW()
  FROM stats
  WHERE thread.id = stats.thread_id;

  UPDATE public.agent_threads
  SET
    message_count = 0,
    token_total = 0,
    updated_at = NOW()
  WHERE id = tid
    AND NOT EXISTS (
      SELECT 1
      FROM public.agent_messages
      WHERE thread_id = tid
    );
$$;

REVOKE EXECUTE ON FUNCTION public.agent_thread_sync_stats(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.agent_thread_sync_stats(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.agent_thread_sync_stats(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.agent_thread_sync_stats(TEXT) TO service_role;
