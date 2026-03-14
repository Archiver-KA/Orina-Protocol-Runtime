# App Shell And Navigation

## Core Model

The app is a single React shell driven by page state in [`src/app/App.tsx`](../../src/app/App.tsx). It does not use a route-based page architecture for the main product surfaces.

Primary navigation state:

- `activePage`
- `previousPage`
- `selectedAssetId`
- `selectedConversationId`
- `selectedProfileAddress`
- `searchQuery`
- `sidebarCollapsed`

## Provider Stack

Top-level providers in the current app shell:

- `Web3Provider`
- `NotificationProvider`
- `WalletModalProvider`
- `UserProvider`

Theme state is applied separately through [`src/app/contexts/ThemeContext.tsx`](../../src/app/contexts/ThemeContext.tsx).

## Guest Versus Connected Shell

There are two major shell modes.

### Guest Home

When there is no effective connected wallet and `activePage === 'home'`, the app renders:

- full-screen guest landing via [`src/app/components/public-home-page.tsx`](../../src/app/components/public-home-page.tsx)
- overlay navbar via [`src/app/components/navbar.tsx`](../../src/app/components/navbar.tsx)

This mode does not render the left sidebar or the standard multi-column app layout.

### Main Product Shell

For non-home or wallet-connected usage, the shell renders:

- left sidebar via [`src/app/components/left-sidebar.tsx`](../../src/app/components/left-sidebar.tsx)
- top navbar via [`src/app/components/navbar.tsx`](../../src/app/components/navbar.tsx)
- main content column
- optional right sidebar depending on the page

## Page Surfaces In The Current App

Pages currently wired in `App.tsx`:

- `home`
- `overview`
- `orders`
- `marketplace`
- `market-insights`
- `minting`
- `assets`
- `community`
- `messages`
- `profile`
- `history`
- `settings`
- `ai-agent-test`
- `notification-demo`
- `asset-details`
- `search`
- `favorites`
- `watchlist`
- `bulk-demo`
- `wallet-demo`
- `style-guide`
- `ipfs-test`

## Right Sidebar Usage

Dedicated right sidebars are currently mounted for:

- `overview`
- `minting`
- `assets`
- `community`
- `history`

Other major pages such as `marketplace`, `search`, `messages`, `profile`, and `settings` render their own internal multi-column layouts instead of using the generic shell sidebar slots.

## Navigation Behavior

The shell uses handler-based navigation instead of URL routing:

- page changes are done through `setActivePage`
- asset drill-down is done by setting `selectedAssetId`
- profile drill-down is done by setting `selectedProfileAddress`
- message thread deep-linking is done by setting `selectedConversationId`

This means cross-feature navigation is stateful and centralized inside `App.tsx`.

## Search Entry Points

Search can be triggered from the navbar and from feature-local search inputs.

Global shell search currently forwards the query into the `search` page state rather than using a dedicated search router.

## Practical Consequence

Any change to page flow, sidebar composition, guest gating, or cross-page jumps should be reviewed in `App.tsx` first. That file is the runtime contract for how the product is stitched together.
