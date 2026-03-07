# ATP2 Phase C / C4 - Notifications Event Matrix Smoke Checklist (2026-02-25)

## Muc tieu
- Validate community/social notification matrix theo `C4` spec trong boi canh 2-browser / 2-wallet.

## Pre-check
- `CP-C3` PASS (asset metadata realtime baseline)
- H1/H2 bridge + owner-scoped RLS dang hoat dong
- `make-server-b0d68fc8` function da deploy
- 2 browser / 2 wallet:
  - A = `0x282Be18838D7079C215F49749a9606d77e00888b`
  - B = `0x335AD6D59Bc128394dC5A6B176be9Aafe0302aa0`

## Test Matrix (Core)
### 1. Follow
1. A follow B
2. B refresh
3. Ky vong: 1 notification `follow_profile`, khong duplicate

### 2. Post Like
1. B like post cua A
2. A refresh
3. Ky vong: 1 notification `community_post_liked`

### 3. Comment Like
1. B like comment cua A
2. A refresh
3. Ky vong: 1 notification `community_comment_liked`

### 4. Reply Like
1. B like reply cua A
2. A refresh
3. Ky vong: 1 notification `community_reply_liked`

### 5. New Comment on Post
1. B comment vao post cua A
2. A refresh
3. Ky vong: 1 notification `community_comment_created`

### 6. Reply to Comment
1. B reply vao comment cua A
2. A refresh
3. Ky vong: 1 notification `community_reply_created`

## Read/Delete Semantics
### 7. Mark one as read
1. A mark read 1 notification
2. Refresh A
3. Ky vong: item van con, state `read`, khong bat lai `unread`

### 8. Mark all as read
1. A mark all read
2. Refresh A
3. Ky vong: tat ca item van con, unread badge = 0

### 9. Delete
1. A delete 1 notification
2. Refresh A
3. Ky vong: item bi xoa, khong quay lai

## Dedupe / Repeat-trigger checks
### 10. Repeat same action
1. Trigger lai cung event tren cung target (neu UI cho phep)
2. Refresh recipient
3. Ky vong: khong duplicate row voi cung `(source_type, source_id)`; cho phep update timestamp

## Early-fail Signals
- 403/401 tren `notifications` owner read/write path cua chinh user
- `community-notify` route fail / 5xx
- Notification mat sau `mark read` (khong delete)
- Duplicate notification cung noi dung do local+backend merge fail

## Log ket qua
- Cap nhat:
  - `docs/production/need_Fix.md`
  - `docs/production/ATP2_OFFCHAIN_REALTIME_COMPLETION_SPEC_2026-02-25.md`
- Neu pass:
  - danh dau `CP-C4` PASS
  - chuyen sang `C5` (Messaging schema + RLS)
