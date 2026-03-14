# Access, Theme, User, And Storage

## Access Modes

Access mode is resolved in [`src/hooks/useAccessMode.ts`](../../src/hooks/useAccessMode.ts).

Current modes:

- `guest_forced`
- `guest_disconnected`
- `auth_pending`
- `user_connected`

Important runtime behavior:

- guest users can view major read surfaces
- some write actions are blocked in guest mode
- `auth_pending` is not treated like true guest mode for all UI capabilities

## User Initialization

Wallet-scoped user bootstrapping happens in [`src/hooks/useUserInitialization.ts`](../../src/hooks/useUserInitialization.ts).

Current responsibilities:

- create or load a wallet profile
- normalize default display name and username
- hydrate avatar and banner fields
- run wallet-scoped migrations for favorites, notifications, and conversations

## User Context

[`src/contexts/UserContext.tsx`](../../src/contexts/UserContext.tsx) is the local user state layer used by profile, navbar, and identity-aware UI.

Current characteristics:

- local-first
- backed by profile utilities
- persisted in `localStorage`
- self-heals older display-name formats into the new wallet-aware rules

## Theme Model

Theme runtime lives in [`src/app/contexts/ThemeContext.tsx`](../../src/app/contexts/ThemeContext.tsx).

Supported themes:

- `dark`
- `light`

Current behavior:

- theme is applied through CSS variables on `document.documentElement`
- theme preference is wallet-scoped
- runtime theme writes back to per-wallet settings so page changes do not silently revert theme

## Display Name Rules

Current display-name behavior is driven by [`src/utils/profileUtils.ts`](../../src/utils/profileUtils.ts).

Rules currently enforced in UI:

- if profile has never been customized, display name falls back to shortened wallet form such as `0x742d...9c4F`
- if profile has a custom display name, UI preview is truncated to `15` characters plus ellipsis
- the stored raw profile value is not truncated

## Primary Local Storage Keys

The codebase is heavily wallet-scoped and local-storage-backed.

Important keys:

- `orina_user_data`
- `user_profile_<scopedAddress>`
- `orina_user_settings_<address>`
- `orina_favorites_<address>`
- `orina_watchlist_<address>`
- `orina_watchlist_alerts_<address>`
- `orina_notifications_<address>`
- `orina_notification_prefs_<address>`
- `studio_search_history`
- `studio_community_posts`
- `studio_community_comments`
- `studio_user_actions`

## Favorites And Watchlist

[`src/utils/favoritesUtils.ts`](../../src/utils/favoritesUtils.ts) owns:

- favorites
- watchlist
- watchlist alerts
- optional wallet-scoped fixture seeding
- optional Supabase sync bridge

Favorites are used across marketplace, profile favorites, search, and asset cards.

## Notifications

[`src/utils/notifications.ts`](../../src/utils/notifications.ts) and [`src/contexts/NotificationContext.tsx`](../../src/contexts/NotificationContext.tsx) handle:

- in-app notifications
- wallet-scoped preferences
- desktop notifications
- sound playback
- deduplication through `sourceId`

## Search History

Search history is local and currently stored through `studio_search_history`. It is front-end scoped rather than backend-backed.

## Practical Consequence

Any feature touching identity, theme, favorites, notifications, or search history must be treated as wallet-scoped state, not global app state.
