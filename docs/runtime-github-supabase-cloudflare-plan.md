# Runtime GitHub, Supabase, Cloudflare Plan

## Current baseline

- Canonical repo: `C:\ORINA\ATPProtocol2\Orina Protocol - Runtime`
- Branch: `main`
- Remote: `origin -> https://github.com/Archiver-KA/Orina-Protocol-App`
- Latest synced UI/runtime change set:
  - `src/app/runtime/runtime-app.tsx`
  - `src/app/components/minting.tsx`
  - `src/app/components/minting-right-sidebar.tsx`
  - `src/utils/binanceMarketStream.ts`

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

### Commit 3: Cloudflare deploy preparation

Scope:

- add Pages-specific routing assets only if needed after route smoke
- document Pages build settings
- pin preview/production environment variables in deployment checklist

Suggested message:

- `chore: prepare cloudflare pages deployment`

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

## Cloudflare Pages baseline

Current repo shape fits static Vite deployment.

Settings:

- Framework preset: `React (Vite)` or no preset with manual values
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repo root

Environment variables to configure in Pages:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- any runtime public env already consumed by `utils/runtimeConfig.ts`

Operational notes:

- use branch previews for every non-trivial runtime change
- keep `main` as production deployment branch
- add explicit `_redirects` only if route smoke on Pages shows SPA fallback gaps

## Release gate

Before commit/push:

1. `npm run verify:viewer-release`
2. confirm remote `origin/main` is the intended publish target
3. review only runtime-relevant diff

Before Cloudflare production deploy:

1. confirm production Pages env values
2. confirm Supabase target project and public anon key
3. smoke wallet connect + minting sidebar + protected runtime routes on preview
