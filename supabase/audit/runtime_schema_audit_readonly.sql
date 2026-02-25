-- ATP2 / Supabase runtime schema audit (read-only)
-- Purpose: inspect old project schema/runtime drift without deploying anything.
-- Run in Supabase SQL Editor (project: azimhqpsjgxbmjlxaghp), then paste results back.
-- Strategy remains: Option A (new project). This is audit-only.

-- 0) Context
select
  now() as audited_at,
  current_database() as database_name,
  current_user as db_user,
  version() as postgres_version;

-- 1) Extensions relevant to ATP2 D1
select extname
from pg_extension
where extname in ('pgcrypto', 'citext')
order by extname;

-- 2) Public tables: present / missing / unexpected vs ATP2 D1 (no messaging in D1)
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
)
select 'expected_present' as status, e.table_name
from expected e
join runtime r using (table_name)
union all
select 'expected_missing' as status, e.table_name
from expected e
left join runtime r using (table_name)
where r.table_name is null
union all
select 'unexpected_public' as status, r.table_name
from runtime r
left join expected e using (table_name)
where e.table_name is null
order by 1, 2;

-- 3) Deferred messaging tables status (should be out-of-scope for D1)
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('conversations', 'conversation_participants', 'messages')
order by table_name;

-- 4) Core columns snapshot (for shape drift review)
select
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
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
  )
order by c.table_name, c.ordinal_position;

-- 5) Constraints (PK/UK/FK/CHECK) for ATP2-relevant tables
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
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
  )
order by tc.table_name, tc.constraint_type, tc.constraint_name;

-- 6) Index definitions on ATP2-relevant tables
select
  schemaname,
  tablename,
  indexname,
  indexdef
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
  )
order by tablename, indexname;

-- 7) Row-level security status + policies (drift awareness)
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 8) Public helper functions (check if old project already has trigger helpers)
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('set_updated_at', 'normalize_wallet_address_columns', 'touch_conversation_updated_at_on_message_insert')
order by p.proname;

-- 9) Supabase migration history tables presence (for drift context)
select table_schema, table_name
from information_schema.tables
where table_schema in ('supabase_migrations', 'public')
  and table_name = 'schema_migrations'
order by table_schema, table_name;

