-- ============================================================
-- 000070 - Marketplace catalog browse index
-- ============================================================
-- Million-scale marketplace browse support:
--   - composite cursor/filter indexes on assets_catalog
--   - materialized browse/search index for public catalog reads
--   - RPC page reader over the indexed surface
--   - cron-refresh helper for the materialized view
-- ============================================================

create extension if not exists pg_cron;

create index if not exists idx_assets_catalog_active_updated_id_desc
  on public.assets_catalog (is_active, updated_at desc, id desc);

create index if not exists idx_assets_catalog_category_active_updated_id_desc
  on public.assets_catalog (category, is_active, updated_at desc, id desc);

create index if not exists idx_assets_catalog_chain_active_updated_id_desc
  on public.assets_catalog (chain_id, is_active, updated_at desc, id desc)
  where chain_id is not null;

create index if not exists idx_assets_catalog_category_chain_active_updated_id_desc
  on public.assets_catalog (category, chain_id, is_active, updated_at desc, id desc)
  where chain_id is not null;

create index if not exists idx_assets_catalog_metadata_verified_active
  on public.assets_catalog ((lower(coalesce(metadata ->> 'verified', 'false'))), updated_at desc, id desc)
  where is_active = true;

create index if not exists idx_assets_catalog_search_tsv
  on public.assets_catalog
  using gin ((
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(subcategory, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(metadata ->> 'name', '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(metadata ->> 'category', '')), 'B')
  ));

create materialized view if not exists public.marketplace_asset_browse_index_v1 as
select
  assets.id,
  assets.asset_uid,
  assets.title,
  assets.category,
  assets.subcategory,
  assets.description,
  assets.cover_image_url,
  assets.gallery_images,
  assets.attributes,
  assets.metadata,
  assets.seller_user_id,
  assets.contract_address,
  assets.token_id,
  assets.chain_id,
  coalesce(assets.is_active, true) as is_active,
  assets.created_at,
  assets.updated_at,
  lower(trim(coalesce(assets.category, ''))) as category_filter,
  lower(regexp_replace(coalesce(assets.metadata ->> 'blockchain', ''), '[_\s]+', '-', 'g')) as blockchain_filter,
  case
    when lower(coalesce(assets.metadata ->> 'verified', 'false')) in ('true', '1', 'yes') then true
    else false
  end as verified,
  case
    when lower(coalesce(assets.metadata ->> 'featured', 'false')) in ('true', '1', 'yes') then true
    else false
  end as featured,
  (
    setweight(to_tsvector('simple', coalesce(assets.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(assets.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(assets.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(assets.subcategory, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(assets.metadata ->> 'name', '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(assets.metadata ->> 'category', '')), 'B')
  ) as search_tsv,
  (
    (
      least(
        1::numeric,
        ln(
          1::numeric +
          greatest(
            case
              when coalesce(trim(assets.metadata ->> 'likes'), '') ~ '^[0-9]+(\.[0-9]+)?$'
                then round((assets.metadata ->> 'likes')::numeric)
              when coalesce(trim(jsonb_extract_path_text(assets.metadata, 'listing_stats', 'likes')), '') ~ '^[0-9]+(\.[0-9]+)?$'
                then round((jsonb_extract_path_text(assets.metadata, 'listing_stats', 'likes'))::numeric)
              else 0::numeric
            end,
            0::numeric
          ) +
          greatest(
            case
              when coalesce(trim(assets.metadata ->> 'views'), '') ~ '^[0-9]+(\.[0-9]+)?$'
                then round((assets.metadata ->> 'views')::numeric)
              when coalesce(trim(jsonb_extract_path_text(assets.metadata, 'listing_stats', 'views')), '') ~ '^[0-9]+(\.[0-9]+)?$'
                then round((jsonb_extract_path_text(assets.metadata, 'listing_stats', 'views'))::numeric)
              else 0::numeric
            end,
            0::numeric
          )
        ) / ln(101::numeric)
      ) * 0.40
    ) +
    (
      greatest(
        0::numeric,
        1::numeric - (
          least(greatest(extract(epoch from (now() - coalesce(assets.updated_at, assets.created_at, now()))) / 86400.0, 0), 45) / 45::numeric
        )
      ) * 0.35
    ) +
    (
      case when lower(coalesce(assets.metadata ->> 'verified', 'false')) in ('true', '1', 'yes') then 0.10 else 0 end
    ) +
    (
      case when lower(coalesce(assets.metadata ->> 'featured', 'false')) in ('true', '1', 'yes') then 0.15 else 0 end
    )
  ) as browse_score
from public.assets_catalog assets
where coalesce(assets.is_active, true) = true
with no data;

create unique index if not exists marketplace_asset_browse_index_v1_id_uk
  on public.marketplace_asset_browse_index_v1 (id);

create index if not exists marketplace_asset_browse_index_v1_cursor_idx
  on public.marketplace_asset_browse_index_v1 (updated_at desc, id desc);

create index if not exists marketplace_asset_browse_index_v1_category_cursor_idx
  on public.marketplace_asset_browse_index_v1 (category_filter, updated_at desc, id desc);

create index if not exists marketplace_asset_browse_index_v1_chain_cursor_idx
  on public.marketplace_asset_browse_index_v1 (chain_id, updated_at desc, id desc)
  where chain_id is not null;

create index if not exists marketplace_asset_browse_index_v1_category_chain_cursor_idx
  on public.marketplace_asset_browse_index_v1 (category_filter, chain_id, updated_at desc, id desc)
  where chain_id is not null;

create index if not exists marketplace_asset_browse_index_v1_verified_cursor_idx
  on public.marketplace_asset_browse_index_v1 (verified, updated_at desc, id desc);

create index if not exists marketplace_asset_browse_index_v1_search_tsv_idx
  on public.marketplace_asset_browse_index_v1
  using gin (search_tsv);

create index if not exists marketplace_asset_browse_index_v1_score_idx
  on public.marketplace_asset_browse_index_v1 (browse_score desc, updated_at desc, id desc);

revoke all on public.marketplace_asset_browse_index_v1 from public, anon, authenticated;
grant select on public.marketplace_asset_browse_index_v1 to service_role;

create or replace function public.refresh_marketplace_asset_browse_index_v1()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    refresh materialized view concurrently public.marketplace_asset_browse_index_v1;
  exception
    when object_not_in_prerequisite_state or feature_not_supported then
      refresh materialized view public.marketplace_asset_browse_index_v1;
  end;
end;
$$;

create or replace function public.get_marketplace_catalog_page_v1(
  p_limit integer default 48,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id uuid default null,
  p_search_query text default null,
  p_category text default null,
  p_chain_id bigint default null,
  p_blockchain text default null,
  p_verified_only boolean default false
)
returns table (
  id uuid,
  asset_uid text,
  title text,
  category text,
  description text,
  cover_image_url text,
  gallery_images jsonb,
  attributes jsonb,
  metadata jsonb,
  seller_user_id uuid,
  contract_address text,
  token_id text,
  chain_id bigint,
  is_active boolean,
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
  v_blockchain text := lower(regexp_replace(coalesce(p_blockchain, ''), '[_\s]+', '-', 'g'));
  v_search_query text := regexp_replace(trim(coalesce(p_search_query, '')), '\s+', ' ', 'g');
  v_tsquery tsquery := null;
begin
  if v_search_query <> '' then
    v_tsquery := websearch_to_tsquery('simple', v_search_query);
  end if;

  return query
  with page_rows as (
    select indexed.*
    from public.marketplace_asset_browse_index_v1 indexed
    where indexed.is_active = true
      and (v_category = '' or indexed.category_filter = v_category)
      and (p_chain_id is null or indexed.chain_id = p_chain_id)
      and (p_chain_id is not null or v_blockchain = '' or indexed.blockchain_filter = v_blockchain)
      and (coalesce(p_verified_only, false) = false or indexed.verified = true)
      and (v_tsquery is null or indexed.search_tsv @@ v_tsquery)
      and (
        p_cursor_updated_at is null
        or p_cursor_id is null
        or indexed.updated_at < p_cursor_updated_at
        or (indexed.updated_at = p_cursor_updated_at and indexed.id < p_cursor_id)
      )
    order by indexed.updated_at desc, indexed.id desc
    limit (v_limit + 1)
  ),
  numbered as (
    select
      page_rows.*,
      row_number() over (order by page_rows.updated_at desc, page_rows.id desc) as row_number,
      count(*) over () as fetched_count
    from page_rows
  )
  select
    numbered.id,
    numbered.asset_uid,
    numbered.title,
    numbered.category,
    numbered.description,
    numbered.cover_image_url,
    numbered.gallery_images,
    numbered.attributes,
    numbered.metadata,
    numbered.seller_user_id,
    numbered.contract_address,
    numbered.token_id,
    numbered.chain_id,
    numbered.is_active,
    numbered.created_at,
    numbered.updated_at,
    numbered.fetched_count > v_limit as page_has_more
  from numbered
  where numbered.row_number <= v_limit
  order by numbered.updated_at desc, numbered.id desc;
end;
$$;

revoke execute on function public.refresh_marketplace_asset_browse_index_v1() from public, anon, authenticated;
grant execute on function public.refresh_marketplace_asset_browse_index_v1() to service_role;

revoke execute on function public.get_marketplace_catalog_page_v1(integer, timestamptz, uuid, text, text, bigint, text, boolean) from public;
revoke execute on function public.get_marketplace_catalog_page_v1(integer, timestamptz, uuid, text, text, bigint, text, boolean) from anon;
revoke execute on function public.get_marketplace_catalog_page_v1(integer, timestamptz, uuid, text, text, bigint, text, boolean) from authenticated;
grant execute on function public.get_marketplace_catalog_page_v1(integer, timestamptz, uuid, text, text, bigint, text, boolean) to anon;
grant execute on function public.get_marketplace_catalog_page_v1(integer, timestamptz, uuid, text, text, bigint, text, boolean) to authenticated;
grant execute on function public.get_marketplace_catalog_page_v1(integer, timestamptz, uuid, text, text, bigint, text, boolean) to service_role;

select public.refresh_marketplace_asset_browse_index_v1();

do $$
declare
  v_existing_job_id bigint;
begin
  select jobid
    into v_existing_job_id
  from cron.job
  where jobname = 'orina-marketplace-browse-index-v1-every-2m'
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  perform cron.schedule(
    'orina-marketplace-browse-index-v1-every-2m',
    '*/2 * * * *',
    'select public.refresh_marketplace_asset_browse_index_v1();'
  );
end;
$$;

comment on materialized view public.marketplace_asset_browse_index_v1 is
  'Indexed marketplace browse/search projection for paged public catalog reads';
comment on function public.get_marketplace_catalog_page_v1(integer, timestamptz, uuid, text, text, bigint, text, boolean) is
  'Returns a cursor-paged marketplace catalog window from the indexed browse materialized view';
comment on function public.refresh_marketplace_asset_browse_index_v1() is
  'Refreshes the marketplace browse/search materialized index';
