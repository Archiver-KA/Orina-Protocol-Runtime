# AI M2M Supabase Deploy And Runtime Verification

> Historical shared-bundle checklist replaced by the split-function runbook in `docs/spec/19-supabase-split-function-runbook.md`. This file keeps the current verification matrix and compatibility notes for April 2026.

## Current Runtime Bases

- project ref: `vcixsdudkizgfikhmfuv`
- shared core: `https://vcixsdudkizgfikhmfuv.supabase.co/functions/v1/make-server-b0d68fc8`
- auth bridge: `https://vcixsdudkizgfikhmfuv.supabase.co/functions/v1/orina-auth-bridge-v1`
- AI M2M: `https://vcixsdudkizgfikhmfuv.supabase.co/functions/v1/orina-ai-m2m-v2`

Routes currently used by the app:

- bridge exchange: `POST /functions/v1/orina-auth-bridge-v1/exchange`
- M2M config load: `GET /functions/v1/orina-ai-m2m-v2/config/:walletAddress`
- M2M config save: `POST /functions/v1/orina-ai-m2m-v2/config`
- generate delegate: `POST /functions/v1/orina-ai-m2m-v2/delegates/generate`
- create enroll code: `POST /functions/v1/orina-ai-m2m-v2/delegates/invite`
- accept enroll code: `POST /functions/v1/orina-ai-m2m-v2/delegates/accept-invite`
- direct execution: `POST /functions/v1/orina-ai-m2m-v2/execute`
- execution status poll: `GET /functions/v1/orina-ai-m2m-v2/status/:threadId/:messageId`

Mounted source of truth in repo:

- [orina-auth-bridge-v1/index.ts](c:/ORINA/ATPProtocol2/ATP2/supabase/functions/orina-auth-bridge-v1/index.ts)
- [orina-ai-m2m-v2/index.ts](c:/ORINA/ATPProtocol2/ATP2/supabase/functions/orina-ai-m2m-v2/index.ts)
- [wallet-auth-claim-bridge.tsx](c:/ORINA/ATPProtocol2/ATP2/supabase/functions/server/wallet-auth-claim-bridge.tsx)
- [ai-m2m-wallet.ts](c:/ORINA/ATPProtocol2/ATP2/supabase/functions/server/ai-m2m-wallet.ts)

## Frontend Runtime Baseline

```env
VITE_SUPABASE_PROJECT_ID=vcixsdudkizgfikhmfuv
VITE_SUPABASE_URL=https://vcixsdudkizgfikhmfuv.supabase.co
VITE_SUPABASE_ANON_KEY=<project anon key>
VITE_SUPABASE_FUNCTIONS_NAMESPACE=make-server-b0d68fc8
VITE_SUPABASE_SHARED_SERVER_FN_NAME=make-server-b0d68fc8
VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true
VITE_SUPABASE_AUTH_BRIDGE_FN_NAME=orina-auth-bridge-v1
VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX=
VITE_SUPABASE_AI_M2M_FN_NAME=orina-ai-m2m-v2
VITE_M2M_DELEGATION_MANAGER=0xcC2C55DcC834D83fddcb7C2aA0B07A7ED6585E58
VITE_M2M_AI_WALLET_FACTORY_V2=0xc1eF71c92200bFE3bc304Bc20ee2D89da26E4ca2
```

## Secrets Gate

These must be present remotely before route or browser verification:

- `ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE=true`
- `ATP2_SUPABASE_AUTH_BRIDGE_VERIFY_MODE=wallet_session_row`
- `ATP2_SUPABASE_AUTH_BRIDGE_EXPECTED_CLAIM_VERSION=h1`
- `ATP2_SUPABASE_JWT_SECRET=<supabase-jwt-secret>`
- `ATP2_M2M_DELEGATE_ENCRYPTION_KEY=<strong-random-secret>`

## Verification Order

### 1. Reachability

Run these probes first:

```bat
node supabase\audit\test_h1_claim_bridge_http.cjs https://vcixsdudkizgfikhmfuv.supabase.co <anon-jwt> orina-auth-bridge-v1
```

```bat
node supabase\audit\probe_ai_m2m_runtime.cjs
```

```bat
node supabase\audit\smoke_wallet_claim_security.cjs https://vcixsdudkizgfikhmfuv.supabase.co <anon-jwt> orina-auth-bridge-v1
```

Pass criteria:

- bridge health and exchange are reachable
- AI M2M config and delegate routes are reachable
- no route returns `404`

### 2. Browser Auth Flow

Using the root wallet that will own the delegated session:

1. connect the wallet
2. complete the Orina wallet auth signature
3. open Settings > AI Wallet M2M

Expected network sequence:

1. `POST /functions/v1/orina-auth-bridge-v1/exchange`
2. `GET /functions/v1/orina-ai-m2m-v2/config/:walletAddress`

Expected statuses:

- exchange: `200`
- config load: `200`

### 3. Delegate Lifecycle

Root wallet expected results:

- `POST /functions/v1/orina-ai-m2m-v2/delegates/generate` returns `200`
- `POST /functions/v1/orina-ai-m2m-v2/delegates/invite` returns `200`
- verified delegate appears in the UI after generate or enroll

Delegate wallet expected result:

- `POST /functions/v1/orina-ai-m2m-v2/delegates/accept-invite` returns `200`

### 4. Policy Save

Expected result after saving a policy:

- `POST /functions/v1/orina-ai-m2m-v2/config` returns `200`
- response includes `config.selectedDelegateId`
- response overview keeps `rootFallbackEnabled = true`
- policy reloads correctly on refresh

### 5. Optional Action Execution

When the proposal execution surface is in use:

- `POST /functions/v1/orina-ai-m2m-v2/execute` should move the proposal to `executing` or `completed`
- `GET /functions/v1/orina-ai-m2m-v2/status/:threadId/:messageId` should expose the latest execution state and tx hash

## Go-Live Gate

Treat delegated AI wallet as live only when all are true:

1. bridge exchange returns `200`
2. config load returns `200`
3. delegate generate or enroll succeeds
4. config save returns `200`
5. predicted wallet derives successfully in the UI
6. no bridge or M2M route returns `404`
7. no route returns a `500` caused by missing JWT or delegate-encryption secrets

## Legacy Compatibility Note

If a stale probe or old frontend build still targets `/functions/v1/make-server-b0d68fc8/auth/supabase-claim-bridge/*` or `/functions/v1/make-server-b0d68fc8/ai/m2m/*`, treat that as a routing drift issue, not as the current production topology. Shared-bundle M2M paths are no longer the default deploy target.
