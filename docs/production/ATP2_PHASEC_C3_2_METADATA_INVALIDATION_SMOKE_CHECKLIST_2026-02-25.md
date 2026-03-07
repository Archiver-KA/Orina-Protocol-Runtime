# ATP2 Phase C / C3.2 - Asset Metadata Invalidation Smoke Checklist (2026-02-25)

## Muc tieu
- Xac nhan `C3.1` invalidation event + targeted rehydrate hooks hoat dong on dinh.
- Chot `CP-C3` baseline gate o muc:
  - metadata seed/hydrate khong gay mat state card
  - cross-browser visibility dung sau refresh
  - khong ghi de namespace `asset-*` (listing) va `twf-*` (owned)

## Invariant
- `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`
- `asset-*` = on-sale / public-active
- `twf-*` = owned fixture / hidden from public catalog (`is_active=false`)

## Pre-check
- `npm run build` PASS (sau C3.1 patch)
- H1 function `make-server-b0d68fc8` da deploy (asset metadata seed route dang hoat dong)
- Test wallets:
  - A = `0x282Be18838D7079C215F49749a9606d77e00888b`
  - B = `0x335AD6D59Bc128394dC5A6B176be9Aafe0302aa0`

## Automated Regression (run first)
1. Chay probe C2 persisted metadata de loai tru hoi quy nen tang:
   - `node supabase/audit/batch_c2_asset_metadata_seed_smoke_probe.cjs`
2. Pass criteria:
   - `pass = true`
   - listing public rows present
   - owned fixture seed ack + hidden from public catalog

## Manual Smoke (2 browser / 2 wallet)
### Step 1 - Seed trigger from My Assets
1. Browser A (wallet A) mo `Assets` tab
2. Browser B (wallet B) mo `Assets` tab
3. Ky vong:
   - `My Assets` card set A/B khac nhau, on dinh sau refresh
   - Khong co card listing (`asset-*`) chen vao `My Assets`

### Step 2 - Favorites / Watchlist targeted rehydrate (event-driven)
1. O browser A, mo `Favorites` (hoac `Watchlist`) cho cac listing da seed (`asset-*`)
2. Quay lai `Assets` tab (My Assets) de trigger metadata seed neu chua co
3. Quay lai `Favorites` / `Watchlist`
4. Ky vong:
   - Card listing reload metadata khong bi mat item
   - Anh/ten/category on dinh, khong nhay sang owned card style
   - Khong can hard refresh de thaysu thay doi (listener self-refresh hoac rehydrate nhanh)

### Step 3 - Profile favorites tab targeted rehydrate
1. Mo profile cua wallet co favorites
2. Chuyen qua tab `Favorites`
3. Trigger metadata seed (vao `Assets` roi quay lai)
4. Ky vong:
   - Favorite cards reload on dinh
   - Khong loi console blocker

### Step 4 - Asset details self-refresh safety
1. Mo 1 `asset-*` detail page
2. Trigger metadata seed tu 1 man khac (Assets / Favorites)
3. Ky vong:
   - Asset detail page khong crash
   - UI van render on dinh (event listener force re-render an toan)

### Step 5 - Cross-browser visibility baseline (CP-C3 baseline)
1. Browser A trigger seed metadata (Assets)
2. Browser B refresh `Favorites/Watchlist/AssetDetails`
3. Ky vong:
   - Browser B thay metadata public o listing cards dung/sau refresh
   - `twf-*` khong lo ra Marketplace/Search/Favorites

## Early-fail Signals
- Favorite/Watchlist card bien mat sau metadata seed
- Card type bi doi namespace (`asset-*` <-> `twf-*`)
- Console error blocker tu listener/event loop
- Browser B khong doc duoc public listing metadata sau refresh

## Log ket qua (bat buoc)
- Ghi PASS/FAIL vao:
  - `docs/production/need_Fix.md`
  - `docs/production/ATP2_OFFCHAIN_REALTIME_COMPLETION_SPEC_2026-02-25.md`
- Neu PASS:
  - danh dau `C3` -> `CP-C3` baseline dat
  - chuyen sang `C4` (notifications matrix optimization)
