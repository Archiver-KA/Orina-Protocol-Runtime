-- ATP2 Phase B / Batch H2 RLS Hardening Audit Snapshot (single-result)
-- Purpose: verify H2 hardening migration after apply (owner-scoped claim-based RLS)
-- Scope: no messaging, Batch 4C temp policies retired, Batch 4A public read subset preserved.
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.

drop table if exists pg_temp._atp2_h2_rls_hardening_audit;

create temporary table _atp2_h2_rls_hardening_audit (
  seq integer primary key,
  section text not null,
  payload jsonb not null
);

insert into _atp2_h2_rls_hardening_audit (seq, section, payload)
select
  0,
  'context',
  jsonb_build_object(
    'audited_at', now(),
    'database_name', current_database(),
    'db_user', current_user
  );

insert into _atp2_h2_rls_hardening_audit (seq, section, payload)
with expected(proname) as (
  values
    ('atp2_claim_wallet_address_v1'),
    ('atp2_claim_profile_id_text_v1'),
    ('atp2_claim_role_v1')
),
runtime as (
  select p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
present as (
  select e.proname from expected e join runtime r using (proname)
),
missing as (
  select e.proname from expected e left join runtime r using (proname) where r.proname is null
)
select
  1,
  'h2_claim_helper_functions_presence',
  jsonb_build_object(
    'present', coalesce((select jsonb_agg(proname order by proname) from present), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(proname order by proname) from missing), '[]'::jsonb)
  );

insert into _atp2_h2_rls_hardening_audit (seq, section, payload)
with expected_enabled(table_name) as (
  values
    ('profiles'),
    ('community_posts'),
    ('community_comments'),
    ('community_reactions'),
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
present as (
  select e.table_name from expected_enabled e join state s on s.table_name = e.table_name and s.rls_enabled = true
),
missing as (
  select e.table_name from expected_enabled e left join state s on s.table_name = e.table_name and s.rls_enabled = true where s.table_name is null
)
select
  2,
  'h2_expected_rls_enabled_tables',
  jsonb_build_object(
    'enabled_present', coalesce((select jsonb_agg(table_name order by table_name) from present), '[]'::jsonb),
    'enabled_missing', coalesce((select jsonb_agg(table_name order by table_name) from missing), '[]'::jsonb)
  );

insert into _atp2_h2_rls_hardening_audit (seq, section, payload)
with temp_b4c(policyname) as (
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
still_present as (
  select t.policyname from temp_b4c t join runtime r using (policyname)
)
select
  3,
  'batch4c_temp_policies_should_be_removed',
  coalesce((select jsonb_agg(policyname order by policyname) from still_present), '[]'::jsonb);

insert into _atp2_h2_rls_hardening_audit (seq, section, payload)
with expected(policyname) as (
  values
    ('profiles_insert_owner_claim_h2_v1'),
    ('profiles_update_owner_claim_h2_v1'),
    ('community_posts_insert_owner_claim_h2_v1'),
    ('community_posts_update_owner_claim_h2_v1'),
    ('community_posts_delete_owner_claim_h2_v1'),
    ('community_comments_insert_owner_claim_h2_v1'),
    ('community_comments_update_owner_claim_h2_v1'),
    ('community_comments_delete_owner_claim_h2_v1'),
    ('community_reactions_insert_owner_claim_h2_v1'),
    ('community_reactions_delete_owner_claim_h2_v1'),
    ('user_preferences_select_owner_claim_h2_v1'),
    ('user_preferences_insert_owner_claim_h2_v1'),
    ('user_preferences_update_owner_claim_h2_v1'),
    ('user_preferences_delete_owner_claim_h2_v1'),
    ('user_follows_select_public_h2_v1'),
    ('user_follows_insert_follower_owner_claim_h2_v1'),
    ('user_follows_delete_follower_owner_claim_h2_v1'),
    ('user_favorites_select_owner_claim_h2_v1'),
    ('user_favorites_insert_owner_claim_h2_v1'),
    ('user_favorites_delete_owner_claim_h2_v1'),
    ('user_watchlist_select_owner_claim_h2_v1'),
    ('user_watchlist_insert_owner_claim_h2_v1'),
    ('user_watchlist_update_owner_claim_h2_v1'),
    ('user_watchlist_delete_owner_claim_h2_v1'),
    ('watchlist_alerts_select_owner_claim_h2_v1'),
    ('watchlist_alerts_insert_owner_claim_h2_v1'),
    ('watchlist_alerts_update_owner_claim_h2_v1'),
    ('watchlist_alerts_delete_owner_claim_h2_v1'),
    ('notifications_select_owner_claim_h2_v1'),
    ('notifications_insert_owner_claim_h2_v1'),
    ('notifications_update_owner_claim_h2_v1'),
    ('notifications_delete_owner_claim_h2_v1'),
    ('notifications_service_role_all_h2_v1')
),
runtime as (
  select policyname from pg_policies where schemaname = 'public'
),
present as (
  select e.policyname from expected e join runtime r using (policyname)
),
missing as (
  select e.policyname from expected e left join runtime r using (policyname) where r.policyname is null
)
select
  4,
  'h2_expected_policies_presence',
  jsonb_build_object(
    'present', coalesce((select jsonb_agg(policyname order by policyname) from present), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(policyname order by policyname) from missing), '[]'::jsonb)
  );

insert into _atp2_h2_rls_hardening_audit (seq, section, payload)
with expected(policyname) as (
  values
    ('profiles_select_public_v1'),
    ('community_posts_select_public_visible_v1'),
    ('community_comments_select_public_visible_v1'),
    ('community_reactions_select_public_visible_v1')
),
runtime as (
  select policyname from pg_policies where schemaname = 'public'
),
present as (
  select e.policyname from expected e join runtime r using (policyname)
),
missing as (
  select e.policyname from expected e left join runtime r using (policyname) where r.policyname is null
)
select
  5,
  'batch4a_public_read_subset_still_present',
  jsonb_build_object(
    'present', coalesce((select jsonb_agg(policyname order by policyname) from present), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(policyname order by policyname) from missing), '[]'::jsonb)
  );

insert into _atp2_h2_rls_hardening_audit (seq, section, payload)
select
  6,
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

insert into _atp2_h2_rls_hardening_audit (seq, section, payload)
select
  7,
  'h2_policy_snapshot_touched_tables',
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
    'profiles',
    'community_posts',
    'community_comments',
    'community_reactions',
    'user_preferences',
    'user_follows',
    'user_favorites',
    'user_watchlist',
    'watchlist_alerts',
    'notifications'
  );

select seq, section, payload
from _atp2_h2_rls_hardening_audit
order by seq;
