# Type Safety Baseline

Last verified by Codex audit: 2026-05-13

## Status

Classification: PARTIAL

The repository now has a dev-only TypeScript no-emit baseline:

```powershell
npm run typecheck
```

The baseline is intentionally narrow. It checks the route parsing/building surface and its tests with `strict: false`, `skipLibCheck: true`, `allowJs: false`, `isolatedModules: true`, `jsx: react-jsx`, and `noEmit: true`.

## Why The Baseline Is Narrow

A first broad no-emit run over `src/**/*.ts` and `src/**/*.tsx` found many existing type errors. The largest categories were:

- Make/Supabase-style absolute imports such as `/utils/runtimeConfig` and `/utils/supabase/*` without repository TypeScript declarations.
- UI component prop mismatches and callback return mismatches.
- domain model shape drift between marketplace/order/profile types.
- Wagmi/Viem generic and call-parameter type drift.
- browser/runtime environment globals that need scoped ambient declarations.

Those are migration findings, not safe broad fixes for this pass. The baseline therefore starts with a passing, enforceable subset rather than adding broad suppressions or changing runtime behavior.

## Migration Plan

1. Add typed declarations for generated or platform-provided modules such as `/utils/runtimeConfig` and `/utils/supabase/*`.
2. Add one stable domain surface at a time to `tsconfig.check.json`.
3. Fix only the errors surfaced by the newly included surface.
4. Keep `strict: false` until the included surface passes.
5. Enable CI enforcement only for a passing baseline.
6. Consider `strict: true` only after the broad non-strict baseline passes without suppressions.

## Constraints

- Typecheck tooling remains dev-only.
- Runtime Vite behavior must not change.
- Do not add broad `@ts-ignore`, `@ts-expect-error`, or `ts-nocheck` suppressions.
- Do not mass-refactor unrelated surfaces just to expand the baseline.

## Evidence

- `typescript`, `@types/node`, `@types/react`, and `@types/react-dom` are exact dev dependencies.
- `tsconfig.check.json` is separate from Vite build configuration.
- `npm run typecheck` passes for the current baseline.
