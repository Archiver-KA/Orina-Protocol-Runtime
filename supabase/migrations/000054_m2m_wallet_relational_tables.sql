-- Migration 000054: relational storage for M2M wallet state.

CREATE TABLE IF NOT EXISTS public.m2m_wallet_config (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  selected_delegate_id TEXT,
  payment_token TEXT,
  allowed_actions TEXT[] NOT NULL DEFAULT '{buy}',
  max_per_order TEXT NOT NULL DEFAULT '',
  max_total TEXT NOT NULL DEFAULT '',
  expiry_days INTEGER NOT NULL DEFAULT 7,
  counterparty_allowlist TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_m2m_wallet_config_wallet
  ON public.m2m_wallet_config (wallet_address);

ALTER TABLE public.m2m_wallet_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "m2m_wallet_config_select_owner"
  ON public.m2m_wallet_config
  FOR SELECT
  USING (
    lower(wallet_address) = lower(
      coalesce(
        current_setting('request.jwt.claims', true)::json->>'wallet_address',
        auth.jwt()->'raw_user_meta_data'->>'wallet_address'
      )
    )
  );

CREATE TABLE IF NOT EXISTS public.m2m_delegates (
  id TEXT PRIMARY KEY,
  root_wallet_address TEXT NOT NULL,
  delegate_address TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'generated' CHECK (mode IN ('generated', 'enrolled')),
  status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'revoked')),
  label TEXT,
  managed_by_server BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_m2m_delegates_root
  ON public.m2m_delegates (root_wallet_address);

ALTER TABLE public.m2m_delegates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "m2m_delegates_select_owner"
  ON public.m2m_delegates
  FOR SELECT
  USING (
    lower(root_wallet_address) = lower(
      coalesce(
        current_setting('request.jwt.claims', true)::json->>'wallet_address',
        auth.jwt()->'raw_user_meta_data'->>'wallet_address'
      )
    )
  );

CREATE TABLE IF NOT EXISTS public.m2m_delegate_invites (
  id TEXT PRIMARY KEY,
  root_wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  claimed_by_wallet_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_m2m_delegate_invites_root
  ON public.m2m_delegate_invites (root_wallet_address);

ALTER TABLE public.m2m_delegate_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "m2m_delegate_invites_select_owner"
  ON public.m2m_delegate_invites
  FOR SELECT
  USING (
    lower(root_wallet_address) = lower(
      coalesce(
        current_setting('request.jwt.claims', true)::json->>'wallet_address',
        auth.jwt()->'raw_user_meta_data'->>'wallet_address'
      )
    )
  );

CREATE TABLE IF NOT EXISTS public.m2m_delegate_secrets (
  delegate_id TEXT PRIMARY KEY REFERENCES public.m2m_delegates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  iv_hex TEXT NOT NULL,
  ciphertext_hex TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.m2m_delegate_secrets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_m2m_wallet_config_updated_at'
  ) THEN
    CREATE TRIGGER trg_m2m_wallet_config_updated_at
      BEFORE UPDATE ON public.m2m_wallet_config
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

COMMENT ON TABLE public.m2m_wallet_config IS 'AI M2M wallet session configuration per root wallet';
COMMENT ON TABLE public.m2m_delegates IS 'Registered delegate signers for M2M wallet sessions';
COMMENT ON TABLE public.m2m_delegate_invites IS 'Pending or claimed delegate enrollment invitations';
COMMENT ON TABLE public.m2m_delegate_secrets IS 'AES-GCM encrypted private keys for server-managed delegates';