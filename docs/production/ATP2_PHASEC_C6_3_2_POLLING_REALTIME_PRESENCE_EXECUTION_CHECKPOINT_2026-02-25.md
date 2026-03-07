# ATP2 Phase C / C6.3.2 Checkpoint (Polling / Presence Strategy Execution Bundle)

Date: 2026-02-25

## Scope
- Close the execution bundle for `C6.3.2` after completing the three planned sub-steps:
  - `C6.3.2.1` visibility-aware polling + foreground refresh
  - `C6.3.2.2` error backoff + scheduler refinement
  - `C6.3.2.3` presence execution path refinement + adapter boundary
- Keep runtime behavior fallback-safe (polling remains source of truth)
- Prepare transition to `C6.3.3` realtime adapter execution

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Completed Sub-steps
### C6.3.2.1
- Visibility-aware polling in `Messages`
  - conversation list: slower cadence when backgrounded
  - active thread: foreground-only polling
  - immediate catch-up refresh on foreground
- Build test: `npm run build` PASS

### C6.3.2.2
- Error backoff + scheduler refinement
  - bounded backoff for silent polling errors (list/thread)
  - in-flight guard added for list polling
  - scheduler skips no longer waste cadence while cooldown/backoff/in-flight blocks requests
  - foreground refresh bypasses backoff via `force=true`
- Build test: `npm run build` PASS

### C6.3.2.3
- Presence execution path refinement + adapter boundary
  - introduced `src/utils/chatRealtimeAdapter.ts`
  - centralized `resolveChatPresenceOnline(...)`
  - added no-op subscription boundaries:
    - `subscribeChatConversationList(...)`
    - `subscribeChatConversationThread(...)`
  - `Messages` wired to adapter hooks while preserving polling fallback behavior
- Build test: `npm run build` PASS

## Artifacts (Sub-step Checkpoints)
- `docs/production/ATP2_PHASEC_C6_3_2_2_POLLING_BACKOFF_SCHEDULER_REFINEMENT_CHECKPOINT_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C6_3_2_3_PRESENCE_ADAPTER_BOUNDARY_CHECKPOINT_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C6_3_2_POLLING_REALTIME_PRESENCE_EXECUTION_CHECKLIST_2026-02-25.md`

## Closure Note
- `C6.3.2` is closed as an engineering execution bundle (implementation + build validation complete).
- Focused A/B smoke coverage is carried forward as part of `C6.3.3` realtime adapter execution gate to avoid duplicate manual cycles.

## Next (C6.3.3)
- Execute realtime adapter implementation (Supabase Realtime-backed invalidation)
- Keep polling fallback path intact
- Run focused A/B smoke covering send/receive/unread/read/background-resume

