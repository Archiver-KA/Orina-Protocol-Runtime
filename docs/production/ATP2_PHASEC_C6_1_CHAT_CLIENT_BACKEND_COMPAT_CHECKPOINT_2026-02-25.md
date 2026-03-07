# ATP2 Phase C / C6.1 Checkpoint (Chat Client Backend Compatibility on C5 Schema)

Date: 2026-02-25

## Scope
- Keep existing frontend chat API contract (`orina-chat-v1/messages/*`)
- Migrate backend storage from legacy `kv_store_b0d68fc8` to C5 messaging schema:
  - `conversations`
  - `conversation_participants`
  - `messages`
- Add explicit create/get-conversation endpoint (`POST /messages/conversation`)
- Unify `QuickMessageModal` write path to backend chat API (no local `conversationUtils` write path)

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Why This Batch
- Probe showed legacy chat backend failed on new project:
  - `kv_store_b0d68fc8` missing in schema cache
- `C5` schema + RLS was already activated and verified (`CP-C5 PASS`)
- Need a compatibility layer before larger `C6` UI/realtime behavior work

## Implemented
- Backend chat handler (C5-backed compatibility layer)
  - `supabase/functions/server/messages-handler-c5.ts`
  - preserves REST contract:
    - `POST /messages/conversation`
    - `POST /messages/send`
    - `GET /messages/conversations/:address`
    - `GET /messages/:conversationId`
    - `POST /messages/read`
    - `DELETE /messages/:conversationId`
- `orina-chat-v1` function now imports C5-backed handler
  - `supabase/functions/orina-chat-v1/index.tsx`
- `messagesClient.createConversation()` now calls backend `/conversation` endpoint first, fallback to old send-based behavior
  - `src/utils/messagesClient.ts`
- `QuickMessageModal` now uses backend chat API (no direct local `conversationUtils` writes)
  - `src/app/components/quick-message-modal.tsx`
- Minimal probe script for C6 backend compatibility
  - `supabase/audit/batch_c6_chat_api_probe_minimal.cjs`

## Tests Run
1. `npm run build` -> PASS
2. `npx supabase functions deploy orina-chat-v1 --project-ref vcixsdudkizgfikhmfuv --no-verify-jwt` -> PASS
3. `node supabase/audit/batch_c6_chat_api_probe_minimal.cjs` -> PASS
   - `health` OK
   - `createConversation` OK
   - `sendMessage` OK
   - `getMessages` OK
   - `markRead` OK
   - `getConversations` OK

## Current C6 Status
- ✅ Backend compatibility path running on C5 schema
- ✅ Quick-message modal writes into same backend path as Messages page
- ▶ Next: C6.2 UI/manual smoke + realtime/polling consistency checks

## Known Limits (still in C6 scope)
- `orina-chat-v1` is compatibility-first, not full participant claim-bridge direct REST client
- Chat realtime push subscription not implemented yet (current behavior = pull/poll path)
- Conversation delete currently removes caller's participant row (not full archive model)

## Next (C6.2)
- Manual 2-browser / 2-wallet chat smoke:
  - open/create conversation
  - send/receive
  - unread/read reset on open + mark read
  - quick message modal -> full thread consistency
- Then plan `C6.3` realtime enhancements (subscription/invalidation)
