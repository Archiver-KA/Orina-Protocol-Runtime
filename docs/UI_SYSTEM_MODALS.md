# UI System: Seller Modal, Favorites, Follow (Canonical)

This document defines the **canonical** code locations and data contracts for:
- Seller modal (profile preview)
- Favorites (heart / liked assets)
- Follow / unfollow (Following tab)

Scope:
- Frontend UI behavior and local persistence only (no on-chain authority).
- This is a stabilization reference to prevent demo components from overriding production behavior.

## 1) Seller Modal

**Component**
- `src/app/components/seller-modal.tsx`

**Props contract**
- `isOpen: boolean`
- `onClose: () => void`
- `seller: { name; avatar; rating; memberSince; isCreator; isVerified; totalSales; floorPrice; reviewCount }`

**Behavior**
- Fullscreen overlay, closes on backdrop click or close button.
- Tabs: `creations` and `reviews`.
- Current follow/message buttons are UI-only (placeholders). If you wire these, route them to:
  - Follow: `profileUtils.followUser()` / `profileUtils.unfollowUser()`
  - Message: navigate to Messages with peer wallet prefilled.

**Where it should be used**
- Asset details: when clicking seller block / “View seller”.
- Search/Marketplace profile results: “View Profile” can open this modal or navigate to profile page.

## 2) Favorites (Heart)

### Canonical storage + API
**Storage utils**
- `src/utils/favoritesUtils.ts`

**Key invariants**
- Favorites are **scoped by wallet** (address-based key).
- Favorites are **non-authoritative UI state** (cache-like); not financial truth.

**Primary functions**
- `loadFavorites(walletAddress)`
- `toggleFavorite(walletAddress, assetId)`
- `isFavorite(walletAddress, assetId)` (if used in UI)

### Canonical card interaction (Marketplace/Search)
**Card component**
- `src/app/components/search-result-card.tsx`
  - Must be the single canonical marketplace card style (grid/list/map variants).
  - Heart button calls `onLike(assetId)` and uses `isLiked` for state.

**Pages**
- Marketplace: `src/app/components/marketplace.tsx`
- Search: `src/app/components/search/search-page.tsx`

### Favorites views (Profile + Favorites page)
**Profile tab**
- `src/app/components/profile/enhanced-profile.tsx`
  - Tab `favorites` renders canonical `SearchResultCard` with `isLiked={true}`.

**Favorites & Following page**
- `src/app/components/favorites/favorites-watchlist-page.tsx`
  - Tab `favorites` uses canonical `SearchResultCard` and `toggleFavorite`.

## 3) Follow / Unfollow (Following)

### Canonical storage + API
**Profile utils**
- `src/utils/profileUtils.ts`

**Primary functions**
- `followUser(viewerAddress, targetAddress)`
- `unfollowUser(viewerAddress, targetAddress)`
- `isFollowing(viewerAddress, targetAddress)`

**Data model**
- `UserProfile.following: string[]` is the canonical list for “Following”.

### Canonical UI entrypoints
**Profile page**
- `src/app/components/profile/enhanced-profile.tsx`
  - Visitor mode shows `Follow/Following` button.
  - Owner mode hides follow button.

**Following tab page**
- `src/app/components/favorites/favorites-watchlist-page.tsx`
  - Tab `following` maps `profile.following` into `SellerProfileCardData`
  - Renders with `src/app/components/profile-search-card.tsx` (canonical profile card)

## Build safety: unused imports

If the repo enables TypeScript `noUnusedLocals` / `noUnusedParameters`,
then these files must avoid unused symbols:
- `src/app/components/profile/enhanced-profile.tsx`
- `src/app/components/favorites/favorites-watchlist-page.tsx`
- `src/app/components/seller-modal.tsx`

Rule: remove unused imports instead of disabling lint globally.

