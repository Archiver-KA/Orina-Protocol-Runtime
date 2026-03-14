# Integrations, Settings, And Tools

## Settings

[`src/app/components/settings.tsx`](../../src/app/components/settings.tsx) is the current system settings surface.

Current sections:

- delivery address
- privacy and security
- notification preferences
- API keys
- AI agent settings
- language and region
- display preferences
- IPFS upload test tools
- developer reset tools

The page is wallet-scoped through `orina_user_settings_<address>`.

## Theme Integration

Settings is one of the primary writers of theme preference. Theme writes must stay synchronized with:

- runtime theme context
- wallet-scoped stored preference

That coupling currently exists between:

- [`src/app/contexts/ThemeContext.tsx`](../../src/app/contexts/ThemeContext.tsx)
- [`src/utils/themePreferences.ts`](../../src/utils/themePreferences.ts)
- [`src/app/components/settings.tsx`](../../src/app/components/settings.tsx)

## API Keys And AI Agent

Current configuration surfaces:

- [`src/app/components/api-keys-settings.tsx`](../../src/app/components/api-keys-settings.tsx)
- [`src/app/components/ai-agent-settings.tsx`](../../src/app/components/ai-agent-settings.tsx)

These are settings-driven tools rather than isolated product pages. The dedicated `ai-agent-test` page is still a test surface.

## Supabase

Supabase is used in multiple ways:

- REST hydration and sync for profiles, community, favorites, and notifications
- Edge Functions for chat transport
- migrations and backend workspace files under `supabase/`

The `supabase/` folder is now treated as implementation workspace only. Active specifications and planning documents should live under `docs/spec/`, not inside `supabase/`.

Important runtime helper layers:

- [`src/utils/supabaseRest.ts`](../../src/utils/supabaseRest.ts)
- [`src/utils/supabaseAuthClaimBridge.ts`](../../src/utils/supabaseAuthClaimBridge.ts)
- [`src/utils/messagesClient.ts`](../../src/utils/messagesClient.ts)

## IPFS

IPFS support exists in the codebase, but the current visible entry point is the settings-linked `ipfs-test` page rather than a single completed production asset-pipeline flow.

Relevant entry points:

- [`src/app/components/settings.tsx`](../../src/app/components/settings.tsx)
- [`src/app/components/ipfs-test-page.tsx`](../../src/app/components/ipfs-test-page.tsx)
- upload components in `src/app/components/`

## Wallet Integration

Wallet connectivity is a first-class app boundary.

Relevant layers:

- Wagmi account state
- wallet modal provider
- wallet connect button
- wallet transaction and signature modals

The product assumes wallet presence for most persistent write actions.

## Public Home Page

The guest landing surface is split between:

- [`src/app/components/public-home-page.tsx`](../../src/app/components/public-home-page.tsx)
- embedded landing markup in [`public/orina-home/index.html`](../../public/orina-home/index.html)

That means hero layout, guest shell behavior, and landing branding are partly controlled outside the normal React component tree.

## Tooling Surfaces Still Wired In

Pages still exposed in `App.tsx` for testing or internal use:

- `ai-agent-test`
- `notification-demo`
- `bulk-demo`
- `wallet-demo`
- `style-guide`
- `ipfs-test`

These should be treated as operational or internal surfaces, not end-user core product pages.
