-- ATP2 Batch C7 / geo hierarchy + delivery address tables
-- Scope:
--   - global geo country reference table
--   - global geo place hierarchy table
--   - user delivery addresses
--   - dataset version tracking for geo imports

create table if not exists public.geo_countries (
  code text primary key,
  iso3 text not null unique,
  name text not null,
  native_name text null,
  phone_code text null,
  postal_code_label text not null default 'Postal code',
  postal_code_required boolean not null default false,
  postal_code_pattern text null,
  address_schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint geo_countries_code_upper_chk
    check (code = upper(code) and char_length(code) = 2),
  constraint geo_countries_iso3_upper_chk
    check (iso3 = upper(iso3) and char_length(iso3) = 3),
  constraint geo_countries_address_schema_obj_chk
    check (jsonb_typeof(address_schema) = 'object'),
  constraint geo_countries_metadata_obj_chk
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_geo_countries_is_active
  on public.geo_countries (is_active);

create table if not exists public.geo_places (
  id text primary key,
  country_code text not null references public.geo_countries(code) on delete cascade,
  parent_id text null references public.geo_places(id) on delete cascade,
  depth smallint not null,
  place_kind text not null,
  code text null,
  name text not null,
  name_ascii text null,
  label text null,
  is_selectable boolean not null default true,
  sort_order integer not null default 0,
  lat numeric(9, 6) null,
  lng numeric(9, 6) null,
  postal_code_pattern text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint geo_places_depth_chk
    check (depth between 1 and 6),
  constraint geo_places_kind_chk
    check (place_kind in ('admin1', 'admin2', 'admin3', 'admin4', 'admin5', 'locality', 'sublocality')),
  constraint geo_places_metadata_obj_chk
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_geo_places_country_parent
  on public.geo_places (country_code, parent_id, sort_order, name);

create index if not exists idx_geo_places_country_kind
  on public.geo_places (country_code, place_kind, name);

create index if not exists idx_geo_places_country_code_kind
  on public.geo_places (country_code, code, place_kind)
  where code is not null;

create index if not exists idx_geo_places_parent
  on public.geo_places (parent_id);

create table if not exists public.user_delivery_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text null,
  recipient_name text not null,
  phone_e164 text null,
  country_code text not null references public.geo_countries(code),
  country_name_snapshot text not null,
  geo_path jsonb not null default '[]'::jsonb,
  leaf_place_id text null references public.geo_places(id) on delete set null,
  postal_code text null,
  address_line1 text not null,
  address_line2 text null,
  delivery_instructions text null,
  is_default boolean not null default false,
  validation_status text not null default 'unverified',
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_delivery_addresses_geo_path_array_chk
    check (jsonb_typeof(geo_path) = 'array'),
  constraint user_delivery_addresses_validation_status_chk
    check (validation_status in ('unverified', 'format_valid', 'manual_unstructured', 'verified_external', 'invalid')),
  constraint user_delivery_addresses_source_chk
    check (source in ('manual', 'legacy_migrated', 'verified_autocomplete', 'imported'))
);

create index if not exists idx_user_delivery_addresses_user_id
  on public.user_delivery_addresses (user_id, created_at desc);

create index if not exists idx_user_delivery_addresses_country_code
  on public.user_delivery_addresses (country_code);

create unique index if not exists idx_user_delivery_addresses_one_default
  on public.user_delivery_addresses (user_id)
  where is_default;

create table if not exists public.geo_dataset_versions (
  id uuid primary key default gen_random_uuid(),
  dataset_key text not null,
  dataset_version text not null,
  imported_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint geo_dataset_versions_key_version_uk
    unique (dataset_key, dataset_version),
  constraint geo_dataset_versions_metadata_obj_chk
    check (jsonb_typeof(metadata) = 'object')
);
