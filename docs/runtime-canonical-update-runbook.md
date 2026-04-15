# Runtime Canonical Update Runbook

## Canonical decision

For commits that must land on:

- `https://github.com/Archiver-KA/Orina-Protocol-Runtime`

the canonical local repo is:

- `C:\ORINA\ATPProtocol2\Orina Protocol - Runtime`

`ATP2` is not the canonical commit source for that GitHub repo.

## Why this is the canonical repo

### Runtime repo

- Path: `C:\ORINA\ATPProtocol2\Orina Protocol - Runtime`
- Remote:
  - `origin -> https://github.com/Archiver-KA/Orina-Protocol-Runtime`
- Branch:
  - `main`
- Worktree state:
  - clean
- Current role:
  - GitHub source of truth
  - Cloudflare build source
  - runtime smoke / deploy baseline

### ATP2 repo

- Path: `C:\ORINA\ATPProtocol2\ATP2`
- Remotes:
  - `origin -> https://github.com/Archiver-KA/Documentation-Orina-Protocol-v2.0.git`
  - `orinatestnet -> https://github.com/Archiver-KA/Orinatestnet.git`
- Branch:
  - `master`
- Worktree state:
  - heavily dirty
- Current role:
  - staging / scratch / research / mixed-history workspace

## Source-of-truth hierarchy

Use this order whenever there is drift:

1. `Orina Protocol - Runtime` `main`
2. live `app.orina.io` deployment state
3. `ATP2` as candidate source for selective carry-over only

`ATP2` is never the default truth when it disagrees with runtime repo or live production.

## What time-based comparison is good for

File timestamps are only a pre-filter.

They answer:

- which file in `ATP2` might contain newer work than runtime repo
- which file in `ATP2` is clearly older than the deployed baseline

They do not answer:

- whether the newer change is safe
- whether the file contains unrelated drift
- whether the change needs Supabase / env / migration alignment

## Safe update policy

### Allowed direct carry candidates

These can be considered for carry-over if `ATP2` is newer and the diff is local, readable, and testable:

- isolated UI copy / layout polish
- public marketing pages
- static assets under `public/`
- small component styling changes
- standalone utility tests

### Manual review required

These must be reviewed file-by-file even if `ATP2` is newer:

- routing and navigation
- wallet connect / auth / guest mode
- `messages`
- `api keys`
- `orders`
- `asset details`
- `favorites`
- `runtimeConfig`
- `supabaseAuthClaimBridge`
- `WalletModalContext`
- `m2m` config
- Cloudflare / build config

### Never auto-carry from ATP2

These must not be copied by timestamp alone:

- `.env`
- `.env.example`
- `supabase/functions/**`
- `supabase/migrations/**`
- `utils/runtimeConfig.ts`
- `utils/supabase/functions.ts`
- `package.json`
- `package-lock.json`
- runtime deploy docs / runbooks if mixed with old notes

## Safe runtime update flow

1. Start from `C:\ORINA\ATPProtocol2\Orina Protocol - Runtime`.
2. Confirm it is clean:
   - `git status --short`
3. Identify candidate files in `ATP2` that are newer than runtime repo.
4. For each candidate, compare exact diff against runtime repo:
   - `git diff --no-index -- <ATP2 file> <Runtime file>`
5. Classify each file:
   - `carry now`
   - `manual review`
   - `drop`
6. Carry only the approved subset into runtime repo.
7. Run runtime verification in runtime repo:
   - `npm run verify:viewer-release`
8. If change touches Supabase-facing behavior:
   - smoke auth / messages / API keys / asset navigation
   - deploy affected edge functions separately
9. Commit only in runtime repo.
10. Push `origin/main`.
11. Verify Cloudflare build picked the new commit.

## Commit policy

All production-bound commits for runtime must be created in:

- `C:\ORINA\ATPProtocol2\Orina Protocol - Runtime`

Do not commit production runtime batches from:

- `C:\ORINA\ATPProtocol2\ATP2`

## Practical rule for future work

If a change begins in `ATP2`:

1. finish discovery there if needed
2. treat it as a patch source only
3. re-evaluate against runtime repo
4. port the minimal safe diff into runtime repo
5. verify and commit in runtime repo

## Current known example

At the time this runbook was written:

- `orders.tsx` in `ATP2` is older than runtime repo and should not be used as the canonical version
- `seller-asset-management-modal.tsx` in `ATP2` is older than runtime repo and should not be used as the canonical version
- `public-home-page.tsx` in `ATP2` appears newer than runtime repo and is a valid candidate for targeted review

Later manual review still allowed selective carry-over from `ATP2` into runtime for isolated UI and utility deltas. That does not change the canonical rule above.

## ATP2 Vs Runtime Cu

Review snapshot for the selective carry used to complete the current runtime baseline.

| Scope | ATP2 reference | Runtime cũ reference | Exact delta | Change type | Runtime hiện tại |
| --- | --- | --- | --- | --- | --- |
| Orders search input shell | `ATP2/src/app/components/orders.tsx:686-691`, `:1264-1269` | `HEAD src/app/components/orders.tsx:638-643`, `:1212-1217` | Search input đổi từ shell cũ không có chuẩn chiều cao/focus sang `48px`, `border-ui-border-subtle`, padding trái `11`, focus ring chuẩn ATP2 | UI | Đã áp dụng tại `src/app/components/orders.tsx:644`, `:1218` |
| Seller order sort | `ATP2/src/app/components/seller-asset-management-modal.tsx:198-203`, `ATP2/src/utils/orderSorting.ts:3-21` | `HEAD src/app/components/seller-asset-management-modal.tsx:182-187` | Bỏ `.sort((left, right) => Number(right.proposedAt - left.proposedAt))`; thay bằng `sortOrdersNewestFirst(...)` có tie-break theo `orderId` và ưu tiên timestamp chuẩn dùng chung | Behavior | Đã áp dụng tại `src/app/components/seller-asset-management-modal.tsx:201-206` |
| Metrics finalized/cancelled | `ATP2/src/app/components/seller-asset-management-modal.tsx:223-249`, `ATP2/src/utils/orderSemantics.ts:19-53` | `HEAD src/app/components/seller-asset-management-modal.tsx:207-235` | Bỏ check thô `order.finalized || state === FINALIZED` và `state === CANCELLED`; thay bằng `isOrderCompleted()` và `isOrderCancelled()` | Behavior | Đã áp dụng tại `src/app/components/seller-asset-management-modal.tsx:226-252` |
| Header meta pills | `ATP2/src/app/components/seller-asset-management-modal.tsx:253-305` | `HEAD src/app/components/seller-asset-management-modal.tsx:262-284` | ATP2 thêm `assetReferenceLabel`, `coerceText(status)`, pill category, pill asset ref/token id, status pill normalize thay vì chỉ token/status đơn giản | UI + fallback safety | Đã áp dụng tại `src/app/components/seller-asset-management-modal.tsx:256-305` |
| Artwork overlay metadata | `ATP2/src/app/components/seller-asset-management-modal.tsx:313-344` | `HEAD src/app/components/seller-asset-management-modal.tsx:292-327` | Runtime cũ đặt `Verified` và category overlay đè lên ảnh; ATP2 bỏ overlay này, giữ ảnh sạch hơn và chuyển metadata sang header/stats shell | UI | Đã áp dụng tại `src/app/components/seller-asset-management-modal.tsx:309-344` |
| Shared shell tokens | `ATP2/src/app/components/seller-asset-management-modal.tsx:53-58`, `:447-452`, `:725-731` | `HEAD src/app/components/seller-asset-management-modal.tsx:141-145`, `:427-430`, `:702-707` | ATP2 chuẩn hóa `SECTION_SHELL_CLASS`, `INSET_SHELL_CLASS`, `META_PILL_CLASS` thay cho nhiều surface class hard-code | UI consistency | Đã áp dụng tại `src/app/components/seller-asset-management-modal.tsx:53-58` |
| Tab button contract | `ATP2/src/app/components/seller-asset-management-modal.tsx:411-435` | `HEAD src/app/components/seller-asset-management-modal.tsx:391-414` | Thêm `type="button"`, bỏ label ẩn trên mobile, đổi active/inactive shell từ grid-button cũ sang pill-switch mới | Minor behavior + UI | Đã áp dụng tại `src/app/components/seller-asset-management-modal.tsx:411-435` |
| Shared action buttons | `ATP2/src/app/components/seller-asset-management-modal.tsx:651-700`, `ATP2/src/app/components/ui/studio-action-button.tsx:14-62` | `HEAD src/app/components/seller-asset-management-modal.tsx:630-677` | `Update`, `Pause/Resume`, `Delist` chuyển từ `button` viết tay sang `StudioActionButton` với `primary`, `secondary`, `danger` | UI consistency + shared focus behavior | Đã áp dụng tại `src/app/components/seller-asset-management-modal.tsx:651-700` |
| Stats card typography | `ATP2/src/app/components/seller-asset-management-modal.tsx:438-452`, `:715-731` | `HEAD src/app/components/seller-asset-management-modal.tsx:417-430`, `:692-707` | `StatTile` và `MiniStat` đổi từ typography/zinc hard-code sang tokenized typography + inset shell thống nhất | UI | Đã áp dụng tại `src/app/components/seller-asset-management-modal.tsx:438-452`, `:715-731` |

### Reading notes

- Các dòng ở cột `Runtime cũ reference` là mốc từ `HEAD` trước batch patch hiện tại.
- Bảng này chỉ ghi lại phần carry-over đã duyệt cho runtime hiện tại.
- Không suy ra rằng toàn bộ file `ATP2` được phép copy nguyên file.

### Additional runtime carry

- `src/app/components/orders.tsx`
  Ported ATP2's shared order recency sort, closed/completed semantics for summary stats, bridge projection sync after on-chain writes, and receipt projection sync after delivery finalization.
- `src/app/components/open-dispute-modal.tsx`
  Extended the modal order payload with `unitLabel` so dispute quantity rendering stays aligned with the confirm-delivery flow.
- The remaining ATP2 deltas in `orders.tsx` are mostly copy and typography changes, so they were intentionally not carried as canonical behavior changes.

## Runtime session log - April 15, 2026

This batch was authored directly in:

- `C:\ORINA\ATPProtocol2\Orina Protocol - Runtime`

No ATP2 file was used as the carry source for this UI batch.

### Files updated in this session

- `src/utils/taxonomyAppearance.ts`
  Added a shared category tone map so marketplace category badges use stable system colors by taxonomy slug.
- `src/app/components/search-result-card.tsx`
  Updated marketplace asset cards in both grid and list modes:
  removed the `RWA Listing` / `NFT Listing` labels, moved and restyled the category badge, removed badge dots, rebuilt the list-mode right column, removed the temporary price panel shell, removed metric chip borders, and pinned the view/like controls to the lower card edge.
- `src/app/components/profile/enhanced-profile.tsx`
  Changed viewer overview minted-marketplace cards to render as 4 columns on XL screens while leaving owner-view layout at 3 columns.
- `src/app/components/cards/my-asset-cards.tsx`
  Removed border treatment from owner-view overlay badges so seller asset cards stay visually aligned with the updated marketplace badge language.

### Verification run in runtime repo

- `npm run build`
  Passed after the final card-layout and profile overview updates on April 15, 2026.

## Minimal comparison checklist

Before carrying any file from `ATP2` into runtime repo, answer all of these:

- Is `ATP2` actually newer by timestamp?
- Is the diff isolated to one concern?
- Does the diff avoid auth / env / migration coupling?
- Can it pass `npm run verify:viewer-release` after carry?
- If it changes runtime behavior, can it be smoke-tested on `app.orina.io`?

If any answer is `no`, do not carry automatically.
