# Orina Security Control Catalog

Use this catalog to build concrete roadmaps, audit checklists, and acceptance criteria.

## P0 Controls

| Control | Acceptance criteria | Evidence and commands |
| --- | --- | --- |
| Supply-chain security | Lockfile install is mandatory, vulnerable transitive overrides are documented, dependency review policy exists, SBOM is generated and retained. | `npm ci`, `npm run security:scan`, `npm run security:sbom` |
| GitHub Actions and environment protection | `main` requires release gate checks, production environment requires approval, Supabase deploy workflow cannot run without exact SHA and confirmation. | `npm run verify:github-branch-protection`, `.github/workflows/protocol-release-gate.yml`, `.github/workflows/supabase-production-deploy.yml` |
| Release provenance and signing | Deterministic build and unsigned manifest exist; owner selects signing identity and storage before claiming signed provenance. | `npm run verify:deterministic-build`, `npm run release:manifest`, `docs/release-provenance.md` |
| Supabase RLS and SECURITY DEFINER audit | All public Data API grants are explicit, RLS policies are owner scoped, new `SECURITY DEFINER` functions have fixed `search_path` and reviewed execute grants. | `npm run audit:supabase:data-api-grants`, `npm run audit:supabase:security-definer` |
| Postgres concurrency | State-changing RPCs use atomic transactions, locks, idempotency, or unique constraints where needed; failed actions cannot partially mutate protocol state. | migration review, invariant tests, runtime order tests |
| Browser-wallet AppSec | Wallet connection, wallet auth, and Supabase bridge sessions remain isolated; no private key, token, or privileged secret reaches browser-visible code or storage. | `npm run security:check-client-secrets`, `npm run smoke:cdp:readonly-security` |
| Origin and CORS governance | Production CORS echoes approved origins only; preview origins and supplier media origins require owner policy; smoke has no unclassified origins. | `npm run security:scan`, `npm run smoke:cdp:readonly-security`, `audit/browser-smoke.md` |
| Runtime resilience | Browser and Edge boundaries enforce timeout, safe retry, circuit breaker, request correlation, and server-side idempotency replay for authenticated JSON writes; one-time secrets are never persisted for replay. | `vitest run src/utils/resilience.test.ts`, `npm run audit:supabase:data-api-grants`, `docs/resilience-runbook.md` |

## P1 Controls

| Control | Acceptance criteria | Evidence and commands |
| --- | --- | --- |
| Distributed tracing | Frontend, Edge Function, and database-facing operations share a redacted correlation id; traces avoid wallet secrets and tokens. | trace docs, Edge logs, smoke evidence |
| Incident response for dependency outages | Runbooks define timeout spike, retry storm, circuit-open, provider outage, wallet bridge failure, and stale cron response steps. | `docs/resilience-runbook.md`, incident runbook |
| Marketplace freshness/live cron monitoring | Repository-defined cron cadence is supplemented by live target checks for last refresh and staleness alerting. | `npm run verify:marketplace-freshness`, owner-run SQL evidence |
| Incident runbooks | Intake, severity, owner, escalation, containment, communication, rollback, and post-incident review are documented. | `SECURITY.md`, incident runbook |
| Secrets custody and backup boundary | Rotation order, dual-key window, rollback, backup exclusion, and restore verification are documented without secret values. | owner-provided redacted inventory, rotation runbook |

## P2 Controls

| Control | Acceptance criteria | Scope guard |
| --- | --- | --- |
| eBPF runtime security | Only target owned Linux hosts, self-hosted runners, or clusters where kernel telemetry is available. | Cloudflare Workers and Supabase managed Edge do not expose kernel instrumentation. |
| Tetragon/Falco syscall monitoring | Rules cover unexpected process execution, network egress, file reads, and CI runner tampering. | Do not deploy kernel agents to production without owner infrastructure approval. |
| Service mesh or zero-trust network | Identity-aware service-to-service policy exists for owned infrastructure. | Prefer Cloudflare/GitHub/Supabase native controls when runtime remains serverless-managed. |
| Capability-based JS isolation | Untrusted supplier content, third-party scripts, and generated AI content are isolated by CSP, Trusted Types, workers/iframes, or SES where appropriate. | Do not add heavy isolation frameworks without a concrete untrusted-code execution surface. |

## Formal Assurance Track

Start formal tooling only after the owned model and bytecode target are clear. Record bytecode/model freshness, revert atomicity, and terminal exclusivity as release invariants. Use ATP/Foundry mismatch classification before filing a code bug.
