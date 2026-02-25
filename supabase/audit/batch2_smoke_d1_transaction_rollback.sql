-- ATP2 Batch 2 Smoke SQL (D1 schema)
-- Purpose: fail fast on schema/constraint regressions after Batch 1 deploy.
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.
-- Safety: wrapped in a transaction and rolled back at the end (clean test run).
-- Scope: S1/S2/S3 social-community/S4 only (no messaging).

begin;

do $$
declare
  v_seed1 text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_seed2 text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_wallet1 text := '0x' || substr(v_seed1, 1, 40);
  v_wallet2 text := '0x' || substr(v_seed2, 1, 40);
  v_profile_id uuid;
  v_profile_id_upsert uuid;
  v_profile2_id uuid;
  v_asset_id uuid;
  v_tag_id uuid;
  v_post_id uuid;
  v_comment_id uuid;
  v_protocol_asset_id uuid;
  v_protocol_order_id uuid;
  v_challenge_id uuid;
  v_session_id uuid;
  v_nonce text := 'b2-smoke-nonce-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);
  v_token_hash text := 'b2-smoke-token-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 24);
  v_username_primary text := 'b2u_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  v_username_secondary text := 'b2v_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  v_duplicate_failed boolean := false;
  v_check_failed boolean := false;
begin
  -- D1 expectation: messaging is deferred (must not exist yet)
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('conversations', 'conversation_participants', 'messages')
  ) then
    raise exception 'Batch2 smoke failed: messaging tables exist but D1 expects deferred messaging';
  end if;

  -- D1 expectation: citext exists for profiles.username
  if not exists (select 1 from pg_extension where extname = 'citext') then
    raise exception 'Batch2 smoke failed: citext extension missing';
  end if;

  -- S2 / profiles + upsert path
  insert into public.profiles (wallet_address, display_name, username, bio)
  values (v_wallet1, 'B2SMOKE User One', v_username_primary, 'batch2 smoke profile')
  returning id into v_profile_id;

  insert into public.profiles (wallet_address, display_name)
  values (v_wallet1, 'B2SMOKE User One Updated')
  on conflict (wallet_address) do update
    set display_name = excluded.display_name,
        updated_at = now()
  returning id into v_profile_id_upsert;

  if v_profile_id_upsert is distinct from v_profile_id then
    raise exception 'Batch2 smoke failed: profile upsert returned a different id';
  end if;

  -- Lowercase wallet check should reject uppercase wallet
  begin
    insert into public.profiles (wallet_address, display_name)
    values ('0xABCDEF123', 'B2SMOKE Invalid Wallet');
  exception when check_violation then
    v_check_failed := true;
  end;

  if not v_check_failed then
    raise exception 'Batch2 smoke failed: profiles lowercase wallet check did not fire';
  end if;

  -- citext uniqueness check (case-insensitive)
  insert into public.profiles (wallet_address, display_name, username)
  values (v_wallet2, 'B2SMOKE User Two', v_username_secondary)
  returning id into v_profile2_id;

  v_duplicate_failed := false;
  begin
    insert into public.profiles (wallet_address, display_name, username)
    values (
      '0x' || substr(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 1, 40),
      'B2SMOKE User Three',
      upper(v_username_primary)
    );
  exception when unique_violation then
    v_duplicate_failed := true;
  end;
  if not v_duplicate_failed then
    raise exception 'Batch2 smoke failed: citext unique(username) did not enforce case-insensitive conflict';
  end if;

  insert into public.user_preferences (user_id)
  values (v_profile_id);

  insert into public.user_badges (user_id, badge_key)
  values (v_profile_id, 'b2-smoke-badge');

  -- S2 / asset metadata core
  insert into public.assets_catalog (
    asset_uid,
    title,
    slug,
    category,
    subcategory,
    description,
    seller_user_id
  ) values (
    'b2-smoke-asset-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    'B2 Smoke Asset',
    'b2-smoke-asset-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    'smoke',
    'batch2',
    'batch2 smoke asset row',
    v_profile_id
  )
  returning id into v_asset_id;

  insert into public.asset_media (asset_id, media_type, url, sort_order)
  values (v_asset_id, 'image', 'https://example.com/b2-smoke.png', 0);

  insert into public.asset_tags (tag)
  values ('b2-smoke-tag-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  returning id into v_tag_id;

  insert into public.asset_tag_map (asset_id, tag_id)
  values (v_asset_id, v_tag_id);

  -- S3 / social-community (no messaging)
  insert into public.user_follows (follower_user_id, following_user_id)
  values (v_profile_id, v_profile2_id);

  insert into public.user_favorites (user_id, asset_id)
  values (v_profile_id, v_asset_id);

  insert into public.user_watchlist (user_id, asset_id, notes)
  values (v_profile_id, v_asset_id, 'batch2 smoke watch');

  insert into public.watchlist_alerts (user_id, asset_id, alert_type, threshold_value)
  values (v_profile_id, v_asset_id, 'price_below', 100.5);

  insert into public.notifications (user_id, type, title, body)
  values (v_profile_id, 'system', 'B2 Smoke', 'batch2 smoke notification');

  insert into public.community_posts (author_user_id, content)
  values (v_profile_id, 'B2 smoke community post')
  returning id into v_post_id;

  insert into public.community_comments (post_id, author_user_id, content)
  values (v_post_id, v_profile2_id, 'B2 smoke community comment')
  returning id into v_comment_id;

  insert into public.community_reactions (user_id, target_type, target_id, reaction_type)
  values (v_profile_id, 'post', v_post_id, 'like');

  -- S1 / auth-session backend
  insert into public.wallet_auth_challenges (wallet_address, nonce, message, expires_at)
  values (v_wallet1, v_nonce, 'Sign this B2 smoke message', now() + interval '5 minutes')
  returning id into v_challenge_id;

  v_duplicate_failed := false;
  begin
    insert into public.wallet_auth_challenges (wallet_address, nonce, message, expires_at)
    values (v_wallet1, v_nonce, 'Duplicate nonce should fail', now() + interval '5 minutes');
  exception when unique_violation then
    v_duplicate_failed := true;
  end;
  if not v_duplicate_failed then
    raise exception 'Batch2 smoke failed: wallet_auth_challenges nonce unique did not fire';
  end if;

  update public.wallet_auth_challenges
     set used_at = now()
   where id = v_challenge_id;

  insert into public.wallet_sessions (wallet_address, session_token_hash, expires_at)
  values (v_wallet1, v_token_hash, now() + interval '1 day')
  returning id into v_session_id;

  v_duplicate_failed := false;
  begin
    insert into public.wallet_sessions (wallet_address, session_token_hash, expires_at)
    values (v_wallet1, v_token_hash, now() + interval '1 day');
  exception when unique_violation then
    v_duplicate_failed := true;
  end;
  if not v_duplicate_failed then
    raise exception 'Batch2 smoke failed: wallet_sessions session_token_hash unique did not fire';
  end if;

  -- S4 / protocol scaffold
  insert into public.protocol_assets (
    chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount
  ) values (
    11155111, '0x' || substr(v_seed1, 1, 40), '1', v_wallet1, 'listed', 1, 1
  )
  returning id into v_protocol_asset_id;

  insert into public.protocol_asset_events (
    protocol_asset_id, event_name, chain_id, tx_hash, log_index, block_number
  ) values (
    v_protocol_asset_id, 'AssetIndexed', 11155111,
    '0x' || substr(v_seed1 || v_seed2, 1, 64), 0, 123456
  );

  v_duplicate_failed := false;
  begin
    insert into public.protocol_asset_events (
      protocol_asset_id, event_name, chain_id, tx_hash, log_index, block_number
    ) values (
      v_protocol_asset_id, 'AssetIndexedDuplicate', 11155111,
      '0x' || substr(v_seed1 || v_seed2, 1, 64), 0, 123457
    );
  exception when unique_violation then
    v_duplicate_failed := true;
  end;
  if not v_duplicate_failed then
    raise exception 'Batch2 smoke failed: protocol_asset_events chain/tx/log unique did not fire';
  end if;

  insert into public.protocol_orders (
    order_uid, chain_id, marketplace_contract, asset_contract, asset_token_id,
    buyer_address, seller_address, status, amount, price_per_unit, total_value, currency_symbol
  ) values (
    'b2-smoke-order-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    11155111,
    '0x' || substr(v_seed2, 1, 40),
    '0x' || substr(v_seed1, 1, 40),
    '1',
    v_wallet2,
    v_wallet1,
    'open',
    1,
    10,
    10,
    'ETH'
  )
  returning id into v_protocol_order_id;

  insert into public.protocol_order_events (
    order_id, event_name, chain_id, tx_hash, log_index, block_number
  ) values (
    v_protocol_order_id, 'OrderCreated', 11155111,
    '0x' || substr(v_seed2 || v_seed1, 1, 64), 1, 123500
  );

  insert into public.asset_protocol_links (
    asset_id, chain_id, contract_address, token_id, link_type
  ) values (
    v_asset_id, 11155111, '0x' || substr(v_seed1, 1, 40), '1', 'primary'
  );

  -- Basic existence assertions
  if not exists (select 1 from public.user_preferences where user_id = v_profile_id) then
    raise exception 'Batch2 smoke failed: user_preferences row missing';
  end if;
  if not exists (select 1 from public.user_favorites where user_id = v_profile_id and asset_id = v_asset_id) then
    raise exception 'Batch2 smoke failed: user_favorites row missing';
  end if;
  if not exists (select 1 from public.community_reactions where user_id = v_profile_id and target_type = 'post' and target_id = v_post_id) then
    raise exception 'Batch2 smoke failed: community_reactions row missing';
  end if;
  if not exists (select 1 from public.asset_protocol_links where asset_id = v_asset_id) then
    raise exception 'Batch2 smoke failed: asset_protocol_links row missing';
  end if;

  raise notice 'ATP2 Batch 2 smoke PASS (transaction will rollback).';
end
$$;

-- Transaction-local summary (for quick visual confirmation before rollback)
select
  (select count(*) from public.profiles) as profiles_total,
  (select count(*) from public.assets_catalog) as assets_catalog_total,
  (select count(*) from public.user_follows) as user_follows_total,
  (select count(*) from public.community_reactions) as community_reactions_total,
  (select count(*) from public.protocol_orders) as protocol_orders_total;

rollback;

-- Post-rollback marker only (data inserted above should not persist)
select
  'ATP2 Batch 2 smoke rollback complete' as status,
  now() as checked_at;
