# Repository Audit Report

Audit date: 2026-05-12
Branch: `codex/audit-2026-05-12`

## Scope

This audit covered the repository contents available in this workspace. The repository was treated as the source of truth. No business requirements were inferred, no product features were added, and public APIs were preserved except for verified hardening that does not change caller contracts.

The review covered:

- Frontend runtime code under `src/`
- Supabase Edge Function server code under `supabase/functions/server/`
- Supabase migrations and audit scripts under `supabase/`
- Build, release, smoke, and security scripts under `scripts/`
- CI configuration under `.github/workflows/`
- Documentation under `README.md`, `docs/`, `supabase/audit/README.md`, and security documentation
- Dependency metadata in `package.json` and `package-lock.json`

## Repository Inventory

Languages:

- TypeScript and TSX for the React/Vite application
- JavaScript and CJS/MJS scripts for verification, security scans, prerendering, and audits
- SQL for Supabase migrations and database functions
- Markdown documentation
- JSON/JSONC configuration

Frameworks and platforms:

- React 18
- Vite
- Vitest
- Tailwind CSS 4
- Material UI, Radix UI, Wagmi, Viem, MetaMask SDK
- Supabase Edge Functions and PostgreSQL migrations
- Cloudflare Workers configuration via `wrangler.jsonc`
- GitHub Actions release gate

Package managers and lockfiles:

- npm with `package-lock.json`
- `pnpm.overrides` metadata is present in `package.json`, but no pnpm lockfile was found

Primary entrypoints:

- `src/main.tsx`
- `src/App.tsx`
- Vite build entry through `index.html`
- Supabase Edge Function server entrypoints under `supabase/functions/server/`
- Verification and audit scripts under `scripts/` and `supabase/audit/`

Services and boundaries:

- Browser application
- Supabase Edge Function server boundary
- Supabase PostgreSQL and RPC boundary
- Blockchain wallet/provider boundary
- IPFS/Pinata gateway boundary
- AI provider boundary
- Marketplace/search/catalog data boundary
- Cloudflare/Vercel/Netlify/Supabase deployment origins

Authentication and authorization paths:

- Wallet authentication/session helpers in `src/utils/walletAuthSession.ts`
- Protected Edge Function routes mediated by H1 JWT and wallet ownership checks
- Supabase service-role operations constrained to server-side Edge Function code
- Supabase RLS/migration-backed database authorization
- Marketplace browsing RPC grants reviewed through SECURITY DEFINER audit metadata

External integrations:

- Supabase
- MetaMask and wallet providers
- BNB/BSC JSON-RPC and related chain providers
- Pinata/IPFS gateways
- Anthropic SDK / AI provider integration
- GeoNames import tooling
- Vercel, Netlify, Cloudflare Workers deployment hosts

Database writes:

- Runtime/order/profile/marketplace writes through Supabase migrations and Edge Function server modules
- Rate-limit writes through `public.rate_limit_increment`
- Background/catalog refresh functions for marketplace browse indexes
- Audit and smoke scripts that validate database surfaces

Background jobs and operational scripts:

- Prerendering public routes
- Geo download/build/export scripts
- Supabase audit scripts
- Runtime projection repair script
- Review and messaging smoke scripts
- Marketplace/security release verification scripts

Documentation locations reviewed:

- `README.md`
- `docs/README.md`
- `docs/spec/*.md`
- `docs/system-user-guide.md`
- `docs/system-faq.md`
- `docs/*runbook*.md`
- `supabase/audit/README.md`
- `supabaseJWT.md`
- `ATTRIBUTIONS.md`

No `CONTRIBUTING.md` existed. No `SECURITY.md` existed before this audit.

## Commands Run

Repository setup and inventory:

- `git status --short --branch`
- `git switch -c codex/audit-2026-05-12`
- `rg --files`
- `rg --files -g "README*" -g "SECURITY*" -g "CONTRIBUTING*" -g "*.md" docs supabase .github .`
- `Get-Content package.json`
- targeted `Get-Content` and `rg -n` reads across code, migrations, audit scripts, and documentation

Initial verification and security checks:

- `npm ci`
- `npm run test`
- `npm run verify:viewer-release`
- `npm run security:check-client-secrets`
- `npm audit --json`
- `npm run audit:supabase:security-definer`
- `npx supabase db query --agent=no --linked -o json <SECURITY DEFINER metadata query>`

Dependency verification and lockfile update:

- `npm audit fix --package-lock-only --dry-run --json`
- `npm audit fix --dry-run --json`
- `npm install --package-lock-only`
- `npm ci`
- `npm audit --json`

Post-fix verification:

- `npm run test`
- `npm run security:check-client-secrets`
- `npm run security:scan`
- `npm run audit:supabase:security-definer`
- `npm run verify:viewer-release`

Git review:

- `git diff --stat`
- `git status --short --branch`
- `git diff --check`

## Tools Installed

No new global tools were installed.

No new production dependencies were added.

No new verification/security tool was installed. Existing npm dependencies were reinstalled with `npm ci`. The existing local package lock was updated with npm overrides for vulnerable transitive packages. The Supabase CLI used for one linked metadata query was already available on the machine at `C:\Users\proje\scoop\shims\supabase.exe`; it was not installed by this audit.

## Findings Fixed

### DOM style injection hardening

Finding:

- `src/app/components/ai/borderless-textarea.tsx` used `styleEl.innerHTML` for dynamically injected CSS and interpolated a generated element id into the selector.

Fix:

- Replaced `innerHTML` with `textContent`.
- Removed dynamic id interpolation from the CSS selector.
- Added `getBorderlessTextareaOverrideCss()` and a focused test to assert that injected CSS does not contain HTML/script terminators or id selector interpolation.

### Dependency vulnerabilities

Finding:

- `npm audit --json` reported two moderate vulnerabilities:
  - `postcss <8.5.10`, XSS via unescaped `</style>`
  - `protocol-buffers-schema <3.6.1`, prototype pollution

Fix:

- Added npm and pnpm override metadata for `postcss@8.5.10` and `protocol-buffers-schema@3.6.1`.
- Updated `package-lock.json` with `npm install --package-lock-only`.
- Re-ran `npm ci` and `npm audit --json`; audit now reports zero vulnerabilities.

### SECURITY DEFINER audit drift

Finding:

- `npm run audit:supabase:security-definer` failed because six marketplace browse/page functions existed in the linked database but were not recorded as reviewed by the audit script.

Fix:

- Queried the linked Supabase metadata for grants, schema, function type, and search path.
- Verified the functions against the repository migrations.
- Added explicit reviewed notes to `scripts/audit-supabase-security-definer.mjs` for:
  - `get_marketplace_catalog_page_v1(text, text, text, uuid, numeric, numeric, text, integer, text, text, integer)`
  - `get_marketplace_collection_page_v1(text, text, text, uuid, numeric, numeric, text, integer, text, text, integer)`
  - `get_marketplace_profile_page_v1(text, text, text, uuid, numeric, numeric, text, integer, text, text, integer)`
  - `refresh_marketplace_asset_browse_index_v1()`
  - `refresh_marketplace_collection_browse_index_v1()`
  - `refresh_marketplace_profile_browse_index_v1()`

### Rate-limit race condition

Finding:

- `supabase/functions/server/rate-limiter.ts` used a read-then-write/update path for rate-limit counters even though the repository already has an atomic `public.rate_limit_increment` RPC.

Fix:

- Reworked the rate limiter to use the existing atomic RPC.
- Preserved existing fail-open behavior for database errors.
- Preserved blocked-row marking by `scope_key`.
- Added security scan coverage to require `rate_limit_increment` and detect the legacy select/update pattern.

### CORS wildcard response hardening

Finding:

- `supabase/functions/server/edge-app.ts` returned `*` for some allowed CORS decisions, including when no `Origin` header was present.

Fix:

- Changed CORS handling to echo the normalized approved origin for exact and pattern matches.
- Returned no CORS origin header for requests without an `Origin`.
- Added security scan coverage to flag wildcard origin returns in CORS code.

### Documentation gaps and stale documentation

Finding:

- No `SECURITY.md` existed.
- Documentation still referenced stale marketplace mock-data behavior and under-described current marketplace profile/collection browse implementation.
- Runtime docs did not record the audited CORS and atomic rate-limit behavior.

Fix:

- Added `SECURITY.md`.
- Updated README and docs index links.
- Updated affected integration, marketplace, Supabase split, and Supabase audit docs.
- Added "Last verified by Codex audit: 2026-05-12" only to files actually checked and updated.

## Findings Not Fixed

- No lint script exists in `package.json`; no separate lint verification could be run.
- No TypeScript typecheck script or `tsconfig.json` was found; no separate typecheck verification could be run.
- Browser/MetaMask connected smoke tests were not run because they require an interactive Chrome/MetaMask environment on port 9222.
- The Supabase CLI linked metadata query emitted `WARN: no SMS provider is enabled. Disabling phone login`; this was not treated as a repository defect because the audited runtime commands passed.
- `npm ci` still reports deprecated transitive package `@paulmillr/qr@0.2.1`. It is not a direct dependency and no repository-safe replacement was identified in this audit.
- `security:scan` still reports existing design-level residual notes for M2M invite-id strength and backup ciphertext handling. These were not changed because they require a product/security design decision and no critical/high verified defect was established from repository code alone.
- CORS policy still allows broad deployment host patterns such as `*.vercel.app`, `*.netlify.app`, `*.workers.dev`, and `*.supabase.co`. This audit hardened response behavior by echoing approved origins but did not narrow the deployment policy without an explicit environment ownership decision.
- Marketplace profile/collection browse materialized-view freshness and floor-price/volume projection limitations remain documented as residual operational constraints.

## Files Changed

Code and tests:

- `src/app/components/ai/borderless-textarea.tsx`
- `src/app/components/ai/borderless-textarea.test.ts`
- `supabase/functions/server/edge-app.ts`
- `supabase/functions/server/rate-limiter.ts`

Security and audit tooling:

- `scripts/security-scan-system.mjs`
- `scripts/audit-supabase-security-definer.mjs`
- `package.json`
- `package-lock.json`

Documentation:

- `README.md`
- `SECURITY.md`
- `docs/README.md`
- `docs/spec/05-integrations-settings-and-tools.md`
- `docs/spec/08-global-delivery-address.md`
- `docs/spec/19-supabase-split-function-runbook.md`
- `docs/spec/20-marketplace-profile-collection-scale-blueprint.md`
- `supabase/audit/README.md`
- `AUDIT_REPORT.md`

## Tests Added

- `src/app/components/ai/borderless-textarea.test.ts`
  - Verifies borderless textarea override CSS uses the stable class selector.
  - Verifies generated CSS does not contain HTML/script terminators.
  - Verifies generated CSS does not contain interpolated `textarea#...` selectors.

## Docs Updated

- `README.md`: linked security documentation and added audit verification date.
- `SECURITY.md`: added supported scope, reporting guidance, security assumptions, and verification commands.
- `docs/README.md`: linked security documentation and refreshed audit verification date.
- `docs/spec/05-integrations-settings-and-tools.md`: documented Edge security controls, CORS behavior, and atomic rate limiting.
- `docs/spec/08-global-delivery-address.md`: replaced stale mock-data reference with current marketplace catalog behavior.
- `docs/spec/19-supabase-split-function-runbook.md`: documented CORS origin echoing and rate-limit RPC safety.
- `docs/spec/20-marketplace-profile-collection-scale-blueprint.md`: updated implemented-vs-remaining marketplace browse status.
- `supabase/audit/README.md`: documented SECURITY DEFINER review expectations.

## Exact Verification Results

Initial verification:

- `npm ci`: passed; reported 2 moderate npm vulnerabilities and deprecated transitive `@paulmillr/qr@0.2.1`.
- `npm run test`: passed; 12 test files, 38 tests.
- `npm run verify:viewer-release`: passed.
  - viewer guard passed 23 files.
  - protocol runtime surface verified 4 runtime tables.
  - targeted Vitest suite passed 5 files, 21 tests.
  - Vite build and prerender completed; 261 public routes generated.
- `npm run security:check-client-secrets`: passed; no forbidden client secret patterns found.
- `npm audit --json`: failed with 2 moderate vulnerabilities:
  - `postcss <8.5.10`
  - `protocol-buffers-schema <3.6.1`
- `npm run audit:supabase:security-definer`: failed with 6 unexpected SECURITY DEFINER functions, all marketplace browse/page or refresh functions listed above.

Metadata verification:

- `npx supabase db query --agent=no --linked -o json <SECURITY DEFINER metadata query>`: completed.
  - Marketplace page RPCs had `search_path=public` and grants to `postgres`, `service_role`, `anon`, and `authenticated`.
  - Marketplace refresh RPCs had `search_path=public` and grants to `postgres` and `service_role`.
  - Supabase CLI printed `WARN: no SMS provider is enabled. Disabling phone login`.

Post-fix dependency verification:

- `npm install --package-lock-only`: passed; npm reported 0 vulnerabilities.
- `npm ci`: passed; npm reported 0 vulnerabilities; deprecated transitive `@paulmillr/qr@0.2.1` warning remains.
- `npm audit --json`: passed; 0 vulnerabilities.

Post-fix repository verification:

- `npm run test`: passed; 13 test files, 40 tests.
- `npm run security:check-client-secrets`: passed; scanned 279 files; no forbidden client secret patterns found.
- `npm run security:scan`: passed.
  - npm audit: critical 0, high 0, moderate 0, low 0, info 0.
  - DOM sink scan: no `dangerouslySetInnerHTML`, no `.innerHTML =`, no `eval`, no `new Function`.
  - Messaging scan: ok.
  - IPFS scan: ok.
  - Rate limiter scan: ok; requires `rate_limit_increment`.
  - M2M scan: ok.
  - CORS scan: ok.
  - Summary: `deps:ok | messaging:ok | ipfs:ok | ratelimit:ok | m2m:ok | cors:ok`.
- `npm run audit:supabase:security-definer`: passed; 24 audited functions; findings `[]`; `pass: true`.
- `npm run verify:viewer-release`: passed.
  - viewer guard passed 23 files.
  - protocol runtime surface verified 4 runtime tables.
  - targeted Vitest suite passed 5 files, 21 tests.
  - Vite build and prerender completed; 261 public routes generated.
- `git diff --check`: passed with exit code 0. Git printed existing LF-to-CRLF working-copy warnings for touched text files.

## Residual Risks

- Interactive wallet/browser smoke coverage remains unverified in this audit environment.
- There is no dedicated lint/typecheck command in the repository.
- Some CORS deployment patterns are broad by design and should be reviewed by deployment owners before production narrowing.
- M2M invite-id strength and backup ciphertext handling remain design-level review items.
- Transitive deprecated package warning remains for `@paulmillr/qr@0.2.1`.
- Marketplace profile/collection browse data freshness depends on refresh job correctness and operational cadence.

## Residual Risk Closure Pass

Closure date: 2026-05-12

This pass targeted the residual risks listed above. No product features were added, no public API was changed, no production dependencies were added, and no global tools were installed. New verification scripts use existing Node runtime capabilities and repository files only.

### Commands Run In Closure Pass

- `git status --short --branch`
- targeted `rg` and `Get-Content` reads across `package.json`, scripts, Edge Function code, migrations, and documentation
- `npm ls typescript --depth=4`
- `node --check scripts/smoke-cdp-readonly-security.mjs`
- `node --check scripts/verify-repo-tooling.mjs`
- `node --check scripts/verify-marketplace-browse-freshness.mjs`
- `Invoke-WebRequest -UseBasicParsing -Method Options -Headers @{ Origin = 'http://localhost:5173'; 'Access-Control-Request-Method' = 'GET' } -Uri https://vcixsdudkizgfikhmfuv.supabase.co/functions/v1/make-server-b0d68fc8/health`
- `Invoke-WebRequest -UseBasicParsing -Method Get -Headers @{ Origin = 'http://localhost:5173' } -Uri https://vcixsdudkizgfikhmfuv.supabase.co/functions/v1/make-server-b0d68fc8/health`
- `npm run verify:repo-tooling`
- `npm run verify:marketplace-freshness`
- `npm run security:scan`
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/version`
- `Invoke-WebRequest -UseBasicParsing http://localhost:5173/`
- `npm run smoke:cdp:readonly-security`
- `npm ci`
- `Get-CimInstance Win32_Process -Filter "name = 'node.exe'"`
- `Stop-Process -Id 100,14676 -Force`
- `npm ci`
- `npm run test`
- `npm run security:check-client-secrets`
- `npm run security:scan`
- `npm run audit:supabase:security-definer`
- `npm run verify:repo-tooling`
- `npm run verify:marketplace-freshness`
- `npm run verify:viewer-release`
- `Start-Process -FilePath npm.cmd -ArgumentList @('run','dev') -WorkingDirectory <repo> -WindowStyle Hidden -PassThru`
- `npm run smoke:cdp:readonly-security`
- `node scripts/smoke-cdp-readonly-security.mjs --goto http://localhost:5173/` with compact JSON summarization
- `git diff --check`
- `git status --short --branch`
- `git diff --stat`

### Browser And Wallet Smoke

CDP endpoint used:

- `http://127.0.0.1:9222`

App endpoint used:

- `http://localhost:5173/`

Routes and actions:

- `http://localhost:5173/`: CDP `Page.navigate`, non-destructive. App loaded; marketplace and wallet UI markers were visible.
- `http://localhost:5173/settings`: CDP `Page.navigate`, non-destructive. App loaded; wallet/security settings markers and documented auth-session prompt were visible.
- `http://localhost:5173/marketplace`: CDP `Page.navigate`, non-destructive. App loaded; marketplace browse markers were visible.

Wallet state:

- MetaMask provider detected.
- Read-only `eth_accounts` and `eth_chainId` calls succeeded.
- One account was detected.
- No wallet confirmation or extension prompt target appeared.
- No message or transaction signing was requested or performed.

Auth/session behavior:

- `walletAuthSessionPresent`: false.
- `bridgeSessionPresent`: false.
- The Settings route surfaced the documented auth-session prompt instead of silently exposing protected server state.
- Console emitted 5 expected auth-guard errors and 0 security errors. The expected errors were the documented "confirm your wallet" messaging guard; no signature was requested during this pass.

Marketplace browse:

- Marketplace route loaded successfully.
- Marketplace marker detection passed.
- Network requests stayed within approved origins.

Storage and secret exposure inspection:

- Inspected 279 `localStorage` key names and their values internally for forbidden secret patterns; no values were printed and no leak matches were found.
- Inspected `sessionStorage` key `orina_notifications_0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14`; no value was printed and no leak match was found.
- IndexedDB was supported; 0 databases were present for the inspected app origin.
- Cookies inspected: 0.
- DOM leak pattern matches: none.
- Storage leak matches: none for key names or values.
- Cookie leak matches: none.

Network origins observed:

- `http://localhost:5173`
- `https://basemaps.cartocdn.com`
- `https://fonts.googleapis.com`
- `https://fonts.gstatic.com`
- `https://gateway.pinata.cloud`
- `https://tiles.basemaps.cartocdn.com`
- `https://vcixsdudkizgfikhmfuv.supabase.co`

Unexpected origins:

- none

CORS observation:

- The local CDP smoke observed no Edge Function CORS responses during the three read-only navigations.
- Direct deployed health checks against `https://vcixsdudkizgfikhmfuv.supabase.co/functions/v1/make-server-b0d68fc8/health` still returned `Access-Control-Allow-Origin: *`:
  - OPTIONS with `Origin: http://localhost:5173`: status 204, `Access-Control-Allow-Origin: *`, `Vary: Accept-Encoding, Origin, Access-Control-Request-Headers`.
  - GET with `Origin: http://localhost:5173`: status 401, `Access-Control-Allow-Origin: *`, body `{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}`.
- Repository code now gates broad preview/deployment origins and exact production origins, but the deployed shared function requires redeploy before this deployed CORS drift can be marked closed.

### Typecheck And Lint Verification

`npm run verify:repo-tooling` passed as a structural verifier and reported:

- package manager: npm
- Vite config present: true
- typecheck status: blocked
- typecheck blocker: no direct `typescript` dependency and no `tsconfig.json`; adding `tsc --noEmit` would require new dev tooling/configuration
- lint status: blocked
- lint blocker: no existing linter dependency/configuration; adding lint would introduce a new lint stack

No typecheck or lint script was added because doing so safely would require new tooling/configuration outside the repository-standard toolchain.

### CORS Policy Narrowing

Allowed origin handling now lives in `supabase/functions/server/edge-app.ts`:

- exact production origins: `https://app.orina.io`, `https://orina.io`, `https://www.orina.io`
- configured exact origins: `ORINA_CORS_ALLOWED_ORIGINS`
- local origins: `localhost` and `127.0.0.1`, blocked when `ORINA_CORS_ENV=production`
- broad preview/deployment hosts: `*.supabase.co`, `*.vercel.app`, `*.netlify.app`, `*.workers.dev`, accepted only when `ORINA_CORS_ALLOW_PREVIEW_ORIGINS=true`

Classification:

- `*.vercel.app`: deployment preview host from repository deployment/docs context; required or unknown per owner deployment workflow; now disabled in production unless explicitly enabled.
- `*.netlify.app`: deployment preview host from repository deployment/docs context; required or unknown per owner deployment workflow; now disabled in production unless explicitly enabled.
- `*.workers.dev`: Cloudflare Workers preview host from repository deployment/config context; required or unknown per owner deployment workflow; now disabled in production unless explicitly enabled.
- `*.supabase.co`: Supabase function/project host; required for current backend deployment; now disabled as a broad pattern unless explicitly enabled, while exact production origins remain allowed.
- localhost/127.0.0.1: local development only; now blocked in production CORS mode.

`npm run security:scan` now verifies no wildcard CORS returns are present, production exact origins are configured, explicit env allowlist support exists, localhost is production-gated, and broad deployment hosts are gated by `ORINA_CORS_ALLOW_PREVIEW_ORIGINS`.

### M2M Invite-ID Strength

Reviewed code:

- `supabase/functions/server/ai-m2m-wallet.ts`
- `supabase/functions/server/rate-limiter.ts`
- `scripts/security-scan-system.mjs`

Verified and patched:

- invite ids now use `crypto.getRandomValues` with 32 random bytes and `m2m_` prefix
- invite id allocation retries random ids on KV collision
- invite creation is rate-limited by authenticated root wallet
- invite accept is rate-limited by authenticated delegate wallet
- expiration is enforced before accept
- claimed or expired invites are rejected on replay
- successful accept marks the invite `claimed`

`npm run security:scan` verifies minimum entropy, cryptographic randomness, collision retry, expiration enforcement, replay rejection, and route rate limiting.

### Backup Ciphertext Handling

Reviewed code:

- `supabase/functions/server/ai-m2m-wallet.ts`
- client M2M surfaces under `src/`
- `scripts/security-scan-system.mjs`

Verified:

- generated delegate private keys are encrypted with AES-GCM before KV storage
- encryption uses a 12-byte IV
- generated delegate private keys are not returned in JSON responses
- ciphertext/IV records are not returned in JSON responses
- no delegate private key logging pattern was found
- no delegate secret decrypt/export endpoint was found
- client code does not expose `ATP2_M2M_DELEGATE_ENCRYPTION_KEY` or Vite M2M secret patterns

Residual invariant:

- KV backups can contain ciphertext. Protection depends on keeping `ATP2_M2M_DELEGATE_ENCRYPTION_KEY` separate from backups, logs, and response bodies. This is now documented in `SECURITY.md` and AI M2M docs and checked by `npm run security:scan` where repository code can prove it.

### Marketplace Freshness

Reviewed code:

- `supabase/migrations/000070_marketplace_catalog_browse_index.sql`
- `supabase/migrations/000071_marketplace_collection_browse_index.sql`
- `supabase/migrations/000072_marketplace_profile_browse_index.sql`
- `docs/spec/20-marketplace-profile-collection-scale-blueprint.md`
- `scripts/verify-marketplace-browse-freshness.mjs`

`npm run verify:marketplace-freshness` passed and verified all asset, collection, and profile browse surfaces have:

- materialized browse view
- concurrent refresh path
- non-concurrent fallback refresh path
- service-role-only refresh function grant
- public page RPC grant to `anon`, `authenticated`, and `service_role`
- initial refresh call
- `pg_cron` schedule `*/2 * * * *`
- comments documenting the view and refresh function

Expected max staleness remains "2 minutes plus job/runtime delay when pg_cron is healthy"; the repository does not define a stricter SLA. The runbook now includes failure detection SQL and manual refresh SQL.

### Files Changed In Closure Pass

Code and runtime:

- `supabase/functions/server/ai-m2m-wallet.ts`
- `supabase/functions/server/edge-app.ts`
- `supabase/functions/server/rate-limiter.ts`

Security and verification tooling:

- `package.json`
- `scripts/security-scan-system.mjs`
- `scripts/smoke-cdp-readonly-security.mjs`
- `scripts/verify-marketplace-browse-freshness.mjs`
- `scripts/verify-repo-tooling.mjs`

Documentation:

- `README.md`
- `SECURITY.md`
- `docs/port-9222-runtime-verification.md`
- `docs/spec/05-integrations-settings-and-tools.md`
- `docs/spec/11-ai-m2m-runtime-enablement.md`
- `docs/spec/19-supabase-split-function-runbook.md`
- `docs/spec/20-marketplace-profile-collection-scale-blueprint.md`
- `AUDIT_REPORT.md`

### Closure Verification Results

- Initial `npm ci`: failed with Windows `EPERM` unlink on `node_modules\lightningcss-win32-x64-msvc\lightningcss.win32-x64-msvc.node` while the local Vite/Node process held the native module.
- After stopping the local Vite/Node process, `npm ci`: passed; 500 packages installed/audited; 0 vulnerabilities; deprecated transitive `@paulmillr/qr@0.2.1` warning remains.
- `npm run test`: passed; 13 test files, 40 tests.
- `npm run security:check-client-secrets`: passed; scanned 279 files; no forbidden privileged-secret patterns.
- `npm run security:scan`: passed; npm audit critical 0, high 0, moderate 0, low 0, info 0; DOM sink scan clear; M2M, backup, rate-limit, messaging, IPFS, audit-alias, and CORS scans passed; summary `deps:ok | messaging:ok | ipfs:ok | ratelimit:ok | m2m:ok | cors:ok`.
- `npm run audit:supabase:security-definer`: passed; 24 audited functions; findings `[]`; `pass: true`.
- `npm run verify:repo-tooling`: passed structural verifier with typecheck/lint blockers documented above.
- `npm run verify:marketplace-freshness`: passed for asset, collection, and profile browse surfaces.
- `npm run verify:viewer-release`: passed; viewer guard passed 23 files; protocol runtime surface verified 4 runtime tables; targeted Vitest suite passed 5 files, 21 tests; Vite build completed; prerender generated 261 public routes.
- `npm run smoke:cdp:readonly-security`: passed using CDP on `http://127.0.0.1:9222`.
- `git diff --check`: passed with exit code 0. Git printed existing LF-to-CRLF working-copy warnings for touched text files.

### Residual Items After Closure Pass

- Deployed shared Supabase function CORS still returns `Access-Control-Allow-Origin: *` on the health route until the updated Edge bundle is redeployed. Repository code and scans are fixed; deployment drift remains an owner action.
- Dedicated typecheck and lint remain blocked by missing direct TypeScript dependency/config and missing linter dependency/config. A structural verifier was added instead of introducing a new toolchain.
- Interactive wallet auth signing was not performed because this pass was constrained to non-destructive read-only CDP verification. The auth guard behavior was verified without requesting a signature.
- KV backups can still contain managed delegate ciphertext. The repository now documents and scans the enforceable invariant that the encryption key must not be logged, returned, exported, or backed up with ciphertext.
- Marketplace browse freshness has repository-backed verification and runbook commands, but the maximum staleness guarantee remains limited to the defined two-minute cron plus job/runtime delay.
- The transitive deprecated `@paulmillr/qr@0.2.1` warning remains; no direct repository-safe replacement was identified without dependency-owner action.
