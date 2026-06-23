-- Orina ATP v3.5 beta empty-data purge allowlist.
-- Purpose: clear app/user/projection data in the NEW Supabase testnet project.
--
-- Do not run on the historical v3.4.1 project. This does not delete Auth users
-- or Storage objects; handle those with the runbook procedure.
--
-- Run only after:
--   1. Owner approval is recorded.
--   2. SUPABASE_DB_URL points to the new v3.5 beta testnet project.
--   3. v3_5_beta_empty_data_preflight_counts.sql has been reviewed.
--
-- Command:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/audit/v3_5_beta_empty_data_purge_allowlist.sql

begin;

select pg_advisory_xact_lock(hashtext('orina-v3.5-beta-empty-data-reset'));

create temp table pg_temp.orina_v35_beta_purge_allowlist (
  table_schema text not null,
  table_name text not null,
  data_group text not null,
  primary key (table_schema, table_name)
) on commit drop;

insert into pg_temp.orina_v35_beta_purge_allowlist (table_schema, table_name, data_group)
values
  ('public', 'wallet_auth_challenges', 'wallet-auth'),
  ('public', 'wallet_sessions', 'wallet-auth'),

  ('public', 'profiles', 'users'),
  ('public', 'user_preferences', 'users'),
  ('public', 'user_badges', 'users'),
  ('public', 'user_app_settings', 'users'),
  ('public', 'user_delivery_addresses', 'users'),

  ('public', 'assets_catalog', 'assets'),
  ('public', 'asset_media', 'assets'),
  ('public', 'asset_tags', 'assets'),
  ('public', 'asset_tag_map', 'assets'),
  ('public', 'asset_protocol_links', 'assets'),
  ('public', 'asset_view_events', 'assets'),

  ('public', 'protocol_assets', 'protocol-projection'),
  ('public', 'protocol_asset_events', 'protocol-projection'),
  ('public', 'protocol_orders', 'protocol-projection'),
  ('public', 'protocol_order_events', 'protocol-projection'),
  ('public', 'protocol_receipts', 'protocol-projection'),
  ('public', 'protocol_projection_visibility', 'protocol-projection'),

  ('public', 'user_follows', 'social'),
  ('public', 'user_favorites', 'social'),
  ('public', 'user_watchlist', 'social'),
  ('public', 'watchlist_alerts', 'social'),
  ('public', 'notifications', 'social'),
  ('public', 'community_posts', 'social'),
  ('public', 'community_comments', 'social'),
  ('public', 'community_reactions', 'social'),
  ('public', 'user_collection_favorites', 'social'),
  ('public', 'user_collection_follows', 'social'),

  ('public', 'conversations', 'messaging'),
  ('public', 'conversation_participants', 'messaging'),
  ('public', 'messages', 'messaging'),
  ('public', 'message_reports', 'messaging'),

  ('public', 'collections', 'collections'),
  ('public', 'collection_assets', 'collections'),

  ('public', 'minting_drafts', 'minting'),
  ('public', 'search_history', 'minting'),
  ('public', 'recent_commands', 'minting'),
  ('public', 'seller_minting_config', 'minting'),

  ('public', 'm2m_wallet_config', 'm2m'),
  ('public', 'm2m_delegates', 'm2m'),
  ('public', 'm2m_delegate_invites', 'm2m'),
  ('public', 'm2m_delegate_secrets', 'm2m'),

  ('public', 'api_credentials', 'api'),
  ('public', 'rate_limit_entries', 'api'),
  ('public', 'edge_idempotency_records', 'api'),

  ('public', 'agent_configs', 'ai'),
  ('public', 'agent_threads', 'ai'),
  ('public', 'agent_messages', 'ai'),
  ('public', 'agent_usage', 'ai'),
  ('public', 'agent_turn_evaluations', 'ai'),
  ('public', 'agent_memory_records', 'ai'),
  ('public', 'agent_memory_events', 'ai'),
  ('public', 'store_advisor_config', 'ai'),
  ('public', 'kv_store_b0d68fc8', 'ai'),
  ('public', 'market_trends', 'ai-market'),
  ('public', 'seller_performance', 'ai-market'),
  ('public', 'market_benchmarks', 'ai-market'),

  ('public', 'security_audit_log', 'audit');

do $$
declare
  table_list text;
begin
  select string_agg(format('%I.%I', table_schema, table_name), ', ' order by table_schema, table_name)
  into table_list
  from pg_temp.orina_v35_beta_purge_allowlist
  where to_regclass(format('%I.%I', table_schema, table_name)) is not null;

  if table_list is null then
    raise exception 'No allowlisted public tables exist. Check that SUPABASE_DB_URL points to the migrated v3.5 beta project.';
  end if;

  execute format('truncate table %s restart identity cascade', table_list);
end
$$;

do $$
declare
  target record;
  count_value bigint;
begin
  for target in
    select *
    from pg_temp.orina_v35_beta_purge_allowlist
    where to_regclass(format('%I.%I', table_schema, table_name)) is not null
    order by table_schema, table_name
  loop
    execute format('select count(*)::bigint from %I.%I', target.table_schema, target.table_name)
    into count_value;

    if count_value <> 0 then
      raise exception 'Purge verification failed: %.% still has % rows',
        target.table_schema,
        target.table_name,
        count_value;
    end if;
  end loop;
end
$$;

commit;
