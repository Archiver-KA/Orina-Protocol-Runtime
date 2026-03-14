# Assets, Marketplace, Search, And Orders

## Data Reality

These commerce surfaces are currently mock-first UI flows with selected local persistence and modal workflows layered on top.

Primary data sources:

- [`src/utils/mockMarketplaceData.ts`](../../src/utils/mockMarketplaceData.ts)
- [`src/utils/testWalletAssetFixtures.ts`](../../src/utils/testWalletAssetFixtures.ts)
- page-local mock arrays inside feature components

## Overview

[`src/app/components/main-content.tsx`](../../src/app/components/main-content.tsx) is the current overview dashboard.

Current role:

- dashboard surface
- analytics cards
- charts
- summary indicators

This page is presentation-heavy and not a source of record for backend truth.

## Marketplace

[`src/app/components/marketplace.tsx`](../../src/app/components/marketplace.tsx) is the main asset discovery surface.

Current behavior:

- supports `assets` and `profiles` content modes
- supports `grid`, `list`, and `map` views
- filters by search, category, blockchain, and verified state
- uses `SearchResultCard` for assets
- uses `ProfileSearchCard` for seller profiles
- opens `AssetDetailsModal` for asset drill-down
- uses favorite state through wallet-scoped favorites storage

Current asset dataset:

- `MOCK_MARKETPLACE_ASSETS`

Current seller profile dataset:

- `getMockSellerProfiles()`

## Search

[`src/app/components/search/search-page.tsx`](../../src/app/components/search/search-page.tsx) is a separate search surface, but it now uses the same marketplace asset dataset rather than its old demo-only card path.

Current behavior:

- same underlying `MarketplaceAsset` dataset as marketplace
- supports asset and profile search
- supports list and grid results
- uses a right-sidebar filter stack
- persists search queries to local search history

This page is aligned with marketplace card data, but still front-end filtered rather than server queried.

## My Assets

[`src/app/components/assets.tsx`](../../src/app/components/assets.tsx) is the wallet-owned asset surface.

Current structure:

- portfolio summary panel
- segmented tabs for `All Assets`, `RWA Minted`, `Receipts`, and `NFT Owned`
- three current card archetypes in [`src/app/components/cards/my-asset-cards.tsx`](../../src/app/components/cards/my-asset-cards.tsx)

Current card groups:

- RWA owned or minted assets
- receipt NFT cards
- owned digital NFT cards

Current modal actions:

- seller asset management
- transfer asset
- list for sale
- receipt detail

Current data source:

- wallet-specific fixtures from `getTestWalletMyAssets(address)`
- fallback page-local mock arrays if fixture data is missing

## Orders

[`src/app/components/orders.tsx`](../../src/app/components/orders.tsx) is the order lifecycle UI.

Current behavior:

- order search and filtering by network and state
- three-signature visual flow
- countdowns and dispute windows
- buyer and seller action buttons
- detailed summary sidebar

Current order actions surface through modals:

- seller delivery-duration confirmation
- buyer confirm delivery
- open dispute
- dispute resolution
- order details
- confirmation and rejection flows

Current order data is page-local mock data. The page models contract-like state, but it is not yet the live contract source of truth.

## Shared Card System

Two current card families matter here:

- [`src/app/components/search-result-card.tsx`](../../src/app/components/search-result-card.tsx) for marketplace, search, favorites, and related listing-like surfaces
- [`src/app/components/cards/my-asset-cards.tsx`](../../src/app/components/cards/my-asset-cards.tsx) for owned-asset surfaces

These are now the canonical asset-card implementations in the UI.

## Asset Details

[`src/app/components/asset-details-modal.tsx`](../../src/app/components/asset-details-modal.tsx) remains the cross-feature asset drill-down surface. Marketplace and search both use it.

## Practical Consequence

If a change affects listing cards, owned-asset cards, favorites, or asset modals, it usually spans multiple pages at once. Treat marketplace, search, favorites, and profile favorites as one card ecosystem, not independent implementations.
