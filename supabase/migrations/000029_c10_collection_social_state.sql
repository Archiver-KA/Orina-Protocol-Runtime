-- ATP2 Batch C10 / collection favorites and follows
-- Scope:
--   - wallet-scoped favorite/follow state for collections
--   - collection IDs remain app-level text IDs until collection CRUD is moved to Supabase

create table if not exists public.user_collection_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  collection_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, collection_id),
  constraint user_collection_favorites_metadata_obj_chk
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.user_collection_follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  collection_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, collection_id),
  constraint user_collection_follows_metadata_obj_chk
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists user_collection_favorites_collection_idx
  on public.user_collection_favorites (collection_id);

create index if not exists user_collection_favorites_created_at_idx
  on public.user_collection_favorites (created_at desc);

create index if not exists user_collection_follows_collection_idx
  on public.user_collection_follows (collection_id);

create index if not exists user_collection_follows_created_at_idx
  on public.user_collection_follows (created_at desc);
