# ATP2 Phase C / C6.3.3 Plan (Realtime Adapter Execution - Polling Fallback Safe)

Date: 2026-02-25

## Scope
- Implement realtime adapter execution on top of the adapter boundary introduced in `C6.3.2.3`
- Use realtime signals to trigger chat invalidation events (not direct state mutation)
- Preserve polling as fallback source of truth

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Goal
Reduce perceived chat latency and improve foreground/background catch-up behavior by adding realtime invalidation, while keeping current stable polling behavior as backup.

## Progress Update (post-C6.3.3.1)
- ✅ `C6.3.3.1` completed
  - `src/utils/chatRealtimeAdapter.ts` upgraded from no-op to Supabase Realtime WebSocket-native adapter
  - adapter emits invalidation callbacks only (no direct `Messages` state mutation)
  - bridge JWT integration attempted for conversation-list subscription path
  - polling fallback remains active if realtime/auth/config is unavailable
  - `npm run build` PASS
- ▶ `C6.3.3.2` next
  - presence execution validation + focused realtime smoke gate (2-browser / 2-wallet)
  - checkpoint artifact prepared (doc-only): `ATP2_PHASEC_C6_3_3_2_PRESENCE_EXECUTION_REALTIME_SMOKE_GATE_CHECKPOINT_2026-02-25.md`
- ✅ `C6.3.3.2` completed
  - manual A/B smoke PASS (user-confirmed)
- ✅ `C6.3.3.3` completed
  - close gate checklist executed
  - close checkpoint: `ATP2_PHASEC_C6_3_3_3_REALTIME_ADAPTER_CLOSE_GATE_CHECKPOINT_2026-02-25.md`
- ✅ `C6.3.3` CLOSED
  - next step: `CP-C6` closure package

## Non-Goals (C6.3.3)
- Full presence service (heartbeat table / dedicated presence backend)
- Replacing all polling with realtime-only logic
- End-to-end encryption / attachment pipeline redesign

## Execution Plan (Narrow Batch)
### C6.3.3.1 - Realtime Adapter Implementation (No Direct UI Mutation)
- Implement realtime-backed versions of:
  - `subscribeChatConversationList(address, onInvalidate)`
  - `subscribeChatConversationThread(conversationId, onInvalidate)`
- Realtime events should only call `onInvalidate()`
- Do not mutate `Messages` state directly from adapter

### C6.3.3.2 - Presence Execution + Fallback Safety Gate
- Ensure adapter unsubscribe paths are reliable on:
  - active thread switch
  - wallet switch
  - component unmount
- Confirm polling continues to work if realtime subscribe fails
- Add defensive logging (debug-level only)
- Validate presence display behavior does not regress under mixed realtime/polling updates

### C6.3.3.3 - Focused A/B Realtime Smoke Close
- 2 browser / 2 wallet:
  - active-thread send/receive latency
  - sidebar + thread sync
  - unread/read + refresh
  - background/foreground catch-up
  - fallback behavior if realtime drops

## Technical Decisions (Locked)
- Realtime layer emits invalidation only (same `orina:chat-*` contract)
- Polling remains enabled (reduced cadence + backoff from `C6.3.2`)
- Presence display remains heuristic for now (adapter helper `resolveChatPresenceOnline`)

## Deliverables
- `src/utils/chatRealtimeAdapter.ts` upgraded from no-op to realtime-backed implementation (with fallback)
- `Messages` remains unchanged or minimally changed (adapter boundary already integrated)
- `C6.3.3` checkpoint + smoke results documented

## Early-Fail Signals
- Realtime subscription errors break existing polling flow
- Duplicate refresh storms caused by realtime + polling + invalidation loops
- Sidebar/thread mismatch returns after adapter execution
- Memory leak / stale subscriptions after switching threads/wallets

## Rollback / Fallback
- Revert adapter implementation to no-op while keeping `C6.3.2` polling logic intact
- No schema changes required for rollback
