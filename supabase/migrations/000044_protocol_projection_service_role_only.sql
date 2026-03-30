-- ATP2 Batch C15 / protocol projection hardening
-- Goal:
--   - restore protocol_assets and protocol_orders to service-role-only writes
--   - keep public read access intact
-- Rationale:
--   - these tables are canonical chain projections
--   - authenticated wallet sessions must not author or mutate canonical projection rows
--   - runtime/client-side shadow state belongs in local storage or separate shadow tables

drop policy if exists protocol_assets_authenticated_insert_owner_v1 on public.protocol_assets;
drop policy if exists protocol_assets_authenticated_update_owner_v1 on public.protocol_assets;
drop policy if exists protocol_assets_authenticated_delete_owner_v1 on public.protocol_assets;

drop policy if exists protocol_orders_authenticated_insert_party_v1 on public.protocol_orders;
drop policy if exists protocol_orders_authenticated_update_party_v1 on public.protocol_orders;
drop policy if exists protocol_orders_authenticated_delete_party_v1 on public.protocol_orders;
