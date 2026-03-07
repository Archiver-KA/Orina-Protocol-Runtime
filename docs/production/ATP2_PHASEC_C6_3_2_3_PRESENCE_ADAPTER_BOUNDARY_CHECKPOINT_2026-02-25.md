# ATP2 Phase C / C6.3.2.3 Checkpoint (Presence Execution Path Refinement + Adapter Boundary)

Date: 2026-02-25

## Scope
- Refine presence execution path by extracting online-status resolution into a dedicated adapter utility
- Add realtime subscription boundary (polling fallback-safe, no-op default)
- Integrate boundary into `Messages` without changing backend behavior

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Implemented
- Added `src/utils/chatRealtimeAdapter.ts`
  - `resolveChatPresenceOnline(...)`
    - canonicalizes current activity-based online fallback logic
  - `subscribeChatConversationList(...)`
  - `subscribeChatConversationThread(...)`
    - no-op default adapter boundary (future realtime implementation can plug in without changing `Messages` UI flow)
  - exported `CHAT_PRESENCE_ACTIVITY_WINDOW_MS_DEFAULT`
- `src/app/components/messages.tsx`
  - Imports and uses `resolveChatPresenceOnline(...)` for sidebar/header online state derivation
  - Preserves current heuristic behavior (recent-message activity fallback) through adapter helper
  - Adds adapter subscription hooks:
    - conversation-list subscription (wallet scoped)
    - active-thread subscription (UUID scoped)
  - Default adapter remains no-op, so runtime behavior is stable while boundary is now in place

## Test Run
1. `npm run build` -> PASS

## Pass Outcome
- Presence logic is now centralized and easier to evolve (TTL/presence source changes do not require deep `Messages` edits)
- Realtime adapter seam is established for future Supabase Realtime integration
- Polling fallback remains source of truth with no regression in current chat behavior

## Next
- Focused `C6.3.2` smoke (2-browser / 2-wallet)
- Then proceed to realtime adapter execution (next sub-step in `C6.3`)

