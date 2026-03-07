# ATP2 Phase Board (Post Batch 6)

## Current Status
- Phase A (Schema + Functional Integration, Batch 0 -> Batch 6): FINISH
- Phase B (Hardening / Auth Bridge / Policy Lockdown): FINISH
- Phase C (Offchain Realtime Completion): ACTIVE (residual gates pending: `CP-C4`, `C7`)
- Phase D (Protocol Onchain Integration): ACTIVE (spec + D0 baseline inventory lock)

## Confirmed Completed (from latest functional smoke)
- Favorite flow hoạt động
- Community avatar cross-wallet hiển thị đúng
- Follow -> notification flow hoạt động
- ATP2 functional smoke 2-wallet PASS trên `vcixsdudkizgfikhmfuv`
- H1/H2/H3 hardening path PASS (claim bridge + owner-scoped RLS + 2-browser smoke)

## Phase C Priority (Offchain Realtime Completion)
1. Asset metadata subsystem (persist + sync + realtime behavior)
2. Chat realtime (schema + RLS + client + unread/read basics)
3. Notification event matrix optimization (community/social/chat)
4. Full offchain realtime 2-browser / 2-wallet smoke

## Phase C Source-of-Truth Spec
- `docs/production/ATP2_OFFCHAIN_REALTIME_COMPLETION_SPEC_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C0_BASELINE_INVENTORY_LOCK_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C1_REALTIME_CORE_CONTRACT_RULES_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C2_TEST_WALLET_ASSET_FIXTURE_PLAN_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C2_ASSET_METADATA_PERSIST_CHECKPOINT_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C3_ASSET_METADATA_SYNC_STRATEGY_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C3_1_ASSET_METADATA_INVALIDATION_HOOKS_CHECKPOINT_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C3_2_METADATA_INVALIDATION_SMOKE_CHECKLIST_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C4_NOTIFICATIONS_EVENT_MATRIX_SPEC_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C4_NOTIFICATIONS_EVENT_MATRIX_SMOKE_CHECKLIST_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C4_1_NOTIFICATIONS_EVENT_MATRIX_NORMALIZATION_CHECKPOINT_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C4_2_NOTIFICATIONS_EVENT_MATRIX_AUTO_PROBE_CHECKPOINT_2026-02-25.md`
- Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Phase D Priority (Protocol Onchain Integration)
1. Transaction logic spec (code-derived, no UI assumptions)
2. Transaction call matrix (UI action -> signer -> contract call -> state/effects)
3. EIP712 signing contract spec + chain/address preflight gates
4. Testnet transaction smoke (2-wallet) before onchain cutover

## Phase D Source-of-Truth Spec
- `docs/production/ATP2_PHASED_ONCHAIN_TRANSACTION_LOGIC_SPEC_2026-02-26.md`
- `docs/production/ATP2_PHASED_D0_ONCHAIN_BASELINE_INVENTORY_LOCK_CHECKPOINT_2026-02-26.md`
- Sources:
  - `docs/production/AuditORINA.md`
  - `C:\Users\proje\Documents\GitHub\orina-atp\packages\contracts\foundry\src`
- Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Phase D Batches (Execution Order)
### D0 - Onchain Baseline Inventory Lock
- Status:
  - ✅ PASS (doc-only)
  - ✅ Contract inventory + entry function baseline locked from `foundry/src`
  - ✅ AuditORINA guardrails imported into Phase D spec

### D1 - Transaction Call Matrix Spec
- Status:
  - ✅ PASS (doc-only)
  - ✅ UI action -> signer -> contract call -> preconditions/effects matrix locked
  - ✅ RWA/NFT buy-flow split + wallet popup timing rule documented
  - Scope: `createOrder`, `sellerConfirm`, `payOrder`, `cancelByBuyer`, `confirmDelivery`, `openDispute`, read status helpers

### D2 - EIP712 Signing Contract Spec
- Status:
  - ✅ PASS (spec-only lock)
  - ✅ `buyerSig1`, `sellerSig`, `buyerSig2`, domain/payload/replay boundaries/state machine documented
  - ✅ RWA (`estDeliverySeconds > 0`) vs NFT direct-buy (`amount=1`, `estDeliverySeconds=0`) signing contract split documented

### D3 - Chain/Address Config + Preflight Gate
- Status:
  - ▶ NEXT
  - Scope: deployed addresses, `eth_getCode` verification, chain gating

### D4 - Write Adapter Scaffold + Simulation
- Status:
  - ⏭️ PLANNED

### D5 - Testnet Transaction Smoke (2 Wallet)
- Status:
  - ⏭️ PLANNED

### D6 - Time/Dispute Execution Runbooks
- Status:
  - ⏭️ PLANNED

### D7 - Onchain Integration Closure Gate
- Status:
  - ⏭️ PLANNED

## Phase C Batches (Execution Order)
### C0 - Baseline Inventory Lock
- Status:
  - ✅ PASS (inventory baseline + scope lock documented)
  - ✅ Runtime sync events / helper routes inventoried
  - ✅ Gap list locked (`Asset metadata`, `Chat realtime`)

### C1 - Realtime Core Contract (Merge / Dedupe / Read-State)
- Status:
  - ✅ LOCKED (spec/checkpoint documented)
  - ✅ Merge precedence / dedupe / read-state semantics chot ro
  - ✅ C2/C3/C5/C6 implementation gates defined

### C2 - Asset Metadata Persist + Sync Foundation
- Status:
  - ✅ PASS (CP-C2 reached)
  - ✅ Test-wallet deterministic mock asset plan locked (A/B wallets + canonical 3-card matrix)
  - ✅ `C2.1` wallet-aware My Assets fixture provider (A/B deterministic canonical cards)
  - ✅ `C2.2` deterministic `generateMockAsset()` resolver with namespace split (`asset-*` vs `twf-*`)
  - ✅ `C2.3` metadata seed bridge foundation (client adapter + H1 backend route `asset-metadata-seed`)
  - ✅ Function `make-server-b0d68fc8` redeployed after C2.3 route add
  - ✅ C2 persisted metadata smoke probe PASS (`supabase/audit/batch_c2_asset_metadata_seed_smoke_probe.cjs`)
  - ✅ Locked behavior: `asset-*` public-active, `twf-*` persisted but hidden from public catalog (`is_active=false`)

### C3 - Asset Metadata Realtime Behavior
- Status:
  - ✅ PASS (`CP-C3` baseline gate closed)
  - ✅ Strategy locked (pull + invalidate baseline, no hard realtime dependency in same batch)
  - ✅ `C3.1` invalidation event + targeted rehydrate hooks implemented
  - ✅ `C3.1` build regression PASS
  - ✅ `C3.2` smoke PASS (2-browser / 2-wallet)

### C4 - Notifications Event Matrix Optimization
- Status:
  - ▶ ACTIVE
  - ✅ C4 event matrix spec drafted
  - ✅ C4 smoke checklist drafted (2-browser / 2-wallet)
  - ✅ `C4.1` implemented: notification event/payload/source_id normalization + backend dedupe pass
  - ✅ `C4.1` build regression PASS
  - ✅ `C4.1` H3 minimal API smoke regression PASS (after function redeploy)
  - ✅ `C4.2` auto probe PASS (H1 route + REST owner-scoped notifications semantics)
  - ▶ `C4.2` manual notification event matrix smoke pending (2-browser / 2-wallet) -> `CP-C4` gate
  - ℹ️ `C5` started in parallel (schema/RLS batch) to keep momentum while manual `CP-C4` gate is pending

### C5 - Messaging Schema + RLS (deferred messaging batch)
- Status:
  - ✅ PASS (`CP-C5` closed)
  - ✅ `000012` messaging schema migration applied (`conversations`, `conversation_participants`, `messages`)
  - ✅ `000013` messaging claim-bridge RLS migration applied (participant/sender scoped + service_role paths)
  - ✅ C5 audit snapshot SQL prepared (`single-result`)
  - ✅ C5 smoke SQL prepared (`transaction + rollback`)
  - ✅ SQL Editor audit snapshot PASS (all `missing = []`, RLS enabled + policies present)
  - ✅ SQL Editor smoke PASS (`rollback complete` marker)

### C6 - Chat Realtime Client
- Status:
  - ✅ PASS / FINISH (`CP-C6` closed)
  - ✅ `C6.1` backend compatibility layer implemented (`orina-chat-v1` now backed by C5 tables)
  - ✅ `C6.1` quick-message modal unified to backend chat API path (no local-only write path)
  - ✅ `C6.1` build PASS
  - ✅ `C6.1` function deploy PASS (`orina-chat-v1`)
  - ✅ `C6.1` minimal API probe PASS (`create/send/get/read/list`)
  - ✅ `C6.2` manual UI smoke PASS (2-browser / 2-wallet, user-confirmed)
  - ✅ `C6.2` targeted UI fixes stabilized:
    - UUID conversation create path (no synthetic `conv_<a>_<b>`)
    - stale thread pane cache after reset/deletion
    - overlapping poll request starvation (delayed receive symptom)
    - chat avatar mapping consistency (sidebar/header/thread/right panel)
    - mock chat tabs cleanup (keep only `AI Agent Test`)
  - ✅ `C6.3.1` chat invalidation events implemented (`orina:chat-*`) + message bubble UI normalization
  - ✅ `C6.3.1` build PASS (re-run after event patch + bubble media/text/timestamp sizing fixes)
  - ✅ `C6.3.2.1` visibility-aware polling + foreground refresh implemented (`Messages` UI) + build PASS
  - ✅ `C6.3.2.2` polling error backoff + scheduler refinement implemented + build PASS
  - ✅ `C6.3.2.3` presence execution path refinement + realtime adapter boundary (no-op default) + build PASS
  - ✅ `C6.3.2` CLOSED (engineering execution bundle checkpointed; smoke folded into `C6.3.3` gate)
  - ▶ `C6.3.3` realtime adapter execution (polling fallback-safe) active
  - ✅ `C6.3.3.1` realtime adapter implemented in `chatRealtimeAdapter.ts` (Supabase Realtime via WebSocket native -> invalidation callback, polling fallback preserved) + build PASS
  - ✅ `C6.3.3.2` checkpoint artifact locked + manual A/B smoke PASS (user-confirmed)
  - ✅ `C6.3.3.3` close gate PASS (`C6.3.3` CLOSED)
  - ✅ `CP-C6` closure package completed (chat realtime client track finished)

### C7 - Full Offchain Realtime Smoke
- Status:
  - ⏳ Blocked by `C4.2` manual notifications matrix close (`CP-C4`)

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
- ✅ Da co preflight onchain runtime probe (RPC reachability / contract-config presence)
- ▶ Chuyển Phase C: hoan thien offchain realtime (asset metadata + chat realtime + event consistency)
- ⏭️ Phase D (cuoi): protocol giao dich onchain integration

## C0/C1 Execution Log (2026-02-25)
- ✅ C0 baseline inventory + lock scope completed (doc-only)
- ✅ C1 realtime core contract rules locked (doc-only)
- ✅ C2 prep fixture plan locked for test wallets A/B (doc-only)
- ✅ `C2.1/C2.2` implemented + build regression PASS
- ✅ `C2.3` implemented (asset metadata seed bridge foundation) + build regression PASS + function redeploy PASS
- ✅ `CP-C2` PASS (persisted metadata smoke probe + route probe + seed ack)
- ✅ `C3` strategy locked (doc-only)
- ✅ `C3.1` implemented (asset metadata invalidation event + targeted rehydrate listeners) + build PASS
- ✅ `C2` persisted metadata probe rerun after `C3.1` patch -> PASS (no regression)
- ✅ `C3.2` smoke checklist prepared (manual 2-browser gate)
- ✅ `C3.2` manual smoke PASS -> `CP-C3` baseline gate closed
- ✅ `C4` event matrix spec + smoke checklist drafted
- ✅ `C4.1` implemented (notification event/payload/source_id normalization + backend `/community-notify` dedupe/update pass)
- ✅ `C4.1` build PASS
- ✅ H3 minimal API smoke rerun after `C4.1` patch + function redeploy -> PASS (no H1/H2 regression)
- ✅ `C4.2` auto probe PASS (`community-notify` matrix rows + dedupe + payload normalization + mark read/all + delete + cross-read isolation)
- ▶ Next implementation/test batch: `C4.2` manual notification event matrix smoke (2-browser / 2-wallet) -> close `CP-C4`
