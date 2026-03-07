# ATP2 Phase C / C6.2 Checkpoint (Chat UI Smoke - 2 Browser / 2 Wallet)

Date: 2026-02-25

## Scope
- Manual UI smoke for chat on top of C5 messaging schema + C6.1 compatibility backend.
- Validate A/B send/receive behavior in real UI (sidebar + thread pane + unread/read basics).
- Stabilize UI-only issues without broad backend/schema changes.

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Context
- `C5` schema + RLS already PASS (`CP-C5` closed)
- `C6.1` backend compatibility and minimal API probe already PASS
- User reported thread-pane lag/inconsistency despite sidebar preview updating

## Issues Found During C6.2
1. Conversation create path in `Messages` page still used synthetic IDs (`conv_<a>_<b>`) while backend C5/C6 uses UUID conversation IDs
2. Thread pane stale cache persisted after reset/delete conditions
3. Polling overlap (`900ms`) caused request starvation via stale-response discard (symptom: message appears after minutes)
4. Avatar mismatch between sidebar/header/thread/right panel due to dropped backend `avatar` and fallback precedence
5. Legacy mock chat tabs polluted C6 verification and created confusion (`Whale Collector`, `CryptoPunk #293`, `0xf1e...9d2`)
6. Online/offline status always looked static due to no presence fallback

## Implemented (C6.2 stabilization)
- `src/app/components/messages.tsx`
  - Use backend conversation UUID on create (`MessagesClient.createConversation(...)`)
  - Reconcile `activeConversation` with fresh backend list
  - Clear stale thread cache when backend conversation no longer exists
  - Poll overlap guard for same conversation (silent polling)
  - Short send cooldown correctly activated to prevent immediate poll overwrite
  - Carry `avatar`/`userInfo.avatarUrl` from backend and render with avatar URL priority
  - Remove 3 legacy mock user tabs, keep `AI Agent Test`
  - Online/offline heuristic fallback using recent message activity window
- `src/app/components/new-conversation-modal.tsx`
  - Await `onCreateConversation(...)` to avoid modal-close race

## Messaging Data Hygiene Actions (C6.2 support)
- Added duplicate direct-conversation snapshot SQL:
  - `supabase/audit/batch_c6_duplicate_direct_conversations_snapshot_single_result.sql`
- Added reset test data SQL (chat tables only):
  - `supabase/audit/batch_c6_messaging_reset_test_data.sql`
- Added direct conversation unique guard migration:
  - `supabase/migrations/000014_c6_conversations_direct_key_unique_guard.sql`

## Test Evidence
1. `npm run build` -> PASS (re-run after each major UI fix)
2. User executed duplicate snapshot -> PASS (`duplicate_key_count = 0`)
3. User executed messaging reset test SQL -> PASS
4. User applied `000014` via `supabase db push` -> PASS
5. User manual A/B UI retest (2 browser / 2 wallet) -> PASS
   - receive latency improved to acceptable level (>1s acceptable)
   - sidebar/thread/avatar consistency restored

## Pass Outcome
- `C6.2` PASS (manual UI smoke, 2-browser / 2-wallet)
- Chat UI is stable enough to move into `C6.3` invalidation/realtime strategy work
- `CP-C6` remains pending final C6.3 strategy implementation/validation per Phase C roadmap

## Next (C6.3)
- Formalize chat invalidation contract and event bus semantics
- Refine polling scheduler (visibility-aware, active-thread priority, no overlap)
- Prepare realtime adapter migration path (Supabase Realtime or equivalent) with fallback to polling
- Run focused smoke on send/receive/unread/read + reconnect/resync semantics

