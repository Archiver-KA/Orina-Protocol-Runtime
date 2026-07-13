-- Keep verified review submission on the authenticated caller path only.
-- Supabase default function privileges can grant EXECUTE to service_role even
-- after PUBLIC/anon revocation; this explicit decision closes that excess grant.

revoke execute on function public.submit_profile_review_v2(
  bigint,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text
) from service_role;
