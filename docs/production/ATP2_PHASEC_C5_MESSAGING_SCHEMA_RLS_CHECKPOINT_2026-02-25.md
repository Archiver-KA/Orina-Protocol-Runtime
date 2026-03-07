# ATP2 Phase C / C5 Checkpoint (Messaging Schema + RLS)

Date: 2026-02-25

## Scope
- Activate deferred messaging batch in Supabase schema:
  - `conversations`
  - `conversation_participants`
  - `messages`
- Add messaging indexes + trigger helpers (`updated_at` touch)
- Add participant-scoped claim-bridge RLS policies
- Prepare audit + smoke SQL for `CP-C5`

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Implemented Artifacts
- Migrations
  - `supabase/migrations/000012_c5_messaging_schema.sql`
  - `supabase/migrations/000013_d2_rls_messaging_claim_bridge.sql`
- Audit snapshot (single-result)
  - `supabase/audit/batch_c5_messaging_schema_rls_snapshot_single_result.sql`
- Smoke SQL (transaction + rollback)
  - `supabase/audit/batch_c5_messaging_schema_smoke_transaction_rollback.sql`

## C5 Design Notes (Locked for this batch)
- `conversations` create/update/delete: `service_role` path in C5
- `conversation_participants`
  - participant read (authenticated participant only)
  - self update for `last_read_at`
  - membership insert/delete via `service_role` path in C5
- `messages`
  - participant read
  - sender+participant scoped insert/update/delete
  - `service_role` all (backend/admin path)
- Dedupe key for client retries:
  - unique `(conversation_id, sender_user_id, client_message_id)`

## Tests Run (So Far)
1. `npx supabase db push --yes` -> PASS
   - Applied:
     - `000012_c5_messaging_schema.sql`
     - `000013_d2_rls_messaging_claim_bridge.sql`
2. `npx supabase inspect db table-stats` -> PASS (proxy verification)
   - `public.conversations` present
   - `public.conversation_participants` present
   - `public.messages` present
3. `npx supabase inspect db index-stats` -> FAIL (auth path issue with `cli_login_postgres`)
   - Does not invalidate `db push` success
   - Use SQL snapshot for authoritative C5 audit

## CP-C5 Gate (Closed)
Executed in Supabase SQL Editor (`postgres` role):
1. `supabase/audit/batch_c5_messaging_schema_rls_snapshot_single_result.sql` -> PASS
2. `supabase/audit/batch_c5_messaging_schema_smoke_transaction_rollback.sql` -> PASS

### CP-C5 Pass Criteria
- Snapshot:
  - `c5_messaging_tables_presence.missing = []`
  - `c5_key_columns_presence.missing = []`
  - `c5_indexes_presence.missing = []`
  - `c5_helper_functions_presence.missing = []`
  - `c5_triggers_presence.missing = []`
  - `c5_expected_rls_enabled_tables.enabled_missing = []`
  - `c5_expected_policies_presence.missing = []`
- Smoke SQL:
  - `NOTICE: ATP2 C5 messaging schema smoke PASS (transaction will rollback).`
  - final marker row:
    - `ATP2 C5 messaging schema smoke rollback complete`

## CP-C5 Results (User-Provided SQL Output)
- Snapshot PASS
  - `c5_messaging_tables_presence.missing = []`
  - `c5_key_columns_presence.missing = []`
  - `c5_indexes_presence.missing = []`
  - `c5_helper_functions_presence.missing = []`
  - `c5_triggers_presence.missing = []`
  - `c5_expected_rls_enabled_tables.enabled_missing = []`
  - `c5_expected_policies_presence.missing = []`
- Smoke SQL PASS
  - Final marker row returned:
    - `ATP2 C5 messaging schema smoke rollback complete`

## Outcome
- ✅ `CP-C5` PASS (Messaging schema + RLS activated and verified)
- ✅ Messaging is no longer deferred at schema/RLS layer for Phase C

## Next
- Move to `C6` (Chat Realtime Client) with messaging schema/RLS as base
- Keep `C4.2` manual notification matrix smoke as parallel open gate until user confirms close
