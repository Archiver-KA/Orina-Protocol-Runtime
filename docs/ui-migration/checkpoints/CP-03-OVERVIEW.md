# CP-03 Overview (Main Content + Right Sidebar + Related Header/Sidebar)

## Imports Removed
| File | Import cũ | Lý do loại | Step |
|---|---|---|---|
| N/A | N/A | No import removal in this step (styling only) | CP-03 |

## Imports Replaced
| File | Import mới | Nguồn thay thế | Mapping style guide |
|---|---|---|---|
| N/A | N/A | Styling checkpoint | CP-03 |

## UI Elements Removed/Cleaned
| Trang | UI cũ bị loại | Token/primitive thay thế |
|---|---|---|
| Overview | Hardcoded dark text/background mismatches | Tokenized `text-ui-*`, `bg-ui-*`, `border-ui-*` |
| Overview | Inconsistent dropdown/button/card borders | Standardized style-guide border rules |

## Applied Changes (Current Pass)
- Stabilized dark-mode rendering for Overview stack by enabling `.dark` class synchronization in global theme provider.
- Kept existing tokenized Overview layout (`main-content`, `market-volume-chart`, `right-sidebar`, `navbar`) unchanged to avoid logic regressions.
- Synced global shell style from `UiOrinaApp-main` for shared components that appear across pages:
  - Native bar height `80px` (`--t-shell-nav-h`)
  - Native bar blur `8px`
  - Native bar background `rgba(18,18,18,0.74)` and border `rgba(255,255,255,0.1)`
  - Left sidebar border + spacing aligned to shell tokens
  - Left sidebar active state changed to style-guide teal tint (`rgba(44,194,149,0.1)` + text `#2CC295`)
- Applied shell baseline to app main container: `bg-ui-page text-ui-secondary`.
- Fixed shell spacing mismatch (native bar vs left sidebar):
  - Added shared shell spacing tokens in `theme.css`:
    - `--t-shell-nav-x: 20px`
    - `--t-shell-sidebar-header-x: 20px`
    - `--t-shell-sidebar-section-p: 16px`
  - Standardized sidebar shell width tokens:
    - `--t-shell-sidebar-w: 212px`
    - `--t-shell-sidebar-collapsed-w: 72px`
  - Updated `navbar.tsx` to consume `--t-shell-nav-x` for horizontal padding.
  - Updated `left-sidebar.tsx` to consume shell tokens for header/list/footer spacing and use full-width shell dividers for cleaner alignment with navbar border line.
  - Updated shell fallback width in `App.tsx` (`72px / 212px`) to stay consistent with tokenized sidebar sizing.

### Step Log: CP-03.SB-02 (Left Sidebar parity with UiOrinaApp-main)
- Reference checked:
  - `C:\UiOrinaApp-main\UiOrinaApp-main\src\app\components\InteractiveDemo.tsx` (sidebar card nav item spacing/states)
- UI updates applied in ATP2 `left-sidebar.tsx`:
  - Sidebar border tone switched to `var(--t-sidebar-border)` to avoid bright white edge in dark mode.
  - Nav item spacing aligned to source pattern:
    - expanded: `gap-3 px-4 py-2.5`
    - collapsed: `h-10`
  - Nav label typography aligned:
    - size `13px`
    - active `font-bold`, inactive `font-medium`
  - Active/hover states preserved to source system:
    - active `rgba(44,194,149,0.1)` + `#2CC295`
    - hover `var(--t-surface-10)`
  - Header/footer separator lines use `var(--t-sidebar-border)` for consistent shell contrast.
- Shell width consistency update:
  - `--t-shell-sidebar-w` changed to `220px` in `theme.css` (closer to source shell ratio).
  - `App.tsx` fallback width updated to `220px` for grid consistency.

### Step Log: CP-03.SB-03 (Left Sidebar card-shell match against reference image)
- Reference checked:
  - User-provided sidebar image (helix card style)
  - `C:\UiOrinaApp-main\UiOrinaApp-main\src\app\components\InteractiveDemo.tsx` sidebar block
- UI updates applied in ATP2 `left-sidebar.tsx`:
  - Reworked sidebar layout to card-shell structure:
    - outer shell `bg-ui-page`
    - inner card `rounded-[24px] bg-ui-card backdrop-blur-[8px]`
  - Added section heading area under logo row (`Components`) with style-guide uppercase label treatment.
  - Kept ATP2 navigation items/logic intact; only presentation updated.
  - Aligned nav item geometry and typography to reference:
    - `text-[13px]`, `px-3 py-2.5`, rounded `12px`, active teal pill.
  - Preserved collapsed mode behavior and tooltips (UI-only).

### Step Log: CP-03.SB-04 (Remove `Components` line in Left Sidebar)
- User-requested UI tweak: remove the section label line `Components` from left sidebar.
- Change applied:
  - Removed label block from `left-sidebar.tsx`.
  - Added list top padding (`12px`) in expanded mode to keep visual spacing after divider.
- Scope: UI-only (no navigation/state/logic changes).

### Step Log: CP-03.SB-05 (Sidebar spacing override audit + normalization)
- Issue observed: sidebar spacing looked inconsistent after card-shell migration, with risk of base/global style interference.
- Override audit:
  - Checked `left-sidebar.tsx` + `theme.css` (`.sidebar-btn`, shell tokens, base button typography).
  - No logic-level override found; risk was presentation drift from mixed fixed-height header and inherited button/base line-height.
- UI fixes applied:
  - Sidebar header switched from fixed-height expanded mode to card-style static spacing (`px-5 pt-6 pb-5`) for predictable vertical rhythm.
  - Nav list top padding normalized to `14px` (expanded) after divider.
  - Added explicit `bg-transparent` and `leading-[1.3]` on sidebar nav/collapse labels to prevent visual drift from global button typography.
- Scope: UI-only (no state/API/event/business logic changes).

### Step Log: CP-03.SB-06 (Left Sidebar color parity: background/card/text)
- Reference checked:
  - `C:\UiOrinaApp-main\UiOrinaApp-main\src\app\contexts\ThemeContext.tsx`
  - `C:\UiOrinaApp-main\UiOrinaApp-main\src\app\components\StyleGuide.tsx` (sidebar/nav active-hover color behavior)
- UI updates applied in ATP2:
  - `left-sidebar.tsx`
    - Sidebar card surface changed to shell tone (`bg-ui-sidebar`) with subtle border (`var(--t-sidebar-border)`) for clearer card separation.
    - Brand text moved to stronger text token (`text-ui-strong`) for reference-consistent contrast.
    - Hover background aligned to reference hover token (`var(--t-surface-hover)`) for nav rows and collapse action.
  - `theme.css` (dark tokens aligned to UiOrinaApp-main)
    - `--t-card-bg: rgba(255,255,255,0.035)`
    - `--t-surface-hover: rgba(255,255,255,0.06)`
    - `--t-text-muted: #4a4a4a`
- Scope: UI-only color calibration, no logic/state changes.

### Step Log: CP-03.SB-07 (Left Sidebar text color alignment with Style Guide)
- Reference checked:
  - `C:\UiOrinaApp-main\UiOrinaApp-main\src\app\components\StyleGuide.tsx`
  - `C:\UiOrinaApp-main\UiOrinaApp-main\src\app\contexts\ThemeContext.tsx`
- Text color correction applied in ATP2 `left-sidebar.tsx`:
  - Brand title color changed from `text-ui-strong` to `text-ui-primary` to match style-guide hierarchy (`primary #f1f5f9`).
  - Nav items remain style-guide mapping:
    - active `#2cc295`
    - inactive `text-ui-secondary` (`#cbd5e1`)
- Scope: UI-only text color fix; no behavior/state/API change.

### Step Log: CP-03.SB-08 (Sidebar card separator tone = Ghost Button hover)
- User correction applied: use exact `Ghost Button hover` tone for sidebar card separator/background layer.
- UI update:
  - `left-sidebar.tsx` card shell background changed from `var(--t-surface-5)` to `var(--color-button-secondary-bg-hover)`.
- Scope: UI-only token alignment; no functional/state changes.

### Step Log: CP-03.SB-09 (Left Sidebar size + style realignment to attached page reference)
- Reference checked:
  - `C:\UiOrinaApp-main\UiOrinaApp-main\src\app\components\InteractiveDemo.tsx` (left sidebar shell)
  - User-provided full-page screenshot
- UI updates applied:
  - Sidebar width aligned to reference:
    - `--t-shell-sidebar-w: 248px` in `theme.css`
    - `App.tsx` fallback grid width updated from `220px` to `248px`
  - `left-sidebar.tsx` visual style remapped to reference tokens:
    - Card background set to `var(--t-card-bg)`
    - Divider/section line set to `var(--t-border-subtle)`
    - Nav hover surface set to `var(--t-surface-10)`
    - Expanded shell spacing adjusted to `py-10 pl-6 pr-4`, card `p-5`, header/nav spacing aligned to source pattern
  - Kept existing ATP2 navigation behavior and collapse action intact (UI-only restyle).
- Scope: UI-only (size, color, spacing, style), no state/business logic changes.

## Style Mapping (Source -> ATP2)
| Source (UiOrinaApp-main) | Applied in ATP2 |
|---|---|
| `--t-nav-bg: rgba(18,18,18,0.74)` | `src/styles/theme.css` + shell components |
| `--t-nav-border: rgba(255,255,255,0.1)` | `src/styles/theme.css` + navbar border |
| Top nav `h-[80px]` | `Navbar` + `LeftSidebar` header use `--t-shell-nav-h` |
| Sidebar hover/active teal system | `left-sidebar.tsx` nav item states |
| Dark shell spacing consistency | `App.tsx` main shell baseline |

## Validation Gate
- Build pass/fail: **PASS** (`npm run build`, 2026-03-03)
- Visual checklist: **Pass (shell spacing baseline)** after navbar/sidebar token unification
- Regression note: UI-only changes
