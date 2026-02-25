Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Batch 6 — Hardening Cutover (Replace Batch 4C Temporary Policies)

## Goal
- Remove temporary public client-write policies from `Batch 4C`
- Replace with owner-scoped policies for `profiles` + `community_*`
- Keep ATP2 functional behavior stable on project `vcixsdudkizgfikhmfuv`

## Current State (expected before hardening)
- `Batch 4C` temporary write policies are active on:
  - `profiles`
  - `community_posts`
  - `community_comments`
  - `community_reactions`
- Owner-scoped deferred tables remain RLS-disabled:
  - `user_preferences`, `user_follows`, `user_favorites`, `user_watchlist`, `watchlist_alerts`, `notifications`
- Messaging remains deferred (no `conversations/messages` policies)

## Preconditions (must be true)
1. Wallet-auth -> Supabase auth claim contract is implemented (or equivalent trusted session path)
2. ATP2 client can present a Supabase-authenticated user identity (`auth.uid()`) that maps to profile ownership
3. A rollback path exists (SQL to restore temp policies on test project)
4. `Batch 6` readiness snapshot passes:
   - `supabase/audit/batch6_hardening_readiness_snapshot_single_result.sql`

## Scope
- `profiles` + `community_*` RLS policies only
- No messaging
- No schema changes (tables/columns/indexes)
- No changes to protocol read models

## Suggested Sequence
1. Create owner-scoped policy migration (new batch)
- `profiles`: insert/update own only
- `community_posts`: insert/update/delete own only
- `community_comments`: insert/update/delete own only
- `community_reactions`: insert/delete own only
- Keep public read policies from `Batch 4A`

2. Create explicit rollback migration/script (test project)
- Drops owner-scoped policies
- Restores `Batch 4C` temp policies if needed

3. Apply hardening migration on test project only
- `npx supabase db push --yes`

4. Run SQL audit snapshot (new hardening audit)
- Verify temp policies removed
- Verify owner-scoped policies present
- Verify read policies still present
- Verify messaging policies still empty

5. Run ATP2 functional smoke (2 wallets)
- Profile edit/save
- Community create/edit/comment/reaction
- Follow + notification
- Favorites/watchlist/alerts/notifications unaffected

## Early-fail Signals
- Any `403`/RLS error on profile/community writes after login/session is established
- Cross-wallet write succeeds when it should fail
- Public read of profile/community regresses unexpectedly
- Community create works locally but no remote persistence after refresh

## Pass Criteria
- `Batch 4C` temporary policies are removed
- Owner-scoped profile/community write policies active and enforced
- ATP2 functional smoke still passes on `vcixsdudkizgfikhmfuv`
- No messaging scope creep

## Notes
- Do NOT harden `user_preferences`, `user_follows`, `user_favorites`, `user_watchlist`, `watchlist_alerts`, `notifications` in the same batch unless auth claim contract is already proven stable across all client adapters.
