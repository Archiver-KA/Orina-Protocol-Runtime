-- ATP2 Batch D2 / RLS deferred owner tables explicit disable (compat fix)
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.
-- Why this exists:
--   Some environments may end up with RLS enabled on D1 owner-scoped tables before
--   owner policies are finalized. Batch 4A intentionally defers those policies, so
--   this migration forces the intended temporary state: RLS disabled on deferred tables.

alter table public.user_preferences disable row level security;
alter table public.user_follows disable row level security;
alter table public.user_favorites disable row level security;
alter table public.user_watchlist disable row level security;
alter table public.watchlist_alerts disable row level security;
alter table public.notifications disable row level security;
