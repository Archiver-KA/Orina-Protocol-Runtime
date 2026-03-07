# ATP2 Phase C / C6.3.2.2 Checkpoint (Polling Error Backoff + Scheduler Refinement)

Date: 2026-02-25

## Scope
- Add bounded error backoff to chat polling paths (`conversation list`, `active thread`)
- Refine scheduler guards to avoid burning polling cadence while requests are skipped
- Keep UI behavior stable (no backend/schema change)

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Implemented
- `src/app/components/messages.tsx`
  - Added polling backoff constants (list/thread paths)
  - Added `computePollBackoffMs(...)` helper
  - Added silent polling error streak refs + `backoffUntil` refs (list/thread)
  - Added `conversationsLoadInFlightRef` guard (list polling path)
  - `loadBackendConversations(...)`
    - supports `force` flag (bypass backoff for explicit refresh/invalidation/foreground)
    - resets backoff on success
    - applies bounded backoff on silent polling errors
  - `loadBackendMessages(...)`
    - supports `force` flag
    - respects send cooldown + backoff only for silent polling
    - resets backoff on success
    - applies bounded backoff on silent polling errors
  - Polling scheduler refinement
    - list poll skips when `in-flight` or in backoff window
    - thread poll skips when `in-flight`, cooldown, or in backoff window
    - preserves cadence by avoiding unnecessary `lastPollAt` updates on skipped passes
  - Foreground refresh (`visibilitychange`) now uses `force=true` to bypass backoff and catch up immediately

## Test Run
1. `npm run build` -> PASS

## Pass Outcome
- Polling degrades more safely under transient/network errors
- Scheduler avoids self-inflicted lag from repeated skipped ticks
- Foreground resume remains responsive even if previous poll attempts were in backoff

## Next
- `C6.3.2.3` presence execution path refinement + realtime adapter boundary (fallback-safe)
- Then focused A/B smoke gate for `C6.3.2`

