# CP-01 Core Style System Sync

## Imports Removed
| File | Import cũ | Lý do loại | Step |
|---|---|---|---|
| N/A | N/A | No legacy import removal in this step | CP-01 |

## Imports Replaced
| File | Import mới | Nguồn thay thế | Mapping style guide |
|---|---|---|---|
| `src/main.tsx` | `ThemeProvider` | `src/app/contexts/ThemeContext.tsx` | Global theme token provider |

## UI Elements Removed/Cleaned
| Trang | UI cũ bị loại | Token/primitive thay thế |
|---|---|---|
| Global | Direct dark attribute bootstrap in `main.tsx` | ThemeProvider dark-first bootstrapping |

## Applied Changes
- Added `src/app/contexts/ThemeContext.tsx`.
- Wired `ThemeProvider` at app root (`src/main.tsx`).
- Root cause fix: theme engine now sets both `data-theme` and `.dark` class on `<html>` so `dark:` variants work consistently.
- Kept ATP2 compatibility tokens/classes in existing theme layer to avoid UI regression.

## Validation Gate
- Build pass/fail: **PASS** (`npm run build`, 2026-03-03)
- Visual checklist: **PASS (core theme wiring)** for dark bootstrap consistency
- Regression note: UI-only root-level theme wiring
