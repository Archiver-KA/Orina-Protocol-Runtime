# ATP2 Phase C / C3.1 - Asset Metadata Invalidation Hooks Checkpoint (2026-02-25)

## Scope
- Them event invalidation cho asset metadata sau khi seed/update metadata qua bridge.
- Gắn listener self-refresh o cac man hinh dang render card qua `generateMockAsset(...)`.
- Khong mo rong sang realtime subscription Supabase trong batch nay.

## Invariant
- `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`
- `asset-*` (on-sale) va `twf-*` (owned) phai giu namespace tach biet, khong ghi de state.

## Implemented
- `src/utils/assetMetadataSync.ts`
  - Export `ASSET_METADATA_CHANGED_EVENT = 'orina:asset-metadata-changed'`
  - Dispatch event sau khi bridge seed tra ve rows va cache `asset_id` local duoc cap nhat
- UI listeners (self-refresh):
  - `src/app/components/favorites/favorites-page.tsx`
  - `src/app/components/favorites/watchlist-page.tsx`
  - `src/app/components/favorites/favorites-watchlist-page.tsx`
  - `src/app/components/profile/enhanced-profile.tsx`
  - `src/app/components/asset-details/asset-details-page.tsx`

## Test
- `npm run build` -> PASS

## Pass Criteria (C3.1)
- Event invalidation co the duoc emit sau metadata seed thanh cong
- Cac man hinh card chinh co listener refresh theo event
- Khong regression build

## Next (C3.2)
- Tao smoke gate cho metadata invalidation behavior:
  - A/B mo `Assets` (seed metadata)
  - Favorites/Watchlist/AssetDetails refresh theo event/rehydrate khong mat card state
  - Kiem tra cross-browser visibility sau manual refresh (muc tieu CP-C3 baseline)
