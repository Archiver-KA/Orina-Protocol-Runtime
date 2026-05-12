# Supabase Split Function Runbook

Last verified by Codex audit: 2026-05-12

## Topology

Safe deploy now uses dedicated edge functions for the blast-radius-sensitive routes:

- shared core: `make-server-b0d68fc8`
- auth bridge: `orina-auth-bridge-v1`
- AI M2M: `orina-ai-m2m-v2`
- seller minting: `orina-seller-minting-v1`
- receipt sync: `orina-receipt-sync-v1`

The shared bundle remains for:

- `POST /ai/assist`
- `POST /ai/search`
- `GET|POST /ipfs/*`
- `GET|POST|PATCH|DELETE /api-keys/*`

## Frontend Env

Use these client env defaults for split deploys:

```env
VITE_SUPABASE_URL=https://vcixsdudkizgfikhmfuv.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

VITE_SUPABASE_FUNCTIONS_NAMESPACE=make-server-b0d68fc8
VITE_SUPABASE_SHARED_SERVER_FN_NAME=make-server-b0d68fc8

VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true
VITE_SUPABASE_AUTH_BRIDGE_FN_NAME=orina-auth-bridge-v1
VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX=

VITE_SUPABASE_AI_M2M_FN_NAME=orina-ai-m2m-v2
VITE_SUPABASE_SELLER_MINTING_FN_NAME=orina-seller-minting-v1
VITE_SUPABASE_RECEIPT_SYNC_FN_NAME=orina-receipt-sync-v1
```

Edge Function server CORS environment:

```env
ORINA_CORS_ENV=production
ORINA_CORS_ALLOWED_ORIGINS=https://app.orina.io,https://orina.io,https://www.orina.io
ORINA_CORS_ALLOW_PREVIEW_ORIGINS=false
```

Only set `ORINA_CORS_ALLOW_PREVIEW_ORIGINS=true` for intentionally exposed preview deployments.

## Deploy Order

Deploy the isolated functions first, then the shared bundle:

```bat
supabase functions deploy orina-auth-bridge-v1 --project-ref vcixsdudkizgfikhmfuv
supabase functions deploy orina-ai-m2m-v2 --project-ref vcixsdudkizgfikhmfuv
supabase functions deploy orina-seller-minting-v1 --project-ref vcixsdudkizgfikhmfuv
supabase functions deploy orina-receipt-sync-v1 --project-ref vcixsdudkizgfikhmfuv
supabase functions deploy make-server-b0d68fc8 --project-ref vcixsdudkizgfikhmfuv
```

Use this order whenever only one sensitive surface changes:

1. `auth bridge` changes: deploy only `orina-auth-bridge-v1`
2. `M2M` changes: deploy only `orina-ai-m2m-v2`
3. `seller minting` changes: deploy only `orina-seller-minting-v1`
4. `receipt sync` changes: deploy only `orina-receipt-sync-v1`
5. `ai assist`, `ipfs`, or `api-keys` changes: deploy only `make-server-b0d68fc8`

## Verification

Bridge reachability:

```bat
node supabase\audit\test_h1_claim_bridge_http.cjs https://vcixsdudkizgfikhmfuv.supabase.co <anon-jwt> orina-auth-bridge-v1
```

M2M reachability:

```bat
node supabase\audit\probe_ai_m2m_runtime.cjs
```

Wallet claim security smoke:

```bat
node supabase\audit\smoke_wallet_claim_security.cjs https://vcixsdudkizgfikhmfuv.supabase.co <anon-jwt> orina-auth-bridge-v1
```

Positive auth + isolated route smoke:

```bat
node supabase\audit\live_positive_auth_probe.mjs
```

CORS health check:

```powershell
$headers = @{
  Origin = 'https://app.orina.io'
  'Access-Control-Request-Method' = 'GET'
}

Invoke-WebRequest `
  -UseBasicParsing `
  -Method Options `
  -Headers $headers `
  -Uri https://vcixsdudkizgfikhmfuv.supabase.co/functions/v1/make-server-b0d68fc8/health
```

Expected: `Access-Control-Allow-Origin` equals the request origin and is never `*`. If a deployed function returns `*`, redeploy the updated Edge bundle before release.

## Expected Bases

Production URLs should resolve to:

- auth bridge: `https://vcixsdudkizgfikhmfuv.supabase.co/functions/v1/orina-auth-bridge-v1`
- AI M2M: `https://vcixsdudkizgfikhmfuv.supabase.co/functions/v1/orina-ai-m2m-v2`
- seller minting: `https://vcixsdudkizgfikhmfuv.supabase.co/functions/v1/orina-seller-minting-v1`
- receipt sync: `https://vcixsdudkizgfikhmfuv.supabase.co/functions/v1/orina-receipt-sync-v1`
- shared core: `https://vcixsdudkizgfikhmfuv.supabase.co/functions/v1/make-server-b0d68fc8`

## Safety Notes

1. Do not point `VITE_SUPABASE_AUTH_BRIDGE_FN_NAME` back to `make-server-b0d68fc8` unless you intentionally want the old shared topology.
2. Keep `VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX` empty for the dedicated bridge function.
3. If a smoke script still assumes `/ai/m2m/*` or `/auth/supabase-claim-bridge/*` under the shared bundle, treat it as legacy and update the script before using it for release validation.
4. Keep shared CORS handling in `supabase/functions/server/edge-app.ts`; it should echo approved origins, not return a wildcard origin for protected routes.
5. Keep upload, chat, AI, and moderation write paths on the shared `checkRateLimit()` helper backed by `public.rate_limit_increment`.
