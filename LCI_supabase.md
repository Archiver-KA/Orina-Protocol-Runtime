# Asset Flow Audit — ATP2
## Scope
Tài liệu này chốt luồng `Asset` thống nhất giữa:
- on-chain
- runtime local
- Supabase projection
- UI surfaces

Mục tiêu:
- không còn mock asset đi lạc vào public catalog
- không còn route asset detail cũ map sang dữ liệu giả
- owned assets, receipt NFTs, collections, và marketplace catalog đọc đúng nguồn

Lưu ý vận hành:
- credentials/secrets không còn được lưu trong file này
- dùng `.env`, `foundry/.env`, hoặc secret manager cho mọi key vận hành

## Canonical Sources

### 1. Public Marketplace Asset
Nguồn chuẩn:
- Supabase `assets_catalog`

Reader chính:
- `src/utils/marketplaceCatalog.ts`

Consumer:
- `src/app/components/marketplace.tsx`
- `src/app/components/search/search-page.tsx`
- `src/app/components/asset-details/canonical-asset-details-route.tsx`
- `src/utils/collectionsUtils.ts` cho asset thuộc source `marketplace`

Quy tắc:
- chỉ hiển thị rows có `is_active = true`
- không fallback sang `mockMarketplaceData`
- nếu catalog rỗng: UI phải hiện empty state thật

Trạng thái hiện tại:
- đã sạch mock fallback

### 2. Owned RWA / Owned NFT Runtime
Nguồn chuẩn hiện tại:
- local runtime store trong `src/utils/runtimeMintedAssets.ts`
- shadow sync lên Supabase `protocol_assets`

Reader chính:
- `loadRuntimeMyAssets(wallet)`
- `hydrateRuntimeMintedAssetsFromSupabase(wallet)`

Consumer:
- `src/app/components/assets.tsx`
- `src/app/components/assets-right-sidebar.tsx`
- `src/utils/collectionsUtils.ts` cho asset thuộc source `owned`

Quy tắc:
- đây là owned/runtime surface, không phải public catalog
- `protocol_assets` đang đóng vai runtime shadow cho minted assets chưa index hoàn chỉnh
- không được dùng dữ liệu này để render marketplace/search public

Trạng thái hiện tại:
- RWA minted và NFT owned đã sạch mock generic
- wallet không có dữ liệu thật sẽ ra empty state

### 3. Receipt NFT
On-chain source:
- `RWAReceiptNFT`

Contract hook hiện có:
- `src/hooks/useReceipts.ts`

UI source hiện tại:
- deterministic wallet fixture cho A/B test wallets
- modal/card receipt chỉ dùng canonical snapshot sẵn có từ wallet surface

Gap hiện tại:
- chưa có receipt projection end-to-end từ chain -> Supabase -> Assets UI
- chưa có runtime receipt store tương đương `runtimeMintedAssets`
- `ReceiptDetailModal` đã bỏ dữ liệu bịa, nhưng mới render snapshot tối thiểu

Kết luận:
- receipt đã sạch mock presentation
- receipt chưa hoàn thiện projection

### 4. Collections
Nguồn chuẩn:
- local runtime collections
- Supabase `collections`
- Supabase `collection_assets`
- Supabase `user_collection_favorites`
- Supabase `user_collection_follows`

Reader chính:
- `src/utils/collectionsUtils.ts`

Collection asset membership có thể trỏ tới:
- owned assets
- marketplace listing assets

Quy tắc:
- collection chỉ nên tham chiếu asset ID có thể resolve từ source canonical
- nếu asset không resolve được: không dựng mock thay thế

Trạng thái hiện tại:
- collection owned/runtime vẫn hoạt động
- không còn `MOCK_COLLECTIONS` fallback
- nếu không có runtime hoặc Supabase data: collection surfaces trả empty state thật

## On-Chain -> Off-Chain Flow

### A. Public Listing / Marketplace
1. Asset/listing được projection vào `assets_catalog`
2. `marketplaceCatalog.ts` hydrate cache local từ `assets_catalog`
3. `Marketplace`, `Search`, `CanonicalAssetDetailsRoute` render từ cache/projection này

Không còn:
- `mockMarketplaceData`
- `mockAssetData`
- old asset detail page

### B. Minted Asset / Owned Asset
1. Mint flow tạo runtime record trong `runtimeMintedAssets`
2. runtime record sync lên `protocol_assets`
3. `Assets` và `AssetsRightSidebar` load từ runtime + runtime shadow
4. collections owned có thể resolve asset từ runtime đó

Lưu ý:
- `protocol_assets` đang giữ `pending_indexing` runtime shadow
- chưa phải projection public cuối cùng

### C. Receipt NFT
1. Order finalize mint receipt NFT on-chain
2. hiện chưa có receipt projector chuẩn về Supabase/UI
3. Assets wallet surface chỉ render được fixture snapshot hoặc snapshot tối thiểu đã biết

Kết luận:
- đây là khoảng trống lớn nhất còn lại trong asset flow

## UI Surface Matrix

| Surface | Canonical Source | Mock Status | Ghi chú |
|---|---|---|---|
| Marketplace | `assets_catalog` | Clean | Không còn fallback mock |
| Search | `assets_catalog` | Clean | Không còn fallback mock |
| Asset Detail Route | `marketplaceCatalog` | Clean | Route cũ đã loại bỏ |
| Assets Page | runtime + deterministic fixture overlay | Clean generic mock | Không còn `mockRWAAssets/mockReceiptNFTs/mockDigitalNFTs` |
| Assets Right Sidebar | runtime + deterministic fixture overlay | Clean | Analytics đã tính từ snapshot thật |
| Receipt Detail Modal | wallet receipt snapshot | Clean presentation | Chưa có deep receipt projection |
| Collections | runtime + Supabase collections + catalog | Clean | Không còn fallback mock trong asset-facing path |

## Deterministic Fixture Policy

Fixtures được phép tồn tại chỉ cho:
- test wallets A/B
- owned wallet surfaces
- QA deterministic flow

Fixtures không được phép đi vào:
- marketplace catalog public
- search public
- canonical asset detail route
- public listing metadata bridge

Files liên quan:
- `src/utils/testWalletAssetFixtures.ts`
- `src/utils/assetMetadataSync.ts`

Quy tắc đã áp dụng:
- `assetMetadataSync.ts` chỉ seed owned fixture metadata
- không seed `favoriteListingAssetIds` mock vào bridge nữa
- owned fixture rows luôn `isActive = false`

## Major Fixes Completed

### Phase 1
- loại route asset detail cũ:
  - removed `src/app/components/asset-details/asset-details-page.tsx`
- thay bằng:
  - `src/app/components/asset-details/canonical-asset-details-route.tsx`

### Phase 2
- `src/utils/marketplaceCatalog.ts`
  - bỏ `MOCK_MARKETPLACE_ASSETS` fallback
  - stats/categories/blockchains khi rỗng trả `0` hoặc `[]`
- `src/utils/assetMetadataSync.ts`
  - bỏ bridge từ listing mock/public mock
  - chỉ giữ deterministic owned fixture seed

### Phase 3
- `src/app/components/assets.tsx`
  - bỏ toàn bộ generic asset mocks
  - dùng canonical portfolio snapshot
- `src/app/components/assets-right-sidebar.tsx`
  - bỏ toàn bộ analytics hardcode
  - dùng cùng snapshot với `Assets`
- `src/app/components/receipt-detail-modal.tsx`
  - bỏ receipt modal mock
  - chỉ render receipt snapshot thật đang có
- `src/utils/assetsPortfolio.ts`
  - thêm portfolio builder dùng chung cho asset surfaces

### Phase 4
- `src/utils/collectionsUtils.ts`
  - bỏ `MOCK_COLLECTIONS` fallback
- removed mock asset source files:
  - `src/utils/mockMarketplaceData.ts`
  - `src/utils/mockAssetData.ts`
  - `src/utils/mockCollectionsData.ts`
  - `src/utils/mockRWAData.ts`
  - `src/utils/mockSearchData.ts`

### Phase 5
- rà static toàn bộ asset-facing paths:
  - `Marketplace`
  - `Search`
  - canonical asset detail route
  - `Assets`
  - `AssetsRightSidebar`
  - `Favorites` interaction with catalog IDs
- added remote inspection script:
  - `supabase/audit/inspect_mock_assets_catalog.cjs`
- added targeted cleanup migration:
  - `supabase/migrations/000041_remove_mock_marketplace_assets.sql`
- added catch-all cleanup migration:
  - `supabase/migrations/000042_remove_remaining_mock_marketplace_assets.sql`
- executed remote cleanup against linked Supabase project via `supabase db query`
- repaired remote migration history for `000041`
- deterministic A/B favorite listing fixture IDs removed
- local favorites now prune legacy unresolved `asset-###` mock IDs

Live cleanup result on 2026-03-26:
- removed all legacy public mock rows from `assets_catalog`
- removed namespaces:
  - `asset_namespace = marketplace_listing`
  - `seed_source = c2_asset_metadata_seed_bridge_v1`
- verification readback returned `count = 0` for:
  - `asset-001`
  - `asset-002`
  - `asset-003`
  - `asset-004`
  - `asset-005`
  - `asset-006`
  - `asset-007`
  - `asset-008`
  - `asset-009`
  - `asset-010`
  - `asset-011`
  - `asset-012`
  - `asset-013`
  - `asset-014`
  - `asset-015`

Operational note:
- remote data cleanup for `000042` was executed successfully via `supabase db query --linked`
- `supabase migration repair --linked --status applied 000042` failed once due CLI Postgres auth for `cli_login_postgres`
- remote data state is canonical, but migration history may still show `000042` pending until repair is retried

## Current Gaps

### 1. Receipt Projection
Thiếu:
- chain -> Supabase receipt projector
- receipt runtime store
- canonical receipt detail model beyond card-level snapshot

Ảnh hưởng:
- receipt detail hiện đúng nhưng còn nông
- chưa có ownerOf/tokenId/orderId/amount projection cho UI owned receipt end-to-end

### 2. Direct NFT Branch
NFT transferable đang là nhánh riêng về mặt protocol design.

Hiện trạng:
- owned NFT surface có thể hiển thị runtime + fixture
- direct-buy/listing branch như OpenSea chưa phải canonical production flow trong repo này

### 3. Non-asset Mock / Static UX Outside Catalog
Các item này không còn là public asset source, nhưng vẫn là static UX ngoài scope cleanup catalog:
- `Search` profile mode vẫn dùng mock seller profiles
- `Search` market trend cards vẫn là static presentation data

Chúng không còn feed vào Marketplace/Search asset catalog hoặc asset detail.

## Consistency Rules

1. Public asset surfaces chỉ được đọc từ `assets_catalog`
2. Owned wallet surfaces chỉ được đọc từ runtime/projection owned
3. Receipt detail không được bịa QR/custodian/hash nếu chưa có projection thật
4. Nếu thiếu dữ liệu: render empty/read-only/not-indexed
5. Không được fallback sang mock để “làm đầy UI”

## Recommended Next Work

### Priority 1
Thiết kế receipt projection chuẩn:
- on-chain receipt event ingestion
- Supabase receipt table hoặc receipt metadata projection
- wallet owned receipt resolver
- receipt detail model đầy đủ

### Priority 2
Tách hẳn direct NFT spot branch khỏi các owned/runtime placeholder còn lại

## File Ownership Map

### Public Catalog
- `src/utils/marketplaceCatalog.ts`
- `src/app/components/marketplace.tsx`
- `src/app/components/search/search-page.tsx`
- `src/app/components/asset-details/canonical-asset-details-route.tsx`

### Owned Assets
- `src/utils/runtimeMintedAssets.ts`
- `src/utils/assetsPortfolio.ts`
- `src/app/components/assets.tsx`
- `src/app/components/assets-right-sidebar.tsx`

### Receipt
- `src/hooks/useReceipts.ts`
- `src/app/components/receipt-detail-modal.tsx`

### Collections
- `src/utils/collectionsUtils.ts`

## Final Status
Asset flow hiện tại đã đạt trạng thái:
- public asset catalog: canonical
- asset detail route: canonical
- owned asset page/sidebar: canonical snapshot based
- receipt modal: no synthetic data

Điểm chưa hoàn tất:
- receipt projection end-to-end

Đây là điểm chính còn lại để nói rằng `Asset flow` sạch mock và nhất quán hoàn toàn.
