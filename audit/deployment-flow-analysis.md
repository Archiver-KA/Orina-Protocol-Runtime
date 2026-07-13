# Deployment Flow Analysis

## 2026-07-13 Owner-Authorized Hardening Deployment Addendum

- Private deployment source: `Archiver-KA/Orina-Protocol-Runtime`, branch `main`; authenticated owner permission is `ADMIN`.
- Public clean-room mirror: `Archiver-KA/System-Orina-Protocol`; authenticated owner permission is `ADMIN`.
- GitHub `main` protection is enabled with strict required context `Viewer Release Gate`; force pushes and branch deletion are disabled.
- GitHub `production` environment exists but had no platform reviewer rule at inspection time. The owner's current-session approval is recorded for this maintenance window; a required-reviewer rule remains a future-control action after rollout.
- Canonical backend is Supabase `ystjugghyteyylkevbsl` (`Orina ATP v3.5 beta`). The older `vcixsdudkizgfikhmfuv` deployment references were operational drift and were corrected in current runbooks.
- Deployment preflight now fails closed unless the canonical project ref, DB audit URL identity, public project/URL, and legacy anon JWT ref are coherent.
- Read-only CDP on port `9222` confirmed the owner sessions without inspecting cookies, storage, tokens, or secret values.
- Supabase migration history is aligned through `000081`; dry-run reports exactly `000082`-`000084` pending and no remote-only drift.
- Frontend approval targets code candidate `34e41fb60a9d3deefd63859ed35a902eb66bec49`. Backend Edge dispatch remains blocked until migrations are applied and the live `SECURITY DEFINER` audit passes.
- The frontend Release Gate keeps the live Supabase audit advisory, while `.github/workflows/supabase-production-deploy.yml` keeps it blocking before any Edge function deploy.

Detailed candidate evidence and stop/rollback conditions are recorded in `audit/deployment-approval-contract.json`.

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

- Backend deployment has a repository workflow path in `.github/workflows/supabase-production-deploy.yml`, but it still requires owner-configured GitHub `production` environment protection and required secrets before it can replace local CLI operations as the normal path.
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

Before the next approval:

1. Verify GitHub branch protection and required checks with `npm run verify:github-branch-protection` using a read-only token, or provide owner-run redacted output.
2. Configure GitHub `production` environment protection for `.github/workflows/supabase-production-deploy.yml`.
3. Configure required GitHub secret names for backend deployment without exposing values:
   - `SUPABASE_ACCESS_TOKEN`
   - `SUPABASE_PROJECT_REF`
   - `SUPABASE_DB_AUDIT_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Verify Cloudflare Worker Builds configuration for Worker `apporinaio`: GitHub source repo, branch `main`, build command `npm run build`, output `dist`, and required public build variables by name only.
5. Keep the Supabase Security Advisor `RLS Disabled in Public` acceptance tied to repository evidence that only `public.spatial_ref_sys` has RLS disabled.
6. Convert supplier media handling for `https://s.alicdn.com` from deployment-smoke approval into a long-term owner policy: approve, proxy, block, or sanitize.
7. Re-run all required release gates, including `npm run lint:check`, and browser smoke before approval.

## 2026-05-14 Completion Addendum

The owner selected ESLint for lint governance and authorized end-to-end completion in this session.

Additional repository controls added before the next production promotion:

- Typecheck baseline with pinned dev-only TypeScript tooling.
- Minimal ESLint hazardous-construct baseline with pinned dev-only ESLint tooling.
- Manual, environment-gated Supabase production deployment workflow.
- Release-gate artifact generation/upload for the unsigned release manifest and SBOM.
- Supabase migration-list parser for CI-safe drift verification.
- CDP smoke hardening so unresponsive Page/Runtime targets fail with explicit timeout evidence instead of hanging.

Read-only CDP status:

- `http://127.0.0.1:9222/json/version` responded.
- `http://127.0.0.1:9222/json/list` showed GitHub, Cloudflare, Supabase, and `app.orina.io` tabs.
- Page/Runtime commands against page targets timed out, and newly created targets reported crashes. No wallet confirmation was accepted, and no browser secret values were inspected.

Supplemental non-CDP checks:

- Local candidate routes `/`, `/marketplace`, and `/settings` returned HTTP 200 from `http://127.0.0.1:5173`.
- Supabase CORS preflight for `https://app.orina.io` returned `Access-Control-Allow-Origin: https://app.orina.io`.
- Supabase CORS preflight for `https://evil.example` did not return `Access-Control-Allow-Origin`.

Residual governance before claiming fully enforced deployment management:

- Branch protection/required checks still need token-backed verification or owner-provided redacted evidence.
- The Supabase production workflow still needs owner-configured GitHub `production` environment protection and required secrets by name only.
- Release artifacts remain unsigned until the owner defines signing authority and custody.

## 2026-05-20 Idempotency Replay Addendum

The owner requested a check of server-side idempotent replay for Supabase project `vcixsdudkizgfikhmfuv` through CDP port `9222`, completion of the implementation, and deployment-skill handling for the current changes.

Read-only CDP status:

- `http://127.0.0.1:9222/json/version` responded.
- The Supabase dashboard tab was open at `/dashboard/project/vcixsdudkizgfikhmfuv`.
- Redacted page labels showed project `ATP`, environment `main PRODUCTION`, `STATUS Healthy`, and last migration `public_data_api_explicit_grants_and_postgis_rls`.
- No dashboard mutation was attempted and no browser secret values were inspected.

Repository implementation added:

- `supabase/migrations/000075_edge_idempotency_replay.sql` creates service-role-only `public.edge_idempotency_records` with deny-all RLS for browser/API roles.
- `supabase/functions/server/idempotency-replay.ts` adds Edge middleware for authenticated JSON write idempotency.
- `supabase/functions/server/edge-app.ts` and `supabase/functions/server/index.tsx` register the middleware for split and shared function entrypoints.
- Browser clients now send correlation/idempotency headers and retry only replay-safe writes; API key generation remains no-retry because the raw key is a one-time secret and must not be persisted for replay.

Verification evidence:

- `npm ci`, `npm run test`, `npm run typecheck`, `npm run lint:check`, `npm run security:check-client-secrets`, `npm run security:scan`, `npm run audit:supabase:data-api-grants`, `npm run audit:supabase:security-definer`, `npm run verify:repo-tooling`, `npm run verify:marketplace-freshness`, `npm run verify:assurance-invariants`, `npm run verify:viewer-release`, `npm run verify:deterministic-build`, `npm run security:sbom`, and `npm run release:manifest` passed.
- Deno check passed for the idempotency middleware plus representative shared and split Edge entrypoints.
- CDP readonly browser smoke passed on clean local origin `http://127.0.0.1:5191/` after a transient marketplace warmup rerun.
- `npx supabase migration list --linked` showed local `000075` is not applied on the production remote, which is aligned only through `000074`.

Approval decision: `NOT_APPROVED`

Deployment was not triggered because the deployment skill stop conditions are active:

- working tree is dirty and no exact candidate commit SHA exists;
- production database migration `000075` is pending and must precede Edge Function deployment;
- branch protection / required checks are blocked by missing `GITHUB_BRANCH_PROTECTION_TOKEN`;
- release artifacts are still unsigned;
- no owner-approved CI/CD workflow dispatch with exact SHA and approval record was executed.

### Branch Protection Recheck

After the owner enabled GitHub branch protection/ruleset for `main`, the branch-protection verifier was rerun using `GITHUB_BRANCH_PROTECTION_TOKEN` from the local environment without printing the token value.

Result:

- `npm run verify:github-branch-protection`: passed.
- GitHub branch protection endpoint returned status `200`.
- Required status checks are enabled and strict.
- Required check context: `Viewer Release Gate`.
- Workflows are active for `Protocol Release Gate` and `Supabase Production Deploy`.

Updated approval decision: `APPROVED_FOR_CI_CD_DEPLOYMENT`

Deployment order remains:

1. Push the exact approved commit to `main`.
2. Let GitHub run `Protocol Release Gate`.
3. Let Cloudflare Worker Builds deploy frontend from GitHub `main`.
4. Apply Supabase migration `000075` before deploying Edge Functions that depend on `public.edge_idempotency_records`.
5. Dispatch `.github/workflows/supabase-production-deploy.yml` for the exact approved commit and verify production CORS/health.

### 2026-05-20 Production Deploy Flow Standardization

The owner authorized use of CDP port `9222` for read-only deployment review and asked to standardize the next deployment flow.

Read-only CDP status:

- GitHub personal access token settings, repository branch settings, and Actions secret pages were visible.
- Supabase database settings for project `vcixsdudkizgfikhmfuv` were visible as `main PRODUCTION`.
- No browser secret values, cookies, local/session storage, wallet material, or dashboard confirmation values were inspected.
- No GitHub or Supabase UI mutation was attempted.

Repository flow controls added:

- `scripts/orina-production-deploy.mjs` provides the standard preflight, workflow dispatch, workflow polling, and production backend health/CORS verification wrapper.
- `npm run deploy:production:preflight` validates required local secret names, `SUPABASE_DB_AUDIT_URL` shape, clean `main`, `HEAD == origin/main`, and GitHub Actions secret names before dispatch.
- `npm run deploy:production:supabase` runs preflight, dispatches `Supabase Production Deploy`, polls the run, and verifies backend health/CORS.
- `npm run deploy:production:verify-backend` performs a read-only backend health/CORS check.
- `.github/workflows/supabase-production-deploy.yml` now validates deployment secret shapes before local static gates, so malformed database audit URLs fail early with a clear reason.
- `docs/production-deploy-standard-flow.md` records the operator runbook and stop conditions.

Deployment completion:

- `SUPABASE_DB_AUDIT_URL` was corrected to use the Supabase transaction pooler on port `6543` with `statement_cache_capacity=0`, which allows GitHub runners to avoid the direct database host IPv6 path and avoids prepared-statement collisions through the transaction pooler.
- Local `npm run audit:supabase:security-definer` passed through the corrected DB URL: 24 audited functions, findings `[]`.
- Local `npx supabase migration list --db-url <redacted>` plus `npm run verify:supabase-migration-list` passed: local and remote aligned through `000075`.
- Required GitHub Actions deployment secrets were updated by name only; no secret values were printed or recorded.
- Supabase Production Deploy workflow run `26161693412` completed with conclusion `success` for approved commit `6d6c0e3c144d015eff5b655fa7827da21acd7f90`.
- Post-deploy backend verification passed: health GET `200`, allowed-origin OPTIONS `204`, denied-origin OPTIONS `204` without `access-control-allow-origin`.

Earlier failed workflow dispatches stopped before Edge Function deployment and are retained as troubleshooting evidence for missing/invalid database audit credentials and direct-host GitHub runner connectivity.
