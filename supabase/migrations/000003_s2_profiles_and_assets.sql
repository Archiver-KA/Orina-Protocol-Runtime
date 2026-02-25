-- ATP2 Batch D1 / S2 (profiles + asset metadata core)
-- Option A path (new project): create canonical tables directly.
-- If reusing an existing project later, use a separate normalization migration before this pack.

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  display_name text null,
  username citext null,
  bio text null,
  avatar_url text null,
  banner_url text null,
  avatar_type text null,
  website text null,
  twitter text null,
  discord text null,
  telegram text null,
  is_verified boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_wallet_address_uk unique (wallet_address),
  constraint profiles_wallet_address_lower_chk
    check (wallet_address = lower(wallet_address) and wallet_address <> ''),
  constraint profiles_username_uk unique (username),
  constraint profiles_status_chk
    check (status in ('active', 'suspended', 'deleted'))
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notification_settings jsonb not null default '{}'::jsonb,
  ui_preferences jsonb not null default '{}'::jsonb,
  privacy_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  awarded_at timestamptz not null default now(),
  constraint user_badges_user_id_badge_key_uk unique (user_id, badge_key)
);

create table if not exists public.assets_catalog (
  id uuid primary key default gen_random_uuid(),
  asset_uid text not null,
  title text not null,
  slug text null,
  category text null,
  subcategory text null,
  description text null,
  cover_image_url text null,
  gallery_images jsonb not null default '[]'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  seller_user_id uuid null references public.profiles(id) on delete set null,
  contract_address text null,
  token_id text null,
  chain_id bigint null,
  is_active boolean not null default true,
  metadata_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_catalog_asset_uid_uk unique (asset_uid),
  constraint assets_catalog_slug_uk unique (slug)
);

create index if not exists idx_assets_catalog_category
  on public.assets_catalog (category);

create index if not exists idx_assets_catalog_seller_user_id
  on public.assets_catalog (seller_user_id);

create index if not exists idx_assets_catalog_is_active
  on public.assets_catalog (is_active);

create index if not exists idx_assets_catalog_contract_token
  on public.assets_catalog (contract_address, token_id);

create table if not exists public.asset_media (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets_catalog(id) on delete cascade,
  media_type text not null,
  url text not null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint asset_media_media_type_chk
    check (media_type in ('image', 'video', 'document'))
);

create table if not exists public.asset_tags (
  id uuid primary key default gen_random_uuid(),
  tag text not null,
  constraint asset_tags_tag_uk unique (tag)
);

create table if not exists public.asset_tag_map (
  asset_id uuid not null references public.assets_catalog(id) on delete cascade,
  tag_id uuid not null references public.asset_tags(id) on delete cascade,
  primary key (asset_id, tag_id)
);

