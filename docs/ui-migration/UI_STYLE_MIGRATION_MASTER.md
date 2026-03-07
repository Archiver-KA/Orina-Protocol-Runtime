# UI Style Migration Master (ATP2)

## Scope Lock
- Target repo: `C:\ORINA\ATPProtocol2\ATP2`
- Source style baseline: `C:\UiOrinaApp-main\UiOrinaApp-main`
- Mode: dark-first, UI-only (no business logic changes)
- Legacy cleanup policy: remove `@/imports/*` only in touched files
- Source lock: `UiOrinaApp-main` is reference-only for this migration pass; all code edits must stay in `ATP2`.

## Rollout Order
1. CP-00 Baseline inventory + scope lock
2. CP-01 Core style system sync
3. CP-02 Legacy import cleanup (logo/avatar)
4. CP-03 Overview
5. CP-04 Orders
6. CP-05 Marketplace
7. CP-06 Minting
8. CP-07 Assets
9. CP-08 Messages
10. CP-09 Community
11. CP-10 History
12. CP-11 Profile
13. CP-12 Settings
14. CP-13 Final cleanup

## Checkpoint Status
| Checkpoint | Status | Notes |
|---|---|---|
| CP-00 | Completed | Baseline and migration docs created |
| CP-01 | Completed | Core style/theme wiring synced safely |
| CP-02 | Completed | Legacy imports removed from touched files |
| CP-03 | In Progress | Shell baseline done (native bar + left sidebar), per-page hardcode cleanup continues |
| CP-04 | Pending | - |
| CP-05 | Pending | - |
| CP-06 | Pending | - |
| CP-07 | Pending | - |
| CP-08 | Pending | - |
| CP-09 | Pending | - |
| CP-10 | Pending | - |
| CP-11 | Pending | - |
| CP-12 | Pending | - |
| CP-13 | Pending | - |

## Validation Gates (Applied Per Checkpoint)
- Build gate: `npm run build`
- Visual dark-mode gate:
  - Text color not black in dark surfaces
  - Background/card/modal/dropdown follow tokenized system
  - Border rules match style guide (some elements borderless by design)
- Import gate:
  - Removed import tracked in matrix
  - Replacement import tracked in matrix
