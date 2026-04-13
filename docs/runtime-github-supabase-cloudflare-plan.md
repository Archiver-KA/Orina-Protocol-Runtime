# Runtime GitHub, Supabase, Cloudflare Plan

## Current baseline

- Canonical repo: `C:\ORINA\ATPProtocol2\Orina Protocol - Runtime`
- Branch: `main`
- Remote: `origin -> https://github.com/Archiver-KA/Orina-Protocol-Runtime`
- Live frontend hostname: `https://app.orina.io`
- Live Cloudflare Worker service: `apporinaio`
- Existing root-site assets remain outside this plan:
  - `https://orina.io`
  - `https://www.orina.io`
- Deploy mode target:
  - source of truth stays on GitHub
  - Cloudflare Worker Builds pulls from GitHub on every push to `main`
  - Cloudflare deploys Worker `apporinaio` from the repo build output
  - custom domain `app.orina.io` stays bound to that Worker service

## Commit plan

### Commit 1: live minting sidebar telemetry

Scope:

- wire minting page telemetry into runtime sidebar
- replace hardcoded sidebar metrics with live RPC + Binance stream data
- add Binance WebSocket adapter

Suggested message:

- `feat: add live minting sidebar telemetry and market pulse`

### Commit 2: Supabase environment alignment

Scope:

- confirm canonical frontend env names
- verify `VITE_SUPABASE_URL`
- verify `VITE_SUPABASE_ANON_KEY`
- verify runtime bridge/function names used by the frontend
- update `.env.example` only if runtime repo drifts from actual server contract

Suggested message:

- `chore: align frontend runtime env with supabase server`

### Commit 3: Cloudflare Worker deploy preparation

Scope:

- add `wrangler.jsonc` for Worker `apporinaio`
- remove repo-level deploy workflow so only the Cloudflare build path remains
- document the minimal Cloudflare-side env required for the deploy path
- keep `app.orina.io` isolated from the root-site Pages project

Suggested message:

- `chore: prepare cloudflare worker deployment`

## Supabase canonical contract

The runtime repo becomes the canonical frontend client for Supabase.

Rules:

- frontend only uses public browser env:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- never expose service-role or privileged admin secrets in frontend build env
- runtime verification gate before pushing production:
  - `npm run verify:viewer-release`
  - `npm run verify:protocol-runtime-surface`
- if `verify:protocol-runtime-surface` skips locally, production deploy must still provide env and pass against the target server

## Cloudflare Worker baseline

The live app is not running on Pages. It is bound through a Workers custom-domain record:

- `app.orina.io -> apporinaio`

The repo now targets a GitHub-driven Worker deploy:

- source repo: `Archiver-KA/Orina-Protocol-Runtime`
- production branch: `main`
- build command: `npm run build`
- static assets source: `dist`
- runtime config source: `wrangler.jsonc`
- SPA routing mode: `assets.not_found_handling = "single-page-application"`

Only `app.orina.io` is in scope. Do not edit:

- `orina.io`
- `www.orina.io`
- Pages project `orina-io`

### Single deploy path

- Keep:
  - Cloudflare Worker Builds on `apporinaio`
  - `wrangler.jsonc` in the repo
  - `protocol-release-gate.yml` as verification only
- Remove:
  - repo-level deploy workflow `.github/workflows/deploy-apporinaio.yml`
  - ad-hoc local `wrangler deploy` except for emergency recovery

### Cloudflare-side env required

Cloudflare Worker Builds for `apporinaio` reads its own dashboard build variables. GitHub repository
secrets do not feed this build path.

Required in `Settings > Build > Build variables and secrets`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SHARED_SERVER_FN_NAME=make-server-b0d68fc8`
- `VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true`

Recommended for exact parity with the current live runtime:

- `VITE_SITE_URL=https://app.orina.io`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_AUTH_BRIDGE_FN_NAME=make-server-b0d68fc8`
- `VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX=/auth/supabase-claim-bridge`
- `VITE_SUPABASE_AI_M2M_FN_NAME=orina-ai-m2m-v2`
- `VITE_SUPABASE_AI_M2M_PATH_PREFIX=`
- `VITE_SUPABASE_SELLER_MINTING_FN_NAME=orina-seller-minting-v1`
- `VITE_SUPABASE_RECEIPT_SYNC_FN_NAME=orina-receipt-sync-v1`
- `VITE_M2M_DELEGATION_MANAGER=0xcC2C55DcC834D83fddcb7C2aA0B07A7ED6585E58`
- `VITE_M2M_AI_WALLET_FACTORY_V2=0xc1eF71c92200bFE3bc304Bc20ee2D89da26E4ca2`
- `VITE_WALLET_AUTH_SESSION_TTL_MS=604800000`

Do not put frontend-incompatible secrets into the Cloudflare Worker build:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ATP2_SUPABASE_JWT_SECRET`
- `ATP2_M2M_DELEGATE_ENCRYPTION_KEY`
- any `ATP2_*` private server secret intended for Supabase Edge Functions

### Runtime defaults now pinned in source

- `VITE_SITE_URL=https://app.orina.io`
- `VITE_SUPABASE_AI_M2M_FN_NAME=orina-ai-m2m-v2`
- `VITE_SUPABASE_SHARED_SERVER_FN_NAME=make-server-b0d68fc8`
- `VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true`
- `VITE_ENABLE_SUPABASE_CONFIG_FALLBACK=true`
- `VITE_M2M_DELEGATION_MANAGER=0xcC2C55DcC834D83fddcb7C2aA0B07A7ED6585E58`
- `VITE_M2M_AI_WALLET_FACTORY_V2=0xc1eF71c92200bFE3bc304Bc20ee2D89da26E4ca2`

Operational notes:

- the deploy path is GitHub-driven through Cloudflare, not through GitHub Actions
- push to `main` should remain the only production trigger
- local `wrangler deploy` should be treated as emergency-only and followed by a normal Git push sync

## Release gate

Before commit/push:

1. `npm run verify:viewer-release`
2. confirm remote `origin/main` is the intended publish target
3. review only runtime-relevant diff

Before Cloudflare production deploy:

1. confirm Cloudflare build env is present
2. confirm Supabase target project and public anon key
3. smoke wallet connect + minting sidebar + protected runtime routes on preview
