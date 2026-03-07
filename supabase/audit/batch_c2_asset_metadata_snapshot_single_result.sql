-- ATP2 Phase C / Batch C2 Asset Metadata Snapshot (single-result)
-- Purpose: verify persisted asset metadata seed state for deterministic A/B fixtures and linked listing ids.
-- Scope: assets_catalog, asset_media, asset_tags, asset_tag_map (public metadata only; no chat)
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.

drop table if exists pg_temp._atp2_c2_asset_metadata_audit;

create temporary table _atp2_c2_asset_metadata_audit (
  seq integer primary key,
  section text not null,
  payload jsonb not null
);

insert into _atp2_c2_asset_metadata_audit (seq, section, payload)
select
  0,
  'context',
  jsonb_build_object(
    'audited_at', now(),
    'database_name', current_database(),
    'db_user', current_user
  );

insert into _atp2_c2_asset_metadata_audit (seq, section, payload)
with expected(asset_uid, namespace, expected_is_active) as (
  values
    ('twf-a-rwa-001', 'owned_fixture', false),
    ('twf-a-receipt-001', 'owned_fixture', false),
    ('twf-a-nft-001', 'owned_fixture', false),
    ('twf-b-rwa-001', 'owned_fixture', false),
    ('twf-b-receipt-001', 'owned_fixture', false),
    ('twf-b-nft-001', 'owned_fixture', false),
    ('asset-001', 'marketplace_listing', true),
    ('asset-002', 'marketplace_listing', true),
    ('asset-003', 'marketplace_listing', true),
    ('asset-004', 'marketplace_listing', true),
    ('asset-005', 'marketplace_listing', true),
    ('asset-009', 'marketplace_listing', true),
    ('asset-010', 'marketplace_listing', true),
    ('asset-011', 'marketplace_listing', true),
    ('asset-013', 'marketplace_listing', true),
    ('asset-014', 'marketplace_listing', true)
),
runtime as (
  select id, asset_uid, is_active, cover_image_url, metadata_version
  from public.assets_catalog
),
present as (
  select e.asset_uid, e.namespace, e.expected_is_active, r.id, r.is_active, r.cover_image_url, r.metadata_version
  from expected e
  join runtime r on r.asset_uid = e.asset_uid
),
missing as (
  select e.asset_uid
  from expected e
  left join runtime r on r.asset_uid = e.asset_uid
  where r.asset_uid is null
),
active_mismatch as (
  select asset_uid, expected_is_active, is_active
  from present
  where expected_is_active is distinct from is_active
)
select
  1,
  'catalog_expected_presence_and_state',
  jsonb_build_object(
    'missing', coalesce((select jsonb_agg(asset_uid order by asset_uid) from missing), '[]'::jsonb),
    'active_mismatch', coalesce((select jsonb_agg(jsonb_build_object('asset_uid', asset_uid, 'expected_is_active', expected_is_active, 'is_active', is_active) order by asset_uid) from active_mismatch), '[]'::jsonb),
    'present_count', (select count(*) from present)
  );

insert into _atp2_c2_asset_metadata_audit (seq, section, payload)
with expected as (
  select id, asset_uid
  from public.assets_catalog
  where asset_uid in (
    'twf-a-rwa-001','twf-a-receipt-001','twf-a-nft-001',
    'twf-b-rwa-001','twf-b-receipt-001','twf-b-nft-001',
    'asset-001','asset-002','asset-003','asset-004','asset-005',
    'asset-009','asset-010','asset-011','asset-013','asset-014'
  )
),
media_counts as (
  select e.asset_uid, count(m.id)::int as media_count
  from expected e
  left join public.asset_media m on m.asset_id = e.id
  group by e.asset_uid
),
tag_counts as (
  select e.asset_uid, count(tm.tag_id)::int as tag_count
  from expected e
  left join public.asset_tag_map tm on tm.asset_id = e.id
  group by e.asset_uid
),
media_missing as (
  select asset_uid from media_counts where media_count < 1
),
tags_missing as (
  select asset_uid from tag_counts where tag_count < 1
)
select
  2,
  'media_and_tag_map_coverage',
  jsonb_build_object(
    'media_missing', coalesce((select jsonb_agg(asset_uid order by asset_uid) from media_missing), '[]'::jsonb),
    'tags_missing', coalesce((select jsonb_agg(asset_uid order by asset_uid) from tags_missing), '[]'::jsonb),
    'media_counts', coalesce((select jsonb_agg(jsonb_build_object('asset_uid', asset_uid, 'count', media_count) order by asset_uid) from media_counts), '[]'::jsonb),
    'tag_counts', coalesce((select jsonb_agg(jsonb_build_object('asset_uid', asset_uid, 'count', tag_count) order by asset_uid) from tag_counts), '[]'::jsonb)
  );

insert into _atp2_c2_asset_metadata_audit (seq, section, payload)
select
  3,
  'catalog_snapshot',
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'asset_uid', asset_uid,
        'title', title,
        'slug', slug,
        'is_active', is_active,
        'cover_image_url', cover_image_url,
        'metadata_version', metadata_version
      )
      order by asset_uid
    ),
    '[]'::jsonb
  )
from public.assets_catalog
where asset_uid in (
  'twf-a-rwa-001','twf-a-receipt-001','twf-a-nft-001',
  'twf-b-rwa-001','twf-b-receipt-001','twf-b-nft-001',
  'asset-001','asset-002','asset-003','asset-004','asset-005',
  'asset-009','asset-010','asset-011','asset-013','asset-014'
);

insert into _atp2_c2_asset_metadata_audit (seq, section, payload)
select
  4,
  'rls_public_read_assets_tables',
  jsonb_build_object(
    'assets_catalog_public_read_policy_present', exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'assets_catalog' and policyname = 'assets_catalog_select_active_v1'
    ),
    'asset_media_public_read_policy_present', exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'asset_media' and policyname = 'asset_media_select_public_v1'
    ),
    'asset_tags_public_read_policy_present', exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'asset_tags' and policyname = 'asset_tags_select_public_v1'
    ),
    'asset_tag_map_public_read_policy_present', exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'asset_tag_map' and policyname = 'asset_tag_map_select_public_v1'
    )
  );

select seq, section, payload
from _atp2_c2_asset_metadata_audit
order by seq;

