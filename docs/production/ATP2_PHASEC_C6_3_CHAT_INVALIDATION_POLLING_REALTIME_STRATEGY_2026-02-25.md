# ATP2 Phase C / C6.3 Strategy - Chat Invalidation + Polling -> Realtime Path

Date: 2026-02-25

## Scope
- Define and prepare a safe transition from C6 polling-only chat updates to a deterministic invalidation/realtime strategy.
- Keep `C6.2` stable behavior as baseline; avoid broad refactors that can regress send/receive.
- Focus on UI sync correctness first, then realtime acceleration.

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Current Baseline (post-C6.2)
- Chat backend (`orina-chat-v1`) persists to C5 schema (`conversations`, `conversation_participants`, `messages`)
- Polling works with improved responsiveness after overlap guard
- UI can still drift under edge conditions because invalidation semantics are implicit
- No true presence service yet (online/offline currently heuristic)

## Progress Update (2026-02-25, post-C6.3.1)
- ✅ `C6.3.1` completed
  - chat invalidation events added (`orina:chat-*`)
  - emit on send/create/read/delete success in `MessagesClient`
  - `Messages` page listeners + coalesced self-refresh added
  - message bubble media/text/time sizing normalized
- ✅ `C6.3.2` closed
  - ✅ `C6.3.2.1` visibility-aware polling + foreground refresh
  - ✅ `C6.3.2.2` error backoff + scheduler refinement
  - ✅ `C6.3.2.3` presence execution path refinement + adapter boundary (no-op default)
- ▶ `C6.3.3` active
  - ✅ `C6.3.3.1` realtime adapter execution implemented (WebSocket-native, invalidation-only, polling fallback-safe)
  - ✅ `C6.3.3.2` checkpoint artifact prepared (manual gate definition locked)
  - ✅ `C6.3.3.2` PASS (manual A/B smoke, user-confirmed)
  - ✅ `C6.3.3.3` close gate PASS
  - ✅ `C6.3.3` CLOSED

## C6.3 Goals
1. Make chat data refresh deterministic (conversation list + thread pane)
2. Reduce unnecessary polling traffic while preserving responsiveness
3. Define event-driven invalidation contract for future realtime integration
4. Prepare pluggable realtime adapter path without breaking polling fallback

## Non-Goals (C6.3)
- Full end-to-end encryption redesign
- Final presence/online service
- Attachments upload pipeline hardening
- Major UI redesign of Messages screen

## Strategy Overview
### 1) Invalidation Contract (First)
- Introduce chat-specific invalidation events (no-payload or minimal payload):
  - `orina:chat-conversations-changed`
  - `orina:chat-thread-changed`
  - `orina:chat-read-state-changed`
- Emit on:
  - send message success
  - create conversation success
  - mark-read success
  - delete conversation success
- Consumers self-refresh based on current active context (same pattern as existing `orina:*` events)

### 2) Polling Scheduler Hygiene (Second)
- Keep polling fallback as source of truth until realtime adapter proves stable
- Add/confirm:
  - active-thread fast poll (foreground tab only)
  - slower conversation-list poll
  - visibility-aware throttle (`document.visibilityState`)
  - no overlapping requests for same resource key
  - backoff on repeated errors
- Prevent cache overwrite rules:
  - do not let partial/older thread snapshot shrink a newer confirmed list
  - clear stale cache only when backend confirms conversation missing

### 3) Realtime Adapter Path (Third, prepared)
- Add adapter boundary (not full migration yet):
  - `subscribeConversationList(address)`
  - `subscribeConversationThread(conversationId)`
  - `unsubscribe...`
- Default implementation: polling-backed no-op subscriptions
- Realtime implementation (later):
  - Supabase Realtime on `messages` + `conversation_participants`
  - convert realtime events -> invalidation events, not direct state mutation

## Proposed Batch Split Inside C6.3
### C6.3.1 - Chat Invalidation Event Contract
- Add event constants + emitters in chat send/read/delete/create paths
- Add listeners in `Messages` page / navbar unread surfaces (if applicable)
- Test: `npm run build`

### C6.3.2 - Polling Scheduler Refinement
- Visibility-aware poll cadence
- Error backoff
- Ensure no overlap for conversation list and thread requests
- Test: `npm run build` + A/B smoke quick pass

### C6.3.3 - Realtime Adapter Execution (Fallback-safe)
- `C6.3.3.1` implemented:
  - realtime-backed adapter in `src/utils/chatRealtimeAdapter.ts`
  - emits invalidation callbacks only
  - polling fallback preserved
  - Test: `npm run build` PASS
 - `C6.3.3.2` completed:
   - presence execution validation under realtime/polling mixed behavior
   - focused A/B smoke gate (thread + sidebar + read-state + fallback) user-confirmed PASS
 - `C6.3.3.3` completed:
   - close gate checklist executed (doc close gate)

### C6.3.4 - Focused Smoke Gate
- 2 browser / 2 wallet:
  - send/receive
  - unread/read
  - refresh/reopen
  - reconnect (tab background/foreground)

## Data Consistency Rules (Locked for C6.3)
- `mark read != delete`
- Thread pane must never display data for a conversation ID not present in current backend conversation set
- Sidebar preview and thread pane must derive from the same active conversation UUID
- Avatar display precedence:
  - explicit remote avatar URL
  - deterministic wallet avatar fallback
  - generic placeholder

## Exit Criteria (C6.3)
- Invalidation events implemented and used by chat UI paths
- Polling cadence/refetch behavior stable under 2-browser A/B manual smoke
- Realtime adapter executed and validated (polling fallback preserved)
- No regression in C6.2 accepted behavior
