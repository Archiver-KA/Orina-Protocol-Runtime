# Community, Messages, And Profile

## Community

The main community surface is [`src/app/components/community/enhanced-community.tsx`](../../src/app/components/community/enhanced-community.tsx).

Its data layer lives primarily in [`src/utils/communityUtils.ts`](../../src/utils/communityUtils.ts).

## Community Data Model

Community is currently local-first with optional Supabase REST synchronization.

Local storage keys:

- `studio_community_posts`
- `studio_community_comments`
- `studio_user_actions`

Current behavior:

- posts and comments are loaded locally first
- mock seed data is added if the system has not been initialized yet
- guest-mode writes are blocked
- likes and bookmarks are stored as user actions
- Supabase REST hydration and write-through are attempted when enabled
- claim-bridge exchange is used before certain remote community writes

## Community UX

Current community page includes:

- feed filters and sort modes
- create-post modal
- post interactions
- threaded comments
- bookmarks and likes
- trending topics and right-sidebar widgets

## Messages

[`src/app/components/messages.tsx`](../../src/app/components/messages.tsx) is the current messaging surface.

Current runtime model:

- one main conversation layout
- default AI agent test conversation
- backend-backed wallet conversations when available
- polling plus realtime invalidation hooks

Message transport is handled by [`src/utils/messagesClient.ts`](../../src/utils/messagesClient.ts).

Current primary backend target:

- Supabase Edge Function `orina-chat-v1`

Current fallback behavior:

- alternative function paths are attempted if the primary path is unavailable

Current message UX includes:

- conversation list
- message thread
- send text
- local image attachment preview
- emoji picker
- new conversation modal
- user info sidebar
- local report-user modal

## Profile

The current profile page is [`src/app/components/profile/enhanced-profile.tsx`](../../src/app/components/profile/enhanced-profile.tsx).

It is address-driven and supports both owner view and visitor view.

### Current Tabs

- `overview`
- `story`
- `activity`
- `favorites`

### Current Profile Behaviors

- load or create wallet profile by address
- distinguish between own profile and another wallet's profile
- sync owner profile edits back through user context
- load real local activity records
- derive wallet identity and trust metrics
- allow follow and unfollow
- allow opening direct message flow to the viewed profile

### Story Tab

Current story editor behavior:

- heading, paragraph, and image blocks
- character limit
- image count limit
- story settings panel on the right
- local editing only
- owner-only controls

### Favorites Tab

Profile favorites currently render the same `SearchResultCard` ecosystem as marketplace and search, using marketplace-compatible asset adaptation when needed.

## Reputation And Trust

Profile right-sidebar metrics are derived from [`src/utils/walletIdentityStore.ts`](../../src/utils/walletIdentityStore.ts) and related reputation utilities.

Current sidebar sections include:

- reputation score
- asset breakdown
- recent reviews
- trust metrics
- trust badges

## Practical Consequence

Community, messages, and profile are all identity-sensitive surfaces. Changes here usually touch wallet-scoped state, notification side effects, and cross-feature navigation at the same time.
