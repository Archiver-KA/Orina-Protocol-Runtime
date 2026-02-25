Dưới đây là bản `ATP2 Schema Spec S1-S4 (document-only)` để bạn copy sang ATP2. Mình viết theo hướng **source-of-truth cho ATP2**, kèm roadmap và “state cần nhớ” để mở session mới không bị lệch nữa.

---

# ATP2 Supabase Schema Spec S1-S4 (Source of Truth)
**Project:** ATP2 (`C:\ORINA\ATPProtocol2\ATP2`)  
**Spec Version:** v1.0  
**Date:** 2026-02-24  
**Status:** Draft for ATP2 Rebuild/Realignment (Document-first)

**Batch invariant (giữ nguyên trong tài liệu):** format batch: phạm vi hẹp, checklist chốt rõ, test sau từng bước.

## 0) Mục tiêu
Thiết lập lại nền dữ liệu Supabase cho ATP2 theo hướng:
- schema-first
- tách rõ `wallet truth` / `user_id` / `user_ui`
- hỗ trợ roadmap realtime toàn hệ
- tránh lặp lỗi migration history do drift giữa repo

## 1) Nguyên tắc kiến trúc (bắt buộc)
### 1.1 Identity truth hierarchy
1. `wallet_address` = truth identity  
2. `user_id` (UUID) = internal surrogate / recovery handle  
3. `user_ui` = derived cache only (không dùng làm auth/realtime truth)

### 1.2 Tách lớp dữ liệu
- `S1`: Auth/session backend
- `S2`: User/profile + asset metadata (off-chain)
- `S3`: Social/app data (favorites/watchlist/notifications/messages/community)
- `S4`: Protocol read-model scaffold (orders/assets/events) — chưa ràng buộc logic cuối cùng

### 1.3 Không trộn metadata và protocol state
- `assets_catalog` = metadata/UI catalog
- `protocol_*` = on-chain read model/indexed state

---

## 2) S1 — Auth & Session Schema (Wallet auth backend foundation)
### 2.1 `wallet_auth_challenges`
Dùng cho nonce/challenge sign-in.

**Fields**
- `id uuid pk`
- `wallet_address text not null` (lowercase)
- `nonce text not null unique`
- `message text not null`
- `expires_at timestamptz not null`
- `used_at timestamptz null`
- `created_at timestamptz default now()`
- `ip_hash text null`
- `user_agent_hash text null`

**Indexes**
- `(wallet_address)`
- `(expires_at)`
- unique `(nonce)`

**Notes**
- nonce one-time use
- challenge TTL ngắn (ví dụ 5 phút)

### 2.2 `wallet_sessions`
App-level wallet session sau verify signature.

**Fields**
- `id uuid pk`
- `wallet_address text not null` (lowercase)
- `session_token_hash text not null unique`
- `created_at timestamptz default now()`
- `expires_at timestamptz not null`
- `revoked_at timestamptz null`
- `last_seen_at timestamptz null`
- `device_label text null`
- `ip_hash text null`
- `user_agent_hash text null`

**Indexes**
- `(wallet_address)`
- `(expires_at)`

**Notes**
- không lưu raw token
- revoke on disconnect
- refresh token rotate single-use (nếu áp dụng)

---

## 3) S2 — User + Asset Metadata Core
> ATP2 đã có `profiles` baseline trong một số schema cũ; ưu tiên **reuse** nếu có, không tạo `users` mới nếu gây conflict.

### 3.1 `profiles` (canonical user profile table for ATP2)
Nếu ATP2 đã có `profiles`, chuẩn hóa shape theo spec này (thêm cột thiếu nếu cần).

**Core fields**
- `id uuid pk`
- `wallet_address text unique not null` (lowercase)
- `display_name text`
- `username citext unique null`
- `bio text`
- `avatar_url text`
- `banner_url text`
- `avatar_type text`
- `website text`
- `twitter text`
- `discord text`
- `telegram text`
- `is_verified boolean default false`
- `status text default 'active'`
- `created_at timestamptz`
- `updated_at timestamptz`

**Rules**
- `wallet_address` là identity truth
- `username` unique nullable
- `status` check in (`active`, `suspended`, `deleted`)

### 3.2 `user_preferences`
Per-user settings / UI preferences.

**Fields**
- `user_id uuid pk references profiles(id) on delete cascade`
- `notification_settings jsonb default '{}'`
- `ui_preferences jsonb default '{}'`
- `privacy_settings jsonb default '{}'`
- `updated_at timestamptz`

### 3.3 `user_badges`
Badge/achievement metadata.

**Fields**
- `id uuid pk`
- `user_id uuid references profiles(id)`
- `badge_key text not null`
- `metadata jsonb default '{}'`
- `awarded_at timestamptz default now()`
- unique `(user_id, badge_key)`

### 3.4 `assets_catalog` (off-chain metadata catalog)
**Canonical metadata table for ATP2 UI**

**Fields**
- `id uuid pk`
- `asset_uid text unique not null` (app canonical id, e.g. `asset-001`)
- `title text not null`
- `slug text unique null`
- `category text`
- `subcategory text`
- `description text`
- `cover_image_url text`
- `gallery_images jsonb default '[]'`
- `attributes jsonb default '{}'`
- `metadata jsonb default '{}'`
- `seller_user_id uuid references profiles(id) on delete set null`
- `contract_address text null`
- `token_id text null`
- `chain_id bigint null`
- `is_active boolean default true`
- `metadata_version integer default 1`
- `created_at timestamptz`
- `updated_at timestamptz`

**Indexes**
- `(category)`
- `(seller_user_id)`
- `(is_active)`
- `(contract_address, token_id)`

### 3.5 `asset_media`
Normalized media rows if needed.

**Fields**
- `id uuid pk`
- `asset_id uuid references assets_catalog(id) on delete cascade`
- `media_type text` (`image`, `video`, `document`)
- `url text`
- `sort_order int default 0`
- `metadata jsonb default '{}'`
- `created_at timestamptz`

### 3.6 `asset_tags` / `asset_tag_map`
**asset_tags**
- `id uuid pk`
- `tag text unique`

**asset_tag_map**
- `asset_id uuid references assets_catalog(id)`
- `tag_id uuid references asset_tags(id)`
- PK `(asset_id, tag_id)`

---

## 4) S3 — Social / App Data
### 4.1 `user_follows`
- `follower_user_id uuid references profiles(id)`
- `following_user_id uuid references profiles(id)`
- `created_at timestamptz`
- PK `(follower_user_id, following_user_id)`
- no self-follow check

### 4.2 `user_favorites`
- `user_id uuid references profiles(id)`
- `asset_id uuid references assets_catalog(id)`
- `created_at timestamptz`
- `metadata jsonb default '{}'`
- PK `(user_id, asset_id)`

### 4.3 `user_watchlist`
- `user_id uuid references profiles(id)`
- `asset_id uuid references assets_catalog(id)`
- `created_at timestamptz`
- `notes text null`
- `metadata jsonb default '{}'`
- PK `(user_id, asset_id)`

### 4.4 `watchlist_alerts`
- `id uuid pk`
- `user_id uuid references profiles(id)`
- `asset_id uuid references assets_catalog(id)`
- `alert_type text`
- `threshold_value numeric null`
- `payload jsonb default '{}'`
- `is_active boolean default true`
- `is_read boolean default false`
- `created_at timestamptz`
- `updated_at timestamptz`

### 4.5 `notifications`
- `id uuid pk`
- `user_id uuid references profiles(id)`
- `type text not null`
- `title text null`
- `body text null`
- `payload jsonb default '{}'`
- `source_type text null` (`community`, `order`, `system`, ...)
- `source_id text null`
- `is_read boolean default false`
- `created_at timestamptz`
- `read_at timestamptz null`

**Indexes**
- `(user_id, created_at desc)`
- `(user_id, is_read)`

### 4.6 Community tables (if not already existing / unify baseline)
#### `community_posts`
- `id uuid pk`
- `author_user_id uuid references profiles(id)`
- `content text`
- `media jsonb default '[]'`
- `poll jsonb null`
- `visibility text default 'public'`
- `metadata jsonb default '{}'`
- `created_at`
- `updated_at`
- `deleted_at null`

#### `community_comments`
- `id uuid pk`
- `post_id uuid references community_posts(id)`
- `author_user_id uuid references profiles(id)`
- `parent_comment_id uuid null references community_comments(id)`
- `content text`
- `metadata jsonb default '{}'`
- `created_at`
- `updated_at`
- `deleted_at null`

#### `community_reactions`
- `user_id uuid references profiles(id)`
- `target_type text` (`post`,`comment`)
- `target_id uuid`
- `reaction_type text` (`like`,`bookmark`,...)
- `created_at`
- PK `(user_id, target_type, target_id, reaction_type)`

### 4.7 Messaging tables (if ATP2 keeps Supabase-based messaging path later)
> **Status (2026-02-24): Deferred / làm cuối cùng.** Giữ spec này để dùng cho batch messaging sau, không nằm trong D1/D2 hiện tại.
#### `conversations`
- `id uuid pk`
- `type text default 'direct'`
- `title text null`
- `metadata jsonb default '{}'`
- `created_at`
- `updated_at`

#### `conversation_participants`
- `conversation_id uuid references conversations(id)`
- `user_id uuid references profiles(id)`
- `role text default 'member'`
- `joined_at`
- `last_read_at null`
- PK `(conversation_id, user_id)`

#### `messages`
- `id uuid pk`
- `conversation_id uuid references conversations(id)`
- `sender_user_id uuid references profiles(id)`
- `body text`
- `attachments jsonb default '[]'`
- `metadata jsonb default '{}'`
- `created_at`
- `edited_at null`
- `deleted_at null`

**Index**
- `(conversation_id, created_at desc)`

---

## 5) S4 — Protocol Read-Model Scaffold (event-driven, deploy scaffold only)
> Đây là scaffold để không phải đổi schema lớn khi hoàn thiện order/NFT flow sau.

### 5.1 `protocol_assets`
- `id uuid pk`
- `chain_id bigint not null`
- `asset_contract text not null`
- `token_id text not null`
- `owner_address text null`
- `status text null`
- `available_amount numeric null`
- `total_amount numeric null`
- `metadata jsonb default '{}'`
- `created_at`
- `updated_at`
- unique `(chain_id, asset_contract, token_id)`

### 5.2 `protocol_asset_events`
- `id uuid pk`
- `protocol_asset_id uuid references protocol_assets(id)`
- `event_name text`
- `chain_id bigint`
- `tx_hash text`
- `log_index integer`
- `block_number bigint`
- `block_time timestamptz null`
- `payload jsonb default '{}'`
- `created_at`
- unique `(chain_id, tx_hash, log_index)`

### 5.3 `protocol_orders`
- `id uuid pk`
- `order_uid text unique not null` (canonicalized on-chain order id)
- `chain_id bigint not null`
- `marketplace_contract text not null`
- `asset_contract text null`
- `asset_token_id text null`
- `buyer_address text null`
- `seller_address text null`
- `status text not null`
- `amount numeric null`
- `price_per_unit numeric null`
- `total_value numeric null`
- `currency_symbol text null`
- `metadata jsonb default '{}'`
- `created_at`
- `updated_at`

### 5.4 `protocol_order_events`
- `id uuid pk`
- `order_id uuid references protocol_orders(id)`
- `event_name text`
- `chain_id bigint`
- `tx_hash text`
- `log_index integer`
- `block_number bigint`
- `block_time timestamptz null`
- `payload jsonb default '{}'`
- `created_at`
- unique `(chain_id, tx_hash, log_index)`

### 5.5 `asset_protocol_links`
Bridge table giữa metadata catalog và on-chain asset identity.
- `asset_id uuid references assets_catalog(id)`
- `chain_id bigint`
- `contract_address text`
- `token_id text`
- `link_type text default 'primary'`
- `created_at`
- PK `(asset_id, chain_id, contract_address, token_id)`

---

## 6) RLS Policy Matrix (v1 practical)
## 6.1 Public read (anon allowed, filtered if needed)
- `profiles` (public profile fields only)
- `assets_catalog` (active assets)
- `asset_media`
- `asset_tags`
- `asset_tag_map`
- `community_posts` (public visibility)
- `community_comments`
- `protocol_*` tables (when enabled, read-only)

## 6.2 User-owned read/write (authenticated app session / backend-mediated)
- `user_preferences`
- `user_follows` (follower side)
- `user_favorites`
- `user_watchlist`
- `watchlist_alerts`
- `notifications` (own only)
- `conversations`, `conversation_participants`, `messages` (participants only; **deferred for current track**)
- `community_posts/comments/reactions` (owner/user write rules)

## 6.3 Backend/service role only writes (v1)
- `wallet_auth_challenges`
- `wallet_sessions`
- `user_badges`
- `protocol_*`
- optional admin writes to `assets_catalog`

---

## 7) Migration Rollout Order (ATP2 canonical)
## D1 — Core migration pack (schema only)
1. `000001` ATP2 base alignment (if needed / existing schema normalize)
2. `S1` wallet auth/session
3. `S2` user + asset metadata core
4. `S3` social/app data
5. `S4` protocol read-model scaffold

## D2 — RLS & indexes finalize
- policy migrations
- index optimization migrations
- triggers (`updated_at`) migration

## D3 — Data seed / bootstrap (optional)
- seed asset categories/tags
- seed mock metadata for dev

---

## 8) Deployment Strategy (to avoid old errors)
## Option A (recommended): New Supabase project for ATP2
Pros:
- clean migration history
- no `migration repair` legacy debt
- ATP2 becomes source-of-truth from day 1

Cons:
- reconfigure keys/endpoints in ATP2
- migrate any existing data if needed

## Option B: Reuse current project `azimhqpsjgxbmjlxaghp`
Pros:
- keep existing data and deployed functions
Cons:
- requires migration history normalization first
- higher risk of drift/conflicts

**Recommendation:** Use **Option A** if possible.

---

## 9) Cutover / Rollback Principles
### 9.1 Cutover
- schema first
- backend auth functions
- app read-through adapters
- app dual-write
- then switch source-of-truth reads
- finally remove legacy writes

### 9.2 Rollback
- never drop legacy path in same batch as first cutover
- keep dual-write for one stabilization phase
- keep feature flags / env toggles where possible
- snapshot DB before destructive migrations

---

## 10) Runtime Ownership Rules (must be enforced in app)
1. `wallet_address` must match session wallet before any realtime subscribe
2. `user_id` may be used only after wallet ownership/session validation
3. `auth_pending` is:
   - allowed for social/profile writes (per ATP2 UX decision)
   - denied for protocol actions (mint/order/dispute)
4. `user_ui` is render cache, not auth/realtime truth

---

## 11) Test Gates (must pass before moving phase)
## S1 Gate (Auth/session backend)
- challenge create/consume works
- verify invalid signature fails
- refresh rotate works
- revoked/expired session denied

## S2 Gate (Profile + metadata)
- connect permission -> profile hydration from Supabase
- edit profile save -> persist + reload stable
- header/avatar sync after connect permission

## S3 Gate (favorites/notifications/community/messages data)
- favorite/watchlist persist reload
- notifications read/write persist
- no cross-wallet leakage
- community write ownership correct
- messages ownership correct (when enabled / deferred current track)

## S4 Gate (protocol scaffold)
- schema deploys clean
- no UI dependency switched yet unless event indexer ready

---

# ATP2 Rebuild / Re-alignment Roadmap (High-level)
## Phase D0 — Spec (document-only)
- Create/approve this schema spec
- Approve deployment strategy (new project vs reuse current)

## Phase D1 — ATP2 migrations (schema source-of-truth)
- Implement clean ATP2 migrations S1-S4 from this spec
- No deploy yet
- SQL review pass

## Phase D2 — Supabase deploy (controlled)
- Deploy migrations to chosen Supabase project
- Run SQL smoke checks after each stage
- Deploy backend auth function(s)

## Phase D3 — App integration (batch-based)
1. User/Profile read-through + save dual-write
2. Favorites/Watchlist
3. Notifications (read-through before realtime)
4. Community data
5. Chat data/auth alignment
6. Protocol read-model integration later

## Phase D4 — Realtime rollout (separate roadmap)
- Notifications realtime (fix/verify)
- Chat realtime canonicalization
- Community realtime
- Remove old APIs after cutover proof

---

# Những gì cần nhớ để mở session mới (ATP2) không bị lệch
## 1) Repo truth
- **App chính:** `C:\ORINA\ATPProtocol2\ATP2`
- **OneDrive repo:** chỉ là nháp/reference cho các batch đã lỡ làm

## 2) Supabase runtime reality
- Supabase project `azimhqpsjgxbmjlxaghp` đã bị thay đổi từ OneDrive source
- Không assume ATP2 source hiện tại phản ánh đúng runtime

## 3) Identity rule (không được quên)
- `wallet_address` = truth
- `user_id` = surrogate
- `user_ui` = derived cache

## 4) UX auth rule ATP2 (đã chốt)
- `Connect permission` mở social/profile layer
- `Auth signature` chỉ cho protocol actions
- `auth_pending` phải được xử lý như “connected UI user, not protocol-authenticated”

## 5) Realtime status hiện tại
- Notifications push-based thử nghiệm **chưa pass A/B** (deferred)
- Chat realtime chưa chốt; active chat path vẫn legacy REST/KV trong ATP2
- Không vá nhỏ realtime trước khi audit/cutover plan

## 6) Cách làm đúng từ session mới
- Bắt đầu bằng `D0/D1` (schema/spec + migrations ATP2)
- Không deploy/push patch app từ ATP2 trước khi migrations ATP2 được tạo và review
- Mọi phase xong phải ghi log vào tài liệu roadmap (time + reason + changes)

---

# Gợi ý checklist khởi động session mới (ATP2)
1. Xác nhận workspace đang ở `C:\ORINA\ATPProtocol2\ATP2`
2. Tạo tài liệu này vào `docs/production/ATP2_SUPABASE_SCHEMA_SPEC_S1_S4_2026-02-24.md`
3. Chọn strategy:
   - New Supabase project (recommended)
   - hoặc reuse current project + normalization plan
4. Bắt đầu `D1`:
   - tạo migration pack ATP2 sạch theo spec
5. Review SQL + test schema locally (nếu có local stack)
6. Mới sang deploy

---

Nếu bạn muốn, trong session mới ở ATP2 mình có thể bắt đầu ngay bằng `Batch D1 (ATP2 migration pack S1-S4, no deploy)` theo đúng format batch: phạm vi hẹp, checklist chốt rõ, test sau từng bước.

---

# 12) D1 Implementation Conventions (để viết migration không lệch spec)
## 12.1 SQL extensions (install sớm trong pack)
- `pgcrypto` (cho `gen_random_uuid()`)
- `citext` (cho `profiles.username`)

## 12.2 Naming conventions
- Table names: `snake_case`, số nhiều cho collection tables (`profiles`, `notifications`, `messages`)
- PK column mặc định: `id uuid primary key default gen_random_uuid()`
- FK columns:
  - tới `profiles.id` dùng tên `*_user_id`
  - tới `assets_catalog.id` dùng tên `asset_id`
- Timestamp columns:
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()` (nếu table mutable)

## 12.3 Lowercase wallet rule (bắt buộc)
- Mọi cột wallet/address dùng `text`
- App/backend phải normalize lowercase trước khi ghi
- DB nên có check tối thiểu cho các cột identity chính:
  - `wallet_auth_challenges.wallet_address = lower(wallet_address)`
  - `wallet_sessions.wallet_address = lower(wallet_address)`
  - `profiles.wallet_address = lower(wallet_address)`
- Với `protocol_*` address fields có thể deferred check ở v1 (vì indexer source có thể chưa normalize đồng nhất)

## 12.4 JSONB defaults (chuẩn hóa)
- object payload/settings/metadata: `jsonb not null default '{}'::jsonb`
- array payload/media/gallery: `jsonb not null default '[]'::jsonb`

## 12.5 Soft delete policy
- Chỉ soft delete cho social/content tables cần audit UX:
  - `community_posts.deleted_at`
  - `community_comments.deleted_at`
  - `messages.deleted_at`
- Các join table (`user_favorites`, `asset_tag_map`, `user_follows`) dùng hard delete

---

# 13) Constraint & Check Matrix (v1 practical, đủ chặt để tránh dirty data)
## 13.1 Required checks
### `profiles`
- `status in ('active','suspended','deleted')`
- `wallet_address <> ''`

### `asset_media`
- `media_type in ('image','video','document')`

### `community_posts`
- `visibility in ('public','followers','private')`

### `community_reactions`
- `target_type in ('post','comment')`

### `conversations`
- `type in ('direct','group','system')`

### `wallet_auth_challenges`
- `expires_at > created_at`
- `used_at is null or used_at >= created_at`

### `wallet_sessions`
- `expires_at > created_at`
- `revoked_at is null or revoked_at >= created_at`

## 13.2 Uniqueness rules (restate for migration review)
- `profiles.wallet_address` unique
- `profiles.username` unique nullable (via `citext`)
- `wallet_auth_challenges.nonce` unique
- `wallet_sessions.session_token_hash` unique
- `assets_catalog.asset_uid` unique
- `assets_catalog.slug` unique nullable
- `user_badges (user_id, badge_key)` unique
- `protocol_assets (chain_id, asset_contract, token_id)` unique
- `protocol_asset_events (chain_id, tx_hash, log_index)` unique
- `protocol_orders.order_uid` unique
- `protocol_order_events (chain_id, tx_hash, log_index)` unique

## 13.3 Composite PKs (join tables)
- `asset_tag_map (asset_id, tag_id)`
- `user_follows (follower_user_id, following_user_id)`
- `user_favorites (user_id, asset_id)`
- `user_watchlist (user_id, asset_id)`
- `conversation_participants (conversation_id, user_id)`
- `asset_protocol_links (asset_id, chain_id, contract_address, token_id)`

---

# 14) Trigger / Function Standards (D2 finalize nhưng define từ D1)
## 14.1 `set_updated_at()` trigger function
Tạo một function dùng chung để tránh copy logic.

**Applies to**
- `profiles`
- `user_preferences`
- `assets_catalog`
- `watchlist_alerts`
- `community_posts`
- `community_comments`
- `conversations`
- `protocol_assets`
- `protocol_orders`

## 14.2 Optional helper triggers (v2 / only if needed)
- `normalize_wallet_address_columns()`:
  - có thể dùng cho `profiles`, `wallet_*`
  - chỉ thêm nếu backend chưa đảm bảo normalize
- `touch_conversation_updated_at_on_message_insert()`:
  - useful cho inbox sorting
  - có thể defer sang D3 nếu chưa dùng chat Supabase

---

# 15) Realtime & Replication Notes (để rollout D4 không phải sửa schema lớn)
## 15.1 Candidate tables for realtime first
- `notifications`
- `community_comments`
- `community_reactions`
- `messages` (deferred; chỉ xét sau khi messaging batch được triển khai)

## 15.2 Realtime identity safety rule
- Client subscribe channel phải filter theo `wallet_address`-validated `user_id`
- Không subscribe theo `user_ui` cache key

## 15.3 Replica identity guidance (when enabling realtime updates/deletes)
- Cân nhắc `REPLICA IDENTITY FULL` cho:
  - `notifications`
  - `messages`
  - `watchlist_alerts`
- Chỉ bật khi cần update/delete payload đầy đủ trong client

---

# 16) D1 Migration Pack Layout (canonical file plan, no deploy)
## 16.1 Suggested file sequence
1. `000001_extensions_and_base.sql`
2. `000002_s1_wallet_auth_sessions.sql`
3. `000003_s2_profiles_and_assets.sql`
4. `000004_s3_social_community.sql`
5. `000005_s4_protocol_read_models.sql`
6. `000006_shared_indexes.sql` (optional if muốn tách)

## 16.2 What each file should contain
### `000001_extensions_and_base.sql`
- `create extension if not exists pgcrypto;`
- `create extension if not exists citext;`
- shared helper function stub (optional D1, mandatory by D2)

### `000002_s1_wallet_auth_sessions.sql`
- create `wallet_auth_challenges`
- create `wallet_sessions`
- add indexes + checks

### `000003_s2_profiles_and_assets.sql`
- detect/reconcile existing `profiles` strategy:
  - if table exists in target: use alter-only migration variant
  - if new project: create canonical table directly
- create `user_preferences`, `user_badges`
- create `assets_catalog`, `asset_media`, `asset_tags`, `asset_tag_map`

### `000004_s3_social_community.sql`
- create follows/favorites/watchlist/alerts/notifications
- create community tables
- **không** tạo messaging tables trong D1 hiện tại (defer, làm cuối cùng)
- messaging sẽ đi batch riêng sau khi S1/S2/S3 (social/community) ổn định

### `000005_s4_protocol_read_models.sql`
- create `protocol_assets`, `protocol_asset_events`
- create `protocol_orders`, `protocol_order_events`
- create `asset_protocol_links`

## 16.3 Important migration rule (ATP2)
- Không trộn D1 schema creation với RLS policy SQL trong cùng file nếu có thể
- Không drop/rename destructive objects trong batch đầu nếu chưa có snapshot/cutover plan
- Nếu reuse project cũ: chuẩn bị **normalization migration** riêng trước `000001`

---

# 17) SQL Smoke Checks (run after D2 deploy)
## 17.1 Schema existence
- Kiểm tra tất cả table S1-S4 đã tồn tại đúng schema (`public`)
- Kiểm tra PK/UK/FK/index chính đã tạo đủ

## 17.2 Insert/read smoke (minimal)
- Create challenge -> mark used -> ensure second consume rejected (app/backend logic)
- Create profile by `wallet_address` -> upsert same wallet stable
- Insert asset metadata + favorite -> join read works
- Insert notification -> mark read -> query unread count works
- Insert protocol asset + event -> uniqueness `(chain_id, tx_hash, log_index)` enforced

## 17.3 Ownership/RLS smoke (when policies enabled)
- user A không đọc/ghi `user_preferences` của user B
- user A không mark read notification của user B
- participant-only read cho `messages`
- anon chỉ đọc public/community allowed rows

---

# 18) Decisions To Lock Before D1/D2 (current selections)
## 18.1 Supabase project target
- **Selected (2026-02-24): `Option A` new Supabase project**
- `Option B` reuse `azimhqpsjgxbmjlxaghp` chỉ dùng nếu phát sinh nhu cầu giữ data/runtime cũ và có normalization plan

## 18.2 Messaging in scope?
- **Selected (2026-02-24): Defer messaging (làm cuối cùng)**
- D1/D2 hiện tại chỉ gồm S1 + S2 + S3 (social/community + notifications) + S4 scaffold
- `conversations`, `conversation_participants`, `messages` sẽ tách thành batch sau

## 18.3 `profiles.id` source strategy
- `UUID generated by app/backend` (custom wallet session stack)
- hoặc map/bridge với `auth.users.id` (nếu về sau adopt Supabase Auth chính thức)

## 18.4 `protocol_*` strictness v1
- address normalization checks ngay từ đầu
- hoặc accept raw indexer inputs v1, normalize in ingestion layer

---

# 19) Ready-to-Start D1 Batch Definition (for next working session)
## Scope
- Tạo migration pack `S1-S4` cho ATP2 theo spec này
- Messaging deferred (làm cuối cùng; không nằm trong D1 hiện tại)
- `No deploy`, `no app integration`, `no realtime rollout`

## Deliverables
- SQL migration files (D1 only)
- Short review note: tables/constraints/indexes created
- Local validation notes (syntax/build if local stack available)
- format batch: phạm vi hẹp, checklist chốt rõ, test sau từng bước.

## Done criteria
- File order rõ ràng, chạy tuần tự được trên empty DB (Option A path)
- Có phương án reconcile `profiles` nếu target là existing project (Option B note)
- Không có policy SQL/RLS lẫn vào D1 (trừ khi được chốt khác)
- Messaging chưa được đưa vào D1; giữ riêng batch cuối

---

# 20) Batch Execution Log (ATP2 <-> `vcixsdudkizgfikhmfuv`)
> format batch: phạm vi hẹp, checklist chốt rõ, test sau từng bước.

## Batch 0 — Preflight / Access Path (CLI login + link)
**Scope**
- Xác nhận đường truy cập Supabase CLI ổn định
- Link ATP2 workspace tới project mới `vcixsdudkizgfikhmfuv`
- Không deploy schema/app

**Checklist**
- `supabase login` bằng PAT (`sbp_...`) thành công
- `supabase orgs list` / `supabase projects list` trả dữ liệu
- `supabase link --project-ref vcixsdudkizgfikhmfuv` thành công
- xác nhận `supabase/.temp/project-ref = vcixsdudkizgfikhmfuv`

**Tests**
- CLI management API read (`orgs list`, `projects list`, `projects api-keys`)
- workspace link check (`supabase/.temp/project-ref`)

**Status**
- ✅ PASS

**Notes**
- Trước đó đã fail do nhầm loại token/PAT; sau khi dùng đúng PAT `sbp_...` thì CLI path ổn định
- DB password/direct connection path vẫn không ổn định cho local Node audit scripts (không block Batch 1 deploy qua CLI)

## Batch 1 — D1 Schema Deploy (S1/S2/S3 social-community/S4, no messaging)
**Scope**
- Deploy D1 migration pack lên `vcixsdudkizgfikhmfuv`
- Không messaging tables
- Không app deploy, không realtime rollout

**Commands**
- `npx supabase db push --yes`

**Checklist**
- linked project đúng `vcixsdudkizgfikhmfuv`
- D1 pack gồm `000001..000006`
- `db push` apply lần lượt từng file không lỗi

**Tests (post-batch, phát hiện lỗi sớm)**
- `supabase inspect db index-stats` (linked project) -> thấy đầy đủ indexes D1
- `supabase inspect db table-stats` (linked project) -> thấy đầy đủ tables D1
- verifier artifacts:
  - `supabase/audit/batch1_expected_tables_from_index_stats.json`
  - `supabase/audit/batch1_expected_tables_from_table_stats.json`

**Result**
- ✅ PASS
- `expected_missing = []` (verified via `table-stats` parser: `22/22` tables present)

**Observed notes**
- `000001_extensions_and_base.sql`: `pgcrypto` đã tồn tại (NOTICE, expected)
- Local direct/pooler SQL runner vẫn fail auth do DB password/raw connection mismatch path; không ảnh hưởng `supabase db push`

## Batch 2 — Smoke SQL (transaction + rollback, no messaging)
**Scope**
- Test sớm D1 schema/constraints bằng SQL transaction, sau đó `ROLLBACK`
- Không giữ test data
- Không messaging

**Deliverable**
- `supabase/audit/batch2_smoke_d1_transaction_rollback.sql`

**What it tests**
- D1 expectation: messaging deferred (không có `conversations/messages/*`)
- `citext` extension tồn tại
- `profiles` upsert + lowercase wallet check + `citext` username unique (case-insensitive)
- S1 unique/checks (`wallet_auth_challenges`, `wallet_sessions`)
- S2 core FK/PK/unique (`assets_catalog`, `asset_media`, tags/map, `user_preferences`, `user_badges`)
- S3 social/community core (`user_follows`, favorites, watchlist, alerts, notifications, posts/comments/reactions`)
- S4 protocol scaffold + event uniqueness + asset/order links
- `ROLLBACK` cuối script để sạch DB

**How to run**
- Run in Supabase SQL Editor on project `vcixsdudkizgfikhmfuv`
- Paste file `supabase/audit/batch2_smoke_d1_transaction_rollback.sql`
- Expected: notice PASS + rollback marker

**Status**
- ✅ PASS (ran in SQL Editor on `vcixsdudkizgfikhmfuv`)

**Result**
- Final marker observed: `ATP2 Batch 2 smoke rollback complete`
- No SQL error after script fix => D1 schema/constraints smoke passed and transaction rolled back clean

**Observed notes**
- First run failed early on `profiles_username_uk` due smoke script using deterministic test usernames (`b2smoke_user` / `b2SMOKE_USER`) that collided under `citext` unique semantics before the intended exception block
- Smoke script fixed by randomizing usernames (`v_username_primary`, `v_username_secondary`) and testing case-insensitive conflict using `upper(v_username_primary)` inside the expected `unique_violation` block
- SQL Editor often shows only the last `SELECT`; rollback marker is acceptable batch completion signal when no preceding error is shown

## Batch 3 — D2 Trigger Attach (updated_at only, RLS deferred)
**Scope**
- Attach `public.set_updated_at()` triggers to mutable tables listed in spec `#14.1`
- Validate trigger behavior bằng smoke SQL (`transaction + rollback`)
- **Không** apply RLS/policies trong batch này (defer) để tránh chặn ATP2 khi auth path (`wallet session` vs `auth.uid()`) chưa chốt

**Deliverables**
- `supabase/migrations/000007_d2_triggers_updated_at.sql`
- `supabase/audit/batch3_triggers_updated_at_smoke_transaction_rollback.sql`

**Checklist**
- `000007` chỉ chứa trigger attach, không chứa policy SQL
- Trigger được gắn cho các table có `updated_at` trong D1 scope:
  - `profiles`
  - `user_preferences`
  - `assets_catalog`
  - `watchlist_alerts`
  - `community_posts`
  - `community_comments`
  - `protocol_assets`
  - `protocol_orders`
- Có smoke script riêng để verify trigger overwrite `updated_at`

**How to run (next)**
- `npx supabase db push --yes` (apply `000007`)
- Run `supabase/audit/batch3_triggers_updated_at_smoke_transaction_rollback.sql` in SQL Editor

**Status**
- ✅ PASS (migration + trigger smoke on `vcixsdudkizgfikhmfuv`)

**Result**
- `npx supabase db push --yes` applied `000007_d2_triggers_updated_at.sql` successfully on `vcixsdudkizgfikhmfuv`
- `DROP TRIGGER IF EXISTS` emitted expected `NOTICE` for first attach (no existing triggers yet)
- SQL Editor smoke reached final marker: `ATP2 Batch 3 trigger smoke rollback complete`
- No SQL error after apply => `set_updated_at()` trigger attachments validated on D1 mutable tables and rolled back clean after smoke assertions

## Batch 4A — D2 RLS Foundation (no messaging, owner-scoped deferred)
**Scope**
- Tạo migration RLS foundation cho D1 tables (no messaging)
- Public-read policies cho read-heavy tables
- Service-role write boundaries cho backend-managed tables
- **Chưa** apply migration trong batch này
- **Chưa** tạo owner-scoped policies (`user_*`, `notifications`, community/profile writes) vì auth claim contract chưa chốt (`wallet session` vs `auth.uid()`)

**Deliverables**
- `supabase/migrations/000008_d2_rls_foundation_no_messaging.sql`
- `supabase/audit/batch4b_rls_foundation_no_messaging_snapshot_single_result.sql`

**What 000008 covers**
- Enables RLS on:
  - `wallet_auth_challenges`, `wallet_sessions`
  - `profiles`
  - `assets_catalog`, `asset_media`, `asset_tags`, `asset_tag_map`
  - `user_badges`
  - `community_posts`, `community_comments`, `community_reactions` (public read only in this batch)
  - `protocol_*` + `asset_protocol_links`
- Public-read policies:
  - `profiles` (exclude `status = 'deleted'`)
  - `assets_catalog` (`is_active = true`)
  - `assets_*`, `user_badges`, `protocol_*`, `asset_protocol_links`
  - `community_*` filtered to public-visible rows
- Service-role explicit policies:
  - `wallet_*`
  - `user_badges`
  - `assets_catalog`
  - `protocol_*`
  - `asset_protocol_links`
- Leaves owner-scoped tables RLS-disabled in this batch:
  - `user_preferences`, `user_follows`, `user_favorites`, `user_watchlist`, `watchlist_alerts`, `notifications`

**Why owner-scoped deferred**
- ATP2 currently uses custom wallet session stack; direct `auth.uid()` ownership policy semantics are not finalized for these tables
- Applying incorrect owner policies now risks false denials / blocked writes during ATP2 cutover testing

**Status**
- ✅ PASS (with corrective `000009` + Batch 4B audit)

**Result so far**
- `npx supabase db push --yes` applied `000008_d2_rls_foundation_no_messaging.sql` successfully on `vcixsdudkizgfikhmfuv`
- `DROP POLICY IF EXISTS` emitted expected `NOTICE` on first apply (policies did not exist yet)
- First `Batch 4B` audit run showed mismatch:
  - `expected_rls_enabled_tables.enabled_missing = []` ✅
  - `batch4a_expected_policies_presence.missing = []` ✅
  - `messaging_policy_presence_should_be_empty = []` ✅
  - `owner_scoped_deferred_rls_disabled_tables.disabled_missing != []` ❌
- Corrective migration added + applied:
  - `supabase/migrations/000009_d2_rls_deferred_owner_tables_disable.sql`
  - Purpose: explicitly `DISABLE ROW LEVEL SECURITY` for deferred owner-scoped tables (`user_preferences`, `user_follows`, `user_favorites`, `user_watchlist`, `watchlist_alerts`, `notifications`)

**Final Batch 4B audit result (2026-02-25)**
- `expected_rls_enabled_tables.enabled_missing = []`
- `owner_scoped_deferred_rls_disabled_tables.disabled_missing = []` (after `000009`)
- `batch4a_expected_policies_presence.missing = []`
- `messaging_policy_presence_should_be_empty = []`

## Batch 5A — ATP2 Env Wiring (project target switch only)
**Scope**
- Switch ATP2 runtime Supabase target from old project to `vcixsdudkizgfikhmfuv`
- Keep scope strictly config/wiring only (no functional data-layer rewrite yet)
- Validate app build after config patch

**Deliverables**
- `utils/supabase/info.tsx` updated to new project defaults + `VITE_SUPABASE_*` env override support
- `.env.example` added for Batch 5 wiring checklist

**Changes**
- Default `projectId` moved from `azimhqpsjgxbmjlxaghp` -> `vcixsdudkizgfikhmfuv`
- Default legacy anon key updated to project `vcixsdudkizgfikhmfuv`
- Added optional exports:
  - `supabaseUrl`
  - `publishableKey`
- Added env override support:
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_LEGACY_ANON_KEY`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- `src/utils/messagesClient.ts` now derives Edge Function base URL from `supabaseUrl` instead of hardcoding `https://${projectId}.supabase.co`

**Tests**
- `npm run build` ✅ PASS (vite production build succeeded)
- `npm run build` ✅ PASS again after `messagesClient` config-base patch

**Status**
- ✅ PASS (wiring/config only)

**Important note (scope control)**
- ATP2 app still contains mock/local utilities for several domains (`profile`, `favorites`, `community`, etc.)
- Therefore `Batch 5A` does **not** mean functional cutover is complete; it only ensures runtime Supabase target wiring no longer points to the old project
- Examples (current local/mock evidence, to be handled in Batch 5B+):
  - `src/utils/profileUtils.ts` stores profiles/activities in `localStorage`
  - `src/utils/favoritesUtils.ts` stores favorites/watchlist/alerts in `localStorage`
  - `src/utils/communityUtils.ts` stores posts/comments/actions in `localStorage` and seeds mock posts/comments

## Batch 4C — RLS Temporary Client-Write Unblock (profiles + community, no messaging)
**Scope**
- Add temporary permissive client-write policies for ATP2 functional smoke on test project
- Tables only:
  - `profiles`
  - `community_posts`
  - `community_comments`
  - `community_reactions`
- Keep messaging deferred
- Do not change owner-scoped deferred tables (`user_preferences`, `user_follows`, `user_favorites`, `user_watchlist`, `watchlist_alerts`, `notifications`) beyond existing Batch 4B state

**Deliverables**
- Migration:
  - `supabase/migrations/000010_d2_rls_temp_client_writes_profiles_community.sql`
- Audit snapshot (single-result):
  - `supabase/audit/batch4c_rls_temp_client_writes_snapshot_single_result.sql`

**Apply**
- `npx supabase db push --yes` ✅ PASS
- Applied migration:
  - `000010_d2_rls_temp_client_writes_profiles_community.sql`
- CLI notices for `drop policy if exists ... skipping` are expected on first apply

**Intended temporary policies**
- `profiles_insert_public_temp_b4c_v1`
- `profiles_update_public_temp_b4c_v1`
- `community_posts_insert_public_temp_b4c_v1`
- `community_posts_update_public_temp_b4c_v1`
- `community_posts_delete_public_temp_b4c_v1`
- `community_comments_insert_public_temp_b4c_v1`
- `community_comments_update_public_temp_b4c_v1`
- `community_comments_delete_public_temp_b4c_v1`
- `community_reactions_insert_public_temp_b4c_v1`
- `community_reactions_delete_public_temp_b4c_v1`

**Batch 4C audit pass criteria (run SQL Editor snapshot)**
- `batch4c_profiles_community_rls_enabled.enabled_missing = []`
- `batch4c_owner_scoped_deferred_rls_still_disabled.disabled_missing = []`
- `batch4c_temp_client_write_policies_presence.missing = []`
- `messaging_policy_presence_should_be_empty = []`
- `batch4a_read_policies_still_present_subset.missing = []`

**Final Batch 4C audit result (2026-02-25, user-provided SQL Editor CSV)**
- `batch4c_profiles_community_rls_enabled.enabled_missing = []`
- `batch4c_owner_scoped_deferred_rls_still_disabled.disabled_missing = []`
- `batch4c_temp_client_write_policies_presence.missing = []`
- `messaging_policy_presence_should_be_empty = []`
- `batch4a_read_policies_still_present_subset.missing = []`
- ✅ PASS (temporary client-write unblock active as intended)

## Batch 5B/5C — Client Adapters (local-first + Supabase sync/hydrate, no messaging)
**Scope**
- Implement client adapters for:
  - `profiles`, `user_preferences`, `user_badges`, `user_follows`
  - `user_favorites`, `user_watchlist`, `watchlist_alerts`, `notifications`
  - `community_posts`, `community_comments`, `community_reactions` (no messaging)
- Keep UI stable by preserving existing sync utility APIs (local-first) and adding background Supabase hydrate/sync
- Add UI refresh listeners so background sync/hydrate updates are visible without full reload

**Deliverables (code)**
- New REST helper (no `@supabase/supabase-js` dependency required):
  - `src/utils/supabaseRest.ts`
- `profileUtils` upgraded:
  - background hydrate from `profiles` + `user_preferences` + `user_badges` + `user_follows`
  - best-effort sync back to Supabase on save/follow/unfollow
- `notifications` upgraded:
  - background hydrate from `notifications` + `user_preferences.notification_settings`
  - debounced sync to Supabase
- `favoritesUtils` upgraded:
  - background hydrate for favorites/watchlist/alerts
  - debounced sync to Supabase
  - asset stub upsert/lookup in `assets_catalog` by `asset_uid` for FK compatibility
- `communityUtils` upgraded:
  - background hydrate for posts/comments
  - best-effort sync for posts/comments
  - best-effort sync for reactions (`like` / `bookmark`) to `community_reactions`
- UI/context listeners added:
  - `UserContext`, `NotificationContext`, `EnhancedProfile`, `FavoritesPage`, `WatchlistPage`, `EnhancedCommunity`

**Tests (early-fail)**
- `npm run build` ✅ PASS after adapter/helper patches
- `npm run build` ✅ PASS after UI listener refresh patches

**Status**
- ✅ PASS (code integration for Batch 5B/5C)
- ✅ Unblocked for next functional smoke step after `Batch 4C` temporary policy apply (`000010`)

**Functional-smoke note (important)**
- `Batch 4C` is a **temporary test-project unblock** for client writes on `profiles` + `community_*`
- This is acceptable for ATP2 functional smoke, but must be replaced in a hardening batch with owner-scoped policies backed by a wallet-auth -> Supabase auth claim contract

**Implication for roadmap**
- Immediate next step: run ATP2 functional smoke 2-wallet checklist against `vcixsdudkizgfikhmfuv`
- Follow-up hardening batch still required:
  - replace temporary Batch 4C policies with owner-scoped policies
  - implement wallet-auth -> Supabase auth claim bridge (preferred long-term)

**Final functional-smoke result (2026-02-25, user-reported on ATP2 runtime)**
- ✅ PASS (2-wallet ATP2 smoke on project `vcixsdudkizgfikhmfuv`)
- Verified working:
  - favorites flow (after local-first/hydrate overwrite safeguards)
  - profile avatar immediate UI sync after save
  - community post/comment/reaction path (no messaging)
  - cross-wallet community avatar rendering consistency
  - follow -> notification flow
- Consistency fixes applied after first smoke pass surfaced issues:
  - prevent empty remote hydrate from overwriting local favorites/watchlist/alerts
  - avoid delete-all remote sync when asset FK resolution (`assets_catalog`) is incomplete
  - normalize avatar/banner alias sync (`avatar` vs `avatarUrl`, `banner` vs `bannerUrl`)
  - persist and render `userAvatar` on community posts/comments
  - seed profile snapshot from community posts before profile navigation (display-name/avatar consistency)
  - create follow notification for target profile on follow action

## Batch 6 — Stabilization + Hardening Readiness (doc/audit prep, no deploy)
**Scope**
- Lock current smoke-pass state into execution log
- Prepare hardening-readiness audit/checklist for replacing `Batch 4C` temporary policies
- No schema deploy, no app deploy, no messaging

**Deliverables**
- SQL snapshot (single-result) for current hardening-readiness state:
  - `supabase/audit/batch6_hardening_readiness_snapshot_single_result.sql`
- Hardening cutover checklist (owner-scoped replacement for Batch 4C temp policies):
  - `supabase/audit/batch6_hardening_cutover_checklist.md`

**What Batch 6 readiness snapshot verifies**
- `Batch 4C` temporary client-write policies are still present (expected in current smoke-pass phase)
- `profiles` + `community_*` still have RLS enabled
- owner-scoped deferred tables remain RLS-disabled (`Batch 4B` invariant)
- `Batch 4A` public read subset still present
- messaging policies remain empty (deferred)

**Status**
- ✅ PASS (artifacts prepared; no deploy required)
- Current ATP2 <-> `vcixsdudkizgfikhmfuv` functional goal achieved under temporary `Batch 4C` test-project policies

**Final Batch 6 readiness audit result (2026-02-25, user-provided SQL Editor JSON)**
- `batch4c_temp_policies_still_present.missing = []`
- `owner_scoped_deferred_tables_rls_disabled.disabled_missing = []`
- `profiles_community_rls_enabled_for_temp_write_phase.enabled_missing = []`
- `messaging_policy_presence_should_be_empty = []`
- `batch4a_public_read_subset_still_present.missing = []`
- ✅ PASS (hardening-readiness state confirmed before replacing temporary `Batch 4C` policies)

**Next roadmap step (hardening)**
- Replace `Batch 4C` temporary public client-write policies with owner-scoped policies after wallet-auth -> Supabase auth claim contract is implemented/validated
- Then rerun 2-wallet functional smoke and verify no regression

## Phase Transition (Roadmap Status)
**Phase A — Schema + Functional Integration (`Batch 0` -> `Batch 6`)**
- ✅ FINISH
- Outcome:
  - ATP2 runtime is functionally connected to Supabase project `vcixsdudkizgfikhmfuv`
  - S1-S4 (no messaging) schema deployed and smoke-tested
  - triggers/RLS foundation applied and audited
  - client adapters + 2-wallet ATP2 functional smoke passed
  - temporary `Batch 4C` policies still active (known and documented)

**Phase B — Hardening / Auth Bridge / Policy Lockdown**
- ▶ ACTIVE (next phase)
- Primary goals:
  - implement wallet-auth -> Supabase auth claim bridge
  - replace temporary `Batch 4C` public write policies with owner-scoped policies
  - rerun 2-wallet functional smoke under hardened RLS
  - preserve no-messaging scope until dedicated later phase

## Batch 1/2 Early-fail Signals (nhắc lại)
- `db push` fail ở migration nào => dừng ngay, sửa file đó trước khi rerun
- `table-stats` thiếu bất kỳ bảng expected D1 => dừng, audit migration drift
- Batch 2 smoke fail ở check/unique/FK nào => sửa schema trước khi sang D2 (RLS/triggers)

## 21) Phase B Execution Plan (Hardening / Auth Bridge / Policy Lockdown)
> Mục tiêu phase: thay temporary `Batch 4C` policies bằng owner-scoped RLS đúng chuẩn, nhưng vẫn giữ ATP2 functional smoke 2-wallet PASS.

### Batch H1 — Wallet Auth -> Supabase Auth Claim Bridge (design + scaffold)
**Scope**
- Chốt contract giữa wallet session của ATP2 và Supabase auth claims để RLS owner-scoped có thể dùng ổn định
- Chưa thay policy `Batch 4C` trong batch này
- Không mở messaging

**Deliverables**
- Auth bridge design doc (claims contract + token/session flow)
- Checklist implementation scaffold (server function/API path, signing secret handling, TTL/refresh)
- Test matrix cho claims-based access (`auth.uid()` / JWT claims mapping)

**Checklist chốt**
- Quy định canonical user identity trong claim:
  - `profile_id` (UUID, khuyến nghị)
  - `wallet_address` (lowercase)
- Chốt nguồn cấp token/claim:
  - backend bridge endpoint / edge function / server API (ATP2)
- Chốt TTL/refresh/revoke behavior
- Chốt fallback khi `auth_pending` (social/profile allowed, protocol denied)

**Tests (phát hiện lỗi sớm)**
- decode JWT claim có đủ fields expected
- claim wallet lowercase invariant
- bridge không cấp claim nếu wallet session invalid/expired
- bridge refresh/revoke path không làm hỏng ATP2 current session UX

**Pass criteria**
- Có design + implementation scaffold đủ rõ để viết owner-scoped RLS policies không đoán
- Không còn ambiguity giữa `wallet_address` và `auth.uid()` ownership key

### Batch H2 — Owner-scoped RLS Hardening (replace Batch 4C temp policies)
**Scope**
- Remove temporary public client-write policies `Batch 4C`
- Add owner-scoped RLS policies cho `profiles`, `community_*`
- Enable + add owner-scoped RLS cho deferred tables:
  - `user_preferences`, `user_follows`, `user_favorites`, `user_watchlist`, `watchlist_alerts`, `notifications`
- Messaging vẫn deferred

**Deliverables**
- New hardening migration(s) (expected after `000010`)
- Audit snapshot SQL for hardened RLS state
- Rollback migration (restore temp write policies) hoặc rollback procedure rõ ràng

**Checklist chốt**
- `Batch 4C` temp policies removed (`profiles_*_public_temp_b4c_v1`, `community_*_public_temp_b4c_v1`)
- owner-scoped policies present theo claim contract H1
- public-read policies `Batch 4A` còn giữ đúng subset read
- service-role policies cho backend-managed tables không bị ảnh hưởng
- deferred owner tables chuyển từ RLS disabled -> RLS enabled + owner policies

**Tests (phát hiện lỗi sớm)**
- SQL audit snapshot pass:
  - temp policy list = empty
  - expected owner policy list missing = []
  - messaging policy list = []
- Negative tests:
  - user A không update/delete row của user B
  - user A không đọc notifications/favorites/watchlist của B
- Positive tests:
  - owner write/read đúng cho từng domain

**Pass criteria**
- Hardened policies thay hoàn toàn `Batch 4C` temp writes
- Không block ATP2 social/profile/community flows khi claim bridge H1 hoạt động

### Batch H3 — Functional Smoke 2-Wallet Under Hardened RLS
**Scope**
- Rerun ATP2 functional smoke với 2 wallet trên `vcixsdudkizgfikhmfuv` dưới hardened RLS
- Không thêm feature mới

**Checklist chốt**
- Wallet A/B profile save + reload + cross-view consistency
- Follow/unfollow + notification to target user
- Favorites/watchlist/alerts persist + reload (no cross-wallet leakage)
- Community post/comment/reaction cross-wallet render + ownership constraints
- Negative checks (A không sửa/xóa content B nếu không phải owner)

**Tests**
- ATP2 runtime manual smoke (2 wallet)
- SQL spot checks cho rows mới tạo (owner columns, timestamps, notification targets)
- Optional audit snapshots for policy/runtime state after smoke

**Pass criteria**
- Tất cả functional smoke pass như `Batch 5C`
- Thêm pass các negative ownership checks dưới RLS hardened
- Không cần `Batch 4C` temp public-write policies nữa

### Phase B Done Criteria
- H1 claim bridge contract implemented and validated
- H2 hardened owner-scoped RLS applied + audited
- H3 ATP2 2-wallet smoke pass under hardened RLS
- Temporary `Batch 4C` policies removed and documented as retired
- Messaging scope vẫn deferred (không trôi phạm vi)

## 22) Phase B Progress Log (Artifacts Ready, chưa apply)
### Batch H1 — Auth Claim Bridge (design + scaffold)
**Status**
- ✅ Design + implementation code created (bridge `/exchange` can issue real JWT when enabled + envs are configured)
- ⏳ Not deployed/validated end-to-end on project yet

**Deliverables**
- `docs/production/ATP2_H1_WALLET_AUTH_SUPABASE_CLAIM_BRIDGE_2026-02-25.md`
- `src/utils/supabaseAuthClaimBridge.ts`
- `supabase/functions/server/wallet-auth-claim-bridge.tsx`
- `supabase/functions/server/index.tsx` (route mount)
- `src/utils/supabaseRest.ts` (prefers bridge bearer token when available)
- `.env.example` (H1 bridge env placeholders)

**Notes**
- Bridge contract chốt claim fields: `role=authenticated`, `sub/profile_id`, `wallet_address`
- H1 bridge remains disabled by default via `ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE`
- JWT signing requires `SUPABASE_JWT_SECRET` (or `ATP2_SUPABASE_JWT_SECRET`) in function env
- H2 migration must not be applied until H1 verification + JWT signing is implemented and tested

### Batch H2 — Hardening RLS (migration + audit artifacts)
**Status**
- ✅ Migration + audit snapshot created
- ⏳ Not applied (waiting for H1 implemented/validated)

**Deliverables**
- `supabase/migrations/000011_d2_rls_hardening_owner_scoped_claim_bridge.sql`
- `supabase/audit/batch_h2_rls_hardening_claim_bridge_snapshot_single_result.sql`

**What H2 is designed to do (when applied)**
- Remove `Batch 4C` temporary public-write policies on `profiles` + `community_*`
- Enable owner-scoped RLS for deferred tables (`user_preferences`, `user_follows`, `user_favorites`, `user_watchlist`, `watchlist_alerts`, `notifications`)
- Preserve `Batch 4A` public-read subset
- Keep messaging deferred
