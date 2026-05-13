---
name: orina-production-deployment
description: Standardize safe Orina Runtime production deployment preparation, flow review, approval gates, and CI/CD handoff. Use when Codex is asked to prepare, review, approve, troubleshoot, or trigger Orina Protocol Runtime deployment through GitHub main to Cloudflare Worker Builds and Supabase.
---

# Orina Production Deployment

Use this skill for production-bound Orina Runtime deployment work. Treat deployment as high risk. Prefer read-only evidence first, then local verification, then owner approval, then CI/CD handoff.

## Non-Negotiable Rules

- Do not deploy, push, publish, sign, mutate infrastructure, mutate Supabase, mutate Cloudflare, mutate GitHub settings, or change secrets unless the user grants that exact authority in the current turn.
- Do not read, print, copy, or store secret values, browser tokens, cookies, wallet secrets, seed phrases, private keys, recovery phrases, or encrypted vault contents.
- Do not approve deployment when the working tree is dirty, the candidate commit is not exact, required verification failed, branch protection is unverified, browser smoke has an unapproved exception, or the CI/CD path is unclear.
- If a wallet, GitHub, Cloudflare, or Supabase confirmation dialog appears, stop and report the exact requested action without confirming it.
- Deployment must be performed by the owner-approved CI/CD path, not by ad-hoc local commands.

## Standard Flow

Read [deployment-flow.md](references/deployment-flow.md) before making a deployment decision.

Frontend:

1. Commit the release candidate to `main` after review.
2. Let GitHub run `Protocol Release Gate`.
3. Let Cloudflare Worker Builds deploy Worker `apporinaio` from GitHub `main`.
4. Verify `https://app.orina.io`.

Backend:

1. Confirm Supabase migration history is aligned.
2. Deploy only the required Supabase functions through the owner-approved Supabase path.
3. Follow the split-function order when multiple functions changed.
4. Verify CORS, security-definer audit, auth bridge, and affected function routes.

## Required Local Gates

Run these before approval:

```powershell
npm ci
npm run test
npm run typecheck
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

Run `npm run verify:github-branch-protection` only when an explicit read-only token is available. Do not print token values.

## Port 9222 Review

Use Chrome DevTools Protocol only for read-only inspection:

```powershell
node .codex/skills/orina-production-deployment/scripts/inspect-cdp-deployment-tabs.mjs
```

Allowed:

- inspect visible dashboard route, title, and redacted page labels;
- verify the expected Cloudflare, GitHub, and Supabase pages are open;
- inspect network/status evidence that does not expose secrets.

Forbidden:

- click Deploy, Retry, Rollback, Publish, Save, Update, Confirm, or similar actions;
- inspect or print cookies, localStorage values, sessionStorage values, auth fragments, tokens, vaults, or secret values;
- confirm wallet, GitHub, Cloudflare, or Supabase prompts.

## Approval Decision

Approve only by writing an explicit approval record, not by deploying directly.

Use `APPROVED_FOR_CI_CD_DEPLOYMENT` only when all are true:

- exact commit SHA is known and includes the full release candidate;
- working tree is clean;
- all required local gates passed;
- SBOM and unsigned release manifest are generated;
- branch protection and required checks are verified, or owner supplies redacted evidence;
- browser smoke passes, or the owner explicitly approves a named exception;
- backend Supabase deploy path and affected functions are known;
- rollback authority and stop conditions are recorded;
- owner explicitly approves the exact commit, branch, workflow/path, and production environment.

Otherwise use `NOT_APPROVED` or `BLOCKED`, list exact blockers, and stop.

## Artifacts To Update

- `RELEASE_CANDIDATE.md`
- `AUDIT_REPORT.md`
- `audit/deployment-approval-contract.json`
- `audit/deployment-flow-analysis.md` when reviewing GitHub/Cloudflare/Supabase flow

Keep all evidence redacted. Record secret names only when needed; never record values.
