-- Runtime cleanup guardrails for hiding archived smoke projections from public reads
-- without mutating canonical chain projection rows.

CREATE TABLE IF NOT EXISTS public.protocol_projection_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  chain_id BIGINT NOT NULL,
  contract_address TEXT NOT NULL,
  entity_uid TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT true,
  archived BOOLEAN NOT NULL DEFAULT false,
  reason TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT protocol_projection_visibility_entity_type_chk
    CHECK (entity_type IN ('asset', 'order')),
  CONSTRAINT protocol_projection_visibility_contract_lower_chk
    CHECK (contract_address = lower(contract_address)),
  CONSTRAINT protocol_projection_visibility_entity_uid_nonempty_chk
    CHECK (btrim(entity_uid) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_protocol_projection_visibility_scope
  ON public.protocol_projection_visibility (entity_type, chain_id, contract_address, entity_uid);

CREATE INDEX IF NOT EXISTS idx_protocol_projection_visibility_hidden
  ON public.protocol_projection_visibility (hidden, archived, updated_at DESC);

ALTER TABLE public.protocol_projection_visibility ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_protocol_projection_visibility_updated_at'
  ) THEN
    CREATE TRIGGER trg_protocol_projection_visibility_updated_at
      BEFORE UPDATE ON public.protocol_projection_visibility
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

DROP POLICY IF EXISTS protocol_projection_visibility_service_role_all_v1
  ON public.protocol_projection_visibility;
CREATE POLICY protocol_projection_visibility_service_role_all_v1
  ON public.protocol_projection_visibility
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.protocol_projection_is_visible_v1(
  p_entity_type TEXT,
  p_chain_id BIGINT,
  p_contract_address TEXT,
  p_entity_uid TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_chain_id IS NULL THEN true
    WHEN NULLIF(BTRIM(COALESCE(p_contract_address, '')), '') IS NULL THEN true
    WHEN NULLIF(BTRIM(COALESCE(p_entity_uid, '')), '') IS NULL THEN true
    ELSE NOT EXISTS (
      SELECT 1
      FROM public.protocol_projection_visibility v
      WHERE v.entity_type = lower(BTRIM(COALESCE(p_entity_type, '')))
        AND v.chain_id = p_chain_id
        AND v.contract_address = lower(BTRIM(COALESCE(p_contract_address, '')))
        AND v.entity_uid = BTRIM(COALESCE(p_entity_uid, ''))
        AND v.hidden IS true
    )
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.protocol_projection_is_visible_v1(TEXT, BIGINT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protocol_projection_is_visible_v1(TEXT, BIGINT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.protocol_projection_is_visible_v1(TEXT, BIGINT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.protocol_projection_is_visible_v1(TEXT, BIGINT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.protocol_projection_is_visible_v1(TEXT, BIGINT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.protocol_projection_is_visible_v1(TEXT, BIGINT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.assets_catalog_projection_is_visible_v1(
  p_asset_id UUID,
  p_chain_id BIGINT,
  p_contract_address TEXT,
  p_token_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH linked_projection AS (
    SELECT l.chain_id, l.contract_address, l.token_id
    FROM public.asset_protocol_links l
    WHERE l.asset_id = p_asset_id
  )
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM linked_projection) THEN EXISTS (
      SELECT 1
      FROM linked_projection l
      WHERE public.protocol_projection_is_visible_v1(
        'asset',
        l.chain_id,
        l.contract_address,
        l.token_id
      )
    )
    ELSE public.protocol_projection_is_visible_v1(
      'asset',
      p_chain_id,
      p_contract_address,
      p_token_id
    )
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.assets_catalog_projection_is_visible_v1(UUID, BIGINT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assets_catalog_projection_is_visible_v1(UUID, BIGINT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assets_catalog_projection_is_visible_v1(UUID, BIGINT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.assets_catalog_projection_is_visible_v1(UUID, BIGINT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.assets_catalog_projection_is_visible_v1(UUID, BIGINT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assets_catalog_projection_is_visible_v1(UUID, BIGINT, TEXT, TEXT) TO service_role;

DROP POLICY IF EXISTS assets_catalog_select_active_v1 ON public.assets_catalog;
CREATE POLICY assets_catalog_select_active_v1
  ON public.assets_catalog
  FOR SELECT
  TO public
  USING (
    is_active = true
    AND public.assets_catalog_projection_is_visible_v1(
      id,
      chain_id,
      contract_address,
      token_id
    )
  );

DROP POLICY IF EXISTS asset_protocol_links_select_public_v1 ON public.asset_protocol_links;
CREATE POLICY asset_protocol_links_select_public_v1
  ON public.asset_protocol_links
  FOR SELECT
  TO public
  USING (
    public.protocol_projection_is_visible_v1(
      'asset',
      chain_id,
      contract_address,
      token_id
    )
  );

DROP POLICY IF EXISTS protocol_assets_select_public_v1 ON public.protocol_assets;
CREATE POLICY protocol_assets_select_public_v1
  ON public.protocol_assets
  FOR SELECT
  TO public
  USING (
    public.protocol_projection_is_visible_v1(
      'asset',
      chain_id,
      asset_contract,
      token_id
    )
  );

DROP POLICY IF EXISTS protocol_asset_events_select_public_v1 ON public.protocol_asset_events;
CREATE POLICY protocol_asset_events_select_public_v1
  ON public.protocol_asset_events
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.protocol_assets a
      WHERE a.id = protocol_asset_events.protocol_asset_id
        AND public.protocol_projection_is_visible_v1(
          'asset',
          a.chain_id,
          a.asset_contract,
          a.token_id
        )
    )
  );

DROP POLICY IF EXISTS protocol_orders_select_public_v1 ON public.protocol_orders;
CREATE POLICY protocol_orders_select_public_v1
  ON public.protocol_orders
  FOR SELECT
  TO public
  USING (
    public.protocol_projection_is_visible_v1(
      'order',
      chain_id,
      marketplace_contract,
      order_uid
    )
  );

DROP POLICY IF EXISTS protocol_order_events_select_public_v1 ON public.protocol_order_events;
CREATE POLICY protocol_order_events_select_public_v1
  ON public.protocol_order_events
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.protocol_orders o
      WHERE o.id = protocol_order_events.order_id
        AND public.protocol_projection_is_visible_v1(
          'order',
          o.chain_id,
          o.marketplace_contract,
          o.order_uid
        )
    )
  );

DROP POLICY IF EXISTS protocol_receipts_select_public ON public.protocol_receipts;
CREATE POLICY protocol_receipts_select_public
  ON public.protocol_receipts
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.protocol_orders o
      WHERE o.chain_id = protocol_receipts.chain_id
        AND o.order_uid = protocol_receipts.order_id::TEXT
        AND public.protocol_projection_is_visible_v1(
          'order',
          o.chain_id,
          o.marketplace_contract,
          o.order_uid
        )
    )
  );
