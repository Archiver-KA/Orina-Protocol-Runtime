# ATP2 Phase D / D2 - EIP712 Signing Contract Checkpoint

Date: 2026-02-26  
Status: PASS (spec-only lock)  
Checkpoint: `D2`  
Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## Scope
- Freeze ATP2 EIP-712 signing contract (domain/payload/role semantics/replay boundaries)
- Align current D1 UI modal signing behavior (RWA + NFT) with protocol signature semantics

## Deliverables
- `docs/production/ATP2_PHASED_D2_EIP712_SIGNING_CONTRACT_SPEC_2026-02-26.md`

## Pass Confirmation
- ✅ Domain contract locked (`MarketplaceATP`, `3.3-final`, chainId, verifyingContract)
- ✅ Canonical `Order(...)` payload locked
- ✅ `buyerSig1 / sellerSig / buyerSig2` semantics mapped to lifecycle entrypoints
- ✅ Multi-signature invariant documented (`payOrder()` requires all same digest)
- ✅ Replay boundary rules documented (`chainId`, `verifyingContract`)
- ✅ RWA vs NFT signing parameter contract documented (`amount`, `estDeliverySeconds`)
- ✅ D1 preview-safe signing mode documented without implying on-chain state transition

## Notes
- D2 is spec closure only. No write-path execution changes are included.
- Live write execution remains blocked on D3 address/config preflight and D4 adapter implementation.

## Next
- `D3` chain/address config + preflight gate

