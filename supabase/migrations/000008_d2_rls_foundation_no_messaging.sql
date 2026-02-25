-- ATP2 Batch D2 / RLS foundation (no messaging)
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.
-- Scope:
--   - Public-read policies for read-heavy D1 tables
--   - Service-role write boundaries for backend-managed tables
--   - Messaging excluded (deferred)
--   - Owner-scoped user-write policies deferred until auth claim contract is finalized
--     (wallet session stack vs auth.uid()/JWT claim mapping)

-- Public read + backend writes: profiles / assets / community(read) / protocol
alter table public.profiles enable row level security;
alter table public.assets_catalog enable row level security;
alter table public.asset_media enable row level security;
alter table public.asset_tags enable row level security;
alter table public.asset_tag_map enable row level security;
alter table public.user_badges enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;
alter table public.protocol_assets enable row level security;
alter table public.protocol_asset_events enable row level security;
alter table public.protocol_orders enable row level security;
alter table public.protocol_order_events enable row level security;
alter table public.asset_protocol_links enable row level security;

-- Backend/service-only (RLS enabled, no public policies)
alter table public.wallet_auth_challenges enable row level security;
alter table public.wallet_sessions enable row level security;

-- Owner-scoped tables intentionally deferred in this batch:
--   public.user_preferences
--   public.user_follows
--   public.user_favorites
--   public.user_watchlist
--   public.watchlist_alerts
--   public.notifications
-- Writes on profiles/community tables are also deferred (public read only in this batch).

-- Public read policies
drop policy if exists profiles_select_public_v1 on public.profiles;
create policy profiles_select_public_v1
on public.profiles
for select
to public
using (status <> 'deleted');

drop policy if exists assets_catalog_select_active_v1 on public.assets_catalog;
create policy assets_catalog_select_active_v1
on public.assets_catalog
for select
to public
using (is_active = true);

drop policy if exists asset_media_select_public_v1 on public.asset_media;
create policy asset_media_select_public_v1
on public.asset_media
for select
to public
using (true);

drop policy if exists asset_tags_select_public_v1 on public.asset_tags;
create policy asset_tags_select_public_v1
on public.asset_tags
for select
to public
using (true);

drop policy if exists asset_tag_map_select_public_v1 on public.asset_tag_map;
create policy asset_tag_map_select_public_v1
on public.asset_tag_map
for select
to public
using (true);

drop policy if exists user_badges_select_public_v1 on public.user_badges;
create policy user_badges_select_public_v1
on public.user_badges
for select
to public
using (true);

drop policy if exists community_posts_select_public_visible_v1 on public.community_posts;
create policy community_posts_select_public_visible_v1
on public.community_posts
for select
to public
using (visibility = 'public' and deleted_at is null);

drop policy if exists community_comments_select_public_visible_v1 on public.community_comments;
create policy community_comments_select_public_visible_v1
on public.community_comments
for select
to public
using (
  deleted_at is null
  and exists (
    select 1
    from public.community_posts p
    where p.id = community_comments.post_id
      and p.visibility = 'public'
      and p.deleted_at is null
  )
);

drop policy if exists community_reactions_select_public_visible_v1 on public.community_reactions;
create policy community_reactions_select_public_visible_v1
on public.community_reactions
for select
to public
using (
  (
    target_type = 'post'
    and exists (
      select 1
      from public.community_posts p
      where p.id = community_reactions.target_id
        and p.visibility = 'public'
        and p.deleted_at is null
    )
  )
  or
  (
    target_type = 'comment'
    and exists (
      select 1
      from public.community_comments c
      join public.community_posts p on p.id = c.post_id
      where c.id = community_reactions.target_id
        and c.deleted_at is null
        and p.visibility = 'public'
        and p.deleted_at is null
    )
  )
);

drop policy if exists protocol_assets_select_public_v1 on public.protocol_assets;
create policy protocol_assets_select_public_v1
on public.protocol_assets
for select
to public
using (true);

drop policy if exists protocol_asset_events_select_public_v1 on public.protocol_asset_events;
create policy protocol_asset_events_select_public_v1
on public.protocol_asset_events
for select
to public
using (true);

drop policy if exists protocol_orders_select_public_v1 on public.protocol_orders;
create policy protocol_orders_select_public_v1
on public.protocol_orders
for select
to public
using (true);

drop policy if exists protocol_order_events_select_public_v1 on public.protocol_order_events;
create policy protocol_order_events_select_public_v1
on public.protocol_order_events
for select
to public
using (true);

drop policy if exists asset_protocol_links_select_public_v1 on public.asset_protocol_links;
create policy asset_protocol_links_select_public_v1
on public.asset_protocol_links
for select
to public
using (true);

-- Service-role all access (explicit, even though service_role typically bypasses RLS)
drop policy if exists wallet_auth_challenges_service_role_all_v1 on public.wallet_auth_challenges;
create policy wallet_auth_challenges_service_role_all_v1
on public.wallet_auth_challenges
for all
to service_role
using (true)
with check (true);

drop policy if exists wallet_sessions_service_role_all_v1 on public.wallet_sessions;
create policy wallet_sessions_service_role_all_v1
on public.wallet_sessions
for all
to service_role
using (true)
with check (true);

drop policy if exists user_badges_service_role_all_v1 on public.user_badges;
create policy user_badges_service_role_all_v1
on public.user_badges
for all
to service_role
using (true)
with check (true);

drop policy if exists assets_catalog_service_role_all_v1 on public.assets_catalog;
create policy assets_catalog_service_role_all_v1
on public.assets_catalog
for all
to service_role
using (true)
with check (true);

drop policy if exists protocol_assets_service_role_all_v1 on public.protocol_assets;
create policy protocol_assets_service_role_all_v1
on public.protocol_assets
for all
to service_role
using (true)
with check (true);

drop policy if exists protocol_asset_events_service_role_all_v1 on public.protocol_asset_events;
create policy protocol_asset_events_service_role_all_v1
on public.protocol_asset_events
for all
to service_role
using (true)
with check (true);

drop policy if exists protocol_orders_service_role_all_v1 on public.protocol_orders;
create policy protocol_orders_service_role_all_v1
on public.protocol_orders
for all
to service_role
using (true)
with check (true);

drop policy if exists protocol_order_events_service_role_all_v1 on public.protocol_order_events;
create policy protocol_order_events_service_role_all_v1
on public.protocol_order_events
for all
to service_role
using (true)
with check (true);

drop policy if exists asset_protocol_links_service_role_all_v1 on public.asset_protocol_links;
create policy asset_protocol_links_service_role_all_v1
on public.asset_protocol_links
for all
to service_role
using (true)
with check (true);
