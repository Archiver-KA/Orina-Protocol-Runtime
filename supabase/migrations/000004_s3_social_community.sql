-- ATP2 Batch D1 / S3 (social + community)
-- Messaging tables are intentionally deferred to a later batch.

create table if not exists public.user_follows (
  follower_user_id uuid not null references public.profiles(id) on delete cascade,
  following_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_user_id, following_user_id)
);

create table if not exists public.user_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null references public.assets_catalog(id) on delete cascade,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, asset_id)
);

create table if not exists public.user_watchlist (
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null references public.assets_catalog(id) on delete cascade,
  created_at timestamptz not null default now(),
  notes text null,
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, asset_id)
);

create table if not exists public.watchlist_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null references public.assets_catalog(id) on delete cascade,
  alert_type text not null,
  threshold_value numeric null,
  payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text null,
  body text null,
  payload jsonb not null default '{}'::jsonb,
  source_type text null,
  source_id text null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz null
);

create index if not exists idx_notifications_user_id_created_at_desc
  on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_id_is_read
  on public.notifications (user_id, is_read);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  content text null,
  media jsonb not null default '[]'::jsonb,
  poll jsonb null,
  visibility text not null default 'public',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint community_posts_visibility_chk
    check (visibility in ('public', 'followers', 'private'))
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid null references public.community_comments(id) on delete set null,
  content text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists public.community_reactions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  constraint community_reactions_target_type_chk
    check (target_type in ('post', 'comment')),
  primary key (user_id, target_type, target_id, reaction_type)
);

