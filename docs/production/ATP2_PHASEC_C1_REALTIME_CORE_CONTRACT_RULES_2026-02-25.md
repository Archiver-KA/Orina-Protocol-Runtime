# ATP2 Phase C / C1 - Realtime Core Contract (Merge / Dedupe / Read-State) (2026-02-25)

## Status
- `C1`: LOCKED (spec/checkpoint)
- Scope type: `spec-only` (chua implement C2/C5 code changes)
- Depends on: `C0 PASS`

## 1. Muc tieu C1
- Chot bo quy tac dung chung cho tat ca module offchain realtime truoc khi mo rong:
  - `Asset metadata` (C2/C3)
  - `Chat realtime` (C5/C6)
- Giam rui ro cac loi da gap:
  - duplicate notifications
  - mark-read bi reset sau refresh
  - local optimistic item bi hydrate remote ghi de
  - cross-browser event inconsistency

## 2. Thuat ngu / Canonical Terms
### 2.1 Entity vs Event
- `Entity`: ban ghi persisted trong source-of-truth (Supabase), vi du:
  - profile
  - notification
  - community_post
  - comment
  - reaction
  - message (tuong lai C5/C6)
- `Event`: tac dong/trigger tao thay doi entity (UI action, backend fanout, remote patch)

### 2.2 Identity keys
- `entity_id`: id chinh cua entity persisted (uuid/string/int theo module)
- `logical_key`: key logic dung de dedupe khi `entity_id` chua co (optimistic local)
- `source_type`: namespace event/source (`atp2_app_v1`, `community_like`, `chat_message`, ...)
- `source_id`: id event/nguon sinh ra thay doi (phai on dinh cross-browser neu can dedupe)

## 3. Event Identity Contract (Cross-module)
## 3.1 Mandatory fields for fanout-created notifications
Ap dung cho backend route fanout (vd `community-notify`) va local fallback item:
- `user_id` (receiver profile id)
- `type`
- `source_type`
- `source_id` (stable, client-generated or server-generated but deterministic)

Rule:
- Neu cung `(user_id, source_type, source_id)` => cung 1 logical notification event
- Local fallback va backend persisted ban ghi **phai dung cung `source_id`**

## 3.2 Client-generated ids (optimistic)
Rule chung:
- Client co the tao `temp_*` id cho UI optimistic.
- Khi hydrate remote tra ve persisted row:
  - merge/replace optimistic item neu match `logical_key`
  - khong giu ca 2 item song song

### Suggested logical keys by module
- Notifications:
  - `logical_key = user_id + source_type + source_id`
- Community post/comment:
  - persisted: `id`
  - optimistic: `temp id` + compare by `(author_user_id, content, created_at proximity)` khi can
- Chat message (C6):
  - `client_message_id` (uuid client) phai duoc persist server side
  - dedupe theo `(conversation_id, client_message_id)`

## 4. Merge Contract (Local / Remote / Optimistic)
## 4.1 Merge precedence tiers
### Tier A - Local optimistic (unsynced)
- Uu tien hien thi cao hon remote stale
- Khong bi hydrate remote rong overwrite
- Must carry marker:
  - `sync_status = 'pending' | 'failed' | 'synced'`
  - hoac equivalent local-only flags

### Tier B - Remote persisted (authoritative)
- Uu tien cao hon local cache cho stable persisted fields:
  - server ids
  - timestamps normalized
  - ownership/user_id profile_id refs
  - `is_read` persisted
  - soft-delete flags

### Tier C - Local cache (non-optimistic)
- Dung de bootstrap va fallback khi offline / remote fail
- Co the bi remote overwrite neu khong conflict voi local optimistic/read-state protections

## 4.2 Non-destructive hydrate rule
Hydrate tu remote khong duoc:
- xoa local optimistic items chua sync
- reset read-state tu `true -> false` neu local vua mark-read ma remote chua cap nhat kip
- lam mat items vi remote tra ve tam thoi rong/lac hau

Minimum protections (all modules):
1. Neu remote empty + local non-empty:
- khong wipe ngay neu dang trong sync window / request suspect stale
2. Neu local item `read=true` va remote same logical item `read=false`:
- giu `read=true` (soft precedence) cho den khi remote patch thanh cong hoac refresh tiep theo xac nhan
3. Neu remote item map duoc vao optimistic local item:
- replace merge, khong append duplicate

## 4.3 Delete semantics (separate from read)
- `mark read` != `delete`
- `delete` la thao tac xoa item khoi danh sach
- `clear all` la batch delete (hoac soft-delete) theo module semantics
- UI khong duoc tu dong an item chi vi `read=true`, tru khi filter dang la `Unread only`

## 5. Read-State Contract (Notifications + Chat)
## 5.1 Notification states
Canonical states (Phase C):
- `read=false`, `deleted=false` (unread visible)
- `read=true`, `deleted=false` (read visible)
- `deleted=true` (khong hien trong default list)

Current UI requirement (locked):
- `mark read` giu item visible
- refresh khong duoc reset unread
- delete moi lam mat item

## 5.2 Chat message / conversation read (for C5/C6)
Locked contract ahead of implementation:
- Message-level:
  - `sent` -> `delivered` -> `read` (toi thieu co the collapse thanh `read:boolean` neu server scope chua du)
- Conversation-level:
  - `unread_count` la derived state (khong phai source-of-truth duy nhat)
- `open thread` / `mark as read` phai idempotent

## 6. Dedupe Contract (By Module)
## 6.1 Notifications
Primary dedupe key:
- `(user_id, source_type, source_id)`

Merge policy:
- neu duplicate:
  - giu item co `read=true` neu bat ky ben nao co `read=true`
  - giu timestamp persisted neu co
  - merge text/title/body theo remote persisted, fallback local

## 6.2 Community posts/comments/reactions
Primary keys:
- `id` (persisted)

Optimistic dedupe fallback:
- `temp id` map sang persisted bang heuristics an toan:
  - same actor
  - same content
  - close timestamp
  - same parent/post target

## 6.3 Favorites/watchlist/alerts
Primary logical keys:
- Favorites: `(user_id, asset_id)`
- Watchlist: `(user_id, asset_id)`
- Alerts: `alert.id` persisted; fallback `(user_id, asset_id, alert_type, threshold)`

Hydrate rule:
- remote hydrate khong wipe local-only rows neu asset mapping chua resolve

## 6.4 Chat (C5/C6 target contract)
Primary logical keys (to be enforced in schema/client):
- Conversations:
  - deterministic participant pair/group identity (server-generated)
- Messages:
  - `(conversation_id, client_message_id)`

## 7. Retry / Backoff / Fallback Rules (Phase C)
## 7.1 Write failures
### Auth/RLS blocked (`401/403/42501`)
- Khong spam retry vo han
- Mark local optimistic item:
  - `failed_auth` / `blocked`
- Surface debug log / toast theo severity
- Neu cross-wallet action can backend fanout:
  - route qua backend function (`service_role`) thay vi direct table write

### Connectivity/server failures (`5xx`, network TypeError)
- Retry bounded:
  - immediate 1 retry max for user-triggered lightweight writes
  - then fallback local + schedule refresh
- Khong xoa local data chi vi write fail

## 7.2 Read failures
- Giu local cache state hien tai
- Khong clear list ve empty state
- Log (`console.debug`) + optional non-blocking toast neu user-triggered refresh

## 8. Event Bus Contract (`orina:*`)
## 8.1 Current baseline (locked)
- `dispatchSyncEvent(name)` dispatch `Event(name)` khong payload
- Consumers phai tu reload state (`load...()` + hydrate remote)

## 8.2 Rule for Phase C
- Khong doi event name existing trong C2/C3/C4/C5/C6 neu khong cap nhat inventory/docs
- Neu them event moi:
  - prefix `orina:`
  - ghi vao C0 inventory / need_Fix phase log
- Payload events (CustomEvent) duoc phep sau nay, nhung phai backward-compatible voi listeners cu

## 9. Module Adoption Checklist (ap dung cho C2/C3/C5/C6)
Truoc khi declare batch pass, module moi/phat sinh phai co:
- [ ] source-of-truth table(s) ro rang
- [ ] local cache key(s) ro rang
- [ ] optimistic item marker / temp id strategy
- [ ] dedupe key strategy
- [ ] non-destructive hydrate rule
- [ ] read/delete semantics (neu module co read-state)
- [ ] cross-browser smoke case
- [ ] error fallback (`401/403`, `5xx`, offline)

## 10. C1 Checkpoint (CP-C1) - Pass Criteria
- [x] Event identity contract da chot (`source_type`, `source_id`, logical keys)
- [x] Merge precedence local/remote/optimistic da chot
- [x] Read-state semantics da chot (mark read != delete)
- [x] Dedupe contract cho notifications/community/favorites/watchlist da chot
- [x] Chat target contract (C5/C6) da chot o muc spec
- [x] Retry/backoff/fallback rules da chot
- [x] Event bus rules (`orina:*`) da chot

## 11. Early-fail signals (for C2+)
- Implement metadata/chat ma khong co `logical_key` / temp-id mapping
- Hydrate remote empty xoa local state ngay
- Mark-read path dung `delete-all + reinsert` destructive strategy
- Cross-wallet event fanout van direct write vao owner-scoped table (403 path)

## 12. Next Steps (Post-C1)
- `C2`: Asset metadata adapter + persisted sync foundation
- `C3`: Asset metadata realtime strategy (subscription hoac polling/invalidate)
- `C4`: Notifications event matrix cleanup + dedupe regression suite
- `C5/C6`: Messaging schema+RLS + client realtime implementation

