# Release Candidate

Candidate date: 2026-05-13
Branch: `main`
Remote: `https://github.com/Archiver-KA/Orina-Protocol-Runtime`
Current HEAD: `2a88a0f847f6524b6226f884c946cb41168aa189`
Status: `NOT_APPROVED_FOR_DEPLOYMENT`

This release candidate package was prepared and verified locally, but it is not approved for production deployment. The working tree contains uncommitted candidate changes, live GitHub branch protection / required-check enforcement is not proven, the previous browser smoke still has an unapproved supplier CDN origin, and the 2026-05-13 deployment-flow review found unresolved Cloudflare/Supabase evidence gaps.

## Candidate Inputs

- Dependency lockfile: `package-lock.json`
- Dependency lockfile SHA-256: `11aa69d5b7305c74697e7242848b8d135dadd0a58a3a995d9c6315332155e65b`
- SBOM: `audit/sbom.cdx.json`
- SBOM SHA-256: `4be5ac1bdaef75d963929f945a836e2e07bd1097f98145b4a76238831049579e`
- Unsigned release manifest: `audit/release-manifest.unsigned.json`
- Unsigned release manifest SHA-256: `e54c84da6096a0b33cec9a8b7de5f7c10601fd6d0a5d21f01ee355b448dd8427`
- Build artifact aggregate SHA-256: `df592fe3789f19d0ee8eeb5142cad348f3d750fd8c4bb6b90d6bcfdd4bfe3246`
- Build artifact count: 376 files

## Deployment Path Evidence

Repository evidence defines the frontend production path as Cloudflare Worker Builds for Worker `apporinaio`, pulling from GitHub branch `main` and serving `https://app.orina.io`. The repository GitHub Actions workflow `Protocol Release Gate` is verification-only and does not deploy.

No repository-hosted production deployment workflow exists. A non-executing draft is stored at `docs/production-deploy-workflow-draft.yml`; it is intentionally outside `.github/workflows/` and exits before deployment.

Deployment-flow analysis is recorded in `audit/deployment-flow-analysis.md`. Its decision is `NOT_APPROVED`.

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

## Unresolved Residual Risks

- `BLOCKED`: candidate changes are uncommitted; `Current HEAD` does not include the full candidate diff.
- `BLOCKED`: live GitHub branch protection / required-check enforcement is not proven; CDP branch settings inspection did not show `main` required checks.
- `BLOCKED`: Cloudflare Worker Builds source/build configuration was not proven from repository files or read-only dashboard text.
- `BLOCKED`: Supabase Security Advisor shows one security error, `RLS Disabled in Public`, requiring owner review or documented acceptance.
- `BLOCKED`: direct unauthenticated GET to the shared Supabase health route returned HTTP 401 with wildcard CORS.
- `BLOCKED`: browser smoke deployment condition is not met because the previous CDP smoke found unapproved `https://s.alicdn.com` media origin and no owner-approved exception is recorded.
- `OWNER_DECISION_REQUIRED`: explicit owner production deployment approval.
- `OWNER_DECISION_REQUIRED`: signed release identity, custody, and enforcement.
- `OWNER_DECISION_REQUIRED`: production deployment attestation format and enforcement.
- `OWNER_DECISION_REQUIRED`: Supabase backend production deployment path is not defined as a repository CI/CD workflow.
- `PARTIAL`: lint governance exists, but no owner-selected linter is enforced.

## Owner Approvals Required

Before production deployment:

1. Review and commit the full candidate diff.
2. Verify branch protection through `npm run verify:github-branch-protection` with a read-only token, or provide owner-run redacted evidence.
3. Approve, proxy, block, or otherwise govern `https://s.alicdn.com` supplier media origin, or explicitly approve the browser-smoke exception.
4. Approve the exact commit SHA to deploy.
5. Confirm the existing CI/CD path that will deploy production.
6. Confirm rollback authority and rollback procedure.

No deployment was triggered from this local pass.
