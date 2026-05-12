# Global Delivery Address And Asset Location

Last verified by Codex audit: 2026-05-12

## Scope

This spec describes the current runtime address system for:

- settings delivery address editing
- global geo hierarchy lookup
- mint-time delivery selection
- asset location snapshotting
- asset address display in asset details
- marketplace map marker placement

It is based on the code currently running in `src/`. It does not describe an aspirational schema-only target. It documents the active local-first and Supabase-backed hybrid flow.

## Core Data Model

### Geo reference data

Geo types live in:

- [`src/types/address.ts`](../../src/types/address.ts)

Current geo shapes:

- `GeoCountry`
- `GeoPlace`
- `GeoAddressSchema`
- `DeliveryGeoSelection`

Current geo runtime behavior:

- countries and places load through [`src/utils/deliveryAddressUtils.ts`](../../src/utils/deliveryAddressUtils.ts)
- the loader is Supabase-first and seed-fallback
- `geo_countries` and `geo_places` are the canonical remote tables
- `GEO_SEED_COUNTRIES` and `GEO_SEED_PLACES` are the current fallback dataset

### User delivery addresses

User delivery address types live in:

- [`src/types/address.ts`](../../src/types/address.ts)

Current shapes:

- `DeliveryAddressDraft`
- `DeliveryAddressRecord`
- `DeliveryAddressValidationStatus`
- `DeliveryAddressSource`

Current storage and sync logic lives in:

- [`src/utils/deliveryAddressUtils.ts`](../../src/utils/deliveryAddressUtils.ts)

Current persistence model:

- wallet-scoped local cache under `orina_delivery_addresses_<wallet>`
- sync event `orina:delivery-addresses-changed`
- remote sync through Supabase REST into `user_delivery_addresses`

### Asset-level address snapshots

Asset snapshot types live in:

- [`src/types/asset.ts`](../../src/types/asset.ts)
- [`src/app/types/asset.ts`](../../src/app/types/asset.ts)

Current shapes:

- `AssetDeliverySnapshot`
- `AssetLocationSnapshot`

Important distinction:

- `DeliveryAddressRecord` is the editable user address source in Settings
- `AssetDeliverySnapshot` is the mint-time snapshot of the full delivery context
- `AssetLocationSnapshot` is the mint-time snapshot optimized for asset display and map placement

## Source Of Truth Rules

The current address system follows one directional flow:

1. user edits a delivery address in Settings
2. minting reads either the default address or a one-time override
3. minting snapshots the chosen address into the minted asset
4. asset details and marketplace map read the asset snapshot only

This rule is intentional:

- changing Settings later must not change the address already attached to an older minted asset
- `Asset Details` must not read the live Settings address
- `Marketplace map` must not derive coordinates from random or current user settings once an asset exists

## Settings Delivery Address

The current settings entrypoint is:

- [`src/app/components/settings.tsx`](../../src/app/components/settings.tsx)

The active address block is:

- [`src/app/components/settings/delivery-address-block.tsx`](../../src/app/components/settings/delivery-address-block.tsx)

The searchable geo selectors are:

- [`src/app/components/settings/delivery-address-select.tsx`](../../src/app/components/settings/delivery-address-select.tsx)

Current UI behavior:

- `Recipient Name` and `Phone Number`
- `Country`
- dynamic geographic levels driven by the selected country schema
- `Postal Code`
- `Address Line 1`
- `Address Line 2`
- `Delivery Instructions`
- `Set as default shipping address`
- `Normalized Preview`
- `Address draft is in sync`

Current validation behavior:

- country is required
- address line 1 is required
- required geo levels are enforced from `country.addressSchema.levels`
- postal code validation uses leaf-place override first, then country-level pattern

Current save behavior:

- save goes through `saveUserDeliveryAddress()`
- default-address uniqueness is enforced in the frontend normalization path
- sync is remote-first when Supabase REST is available, otherwise local-first

## Mint-Time Delivery Selection

The minting delivery section lives in:

- [`src/app/components/minting-delivery-section.tsx`](../../src/app/components/minting-delivery-section.tsx)

The mint flow entrypoint is:

- [`src/app/components/minting.tsx`](../../src/app/components/minting.tsx)

Current minting behavior:

- seller can choose `Default Address` or `Other Address`
- `Default Address` reads the preferred address from Settings data
- `Other Address` uses a one-time override draft
- the override draft reuses the same geo dropdown system as Settings
- mint is blocked if the chosen delivery mode is incomplete or unresolved

Current minting UI states:

- `Normalized Preview`
- `Address draft is in sync` for default mode
- one-time override readiness state for other mode

## Snapshot Creation At Mint

Snapshot helpers live in:

- [`src/utils/deliveryAddressUtils.ts`](../../src/utils/deliveryAddressUtils.ts)

Current helper behavior:

- `buildAssetLocationSnapshot(...)` resolves the leaf place from `draft.geoPath`
- coordinates are taken from `GeoPlace.lat/lng`
- the display string is built by `formatDeliveryAddressPreview(...)`

Current minted asset write path:

- [`src/app/components/minting.tsx`](../../src/app/components/minting.tsx)
- [`src/utils/runtimeMintedAssets.ts`](../../src/utils/runtimeMintedAssets.ts)

At successful mint, the runtime asset currently stores:

- `deliverySnapshot`
- `assetLocationSnapshot`

Current runtime minted asset store:

- localStorage key `orina_runtime_minted_assets_v1`
- sync event `orina:runtime-minted-assets-changed`

## Asset Details Address Display

Asset details modal lives in:

- [`src/app/components/asset-details-modal.tsx`](../../src/app/components/asset-details-modal.tsx)

Current behavior in `Details` tab:

- renders `Asset Address` when `asset.assetLocationSnapshot.displayAddress` exists
- shows normalized display address
- shows `countryNameSnapshot`
- shows `precision`

Current rule:

- asset details should read `assetLocationSnapshot`
- it should not read the current settings address
- it should not rebuild display text from unrelated legacy fields

## Marketplace Map Synchronization

Marketplace page lives in:

- [`src/app/components/marketplace.tsx`](../../src/app/components/marketplace.tsx)

Current map behavior:

- map markers use `asset.assetLocationSnapshot.coordinates`
- assets without coordinates are excluded from map markers
- marker city label is derived from the last `geoPath` item or falls back to `countryNameSnapshot`
- random coordinates are no longer used for runtime map placement

Current marketplace catalog hydration also carries `assetLocationSnapshot` when remote catalog rows provide location data:

- [`src/utils/marketplaceCatalog.ts`](../../src/utils/marketplaceCatalog.ts)

This means:

- catalog assets and runtime minted assets now use the same location model when location snapshots are present
- asset details and map view both read the same snapshot shape

## Persistence Boundaries

Current address system is hybrid:

- geo reference data: Supabase-first with local seed fallback
- user delivery addresses: local-first cache with Supabase sync
- minted asset location: runtime local persistence on the client

Current remote tables used by the address system:

- `geo_countries`
- `geo_places`
- `user_delivery_addresses`

Operational and migration docs for those tables live in:

- [`09-supabase-migration-and-geo-import.md`](./09-supabase-migration-and-geo-import.md)
- [`10-geo-import-runbook.md`](./10-geo-import-runbook.md)

## Legacy And Constraints

Current constraints:

1. Minted asset address persistence is runtime local, not yet a backend asset registry field.
2. Seeded marketplace data already has fixed snapshots, but external backend assets do not exist in this repo state.
3. The legacy `location?: string` field still exists in some asset types and should be treated as backward-compatible only.
4. `AssetLocationSnapshot` is the active model for display and map behavior.

## Change Guidance

If you modify the address system:

- update both [`src/types/address.ts`](../../src/types/address.ts) and any dependent asset snapshot types
- preserve `Settings -> Mint -> Asset snapshot -> Display` as a one-way flow
- do not make asset details depend on current Settings values
- do not reintroduce random map coordinates
- keep `AssetDeliverySnapshot` and `AssetLocationSnapshot` separate
- update minting, asset details, and marketplace map together when changing snapshot shape

If you change the remote geo dataset process:

- keep schema and import workflow aligned with
  - [`09-supabase-migration-and-geo-import.md`](./09-supabase-migration-and-geo-import.md)
  - [`10-geo-import-runbook.md`](./10-geo-import-runbook.md)
