# ATP Formal Verification Checklist (MarketplaceATP)

Use this checklist when filling ATP UI tabs shown in your screenshot.

1. `NuSMV Executable Model (CTL / LTL)`
   - Upload/paste: `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv`

2. `CTL Specification`
   - Upload/paste: `formal/atp/ctl/MarketplaceATP_CTL.spec`

3. `LTL Specification`
   - Upload/paste: `formal/atp/ltl/MarketplaceATP_LTL.spec`

4. `ATL Strategy`
   - Upload/paste: `formal/atp/atl/MarketplaceATP_ATL.strategy`

5. `EVM Bytecode`
   - Use `formal/atp/evm/MarketplaceATP.creation.bytecode.hex` (constructor bytecode)
   - Or `formal/atp/evm/MarketplaceATP.runtime.bytecode.hex` (deployed/runtime bytecode)

6. `ATP Formal Verification`
   - Cross-check expected semantics:
   - buyer escrow funded at `createOrder`
   - `sellerConfirm` starts buyer pay window (`payDeadline = sellerConfirmTime + PAY_TIMEOUT`)
   - seller asset lock happens at `payOrder`
   - buyer can cancel in `PENDING_CONFIRM` even after `sellerConfirm`
   - finality latch is `finalized`

Recommended ATP flow:

1. Run NuSMV model with CTL specs
2. Run NuSMV model with LTL specs
3. Review ATL strategy properties
4. Run bytecode-level ATP checks using runtime bytecode
5. Compare ATP findings with `Audit.md` + Foundry formal tests
