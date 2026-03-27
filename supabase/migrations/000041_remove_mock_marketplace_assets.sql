-- ============================================================================
-- ATP2 Migration 000041: Remove legacy mock marketplace assets from public catalog
-- Purpose: delete old seeded public mock listing rows so Marketplace/Search only
--          show canonical live catalog data.
-- Notes:
-- - asset_media and asset_tag_map cascade on delete from assets_catalog
-- - asset_tags are left intact; only orphaned tag rows may remain
-- - deterministic owned fixtures (twf-*) are NOT touched
-- ============================================================================

delete from public.assets_catalog
where asset_uid in (
  'asset-001',
  'asset-002',
  'asset-003',
  'asset-004',
  'asset-005',
  'asset-009',
  'asset-010',
  'asset-011',
  'asset-013',
  'asset-014'
)
and coalesce(metadata->>'asset_namespace', '') = 'marketplace_listing'
and coalesce(metadata->>'seed_source', '') = 'c2_asset_metadata_seed_bridge_v1';

-- Optional hygiene: remove orphaned tags after asset_tag_map cascades.
delete from public.asset_tags
where not exists (
  select 1
  from public.asset_tag_map m
  where m.tag_id = public.asset_tags.id
);

-- ============================================================================
-- END OF MIGRATION 000041
-- ============================================================================
