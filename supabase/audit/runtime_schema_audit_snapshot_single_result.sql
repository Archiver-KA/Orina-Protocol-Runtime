-- ATP2 / Supabase runtime schema audit snapshot (single-result)
-- Run in Supabase SQL Editor. It returns ONE result table with all sections.
-- Useful because SQL Editor commonly displays only the last SELECT result.
-- Strategy remains: Option A (new project). This is audit-only for old project.

drop table if exists pg_temp._atp2_audit_output;

create temporary table _atp2_audit_output (
  seq integer primary key,
  section text not null,
  payload jsonb not null
);

insert into _atp2_audit_output (seq, section, payload)
select
  0,
  'context',
  jsonb_build_object(
    'audited_at', now(),
    'database_name', current_database(),
    'db_user', current_user,
    'postgres_version', version()
  );

insert into _atp2_audit_output (seq, section, payload)
select
  1,
  'extensions_pgcrypto_citext',
  coalesce(jsonb_agg(extname order by extname), '[]'::jsonb)
from (
  select extname
  from pg_extension
  where extname in ('pgcrypto', 'citext')
) x;

insert into _atp2_audit_output (seq, section, payload)
with expected(table_name) as (
  values
    ('wallet_auth_challenges'),
    ('wallet_sessions'),
    ('profiles'),
    ('user_preferences'),
    ('user_badges'),
    ('assets_catalog'),
    ('asset_media'),
    ('asset_tags'),
    ('asset_tag_map'),
    ('user_follows'),
    ('user_favorites'),
    ('user_watchlist'),
    ('watchlist_alerts'),
    ('notifications'),
    ('community_posts'),
    ('community_comments'),
    ('community_reactions'),
    ('protocol_assets'),
    ('protocol_asset_events'),
    ('protocol_orders'),
    ('protocol_order_events'),
    ('asset_protocol_links')
),
runtime as (
  select table_name
  from information_schema.tables
  where table_schema = 'public'
    and table_type = 'BASE TABLE'
),
present as (
  select e.table_name
  from expected e
  join runtime r using (table_name)
),
missing as (
  select e.table_name
  from expected e
  left join runtime r using (table_name)
  where r.table_name is null
),
unexpected as (
  select r.table_name
  from runtime r
  left join expected e using (table_name)
  where e.table_name is null
)
select
  2,
  'tables_diff_vs_atp2_d1_no_messaging',
  jsonb_build_object(
    'expected_present', coalesce((select jsonb_agg(table_name order by table_name) from present), '[]'::jsonb),
    'expected_missing', coalesce((select jsonb_agg(table_name order by table_name) from missing), '[]'::jsonb),
    'unexpected_public', coalesce((select jsonb_agg(table_name order by table_name) from unexpected), '[]'::jsonb)
  );

insert into _atp2_audit_output (seq, section, payload)
select
  3,
  'deferred_messaging_tables_presence',
  coalesce(jsonb_agg(table_name order by table_name), '[]'::jsonb)
from (
  select table_name
  from information_schema.tables
  where table_schema = 'public'
    and table_name in ('conversations', 'conversation_participants', 'messages')
) t;

insert into _atp2_audit_output (seq, section, payload)
select
  4,
  'core_columns_snapshot',
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'table_name', c.table_name,
        'ordinal_position', c.ordinal_position,
        'column_name', c.column_name,
        'data_type', c.data_type,
        'udt_name', c.udt_name,
        'is_nullable', c.is_nullable,
        'column_default', c.column_default
      )
      order by c.table_name, c.ordinal_position
    ),
    '[]'::jsonb
  )
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in (
    'profiles',
    'wallet_sessions',
    'assets_catalog',
    'notifications',
    'community_posts',
    'community_comments',
    'protocol_orders'
  );

insert into _atp2_audit_output (seq, section, payload)
select
  5,
  'constraints_summary',
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'table_name', tc.table_name,
        'constraint_name', tc.constraint_name,
        'constraint_type', tc.constraint_type
      )
      order by tc.table_name, tc.constraint_type, tc.constraint_name
    ),
    '[]'::jsonb
  )
from information_schema.table_constraints tc
where tc.table_schema = 'public'
  and tc.table_name in (
    'wallet_auth_challenges',
    'wallet_sessions',
    'profiles',
    'user_preferences',
    'user_badges',
    'assets_catalog',
    'asset_media',
    'asset_tags',
    'asset_tag_map',
    'user_follows',
    'user_favorites',
    'user_watchlist',
    'watchlist_alerts',
    'notifications',
    'community_posts',
    'community_comments',
    'community_reactions',
    'protocol_assets',
    'protocol_asset_events',
    'protocol_orders',
    'protocol_order_events',
    'asset_protocol_links'
  );

insert into _atp2_audit_output (seq, section, payload)
select
  6,
  'indexes_definitions',
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tablename', tablename,
        'indexname', indexname,
        'indexdef', indexdef
      )
      order by tablename, indexname
    ),
    '[]'::jsonb
  )
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'wallet_auth_challenges',
    'wallet_sessions',
    'profiles',
    'user_preferences',
    'user_badges',
    'assets_catalog',
    'asset_media',
    'asset_tags',
    'asset_tag_map',
    'user_follows',
    'user_favorites',
    'user_watchlist',
    'watchlist_alerts',
    'notifications',
    'community_posts',
    'community_comments',
    'community_reactions',
    'protocol_assets',
    'protocol_asset_events',
    'protocol_orders',
    'protocol_order_events',
    'asset_protocol_links',
    'conversations',
    'conversation_participants',
    'messages'
  );

insert into _atp2_audit_output (seq, section, payload)
select
  7,
  'rls_status_all_public_tables',
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'schema_name', n.nspname,
        'table_name', c.relname,
        'rls_enabled', c.relrowsecurity,
        'rls_forced', c.relforcerowsecurity
      )
      order by c.relname
    ),
    '[]'::jsonb
  )
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r';

insert into _atp2_audit_output (seq, section, payload)
select
  8,
  'policies_all_public',
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tablename', tablename,
        'policyname', policyname,
        'permissive', permissive,
        'roles', roles,
        'cmd', cmd,
        'qual', qual,
        'with_check', with_check
      )
      order by tablename, policyname
    ),
    '[]'::jsonb
  )
from pg_policies
where schemaname = 'public';

insert into _atp2_audit_output (seq, section, payload)
select
  9,
  'helper_functions_presence',
  coalesce(jsonb_agg(proname order by proname), '[]'::jsonb)
from (
  select p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'set_updated_at',
      'normalize_wallet_address_columns',
      'touch_conversation_updated_at_on_message_insert'
    )
) f;

insert into _atp2_audit_output (seq, section, payload)
select
  10,
  'schema_migrations_table_presence',
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'table_schema', table_schema,
        'table_name', table_name
      )
      order by table_schema, table_name
    ),
    '[]'::jsonb
  )
from information_schema.tables
where table_schema in ('supabase_migrations', 'public')
  and table_name = 'schema_migrations';

select seq, section, payload
from _atp2_audit_output
order by seq;

