# Local API Audit And Server Migration Plan

## Scope

This audit reviews the current runtime boundaries across:

- frontend local state and browser persistence under `src/`
- Supabase REST sync paths
- Supabase Edge Functions under `supabase/functions/`
- the current separation between `Messages` and the AI surfaces

The goal is to identify which business flows are still local or hybrid, which are already server-backed, what must be hardened now, and how to move the remaining business-critical flows to server-truth with real data.

## Executive Summary

The current app is not uniformly local or uniformly server-backed.

- `Messages` transport is already server-backed through `orina-chat-v1` and the C5 messaging tables.
- AI conversations and AI agent config are already server-backed too, but they run through a different function namespace and persist to a KV table rather than the chat tables.
- The label `AI Agent For Messages` is currently more of a product/UX label than a true runtime coupling. The active `Messages` page does not call `AIAgentClient`.
- Several wallet-scoped product domains are still local-first or hybrid: profile, community, favorites, notifications, delivery addresses, settings, collections, runtime orders, and runtime minted assets.
- A few sensitive flows are still local-only and should be moved first: API keys, moderation/user reports, and legacy review/reputation storage.

The recommended direction is:

1. harden chat and auth first
2. split `Messages` from AI automation at the service boundary
3. flip hybrid domains from local-first to remote-first using the existing tables where they already exist
4. keep only cache-grade or UX-grade state in `localStorage`

## Current State Inventory

### Already Server-Backed Or Close To Server-Truth

| Domain | Current backend path | Current status | Recommendation |
| --- | --- | --- | --- |
| Messages transport | `src/utils/messagesClient.ts` -> `supabase/functions/orina-chat-v1/index.tsx` -> `supabase/functions/server/messages-handler-c5.ts` | Server-backed on `conversations`, `conversation_participants`, `messages` | Keep separate as dedicated chat service; harden auth and rate limits now |
| AI Assist workspace | `src/utils/aiAgentClient.ts` -> `supabase/functions/server/ai-assist.ts` | Server-backed, but stored in KV-backed conversation records | Keep separate from chat; migrate KV state to dedicated tables when stabilizing AI |
| AI agent config | `supabase/functions/server/ai-chat.tsx` | Server-backed, but config is stored as `ai_agent_config:<wallet>` in KV | Move to canonical relational table |
| Marketplace catalog | `src/utils/marketplaceCatalog.ts` | Remote hydrate from `assets_catalog`, browser cache only | Treat as already remote-first |
| Seller directory | `src/utils/sellerDirectory.ts` | Remote hydrate from `profiles`, `profile_reputation_summaries`, `user_follows` | Treat as already remote-first |
| Profile reviews and summary reputation | `src/utils/profileReputationSync.ts` | Canonical remote source exists in `profile_reviews` and `profile_reputation_summaries` | Remove legacy local review/reputation dependence over time |

### Hybrid Local + Remote

| Domain | Local state | Remote state | Current shape | Recommendation |
| --- | --- | --- | --- | --- |
| Profiles | `user_profile_<address>` in `src/utils/profileUtils.ts` | `profiles`, `user_follows` | Local-first with remote sync | Flip to remote-first with local cache |
| Community | `studio_community_posts`, `studio_community_comments`, `studio_user_actions` in `src/utils/communityUtils.ts` | `community_posts`, `community_comments`, `community_reactions` | Hybrid, still seeds mock data | Disable mock seed in production runtime and make remote authoritative |
| Favorites/watchlist | `src/utils/favoritesUtils.ts` local keys | `user_favorites` | Hybrid | Move to remote-first; keep local cache only |
| Notifications | `src/utils/notifications.ts` local keys | `notifications` | Hybrid | Move to remote-first; keep local cache only |
| Delivery addresses | `orina_delivery_addresses_<wallet>` in `src/utils/deliveryAddressUtils.ts` | `user_delivery_addresses` | Hybrid | Remote-first with optimistic local cache |
| User settings | wallet-scoped local settings and theme sync | `user_app_settings` | Hybrid | Remote-first with local cache |
| Collections | `orina_runtime_collections_v1` in `src/utils/collectionsUtils.ts` | `collections`, `collection_assets`, `user_collection_favorites`, `user_collection_follows` | Hybrid, still runtime-centric | Move canonical ownership and membership fully to remote |
| Runtime orders | `orina_runtime_orders_v2:*` in `src/utils/runtimeOrders.ts` | `protocol_orders` | Local shadow plus remote hydrate | Remote projection should become source of truth |
| Runtime minted assets | `orina_runtime_minted_assets_v2:*` in `src/utils/runtimeMintedAssets.ts` | `protocol_assets` | Local shadow plus remote hydrate | Remote projection should become source of truth |

### Still Local-Only And Should Move First

| Domain | Current code path | Problem | Recommendation |
| --- | --- | --- | --- |
| API keys | `src/utils/apiKeyManager.ts` | Stored in browser, reversibly obfuscated only | Replace with server-side credential vault and hashed key validation |
| Moderation reports from Messages | `src/app/components/messages.tsx` | Stored in `localStorage` only | Add remote `message_reports` or `user_reports` table and API |
| Legacy review/reputation utils | `src/utils/reviewUtils.ts`, `src/utils/reputationUtils.ts` | Competes with remote canonical review/reputation model | Deprecate after remote review flow is fully wired |
| Legacy chat storage utilities | `src/utils/conversationUtils.ts` | Old local chat storage still exists for migration | Remove after confirming old local chat data is retired |

### Local State That Should Stay Local

These do not need a server migration and should remain local UX state:

- theme preference
- search history
- guest mode
- active panel state
- temporary input drafts
- local scroll or viewport state

## Key Findings

### F1. Critical: `POST /messages/conversation` is not authenticated at the server boundary

Evidence:

- `handleCreateConversation` in `supabase/functions/server/messages-handler-c5.ts` does not call `requireAuthenticatedWallet`
- every other message mutation/read endpoint does

Impact:

- an anonymous caller can create conversation rows and auto-create profile rows through a service-role-backed edge function
- this is a data pollution and abuse vector
- it weakens the trust boundary of the whole messaging subsystem

Required fix:

- require authenticated wallet on conversation creation
- enforce wallet match on `sender`
- add per-wallet and per-IP rate limiting to conversation creation

### F2. High: browser API keys are not production-grade credentials

Evidence:

- `src/utils/apiKeyManager.ts` stores keys under `orina_api_keys_<wallet>`
- `encryptKey()` and `decryptKey()` are reversible Base64 with a static salt
- `validateKey()` is explicitly a stub and logs that validation should be server-side

Impact:

- any same-origin XSS or local machine access can recover the key material
- key validation, revocation, rotation, and audit are not server-enforced
- the current implementation should be treated as demo or local-only, not as a real agent credential system

Required fix:

- move credential generation, validation, usage accounting, and revocation to the server
- store only hashed lookup prefixes in the database
- keep encrypted raw secret material in a server-side vault or KMS-backed store

### F3. High: wallet auth session and bridge token still live in `localStorage`

Evidence:

- `src/utils/walletAuthSession.ts`
- `src/utils/supabaseAuthClaimBridge.ts`

Impact:

- same-origin XSS can replay wallet session and bridge session tokens until expiry
- this becomes more serious as more privileged server flows move off the client

Required fix:

- keep token TTLs short
- add strict CSP on authenticated surfaces
- remove unsafe inline/script injection paths from the wallet-authenticated shell
- consider moving long-lived session state to httpOnly cookies if the auth model evolves past pure SPA constraints

### F4. Medium: conversation creation falls back to sending a synthetic first message

Evidence:

- `src/utils/messagesClient.ts`
- `createConversation()` falls back to `sendMessage(..., 'Conversation started')`

Impact:

- transport fallback mutates business data
- retry behavior can create fake chat history
- it blurs the boundary between metadata creation and content creation

Required fix:

- keep conversation creation idempotent and separate
- do not synthesize a chat message just to emulate successful setup

### F5. Medium: rate limiting is incomplete and non-distributed

Evidence:

- `supabase/functions/server/ai-assist.ts` has an in-memory `Map` limiter
- `messages-handler-c5.ts` has no matching limiter for send/create/read paths

Impact:

- per-instance memory limits do not survive horizontal scale or edge instance churn
- the heaviest endpoints are not protected uniformly

Required fix:

- implement rate limiting in a shared store
- enforce separate budgets for chat send, chat create, chat read, AI assist, AI search, and config writes

### F6. Medium: moderation/report flow is still local-only

Evidence:

- `src/app/components/messages.tsx` stores reports in `orina_user_reports`

Impact:

- reports are not reviewable by staff or backend workflows
- abuse signals are lost per browser/device

Required fix:

- add a server-side moderation report API and table
- link reports to conversation ID, reporter wallet, target wallet, reason, and timestamps

### F7. Medium: `Messages` and AI are already separate runtimes, but the UI groups them as one workspace

Evidence:

- `Messages` uses `src/utils/messagesClient.ts`
- AI settings use `src/utils/aiAgentClient.ts`
- `AIAgentClient` is used in `ai-agent-settings.tsx` and `ai-sidebar.tsx`, not in `messages.tsx`
- `src/app/components/agent-settings.tsx` markets this as `AI Agent For Messages`

Impact:

- current UI suggests tighter runtime coupling than actually exists
- future implementation risk: developers may wire AI directly into chat request paths instead of through a controlled automation boundary

Required fix:

- rename or reframe the AI area as its own AI workspace or automation workspace
- if auto-reply is added later, integrate asynchronously through events/jobs, not through synchronous chat UI logic

### F8. Medium: AI runtime storage and AI schema are drifting

Evidence:

- `supabase/functions/server/ai-chat.tsx` stores config in KV
- `supabase/functions/server/orina-ai-engine-v2.tsx` stores conversation metadata/messages in KV
- `supabase/migrations/000037_ai_agent_schema_fixes.sql` creates relational AI-facing tables like `seller_minting_config`, but message-agent config is not using a dedicated relational table

Impact:

- hard to query, audit, rate-limit, or join AI state with product data
- harder to apply row-level ownership and reporting on top of KV blobs

Required fix:

- define a canonical relational model for AI config, AI conversation metadata, and AI usage events
- keep KV only as ephemeral cache if still needed

### F9. Medium: some current docs are now behind the code

Evidence:

- older product specs still describe parts of marketplace/orders as mock-first
- current runtime code already hydrates `assets_catalog`, `protocol_orders`, and `protocol_assets`

Impact:

- migration decisions can be made against stale assumptions

Required fix:

- use this audit as the newer boundary reference
- refresh older specs after the migration plan is accepted

## Recommended Service Boundaries

### 1. Chat Service

Keep chat as its own service and data model:

- routes: `/chat/conversations`, `/chat/messages`, `/chat/read`, `/chat/reports`
- tables: `conversations`, `conversation_participants`, `messages`, new `message_reports`
- auth: wallet claim bridge or equivalent authenticated wallet token
- no direct dependency on AI KV or AI prompt state

### 2. AI Workspace Service

Keep AI workspace separate from chat:

- routes: `/ai/config`, `/ai/assist`, `/ai/conversations`, `/ai/search`
- tables to add: `agent_configs`, `agent_threads`, `agent_messages`, `agent_usage`
- use the existing seller AI / assist runtime only behind this boundary

### 3. Agent Automation Worker

If product wants seller auto-reply in customer chat, add it as a worker, not as a direct part of chat request handling:

1. new message lands in chat tables
2. a trigger or outbox record is written
3. worker checks seller automation config
4. worker calls AI service
5. worker inserts a normal chat message as agent/system sender
6. usage, latency, errors, and rate limit events are logged

This keeps chat reliable even if AI fails or is throttled.

### 4. User And Social Data Service

Use the existing tables as canonical server truth where they already exist:

- `profiles`
- `user_follows`
- `community_posts`
- `community_comments`
- `community_reactions`
- `user_favorites`
- `notifications`
- `user_delivery_addresses`
- `user_app_settings`
- `collections`
- `collection_assets`
- `user_collection_favorites`
- `user_collection_follows`

The main change is not table creation. The main change is stopping the browser from being the primary durability layer.

### 5. Protocol Projection Service

Treat these as canonical projection tables:

- `protocol_assets`
- `protocol_orders`
- `protocol_order_events`
- `assets_catalog`

Local runtime records should become cache or optimistic shadow only, not the main state source.

## Recommended Rate Limit Policy

Use a shared store, not in-memory `Map`, for all production limits.

Suggested starting budgets:

- chat conversation create: `10 / 10 min / wallet`, `30 / hour / IP`
- chat message send: `20 / min / wallet`, `5 / min / conversation`
- chat list/read polling APIs: `120 / min / wallet`
- AI assist text: `10 / min / wallet`, `200 / day / wallet`
- AI assist with images: `3 / min / wallet`, `30 / day / wallet`
- AI config writes: `20 / hour / wallet`
- moderation report submit: `10 / day / wallet`

Store and log:

- wallet address
- IP or edge fingerprint
- endpoint family
- allowed or blocked status
- retry-after

## Migration Plan

### Phase 0: Immediate Hardening

- add auth and wallet-match enforcement to `POST /messages/conversation`
- add distributed rate limiting to chat and AI routes
- remove `createConversation -> sendMessage('Conversation started')` fallback
- mark browser API keys as non-production and stop treating them as secure credentials

### Phase 1: Split `Messages` From AI Cleanly

- keep `orina-chat-v1` as chat-only
- keep AI routes under their own namespace
- rename `AI Agent For Messages` in the UI to reduce false coupling
- define future auto-reply as an async worker integration, not as a direct UI/runtime dependency

### Phase 2: Move Local-Only Sensitive Flows To Server

- create server-side API credential storage and validation
- create remote moderation report flow
- retire legacy local conversation migration helpers once cutover is complete

### Phase 3: Flip Hybrid Wallet Data To Remote-First

- profiles
- community
- favorites
- notifications
- delivery addresses
- user settings
- collections

For each domain:

- read remote first
- keep local cache only for offline or short-lived optimistic state
- stop using local bootstrap/mock data in normal production runtime

### Phase 4: Retire Local Protocol Shadows As Source Of Truth

- keep `protocol_assets` and `protocol_orders` as canonical read models
- use local runtime orders/assets only for optimistic UI until projection catches up
- add explicit projection lag handling instead of silently preferring stale local data

### Phase 5: Canonicalize AI Data

- replace KV-backed `ai_agent_config:<wallet>` with relational `agent_configs`
- replace KV-backed thread metadata/history with relational AI thread tables
- add `agent_usage` and `agent_runs` for audit, billing, and rate-limit analytics

## Concrete Decision: What Should And Should Not Move

Move to server-truth:

- API keys
- moderation reports
- profiles and follows
- community data
- favorites and notifications
- delivery addresses
- settings
- collections
- runtime order and runtime minted asset truth
- AI config and AI conversation metadata

Keep local:

- theme preference cache
- search history
- ephemeral form drafts
- viewport or panel state
- optimistic pending UI markers that can be reconstructed from server truth

## Practical Next Step

Before any broad migration, complete this small sequence first:

1. harden `Messages` auth and rate limits
2. remove browser API keys from the trust model
3. split the AI workspace vocabulary from the chat vocabulary
4. then flip one hybrid domain at a time to remote-first, starting with the most sensitive user-owned data

That order reduces risk and avoids building new server flows on top of a still-weak trust boundary.
