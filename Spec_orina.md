# Orina Protocol Deploy Spec
> Version: ATP v3.3-final | Chain: BSC Testnet (Chain ID: 97) | Cập nhật: 2026-03-14

---

## 1. Scope

Triển khai hệ thống:

| Layer | Technology | Platform |
|---|---|---|
| Frontend | React + Vite (hiện tại) → Next.js (target) | Vercel |
| Edge | Cloudflare | DNS / WAF / CDN / Rate Limit |
| Backend managed | Supabase | Auth / Postgres / Realtime / Storage |
| Metadata/media | IPFS | Pinning API |
| On-chain state | EVM Contracts (BSC) | 10 contracts đã deploy |
| Async sync | Indexer / Worker | Event-driven projection update |

> **Lưu ý hiện tại**: Codebase ATP2 là SPA React + Vite. Section này mô tả target architecture khi migrate sang Next.js / production. Frontend hiện chạy local bằng `npm run dev` / `vite`.

---

## 2. Target Architecture

```text
User
  -> Cloudflare (DNS / WAF / CDN / Rate Limit)
  -> Vercel (Next.js App Router)
     -> Supabase (Auth / Postgres / Realtime / Storage)
     -> RPC Provider (BSC)
     -> EVM Contracts (MarketplaceATP, OrinaRWA, ...)
     -> IPFS Pinning API

Indexer / Worker
  -> RPC Provider
  -> EVM Contracts  -- subscribe to events
  -> Supabase       -- write projections: protocol_assets, protocol_orders, protocol_asset_events
  -> Notification Provider

Realtime channel (Supabase):
  conversations | messages | protocol_orders
```

### 2.1 Current Runtime (Vite SPA)

```text
User Browser
  -> Vite Dev Server (local) hoặc static hosting
  -> Wagmi + Viem -> RPC Provider (BSC Testnet)
  -> Supabase Client (anon key / publishable key)
  -> IPFS Gateway (read) / Pinning API (write)
```

---

## 3. Source of Truth

### 3.1 On-chain (chỉ indexer được ghi)

| Data | Contract | Event |
|---|---|---|
| Asset ownership | `OrinaRWA` | `Transfer` |
| Token ID | `OrinaRWA` | `Minted` |
| Listing active/sold/cancelled | `MarketplaceATP` | `OrderCreated`, `OrderFinalized`, `OrderCancelled` |
| Order status | `MarketplaceATP` | `OrderPaid`, `OrderDisputed`, `OrderFinalized` |
| Settlement | `PaymentGateway` | `PaymentReleased`, `FeeDistributed` |
| Dispute verdict | `DisputeManager` | `DisputeResolved` |
| Shipping registered | `ShippingRegistry` | `ShippingRegistered` |

### 3.2 Off-chain (Supabase/Postgres)

| Data | Table |
|---|---|
| User profiles | `profiles` |
| Asset catalog metadata | `assets_catalog` |
| Community posts | `posts`, `comments`, `reactions` |
| Conversations / Messages | `conversations`, `conversation_participants`, `messages` |
| Notification preferences | `user_preferences` |
| Sessions | `wallet_auth_sessions` |
| Security events | `security_events` |
| Agent API keys | `agent_keys` |
| Geo / delivery addresses | `geo_countries`, `geo_places`, `user_delivery_addresses` |
| Collections | `collections`, `collection_memberships` |
| User app settings | `user_app_settings` |
| Protocol read-models | `protocol_assets`, `protocol_orders`, `protocol_asset_events`, `protocol_order_events` |

### 3.3 Immutable content (IPFS CID)

- Asset metadata JSON (ERC-721 metadata)
- Asset media files (image, video, document)
- Immutable document blobs

### 3.4 Forbidden (client không được ghi trực tiếp)

- `protocol_assets.owner_address` — chỉ indexer set
- `protocol_assets.status` — chỉ indexer set
- `protocol_orders.status` — chỉ indexer set
- `assets_catalog.token_id` — chỉ indexer set sau mint
- `agent_keys` — không cho client write
- `security_events` — không cho client write
- `verification_flags` — không cho client write
- Mọi cột `chain_id`, `tx_hash`, `block_number` trong event tables

---

## 4. Environments

| Env | Supabase | Vercel | Chain | RPC |
|---|---|---|---|---|
| `local` | local docker hoặc remote dev project | `localhost:5173` (Vite) | BSC Testnet (97) | `https://data-seed-prebsc-1-s1.binance.org:8545/` |
| `preview` | Supabase preview branch | Vercel preview URL | BSC Testnet (97) | BSC Testnet RPC |
| `testnet-staging` | Supabase staging project | Vercel staging env | BSC Testnet (97) | BSC Testnet RPC |
| `testnet-production` | Supabase production project (`vcixsdudkizgfikhmfuv`) | Vercel production | BSC Testnet (97) → BSC Mainnet (56) | BSC RPC |

Mỗi môi trường tách riêng:
- Supabase project ID và keys
- Vercel env vars
- RPC provider keys
- IPFS token
- Contract addresses (testnet vs mainnet)
- Cloudflare rules (nếu public)

---

## 5. Components

### 5.1 Cloudflare

**Trách nhiệm**: DNS, TLS, WAF, CDN caching, rate limiting, bot filtering.

**Không giữ business state.**

Routing rules:
- Static assets (`/assets/*`, `/_next/static/*`): cache edge
- Authenticated pages: `Cache-Control: private, no-store`
- `/api/*`: WAF + rate limit
- `/webhooks/*`: signature validation + IP allowlist nếu có

### 5.2 Vercel / Next.js (target)

**Trách nhiệm**:
- SSR / RSC cho public pages (landing, catalog, asset detail, profile public)
- Route handlers cho server-side API
- Auth boundary (verify Supabase JWT)
- Signed URL issuance cho IPFS upload
- Webhook validation (chữ ký HMAC)
- Orchestration mỏng giữa Supabase và IPFS

**Không là nguồn thật của lifecycle on-chain.**

**Hiện tại (Vite SPA)**: Client-side routing qua `activePage` state trong `App.tsx`. Không có server-side rendering.

### 5.3 Supabase

**Trách nhiệm**: Auth (JWT wallet-claim bridge), Postgres (34 migrations hiện tại), Realtime (conversations, messages, orders), Storage (media upload), RLS trên toàn bộ bảng, SQL functions/triggers.

**Project hiện tại (testnet)**: `vcixsdudkizgfikhmfuv`  
**URL**: `https://vcixsdudkizgfikhmfuv.supabase.co`

Supabase Edge Functions đã deploy:
- `make-server-b0d68fc8` — auth claim bridge (wallet → Supabase JWT)
- `orina-chat-v1` — chat utility function
- `server` — server-side helpers

### 5.4 RPC Provider

| Chain | RPC URL (public) | Dùng cho |
|---|---|---|
| BSC Mainnet (56) | `https://bsc-dataseed.binance.org/` | production read |
| BSC Testnet (97) | `https://data-seed-prebsc-1-s1.binance.org:8545/` | testnet read |
| Sepolia (11155111) | `https://eth-sepolia.g.alchemy.com/v2/demo` | dev |

> Dùng private RPC provider (Alchemy, QuickNode, ...) cho write RPC và indexer — không dùng public endpoint cho production.

### 5.5 EVM Contracts (BSC Testnet — Chain ID: 97)

**Deployment Namespace**: `orina-atp-v3.3-final-bsc-testnet`  
**CREATE2 Factory**: `0x0b1974474a5d37123de55d83bce6f9d3284cece6`  
**Deployer EOA**: `0x282Be18838D7079C215F49749a9606d77e00888b`

| Contract | Địa chỉ | Vai trò |
|---|---|---|
| `MarketplaceATP` | `0x1f598cbdd4aa654ad1d1af4b5097461ddb821521` | Core marketplace, order lifecycle |
| `OrinaRWA` | `0xb6125bb709f74c9172d5857952305ff8caef4d40` | RWA NFT mint/ownership |
| `FractionalReceiptNFT` | `0xe09af34d4ed0661a5c8e9f36b1fcde68d03c7ad4` | Receipt NFT (symbol: `ORINA-R`) |
| `PaymentGateway` | `0x8764536c089f409344eb3212dd694423a184097a` | Payment processing, fee distribution |
| `FeeManager` | `0xd7d491cb3dc0c6aded0069a91fab2ede64c0fab4` | Fee rates management |
| `DisputeManager` | `0xfb5103edec480b135609ad7116d77a6911b4eb25` | Dispute resolution (14 days period) |
| `AutoTimeManager` | `0x94904a037ec1f6438e1a24d882c1e36d584509ea` | Auto-timeout for orders |
| `UnitRegistry` | `0x17c36211c45da3bdd1d2e51d7a3e33b02802a897` | Unit/measurement registry |
| `ShippingRegistry` | `0xf739ed5e7cf709aa8dd73d51412a7ac0f8a697f2` | Shipping options registry |
| `TimelockController` | `0xd22d7ee31cf6985bdb8031cdff903adbfb2bef40` | Governance timelock (1800s delay) |

**Governance Addresses**:
- Governance Safe: `0x554c4F489846e293bA251fb8B863FE1241306138`
- Arbiter Multisig: `0x1528378116b3D025761aB81AFF5F315c1905340A`
- Emergency Multisig: `0x404118A64Fa63409aC355E98d321a16eD0D5D21F`
- Fee Vault: `0x130fF04D269f0E9C0eaa984C167bd746bB68F82a`

**Compiler Settings**:
- Solidity: `0.8.24`, Optimizer: `true`, Runs: `200`, `viaIR`: `true`, EVM: `cancun`

### 5.6 IPFS

**Trách nhiệm**: Lưu trữ asset metadata JSON (ERC-721 format), media files, immutable document blobs trước khi mint.

**Quy tắc**: Metadata phải được pin thành công (có CID) trước khi submit mint transaction.

### 5.7 Indexer / Worker

**Trách nhiệm**:
- Subscribe/poll contract events từ deployment block
- Backfill từ `deployment block` (mỗi contract có block riêng)
- Deduplicate events bằng `(chain_id, tx_hash, log_index)` unique key (đã có trong schema)
- Apply confirmation threshold trước khi update projection
- Detect chain reorg, rollback projection, replay event range
- Mark `reorg_pending` nếu chưa đủ confirmation
- Emit notification jobs (order status update, dispute, delivery)

**Write targets trong Supabase**:
- `protocol_assets`: `owner_address`, `status`, `available_amount`, `total_amount`
- `protocol_orders`: `status`, `amount`, `total_value`
- `protocol_asset_events`: append-only event log
- `protocol_order_events`: append-only event log
- `asset_protocol_links`: link asset_catalog ↔ on-chain token

---

## 6. Domains

| Domain | Mục đích |
|---|---|
| `orina.io` | Marketing / landing |
| `app.orina.io` | Product app (authenticated shell) |

**Cloudflare routing rules**:
- Static assets: cache edge, `Cache-Control: public, max-age=31536000, immutable`
- Authenticated HTML pages: `Cache-Control: private, no-store`
- `/api/*`: WAF + rate limit strict
- `/webhooks/*`: signature validation + IP allowlist

---

## 7. Environment Variables

### 7.1 Public vars (Vite hiện tại / Vercel `NEXT_PUBLIC_*`)

```env
# Supabase
VITE_SUPABASE_URL=https://vcixsdudkizgfikhmfuv.supabase.co
VITE_SUPABASE_ANON_KEY=                    # legacy path (messagesClient)
VITE_SUPABASE_PUBLISHABLE_KEY=             # preferred for new callers
VITE_SUPABASE_PROJECT_ID=vcixsdudkizgfikhmfuv
VITE_SUPABASE_AUTH_BRIDGE_ENABLED=false
VITE_SUPABASE_AUTH_BRIDGE_FN_NAME=make-server-b0d68fc8
VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX=/auth/supabase-claim-bridge

# Chain
NEXT_PUBLIC_CHAIN_ID=97                    # BSC Testnet
NEXT_PUBLIC_RPC_READ_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# Contracts (BSC Testnet)
NEXT_PUBLIC_MARKETPLACE_CONTRACT=0x1f598cbdd4aa654ad1d1af4b5097461ddb821521
NEXT_PUBLIC_RWA_CONTRACT=0xb6125bb709f74c9172d5857952305ff8caef4d40
NEXT_PUBLIC_RECEIPT_NFT_CONTRACT=0xe09af34d4ed0661a5c8e9f36b1fcde68d03c7ad4
NEXT_PUBLIC_PAYMENT_GATEWAY_CONTRACT=0x8764536c089f409344eb3212dd694423a184097a
NEXT_PUBLIC_FEE_MANAGER_CONTRACT=0xd7d491cb3dc0c6aded0069a91fab2ede64c0fab4
NEXT_PUBLIC_DISPUTE_MANAGER_CONTRACT=0xfb5103edec480b135609ad7116d77a6911b4eb25
NEXT_PUBLIC_AUTOTIME_MANAGER_CONTRACT=0x94904a037ec1f6438e1a24d882c1e36d584509ea
NEXT_PUBLIC_UNIT_REGISTRY_CONTRACT=0x17c36211c45da3bdd1d2e51d7a3e33b02802a897
NEXT_PUBLIC_SHIPPING_REGISTRY_CONTRACT=0xf739ed5e7cf709aa8dd73d51412a7ac0f8a697f2

# IPFS
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=

# App
NEXT_PUBLIC_APP_ENV=testnet-staging
```

### 7.2 Server-only vars (Vercel / không expose ra client)

```env
SUPABASE_SERVICE_ROLE_KEY=        # KHÔNG expose ra client
RPC_WRITE_URL=                    # Private RPC endpoint
IPFS_PINNING_API_KEY=             # Pinata / NFT.storage API key
IPFS_PINNING_SECRET=
WEBHOOK_SECRET=                   # HMAC secret cho webhook validation
INDEXER_SHARED_SECRET=            # Auth cho indexer -> server API
NOTIFICATION_PROVIDER_API_KEY=
AGENT_ENCRYPTION_KEY=             # Cho agent_keys encryption at rest
SESSION_SIGNING_SECRET=           # Nếu dùng custom JWT signing
SENTRY_DSN=                       # Error monitoring
ETHERSCAN_API_KEY=                # BSCScan verify (optional)
```

### 7.3 Supabase config

| Item | Value / Requirement |
|---|---|
| Auth redirect URLs | `http://localhost:5173`, `https://app.orina.io` |
| JWT config | Expiry phù hợp với wallet session |
| Enabled providers | Sau đây qua claim bridge: wallet signature |
| Storage buckets | `asset-media` (public read, authenticated write) |
| Realtime-enabled tables | `conversations`, `messages`, `protocol_orders` |
| RLS | Enabled trên toàn bộ bảng client-accessible |

### 7.4 Cloudflare config

| Item | Yêu cầu |
|---|---|
| DNS records | A/CNAME cho `orina.io`, `app.orina.io` |
| SSL | Full (Strict) |
| WAF | Enabled, OWASP ruleset |
| Rate limit | Xem Section 13 |
| Cache rules | Xem Section 13 |
| Firewall rules | Block các country/IP nếu cần compliance |

---

## 8. Secrets Policy

- **KHÔNG** expose `SUPABASE_SERVICE_ROLE_KEY` ra client bất kỳ thời điểm nào
- **KHÔNG** expose `RPC_WRITE_URL` hoặc private RPC key ra client
- **KHÔNG** commit secrets vào repo (kể cả `.env.local`)
- **KHÔNG** reuse secrets giữa `preview` / `testnet-staging` / `testnet-production`
- Secrets phải support rotation không downtime
- Secrets chỉ lưu ở platform secret manager (Vercel Encrypted Env, Supabase Vault)
- API keys của agent (trong `agent_keys` table) phải được encrypt at rest bằng `AGENT_ENCRYPTION_KEY`

---

## 9. Database Policy

### 9.1 Migration Inventory (34 migrations hiện tại)

| Migration | Description |
|---|---|
| `000001` | Extensions và base schema |
| `000002` | S1: Wallet auth sessions |
| `000003` | S2: Profiles, assets_catalog, user_preferences, user_badges |
| `000004` | S3: Social/community (posts, comments, reactions) |
| `000005` | S4: Protocol read-models (protocol_assets, protocol_orders, events) |
| `000006` | Shared indexes |
| `000007` | D2: Triggers (updated_at) |
| `000008` | D2: RLS foundation (không bao gồm messaging) |
| `000009` | D2: RLS deferred owner tables disable |
| `000010` | D2: RLS temp client writes (profiles, community) |
| `000011` | D2: RLS hardening owner-scoped claim bridge |
| `000012` | C5: Messaging schema (conversations, conversation_participants, messages) |
| `000013` | D2: RLS messaging claim bridge |
| `000014` | C6: Conversations direct key unique guard |
| `000015` | C7: Geo and delivery address tables |
| `000016` | C7: Geo and delivery address seed |
| `000017` | C7: Geo and delivery address triggers |
| `000018` | C7: Geo and delivery address RLS |
| `000019` | C8: User app settings |
| `000020` | C8: User app settings triggers |
| `000021` | C8: User app settings RLS |
| `000022-028` | C9: Geo reference import (global ~20M places) |
| `000029` | C10: Collection social state |
| `000030` | C10: Collection social state RLS |
| `000031` | C11: Collections and memberships |
| `000032` | C11: Collections and memberships RLS |
| `000033` | C12: Collection social FK cleanup |
| `000034` | C13: Protocol runtime write RLS |

### 9.2 Migration Order (bắt buộc)

```
1. schema (tables)
2. indexes
3. functions (set_updated_at, ...)
4. triggers (updated_at, touch_conversation, ...)
5. RLS enable
6. policies
7. seed data (geo reference, reference data)
8. realtime enable
```

### 9.3 Core Tables Schema Summary

**`profiles`** — user identity
```
id, wallet_address (unique lowercase), display_name, username (citext unique),
bio, avatar_url, banner_url, avatar_type, website, twitter, discord, telegram,
is_verified, status (active/suspended/deleted), created_at, updated_at
```

**`assets_catalog`** — asset metadata (off-chain)
```
id, asset_uid (unique), title, slug (unique), category, subcategory,
description, cover_image_url, gallery_images (jsonb), attributes (jsonb),
metadata (jsonb), seller_user_id (fk profiles), contract_address,
token_id, chain_id, is_active, metadata_version, created_at, updated_at
```

**`protocol_assets`** — on-chain projection (indexer only write)
```
id, chain_id, asset_contract, token_id, owner_address, status,
available_amount, total_amount, metadata (jsonb), created_at, updated_at
-- unique: (chain_id, asset_contract, token_id)
```

**`protocol_orders`** — order projection (indexer only write)
```
id, order_uid (unique), chain_id, marketplace_contract, asset_contract,
asset_token_id, buyer_address, seller_address, status, amount,
price_per_unit, total_value, currency_symbol, metadata (jsonb),
created_at, updated_at
```

**`conversations`** + **`conversation_participants`** + **`messages`**
```
conversations: type (direct/group/system), title, metadata
participants: role (member/admin/owner/system), joined_at, last_read_at
messages: body, attachments (jsonb array), client_message_id (dedup key),
          edited_at, deleted_at (soft delete)
-- Unique: (conversation_id, sender_user_id, client_message_id)
```

### 9.4 RLS Rules

Tất cả bảng client-accessible phải có:
- `ENABLE ROW LEVEL SECURITY`
- Default deny (no policy = no access)
- Policy tối thiểu cần thiết

Bảng **không cho client write trực tiếp**:
- `agent_keys`
- `security_events`
- `recent_logins` / `wallet_auth_sessions` (chỉ service role)
- `protocol_assets` — các cột `owner_address`, `status` (chỉ indexer via service role)
- `protocol_orders` — `status` (chỉ indexer)
- `protocol_asset_events`, `protocol_order_events` (append-only, chỉ indexer)

---

## 10. Contract Deploy Policy

### 10.1 Required Inputs

| Input | Testnet Value |
|---|---|
| `chain_id` | `97` (BSC Testnet) |
| `deployer_address` | `0x282Be18838D7079C215F49749a9606d77e00888b` |
| `CREATE2_FACTORY` | `0x0b1974474a5d37123de55d83bce6f9d3284cece6` |
| `DEPLOY_NAMESPACE` | `orina-atp-v3.3-final-bsc-testnet` |
| `environment` | `testnet` / `mainnet` |
| `ABI_version` | `3.3-final` |

### 10.2 Required Outputs (persist sau deploy)

```json
{
  "version": "3.3-final",
  "chain_id": 97,
  "deployment_block": "<block_number>",
  "deployer": "0x282Be18838D7079C215F49749a9606d77e00888b",
  "contracts": {
    "MarketplaceATP": "0x1f598cbdd4aa654ad1d1af4b5097461ddb821521",
    "OrinaRWA": "0xb6125bb709f74c9172d5857952305ff8caef4d40",
    "FractionalReceiptNFT": "0xe09af34d4ed0661a5c8e9f36b1fcde68d03c7ad4",
    "PaymentGateway": "0x8764536c089f409344eb3212dd694423a184097a",
    "FeeManager": "0xd7d491cb3dc0c6aded0069a91fab2ede64c0fab4",
    "DisputeManager": "0xfb5103edec480b135609ad7116d77a6911b4eb25",
    "AutoTimeManager": "0x94904a037ec1f6438e1a24d882c1e36d584509ea",
    "UnitRegistry": "0x17c36211c45da3bdd1d2e51d7a3e33b02802a897",
    "ShippingRegistry": "0xf739ed5e7cf709aa8dd73d51412a7ac0f8a697f2",
    "TimelockController": "0xd22d7ee31cf6985bdb8031cdff903adbfb2bef40"
  },
  "governance": {
    "gnosis_safe": "0x554c4F489846e293bA251fb8B863FE1241306138",
    "arbiter_multisig": "0x1528378116b3D025761aB81AFF5F315c1905340A",
    "emergency_multisig": "0x404118A64Fa63409aC355E98d321a16eD0D5D21F",
    "fee_vault": "0x130fF04D269f0E9C0eaa984C167bd746bB68F82a"
  }
}
```

### 10.3 Constraints

- Không hardcode address mà không version
- Không promote frontend trước khi contract manifest publish
- Không deploy contract mới nếu indexer chưa update `startBlock`
- `TimelockController` deploy bằng `CREATE` (không phải CREATE2) — address phụ thuộc deployer nonce
- Không lưu private key trong deployment notes; chỉ lưu địa chỉ

### 10.4 Verify

```bat
# Automated (cần ETHERSCAN_API_KEY)
script\verify_bsc_testnet.cmd

# Dry-run / print only
script\verify_bsc_testnet.cmd --print-only

# Với artifact cụ thể
script\verify_bsc_testnet.cmd broadcast\DeployFullSystem.s.sol\97\run-latest.json
```

---

## 11. Protocol Constants

| Constant | Value | Mô tả |
|---|---|---|
| `SELLER_CONFIRM_WINDOW` | 24h | Thời gian seller confirm order |
| `PAY_TIMEOUT` | 24h | Thời gian buyer phải pay sau khi seller confirm |
| `BUYER_ACTION_WINDOW` | 3 days | Window để mở dispute sau khi order paid |
| `DISPUTE_PERIOD` | 14 days | Thời gian resolve dispute |
| `DISPUTE_FEE_BPS` | 500 (5%) | Phí dispute |
| `DEFAULT_PLATFORM_FEE_BPS` | 250 (2.5%) | Platform fee |
| `DEFAULT_DAO_FEE_BPS` | 50 (0.5%) | DAO fee |
| `DEFAULT_BURN_FEE_BPS` | 25 (0.25%) | Burn fee |
| `MAX_TOTAL_FEE_BPS` | 500 (5%) | Hard cap tổng fee |
| `MAX_SHIPPING_FEE_BPS` | 500 (5%) | Hard cap shipping fee |

**Order States (Solidity enums)**:
```
OrderState:   PENDING_CONFIRM=0, PAID=1, DISPUTED=2, FINALIZED=3, CANCELLED=4
OrderStatus:  PENDING_SELLER_CONFIRM=0, PENDING_BUYER_PAY=1, PAID=2,
              DISPUTABLE=3, DISPUTED=4, FINALIZED=5, CANCELLED=6
SettlementType: FULL_RELEASE=0, FULL_REFUND=1, SPLIT=2
DisputeVerdict: NONE=0, BUYER_WINS=1, SELLER_WINS=2, SPLIT=3
AssetType:    RWA=0 (non-transferable receipt), NFT=1 (transferable receipt)
ShippingType: FREE=0, ORINA_API=1, SELF=2
```

---

## 12. Indexer Policy

### 12.1 Responsibilities

- Subscribe/poll events từ `deployment block` của mỗi contract
- Backfill đầy đủ từ deployment block khi khởi động lần đầu
- Deduplicate: unique key = `(chain_id, tx_hash, log_index)` — đã enforce bởi DB constraint
- Apply confirmation threshold (tối thiểu N blocks trước khi finalize)
- Detect chain reorg: rollback projection theo block, replay event range
- Mark `reorg_pending` nếu chưa đủ confirmation
- Emit notification jobs khi order status thay đổi, dispute mở/resolve, delivery confirmed

### 12.2 Projection Rules (chỉ indexer write)

| Field | Table | Trigger Event |
|---|---|---|
| `owner_address` | `protocol_assets` | `Transfer` từ `OrinaRWA` |
| `status` | `protocol_assets` | `Minted`, `Listed`, `Delisted` |
| `status` | `protocol_orders` | `OrderCreated`, `OrderPaid`, `OrderFinalized`, `OrderCancelled`, `OrderDisputed` |
| Event rows | `protocol_asset_events` | Mọi event từ `OrinaRWA` |
| Event rows | `protocol_order_events` | Mọi event từ `MarketplaceATP`, `DisputeManager`, `PaymentGateway` |

### 12.3 Reorg Handling

```
detect reorg (parent hash mismatch)
  -> rollback protocol_asset_events WHERE block_number > reorg_block
  -> rollback protocol_order_events WHERE block_number > reorg_block
  -> recompute projections từ event log
  -> replay từ reorg_block + 1
  -> verify consistency trước khi reopen feature
```

---

## 13. Frontend Policy

### 13.1 Current App Shell (Vite SPA)

**Navigation**: State-based qua `activePage` trong `App.tsx`. Không có URL routing.

**Provider Stack** (thứ tự từ ngoài vào):
```
Web3Provider (Wagmi + Viem)
  -> NotificationProvider
    -> WalletModalProvider
      -> UserProvider
        -> AppContent
```

**Hooks liên quan đến contracts** (từ `src/hooks/`):
| Hook | Contract |
|---|---|
| `useMarketplace` | `MarketplaceATP` |
| `useIPFSUpload` | IPFS Pinning API |
| `useContractEvents` | Đọc events từ các contracts |
| `useDisputeManager` | `DisputeManager` |
| `usePaymentGateway` | `PaymentGateway` |
| `useFeeManager` | `FeeManager` |
| `useAutoTimeManager` | `AutoTimeManager` |
| `useShippingRegistry` | `ShippingRegistry` |
| `useOrders` / `useUserOrders` | Read orders từ Supabase |
| `useEIP712Sign` | EIP-712 signature |
| `useAccessMode` | Guest vs connected mode |
| `useUserInitialization` | Init profile khi wallet connect |

### 13.2 Public Pages (Guest mode)

- `/` (home): `PublicHomePage` — full screen, overlay navbar, không có sidebar
- Catalog public: in-app via `marketplace` page

### 13.3 Authenticated Pages (wallet-connected)

| Page (`activePage`) | Component | Right Sidebar |
|---|---|---|
| `overview` | `MainContent` | `RightSidebar` |
| `orders` | `Orders` | Không |
| `marketplace` | `Marketplace` | Không (full width) |
| `market-insights` | `MarketInsights` | Không |
| `minting` | `Minting` | `MintingRightSidebar` |
| `assets` | `Assets` | `AssetsRightSidebar` |
| `community` | `Community` | `CommunityRightSidebar` |
| `messages` | `Messages` | Không (full width) |
| `profile` | `EnhancedProfile` | Không |
| `history` | `History` | `HistoryRightSidebar` |
| `settings` | `Settings` | Không |
| `asset-details` | `AssetDetailsPage` | Không |
| `search` | `SearchPage` | Không |
| `favorites` | `FavoritesFollowingPage` | Không |

### 13.4 Access Control

- **Guest mode**: Chỉ truy cập `home`, `marketplace` (read-only). Các page khác redirect về `home`.
- **Connected mode**: Truy cập đầy đủ. `useAccessGuard` và `useAccessMode` enforce.
- Chat polling: App poll unread count mỗi 2500ms khi wallet connected, ngoại trừ khi đang ở trang `messages`.

### 13.5 Build Gates (trước khi promote production)

- Contract manifest đã publish và validated
- DB migrations pass (tất cả 34 migrations apply thành công)
- RLS active trên tất cả bảng
- Indexer sync healthy (lag < ngưỡng)
- Smoke tests pass (xem Section 16)
- Env vars đầy đủ và valid

---

## 14. Cloudflare Policy

### 14.1 Required Controls

- Proxy enabled (orange cloud)
- TLS: Full Strict
- WAF: Enabled với OWASP core ruleset
- Bot protection: Enabled
- Rate limiting: Enabled (xem 14.2)

### 14.2 Minimum Rate Limit Targets

| Endpoint | Limit | Window |
|---|---|---|
| Auth endpoints (`/api/auth/*`) | 10 req | 1 min / IP |
| Message send | 30 req | 1 min / user |
| Post create | 10 req | 1 min / user |
| Agent key create/rotate | 5 req | 5 min / user |
| Mint prepare (`/api/mint/*`) | 5 req | 1 min / user |
| Webhooks (`/webhooks/*`) | 100 req | 1 min / origin |
| Privileged API routes | 20 req | 1 min / IP |

### 14.3 Cache Rules

**Cache** (edge):
- `*.js`, `*.css`, `*.woff2`, `*.woff`, `*.ttf` — `max-age=31536000, immutable`
- `*.png`, `*.jpg`, `*.webp`, `*.svg` (public) — `max-age=86400`
- IPFS gateway content — `max-age=31536000` (content-addressed)

**Không cache**:
- Authenticated HTML pages
- Session-bound responses
- Private API responses (`/api/*`)
- Webhook endpoints

---

## 15. Deploy Order

```
1.  Provision Supabase project (production)
2.  Provision RPC provider (private endpoint)
3.  Provision IPFS pinning service (Pinata/NFT.storage)
4.  Provision Vercel project, setup env vars
5.  Provision Cloudflare zone, DNS records
6.  Apply DB migrations (000001 → 000034, theo thứ tự)
7.  Deploy Edge Functions (make-server-b0d68fc8, orina-chat-v1, server)
8.  Verify RLS active trên tất cả bảng
9.  Seed reference data (geo đã có trong migration 000016, 000022-028)
10. Deploy contracts (chạy DeployFullSystem.s.sol)
11. Verify contract artifacts (script\verify_bsc_testnet.cmd)
12. Publish address manifest (contracts/deployments/<env>.json)
13. Update indexer với startBlock từ deployment
14. Deploy indexer / worker
15. Backfill từ deployment block, validate projections
16. Deploy workers (AutoTimeManager bot, notification processor)
17. Deploy frontend (preview build)
18. Run E2E tests trên staging
19. Promote frontend production
20. Bind domain via Cloudflare (app.orina.io → Vercel)
21. Enable strict WAF rules và rate limits
22. Run smoke tests (xem Section 16)
23. Announce release
```

---

## 16. Runtime Flows

### 16.1 Mint RWA Asset

```
User: Fill minting form (title, category, attributes, media, delivery address)
  -> useIPFSUpload: upload media files -> get IPFS CID
  -> Prepare metadata JSON (ERC-721 format) with IPFS media URLs
  -> Pin metadata JSON to IPFS -> get metadata CID
  -> Minting.tsx: submit tx to OrinaRWA.mint(to, metadataCID, unitId, ...)
  -> Wagmi/Viem: sign & broadcast tx
  -> Wait for tx confirmation (configurable blocks)
  -> Indexer ingests OrinaRWA.Minted event
  -> Indexer writes protocol_assets: owner_address, token_id, status='minted'
  -> Indexer writes protocol_asset_events
  -> Supabase Realtime notifies UI
  -> UI refresh (Assets page / asset details)

Rules:
  - metadata_cid phải được pin TRƯỚC khi submit tx
  - mint_status confirmed CHỈ sau khi indexer set
  - frontend KHÔNG trực tiếp set token_id hay status
```

### 16.2 Create Listing / Order

```
Seller: Create listing intent trên Marketplace
  -> Gọi MarketplaceATP.createOrder(tokenId, price, amount, shippingType, ...)
  -> Contract emits OrderCreated event
  -> Contract trạng thái: OrderState.PENDING_CONFIRM
  -> Indexer ingests event -> updates protocol_orders.status = 'PENDING_SELLER_CONFIRM'
  -> UI shows listing active

Buyer: Accept / Pay order
  -> MarketplaceATP.payOrder(orderId) với value = price
  -> Contract emits OrderPaid
  -> Status -> PAID (DISPUTABLE window bắt đầu: 3 days)
  -> Indexer updates protocol_orders
  -> AutoTimeManager bot theo dõi timeout

Rules:
  - listing_active CHỈ do indexer set
  - sold/cancelled/expired CHỈ do indexer set
```

### 16.3 Order Lifecycle (Seller Confirm → Finalize)

```
PENDING_CONFIRM -> Seller confirms -> PENDING_BUYER_PAY (24h timeout)
PENDING_BUYER_PAY -> Buyer pays -> PAID / DISPUTABLE (3 day window)
PAID ->
  Happy path: buyer confirms delivery -> Finalize -> FULL_RELEASE
  Dispute path: buyer opens dispute -> DISPUTED (14 day period)
    -> DisputeManager arbiter votes -> verdict: BUYER_WINS / SELLER_WINS / SPLIT
    -> PaymentGateway executes settlement
    -> DisputeFee deducted: 50% platform / 30% DAO / 20% burn
CANCELLED: seller rejects OR timeout
```

### 16.4 Messaging

```
User A: Compose message
  -> messagesClient.sendMessage(conversationId, body)
  -> Insert vào public.messages (RLS: chỉ participant write)
  -> client_message_id: dedup guard
  -> Supabase Realtime broadcast channel: conversations, messages
  -> User B: receives realtime update, UI refresh
  -> App-level chat poll (2500ms interval) nếu không ở trang messages
```

### 16.5 Dispute Resolution

```
Buyer: Open dispute (trong DISPUTABLE window)
  -> openDisputeModal -> submit tx to DisputeManager.openDispute(orderId)
  -> Contract emits DisputeOpened
  -> Arbiter multisig xem xét evidence
  -> Arbiter votes: DisputeManager.resolve(orderId, verdict, splits)
  -> Contract: PaymentGateway.settle(), fee deduct
  -> Events: DisputeResolved, PaymentReleased
  -> Indexer updates protocol_orders.status = 'FINALIZED', settlement info
```

### 16.6 Community

```
User: Create post
  -> Validate wallet connected (guest denied)
  -> Insert vào public.posts (RLS enforced)
  -> Supabase Realtime fanout (nếu subscribed)
  -> Feed refresh

Comment / Reaction: tương tự, insert vào public.comments / public.reactions
```

### 16.7 Notification System

```
In-app notifications:
  NotificationProvider (React context) -> addNotification() -> toast (sonner)
  Event source: custom DOM event 'orina:notification-action'

Order notifications (useOrderNotifications hook):
  -> Poll hoặc Realtime protocol_orders changes
  -> Emit notification cho buyer/seller khi status change

Chat notifications (App.tsx pollChatNotifications):
  -> Poll getChatConversations() mỗi 2500ms
  -> So sánh unreadCount với snapshot trước
  -> Emit notification nếu có unread mới
```

---

## 17. Smoke Tests

### 17.1 Auth

- [ ] Wallet sign-in (SIWE / claim bridge) pass
- [ ] Logout clear session
- [ ] Protected pages reject anonymous (redirect về home)
- [ ] Session persistence qua refresh

### 17.2 Marketplace

- [ ] Asset list load đủ items
- [ ] Filters (category, price range, verified) hoạt động
- [ ] Asset detail page loads, data khớp `protocol_assets` projection
- [ ] `is_verified` flag hiển thị đúng

### 17.3 Mint

- [ ] Media upload → IPFS CID trả về
- [ ] Metadata pin → CID hợp lệ
- [ ] Tx submit → tx hash nhận được
- [ ] Indexer ingest event (sau vài block)
- [ ] `protocol_assets` row được tạo với đúng `token_id`, `owner_address`

### 17.4 Order Lifecycle

- [ ] Create listing → `protocol_orders` status = `PENDING_SELLER_CONFIRM`
- [ ] Seller confirm → status = `PENDING_BUYER_PAY`
- [ ] Buyer pay → status = `PAID`
- [ ] Confirm delivery → status = `FINALIZED`, payment released
- [ ] Cancel order → status = `CANCELLED`, funds returned

### 17.5 Dispute

- [ ] Open dispute trong window → `DisputeOpened` event
- [ ] Arbiter resolve → verdict correct
- [ ] Settlement executed → buyer/seller nhận đúng amount

### 17.6 Messaging

- [ ] Create conversation pass
- [ ] Send message pass (insert vào DB)
- [ ] Receiver gets Realtime update
- [ ] Unauthorized read blocked (RLS)
- [ ] Dedup: gửi cùng `client_message_id` không tạo duplicate

### 17.7 Community

- [ ] Create post pass
- [ ] Feed load đúng thứ tự
- [ ] Edit/delete chỉ cho owner
- [ ] Unauthorized edit/delete blocked (RLS)

### 17.8 Notifications

- [ ] In-app notification hiển thị khi order status change
- [ ] Chat notification poll hoạt động (ngoài messages page)
- [ ] Click notification → navigate đến đúng page

### 17.9 Security

- [ ] Agent key create/rotate pass
- [ ] Agent key revoke → key không còn dùng được
- [ ] `security_events` ghi đúng event
- [ ] Service role key không accessible từ browser network tab

---

## 18. Rollback Policy

### 18.1 Frontend

Rollback = promote deployment trước đó trên Vercel.

**Constraint**: Phải compatible với current DB schema và contract manifest. Kiểm tra migration compatibility trước khi rollback.

### 18.2 Database

Không rollback destructive migration trực tiếp trên production.

**Rule**: Migrations phải backward compatible tối thiểu 1 release. Dùng additive migrations (thêm column nullable, thêm table) thay vì drop/rename.

### 18.3 Contracts

Không có rollback thật cho on-chain state.

**Mitigation**:
1. Disable feature bằng flag (feature flag system)
2. Pause flow nếu contract hỗ trợ pause
3. Deploy contract version mới
4. Update manifest → update indexer `startBlock` → update frontend config

### 18.4 Indexer

```
1. Stop worker
2. Replay từ safe block (trước reorg/issue)
3. Rebuild projections từ event log nếu cần
4. Verify consistency (spot-check protocol_assets vs on-chain state)
5. Reopen feature
```

---

## 19. Monitoring

**Phải theo dõi**:
- Vercel: build status, error rate, latency
- Supabase: DB saturation, Realtime disconnect rate, auth error rate
- RPC: latency, error rate, block lag
- Indexer: event processing lag, reorg count, backfill status
- IPFS: pin failure rate, gateway availability
- Webhooks: signature verification failure rate

**Alert tối thiểu**:
- Indexer lag > 50 blocks (15 phút với BSC 3s/block)
- Mint pending > 30 phút (likely stuck tx)
- Auth failure spike (> 20/min)
- RPC error rate > 5%
- DB migration fail trên deploy
- Realtime outage (Supabase status)
- `protocol_orders` status không update sau 5 phút kể từ confirmed tx

---

## 20. Feature Flags

| Flag | Default | Coverage |
|---|---|---|
| `minting_studio` | enabled | Minting page visible |
| `messaging` | enabled | Messages page + chat polling |
| `community_posting` | enabled | Post create/comment/react |
| `ai_agent` | disabled | AI agent test page |
| `geo_map` | enabled | Map-based delivery address |
| `verified_only_filters` | disabled | Marketplace filter: verified sellers only |
| `notification_push` | disabled | Push notification channel |
| `fractional_receipt` | enabled | `FractionalReceiptNFT` flow |
| `dispute_resolution` | enabled | Dispute open/resolve UI |
| `auto_timeout` | enabled | `AutoTimeManager` bot active |

---

## 21. Repository Structure

```
ATP2/
├── src/
│   ├── app/
│   │   ├── App.tsx                    # Shell, navigation state, provider stack
│   │   ├── components/                # 80+ components (pages, modals, sidebars)
│   │   │   ├── minting.tsx            # Minting studio (54KB)
│   │   │   ├── orders.tsx             # Order management (59KB)
│   │   │   ├── marketplace.tsx        # Marketplace browser
│   │   │   ├── messages.tsx           # Messaging UI (67KB)
│   │   │   ├── left-sidebar.tsx       # Navigation sidebar
│   │   │   ├── navbar.tsx             # Top bar
│   │   │   └── ...
│   │   ├── contexts/                  # ThemeContext
│   │   └── types/
│   ├── config/
│   │   ├── contracts.ts               # Contract addresses + ABIs entry + enums
│   │   ├── abis.ts                    # Full ABIs (41KB)
│   │   └── eip712.ts                  # EIP-712 type definitions
│   ├── contexts/
│   │   ├── NotificationContext.tsx
│   │   ├── UserContext.tsx
│   │   └── WalletModalContext.tsx
│   ├── hooks/                         # 28 hooks
│   │   ├── useMarketplace.ts
│   │   ├── useIPFSUpload.ts
│   │   ├── useContractEvents.ts
│   │   ├── useDisputeManager.ts
│   │   ├── useOrderNotifications.ts
│   │   └── ...
│   ├── providers/
│   │   └── Web3Provider.tsx           # Wagmi + WalletConnect config
│   ├── styles/                        # Global CSS + Tailwind tokens
│   ├── types/                         # 18 TypeScript type files
│   └── utils/                         # 48 utilities
│       ├── messagesClient.ts          # Supabase messaging client
│       ├── notifications.ts           # Notification helpers
│       ├── profileUtils.ts
│       └── ...
├── supabase/
│   ├── migrations/                    # 34 migrations (000001 → 000034)
│   └── functions/                     # Edge Functions
│       ├── make-server-b0d68fc8/      # Auth claim bridge
│       ├── orina-chat-v1/             # Chat utility
│       └── server/                    # Server helpers
├── scripts/
│   └── geo/                           # Geo data build scripts
├── public/                            # Static assets + guest landing
├── docs/
│   └── spec/                          # 10 spec files (current-code docs)
├── contracts/
│   └── deployments/
│       └── <env>.json                 # Contract manifest per environment
├── BSC_TESTNET_DEPLOYMENT_2026-03-14.md  # Deployment record
├── BSC_testnetdeploy_address.md          # Address reference
├── .env.example                           # Env template
└── vite.config.ts                         # Build config
```

---

## 22. Mandatory Invariants

```
✗ Frontend KHÔNG ghi chain-derived state (owner, token_id, mint_status, order status)
✗ chain-derived state CHỈ được cập nhật bởi indexer qua service role
✗ SUPABASE_SERVICE_ROLE_KEY KHÔNG bao giờ ra client
✗ Authenticated routes KHÔNG public cache (Cloudflare)
✗ Asset metadata phải pin thành công TRƯỚC khi mint tx submit
✗ Indexer phải biết deployment block TRƯỚC khi start
✗ Release phải version cả: frontend + DB migrations + contract manifest + indexer startBlock
✗ Migrations phải backward compatible tối thiểu 1 release
✗ Contract address KHÔNG hardcode mà không có version manifest
✗ Secrets KHÔNG commit vào repo, KHÔNG reuse giữa các environment
✗ client_message_id trong messaging phải unique per (conversation, sender) để dedup
✗ IPFS CID phải được verify trước khi dùng làm tokenURI
```

---

*Spec này được tổng hợp từ codebase ATP2 thực tế tại commit hiện tại (2026-03-14). Mọi thay đổi về địa chỉ contract, schema, hoặc flow phải update spec đồng thời.*
