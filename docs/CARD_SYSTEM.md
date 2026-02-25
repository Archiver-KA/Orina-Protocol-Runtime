# Orina UI Card System (Canonical)

Status: production-safe, demo-free baseline

This document defines the canonical card components that are allowed to ship in production.
Any other "demo" cards (hard-coded assets, placeholder collections, card galleries) must be removed
or made unreachable from navigation/command palette.

## Principles
- One domain, one card system:
  - Marketplace/Search listing cards: one canonical component.
  - User/Profile discovery cards: one canonical component.
  - My Assets: exactly 3 variants (seller listing, receipt, transferable NFT).
- No "demo pages" should be reachable from Sidebar or Command Palette in production mode.

## Canonical Components

### 1) Marketplace/Search Listing Card
- Component: `src/app/components/search-result-card.tsx`
- Used in:
  - `src/app/components/marketplace.tsx`
  - `src/app/components/search/search-page.tsx`
- Requirements:
  - Must support grid/list modes.
  - Must support heart/favorite toggle (source of truth: `src/utils/favoritesUtils.ts`).

### 2) User Profile (Discovery) Card
- Component: `src/app/components/profile-search-card.tsx`
- Data source:
  - `src/utils/mockSellerProfiles.ts` (demo seed data) merged with `src/utils/profileUtils.ts` (local user profile).
- Used in:
  - Marketplace/Search "Profiles" mode (toggle Assets | Profiles)
  - Favorites/Following pages and profile visitor follow/unfollow entry points
- Requirements:
  - Compact style (banner `h-20`, avatar overlay, 3-column stats).
  - Follow/unfollow must update:
    - `profile.following` for the current wallet
    - `profile.followers` for the target wallet
  - Source of truth: `src/utils/profileUtils.ts` (address-scoped storage via `src/utils/storageScope.ts`).

### 3) My Asset Cards (3 Variants)
- Components: `src/app/components/cards/my-asset-cards.tsx`
  - `MyAssetRwaCard` (seller's own asset currently selling, has "Manage Asset")
  - `MyAssetReceiptCard` (receipt NFT, non-transferable; opens receipt detail)
  - `MyAssetNftCard` (transferable NFT; Transfer / List for Sale)
- Used in:
  - `src/app/components/assets.tsx`

## Demo Card Removal Checklist
- [x] Disable "CardLayoutTab" demo gallery: `src/app/components/notifications/card-layout-tab.tsx`
- [x] Disable "SellerModal" demo modal: `src/app/components/seller-modal.tsx`
- [x] Remove Notification demo route from App and Command Palette:
  - `src/app/App.tsx`
  - `src/hooks/useCommandPalette.ts`
- [ ] Audit remaining demo pages and ensure they are unreachable from prod navigation:
  - `bulk-demo`, `wallet-demo`, `style-guide`, `ipfs-test` (if still present)

## Verification
- Run:
  - `npm run build`
- Manual checks:
  - Profile page does not show any "Collected Assets" demo blocks.
  - Marketplace/Search only uses canonical listing cards and profile cards.
  - My Assets page uses only the 3 canonical My Asset cards.

