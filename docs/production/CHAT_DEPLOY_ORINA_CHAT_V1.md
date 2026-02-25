# Deploy: `orina-chat-v1` (Safe New Chat Function)

## Why
- Current chat failures show `HTTP 404` and/or CORS issues on the legacy Edge Function.
- We avoid overwriting the existing function by deploying a new one with clean routes.

## Function
- Name: `orina-chat-v1`
- Routes:
  - `GET /health`
  - `POST /messages/send`
  - `GET /messages/conversations/:address`
  - `GET /messages/:conversationId?userAddress=0x...`
  - `POST /messages/read`
  - `DELETE /messages/:conversationId?userAddress=0x...`

## Prereqs
- Supabase CLI authenticated (`supabase login` or `SUPABASE_ACCESS_TOKEN`)
- Project linked to `azimhqpsjgxbmjlxaghp` (ATP ORINA)

## Deploy
From repo root:
```bash
supabase functions deploy orina-chat-v1
```

## Verify
Open:
```text
https://azimhqpsjgxbmjlxaghp.supabase.co/functions/v1/orina-chat-v1/health
```
Expected JSON:
```json
{ "ok": true, "name": "orina-chat-v1" }
```

## Frontend Switch
Frontend uses `src/utils/messagesClient.ts`:
- primary function: `orina-chat-v1`
- fallback function: `make-server-b0d68fc8` legacy path

If you need to rollback temporarily:
- change `FN_NAME` back to `make-server-b0d68fc8`
- rebuild

