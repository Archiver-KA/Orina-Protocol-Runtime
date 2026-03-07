# ATP2 Phase C / CP-C6 Checkpoint (Chat Client Realtime PASS)

Date: 2026-02-25

## Scope
- Close `CP-C6` (Chat Client Realtime Pass) after `C6.1 -> C6.3.3` implementation and user-confirmed A/B validation
- Mark `C6 - Chat Realtime Client` as finished for Phase C
- Record residual risks and next dependency before `C7`

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Inputs (Completed)
- ✅ `C6.1` backend compatibility layer on C5 schema + minimal API probe PASS
- ✅ `C6.2` manual UI smoke PASS (2 browser / 2 wallet, user-confirmed)
- ✅ `C6.3.1` invalidation event contract implemented + UI normalization
- ✅ `C6.3.2` polling/presence execution bundle CLOSED (visibility, backoff, scheduler, adapter boundary)
- ✅ `C6.3.3` realtime adapter execution CLOSED
  - `C6.3.3.1` realtime adapter implementation (Supabase Realtime WebSocket-native, invalidation-only, polling fallback-safe)
  - `C6.3.3.2` presence/realtime smoke gate PASS (user-confirmed)
  - `C6.3.3.3` close gate PASS

## CP-C6 Decision
- ✅ `CP-C6` PASS / CLOSED
- ✅ `C6 - Chat Realtime Client` FINISH (Phase C sub-track)

## What Is Considered Done in C6
- Chat schema + RLS foundation is active from `C5`
- Chat backend (`orina-chat-v1`) uses canonical messaging tables (`conversations`, `conversation_participants`, `messages`)
- Frontend chat UI stabilized for A/B usage:
  - UUID-based conversation flow (no synthetic conversation IDs)
  - stale thread cache reconciliation
  - polling overlap protection + scheduler refinement
  - avatar consistency across sidebar/header/thread/right panel
  - mock chat cleanup (retain `AI Agent Test`)
- Invalidation contract active (`orina:chat-*`)
- Realtime adapter execution landed with polling fallback preserved

## Residual Risks (Accepted)
- Presence is heuristic (activity-based), not dedicated presence service
- Realtime path is acceleration layer; polling remains fallback for resilience

## Remaining Phase C Dependency Before C7
- `C4.2` manual notifications matrix smoke still needs closure (`CP-C4`)

## Next
- Close `CP-C4` (notifications manual matrix gate)
- Then run `C7` full offchain realtime smoke and phase close

