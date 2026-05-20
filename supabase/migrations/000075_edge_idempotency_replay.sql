-- Server-side idempotency replay store for protected Edge Function writes.
--
-- Edge middleware stores only request/response hashes and replayable response
-- bodies. Secret-bearing responses are marked completed_no_replay so duplicate
-- delivery is blocked without persisting one-time credentials.

CREATE TABLE IF NOT EXISTS public.edge_idempotency_records (
  key_hash TEXT PRIMARY KEY,
  request_fingerprint TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('POST', 'PUT', 'PATCH', 'DELETE')),
  path TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'completed_no_replay')),
  response_status INTEGER CHECK (
    response_status IS NULL OR (response_status >= 100 AND response_status <= 599)
  ),
  response_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS edge_idempotency_records_expires_at_idx
  ON public.edge_idempotency_records (expires_at);

CREATE INDEX IF NOT EXISTS edge_idempotency_records_status_idx
  ON public.edge_idempotency_records (status);

ALTER TABLE public.edge_idempotency_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS edge_idempotency_records_deny_all ON public.edge_idempotency_records;
CREATE POLICY edge_idempotency_records_deny_all
  ON public.edge_idempotency_records
  FOR ALL
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.edge_idempotency_records FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.edge_idempotency_records TO service_role;

COMMENT ON TABLE public.edge_idempotency_records IS
  'Service-role-only Edge Function idempotency replay records keyed by hashed Authorization scope and Idempotency-Key.';
