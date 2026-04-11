-- Migration 000056: security audit trail for compliance and incident response.

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_wallet TEXT,
  target_wallet TEXT,
  resource_type TEXT,
  resource_id TEXT,
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  edge_function TEXT,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON public.security_audit_log (actor_wallet, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_event_type
  ON public.security_audit_log (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_severity
  ON public.security_audit_log (severity, created_at DESC)
  WHERE severity IN ('warning', 'critical');

CREATE INDEX IF NOT EXISTS idx_audit_log_created
  ON public.security_audit_log (created_at DESC);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_deny_all"
  ON public.security_audit_log
  FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.audit_log_cleanup()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.security_audit_log
  WHERE created_at < now() - INTERVAL '90 days';
$$;