# Current State And Demo Surfaces

## This Repo Is Hybrid

The current runtime mixes several implementation classes:

- real wallet and protocol flows
- Supabase-backed catalog, profile, community, messaging, review, API-key, and AI surfaces
- protocol projection tables mirroring on-chain state
- wallet-scoped local runtime caches
- presentation-heavy dashboard and fallback/demo widgets
- explicit smoke and audit tooling

Do not assume every visible UI card is backed by the same durability layer.

## Production-Backed Or Runtime-Backed Areas

The following areas have current runtime backing:

- wallet connection and wallet auth session
- live BNB Chain Testnet protocol config
- EIP-712 order/dispute signing config
- marketplace/search catalog hydration from Supabase
- protocol asset/order projections
- delivery address geo tables and local cache
- profile identity and remote profile sync
- messages through Supabase/Edge Function paths
- reviews and reputation summary tables
- API key generation and server-side API credential storage
- AI agent and seller automation settings where Edge Functions are configured

## Local-First Or Local-Shadow Areas

The following areas still persist important behavior locally:

- wallet auth session
- Supabase claim bridge session
- wallet profile cache
- wallet settings and theme preference
- delivery address cache
- runtime minted assets shadow
- runtime orders shadow
- favorites/following cache
- search history
- selected protocol network
- AI sidebar active conversation id

Some of these hydrate from Supabase, but the local path remains important for browser UX and recovery.

## Presentation Or Demo-Leaning Areas

The following should be treated carefully when documenting production behavior:

- overview dashboard charts and summary widgets
- empty-state fallback panels
- legacy fixture-backed owned-asset examples when no runtime data exists
- selected analytics visualizations
- smoke-specific generated data

These areas can be useful UI surfaces, but they should not be cited as canonical contract or database truth.

## Removed Or Reduced Mock Assumptions

The active marketplace/search catalog should not be described as `MOCK_MARKETPLACE_ASSETS`-first. Current code uses `marketplaceCatalog.ts`, Supabase hydration, and protocol projection enrichment.

The old durable localStorage marketplace catalog cache has also been removed. LocalStorage is still used for UI stats deltas and other wallet-scoped caches, but not as the canonical marketplace listing store.

## Shell Constraints

Current structural constraints:

- the public home can load without the runtime shell
- connected app surfaces are lazy-loaded behind `RuntimeApp`
- routing is URL-aware through `src/utils/appRoutes.ts`, but page state still drives the runtime shell
- guest mode and connected mode have different access rules
- some pages use shared studio UI primitives while older sections still have page-local layouts

## Documentation Contract

Current docs should:

- document code paths that exist now
- name the source of truth for each feature
- label projections as projections
- label local cache/shadow state as local
- label demo/fallback behavior explicitly
- avoid reviving stale claims from older Make/Figma documentation

## Recommended Rule For Future Docs

When changing documentation:

1. Read the current code path first.
2. Identify on-chain, Supabase, Edge Function, and local state boundaries.
3. Document the user-facing workflow and the underlying source of truth separately.
4. Keep old audit logs and roadmap claims out of active user-facing documentation unless they still apply.

