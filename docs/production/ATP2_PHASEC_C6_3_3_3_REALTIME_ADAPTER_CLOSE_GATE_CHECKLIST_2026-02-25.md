# ATP2 Phase C / C6.3.3.3 Checklist (Realtime Adapter Close Gate)

Date: 2026-02-25

## Scope
- Close the `C6.3.3` realtime adapter execution gate after `C6.3.3.2` validation
- Record final go/no-go for chat realtime adapter with polling fallback
- Prepare handoff toward `CP-C6` closure and `C7` full offchain smoke

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Pre-check
- `C6.3.3.1` implementation checkpoint exists
- `C6.3.3.2` checkpoint exists
- `C6.3.3.2` manual A/B results recorded (PASS or fail notes)
- Latest chat `npm run build` PASS on current branch

## Close Gate Checklist
1. Confirm A/B smoke outcome for `C6.3.3.2`
2. Confirm no regression in:
   - sidebar/thread UUID alignment
   - unread/read semantics
   - background/foreground catch-up
   - polling fallback behavior
3. Confirm presence heuristic behavior acceptable for current phase (not final presence service)
4. Record residual risks (if any) for next phase/batch
5. Update phase docs/status files

## PASS Criteria
- `C6.3.3.2` manual gate PASS
- Realtime adapter provides observable benefit or no regression vs polling-only refined baseline
- Polling fallback remains stable and usable when realtime path fails
- No blocking chat UI regressions introduced by realtime adapter execution

## FAIL / HOLD Criteria
- Any reproducible thread/sidebar mismatch returns under normal A/B chat flow
- Realtime subscribe instability breaks basic chat updates
- Presence label behavior becomes misleading enough to confuse chat usability

## Log / Update Targets
- `docs/production/need_Fix.md`
- `docs/production/ATP2_OFFCHAIN_REALTIME_COMPLETION_SPEC_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C6_3_CHAT_INVALIDATION_POLLING_REALTIME_STRATEGY_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C6_3_3_REALTIME_ADAPTER_EXECUTION_PLAN_2026-02-25.md`
- (Create close checkpoint file when PASS/FAIL is decided)

## Next (after PASS)
- Close `C6.3.3`
- Prepare `CP-C6` closure package
- Unblock `C7` full offchain realtime smoke gate (with `C4.2` dependency status)

