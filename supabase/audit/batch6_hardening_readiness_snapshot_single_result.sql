-- ATP2 Batch 6 Hardening Readiness Snapshot (single-result)
-- Purpose: verify current state before replacing Batch 4C temporary client-write policies.
-- SQL Editor note: returns ONE result table.
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.

drop table if exists pg_temp._atp2_batch6_hardening_audit;

create temporary table _atp2_batch6_hardening_audit (
  seq integer primary key,
  section text not null,
  payload jsonb not null
);

insert into _atp2_batch6_hardening_audit (seq, section, payload)
select
  0,
  'context',
  jsonb_build_object(
    'audited_at', now(),
    'database_name', current_database(),
    'db_user', current_user
  );

insert into _atp2_batch6_hardening_audit (seq, section, payload)
with expected(policyname) as (
  values
    ('profiles_insert_public_temp_b4c_v1'),
    ('profiles_update_public_temp_b4c_v1'),
    ('community_posts_insert_public_temp_b4c_v1'),
    ('community_posts_update_public_temp_b4c_v1'),
    ('community_posts_delete_public_temp_b4c_v1'),
    ('community_comments_insert_public_temp_b4c_v1'),
    ('community_comments_update_public_temp_b4c_v1'),
    ('community_comments_delete_public_temp_b4c_v1'),
    ('community_reactions_insert_public_temp_b4c_v1'),
    ('community_reactions_delete_public_temp_b4c_v1')
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
  1,
  'batch4c_temp_policies_still_present',
  jsonb_build_object(
    'present', coalesce((select jsonb_agg(policyname order by policyname) from present), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(policyname order by policyname) from missing), '[]'::jsonb)
  );

insert into _atp2_batch6_hardening_audit (seq, section, payload)
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
  'owner_scoped_deferred_tables_rls_disabled',
  jsonb_build_object(
    'disabled_present', coalesce((select jsonb_agg(table_name order by table_name) from disabled_present), '[]'::jsonb),
    'disabled_missing', coalesce((select jsonb_agg(table_name order by table_name) from disabled_missing), '[]'::jsonb)
  );

insert into _atp2_batch6_hardening_audit (seq, section, payload)
with expected_enabled(table_name) as (
  values
    ('profiles'),
    ('community_posts'),
    ('community_comments'),
    ('community_reactions')
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
  3,
  'profiles_community_rls_enabled_for_temp_write_phase',
  jsonb_build_object(
    'enabled_present', coalesce((select jsonb_agg(table_name order by table_name) from enabled_present), '[]'::jsonb),
    'enabled_missing', coalesce((select jsonb_agg(table_name order by table_name) from enabled_missing), '[]'::jsonb)
  );

insert into _atp2_batch6_hardening_audit (seq, section, payload)
select
  4,
  'public_write_policies_on_profiles_community_snapshot',
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
  and tablename in ('profiles', 'community_posts', 'community_comments', 'community_reactions')
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL');

insert into _atp2_batch6_hardening_audit (seq, section, payload)
select
  5,
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

insert into _atp2_batch6_hardening_audit (seq, section, payload)
with expected(policyname) as (
  values
    ('profiles_select_public_v1'),
    ('community_posts_select_public_visible_v1'),
    ('community_comments_select_public_visible_v1'),
    ('community_reactions_select_public_visible_v1')
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
  6,
  'batch4a_public_read_subset_still_present',
  jsonb_build_object(
    'present', coalesce((select jsonb_agg(policyname order by policyname) from present), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(policyname order by policyname) from missing), '[]'::jsonb)
  );

select seq, section, payload
from _atp2_batch6_hardening_audit
order by seq;
