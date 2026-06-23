-- Orina ATP v3.5 beta empty-data preflight counts.
-- Purpose: read-only-ish count snapshot before/after reset. This creates only
-- temporary tables and does not delete or mutate persistent data.
--
-- Run with a privileged Postgres connection for the NEW Supabase testnet
-- project only:
--   psql "$SUPABASE_DB_URL" -f supabase/audit/v3_5_beta_empty_data_preflight_counts.sql

create temp table if not exists pg_temp.orina_v35_beta_count_targets (
  table_schema text not null,
  table_name text not null,
  data_group text not null,
  should_be_empty boolean not null default true,
  primary key (table_schema, table_name)
) on commit drop;

truncate table pg_temp.orina_v35_beta_count_targets;

insert into pg_temp.orina_v35_beta_count_targets (table_schema, table_name, data_group, should_be_empty)
values
  ('auth', 'users', 'auth', true),
  ('storage', 'buckets', 'storage', true),
  ('storage', 'objects', 'storage', true),

  ('public', 'wallet_auth_challenges', 'wallet-auth', true),
  ('public', 'wallet_sessions', 'wallet-auth', true),

  ('public', 'profiles', 'users', true),
  ('public', 'user_preferences', 'users', true),
  ('public', 'user_badges', 'users', true),
  ('public', 'user_app_settings', 'users', true),
  ('public', 'user_delivery_addresses', 'users', true),

  ('public', 'assets_catalog', 'assets', true),
  ('public', 'asset_media', 'assets', true),
  ('public', 'asset_tags', 'assets', true),
  ('public', 'asset_tag_map', 'assets', true),
  ('public', 'asset_protocol_links', 'assets', true),
  ('public', 'asset_view_events', 'assets', true),

  ('public', 'protocol_assets', 'protocol-projection', true),
  ('public', 'protocol_asset_events', 'protocol-projection', true),
  ('public', 'protocol_orders', 'protocol-projection', true),
  ('public', 'protocol_order_events', 'protocol-projection', true),
  ('public', 'protocol_receipts', 'protocol-projection', true),
  ('public', 'protocol_projection_visibility', 'protocol-projection', true),

  ('public', 'user_follows', 'social', true),
  ('public', 'user_favorites', 'social', true),
  ('public', 'user_watchlist', 'social', true),
  ('public', 'watchlist_alerts', 'social', true),
  ('public', 'notifications', 'social', true),
  ('public', 'community_posts', 'social', true),
  ('public', 'community_comments', 'social', true),
  ('public', 'community_reactions', 'social', true),
  ('public', 'user_collection_favorites', 'social', true),
  ('public', 'user_collection_follows', 'social', true),

  ('public', 'conversations', 'messaging', true),
  ('public', 'conversation_participants', 'messaging', true),
  ('public', 'messages', 'messaging', true),
  ('public', 'message_reports', 'messaging', true),

  ('public', 'collections', 'collections', true),
  ('public', 'collection_assets', 'collections', true),

  ('public', 'minting_drafts', 'minting', true),
  ('public', 'search_history', 'minting', true),
  ('public', 'recent_commands', 'minting', true),
  ('public', 'seller_minting_config', 'minting', true),

  ('public', 'm2m_wallet_config', 'm2m', true),
  ('public', 'm2m_delegates', 'm2m', true),
  ('public', 'm2m_delegate_invites', 'm2m', true),
  ('public', 'm2m_delegate_secrets', 'm2m', true),

  ('public', 'api_credentials', 'api', true),
  ('public', 'rate_limit_entries', 'api', true),
  ('public', 'edge_idempotency_records', 'api', true),

  ('public', 'agent_configs', 'ai', true),
  ('public', 'agent_threads', 'ai', true),
  ('public', 'agent_messages', 'ai', true),
  ('public', 'agent_usage', 'ai', true),
  ('public', 'agent_turn_evaluations', 'ai', true),
  ('public', 'agent_memory_records', 'ai', true),
  ('public', 'agent_memory_events', 'ai', true),
  ('public', 'store_advisor_config', 'ai', true),
  ('public', 'kv_store_b0d68fc8', 'ai', true),
  ('public', 'market_trends', 'ai-market', true),
  ('public', 'seller_performance', 'ai-market', true),
  ('public', 'market_benchmarks', 'ai-market', true),

  ('public', 'security_audit_log', 'audit', true),

  -- Reference/config tables expected to remain populated after migrations.
  ('public', 'geo_countries', 'reference-keep', false),
  ('public', 'geo_places', 'reference-keep', false),
  ('public', 'geo_dataset_versions', 'reference-keep', false),
  ('public', 'taxonomy_attribute_templates', 'reference-keep', false),
  ('public', 'taxonomy_nodes', 'reference-keep', false),
  ('public', 'marketplace_ranking_config', 'reference-keep', false);

create temp table if not exists pg_temp.orina_v35_beta_count_results (
  captured_at timestamptz not null default now(),
  table_schema text not null,
  table_name text not null,
  data_group text not null,
  should_be_empty boolean not null,
  table_exists boolean not null,
  row_count bigint,
  primary key (table_schema, table_name)
) on commit drop;

truncate table pg_temp.orina_v35_beta_count_results;

do $$
declare
  target record;
  count_sql text;
  count_value bigint;
begin
  for target in
    select * from pg_temp.orina_v35_beta_count_targets order by table_schema, table_name
  loop
    if to_regclass(format('%I.%I', target.table_schema, target.table_name)) is null then
      insert into pg_temp.orina_v35_beta_count_results (
        table_schema,
        table_name,
        data_group,
        should_be_empty,
        table_exists,
        row_count
      )
      values (
        target.table_schema,
        target.table_name,
        target.data_group,
        target.should_be_empty,
        false,
        null
      );
    else
      count_sql := format('select count(*)::bigint from %I.%I', target.table_schema, target.table_name);
      execute count_sql into count_value;
      insert into pg_temp.orina_v35_beta_count_results (
        table_schema,
        table_name,
        data_group,
        should_be_empty,
        table_exists,
        row_count
      )
      values (
        target.table_schema,
        target.table_name,
        target.data_group,
        target.should_be_empty,
        true,
        count_value
      );
    end if;
  end loop;
end
$$;

select
  data_group,
  table_schema,
  table_name,
  should_be_empty,
  table_exists,
  row_count,
  case
    when table_exists is false then 'MISSING'
    when should_be_empty and coalesce(row_count, 0) = 0 then 'OK_EMPTY'
    when should_be_empty then 'NON_EMPTY'
    else 'REFERENCE_OR_CONFIG'
  end as status
from pg_temp.orina_v35_beta_count_results
order by
  case
    when should_be_empty and coalesce(row_count, 0) > 0 then 0
    when table_exists is false then 1
    else 2
  end,
  data_group,
  table_schema,
  table_name;

select
  data_group,
  count(*) filter (where table_exists) as existing_tables,
  count(*) filter (where not table_exists) as missing_tables,
  sum(coalesce(row_count, 0)) as total_rows,
  sum(coalesce(row_count, 0)) filter (where should_be_empty) as total_rows_that_must_be_empty
from pg_temp.orina_v35_beta_count_results
group by data_group
order by data_group;
