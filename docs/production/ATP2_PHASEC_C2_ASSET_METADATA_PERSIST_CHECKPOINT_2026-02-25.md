# ATP2 Phase C / CP-C2 Asset Metadata Persist Checkpoint (2026-02-25)

## Status
- ✅ `CP-C2` PASS
- Scope: `C2` Asset metadata persist + sync foundation
- Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## 1. What Was Implemented (C2.1 -> C2.3)
### C2.1 Wallet-aware deterministic My Assets fixtures (A/B)
- `My Assets` now uses deterministic fixtures for 2 test wallets:
  - A: `0x282Be18838D7079C215F49749a9606d77e00888b`
  - B: `0x335AD6D59Bc128394dC5A6B176be9Aafe0302aa0`
- Canonical card variants preserved (`CARD_SYSTEM.md`):
  - `MyAssetRwaCard`
  - `MyAssetReceiptCard`
  - `MyAssetNftCard`

### C2.2 Namespace-separated mock asset resolver
- `generateMockAsset(id)` now resolves by namespace in order:
  1. `twf-*` (owned fixture metadata)
  2. `asset-*` (marketplace listing metadata)
  3. generic fallback
- This prevents state/card overwrite between:
  - `Marketplace/Search/Favorites` (on-sale)
  - `My Assets` (owned)

### C2.3 Asset metadata seed bridge foundation
- Added client metadata seed adapter (`assetMetadataSync`) for:
  - `assets_catalog`
  - `asset_media`
  - `asset_tags`
  - `asset_tag_map`
- Added H1 backend route `asset-metadata-seed` (service-role) to write metadata under hardened RLS.
- `Assets` page triggers seed on-demand for A/B fixture assets + linked listing IDs.
- `favorites/watchlist` asset resolution falls back to metadata seed bridge before direct client write attempts.

## 2. C2 Gate Test Results
## 2.1 Frontend regression (after each important step)
- ✅ `npm run build` pass after C2.1/C2.2
- ✅ `npm run build` pass after C2.3 client-side adapter wiring
- ✅ `npm run build` pass after H1 backend route add

## 2.2 Backend deploy
- ✅ `npx supabase functions deploy make-server-b0d68fc8 --project-ref vcixsdudkizgfikhmfuv --no-verify-jwt`

## 2.3 Persisted metadata smoke probe (automated)
- Artifact:
  - `supabase/audit/batch_c2_asset_metadata_seed_smoke_probe.cjs`
  - latest result:
    - `supabase/audit/batch_c2_asset_metadata_seed_smoke_probe_2026-02-25T12-21-49.json`
- Result: ✅ PASS

### Probe Pass Summary
- `seed_route_reachable = true`
- `catalog_public_rows_present_for_listing_set = true`
- `owned_fixture_seed_acknowledged = true`
- `owned_fixture_hidden_from_public_catalog = true`
- `listing_rows_active = true`
- `media_rows_present_for_each_catalog = true`
- `tag_map_rows_present_for_each_catalog = true`

## 3. Important Locked Behavior (C2 outcome)
### 3.1 Public vs Owned metadata visibility (intentional)
- `asset-*` listing rows are seeded with `is_active = true`
  - visible via public read policy (`assets_catalog_select_active_v1`)
- `twf-*` owned fixture rows are seeded with `is_active = false`
  - not visible in public catalog read
  - still persisted and addressable via internal mapping / service-role route

This behavior is **correct** and matches the user requirement:
- assets đang bán hiển thị ở Marketplace/Search/Favorite
- assets đã sở hữu nằm trong My Assets

### 3.2 C2 scope completed
- Persisted metadata foundation for A/B deterministic fixtures is now in place.
- Favorites/watchlist can resolve stable `asset_id` through seeded metadata rows.

## 4. Remaining for Asset Metadata (next phase C3)
- Realtime/polling invalidation strategy for metadata list/detail/favorites/watchlist
- Cross-browser metadata update visibility semantics
- Sync-state UX (`stale/syncing`) if needed

## 5. Next Batch
- ▶ `C3` Asset Metadata Realtime Behavior (strategy + implementation)

