-- ATP2 Phase B / Batch H2
-- Hardening RLS: replace Batch 4C temporary public-write policies with owner-scoped policies
-- using wallet-auth -> Supabase auth claim bridge contract (H1).
--
-- IMPORTANT:
--   Do NOT apply until H1 claim bridge is implemented/validated (not just scaffold).
--   This migration assumes authenticated JWTs include:
--     - role = authenticated
--     - sub/profile_id (UUID string)
--     - wallet_address (lowercase)
--
-- Scope:
--   - Retire Batch 4C temp public-write policies (profiles + community_*)
--   - Enable owner-scoped RLS on deferred tables
--   - Add claim helper functions and owner-scoped policies
--   - Keep Batch 4A public-read subset intact
--   - Messaging remains deferred

-- ---------------------------------------------------------------------------
-- Claim helpers (JWT claim access)
-- ---------------------------------------------------------------------------

create or replace function public.atp2_claim_wallet_address_v1()
returns text
language sql
stable
as $$
  select nullif(lower(coalesce(auth.jwt() ->> 'wallet_address', '')), '')
$$;

create or replace function public.atp2_claim_profile_id_text_v1()
returns text
language sql
stable
as $$
  select nullif(coalesce(auth.jwt() ->> 'profile_id', auth.jwt() ->> 'sub', ''), '')
$$;

create or replace function public.atp2_claim_role_v1()
returns text
language sql
stable
as $$
  select nullif(coalesce(auth.jwt() ->> 'role', ''), '')
$$;

comment on function public.atp2_claim_wallet_address_v1() is
  'ATP2 H2 helper: returns lowercase wallet_address from request JWT claims (or null)';
comment on function public.atp2_claim_profile_id_text_v1() is
  'ATP2 H2 helper: returns profile_id claim (fallback sub) as text from request JWT claims';
comment on function public.atp2_claim_role_v1() is
  'ATP2 H2 helper: returns role claim from request JWT claims';

-- ---------------------------------------------------------------------------
-- Enable RLS for deferred owner-scoped tables (Batch 4B had these disabled)
-- ---------------------------------------------------------------------------

alter table public.user_preferences enable row level security;
alter table public.user_follows enable row level security;
alter table public.user_favorites enable row level security;
alter table public.user_watchlist enable row level security;
alter table public.watchlist_alerts enable row level security;
alter table public.notifications enable row level security;

-- ---------------------------------------------------------------------------
-- Retire Batch 4C temporary public-write policies (profiles + community_*)
-- ---------------------------------------------------------------------------

drop policy if exists profiles_insert_public_temp_b4c_v1 on public.profiles;
drop policy if exists profiles_update_public_temp_b4c_v1 on public.profiles;

drop policy if exists community_posts_insert_public_temp_b4c_v1 on public.community_posts;
drop policy if exists community_posts_update_public_temp_b4c_v1 on public.community_posts;
drop policy if exists community_posts_delete_public_temp_b4c_v1 on public.community_posts;

drop policy if exists community_comments_insert_public_temp_b4c_v1 on public.community_comments;
drop policy if exists community_comments_update_public_temp_b4c_v1 on public.community_comments;
drop policy if exists community_comments_delete_public_temp_b4c_v1 on public.community_comments;

drop policy if exists community_reactions_insert_public_temp_b4c_v1 on public.community_reactions;
drop policy if exists community_reactions_delete_public_temp_b4c_v1 on public.community_reactions;

-- ---------------------------------------------------------------------------
-- Profiles (owner-scoped write)
-- Notes:
--   - insert policy is wallet-claim-scoped (allows bootstrap when client does not send id)
--   - update policy requires both wallet claim and profile_id claim match
-- ---------------------------------------------------------------------------

drop policy if exists profiles_insert_owner_claim_h2_v1 on public.profiles;
create policy profiles_insert_owner_claim_h2_v1
on public.profiles
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_wallet_address_v1() is not null
  and wallet_address = public.atp2_claim_wallet_address_v1()
  and wallet_address = lower(wallet_address)
  and wallet_address <> ''
);

drop policy if exists profiles_update_owner_claim_h2_v1 on public.profiles;
create policy profiles_update_owner_claim_h2_v1
on public.profiles
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_wallet_address_v1() is not null
  and public.atp2_claim_profile_id_text_v1() is not null
  and wallet_address = public.atp2_claim_wallet_address_v1()
  and id::text = public.atp2_claim_profile_id_text_v1()
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_wallet_address_v1() is not null
  and public.atp2_claim_profile_id_text_v1() is not null
  and wallet_address = public.atp2_claim_wallet_address_v1()
  and id::text = public.atp2_claim_profile_id_text_v1()
  and wallet_address = lower(wallet_address)
  and wallet_address <> ''
);

-- ---------------------------------------------------------------------------
-- Community (owner-scoped write, public read from Batch 4A remains)
-- ---------------------------------------------------------------------------

drop policy if exists community_posts_insert_owner_claim_h2_v1 on public.community_posts;
create policy community_posts_insert_owner_claim_h2_v1
on public.community_posts
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and author_user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists community_posts_update_owner_claim_h2_v1 on public.community_posts;
create policy community_posts_update_owner_claim_h2_v1
on public.community_posts
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and author_user_id::text = public.atp2_claim_profile_id_text_v1()
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and author_user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists community_posts_delete_owner_claim_h2_v1 on public.community_posts;
create policy community_posts_delete_owner_claim_h2_v1
on public.community_posts
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and author_user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists community_comments_insert_owner_claim_h2_v1 on public.community_comments;
create policy community_comments_insert_owner_claim_h2_v1
on public.community_comments
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and author_user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists community_comments_update_owner_claim_h2_v1 on public.community_comments;
create policy community_comments_update_owner_claim_h2_v1
on public.community_comments
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and author_user_id::text = public.atp2_claim_profile_id_text_v1()
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and author_user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists community_comments_delete_owner_claim_h2_v1 on public.community_comments;
create policy community_comments_delete_owner_claim_h2_v1
on public.community_comments
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and author_user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists community_reactions_insert_owner_claim_h2_v1 on public.community_reactions;
create policy community_reactions_insert_owner_claim_h2_v1
on public.community_reactions
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists community_reactions_delete_owner_claim_h2_v1 on public.community_reactions;
create policy community_reactions_delete_owner_claim_h2_v1
on public.community_reactions
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and public.atp2_claim_profile_id_text_v1() is not null
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

-- ---------------------------------------------------------------------------
-- Owner-scoped deferred tables (Batch 4B -> H2 hardening)
-- ---------------------------------------------------------------------------

-- user_preferences (owner-only)
drop policy if exists user_preferences_select_owner_claim_h2_v1 on public.user_preferences;
create policy user_preferences_select_owner_claim_h2_v1
on public.user_preferences
for select
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_preferences_insert_owner_claim_h2_v1 on public.user_preferences;
create policy user_preferences_insert_owner_claim_h2_v1
on public.user_preferences
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_preferences_update_owner_claim_h2_v1 on public.user_preferences;
create policy user_preferences_update_owner_claim_h2_v1
on public.user_preferences
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_preferences_delete_owner_claim_h2_v1 on public.user_preferences;
create policy user_preferences_delete_owner_claim_h2_v1
on public.user_preferences
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

-- user_follows (public read, owner controls follower-side writes)
drop policy if exists user_follows_select_public_h2_v1 on public.user_follows;
create policy user_follows_select_public_h2_v1
on public.user_follows
for select
to public
using (true);

drop policy if exists user_follows_insert_follower_owner_claim_h2_v1 on public.user_follows;
create policy user_follows_insert_follower_owner_claim_h2_v1
on public.user_follows
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and follower_user_id::text = public.atp2_claim_profile_id_text_v1()
  and follower_user_id <> following_user_id
);

drop policy if exists user_follows_delete_follower_owner_claim_h2_v1 on public.user_follows;
create policy user_follows_delete_follower_owner_claim_h2_v1
on public.user_follows
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and follower_user_id::text = public.atp2_claim_profile_id_text_v1()
);

-- user_favorites (owner-only)
drop policy if exists user_favorites_select_owner_claim_h2_v1 on public.user_favorites;
create policy user_favorites_select_owner_claim_h2_v1
on public.user_favorites
for select
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_favorites_insert_owner_claim_h2_v1 on public.user_favorites;
create policy user_favorites_insert_owner_claim_h2_v1
on public.user_favorites
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_favorites_delete_owner_claim_h2_v1 on public.user_favorites;
create policy user_favorites_delete_owner_claim_h2_v1
on public.user_favorites
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

-- user_watchlist (owner-only)
drop policy if exists user_watchlist_select_owner_claim_h2_v1 on public.user_watchlist;
create policy user_watchlist_select_owner_claim_h2_v1
on public.user_watchlist
for select
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_watchlist_insert_owner_claim_h2_v1 on public.user_watchlist;
create policy user_watchlist_insert_owner_claim_h2_v1
on public.user_watchlist
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_watchlist_update_owner_claim_h2_v1 on public.user_watchlist;
create policy user_watchlist_update_owner_claim_h2_v1
on public.user_watchlist
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_watchlist_delete_owner_claim_h2_v1 on public.user_watchlist;
create policy user_watchlist_delete_owner_claim_h2_v1
on public.user_watchlist
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

-- watchlist_alerts (owner-only)
drop policy if exists watchlist_alerts_select_owner_claim_h2_v1 on public.watchlist_alerts;
create policy watchlist_alerts_select_owner_claim_h2_v1
on public.watchlist_alerts
for select
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists watchlist_alerts_insert_owner_claim_h2_v1 on public.watchlist_alerts;
create policy watchlist_alerts_insert_owner_claim_h2_v1
on public.watchlist_alerts
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists watchlist_alerts_update_owner_claim_h2_v1 on public.watchlist_alerts;
create policy watchlist_alerts_update_owner_claim_h2_v1
on public.watchlist_alerts
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists watchlist_alerts_delete_owner_claim_h2_v1 on public.watchlist_alerts;
create policy watchlist_alerts_delete_owner_claim_h2_v1
on public.watchlist_alerts
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

-- notifications (owner read/update/delete; owner insert only)
-- Cross-user notification fanout should move to backend/service-role path.
drop policy if exists notifications_select_owner_claim_h2_v1 on public.notifications;
create policy notifications_select_owner_claim_h2_v1
on public.notifications
for select
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists notifications_insert_owner_claim_h2_v1 on public.notifications;
create policy notifications_insert_owner_claim_h2_v1
on public.notifications
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists notifications_update_owner_claim_h2_v1 on public.notifications;
create policy notifications_update_owner_claim_h2_v1
on public.notifications
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists notifications_delete_owner_claim_h2_v1 on public.notifications;
create policy notifications_delete_owner_claim_h2_v1
on public.notifications
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists notifications_service_role_all_h2_v1 on public.notifications;
create policy notifications_service_role_all_h2_v1
on public.notifications
for all
to service_role
using (true)
with check (true);
