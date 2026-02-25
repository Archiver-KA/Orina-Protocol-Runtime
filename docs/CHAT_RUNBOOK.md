# Chat Runbook (Debug Realtime/Auth/DB/RLS)

**Version:** 3.3-final (Chat Rebuild)  
**Last updated:** 2026-02-14  
**Goal:** provide a deterministic debug flow for "can't send", "can't receive", "realtime slow", "401/403", "ws disconnect".

## 0) Hard Rules (Do Not Regress)
- Chat must never trigger per-message wallet signature prompts.
- All chat reads/writes must be authorized by Supabase Auth bearer token.
- DB + RLS is the single authority; UI must not fabricate delivery state.

## 1) Triage (Fast Symptom Classification)
Classify the issue first:
- `AUTH`: requests failing with 401 or "Auth required"
- `RLS`: requests failing with 403 / permission denied
- `DB`: inserts not happening / missing rows
- `REALTIME`: inserts happen but peers do not receive quickly
- `CLIENT`: UI state overwritten, wrong conversation id, wrong filters

## 2) Auth Checks
Expected:
- a valid Supabase session exists in browser storage
- every API call includes `Authorization: Bearer <access_token>`

Checklist:
- Confirm access token exists and is non-empty.
- Confirm token rotates on refresh without user signature prompt (refresh token works).
- Confirm wallet address resolves to `profiles.id` (UUID) for the logged-in user.
- Confirm the app auto-auths on wallet connect (no "chat-specific login" UI).

Server-side check (SQL):
```sql
-- Run as authenticated user in SQL editor "as user" context if supported,
-- or validate session via Supabase Auth tools.
select id, wallet_address, display_name
from public.profiles
where lower(wallet_address) = lower('<wallet>');
```

## 3) RLS Checks (Most Common Root Cause)
If A can't read/write:
- Ensure A is a participant of the conversation.

SQL checks:
```sql
select *
from public.conversation_participants
where conversation_id = '<conversation_uuid>'
order by joined_at asc;

select *
from public.messages
where conversation_id = '<conversation_uuid>'
order by created_at desc
limit 20;
```

If inserts fail (403):
- Verify policy `messages_insert_sender_participant` is present.
- Verify message insert uses `sender_id = auth.uid()` and correct `conversation_id`.

## 4) Conversation Creation Checks (Idempotency + Membership)
Expected invariants:
- conversations are created once
- both users are inserted into `conversation_participants`

Debug:
- If conversation exists but only one participant exists, the second user will never receive realtime events (and should not, by RLS).
- If "DM by wallet" is needed, use a single transactional RPC (phase-locked before implement).

## 5) Realtime Checks (WS + Postgres Changes)
Expected:
- sender inserts into `public.messages`
- receiver subscribed to `postgres_changes` receives INSERT event quickly (< 1s on good link)

SQL verification of publication:
```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;
```

Client verification checklist:
- Confirm client subscribes to:
  - schema: `public`
  - table: `messages`
  - event: `INSERT`
  - filter includes correct `conversation_id`
- Confirm channel is not duplicated (multiple subscriptions cause duplicates/overwrites).
- Confirm cleanup on unmount (unsubscribe) to avoid memory leaks and "ghost listeners".

Operational notes:
- If WS disconnects frequently:
  - treat realtime as best-effort
  - add a reconnect refetch delta (by `created_at > last_seen`) on tab-focus / reconnect

## 6) Performance Debug (Slow Delivery)
If message appears after 10s+:
- Confirm it's not polling-based delivery (should be realtime in steady state).
- Confirm client isn't applying a long debounce or delayed refresh.
- Confirm queries are using the intended indexes.

Index check:
```sql
explain analyze
select id, sender_id, content, created_at
from public.messages
where conversation_id = '<conversation_uuid>'
order by created_at desc
limit 50;
```

Expected:
- index scan using `idx_messages_conversation_id_created_at`

## 7) Debug “Online/Offline” Flapping
Important:
- Online status must be derived from Realtime Presence (ephemeral), not DB flags.
- If presence is not implemented yet, show "unknown" not "offline".

If presence exists:
- Ensure presence join happens once per tab, and leave on unload.
- Do not treat absence as "offline" unless TTL-based.

## 8) Incident Playbook
If chat is breaking production:
1. Disable chat UI entry points (feature flag).
2. Keep DB tables and data intact (no destructive migration).
3. Switch client to "read-only" mode if needed.
4. Archive evidence: timestamps, affected wallets, conversation id, HTTP statuses.

## 9) Evidence Checklist (Attach To Bug Report)
- Wallet A, Wallet B (redact if needed)
- `conversation_id`
- Request + response snippets:
  - status codes
  - error bodies
- Confirm whether DB insert exists
- Confirm whether realtime event arrives

## 10) Reference Implementations (for patterns)
Keep URLs inside code blocks.
```txt
https://github.com/shwosner/realtime-chat-supabase-react
```
