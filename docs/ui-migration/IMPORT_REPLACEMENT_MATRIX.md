# Import Replacement Matrix (UI Migration)

## Rules
- Log every removed UI import.
- Log replacement import (or explicit removal without replacement).
- Keep mapping tied to checkpoint ID.

## Imports Removed
| File | Old Import | Reason | Step |
|---|---|---|---|
| `src/app/components/left-sidebar.tsx` | `@/imports/Frame2147226440` | Legacy generated import; move to internal brand component | CP-02 |
| `src/app/components/user-avatars.tsx` | `@/imports/svg-y3s4ijjc4m` | Legacy generated path table; move to internal avatars module | CP-02 |

## Imports Replaced
| File | New Import | Replacement Source | Style Guide Mapping |
|---|---|---|---|
| `src/app/components/left-sidebar.tsx` | `@/app/components/brand/OrinaMark` | `src/app/components/brand/OrinaMark.tsx` | Native sidebar/logo system |
| `src/app/components/user-avatars.tsx` | `@/app/components/avatars/avatar-paths` | `src/app/components/avatars/avatar-paths.ts` | Internal avatar asset module |

## Pending Cleanup Candidates
| Area | Candidate | Decision |
|---|---|---|
| Global UI styling | hardcoded color utility classes | Remove gradually by page checkpoints |
| Legacy generated files | `src/imports/*` leftovers | Delete only after all references are removed |
