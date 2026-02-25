-- ATP2 Batch D1 / Shared indexes (optional pack file, included for stable read paths)
-- No RLS, no triggers in this file.

create index if not exists idx_user_badges_user_id
  on public.user_badges (user_id);

create index if not exists idx_asset_media_asset_id_sort_order
  on public.asset_media (asset_id, sort_order);

create index if not exists idx_asset_tag_map_tag_id_asset_id
  on public.asset_tag_map (tag_id, asset_id);

create index if not exists idx_user_follows_following_user_id_created_at_desc
  on public.user_follows (following_user_id, created_at desc);

create index if not exists idx_user_favorites_asset_id_created_at_desc
  on public.user_favorites (asset_id, created_at desc);

create index if not exists idx_user_watchlist_asset_id_created_at_desc
  on public.user_watchlist (asset_id, created_at desc);

create index if not exists idx_watchlist_alerts_user_id_is_active
  on public.watchlist_alerts (user_id, is_active);

create index if not exists idx_watchlist_alerts_asset_id_is_active
  on public.watchlist_alerts (asset_id, is_active);

create index if not exists idx_community_posts_author_created_at_desc
  on public.community_posts (author_user_id, created_at desc);

create index if not exists idx_community_posts_visibility_created_at_desc
  on public.community_posts (visibility, created_at desc);

create index if not exists idx_community_comments_post_id_created_at
  on public.community_comments (post_id, created_at);

create index if not exists idx_community_comments_parent_comment_id
  on public.community_comments (parent_comment_id);

create index if not exists idx_community_reactions_target
  on public.community_reactions (target_type, target_id);

create index if not exists idx_protocol_assets_owner_address
  on public.protocol_assets (owner_address);

create index if not exists idx_protocol_asset_events_protocol_asset_id_block
  on public.protocol_asset_events (protocol_asset_id, block_number desc, log_index desc);

create index if not exists idx_protocol_orders_chain_status_updated_at_desc
  on public.protocol_orders (chain_id, status, updated_at desc);

create index if not exists idx_protocol_order_events_order_id_block
  on public.protocol_order_events (order_id, block_number desc, log_index desc);

create index if not exists idx_asset_protocol_links_chain_contract_token
  on public.asset_protocol_links (chain_id, contract_address, token_id);

