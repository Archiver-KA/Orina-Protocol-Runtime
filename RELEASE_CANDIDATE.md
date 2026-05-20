# Release Candidate

## 2026-05-20 Server-Side Idempotency Candidate

Target branch: `main`
Target frontend path: GitHub `main` -> Cloudflare Worker Builds -> Worker `apporinaio` -> `https://app.orina.io`
Target backend path: Supabase project `vcixsdudkizgfikhmfuv`; migration `000075` must be applied before Edge Functions that use `edge_idempotency_records` are deployed.

Status: `APPROVED_FOR_CI_CD_DEPLOYMENT` after owner approval and branch-protection verification on 2026-05-20.

This candidate adds server-side idempotent replay for authenticated JSON Edge writes. The Edge middleware claims duplicate delivery by hashed `Authorization` scope plus `Idempotency-Key`, replays completed non-secret responses, returns `425 Retry-After` for in-flight duplicates, and blocks duplicate delivery for one-time secret responses without storing the secret body.

Current local verification status:

- `npm ci`: passed; 584 packages installed, 585 audited; 8 moderate dependency findings remain.
- `npm run test`: passed; 14 test files, 46 tests.
- `npm run typecheck`: passed.
- `npm run lint:check`: passed.
- `npm run security:check-client-secrets`: passed.
- `npm run security:scan`: passed; 8 moderate dependency findings remain.
- `npm run audit:supabase:data-api-grants`: passed; 67 public tables and 67 explicit Data API grant decisions.
- `npm run audit:supabase:security-definer`: passed against linked project; 24 audited functions; findings `[]`.
- `deno check --node-modules-dir=auto supabase/functions/server/idempotency-replay.ts`: passed.
- `deno check --node-modules-dir=auto supabase/functions/orina-ai-m2m-v2/index.ts`: passed.
- `deno check --node-modules-dir=auto supabase/functions/make-server-b0d68fc8/index.ts`: passed.
- `npm run verify:repo-tooling`: passed.
- `npm run verify:marketplace-freshness`: passed.
- `npm run verify:assurance-invariants`: passed.
- `npm run verify:viewer-release`: passed; build completed and prerender generated 261 public routes.
- `npm run verify:deterministic-build`: passed; 376 files compared; differences `[]`.
- `npm run security:sbom`: passed; generated `audit/sbom.cdx.json`.
- `npm run release:manifest`: passed; generated `audit/release-manifest.unsigned.json`.
- `npx supabase migration list --linked`: remote is aligned through `000074`; local `000075` is pending.
- `npm run verify:github-branch-protection`: blocked because `GITHUB_BRANCH_PROTECTION_TOKEN` is not present.
- `node scripts/smoke-cdp-readonly-security.mjs --goto http://127.0.0.1:5191/`: passed on a clean local origin after a transient marketplace warmup rerun.

Deployment status:

- Code candidate commit: `8ae79d39f6bca1f15add7634ad4d181e84e3426b`.
- Branch protection verifier passed: `main` requires `Viewer Release Gate`.
- Supabase production remote still needs migration `000075` before Edge Function deployment.
- Release artifacts remain unsigned by design until owner selects signing authority.
- Approved deployment order: push `main`, apply migration `000075`, dispatch Supabase Production Deploy for the exact approved commit, verify production.

Deployment approval contract: `audit/deployment-approval-contract.json`

## 2026-05-14 Management Governance Candidate

Branch before promotion: `codex/management-governance-eslint`
Target branch: `main`
Target frontend path: GitHub `main` -> Cloudflare Worker Builds -> Worker `apporinaio` -> `https://app.orina.io`
Target backend path: Supabase project `vcixsdudkizgfikhmfuv`; no backend source change is present in this candidate.

This candidate adds the remaining management-governance controls selected by the owner: typecheck baseline, minimal ESLint governance, branch-protection verifier, unsigned release provenance artifacts, a manual environment-gated Supabase production deployment workflow, operational governance docs, and bounded CDP smoke timeouts.

Current local verification status before promotion:

- `npm ci`: passed.
- `npm run test`: passed; 13 test files, 40 tests.
- `npm run typecheck`: passed.
- `npm run lint:check`: passed.
- `npm run security:check-client-secrets`: passed.
- `npm run security:scan`: passed; aggregate `deps:ok | messaging:ok | ipfs:ok | ratelimit:ok | m2m:ok | cors:ok`.
- `npm run audit:supabase:security-definer`: passed; 24 audited functions; findings `[]`.
- `npm run verify:repo-tooling`: passed.
- `npm run verify:marketplace-freshness`: passed.
- `npm run verify:assurance-invariants`: passed; 30 checks.
- `npm run verify:viewer-release`: passed; build completed and prerender generated 261 public routes.
- `npm run verify:deterministic-build`: passed; 376 files compared; differences `[]`.
- `npm run security:sbom`: passed; generated `audit/sbom.cdx.json`.
- `npm run release:manifest`: passed; generated `audit/release-manifest.unsigned.json`.
- `npx supabase migration list --linked | npm run verify:supabase-migration-list`: passed; local and remote migrations aligned through `000073`.
- `npm run verify:github-branch-protection`: blocked because `GITHUB_BRANCH_PROTECTION_TOKEN` is not present.
- CDP browser smoke: blocked because page targets timed out on Page/Runtime commands; `json/version` and `json/list` remained readable and showed GitHub, Cloudflare, Supabase, and production app tabs.
- Supplemental local HTTP smoke: `/`, `/marketplace`, and `/settings` returned HTTP 200 from `http://127.0.0.1:5173`.
- Supplemental Supabase CORS preflight: allowed `https://app.orina.io`; denied `https://evil.example`.

Owner-authorized production continuation in this session allows promotion despite the CDP Page/Runtime blocker. This does not close the branch-protection verification blocker or the unsigned-release owner decision.

Candidate date: 2026-05-13
Branch: `main`
Remote: `https://github.com/Archiver-KA/Orina-Protocol-Runtime`
Current HEAD before final evidence update: `9bd8bf790c5051354c151496840bfc8b17e9a6b7`
Status: `DEPLOYMENT_EXECUTED_WITH_OWNER_AUTHORITY`

This release candidate package was prepared, verified locally, committed to `main`, deployed to Supabase through the documented split-function order, and pushed to GitHub `main` so Cloudflare Worker Builds could deploy the frontend production Worker. The deployment proceeded under the owner authorization provided in the 2026-05-13 request.

The final evidence-update commit records the deployment result and smoke-origin governance updates. That commit changes verification/docs artifacts only; the production runtime candidate deployed before this evidence update was `9bd8bf790c5051354c151496840bfc8b17e9a6b7`.

## Candidate Inputs

- Dependency lockfile: `package-lock.json`
- Dependency lockfile SHA-256: `11aa69d5b7305c74697e7242848b8d135dadd0a58a3a995d9c6315332155e65b`
- SBOM: `audit/sbom.cdx.json`
- SBOM SHA-256: `cf5abffeab8aabf05462b6de2716e0f88f2bd24bc4e6b920037d5fc47eb5e409`
- Unsigned release manifest: `audit/release-manifest.unsigned.json`
- Unsigned release manifest SHA-256: `e19c31c74fc2c1510280429b55edd3d677962c989158b5ba9426afce90a779df`
- Build artifact aggregate SHA-256: `038b66203c78eda02af1150c2c88b9e6fcaacfadc8e005e6daf6d6e79aa05ef9`
- Build artifact count: 376 files

## Deployment Path Evidence

Repository evidence defines the frontend production path as Cloudflare Worker Builds for Worker `apporinaio`, pulling from GitHub branch `main` and serving `https://app.orina.io`. The repository GitHub Actions workflow `Protocol Release Gate` is verification-only and does not deploy.

No repository-hosted production deployment workflow exists. A non-executing draft is stored at `docs/production-deploy-workflow-draft.yml`; it is intentionally outside `.github/workflows/` and exits before deployment.

Deployment-flow analysis is recorded in `audit/deployment-flow-analysis.md`. Its latest execution addendum records owner-authorized deployment and residual branch-protection/provenance decisions.

## Commands Run

- `npm ci`
- `npm run test`
- `npm run typecheck`
- `npm run security:check-client-secrets`
- `npm run security:scan`
- `npm run audit:supabase:security-definer`
- `npm run verify:repo-tooling`
- `npm run verify:marketplace-freshness`
- `npm run verify:assurance-invariants`
- `npm run verify:viewer-release`
- `npm run verify:deterministic-build`
- `npm run security:sbom`
- `npm run release:manifest`
- `npx supabase migration list --linked`
- `npx supabase functions deploy <split function> --project-ref vcixsdudkizgfikhmfuv`
- `git push origin main`
- `npm run smoke:cdp:readonly-security -- --goto https://app.orina.io/ --timeout-ms 30000`

`npm run lint:check` was not run because no lint command was added; lint governance remains documented as partial until an owner selects a linter and baseline. `npm run verify:github-branch-protection` was not run because no `GITHUB_BRANCH_PROTECTION_TOKEN` or `GITHUB_TOKEN` was present.

## Verification Results

- `npm ci`: passed; 504 packages installed, 505 audited, 0 vulnerabilities; deprecated transitive `@paulmillr/qr@0.2.1` warning remains.
- `npm run test`: passed; 13 test files, 40 tests.
- `npm run typecheck`: passed.
- `npm run security:check-client-secrets`: passed; no forbidden privileged-secret patterns in 279 files.
- `npm run security:scan`: passed; aggregate `deps:ok | messaging:ok | ipfs:ok | ratelimit:ok | m2m:ok | cors:ok`.
- `npm run audit:supabase:security-definer`: passed; 24 audited functions; findings `[]`; `pass: true`.
- `npm run verify:repo-tooling`: passed; typecheck available, lint partial.
- `npm run verify:marketplace-freshness`: passed for asset, collection, and profile browse surfaces.
- `npm run verify:assurance-invariants`: passed; 27 checks.
- `npm run verify:viewer-release`: passed; viewer guard 23 files, protocol runtime surface 4 tables, targeted Vitest 5 files/21 tests, Vite build completed, prerender generated 261 public routes.
- `npm run verify:deterministic-build`: passed; two builds with `SOURCE_DATE_EPOCH=0`, 376 files compared, differences `[]`.
- `npm run security:sbom`: passed; CycloneDX 1.5, 497 components, 498 dependencies.
- `npm run release:manifest`: passed; unsigned manifest generated with 376 artifacts.
- Supabase migrations: local and remote migration history aligned through `000073`.
- Supabase backend deploy: passed for `orina-auth-bridge-v1`, `orina-ai-m2m-v2`, `orina-seller-minting-v1`, `orina-receipt-sync-v1`, `make-server-b0d68fc8`, `orina-chat-v1`, and `orina-order-autotime-v1`.
- Frontend push: `git push origin main` advanced `origin/main` to `9bd8bf790c5051354c151496840bfc8b17e9a6b7`.
- GitHub release gate: CDP read-only evidence showed `Protocol Release Gate` run `25797419606` completed successfully for `9bd8bf7` on `main`.
- Cloudflare Worker Builds: CDP read-only evidence showed Worker `apporinaio` production deployments for branch `main`, including the pushed release candidate.
- Production frontend checks: `https://app.orina.io/`, `/marketplace`, and `/settings` returned HTTP 200 through Cloudflare.
- Production browser smoke: passed after documenting approved production browser origins for Cloudflare Analytics and supplier media; no wallet confirmations, secret leaks, console security errors, wildcard function CORS observations, or unapproved origins were observed.

## Unresolved Residual Risks

- `PARTIAL`: live GitHub branch protection / required-check enforcement is not configured by visible ruleset evidence; deployment proceeded under explicit owner authority.
- `PARTIAL`: Cloudflare Worker Builds source/build configuration is verified by redacted dashboard deployment evidence, but repository-controlled branch protection remains absent.
- `VERIFIED_NON_ISSUE`: Supabase Security Advisor `RLS Disabled in Public` was narrowed by linked metadata query to `public.spatial_ref_sys`, the PostGIS reference table, with no application table found disabled.
- `VERIFIED_NON_ISSUE`: authenticated health GET and preflight CORS checks matched documented production behavior after backend redeploy; unauthenticated platform 401 wildcard CORS remains outside application handler evidence.
- `IMPLEMENTED`: browser smoke passed with explicit production allowlist entries for `https://s.alicdn.com` supplier media and `https://static.cloudflareinsights.com` Cloudflare Analytics.
- `IMPLEMENTED`: explicit owner production deployment approval was provided in the 2026-05-13 request.
- `OWNER_DECISION_REQUIRED`: signed release identity, custody, and enforcement.
- `OWNER_DECISION_REQUIRED`: production deployment attestation format and enforcement.
- `PARTIAL`: Supabase backend deployment path was owner-approved through Supabase CLI split-function deploy order, but no repository CI/CD backend deploy workflow exists.
- `PARTIAL`: lint governance exists, but no owner-selected linter is enforced.

## Owner Approvals Required

For the next production deployment:

1. Review and commit the full candidate diff.
2. Verify branch protection through `npm run verify:github-branch-protection` with a read-only token, or provide owner-run redacted evidence.
3. Approve, proxy, block, or otherwise govern `https://s.alicdn.com` supplier media origin, or explicitly approve the browser-smoke exception.
4. Preserve the exact commit SHA in the deployment approval record.
5. Confirm the existing CI/CD path that will deploy production.
6. Confirm rollback authority and rollback procedure.

Deployment was triggered for this candidate by pushing `main` to GitHub after owner approval; Cloudflare performed frontend deployment from GitHub, and Supabase functions were deployed through the documented owner-approved split-function path.
