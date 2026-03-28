# AI M2M Supabase Deploy And Runtime Verification

## Scope

This runbook is for the current ATP2 Supabase runtime:

- project ref: `vcixsdudkizgfikhmfuv`
- function slug: `make-server-b0d68fc8`
- frontend bridge path prefix: `/auth/supabase-claim-bridge`
- M2M config base route: `/ai/m2m`

Current frontend `.env` baseline:

```env
VITE_SUPABASE_PROJECT_ID=vcixsdudkizgfikhmfuv
VITE_SUPABASE_URL=https://vcixsdudkizgfikhmfuv.supabase.co
VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true
VITE_SUPABASE_AUTH_BRIDGE_FN_NAME=make-server-b0d68fc8
VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX=/auth/supabase-claim-bridge
VITE_M2M_DELEGATION_MANAGER=0xcC2C55DcC834D83fddcb7C2aA0B07A7ED6585E58
VITE_M2M_AI_WALLET_FACTORY_V2=0xc1eF71c92200bFE3bc304Bc20ee2D89da26E4ca2
```

## Current Runtime URLs

Function base:

```text
https://vcixsdudkizgfikhmfuv.supabase.co/functions/v1/make-server-b0d68fc8
```

Routes used by the app:

- bridge exchange: `POST /auth/supabase-claim-bridge/exchange`
- M2M config load: `GET /ai/m2m/config/:walletAddress`
- M2M config save: `POST /ai/m2m/config`
- generate delegate: `POST /ai/m2m/delegates/generate`
- create enroll code: `POST /ai/m2m/delegates/invite`
- accept enroll code: `POST /ai/m2m/delegates/accept-invite`

Mounted source of truth:

- [index.tsx](c:/ORINA/ATPProtocol2/ATP2/supabase/functions/server/index.tsx)
- [wallet-auth-claim-bridge.tsx](c:/ORINA/ATPProtocol2/ATP2/supabase/functions/server/wallet-auth-claim-bridge.tsx)
- [ai-m2m-wallet.ts](c:/ORINA/ATPProtocol2/ATP2/supabase/functions/server/ai-m2m-wallet.ts)

## Phase 0. Preconditions

Local tools:

1. `supabase --version`
2. `npm run build`

Current local checks:

- Supabase CLI installed locally: `2.75.0`
- frontend build currently passes

Operator prerequisites:

1. Supabase CLI logged in.
2. Access to project `vcixsdudkizgfikhmfuv`.
3. Project JWT secret available from Supabase project settings.
4. Strong random secret prepared for `ATP2_M2M_DELEGATE_ENCRYPTION_KEY`.

## Phase 1. Set Secrets

Set the server-side secrets on the current remote project:

```bat
supabase secrets set ^
ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE=true ^
ATP2_SUPABASE_AUTH_BRIDGE_VERIFY_MODE=wallet_session_row ^
ATP2_SUPABASE_AUTH_BRIDGE_EXPECTED_CLAIM_VERSION=h1 ^
ATP2_SUPABASE_JWT_SECRET=<supabase-jwt-secret> ^
ATP2_M2M_DELEGATE_ENCRYPTION_KEY=<strong-random-secret> ^
--project-ref vcixsdudkizgfikhmfuv
```

Verification:

```bat
supabase secrets list --project-ref vcixsdudkizgfikhmfuv
```

Pass criteria:

- `ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE` present
- `ATP2_SUPABASE_AUTH_BRIDGE_VERIFY_MODE` present
- `ATP2_SUPABASE_AUTH_BRIDGE_EXPECTED_CLAIM_VERSION` present
- `ATP2_SUPABASE_JWT_SECRET` present
- `ATP2_M2M_DELEGATE_ENCRYPTION_KEY` present

## Phase 2. Deploy Edge Function

Deploy the current server function bundle:

```bat
supabase functions deploy make-server-b0d68fc8 --project-ref vcixsdudkizgfikhmfuv
```

Optional local syntax check before deploy:

```bat
deno check supabase/functions/server/index.tsx
```

Pass criteria:

- deploy command returns success
- no route regression in `make-server-b0d68fc8`

## Phase 3. Deploy Frontend Runtime

Ensure the frontend runtime env contains:

```env
VITE_SUPABASE_PROJECT_ID=vcixsdudkizgfikhmfuv
VITE_SUPABASE_URL=https://vcixsdudkizgfikhmfuv.supabase.co
VITE_SUPABASE_ANON_KEY=<project anon key>
VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true
VITE_SUPABASE_AUTH_BRIDGE_FN_NAME=make-server-b0d68fc8
VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX=/auth/supabase-claim-bridge
VITE_M2M_DELEGATION_MANAGER=0xcC2C55DcC834D83fddcb7C2aA0B07A7ED6585E58
VITE_M2M_AI_WALLET_FACTORY_V2=0xc1eF71c92200bFE3bc304Bc20ee2D89da26E4ca2
```

Build check:

```bat
npm run build
```

Pass criteria:

- build passes
- deployed frontend uses the same env values above

## Phase 4. Route Reachability Checks

### 4.1 Bridge probe

Run the existing bridge probe:

```bat
node supabase\audit\test_h1_claim_bridge_http.cjs https://vcixsdudkizgfikhmfuv.supabase.co <anon-jwt> make-server-b0d68fc8 /auth/supabase-claim-bridge
```

Expected:

- at least one bridge health route responds
- `exchange` route is reachable
- it should not return `404`

Interpretation:

- `400` or `401` still proves the route is deployed
- `404` means the wrong function build is live or the route path is wrong

### 4.2 M2M route presence

Open the app with devtools network tab enabled.

Expected routes once the settings page loads:

- `POST /functions/v1/make-server-b0d68fc8/auth/supabase-claim-bridge/exchange`
- `GET /functions/v1/make-server-b0d68fc8/ai/m2m/config/<rootWallet>`

Pass criteria:

- neither route returns `404`
- config route does not fail with generic network error

## Phase 5. Auth Bridge Verification

Use the root wallet that will own the delegated session.

Steps:

1. connect the root wallet
2. trigger the Orina wallet auth flow
3. sign the wallet auth message
4. open Settings > AI Wallet M2M

Expected network sequence:

1. `POST /auth/supabase-claim-bridge/exchange`
2. `GET /ai/m2m/config/:walletAddress`

Expected statuses:

- exchange: `200`
- config: `200`

If exchange fails:

- check `VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true`
- check root wallet has a local wallet auth session
- check `ATP2_SUPABASE_JWT_SECRET`
- check bridge function was redeployed after secrets changed

If config fails with `403`:

- connected wallet does not match the `walletAddress` being requested

## Phase 6. Generate Delegate Verification

With the authenticated root wallet on the settings page:

1. click `Generate Delegate`

Expected request:

- `POST /functions/v1/make-server-b0d68fc8/ai/m2m/delegates/generate`

Expected result:

- `200`
- response contains `success: true`
- response contains `delegate`
- a verified delegate appears in the UI

If it fails with `500` and mentions `ATP2_M2M_DELEGATE_ENCRYPTION_KEY`:

- set the secret
- redeploy `make-server-b0d68fc8`
- retry

## Phase 7. Enroll Delegate Verification

This flow uses a second wallet.

### Root wallet

1. click `Create Enroll Code`
2. copy the generated invite id

Expected request:

- `POST /functions/v1/make-server-b0d68fc8/ai/m2m/delegates/invite`

Expected result:

- `200`
- response contains `invite`
- pending invite appears in UI

### Delegate wallet

1. disconnect root wallet
2. connect the delegate wallet
3. sign the Orina wallet auth message for that delegate wallet
4. open the same settings panel
5. paste the invite id
6. click `Accept Enroll Code`

Expected request:

- `POST /functions/v1/make-server-b0d68fc8/ai/m2m/delegates/accept-invite`

Expected result:

- `200`
- response contains `delegate`
- response contains `rootWalletAddress`

Pass criteria:

- root wallet refresh sees the enrolled delegate in `Verified Delegates`

## Phase 8. Config Save Verification

Back on the root wallet:

1. select a verified delegate
2. leave `buy` enabled
3. choose `USDT`
4. set `maxPerOrder`
5. set `maxTotal`
6. set `expiryDays`
7. click `Save M2M Policy`

Expected request:

- `POST /functions/v1/make-server-b0d68fc8/ai/m2m/config`

Expected result:

- `200`
- response contains:
  - `config.selectedDelegateId`
  - `overview.rootFallbackEnabled = true`
  - `overview.prefundRequired = true`

Pass criteria:

- no runtime error banner
- saved policy reloads correctly on refresh

## Phase 9. On-chain Readiness Verification

After config save succeeds, the UI still depends on on-chain readiness.

Expected cards:

- `Session Model`: `Direct Delegate`
- `Root Fallback`: `Always On`
- `Deployment`: `Ready`

Expected preview:

- root epoch present
- next session nonce present
- selected delegate address shown
- predicted wallet address derives successfully after token and expiry are set

If deployment is not ready:

- frontend M2M contract env is wrong
- or current app runtime is still on an older build

## Phase 10. Functional Smoke Matrix

### Root wallet smoke

1. load settings page
2. generate delegate
3. save config
4. refresh page

Expected:

- config round-trip remains stable

### External delegate smoke

1. create enroll code
2. accept with second wallet
3. refresh root wallet page

Expected:

- enrolled delegate persists

### Runtime error mapping smoke

Check these now surface directly in UI:

- bridge disabled
- wallet session required
- 401 auth claims rejected
- 403 wallet mismatch
- 404 route not deployed
- 500 missing JWT secret
- 500 missing delegate encryption key

## Phase 11. Go-Live Gate

Do not treat delegated AI wallet as enabled for users until all are true:

1. bridge exchange returns `200`
2. config load returns `200`
3. generate delegate returns `200`
4. invite returns `200`
5. accept invite returns `200`
6. save config returns `200`
7. UI derives predicted wallet successfully
8. no route returns `404`
9. no server route returns `500`

## Rollback

If runtime breaks after deploy:

1. redeploy the previous frontend build
2. redeploy the previous `make-server-b0d68fc8` bundle if needed
3. disable access to the M2M settings page in frontend if the service cannot be recovered quickly

If only `Generate Delegate` is broken:

1. keep M2M settings page up
2. temporarily rely on `Create Enroll Code` / `Accept Enroll Code`
3. restore `ATP2_M2M_DELEGATE_ENCRYPTION_KEY`
4. redeploy the function
