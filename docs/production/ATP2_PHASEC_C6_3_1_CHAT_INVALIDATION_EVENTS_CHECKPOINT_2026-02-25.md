# ATP2 Phase C / C6.3.1 Checkpoint (Chat Invalidation Events + Bubble UI Normalization)

Date: 2026-02-25

## Scope
- Implement chat invalidation event contract (`orina:chat-*`) for deterministic UI refresh across chat entry paths.
- Add listener/refresh coalescing in `Messages` page to reduce polling drift after send/create/read/delete.
- Fix message bubble media sizing consistency and text/timestamp size mismatch in thread UI.

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Implemented
- `src/utils/messagesClient.ts`
  - Added exported chat event constants:
    - `orina:chat-conversations-changed`
    - `orina:chat-messages-changed`
    - `orina:chat-read-state-changed`
  - Emit invalidation events after successful:
    - `sendMessage`
    - `createConversation`
    - `markAsRead`
    - `deleteConversation`
- `src/app/components/messages.tsx`
  - Added chat invalidation event listeners (`window.addEventListener(...)`)
  - Coalesced rapid event bursts with short debounce timer before self-refresh
  - Listener refreshes:
    - conversation list (silent)
    - active thread (silent)
  - Normalized message image bubble rendering:
    - fixed 4:3 media frame
    - `object-cover`
    - same visual constraints for incoming/outgoing bubbles
  - Normalized outgoing bubble text size to match incoming bubble
  - Normalized incoming bubble timestamp size to match outgoing bubble

## Related Paths Covered
- `Messages` page (main chat UI)
- `QuickMessageModal` via shared `MessagesClient` emit path (no separate UI patch required)

## Tests Run
1. `npm run build` -> PASS (after chat invalidation event patch + bubble media sizing)
2. `npm run build` -> PASS (after outgoing text size normalization)
3. `npm run build` -> PASS (after incoming timestamp size normalization)

## Pass Outcome
- Chat invalidation event contract is now active and reusable for later C6.3 polling/realtime work
- Chat UI updates are less dependent on periodic polling cadence alone after send/read/create/delete
- Bubble media and text/time visual consistency improved without backend/schema changes

## Next (C6.3.2)
- Execute polling -> realtime/presence strategy step:
  - visibility-aware polling scheduler
  - conversation/thread cadence separation refinement
  - error backoff
  - presence strategy execution path (heuristic now, realtime-ready boundary next)
- Run focused A/B smoke per `C6.3` checklist after each scheduler change

