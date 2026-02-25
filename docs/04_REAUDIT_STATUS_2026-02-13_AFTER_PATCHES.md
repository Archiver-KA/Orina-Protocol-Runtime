# Production Checklist Re-Audit (After Patches)

Date: 2026-02-13  
Scope: Re-check after sequential fixes requested by user

## Completed In This Round
- `.gitignore` hardened for secrets/build artifacts.
- Edge-function rate limiting added for keys/messages/ai/ipfs.
- localStorage key scoping moved to `address + chainId` for core user/social stores with legacy fallback migration.
- Orders page connected to on-chain hooks for:
  - `sellerConfirm` (Sig2 via EIP-712)
  - `payOrder` (Sig3 via EIP-712)
  - `confirmDelivery`
  - `openDispute`
  - `cancelByBuyer`
- Chain mismatch guard added in wallet status + transactional order handlers.
- Messages backend input validation tightened (address format, text/image bounds).
- Wallet auth replay detection added (signature replay cache).
- CSP meta added to `index.html`.

## Re-Audit Summary
- Status: `PARTIAL - STILL NOT FULL PRODUCTION READY`

### Now PASS
- Wallet signature/session auth for messaging.
- Sender spoof prevention in message APIs.
- Basic abuse mitigation (rate limits).
- Basic chain mismatch detection and user prompt.
- Build integrity (`npm run build` pass).
- Secrets hygiene baseline (`.gitignore`).

### Still BLOCKED / Remaining High-Risk
- No repository-side Supabase SQL migrations / RLS policy scripts to prove DB isolation.
- No deploy-time contract verification manifest (address ↔ ABI ↔ explorer proof).
- No persistent indexer/reorg-safe ingestion pipeline.
- Orders screen still seeded by mock dataset (even with real tx actions wired).
- Operational controls missing (alerting, error monitoring, backup/rollback automation evidence).

## Next Mandatory Steps Before Production Deploy
1. Add `supabase/migrations` with RLS policies and policy test script.
2. Add contract deployment evidence docs:
   - deployed addresses
   - chainId
   - tx hashes
   - explorer verify links
3. Replace mock order source with real on-chain order queries (`useUserOrders` complete implementation).
4. Add observability:
   - structured error sink
   - alerts on 5xx / 429 spikes
5. Execute two-wallet escrow lifecycle test matrix and archive evidence.

