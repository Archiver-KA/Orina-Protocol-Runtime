-- ATP2 / profile reputation summary security-invoker hardening
-- Scope:
--   - make profile_reputation_summaries obey caller permissions and source-table RLS
--   - preserve the public REST contract used by marketplace/profile discovery
--   - remove any accidental broad grants before re-granting explicit read access

do $$
begin
  if to_regclass('public.profile_reputation_summaries') is null then
    raise exception 'public.profile_reputation_summaries must exist before applying security-invoker hardening';
  end if;
end
$$;

alter view public.profile_reputation_summaries
set (security_invoker = true);

revoke all on public.profile_reputation_summaries from public;
revoke all on public.profile_reputation_summaries from anon, authenticated, service_role;

-- The source tables already have RLS enabled with public read policies in the migration set.
-- Explicit SELECT grants keep the security-invoker view usable in fresh and linked projects.
grant select on public.profiles to anon, authenticated, service_role;
grant select on public.profile_reviews to anon, authenticated, service_role;
grant select on public.protocol_orders to anon, authenticated, service_role;
grant select on public.profile_reputation_summaries to anon, authenticated, service_role;
