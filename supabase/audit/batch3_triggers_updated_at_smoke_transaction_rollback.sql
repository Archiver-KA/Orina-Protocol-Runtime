-- ATP2 Batch 3 Smoke SQL (D2 triggers: updated_at only)
-- Purpose: fail fast if set_updated_at() triggers are missing/misattached.
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.
-- Safety: wrapped in transaction + rollback (clean test run).
-- Scope: trigger behavior only, no RLS assertions, no messaging.

begin;

do $$
declare
  v_seed1 text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_seed2 text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_wallet1 text := '0x' || substr(v_seed1, 1, 40);
  v_wallet2 text := '0x' || substr(v_seed2, 1, 40);
  v_old_ts timestamptz := '2000-01-01 00:00:00+00'::timestamptz;
  v_profile1_id uuid;
  v_profile2_id uuid;
  v_asset_id uuid;
  v_alert_id uuid;
  v_post_id uuid;
  v_comment_id uuid;
  v_protocol_asset_id uuid;
  v_protocol_order_id uuid;
  v_tmp_ts timestamptz;
begin
  -- Trigger presence (explicit; easier fail message than silent behavior)
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_profiles_set_updated_at'
      and not tgisinternal
  ) then
    raise exception 'Batch3 smoke failed: trg_profiles_set_updated_at missing';
  end if;

  insert into public.profiles (wallet_address, display_name, username, updated_at)
  values (
    v_wallet1,
    'B3 Trigger Smoke 1',
    'b3u_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    v_old_ts
  )
  returning id into v_profile1_id;

  insert into public.profiles (wallet_address, display_name, username)
  values (
    v_wallet2,
    'B3 Trigger Smoke 2',
    'b3v_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
  )
  returning id into v_profile2_id;

  update public.profiles
     set display_name = 'B3 Trigger Smoke 1 Updated'
   where id = v_profile1_id;

  select updated_at into v_tmp_ts from public.profiles where id = v_profile1_id;
  if v_tmp_ts <= v_old_ts then
    raise exception 'Batch3 smoke failed: profiles.updated_at trigger did not update timestamp';
  end if;

  insert into public.user_preferences (
    user_id, notification_settings, ui_preferences, privacy_settings, updated_at
  )
  values (
    v_profile1_id, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, v_old_ts
  );

  update public.user_preferences
     set ui_preferences = '{"theme":"batch3"}'::jsonb
   where user_id = v_profile1_id;

  select updated_at into v_tmp_ts from public.user_preferences where user_id = v_profile1_id;
  if v_tmp_ts <= v_old_ts then
    raise exception 'Batch3 smoke failed: user_preferences.updated_at trigger did not update timestamp';
  end if;

  insert into public.assets_catalog (
    asset_uid, title, slug, category, subcategory, description, seller_user_id, updated_at
  )
  values (
    'b3-asset-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    'B3 Trigger Asset',
    'b3-asset-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    'smoke',
    'batch3',
    'batch3 trigger smoke asset',
    v_profile1_id,
    v_old_ts
  )
  returning id into v_asset_id;

  update public.assets_catalog
     set title = 'B3 Trigger Asset Updated'
   where id = v_asset_id;

  select updated_at into v_tmp_ts from public.assets_catalog where id = v_asset_id;
  if v_tmp_ts <= v_old_ts then
    raise exception 'Batch3 smoke failed: assets_catalog.updated_at trigger did not update timestamp';
  end if;

  insert into public.watchlist_alerts (
    user_id, asset_id, alert_type, threshold_value, updated_at
  )
  values (
    v_profile1_id, v_asset_id, 'price_above', 123.45, v_old_ts
  )
  returning id into v_alert_id;

  update public.watchlist_alerts
     set is_read = true
   where id = v_alert_id;

  select updated_at into v_tmp_ts from public.watchlist_alerts where id = v_alert_id;
  if v_tmp_ts <= v_old_ts then
    raise exception 'Batch3 smoke failed: watchlist_alerts.updated_at trigger did not update timestamp';
  end if;

  insert into public.community_posts (
    author_user_id, content, updated_at
  )
  values (
    v_profile1_id, 'B3 trigger smoke post', v_old_ts
  )
  returning id into v_post_id;

  update public.community_posts
     set content = 'B3 trigger smoke post updated'
   where id = v_post_id;

  select updated_at into v_tmp_ts from public.community_posts where id = v_post_id;
  if v_tmp_ts <= v_old_ts then
    raise exception 'Batch3 smoke failed: community_posts.updated_at trigger did not update timestamp';
  end if;

  insert into public.community_comments (
    post_id, author_user_id, content, updated_at
  )
  values (
    v_post_id, v_profile2_id, 'B3 trigger smoke comment', v_old_ts
  )
  returning id into v_comment_id;

  update public.community_comments
     set content = 'B3 trigger smoke comment updated'
   where id = v_comment_id;

  select updated_at into v_tmp_ts from public.community_comments where id = v_comment_id;
  if v_tmp_ts <= v_old_ts then
    raise exception 'Batch3 smoke failed: community_comments.updated_at trigger did not update timestamp';
  end if;

  insert into public.protocol_assets (
    chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, updated_at
  )
  values (
    11155111, '0x' || substr(v_seed1, 1, 40), '777', v_wallet1, 'listed', 1, 1, v_old_ts
  )
  returning id into v_protocol_asset_id;

  update public.protocol_assets
     set status = 'settled'
   where id = v_protocol_asset_id;

  select updated_at into v_tmp_ts from public.protocol_assets where id = v_protocol_asset_id;
  if v_tmp_ts <= v_old_ts then
    raise exception 'Batch3 smoke failed: protocol_assets.updated_at trigger did not update timestamp';
  end if;

  insert into public.protocol_orders (
    order_uid, chain_id, marketplace_contract, asset_contract, asset_token_id,
    buyer_address, seller_address, status, amount, price_per_unit, total_value, currency_symbol, updated_at
  )
  values (
    'b3-order-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    11155111,
    '0x' || substr(v_seed2, 1, 40),
    '0x' || substr(v_seed1, 1, 40),
    '777',
    v_wallet2,
    v_wallet1,
    'open',
    1,
    1,
    1,
    'ETH',
    v_old_ts
  )
  returning id into v_protocol_order_id;

  update public.protocol_orders
     set status = 'filled'
   where id = v_protocol_order_id;

  select updated_at into v_tmp_ts from public.protocol_orders where id = v_protocol_order_id;
  if v_tmp_ts <= v_old_ts then
    raise exception 'Batch3 smoke failed: protocol_orders.updated_at trigger did not update timestamp';
  end if;

  raise notice 'ATP2 Batch 3 trigger smoke PASS (transaction will rollback).';
end
$$;

select
  'ATP2 Batch 3 trigger smoke pre-rollback checks complete' as status,
  now() as checked_at;

rollback;

select
  'ATP2 Batch 3 trigger smoke rollback complete' as status,
  now() as checked_at;
