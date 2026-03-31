-- Migration 000052: RLS policies for client-side access to minting_drafts,
-- search_history, recent_commands.
-- Owner-scoped: users can only read/write their own rows via claim bridge JWT.

-- Helper: extract wallet_address from JWT claims (same pattern as other RLS)
-- Uses auth.jwt() -> raw_user_meta_data ->> 'wallet_address'

-- ═══════════════════════════════════════════════════
-- minting_drafts: full CRUD for owner
-- ═══════════════════════════════════════════════════
CREATE POLICY "minting_drafts_owner_select"
  ON minting_drafts FOR SELECT
  USING (
    wallet_address = (auth.jwt() -> 'raw_user_meta_data' ->> 'wallet_address')
  );

CREATE POLICY "minting_drafts_owner_insert"
  ON minting_drafts FOR INSERT
  WITH CHECK (
    wallet_address = (auth.jwt() -> 'raw_user_meta_data' ->> 'wallet_address')
  );

CREATE POLICY "minting_drafts_owner_update"
  ON minting_drafts FOR UPDATE
  USING (
    wallet_address = (auth.jwt() -> 'raw_user_meta_data' ->> 'wallet_address')
  )
  WITH CHECK (
    wallet_address = (auth.jwt() -> 'raw_user_meta_data' ->> 'wallet_address')
  );

CREATE POLICY "minting_drafts_owner_delete"
  ON minting_drafts FOR DELETE
  USING (
    wallet_address = (auth.jwt() -> 'raw_user_meta_data' ->> 'wallet_address')
  );

-- ═══════════════════════════════════════════════════
-- search_history: insert + select + delete for owner
-- ═══════════════════════════════════════════════════
CREATE POLICY "search_history_owner_select"
  ON search_history FOR SELECT
  USING (
    wallet_address = (auth.jwt() -> 'raw_user_meta_data' ->> 'wallet_address')
  );

CREATE POLICY "search_history_owner_insert"
  ON search_history FOR INSERT
  WITH CHECK (
    wallet_address = (auth.jwt() -> 'raw_user_meta_data' ->> 'wallet_address')
  );

CREATE POLICY "search_history_owner_delete"
  ON search_history FOR DELETE
  USING (
    wallet_address = (auth.jwt() -> 'raw_user_meta_data' ->> 'wallet_address')
  );

-- ═══════════════════════════════════════════════════
-- recent_commands: insert + select + delete for owner
-- ═══════════════════════════════════════════════════
CREATE POLICY "recent_commands_owner_select"
  ON recent_commands FOR SELECT
  USING (
    wallet_address = (auth.jwt() -> 'raw_user_meta_data' ->> 'wallet_address')
  );

CREATE POLICY "recent_commands_owner_insert"
  ON recent_commands FOR INSERT
  WITH CHECK (
    wallet_address = (auth.jwt() -> 'raw_user_meta_data' ->> 'wallet_address')
  );

CREATE POLICY "recent_commands_owner_delete"
  ON recent_commands FOR DELETE
  USING (
    wallet_address = (auth.jwt() -> 'raw_user_meta_data' ->> 'wallet_address')
  );
