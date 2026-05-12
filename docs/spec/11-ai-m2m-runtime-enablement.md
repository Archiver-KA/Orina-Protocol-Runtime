# AI M2M Runtime Enablement

Last verified by Codex audit: 2026-05-12

> Current-state summary for April 2026. The operational deploy order and command set live in `docs/spec/19-supabase-split-function-runbook.md`.

## Purpose

This note records the runtime prerequisites that must be true before the delegated AI wallet UI is considered genuinely enabled on BSC testnet.

## Current Topology

- shared core: `make-server-b0d68fc8`
- auth bridge: `orina-auth-bridge-v1`
- AI M2M service: `orina-ai-m2m-v2`
- seller minting: `orina-seller-minting-v1`
- receipt sync: `orina-receipt-sync-v1`

Current baseline:

- Supabase project ref: `vcixsdudkizgfikhmfuv`
- BSC testnet `DelegationManager`: `0xcC2C55DcC834D83fddcb7C2aA0B07A7ED6585E58`
- BSC testnet `AIWalletFactoryV2`: `0xc1eF71c92200bFE3bc304Bc20ee2D89da26E4ca2`

Legacy shared-bundle routes like `/functions/v1/make-server-b0d68fc8/ai/m2m/*` or `/auth/supabase-claim-bridge/*` should only be used intentionally for backward-compatibility troubleshooting.

## Frontend Runtime Env

Set these in the Vite or hosting runtime:

```env
VITE_SUPABASE_PROJECT_ID=vcixsdudkizgfikhmfuv
VITE_SUPABASE_URL=https://vcixsdudkizgfikhmfuv.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase anon key>

VITE_SUPABASE_FUNCTIONS_NAMESPACE=make-server-b0d68fc8
VITE_SUPABASE_SHARED_SERVER_FN_NAME=make-server-b0d68fc8

VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true
VITE_SUPABASE_AUTH_BRIDGE_FN_NAME=orina-auth-bridge-v1
VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX=

VITE_SUPABASE_AI_M2M_FN_NAME=orina-ai-m2m-v2
VITE_SUPABASE_SELLER_MINTING_FN_NAME=orina-seller-minting-v1
VITE_SUPABASE_RECEIPT_SYNC_FN_NAME=orina-receipt-sync-v1

VITE_M2M_DELEGATION_MANAGER=0xcC2C55DcC834D83fddcb7C2aA0B07A7ED6585E58
VITE_M2M_AI_WALLET_FACTORY_V2=0xc1eF71c92200bFE3bc304Bc20ee2D89da26E4ca2
```

Notes:

- `VITE_SUPABASE_AUTH_BRIDGE_ENABLED` must stay `true` for delegated wallet config and protected bridge exchange.
- `Deployment Ready` in the UI only proves the on-chain addresses are configured; it does not prove the runtime routes are reachable.
- Shared frontend helpers must resolve function bases through `getSupabaseFunctionsBaseUrl(...)` or `getBridgeBaseUrl()` to avoid stale shared-bundle assumptions.

## Required Supabase Secrets

These must exist on the remote project before route verification:

```env
ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE=true
ATP2_SUPABASE_AUTH_BRIDGE_VERIFY_MODE=wallet_session_row
ATP2_SUPABASE_AUTH_BRIDGE_EXPECTED_CLAIM_VERSION=h1
ATP2_SUPABASE_JWT_SECRET=<supabase jwt secret>
ATP2_M2M_DELEGATE_ENCRYPTION_KEY=<32+ char random secret>
```

Notes:

- `ATP2_SUPABASE_JWT_SECRET` is mandatory because request auth is fail-closed.
- `ATP2_M2M_DELEGATE_ENCRYPTION_KEY` is mandatory when server-managed `Generate Delegate` remains enabled.
- `Generate Delegate` stores the private key server-side in encrypted form; `Enroll Delegate` remains the lower-custody fallback.
- Server-managed delegate backups are AES-GCM ciphertext plus a 12-byte IV. The encryption key must stay separate from KV backups, logs, and runtime responses.
- `Create Enroll Code` generates crypto-random invite ids with at least 32 bytes of entropy, expires pending invites, rejects replay after claim, and rate-limits create/accept routes.

## Wallet Session Requirement

Before the AI M2M settings page can load successfully:

1. connect the root wallet
2. complete the Orina wallet auth signature flow
3. confirm the bridge exchange succeeded for that wallet session

Without that session, the bridge exchange fails and the UI should surface an auth-specific runtime error instead of a generic transport failure.

## Verification Checklist

### Route Reachability

Expected current routes:

- `POST /functions/v1/orina-auth-bridge-v1/exchange` returns `200`
- `GET /functions/v1/orina-ai-m2m-v2/config/:walletAddress` returns `200`
- `POST /functions/v1/orina-ai-m2m-v2/delegates/generate` returns `200`
- `POST /functions/v1/orina-ai-m2m-v2/delegates/invite` returns `200`
- `POST /functions/v1/orina-ai-m2m-v2/delegates/accept-invite` returns `200`
- `POST /functions/v1/orina-ai-m2m-v2/config` returns `200`

### Frontend State

Expected UI state:

- the M2M panel loads without the generic runtime error
- `Root Fallback` shows `Always On`
- `Generate Delegate` and `Create Enroll Code` are enabled when auth succeeds
- saved policy persists `selectedDelegateId`, token choice, limits, and expiry

### On-chain Readiness

Expected readiness:

- `foundationReady = true`
- `coreReady = true`
- predicted AI wallet address derives successfully after selecting a verified delegate, payment token, and expiry

## Failure Mapping

Treat these as the primary first-hop triage signals:

- `bridge disabled`
- `wallet session required`
- `bridge exchange failed`
- `401 unauthorized`
- `403 wallet mismatch`
- `404 route not deployed`
- `500 missing JWT secret`
- `500 missing delegate encryption key`

If the UI surfaces one of those classes, fix the runtime route or secret state before investigating on-chain readiness.
