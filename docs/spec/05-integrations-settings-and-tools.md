# Integrations, Settings, And Tools

Last verified by Codex audit: 2026-05-12

## Scope

This document describes the current runtime integrations behind Settings, Agent Setting, AI tools, Supabase REST, Edge Functions, wallet auth, API keys, and local verification tooling.

## Supabase Client Configuration

Public browser configuration is read from:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_FUNCTIONS_NAMESPACE`
- `VITE_SUPABASE_SHARED_SERVER_FN_NAME`

Only anon or publishable keys should be exposed to the browser. Service-role keys, JWT secrets, and delegated wallet encryption keys must stay in server or Edge Function secret storage.

The runtime can use fallback public Supabase config when `VITE_ENABLE_SUPABASE_CONFIG_FALLBACK` is true. Do not rely on fallback behavior for release validation; explicit env is safer.

## Supabase REST Layer

[`src/utils/supabaseRest.ts`](../../src/utils/supabaseRest.ts) is the shared browser REST helper.

Current behavior:

- builds REST URLs from `supabaseUrl`
- uses anon key by default
- upgrades `Authorization` to the wallet auth claim bridge token when available
- exposes select, insert, upsert, patch, delete, and RPC helpers
- treats REST as disabled when the app is not in a browser or config is missing

## Wallet Auth Claim Bridge

Wallet auth uses:

- [`src/utils/walletAuthSession.ts`](../../src/utils/walletAuthSession.ts)
- [`src/utils/supabaseAuthClaimBridge.ts`](../../src/utils/supabaseAuthClaimBridge.ts)
- `VITE_SUPABASE_AUTH_BRIDGE_ENABLED`
- `VITE_SUPABASE_AUTH_BRIDGE_FN_NAME`
- `VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX`

Important local keys:

- `orina_wallet_auth_session`
- `orina_supabase_auth_claim_bridge_session`

The browser session is sensitive. Same-origin script access can read localStorage, so do not introduce untrusted scripts into the runtime.

## Edge Function Namespaces

Function URL helpers live in [`utils/supabase/functions.ts`](../../utils/supabase/functions.ts).

Current function variables:

- shared runtime namespace: `VITE_SUPABASE_FUNCTIONS_NAMESPACE`
- auth bridge function: `VITE_SUPABASE_AUTH_BRIDGE_FN_NAME`
- AI M2M function: `VITE_SUPABASE_AI_M2M_FN_NAME`
- seller minting function: `VITE_SUPABASE_SELLER_MINTING_FN_NAME`
- receipt sync function: `VITE_SUPABASE_RECEIPT_SYNC_FN_NAME`

Current function folders include:

- `supabase/functions/make-server-b0d68fc8`
- `supabase/functions/orina-auth-bridge-v1`
- `supabase/functions/orina-ai-m2m-v2`
- `supabase/functions/orina-seller-minting-v1`
- `supabase/functions/orina-receipt-sync-v1`
- `supabase/functions/orina-order-autotime-v1`
- `supabase/functions/orina-chat-v1`

Security controls checked in the runtime code:

- protected Edge handlers use H1 wallet claim JWTs through `request-auth.ts`
- chat, IPFS upload, AI, and moderation routes call the shared distributed rate limiter
- the rate limiter increments counters through `public.rate_limit_increment`, not a read-modify-write counter path
- CORS is centralized in `edge-app.ts` and echoes only approved origins. Production deployments should set `ORINA_CORS_ENV=production`, put any extra production origins in `ORINA_CORS_ALLOWED_ORIGINS`, and enable broad preview/deployment hosts only with `ORINA_CORS_ALLOW_PREVIEW_ORIGINS=true`.
- service-role keys remain server-side Edge Function secrets only

## Settings Surface

[`src/app/components/settings.tsx`](../../src/app/components/settings.tsx) handles connected-user settings.

Main setting domains:

- profile identity
- avatar and public profile story
- delivery addresses
- theme and UI preferences
- wallet-scoped settings persistence

Profile data uses local wallet-scoped storage and remote profile sync where available. Delivery address data uses local cache plus Supabase tables when REST is configured.

## Delivery Address Integration

[`src/utils/deliveryAddressUtils.ts`](../../src/utils/deliveryAddressUtils.ts) is the address integration layer.

Current tables:

- `geo_countries`
- `geo_places`
- `user_delivery_addresses`

Current local key:

- `orina_delivery_addresses_<walletAddress>`

Minting uses address data to build `assetLocationSnapshot` and `deliverySnapshot`.

## Agent Setting Surface

Agent-related settings are grouped under `Agent Setting`.

Current sub-surfaces:

- API keys
- AI reply assistant
- seller AI minting
- AI M2M wallet settings

API keys use protected server-side routes and the wallet auth bridge. Generated raw keys must be shown once and never logged unredacted.

## AI And M2M Integration

M2M is not a separate marketplace. It is a constrained execution layer over ATP.

The session binds:

- allowed target: `MarketplaceATP`
- allowed spender: `PaymentGateway`
- allowed token
- expiry
- action mask
- per-order cap
- total cap

The current frontend config points to:

- `VITE_M2M_DELEGATION_MANAGER`
- `VITE_M2M_AI_WALLET_FACTORY_V2`
- `VITE_SUPABASE_AI_M2M_FN_NAME`

Server-side M2M controls checked in this audit:

- `Create Enroll Code` uses crypto-random invite ids with at least 32 bytes of entropy, stores an expiration timestamp, rejects claimed/expired invite replay, and runs invite create/accept routes through the distributed rate limiter.
- Server-managed `Generate Delegate` stores delegate private keys as AES-GCM ciphertext plus IV metadata only. The encryption key must remain an Edge secret and must not be logged, returned, exported, or backed up with the ciphertext.

## Marketplace Catalog Integration

[`src/utils/marketplaceCatalog.ts`](../../src/utils/marketplaceCatalog.ts) hydrates active catalog state from Supabase and protocol projection tables.

Primary tables and RPC:

- `assets_catalog`
- `profiles`
- `asset_protocol_links`
- `protocol_assets`
- `protocol_orders`
- `get_asset_listing_stats_v1`

The old durable localStorage catalog cache is removed. The runtime uses memory plus explicit hydration.

## Messages And Community

Messages use [`src/utils/messagesClient.ts`](../../src/utils/messagesClient.ts) and the messaging schema:

- `conversations`
- `conversation_participants`
- `messages`

Community uses profile/community tables and local fallback caches where appropriate. Owner-scoped writes should pass through wallet identity and RLS constraints.

## Receipt Sync

Receipt sync is split into a dedicated function:

- `VITE_SUPABASE_RECEIPT_SYNC_FN_NAME`
- `supabase/functions/orina-receipt-sync-v1`

Receipt projection is read back through runtime receipt and protocol order utilities.

## Verification Tools

Local verification commands:

- `npm run build`
- `npm run test`
- `npm run verify:protocol-runtime-surface`
- `npm run verify:viewer-release`
- `npm run security:check-client-secrets`
- `npm run security:scan`
- `npm run audit:supabase:security-definer`

Chrome CDP smoke scripts use port `9222`:

- `scripts/attach-metamask-smoke.mjs`
- `scripts/smoke-asset-modal-navigation.mjs`
- `scripts/smoke-api-key-generate.mjs`

See [`../port-9222-runtime-verification.md`](../port-9222-runtime-verification.md).
