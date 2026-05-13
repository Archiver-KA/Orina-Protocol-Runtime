# Operational Governance Owner Decisions

Last verified by Codex audit: 2026-05-13

This register freezes operational residuals as explicit owner decisions. It does not invent owners, SLAs, RTOs, RPOs, escalation timelines, deployment topology, or production guarantees.

## Incident Response

Classification: OWNER_DECISION_REQUIRED

- Decision needed: define reporting intake, triage owner, severity taxonomy, escalation path, response timeline, and post-incident review process.
- Risk if deferred: security reports may be handled inconsistently or without documented accountability.
- Evidence needed: owner-approved incident response policy or maintainer-channel documentation.
- Minimum authority required: local documentation write after owner supplies facts.
- Safe owner-run command:

```powershell
rg -n "incident|vulnerability|report|escalation|severity|post-incident" README.md SECURITY.md docs supabase scripts
```

## Key Rotation

Classification: OWNER_DECISION_REQUIRED

- Decision needed: define rotation order, validation checks, rollback steps, dual-key windows if any, and approval authority for Supabase, JWT, Pinata, RapidAPI, Cloudflare, M2M delegate encryption, and CI secrets.
- Risk if deferred: emergency rotation may be incomplete, unsafe, or dependent on undocumented operator memory.
- Evidence needed: redacted key ownership matrix and owner-approved rotation runbook without secret values.
- Minimum authority required: local documentation write after owner supplies facts. Actual rotation would require separate secret/network-write authority and is out of scope here.
- Safe owner-run command:

```powershell
rg -n "rotate|rotation|key|secret|credential" README.md SECURITY.md docs scripts supabase
```

## Disaster Recovery Drills

Classification: OWNER_DECISION_REQUIRED

- Decision needed: define non-production drill target, backup validation method, drill cadence, evidence format, and success criteria.
- Risk if deferred: backup and restore capability remains unproven by repository evidence.
- Evidence needed: redacted dated drill output or owner-approved non-production drill plan.
- Minimum authority required: read-only review of redacted evidence; local documentation write for runbook updates.
- Safe owner-run command:

```powershell
rg -n "disaster|recovery|restore|rollback|drill|backup" README.md SECURITY.md docs supabase scripts
```

## Rollback

Classification: OWNER_DECISION_REQUIRED

- Decision needed: define application rollback authority, Cloudflare rollback path, Supabase Edge Function rollback path, database migration rollback limits, and post-rollback verification.
- Risk if deferred: failed deploy recovery may depend on undocumented operator knowledge.
- Evidence needed: owner-approved rollback runbook and redacted deployment history or tested rollback record.
- Minimum authority required: read-only evidence review; local documentation write after owner supplies facts.
- Safe owner-run command:

```powershell
rg -n "rollback|revert|emergency|deploy|migration drift" README.md SECURITY.md docs supabase scripts
```

## Recovery Objectives

Classification: OWNER_DECISION_REQUIRED

- Decision needed: define RTO, RPO, restore owner, backup source, and validation evidence for runtime and Supabase data.
- Risk if deferred: recovery capability remains script-backed but not objective-backed.
- Evidence needed: owner-approved RTO/RPO and redacted restore validation evidence.
- Minimum authority required: read-only review of redacted evidence; local documentation write for runbook updates.
- Safe owner-run command:

```powershell
rg -n "recovery|repair|restore|backfill|projection" README.md SECURITY.md docs supabase scripts package.json
```

## Environment Separation

Classification: OWNER_DECISION_REQUIRED

- Decision needed: define environment names, Supabase project refs, Cloudflare services, GitHub secret scopes, production/staging promotion order, and environment ownership.
- Risk if deferred: staging and production can drift or share credentials without repository-visible evidence.
- Evidence needed: redacted environment map showing variable names and project/service identifiers, not secret values.
- Minimum authority required: read-only metadata or owner-provided redacted export.
- Safe owner-run command:

```powershell
gh api repos/Archiver-KA/Orina-Protocol-Runtime/actions/secrets --jq ".secrets[].name"
```

## GitHub Branch Protection

Classification: OWNER_DECISION_REQUIRED

- Decision needed: configure and enforce `main` branch protection or a branch ruleset with required release-gate checks.
- Risk if deferred: pushes or merges to `main` may bypass required-check enforcement, leaving deployment governance dependent on operator discipline.
- Evidence needed: read-only branch protection or ruleset metadata showing required checks for `Viewer Release Gate` and `Supabase Security Audit`.
- Minimum authority required: GitHub repository administration authority to configure; read-only metadata authority to verify.
- Safe owner-run command:

```powershell
$env:GITHUB_BRANCH_PROTECTION_TOKEN='<read-only token>'
npm run verify:github-branch-protection -- --repo Archiver-KA/Orina-Protocol-Runtime --branch main
Remove-Item Env:\GITHUB_BRANCH_PROTECTION_TOKEN
```

See `docs/github-branch-protection-governance.md`.

## Supabase Backend Deployment Workflow

Classification: PARTIAL

- Decision needed: configure GitHub `production` environment protection and required secret names for `.github/workflows/supabase-production-deploy.yml`.
- Risk if deferred: Supabase backend deployment remains possible through local CLI operations rather than a GitHub environment-gated path.
- Evidence needed: GitHub environment protection metadata and secret-name inventory; no secret values.
- Minimum authority required: GitHub repository administration authority to configure environment protection and secrets; read-only metadata authority to verify.
- Safe owner-run command:

```powershell
gh api repos/Archiver-KA/Orina-Protocol-Runtime/environments/production
```

## Supplier CDN Policy

Classification: PARTIAL

- Decision needed: decide whether supplier media origins such as `https://s.alicdn.com` are approved, proxied, blocked, or sanitized against an allowlist.
- Risk if deferred: browser clients may request third-party supplier media origins outside the documented origin policy.
- Evidence needed: owner-approved long-term supplier media origin policy and any CSP/media proxy decision.
- Minimum authority required: local documentation/test update after owner decision; no secret or deployment authority.
- Safe owner-run command:

```powershell
npm run smoke:cdp:readonly-security
```

Current deployment smoke explicitly classifies `https://s.alicdn.com` as supplier media only. Long-term governance remains open.

## CORS Preview-Origin Ownership

Classification: OWNER_DECISION_REQUIRED

- Decision needed: define whether broad preview host patterns may be enabled in production through `ORINA_CORS_ALLOW_PREVIEW_ORIGINS`, and who approves that setting.
- Risk if deferred: operators may enable broad preview origins without documented approval or review.
- Evidence needed: redacted Edge Function environment export showing whether preview-origin enablement is set; values are not required.
- Minimum authority required: read-only environment metadata or owner-provided redacted export.
- Safe owner-run command:

```powershell
rg -n "ORINA_CORS_ALLOW_PREVIEW_ORIGINS|ORINA_CORS_ENV|vercel\\.app|netlify\\.app|workers\\.dev|supabase\\.co" supabase docs scripts README.md SECURITY.md
```
