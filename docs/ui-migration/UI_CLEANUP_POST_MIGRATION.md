# UI Cleanup Post Migration

## Purpose
Track final removal of obsolete UI styles/imports after all checkpoints are completed and UI is stable.

## Legacy Import Removal Plan (Run Only After Full UI Completion)
`IMPORTANT`: Do not run this plan until all pages are visually signed off.

1. Freeze UI scope:
- No new UI refactor PRs while cleanup is running.
- Merge latest `main` before scanning.

2. Scan for legacy import patterns:
- Generated imports: `src/imports/*`
- Old direct style imports bypassing theme system
- Alias drift (`../../imports/*`, `@/imports/*`, duplicated icon path tables)

Reference commands:
```bash
rg -n "@/imports|\\.\\./\\.\\./imports|src/imports" src
rg -n "from '.*imports/|from \".*imports/" src
```

3. Remove only unused legacy imports:
- Delete import lines first.
- Resolve with existing internal modules under:
  `src/app/components/ui/*`
  `src/app/components/brand/*`
  `src/app/components/avatars/*`

4. Verify dead-file candidates:
- Candidate set: `src/imports/*`
- Delete files only when reference count is zero.

5. Post-cleanup gate (mandatory):
- `npm run build` passes.
- Smoke check pages: `overview`, `orders`, `marketplace`, `assets`, `community`, `messages`, `profile`, `settings`.
- No visual regression in navbar/sidebar/right-sidebar/dropdown/modals.

6. Update ledgers:
- Add every removed import to `docs/ui-migration/IMPORT_REPLACEMENT_MATRIX.md`.
- Mark this checklist as completed only after build + smoke pass.

## Cleanup Ledger
| Item | Status | Notes |
|---|---|---|
| Remove remaining dead legacy imports | Pending | Execute after CP-13 |
| Remove unused generated files under `src/imports` | Pending | Only when reference count = 0 |
| Remove deprecated hardcoded classes outside style guide | Pending | Verified per page checkpoints |

## Final Validation Checklist
- Dark mode typography/colors consistent across all pages.
- Card/dropdown/modal/button border system consistent.
- No UI regressions in key flows.
- Build passes.
