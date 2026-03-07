# ATP2 Phase C / C6.3.3.2 Checkpoint (Presence Execution + Realtime Smoke Gate)

Date: 2026-02-25

## Scope
- Lock the execution gate for validating `C6.3.3.1` realtime adapter behavior
- Confirm what must be verified in 2-browser / 2-wallet smoke before closing `C6.3.3`
- Prepare a stable handoff into `C6.3.3.3` close gate (without assuming PASS yet)

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Status
- ✅ Checkpoint artifact prepared (doc-only)
- ⏳ Manual A/B validation result pending (not marked PASS in this checkpoint yet)

## Locked Validation Scope
- Realtime adapter invalidation behavior (thread + sidebar sync)
- Presence execution path behavior (heuristic online/offline stays acceptable)
- Polling fallback recovery when realtime is unavailable or unstable
- No refresh storms / no duplicated thread updates under mixed realtime + polling

## Canonical Smoke Checklist
- `docs/production/ATP2_PHASEC_C6_3_3_2_PRESENCE_EXECUTION_REALTIME_SMOKE_GATE_CHECKLIST_2026-02-25.md`

## Pass Criteria (to close later)
- Active-thread receive latency not regressed vs `C6.3.2`
- Sidebar and thread pane remain aligned on same conversation UUID
- Polling fallback catches up after transient realtime disruption
- Presence heuristic does not regress under message activity + background/foreground cycles

## Early-Fail Signals
- Sidebar updates but thread pane remains stale for >5s while active thread open
- Realtime invalidation causes visible refresh loops / jitter
- Presence flips erratically every poll cycle
- Realtime failure breaks polling fallback

## Next
- Run focused A/B smoke from checklist above
- Then execute `C6.3.3.3` close gate with results attached

