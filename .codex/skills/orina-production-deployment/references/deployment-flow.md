# Orina Deployment Flow Reference

## Repository Evidence

- Frontend runtime repo: `https://github.com/Archiver-KA/Orina-Protocol-Runtime`
- Production branch: `main`
- Frontend hostname: `https://app.orina.io`
- Cloudflare Worker service: `apporinaio`
- Worker config: `wrangler.jsonc`
- Verification workflow: `.github/workflows/protocol-release-gate.yml`
- Backend Edge Function deployment workflow: `.github/workflows/supabase-production-deploy.yml`
- Frontend deploy doc: `docs/runtime-github-supabase-cloudflare-plan.md`
- Supabase split-function runbook: `docs/spec/19-supabase-split-function-runbook.md`
- Supabase migration drift runbook: `docs/supabase-migration-drift-reconciliation.md`

## Frontend Standard Path

Repository evidence defines production frontend deployment as GitHub-driven Cloudflare Worker Builds:

1. Source changes land on GitHub branch `main`.
2. GitHub Actions workflow `Protocol Release Gate` verifies the candidate but does not deploy.
3. Cloudflare Worker Builds reads GitHub `main`.
4. Cloudflare builds with `npm run build`.
5. Cloudflare serves `dist` through Worker `apporinaio`.
6. Custom hostname `https://app.orina.io` points to that Worker.

Do not use local `wrangler deploy` except for separately approved emergency recovery.

## Backend Standard Path

Repository evidence defines a GitHub-dispatched Supabase Edge Function deployment job for production:

- Workflow: `.github/workflows/supabase-production-deploy.yml`
- Trigger: manual `workflow_dispatch`
- Environment: GitHub `production`
- Required dispatch inputs:
  - `approved_commit`: exact SHA approved for production backend deployment
  - `approval_record`: link or identifier for the owner approval record
  - `confirm`: exact text `DEPLOY_SUPABASE_PRODUCTION`
- Required secret names, values never printed:
  - `SUPABASE_ACCESS_TOKEN`
  - `SUPABASE_PROJECT_REF`
  - `SUPABASE_DB_AUDIT_URL`
  - `VITE_SUPABASE_ANON_KEY`

Project ref from docs:

- `vcixsdudkizgfikhmfuv`

Backend deployment sequence:

1. Validate the dispatch confirmation, approval record, and exact approved commit SHA.
2. Checkout the approved commit.
3. Install Node dependencies and Supabase CLI.
4. Verify required secrets by presence only.
5. Run static/security gates:
   - `npm run typecheck`
   - `npm run lint:check`
   - `npm run security:check-client-secrets`
   - `npm run security:scan`
   - `npm run audit:supabase:security-definer -- --db-url "$SUPABASE_DB_AUDIT_URL"`
6. Verify Supabase migration alignment with `supabase migration list` plus `npm run verify:supabase-migration-list`.
7. Deploy split Supabase functions in order.
8. Verify production CORS and health.

Split function order for multi-function deploys:

```bat
supabase functions deploy orina-auth-bridge-v1 --project-ref vcixsdudkizgfikhmfuv
supabase functions deploy orina-ai-m2m-v2 --project-ref vcixsdudkizgfikhmfuv
supabase functions deploy orina-seller-minting-v1 --project-ref vcixsdudkizgfikhmfuv
supabase functions deploy orina-receipt-sync-v1 --project-ref vcixsdudkizgfikhmfuv
supabase functions deploy make-server-b0d68fc8 --project-ref vcixsdudkizgfikhmfuv
supabase functions deploy orina-chat-v1 --project-ref vcixsdudkizgfikhmfuv
supabase functions deploy orina-order-autotime-v1 --project-ref vcixsdudkizgfikhmfuv
```

Database migrations are a separate production path from Edge Function deployment. Before any database push, run migration drift checks. If remote-only migrations appear, stop and reconcile before deploying. Do not treat the Edge Function workflow as a schema migration workflow.

## Required Approval Evidence

Frontend:

- exact committed SHA;
- clean working tree;
- release gate commands pass locally and in CI;
- branch protection or required-check evidence;
- Cloudflare Worker Builds target confirms `apporinaio`, GitHub `main`, build command `npm run build`, and output `dist`;
- no frontend-incompatible secrets are present in build variables.

Backend:

- affected Supabase functions identified;
- migration history aligned;
- Supabase CORS behavior matches repository docs;
- `npm run audit:supabase:security-definer` passes;
- `.github/workflows/supabase-production-deploy.yml` dispatch input values are known without exposing secrets;
- GitHub `production` environment approval is available for backend deployment;
- no production DB mutation is performed outside the approved path.

## Stop Conditions

Stop and do not approve when:

- candidate changes are uncommitted;
- public or authenticated metadata cannot verify branch protection;
- Cloudflare Worker Builds configuration cannot be verified;
- Supabase Edge Function deploy is attempted outside `.github/workflows/supabase-production-deploy.yml` without break-glass approval;
- Supabase migration history cannot be proven aligned;
- database migration is required but only Edge Function deployment authority is available;
- workflow SHA does not exactly match the approved backend commit;
- CORS returns wildcard origins for protected runtime routes;
- browser smoke finds unapproved origins;
- a dashboard prompts for confirmation;
- any secret value would need to be exposed to proceed.
