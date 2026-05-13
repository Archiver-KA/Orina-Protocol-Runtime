# Lint Governance

Last verified by Codex audit: 2026-05-13

## Status

Classification: IMPLEMENTED

Owner decision: ESLint.

This repository now defines a minimal ESLint baseline:

```powershell
npm run lint:check
```

The command runs `eslint . --max-warnings=0` using `eslint.config.js`.

## Installed Tooling

Dev-only dependencies:

- `eslint`
- `@eslint/js`
- `typescript-eslint`
- `globals`

Removal command:

```powershell
npm uninstall --save-dev eslint @eslint/js typescript-eslint globals
```

No production dependency was added for linting.

## Baseline Scope

The first enforced baseline is intentionally narrow. It checks JavaScript, TypeScript, and TSX files for hazardous constructs and syntax hygiene without introducing broad style churn.

Enforced examples:

- no `debugger`
- no `eval`
- no implied eval
- no `new Function`
- no `javascript:` URLs
- no `with`
- no literal throws
- no unsafe `finally`
- no direct `hasOwnProperty` prototype calls

Deliberately deferred:

- formatting rules
- import ordering
- unused variable enforcement
- broad TypeScript-aware semantic rules
- React style conventions

## CI Enforcement

`Protocol Release Gate` runs `npm run lint:check` after the typecheck baseline and before the security scan.

## Suppression Policy

No broad suppressions were added for the baseline. Future suppressions require a written reason tied to a specific file and rule.

## Risk If Deferred

The remaining lint risk is limited to rules not yet enabled. Those should be added only after measuring baseline impact and avoiding mass refactors.
