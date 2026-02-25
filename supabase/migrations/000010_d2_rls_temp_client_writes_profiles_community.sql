-- ATP2 Batch D2 / RLS temporary client-write unblock (profiles + community, no messaging)
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.
-- Scope:
--   - TEMPORARY unblock for ATP2 functional smoke on test project
--   - Client/anon write policies for profiles + community tables only
--   - Messaging remains deferred
--   - Owner-scoped tables keep Batch 4A/4B design (RLS deferred/disabled via 000009)
--
-- IMPORTANT:
--   These policies are intentionally permissive and must be replaced by owner-scoped
--   wallet-auth/Supabase-auth policies in a later hardening batch.

alter table public.profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;

-- Profiles (temporary client writes)
drop policy if exists profiles_insert_public_temp_b4c_v1 on public.profiles;
create policy profiles_insert_public_temp_b4c_v1
on public.profiles
for insert
to public
with check (
  wallet_address = lower(wallet_address)
  and wallet_address <> ''
);

drop policy if exists profiles_update_public_temp_b4c_v1 on public.profiles;
create policy profiles_update_public_temp_b4c_v1
on public.profiles
for update
to public
using (true)
with check (
  wallet_address = lower(wallet_address)
  and wallet_address <> ''
);

-- Community posts (temporary client writes)
drop policy if exists community_posts_insert_public_temp_b4c_v1 on public.community_posts;
create policy community_posts_insert_public_temp_b4c_v1
on public.community_posts
for insert
to public
with check (true);

drop policy if exists community_posts_update_public_temp_b4c_v1 on public.community_posts;
create policy community_posts_update_public_temp_b4c_v1
on public.community_posts
for update
to public
using (true)
with check (true);

drop policy if exists community_posts_delete_public_temp_b4c_v1 on public.community_posts;
create policy community_posts_delete_public_temp_b4c_v1
on public.community_posts
for delete
to public
using (true);

-- Community comments (temporary client writes)
drop policy if exists community_comments_insert_public_temp_b4c_v1 on public.community_comments;
create policy community_comments_insert_public_temp_b4c_v1
on public.community_comments
for insert
to public
with check (true);

drop policy if exists community_comments_update_public_temp_b4c_v1 on public.community_comments;
create policy community_comments_update_public_temp_b4c_v1
on public.community_comments
for update
to public
using (true)
with check (true);

drop policy if exists community_comments_delete_public_temp_b4c_v1 on public.community_comments;
create policy community_comments_delete_public_temp_b4c_v1
on public.community_comments
for delete
to public
using (true);

-- Community reactions (temporary client writes)
drop policy if exists community_reactions_insert_public_temp_b4c_v1 on public.community_reactions;
create policy community_reactions_insert_public_temp_b4c_v1
on public.community_reactions
for insert
to public
with check (true);

drop policy if exists community_reactions_delete_public_temp_b4c_v1 on public.community_reactions;
create policy community_reactions_delete_public_temp_b4c_v1
on public.community_reactions
for delete
to public
using (true);

