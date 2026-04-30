# Assets, Marketplace, Search, And Orders

## Data Reality

These commerce surfaces are hybrid runtime flows. They are no longer accurately described as uniformly mock-first.

Current data classes:

- Supabase-backed public catalog and seller profile data
- on-chain protocol state read through contract hooks
- Supabase protocol projection tables
- wallet-scoped local runtime caches
- presentation/demo fallback widgets in selected dashboard and empty-state areas

## Overview

[`src/app/components/main-content.tsx`](../../src/app/components/main-content.tsx) is the connected dashboard overview.

Current role:

- dashboard surface
- summary indicators
- analytics-style cards and charts
- entry points into orders, assets, marketplace, and profile activity

It is not the source of record for protocol truth.

## Marketplace

[`src/app/components/marketplace.tsx`](../../src/app/components/marketplace.tsx) is the main discovery surface.

Current behavior:

- supports asset and profile content modes
- supports grid, list, and map views
- filters by search, category, blockchain/network, and verified state
- uses `SearchResultCard` for assets
- uses `ProfileSearchCard` for seller profiles
- routes asset drill-down through canonical asset detail routes
- uses wallet-scoped favorites and following state

Current catalog source:

- [`src/utils/marketplaceCatalog.ts`](../../src/utils/marketplaceCatalog.ts)

Current remote tables and RPC:

- `assets_catalog`
- `profiles`
- `asset_protocol_links`
- `protocol_assets`
- `protocol_orders`
- `get_asset_listing_stats_v1`

The old durable localStorage marketplace catalog cache has been removed. The catalog starts from in-memory state and hydrates from Supabase when REST config is available.

## Marketplace Map

Map markers depend on `assetLocationSnapshot.coordinates`.

Those coordinates are derived from delivery address geo data and asset metadata snapshots. The runtime should not create random fallback coordinates for real assets.

## Search

[`src/app/components/search/search-page.tsx`](../../src/app/components/search/search-page.tsx) uses the same marketplace catalog as Marketplace.

Current behavior:

- asset and profile search
- category and subcategory navigation
- grid and list results
- search history persistence
- seller directory hydration from catalog/profile data

Search is frontend-filtered over the hydrated runtime catalog, not a separate search-index service.

## My Assets

[`src/app/components/assets.tsx`](../../src/app/components/assets.tsx) is the wallet-owned asset surface.

Current structure:

- portfolio summary panel
- segmented tabs for all assets, RWA minted, receipts, and NFT owned
- seller asset management modal
- transfer/listing/receipt detail modals
- runtime hydrated marketplace catalog context

Current runtime minted asset source:

- [`src/utils/runtimeMintedAssets.ts`](../../src/utils/runtimeMintedAssets.ts)
- local key `orina_runtime_minted_assets_v2:<chainId>:<assetContract>`
- optional hydration from `protocol_assets`

## Orders

[`src/app/components/orders.tsx`](../../src/app/components/orders.tsx) is the ATP lifecycle UI.

Current behavior:

- order search and filtering by network and state
- role-aware buyer and seller actions
- three-signature visual flow
- countdowns for seller confirm, buyer re-sign, delivery, and auto-finalize windows
- detail summary panels and dispute modals
- on-chain write hooks for seller confirm, pay order, confirm delivery, and open dispute

Current order source:

- [`src/utils/runtimeOrders.ts`](../../src/utils/runtimeOrders.ts)
- local key `orina_runtime_orders_v2:<chainId>:<marketplaceContract>`
- optional hydration from `protocol_orders`
- contract reconciliation through order lifecycle and protocol hooks

## Order Lifecycle

[`src/utils/orderLifecycle.ts`](../../src/utils/orderLifecycle.ts) resolves the user-facing phase:

- `Waiting Seller Confirm`
- `Seller Confirm Expired`
- `Waiting Buyer Re-Sign`
- `Buyer Re-Sign Expired`
- `Agreed Delivery`
- `Awaiting Auto Finalize`
- `Auto Finalize Ready`
- `Disputed`
- `Finalized`
- `Cancelled`

The active protocol windows are:

- seller confirm: 24 hours
- buyer re-sign after revised seller timing: 24 hours
- buyer action window after delivery time: 3 days
- dispute period: 14 days, with one arbiter extension path

## Buying Modals

Current buy paths include:

- [`src/app/components/rwa-buy-order-sign-modal.tsx`](../../src/app/components/rwa-buy-order-sign-modal.tsx)
- [`src/app/components/nft-buy-direct-sign-modal.tsx`](../../src/app/components/nft-buy-direct-sign-modal.tsx)

RWA purchase is the canonical ATP flow in the current deployment. The NFT-type branch exists in UI code and contract enum constants, but direct-buy NFT behavior should only be documented as release-ready after target deployment and smoke validation.

## Disputes

Dispute UI surfaces include:

- open dispute modal
- dispute resolution modal
- confirm delivery modal
- confirm release modal

Dispute writes use hooks in [`src/hooks/useDisputeManager.ts`](../../src/hooks/useDisputeManager.ts), including arbiter resolution, 2-of-3 agreement, mutual split, extension, and stale-dispute resolution.

## Shared Card System

Two current card families matter:

- [`src/app/components/search-result-card.tsx`](../../src/app/components/search-result-card.tsx) for listing-like surfaces
- [`src/app/components/cards/my-asset-cards.tsx`](../../src/app/components/cards/my-asset-cards.tsx) for owned-asset surfaces

Changes to listing cards usually affect Marketplace, Search, Favorites, and Profile surfaces together.

## Practical Consequence

Treat on-chain contract state as authoritative, Supabase protocol tables as projections, and local runtime records as wallet-scoped cache/shadow state. Do not describe a remote projection as contract truth, and do not describe old mock data as the active marketplace source.

