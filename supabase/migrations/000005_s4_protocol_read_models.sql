-- ATP2 Batch D1 / S4 (protocol read-model scaffold)
-- Event-driven scaffold only. No indexer logic in this batch.

create table if not exists public.protocol_assets (
  id uuid primary key default gen_random_uuid(),
  chain_id bigint not null,
  asset_contract text not null,
  token_id text not null,
  owner_address text null,
  status text null,
  available_amount numeric null,
  total_amount numeric null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint protocol_assets_chain_contract_token_uk
    unique (chain_id, asset_contract, token_id)
);

create table if not exists public.protocol_asset_events (
  id uuid primary key default gen_random_uuid(),
  protocol_asset_id uuid not null references public.protocol_assets(id) on delete cascade,
  event_name text not null,
  chain_id bigint not null,
  tx_hash text not null,
  log_index integer not null,
  block_number bigint null,
  block_time timestamptz null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint protocol_asset_events_chain_tx_log_uk unique (chain_id, tx_hash, log_index)
);

create table if not exists public.protocol_orders (
  id uuid primary key default gen_random_uuid(),
  order_uid text not null,
  chain_id bigint not null,
  marketplace_contract text not null,
  asset_contract text null,
  asset_token_id text null,
  buyer_address text null,
  seller_address text null,
  status text not null,
  amount numeric null,
  price_per_unit numeric null,
  total_value numeric null,
  currency_symbol text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint protocol_orders_order_uid_uk unique (order_uid)
);

create table if not exists public.protocol_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.protocol_orders(id) on delete cascade,
  event_name text not null,
  chain_id bigint not null,
  tx_hash text not null,
  log_index integer not null,
  block_number bigint null,
  block_time timestamptz null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint protocol_order_events_chain_tx_log_uk unique (chain_id, tx_hash, log_index)
);

create table if not exists public.asset_protocol_links (
  asset_id uuid not null references public.assets_catalog(id) on delete cascade,
  chain_id bigint not null,
  contract_address text not null,
  token_id text not null,
  link_type text not null default 'primary',
  created_at timestamptz not null default now(),
  primary key (asset_id, chain_id, contract_address, token_id)
);

