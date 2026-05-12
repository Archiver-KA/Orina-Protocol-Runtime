# Marketplace Profile And Collection Scale Blueprint

Last verified by Codex audit: 2026-05-12

## Purpose

This blueprint documents the marketplace browse model for assets, profiles, and collections so the surface can scale to millions of rows without hydrating full datasets in the browser.

Implementation status as of this audit:

- asset browse index and page RPC are implemented in `000070_marketplace_catalog_browse_index.sql`
- collection browse index and page RPC are implemented in `000071_marketplace_collection_browse_index.sql`
- profile browse index and page RPC are implemented in `000072_marketplace_profile_browse_index.sql`
- Marketplace and Search call the paged profile and collection helpers in `sellerDirectory.ts` and `collectionsUtils.ts`
- this file remains the design rationale and scale checklist, not a pending-only plan

Target browse flow:

1. Build server-side browse projections.
2. Read each surface through cursor-paged RPCs.
3. Apply guest ranking and logged-in personalization inside the RPC.
4. Render only the first visible page in the frontend.
5. Load more pages on scroll without reordering already-rendered rows.

The asset, collection, and profile paths now share this model through migrations `000070` through `000072`.

## Current Status And Remaining Gaps

Marketplace assets, profiles, and collections now have Supabase page RPCs.

Current profile constraints:

- profile browse freshness depends on the materialized view refresh cadence, which is defined in the migrations as `*/2 * * * *`
- profile floor-price fields still depend on normalized listing price projections

Current collection constraints:

- collection floor-price and volume fields remain zero until collection assets have a single canonical listing price join path
- collection browse freshness depends on the materialized view refresh cadence, which is defined in the migrations as `*/2 * * * *`

For million-scale usage, the browser must never load all profiles, all collections, or all collection memberships for a browse page.

## Shared Ranking Contract

Reuse `public.marketplace_ranking_config` from `000069`.

Add two rows:

```sql
insert into public.marketplace_ranking_config (surface, ranking_version, is_enabled, weights)
values
  (
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
  ),
  (
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
```

Server-side personalization should read viewer context from the existing claim helpers:

- `public.atp2_claim_wallet_address_v1()`
- `public.atp2_claim_profile_id_text_v1()`
- `public.atp2_claim_role_v1()`

Guest behavior:

- Viewer claim helpers return null.
- RPC still returns a stable base ranking.
- `personalized = false`.

Logged-in behavior:

- RPC applies viewer boosts only if the claim bridge token is present.
- RPC must not require auth for public browse reads.
- Overlay booleans such as `is_following`, `is_favorited`, and `is_owner` are returned per row so the client does not issue extra per-card queries.

## 000071 - Collection Browse Index

### Base Indexes

Add indexes that support projection refresh and fallback direct reads.

```sql
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
```

### Projection Schema

Use a materialized view for the public browse path.

```sql
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
  coalesce(items.floor_price_numeric, 0)::numeric as floor_price_numeric,
  coalesce(items.volume_numeric, 0)::numeric as volume_numeric,
  coalesce(favorites.favorite_count, 0)::bigint as liked_count,
  coalesce(follows.follow_count, 0)::bigint as follower_count,
  (
    setweight(to_tsvector('simple', coalesce(collections.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(collections.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(collections.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(collections.bio, '')), 'C')
  ) as search_tsv,
  (
    case when collections.featured then 0.18 else 0 end +
    case when collections.verified then 0.10 else 0 end +
    least(1::numeric, ln(1::numeric + coalesce(follows.follow_count, 0)::numeric) / ln(101::numeric)) * 0.18 +
    least(1::numeric, ln(1::numeric + coalesce(favorites.favorite_count, 0)::numeric) / ln(101::numeric)) * 0.14 +
    least(1::numeric, ln(1::numeric + coalesce(items.item_count, 0)::numeric) / ln(101::numeric)) * 0.12 +
    least(1::numeric, ln(1::numeric + coalesce(items.volume_numeric, 0)::numeric) / ln(1001::numeric)) * 0.10 +
    greatest(
      0::numeric,
      1::numeric - (
        least(greatest(extract(epoch from (now() - coalesce(collections.updated_at, collections.created_at, now()))) / 86400.0, 0), 45) / 45::numeric
      )
    ) * 0.10
  ) as browse_score
from public.collections collections
left join (
  select
    collection_assets.collection_id,
    count(*)::bigint as item_count,
    0::numeric as floor_price_numeric,
    0::numeric as volume_numeric
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
```

Price fields are intentionally initialized as zero until `collection_assets.asset_id` has a single canonical join path to `assets_catalog`. Do not use an `OR` join between `assets_catalog.id::text` and `assets_catalog.asset_uid` in the materialized view at million scale. First normalize `collection_assets` to carry a canonical asset UID or asset UUID, then add real floor and volume.

### Projection Indexes

```sql
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
```

### Refresh Function

```sql
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
```

Schedule through `pg_cron` every two minutes, matching `000070`, or refresh from write-path jobs when collection mutations become high-volume.

### RPC Signature

```sql
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
set search_path = public;
```

Cursor order:

```sql
order by score desc, updated_at desc, id asc
```

Cursor condition:

```sql
and (
  p_cursor_score is null
  or p_cursor_updated_at is null
  or p_cursor_id is null
  or score < p_cursor_score
  or (score = p_cursor_score and updated_at < p_cursor_updated_at)
  or (score = p_cursor_score and updated_at = p_cursor_updated_at and id > p_cursor_id)
)
```

### Collection Personalization Features

Base features:

- `featured`
- `verified`
- `follower_count`
- `liked_count`
- `item_count`
- `volume_numeric`
- `freshness_score`
- `search_tsv` match rank

Viewer features:

- `is_owner`: collection owner matches `atp2_claim_profile_id_text_v1()`
- `is_favorited`: row exists in `user_collection_favorites`
- `is_following`: row exists in `user_collection_follows`
- `matches_memory_category`: viewer `agent_memory_records.memory_key = 'preferred_categories'`
- `matches_recent_search_category`: viewer `search_history.filters.categories`

Reason codes:

- `owned`
- `favorited`
- `following`
- `featured`
- `verified-collection`
- `popular`
- `fresh`
- `ai-memory-category`
- `search-category`

## 000072 - Profile Browse Index

### Base Indexes

```sql
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
```

### Projection Schema

```sql
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
  coalesce(listings.floor_price_numeric, 0)::numeric as floor_price_numeric,
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
    case when profiles.is_verified then 0.10 else 0 end +
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
    count(*)::bigint as items_listed,
    0::numeric as floor_price_numeric
  from public.assets_catalog
  where coalesce(is_active, true) = true
    and seller_user_id is not null
  group by seller_user_id
) listings on listings.seller_user_id = profiles.id
where profiles.status = 'active'
with no data;
```

Floor price can be filled later from a normalized listing price projection. Do not parse display price strings inside this materialized view at scale.

### Projection Indexes

```sql
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
```

### Refresh Function

```sql
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
```

Schedule refresh every two minutes. If follower writes become heavy, switch from full materialized refresh to aggregate tables updated by triggers or async jobs.

### RPC Signature

```sql
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
set search_path = public;
```

Cursor order:

```sql
order by score desc, updated_at desc, user_id asc
```

Cursor condition:

```sql
and (
  p_cursor_score is null
  or p_cursor_updated_at is null
  or p_cursor_user_id is null
  or score < p_cursor_score
  or (score = p_cursor_score and updated_at < p_cursor_updated_at)
  or (score = p_cursor_score and updated_at = p_cursor_updated_at and user_id > p_cursor_user_id)
)
```

### Profile Personalization Features

Base features:

- `reputation_score`
- `follower_count`
- `items_listed`
- `total_volume`
- `is_verified`
- `freshness_score`
- `search_tsv` match rank

Viewer features:

- `is_self`: profile matches viewer profile id
- `is_following`: viewer follows target profile
- `trusted_seller`: target has prior successful transaction with viewer
- `matches_memory_category`: profile listed assets overlap with viewer preferred categories
- `matches_recent_search_category`: profile listed assets overlap with recent searched categories

Reason codes:

- `self`
- `following`
- `trusted-seller`
- `verified-profile`
- `high-reputation`
- `popular`
- `active-seller`
- `fresh`
- `ai-memory-category`
- `search-category`

## RPC Implementation Pattern

Both page RPCs should use the same internal stages:

1. `inputs`: normalize `limit`, `sort`, `search`, cursor, and viewer claims.
2. `cfg`: read ranking weights from `marketplace_ranking_config`.
3. `viewer_profile`: resolve viewer user id and wallet from JWT claims.
4. `candidate_rows`: filter projection by search/category/verified and cursor.
5. `viewer_signals`: compute booleans and affinity rows only for `candidate_rows`.
6. `features`: compute normalized feature scores in `[0, 1]`.
7. `scored`: apply weights and reason codes.
8. `numbered`: fetch `limit + 1`, expose `page_has_more`, return only `limit`.

The personalization pass must happen before pagination. Otherwise page 2 can contain rows that should have appeared on page 1 for that viewer.

## Frontend Shape

Add a shared page state type for all marketplace browse surfaces.

```ts
type MarketplaceEntityMode = 'assets' | 'profiles' | 'collections';

type MarketplacePageStatus = 'idle' | 'loading' | 'ready' | 'error';

type MarketplaceCursor =
  | {
      kind: 'asset';
      updatedAt: string;
      id: string;
    }
  | {
      kind: 'profile';
      score: number;
      updatedAt: string;
      userId: string;
    }
  | {
      kind: 'collection';
      score: number;
      updatedAt: string;
      id: string;
    };

type MarketplaceEntityPageState<T> = {
  items: T[];
  status: MarketplacePageStatus;
  cursor: MarketplaceCursor | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  queryKey: string;
  requestId: number;
  rankingVersion?: string;
  personalized: boolean;
};
```

State placement in `Marketplace`:

```ts
const [assetPage, setAssetPage] =
  useState<MarketplaceEntityPageState<MarketplaceAsset>>(createEmptyPageState);
const [profilePage, setProfilePage] =
  useState<MarketplaceEntityPageState<SellerProfileCardData>>(createEmptyPageState);
const [collectionPage, setCollectionPage] =
  useState<MarketplaceEntityPageState<CollectionSummary>>(createEmptyPageState);
```

Query keys:

```ts
const profileQueryKey = JSON.stringify({
  mode: 'profiles',
  searchQuery: debouncedSearchQuery.trim(),
  verifiedOnly,
});

const collectionQueryKey = JSON.stringify({
  mode: 'collections',
  searchQuery: debouncedSearchQuery.trim(),
  category: selectedCategory !== 'all' ? selectedCategory : undefined,
  verifiedOnly,
});
```

Fetch helpers:

```ts
fetchMarketplaceProfilePageFromSupabase({
  limit: 48,
  cursor: profilePage.cursor?.kind === 'profile' ? profilePage.cursor : null,
  searchQuery: debouncedSearchQuery,
  verifiedOnly,
});

fetchMarketplaceCollectionPageFromSupabase({
  limit: 48,
  cursor: collectionPage.cursor?.kind === 'collection' ? collectionPage.cursor : null,
  searchQuery: debouncedSearchQuery,
  category: selectedCategory !== 'all' ? selectedCategory : undefined,
  verifiedOnly,
});
```

Render rules:

- Do not call `loadSellerDirectorySync()` for marketplace profile browse.
- Do not call `loadRuntimeCollections()` for marketplace collection browse.
- Use the paged state as the only browse source.
- Keep local loaders for owner/detail surfaces where the user edits their own data.
- Keep `ViewportRenderSlot` for card mounting.
- Load page 1 only when the content mode becomes active.
- Do not rerank already-loaded rows when auth hydrates late; the next query key transition or page request can use personalized server ranking.

## Frontend Data Mappers

Profile RPC row maps to `SellerProfileCardData`:

```ts
type MarketplaceProfilePageRow = {
  user_id: string;
  wallet_address: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  is_verified: boolean | null;
  reputation_score: number | string | null;
  total_volume: number | string | null;
  average_rating: number | string | null;
  total_reviews: number | string | null;
  follower_count: number | string | null;
  items_listed: number | string | null;
  floor_price_numeric: number | string | null;
  score: number | string | null;
  reason_codes: string[] | null;
  ranking_version: string | null;
  personalized: boolean | null;
  is_self: boolean | null;
  is_following: boolean | null;
  updated_at: string | null;
  page_has_more: boolean | null;
};
```

Collection RPC row maps to `CollectionSummary`:

```ts
type MarketplaceCollectionPageRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  cover_image: string;
  bio: string;
  tags: string[] | null;
  owner_user_id: string;
  owner_wallet_snapshot: string;
  verified: boolean | null;
  featured: boolean | null;
  item_count: number | string | null;
  floor_price_numeric: number | string | null;
  volume_numeric: number | string | null;
  liked_count: number | string | null;
  follower_count: number | string | null;
  score: number | string | null;
  reason_codes: string[] | null;
  ranking_version: string | null;
  personalized: boolean | null;
  is_owner: boolean | null;
  is_favorited: boolean | null;
  is_following: boolean | null;
  updated_at: string | null;
  page_has_more: boolean | null;
};
```

## Search Page Alignment

After marketplace browse is paged, apply the same fetch helpers to `src/app/components/search/search-page.tsx`.

Do not leave search using:

- full marketplace catalog hydration
- full seller directory hydration
- full runtime collection hydration

Search should pass the same query state into the page RPCs and render from paged results.

## Rollout Plan

Completed:

1. Added `000071_marketplace_collection_browse_index.sql`.
2. Added `fetchMarketplaceCollectionPageFromSupabase()` and switched Marketplace/Search collection browse to the page RPC.
3. Added `000072_marketplace_profile_browse_index.sql`.
4. Added `fetchMarketplaceProfilePageFromSupabase()` and switched Marketplace/Search profile browse to the page RPC.

Remaining verification hardening:

1. Keep guest RPC checks for `get_marketplace_collection_page_v1()` and `get_marketplace_profile_page_v1()`.
2. Add logged-in smoke checks for `is_following`, `is_favorited`, `is_owner`, `is_self`, and `personalized`.

## Verification

Database:

```sql
select public.refresh_marketplace_collection_browse_index_v1();
select public.refresh_marketplace_profile_browse_index_v1();

select * from public.get_marketplace_collection_page_v1(48, null, null, null, null, null, false, 'personalized');
select * from public.get_marketplace_profile_page_v1(48, null, null, null, null, false, 'personalized');
```

Frontend:

```powershell
npm.cmd run verify:viewer-release
npm.cmd run verify:marketplace-freshness
```

## Freshness Verification And Repair

The repository-defined freshness verification command is:

```powershell
npm run verify:marketplace-freshness
```

Expected max staleness is two minutes plus job/runtime delay when `pg_cron` is healthy. The repository does not define a stricter SLA.

Failure detection SQL:

```sql
select jobname, schedule, active
from cron.job
where jobname in (
  'orina-marketplace-browse-index-v1-every-2m',
  'orina-marketplace-collection-browse-index-v1-every-2m',
  'orina-marketplace-profile-browse-index-v1-every-2m'
);

select 'asset' as surface,
  (select max(updated_at) from public.assets_catalog where coalesce(is_active, true) = true) as source_updated_at,
  (select max(updated_at) from public.marketplace_asset_browse_index_v1) as index_updated_at;

select 'collection' as surface,
  (select max(updated_at) from public.collections) as source_updated_at,
  (select max(updated_at) from public.marketplace_collection_browse_index_v1) as index_updated_at;

select 'profile' as surface,
  (select max(updated_at) from public.profiles where status = 'active') as source_updated_at,
  (select max(updated_at) from public.marketplace_profile_browse_index_v1) as index_updated_at;
```

Manual repair SQL:

```sql
select public.refresh_marketplace_asset_browse_index_v1();
select public.refresh_marketplace_collection_browse_index_v1();
select public.refresh_marketplace_profile_browse_index_v1();
```

Manual checks:

- Guest opens Marketplace > Profiles and sees one stable first page.
- Guest opens Marketplace > Collections and sees one stable first page.
- Logged-in user opens both modes without visible reorder after auth bridge hydration.
- Search/filter changes reset only the active mode page state.
- Scroll loads more without increasing initial render cost.
- Collection detail modal fetches membership/details on demand, not during browse.

## Risk Notes

- Materialized views are acceptable for browse reads, but refresh cadence determines freshness. For very high write volume, move counts into aggregate tables with trigger or worker updates.
- Cursor pagination must include score, updated timestamp, and stable ID. Offset pagination is not acceptable at this scale.
- Personalization must happen before `limit + 1` page slicing.
- Do not compute global counts from localStorage in browse mode.
- Do not hydrate `collection_assets` for every collection during browse.
- Do not couple profile browse to whichever asset page is currently loaded.
