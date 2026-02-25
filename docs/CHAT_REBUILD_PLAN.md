# Chat Rebuild Plan (Supabase Auth + Realtime DM)

**Status:** In progress (Phase 1-3 MVP implemented; pending DB/RLS + Realtime verification)  
**Last updated:** 2026-02-14  
**Owner:** Orina / ATP

## 1) Problem Statement (Why Rebuild)
Legacy chat caused:
- Repeated wallet signature prompts (per-tab/per-action) instead of login-once
- Slow sync due to polling + inconsistent state across tabs/browsers
- Mixed sources of truth (local cache + edge KV + UI overrides)

**Decision:** hard stop legacy chat and rebuild with a single authority model.

## 2) Hard Rules (Locked Decisions)
- **One signature per login** only (SIWE during auth), never per message.
- **Identity authority:** `auth.users.id` (UUID).
- **Wallet address authority:** `public.profiles.wallet_address` unique.
- **Chat authority:** Postgres tables + RLS + Supabase Realtime.
- **No polling for new messages** in steady state; polling only as a reconnect fallback.

## 3) References (For Implementation Patterns)
- Minimal realtime example (global room chat):
  - `shwosner/realtime-chat-supabase-react`
  - Useful for: Postgres Changes subscription wiring
  - Not sufficient for: DM membership + RLS + auth mapping

## 4) Target Architecture

### 4.1 Data Model (UUID-first DM)
Tables (authoritative):
- `public.profiles`
  - `id uuid pk references auth.users(id)`
  - `wallet_address text unique not null`
  - `display_name`, `avatar_url`, ...
- `public.conversations`
  - `id uuid pk`
  - `created_by uuid`
  - `created_at`, `last_message_at`, `last_message_preview`
- `public.conversation_participants`
  - `(conversation_id, user_id)` primary key
  - `joined_at`
- `public.messages`
  - `id uuid pk`
  - `conversation_id uuid`
  - `sender_id uuid`
  - `client_message_id text` (idempotency)
  - `content text`, `image_url text null`
  - `created_at timestamptz`
  - `unique(sender_id, client_message_id)`

Indexes (must-have):
- `messages(conversation_id, created_at desc)`
- `conversation_participants(user_id, conversation_id)`
- `profiles(wallet_address)`

### 4.2 RLS Model (Zero-trust)
Core invariant: user can read/write only conversations where `auth.uid()` is a participant.

### 4.3 Realtime Model
- Messages: **Postgres Changes** on `public.messages`, filtered by `conversation_id`
- Typing indicator: **Broadcast** in `realtime channel conv:{conversationId}`
- Online status: **Presence** in `realtime channel conv:{conversationId}` (phase 2)
- Fallback on reconnect/tab-focus: refetch delta since `last_seen_created_at`

## 5) Implementation Plan (Phased)

### Phase 0: Design Lock
- [ ] Confirm DM creation semantics (idempotent by pair of users)
- [ ] Confirm which fields are public vs private
- [ ] Confirm whether we need RPC `get_or_create_conversation(peer_wallet)`

### Phase 1: Database + RLS (Foundation)
- [ ] Migrations exist / validated:
  - `supabase/migrations/20260213_000001_init_app_schema.sql` (profiles baseline)
  - `supabase/migrations/20260213_000002_chat_uuid_schema.sql` (chat tables + RLS + realtime publication)
- [ ] Skeleton (TODO-only) migration is tracked for future hardening:
  - `supabase/migrations/20260214_000003_chat_rebuild_skeleton.sql` (no-op; documents next DB steps)
- [ ] Add any missing policies or helper RPC (only if required)
- [ ] Add RLS policy tests (script + evidence)

### Phase 2: Auth (Login once)
- [ ] Implement SIWE `challenge` + `verify` endpoints (global session)
- [ ] Auto-auth triggers immediately on wallet connect (one signature per session)
- [ ] Verify session refresh works silently (no signature)
- [ ] Ensure `profiles` upsert on first login (wallet -> user id mapping)

### Phase 3: Frontend DM MVP
- [ ] Conversations list query (DB) + hydrate profile (displayName/avatar)
- [ ] Conversation view: paginated load + optimistic send
- [ ] Idempotent send via `client_message_id`
- [ ] Realtime subscribe to messages and append instantly
- [ ] No per-message signature prompts, ever (auth is global, not chat-specific)

### Phase 4: Presence + Typing
- [ ] Presence join/leave, show online indicator
- [ ] Typing via broadcast debounce

### Phase 5: Hardening
- [ ] Offline outbox + retry queue
- [ ] Reconnect logic: resync delta, no duplicates
- [ ] Rate limiting / spam guard (server-side or constraints)
- [ ] Observability: 401/403/ws disconnect counters

## 6) Acceptance Criteria (Go/No-Go)
- [ ] A/B DM appears in both users' conversation list
- [ ] A->B message shows in B in < 1s (steady state)
- [ ] Switching tabs does not trigger auth prompts
- [ ] Refresh page does not lose conversation state
- [ ] RLS: third-party cannot read/insert into others' conversations
- [ ] Idempotency: resending same `client_message_id` does not duplicate

## 7) Current Repo State
Runtime chat rebuild is in progress:
- `src/app/components/messages.tsx` is a debug-first MVP for Phase 1-3 validation (login-once + PostgREST + raw realtime WS)
- `Messages` entry exists in sidebar + command palette but is gated by wallet connection
- Legacy code is preserved in `src/legacy/chat/` and must not be imported
- Status doc: `docs/production/CHAT_SYSTEM_STATUS.md`
