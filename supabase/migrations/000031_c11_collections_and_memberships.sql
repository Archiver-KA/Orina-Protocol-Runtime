-- ATP2 Batch C11 / collections and collection asset memberships
-- Scope:
--   - canonical collection headers on Supabase
--   - canonical asset memberships for each collection
--   - local-first UI will hydrate from these tables and sync owner mutations

create table if not exists public.collections (
  id text primary key,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  owner_wallet_snapshot text not null,
  slug text not null,
  name text not null,
  category text not null default '',
  description text not null default '',
  cover_image text not null default '',
  bio text not null default '',
  tags jsonb not null default '[]'::jsonb,
  verified boolean not null default false,
  featured boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_owner_wallet_lower_chk
    check (owner_wallet_snapshot = lower(owner_wallet_snapshot)),
  constraint collections_tags_array_chk
    check (jsonb_typeof(tags) = 'array'),
  constraint collections_metadata_obj_chk
    check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists collections_owner_slug_idx
  on public.collections (owner_user_id, slug);

create index if not exists collections_owner_user_idx
  on public.collections (owner_user_id);

create index if not exists collections_updated_at_idx
  on public.collections (updated_at desc);

create index if not exists collections_owner_wallet_idx
  on public.collections (owner_wallet_snapshot);

create table if not exists public.collection_assets (
  collection_id text not null references public.collections(id) on delete cascade,
  asset_id text not null,
  added_by_user_id uuid not null references public.profiles(id) on delete cascade,
  added_by_wallet_snapshot text not null,
  metadata jsonb not null default '{}'::jsonb,
  added_at timestamptz not null default now(),
  primary key (collection_id, asset_id),
  constraint collection_assets_added_by_wallet_lower_chk
    check (added_by_wallet_snapshot = lower(added_by_wallet_snapshot)),
  constraint collection_assets_metadata_obj_chk
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists collection_assets_asset_idx
  on public.collection_assets (asset_id);

create index if not exists collection_assets_added_by_user_idx
  on public.collection_assets (added_by_user_id);

create index if not exists collection_assets_added_at_idx
  on public.collection_assets (added_at desc);

drop trigger if exists trg_collections_set_updated_at on public.collections;
create trigger trg_collections_set_updated_at
before update on public.collections
for each row execute function public.set_updated_at();
