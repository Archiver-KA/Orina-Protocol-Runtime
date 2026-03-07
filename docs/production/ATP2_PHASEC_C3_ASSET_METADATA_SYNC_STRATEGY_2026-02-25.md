# ATP2 Phase C / C3 Asset Metadata Realtime Behavior Strategy (2026-02-25)

## Status
- ✅ Strategy locked (implementation next)
- Phase: `C3` Asset Metadata Realtime Behavior
- Depends on: `CP-C2` PASS

## 1. Objective
- Make asset metadata changes visible consistently across:
  - `Marketplace`
  - `Search`
  - `Favorites`
  - `Watchlist`
  - `My Assets` (owned fixture cards consume metadata where relevant)
- Avoid duplicate/overwriting behavior already fixed in `C1/C2`.

## 2. Chosen Strategy (C3 v1)
### 2.1 Default path: Pull + Invalidate (no hard realtime dependency)
- Use **event-driven invalidation + targeted rehydrate** as baseline.
- Avoid introducing Supabase Realtime subscriptions for asset metadata in the same batch.
- Rationale:
  - smaller blast radius
  - easier debugging under hardened RLS + bridge routes
  - enough to pass 2-browser consistency with refresh/reopen

### 2.2 Event contract (client-side)
- Emit local no-payload events on successful metadata seed/update:
  - proposed event: `orina:asset-metadata-changed`
- Consumers self-refresh relevant slices:
  - favorites/watchlist asset detail resolution cache
  - marketplace/search list cache
  - asset detail page cache (if open)

### 2.3 Cross-browser behavior (required)
- Browser B must see metadata changes after:
  - manual refresh (required gate)
  - reopen page/navigation (required gate)
- True push realtime without refresh:
  - optional / future enhancement after C3 baseline passes

## 3. Merge / Cache Rules (Asset Metadata)
### 3.1 Source priority
- Remote persisted metadata (Supabase) is authoritative for:
  - title
  - cover image
  - gallery/media
  - tags
  - attributes
  - `is_active`
- Local fixture/mock is fallback only when remote row not available.

### 3.2 Namespace separation (must preserve)
- `asset-*` = on-sale / listing namespace
- `twf-*` = owned fixture namespace
- Never coerce one namespace to the other during hydrate/merge.

### 3.3 Local ID map usage
- Use `orina_supabase_map_asset_*` cache as optimization only.
- If map missing/stale:
  - retry select by `asset_uid`
  - seed via bridge route if needed
  - re-read and re-cache

## 4. C3 Implementation Plan (narrow batches)
### C3.1 Invalidation utility + event emission
- Add `ASSET_METADATA_SYNC_EVENT`
- Emit on successful seed/update paths
- Add listener helpers where needed

### C3.2 Read-path cache refresh hooks
- Ensure list/detail/favorites/watchlist refresh on asset metadata event
- Preserve local UI state (filters, sort, tab) during rehydrate

### C3.3 Optional stale indicator (if needed)
- Lightweight `lastHydratedAt` stamp
- UI only if regression debugging requires it

## 5. C3 Test / Gate Checklist
## 5.1 Required (manual 2-browser)
1. Browser A triggers metadata seed/update for a deterministic asset
2. Browser B refreshes page
3. Browser B sees updated metadata consistently in:
   - Marketplace/Search (for `asset-*`)
   - Favorites/Watchlist (same `asset-*`)
4. `twf-*` owned cards remain owned-state only (no leak into public listing views)

## 5.2 Required (regression)
- Favorite/watchlist still resolve `asset_id` stably after refresh
- No random name/image drift on A/B deterministic fixtures
- No overwrite between `asset-*` and `twf-*`

## 5.3 Nice-to-have (optional in C3)
- Browser B auto-updates without refresh (Realtime channel/polling)

## 6. Early-fail Signals
- Marketplace listing card shows owned fixture metadata (`twf-*`) -> namespace merge bug
- Favorites/watchlist lose metadata after refresh -> resolver/cache invalidation bug
- Public read unexpectedly returns `twf-*` rows -> `is_active`/policy regression

## 7. Next Action
- Implement `C3.1` invalidation event + targeted rehydrate hooks

