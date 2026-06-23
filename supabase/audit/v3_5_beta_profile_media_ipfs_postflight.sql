with seed_profiles as (
  select
    profiles.id,
    profiles.wallet_address,
    profiles.display_name,
    profiles.avatar_url,
    profiles.banner_url
  from public.profiles profiles
  join public.profile_story_documents story
    on story.user_id = profiles.id
  where story.story_document -> 'seedProfileMetadata' ->> 'seed_batch' = 'v3.5-beta-seed-profiles-001'
)
select
  count(*) as seed_profiles,
  count(*) filter (where avatar_url like 'https://gateway.pinata.cloud/ipfs/%') as avatar_ipfs,
  count(*) filter (where banner_url like 'https://gateway.pinata.cloud/ipfs/%') as banner_ipfs,
  count(*) filter (where avatar_url is null) as avatar_null,
  count(*) filter (where banner_url is null) as banner_null,
  count(*) filter (where avatar_url like 'https://api.dicebear.com/%') as avatar_dicebear,
  count(*) filter (where banner_url like 'https://images.unsplash.com/%') as banner_unsplash,
  count(*) filter (where avatar_url like 'https://cdn.pixabay.com/%' or banner_url like 'https://cdn.pixabay.com/%') as direct_pixabay
from seed_profiles;

select
  display_name,
  wallet_address,
  avatar_url,
  banner_url
from public.get_marketplace_profile_page_v1(
  5,
  null,
  null,
  null,
  'Coffee Shop',
  false,
  'relevance'
);

select
  count(*) as marketplace_coffee_rows_with_media
from public.get_marketplace_profile_page_v1(
  20,
  null,
  null,
  null,
  'Coffee Shop',
  false,
  'relevance'
)
where avatar_url like 'https://gateway.pinata.cloud/ipfs/%'
  and banner_url like 'https://gateway.pinata.cloud/ipfs/%';
