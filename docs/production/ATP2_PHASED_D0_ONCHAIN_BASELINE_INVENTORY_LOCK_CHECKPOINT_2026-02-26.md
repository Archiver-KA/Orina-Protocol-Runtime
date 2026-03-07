# ATP2 Phase D / D0 Checkpoint - Onchain Baseline Inventory Lock

Date: 2026-02-26  
Status: PASS (doc-only)  
Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Scope
- Lock contract inventory and transaction-lifecycle assumptions for onchain integration planning.
- Prevent ATP2 transaction spec from drifting away from `AuditORINA.md` and `foundry/src`.

## Sources Used
- `docs/production/AuditORINA.md`
- `C:\Users\proje\Documents\GitHub\orina-atp\packages\contracts\foundry\src`
- `supabase/audit/foundry_src_signatures_summary.json` (generated signature inventory)

## Locked Inventory (foundry/src)
- `MarketplaceATP.sol`
- `PaymentGateway.sol`
- `OrinaRWA.sol`
- `FractionalReceiptNFT.sol`
- `DisputeManager.sol`
- `AutoTimeManager.sol`
- `FeeManager.sol`
- `ShippingRegistry.sol`
- `UnitRegistry.sol`

## Locked Assumptions (must not be violated by ATP2 integration)
- Seller confirm is non-binding before `PAID`.
- `PAID` is the first hard boundary (escrow + asset lock).
- Receipt NFT is informational (not escrow/ownership control).
- `payDeadline` is absolute/fixed at order creation.
- Finality is enforced by `finalized == true`.

## Deliverables Created
- `docs/production/ATP2_PHASED_ONCHAIN_TRANSACTION_LOGIC_SPEC_2026-02-26.md`

## Pass Criteria
- ✅ Inventory list frozen
- ✅ AuditORINA guardrails imported into Phase D spec
- ✅ Phase D execution batches D0-D7 defined

## Next
- Start `D1` transaction call matrix spec (UI action -> signer -> contract call -> state/side effects).

