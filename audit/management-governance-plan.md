# Management Governance Plan

Audit date: 2026-05-13

This plan addresses the management issues identified after the production deployment. It does not mutate GitHub branch protection, Cloudflare settings, Supabase settings, CI secrets, or production data.

## Summary

| Item | Classification | Repository Action | Remaining Owner Action |
| --- | --- | --- | --- |
| ESLint baseline | IMPLEMENTED | Added exact dev-only ESLint tooling, `eslint.config.js`, `npm run lint:check`, CI enforcement, and docs. | Expand lint rules only through staged baselines. |
| Release provenance artifacts | IMPLEMENTED | Release gate now uploads SBOM and unsigned manifest artifacts. | Decide signing identity, custody, and enforcement before signed releases. |
| Supabase backend deployment workflow | PARTIAL | Added manual `Supabase Production Deploy` workflow with production environment gate, exact commit confirmation, migration alignment check, audits, split-function deploy, and post-deploy CORS/health checks. | Configure GitHub `production` environment protection and required secrets. |
| GitHub branch protection | OWNER_DECISION_REQUIRED | Added governance doc and retained read-only verifier. | Configure `main` ruleset/branch protection requiring release checks. |
| Supplier CDN policy | PARTIAL | Production smoke explicitly classifies `https://s.alicdn.com` as supplier media. | Choose long-term approve/proxy/block/sanitize policy. |
| Operational owner decisions | PARTIAL | Updated owner-decision register with branch protection and Supabase workflow records. | Fill incident, key rotation, recovery, rollback, environment, and drill facts. |

## Execution Order

1. Owner configures GitHub `main` branch protection or ruleset.
2. Owner configures GitHub `production` environment protection.
3. Owner configures required secret names for `Supabase Production Deploy`.
4. Run read-only branch protection verification.
5. Run the normal release gate on pull request or branch.
6. Use `Supabase Production Deploy` only through `workflow_dispatch` with:
   - exact approved commit SHA
   - approval record
   - `DEPLOY_SUPABASE_PRODUCTION` confirmation
7. Continue frontend deployment through GitHub `main` -> Cloudflare Worker Builds.

## Stability Gates

Required local gates for this management pass:

- `npm ci`
- `npm run test`
- `npm run typecheck`
- `npm run lint:check`
- `npm run security:check-client-secrets`
- `npm run security:scan`
- `npm run audit:supabase:security-definer`
- `npm run verify:repo-tooling`
- `npm run verify:marketplace-freshness`
- `npm run verify:assurance-invariants`
- `npm run verify:viewer-release`
- `npm run verify:deterministic-build`
- `npm run security:sbom`
- `npm run release:manifest`
- `npx supabase migration list --linked | npm run verify:supabase-migration-list -- <captured-output>`

## Residual Risk

- Branch protection cannot be closed from repository evidence alone.
- GitHub environment protection cannot be closed from repository evidence alone.
- Signed releases remain an owner decision.
- Supplier media policy remains partial until the owner chooses the long-term handling model.
