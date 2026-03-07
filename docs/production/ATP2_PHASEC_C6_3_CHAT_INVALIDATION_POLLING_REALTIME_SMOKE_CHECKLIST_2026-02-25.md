# ATP2 Phase C / C6.3 Chat Invalidation + Polling->Realtime Strategy Smoke Checklist

Date: 2026-02-25

## Scope
- Focused smoke for chat sync correctness after C6.3 invalidation/polling changes.
- 2 browser / 2 wallet only (A/B).
- No onchain / protocol checks.

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Pre-check
- `C6.2` PASS baseline confirmed
- `orina-chat-v1` deployed on `vcixsdudkizgfikhmfuv`
- Messaging data reset script available if needed:
  - `supabase/audit/batch_c6_messaging_reset_test_data.sql`
- Build passes after C6.3 patch (`npm run build`)

## Smoke Steps (A/B)
1. Open same A↔B conversation in both browsers
2. A sends 3 messages in quick succession
3. Verify B thread updates without long lag / missing middle messages
4. B replies immediately
5. Verify A sidebar preview + thread pane remain on same conversation UUID
6. Mark thread read on B
7. Refresh B
8. Confirm unread state does not reappear incorrectly
9. Background one tab for ~1 minute, then foreground it
10. Confirm chat catches up without showing stale thread content

## Expected (Pass Criteria)
- No sidebar/thread mismatch for same peer
- No delayed receive symptom caused by overlapping polls
- No stale thread cache after refresh/reopen
- Unread/read state remains consistent after refresh
- Avatar consistency preserved across sidebar/header/thread/right panel

## Early-Fail Signals
- Sidebar shows new message but thread pane remains stale > 5s while active thread open
- Thread pane shows messages from old/deleted conversation
- Repeated message duplication after reconnect/foreground
- Unread count resets incorrectly after mark-read + refresh

## Log
- Update:
  - `docs/production/need_Fix.md`
  - `docs/production/ATP2_OFFCHAIN_REALTIME_COMPLETION_SPEC_2026-02-25.md`
  - `docs/production/ATP2_PHASEC_C6_2_CHAT_UI_SMOKE_CHECKPOINT_2026-02-25.md` (reference)
  - `docs/production/ATP2_PHASEC_C6_3_CHAT_INVALIDATION_POLLING_REALTIME_STRATEGY_2026-02-25.md`

