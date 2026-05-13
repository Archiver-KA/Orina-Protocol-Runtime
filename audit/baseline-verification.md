# Baseline Verification

Audit date: 2026-05-13

Phase 2 ran existing repository verification only. No code remediation was performed before this baseline was captured.

## Commands

### `npm ci`

First attempt:

- Exit code: 1
- Result: failed before dependency installation completed.
- Warning/error: Windows `EPERM` unlink failure for `node_modules/lightningcss-win32-x64-msvc/lightningcss.win32-x64-msvc.node`.
- Artifact path from npm: `C:\Users\proje\AppData\Local\npm-cache\_logs\2026-05-13T09_03_50_323Z-debug-0.log`
- Evidence: local `node.exe` processes were holding the Vite dev server open.

Local lock cleanup:

- Command: `Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Select-Object ProcessId,CommandLine`
- Observed local processes:
  - `npm run dev`
  - local Vite process from this repository
- Command: `Stop-Process -Id 17436,6348`
- Scope: local dev-server lock cleanup only; no deployment or infrastructure mutation.

Second attempt:

- Exit code: 124
- Result: command timed out after 124051 ms.
- Follow-up check: no `node.exe` process remained active.

Third attempt:

- Exit code: 0
- Result: passed.
- Output summary:
  - added 500 packages
  - audited 501 packages
  - 90 packages looking for funding
  - found 0 vulnerabilities
- Warning:
  - deprecated transitive package `@paulmillr/qr@0.2.1`; npm says the package is now available as `qr`.
- Artifact paths: none produced by repository command.

### `npm run test`

- Exit code: 0
- Result: passed.
- Output summary:
  - Vitest v4.1.3
  - 13 test files passed
  - 40 tests passed
  - duration 1.89s
- Warnings: none.
- Artifact paths: none produced by repository command.

### `npm run security:check-client-secrets`

- Exit code: 0
- Result: passed.
- Output summary:
  - no forbidden privileged-secret patterns in 279 files under `src`, `utils`
- Warnings: none.
- Artifact paths: none produced by repository command.

### `npm run security:scan`

- Exit code: 0
- Result: passed.
- Output summary:
  - npm audit: critical 0, high 0, moderate 0, low 0, info 0
  - scanned 279 TS/TSX files under `src/`, `utils/`
  - `dangerouslySetInnerHTML`: none
  - `.innerHTML` assignment: none
  - `eval/new Function`: none
  - client privileged Supabase env patterns: ok
  - AI M2M delegated wallet checks: ok
  - messaging auth/authorization checks: ok
  - IPFS upload protection checks: ok
  - distributed rate limiting checks: ok
  - audit tooling secret alias checks: ok
  - CORS posture checks: ok
  - aggregate: `deps:ok | messaging:ok | ipfs:ok | ratelimit:ok | m2m:ok | cors:ok`
- Warnings/residual notes:
  - Managed delegate KV backups can still contain ciphertext; protection depends on keeping `ATP2_M2M_DELEGATE_ENCRYPTION_KEY` outside backups and logs.
- Artifact paths: none produced by repository command.

### `npm run audit:supabase:security-definer`

- Exit code: 0
- Result: passed.
- Output summary:
  - source: linked
  - audited functions: 24
  - checked functions included marketplace page RPCs, marketplace refresh functions, rate limiter RPC, and reviewed operator cron functions.
  - ignored PostGIS `st_estimatedextent` overloads.
  - findings: `[]`
  - pass: true
- Warnings: none emitted by the repository command.
- Artifact paths: none produced by repository command.

### `npm run verify:repo-tooling`

- Exit code: 0
- Result: passed as structural verification.
- Output summary:
  - package manager: npm
  - Vite config present: true
  - typecheck status: blocked
  - lint status: blocked
  - pass: true
- Warnings/blockers:
  - no direct `typescript` dependency and no `tsconfig.json`; adding `tsc --noEmit` would require new dev tooling/configuration.
  - no linter dependency/configuration; adding lint would introduce a new lint stack.
- Artifact paths: none produced by repository command.

### `npm run verify:marketplace-freshness`

- Exit code: 0
- Result: passed.
- Output summary:
  - asset browse index checks passed.
  - collection browse index checks passed.
  - profile browse index checks passed.
  - all three surfaces define materialized views, concurrent refresh with fallback, service-role-only refresh RPCs, public page RPC grants, initial refresh, two-minute cron definitions, and comments.
- Expected max staleness from repository script:
  - two minutes plus job/runtime delay when `pg_cron` is healthy; no stricter SLA is defined in repository code.
- Manual repair SQL emitted by script:
  - `select public.refresh_marketplace_asset_browse_index_v1();`
  - `select public.refresh_marketplace_collection_browse_index_v1();`
  - `select public.refresh_marketplace_profile_browse_index_v1();`
- Artifact paths: none produced by repository command.

### `npm run verify:viewer-release`

- Exit code: 0
- Result: passed.
- Output summary:
  - viewer surface guard passed for 23 files.
  - protocol runtime surface verified 4 runtime tables.
  - targeted Vitest suite passed 5 files and 21 tests.
  - Vite production build completed.
  - prerender generated 261 public routes.
- Warnings: none in repository command output.
- Artifact paths:
  - `dist/`

### `npm run audit:profile-reputation-view`

- Exit code: 1
- Result: failed.
- Output summary:
  - target host: `vcixsdudkizgfikhmfuv.supabase.co`
  - target view: `public.profile_reputation_summaries`
  - anon bearer: configured, status 200, ok true, rowCount 1
  - authenticated bearer: generated from configured JWT secret, status 401, ok false
  - service role bearer: configured, status 200, ok true, rowCount 1
  - pass: false
- Error:
  - role `authenticated` returned `PGRST301`, message `No suitable key or wrong key type`, details `None of the keys was able to decode the JWT`.
- Classification candidate:
  - `BLOCKED` for authenticated-role verification in this environment because fixing the configured JWT secret would require secret/owner action outside repository-safe remediation.
- Artifact paths: none produced by repository command.

## Baseline Summary

- Existing tests: passed.
- Existing client-secret scan: passed.
- Existing full security scan: passed.
- Existing SECURITY DEFINER Supabase audit: passed.
- Existing repo-tooling structural check: passed with documented typecheck/lint blockers.
- Existing marketplace freshness structural check: passed.
- Existing viewer release verification: passed.
- Existing profile reputation Supabase audit: partially failed because the locally generated authenticated JWT was rejected by the linked target.

No verified critical/high repository-code defect was established during baseline. One environment-bound Supabase authenticated-role audit remains blocked pending a valid repository-safe authenticated JWT path or owner-provided secret correction.
