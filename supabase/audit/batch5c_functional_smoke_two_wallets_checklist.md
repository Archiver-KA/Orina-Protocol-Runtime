# ATP2 Batch 5C Functional Smoke (2 Wallets) - `vcixsdudkizgfikhmfuv`

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Scope
- ATP2 app runtime against Supabase project `vcixsdudkizgfikhmfuv`
- No messaging
- Validate adapter behavior for:
  - profile/preferences/badges/follows
  - favorites/watchlist/alerts/notifications
  - community posts/comments/reactions

## Pre-check (important)
- `npm run build` passed locally
- ATP2 points to `vcixsdudkizgfikhmfuv` (Batch 5A complete)
- Batch 4B passed (`000008` + `000009`)
- Batch 4C applied (`000010`) to temporarily unblock client writes on `profiles` + `community_*` for smoke
- Known limitation remains:
  - Batch 4C policies are temporary/permissive and must be replaced in a hardening batch

## Wallet Setup
- Wallet A = primary test wallet
- Wallet B = secondary test wallet

## Smoke Steps (UI)
1. Wallet A: connect and open Profile page
- Edit display name / bio / social links
- Save
- Expected:
  - UI updates immediately
  - no crash
  - after refresh, data persists at least locally

2. Wallet B: connect and open Wallet A profile
- Click Follow
- Expected:
  - follow state toggles in UI
  - follower/following counts/state update locally

3. Wallet A: Favorites
- Favorite 2 assets
- Open Favorites page
- Expected:
  - list shows 2 assets
  - remove one favorite works

4. Wallet A: Watchlist
- Add 1 asset to watchlist
- Set/modify alert
- Toggle alert active/pause
- Expected:
  - watchlist row + alert state update in UI

5. Wallet A: Community
- Create post
- Edit post
- Like/bookmark own post (or skip if self-notify logic blocks)
- Expected:
  - post visible in feed
  - counts update in UI

6. Wallet B: Community
- Open feed
- Like Wallet A post
- Add comment to Wallet A post
- Expected:
  - Wallet A sees notification in app (community notification)
  - comment visible under post

## Early-fail Signals
- Save profile/create post/comment silently no-op after refresh
- 401/403 errors in browser console on `/rest/v1/*`
- FK errors on favorites/watchlist/notifications due missing remote profile row
- RLS policy errors on `profiles` / `community_*` writes

## Post-Smoke Quick SQL Checks (SQL Editor, optional)
Run small probes (replace placeholders):

```sql
-- profiles by wallet
select id, wallet_address, display_name, username, updated_at
from public.profiles
where wallet_address in ('<wallet_a_lower>', '<wallet_b_lower>');

-- follows
select *
from public.user_follows
where follower_user_id in (
  select id from public.profiles where wallet_address in ('<wallet_a_lower>', '<wallet_b_lower>')
)
   or following_user_id in (
  select id from public.profiles where wallet_address in ('<wallet_a_lower>', '<wallet_b_lower>')
);

-- favorites/watchlist/alerts/notifications
select 'user_favorites' as table_name, count(*) from public.user_favorites
union all
select 'user_watchlist', count(*) from public.user_watchlist
union all
select 'watchlist_alerts', count(*) from public.watchlist_alerts
union all
select 'notifications', count(*) from public.notifications;

-- community (no messaging)
select 'community_posts' as table_name, count(*) from public.community_posts
union all
select 'community_comments', count(*) from public.community_comments
union all
select 'community_reactions', count(*) from public.community_reactions;
```

## Decision Gate After Smoke
- If `profiles/community_*` remote writes fail due RLS:
  - create/apply focused follow-up batch (`Batch 4C`) for temporary client-write policies on test project only
  - then rerun this checklist
- If owner-scoped rows fail due missing profile FK:
  - seed/create remote `profiles` rows first (or unblock profile insert path)
