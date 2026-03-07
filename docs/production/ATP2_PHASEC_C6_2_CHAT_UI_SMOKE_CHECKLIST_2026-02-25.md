# ATP2 Phase C / C6.2 Chat UI Smoke Checklist (2 Browser / 2 Wallet)

Date: 2026-02-25

## Scope
- Validate chat UI/client behavior against C5-backed `orina-chat-v1`
- Verify compatibility after removing `QuickMessageModal` local-only write path
- 2 browsers / 2 wallets:
  - A = `0x282Be18838D7079C215F49749a9606d77e00888b`
  - B = `0x335AD6D59Bc128394dC5A6B176be9Aafe0302aa0`

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Pre-check
- `C5` PASS (`CP-C5` closed)
- `orina-chat-v1` deployed after C6.1 patch
- Local app restarted after latest build
- Both browsers connected with different wallets

## Test Matrix
### 1. Open/Create Conversation (Messages page)
- A opens `Messages`
- A starts chat with B (directly from Messages or quick message entry)
- Expected:
  - conversation appears in A list
  - B sees same conversation after refresh/open

### 2. Quick Message Modal -> Full Thread
- A opens seller/profile quick message modal targeting B
- A sends a message
- App navigates to full conversation
- Expected:
  - sent message appears in thread
  - no duplicate local-only phantom message
  - refreshing thread keeps message

### 3. Send / Receive (A -> B)
- A sends a new text message
- B opens/refetches same thread
- Expected:
  - B sees message content in thread
  - conversation preview / last message updates
  - unread count increases for B before read, then resets after open/mark-read

### 4. Send / Receive (B -> A)
- B replies to A
- A opens/refetches thread
- Expected:
  - A sees reply
  - ordering by timestamp stable
  - no message loss after refresh

### 5. Read / Unread Semantics
- A sends message to B
- B confirms unread badge/list count > 0
- B opens thread (or uses mark as read)
- Expected:
  - unread count for B returns to 0
  - after refresh, unread does not reappear

### 6. Conversation Metadata / Participant Mapping
- Check conversation row display for A and B
- Expected:
  - participants are the two wallet addresses only
  - counterpart displayName/avatar metadata resolves (if profile exists)
  - no crash if metadata missing

### 7. Delete Conversation (Per-user removal behavior)
- A deletes conversation from list
- Expected:
  - conversation disappears from A list
  - B still retains conversation (current C6 compatibility behavior)
- Note:
  - This is per-user participant-row removal, not global delete

## Fail Signals (stop and report first error)
- `500` from `/functions/v1/orina-chat-v1/messages/*`
- message sent but disappears after refresh
- quick message modal writes local-only and does not show in full thread
- unread count resets incorrectly after refresh
- A can see B-only deleted state unexpectedly (or vice versa) beyond documented behavior

## Evidence to Capture (if fail)
- Browser (`A` or `B`)
- Action being performed
- Network request URL + status + response JSON
- Console error (first error only)

## Pass Criteria (`CP-C6` prep baseline)
- Core chat send/receive/read flows pass for 2 browsers / 2 wallets
- Quick Message modal path and Messages page path are consistent
- No data loss after refresh/reopen for tested flows
