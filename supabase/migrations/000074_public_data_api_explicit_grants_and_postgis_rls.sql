-- Supabase Data API explicit grants for the 2026 public-schema default change.
--
-- These grants do not replace RLS. They make the repository's existing RLS
-- intent explicit so PostgREST/supabase-js/GraphQL can evaluate policies on
-- fresh projects after Supabase stops creating implicit public table grants.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Service-role Edge Functions and maintenance jobs use the Data API for these
-- application tables. RLS still governs non-service roles.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.agent_configs,
  public.agent_memory_events,
  public.agent_memory_records,
  public.agent_messages,
  public.agent_threads,
  public.agent_turn_evaluations,
  public.agent_usage,
  public.api_credentials,
  public.asset_media,
  public.asset_protocol_links,
  public.asset_tag_map,
  public.asset_tags,
  public.asset_view_events,
  public.assets_catalog,
  public.collection_assets,
  public.collections,
  public.community_comments,
  public.community_posts,
  public.community_reactions,
  public.conversation_participants,
  public.conversations,
  public.geo_countries,
  public.geo_dataset_versions,
  public.geo_places,
  public.kv_store_b0d68fc8,
  public.m2m_delegate_invites,
  public.m2m_delegate_secrets,
  public.m2m_delegates,
  public.m2m_wallet_config,
  public.market_benchmarks,
  public.market_trends,
  public.marketplace_ranking_config,
  public.message_reports,
  public.messages,
  public.minting_drafts,
  public.notifications,
  public.profile_reviews,
  public.profile_story_documents,
  public.profiles,
  public.protocol_asset_events,
  public.protocol_assets,
  public.protocol_order_events,
  public.protocol_orders,
  public.protocol_projection_visibility,
  public.protocol_receipts,
  public.rate_limit_entries,
  public.recent_commands,
  public.search_history,
  public.security_audit_log,
  public.seller_minting_config,
  public.seller_performance,
  public.store_advisor_config,
  public.taxonomy_attribute_templates,
  public.taxonomy_nodes,
  public.user_app_settings,
  public.user_badges,
  public.user_collection_favorites,
  public.user_collection_follows,
  public.user_delivery_addresses,
  public.user_favorites,
  public.user_follows,
  public.user_preferences,
  public.user_watchlist,
  public.wallet_auth_challenges,
  public.wallet_sessions,
  public.watchlist_alerts
TO service_role;

-- Public read surfaces already have public-read RLS policies.
GRANT SELECT ON TABLE
  public.asset_media,
  public.asset_protocol_links,
  public.asset_tag_map,
  public.asset_tags,
  public.assets_catalog,
  public.collection_assets,
  public.collections,
  public.community_comments,
  public.community_posts,
  public.community_reactions,
  public.geo_countries,
  public.geo_dataset_versions,
  public.geo_places,
  public.market_benchmarks,
  public.market_trends,
  public.profile_reviews,
  public.profile_story_documents,
  public.profiles,
  public.protocol_asset_events,
  public.protocol_assets,
  public.protocol_order_events,
  public.protocol_orders,
  public.protocol_receipts,
  public.seller_performance,
  public.taxonomy_attribute_templates,
  public.taxonomy_nodes,
  public.user_badges,
  public.user_follows
TO anon, authenticated;

-- Authenticated owner-scoped write/read surfaces.
GRANT INSERT, UPDATE ON TABLE public.profiles TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE
  public.community_comments,
  public.community_posts
TO authenticated;

GRANT INSERT, DELETE ON TABLE
  public.community_reactions,
  public.user_follows
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.collection_assets,
  public.collections,
  public.messages,
  public.minting_drafts,
  public.notifications,
  public.profile_reviews,
  public.profile_story_documents,
  public.user_app_settings,
  public.user_collection_favorites,
  public.user_collection_follows,
  public.user_delivery_addresses,
  public.user_preferences,
  public.user_watchlist,
  public.watchlist_alerts
TO authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE
  public.recent_commands,
  public.search_history,
  public.user_favorites
TO authenticated;

GRANT SELECT, UPDATE ON TABLE public.conversation_participants TO authenticated;
GRANT SELECT ON TABLE public.conversations TO authenticated;
GRANT SELECT ON TABLE
  public.m2m_delegate_invites,
  public.m2m_delegates,
  public.m2m_wallet_config
TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE
  public.protocol_assets,
  public.protocol_orders
TO authenticated;

-- Seller minting configuration is per-wallet configuration. The previous
-- policy was public FOR ALL; keep runtime behavior for authenticated owners
-- and service-role handlers while avoiding anonymous table writes.
DROP POLICY IF EXISTS seller_minting_config_all ON public.seller_minting_config;
REVOKE ALL ON TABLE public.seller_minting_config FROM anon;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.seller_minting_config FROM authenticated;

DROP POLICY IF EXISTS seller_minting_config_select_owner_v1 ON public.seller_minting_config;
CREATE POLICY seller_minting_config_select_owner_v1
  ON public.seller_minting_config
  FOR SELECT
  TO authenticated
  USING (lower(seller_id) = public.atp2_claim_wallet_address_v1());

DROP POLICY IF EXISTS seller_minting_config_insert_owner_v1 ON public.seller_minting_config;
CREATE POLICY seller_minting_config_insert_owner_v1
  ON public.seller_minting_config
  FOR INSERT
  TO authenticated
  WITH CHECK (lower(seller_id) = public.atp2_claim_wallet_address_v1());

DROP POLICY IF EXISTS seller_minting_config_update_owner_v1 ON public.seller_minting_config;
CREATE POLICY seller_minting_config_update_owner_v1
  ON public.seller_minting_config
  FOR UPDATE
  TO authenticated
  USING (lower(seller_id) = public.atp2_claim_wallet_address_v1())
  WITH CHECK (lower(seller_id) = public.atp2_claim_wallet_address_v1());

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.seller_minting_config,
  public.store_advisor_config
TO authenticated;

-- PostGIS public.spatial_ref_sys is owned by supabase_admin in the linked
-- project, so the normal migration role cannot alter its RLS state. The
-- Supabase Advisor item for that extension table is tracked in the audit
-- report as an owner/Supabase-admin action instead of an executable migration.
