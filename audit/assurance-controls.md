# Assurance Controls

Audit date: 2026-05-13

Classifications are based only on repository evidence after the assurance hardening pass. No hidden infrastructure, branch protection, signing service, staging environment, or operational owner was assumed.

## Classification Summary

| Control | Classification |
| --- | --- |
| Mandatory type safety | BLOCKED |
| Strict CI enforcement | PARTIAL |
| Reproducible builds | IMPLEMENTED |
| Signed releases | OWNER_DECISION_REQUIRED |
| SBOM | IMPLEMENTED |
| Dependency pinning policy | PARTIAL |
| Fuzzing feasibility | PARTIAL |
| Symbolic execution feasibility | OWNER_DECISION_REQUIRED |
| Property testing feasibility | PARTIAL |
| Formal invariant proof feasibility | OWNER_DECISION_REQUIRED |
| Incident response process | PARTIAL |
| Key rotation procedure | PARTIAL |
| Disaster recovery drills | PARTIAL |
| Multi-environment deployment attestation | OWNER_DECISION_REQUIRED |

## Controls

### Mandatory Type Safety

- Classification: BLOCKED
- Evidence:
  - `package.json` has no `typecheck` script.
  - `package.json` has no direct `typescript` dependency.
  - No `tsconfig.json`, `tsconfig.app.json`, or `tsconfig.node.json` was found.
  - `scripts/verify-repo-tooling.mjs` explicitly reports typecheck status as blocked.
- Affected files:
  - `package.json`
  - `scripts/verify-repo-tooling.mjs`
  - `vite.config.ts`
- Verification command:
  - `npm run verify:repo-tooling`
- Residual risk:
  - Vite can transpile TypeScript without full `tsc --noEmit` checking. Adding mandatory type safety would require a repo-standard TypeScript dependency/config decision.

### Strict CI Enforcement

- Classification: PARTIAL
- Evidence:
  - `.github/workflows/protocol-release-gate.yml` runs `npm ci` and `npm run verify:viewer-release` on pull requests and pushes to `main`.
  - The workflow now also runs `npm run verify:repo-tooling`, `npm run security:scan`, `npm run verify:marketplace-freshness`, `npm run verify:deterministic-build`, and `npm run security:sbom`.
  - The same workflow runs the Supabase SECURITY DEFINER audit only when `SUPABASE_DB_AUDIT_URL` is configured.
  - Connected protocol smoke is manual-only through `workflow_dispatch` and a self-hosted Windows runner.
  - Repository files cannot prove GitHub branch protection or required checks.
- Affected files:
  - `.github/workflows/protocol-release-gate.yml`
  - `package.json`
- Verification command:
  - `Get-Content .github/workflows/protocol-release-gate.yml`
  - `npm run verify:viewer-release`
  - `npm run audit:supabase:security-definer`
- Residual risk:
  - The repository workflow is stricter, but branch protection and CI secret availability cannot be proven from repository files. Supabase audit can be skipped by missing CI secret configuration.

### Reproducible Builds

- Classification: IMPLEMENTED
- Evidence:
  - `package-lock.json` and `npm ci` are present.
  - `npm run build` performs a Vite production build and prerenders public routes.
  - `scripts/verify-deterministic-build.mjs` removes `dist`, runs `npm run build` twice with `SOURCE_DATE_EPOCH=0`, and compares SHA-256 hashes for every generated file.
  - `scripts/prerender-public-routes.mjs` now uses `SOURCE_DATE_EPOCH` for fallback prerender/sitemap `lastmod` values during deterministic builds.
  - `.github/workflows/protocol-release-gate.yml` runs `npm run verify:deterministic-build`.
- Affected files:
  - `package.json`
  - `package-lock.json`
  - `vite.config.ts`
  - `scripts/prerender-public-routes.mjs`
  - `.github/workflows/protocol-release-gate.yml`
- Verification command:
  - `npm ci`
  - `npm run verify:viewer-release`
  - `npm run verify:deterministic-build`
- Residual risk:
  - Deterministic output is machine-checked for the current Node/npm/dependency environment. Cross-platform reproducibility and signed build provenance are not proven.

### Signed Releases

- Classification: OWNER_DECISION_REQUIRED
- Evidence:
  - No repository workflow, script, or documentation was found for release signing, provenance signing, GPG, Sigstore, Cosign, SLSA, or signed artifacts.
  - `docs/runtime-github-supabase-cloudflare-plan.md` documents a GitHub-driven Cloudflare deploy path, not artifact signing.
- Affected files:
  - `.github/workflows/protocol-release-gate.yml`
  - `docs/runtime-github-supabase-cloudflare-plan.md`
- Verification command:
  - `rg -n "cosign|sigstore|slsa|provenance|attestation|signed release|gpg|signing" README.md SECURITY.md docs .github scripts package.json`
- Residual risk:
  - Release consumers cannot verify signed provenance from repository evidence. Choosing signing identity, key custody, and enforcement is an owner decision.

### SBOM

- Classification: IMPLEMENTED
- Evidence:
  - npm dependency metadata and `package-lock.json` are present.
  - `scripts/generate-sbom.mjs` invokes npm's built-in CycloneDX generator.
  - `package.json` exposes `npm run security:sbom`.
  - `npm run security:sbom` generated `audit/sbom.cdx.json`.
  - `.github/workflows/protocol-release-gate.yml` runs `npm run security:sbom`.
- Affected files:
  - `package.json`
  - `package-lock.json`
  - `.github/workflows/protocol-release-gate.yml`
  - `scripts/generate-sbom.mjs`
  - `audit/sbom.cdx.json`
- Verification command:
  - `npm run security:sbom`
  - `rg -n "SBOM|sbom|cyclonedx|spdx" README.md SECURITY.md docs .github scripts package.json`
- Residual risk:
  - SBOM publication, retention, signing, and release attachment policy remain owner decisions.

### Dependency Pinning Policy

- Classification: PARTIAL
- Evidence:
  - `package-lock.json` pins resolved npm dependency versions for `npm ci`.
  - `package.json` has `overrides` for specific vulnerable transitives.
  - `package.json` still contains semver ranges for multiple direct dependencies.
  - No documented dependency update/pinning policy was found beyond verification commands and overrides.
- Affected files:
  - `package.json`
  - `package-lock.json`
  - `SECURITY.md`
- Verification command:
  - `Get-Content package.json`
  - `npm ci`
  - `npm run security:scan`
- Residual risk:
  - Local and CI installs are lockfile-pinned with npm, but policy for direct range changes, override lifecycle, and dependency review ownership is not fully documented.

### Fuzzing Feasibility

- Classification: PARTIAL
- Evidence:
  - Vitest exists and can run deterministic edge-case tests.
  - No fuzzing framework or corpus runner was found.
  - Security-sensitive parsing/validation surfaces exist, including wallet auth sessions, route access policy, order semantics, delivery address normalization, and marketplace pagination helpers.
- Affected files:
  - `package.json`
  - `src/**/*.test.ts`
  - `src/utils/walletAuthSession.ts`
  - `src/app/access/access-policy.ts`
- Verification command:
  - `npm run test`
  - `rg --files -g "*.test.ts" src`
- Residual risk:
  - Lightweight invariant tests are feasible with existing tooling, but coverage is not equivalent to fuzzing.

### Symbolic Execution Feasibility

- Classification: OWNER_DECISION_REQUIRED
- Evidence:
  - No symbolic execution tool, model, or target contract source tree was found in the tracked runtime repository.
  - Runtime code references contract ABIs and Foundry signature snapshots, but the repository does not contain an owned contract source/test harness for symbolic execution.
- Affected files:
  - `src/config/abis.ts`
  - `supabase/audit/reference/foundry/foundry_src_signatures_summary.json`
  - `docs/spec/13-atp-protocol-runtime-spec.md`
- Verification command:
  - `rg -n "symbolic|echidna|hevm|mythril|manticore|foundry|forge" README.md SECURITY.md docs scripts supabase src package.json`
- Residual risk:
  - Symbolic execution may be valuable for contract logic, but the required source ownership, toolchain, and model are not established by this repository.

### Property Testing Feasibility

- Classification: PARTIAL
- Evidence:
  - Vitest exists and current tests already encode behavior examples.
  - No property-testing dependency was found.
  - Candidate invariants can be checked with deterministic table-driven tests/scripts using existing Node/Vitest tooling.
- Affected files:
  - `package.json`
  - `src/utils/*.test.ts`
  - `scripts/security-scan-system.mjs`
  - `scripts/verify-marketplace-browse-freshness.mjs`
- Verification command:
  - `npm run test`
- Residual risk:
  - Existing tests are example/invariant tests, not generated property tests.

### Formal Invariant Proof Feasibility

- Classification: OWNER_DECISION_REQUIRED
- Evidence:
  - No formal specification language, theorem prover, model checker, or machine-checkable proof artifact was found.
  - `docs/spec/13-atp-protocol-runtime-spec.md` is documentation, not a machine-checked formal model.
- Affected files:
  - `docs/spec/13-atp-protocol-runtime-spec.md`
  - `src/utils/orderSemantics.ts`
  - `src/utils/runtimeOrders.ts`
- Verification command:
  - `rg -n "formal|invariant proof|tla|alloy|coq|lean|isabelle|model check|temporal" README.md SECURITY.md docs scripts src package.json`
- Residual risk:
  - Protocol invariants are tested and documented only to the extent repository tests/scripts express them. Formal proof scope and acceptance criteria require owner decision.

### Incident Response Process

- Classification: PARTIAL
- Evidence:
  - `SECURITY.md` defines reporting guidance and explicitly says no dedicated public vulnerability intake address is published.
  - `supabase/migrations/000056_security_audit_log.sql` creates a security audit trail table.
  - No repository incident roles, escalation path, response timeline, triage severity matrix, or post-incident review process was found.
- Affected files:
  - `SECURITY.md`
  - `supabase/migrations/000056_security_audit_log.sql`
- Verification command:
  - `rg -n "incident|vulnerability|report|escalation|severity|post-incident" README.md SECURITY.md docs supabase scripts`
- Residual risk:
  - Reporting and audit-log primitives exist, but operational incident response ownership and procedures are not complete in repository evidence.

### Key Rotation Procedure

- Classification: PARTIAL
- Evidence:
  - `SECURITY.md` documents that service-role keys, JWT secrets, delegate encryption keys, Pinata credentials, and database audit URLs must remain server/CI/operator-only.
  - `docs/runtime-github-supabase-cloudflare-plan.md` documents frontend-incompatible secrets that must not enter Cloudflare frontend builds.
  - No step-by-step rotation procedure was found for Supabase anon/service-role keys, JWT signing secrets, M2M delegate encryption key, Pinata credentials, or Cloudflare build variables.
- Affected files:
  - `SECURITY.md`
  - `docs/runtime-github-supabase-cloudflare-plan.md`
  - `docs/spec/11-ai-m2m-runtime-enablement.md`
  - `docs/spec/12-ai-m2m-supabase-deploy-runtime-checklist.md`
- Verification command:
  - `rg -n "rotate|rotation|key|secret|credential" README.md SECURITY.md docs scripts supabase`
- Residual risk:
  - Secret placement rules are documented, but safe rotation order, rollback, blast radius, and verification responsibilities require owner completion.

### Disaster Recovery Drills

- Classification: PARTIAL
- Evidence:
  - `docs/supabase-migration-drift-reconciliation.md` documents Supabase migration drift recovery.
  - `docs/runtime-canonical-update-runbook.md` documents canonical update and baseline review guidance.
  - Supabase audit SQL contains rollback-wrapped smoke scripts.
  - No dated disaster recovery drill record, restore objective, backup validation, or full recovery exercise artifact was found.
- Affected files:
  - `docs/supabase-migration-drift-reconciliation.md`
  - `docs/runtime-canonical-update-runbook.md`
  - `supabase/audit/*rollback*.sql`
- Verification command:
  - `rg -n "disaster|recovery|restore|rollback|drill|backup" README.md SECURITY.md docs supabase scripts`
- Residual risk:
  - Some recovery procedures exist, but tested disaster recovery cadence and restore evidence are not established.

### Multi-Environment Deployment Attestation

- Classification: OWNER_DECISION_REQUIRED
- Evidence:
  - `docs/runtime-github-supabase-cloudflare-plan.md` documents a production-facing Cloudflare Worker path and Cloudflare-side build variables.
  - `docs/spec/19-supabase-split-function-runbook.md` documents production Edge Function environment variables and deploy order.
  - `supabase/config.toml` defines local development Supabase settings.
  - No machine-readable environment attestation, staging/prod promotion record, Cloudflare build provenance, Supabase deploy provenance, or environment ownership file was found.
- Affected files:
  - `docs/runtime-github-supabase-cloudflare-plan.md`
  - `docs/spec/19-supabase-split-function-runbook.md`
  - `supabase/config.toml`
  - `wrangler.jsonc`
  - `.github/workflows/protocol-release-gate.yml`
- Verification command:
  - `rg -n "attestation|provenance|staging|production|environment|deploy|cloudflare|supabase" README.md SECURITY.md docs .github wrangler.jsonc supabase package.json`
- Residual risk:
  - Environment separation is documented, but deployment attestation and promotion ownership cannot be proven from repository files alone.

## Phase 7 Operational Assurance Review

### Incident Response

- Classification: PARTIAL
- Evidence:
  - `SECURITY.md` provides reporting guidance and warns not to include raw secrets in issue text or logs.
  - `SECURITY.md` explicitly says no dedicated public vulnerability intake address is currently published.
  - `supabase/migrations/000056_security_audit_log.sql` creates a security audit log table.
- Affected files:
  - `SECURITY.md`
  - `supabase/migrations/000056_security_audit_log.sql`
- Verification command:
  - `rg -n "incident|vulnerability|report|escalation|severity|post-incident" README.md SECURITY.md docs supabase scripts`
- Residual risk:
  - No repository evidence defines incident owner, severity taxonomy, response timeline, escalation path, or post-incident review process.

### Key Rotation

- Classification: PARTIAL
- Evidence:
  - `SECURITY.md` identifies which secrets must remain server/Edge/CI/operator-only.
  - `docs/runtime-github-supabase-cloudflare-plan.md` lists frontend-incompatible secrets that must not be placed into Cloudflare frontend builds.
  - `docs/spec/11-ai-m2m-runtime-enablement.md` documents the M2M delegate encryption key requirement.
- Affected files:
  - `SECURITY.md`
  - `docs/runtime-github-supabase-cloudflare-plan.md`
  - `docs/spec/11-ai-m2m-runtime-enablement.md`
  - `docs/spec/12-ai-m2m-supabase-deploy-runtime-checklist.md`
- Verification command:
  - `rg -n "rotate|rotation|key|secret|credential" README.md SECURITY.md docs scripts supabase`
- Residual risk:
  - No repository evidence defines rotation order, dual-key windows, invalidation steps, rollback, or owner approval for Supabase, JWT, Pinata, RapidAPI, Cloudflare, or M2M delegate encryption secrets.

### Rollback

- Classification: PARTIAL
- Evidence:
  - `docs/runtime-github-supabase-cloudflare-plan.md` documents the GitHub-driven Cloudflare deploy path and states local `wrangler deploy` is emergency-only.
  - `docs/supabase-migration-drift-reconciliation.md` warns against blind `npx supabase db push` and documents migration recovery guardrails.
  - Several Supabase audit SQL scripts are transaction-plus-rollback smokes.
- Affected files:
  - `docs/runtime-github-supabase-cloudflare-plan.md`
  - `docs/supabase-migration-drift-reconciliation.md`
  - `supabase/audit/*rollback*.sql`
- Verification command:
  - `rg -n "rollback|revert|emergency|deploy|migration drift" README.md SECURITY.md docs supabase scripts`
- Residual risk:
  - No complete application rollback procedure or tested production rollback record exists in repository evidence.

### Recovery

- Classification: PARTIAL
- Evidence:
  - `docs/supabase-migration-drift-reconciliation.md` documents schema migration drift recovery.
  - `docs/runtime-canonical-update-runbook.md` documents canonical repo/update checks.
  - `scripts/repair:runtime-minted-projections` exists as an npm script for runtime projection repair.
- Affected files:
  - `docs/supabase-migration-drift-reconciliation.md`
  - `docs/runtime-canonical-update-runbook.md`
  - `package.json`
  - `supabase/audit/run_runtime_projection_repair_from_env.cjs`
- Verification command:
  - `rg -n "recovery|repair|restore|backfill|projection" README.md SECURITY.md docs supabase scripts package.json`
- Residual risk:
  - No dated restore drill, backup restore verification, recovery point objective, or recovery time objective is defined in repository evidence.

### Deployment Attestation

- Classification: OWNER_DECISION_REQUIRED
- Evidence:
  - `wrangler.jsonc` identifies the Cloudflare Worker assets target.
  - `.github/workflows/protocol-release-gate.yml` verifies repository checks but does not deploy or attest.
  - `docs/runtime-github-supabase-cloudflare-plan.md` says Cloudflare Worker Builds pulls from GitHub `main`.
  - No signed provenance, deployment manifest, environment attestation, or production promotion artifact is present.
- Affected files:
  - `wrangler.jsonc`
  - `.github/workflows/protocol-release-gate.yml`
  - `docs/runtime-github-supabase-cloudflare-plan.md`
- Verification command:
  - `rg -n "attestation|provenance|slsa|cosign|sigstore|cloudflare|deploy" README.md SECURITY.md docs .github wrangler.jsonc scripts package.json`
- Residual risk:
  - Repository verification cannot prove what Cloudflare or Supabase actually deployed. Attestation format, storage, and enforcement require owner decision.

### Environment Separation

- Classification: PARTIAL
- Evidence:
  - `supabase/config.toml` defines local Supabase ports/settings.
  - `docs/runtime-github-supabase-cloudflare-plan.md` distinguishes Cloudflare build variables and forbids server secrets in frontend builds.
  - `docs/spec/19-supabase-split-function-runbook.md` documents production CORS env variables.
  - `SECURITY.md` documents browser-public versus server-only secret assumptions.
- Affected files:
  - `supabase/config.toml`
  - `docs/runtime-github-supabase-cloudflare-plan.md`
  - `docs/spec/19-supabase-split-function-runbook.md`
  - `SECURITY.md`
- Verification command:
  - `rg -n "environment|production|local|staging|VITE_|secret|Cloudflare" README.md SECURITY.md docs supabase .github package.json`
- Residual risk:
  - Production/staging ownership, isolated project IDs, promotion order, and environment attestations are not machine-checkable from repository files alone.

### Release Provenance

- Classification: OWNER_DECISION_REQUIRED
- Evidence:
  - The release gate verifies builds and audits but does not produce signed provenance.
  - `security:sbom` now generates a local CycloneDX SBOM artifact, but no repository evidence attaches it to releases or signs it.
  - No commit signing or artifact signing policy is documented.
- Affected files:
  - `.github/workflows/protocol-release-gate.yml`
  - `package.json`
  - `scripts/generate-sbom.mjs`
  - `audit/sbom.cdx.json`
- Verification command:
  - `npm run security:sbom`
  - `rg -n "provenance|attestation|signed release|cosign|sigstore|gpg|sbom" README.md SECURITY.md docs .github scripts package.json`
- Residual risk:
  - Build outputs and SBOMs are reproducible/generated locally, but no release provenance chain is established.
