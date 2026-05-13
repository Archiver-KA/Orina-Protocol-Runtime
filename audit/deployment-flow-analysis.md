# Deployment Flow Analysis

Date: 2026-05-13

Scope:

- Frontend deployment flow: GitHub `main` to Cloudflare Worker Builds.
- Backend deployment flow: Supabase project and Edge Function deployment path.
- Inspection mode: repository evidence, public/read-only network checks, and read-only Chrome DevTools Protocol on `http://127.0.0.1:9222`.

Initial review mode used repository evidence, public/read-only network checks, and read-only Chrome DevTools Protocol on `http://127.0.0.1:9222`. No branch protection mutation, Cloudflare settings mutation, GitHub settings mutation, secret inspection, wallet signing, or confirmation action was performed.

Deployment execution addendum: after the owner explicitly authorized production deployment with full privileges on 2026-05-13, the backend was deployed through the documented Supabase split-function order and the frontend was deployed by pushing the committed candidate to GitHub `main`, allowing Cloudflare Worker Builds to deploy Worker `apporinaio`.

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

Initial classification: `PARTIAL`

Latest deployment classification: `IMPLEMENTED_WITH_RESIDUAL_GOVERNANCE`

Evidence:

- Repository docs and `wrangler.jsonc` define the intended frontend flow.
- Public frontend endpoint is served through Cloudflare.
- Cloudflare dashboard read-only inspection reached Worker `apporinaio` production page.

Initial insufficient evidence:

- GitHub branch protection and required checks were not proven. Public GitHub API returned unauthenticated/inaccessible results for the private repository, and CDP branch settings inspection did not show enforced `main` required checks.

Residual risk:

- Pushing to `main` can deploy without repository-proven branch protection or required-check enforcement. This deployment proceeded only because the owner explicitly authorized the release despite that governance residual.

Execution evidence:

- `git push origin main` advanced `origin/main` to `9bd8bf790c5051354c151496840bfc8b17e9a6b7`.
- Read-only CDP evidence showed GitHub `Protocol Release Gate` run `25797419606` completed successfully for commit `9bd8bf7` on branch `main`.
- Read-only CDP evidence showed Cloudflare Worker `apporinaio` production deployment history for branch `main`, including the pushed release candidate.
- `https://app.orina.io/`, `https://app.orina.io/marketplace`, and `https://app.orina.io/settings` returned HTTP 200 through Cloudflare.
- `npm run smoke:cdp:readonly-security -- --goto https://app.orina.io/ --timeout-ms 30000` passed after explicitly documenting production browser egress to Cloudflare Analytics and supplier media.

## Backend Flow Classification

Initial classification: `PARTIAL`

Latest deployment classification: `IMPLEMENTED_WITH_RESIDUAL_GOVERNANCE`

Evidence:

- Repository docs define Supabase project ref `vcixsdudkizgfikhmfuv`, split functions, deploy order, and verification commands.
- Supabase dashboard read-only inspection reached project `ATP` marked `main PRODUCTION`.
- CORS preflight behavior for allowed and denied origins matches repository expectations.

Initial insufficient evidence:

- The repository does not define an automated Supabase production deployment workflow.

Residual risk:

- Backend deployment relies on owner-approved Supabase CLI operations rather than a repository CI/CD workflow.
- Direct unauthenticated platform-level 401 responses may still include platform-managed CORS behavior outside the application handler; authenticated health and preflight checks matched repository expectations.

Execution evidence:

- `npx supabase migration list --linked` showed local and remote migrations aligned through `000073`.
- Linked metadata query found the only public table with RLS disabled was `public.spatial_ref_sys`; no application table with RLS disabled was found.
- Supabase functions deployed successfully for `orina-auth-bridge-v1`, `orina-ai-m2m-v2`, `orina-seller-minting-v1`, `orina-receipt-sync-v1`, `make-server-b0d68fc8`, `orina-chat-v1`, and `orina-order-autotime-v1`.
- Post-deploy authenticated health GET returned HTTP 200 and echoed `Access-Control-Allow-Origin: https://app.orina.io`.
- Post-deploy preflight allowed `https://app.orina.io` and denied `https://evil.example`.

## Approval Decision

Initial decision: `NOT_APPROVED`

Latest decision: `DEPLOYED_WITH_OWNER_AUTHORITY`

Initial deployment was not approved because the safety gates were not fully satisfied:

- candidate changes are uncommitted;
- live branch protection / required-check enforcement for `main` is not proven;
- Cloudflare Worker Builds source/build configuration is not proven;
- Supabase Security Advisor reports one security error;
- deployed Supabase unauthenticated GET error response still returns wildcard CORS;
- the previous browser smoke has an unresolved `https://s.alicdn.com` supplier media-origin exception;
- Supabase backend production deployment is not defined as a repository CI/CD workflow.

The owner later granted explicit production deployment authority. Deployment proceeded with the residual governance items documented above and without signing, wallet actions, branch-protection mutation, GitHub settings mutation, Cloudflare settings mutation, CI secret mutation, or secret value inspection.

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
