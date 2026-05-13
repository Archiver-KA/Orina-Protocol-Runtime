# Orina Deployment Flow Reference

## Repository Evidence

- Frontend runtime repo: `https://github.com/Archiver-KA/Orina-Protocol-Runtime`
- Production branch: `main`
- Frontend hostname: `https://app.orina.io`
- Cloudflare Worker service: `apporinaio`
- Worker config: `wrangler.jsonc`
- Verification workflow: `.github/workflows/protocol-release-gate.yml`
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

Repository evidence defines Supabase runtime components but does not define a GitHub Actions deployment job for Supabase production.

Project ref from docs:

- `vcixsdudkizgfikhmfuv`

Split function order for multi-function deploys:

```bat
supabase functions deploy orina-auth-bridge-v1 --project-ref vcixsdudkizgfikhmfuv
supabase functions deploy orina-ai-m2m-v2 --project-ref vcixsdudkizgfikhmfuv
supabase functions deploy orina-seller-minting-v1 --project-ref vcixsdudkizgfikhmfuv
supabase functions deploy orina-receipt-sync-v1 --project-ref vcixsdudkizgfikhmfuv
supabase functions deploy make-server-b0d68fc8 --project-ref vcixsdudkizgfikhmfuv
```

Before any database push, run migration drift checks. If remote-only migrations appear, stop and reconcile before deploying.

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
- owner-approved Supabase deployment path is known;
- no production DB mutation is performed outside the approved path.

## Stop Conditions

Stop and do not approve when:

- candidate changes are uncommitted;
- public or authenticated metadata cannot verify branch protection;
- Cloudflare Worker Builds configuration cannot be verified;
- Supabase deployment path is manual or unspecified and owner has not approved it;
- CORS returns wildcard origins for protected runtime routes;
- browser smoke finds unapproved origins;
- a dashboard prompts for confirmation;
- any secret value would need to be exposed to proceed.
