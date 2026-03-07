# ATP2 Phase C / C6.3.3.1 Checkpoint (Realtime Adapter Implementation - Polling Fallback Safe)

Date: 2026-02-25

## Scope
- Implement realtime adapter execution inside `src/utils/chatRealtimeAdapter.ts`
- Use Supabase Realtime events to trigger chat invalidation callbacks only (no direct `Messages` state mutation)
- Keep polling fallback active when realtime auth/config/socket is unavailable

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Implemented
- `src/utils/chatRealtimeAdapter.ts`
  - Upgraded from no-op subscription boundary to realtime-backed adapter (WebSocket native / Phoenix protocol)
  - Realtime channel subscriptions added for:
    - conversation list invalidation (`conversations`, `messages`, `conversation_participants`)
    - thread invalidation (filtered by `conversation_id` for `messages` + `conversation_participants`)
  - Adapter behavior:
    - emits `onInvalidate()` only (UI state remains owned by `Messages`)
    - debounce invalidation callbacks to avoid refresh storms
    - heartbeat support + reconnect backoff
    - safe unsubscribe path
  - Bridge auth integration:
    - attempts claim-bridge token exchange for conversation-list subscription (wallet-scoped path)
    - uses `getSupabaseBridgeAccessToken()` when available
  - Fallback safety:
    - if browser/websocket/auth/config unavailable -> adapter returns no-op unsubscribe and polling remains source of truth

## Test Run
1. `npm run build` -> PASS

## Pass Outcome
- Realtime adapter execution is now active behind the existing `C6.3.2.3` adapter boundary
- Polling fallback remains intact (no dependency on realtime success for basic chat sync)
- `Messages` UI flow stays stable because realtime still goes through invalidation contract (`orina:chat-*`)

## Risks / Notes
- Live realtime behavior still needs A/B smoke validation (network + auth + subscribe stability)
- Presence display is still heuristic (activity-based) pending dedicated presence execution gate

## Next
- `C6.3.3.2` presence execution / realtime smoke gate preparation + focused A/B validation
- `C6.3.3.3` close realtime adapter gate after manual smoke + fallback checks

