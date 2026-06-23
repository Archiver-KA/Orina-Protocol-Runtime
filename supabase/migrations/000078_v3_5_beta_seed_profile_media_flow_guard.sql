-- ============================================================
-- 000078 - v3.5 beta seed profile media flow guard
-- ============================================================
-- Removes non-IPFS avatar/banner URLs from the v3.5 beta seed
-- profiles. The seed media source remains pending until campaign
-- avatar.png/banner.png files are pinned through Pinata/IPFS.
-- ============================================================

with seed_profiles as (
  select
    profiles.id,
    profiles.wallet_address
  from public.profiles profiles
  join public.profile_story_documents story
    on story.user_id = profiles.id
  where story.story_document -> 'seedProfileMetadata' ->> 'seed_batch' = 'v3.5-beta-seed-profiles-001'
)
update public.profiles profiles
set
  avatar_url = case
    when profiles.avatar_url ~ '^https://api\.dicebear\.com/' then null
    else profiles.avatar_url
  end,
  banner_url = case
    when profiles.banner_url ~ '^https://images\.unsplash\.com/source/' then null
    else profiles.banner_url
  end,
  updated_at = now()
from seed_profiles seed
where profiles.id = seed.id
  and (
    profiles.avatar_url ~ '^https://api\.dicebear\.com/'
    or profiles.banner_url ~ '^https://images\.unsplash\.com/source/'
  );

with seed_profiles as (
  select
    profiles.id,
    profiles.wallet_address
  from public.profiles profiles
  join public.profile_story_documents story
    on story.user_id = profiles.id
  where story.story_document -> 'seedProfileMetadata' ->> 'seed_batch' = 'v3.5-beta-seed-profiles-001'
),
media_state as (
  select
    seed.id,
    seed.wallet_address,
    profiles.avatar_url,
    profiles.banner_url,
    jsonb_build_object(
      'media_source', 'pending_pinata_ipfs',
      'media_status', 'awaiting_campaign_media_files',
      'avatar_url', profiles.avatar_url,
      'banner_url', profiles.banner_url
    ) as metadata_patch
  from seed_profiles seed
  join public.profiles profiles
    on profiles.id = seed.id
)
update public.profile_story_documents story
set
  story_document = story.story_document || jsonb_build_object(
    'seedProfileMetadata',
    coalesce(story.story_document -> 'seedProfileMetadata', '{}'::jsonb) || media_state.metadata_patch
  ),
  updated_at = now()
from media_state
where story.user_id = media_state.id
  and story.story_document -> 'seedProfileMetadata' ->> 'seed_batch' = 'v3.5-beta-seed-profiles-001';

with seed_profiles as (
  select
    profiles.id,
    profiles.wallet_address,
    profiles.avatar_url,
    profiles.banner_url,
    jsonb_build_object(
      'media_source', 'pending_pinata_ipfs',
      'media_status', 'awaiting_campaign_media_files',
      'avatar_url', profiles.avatar_url,
      'banner_url', profiles.banner_url
    ) as metadata_patch
  from public.profiles profiles
  join public.profile_story_documents story
    on story.user_id = profiles.id
  where story.story_document -> 'seedProfileMetadata' ->> 'seed_batch' = 'v3.5-beta-seed-profiles-001'
)
update public.user_preferences prefs
set
  ui_preferences = jsonb_set(
    jsonb_set(
      coalesce(prefs.ui_preferences, '{}'::jsonb),
      '{seed_profile_metadata}',
      coalesce(prefs.ui_preferences -> 'seed_profile_metadata', '{}'::jsonb) || seed_profiles.metadata_patch,
      true
    ),
    '{story_document,seedProfileMetadata}',
    coalesce(prefs.ui_preferences #> '{story_document,seedProfileMetadata}', '{}'::jsonb) || seed_profiles.metadata_patch,
    true
  ),
  updated_at = now()
from seed_profiles
where prefs.user_id = seed_profiles.id;

select public.refresh_marketplace_profile_browse_index_v1();
