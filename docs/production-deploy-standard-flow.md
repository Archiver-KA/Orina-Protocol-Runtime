# Production Deploy Standard Flow

This is the standard operator flow for Orina Runtime production deploys. It keeps database migration, frontend promotion, and Supabase Edge Function deployment behind explicit checks and the GitHub production workflow.

## Required GitHub Secret Names

GitHub Actions must have these names configured before dispatching `Supabase Production Deploy`:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_AUDIT_URL`
- `VITE_SUPABASE_ANON_KEY`

`SUPABASE_DB_AUDIT_URL` must be a real Postgres connection URL, not a placeholder. It must parse as `postgres://` or `postgresql://`, include username, password, hostname, and an explicit port. If the database password contains reserved URL characters, URL-encode the password segment before saving the secret.

For local dispatch tooling, set one GitHub token name in `.env` or the process environment:

- preferred: `GITHUB_ACTIONS_DEPLOY_TOKEN`
- accepted fallback: `GITHUB_BRANCH_PROTECTION_TOKEN`
- CI fallback: `GITHUB_TOKEN`

The token must be able to read workflow runs and create `workflow_dispatch` events. If it is also used to inspect secret names, it needs read access to Actions secrets metadata.

## Standard Commands

Run local release gates before approval:

```powershell
npm ci
npm run test
npm run typecheck
npm run lint:check
npm run security:check-client-secrets
npm run security:scan
npm run audit:supabase:security-definer
npm run verify:repo-tooling
npm run verify:marketplace-freshness
npm run verify:viewer-release
npm run verify:deterministic-build
npm run verify:assurance-invariants
npm run security:sbom
npm run release:manifest
```

Before production dispatch, run:

```powershell
npm run deploy:production:preflight
```

This checks required local secret names, `SUPABASE_DB_AUDIT_URL` shape, clean `main`, `HEAD == origin/main`, and required GitHub Actions secret names.

After owner approval for the exact `main` commit:

```powershell
npm run deploy:production:supabase
```

This dispatches `.github/workflows/supabase-production-deploy.yml`, polls the workflow until completion, and verifies production backend health/CORS.

For a read-only backend check after a deploy:

```powershell
npm run deploy:production:verify-backend
```

## Stop Conditions

Stop before dispatch when any of these are true:

- working tree is dirty;
- local `HEAD` does not match `origin/main`;
- `SUPABASE_DB_AUDIT_URL` does not parse as a Postgres URL;
- GitHub Actions is missing required deployment secret names;
- branch protection verification fails;
- migration history is not aligned before applying a migration;
- owner has not approved the exact commit and production workflow path.

Stop after dispatch if the workflow fails. Do not switch to local Edge Function deploy unless the owner explicitly approves a break-glass path.
