# Permission Resolution Matrix

Audit date: 2026-05-13

Scope: this matrix covers every remaining `BLOCKED`, `OWNER_DECISION_REQUIRED`, and `PARTIAL` item recorded in `AUDIT_REPORT.md` and `audit/*.md` after the assurance pass. It does not request immediate elevated access. It identifies the least-privilege path needed to close each item.

No secrets, seed phrases, private keys, wallet passwords, recovery phrases, signing authority, deployment authority, production data mutation, or infrastructure mutation were used to produce this matrix.

## Permission Minimization Summary

Lower-risk alternatives attempted or identified before escalation:

- Static repository validation was used before any runtime or production access.
- JWT/auth blocker analysis was limited to token-generation code shape and previous redacted command output. No JWT secret or bearer token value was printed.
- CDN origin analysis was limited to repository paths, CDP smoke origin output, and static code search. No production media policy was inferred.
- Type safety feasibility used package metadata, local lockfile metadata, and source-pattern counts. No TypeScript dependency was installed.
- GitHub, Cloudflare, Supabase, signing, and deployment authority were not used. Where those systems are needed, the lower-risk path is owner-provided read-only evidence or owner-run commands with redacted output.

## Remaining Items

### 1. Authenticated profile reputation audit

- Current classification: `BLOCKED`
- Exact blocker: `npm run audit:profile-reputation-view` can read as anon and service role, but the generated authenticated JWT is rejected by the target Supabase REST API with `PGRST301` and message `No suitable key or wrong key type`.
- Why current evidence is insufficient: repository code proves the script creates an HS256 JWT with Supabase-style `aud`, `iss`, `role`, `sub`, `iat`, and `exp` claims, but repository files cannot prove that the local JWT signing secret matches the target project or that the target project accepts HS256-generated local tokens.
- Repository-only resolution possible: no.
- Exact missing authority: permission to validate authenticated access against the target Supabase project using a valid authenticated bearer, or permission for the owner to run the audit and provide redacted output.
- Exact missing credential/config/environment: one of:
  - short-lived `SUPABASE_AUTHENTICATED_JWT` issued by the target project for a non-privileged authenticated user,
  - matching target-project `SUPABASE_JWT_SECRET` or `ATP2_SUPABASE_JWT_SECRET`,
  - or owner-run `npm run audit:profile-reputation-view:auth-user` with service-role credentials and redacted output.
- Exact risk if unresolved: authenticated-role access to `public.profile_reputation_summaries` remains unverified in the target environment.
- Exact risk if elevated access is granted: a bearer JWT or JWT secret could be exposed if mishandled; service-role fallback can create and delete Auth users and therefore crosses a production auth write boundary.
- Minimum viable permission needed: preferred path is `NETWORK_READ` plus a short-lived non-privileged authenticated JWT supplied only through environment variable or owner-run command. If Codex must execute with the token, this also becomes `SECRET_ACCESS`.
- Read-only access sufficient: yes, if a valid authenticated bearer already exists.
- Local-only validation sufficient: no. Local token-shape validation is complete, but the blocker is target-project acceptance.

### 2. Supplier CDN origin `https://s.alicdn.com`

- Current classification: `OWNER_DECISION_REQUIRED` and browser smoke `PARTIAL`
- Exact blocker: CDP smoke saw `https://s.alicdn.com` as an unapproved browser origin.
- Why current evidence is insufficient: repository code shows Alibaba DataHub results can map supplier image URLs into `imageUrl`, and UI components render external image URLs, but repository policy does not approve, proxy, or block this CDN.
- Repository-only resolution possible: no, not without changing product media behavior or inventing a browser-origin policy.
- Exact missing authority: owner decision for supplier media origin governance.
- Exact missing credential/config/environment: none for decision capture; no secret is required.
- Exact risk if unresolved: browser clients may request supplier-hosted media that is outside the documented origin allowlist, creating privacy, tracking, availability, and content governance ambiguity.
- Exact risk if elevated access is granted: allowing Codex to change policy without owner decision could break marketplace media, silently approve third-party tracking, or introduce proxy cost/availability obligations.
- Minimum viable permission needed: `LOCAL_WRITE` only after owner chooses one of approve, proxy, block, or sanitize. Until then, read-only analysis is sufficient.
- Read-only access sufficient: yes for analysis; no for closure.
- Local-only validation sufficient: yes after owner selects a policy and repository code/docs/tests are updated.

### 3. Mandatory type safety

- Current classification: `BLOCKED`
- Exact blocker: no `typecheck` script, no direct `typescript` dependency, and no `tsconfig*.json`.
- Why current evidence is insufficient: Vite transpiles TypeScript but does not provide repository-wide `tsc --noEmit` type checking. The lockfile contains no `node_modules/typescript`, no `node_modules/.bin/tsc.cmd`, and no `@types/node`; only transitive React types were observed.
- Repository-only resolution possible: partial. A staged plan can be written locally, but adding a real typecheck requires owner approval for dev-only tooling and TypeScript config.
- Exact missing authority: owner approval to add dev-only TypeScript tooling/configuration and lockfile changes.
- Exact missing credential/config/environment: npm registry access or an approved offline package cache; no production credential.
- Exact risk if unresolved: type-level regressions can pass tests/build because Vite/esbuild transpilation is not full type checking.
- Exact risk if elevated access is granted: a broad or strict tsconfig could produce high error volume, force unrelated code churn, or alter build assumptions.
- Minimum viable permission needed: `LOCAL_WRITE` plus `NETWORK_READ` for dev-only package installation, or owner-provided package cache. No production dependency is needed.
- Read-only access sufficient: no for closure.
- Local-only validation sufficient: no if TypeScript is not available locally; yes after dev-only tooling is approved and installed.

Feasibility evidence:

- TS/TSX files under `src`, `supabase`, and `scripts`: 307
- TSX files under `src`: 142
- `@ts-ignore`, `@ts-expect-error`, `ts-nocheck`: 0 observed
- explicit `any` / `as any` style matches: 161
- `Deno.env` matches: 81
- `process.env` matches: 65
- `import.meta.env` matches: 2

Safest staged rollout:

1. Add dev-only TypeScript and React/Node type packages with exact versions.
2. Add a permissive `tsconfig.check.json` with `noEmit`, `skipLibCheck`, `strict: false`, browser + Node + Deno-compatible scope decisions documented.
3. Run `tsc -p tsconfig.check.json --noEmit` and record error volume.
4. Gate CI only after the first check passes or after a documented staged baseline is approved.

### 4. Lint command

- Current classification: `BLOCKED`
- Exact blocker: no `lint` script, no ESLint/Biome/Oxlint dependency, and no linter configuration.
- Why current evidence is insufficient: adding lint would introduce a new lint stack and policy rather than enabling an existing repository standard.
- Repository-only resolution possible: no, unless the owner selects a linter and rule baseline.
- Exact missing authority: owner decision selecting lint tool, rule severity, generated-file scope, and CI enforcement timing.
- Exact missing credential/config/environment: npm registry access or approved offline package cache if a dev-only linter is added.
- Exact risk if unresolved: style, unused code, and some bug classes remain covered only by tests and existing security scripts.
- Exact risk if elevated access is granted: an unapproved lint stack can generate large unrelated churn or suppressions, or create CI noise unrelated to verified defects.
- Minimum viable permission needed: owner decision first; then `LOCAL_WRITE` plus optional `NETWORK_READ` for dev-only lint tooling.
- Read-only access sufficient: yes for deciding the tool; no for closure.
- Local-only validation sufficient: yes after tooling exists locally.

### 5. Strict CI enforcement

- Current classification: `PARTIAL`
- Exact blocker: repository workflow is stricter, but repository files cannot prove branch protection, required checks, or CI secret availability.
- Why current evidence is insufficient: GitHub branch protection and required-check settings live outside the repository tree.
- Repository-only resolution possible: no.
- Exact missing authority: read-only GitHub repository administration metadata, or owner-provided branch protection and required-check export.
- Exact missing credential/config/environment: GitHub token with read access to branch protection and Actions secret names, not secret values.
- Exact risk if unresolved: checks can exist but not be required before merge/push, and secret-dependent audits can be silently skipped.
- Exact risk if elevated access is granted: repository administration metadata can expose security posture; write-scoped tokens could mutate branch protection if overbroad.
- Minimum viable permission needed: `NETWORK_READ` to GitHub protection and Actions metadata, or owner-provided redacted export.
- Read-only access sufficient: yes.
- Local-only validation sufficient: no.

### 6. Signed releases and release provenance

- Current classification: `OWNER_DECISION_REQUIRED`
- Exact blocker: no release signing, provenance signing, GPG, Sigstore, Cosign, SLSA, or signed artifact policy exists in repository evidence.
- Why current evidence is insufficient: deterministic builds and SBOM generation exist, but signing identity, custody, issuance, storage, and enforcement are not defined.
- Repository-only resolution possible: no.
- Exact missing authority: owner decision for signing model and provenance format.
- Exact missing credential/config/environment: signing identity or CI signing integration if implemented; no signing secret should be given to Codex by default.
- Exact risk if unresolved: consumers cannot verify signed build provenance or signed release artifacts from repository evidence.
- Exact risk if elevated access is granted: signing authority can create trusted artifacts and must not be exposed to an agent workspace without explicit owner controls.
- Minimum viable permission needed: owner policy decision first. Implementation may later require `NETWORK_WRITE`, `SECRET_ACCESS`, or `SIGNING_AUTHORITY`, but those should be held by CI or the owner rather than Codex.
- Read-only access sufficient: yes for policy review; no for closure.
- Local-only validation sufficient: no for release signing, yes for pre-signing artifact generation.

### 7. Dependency pinning policy

- Current classification: `PARTIAL`
- Exact blocker: `package-lock.json` pins npm installs, but direct dependency ranges and override lifecycle policy are not fully documented.
- Why current evidence is insufficient: repository files do not define who approves dependency range changes, override removal, update cadence, or review criteria.
- Repository-only resolution possible: no, because ownership policy cannot be inferred.
- Exact missing authority: owner decision for dependency update and override lifecycle policy.
- Exact missing credential/config/environment: none for documenting the decision.
- Exact risk if unresolved: dependency updates can be inconsistent, and overrides may persist or be removed without a documented review standard.
- Exact risk if elevated access is granted: automated dependency changes could modify lockfiles without owner policy and introduce behavior changes.
- Minimum viable permission needed: `LOCAL_WRITE` after owner supplies the dependency policy.
- Read-only access sufficient: yes for analysis; no for closure.
- Local-only validation sufficient: yes after policy text is added.

### 8. Fuzzing feasibility

- Current classification: `PARTIAL`
- Exact blocker: Vitest exists and deterministic invariants exist, but no fuzzing framework or corpus runner exists.
- Why current evidence is insufficient: repository code identifies fuzzable surfaces, but fuzzing scope, runtime budget, corpus retention, and acceptance criteria are not defined.
- Repository-only resolution possible: no for a full fuzzing program; partial local invariant expansion is possible.
- Exact missing authority: owner decision for fuzzing scope and whether dev-only fuzz tooling may be added.
- Exact missing credential/config/environment: npm registry access or approved offline cache if a fuzz dependency is added.
- Exact risk if unresolved: parser and validation edge cases may remain covered only by example tests and structural scans.
- Exact risk if elevated access is granted: broad fuzzing can introduce slow CI, flaky tests, and toolchain churn.
- Minimum viable permission needed: `LOCAL_WRITE` for additional deterministic edge-case tests; `NETWORK_READ` only if owner approves a dev-only fuzz dependency.
- Read-only access sufficient: yes for planning; no for closure.
- Local-only validation sufficient: yes for lightweight invariant tests; no for external fuzz tooling installation.

### 9. Symbolic execution feasibility

- Current classification: `OWNER_DECISION_REQUIRED`
- Exact blocker: no owned contract source tree, symbolic execution target, or symbolic execution tool exists in the runtime repository.
- Why current evidence is insufficient: repository has ABIs and Foundry signature references, but not a source/model harness.
- Repository-only resolution possible: no.
- Exact missing authority: owner decision identifying owned contract source, target invariants, and accepted symbolic execution tool.
- Exact missing credential/config/environment: contract source or model repository if it is outside this workspace; no production credential.
- Exact risk if unresolved: contract-level path properties remain outside this repository's assurance evidence.
- Exact risk if elevated access is granted: importing external contract/tooling without ownership proof can create false assurance or license/scope ambiguity.
- Minimum viable permission needed: `READ_ONLY` access to owner-approved contract source/model first; later `LOCAL_WRITE` for harness.
- Read-only access sufficient: yes for feasibility scoping; no for closure.
- Local-only validation sufficient: yes only if owner supplies source/model locally.

### 10. Property testing

- Current classification: `PARTIAL`
- Exact blocker: existing checks are deterministic invariant checks, not generated property tests.
- Why current evidence is insufficient: no property-testing dependency exists and no owner-approved generated-test budget or seed policy exists.
- Repository-only resolution possible: partial. More table-driven invariants can be added locally, but true property testing requires tooling and scope.
- Exact missing authority: owner decision for whether to add dev-only property-testing tooling and CI runtime budget.
- Exact missing credential/config/environment: npm registry access or approved offline cache if a property-testing dependency is added.
- Exact risk if unresolved: invariant coverage remains manually selected.
- Exact risk if elevated access is granted: generated property tests can be flaky or expensive if not bounded.
- Minimum viable permission needed: `LOCAL_WRITE` for more deterministic tests; `NETWORK_READ` only for approved dev-only property tooling.
- Read-only access sufficient: yes for planning; no for closure.
- Local-only validation sufficient: yes for deterministic invariants.

### 11. Formal invariant proof

- Current classification: `OWNER_DECISION_REQUIRED`
- Exact blocker: no theorem prover, model checker, formal spec, or machine-checkable proof artifact exists.
- Why current evidence is insufficient: documentation describes protocol behavior but is not a machine-checked model.
- Repository-only resolution possible: no.
- Exact missing authority: owner decision for formal scope, model language, proof acceptance criteria, and source of truth.
- Exact missing credential/config/environment: none for a scope decision; toolchain may require dev-only installation later.
- Exact risk if unresolved: claims remain test-backed/documentation-backed, not formally proven.
- Exact risk if elevated access is granted: a poorly scoped model can create unverifiable or misleading assurance.
- Minimum viable permission needed: `READ_ONLY` owner-approved formalization brief first; later `LOCAL_WRITE` and possibly `NETWORK_READ` for tooling.
- Read-only access sufficient: yes for scoping; no for closure.
- Local-only validation sufficient: no until a formal model exists.

### 12. Incident response process

- Current classification: `PARTIAL`
- Exact blocker: `SECURITY.md` provides reporting guidance, but no incident owner, severity taxonomy, escalation path, response timeline, or post-incident process exists in repository evidence.
- Why current evidence is insufficient: operational roles and commitments are owner facts outside code.
- Repository-only resolution possible: no, unless owner supplies the process.
- Exact missing authority: owner-provided incident response policy.
- Exact missing credential/config/environment: none.
- Exact risk if unresolved: security reports may be handled inconsistently and without documented escalation or accountability.
- Exact risk if elevated access is granted: inventing incident roles or timelines could create false operational guarantees.
- Minimum viable permission needed: `LOCAL_WRITE` after owner supplies policy facts.
- Read-only access sufficient: yes for analysis; no for closure.
- Local-only validation sufficient: yes after policy is documented.

### 13. Key rotation procedure

- Current classification: `PARTIAL`
- Exact blocker: secret placement rules exist, but no rotation order, dual-key window, invalidation steps, rollback, or owner approval procedure exists for Supabase, JWT, Pinata, RapidAPI, Cloudflare, or M2M delegate encryption secrets.
- Why current evidence is insufficient: key custody, rotation authority, and operational blast radius are not stored in repository files.
- Repository-only resolution possible: no, unless owner supplies the procedure.
- Exact missing authority: owner-approved rotation procedure and credential ownership map.
- Exact missing credential/config/environment: no secret values are needed to document the procedure; only secret names, owners, and rotation order.
- Exact risk if unresolved: emergency rotation may be slow, unsafe, or incomplete.
- Exact risk if elevated access is granted: exposing or rotating secrets from the workspace can break production and leak credentials.
- Minimum viable permission needed: `LOCAL_WRITE` for documentation after owner supplies facts. Actual rotation would require separate `SECRET_ACCESS` and likely `NETWORK_WRITE`, but is not requested here.
- Read-only access sufficient: yes for analysis; no for closure.
- Local-only validation sufficient: yes for documenting a procedure; no for proving live rotation.

### 14. Disaster recovery drills

- Current classification: `PARTIAL`
- Exact blocker: migration drift recovery and repair scripts exist, but no dated restore drill, backup validation, RPO, or RTO evidence exists.
- Why current evidence is insufficient: drill execution records and restore targets are operational facts.
- Repository-only resolution possible: no.
- Exact missing authority: owner-provided DR drill evidence or approval to create a non-production drill plan.
- Exact missing credential/config/environment: non-production restore environment details if a drill is to be run; no production mutation for this pass.
- Exact risk if unresolved: backups and recovery procedures may be untested.
- Exact risk if elevated access is granted: production restore or backup access can expose data or mutate systems if not isolated.
- Minimum viable permission needed: `LOCAL_WRITE` for a drill runbook after owner supplies scope; `NETWORK_READ` only for reading owner-provided non-production evidence.
- Read-only access sufficient: yes for evidence review; no for running a drill.
- Local-only validation sufficient: yes for runbook drafting; no for proving restore capability.

### 15. Rollback procedure

- Current classification: `PARTIAL`
- Exact blocker: docs identify GitHub-driven Cloudflare deploy and migration drift guardrails, but no complete application rollback procedure or tested production rollback record exists.
- Why current evidence is insufficient: rollback authority, target versions, Cloudflare/Supabase restore controls, and production records are outside repository files.
- Repository-only resolution possible: no, unless owner supplies rollback policy and evidence.
- Exact missing authority: owner-approved rollback procedure and deployment owner evidence.
- Exact missing credential/config/environment: deployment history export or owner-provided rollback record; no deployment authority needed for documentation.
- Exact risk if unresolved: failed deploy recovery may depend on undocumented operator knowledge.
- Exact risk if elevated access is granted: deployment write access could trigger unintended rollback/deploy.
- Minimum viable permission needed: `LOCAL_WRITE` after owner supplies rollback facts; `NETWORK_READ` if reading deployment history directly.
- Read-only access sufficient: yes for evidence review; no for live rollback testing.
- Local-only validation sufficient: yes for documenting procedure; no for proving live rollback.

### 16. Recovery procedure

- Current classification: `PARTIAL`
- Exact blocker: some schema and projection repair docs/scripts exist, but no dated restore drill, backup restore verification, RPO, or RTO exists.
- Why current evidence is insufficient: live backup storage and recovery evidence are outside repository files.
- Repository-only resolution possible: no.
- Exact missing authority: owner-provided recovery objectives and restore evidence.
- Exact missing credential/config/environment: non-production backup/restore evidence, or owner-run restore results.
- Exact risk if unresolved: recovery capability remains unproven beyond scripts and runbooks.
- Exact risk if elevated access is granted: backup access can expose sensitive production data.
- Minimum viable permission needed: `READ_ONLY` owner-provided redacted recovery evidence; `LOCAL_WRITE` to document it.
- Read-only access sufficient: yes for evidence review.
- Local-only validation sufficient: no for restore proof.

### 17. Environment separation

- Current classification: `PARTIAL`
- Exact blocker: docs distinguish local/frontend/server-only settings, but production/staging ownership, isolated project IDs, promotion order, and environment attestations are not machine-checkable.
- Why current evidence is insufficient: Cloudflare and Supabase environment topology lives outside repository files.
- Repository-only resolution possible: no.
- Exact missing authority: owner-provided environment map or read-only access to environment metadata.
- Exact missing credential/config/environment: redacted Cloudflare Worker build variable names, Supabase project refs, GitHub secret names, and staging/prod mapping. Values are not required.
- Exact risk if unresolved: staging and production can drift or share credentials without repository-visible evidence.
- Exact risk if elevated access is granted: overbroad environment access can expose secrets or allow deployments.
- Minimum viable permission needed: `NETWORK_READ` to environment metadata, or owner-provided redacted export.
- Read-only access sufficient: yes.
- Local-only validation sufficient: no.

### 18. Multi-environment deployment attestation

- Current classification: `OWNER_DECISION_REQUIRED`
- Exact blocker: no machine-readable deployment attestation, promotion record, Cloudflare build provenance, Supabase deploy provenance, or environment ownership file exists.
- Why current evidence is insufficient: repository can verify source and build output, but not what Cloudflare or Supabase actually deployed.
- Repository-only resolution possible: no.
- Exact missing authority: owner decision for attestation format, storage location, required fields, and enforcement point.
- Exact missing credential/config/environment: deployment metadata export if validating live deployments; no write credential required for read-only attestation review.
- Exact risk if unresolved: repository verification cannot prove production runtime matches the audited commit/artifacts.
- Exact risk if elevated access is granted: deployment authority could mutate production; API tokens can expose environment metadata or secrets if over-scoped.
- Minimum viable permission needed: `READ_ONLY` owner-provided attestation format first; later `NETWORK_READ` to verify deployment metadata.
- Read-only access sufficient: yes for validation if metadata is available.
- Local-only validation sufficient: no for live deployment attestation.

### 19. CORS preview-origin ownership

- Current classification: `PARTIAL` residual
- Exact blocker: broad preview/deployment host patterns are gated by `ORINA_CORS_ALLOW_PREVIEW_ORIGINS`, but ownership of enabling them in production is not defined by repository evidence.
- Why current evidence is insufficient: allowed preview-host exposure is a deployment owner policy.
- Repository-only resolution possible: no, unless owner defines policy.
- Exact missing authority: owner decision for whether preview host patterns may be enabled in production and who approves the environment variable.
- Exact missing credential/config/environment: redacted production Edge Function env setting for `ORINA_CORS_ALLOW_PREVIEW_ORIGINS`; value presence is enough, not secrets.
- Exact risk if unresolved: operators may enable broad preview origins without a documented approval path.
- Exact risk if elevated access is granted: Edge environment write access could weaken CORS policy.
- Minimum viable permission needed: `NETWORK_READ` or owner-provided redacted env export to verify setting; `LOCAL_WRITE` for docs after owner decision.
- Read-only access sufficient: yes for verification.
- Local-only validation sufficient: no for live environment state.

## Bounded Assurance Closure Update

Audit date: 2026-05-13

The next assurance phase used only local repository write access and package/GitHub metadata read capability. No signing authority, deployment authority, unrestricted secret access, production mutation, wallet signing, Cloudflare write, Supabase write, branch protection mutation, CI secret mutation, release publishing, artifact signing, or environment variable mutation was used.

### Updated Classifications

| Item | Previous Status | Updated Status | Evidence | Remaining Minimum Permission |
| --- | --- | --- | --- | --- |
| Mandatory type safety | BLOCKED | IMPLEMENTED for narrow baseline; PARTIAL for broad migration | `typescript`, `@types/node`, `@types/react`, and `@types/react-dom` are exact dev dependencies; `tsconfig.check.json` exists; `npm run typecheck` passes; release gate runs it. | Local write only for staged expansion; no elevated permission unless adding more dev-only tooling. |
| Lint command | BLOCKED | PARTIAL | `docs/lint-governance.md` exists; `npm run verify:repo-tooling` reports lint governance partial and no linter dependency/config. | Owner decision selecting linter/rules before any dev-only install. |
| Strict CI enforcement | PARTIAL | PARTIAL | Workflow runs stronger gates; `scripts/verify-github-branch-protection.mjs` exists for read-only verification. No `GITHUB_BRANCH_PROTECTION_TOKEN` was present, so live branch protection was not queried. | `NETWORK_READ` with `GITHUB_BRANCH_PROTECTION_TOKEN`, or owner-provided redacted output. |
| Signed releases | OWNER_DECISION_REQUIRED | OWNER_DECISION_REQUIRED | `docs/release-provenance.md` and unsigned manifest exist, but no signing identity/custody/enforcement decision exists. | Owner signing model decision; signing authority must stay outside this local pass. |
| Provenance plan | PARTIAL | IMPLEMENTED for unsigned plan | `npm run release:manifest` generated `audit/release-manifest.unsigned.json`; CI generates it. | None for unsigned manifest. Owner decision still required for signing. |
| Incident response | PARTIAL | OWNER_DECISION_REQUIRED | `docs/operational-governance-owner-decisions.md` freezes the missing owner facts. | Owner-provided incident policy facts. |
| Key rotation | PARTIAL | OWNER_DECISION_REQUIRED | Owner-decision register records missing rotation order, validation, rollback, and approval facts. | Owner-provided redacted rotation matrix and procedure. |
| Disaster recovery drills | PARTIAL | OWNER_DECISION_REQUIRED | Owner-decision register records missing drill target, cadence, evidence, and success criteria. | Owner-provided redacted drill evidence or non-production drill plan. |
| Rollback | PARTIAL | OWNER_DECISION_REQUIRED | Owner-decision register records missing rollback authority and tested record. | Owner-provided rollback procedure/evidence. |
| Recovery objectives | PARTIAL | OWNER_DECISION_REQUIRED | Owner-decision register records missing RTO/RPO and restore validation evidence. | Owner-provided recovery objectives/evidence. |
| Environment separation | PARTIAL | OWNER_DECISION_REQUIRED | Owner-decision register records missing environment map and promotion ownership. | `NETWORK_READ` metadata or owner-provided redacted environment export. |
| Supplier CDN policy | OWNER_DECISION_REQUIRED | OWNER_DECISION_REQUIRED | Owner-decision register records required decision for `https://s.alicdn.com`. | Owner decision: approve, proxy, block, or sanitize. |
| CORS preview-origin ownership | PARTIAL | OWNER_DECISION_REQUIRED | Owner-decision register records required production preview-origin approval policy. | `NETWORK_READ` env metadata or owner-provided redacted export. |

### Branch Protection Verifier

- Script: `scripts/verify-github-branch-protection.mjs`
- NPM command: `npm run verify:github-branch-protection`
- Required explicit token env: `GITHUB_BRANCH_PROTECTION_TOKEN`
- Authority class: `NETWORK_READ`
- Token status during this pass: absent
- Result: verifier exists; live GitHub branch protection verification remains blocked until a read-only token or owner-run redacted output is provided.

Safe owner-run command:

```powershell
$env:GITHUB_BRANCH_PROTECTION_TOKEN = "<read-only token>"
npm run verify:github-branch-protection
Remove-Item Env:GITHUB_BRANCH_PROTECTION_TOKEN
```

## Management Governance Update

Audit date: 2026-05-13

This update used local repository write access and dev-only package installation for ESLint. It did not mutate GitHub branch protection, Cloudflare settings, Supabase settings, CI secrets, production data, or signing configuration.

| Item | Previous Status | Updated Status | Evidence | Remaining Minimum Permission |
| --- | --- | --- | --- | --- |
| Lint command | PARTIAL | IMPLEMENTED | Owner selected ESLint; exact dev-only ESLint dependencies are installed; `eslint.config.js` exists; `npm run lint:check` passes; release gate runs lint. | None for current baseline. Local write only for staged rule expansion. |
| Release provenance artifacts | IMPLEMENTED unsigned manifest | IMPLEMENTED unsigned artifact upload | `Protocol Release Gate` uploads `audit/sbom.cdx.json` and `audit/release-manifest.unsigned.json` as a GitHub Actions artifact. | None for unsigned artifacts. Signing still requires owner signing-policy decision. |
| Supabase backend production path | PARTIAL owner-approved CLI | PARTIAL workflow prepared | `.github/workflows/supabase-production-deploy.yml` is manual-only, production-environment-gated, requires exact commit and confirmation input, verifies migration alignment, runs audits, deploys split functions, and verifies CORS/health. | GitHub admin/config authority to configure production environment protection and required secret names. |
| GitHub branch protection | BLOCKED | OWNER_DECISION_REQUIRED | `docs/github-branch-protection-governance.md` defines required `main` protection and read-only verifier command. No GitHub settings were mutated. | GitHub repository administration authority to configure; read-only metadata authority to verify. |
| Supplier CDN policy | OWNER_DECISION_REQUIRED | PARTIAL | Production smoke explicitly classifies `https://s.alicdn.com` as supplier media only. | Owner policy decision to approve, proxy, block, or sanitize long-term. |
