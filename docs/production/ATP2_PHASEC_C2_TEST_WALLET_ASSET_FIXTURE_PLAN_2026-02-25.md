# ATP2 Phase C / C2 - Test Wallet Asset Fixture Plan (Deterministic Mock Assets) (2026-02-25)

## Status
- `C2` prep: fixture plan locked (implementation next)
- Scope: wallet-specific mock asset dataset cho 2-browser / 2-wallet testing
- Input references:
  - `docs/CARD_SYSTEM.md` (canonical card constraints)
  - Test wallets (user-provided):
    - Wallet A: `0x282Be18838D7079C215F49749a9606d77e00888b`
    - Wallet B: `0x335AD6D59Bc128394dC5A6B176be9Aafe0302aa0`

## 1. Muc tieu
- Tao bo mock assets **deterministic** va **chinh xac theo wallet** cho 2 vi test A/B.
- Phuc vu:
  - `C2` Asset metadata persist + sync foundation
  - `C3` Asset metadata realtime behavior
  - Regression UI 2-browser / 2-wallet
- Loai bo su phu thuoc vao random/mock generic trong cac flow test chinh.

## 2. Rang buoc tu CARD_SYSTEM (must obey)
Theo `docs/CARD_SYSTEM.md`:
- `My Assets` page phai dung dung **3 variants canonical**:
  - `MyAssetRwaCard`
  - `MyAssetReceiptCard`
  - `MyAssetNftCard`
- Khong dua "demo cards" / gallery cards ngoai canonical flow vao navigation.

=> Fixture C2 phai map duoc vao 3 variants nay, khong duoc tao shape khac.

## 3. Nguyen tac Fixture (Locked)
### 3.1 Deterministic
- Khong dung `Math.random()` cho test-wallet fixtures A/B.
- Moi asset co:
  - `stable id`
  - `stable tokenId`
  - `stable name/slug`
  - `stable owner/seller`
  - `stable image`
  - `stable stats` (co the fake, nhung phai on dinh)

### 3.2 Wallet-scoped
- Cung 1 wallet -> cung 1 bo fixtures sau moi lan refresh.
- Wallet A va Wallet B co dataset rieng, co cross-relations de test social/favorites/watchlist.

### 3.3 Metadata-first ready (for C2)
- Moi fixture local phai co mapping key de upsert vao:
  - `assets_catalog`
  - `asset_media`
  - `asset_tags`
  - `asset_tag_map`
- Khong yeu cau protocol onchain mapping trong C2 (Phase D).

### 3.4 Backward-compatible
- Wallet khac A/B tiep tuc dung `mockAssetData` generic/fallback (tam thoi).
- Khong pha current UI pages dang goi `generateMockAsset(...)`.

## 4. Canonical Test Wallet Matrix (A/B)
## 4.1 Wallet A (Seller + Buyer mixed)
Wallet: `0x282Be18838D7079C215F49749a9606d77e00888b`

### My Assets (exact 3 canonical variants)
1. `A_RWA_001` (MyAssetRwaCard)
- Role: seller-owned listing (active)
- Category: `Real Estate`
- Example name: `Da Nang Boutique Villa Fraction #A01`
- Status: `Active`
- available/total: `62 / 100`
- min price: `1.80 ETH`

2. `A_RECEIPT_001` (MyAssetReceiptCard)
- Role: receipt NFT cua order mua tu Wallet B
- Category: `Collectibles`
- Example name: `Coffee Reserve Batch #B02 Receipt`
- `orderId`: `ORD-B2A-0001`
- `seller`: shorten(Wallet B)
- blockchain label: `BSC TESTNET`

3. `A_NFT_001` (MyAssetNftCard)
- Role: transferable digital NFT so huu boi A
- Category: `Digital Art`
- Example name: `Orina Signal Frame #A11`
- current/floor stable values

## 4.2 Wallet B (Seller + Buyer mixed)
Wallet: `0x335AD6D59Bc128394dC5A6B176be9Aafe0302aa0`

### My Assets (exact 3 canonical variants)
1. `B_RWA_001` (MyAssetRwaCard)
- Role: seller-owned listing (active)
- Category: `Collectibles`
- Example name: `Arabica Reserve Vault Fraction #B02`
- Status: `Active`
- available/total: `14 / 40`
- min price: `0.95 ETH`

2. `B_RECEIPT_001` (MyAssetReceiptCard)
- Role: receipt NFT cua order mua tu Wallet A
- Category: `Real Estate`
- Example name: `Da Nang Boutique Villa Fraction #A01 Receipt`
- `orderId`: `ORD-A2B-0001`
- `seller`: shorten(Wallet A)
- blockchain label: `BSC TESTNET`

3. `B_NFT_001` (MyAssetNftCard)
- Role: transferable digital NFT so huu boi B
- Category: `Gaming`
- Example name: `Orina Trade Pass #B07`

## 4.3 Cross-wallet relations (for test realism)
- A theo doi B, B theo doi A (social already tested)
- A co receipt lien quan asset do B ban (`ORD-B2A-0001`)
- B co receipt lien quan asset do A ban (`ORD-A2B-0001`)
- A/B co the favorite/watchlist asset cua nhau de test metadata hydrate

## 5. Fixture Dataset Layers (to implement in C2)
## 5.1 UI Layer Fixtures (for canonical cards)
Target file (proposed):
- `src/utils/mockAssetFixtures.ts`

Proposed exports:
- `getTestWalletMyAssets(walletAddress)` -> `{ rwaAssets, receiptAssets, nftAssets }`
- `isDeterministicTestWallet(walletAddress)` -> `boolean`

Used by:
- `src/app/components/assets.tsx` (replace hardcoded `mockRWAAssets/mockReceiptNFTs/mockDigitalNFTs` for A/B)

## 5.2 Metadata Layer Fixtures (for AssetDetails + Supabase mapping)
Target file (same or companion):
- `src/utils/mockAssetMetadataFixtures.ts` (optional split)

Proposed exports:
- `getTestWalletAssetDetailsSeeds(walletAddress): AssetDetails[]`
- `getDeterministicAssetById(id: string, walletAddress?: string): AssetDetails | null`
- `getAssetMetadataSeedRows(walletAddress)` -> rows for:
  - `assets_catalog`
  - `asset_media`
  - `asset_tags`
  - `asset_tag_map`

## 5.3 Mapping contract (local mock <-> remote metadata row)
Locked fields:
- `local_mock_asset_id` (e.g. `A_RWA_001`, `B_NFT_001`)
- `asset_uid` (stable string, proposed prefix: `twf_<walletShort>_<assetId>`)
- `slug` (stable, lowercase, URL-safe)

Proposed local map key:
- `orina_supabase_map_asset_fixture_<local_mock_asset_id>`

## 6. Exact Fixture Spec (Minimal v1)
## 6.1 Required fields per fixture (UI + metadata bridge)
- `fixtureId` (stable, unique)
- `ownerWallet`
- `sellerWallet` (co the = ownerWallet for RWA/NFT listing)
- `assetKind`: `rwa_listing | receipt_nft | digital_nft`
- `canonicalCardVariant`: `rwa | receipt | nft`
- `displayName`
- `category`
- `image`
- `tokenId`
- `contractAddress` (mock/stable, non-zero placeholder allowed in UI)
- `price fields`
- `order linkage` (receipt only)
- `metadata tags` (array)

## 6.2 Deterministic timestamps (for stable snapshots)
- Khong dung `Date.now()` trong fixture A/B.
- Dung fixed ISO dates / epoch values:
  - `2026-02-20`, `2026-02-21`, ...
- Giup snapshot/refresh tests khong bi drift.

## 7. C2 Implementation Steps (Derived from this plan)
### C2.1 Extract hardcoded My Assets mocks into wallet-aware fixture provider
- Refactor `src/app/components/assets.tsx`
- Keep fallback for non A/B wallets

### C2.2 Add deterministic AssetDetails fixtures for A/B
- Integrate with `generateMockAsset(...)` fallback path:
  - Neu id thuoc fixture set -> return deterministic fixture
  - Else -> generic random/demo generator

### C2.3 Metadata seed bridge (Supabase rows)
- Add adapter helper to upsert `assets_catalog/media/tags/map` for fixture assets
- Trigger on-demand when A/B opens pages requiring metadata

### C2.4 Smoke test (C2 gate)
- 2-browser / 2-wallet:
  - My Assets hien dung 3 variants canonical
  - Favorites/watchlist hien dung metadata cua assets fixture
  - Refresh khong doi asset names/images/prices ngau nhien

## 8. C2 Prep Checkpoint (Pass Criteria)
- [x] `CARD_SYSTEM` constraints da duoc map vao fixture design
- [x] 2 test wallets A/B da duoc lock trong spec
- [x] Canonical 3-variant My Assets matrix da duoc define cho moi wallet
- [x] Cross-wallet receipt/order relations da duoc define
- [x] Mapping contract local fixture -> remote metadata row da duoc chot o muc spec
- [x] C2 implementation steps + gates da duoc list ro

## 9. Decisions Locked (for next patch)
- Wallet A/B fixtures la **deterministic and exact**, khong random
- `assets.tsx` se uu tien wallet fixtures cho A/B de bao toan `CARD_SYSTEM`
- Generic `mockAssetData.ts` fallback van giu cho wallets khac trong giai doan transition

## 10. Next Action (Implementation)
- Implement `C2.1` + `C2.2`:
  - tao wallet fixture provider
  - patch `assets.tsx`
  - patch `mockAssetData.ts` deterministic resolver for A/B

