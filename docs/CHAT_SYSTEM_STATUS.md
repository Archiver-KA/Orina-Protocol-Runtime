# Chat System Status

## Current State
- Chat is in **rebuild mode** (debug-first MVP) following `docs/production/CHAT_REBUILD_PLAN.md`.
- Legacy chat is still considered **disabled** and must not be re-enabled or imported.
- The rebuild is implementing:
  - login-once auth (SIWE -> Supabase-compatible JWT)
  - PostgREST read/write with RLS as the authority
  - Supabase Realtime (Postgres Changes) for fast delivery (no polling steady-state)

## What Changed
- Runtime UI: `src/app/components/messages.tsx` is now a **debug MVP** for Phase 1-3 validation.
- UI Navigation: `Messages` can be shown again, but only as part of the rebuild rollout and only when wallet is connected.
- Legacy code is preserved at: `src/legacy/chat/`

## Developer Notes
- Do not import any module under `src/legacy/chat/` from runtime code.
- Any call into `src/utils/messagesClient.ts` or `src/utils/conversationUtils.ts` is expected to be either a no-op (migration/reset) or throw `ChatDisabledError`.
- Rebuild modules live under: `src/utils/chat/` and must not prompt wallet signatures except during explicit chat login.
