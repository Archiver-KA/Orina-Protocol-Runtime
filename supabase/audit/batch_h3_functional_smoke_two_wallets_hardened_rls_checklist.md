# ATP2 Phase B / Batch H3 Functional Smoke (2 Wallets, Hardened RLS)

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Goal
- Verify ATP2 still works end-to-end on `vcixsdudkizgfikhmfuv` after `H2` owner-scoped RLS hardening.
- Confirm `Batch 4C` temporary public-write policies are no longer needed.
- Catch cross-wallet authorization regressions early.

## Scope
- ATP2 runtime against Supabase project `vcixsdudkizgfikhmfuv`
- H1 bridge token path enabled (`make-server-b0d68fc8`)
- H2 hardened RLS already applied (`000011`)
- No messaging

## Preconditions (must be true)
1. H1 bridge health/exchange pass
- `/functions/v1/make-server-b0d68fc8/health` -> `200`
- `/functions/v1/make-server-b0d68fc8/auth/supabase-claim-bridge/health` -> `200`
- `/exchange` returns JWT (`accessToken`)

2. H2 audit snapshot pass
- `supabase/audit/batch_h2_rls_hardening_claim_bridge_snapshot_single_result.sql`
- Key expectations all pass (`missing = []`, temp policies removed)

3. ATP2 env (H3 test mode)
- `VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true`
- `VITE_SUPABASE_AUTH_BRIDGE_FN_NAME=make-server-b0d68fc8`
- `VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX=/auth/supabase-claim-bridge`
- `VITE_SUPABASE_URL=https://vcixsdudkizgfikhmfuv.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<current legacy anon jwt>` (or publishable path if caller supports it)

4. App starts cleanly
- `npm run build` passes
- Dev/runtime boot has no immediate bridge init crash

## Wallet Setup
- Wallet A = primary owner
- Wallet B = secondary user (used for cross-wallet visibility + negative checks)
- Use lowercase addresses when manually checking SQL/API output

## H3 Step-by-Step (UI / behavior)

### 1. Wallet A — Profile + Preferences (owner paths)
- Connect Wallet A
- Open Profile page
- Edit display name, bio, avatar, (optional) social links
- Save
- Refresh page

Expected:
- Save succeeds (no 401/403)
- Data persists after refresh
- Avatar/name sync remains consistent across profile/community surfaces

### 2. Wallet A — Favorites / Watchlist / Alerts / Notifications (owner-scoped tables)
- Favorite 1-2 assets
- Add 1 watchlist item
- Create/update one alert
- Trigger a notification path if available (or leave for follow/community step)

Expected:
- No RLS errors in console/network
- Data persists after refresh
- No silent local-only rollback behavior

### 3. Wallet A — Community (owner write + public read)
- Create a post
- Edit the post
- Add a comment (optional)
- React to own post (optional)

Expected:
- Writes succeed under hardened RLS
- Feed renders persisted data after refresh
- Avatar/name metadata remains consistent

### 4. Wallet B — Public Read + Community Interaction
- Switch to Wallet B
- Open feed and view Wallet A content
- Like Wallet A post
- Comment on Wallet A post
- Open Wallet A profile page from post/comment

Expected:
- Wallet B can read Wallet A public profile/community data
- Wallet B can interact with public post/comment as own actor
- Wallet A identity (name/avatar/username) displays consistently

### 5. Wallet B -> A follow (owner write on `user_follows`, notification to A)
- From Wallet A profile page (while connected as B), click Follow
- Switch back to Wallet A
- Check notification UI path

Expected:
- Follow succeeds (B can write row where `follower_user_id = B`)
- Notification appears for A (owner-scoped notifications path still works)

## Negative Checks (required after H2)

### A. Cross-wallet profile write denial
- While connected as Wallet B, attempt to edit/save Wallet A profile (if UI exposes it)
- Or use devtools-triggered request if UI blocks editing directly

Expected:
- Denied (`401/403`) or prevented by UI
- No mutation persisted to Wallet A profile row

### B. Cross-wallet community ownership denial
- Wallet B attempts to edit/delete Wallet A post/comment

Expected:
- Denied (`401/403`) or hidden action
- Wallet A content remains unchanged

### C. Owner-scoped private data isolation
- Wallet B should not see Wallet A notifications/favorites/watchlist/alerts

Expected:
- Empty or B-owned data only
- No leakage of Wallet A rows

## Early-Fail Signals (stop and report first error)
- `401/403` on valid owner action (A writing own rows, B writing own rows)
- Cross-wallet edit/delete unexpectedly succeeds
- Profile/community writes silently no-op after refresh
- Notifications/favorites/watchlist leak across wallets
- Bridge token exchange fails/loops (`/exchange` errors, repeated cooldown failures)

## Evidence to capture (minimal)
- First failing network request (URL + status + response JSON)
- Browser console error (first one only)
- Which wallet and action failed
- Optional screenshot for UI inconsistency

## Optional SQL Verification (after H3)
Use SQL Editor to confirm row ownership and no leakage (replace wallets with lowercase addresses):

```sql
with pa as (
  select id, wallet_address from public.profiles
  where wallet_address in ('<wallet_a_lower>', '<wallet_b_lower>')
)
select 'profiles' as t, p.wallet_address, p.id, p.display_name, p.username
from public.profiles p
join pa on pa.id = p.id;

select 'user_follows' as t, f.*
from public.user_follows f
where f.follower_user_id in (select id from pa)
   or f.following_user_id in (select id from pa);

select 'notifications' as t, n.user_id, n.type, n.title, n.created_at
from public.notifications n
where n.user_id in (select id from pa)
order by n.created_at desc
limit 50;

select 'community_posts' as t, p.author_user_id, p.id, p.content, p.updated_at
from public.community_posts p
where p.author_user_id in (select id from pa)
order by p.created_at desc
limit 50;
```

## Pass Criteria (H3 DONE)
- Owner actions succeed for both wallets on their own rows
- Public read remains intact for profile/community
- Cross-wallet write attempts fail (or are prevented) under hardened RLS
- No regression in user info consistency (avatar/name/username)
- No messaging scope creep

