-- Migration 000083: move M2M delegate state off the legacy KV store and make
-- capacity checks, invite claims, and managed-secret writes transactional.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.m2m_wallet_config,
  public.m2m_delegates,
  public.m2m_delegate_invites,
  public.m2m_delegate_secrets
FROM anon, authenticated;

-- Preserve existing KV-backed configuration during the cutover. Invalid or
-- incomplete legacy records are skipped rather than weakening table checks.
INSERT INTO public.m2m_wallet_config (
  id,
  wallet_address,
  enabled,
  selected_delegate_id,
  payment_token,
  allowed_actions,
  max_per_order,
  max_total,
  expiry_days,
  counterparty_allowlist,
  notes,
  created_at,
  updated_at
)
SELECT
  coalesce(nullif(k.value->>'id', ''), 'ai_m2m_migrated_' || md5(k.key)),
  lower(k.value->>'walletAddress'),
  coalesce(k.value->>'enabled', 'false') = 'true',
  nullif(k.value->>'selectedDelegateId', ''),
  CASE
    WHEN lower(coalesce(k.value->>'paymentToken', '')) ~ '^0x[0-9a-f]{40}$'
      THEN lower(k.value->>'paymentToken')
    ELSE NULL
  END,
  CASE
    WHEN jsonb_typeof(k.value->'allowedActions') = 'array'
      THEN ARRAY(
        SELECT item.action
        FROM jsonb_array_elements_text(k.value->'allowedActions') AS item(action)
        WHERE action IN ('buy', 'mint', 'sign_order')
        LIMIT 3
      )
    ELSE ARRAY['buy']::text[]
  END,
  left(coalesce(k.value->>'maxPerOrder', ''), 50),
  left(coalesce(k.value->>'maxTotal', ''), 50),
  CASE
    WHEN coalesce(k.value->>'expiryDays', '') ~ '^\d{1,2}$'
      THEN least(30, greatest(0, (k.value->>'expiryDays')::integer))
    ELSE 7
  END,
  CASE
    WHEN jsonb_typeof(k.value->'counterpartyAllowlist') = 'array'
      THEN ARRAY(
        SELECT lower(item.address)
        FROM jsonb_array_elements_text(k.value->'counterpartyAllowlist') AS item(address)
        WHERE lower(item.address) ~ '^0x[0-9a-f]{40}$'
        LIMIT 100
      )
    ELSE ARRAY[]::text[]
  END,
  left(coalesce(k.value->>'notes', ''), 2000),
  now(),
  now()
FROM public.kv_store_b0d68fc8 AS k
WHERE k.key LIKE 'ai\_m2m\_wallet\_config:%' ESCAPE '\'
  AND jsonb_typeof(k.value) = 'object'
  AND lower(coalesce(k.value->>'walletAddress', '')) ~ '^0x[0-9a-f]{40}$'
ON CONFLICT (wallet_address) DO NOTHING;

WITH legacy_delegates AS (
  SELECT
    lower(replace(k.key, 'ai_m2m_wallet_delegates:', '')) AS root_wallet_address,
    item.delegate
  FROM public.kv_store_b0d68fc8 AS k
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(k.value) = 'array' THEN k.value ELSE '[]'::jsonb END
  ) AS item(delegate)
  WHERE k.key LIKE 'ai\_m2m\_wallet\_delegates:%' ESCAPE '\'
    AND jsonb_typeof(k.value) = 'array'
)
INSERT INTO public.m2m_delegates (
  id,
  root_wallet_address,
  delegate_address,
  mode,
  status,
  label,
  managed_by_server,
  created_at,
  verified_at
)
SELECT
  delegate->>'id',
  root_wallet_address,
  lower(delegate->>'delegateAddress'),
  CASE WHEN delegate->>'mode' = 'enrolled' THEN 'enrolled' ELSE 'generated' END,
  CASE WHEN delegate->>'status' = 'revoked' THEN 'revoked' ELSE 'verified' END,
  nullif(left(coalesce(delegate->>'label', ''), 200), ''),
  coalesce(delegate->>'managedByServer', 'false') = 'true',
  now(),
  now()
FROM legacy_delegates
WHERE coalesce(delegate->>'id', '') ~ '^delegate_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND root_wallet_address ~ '^0x[0-9a-f]{40}$'
  AND lower(coalesce(delegate->>'delegateAddress', '')) ~ '^0x[0-9a-f]{40}$'
ON CONFLICT (id) DO NOTHING;

-- Keep at most one active delegate row for the same root/delegate pair. Legacy
-- duplicates remain auditable as revoked rows instead of blocking the cutover.
WITH ranked_verified_delegates AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY root_wallet_address, delegate_address
      ORDER BY verified_at DESC NULLS LAST, created_at DESC NULLS LAST, id
    ) AS duplicate_rank
  FROM public.m2m_delegates
  WHERE status = 'verified'
)
UPDATE public.m2m_delegates AS delegate
SET status = 'revoked'
FROM ranked_verified_delegates AS ranked
WHERE delegate.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_m2m_delegates_one_verified_address
  ON public.m2m_delegates (root_wallet_address, delegate_address)
  WHERE status = 'verified';

INSERT INTO public.m2m_delegate_secrets (
  delegate_id,
  version,
  iv_hex,
  ciphertext_hex,
  created_at
)
SELECT
  replace(k.key, 'ai_m2m_wallet_delegate_secret:', ''),
  1,
  lower(k.value->>'ivHex'),
  lower(k.value->>'ciphertextHex'),
  now()
FROM public.kv_store_b0d68fc8 AS k
WHERE k.key LIKE 'ai\_m2m\_wallet\_delegate\_secret:%' ESCAPE '\'
  AND jsonb_typeof(k.value) = 'object'
  AND coalesce(k.value->>'version', '') = '1'
  AND coalesce(k.value->>'ivHex', '') ~ '^[0-9a-fA-F]{24}$'
  AND coalesce(k.value->>'ciphertextHex', '') ~ '^[0-9a-fA-F]{164}$'
  AND EXISTS (
    SELECT 1
    FROM public.m2m_delegates AS d
    WHERE d.id = replace(k.key, 'ai_m2m_wallet_delegate_secret:', '')
      AND d.managed_by_server = true
  )
ON CONFLICT (delegate_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.atp2_create_m2m_delegate_invite_v1(
  p_id text,
  p_root_wallet_address text,
  p_expires_at timestamptz
)
RETURNS public.m2m_delegate_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_root text := lower(btrim(coalesce(p_root_wallet_address, '')));
  v_now timestamptz := clock_timestamp();
  v_invite public.m2m_delegate_invites%ROWTYPE;
BEGIN
  IF coalesce(p_id, '') !~ '^m2m_[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'm2m_invalid_invite_id';
  END IF;
  IF v_root !~ '^0x[0-9a-f]{40}$' THEN
    RAISE EXCEPTION 'm2m_invalid_root_wallet';
  END IF;
  IF p_expires_at <= v_now OR p_expires_at > v_now + interval '25 hours' THEN
    RAISE EXCEPTION 'm2m_invalid_invite_expiry';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('m2m_invites:' || v_root, 0));

  UPDATE public.m2m_delegate_invites
  SET status = 'expired'
  WHERE root_wallet_address = v_root
    AND status = 'pending'
    AND expires_at <= v_now;

  IF (
    SELECT count(*)
    FROM public.m2m_delegate_invites
    WHERE root_wallet_address = v_root
      AND status = 'pending'
      AND expires_at > v_now
  ) >= 20 THEN
    RAISE EXCEPTION 'm2m_pending_invite_limit_reached';
  END IF;

  INSERT INTO public.m2m_delegate_invites (
    id,
    root_wallet_address,
    status,
    created_at,
    expires_at,
    claimed_at,
    claimed_by_wallet_address
  )
  VALUES (p_id, v_root, 'pending', v_now, p_expires_at, NULL, NULL)
  RETURNING * INTO v_invite;

  RETURN v_invite;
END;
$$;

CREATE OR REPLACE FUNCTION public.atp2_register_m2m_managed_delegate_v1(
  p_id text,
  p_root_wallet_address text,
  p_delegate_address text,
  p_label text,
  p_iv_hex text,
  p_ciphertext_hex text
)
RETURNS public.m2m_delegates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_root text := lower(btrim(coalesce(p_root_wallet_address, '')));
  v_delegate_address text := lower(btrim(coalesce(p_delegate_address, '')));
  v_now timestamptz := clock_timestamp();
  v_delegate public.m2m_delegates%ROWTYPE;
BEGIN
  IF coalesce(p_id, '') !~ '^delegate_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'm2m_invalid_delegate_id';
  END IF;
  IF v_root !~ '^0x[0-9a-f]{40}$' OR v_delegate_address !~ '^0x[0-9a-f]{40}$' THEN
    RAISE EXCEPTION 'm2m_invalid_delegate_wallet';
  END IF;
  IF v_root = v_delegate_address THEN
    RAISE EXCEPTION 'm2m_delegate_matches_root';
  END IF;
  IF length(coalesce(p_label, '')) > 200
    OR coalesce(p_iv_hex, '') !~ '^[0-9a-fA-F]{24}$'
    OR coalesce(p_ciphertext_hex, '') !~ '^[0-9a-fA-F]{164}$' THEN
    RAISE EXCEPTION 'm2m_invalid_managed_secret';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('m2m_delegates:' || v_root, 0));

  IF EXISTS (
    SELECT 1
    FROM public.m2m_delegates
    WHERE root_wallet_address = v_root
      AND delegate_address = v_delegate_address
      AND status = 'verified'
  ) THEN
    RAISE EXCEPTION 'm2m_delegate_already_registered';
  END IF;

  IF (
    SELECT count(*)
    FROM public.m2m_delegates
    WHERE root_wallet_address = v_root
      AND status = 'verified'
  ) >= 20 THEN
    RAISE EXCEPTION 'm2m_delegate_limit_reached';
  END IF;

  INSERT INTO public.m2m_delegates (
    id,
    root_wallet_address,
    delegate_address,
    mode,
    status,
    label,
    managed_by_server,
    created_at,
    verified_at
  )
  VALUES (
    p_id,
    v_root,
    v_delegate_address,
    'generated',
    'verified',
    nullif(btrim(coalesce(p_label, '')), ''),
    true,
    v_now,
    v_now
  )
  RETURNING * INTO v_delegate;

  INSERT INTO public.m2m_delegate_secrets (
    delegate_id,
    version,
    iv_hex,
    ciphertext_hex,
    created_at
  )
  VALUES (
    v_delegate.id,
    1,
    lower(p_iv_hex),
    lower(p_ciphertext_hex),
    v_now
  );

  RETURN v_delegate;
END;
$$;

CREATE OR REPLACE FUNCTION public.atp2_claim_m2m_delegate_invite_v1(
  p_invite_id text,
  p_claimed_wallet_address text,
  p_delegate_id text
)
RETURNS public.m2m_delegates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_claimed_wallet text := lower(btrim(coalesce(p_claimed_wallet_address, '')));
  v_now timestamptz := clock_timestamp();
  v_invite public.m2m_delegate_invites%ROWTYPE;
  v_delegate public.m2m_delegates%ROWTYPE;
BEGIN
  IF coalesce(p_invite_id, '') !~ '^m2m_[0-9a-f]{64}$'
    OR coalesce(p_delegate_id, '') !~ '^delegate_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR v_claimed_wallet !~ '^0x[0-9a-f]{40}$' THEN
    RAISE EXCEPTION 'm2m_invalid_invite_claim';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.m2m_delegate_invites
  WHERE id = p_invite_id
  FOR UPDATE;

  IF NOT FOUND
    OR v_invite.status <> 'pending'
    OR v_invite.expires_at <= v_now THEN
    RAISE EXCEPTION 'm2m_invite_unavailable';
  END IF;
  IF v_invite.root_wallet_address = v_claimed_wallet THEN
    RAISE EXCEPTION 'm2m_delegate_matches_root';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('m2m_delegates:' || v_invite.root_wallet_address, 0)
  );

  SELECT *
  INTO v_delegate
  FROM public.m2m_delegates
  WHERE root_wallet_address = v_invite.root_wallet_address
    AND delegate_address = v_claimed_wallet
    AND status = 'verified'
  ORDER BY verified_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    IF (
      SELECT count(*)
      FROM public.m2m_delegates
      WHERE root_wallet_address = v_invite.root_wallet_address
        AND status = 'verified'
    ) >= 20 THEN
      RAISE EXCEPTION 'm2m_delegate_limit_reached';
    END IF;

    INSERT INTO public.m2m_delegates (
      id,
      root_wallet_address,
      delegate_address,
      mode,
      status,
      label,
      managed_by_server,
      created_at,
      verified_at
    )
    VALUES (
      p_delegate_id,
      v_invite.root_wallet_address,
      v_claimed_wallet,
      'enrolled',
      'verified',
      NULL,
      false,
      v_now,
      v_now
    )
    RETURNING * INTO v_delegate;
  END IF;

  UPDATE public.m2m_delegate_invites
  SET
    status = 'claimed',
    claimed_at = v_now,
    claimed_by_wallet_address = v_claimed_wallet
  WHERE id = v_invite.id;

  RETURN v_delegate;
END;
$$;

REVOKE ALL ON FUNCTION public.atp2_create_m2m_delegate_invite_v1(text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.atp2_register_m2m_managed_delegate_v1(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.atp2_claim_m2m_delegate_invite_v1(text, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.atp2_create_m2m_delegate_invite_v1(text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.atp2_register_m2m_managed_delegate_v1(text, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.atp2_claim_m2m_delegate_invite_v1(text, text, text) TO service_role;

COMMENT ON FUNCTION public.atp2_create_m2m_delegate_invite_v1(text, text, timestamptz)
  IS 'Service-role-only atomic creation of bounded M2M delegate invites.';
COMMENT ON FUNCTION public.atp2_register_m2m_managed_delegate_v1(text, text, text, text, text, text)
  IS 'Service-role-only atomic registration of a managed M2M delegate and its AES-GCM ciphertext.';
COMMENT ON FUNCTION public.atp2_claim_m2m_delegate_invite_v1(text, text, text)
  IS 'Service-role-only one-time invite claim with serialized per-root delegate capacity enforcement.';
