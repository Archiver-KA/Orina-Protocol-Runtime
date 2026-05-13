# Deployment Execution Plan

Date: 2026-05-13

Authority basis:

- User explicitly requested deployment of backend and frontend with full privileges on 2026-05-13.
- Deployment remains bounded to the documented production flow:
  - frontend: GitHub `main` -> Cloudflare Worker Builds -> Worker `apporinaio`;
  - backend: Supabase project `vcixsdudkizgfikhmfuv` via Supabase CLI/function deployment.

## Remaining Blockers Reviewed

### Dirty release candidate

- Status before this plan: blocked.
- Resolution path: run full verification, commit the candidate, record exact SHA, then deploy that SHA.

### GitHub branch protection / required checks

- Status before this plan: not enforced by evidence.
- Evidence: GitHub rulesets page showed `You haven't created any rulesets`; branch settings page did not show enforced `main` required checks.
- Deployment decision: proceed only under explicit owner deployment authority; record residual risk that `main` does not have repository-proven required-check enforcement.

### Cloudflare Worker Builds configuration

- Status before this plan: partially verified.
- Evidence: Cloudflare dashboard page for Worker `apporinaio` production shows build history from `main`, links to `Archiver-KA/Orina-Protocol-Runtime`, and previous GitHub commit build records.
- Deployment decision: frontend deploy can be triggered by pushing the committed candidate to GitHub `main`; verify Cloudflare/live frontend afterward.

### Supabase Security Advisor `RLS Disabled in Public`

- Status before this plan: reviewed.
- Evidence: read-only linked query found the only public table with RLS disabled is `public.spatial_ref_sys`, the standard PostGIS reference table.
- Deployment decision: owner-accepted as not blocking this deployment; no application table with RLS disabled was found by the targeted query.

### Supabase wildcard CORS on unauthenticated GET

- Status before this plan: reviewed.
- Evidence: unauthenticated GET without anon authorization returned platform-level `401` with wildcard CORS. Authenticated health GET with public anon key and `Origin: https://app.orina.io` returned `200` and `Access-Control-Allow-Origin: https://app.orina.io`; preflight allow/deny behavior also matched docs.
- Deployment decision: not blocking; redeploy shared function to ensure repository CORS code is live, then recheck authenticated and preflight behavior.

### Supplier CDN origin `https://s.alicdn.com`

- Status before this plan: owner-approved deployment exception.
- Evidence: prior CDP smoke observed the origin through supplier media; repository code maps supplier image URLs into marketplace media.
- Deployment decision: do not block deployment. Keep residual supplier-media governance item documented for follow-up.

### Supabase backend deploy path

- Status before this plan: manual owner-approved CLI path.
- Evidence: `docs/spec/19-supabase-split-function-runbook.md` defines split function deploy order; Supabase CLI is authenticated and linked to project `vcixsdudkizgfikhmfuv`; migration history is aligned through `000073`.
- Deployment decision: deploy the split functions through Supabase CLI in documented order.

## Execution Steps

1. Run all local verification gates.
2. Generate SBOM and unsigned release manifest.
3. Commit the candidate on `main`.
4. Deploy Supabase functions in documented order:
   - `orina-auth-bridge-v1`
   - `orina-ai-m2m-v2`
   - `orina-seller-minting-v1`
   - `orina-receipt-sync-v1`
   - `make-server-b0d68fc8`
5. Push `main` to `origin` to trigger Cloudflare Worker Builds.
6. Verify production:
   - `https://app.orina.io/` returns 200 through Cloudflare;
   - Supabase preflight CORS allows `https://app.orina.io`;
   - Supabase preflight CORS denies `https://evil.example`;
   - authenticated health GET echoes `https://app.orina.io`;
   - Cloudflare dashboard/build evidence updates to the new commit, or live frontend content can be verified.
7. Update release candidate, audit report, and deployment contract with final status.

## Execution Result

Status: `DEPLOYED_WITH_OWNER_AUTHORITY`

Backend:

- Supabase migration history was aligned through `000073`.
- Functions deployed successfully to project `vcixsdudkizgfikhmfuv`:
  - `orina-auth-bridge-v1`
  - `orina-ai-m2m-v2`
  - `orina-seller-minting-v1`
  - `orina-receipt-sync-v1`
  - `make-server-b0d68fc8`
  - `orina-chat-v1`
  - `orina-order-autotime-v1`
- Post-deploy function versions observed:
  - `orina-auth-bridge-v1`: 15
  - `orina-ai-m2m-v2`: 2
  - `orina-seller-minting-v1`: 13
  - `orina-receipt-sync-v1`: 11
  - `make-server-b0d68fc8`: 140
  - `orina-chat-v1`: 22
  - `orina-order-autotime-v1`: 9

Frontend:

- `git push origin main` advanced `origin/main` to `9bd8bf790c5051354c151496840bfc8b17e9a6b7`.
- CDP read-only evidence showed GitHub `Protocol Release Gate` run `25797419606` completed successfully for `9bd8bf7` on `main`.
- CDP read-only evidence showed Cloudflare Worker `apporinaio` production deployment history for branch `main`.
- `https://app.orina.io/`, `https://app.orina.io/marketplace`, and `https://app.orina.io/settings` returned HTTP 200 through Cloudflare.
- Production CDP smoke passed after explicitly classifying Cloudflare Analytics and supplier-media browser origins.

Residual governance after deployment:

- GitHub branch protection / ruleset enforcement remains unconfigured by visible evidence.
- Release artifacts remain unsigned.
- Production deployment attestation remains partial until the owner defines the authoritative attestation format and storage path.
- Supabase backend deployment was owner-approved through CLI but is not yet automated as a repository CI/CD workflow.
- Supplier media governance for `https://s.alicdn.com` remains a long-term owner policy item.

## Stop Conditions

- Any local gate fails.
- Supabase migration list shows drift.
- Supabase function deployment fails.
- Git commit or push fails.
- Cloudflare or Supabase asks for an unreviewed confirmation beyond the documented deployment action.
- Any command would print or require secret values.
- Production verification shows a new high/critical security failure.
