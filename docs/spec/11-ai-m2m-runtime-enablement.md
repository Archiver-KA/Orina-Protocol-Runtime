# AI M2M Runtime Enablement

## Purpose

This checklist turns the delegated AI wallet UI from `on-chain ready only` into a usable end-to-end runtime on BSC testnet.

It covers:

- frontend bridge env
- Supabase function auth env
- server-managed delegate generation
- deploy commands
- post-deploy verification

Current baseline:

- Supabase project ref: `vcixsdudkizgfikhmfuv`
- Supabase function name: `make-server-b0d68fc8`
- BSC testnet `DelegationManager`: `0xcC2C55DcC834D83fddcb7C2aA0B07A7ED6585E58`
- BSC testnet `AIWalletFactoryV2`: `0xc1eF71c92200bFE3bc304Bc20ee2D89da26E4ca2`

## Why Setup Fails Today

If the M2M panel shows `Unable to reach the AI M2M configuration service`, the failure is usually in one of these layers:

1. `VITE_SUPABASE_AUTH_BRIDGE_ENABLED` is off in the frontend runtime.
2. The connected wallet has not created a signed wallet auth session yet.
3. `make-server-b0d68fc8` is not deployed with the latest `ai/m2m` routes.
4. `ATP2_SUPABASE_JWT_SECRET` is missing on the Supabase function.
5. `ATP2_M2M_DELEGATE_ENCRYPTION_KEY` is missing when using `Generate Delegate`.

## Frontend Runtime Env

Set these in the app runtime env used by Vite or the frontend hosting platform:

```env
VITE_SUPABASE_PROJECT_ID=vcixsdudkizgfikhmfuv
VITE_SUPABASE_URL=https://vcixsdudkizgfikhmfuv.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase anon key>

VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true
VITE_SUPABASE_AUTH_BRIDGE_FN_NAME=make-server-b0d68fc8
VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX=/auth/supabase-claim-bridge

VITE_M2M_DELEGATION_MANAGER=0xcC2C55DcC834D83fddcb7C2aA0B07A7ED6585E58
VITE_M2M_AI_WALLET_FACTORY_V2=0xc1eF71c92200bFE3bc304Bc20ee2D89da26E4ca2
```

Notes:

- `VITE_SUPABASE_AUTH_BRIDGE_ENABLED` must be `true` for delegated AI wallet config.
- `Deployment Ready` in the UI only proves on-chain addresses are configured. It does not prove the config service is reachable.

## Supabase Function Secrets

Set these on the remote project before deploying the function:

```env
ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE=true
ATP2_SUPABASE_AUTH_BRIDGE_VERIFY_MODE=wallet_session_row
ATP2_SUPABASE_AUTH_BRIDGE_EXPECTED_CLAIM_VERSION=h1
ATP2_SUPABASE_JWT_SECRET=<supabase jwt secret>
ATP2_M2M_DELEGATE_ENCRYPTION_KEY=<32+ char random secret>
```

Notes:

- `ATP2_SUPABASE_JWT_SECRET` is mandatory because request auth is fail-closed.
- `ATP2_M2M_DELEGATE_ENCRYPTION_KEY` is mandatory if `Generate Delegate` stays enabled.
- `Generate Delegate` stores the private key server-side in encrypted form. If production policy tightens later, prefer `Enroll Delegate` as the default path.

## Deploy Commands

Run from the repo root on Windows `cmd`:

```bat
supabase secrets set ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE=true ATP2_SUPABASE_AUTH_BRIDGE_VERIFY_MODE=wallet_session_row ATP2_SUPABASE_AUTH_BRIDGE_EXPECTED_CLAIM_VERSION=h1 ATP2_SUPABASE_JWT_SECRET=<supabase-jwt-secret> ATP2_M2M_DELEGATE_ENCRYPTION_KEY=<strong-random-secret> --project-ref vcixsdudkizgfikhmfuv
```

```bat
supabase functions deploy make-server-b0d68fc8 --project-ref vcixsdudkizgfikhmfuv
```

If the frontend is built from this repo, update its runtime env and redeploy the app:

```bat
npm run build
```

Then push the new build using the hosting pipeline already used by ATP2.

## Wallet Session Requirement

Before the M2M settings page can load:

1. connect the root wallet
2. complete the Orina wallet auth signature flow
3. confirm a `wallet auth session` exists in local storage and on the server

Without that session, the bridge exchange will fail and the M2M page will show an auth-specific runtime error.

## Verification Checklist

### A. Frontend

1. Open settings with the root wallet connected.
2. Confirm the M2M panel no longer shows the generic runtime error.
3. Confirm `Root Fallback` shows `Always On`.
4. Confirm `Generate Delegate` and `Create Enroll Code` buttons are enabled.

### B. Config Load

Expected:

- `GET /functions/v1/make-server-b0d68fc8/ai/m2m/config/:walletAddress` returns `200`
- response includes:
  - `success: true`
  - `config`
  - `overview`
  - `delegates`
  - `pendingInvites`

### C. Generate Delegate

Expected:

- `POST /functions/v1/make-server-b0d68fc8/ai/m2m/delegates/generate` returns `200`
- a verified delegate appears in the UI
- saving the policy persists `selectedDelegateId`

If it fails with a server error mentioning `ATP2_M2M_DELEGATE_ENCRYPTION_KEY`, the function secrets were not applied or the function was not redeployed afterward.

### D. Enroll Delegate

Expected:

- root wallet creates an enroll code
- a second wallet signs its own auth session
- that second wallet accepts the code successfully
- the root wallet sees the new verified delegate on refresh

### E. On-chain Readiness

Expected:

- `foundationReady = true`
- `coreReady = true`
- predicted AI wallet address derives successfully after selecting:
  - verified delegate
  - payment token
  - expiry

## Post-Enable Smoke

1. Save M2M policy with `buy` only.
2. Generate a delegate.
3. Confirm the predicted wallet address appears.
4. Prefund the predicted wallet.
5. Create session on-chain.
6. Deploy the AI wallet.
7. Run delegated testnet buy flow.
8. Revoke or let expiry pass and verify the root wallet still retains direct fallback.

## Failure Mapping

Current UI now surfaces these classes directly:

- `bridge disabled`
- `wallet session required`
- `bridge exchange failed`
- `401 unauthorized`
- `403 wallet mismatch`
- `404 route not deployed`
- `500 missing JWT secret`
- `500 missing delegate encryption key`

That mapping should be used as the first triage signal before looking at on-chain state.
