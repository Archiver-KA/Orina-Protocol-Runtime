# ATP2 Phase C / C0 - Baseline Inventory Lock (2026-02-25)

## Status
- `C0`: PASS (doc baseline locked)
- Scope type: `doc/test-only` (khong doi schema/code behavior)
- Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## 1. Muc tieu C0
- Dong bang baseline offchain realtime hien tai truoc khi mo rong `Asset metadata` va `Chat realtime`.
- Liet ke ro:
  - module da hoat dong
  - module hybrid/local-only
  - module con mock/stub
  - helper/backend routes dang dung
- Chot pham vi cho `C1` (rules merge/dedupe/read-state) de tranh sua code lan man.

## 2. Scope Lock (Phase C)
### In scope (Phase C)
- User/profile/preferences/badges offchain persistence + sync
- Community + notifications + social interactions offchain realtime consistency
- Favorites/watchlist/alerts offchain persistence + sync
- Asset metadata subsystem (con thieu, se lam C2/C3)
- Chat realtime subsystem (con thieu/hybrid, se lam C5/C6)

### Out of scope (Phase C)
- Protocol onchain transaction integration (Phase D)
- Contract deployment / address rollout / production onchain write paths

## 3. Baseline Inventory (Current System State)
## 3.1 Core offchain infra (foundation)
### A. Supabase REST + claim bridge
- `src/utils/supabaseRest.ts`
  - REST wrappers: `restSelect`, `restInsert`, `restUpsert`, `restPatch`, `restDelete`
  - auth behavior: uu tien `claim bridge access token`, fallback `anon key`
  - sync event dispatch helper: `dispatchSyncEvent(name)`
- `src/utils/supabaseAuthClaimBridge.ts`
  - H1 claim session exchange (`exchangeWalletAuthForSupabaseClaimSession`)
  - local bridge session cache/token getters
  - cross-wallet backend notification helper (`sendCommunityNotificationViaBridge`)
- `src/utils/walletAuthSession.ts`
  - local wallet auth session store + wallet auth change event

### B. Runtime sync events (`window` events)
Observed event names in code:
- `orina:profile-changed`
- `orina:favorites-changed`
- `orina:community-changed`
- `orina:notifications-changed`
- `orina:notification-preferences-changed`
- `orina:wallet-auth-change`
- `orina:supabase-auth-claim-bridge`
- `orina:guest-mode-change`

Important current behavior:
- `dispatchSyncEvent` chi dispatch `Event(name)` (khong co payload).
- Modules phai `refresh/hydrate` lai tu local/remote khi nghe event.

## 3.2 User / Profile / Preferences / Badges
### Files
- `src/utils/profileUtils.ts`
- `src/contexts/UserContext.tsx`

### Current state
- Hybrid `localStorage + Supabase sync/hydrate`
- Da co helper ensure remote profile id:
  - `ensureRemoteProfileIdForWallet(...)`
- Da co profile/follow related local APIs:
  - `loadUserProfile`, `saveUserProfile`, `updateUserProfile`
  - `followUser`, `unfollowUser`, `isFollowing`
- `UserContext` nghe `orina:profile-changed` de sync UI

### Notes / risks
- Van con mock activity generation APIs trong `profileUtils` (khong blocker C0, se tach scope sau)
- Profile identity path da chot theo claim bridge + H2 owner RLS (Phase B pass)

## 3.3 Favorites / Watchlist / Alerts
### Files
- `src/utils/favoritesUtils.ts`
- `src/app/components/favorites/*`

### Current state
- Hybrid `localStorage + Supabase sync/hydrate`
- Address-based storage migration da co
- Da co sync events (`orina:favorites-changed`)
- Da patch fail-safe de khong bi remote hydrate rong overwrite local optimistic state
- Favorite/watchlist/alert flows da pass trong H3 scope

### Notes / risks
- Asset resolution van phu thuoc mock asset paths cho nhieu UI screens
- C2/C3 can chot metadata adapter de giam phu thuoc `mockAssetData`

## 3.4 Notifications
### Files
- `src/utils/notifications.ts`
- `src/contexts/NotificationContext.tsx`
- `src/app/components/notifications/*`

### Current state
- `notifications` table + H2 owner-scoped RLS da active
- Cross-wallet community notify insert di qua backend bridge route (`service_role`)
- Mark-read / mark-all-read da co remote patch path (`restPatch`) + local persistence
- Local/remote hydrate merge da co patch de:
  - giu `read=true` local khi remote stale
  - tranh duplicate do `source_id/source_type` mismatch (notification moi sau patch)

### Known baseline for Phase C
- Notification center logic co nhieu branch local + remote + backend fanout
- C4 se chot event matrix + dedupe semantics toan bo (community/social/chat)

## 3.5 Community (Posts / Comments / Reactions / Save / Pin view logic)
### Files
- `src/utils/communityUtils.ts`
- `src/app/components/community/enhanced-community.tsx`

### Current state
- Hybrid `localStorage + Supabase sync/hydrate`
- H2 owner-scoped RLS cho write paths (`profiles`, `community_*`) da pass
- H3 da pass cho:
  - post/comment/reply
  - avatar consistency cross-wallet
  - follow notification
  - like/reply notifications (qua backend notify route)
  - `My Saved` feed filter
  - pin visibility logic owner-only

### Mock baseline
- `communityUtils` van con `ensureMockData`, `generateMockPosts`, `generateMockComments` APIs
- Mock comments auto-seed cho thread cu da duoc giam/loai bo trong H3 fix path, nhung API mock van ton tai (co chu dinh de maintain backward compatibility)

## 3.6 Chat / Messages (current hybrid state)
### Files
- `src/app/components/messages.tsx`
- `src/utils/messagesClient.ts`
- `src/utils/conversationUtils.ts`

### Current state (important)
- Chat UI da ton tai va dang hoat dong theo mo hinh hybrid:
  - `messagesClient.ts`: Edge Function messaging API path (`orina-chat-v1` + legacy fallback)
  - `conversationUtils.ts`: localStorage conversation/messages address-based storage
  - `messages.tsx`: van co default conversations/messages (mock) + merge backend/local
- Chua duoc chot theo H1/H2 claim bridge + messaging schema/RLS trong Supabase `public` (messaging truoc day deferred)

### Gap for Phase C
- Chua co messaging schema+RLS final theo ATP2 Supabase path (`conversations/messages/...`)
- Chua co unread/read receipts contract rõ cho 2-browser / 2-wallet
- Chua co event taxonomy/merge rules chuan hoa cho chat

## 3.7 Asset Metadata (current gap)
### Files / evidence
- `src/config/contracts.ts` co protocol/onchain config (khong phai metadata adapter)
- `src/utils/mockAssetData.ts` dang duoc import boi nhieu UI pages (`favorites`, `profile`, `asset-details`, ...)
- Khong thay frontend adapter usage truc tiep cho `assets_catalog/asset_media/asset_tags/asset_tag_map` trong scan hien tai

### Gap summary
- Chua co `asset metadata adapter` (Supabase persisted read/write/sync) duoc dung rong trong UI
- Favorites/watchlist UI van phu thuoc mock asset generation cho phan render metadata
- C2/C3 la batch bat buoc de chuyen mock -> persisted metadata path

## 4. Backend / Function Routes Baseline (Current)
### Active/used for offchain realtime
- Claim bridge + helper routes (deployed under dedicated function):
  - `make-server-b0d68fc8`
  - health + exchange + `community-notify`
- Legacy/parallel chat function path:
  - `orina-chat-v1` (client canonical path in `messagesClient.ts`)
  - fallback legacy `make-server-b0d68fc8/.../messages/*`

### Scope decision locked for C0
- Khong hop nhat route chat vao claim bridge batch nay
- Se xu ly theo `C5/C6` sau khi `C1` chot rules core

## 5. C0 Checkpoint (CP-C0) - Pass Criteria
- [x] Scope Phase C / Phase D boundary da ghi ro
- [x] Inventory da liet ke:
  - user/profile/preferences/badges
  - favorites/watchlist/alerts
  - notifications
  - community
  - asset metadata gap
  - chat hybrid gap
- [x] Runtime sync events baseline da ghi ro
- [x] Backend helper routes baseline da ghi ro
- [x] Chot huong tiep theo: `C1` rules truoc, `C2/C3/C5/C6` sau

## 6. Early-fail signals (for next batches)
- Bat dau sua `Asset metadata` hoac `Chat` truoc khi `C1` rules lock
- Thay doi event names khong cap nhat inventory/spec
- Them remote sync path moi ma khong co dedupe/source identity rule

## 7. Next Batch (C1)
- Tao va khoa `Realtime Core Contract`:
  - event identity
  - source_id/source_type
  - local/remote merge precedence
  - read-state semantics (`read`, `delete`, `archive`)
  - retry/backoff + fallback rules

