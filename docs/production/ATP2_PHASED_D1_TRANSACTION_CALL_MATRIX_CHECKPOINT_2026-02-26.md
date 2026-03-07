# ATP2 Phase D / D1 - Transaction Call Matrix Checkpoint

Date: 2026-02-26  
Status: PASS (doc-only)  
Checkpoint: `D1`  
Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Scope
- Freeze ATP2 UI action -> signer -> contract call mapping.
- Align D1 UI buy/sign modal behavior (RWA vs NFT) with protocol lifecycle assumptions.

## Deliverables
- `docs/production/ATP2_PHASED_D1_TRANSACTION_CALL_MATRIX_SPEC_2026-02-26.md`

## Pass Confirmation
- ✅ RWA buy flow documented as modal-first, sign-on-button only
- ✅ NFT buy flow documented as direct-buy (no delivery setup)
- ✅ Canonical mappings defined for:
  - `createOrder`
  - `sellerConfirm`
  - `payOrder`
  - `cancelByBuyer`
  - `confirmDelivery`
  - `openDispute`
- ✅ Finality rule (`finalized`) and time-window constraints imported from `AuditORINA`
- ✅ D1 wallet-popup timing rule explicitly locked (no MetaMask popup on `Buy`)

## Notes
- D1 is doc-only closure. No on-chain write execution was introduced in this checkpoint.
- Escrow sequencing wording conflict in `AuditORINA` is deferred to D4 contract-code verification.

## Next
- `D2` EIP-712 signing contract spec + checkpoint (domain/payload/replay/state machine)

