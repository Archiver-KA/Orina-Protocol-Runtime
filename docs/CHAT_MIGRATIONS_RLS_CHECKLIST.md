# Chat Migrations + RLS Checklist (Zero-Trust)

**Status:** Checklist  
**Last updated:** 2026-02-14

This checklist is intended to be used before enabling the rebuilt chat in production.

## 1) Migrations (Files + Order)
- [ ] `supabase/migrations/20260213_000001_init_app_schema.sql` applied
  - [ ] `public.profiles` exists, `wallet_address` is `unique not null`
  - [ ] RLS enabled on `public.profiles`
- [ ] `supabase/migrations/20260213_000002_chat_uuid_schema.sql` applied
  - [ ] `public.conversations` exists + indexes
  - [ ] `public.conversation_participants` exists + indexes
  - [ ] `public.messages` exists + indexes
  - [ ] RLS enabled on all 3 tables
  - [ ] publication `supabase_realtime` includes `public.messages` (+ `public.conversations` if desired)
- [ ] `supabase/migrations/20260214_000003_chat_rebuild_skeleton.sql` reviewed
  - [ ] Confirm whether any TODO items should be promoted into a real migration (only with locked decisions + tests)

## 2) RLS Policies (Must Pass)

### `public.profiles`
- [ ] SELECT: public readable (or restricted if policy changes)
- [ ] INSERT: `id = auth.uid()`
- [ ] UPDATE: `id = auth.uid()`
- [ ] DELETE: `id = auth.uid()`

### `public.conversations`
- [ ] SELECT: only participants (via `conversation_participants`)
- [ ] INSERT: only creator (`created_by = auth.uid()`)
- [ ] UPDATE: only participants

### `public.conversation_participants`
- [ ] SELECT: at minimum `user_id = auth.uid()` (or participant-based)
- [ ] INSERT: only creator of the conversation (or via RPC)
- [ ] DELETE: only creator of the conversation (or via RPC)

### `public.messages`
- [ ] SELECT: only participants of the conversation
- [ ] INSERT: `sender_id = auth.uid()` AND user is participant
- [ ] Unique constraint: `(sender_id, client_message_id)` prevents duplicate retries

## 3) Realtime Verification
- [ ] Realtime enabled for project
- [ ] `supabase_realtime` publication includes `public.messages`
- [ ] Client can subscribe to `postgres_changes` and receives INSERT events
- [ ] Non-participant does not receive events (must be enforced by RLS + auth)

## 4) Test Matrix (Two Wallets)
- [ ] A can create DM with B
- [ ] B sees DM appear without refresh (realtime)
- [ ] A->B message arrives < 1s
- [ ] B->A message arrives < 1s
- [ ] No signature prompt while sending messages (auth is login-once)
- [ ] Tab switching does not drop conversation list

## 5) Evidence To Archive (Production Gate)
- [ ] Migration apply logs (staging + prod)
- [ ] Screenshot/video of A/B realtime DM
- [ ] RLS negative test (C cannot read A/B)
- [ ] Index check (query plan or timings)
