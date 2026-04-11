-- ============================================================
-- 000059 - Marketplace listing stats RPC
-- ============================================================
-- Adds a server-side view counter table plus public RPC helpers so
-- marketplace cards and modals can hydrate global likes/views using
-- asset_uid (the canonical UI route id), without exposing owner-only
-- user_favorites rows directly.
--
-- NOTE: The live public RPC surface uses p_* parameter names.
-- ============================================================

create table if not exists public.asset_view_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets_catalog(id) on delete cascade,
  viewer_key text not null,
  wallet_address text null,
  metadata jsonb not null default '{}'::jsonb,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  constraint asset_view_events_viewer_key_chk check (viewer_key = lower(viewer_key) and viewer_key <> ''),
  constraint asset_view_events_wallet_address_lower_chk check (
    wallet_address is null or (wallet_address = lower(wallet_address) and wallet_address <> '')
  ),
  constraint asset_view_events_asset_viewer_uk unique (asset_id, viewer_key)
);

create index if not exists idx_asset_view_events_asset_id
  on public.asset_view_events (asset_id, last_viewed_at desc);

create index if not exists idx_asset_view_events_wallet_address
  on public.asset_view_events (wallet_address)
  where wallet_address is not null;

alter table public.asset_view_events enable row level security;

create or replace function public.record_asset_view_v1(
  p_asset_uid text,
  p_viewer_key text,
  p_wallet_address text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_asset_id uuid;
  v_asset_uid text;
  v_viewer_key text;
  v_wallet_address text;
begin
  v_asset_uid := lower(trim(coalesce(p_asset_uid, '')));
  v_viewer_key := lower(trim(coalesce(p_viewer_key, '')));

  if v_asset_uid = '' or v_viewer_key = '' then
    return;
  end if;

  select id into v_asset_id
  from public.assets_catalog
  where lower(trim(asset_uid)) = v_asset_uid
  limit 1;

  if v_asset_id is null then
    return;
  end if;

  v_wallet_address := nullif(lower(trim(coalesce(p_wallet_address, ''))), '');

  insert into public.asset_view_events (
    asset_id,
    viewer_key,
    wallet_address,
    last_viewed_at
  )
  values (
    v_asset_id,
    v_viewer_key,
    v_wallet_address,
    now()
  )
  on conflict (asset_id, viewer_key) do update
    set wallet_address = coalesce(excluded.wallet_address, public.asset_view_events.wallet_address),
        last_viewed_at = now();
end;
$$;

create or replace function public.get_asset_listing_stats_v1(
  p_asset_uids text[]
)
returns table (
  asset_uid text,
  likes bigint,
  views bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with requested as (
    select distinct lower(trim(value)) as asset_uid
    from unnest(coalesce(p_asset_uids, array[]::text[])) as value
    where nullif(trim(value), '') is not null
  ),
  matched_assets as (
    select
      a.id,
      lower(trim(a.asset_uid)) as asset_uid,
      case
        when coalesce(trim(a.metadata ->> 'likes'), '') ~ '^[0-9]+(\.[0-9]+)?$'
          then round((a.metadata ->> 'likes')::numeric)::bigint
        when coalesce(trim(jsonb_extract_path_text(a.metadata, 'listing_stats', 'likes')), '') ~ '^[0-9]+(\.[0-9]+)?$'
          then round((jsonb_extract_path_text(a.metadata, 'listing_stats', 'likes'))::numeric)::bigint
        else 0::bigint
      end as baseline_likes,
      case
        when coalesce(trim(a.metadata ->> 'views'), '') ~ '^[0-9]+(\.[0-9]+)?$'
          then round((a.metadata ->> 'views')::numeric)::bigint
        when coalesce(trim(jsonb_extract_path_text(a.metadata, 'listing_stats', 'views')), '') ~ '^[0-9]+(\.[0-9]+)?$'
          then round((jsonb_extract_path_text(a.metadata, 'listing_stats', 'views'))::numeric)::bigint
        else 0::bigint
      end as baseline_views
    from public.assets_catalog a
    inner join requested r
      on lower(trim(a.asset_uid)) = r.asset_uid
  ),
  favorite_counts as (
    select uf.asset_id, count(*)::bigint as likes
    from public.user_favorites uf
    inner join matched_assets assets on assets.id = uf.asset_id
    group by uf.asset_id
  ),
  view_counts as (
    select ave.asset_id, count(*)::bigint as views
    from public.asset_view_events ave
    inner join matched_assets assets on assets.id = ave.asset_id
    group by ave.asset_id
  )
  select
    assets.asset_uid,
    assets.baseline_likes + coalesce(favorite_counts.likes, 0::bigint) as likes,
    assets.baseline_views + coalesce(view_counts.views, 0::bigint) as views
  from matched_assets assets
  left join favorite_counts on favorite_counts.asset_id = assets.id
  left join view_counts on view_counts.asset_id = assets.id;
$$;

revoke execute on function public.record_asset_view_v1(text, text, text) from public;
revoke execute on function public.record_asset_view_v1(text, text, text) from anon;
revoke execute on function public.record_asset_view_v1(text, text, text) from authenticated;
grant execute on function public.record_asset_view_v1(text, text, text) to anon;
grant execute on function public.record_asset_view_v1(text, text, text) to authenticated;
grant execute on function public.record_asset_view_v1(text, text, text) to service_role;

revoke execute on function public.get_asset_listing_stats_v1(text[]) from public;
revoke execute on function public.get_asset_listing_stats_v1(text[]) from anon;
revoke execute on function public.get_asset_listing_stats_v1(text[]) from authenticated;
grant execute on function public.get_asset_listing_stats_v1(text[]) to anon;
grant execute on function public.get_asset_listing_stats_v1(text[]) to authenticated;
grant execute on function public.get_asset_listing_stats_v1(text[]) to service_role;

comment on table public.asset_view_events is 'Deduplicated marketplace asset view records keyed by asset + viewer session/wallet';
comment on function public.record_asset_view_v1(text, text, text) is 'Upserts a marketplace asset view keyed by asset_uid and viewer_key';
comment on function public.get_asset_listing_stats_v1(text[]) is 'Returns aggregate marketplace listing likes/views for the provided asset_uid values';
