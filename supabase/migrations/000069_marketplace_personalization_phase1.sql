-- ============================================================
-- 000069 - Marketplace personalization phase 1
-- ============================================================
-- Phase 1 scope:
--   - operator-tunable ranking config per surface
--   - public RPC to rerank an already-filtered candidate asset set
--   - viewer-aware boosts from favorites, watchlist, views, search history,
--     and durable AI memory preferred_categories
--   - signed-out fallback ranking based on trust, freshness, and activity
-- ============================================================

create table if not exists public.marketplace_ranking_config (
  surface text primary key,
  ranking_version text not null default 'phase1_v1',
  is_enabled boolean not null default true,
  weights jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint marketplace_ranking_config_surface_chk
    check (surface = lower(surface) and surface <> '')
);

alter table public.marketplace_ranking_config enable row level security;

drop policy if exists marketplace_ranking_config_deny_all on public.marketplace_ranking_config;
create policy marketplace_ranking_config_deny_all
  on public.marketplace_ranking_config
  as restrictive
  for all
  using (false)
  with check (false);

drop trigger if exists trg_marketplace_ranking_config_updated_at on public.marketplace_ranking_config;
create trigger trg_marketplace_ranking_config_updated_at
  before update on public.marketplace_ranking_config
  for each row execute function public.update_agent_updated_at();

insert into public.marketplace_ranking_config (
  surface,
  ranking_version,
  is_enabled,
  weights
)
values (
  'marketplace_browse',
  'phase1_v1',
  true,
  jsonb_build_object(
    'freshness_weight', 0.28,
    'popularity_weight', 0.22,
    'seller_trust_weight', 0.24,
    'seller_verified_weight', 0.12,
    'asset_verified_weight', 0.06,
    'favorite_boost', 0.34,
    'watchlist_boost', 0.24,
    'recent_view_boost', 0.16,
    'search_category_boost', 0.18,
    'memory_category_boost', 0.24
  )
)
on conflict (surface) do nothing;

create or replace function public.get_personalized_marketplace_assets_v1(
  p_asset_uids text[],
  p_surface text default 'marketplace_browse',
  p_limit integer default 250
)
returns table (
  asset_uid text,
  score numeric,
  reason_codes text[],
  ranking_version text,
  personalized boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with inputs as (
    select
      greatest(1, least(coalesce(p_limit, 250), 250)) as limit_count,
      lower(trim(coalesce(p_surface, 'marketplace_browse'))) as surface,
      nullif(lower(trim(coalesce(public.atp2_claim_wallet_address_v1(), ''))), '') as viewer_wallet
  ),
  cfg as (
    select
      coalesce(config.ranking_version, 'phase1_v1') as ranking_version,
      coalesce(config.is_enabled, true) as is_enabled,
      coalesce(
        config.weights,
        jsonb_build_object(
          'freshness_weight', 0.28,
          'popularity_weight', 0.22,
          'seller_trust_weight', 0.24,
          'seller_verified_weight', 0.12,
          'asset_verified_weight', 0.06,
          'favorite_boost', 0.34,
          'watchlist_boost', 0.24,
          'recent_view_boost', 0.16,
          'search_category_boost', 0.18,
          'memory_category_boost', 0.24
        )
      ) as weights
    from inputs
    left join public.marketplace_ranking_config config
      on config.surface = inputs.surface
  ),
  requested as (
    select
      lower(trim(candidate.asset_uid)) as asset_uid,
      min(candidate.ordinality)::integer as request_position
    from unnest(coalesce(p_asset_uids, array[]::text[])) with ordinality as candidate(asset_uid, ordinality)
    where nullif(trim(candidate.asset_uid), '') is not null
    group by 1
  ),
  viewer_profile as (
    select
      profiles.id as user_id,
      inputs.viewer_wallet
    from inputs
    left join public.profiles
      on profiles.wallet_address = inputs.viewer_wallet
  ),
  matched_assets as (
    select
      assets.id,
      lower(trim(assets.asset_uid)) as asset_uid,
      requested.request_position,
      lower(trim(coalesce(assets.category, ''))) as category_slug,
      coalesce(assets.created_at, assets.updated_at, now()) as listed_at,
      coalesce(assets.metadata, '{}'::jsonb) as metadata,
      assets.seller_user_id,
      lower(trim(coalesce(seller.wallet_address, ''))) as seller_wallet_address,
      coalesce(seller.is_verified, false) as seller_verified
    from requested
    inner join public.assets_catalog assets
      on lower(trim(assets.asset_uid)) = requested.asset_uid
    left join public.profiles seller
      on seller.id = assets.seller_user_id
    where coalesce(assets.is_active, true) = true
  ),
  listing_activity as (
    select
      matched_assets.id as asset_id,
      (
        case
          when coalesce(trim(matched_assets.metadata ->> 'likes'), '') ~ '^[0-9]+(\.[0-9]+)?$'
            then round((matched_assets.metadata ->> 'likes')::numeric)::bigint
          when coalesce(trim(jsonb_extract_path_text(matched_assets.metadata, 'listing_stats', 'likes')), '') ~ '^[0-9]+(\.[0-9]+)?$'
            then round((jsonb_extract_path_text(matched_assets.metadata, 'listing_stats', 'likes'))::numeric)::bigint
          else 0::bigint
        end
        + coalesce(favorite_counts.likes, 0::bigint)
      ) as likes,
      (
        case
          when coalesce(trim(matched_assets.metadata ->> 'views'), '') ~ '^[0-9]+(\.[0-9]+)?$'
            then round((matched_assets.metadata ->> 'views')::numeric)::bigint
          when coalesce(trim(jsonb_extract_path_text(matched_assets.metadata, 'listing_stats', 'views')), '') ~ '^[0-9]+(\.[0-9]+)?$'
            then round((jsonb_extract_path_text(matched_assets.metadata, 'listing_stats', 'views'))::numeric)::bigint
          else 0::bigint
        end
        + coalesce(view_counts.views, 0::bigint)
      ) as views
    from matched_assets
    left join (
      select uf.asset_id, count(*)::bigint as likes
      from public.user_favorites uf
      inner join matched_assets on matched_assets.id = uf.asset_id
      group by uf.asset_id
    ) as favorite_counts
      on favorite_counts.asset_id = matched_assets.id
    left join (
      select ave.asset_id, count(*)::bigint as views
      from public.asset_view_events ave
      inner join matched_assets on matched_assets.id = ave.asset_id
      group by ave.asset_id
    ) as view_counts
      on view_counts.asset_id = matched_assets.id
  ),
  viewer_favorites as (
    select lower(trim(assets.asset_uid)) as asset_uid
    from viewer_profile
    inner join public.user_favorites favorites
      on favorites.user_id = viewer_profile.user_id
    inner join public.assets_catalog assets
      on assets.id = favorites.asset_id
    inner join requested
      on requested.asset_uid = lower(trim(assets.asset_uid))
  ),
  viewer_watchlist as (
    select lower(trim(assets.asset_uid)) as asset_uid
    from viewer_profile
    inner join public.user_watchlist watchlist
      on watchlist.user_id = viewer_profile.user_id
    inner join public.assets_catalog assets
      on assets.id = watchlist.asset_id
    inner join requested
      on requested.asset_uid = lower(trim(assets.asset_uid))
  ),
  viewer_recent_views as (
    select distinct lower(trim(assets.asset_uid)) as asset_uid
    from inputs
    inner join public.asset_view_events events
      on events.wallet_address = inputs.viewer_wallet
    inner join public.assets_catalog assets
      on assets.id = events.asset_id
    inner join requested
      on requested.asset_uid = lower(trim(assets.asset_uid))
    where inputs.viewer_wallet is not null
      and events.last_viewed_at >= now() - interval '90 days'
  ),
  viewer_search_categories as (
    select distinct lower(trim(category.value)) as category_slug
    from inputs
    inner join public.search_history history
      on lower(trim(history.wallet_address)) = inputs.viewer_wallet
    cross join lateral jsonb_array_elements_text(coalesce(history.filters -> 'categories', '[]'::jsonb)) as category(value)
    where inputs.viewer_wallet is not null
      and history.created_at >= now() - interval '180 days'
      and nullif(trim(category.value), '') is not null
  ),
  viewer_memory_categories as (
    select distinct lower(trim(category.value)) as category_slug
    from inputs
    inner join public.agent_memory_records memory
      on memory.wallet_address = inputs.viewer_wallet
    cross join lateral jsonb_array_elements_text(coalesce(memory.memory_value -> 'values', '[]'::jsonb)) as category(value)
    where inputs.viewer_wallet is not null
      and memory.memory_key = 'preferred_categories'
      and lower(coalesce(memory.memory_type, '')) = 'preference'
      and nullif(trim(category.value), '') is not null
  ),
  features as (
    select
      matched_assets.asset_uid,
      matched_assets.request_position,
      matched_assets.category_slug,
      matched_assets.seller_verified,
      case
        when lower(coalesce(matched_assets.metadata ->> 'verified', 'false')) in ('true', '1', 'yes') then true
        else false
      end as asset_verified,
      least(1::numeric, greatest(coalesce(reputation.overall_score, 0), 0)::numeric / 100::numeric) as seller_trust_score,
      greatest(
        0::numeric,
        1::numeric - (
          least(
            greatest(extract(epoch from (now() - matched_assets.listed_at)) / 86400.0, 0),
            45
          ) / 45::numeric
        )
      ) as freshness_score,
      least(
        1::numeric,
        ln(
          1::numeric
          + greatest(coalesce(activity.likes, 0), 0)::numeric
          + greatest(coalesce(activity.views, 0), 0)::numeric
        ) / ln(101::numeric)
      ) as popularity_score,
      exists(select 1 from viewer_favorites where viewer_favorites.asset_uid = matched_assets.asset_uid) as is_favorite,
      exists(select 1 from viewer_watchlist where viewer_watchlist.asset_uid = matched_assets.asset_uid) as is_watchlisted,
      exists(select 1 from viewer_recent_views where viewer_recent_views.asset_uid = matched_assets.asset_uid) as has_recent_view,
      exists(select 1 from viewer_search_categories where viewer_search_categories.category_slug = matched_assets.category_slug) as matches_search_category,
      exists(select 1 from viewer_memory_categories where viewer_memory_categories.category_slug = matched_assets.category_slug) as matches_memory_category
    from matched_assets
    left join listing_activity activity
      on activity.asset_id = matched_assets.id
    left join public.profile_reputation_summaries reputation
      on reputation.user_id = matched_assets.seller_user_id
  ),
  scored as (
    select
      features.asset_uid,
      features.request_position,
      cfg.ranking_version,
      cfg.is_enabled as ranking_enabled,
      (
        case
          when cfg.is_enabled then
            (features.freshness_score * coalesce((cfg.weights ->> 'freshness_weight')::numeric, 0.28))
            + (features.popularity_score * coalesce((cfg.weights ->> 'popularity_weight')::numeric, 0.22))
            + (features.seller_trust_score * coalesce((cfg.weights ->> 'seller_trust_weight')::numeric, 0.24))
            + ((case when features.seller_verified then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'seller_verified_weight')::numeric, 0.12))
            + ((case when features.asset_verified then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'asset_verified_weight')::numeric, 0.06))
            + ((case when features.is_favorite then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'favorite_boost')::numeric, 0.34))
            + ((case when features.is_watchlisted then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'watchlist_boost')::numeric, 0.24))
            + ((case when features.has_recent_view then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'recent_view_boost')::numeric, 0.16))
            + ((case when features.matches_search_category then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'search_category_boost')::numeric, 0.18))
            + ((case when features.matches_memory_category then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'memory_category_boost')::numeric, 0.24))
          else 0::numeric
        end
      ) as score,
      case
        when cfg.is_enabled then
          array_remove(
            array[
              case when features.is_favorite then 'favorite' end,
              case when features.is_watchlisted then 'watchlist' end,
              case when features.has_recent_view then 'recent-view' end,
              case when features.matches_memory_category then 'ai-memory-category' end,
              case when features.matches_search_category then 'search-category' end,
              case when features.seller_verified or features.seller_trust_score >= 0.70 then 'trusted-seller' end,
              case when features.asset_verified then 'verified-asset' end,
              case when features.popularity_score >= 0.55 then 'popular' end,
              case when features.freshness_score >= 0.75 then 'fresh' end
            ],
            null
          )
        else array[]::text[]
      end as reason_codes,
      case
        when cfg.is_enabled then (
          features.is_favorite
          or features.is_watchlisted
          or features.has_recent_view
          or features.matches_search_category
          or features.matches_memory_category
        )
        else false
      end as personalized,
      features.seller_trust_score,
      features.popularity_score,
      features.freshness_score
    from features
    cross join cfg
  )
  select
    scored.asset_uid,
    round(scored.score, 6) as score,
    scored.reason_codes,
    scored.ranking_version,
    scored.personalized
  from scored
  order by
    case when scored.ranking_enabled then scored.score end desc,
    case when scored.ranking_enabled then scored.personalized end desc,
    case when scored.ranking_enabled then scored.seller_trust_score end desc,
    case when scored.ranking_enabled then scored.popularity_score end desc,
    case when scored.ranking_enabled then scored.freshness_score end desc,
    scored.request_position asc
  limit (select limit_count from inputs);
$$;

revoke execute on function public.get_personalized_marketplace_assets_v1(text[], text, integer) from public;
revoke execute on function public.get_personalized_marketplace_assets_v1(text[], text, integer) from anon;
revoke execute on function public.get_personalized_marketplace_assets_v1(text[], text, integer) from authenticated;
grant execute on function public.get_personalized_marketplace_assets_v1(text[], text, integer) to anon;
grant execute on function public.get_personalized_marketplace_assets_v1(text[], text, integer) to authenticated;
grant execute on function public.get_personalized_marketplace_assets_v1(text[], text, integer) to service_role;

comment on table public.marketplace_ranking_config is 'Operator-managed weights for marketplace ranking surfaces';
comment on function public.get_personalized_marketplace_assets_v1(text[], text, integer) is
  'Phase 1 marketplace browse ranking RPC that reranks a caller-provided candidate asset set using viewer affinity and marketplace trust signals';
