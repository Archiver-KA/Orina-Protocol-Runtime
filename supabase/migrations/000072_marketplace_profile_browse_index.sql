-- ============================================================
-- 000072 - Marketplace profile browse index
-- ============================================================
-- Million-scale profile browse support:
--   - indexed materialized projection over public profiles
--   - aggregate follower/listing/reputation features
--   - public cursor-paged RPC with server-side personalization
-- ============================================================

create extension if not exists pg_cron;

insert into public.marketplace_ranking_config (
  surface,
  ranking_version,
  is_enabled,
  weights
)
values (
  'marketplace_profiles',
  'profile_browse_v1',
  true,
  jsonb_build_object(
    'reputation_weight', 0.30,
    'follower_weight', 0.18,
    'listed_asset_weight', 0.14,
    'volume_weight', 0.12,
    'verified_weight', 0.10,
    'freshness_weight', 0.08,
    'followed_boost', 0.30,
    'trusted_seller_boost', 0.18,
    'search_match_boost', 0.12,
    'memory_category_boost', 0.12
  )
)
on conflict (surface) do nothing;

create index if not exists profiles_status_updated_idx
  on public.profiles (status, updated_at desc, id);

create index if not exists profiles_verified_updated_idx
  on public.profiles (is_verified, updated_at desc, id)
  where status = 'active';

create index if not exists profiles_wallet_updated_idx
  on public.profiles (wallet_address, updated_at desc);

create index if not exists user_follows_following_created_idx
  on public.user_follows (following_user_id, created_at desc);

create index if not exists user_follows_follower_created_idx
  on public.user_follows (follower_user_id, created_at desc);

create index if not exists assets_catalog_seller_active_updated_idx
  on public.assets_catalog (seller_user_id, is_active, updated_at desc)
  where seller_user_id is not null;

create materialized view if not exists public.marketplace_profile_browse_index_v1 as
select
  profiles.id as user_id,
  profiles.wallet_address,
  profiles.display_name,
  profiles.username::text as username,
  profiles.bio,
  profiles.avatar_url,
  profiles.banner_url,
  profiles.is_verified,
  profiles.status,
  profiles.created_at,
  profiles.updated_at,
  coalesce(reputation.overall_score, 0)::numeric as reputation_score,
  coalesce(reputation.total_volume, 0)::numeric as total_volume,
  coalesce(reputation.average_rating, 0)::numeric as average_rating,
  coalesce(reputation.total_reviews, 0)::bigint as total_reviews,
  coalesce(follows.follower_count, 0)::bigint as follower_count,
  coalesce(listings.items_listed, 0)::bigint as items_listed,
  0::numeric as floor_price_numeric,
  (
    setweight(to_tsvector('simple', coalesce(profiles.display_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(profiles.username::text, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(profiles.wallet_address, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(profiles.bio, '')), 'C')
  ) as search_tsv,
  (
    least(1::numeric, coalesce(reputation.overall_score, 0)::numeric / 100::numeric) * 0.30 +
    least(1::numeric, ln(1::numeric + coalesce(follows.follower_count, 0)::numeric) / ln(101::numeric)) * 0.18 +
    least(1::numeric, ln(1::numeric + coalesce(listings.items_listed, 0)::numeric) / ln(101::numeric)) * 0.14 +
    least(1::numeric, ln(1::numeric + coalesce(reputation.total_volume, 0)::numeric) / ln(1001::numeric)) * 0.12 +
    (case when profiles.is_verified then 0.10 else 0 end)::numeric +
    greatest(
      0::numeric,
      1::numeric - (
        least(greatest(extract(epoch from (now() - coalesce(profiles.updated_at, profiles.created_at, now()))) / 86400.0, 0), 90) / 90::numeric
      )
    ) * 0.08
  ) as browse_score
from public.profiles profiles
left join public.profile_reputation_summaries reputation
  on reputation.user_id = profiles.id
left join (
  select following_user_id, count(*)::bigint as follower_count
  from public.user_follows
  group by following_user_id
) follows on follows.following_user_id = profiles.id
left join (
  select
    seller_user_id,
    count(*)::bigint as items_listed
  from public.assets_catalog
  where coalesce(is_active, true) = true
    and seller_user_id is not null
  group by seller_user_id
) listings on listings.seller_user_id = profiles.id
where profiles.status = 'active'
with no data;

create unique index if not exists marketplace_profile_browse_index_v1_user_uk
  on public.marketplace_profile_browse_index_v1 (user_id);

create index if not exists marketplace_profile_browse_index_v1_wallet_idx
  on public.marketplace_profile_browse_index_v1 (wallet_address);

create index if not exists marketplace_profile_browse_index_v1_cursor_idx
  on public.marketplace_profile_browse_index_v1 (browse_score desc, updated_at desc, user_id);

create index if not exists marketplace_profile_browse_index_v1_updated_cursor_idx
  on public.marketplace_profile_browse_index_v1 (updated_at desc, user_id);

create index if not exists marketplace_profile_browse_index_v1_verified_cursor_idx
  on public.marketplace_profile_browse_index_v1 (is_verified, browse_score desc, updated_at desc, user_id);

create index if not exists marketplace_profile_browse_index_v1_search_idx
  on public.marketplace_profile_browse_index_v1 using gin (search_tsv);

revoke all on public.marketplace_profile_browse_index_v1 from public, anon, authenticated;
grant select on public.marketplace_profile_browse_index_v1 to service_role;

create or replace function public.refresh_marketplace_profile_browse_index_v1()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    refresh materialized view concurrently public.marketplace_profile_browse_index_v1;
  exception
    when object_not_in_prerequisite_state or feature_not_supported then
      refresh materialized view public.marketplace_profile_browse_index_v1;
  end;
end;
$$;

create or replace function public.get_marketplace_profile_page_v1(
  p_limit integer default 48,
  p_cursor_score numeric default null,
  p_cursor_updated_at timestamptz default null,
  p_cursor_user_id uuid default null,
  p_search_query text default null,
  p_verified_only boolean default false,
  p_sort text default 'personalized'
)
returns table (
  user_id uuid,
  wallet_address text,
  display_name text,
  username text,
  bio text,
  avatar_url text,
  banner_url text,
  is_verified boolean,
  reputation_score numeric,
  total_volume numeric,
  average_rating numeric,
  total_reviews bigint,
  follower_count bigint,
  items_listed bigint,
  floor_price_numeric numeric,
  score numeric,
  reason_codes text[],
  ranking_version text,
  personalized boolean,
  is_self boolean,
  is_following boolean,
  created_at timestamptz,
  updated_at timestamptz,
  page_has_more boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 48), 96));
  v_search_query text := regexp_replace(trim(coalesce(p_search_query, '')), '\s+', ' ', 'g');
  v_sort text := lower(trim(coalesce(p_sort, 'personalized')));
  v_tsquery tsquery := null;
begin
  if v_search_query <> '' then
    v_tsquery := websearch_to_tsquery('simple', v_search_query);
  end if;

  return query
  with inputs as (
    select
      nullif(lower(trim(coalesce(public.atp2_claim_wallet_address_v1(), ''))), '') as viewer_wallet,
      nullif(trim(coalesce(public.atp2_claim_profile_id_text_v1(), '')), '') as viewer_profile_id_text
  ),
  cfg as (
    select
      coalesce(config.ranking_version, 'profile_browse_v1') as ranking_version,
      coalesce(config.is_enabled, true) as is_enabled,
      coalesce(
        config.weights,
        jsonb_build_object(
          'reputation_weight', 0.30,
          'follower_weight', 0.18,
          'listed_asset_weight', 0.14,
          'volume_weight', 0.12,
          'verified_weight', 0.10,
          'freshness_weight', 0.08,
          'followed_boost', 0.30,
          'trusted_seller_boost', 0.18,
          'search_match_boost', 0.12,
          'memory_category_boost', 0.12
        )
      ) as weights
    from (select 1) seed
    left join public.marketplace_ranking_config config
      on config.surface = 'marketplace_profiles'
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
  viewer_recent_search_categories as (
    select distinct lower(trim(category.value)) as category_slug
    from inputs
    inner join public.search_history history
      on lower(trim(history.wallet_address)) = inputs.viewer_wallet
    cross join lateral jsonb_array_elements_text(coalesce(history.filters -> 'categories', '[]'::jsonb)) as category(value)
    where inputs.viewer_wallet is not null
      and history.created_at >= now() - interval '180 days'
      and nullif(trim(category.value), '') is not null
  ),
  candidate_rows as (
    select
      indexed.*,
      case when v_tsquery is null then 0::numeric else ts_rank_cd(indexed.search_tsv, v_tsquery)::numeric end as search_rank
    from public.marketplace_profile_browse_index_v1 indexed
    where (coalesce(p_verified_only, false) = false or indexed.is_verified = true)
      and (v_tsquery is null or indexed.search_tsv @@ v_tsquery)
  ),
  features as (
    select
      candidate_rows.*,
      greatest(
        0::numeric,
        1::numeric - (
          least(greatest(extract(epoch from (now() - coalesce(candidate_rows.updated_at, candidate_rows.created_at, now()))) / 86400.0, 0), 90) / 90::numeric
        )
      ) as freshness_score,
      least(1::numeric, greatest(candidate_rows.reputation_score, 0)::numeric / 100::numeric) as reputation_unit_score,
      least(1::numeric, ln(1::numeric + greatest(candidate_rows.follower_count, 0)::numeric) / ln(101::numeric)) as follower_score,
      least(1::numeric, ln(1::numeric + greatest(candidate_rows.items_listed, 0)::numeric) / ln(101::numeric)) as listed_asset_score,
      least(1::numeric, ln(1::numeric + greatest(candidate_rows.total_volume, 0)::numeric) / ln(1001::numeric)) as volume_score,
      least(1::numeric, greatest(candidate_rows.search_rank, 0)::numeric * 4::numeric) as search_match_score,
      exists (
        select 1
        from inputs
        where inputs.viewer_profile_id_text is not null
          and candidate_rows.user_id::text = inputs.viewer_profile_id_text
      ) as is_self,
      exists (
        select 1
        from inputs
        inner join public.user_follows follows
          on follows.follower_user_id::text = inputs.viewer_profile_id_text
        where inputs.viewer_profile_id_text is not null
          and follows.following_user_id = candidate_rows.user_id
      ) as is_following,
      exists (
        select 1
        from inputs
        inner join public.protocol_orders orders
          on lower(coalesce(orders.buyer_address, '')) = inputs.viewer_wallet
        where inputs.viewer_wallet is not null
          and lower(coalesce(orders.seller_address, '')) = candidate_rows.wallet_address
      ) as has_prior_order,
      exists (
        select 1
        from public.assets_catalog assets
        inner join viewer_memory_categories categories
          on categories.category_slug = lower(trim(coalesce(assets.category, '')))
        where assets.seller_user_id = candidate_rows.user_id
          and coalesce(assets.is_active, true) = true
      ) as matches_memory_category,
      exists (
        select 1
        from public.assets_catalog assets
        inner join viewer_recent_search_categories categories
          on categories.category_slug = lower(trim(coalesce(assets.category, '')))
        where assets.seller_user_id = candidate_rows.user_id
          and coalesce(assets.is_active, true) = true
      ) as matches_search_category
    from candidate_rows
  ),
  scored as (
    select
      features.*,
      cfg.ranking_version,
      (
        case
          when v_sort = 'recent' then features.freshness_score
          when cfg.is_enabled then
            (features.reputation_unit_score * coalesce((cfg.weights ->> 'reputation_weight')::numeric, 0.30)) +
            (features.follower_score * coalesce((cfg.weights ->> 'follower_weight')::numeric, 0.18)) +
            (features.listed_asset_score * coalesce((cfg.weights ->> 'listed_asset_weight')::numeric, 0.14)) +
            (features.volume_score * coalesce((cfg.weights ->> 'volume_weight')::numeric, 0.12)) +
            ((case when features.is_verified then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'verified_weight')::numeric, 0.10)) +
            (features.freshness_score * coalesce((cfg.weights ->> 'freshness_weight')::numeric, 0.08)) +
            ((case when features.is_following then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'followed_boost')::numeric, 0.30)) +
            ((case when features.has_prior_order or features.reputation_unit_score >= 0.70 then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'trusted_seller_boost')::numeric, 0.18)) +
            (features.search_match_score * coalesce((cfg.weights ->> 'search_match_boost')::numeric, 0.12)) +
            ((case when features.matches_memory_category or features.matches_search_category then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'memory_category_boost')::numeric, 0.12))
          else features.browse_score
        end
      ) as final_score,
      case
        when cfg.is_enabled then array_remove(
          array[
            case when features.is_self then 'self' end,
            case when features.is_following then 'following' end,
            case when features.has_prior_order or features.reputation_unit_score >= 0.70 then 'trusted-seller' end,
            case when features.is_verified then 'verified-profile' end,
            case when features.reputation_unit_score >= 0.80 then 'high-reputation' end,
            case when features.follower_score >= 0.55 then 'popular' end,
            case when features.listed_asset_score >= 0.40 then 'active-seller' end,
            case when features.freshness_score >= 0.75 then 'fresh' end,
            case when features.matches_memory_category then 'ai-memory-category' end,
            case when features.matches_search_category or features.search_match_score > 0 then 'search-category' end
          ],
          null
        )
        else array[]::text[]
      end as reason_codes,
      case
        when cfg.is_enabled then (
          features.is_self
          or features.is_following
          or features.has_prior_order
          or features.matches_memory_category
          or features.matches_search_category
        )
        else false
      end as personalized
    from features
    cross join cfg
  ),
  windowed as (
    select scored.*
    from scored
    where (
      p_cursor_score is null
      or p_cursor_updated_at is null
      or p_cursor_user_id is null
      or scored.final_score < p_cursor_score
      or (scored.final_score = p_cursor_score and scored.updated_at < p_cursor_updated_at)
      or (scored.final_score = p_cursor_score and scored.updated_at = p_cursor_updated_at and scored.user_id > p_cursor_user_id)
    )
    order by scored.final_score desc, scored.updated_at desc, scored.user_id asc
    limit (v_limit + 1)
  ),
  numbered as (
    select
      windowed.*,
      row_number() over (order by windowed.final_score desc, windowed.updated_at desc, windowed.user_id asc) as row_number,
      count(*) over () as fetched_count
    from windowed
  )
  select
    numbered.user_id,
    numbered.wallet_address,
    numbered.display_name,
    numbered.username,
    numbered.bio,
    numbered.avatar_url,
    numbered.banner_url,
    numbered.is_verified,
    numbered.reputation_score,
    numbered.total_volume,
    numbered.average_rating,
    numbered.total_reviews,
    numbered.follower_count,
    numbered.items_listed,
    numbered.floor_price_numeric,
    round(numbered.final_score, 6) as score,
    numbered.reason_codes,
    numbered.ranking_version,
    numbered.personalized,
    numbered.is_self,
    numbered.is_following,
    numbered.created_at,
    numbered.updated_at,
    numbered.fetched_count > v_limit as page_has_more
  from numbered
  where numbered.row_number <= v_limit
  order by numbered.final_score desc, numbered.updated_at desc, numbered.user_id asc;
end;
$$;

revoke execute on function public.refresh_marketplace_profile_browse_index_v1() from public, anon, authenticated;
grant execute on function public.refresh_marketplace_profile_browse_index_v1() to service_role;

revoke execute on function public.get_marketplace_profile_page_v1(integer, numeric, timestamptz, uuid, text, boolean, text) from public;
revoke execute on function public.get_marketplace_profile_page_v1(integer, numeric, timestamptz, uuid, text, boolean, text) from anon;
revoke execute on function public.get_marketplace_profile_page_v1(integer, numeric, timestamptz, uuid, text, boolean, text) from authenticated;
grant execute on function public.get_marketplace_profile_page_v1(integer, numeric, timestamptz, uuid, text, boolean, text) to anon;
grant execute on function public.get_marketplace_profile_page_v1(integer, numeric, timestamptz, uuid, text, boolean, text) to authenticated;
grant execute on function public.get_marketplace_profile_page_v1(integer, numeric, timestamptz, uuid, text, boolean, text) to service_role;

select public.refresh_marketplace_profile_browse_index_v1();

do $$
declare
  v_existing_job_id bigint;
begin
  select jobid
    into v_existing_job_id
  from cron.job
  where jobname = 'orina-marketplace-profile-browse-index-v1-every-2m'
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  perform cron.schedule(
    'orina-marketplace-profile-browse-index-v1-every-2m',
    '*/2 * * * *',
    'select public.refresh_marketplace_profile_browse_index_v1();'
  );
end;
$$;

comment on materialized view public.marketplace_profile_browse_index_v1 is
  'Indexed marketplace profile browse/search projection for paged public profile reads';
comment on function public.get_marketplace_profile_page_v1(integer, numeric, timestamptz, uuid, text, boolean, text) is
  'Returns a cursor-paged marketplace profile window with server-side guest ranking and viewer personalization';
comment on function public.refresh_marketplace_profile_browse_index_v1() is
  'Refreshes the marketplace profile browse/search materialized index';
