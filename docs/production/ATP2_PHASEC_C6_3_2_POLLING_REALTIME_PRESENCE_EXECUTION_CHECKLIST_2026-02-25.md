# ATP2 Phase C / C6.3.2 Execution Checklist (Polling -> Realtime / Presence Strategy)

Date: 2026-02-25

## Scope
- Execute the scheduler/presence portion of `C6.3` on top of the new chat invalidation event contract (`C6.3.1`).
- Keep polling fallback as source of truth while reducing perceived delay and unnecessary requests.
- Prepare a clean transition boundary for realtime/presence without broad UI rewrite.

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Pre-check
- `C6.2` PASS baseline confirmed (2-browser / 2-wallet)
- `C6.3.1` checkpoint PASS (chat invalidation events + UI normalization)
- `orina-chat-v1` deployed and healthy on project `vcixsdudkizgfikhmfuv`
- `npm run build` currently PASS
- Optional reset tool available if chat state becomes noisy:
  - `supabase/audit/batch_c6_messaging_reset_test_data.sql`

## C6.3.2 Implementation Steps (narrow batch order)
1. Scheduler visibility-awareness
- Slow down or pause high-frequency thread polling when tab is backgrounded
- Force refresh on foreground transition before resuming cadence

2. Conversation vs thread poll cadence refinement
- Keep active thread fast poll
- Keep conversation list slower poll
- Ensure both paths cannot overlap same resource key

3. Error/backoff control
- Add bounded backoff on repeated request failures
- Reset backoff after successful response

4. Presence strategy execution (fallback-safe)
- Keep current activity heuristic as baseline
- Introduce presence update boundary (no hard dependency on realtime channel yet)
- Do not regress avatar/status rendering across sidebar/header/right panel

5. Invalidation + polling interaction audit
- Ensure `orina:chat-*` emits do not trigger duplicate spam refresh loops
- Preserve debounce/coalescing behavior in `Messages`

## Tests After Each Important Step
1. `npm run build`
2. Quick A/B check (same active thread open)
- send 1 message A -> B
- send 1 message B -> A
- verify sidebar + thread sync

## Focused Smoke (C6.3.2 gate)
Use:
- `docs/production/ATP2_PHASEC_C6_3_CHAT_INVALIDATION_POLLING_REALTIME_SMOKE_CHECKLIST_2026-02-25.md`

Key focus:
- active-thread receive latency
- no stale thread pane after background/foreground
- unread/read stability after mark-read + refresh
- no sidebar/thread UUID mismatch
- online/offline status remains coherent under activity heuristic

## Pass Criteria
- No overlapping poll starvation symptom (message delayed by minutes) under A/B quick send bursts
- Foreground resume catches up thread without stale cache artifacts
- Invalidation events and polling coexist without duplicate UI regressions
- Build passes after each major scheduler/presence patch

## Early-Fail Signals
- Active thread stops updating while sidebar preview moves
- Rapid event emits cause repeated duplicate fetch loops
- Background -> foreground restores stale messages from wrong thread
- Presence logic flips erratically or breaks avatar/user panel rendering

## Log / Checkpoint Update Targets
- `docs/production/need_Fix.md`
- `docs/production/ATP2_OFFCHAIN_REALTIME_COMPLETION_SPEC_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C6_3_CHAT_INVALIDATION_POLLING_REALTIME_STRATEGY_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C6_3_1_CHAT_INVALIDATION_EVENTS_CHECKPOINT_2026-02-25.md`

