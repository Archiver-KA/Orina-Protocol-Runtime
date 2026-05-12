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
