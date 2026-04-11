-- Migration 000064: remove redundant owner policies and harden internal
-- SECURITY DEFINER helpers after the public RPC audit.

-- Clean up duplicated owner policies left behind by 000052. The newer
-- policies from 000055 handle both claim-bridge current_setting(...) and
-- auth.jwt() fallback, so the older auth.jwt()-only policies are redundant.
DROP POLICY IF EXISTS "minting_drafts_owner_select" ON public.minting_drafts;
DROP POLICY IF EXISTS "minting_drafts_owner_insert" ON public.minting_drafts;
DROP POLICY IF EXISTS "minting_drafts_owner_update" ON public.minting_drafts;
DROP POLICY IF EXISTS "minting_drafts_owner_delete" ON public.minting_drafts;

DROP POLICY IF EXISTS "search_history_owner_select" ON public.search_history;
DROP POLICY IF EXISTS "search_history_owner_insert" ON public.search_history;
DROP POLICY IF EXISTS "search_history_owner_delete" ON public.search_history;

DROP POLICY IF EXISTS "recent_commands_owner_select" ON public.recent_commands;
DROP POLICY IF EXISTS "recent_commands_owner_insert" ON public.recent_commands;
DROP POLICY IF EXISTS "recent_commands_owner_delete" ON public.recent_commands;

-- Messaging participant helper is used by authenticated RLS policies and by
-- service-side flows, but it does not need implicit PUBLIC or anon execute.
REVOKE EXECUTE ON FUNCTION public.atp2_is_conversation_participant_v1(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atp2_is_conversation_participant_v1(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atp2_is_conversation_participant_v1(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.atp2_is_conversation_participant_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atp2_is_conversation_participant_v1(UUID) TO service_role;

-- Metadata-normalization helpers are internal implementation details and do
-- not need direct client execution.
REVOKE EXECUTE ON FUNCTION public.asset_catalog_metadata_defaults_v1(public.assets_catalog) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.asset_catalog_metadata_defaults_v1(public.assets_catalog) FROM anon;
REVOKE EXECUTE ON FUNCTION public.asset_catalog_metadata_defaults_v1(public.assets_catalog) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.asset_catalog_metadata_defaults_v1(public.assets_catalog) TO service_role;

REVOKE EXECUTE ON FUNCTION public.assets_catalog_apply_metadata_defaults_v1() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assets_catalog_apply_metadata_defaults_v1() FROM anon;
REVOKE EXECUTE ON FUNCTION public.assets_catalog_apply_metadata_defaults_v1() FROM authenticated;
