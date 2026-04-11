-- Migration 000057: allow service-role edge handlers to manage API credentials.

DROP POLICY IF EXISTS "api_credentials_deny_all" ON public.api_credentials;