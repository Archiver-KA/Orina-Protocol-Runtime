# ATP2 Phase C / C6.3.3 Realtime Adapter Smoke Checklist

Date: 2026-02-25

## Scope
- Focused manual smoke for realtime adapter execution after `C6.3.3`
- 2 browser / 2 wallet only
- Chat only (no community/notifications/onchain)

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Pre-check
- `C6.3.2` closed (polling/backoff/presence execution bundle)
- Realtime adapter implementation landed in `src/utils/chatRealtimeAdapter.ts`
- `npm run build` PASS
- `orina-chat-v1` chat backend healthy

## Smoke Steps (A/B)
1. Open same A↔B thread in both browsers
2. A sends 1 message; measure B visible update time (thread + sidebar)
3. B replies immediately; verify A update
4. Send 3 rapid messages from A; verify no dropped middle message
5. Mark thread read on B; refresh B
6. Background A tab for ~30–60s, send from B, foreground A
7. Verify catch-up without stale thread content
8. (Optional resilience) Temporarily interrupt network for one tab, restore, verify polling fallback recovers

## Pass Criteria
- Perceived active-thread receive latency improved or at least not regressed vs `C6.3.2`
- Sidebar and thread pane stay aligned on same conversation UUID
- No refresh storms / duplicate messages caused by realtime invalidation
- Unread/read semantics preserved
- Polling fallback still catches up after transient realtime issues

## Early-Fail Signals
- Message appears in sidebar but not thread for >5s while active thread open
- Duplicated messages after rapid sends
- Thread updates stop entirely when realtime subscribe fails
- Unsubscribe leaks (old thread still invalidates current thread repeatedly)

## Log / Update
- `docs/production/need_Fix.md`
- `docs/production/ATP2_OFFCHAIN_REALTIME_COMPLETION_SPEC_2026-02-25.md`
- `docs/production/ATP2_PHASEC_C6_3_CHAT_INVALIDATION_POLLING_REALTIME_STRATEGY_2026-02-25.md`

