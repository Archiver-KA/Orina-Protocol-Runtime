-- Migration 000063: harden helper function execution grants.
--
-- Findings from the remote reconciliation audit:
-- - public.increment_thread_message_count is SECURITY DEFINER and was executable by
--   PUBLIC, anon, and authenticated.
-- - public.audit_log_cleanup was also executable broadly, even though it is intended
--   only for operator or service-role cleanup flows.

CREATE OR REPLACE FUNCTION public.increment_thread_message_count(tid TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.agent_threads
  SET message_count = message_count + 1,
      updated_at = now()
  WHERE id = tid;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_thread_message_count(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_thread_message_count(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_thread_message_count(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_thread_message_count(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.audit_log_cleanup()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.security_audit_log
  WHERE created_at < now() - INTERVAL '90 days';
$$;

REVOKE EXECUTE ON FUNCTION public.audit_log_cleanup() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_log_cleanup() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_log_cleanup() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.audit_log_cleanup() TO service_role;