# Runtime Clean-Room Playbook

Purpose:

- start from a clean snapshot at `c4e24b4`
- sync only carry-able runtime deltas from the dirty worktree
- keep mixed-history files out until they are split intentionally

Inputs:

- manifest: [runtime-repo-split-manifest.md](/c:/ORINA/ATPProtocol2/ATP2/docs/runtime-repo-split-manifest.md)
- sync helper: [sync-runtime-clean-room.ps1](/c:/ORINA/ATPProtocol2/ATP2/scripts/sync-runtime-clean-room.ps1)

## Step 1: Create a clean-room baseline

Preferred pattern:

```powershell
git worktree add --detach .clean-room\runtime-baseline c4e24b4
```

This keeps the baseline inside the workspace and avoids touching the dirty runtime worktree.

## Step 2: Preview the carry set

Run from the dirty source repo root:

```powershell
.\scripts\sync-runtime-clean-room.ps1 -TargetDir .clean-room\runtime-baseline
```

Expected result:

- `carry` paths are listed for copy
- `drop` paths are listed for removal from the clean-room
- `split` paths are listed and skipped on purpose

## Step 3: Apply the carry set

```powershell
.\scripts\sync-runtime-clean-room.ps1 -TargetDir .clean-room\runtime-baseline -Apply
```

What this does:

- copies carry-able dirty files from the source worktree into the clean-room
- removes known `DROP / PARK` paths from the clean-room
- leaves `SPLIT BEFORE CARRY` paths untouched for manual handling

## Step 4: Manually split the mixed-history files

Current manual split list:

- `docs/README.md`
- `docs/spec/11-ai-m2m-runtime-enablement.md`
- `docs/spec/12-ai-m2m-supabase-deploy-runtime-checklist.md`
- `docs/spec/19-supabase-split-function-runbook.md`
- `src/app/components/orders.tsx`
- `src/app/components/seller-asset-management-modal.tsx`
- `src/hooks/useUserOrders.ts`
- `src/utils/orderSorting.ts`
- `supabase/functions/server/seller-ai-minting-handler.ts`
- `supabase/migrations/000037_ai_agent_schema_fixes.sql`

Rule:

- do not bulk-copy these files
- re-open each diff and carry only the runtime-clean hunk set

## Step 5: Verify the clean-room

Recommended checks inside `.clean-room\runtime-baseline`:

```powershell
git status --short
rg -n "orina-ai-m2m-v1" .
npm run verify:viewer-release
```

Expected:

- no accidental scratch files
- no remaining `orina-ai-m2m-v1` runtime refs
- only the intended clean delta remains before commit

## Step 6: Commit in the clean-room

Suggested commit layering:

1. runtime routing / SEO / release gate
2. Supabase function split + `orina-ai-m2m-v2`
3. audit / smoke scripts
4. manual split files after review

Do not fold the `SPLIT BEFORE CARRY` files into the first commit unless their hunks were reviewed one by one.
