# ATP2 Offchain Realtime Completion Spec (Phase C)

## 1. Muc tieu
- Hoan thien cac phan **offchain realtime** con thieu cua ATP2 theo batch nho, test sau moi batch.
- Chot checkpoint ro rang de co the tiep tuc/ban giao ma khong lech trang thai.
- Giu nguyen dinh huong: **protocol giao dich onchain la giai doan cuoi (Phase D)**.

## 2. Pham vi Phase C (Offchain Realtime)
### 2.1 Da co (baseline)
- User data (profiles/preferences/badges)
- Community data + community interactions co hardening RLS
- Favorites / watchlist / alerts / follow seller
- Notification flow co bridge backend + owner-scoped RLS (H1/H2/H3 pass)

### 2.2 Con thieu (must complete trong Phase C)
- Asset metadata subsystem (catalog/media/tags + sync/hydrate/realtime update behavior)
- Chat realtime (conversations/messages/participants + unread/read receipts + basic notifications)
- Realtime event consistency / dedupe / hydration strategy cho toan bo offchain modules
- Observability + smoke check cho offchain realtime (2-browser / 2-wallet)

### 2.3 Ngoai scope (Phase C)
- Protocol order/settlement onchain integration vao UI production flow
- Contract deployment / governance wiring / onchain write path

## 3. Invariant thuc thi
- `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`
- Khong mo rong scope trong cung batch neu gate chua pass.
- Moi batch phai co:
  - Scope
  - Pre-check
  - Commands / actions
  - Tests (ngay sau batch)
  - Pass criteria
  - Early-fail signals
  - Rollback/Fallback
  - Log cap nhat docs

## 4. Kien truc Offchain Realtime (Source of Truth)
## 4.1 Nguyen tac du lieu
- `Supabase (public schema + RLS)` la source of truth cho offchain persisted state.
- `localStorage` chi la:
  - cache/hydration bootstrap
  - optimistic UI fallback
  - queue tam thoi khi remote write fail
- UI state khong duoc overwrite mat data local chua sync.

## 4.2 Realtime strategy (ATP2)
- Realtime UI = ket hop:
  - `remote hydrate` (pull)
  - `event push` (Supabase Realtime / function fanout)
  - `optimistic local merge`
- Muc tieu Phase C:
  - khong duplicate event
  - khong resurrect item da read/delete
  - khong overwrite local optimistic item chua sync
  - cross-browser / 2-wallet behavior nhat quan

## 4.3 Ownership & auth
- Claim bridge H1 + owner-scoped RLS H2 la nen tang cho:
  - own-only writes (`user_*`, `notifications`, `chat own actions`)
  - public reads (`profiles`, `community public`, `asset metadata public`)
- Cross-wallet notification/event insert phai di qua backend route (`service_role`) khi can.

## 5. Phase C Roadmap (Batches)
## C0 - Baseline Freeze + Inventory (Doc/Test only)
### Muc tieu
- Dong bang baseline truoc khi mo rong asset metadata/chat.
- Liet ke ro module nao da pass, module nao dang mock/stub.

### Deliverables
- Inventory doc:
  - profile/preferences/badges
  - favorites/watchlist/alerts
  - notifications
  - community
  - asset metadata (gap)
  - chat realtime (gap)
- Danh sach helper/runtime routes dang dung:
  - claim bridge
  - community notify route

### Tests / Gate
- `npm run build`
- Smoke UI 2-browser cho flows da pass (quick regression)

## C1 - Realtime Core Contract (cross-module)
### Muc tieu
- Chot quy tac merge/hydrate/event cho tat ca module offchain.

### Pham vi
- Dinh nghia `event identity`, `source_id`, `source_type`, dedupe keys
- Quy tac merge remote/local:
  - local optimistic > remote stale
  - remote authoritative > local cache on stable persisted fields
- Read-state semantics (`read`, `deleted`, `archived`) cho notifications/chat

### Deliverables
- Spec section / doc patch voi:
  - event taxonomy
  - merge rules
  - dedupe rules
  - retry/backoff rules
- Utility checklist de ap dung cho module moi

### Gate
- Khong con ambiguity ve:
  - duplicate notifications
  - mark-read persistence
  - cross-browser behavior expectation

## C2 - Asset Metadata (Data + Sync Foundation)
### Muc tieu
- Hoan thien offchain metadata cho assets (catalog/media/tags) o muc persisted + UI hydrate.

### Pham vi
- `assets_catalog`, `asset_media`, `asset_tags`, `asset_tag_map`
- Mapping mock asset -> remote asset row
- Fallback strategy khi asset chua ton tai remote

### Deliverables
- Asset metadata adapter (read/write/sync)
- Remote hydrate for asset listing/detail pages
- Backfill/stub creation strategy (neu UI tao asset metadata tu local mock)
- Audit/smoke script cho metadata constraints (slug/asset_uid/media/tag relations)

### Tests / Gate
- Tao/sua metadata -> refresh -> khong mat
- 2-browser view consistency cho metadata public
- Favorites/watchlist co resolve asset_id on dinh (khong fail do missing metadata)

## C3 - Asset Metadata Realtime Updates
### Muc tieu
- UI cap nhat metadata thay doi theo event push/refresh logic nhat quan.

### Pham vi
- Realtime subscriptions (neu bat)
- Hoac polling+invalidate strategy (neu chua bat Realtime cho module nay)
- Cache invalidation asset list/detail/favorites/watchlist

### Deliverables
- Realtime channel spec (hoac fallback polling spec)
- Client hooks/util for metadata invalidation
- UI indicators cho sync state (optional: `syncing`, `stale`)

### Tests / Gate
- Browser A sua metadata, Browser B thay doi sau refresh/reload (bat buoc)
- Neu bat realtime:
  - Browser B thay doi khong can manual refresh (muc tieu)

## C4 - Notifications Event Matrix Optimization (Hoan thien)
### Muc tieu
- Chot day du event matrix cho community + social + future chat hooks.

### Pham vi
- Event notifications:
  - follow
  - post liked
  - comment liked
  - reply liked
  - new comment on post
  - reply to comment
  - mention (neu co)
- Dedupe and source_id strategy
- Mark-read / mark-all-read / delete / clear semantics cross-browser

### Deliverables
- Notification event matrix spec
- Regression checklist cho 2-browser / 2-wallet
- Backend route contracts (`community-notify`) documented

### Tests / Gate
- Khong duplicate notifications
- Mark read khong xoa item
- Mark read khong reset unread sau refresh
- Delete moi thuc su xoa item

## C5 - Chat Realtime Schema & Security (Messaging Batch)
### Muc tieu
- Dua messaging (deferred truoc day) vao schema/runtime theo batch rieng.

### Pham vi
- Tables (du kien):
  - `conversations`
  - `conversation_participants`
  - `messages`
  - (optional) `message_receipts`, `message_reactions`
- RLS owner/participant scoped
- Read/write via claim bridge authenticated role

### Deliverables
- Messaging schema spec (final, no longer deferred)
- Migrations (schema + indexes + RLS + triggers where needed)
- Audit snapshot SQL (single-result)
- Smoke SQL (transaction + rollback)

### Tests / Gate
- Participant A/B co the gui/nhan message
- User khong tham gia khong doc duoc conversation/message
- Message order + unread count co tinh nhat quan

## C6 - Chat Realtime Client (UI + Sync + Notifications)
### Muc tieu
- Hoan thien chat realtime UI va persistence.

### Pham vi
- Conversation list
- Message thread
- Send/receive
- Unread/read receipts (toi thieu)
- Notification hooks (new message)
- Reconnect/resync strategy

### Deliverables
- Chat adapter + realtime subscriptions
- UI states (`sending`, `failed`, `delivered`, `read` - toi thieu theo scope)
- Fallback when realtime disconnects

### Tests / Gate
- 2-browser / 2-wallet chat pass
- Refresh/reopen khong mat message
- Unread badge cap nhat dung sau mark-read/open thread

## C7 - Offchain Realtime System Smoke (Full)
### Muc tieu
- Chot Phase C bang smoke full-system offchain realtime.

### Scope checklist (must pass)
- Profiles/preferences/badges
- Favorites/watchlist/alerts
- Community (post/comment/reply/like/save/pin-view logic)
- Notifications (event matrix selected)
- Asset metadata (read/update path theo scope)
- Chat realtime (send/receive/unread basics)

### Gate
- 2-browser / 2-wallet PASS
- Khong console error blocker (tru noise known list)
- Khong data loss sau refresh/reopen cho flows trong scope

## 6. Checkpoint Matrix (Spec-Driven)
## CP-C0 - Baseline Inventory Locked
- Pass khi inventory + scope boundaries da ghi ro trong docs.

## CP-C1 - Realtime Contract Locked
- Pass khi dedupe/merge/read-state rules khong con mo ho.

## CP-C2 - Asset Metadata Persisted
- Pass khi metadata tao/sua/refresh on dinh, resolve duoc vao favorites/watchlist.

## CP-C3 - Asset Metadata Realtime Behavior Stable
- Pass khi cross-browser metadata visibility dung theo strategy da chon.

## CP-C4 - Notifications Matrix Stable
- Pass khi mark-read/delete/event dedupe on dinh 2-browser.

## CP-C5 - Messaging Schema + RLS Pass
- Pass khi audit snapshot + smoke SQL pass.

## CP-C6 - Chat Client Realtime Pass
- Pass khi 2-browser send/receive/unread basics pass.
- Status (2026-02-25): ✅ PASS / CLOSED
- Closure artifact:
  - `docs/production/ATP2_PHASEC_CP_C6_CHAT_CLIENT_REALTIME_PASS_CHECKPOINT_2026-02-25.md`

## CP-C7 - Full Offchain Realtime PASS
- Pass khi full checklist C7 pass va docs chot phase.

## 7. Artifacts Bat Buoc Moi Batch
- `docs/production/need_Fix.md` (phase board / batch status)
- 1 spec/checkpoint doc cap nhat (file nay hoac spec module lien quan)
- Neu co DB thay doi:
  - migration SQL
  - audit snapshot SQL
  - smoke SQL
- Neu co backend route:
  - probe script (`.cjs`) + ket qua test (khong commit secret)

## 8. Security / Secret Handling Rules
- Khong commit:
  - `supabase/audit/key.md`
  - `.env`, `.env.local`, file env tam
  - probe JSON co token/secret
- Sau khi chot phase:
  - rotate secrets da tung paste trong chat/log

## 9. Exit Criteria Phase C (Offchain Realtime Completion)
- Asset metadata subsystem da hoat dong persisted + (realtime/polling sync) theo spec
- Chat realtime da trien khai va pass 2-browser smoke
- Notification matrix du cho community/social/chat basic
- Docs checkpoint + phase board cap nhat day du
- Co backup commit/push truoc khi chuyen sang Phase D (Onchain Protocol Integration)

## 10. Next Phase (D) - Protocol Onchain Integration (Defer)
- Sau khi Phase C pass moi tiep tuc:
  - contract addresses config
  - onchain read probes
  - protocol UI wiring
  - transaction flows / signing / receipts

## 11. Execution Log (2026-02-25)
- ✅ `C0` completed (baseline inventory + scope lock)
  - Artifact: `docs/production/ATP2_PHASEC_C0_BASELINE_INVENTORY_LOCK_2026-02-25.md`
- ✅ `C1` completed (realtime core contract rules locked)
  - Artifact: `docs/production/ATP2_PHASEC_C1_REALTIME_CORE_CONTRACT_RULES_2026-02-25.md`
- ✅ `C2` completed (`CP-C2` PASS: deterministic fixtures + namespace split + metadata seed bridge + persisted smoke probe)
  - Artifacts:
    - `docs/production/ATP2_PHASEC_C2_TEST_WALLET_ASSET_FIXTURE_PLAN_2026-02-25.md`
    - `docs/production/ATP2_PHASEC_C2_ASSET_METADATA_PERSIST_CHECKPOINT_2026-02-25.md`
    - `supabase/audit/batch_c2_asset_metadata_seed_smoke_probe.cjs`
    - `supabase/audit/batch_c2_asset_metadata_snapshot_single_result.sql`
- ✅ `C3` strategy locked (pull + invalidate baseline)
  - Artifact: `docs/production/ATP2_PHASEC_C3_ASSET_METADATA_SYNC_STRATEGY_2026-02-25.md`
- ✅ `C3.1` completed (metadata invalidation event + targeted rehydrate hooks) + build PASS
  - Artifact: `docs/production/ATP2_PHASEC_C3_1_ASSET_METADATA_INVALIDATION_HOOKS_CHECKPOINT_2026-02-25.md`
- ✅ `C2` metadata persisted probe rerun after `C3.1` patch -> PASS (regression check)
- ✅ `C3.2` manual smoke checklist prepared
  - Artifact: `docs/production/ATP2_PHASEC_C3_2_METADATA_INVALIDATION_SMOKE_CHECKLIST_2026-02-25.md`
- ✅ `C3.2` manual smoke PASS (user-confirmed) -> `CP-C3` baseline gate closed
- ✅ `C4` event matrix spec drafted
  - Artifact: `docs/production/ATP2_PHASEC_C4_NOTIFICATIONS_EVENT_MATRIX_SPEC_2026-02-25.md`
- ✅ `C4` smoke checklist drafted
  - Artifact: `docs/production/ATP2_PHASEC_C4_NOTIFICATIONS_EVENT_MATRIX_SMOKE_CHECKLIST_2026-02-25.md`
- ✅ `C4.1` completed (notification event codes / payload / source_id normalization + backend `/community-notify` dedupe pass)
  - Artifact: `docs/production/ATP2_PHASEC_C4_1_NOTIFICATIONS_EVENT_MATRIX_NORMALIZATION_CHECKPOINT_2026-02-25.md`
- ✅ `C4.1` build regression PASS
- ✅ `H3` minimal API smoke rerun after `C4.1` patch + function redeploy -> PASS
- ✅ `C4.2` auto probe PASS (`community-notify` matrix rows + dedupe + payload normalization + read/delete semantics + cross-read isolation)
  - Artifact: `docs/production/ATP2_PHASEC_C4_2_NOTIFICATIONS_EVENT_MATRIX_AUTO_PROBE_CHECKPOINT_2026-02-25.md`
  - Scripts:
    - `supabase/audit/batch_c4_notifications_event_matrix_auto_probe.cjs`
    - `supabase/audit/run_c4_probe_from_env.cjs`
- ✅ `C5` started in parallel (deferred messaging activation batch)
  - Applied migrations:
    - `supabase/migrations/000012_c5_messaging_schema.sql`
    - `supabase/migrations/000013_d2_rls_messaging_claim_bridge.sql`
  - Artifacts:
    - `supabase/audit/batch_c5_messaging_schema_rls_snapshot_single_result.sql`
    - `supabase/audit/batch_c5_messaging_schema_smoke_transaction_rollback.sql`
    - `docs/production/ATP2_PHASEC_C5_MESSAGING_SCHEMA_RLS_CHECKPOINT_2026-02-25.md`
  - Proxy verification:
    - `npx supabase inspect db table-stats` PASS (`conversations`, `conversation_participants`, `messages` present)
  - Gate result:
    - ✅ `CP-C5` PASS (SQL Editor snapshot + smoke SQL user-confirmed)
- ▶ Parallel open gates:
  - `C4.2` manual notification event matrix smoke (2-browser / 2-wallet) -> close `CP-C4`
  - `C6` chat realtime client implementation + smoke prep -> `CP-C6`
- ✅ `C6.1` completed (chat backend compatibility layer on C5 schema + quick-message modal backend path)
  - `orina-chat-v1` no longer depends on missing `kv_store_b0d68fc8` on project test
  - Added `POST /messages/conversation` compatibility endpoint
  - Minimal API probe PASS:
    - health
    - create conversation
    - send message
    - get messages
    - mark read
    - get conversations
  - Artifacts:
    - `docs/production/ATP2_PHASEC_C6_1_CHAT_CLIENT_BACKEND_COMPAT_CHECKPOINT_2026-02-25.md`
    - `docs/production/ATP2_PHASEC_C6_2_CHAT_UI_SMOKE_CHECKLIST_2026-02-25.md`
    - `supabase/audit/batch_c6_chat_api_probe_minimal.cjs`
- ✅ `C6.2` manual UI smoke PASS (2-browser / 2-wallet, user-confirmed)
  - Key fixes landed during C6.2 stabilization:
    - conversation create path now uses backend UUID (no synthetic `conv_<a>_<b>`)
    - stale thread pane cache reconciliation after chat reset / deleted thread
    - overlapping poll requests prevented (removes delayed thread updates under slow responses)
    - avatar mapping normalized across sidebar/header/thread/right panel (backend avatar preserved)
    - chat mock cleanup: keep `AI Agent Test`, remove legacy mock user chat tabs
  - Additional C6 support ops:
    - messaging reset test SQL (`batch_c6_messaging_reset_test_data.sql`)
    - duplicate direct conversation snapshot SQL (`batch_c6_duplicate_direct_conversations_snapshot_single_result.sql`)
    - unique guard migration `000014_c6_conversations_direct_key_unique_guard.sql` applied
  - Artifact:
    - `docs/production/ATP2_PHASEC_C6_2_CHAT_UI_SMOKE_CHECKPOINT_2026-02-25.md`
- ✅ `C6.3.1` implemented (chat invalidation events + bubble UI normalization)
  - Chat invalidation contract now emitted from `MessagesClient`:
    - `orina:chat-conversations-changed`
    - `orina:chat-messages-changed`
    - `orina:chat-read-state-changed`
  - `Messages` page listens + coalesces event refresh (conversation list + active thread)
  - Bubble media sizing normalized (incoming/outgoing fixed 4:3 frame) and text/time sizing aligned
  - `npm run build` PASS (re-run after each important UI patch)
  - Artifact:
    - `docs/production/ATP2_PHASEC_C6_3_1_CHAT_INVALIDATION_EVENTS_CHECKPOINT_2026-02-25.md`
- ▶ `C6.3.2` active (polling -> realtime/presence strategy execution)
  - Artifacts:
    - `docs/production/ATP2_PHASEC_C6_3_CHAT_INVALIDATION_POLLING_REALTIME_STRATEGY_2026-02-25.md`
    - `docs/production/ATP2_PHASEC_C6_3_CHAT_INVALIDATION_POLLING_REALTIME_SMOKE_CHECKLIST_2026-02-25.md`
    - `docs/production/ATP2_PHASEC_C6_3_2_POLLING_REALTIME_PRESENCE_EXECUTION_CHECKLIST_2026-02-25.md`
  - ✅ `C6.3.2.1` completed (visibility-aware polling + foreground refresh)
    - conversation list poll uses slower background cadence
    - active thread poll runs foreground-only
    - tab foreground triggers immediate catch-up refresh
    - `npm run build` PASS
  - ✅ `C6.3.2.2` completed (error backoff + scheduler refinement)
    - bounded backoff for list/thread silent polling errors
    - in-flight guard added for conversation list polling
    - scheduler skips avoid burning cadence when cooldown/backoff/in-flight blocks request
    - foreground refresh uses `force=true` to bypass backoff
    - Artifact:
      - `docs/production/ATP2_PHASEC_C6_3_2_2_POLLING_BACKOFF_SCHEDULER_REFINEMENT_CHECKPOINT_2026-02-25.md`
    - `npm run build` PASS
  - ✅ `C6.3.2.3` completed (presence execution path refinement + adapter boundary)
    - added `src/utils/chatRealtimeAdapter.ts` (`resolveChatPresenceOnline`, no-op subscription boundary)
    - `Messages` now uses adapter helper + subscription hooks (polling fallback-safe)
    - Artifact:
      - `docs/production/ATP2_PHASEC_C6_3_2_3_PRESENCE_ADAPTER_BOUNDARY_CHECKPOINT_2026-02-25.md`
    - `npm run build` PASS
  - ✅ `C6.3.2` closed (engineering execution bundle)
    - closure rationale: focused A/B smoke folded into `C6.3.3` realtime adapter execution gate
    - Artifact:
      - `docs/production/ATP2_PHASEC_C6_3_2_POLLING_REALTIME_PRESENCE_EXECUTION_CHECKPOINT_2026-02-25.md`
  - ▶ `C6.3.3` realtime adapter execution active (polling fallback-safe)
    - Artifacts:
      - `docs/production/ATP2_PHASEC_C6_3_3_REALTIME_ADAPTER_EXECUTION_PLAN_2026-02-25.md`
      - `docs/production/ATP2_PHASEC_C6_3_3_REALTIME_ADAPTER_SMOKE_CHECKLIST_2026-02-25.md`
      - `docs/production/ATP2_PHASEC_C6_3_3_1_REALTIME_ADAPTER_IMPLEMENTATION_CHECKPOINT_2026-02-25.md`
      - `docs/production/ATP2_PHASEC_C6_3_3_2_PRESENCE_EXECUTION_REALTIME_SMOKE_GATE_CHECKLIST_2026-02-25.md`
    - ✅ `C6.3.3.1` implemented
      - `src/utils/chatRealtimeAdapter.ts` upgraded to Supabase Realtime WebSocket-native adapter (invalidation-only)
      - polling fallback preserved when realtime auth/config/socket unavailable
      - `npm run build` PASS
    - ✅ `C6.3.3.2` checkpoint artifact prepared (doc-only)
      - `docs/production/ATP2_PHASEC_C6_3_3_2_PRESENCE_EXECUTION_REALTIME_SMOKE_GATE_CHECKPOINT_2026-02-25.md`
      - canonical checklist: `docs/production/ATP2_PHASEC_C6_3_3_2_PRESENCE_EXECUTION_REALTIME_SMOKE_GATE_CHECKLIST_2026-02-25.md`
    - ✅ `C6.3.3.2` PASS (manual validation, user-confirmed)
      - presence execution + focused realtime smoke gate (2-browser / 2-wallet)
    - ✅ `C6.3.3.3` close gate PASS
      - `docs/production/ATP2_PHASEC_C6_3_3_3_REALTIME_ADAPTER_CLOSE_GATE_CHECKLIST_2026-02-25.md`
      - `docs/production/ATP2_PHASEC_C6_3_3_3_REALTIME_ADAPTER_CLOSE_GATE_CHECKPOINT_2026-02-25.md`
    - ✅ `C6.3.3` CLOSED
    - ✅ `CP-C6` PASS / CLOSED
      - Artifact:
        - `docs/production/ATP2_PHASEC_CP_C6_CHAT_CLIENT_REALTIME_PASS_CHECKPOINT_2026-02-25.md`
      - `C6` chat realtime client track marked FINISH
