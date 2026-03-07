-- ATP2 Phase C / Batch C5 messaging schema + RLS audit snapshot (single-result)
-- Purpose: verify C5 messaging schema + RLS after applying 000012 + 000013.
-- SQL Editor note: returns ONE result table.
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.

drop table if exists pg_temp._atp2_c5_messaging_audit;

create temporary table _atp2_c5_messaging_audit (
  seq integer primary key,
  section text not null,
  payload jsonb not null
);

insert into _atp2_c5_messaging_audit (seq, section, payload)
select
  0,
  'context',
  jsonb_build_object(
    'audited_at', now(),
    'database_name', current_database(),
    'db_user', current_user
  );

insert into _atp2_c5_messaging_audit (seq, section, payload)
with expected(table_name) as (
  values ('conversations'), ('conversation_participants'), ('messages')
),
runtime as (
  select c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
),
present as (
  select e.table_name from expected e join runtime r using (table_name)
),
missing as (
  select e.table_name from expected e left join runtime r using (table_name) where r.table_name is null
)
select
  1,
  'c5_messaging_tables_presence',
  jsonb_build_object(
    'present', coalesce((select jsonb_agg(table_name order by table_name) from present), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(table_name order by table_name) from missing), '[]'::jsonb)
  );

insert into _atp2_c5_messaging_audit (seq, section, payload)
with expected(table_name, column_name) as (
  values
    ('conversations', 'id'),
    ('conversations', 'type'),
    ('conversations', 'updated_at'),
    ('conversation_participants', 'conversation_id'),
    ('conversation_participants', 'user_id'),
    ('conversation_participants', 'last_read_at'),
    ('messages', 'id'),
    ('messages', 'conversation_id'),
    ('messages', 'sender_user_id'),
    ('messages', 'client_message_id'),
    ('messages', 'attachments'),
    ('messages', 'edited_at'),
    ('messages', 'deleted_at')
),
runtime as (
  select table_name, column_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name in ('conversations', 'conversation_participants', 'messages')
),
present as (
  select e.table_name, e.column_name from expected e join runtime r using (table_name, column_name)
),
missing as (
  select e.table_name, e.column_name
  from expected e
  left join runtime r using (table_name, column_name)
  where r.column_name is null
)
select
  2,
  'c5_key_columns_presence',
  jsonb_build_object(
    'present', coalesce((select jsonb_agg(jsonb_build_object('table', table_name, 'column', column_name) order by table_name, column_name) from present), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(jsonb_build_object('table', table_name, 'column', column_name) order by table_name, column_name) from missing), '[]'::jsonb)
  );

insert into _atp2_c5_messaging_audit (seq, section, payload)
with expected(indexname) as (
  values
    ('idx_messages_conversation_sender_client_message_id_uk'),
    ('idx_conversations_updated_at_desc'),
    ('idx_conversation_participants_user_id_joined_at_desc'),
    ('idx_conversation_participants_user_id_last_read_at_desc'),
    ('idx_messages_conversation_id_created_at_desc'),
    ('idx_messages_sender_user_id_created_at_desc'),
    ('idx_messages_conversation_id_visible_created_at_desc')
),
runtime as (
  select indexname
  from pg_indexes
  where schemaname = 'public'
    and tablename in ('conversations', 'conversation_participants', 'messages')
),
present as (
  select e.indexname from expected e join runtime r using (indexname)
),
missing as (
  select e.indexname from expected e left join runtime r using (indexname) where r.indexname is null
)
select
  3,
  'c5_indexes_presence',
  jsonb_build_object(
    'present', coalesce((select jsonb_agg(indexname order by indexname) from present), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(indexname order by indexname) from missing), '[]'::jsonb)
  );

insert into _atp2_c5_messaging_audit (seq, section, payload)
with expected(proname) as (
  values
    ('touch_conversation_updated_at_on_message_change_c5_v1'),
    ('atp2_is_conversation_participant_v1')
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
  4,
  'c5_helper_functions_presence',
  jsonb_build_object(
    'present', coalesce((select jsonb_agg(proname order by proname) from present), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(proname order by proname) from missing), '[]'::jsonb)
  );

insert into _atp2_c5_messaging_audit (seq, section, payload)
with expected(tgname) as (
  values
    ('trg_conversations_set_updated_at'),
    ('trg_messages_touch_conversations_updated_at_c5_v1')
),
runtime as (
  select tgname
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and not t.tgisinternal
    and c.relname in ('conversations', 'messages')
),
present as (
  select e.tgname from expected e join runtime r using (tgname)
),
missing as (
  select e.tgname from expected e left join runtime r using (tgname) where r.tgname is null
)
select
  5,
  'c5_triggers_presence',
  jsonb_build_object(
    'present', coalesce((select jsonb_agg(tgname order by tgname) from present), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(tgname order by tgname) from missing), '[]'::jsonb)
  );

insert into _atp2_c5_messaging_audit (seq, section, payload)
with expected_enabled(table_name) as (
  values ('conversations'), ('conversation_participants'), ('messages')
),
state as (
  select c.relname as table_name, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
),
present as (
  select e.table_name
  from expected_enabled e
  join state s on s.table_name = e.table_name and s.rls_enabled = true
),
missing as (
  select e.table_name
  from expected_enabled e
  left join state s on s.table_name = e.table_name and s.rls_enabled = true
  where s.table_name is null
)
select
  6,
  'c5_expected_rls_enabled_tables',
  jsonb_build_object(
    'enabled_present', coalesce((select jsonb_agg(table_name order by table_name) from present), '[]'::jsonb),
    'enabled_missing', coalesce((select jsonb_agg(table_name order by table_name) from missing), '[]'::jsonb)
  );

insert into _atp2_c5_messaging_audit (seq, section, payload)
with expected(policyname) as (
  values
    ('conversations_select_participant_claim_c5_v1'),
    ('conversations_service_role_all_c5_v1'),
    ('conversation_participants_select_participant_claim_c5_v1'),
    ('conversation_participants_update_self_claim_c5_v1'),
    ('conversation_participants_service_role_all_c5_v1'),
    ('messages_select_participant_claim_c5_v1'),
    ('messages_insert_sender_participant_claim_c5_v1'),
    ('messages_update_sender_participant_claim_c5_v1'),
    ('messages_delete_sender_participant_claim_c5_v1'),
    ('messages_service_role_all_c5_v1')
),
runtime as (
  select policyname
  from pg_policies
  where schemaname = 'public'
    and tablename in ('conversations', 'conversation_participants', 'messages')
),
present as (
  select e.policyname from expected e join runtime r using (policyname)
),
missing as (
  select e.policyname from expected e left join runtime r using (policyname) where r.policyname is null
)
select
  7,
  'c5_expected_policies_presence',
  jsonb_build_object(
    'present', coalesce((select jsonb_agg(policyname order by policyname) from present), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(policyname order by policyname) from missing), '[]'::jsonb)
  );

insert into _atp2_c5_messaging_audit (seq, section, payload)
select
  8,
  'c5_policy_snapshot_messaging_tables',
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
  and tablename in ('conversations', 'conversation_participants', 'messages');

insert into _atp2_c5_messaging_audit (seq, section, payload)
select
  9,
  'c5_realtime_candidate_tables_present',
  jsonb_build_object(
    'present', coalesce(
      (
        select jsonb_agg(c.relname order by c.relname)
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'r'
          and c.relname in ('messages', 'conversation_participants')
      ),
      '[]'::jsonb
    )
  );

select seq, section, payload
from _atp2_c5_messaging_audit
order by seq;
