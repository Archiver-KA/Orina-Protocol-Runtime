---
name: components
description: "Skill for the Components area of ATP2. 144 symbols across 43 files."
---

# Components

144 symbols | 43 files | Cohesion: 70%

## When to Use

- Working with code in `src/`
- Understanding how confirmDelivery, Orders, resolveOrderById work
- Modifying components-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/app/components/orders.tsx` | Orders, resolveOrderById, showActionNotice, handleDurationConfirm, handleConfirmDelivery (+9) |
| `src/app/components/minting-delivery-section.tsx` | createMintOverrideDraft, loadData, handleSync, MintingDeliverySection, syncLocationSnapshot (+7) |
| `src/app/components/messages.tsx` | computePollBackoffMs, loadBackendConversations, loadBackendMessages, formatTimestamp, scheduleChatRefresh (+5) |
| `src/utils/deliveryAddressUtils.ts` | createEmptyDeliveryAddressDraft, draftFromDeliveryAddress, loadUserDeliveryAddresses, getPreferredDeliveryAddress, normalizeGeoPath (+3) |
| `src/utils/collectionsUtils.ts` | loadCollectionAssetOptions, loadCollectionsByOwner, updateCollection, addAssetToCollection, removeAssetFromCollection (+2) |
| `src/app/components/rwa-buy-order-sign-modal.tsx` | startOfLocalDay, addDays, RwaBuyOrderSignModal, syncDeliveryDays, handleSelectTargetDate (+2) |
| `src/app/components/assets.tsx` | getAssetSortValue, sortAssets, Assets, refreshRuntimeAssets, refreshCollections (+1) |
| `src/app/components/settings.tsx` | Settings, syncSettingsWithThemePreference, handleSettingsSync, handleSaveSettings, handleDiscardChanges |
| `src/utils/messagesClient.ts` | dispatchChatEvent, buildHeaders, sendMessage, markAsRead, createConversation |
| `src/app/components/minting.tsx` | buildRuntimeMintedAssetRecord, Minting, createMintingAttributeId, createMintingAttributeOption, createMintingAttributeGroup |

## Entry Points

Start here when exploring this area:

- **`confirmDelivery`** (Function) — `src/hooks/useMarketplace.ts:190`
- **`Orders`** (Function) — `src/app/components/orders.tsx:391`
- **`resolveOrderById`** (Function) — `src/app/components/orders.tsx:448`
- **`showActionNotice`** (Function) — `src/app/components/orders.tsx:453`
- **`handleDurationConfirm`** (Function) — `src/app/components/orders.tsx:539`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `confirmDelivery` | Function | `src/hooks/useMarketplace.ts` | 190 |
| `Orders` | Function | `src/app/components/orders.tsx` | 391 |
| `resolveOrderById` | Function | `src/app/components/orders.tsx` | 448 |
| `showActionNotice` | Function | `src/app/components/orders.tsx` | 453 |
| `handleDurationConfirm` | Function | `src/app/components/orders.tsx` | 539 |
| `handleConfirmDelivery` | Function | `src/app/components/orders.tsx` | 571 |
| `handleDeliveryConfirm` | Function | `src/app/components/orders.tsx` | 579 |
| `handleOpenDispute` | Function | `src/app/components/orders.tsx` | 595 |
| `handleDisputeConfirm` | Function | `src/app/components/orders.tsx` | 603 |
| `handleDisputeResolution` | Function | `src/app/components/orders.tsx` | 623 |
| `handleResolutionConfirm` | Function | `src/app/components/orders.tsx` | 631 |
| `handleBuyerConfirmOrder` | Function | `src/app/components/orders.tsx` | 646 |
| `handleBuyerCancelOrder` | Function | `src/app/components/orders.tsx` | 666 |
| `handleSellerRejectOrder` | Function | `src/app/components/orders.tsx` | 679 |
| `handleConfirmRelease` | Function | `src/app/components/orders.tsx` | 689 |
| `getTestWalletMyAssets` | Function | `src/utils/testWalletAssetFixtures.ts` | 131 |
| `loadRuntimeMyAssets` | Function | `src/utils/runtimeMintedAssets.ts` | 227 |
| `loadCollectionAssetOptions` | Function | `src/utils/collectionsUtils.ts` | 856 |
| `ensureAssetMetadataSeedForWalletFixtures` | Function | `src/utils/assetMetadataSync.ts` | 278 |
| `Assets` | Function | `src/app/components/assets.tsx` | 334 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleToggleFavorite → GetMockFallbackCatalog` | cross_community | 6 |
| `HandleToggleFavorite → GetMockFallbackCatalog` | cross_community | 6 |
| `FavoritesFollowingPage → SettingsRecordToAppSettings` | cross_community | 5 |
| `FavoritesPage → Normalize` | cross_community | 5 |
| `FavoritesPage → CloneFixture` | cross_community | 5 |
| `NotificationProvider → NormalizeAddress` | cross_community | 5 |
| `NotificationProvider → SafeObject` | cross_community | 5 |
| `NotificationProvider → ToBoolean` | cross_community | 5 |
| `NotificationProvider → ToStringValue` | cross_community | 5 |
| `Refresh → SettingsRecordToAppSettings` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_15 | 12 calls |
| Profile | 6 calls |
| Hooks | 5 calls |
| Cluster_32 | 4 calls |
| Cluster_70 | 4 calls |
| Cluster_73 | 4 calls |
| Settings | 4 calls |
| Cluster_6 | 3 calls |

## How to Explore

1. `gitnexus_context({name: "confirmDelivery"})` — see callers and callees
2. `gitnexus_query({query: "components"})` — find related execution flows
3. Read key files listed above for implementation details
