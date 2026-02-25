# Chat Realtime Consolidation Audit (R2) - 2026-02-24

**Project:** ORINA ATP / ATP2  
**Phase:** R2 (Audit-only, no transport rewrite)  
**Status:** Completed (Audit)  
**Date:** February 24, 2026

---

## 1) Scope

This audit covers the **chat/messages subsystem only**:

- frontend chat UI data flow
- frontend chat auth/session usage
- backend chat transport endpoints
- storage backend currently in use
- ownership model (`wallet_address`, `user_id`, `user_ui`)
- cutover/rollback plan to remove legacy APIs safely

This audit intentionally does **not** modify transport behavior.

---

## 2) Executive Summary (Decision-Critical)

### Current active chat system (production path)
- **Frontend UI (`messages.tsx`) uses REST + polling**
- **Backend transport is Edge Function `orina-chat-v1`**
- **Storage is `kv_store_b0d68fc8` (service-role, KV-style table)**

### Important discovery
There is a **second chat stack already present** in the repo:
- `src/utils/chat/chatApi.ts` (PostgREST-based)
- `src/utils/chat/realtime.ts` (Supabase websocket subscription helper)
- `src/utils/chat/authClient.ts` + `sessionStore.ts`

This second stack is **not the active UI path**.

### Primary risk
The system currently has **dual chat architectures** (legacy active + new inactive).  
This is the main blocker to a clean realtime rollout with "no old APIs".

---

## 3) Inventory - Active vs Inactive Chat Paths

## 3.1 Active Frontend Chat Path (Currently Used)

### UI
- `src/app/components/messages.tsx`

### Active API client
- `src/utils/messagesClient.ts`

### Behavior (confirmed)
- Polls conversation list every ~5s
- Polls active conversation messages every ~1.2s
- Uses REST fetches to Supabase Edge Function
- Optimistic message insertion + polling reconciliation

### Evidence (from code scan)
- `loadBackendConversations(...)`
- `loadBackendMessages(...)`
- `setInterval(... 5000)` conversations
- `setInterval(... 1200)` active messages
- `MessagesClient.sendMessage/getMessages/getConversations/...`

---

## 3.2 Active Backend Chat Transport

### Edge Function
- `supabase/functions/orina-chat-v1/index.tsx`

### Routes (REST only)
- `POST /orina-chat-v1/messages/send`
- `GET /orina-chat-v1/messages/conversations/:address`
- `GET /orina-chat-v1/messages/:conversationId`
- `POST /orina-chat-v1/messages/read`
- `DELETE /orina-chat-v1/messages/:conversationId`

### Storage backend
- `supabase/functions/server/messages-handler.ts`
- `supabase/functions/server/kv_store.tsx`

Confirmed:
- Messages + conversations stored in `kv_store_b0d68fc8`
- IDs and unread counts are managed in KV payloads
- No server-side push channel is implemented in this path

---

## 3.3 Chat Auth Path (Current)

### Auth endpoints (global app session reused for chat auth)
- `src/utils/auth/supabaseAuthClient.ts`
  - `/chat/auth/siwe/challenge`
  - `/chat/auth/siwe/verify`
  - `/chat/auth/siwe/refresh`

### Session local cache
- `src/utils/auth/supabaseSessionStore.ts`

### Status
- S1 completed: challenge/session persistence moved to Supabase DB-backed tables
- Runtime smoke tests passed previously

---

## 3.4 Inactive / Future Chat Stack (Present in repo but not active)

### Files
- `src/utils/chat/postgrestClient.ts`
- `src/utils/chat/chatApi.ts`
- `src/utils/chat/realtime.ts`
- `src/utils/chat/authClient.ts`
- `src/utils/chat/sessionStore.ts`

### What it represents
- Supabase PostgREST CRUD path for conversations/messages
- Supabase websocket (`realtime/v1`) subscription helper for `messages` inserts
- Separate chat auth/session wrapper (parallel to `src/utils/auth/*`)

### Current status
- Not used by `messages.tsx` active UI flow
- Not integrated as primary transport
- Creates migration ambiguity if not explicitly managed

---

## 4) Ownership Map (Wallet truth vs user_id vs UI state)

## 4.1 Required rules (confirmed and adopted)

1. `wallet_address` = **truth identity**
2. `user_id` = internal surrogate (RLS/joins/recovery handle)
3. `user_ui` = derived cache, never auth/realtime truth

## 4.2 Chat-specific ownership reality today

### Active REST/KV chat path
- Uses wallet addresses directly in payloads and conversation IDs
- Example:
  - `sender`
  - `receiver`
  - `conv_<sorted_wallet_a>_<sorted_wallet_b>`

This aligns well with wallet-as-truth.

### Inactive PostgREST/realtime stack
- Uses `user_id` for:
  - `conversation_participants.user_id`
  - `messages.sender_id`
- Requires reliable mapping:
  - wallet -> authenticated session -> `user_id`

This stack is valid but increases risk if `wallet user` and `user_ui` diverge.

## 4.3 Key risk for cutover
If the app starts using PostgREST/realtime chat before strict wallet ownership checks:
- wrong `user_id` session may subscribe or write
- cross-wallet contamination risk increases

Mitigation required in cutover:
- validate `session.walletAddress === connected wallet` before:
  - loading conversations/messages
  - subscribing realtime
  - sending messages

---

## 5) Lifecycle Matrix (Chat)

## 5.1 Current active REST/KV path (observed/derived)

### Connect wallet (permission only)
- UI chat becomes available (by app gating policy)
- `messages.tsx` polls backend via wallet address
- no chat realtime websocket subscribe

### Disconnect
- UI path depends on app guest/user gating
- Polling should stop when `address` unavailable (code guards exist)
- risk: stale UI cache if local state not reset cleanly

### Reconnect same wallet
- Polling resumes with same wallet address
- No websocket re-subscribe concerns (because no push path active)

### Switch wallet
- Polling re-targets new wallet address
- Risk is stale conversation UI cache if state not cleared on wallet change (needs implementation verification in future test phase)

---

## 5.2 Future PostgREST + Realtime path (if chosen)

Requires lifecycle handling for:
- session refresh (`accessToken`)
- websocket reconnect
- wallet/session mismatch guard
- optimistic send + push dedupe

These are not yet implemented in the active UI path.

---

## 6) Failure Modes (Current + Future)

## 6.1 Current active REST/KV path

### FM-A: Polling race / stale overwrite
`messages.tsx` already includes anti-stale protections:
- `latestMessagesRequestRef`
- `activeConversationRef`
- send cooldown skip for silent polling

Risk remains:
- high polling frequency (1.2s) can create load/latency spikes
- backend latency may still cause UI jitter under load

### FM-B: Legacy route fallback ambiguity
`MessagesClient` still contains fallback route attempts:
- primary `orina-chat-v1`
- legacy `make-server-b0d68fc8/messages`
- legacy duplicated prefix path

Risk:
- hidden dependency on old endpoint patterns
- "works by fallback" masks deployment drift

This must be removed during cutover/hardening.

---

## 6.2 Inactive PostgREST/realtime stack (future if enabled)

### FM-C: wallet/session mismatch (`wallet user` vs `user_id`)
If `user_id` is reused from stale session:
- wrong conversation subscription / message read/write risk

### FM-D: dual transport active simultaneously
If REST/KV + PostgREST/realtime both mutate:
- duplicates
- split histories
- unread counter divergence

### FM-E: optimistic + realtime duplicate insert
If push-based insert not deduped against optimistic local message:
- duplicated messages in UI

---

## 7) Consolidation Decision (Required Before Implementation)

## 7.1 Recommendation
Adopt a **single canonical chat stack** and migrate in staged cutover.

### Recommended target (for full realtime roadmap)
**Target canonical stack:** Supabase PostgREST + Realtime (`src/utils/chat/*`)

Reason:
- aligns with Supabase data sync roadmap
- supports push-based realtime natively
- enables consistent `user_id` relational model (with wallet ownership guard)

### Legacy stack status
**Legacy stack (`MessagesClient` + `orina-chat-v1` + KV)** should be treated as transitional only.

---

## 8) Cutover Plan (Chat) - No-loop Implementation Sequence

## Stage CHT-1 (Audit freeze / instrumentation)
**Goal:** No transport change yet; improve observability.

- [x] Add dev-only logging around active chat polling lifecycle (rate, failures)
- [x] Log wallet/session mismatch detection points (no secrets)
- [x] Record current API call volumes (messages poll, conversations poll)

Acceptance:
- [x] Clear baseline before transport migration

---

## Stage CHT-2 (Canonical adapter layer)
**Goal:** Introduce one abstraction that hides transport implementation.

- [ ] Create `ChatTransportAdapter` interface
  - list conversations
  - list messages
  - send message
  - mark read
  - delete conversation
  - (optional) subscribe messages
- [ ] Wrap current REST/KV path as `chatTransportLegacy`
- [ ] Wrap Supabase PostgREST path as `chatTransportSupabase`
- [ ] Keep UI `messages.tsx` using adapter only (single call surface)

Acceptance:
- [ ] UI behavior unchanged while using legacy adapter

Rollback:
- [ ] Switch adapter binding back to legacy implementation

---

## Stage CHT-3 (Supabase data-path parity, no push yet)
**Goal:** Make Supabase path functionally equivalent before realtime subscribe.

- [ ] Validate tables and RLS for conversations/messages/participants
- [ ] Ensure wallet->session->user_id mapping is stable
- [ ] Implement send/list/read/delete via PostgREST adapter
- [ ] Keep polling in UI, but backed by Supabase adapter

Acceptance:
- [ ] Chat works end-to-end using Supabase REST path
- [ ] No dependency on `MessagesClient` for active flow

Rollback:
- [ ] Rebind adapter to legacy REST/KV path

---

## Stage CHT-4 (Push realtime for active conversation)
**Goal:** Replace high-frequency message polling with push for active conversation.

- [ ] Use `src/utils/chat/realtime.ts` (or a hardened replacement)
- [ ] Subscribe only after validating:
  - session exists
  - `session.walletAddress === connected wallet`
  - access token valid
- [ ] Dedupe optimistic send vs realtime insert
- [ ] Keep polling fallback behind feature flag (temporary)

Acceptance:
- [ ] Active conversation updates push within SLA
- [ ] No duplicate messages
- [ ] Wallet switch does not leak messages

Rollback:
- [ ] Disable push feature flag and resume polling

---

## Stage CHT-5 (Legacy API removal)
**Goal:** Eliminate old API paths fully.

- [ ] Remove `MessagesClient` legacy fallback URLs
- [ ] Remove unused legacy path calls in `messages.tsx`
- [ ] Remove/retire `orina-chat-v1` message transport usage (if fully superseded)
- [ ] Remove KV-backed message path if no longer needed
- [ ] Keep chat auth endpoints only if still shared and valid

Acceptance:
- [ ] No active code path hits legacy message API
- [ ] No hidden fallback route attempts remain

---

## 9) Rollback Plan (Chat)

Rollback must be explicit and fast. Do not improvise.

### Rollback unit
Use adapter binding / feature flags, not code reverts during incident.

### Rollback scenarios
1. **Supabase REST path unstable**
   - Rebind to legacy adapter (REST/KV)
   - Keep new code paths disabled

2. **Realtime push unstable**
   - Disable push subscription feature flag
   - Resume polling-only on canonical REST path

3. **Wallet/session mismatch observed**
   - Disable push and write actions in chat
   - enforce session re-auth before chat access

---

## 10) What is NOT allowed during chat migration

- Running legacy and new chat write paths simultaneously in production
- Using `user_ui` as chat ownership truth
- Auto-subscribing realtime without wallet/session match check
- Declaring chat realtime "done" while legacy fallback URLs are still active

---

## 11) R2 Audit Checklist (Completed)

- [x] Inventory active chat read/write paths
- [x] Inventory inactive/new chat stack in repo
- [x] Confirm backend transport type (REST, no push)
- [x] Confirm storage backend (`kv_store_b0d68fc8`)
- [x] Build ownership map (`wallet_address`, `user_id`, `user_ui`)
- [x] Identify major failure modes
- [x] Produce cutover plan
- [x] Produce rollback plan

---

## 12) Time & Change Log (Required by process)

### 2026-02-24 — R2 Chat Realtime Consolidation Audit
**Estimated implementation time:** ~45-60 minutes (audit + documentation)

**Reason for this phase**
- Notifications realtime did not pass A/B test and was explicitly deferred
- Chat is the highest-risk domain due to historical backend/session issues
- Need a non-patch-loop path to achieve full realtime rollout without legacy APIs

**What changed in this phase**
- No runtime transport behavior changed
- Audit findings documented
- Cutover and rollback strategy defined
