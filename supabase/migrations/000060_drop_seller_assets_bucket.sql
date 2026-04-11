-- ============================================================================
-- Migration 000060: Retire legacy seller-assets bucket
-- ============================================================================
-- The seller minting /upload-image route has been removed and production no
-- longer serves that endpoint. Live object and bucket retirement were
-- completed via the supported Supabase Storage API/CLI path because direct SQL
-- deletion against storage.objects and storage.buckets is blocked. This
-- migration now records the retirement and removes the legacy policies.
--
-- Safe retirement order:
-- 1. Route removed from seller minting edge function.
-- 2. Remaining public object cleaned from storage via Storage API/CLI.
-- 3. Bucket retired via Storage API/CLI.
-- 4. Legacy bucket policies dropped here so migration history stays aligned.
-- ============================================================================

DROP POLICY IF EXISTS "seller_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "seller_assets_upload" ON storage.objects;