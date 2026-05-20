# Security Improvement Plan

Plan date: 2026-05-20

Scope: Orina Protocol Runtime application, Supabase/Postgres backend, browser wallet boundary, CI/CD provenance, and operational security controls.

## Current Baseline

Repository evidence already includes release gates, deterministic build verification, SBOM generation, unsigned release manifest generation, Supabase SECURITY DEFINER audit tooling, browser/CDP smoke, CORS checks, marketplace freshness verification, and wallet-secret scanning.

Known residuals remain policy or operations driven: supplier media origin governance, signed release provenance, GitHub branch/environment protection evidence, live cron health, incident response ownership, key rotation, backup/restore boundaries, and any kernel or service-mesh security layer.

## Security Tiers

| Tier | Scope | Controls |
| --- | --- | --- |
| Tier 1 | Release-blocking application and data security | Postgres concurrency, RLS, Edge security, wallet isolation, CORS policy |
| Tier 2 | Operational assurance and provenance | eBPF observability, runtime syscall tracing, distributed tracing, supply-chain verification |
| Tier 3 | Advanced isolation and infrastructure posture | Capability-based JS isolation, kernel-level runtime security, zero-trust infra mesh |

## P0 Roadmap

| Control | Current classification | Next action | Verification |
| --- | --- | --- | --- |
| Supply-chain security | PARTIAL | Keep `npm ci`, lockfile, SBOM, and `security:scan`; add dependency review policy, action pinning policy, and owner for override lifecycle. | `npm run security:scan`, `npm run security:sbom`, `npm run verify:deterministic-build` |
| GitHub Actions/environment protection | OWNER_DECISION_REQUIRED | Configure `main` ruleset and `production` environment protection; make required checks match GitHub-reported check names. | `npm run verify:github-branch-protection` with read-only token, redacted GitHub environment metadata |
| Release provenance/signing | OWNER_DECISION_REQUIRED | Select Sigstore/Cosign, GPG, or owner-approved signing; define signing identity, artifact set, storage, and enforcement. | `npm run release:manifest`; signed attestation evidence after owner decision |
| Supabase/Postgres RLS and SECURITY DEFINER audit | PARTIAL | Run SECURITY DEFINER audit with production audit URL; require fixed `search_path`, reviewed grants, explicit Data API grants, and migration-backed RLS changes. | `npm run audit:supabase:data-api-grants`, `npm run audit:supabase:security-definer` |
| Postgres concurrency | PARTIAL | Add or verify atomic order-state RPC semantics, row locks/idempotency, terminal-state guards, and rollback tests for failed delegated/root actions. | `npm run test`, `npm run verify:assurance-invariants`, migration review |
| Browser-wallet AppSec | PARTIAL | Preserve wallet connection/auth/session separation, review localStorage session exposure, keep wallet actions behind explicit user confirmation and origin display. | `npm run security:check-client-secrets`, `npm run smoke:cdp:readonly-security` |
| Origin/CORS governance | PARTIAL | Owner must choose supplier media policy for `https://s.alicdn.com`: approve, proxy, block, or sanitize. Define production preview-origin approval policy. | `npm run security:scan`, `npm run smoke:cdp:readonly-security`, updated smoke allowlist or proxy/block implementation |
| Runtime timeout/retry/circuit breaker defense | IMPLEMENTED for Edge JSON writes; PARTIAL for protocol order mutations | Shared browser resilience layer is implemented for Supabase REST, API keys, and AI M2M calls. Edge server-side idempotency replay is migration-backed for authenticated JSON writes; one-time secret responses are blocked from replay storage. Protocol order/escrow/finality mutations still need route-specific transaction idempotency before automatic retry. | `vitest run src/utils/resilience.test.ts`, `npm run audit:supabase:data-api-grants`, `docs/resilience-runbook.md` |

P0 exit criteria: all release-blocking controls are `IMPLEMENTED` or have an explicit owner-approved exception with residual risk, rollback path, and verification evidence.

## P1 Roadmap

| Control | Current classification | Next action | Verification |
| --- | --- | --- | --- |
| Distributed tracing | NOT_STARTED | Introduce redacted correlation IDs across browser requests, Edge Functions, and DB-facing operations; never include wallet secrets or tokens. | Trace sample from one marketplace read path and one protected write path |
| Dependency outage response | PARTIAL | Use request correlation, timeout/retry/circuit runbook, and dashboard alert definitions for dependency failure modes. | `docs/resilience-runbook.md` |
| Marketplace freshness/live cron monitoring | PARTIAL | Extend repository static cadence checks with live cron freshness evidence and alert thresholds for stale materialized views. | `npm run verify:marketplace-freshness`, owner-run SQL health evidence |
| Incident runbooks | OWNER_DECISION_REQUIRED | Define intake, severity taxonomy, triage owner, escalation path, response timeline, containment, communication, and post-incident review. | Updated `SECURITY.md` or runbook with owner-approved facts |
| Secrets custody / backup boundary | OWNER_DECISION_REQUIRED | Document secret inventory by name only, rotation order, dual-key windows, rollback, backup exclusions, and M2M delegate encryption-key custody. | Redacted owner inventory and rotation runbook |

P1 exit criteria: operators can detect, triage, rotate, roll back, and prove freshness without relying on undocumented memory or secret exposure.

## P2 Roadmap

| Control | Current classification | Next action | Verification |
| --- | --- | --- | --- |
| eBPF runtime security | BLOCKED | Identify owned Linux runtime or self-hosted runner targets. Do not assume kernel access for Cloudflare Workers or Supabase managed Edge. | Target inventory and read-only telemetry plan |
| Tetragon/Falco syscall monitoring | BLOCKED | For owned hosts only, define rules for unexpected process execution, network egress, sensitive file reads, and CI runner tampering. | Non-production pilot logs and alert samples |
| Service mesh / zero-trust network | OWNER_DECISION_REQUIRED | If Orina moves to owned services or clusters, define identity-aware service policy. For current managed surfaces, prefer GitHub, Cloudflare, and Supabase native controls. | Architecture decision record and policy evidence |
| Capability-based JS isolation | PARTIAL | Add CSP/media-src governance, consider Trusted Types, workers, iframes, or SES only for concrete untrusted-code or supplier-content surfaces. | Browser smoke, CSP report-only data, XSS regression tests |

P2 exit criteria: advanced controls have a real owned infrastructure target and do not distract from unresolved Tier 1 release risks.

## Formal Assurance Track

Preserve these invariants:

- Bytecode/model freshness: `hash(runtime bytecode) == hash(current compiled artifact runtime bytecode)`.
- Revert atomicity: failed delegated/root action must not partially mutate order state, escrow, asset lock, or finality latch.
- Terminal exclusivity: once final, no path can move to another terminal state or reopen payment/confirmation windows.

Classification rules:

- ATP fails and Foundry reproduces: `CODE BUG`.
- ATP fails but Foundry contradicts: `MODEL MISMATCH`, unless audit docs assert ATP semantics.
- ATP passes but Foundry invariant fails: `MODEL INCOMPLETE`.
- Bytecode hash mismatch: `TOOLING`; stop.

KEVM, Certora, Isabelle/Coq fragments, SMT-backed property proving, symbolic execution integration, and continuous formal CI are valuable only after owned contract/model scope, bytecode freshness, and CI authority are defined.

## Immediate Execution Order

1. Close owner decisions for `https://s.alicdn.com`, preview-origin policy, branch protection, GitHub production environment protection, and release signing.
2. Refresh P0 evidence by running repository gates locally and, where authorized, owner-read-only GitHub/Supabase verification.
3. Patch any failing Tier 1 control before starting new Tier 2/P2 infrastructure work.
4. Add P1 runbooks for incident response, key rotation, restore drill, and live cron monitoring.
5. Pilot P2 only on explicit owned infrastructure, not on managed serverless assumptions.

## Baseline Verification Set

```powershell
npm ci
npm run test
npm run typecheck
npm run lint:check
npm run security:check-client-secrets
npm run security:scan
npm run audit:supabase:data-api-grants
npm run audit:supabase:security-definer
npm run verify:repo-tooling
npm run verify:marketplace-freshness
npm run verify:assurance-invariants
npm run verify:deterministic-build
npm run security:sbom
npm run release:manifest
```

Use `npm run smoke:cdp:readonly-security` for browser-origin and wallet-isolation evidence. Use `npm run verify:github-branch-protection` only with a read-only token and without printing token values.
