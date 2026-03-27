-- ============================================================================
-- ATP2 Migration 000042: Remove any remaining legacy mock marketplace listings
-- Purpose: delete all public catalog rows produced by the old bridge-based
--          marketplace mock seed so Marketplace/Search are fully canonical.
-- Notes:
-- - target is narrowed by metadata namespace + seed_source
-- - owned fixture rows are preserved because they use asset_namespace=owned_fixture
-- ============================================================================

delete from public.assets_catalog
where coalesce(metadata->>'asset_namespace', '') = 'marketplace_listing'
  and coalesce(metadata->>'seed_source', '') = 'c2_asset_metadata_seed_bridge_v1';

delete from public.asset_tags
where not exists (
  select 1
  from public.asset_tag_map m
  where m.tag_id = public.asset_tags.id
);

-- ============================================================================
-- END OF MIGRATION 000042
-- ============================================================================
