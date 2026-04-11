-- Migration 000055: tighten RLS on internal tables and restore owner-scoped CRUD.

ALTER TABLE public.kv_store_b0d68fc8 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kv_store_deny_all"
  ON public.kv_store_b0d68fc8
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "service_role_full_access" ON public.store_advisor_config;

CREATE POLICY "store_advisor_select_owner"
  ON public.store_advisor_config
  FOR SELECT USING (
    lower(seller_id) = lower(
      coalesce(
        current_setting('request.jwt.claims', true)::json->>'wallet_address',
        auth.jwt()->'raw_user_meta_data'->>'wallet_address'
      )
    )
  );

CREATE POLICY "store_advisor_insert_owner"
  ON public.store_advisor_config
  FOR INSERT WITH CHECK (
    lower(seller_id) = lower(
      current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

CREATE POLICY "store_advisor_update_owner"
  ON public.store_advisor_config
  FOR UPDATE USING (
    lower(seller_id) = lower(
      current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  ) WITH CHECK (
    lower(seller_id) = lower(
      current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

CREATE POLICY "rate_limit_deny_all"
  ON public.rate_limit_entries
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "api_credentials_deny_all"
  ON public.api_credentials
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "agent_configs_deny_all"
  ON public.agent_configs
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "agent_threads_deny_all"
  ON public.agent_threads
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "agent_messages_deny_all"
  ON public.agent_messages
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "agent_usage_deny_all"
  ON public.agent_usage
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "message_reports_deny_all"
  ON public.message_reports
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "minting_drafts_select_owner"
  ON public.minting_drafts
  FOR SELECT USING (
    lower(wallet_address) = lower(
      coalesce(
        current_setting('request.jwt.claims', true)::json->>'wallet_address',
        auth.jwt()->'raw_user_meta_data'->>'wallet_address'
      )
    )
  );

CREATE POLICY "minting_drafts_insert_owner"
  ON public.minting_drafts
  FOR INSERT WITH CHECK (
    lower(wallet_address) = lower(
      current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

CREATE POLICY "minting_drafts_update_owner"
  ON public.minting_drafts
  FOR UPDATE USING (
    lower(wallet_address) = lower(
      current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  ) WITH CHECK (
    lower(wallet_address) = lower(
      current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

CREATE POLICY "minting_drafts_delete_owner"
  ON public.minting_drafts
  FOR DELETE USING (
    lower(wallet_address) = lower(
      current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

CREATE POLICY "search_history_select_owner"
  ON public.search_history
  FOR SELECT USING (
    lower(wallet_address) = lower(
      coalesce(
        current_setting('request.jwt.claims', true)::json->>'wallet_address',
        auth.jwt()->'raw_user_meta_data'->>'wallet_address'
      )
    )
  );

CREATE POLICY "search_history_insert_owner"
  ON public.search_history
  FOR INSERT WITH CHECK (
    lower(wallet_address) = lower(
      current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

CREATE POLICY "search_history_delete_owner"
  ON public.search_history
  FOR DELETE USING (
    lower(wallet_address) = lower(
      current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

CREATE POLICY "recent_commands_select_owner"
  ON public.recent_commands
  FOR SELECT USING (
    lower(wallet_address) = lower(
      coalesce(
        current_setting('request.jwt.claims', true)::json->>'wallet_address',
        auth.jwt()->'raw_user_meta_data'->>'wallet_address'
      )
    )
  );

CREATE POLICY "recent_commands_insert_owner"
  ON public.recent_commands
  FOR INSERT WITH CHECK (
    lower(wallet_address) = lower(
      current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

CREATE POLICY "recent_commands_delete_owner"
  ON public.recent_commands
  FOR DELETE USING (
    lower(wallet_address) = lower(
      current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );