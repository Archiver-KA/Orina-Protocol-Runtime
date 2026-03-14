# ATP Formal Artifacts (MarketplaceATP)

This folder contains ATP-ready formal inputs derived from the current `MarketplaceATP` implementation.

Mapping to ATP UI sections:

- `NuSMV Executable Model (CTL / LTL)`:
  - `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv`
- `CTL Specification`:
  - `formal/atp/ctl/MarketplaceATP_CTL.spec`
- `LTL Specification`:
  - `formal/atp/ltl/MarketplaceATP_LTL.spec`
- `ATL Strategy`:
  - `formal/atp/atl/MarketplaceATP_ATL.strategy`
- `EVM Bytecode`:
  - `formal/atp/evm/MarketplaceATP.creation.bytecode.hex`
  - `formal/atp/evm/MarketplaceATP.runtime.bytecode.hex`

Scope of the NuSMV model:

- Abstract executable model of the order lifecycle/time semantics
- Focused on the corrected behavior:
  - buyer escrow at `createOrder`
  - `sellerConfirm` starts buyer pay window
  - `payDeadline = sellerConfirmTime + PAY_TIMEOUT`
  - seller asset lock occurs at `payOrder`

Notes:

- The NuSMV model is an abstraction, not a bytecode-level model.
- ATL syntax varies across tools; `ATL.strategy` is prepared for ATP UI strategy entry and review.
- Use the EVM bytecode files for ATP bytecode-level checks against the deployed/current source build.
