# Current State And Demo Surfaces

## This Repo Is Not Uniformly Production-Backed

The current codebase mixes several runtime classes:

- real shell and wallet flows
- local-first product state
- optional Supabase-backed synchronization
- mock-backed feature pages
- explicit demo and test pages

Any planning or delivery work should start from that assumption.

## Mock-First Areas

The following areas are currently driven largely by mock or fixture data:

- overview dashboard
- marketplace listings
- search results
- my assets cards
- large parts of orders
- many profile review and trust visuals
- seller and listing presentation data

This does not make the pages useless, but it means the UI contract is ahead of the backend contract in several places.

## Local-First Areas

The following areas currently persist important behavior in `localStorage` first:

- user profile
- theme preference
- favorites
- watchlist
- notifications
- community feed
- community comments
- search history

Some of these can sync remotely when the environment is configured, but the local path is still the primary durability path visible in the code.

## Hybrid Areas

Current hybrid surfaces:

- community: local-first plus optional Supabase REST sync
- notifications: local-first plus optional remote sync
- favorites/watchlist: local-first plus optional remote sync
- messages: backend-driven but with local UI state, polling, and AI-agent test fallback

## Demo And Internal Pages

Pages still wired as active surfaces for testing or internal review:

- `ai-agent-test`
- `notification-demo`
- `bulk-demo`
- `wallet-demo`
- `style-guide`
- `ipfs-test`

If a change request references one of these pages, confirm whether it is still meant to ship as an end-user surface before expanding it.

## Shell Constraints

Current structural constraints in the app:

- no URL-first router for primary product pages
- page transitions are state-driven from `App.tsx`
- guest mode and connected mode do not share the same page shell
- some visual systems are centralized in shared studio UI components, but others still remain page-local

## Documentation Contract

This new spec set is intentionally conservative.

It documents:

- what the code currently does
- what data sources it currently uses
- where the main boundaries are

It does not document:

- abandoned plans
- historical migration checkpoints
- aspirational backend architecture that is not represented in the current repo

## Recommended Rule For Future Docs

When updating documentation in this repo:

- document current code paths first
- mark mock-backed behavior explicitly
- keep historical planning outside the active docs set
- prefer one current spec over many overlapping subsystem notes
