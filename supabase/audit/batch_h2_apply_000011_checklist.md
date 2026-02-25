Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Phase B / Batch H2 — Apply Checklist for `000011_d2_rls_hardening_owner_scoped_claim_bridge.sql`

## Goal
- Replace `Batch 4C` temporary public-write policies with owner-scoped claim-based RLS.
- Preserve `Batch 4A` public-read subset.
- Keep ATP2 functional behavior stable on `vcixsdudkizgfikhmfuv` under hardened RLS.

## Scope
- Apply migration `supabase/migrations/000011_d2_rls_hardening_owner_scoped_claim_bridge.sql`
- Run SQL audit snapshot `supabase/audit/batch_h2_rls_hardening_claim_bridge_snapshot_single_result.sql`
- Run `H3` functional smoke (2 wallets) after apply
- No messaging
- No schema/table/index changes

## Current Blocker (must clear before apply)
- H1 dedicated function route is now reachable on `make-server-b0d68fc8`:
  - `GET /functions/v1/make-server-b0d68fc8/health` -> `200`
  - `GET /functions/v1/make-server-b0d68fc8/auth/supabase-claim-bridge/health` -> `200`
- Current blocker is JWT issuance:
  - `POST /functions/v1/make-server-b0d68fc8/auth/supabase-claim-bridge/exchange` -> `500`
  - error: `Missing SUPABASE_JWT_SECRET (or ATP2_SUPABASE_JWT_SECRET)`
- `server` legacy function route remains non-goal for H1 (can stay deferred).
- Artifacts:
  - `supabase/audit/batch_h1_server_function_probe_2026-02-25.json`
  - `supabase/audit/batch_h1_make_server_b0d68fc8_probe_2026-02-25.json`
  - `supabase/audit/batch_h1_make_server_b0d68fc8_probe_2026-02-25_noverify.json`
  - `supabase/audit/batch_h1_make_server_b0d68fc8_probe_2026-02-25_after_importfix.json`
  - `supabase/audit/batch_h1_make_server_b0d68fc8_probe_2026-02-25_after_slugfix.json`
  - `supabase/audit/batch_h1_server_probe_2026-02-25_after_importfix.json`
- `H2` must NOT be applied while H1 `/exchange` cannot issue a real JWT.

## Preflight Gates (ALL required)
1. H1 function route reachable (choose final path and keep it stable)
- `GET /health` returns `200`
- `GET /auth/supabase-claim-bridge/health` (or chosen route) returns JSON status

2. H1 bridge exchange issues a real JWT
- `POST /exchange` returns `200`
- response contains:
  - `ok = true`
  - `accessToken` (JWT)
  - `profileId`
  - `walletAddress` (lowercase)

3. H1 runtime env ready
- `ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE=true`
- verification mode decided (`dev_trust_client_session` or `wallet_session_row`)
- JWT secret available to function (`SUPABASE_JWT_SECRET` or `ATP2_SUPABASE_JWT_SECRET`)
- service role available to function (`SUPABASE_SERVICE_ROLE_KEY`)

4. ATP2 client bridge is pointed to the same H1 function path
- `VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true`
- `VITE_SUPABASE_AUTH_BRIDGE_FN_NAME=<final_function_name>`
- `VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX=<final_path_prefix>`

5. Rollback path prepared (before apply)
- Preferred: dedicated rollback SQL script for restoring `Batch 4C` temp policies
- Minimum fallback: manual SQL ready from `000010` temp policy definitions

## Step-by-Step Apply Sequence
1. Re-validate H1 (fail fast)
- Run probe script:
  - `node supabase/audit/test_h1_claim_bridge_http.cjs https://vcixsdudkizgfikhmfuv.supabase.co <anon_jwt> <fnName> <routePrefix>`
- Save artifact to `supabase/audit/`
- Gate: final `/health` returns `200` and final `/exchange` returns `200` with JWT payload

2. Enable client bridge in ATP2 (test env only)
- Set `VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true`
- Confirm bridge token is stored/used (devtools or app logs)
- Smoke one profile write before hardening

3. Apply `000011`
- Command:
  - `npx supabase db push --yes`
- Expect migration list to include `000011` local/remote synced

4. Run H2 SQL audit snapshot
- SQL Editor:
  - `supabase/audit/batch_h2_rls_hardening_claim_bridge_snapshot_single_result.sql`

5. Validate H2 audit pass criteria
- `seq 1` `h2_claim_helper_functions_presence.missing = []`
- `seq 2` `h2_expected_rls_enabled_tables.enabled_missing = []`
- `seq 3` `batch4c_temp_policies_should_be_removed = []`
- `seq 4` `h2_expected_policies_presence.missing = []`
- `seq 5` `batch4a_public_read_subset_still_present.missing = []`
- `seq 6` `messaging_policy_presence_should_be_empty = []`

6. Run H3 functional smoke (2 wallets, hardened)
- Re-run checklist:
  - `supabase/audit/batch5c_functional_smoke_two_wallets_checklist.md`
- Add negative checks:
  - cross-wallet profile update denied
  - cross-wallet community post/comment update/delete denied
  - owner-scoped tables (`favorites/watchlist/notifications`) reject non-owner access

## Early-Fail Signals (STOP and rollback / do not proceed)
- H1 `/health` or `/exchange` returns `404`, `500`, or malformed payload
- ATP2 cannot obtain bridge JWT before H2 apply
- `403` on owner writes immediately after H2 due claim mismatch
- Cross-wallet writes still succeed after H2 (RLS bug)
- `batch4c_temp_policies_should_be_removed` is non-empty after apply

## Rollback / Recovery Notes
- If H2 breaks ATP2 on test project:
  - Do not continue to production-like testing
  - Restore temporary `Batch 4C` write policies (manual SQL / rollback script)
  - Re-run `Batch 4C` audit snapshot:
    - `supabase/audit/batch4c_rls_temp_client_writes_snapshot_single_result.sql`
- Keep messaging deferred during rollback and retest

## Finish Criteria (mark H2 DONE)
- H1 bridge issues valid JWTs end-to-end
- `000011` applied successfully
- H2 audit snapshot passes all criteria
- H3 functional smoke (2 wallets) passes under hardened RLS
- No regression in user info consistency flows
