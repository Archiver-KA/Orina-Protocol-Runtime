-- ============================================================
-- 000071 - Marketplace collection browse index
-- ============================================================
-- Million-scale collection browse support:
--   - indexed materialized projection over collection headers
--   - aggregate item/favorite/follow counts
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
  'marketplace_collections',
  'collection_browse_v1',
  true,
  jsonb_build_object(
    'featured_weight', 0.18,
    'verified_weight', 0.10,
    'follower_weight', 0.18,
    'favorite_weight', 0.14,
    'item_count_weight', 0.12,
    'volume_weight', 0.10,
    'freshness_weight', 0.10,
    'followed_boost', 0.24,
    'favorited_boost', 0.24,
    'owned_boost', 0.12,
    'search_match_boost', 0.10,
    'memory_category_boost', 0.12
  )
)
on conflict (surface) do nothing;

create index if not exists collections_category_updated_idx
  on public.collections (category, updated_at desc, id);

create index if not exists collections_verified_updated_idx
  on public.collections (verified, updated_at desc, id);

create index if not exists collections_featured_updated_idx
  on public.collections (featured, updated_at desc, id);

create index if not exists collections_owner_updated_idx
  on public.collections (owner_user_id, updated_at desc, id);

create index if not exists collection_assets_collection_added_idx
  on public.collection_assets (collection_id, added_at desc);

create index if not exists user_collection_favorites_collection_created_idx
  on public.user_collection_favorites (collection_id, created_at desc);

create index if not exists user_collection_follows_collection_created_idx
  on public.user_collection_follows (collection_id, created_at desc);

create materialized view if not exists public.marketplace_collection_browse_index_v1 as
select
  collections.id,
  collections.slug,
  collections.name,
  collections.category,
  collections.description,
  collections.cover_image,
  collections.bio,
  collections.tags,
  collections.owner_user_id,
  collections.owner_wallet_snapshot,
  collections.verified,
  collections.featured,
  collections.metadata,
  collections.created_at,
  collections.updated_at,
  lower(trim(coalesce(collections.category, ''))) as category_filter,
  lower(trim(coalesce(collections.owner_wallet_snapshot, ''))) as owner_wallet_filter,
  coalesce(items.item_count, 0)::bigint as item_count,
  0::numeric as floor_price_numeric,
  0::numeric as volume_numeric,
  coalesce(favorites.favorite_count, 0)::bigint as liked_count,
  coalesce(follows.follow_count, 0)::bigint as follower_count,
  (
    setweight(to_tsvector('simple', coalesce(collections.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(collections.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(collections.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(collections.bio, '')), 'C')
  ) as search_tsv,
  (
    (case when collections.featured then 0.18 else 0 end)::numeric +
    (case when collections.verified then 0.10 else 0 end)::numeric +
    (least(1::numeric, ln(1::numeric + coalesce(follows.follow_count, 0)::numeric) / ln(101::numeric)) * 0.18) +
    (least(1::numeric, ln(1::numeric + coalesce(favorites.favorite_count, 0)::numeric) / ln(101::numeric)) * 0.14) +
    (least(1::numeric, ln(1::numeric + coalesce(items.item_count, 0)::numeric) / ln(101::numeric)) * 0.12) +
    (
      greatest(
        0::numeric,
        1::numeric - (
          least(greatest(extract(epoch from (now() - coalesce(collections.updated_at, collections.created_at, now()))) / 86400.0, 0), 45) / 45::numeric
        )
      ) * 0.10
    )
  ) as browse_score
from public.collections collections
left join (
  select
    collection_assets.collection_id,
    count(*)::bigint as item_count
  from public.collection_assets
  group by collection_assets.collection_id
) items on items.collection_id = collections.id
left join (
  select collection_id, count(*)::bigint as favorite_count
  from public.user_collection_favorites
  group by collection_id
) favorites on favorites.collection_id = collections.id
left join (
  select collection_id, count(*)::bigint as follow_count
  from public.user_collection_follows
  group by collection_id
) follows on follows.collection_id = collections.id
with no data;

create unique index if not exists marketplace_collection_browse_index_v1_id_uk
  on public.marketplace_collection_browse_index_v1 (id);

create index if not exists marketplace_collection_browse_index_v1_cursor_idx
  on public.marketplace_collection_browse_index_v1 (browse_score desc, updated_at desc, id);

create index if not exists marketplace_collection_browse_index_v1_updated_cursor_idx
  on public.marketplace_collection_browse_index_v1 (updated_at desc, id);

create index if not exists marketplace_collection_browse_index_v1_category_cursor_idx
  on public.marketplace_collection_browse_index_v1 (category_filter, browse_score desc, updated_at desc, id);

create index if not exists marketplace_collection_browse_index_v1_verified_cursor_idx
  on public.marketplace_collection_browse_index_v1 (verified, browse_score desc, updated_at desc, id);

create index if not exists marketplace_collection_browse_index_v1_search_idx
  on public.marketplace_collection_browse_index_v1 using gin (search_tsv);

revoke all on public.marketplace_collection_browse_index_v1 from public, anon, authenticated;
grant select on public.marketplace_collection_browse_index_v1 to service_role;

create or replace function public.refresh_marketplace_collection_browse_index_v1()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    refresh materialized view concurrently public.marketplace_collection_browse_index_v1;
  exception
    when object_not_in_prerequisite_state or feature_not_supported then
      refresh materialized view public.marketplace_collection_browse_index_v1;
  end;
end;
$$;

create or replace function public.get_marketplace_collection_page_v1(
  p_limit integer default 48,
  p_cursor_score numeric default null,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id text default null,
  p_search_query text default null,
  p_category text default null,
  p_verified_only boolean default false,
  p_sort text default 'personalized'
)
returns table (
  id text,
  slug text,
  name text,
  category text,
  description text,
  cover_image text,
  bio text,
  tags jsonb,
  owner_user_id uuid,
  owner_wallet_snapshot text,
  verified boolean,
  featured boolean,
  item_count bigint,
  floor_price_numeric numeric,
  volume_numeric numeric,
  liked_count bigint,
  follower_count bigint,
  score numeric,
  reason_codes text[],
  ranking_version text,
  personalized boolean,
  is_owner boolean,
  is_favorited boolean,
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
  v_category text := lower(trim(coalesce(p_category, '')));
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
      coalesce(config.ranking_version, 'collection_browse_v1') as ranking_version,
      coalesce(config.is_enabled, true) as is_enabled,
      coalesce(
        config.weights,
        jsonb_build_object(
          'featured_weight', 0.18,
          'verified_weight', 0.10,
          'follower_weight', 0.18,
          'favorite_weight', 0.14,
          'item_count_weight', 0.12,
          'volume_weight', 0.10,
          'freshness_weight', 0.10,
          'followed_boost', 0.24,
          'favorited_boost', 0.24,
          'owned_boost', 0.12,
          'search_match_boost', 0.10,
          'memory_category_boost', 0.12
        )
      ) as weights
    from (select 1) seed
    left join public.marketplace_ranking_config config
      on config.surface = 'marketplace_collections'
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
  candidate_rows as (
    select
      indexed.*,
      case when v_tsquery is null then 0::numeric else ts_rank_cd(indexed.search_tsv, v_tsquery)::numeric end as search_rank
    from public.marketplace_collection_browse_index_v1 indexed
    where (v_category = '' or indexed.category_filter = v_category)
      and (coalesce(p_verified_only, false) = false or indexed.verified = true)
      and (v_tsquery is null or indexed.search_tsv @@ v_tsquery)
  ),
  features as (
    select
      candidate_rows.*,
      greatest(
        0::numeric,
        1::numeric - (
          least(greatest(extract(epoch from (now() - coalesce(candidate_rows.updated_at, candidate_rows.created_at, now()))) / 86400.0, 0), 45) / 45::numeric
        )
      ) as freshness_score,
      least(1::numeric, ln(1::numeric + greatest(candidate_rows.follower_count, 0)::numeric) / ln(101::numeric)) as follower_score,
      least(1::numeric, ln(1::numeric + greatest(candidate_rows.liked_count, 0)::numeric) / ln(101::numeric)) as favorite_score,
      least(1::numeric, ln(1::numeric + greatest(candidate_rows.item_count, 0)::numeric) / ln(101::numeric)) as item_count_score,
      least(1::numeric, ln(1::numeric + greatest(candidate_rows.volume_numeric, 0)::numeric) / ln(1001::numeric)) as volume_score,
      least(1::numeric, greatest(candidate_rows.search_rank, 0)::numeric * 4::numeric) as search_match_score,
      exists (
        select 1
        from inputs
        where inputs.viewer_profile_id_text is not null
          and candidate_rows.owner_user_id::text = inputs.viewer_profile_id_text
      ) as is_owner,
      exists (
        select 1
        from inputs
        inner join public.user_collection_favorites favorites
          on favorites.user_id::text = inputs.viewer_profile_id_text
        where inputs.viewer_profile_id_text is not null
          and favorites.collection_id = candidate_rows.id
      ) as is_favorited,
      exists (
        select 1
        from inputs
        inner join public.user_collection_follows follows
          on follows.user_id::text = inputs.viewer_profile_id_text
        where inputs.viewer_profile_id_text is not null
          and follows.collection_id = candidate_rows.id
      ) as is_following,
      exists (
        select 1
        from viewer_memory_categories
        where viewer_memory_categories.category_slug = candidate_rows.category_filter
      ) as matches_memory_category
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
            ((case when features.featured then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'featured_weight')::numeric, 0.18)) +
            ((case when features.verified then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'verified_weight')::numeric, 0.10)) +
            (features.follower_score * coalesce((cfg.weights ->> 'follower_weight')::numeric, 0.18)) +
            (features.favorite_score * coalesce((cfg.weights ->> 'favorite_weight')::numeric, 0.14)) +
            (features.item_count_score * coalesce((cfg.weights ->> 'item_count_weight')::numeric, 0.12)) +
            (features.volume_score * coalesce((cfg.weights ->> 'volume_weight')::numeric, 0.10)) +
            (features.freshness_score * coalesce((cfg.weights ->> 'freshness_weight')::numeric, 0.10)) +
            ((case when features.is_following then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'followed_boost')::numeric, 0.24)) +
            ((case when features.is_favorited then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'favorited_boost')::numeric, 0.24)) +
            ((case when features.is_owner then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'owned_boost')::numeric, 0.12)) +
            (features.search_match_score * coalesce((cfg.weights ->> 'search_match_boost')::numeric, 0.10)) +
            ((case when features.matches_memory_category then 1 else 0 end)::numeric * coalesce((cfg.weights ->> 'memory_category_boost')::numeric, 0.12))
          else features.browse_score
        end
      ) as final_score,
      case
        when cfg.is_enabled then array_remove(
          array[
            case when features.is_owner then 'owned' end,
            case when features.is_favorited then 'favorited' end,
            case when features.is_following then 'following' end,
            case when features.featured then 'featured' end,
            case when features.verified then 'verified-collection' end,
            case when features.favorite_score >= 0.55 or features.follower_score >= 0.55 then 'popular' end,
            case when features.freshness_score >= 0.75 then 'fresh' end,
            case when features.search_match_score > 0 then 'search-category' end,
            case when features.matches_memory_category then 'ai-memory-category' end
          ],
          null
        )
        else array[]::text[]
      end as reason_codes,
      case
        when cfg.is_enabled then (
          features.is_owner or features.is_favorited or features.is_following or features.matches_memory_category
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
      or p_cursor_id is null
      or scored.final_score < p_cursor_score
      or (scored.final_score = p_cursor_score and scored.updated_at < p_cursor_updated_at)
      or (scored.final_score = p_cursor_score and scored.updated_at = p_cursor_updated_at and scored.id > p_cursor_id)
    )
    order by scored.final_score desc, scored.updated_at desc, scored.id asc
    limit (v_limit + 1)
  ),
  numbered as (
    select
      windowed.*,
      row_number() over (order by windowed.final_score desc, windowed.updated_at desc, windowed.id asc) as row_number,
      count(*) over () as fetched_count
    from windowed
  )
  select
    numbered.id,
    numbered.slug,
    numbered.name,
    numbered.category,
    numbered.description,
    numbered.cover_image,
    numbered.bio,
    numbered.tags,
    numbered.owner_user_id,
    numbered.owner_wallet_snapshot,
    numbered.verified,
    numbered.featured,
    numbered.item_count,
    numbered.floor_price_numeric,
    numbered.volume_numeric,
    numbered.liked_count,
    numbered.follower_count,
    round(numbered.final_score, 6) as score,
    numbered.reason_codes,
    numbered.ranking_version,
    numbered.personalized,
    numbered.is_owner,
    numbered.is_favorited,
    numbered.is_following,
    numbered.created_at,
    numbered.updated_at,
    numbered.fetched_count > v_limit as page_has_more
  from numbered
  where numbered.row_number <= v_limit
  order by numbered.final_score desc, numbered.updated_at desc, numbered.id asc;
end;
$$;

revoke execute on function public.refresh_marketplace_collection_browse_index_v1() from public, anon, authenticated;
grant execute on function public.refresh_marketplace_collection_browse_index_v1() to service_role;

revoke execute on function public.get_marketplace_collection_page_v1(integer, numeric, timestamptz, text, text, text, boolean, text) from public;
revoke execute on function public.get_marketplace_collection_page_v1(integer, numeric, timestamptz, text, text, text, boolean, text) from anon;
revoke execute on function public.get_marketplace_collection_page_v1(integer, numeric, timestamptz, text, text, text, boolean, text) from authenticated;
grant execute on function public.get_marketplace_collection_page_v1(integer, numeric, timestamptz, text, text, text, boolean, text) to anon;
grant execute on function public.get_marketplace_collection_page_v1(integer, numeric, timestamptz, text, text, text, boolean, text) to authenticated;
grant execute on function public.get_marketplace_collection_page_v1(integer, numeric, timestamptz, text, text, text, boolean, text) to service_role;

select public.refresh_marketplace_collection_browse_index_v1();

do $$
declare
  v_existing_job_id bigint;
begin
  select jobid
    into v_existing_job_id
  from cron.job
  where jobname = 'orina-marketplace-collection-browse-index-v1-every-2m'
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  perform cron.schedule(
    'orina-marketplace-collection-browse-index-v1-every-2m',
    '*/2 * * * *',
    'select public.refresh_marketplace_collection_browse_index_v1();'
  );
end;
$$;

comment on materialized view public.marketplace_collection_browse_index_v1 is
  'Indexed marketplace collection browse/search projection for paged public collection reads';
comment on function public.get_marketplace_collection_page_v1(integer, numeric, timestamptz, text, text, text, boolean, text) is
  'Returns a cursor-paged marketplace collection window with server-side guest ranking and viewer personalization';
comment on function public.refresh_marketplace_collection_browse_index_v1() is
  'Refreshes the marketplace collection browse/search materialized index';
