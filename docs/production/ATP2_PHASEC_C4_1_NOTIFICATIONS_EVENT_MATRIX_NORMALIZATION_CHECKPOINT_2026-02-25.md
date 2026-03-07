# ATP2 Phase C / C4.1 Checkpoint (Notifications Event Matrix Normalization)

Date: 2026-02-25

## Scope
- Normalize notification event payload fields (`eventCode`, `sourceId`) across emit paths
- Stabilize dedupe key behavior for local + remote notification merge
- Harden cross-wallet community notify route with backend dedupe/update pass
- Regression test H1/H2/H3 minimal API smoke after patch

Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Implemented
- `src/utils/notifications.ts`
  - metadata normalization helpers (`eventCode`, `sourceId`, wallet casing)
  - deterministic source-id builder helper
  - local dedupe pass before save/hydrate merge
  - map DB rows -> app notifications with normalized metadata
- `src/app/components/community/enhanced-community.tsx`
  - canonical `eventCode/action/sourceId` for like/bookmark/comment/reply/reply-like
  - bridge payload now forwards canonical metadata + `sourceId`
- `src/app/components/profile/enhanced-profile.tsx`
  - follow notification emits canonical `eventCode/sourceId`
  - cross-wallet follow notify persists via H1 backend route
- `supabase/functions/server/wallet-auth-claim-bridge.tsx`
  - `/community-notify` backend dedupe on `(user_id, source_type, source_id)`
  - dedupe update preserves existing `is_read/read_at`

## Tests Run
1. `npm run build` -> PASS
2. Redeploy function `make-server-b0d68fc8` -> PASS
3. `H3` minimal API smoke regression (`batch_h3_api_smoke_claim_bridge_rest_minimal.cjs`) -> PASS

## Pass Outcome
- H1 bridge health/exchange still OK
- H2 hardened RLS checks used by minimal smoke still pass
- Notification dedupe normalization patch does not regress profile/community owner/cross-owner access control paths

## Next (C4.2)
- Run manual notification event matrix smoke (2-browser / 2-wallet)
- Validate dedupe/read-state behavior for repeated events across:
  - post like / comment / reply
  - comment like / reply like
  - follow notifications
