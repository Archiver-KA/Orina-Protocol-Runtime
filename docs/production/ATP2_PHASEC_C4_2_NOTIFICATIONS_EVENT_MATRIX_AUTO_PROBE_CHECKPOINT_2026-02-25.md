# ATP2 Phase C / C4.2 Checkpoint (Notifications Event Matrix Auto Probe)

Date: 2026-02-25

## Scope
- Auto-verify notification matrix core semantics via H1 backend route + REST owner-scoped RLS
- Validate dedupe/read-state/delete behavior using random wallets (non-UI, non-manual)
- Keep manual 2-browser / 2-wallet checklist as primary gate for `CP-C4`

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Auto Probe Coverage
- H1 bridge health + exchange (A/B random wallets)
- `community-notify` route for canonical event rows:
  - `follow_profile`
  - `community_post_liked`
  - `community_comment_liked`
  - `community_reply_liked`
  - `community_comment_created`
  - `community_reply_created`
- Dedupe on repeat trigger (same `source_id`)
- Payload normalization (`eventCode`, `action`, `sourceId`)
- Owner read-state semantics:
  - mark one read
  - mark all read
  - delete one
- Cross-read isolation (A cannot read B notifications)

## Results
- ✅ `matrix_all_route_calls_ok`
- ✅ `matrix_rows_created_once_each`
- ✅ `matrix_dedupe_on_repeat`
- ✅ `matrix_payload_normalized`
- ✅ `mark_one_read_persisted`
- ✅ `mark_all_read_persisted`
- ✅ `delete_one_removed`
- ✅ `cross_read_isolated`

## Artifacts
- Probe script: `supabase/audit/batch_c4_notifications_event_matrix_auto_probe.cjs`
- Env runner: `supabase/audit/run_c4_probe_from_env.cjs`
- Latest result JSON (auto-generated):
  - `supabase/audit/batch_c4_notifications_event_matrix_auto_probe_2026-02-25T13-53-52-937Z.json`

## Notes
- Probe uses random wallets to avoid polluting manual UI A/B test notifications.
- `CP-C4` is not closed by auto probe alone; manual 2-browser / 2-wallet checklist remains required.

## Next (CP-C4 gate)
- Run:
  - `docs/production/ATP2_PHASEC_C4_NOTIFICATIONS_EVENT_MATRIX_SMOKE_CHECKLIST_2026-02-25.md`
- If PASS:
  - close `CP-C4`
  - move to `C5` (Messaging schema + RLS)
