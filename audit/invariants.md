# Invariant Checks

Audit date: 2026-05-13

Phase 6 added lightweight invariant checks using existing Node/npm tooling only. No fuzzing or property-testing dependency was added.

## Command

```powershell
npm run verify:assurance-invariants
```

Result:

- Exit code: 0
- Checks passed: 30
- Checks failed: 0

## Implemented Invariants

### Repository Reproducibility Controls

- Classification: IMPLEMENTED
- Evidence:
  - `package-lock.json` exists.
  - `package.json` exposes `verify:deterministic-build`.
  - `.github/workflows/protocol-release-gate.yml` runs `npm run verify:deterministic-build`.
- Affected files:
  - `package.json`
  - `package-lock.json`
  - `.github/workflows/protocol-release-gate.yml`
  - `scripts/verify-deterministic-build.mjs`
  - `scripts/prerender-public-routes.mjs`
- Verification command:
  - `npm run verify:assurance-invariants`
  - `npm run verify:deterministic-build`
- Residual risk:
  - Determinism is verified for the current Node/npm/dependency environment with `SOURCE_DATE_EPOCH=0`. Cross-platform reproducibility beyond that environment is not proven.

### CI Assurance Gates

- Classification: IMPLEMENTED
- Evidence:
  - Workflow contains `npm run security:scan`.
  - Workflow contains `npm run verify:repo-tooling`.
  - Workflow contains `npm run typecheck`.
  - Workflow contains `npm run lint:check`.
  - Workflow contains `npm run verify:marketplace-freshness`.
  - Workflow contains `npm run verify:deterministic-build`.
  - Workflow contains `npm run security:sbom`.
  - Workflow contains `npm run release:manifest`.
  - Workflow uploads `audit/sbom.cdx.json` and `audit/release-manifest.unsigned.json`.
  - Supabase production deployment workflow is manual-only and production-environment-gated.
  - Connected wallet smoke remains gated by `workflow_dispatch` plus `run_connected_smoke`.
- Affected files:
  - `.github/workflows/protocol-release-gate.yml`
  - `scripts/verify-assurance-invariants.mjs`
- Verification command:
  - `npm run verify:assurance-invariants`
- Residual risk:
  - Repository files still cannot prove GitHub branch protection, required check settings, or CI secret availability.

### Typecheck Baseline

- Classification: IMPLEMENTED
- Evidence:
  - `package.json` exposes `typecheck`.
  - `tsconfig.check.json` exists.
  - The release gate runs `npm run typecheck`.
  - `docs/type-safety-baseline.md` documents the staged non-strict baseline and broad migration blockers.
- Affected files:
  - `package.json`
  - `package-lock.json`
  - `tsconfig.check.json`
  - `.github/workflows/protocol-release-gate.yml`
  - `docs/type-safety-baseline.md`
- Verification command:
  - `npm run typecheck`
  - `npm run verify:assurance-invariants`
- Residual risk:
  - The baseline is intentionally narrow and covers only stable route parsing/building files and tests. Broad frontend typecheck remains a staged migration.

### Lint Governance

- Classification: IMPLEMENTED
- Evidence:
  - Owner selected ESLint.
  - Exact dev-only ESLint dependencies are present.
  - `eslint.config.js` exists.
  - `package.json` exposes `lint:check`.
  - `npm run lint:check` passes.
  - The release gate runs `npm run lint:check`.
  - `docs/lint-governance.md` exists.
- Affected files:
  - `package.json`
  - `package-lock.json`
  - `eslint.config.js`
  - `docs/lint-governance.md`
  - `scripts/verify-repo-tooling.mjs`
  - `.github/workflows/protocol-release-gate.yml`
- Verification command:
  - `npm run lint:check`
  - `npm run verify:repo-tooling`
  - `npm run verify:assurance-invariants`
- Residual risk:
  - The baseline intentionally starts with hazardous-construct rules rather than broad style enforcement.

### SBOM Generation

- Classification: IMPLEMENTED
- Evidence:
  - `package.json` exposes `security:sbom`.
  - `scripts/generate-sbom.mjs` invokes npm's built-in CycloneDX SBOM generator.
  - `npm run security:sbom` generated `audit/sbom.cdx.json`.
- Affected files:
  - `package.json`
  - `scripts/generate-sbom.mjs`
  - `audit/sbom.cdx.json`
- Verification command:
  - `npm run security:sbom`
  - `npm run verify:assurance-invariants`
- Residual risk:
  - SBOM publication, retention, and release attachment policy remain owner decisions.

### Unsigned Release Manifest

- Classification: IMPLEMENTED
- Evidence:
  - `package.json` exposes `release:manifest`.
  - `scripts/generate-release-manifest.mjs` exists.
  - `docs/release-provenance.md` documents unsigned manifest scope and signed-release owner decisions.
  - `npm run release:manifest` generated `audit/release-manifest.unsigned.json`.
  - The release gate uploads the SBOM and unsigned release manifest as an artifact.
- Affected files:
  - `package.json`
  - `.github/workflows/protocol-release-gate.yml`
  - `scripts/generate-release-manifest.mjs`
  - `docs/release-provenance.md`
  - `audit/release-manifest.unsigned.json`
- Verification command:
  - `npm run release:manifest`
  - `npm run verify:assurance-invariants`
- Residual risk:
  - The manifest is unsigned. Signing identity, custody, and enforcement remain owner decisions.

### Supabase Production Deploy Workflow

- Classification: PARTIAL
- Evidence:
  - `.github/workflows/supabase-production-deploy.yml` exists.
  - The workflow is `workflow_dispatch` only.
  - The workflow uses GitHub `environment: production`.
  - The workflow requires exact approved commit SHA and `DEPLOY_SUPABASE_PRODUCTION` confirmation.
  - The workflow runs migration alignment verification, security scans, split-function deploys, and post-deploy CORS/health checks.
- Affected files:
  - `.github/workflows/supabase-production-deploy.yml`
  - `scripts/verify-supabase-migration-list-output.mjs`
  - `package.json`
  - `docs/spec/19-supabase-split-function-runbook.md`
- Verification command:
  - `npm run verify:assurance-invariants`
  - `npm run verify:supabase-migration-list -- <captured migration-list output>`
- Residual risk:
  - GitHub environment protection and required secret names are external repository settings that must be configured by an owner.

### M2M Invite Token Invariants

- Classification: IMPLEMENTED
- Evidence:
  - `supabase/functions/server/ai-m2m-wallet.ts` sets `DELEGATE_INVITE_RANDOM_BYTES = 32`.
  - Invite IDs use `crypto.getRandomValues`.
  - Invite creation retries KV collisions.
  - Accept route rejects non-pending invites and marks successful claims as `claimed`.
  - Invite creation and accept routes call the distributed rate limiter.
- Affected files:
  - `supabase/functions/server/ai-m2m-wallet.ts`
  - `scripts/verify-assurance-invariants.mjs`
  - `scripts/security-scan-system.mjs`
- Verification command:
  - `npm run verify:assurance-invariants`
  - `npm run security:scan`
- Residual risk:
  - The invariant is structural/static. A live race test against the backing KV store was not run.

### Backup Ciphertext Handling Invariants

- Classification: IMPLEMENTED
- Evidence:
  - Managed delegate secret encryption uses AES-GCM.
  - IV length is 12 bytes.
  - No M2M JSON response returns a `privateKey` pattern.
  - `npm run security:scan` also verifies ciphertext record handling, no JSON ciphertext/IV return, no private-key logging pattern, and no decrypt/export endpoint.
- Affected files:
  - `supabase/functions/server/ai-m2m-wallet.ts`
  - `scripts/verify-assurance-invariants.mjs`
  - `scripts/security-scan-system.mjs`
- Verification command:
  - `npm run verify:assurance-invariants`
  - `npm run security:scan`
- Residual risk:
  - KV backups can contain ciphertext; protection still depends on keeping `ATP2_M2M_DELEGATE_ENCRYPTION_KEY` outside backups and logs.

### CORS Invariants

- Classification: IMPLEMENTED
- Evidence:
  - Localhost origins are gated out when `ORINA_CORS_ENV=production`.
  - Broad preview host patterns require `ORINA_CORS_ALLOW_PREVIEW_ORIGINS`.
  - Shared Edge CORS code has no wildcard origin return pattern.
  - Runtime preflight echoed `https://app.orina.io` and omitted `Access-Control-Allow-Origin` for `https://evil.example`.
- Affected files:
  - `supabase/functions/server/edge-app.ts`
  - `scripts/verify-assurance-invariants.mjs`
  - `scripts/security-scan-system.mjs`
  - `audit/browser-smoke.md`
- Verification command:
  - `npm run verify:assurance-invariants`
  - `npm run security:scan`
  - read-only `Invoke-WebRequest` OPTIONS preflight documented in `audit/browser-smoke.md`
- Residual risk:
  - Preview-origin exposure is still an operational owner decision.

### Browser-Origin Smoke Invariant

- Classification: PARTIAL
- Evidence:
  - `scripts/smoke-cdp-readonly-security.mjs` records unexpected origins and fails on unapproved ones.
  - The Phase 4 smoke run blocked on `https://s.alicdn.com`.
- Affected files:
  - `scripts/smoke-cdp-readonly-security.mjs`
  - `audit/browser-smoke.md`
  - `SECURITY.md`
  - `docs/port-9222-runtime-verification.md`
- Verification command:
  - `npm run smoke:cdp:readonly-security`
  - `npm run verify:assurance-invariants`
- Residual risk:
  - Supplier image CDN policy is not defined by repository evidence. The invariant catches the risk, but approving or proxying the origin requires owner decision.

### Marketplace Freshness Invariant

- Classification: IMPLEMENTED
- Evidence:
  - `scripts/verify-marketplace-browse-freshness.mjs` covers asset, collection, and profile browse surfaces.
  - Each surface checks materialized view presence, concurrent/fallback refresh, service-role-only refresh RPC, public page RPC grants, initial refresh, two-minute cron definition, and comments.
- Affected files:
  - `scripts/verify-marketplace-browse-freshness.mjs`
  - `supabase/migrations/000070_marketplace_catalog_browse_index.sql`
  - `supabase/migrations/000071_marketplace_collection_browse_index.sql`
  - `supabase/migrations/000072_marketplace_profile_browse_index.sql`
- Verification command:
  - `npm run verify:marketplace-freshness`
  - `npm run verify:assurance-invariants`
- Residual risk:
  - The repository verifies migration-defined cadence and repair SQL, not live cron execution health unless an operator runs the emitted SQL against the target database.

## Not Added

- Fuzzing framework: not added because no existing fuzz dependency/config exists and the user prohibited non-minimal speculative tooling.
- Symbolic execution: not added because the tracked runtime repository has no owned contract source/model target or symbolic execution tool.
- Formal invariant proof: not added because no machine-checkable formal model exists in repository evidence.
