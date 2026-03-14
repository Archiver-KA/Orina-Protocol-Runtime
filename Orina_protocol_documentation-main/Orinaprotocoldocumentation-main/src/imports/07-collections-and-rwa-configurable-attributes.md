# Collections And RWA Configurable Attributes

## Scope

This spec describes the current runtime behavior for:

- collection discovery, favorites, follows, and owner curation
- collection create/edit flows
- RWA offchain configurable attributes
- buyer attribute selection and order snapshot propagation

It is based on the current frontend code and local-first runtime state. It does not assume a backend collection service, contract-level collection registry, or server-side order enrichment.

## Core Data Model

### Collections

Collection types live in:

- [`src/types/collection.ts`](../../src/types/collection.ts)

Current shapes include:

- `CollectionSummary`
- `CollectionDetails`
- `CollectionDraft`
- `CollectionFavorite`
- `CollectionFollow`

Collection storage and runtime logic live in:

- [`src/utils/collectionsUtils.ts`](../../src/utils/collectionsUtils.ts)

Current storage model:

- runtime collections are stored in `localStorage` under `orina_runtime_collections_v1`
- collection favorites are wallet-scoped
- collection follows are wallet-scoped
- collection changes emit `orina:collections-changed`

Current ownership model:

- a collection has one `ownerWallet`
- edit, add-asset, and remove-asset flows are owner-scoped
- non-owners can favorite and follow, but cannot mutate collection metadata or membership

### RWA Configurable Attributes

Attribute types live in:

- [`src/app/types/asset.ts`](../../src/app/types/asset.ts)
- [`src/types/asset.ts`](../../src/types/asset.ts)

Current shapes:

- `RwaConfigurableAttributeOption`
- `RwaConfigurableAttributeGroup`
- `RwaSelectedAttribute`

Important distinction:

- `Unit ID` remains the onchain unit/governance concept for things like `kg`, `liter`, `meter`, or similar base units
- `configurableAttributes` are offchain seller-defined options for more specific buyer choices such as `Grade`, `Packaging`, `Warehouse`, `Finish`, or `Size`

Current attribute schema:

- each group has `label`
- optional `helpText`
- `required`
- `selectionMode` of `single` or `multi`
- a list of selectable `options`

## Collection Surfaces

### Marketplace And Search

Collections are first-class discovery entities in:

- [`src/app/components/marketplace.tsx`](../../src/app/components/marketplace.tsx)
- [`src/app/components/search/search-page.tsx`](../../src/app/components/search/search-page.tsx)

Current behavior:

- `Marketplace` supports `assets`, `profiles`, and `collections`
- `Search` supports the same card family and runtime collection dataset
- both pages use the shared [`src/app/components/collection-card.tsx`](../../src/app/components/collection-card.tsx)
- both pages use the same runtime collection source via `loadRuntimeCollections()`
- favorite toggles are shared and wallet-scoped

### Favorites And Following

Collections are integrated into:

- [`src/app/components/favorites/favorites-following-page.tsx`](../../src/app/components/favorites/favorites-following-page.tsx)

Current behavior:

- `Favorites` has `Assets` and `Collections`
- `Following` has `Profiles` and `Collections`
- collection cards in these tabs use the same `CollectionCard` and the same runtime favorite/follow state as marketplace and search

### Profile

Profile integrates collections in:

- [`src/app/components/profile/enhanced-profile.tsx`](../../src/app/components/profile/enhanced-profile.tsx)

Current behavior:

- the former activity tab now surfaces collections
- own profile label is `My Collections`
- other-wallet profile label is `Collections`
- own profile can create collections
- own profile can open editor flows for owned collections
- other-wallet profile is read-only except favorite/follow behavior exposed through collection detail

### My Assets

Collections are also surfaced in:

- [`src/app/components/assets.tsx`](../../src/app/components/assets.tsx)

Current behavior:

- wallet owner can create collections
- wallet owner can edit owned collections
- wallet owner can add eligible assets to owned collections

Asset eligibility for add-to-collection is currently derived from:

- owned deterministic wallet fixtures
- marketplace assets whose seller matches the active wallet

This logic is implemented through `loadCollectionAssetOptions()` in:

- [`src/utils/collectionsUtils.ts`](../../src/utils/collectionsUtils.ts)

## Collection Detail Behavior

Collection detail currently exists as a modal, not a standalone route:

- [`src/app/components/collections/collection-details-modal.tsx`](../../src/app/components/collections/collection-details-modal.tsx)

Current owner behavior:

- can open `Edit Collection`
- can open `Add Asset`
- can remove assets inline from the collection

Current non-owner behavior:

- can favorite the collection
- can follow or unfollow the collection
- cannot mutate metadata or membership

Current asset drill-down behavior:

- clicking an asset inside a collection opens the shared asset detail modal

## Collection Mutation Rules

Current rule set:

1. Only the owner wallet can create or update a collection.
2. Only the owner wallet can add or remove collection assets.
3. Favorites are independent from follows.
4. Collection membership is a curated set, not a mirror of live marketplace state.

Practical consequence:

- if an asset was added while listed, the collection membership still represents seller curation
- the collection layer should not be interpreted as a canonical listing registry

## RWA Attribute Setup In Minting

Seller-side setup lives in:

- [`src/app/components/minting.tsx`](../../src/app/components/minting.tsx)

Current behavior:

- the `Buyer Attributes` block is shown only for RWA minting
- seller can add zero or more attribute groups
- seller can add zero or more options per group
- each group can be `required` or optional
- each group can be `single` or `multi` select

Current default:

- newly added groups are optional unless the seller explicitly marks them required

This is intended to support cases like:

- `Unit ID = kg` onchain
- optional offchain seller setup such as `Purity`, `Warehouse`, or `Packaging`

## Buyer Selection In Asset Details

Buyer-side selection lives in:

- [`src/app/components/asset-details-modal.tsx`](../../src/app/components/asset-details-modal.tsx)

Current behavior:

- RWA assets can render a `Buyer Attributes` section when `configurableAttributes` exist
- buyer selections are kept in modal-local state
- required groups must be selected before the `Buy Now` action becomes valid
- quantity changes do not replace the chosen attribute selection

Current validation:

- if any required group is empty, `Buy Now` is blocked
- the UI explicitly shows which required groups are still missing

## Order Snapshot Propagation

Buyer attribute selections are carried into the buy/sign flow through:

- [`src/app/components/rwa-buy-order-sign-modal.tsx`](../../src/app/components/rwa-buy-order-sign-modal.tsx)
- [`src/utils/runtimeOrders.ts`](../../src/utils/runtimeOrders.ts)
- [`src/types/order.ts`](../../src/types/order.ts)

Current behavior:

- asset detail modal passes `selectedAttributes` into the RWA sign modal
- sign modal shows a `Selected Attributes` summary
- successful sign creates a runtime order with `selectedAttributes`

Current runtime order model:

- `selectedAttributes` is stored on `OrderUiRecord`
- runtime orders persist in `localStorage` under `orina_runtime_orders_v1`

## Seller Visibility In Order Details

Seller-side review of buyer selections lives in:

- [`src/app/components/order-details-modal.tsx`](../../src/app/components/order-details-modal.tsx)

Current behavior:

- order details render a `Buyer Selections` block when the order contains attribute snapshots
- seller sees the exact grouped values chosen by the buyer
- order detail reads the stored order snapshot, not the current asset definition

This is important because:

- seller-configurable attribute groups may change later
- order details should still show what the buyer selected at purchase time

## Current Persistence Boundaries

The current implementation is local-first and hybrid:

- collections are local runtime entities with wallet-scoped favorites/follows
- buyer attribute selections do persist into runtime orders
- seeded and mock marketplace assets can already expose configurable attributes

Current non-goals in this repo state:

- no server-backed collection service
- no onchain collection registry
- no backend-synced follow graph
- no contract-level storage of configurable attribute choices shown here

## Known Constraints

1. Collection detail is a modal surface, not a dedicated page route.
2. Collection and follow counts are client-derived from the local runtime layer.
3. Collections are curated client-side membership sets.
4. The repo documents current order snapshot propagation, not a final backend settlement schema.
5. `Unit ID` and offchain configurable attributes must remain separate concepts.

## Change Guidance

If you modify collection or attribute flows:

- update both type layers in `src/app/types/asset.ts` and `src/types/asset.ts`
- preserve owner-only mutation rules in `collectionsUtils.ts`
- keep buyer-side validation in `asset-details-modal.tsx`
- keep order snapshot rendering aligned in `rwa-buy-order-sign-modal.tsx` and `order-details-modal.tsx`
- do not collapse `Unit ID` and `configurableAttributes` into one field
