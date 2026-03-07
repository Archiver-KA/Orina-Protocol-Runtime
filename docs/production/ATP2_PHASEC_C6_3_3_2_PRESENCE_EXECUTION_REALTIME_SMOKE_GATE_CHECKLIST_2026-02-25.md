# ATP2 Phase C / C6.3.3.2 Checklist (Presence Execution + Realtime Smoke Gate)

Date: 2026-02-25

## Scope
- Validate realtime adapter execution (`C6.3.3.1`) under 2-browser / 2-wallet chat usage
- Confirm presence execution path remains correct (heuristic presence + fallback-safe behavior)
- Gate the transition to final `C6.3.3` close without broad UI refactor

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Pre-check
- `C6.3.2` CLOSED
- `C6.3.3.1` checkpoint recorded
- `src/utils/chatRealtimeAdapter.ts` realtime adapter implementation landed
- `npm run build` PASS after adapter patch
- `orina-chat-v1` backend healthy

## Focused A/B Smoke (2 browser / 2 wallet)
1. Open the same A↔B thread in both browsers (active thread visible on both sides)
2. A sends 1 message, verify B thread updates (not just sidebar)
3. B replies immediately, verify A thread updates
4. Send 3 rapid messages from one side
5. Confirm no dropped/duplicated messages in thread and sidebar preview alignment
6. Mark thread read on one side, refresh same side
7. Background one browser tab for ~30–60s, send from the other side, foreground the first tab
8. Confirm catch-up occurs immediately or near-immediately (realtime or polling fallback)
9. Optional resilience: temporarily interrupt network on one browser, restore, then verify fallback catches up

## Presence Execution Checks
- Header `online/offline` does not regress to permanently offline while active message exchange is happening
- Presence display remains consistent with current heuristic:
  - recent activity within window -> `online`
  - older activity -> `offline`
- Realtime adapter failures do not break presence fallback behavior

## Realtime Gate Pass Criteria
- Active-thread receive latency is improved or not regressed vs `C6.3.2`
- Sidebar and thread pane stay aligned to the same conversation UUID
- No refresh storms / no visible jitter loops caused by realtime invalidation + polling
- Polling fallback recovers after transient realtime disruption
- Presence label behavior remains acceptable under current heuristic (no hard regression)

## Early-Fail Signals
- Message appears in sidebar but thread pane stays stale for >5s while active thread is open
- Duplicate refresh loops / flicker / repeated rerender spikes after each message
- Thread updates stop entirely when realtime subscribe fails
- Presence label flips erratically on every refresh/poll cycle

## Log / Update
- `docs/production/need_Fix.md`
- `docs/production/ATP2_OFFCHAIN_REALTIME_COMPLETION_SPEC_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C6_3_CHAT_INVALIDATION_POLLING_REALTIME_STRATEGY_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C6_3_3_REALTIME_ADAPTER_EXECUTION_PLAN_2026-02-25.md`

