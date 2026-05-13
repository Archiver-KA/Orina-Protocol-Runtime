# Deployment Flow Analysis

Date: 2026-05-13

Scope:

- Frontend deployment flow: GitHub `main` to Cloudflare Worker Builds.
- Backend deployment flow: Supabase project and Edge Function deployment path.
- Inspection mode: repository evidence, public/read-only network checks, and read-only Chrome DevTools Protocol on `http://127.0.0.1:9222`.

No deployment, push, workflow dispatch, branch protection mutation, Cloudflare mutation, Supabase mutation, secret inspection, wallet signing, or confirmation action was performed.

## Evidence Collected

Repository evidence:

- `docs/runtime-github-supabase-cloudflare-plan.md` defines frontend deployment as GitHub `main` -> Cloudflare Worker Builds -> Worker `apporinaio` -> `https://app.orina.io`.
- `wrangler.jsonc` defines Worker name `apporinaio`, assets directory `./dist`, and SPA fallback handling.
- `.github/workflows/protocol-release-gate.yml` is a verification gate only; it does not deploy.
- `docs/spec/19-supabase-split-function-runbook.md` defines Supabase split functions and deploy order for project `vcixsdudkizgfikhmfuv`.
- `docs/supabase-migration-drift-reconciliation.md` requires migration-history alignment before normal Supabase deploy steps continue.

Read-only network checks:

- `https://app.orina.io/` returned HTTP 200 with `server: cloudflare`.
- Supabase OPTIONS preflight to `make-server-b0d68fc8/health` with `Origin: https://app.orina.io` returned HTTP 204 and `Access-Control-Allow-Origin: https://app.orina.io`.
- Supabase OPTIONS preflight to the same route with `Origin: https://evil.example` returned HTTP 204 without `Access-Control-Allow-Origin`.
- Direct unauthenticated GET to the same Supabase health route returned HTTP 401 with `Access-Control-Allow-Origin: *`.

CDP read-only inspection:

- Cloudflare dashboard tab was open at `/workers/services/view/apporinaio/production`; redacted text showed `apporinaio Workers`.
- Supabase dashboard tab was open at `/dashboard/project/vcixsdudkizgfikhmfuv/advisors/security`; redacted text showed project `ATP`, environment `main PRODUCTION`, `Errors 1 errors`, and `RLS Disabled in Public`.
- GitHub dashboard showed `Archiver-KA/Orina-Protocol-Runtime`.
- GitHub branch settings page loaded at `/Archiver-KA/Orina-Protocol-Runtime/settings/branches`; redacted text showed branch protection settings UI but did not show `main`, required status checks, or `Protocol Release Gate` as an enforced rule.

## Frontend Flow Classification

Classification: `PARTIAL`

Evidence:

- Repository docs and `wrangler.jsonc` define the intended frontend flow.
- Public frontend endpoint is served through Cloudflare.
- Cloudflare dashboard read-only inspection reached Worker `apporinaio` production page.

Insufficient evidence:

- Cloudflare Worker Builds configuration was not proven from repository files or redacted dashboard text.
- GitHub branch protection and required checks were not proven. Public GitHub API returned unauthenticated/inaccessible results for the private repository, and CDP branch settings inspection did not show enforced `main` required checks.
- The working tree remains dirty, so the latest local candidate is not represented by the current HEAD.

Residual risk:

- Pushing to `main` could deploy without a repository-proven branch protection gate or verified Cloudflare build configuration.

## Backend Flow Classification

Classification: `PARTIAL`

Evidence:

- Repository docs define Supabase project ref `vcixsdudkizgfikhmfuv`, split functions, deploy order, and verification commands.
- Supabase dashboard read-only inspection reached project `ATP` marked `main PRODUCTION`.
- CORS preflight behavior for allowed and denied origins matches repository expectations.

Insufficient evidence:

- The repository does not define an automated Supabase production deployment workflow.
- Supabase dashboard Security Advisor shows one error, `RLS Disabled in Public`, which requires owner review or documented acceptance before deployment approval.
- Direct unauthenticated GET to the shared health route still returned wildcard CORS on a 401 response. Repository preflight behavior is correct, but deployed non-preflight error CORS behavior needs owner/security review before approval.

Residual risk:

- Backend deployment may rely on manual Supabase operations, and live Security Advisor findings may remain unresolved or undocumented.

## Approval Decision

Decision: `NOT_APPROVED`

Deployment is not approved because the safety gates are not fully satisfied:

- candidate changes are uncommitted;
- live branch protection / required-check enforcement for `main` is not proven;
- Cloudflare Worker Builds source/build configuration is not proven;
- Supabase Security Advisor reports one security error;
- deployed Supabase unauthenticated GET error response still returns wildcard CORS;
- the previous browser smoke has an unresolved `https://s.alicdn.com` supplier media-origin exception;
- Supabase backend production deployment is not defined as a repository CI/CD workflow.

## Minimum Closure Path

Before approval:

1. Commit the full release candidate and identify the exact deployable SHA.
2. Verify GitHub branch protection and required checks with `npm run verify:github-branch-protection` using a read-only token, or provide owner-run redacted output.
3. Verify Cloudflare Worker Builds configuration for Worker `apporinaio`: GitHub source repo, branch `main`, build command `npm run build`, output `dist`, and required public build variables by name only.
4. Resolve or owner-accept the Supabase Security Advisor `RLS Disabled in Public` finding with repository evidence.
5. Resolve or owner-accept the non-preflight wildcard CORS behavior on Supabase 401 responses.
6. Approve, proxy, block, or otherwise govern `https://s.alicdn.com` supplier media origin.
7. Define or approve the Supabase backend production deployment path.
8. Re-run all required release gates and browser smoke, or record explicit owner-approved exceptions.
