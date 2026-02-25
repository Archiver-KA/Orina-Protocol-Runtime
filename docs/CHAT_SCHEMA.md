# Chat Schema (DDL + RLS + Indexes)

**Version:** 3.3-final (Chat Rebuild)  
**Last updated:** 2026-02-14  
**Authority model:** Postgres tables + RLS (`auth.uid()`) + Supabase Realtime (Postgres Changes)

This document is the schema spec for the rebuilt chat system. The code source of truth is the applied migrations:
- `supabase/migrations/20260213_000001_init_app_schema.sql`
- `supabase/migrations/20260213_000002_chat_uuid_schema.sql`

## 1) Tables (Authoritative)

### 1.1 `public.profiles` (wallet -> UUID mapping)
Required columns:
- `id uuid primary key references auth.users(id) on delete cascade`
- `wallet_address text unique not null`
- `display_name text null`
- `avatar_url text null`
- `social_links jsonb not null default '{}'::jsonb`

Indexes:
- `idx_profiles_wallet_address` on `(wallet_address)`

RLS policies (baseline):
- `profiles_select_all`: `SELECT` allowed for all (public)
- `profiles_insert_own`: `INSERT` with `id = auth.uid()`
- `profiles_update_own`: `UPDATE` only if `id = auth.uid()`
- `profiles_delete_own`: `DELETE` only if `id = auth.uid()`

### 1.2 `public.conversations`
Purpose:
- Stable container for DM or group chat.

Required columns:
- `id uuid primary key default gen_random_uuid()`
- `created_by uuid not null references auth.users(id) on delete cascade`
- `created_at timestamptz not null default now()`
- `last_message_at timestamptz not null default now()`
- `last_message_preview text null`

Indexes:
- `idx_conversations_created_by` on `(created_by)`
- `idx_conversations_last_message_at` on `(last_message_at desc)`

RLS policies (baseline):
- `conversations_select_participant`: `SELECT` only if `auth.uid()` is a participant (via `conversation_participants`)
- `conversations_insert_creator`: `INSERT` only if `created_by = auth.uid()`
- `conversations_update_participant`: `UPDATE` only if `auth.uid()` is a participant

### 1.3 `public.conversation_participants`
Purpose:
- Membership mapping, authoritative gate for reads/writes.

Required columns:
- `conversation_id uuid not null references public.conversations(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `joined_at timestamptz not null default now()`
- `primary key (conversation_id, user_id)`

Indexes:
- `idx_conversation_participants_user_id` on `(user_id)`

RLS policies (baseline):
- `conversation_participants_select_own`: `SELECT` only if `user_id = auth.uid()`
- `conversation_participants_insert_creator`: `INSERT` only if conversation `created_by = auth.uid()`
- `conversation_participants_delete_creator`: `DELETE` only if conversation `created_by = auth.uid()`

### 1.4 `public.messages`
Purpose:
- Authoritative message log.

Required columns:
- `id uuid primary key default gen_random_uuid()`
- `conversation_id uuid not null references public.conversations(id) on delete cascade`
- `sender_id uuid not null references auth.users(id) on delete cascade`
- `client_message_id text not null` (idempotency)
- `content text not null default ''`
- `image_url text null`
- `created_at timestamptz not null default now()`
- `unique (sender_id, client_message_id)`

Indexes:
- `idx_messages_conversation_id_created_at` on `(conversation_id, created_at desc)`
- `idx_messages_sender_id` on `(sender_id)`

RLS policies (baseline):
- `messages_select_participant`: `SELECT` only if `auth.uid()` is a participant of `conversation_id`
- `messages_insert_sender_participant`: `INSERT` only if:
  - `sender_id = auth.uid()`
  - `auth.uid()` is a participant of `conversation_id`

## 2) Realtime Publication
Current migration attempts to add:
- `public.messages`
- `public.conversations`
to publication `supabase_realtime` if it exists.

Verification queries (run in SQL editor):
```sql
select pubname from pg_publication where pubname = 'supabase_realtime';

select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;
```

## 3) Optional Extensions (Not Yet Implemented)
Tracked as TODO-only in:
- `supabase/migrations/20260214_000003_chat_rebuild_skeleton.sql`

Typical extensions:
- RPC: `get_or_create_dm_by_wallet(peer_wallet text) returns uuid`
- `conversation_participants.last_read_at` for unread counts
- Presence/typing via Realtime Presence/Broadcast (ephemeral, not stored in DB)

