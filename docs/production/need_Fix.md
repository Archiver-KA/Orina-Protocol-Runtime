# ATP2 Phase Board (Post Batch 6)

## Current Status
- Phase A (Schema + Functional Integration, Batch 0 -> Batch 6): FINISH
- Phase B (Hardening / Auth Bridge / Policy Lockdown): FINISH
- Phase C (Onchain Runtime Validation / Monitoring): ACTIVE

## Confirmed Completed (from latest functional smoke)
- Favorite flow hoạt động
- Community avatar cross-wallet hiển thị đúng
- Follow -> notification flow hoạt động
- ATP2 functional smoke 2-wallet PASS trên `vcixsdudkizgfikhmfuv`

## Phase B Priorities (Roadmap-aligned)
1. Thiết kế và triển khai wallet-auth -> Supabase auth claim bridge
2. Thay `Batch 4C` temporary public write policies bằng owner-scoped RLS policies
3. Chạy lại functional smoke 2-wallet dưới hardened RLS
4. Xác nhận không hồi quy consistency của profile/community/favorites/notifications

## Constraints (keep)
- Messaging vẫn deferred (không đưa vào phase này)
- Batch format: phạm vi hẹp, checklist chốt rõ, test sau từng bước

## Phase B Batches (Execution Order)
### H1 — Auth Claim Bridge
- Chốt claim contract: `profile_id` + `wallet_address` (lowercase)
- Chốt bridge path (API/Edge/server) + TTL/refresh/revoke
- Test: invalid/expired wallet session không cấp claim
- Gate: không còn mơ hồ ownership key cho RLS
- Status hiện tại:
  - ✅ Design + implementation code artifacts đã tạo (`/exchange` issues real JWT when enabled + env ready)
  - ✅ Function deploy thành công trên Supabase project (`server` + dedicated `make-server-b0d68fc8`)
  - ✅ Dedicated H1 route reachable (`/health`, `/auth/supabase-claim-bridge/health`)
  - ✅ JWT secret đã set (`ATP2_SUPABASE_JWT_SECRET`) cho project test
  - ✅ `/exchange` issue JWT thật (`200`, trả `accessToken`, `profileId`, `walletAddress`)

### H2 — RLS Hardening (Replace Batch 4C)
- Xóa temp public-write policies `Batch 4C`
- Bật owner-scoped RLS cho `profiles`, `community_*`, `user_*`, `notifications`
- Giữ nguyên public-read subset `Batch 4A`
- Audit snapshot pass (temp policies = empty, owner policies missing = [])
- Status hiện tại:
  - ✅ Migration + audit snapshot artifacts đã tạo
  - ✅ Apply checklist `000011` đã tạo (`supabase/audit/batch_h2_apply_000011_checklist.md`)
  - ✅ `000011` đã apply trên project test `vcixsdudkizgfikhmfuv`
  - ✅ `H2` audit snapshot PASS (helper funcs / RLS enable / policy presence / temp policy removal / no messaging)

### H3 — Functional Smoke (2 Wallet, Hardened)
- Rerun toàn bộ smoke 2-wallet trên `vcixsdudkizgfikhmfuv`
- Bổ sung negative checks cross-wallet denial
- Gate: không hồi quy consistency + không cần temp public writes
- Status hiện tại:
  - ✅ Auto API smoke (claim-bridge + REST minimal, 2-wallet) PASS sau khi set đúng JWT secret
  - ✅ UI/manual smoke 2-wallet PASS (A/B browsers, hardened RLS)
  - ✅ Community post/reply/avatar/follow/notifications flows ổn định theo H3 scope
  - ✅ H3 Full PASS (Phase B gate closed)

## H2 Pass Confirmation (2026-02-25)
- `seq 1` claim helper functions present: PASS
- `seq 2` expected RLS-enabled tables present: PASS
- `seq 3` Batch 4C temp policies removed: PASS
- `seq 4` H2 expected owner-scoped policies present: PASS
- `seq 5` Batch 4A public-read subset still present: PASS
- `seq 6` messaging policies still empty: PASS

## New Artifacts (H1/H2)
- `docs/production/ATP2_H1_WALLET_AUTH_SUPABASE_CLAIM_BRIDGE_2026-02-25.md`
- `src/utils/supabaseAuthClaimBridge.ts`
- `supabase/functions/server/wallet-auth-claim-bridge.tsx`
- `supabase/migrations/000011_d2_rls_hardening_owner_scoped_claim_bridge.sql`
- `supabase/audit/batch_h2_rls_hardening_claim_bridge_snapshot_single_result.sql`
- `supabase/audit/batch_h2_apply_000011_checklist.md`
- `supabase/audit/test_h1_claim_bridge_http.cjs`
- `supabase/audit/batch_h1_make_server_b0d68fc8_probe_2026-02-25_after_importfix.json`
- `supabase/audit/batch_h1_server_probe_2026-02-25_after_importfix.json`
- `supabase/audit/batch_h1_make_server_b0d68fc8_probe_2026-02-25_after_slugfix.json`
- `supabase/audit/batch_h1_make_server_b0d68fc8_probe_2026-02-25_after_jwtsecret.json`
- `supabase/audit/batch_h3_functional_smoke_two_wallets_hardened_rls_checklist.md`
- `supabase/audit/batch_h3_api_smoke_claim_bridge_rest_minimal.cjs`
- `supabase/audit/batch_h3_api_smoke_claim_bridge_rest_minimal_2026-02-25.json`
- `supabase/audit/batch_h3_api_smoke_claim_bridge_rest_minimal_2026-02-25_retry_after_keymd.json`

## GitHub Backup Track
- Mục tiêu: backup snapshot source + docs + migrations của ATP2 phase hiện tại
- Trạng thái hiện tại: backup branch đã được push trước đó (`backup/phaseA-finish_phaseB-active_2026-02-25`)
- Bước sẽ làm:
1. commit local snapshot theo từng batch hardening (H1/H2/H3)
2. push tiếp lên branch backup hoặc PR branch

## Phase Transition (2026-02-25)
- ✅ Phase B hoàn tất theo roadmap H1/H2/H3
- ▶ Chuyển Phase C: kiểm tra trạng thái onchain toàn hệ thống (RPC reachability / contract presence / read-status probes)
