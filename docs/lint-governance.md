# Lint Governance

Last verified by Codex audit: 2026-05-13

## Status

Classification: PARTIAL

This repository does not currently define an ESLint, Biome, Oxlint, or equivalent lint stack. No lint command is enforced in CI because there is no existing repository-standard linter dependency or configuration to run.

## Decision Needed

An owner must choose:

- lint tool
- rule baseline
- generated-file exclusions
- warning versus error policy
- CI enforcement timing
- suppression policy

## Constraints

- Lint tooling must be dev-only.
- Production dependencies must not be added for linting.
- A first lint baseline must not autoformat or rewrite the repository.
- CI must not fail on lint until the selected baseline passes cleanly.
- Suppressions require a written reason tied to a specific rule and file.

## Risk If Deferred

Lint-detectable issues remain covered only by tests, build checks, typecheck baseline, and existing security scripts. The repository has no machine-enforced style or general static-analysis rule set beyond those commands.

## Minimum Authority Required

Owner decision first. After a tool is selected, local repository write access and dev-only package installation are sufficient. No production credential, deployment permission, signing authority, wallet access, or secret access is required.

## Safe Owner-Run Evidence

Before adding a linter, an owner can run:

```powershell
npm run verify:repo-tooling
rg --files -g "eslint*" -g ".eslintrc*" -g "biome*" -g "oxlint*"
```

Expected current result: `verify:repo-tooling` reports lint governance as partial because this file exists, but no lint command is available until a linter is selected.
