# Chat Test Matrix (Two-Wallet Evidence)

**Version:** 3.3-final (Chat Rebuild)  
**Last updated:** 2026-02-14  
**Purpose:** deterministic acceptance tests + evidence archive checklist before enabling chat in production.

## 0) Preconditions
- [ ] Two independent wallets: A and B (different browser profiles recommended)
- [ ] Both wallets can login once (no repeated signature prompts)
- [ ] Both have `public.profiles` row with correct:
  - [ ] `wallet_address`
  - [ ] `display_name`
  - [ ] `avatar_url` (optional)
- [ ] DB migrations applied:
  - [ ] `20260213_000001_init_app_schema.sql`
  - [ ] `20260213_000002_chat_uuid_schema.sql`
- [ ] Realtime publication includes `public.messages`

## 1) Auth/Session Tests (Login Once)
1. [ ] A logs in: signature prompted exactly once.
2. [ ] A sends 20 messages in a row: no additional signature prompts.
3. [ ] A refreshes tab: no signature prompt (session refresh is silent).
4. [ ] A switches routes/tabs 20 times: no signature prompt.
5. [ ] Repeat for B.

Evidence:
- [ ] screen recording or screenshots
- [ ] timestamps of login and sends

## 2) DM Creation (A -> B)
1. [ ] A creates a new DM with B.
2. [ ] Validate DB:
   - [ ] one `conversations` row created (or reused)
   - [ ] two `conversation_participants` rows exist for the conversation
3. [ ] B sees the conversation appear without manual refresh.

Evidence:
- [ ] `conversation_id`
- [ ] screenshot of A list + B list

## 3) Realtime Delivery (A -> B)
SLO targets (local/staging):
- Delivery: < 1s steady state
- Worst-case (reconnect): < 3s

Steps:
1. [ ] A sends message "ping-1".
2. [ ] B receives "ping-1" in realtime.
3. [ ] B sends message "pong-1".
4. [ ] A receives "pong-1" in realtime.
5. [ ] Repeat 10 times with alternating sends.

Evidence:
- [ ] video showing timestamps on both sides
- [ ] optional logs: websocket connected, postgres_changes events received

## 4) Idempotency / Retry
Goal:
- resending the same logical message does not create duplicates.

Steps:
1. [ ] A sends a message with a fixed `client_message_id`.
2. [ ] Force a retry (simulate network error) and resend with the same `client_message_id`.
3. [ ] DB contains exactly one row for that sender + client_message_id.

Evidence:
- [ ] SQL result (row count = 1)

## 5) RLS Negative Tests (Security Gate)
Add a third wallet C.

Steps:
1. [ ] C cannot list A/B conversations.
2. [ ] C cannot read messages in A/B conversation.
3. [ ] C cannot insert a message into A/B conversation.
4. [ ] C does not receive realtime events for A/B conversation.

Evidence:
- [ ] screenshots of 403 errors
- [ ] logs for denied requests

## 6) Multi-Tab Consistency (Same Wallet)
Steps:
1. [ ] Open two tabs as A.
2. [ ] Send a message from tab 1.
3. [ ] Tab 2 shows message without reload.
4. [ ] Close tab 1, tab 2 remains functional.

Evidence:
- [ ] screen recording

## 7) Refresh / Reconnect Recovery
Steps:
1. [ ] A and B in active DM.
2. [ ] Toggle offline (devtools) on B for 10 seconds.
3. [ ] A sends 3 messages.
4. [ ] Bring B online.
5. [ ] B syncs missing messages via delta refetch, no duplicates.

Evidence:
- [ ] screenshot of before/after

## 8) Performance Baseline (DB Query)
Steps:
1. [ ] Populate 500 messages in one conversation.
2. [ ] Load last 50 messages with pagination.
3. [ ] Confirm query uses intended index and responds quickly.

Evidence:
- [ ] `EXPLAIN ANALYZE` output snippet

## 9) Final Evidence Bundle (Production Gate)
- [ ] Migration logs (staging + prod)
- [ ] Addresses/UUIDs redacted but traceable
- [ ] `conversation_id` samples
- [ ] RLS negative test evidence
- [ ] Realtime delivery evidence (video)
- [ ] Bug list (if any) with reproduction steps

