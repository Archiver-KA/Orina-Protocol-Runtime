# GitHub Branch Protection Governance

Last verified by Codex audit: 2026-05-13

## Status

Classification: OWNER_DECISION_REQUIRED

Repository evidence and read-only CDP inspection previously showed no visible GitHub rulesets. This file defines the required production governance target, but it does not mutate GitHub settings.

## Required Protection For `main`

The owner should configure a branch ruleset or branch protection rule for `main` that enforces:

- pull request review before merge
- required status checks before merge
- required branch to be up to date before merge when compatible with the release process
- stale approval dismissal after code changes
- no force pushes
- no branch deletion
- administrator bypass only if explicitly documented by the owner

Required status checks should use the exact check names GitHub reports after a successful workflow run. From repository workflow names, expected checks include:

- `Viewer Release Gate`
- `Supabase Security Audit`

`Connected Protocol Smoke` is manual-only and should not be required for ordinary pushes unless the owner provides a staffed self-hosted runner and explicit policy.

## Verification Command

Read-only verification:

```powershell
$env:GITHUB_BRANCH_PROTECTION_TOKEN='<read-only token>'
npm run verify:github-branch-protection -- --repo Archiver-KA/Orina-Protocol-Runtime --branch main
Remove-Item Env:\GITHUB_BRANCH_PROTECTION_TOKEN
```

Do not print token values. The verifier prints secret names only, never secret values.

## Risk If Deferred

`main` can be pushed or merged without repository-proven required-check enforcement. This does not prove that deployment is unsafe, but it means deployment governance depends on operator discipline rather than GitHub-enforced policy.

## Minimum Authority Required

Configuring protection requires GitHub repository administration authority. Verification requires only read-only metadata access.
