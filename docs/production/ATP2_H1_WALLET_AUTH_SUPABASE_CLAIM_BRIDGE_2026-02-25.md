# ATP2 H1 — Wallet Auth -> Supabase Auth Claim Bridge (Design + Scaffold)

**Date:** 2026-02-25  
**Phase:** B (Hardening / Auth Bridge / Policy Lockdown)  
**Status:** Design + scaffold created (not production-enabled)

`format batch: phạm vi hẹp, checklist chốt rõ, test sau từng bước.`

## 1) Goal
Enable ATP2 client to call Supabase REST under `role=authenticated` with owner claims, while keeping ATP2 wallet-auth UX (`connect permission` + signature auth for protocol actions).

This bridge is the prerequisite for replacing `Batch 4C` temporary public-write policies with owner-scoped RLS.

## 2) Claim Contract (H1)
Use a short-lived Supabase-compatible JWT (issued by ATP2 backend bridge).

### Required claims
- `role = authenticated`
- `sub = <profile_id>` (UUID string; Supabase/`auth.uid()` compatible)
- `profile_id = <profile_id>` (duplicate explicit claim for RLS readability)
- `wallet_address = <lowercase_wallet_address>`
- `claim_version = "h1"`
- `auth_method = "wallet_signature"`

### Optional claims
- `wallet_session_id`
- `iat`, `exp`, `aud`

## 3) Request/Response Contract (scaffold)
### Exchange endpoint (planned)
`POST /functions/v1/make-server-b0d68fc8/auth/supabase-claim-bridge/exchange`

### Request body
```json
{
  "walletAddress": "0x...",
  "walletAuthSession": {
    "address": "0x...",
    "signedAt": 1700000000000,
    "signature": "0x..."
  },
  "client": {
    "app": "ATP2",
    "phase": "H1-scaffold",
    "requestedAt": "2026-02-25T00:00:00.000Z"
  }
}
```

### Response body (planned)
```json
{
  "accessToken": "<jwt>",
  "expiresAt": "2026-02-25T00:15:00.000Z",
  "walletAddress": "0x...",
  "profileId": "uuid",
  "claimVersion": "h1"
}
```

## 4) Security Requirements (must implement before enable)
1. Verify ATP2 wallet auth session server-side against `public.wallet_sessions` (or a backend-managed session source).
2. Normalize and compare lowercase wallet addresses only.
3. Resolve or create canonical `profiles` row with service role (get `profile_id`).
4. Sign JWT with Supabase-compatible signing config (`SUPABASE_JWT_SECRET` or project auth signing material).
5. Short TTL (recommended 10-15 minutes), with refresh endpoint if needed.
6. Refuse bridge token issuance for invalid/expired/revoked wallet session.

## 5) Scaffold Delivered (this batch)
### Client
- `src/utils/supabaseAuthClaimBridge.ts`
  - local bridge token store
  - exchange request helper (disabled by default via env)
  - token/session event dispatch
- `src/utils/supabaseRest.ts`
  - automatically prefers bridge bearer token over anon key when available

### Server (Edge Function router scaffold)
- `supabase/functions/server/wallet-auth-claim-bridge.tsx`
  - route contract + validation + disabled-by-default behavior (`501`)
- mounted in:
  - `supabase/functions/server/index.tsx`

### Env placeholders
- `.env.example`
  - `VITE_SUPABASE_AUTH_BRIDGE_ENABLED=false`
  - `VITE_SUPABASE_AUTH_BRIDGE_FN_NAME=make-server-b0d68fc8`
  - `VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX=/auth/supabase-claim-bridge`

## 6) Enablement Gate (before turning on `VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true`)
- H1 server verification logic implemented
- JWT signing implemented and validated
- bridge returns `profileId` + short-lived JWT
- test token can read/write owner rows under hardened RLS in staging/test project

## 7) H1 Test Matrix (early-fail)
### Positive
- valid wallet auth session -> bridge returns token
- token decodes with `role=authenticated`, `sub/profile_id`, `wallet_address`
- Supabase REST request with bridge token passes owner-scoped policy

### Negative
- invalid wallet session -> `401/403`
- expired wallet session -> denied
- wallet mismatch (`body.walletAddress` vs walletAuthSession.address) -> denied
- uppercase wallet claim -> denied/normalized before issue

## 8) H1 Outcome for Roadmap
- After H1 is implemented (not just scaffold), `H2` migration can replace `Batch 4C` temporary public writes with owner-scoped policies without breaking ATP2 functional flows.
