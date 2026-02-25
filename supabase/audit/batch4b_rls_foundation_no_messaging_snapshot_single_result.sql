-- ATP2 Batch 4B RLS Foundation Audit Snapshot (single-result)
-- Purpose: verify Batch 4A RLS foundation state (no messaging) after applying migration 000008.
-- SQL Editor note: returns ONE result table to avoid "only last SELECT" confusion.
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.

drop table if exists pg_temp._atp2_batch4b_rls_audit;

create temporary table _atp2_batch4b_rls_audit (
  seq integer primary key,
  section text not null,
  payload jsonb not null
);

insert into _atp2_batch4b_rls_audit (seq, section, payload)
select
  0,
  'context',
  jsonb_build_object(
    'audited_at', now(),
    'database_name', current_database(),
    'db_user', current_user
  );

insert into _atp2_batch4b_rls_audit (seq, section, payload)
with expected_enabled(table_name) as (
  values
    ('wallet_auth_challenges'),
    ('wallet_sessions'),
    ('profiles'),
    ('assets_catalog'),
    ('asset_media'),
    ('asset_tags'),
    ('asset_tag_map'),
    ('user_badges'),
    ('community_posts'),
    ('community_comments'),
    ('community_reactions'),
    ('protocol_assets'),
    ('protocol_asset_events'),
    ('protocol_orders'),
    ('protocol_order_events'),
    ('asset_protocol_links')
),
state as (
  select c.relname as table_name, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
),
enabled_present as (
  select e.table_name
  from expected_enabled e
  join state s on s.table_name = e.table_name and s.rls_enabled = true
),
enabled_missing as (
  select e.table_name
  from expected_enabled e
  left join state s on s.table_name = e.table_name and s.rls_enabled = true
  where s.table_name is null
)
select
  1,
  'expected_rls_enabled_tables',
  jsonb_build_object(
    'enabled_present', coalesce((select jsonb_agg(table_name order by table_name) from enabled_present), '[]'::jsonb),
    'enabled_missing', coalesce((select jsonb_agg(table_name order by table_name) from enabled_missing), '[]'::jsonb)
  );

insert into _atp2_batch4b_rls_audit (seq, section, payload)
with expected_disabled(table_name) as (
  values
    ('user_preferences'),
    ('user_follows'),
    ('user_favorites'),
    ('user_watchlist'),
    ('watchlist_alerts'),
    ('notifications')
),
state as (
  select c.relname as table_name, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
),
disabled_present as (
  select e.table_name
  from expected_disabled e
  join state s on s.table_name = e.table_name and s.rls_enabled = false
),
disabled_missing as (
  select e.table_name
  from expected_disabled e
  left join state s on s.table_name = e.table_name and s.rls_enabled = false
  where s.table_name is null
)
select
  2,
  'owner_scoped_deferred_rls_disabled_tables',
  jsonb_build_object(
    'disabled_present', coalesce((select jsonb_agg(table_name order by table_name) from disabled_present), '[]'::jsonb),
    'disabled_missing', coalesce((select jsonb_agg(table_name order by table_name) from disabled_missing), '[]'::jsonb)
  );

insert into _atp2_batch4b_rls_audit (seq, section, payload)
with expected(policyname) as (
  values
    ('profiles_select_public_v1'),
    ('assets_catalog_select_active_v1'),
    ('asset_media_select_public_v1'),
    ('asset_tags_select_public_v1'),
    ('asset_tag_map_select_public_v1'),
    ('user_badges_select_public_v1'),
    ('community_posts_select_public_visible_v1'),
    ('community_comments_select_public_visible_v1'),
    ('community_reactions_select_public_visible_v1'),
    ('protocol_assets_select_public_v1'),
    ('protocol_asset_events_select_public_v1'),
    ('protocol_orders_select_public_v1'),
    ('protocol_order_events_select_public_v1'),
    ('asset_protocol_links_select_public_v1'),
    ('wallet_auth_challenges_service_role_all_v1'),
    ('wallet_sessions_service_role_all_v1'),
    ('user_badges_service_role_all_v1'),
    ('assets_catalog_service_role_all_v1'),
    ('protocol_assets_service_role_all_v1'),
    ('protocol_asset_events_service_role_all_v1'),
    ('protocol_orders_service_role_all_v1'),
    ('protocol_order_events_service_role_all_v1'),
    ('asset_protocol_links_service_role_all_v1')
),
runtime as (
  select policyname
  from pg_policies
  where schemaname = 'public'
),
present as (
  select e.policyname
  from expected e
  join runtime r using (policyname)
),
missing as (
  select e.policyname
  from expected e
  left join runtime r using (policyname)
  where r.policyname is null
)
select
  3,
  'batch4a_expected_policies_presence',
  jsonb_build_object(
    'present', coalesce((select jsonb_agg(policyname order by policyname) from present), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(policyname order by policyname) from missing), '[]'::jsonb)
  );

insert into _atp2_batch4b_rls_audit (seq, section, payload)
select
  4,
  'messaging_policy_presence_should_be_empty',
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tablename', tablename,
        'policyname', policyname
      )
      order by tablename, policyname
    ),
    '[]'::jsonb
  )
from pg_policies
where schemaname = 'public'
  and tablename in ('conversations', 'conversation_participants', 'messages');

insert into _atp2_batch4b_rls_audit (seq, section, payload)
select
  5,
  'batch4a_policy_snapshot_touched_tables',
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tablename', tablename,
        'policyname', policyname,
        'cmd', cmd,
        'roles', roles,
        'qual', qual,
        'with_check', with_check
      )
      order by tablename, policyname
    ),
    '[]'::jsonb
  )
from pg_policies
where schemaname = 'public'
  and tablename in (
    'wallet_auth_challenges',
    'wallet_sessions',
    'profiles',
    'assets_catalog',
    'asset_media',
    'asset_tags',
    'asset_tag_map',
    'user_badges',
    'community_posts',
    'community_comments',
    'community_reactions',
    'protocol_assets',
    'protocol_asset_events',
    'protocol_orders',
    'protocol_order_events',
    'asset_protocol_links'
  );

select seq, section, payload
from _atp2_batch4b_rls_audit
order by seq;
