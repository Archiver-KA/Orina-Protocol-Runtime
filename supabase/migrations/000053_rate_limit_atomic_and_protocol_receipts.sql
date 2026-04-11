-- Migration 000053: atomic rate limiting helpers and protocol receipts.

CREATE OR REPLACE FUNCTION public.rate_limit_increment(
  p_scope_key TEXT,
  p_endpoint TEXT,
  p_wallet TEXT,
  p_window_start TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO rate_limit_entries (scope_key, endpoint, wallet, window_start, request_count, blocked)
  VALUES (p_scope_key, p_endpoint, p_wallet, p_window_start, 1, false)
  ON CONFLICT (scope_key) DO UPDATE
    SET request_count = rate_limit_entries.request_count + 1
  RETURNING request_count;
$$;

REVOKE EXECUTE ON FUNCTION public.rate_limit_increment FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rate_limit_increment FROM anon;
REVOKE EXECUTE ON FUNCTION public.rate_limit_increment FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_increment TO service_role;

CREATE OR REPLACE FUNCTION public.rate_limit_cleanup()
RETURNS INTEGER
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH deleted AS (
    DELETE FROM rate_limit_entries
    WHERE window_start < NOW() - INTERVAL '24 hours'
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER FROM deleted;
$$;

REVOKE EXECUTE ON FUNCTION public.rate_limit_cleanup FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rate_limit_cleanup FROM anon;
REVOKE EXECUTE ON FUNCTION public.rate_limit_cleanup FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_cleanup TO service_role;

CREATE TABLE IF NOT EXISTS public.protocol_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  owner_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  asset_type SMALLINT NOT NULL DEFAULT 0,
  chain_id BIGINT NOT NULL DEFAULT 97,
  contract_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL DEFAULT 0,
  block_number BIGINT NOT NULL DEFAULT 0,
  block_time TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_protocol_receipts_tx_log
  ON public.protocol_receipts (tx_hash, log_index);

CREATE INDEX IF NOT EXISTS idx_protocol_receipts_owner
  ON public.protocol_receipts (owner_address);

CREATE INDEX IF NOT EXISTS idx_protocol_receipts_order
  ON public.protocol_receipts (order_id);

CREATE INDEX IF NOT EXISTS idx_protocol_receipts_token
  ON public.protocol_receipts (token_id);

ALTER TABLE public.protocol_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "protocol_receipts_select_public"
  ON public.protocol_receipts
  FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_protocol_receipts_updated_at'
  ) THEN
    CREATE TRIGGER trg_protocol_receipts_updated_at
      BEFORE UPDATE ON public.protocol_receipts
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

COMMENT ON TABLE public.protocol_receipts IS 'Projection of on-chain ReceiptMinted events from RWAReceiptNFT contract';
COMMENT ON COLUMN public.protocol_receipts.token_id IS 'NFT tokenId from ReceiptMinted event';
COMMENT ON COLUMN public.protocol_receipts.order_id IS 'Protocol orderId the receipt references';
COMMENT ON COLUMN public.protocol_receipts.owner_address IS 'Wallet that received the receipt NFT';
COMMENT ON COLUMN public.protocol_receipts.amount IS 'Receipt amount in raw units';
COMMENT ON COLUMN public.protocol_receipts.asset_type IS 'Asset type enum (0=Physical, 1=Digital, etc.)';