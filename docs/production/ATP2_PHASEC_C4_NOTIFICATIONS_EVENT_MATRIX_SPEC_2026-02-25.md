# ATP2 Phase C / C4 - Notifications Event Matrix Optimization Spec (2026-02-25)

## Muc tieu
- Chot ma tran su kien thong bao (community/social + chat-ready hooks) theo dedupe/read-state contract da khoa o `C1`.
- Giam duplicate / mat thong bao / reset unread khong dung logic trong 2-browser / 2-wallet.
- Chuan bi nen cho `C5/C6` (chat realtime) ma khong mo rong schema messaging trong batch nay.

## Invariant
- `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`
- `mark read != delete`
- Dedupe key canonical: `(user_id, source_type, source_id)`
- Cross-wallet create notification persisted phai di qua backend route (`service_role`) neu client actor khong phai owner.

## Pham vi C4
### In scope
- Community / social notification events:
  - follow profile
  - new comment on post
  - reply to comment
  - like post
  - like comment
  - like reply
  - save/bookmark hooks (neu dang hien thi notification)
- Read-state semantics:
  - `mark read`
  - `mark all read`
  - `delete`
  - `clear all`
- Dedupe strategy cho local fallback + backend persisted notification
- Event payload shape standardization de giam mismatch UI labels

### Out of scope (C4)
- Messaging notification events runtime (chi de hook shape cho C6)
- Realtime channel subscription full (neu co se vao C6/C7)
- Thay doi schema lon (chi chinh route/client logic neu can)

## Event Matrix (Canonical)
### Columns
- `event_code`
- `trigger`
- `actor`
- `recipient`
- `source_type`
- `source_id`
- `dedupe_window`
- `persist_path` (`local`, `backend_route`, `service_role`)
- `ui_title`
- `ui_body_template`
- `notes`

### Current target rows (C4)
1. `follow_profile`
2. `community_post_liked`
3. `community_comment_liked`
4. `community_reply_liked`
5. `community_comment_created`
6. `community_reply_created`
7. `community_post_mentioned` (optional hook, no-op if unsupported)
8. `chat_message_received` (placeholder row only, implement later C6)

## Rules (Locked for C4 implementation)
### 1) Dedupe
- Primary dedupe by `(recipient_user_id, source_type, source_id)`
- `source_id` phai deterministic:
  - local fallback va backend persisted phai dung cung ID
- Neu event repeated (same source) thi:
  - update timestamp / merge metadata
  - khong tao row moi

### 2) Read-state merge
- Remote `is_read=true` co uu tien hon local stale `false`
- Local optimistic `is_read=true` duoc giu neu remote chua sync
- `mark read` khong xoa item
- `delete`/`clear` moi loai item khoi list

### 3) Persist path
- Self notifications (owner own writes) co the PATCH truc tiep `notifications` duoi owner-scoped RLS
- Cross-wallet notification create:
  - backend route (`community-notify`) voi `service_role`
- Local fallback duoc phep cho UX instant, nhung phai co source_id deterministic de merge voi row backend

### 4) Payload normalization
- `metadata.action` canonical strings:
  - `follow`
  - `post_like`
  - `comment_like`
  - `reply_like`
  - `post_comment`
  - `comment_reply`
- `metadata.actorAddress` lowercase
- `metadata.targetAddress` lowercase (neu co)

## Deliverables C4
- Event matrix spec (file nay)
- C4 smoke checklist (2-browser / 2-wallet)
- Patch client/backend routes neu can de:
  - source_id deterministic
  - no duplicate / no unread reset / no phantom disappear
- Optional: audit/probe script cho notification merge/dedupe path

## Pass Criteria (CP-C4)
- Event rows trong matrix core (community/social) da duoc map ro rang va test qua
- 2-browser / 2-wallet:
  - khong duplicate thong bao
  - `mark read` khong xoa item
  - `mark read` khong reset unread sau refresh
  - notification moi van den dung recipient cho like/comment/reply/follow
- Khong console/network blocker cho notification core path

## Next after C4
- `C5` messaging schema + RLS
- `C6` chat realtime client (unread/read basics + chat notifications using C4 matrix row)
