# CP-02 Legacy Import Cleanup (Logo/Avatar)

## Imports Removed
| File | Import cũ | Lý do loại | Step |
|---|---|---|---|
| `src/app/components/left-sidebar.tsx` | `@/imports/Frame2147226440` | Generated legacy logo import | CP-02 |
| `src/app/components/user-avatars.tsx` | `@/imports/svg-y3s4ijjc4m` | Generated legacy avatar paths import | CP-02 |

## Imports Replaced
| File | Import mới | Nguồn thay thế | Mapping style guide |
|---|---|---|---|
| `src/app/components/left-sidebar.tsx` | `@/app/components/brand/OrinaMark` | `src/app/components/brand/OrinaMark.tsx` | Native bar branding component |
| `src/app/components/user-avatars.tsx` | `@/app/components/avatars/avatar-paths` | `src/app/components/avatars/avatar-paths.ts` | Internal avatar paths module |

## UI Elements Removed/Cleaned
| Trang | UI cũ bị loại | Token/primitive thay thế |
|---|---|---|
| Global sidebar | Generated logo component in `src/imports` | Internal brand component |
| Profile/Wallet avatar usage | Generated paths import in `src/imports` | Internal avatars module |

## Applied Changes
- Added `src/app/components/brand/OrinaMark.tsx`.
- Added `src/app/components/avatars/avatar-paths.ts`.
- Updated imports in touched components to avoid `@/imports/*`.
- Verified no remaining `@/imports/*` references in `src`.

## Validation Gate
- Build pass/fail: **PASS** (`npm run build`, 2026-03-03)
- Visual checklist: **PASS** (logo/avatar rendering path unchanged)
- Regression note: SVG output preserved, logic unchanged
