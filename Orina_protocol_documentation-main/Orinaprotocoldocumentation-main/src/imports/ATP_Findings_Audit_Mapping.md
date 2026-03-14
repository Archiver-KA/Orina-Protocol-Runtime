# ATP Findings <-> Audit.md Mapping (MarketplaceATP)

Purpose:

- Keep ATP formal outputs aligned with the canonical spec in `Audit.md`
- Prevent spec-code divergence when ATP reports counterexamples/findings
- Provide a repeatable triage sheet for post-ATP review

Scope:

- `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv`
- `formal/atp/ctl/MarketplaceATP_CTL.spec`
- `formal/atp/ltl/MarketplaceATP_LTL.spec`
- `formal/atp/atl/MarketplaceATP_ATL.strategy`
- `formal/atp/evm/MarketplaceATP.creation.bytecode.hex`
- `formal/atp/evm/MarketplaceATP.runtime.bytecode.hex`
- `test/MarketplaceATPFormalVerification.t.sol`
- `Audit.md`

## 1. Baseline Property Mapping (Pre-ATP Run)

This section maps the current ATP properties / formal-style tests to the intended statements in `Audit.md`.
Use it as the reference baseline before importing real ATP findings.

| Map ID | ATP / Proof Source | Property / Claim | Audit Refs | Proof / Artifact Refs | Notes |
|---|---|---|---|---|---|
| `MAP-001` | Foundry formal test + NuSMV CTL/LTL | Buyer escrow is funded at `createOrder` | `Audit.md:14`, `Audit.md:139`, `Audit.md:511`, `Audit.md:1266`, `Audit.md:1728` | `test/MarketplaceATPFormalVerification.t.sol:148`, `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv:46`, `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv:102`, `formal/atp/ctl/MarketplaceATP_CTL.spec:14`, `formal/atp/ltl/MarketplaceATP_LTL.spec:17` | Proven in create-order escrow/lock boundary test and abstract model/specs |
| `MAP-002` | Foundry formal test + NuSMV CTL/LTL | Seller asset is **not** locked before `payOrder` / `PAID` | `Audit.md:55`, `Audit.md:544`, `Audit.md:616`, `Audit.md:1279`, `Audit.md:1706` | `test/MarketplaceATPFormalVerification.t.sol:148`, `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv:47`, `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv:157`, `formal/atp/ctl/MarketplaceATP_CTL.spec:8`, `formal/atp/ltl/MarketplaceATP_LTL.spec:8` | `sellerConfirm` does not lock assets |
| `MAP-003` | Foundry formal test + NuSMV CTL/LTL | `sellerConfirm` is soft intent, but starts buyer pay window | `Audit.md:14`, `Audit.md:279`, `Audit.md:544`, `Audit.md:943`, `Audit.md:1857`, `Audit.md:1879` | `test/MarketplaceATPFormalVerification.t.sol:170`, `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv:53`, `formal/atp/ctl/MarketplaceATP_CTL.spec:17`, `formal/atp/ltl/MarketplaceATP_LTL.spec:11` | Timing side effect is documented in updated audit |
| `MAP-004` | Foundry formal test + NuSMV CTL/LTL | `payDeadline = sellerConfirmTime + PAY_TIMEOUT` | `Audit.md:943`, `Audit.md:962`, `Audit.md:1857`, `Audit.md:1879`, `Audit.md:1982` | `test/MarketplaceATPFormalVerification.t.sol:170`, `test/MarketplaceATPFormalVerification.t.sol:241`, `test/MarketplaceATPFormalVerification.t.sol:260`, `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv:53`, `formal/atp/ltl/MarketplaceATP_LTL.spec:11` | This was the key audit correction |
| `MAP-005` | Foundry formal test + NuSMV ATL/CTL | Buyer can still cancel in `PENDING_CONFIRM` after `sellerConfirm` | `Audit.md:40`, `Audit.md:571`, `Audit.md:1037` | `test/MarketplaceATPFormalVerification.t.sol:200`, `formal/atp/ctl/MarketplaceATP_CTL.spec:20`, `formal/atp/atl/MarketplaceATP_ATL.strategy:10` | Confirms sellerConfirm is non-binding pre-PAID |
| `MAP-006` | Foundry formal test + NuSMV CTL/LTL | `payOrder` requires prior seller confirmation | `Audit.md:616`, `Audit.md:962`, `Audit.md:1524`, `Audit.md:1879` | `test/MarketplaceATPFormalVerification.t.sol:216`, `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv:53`, `formal/atp/ctl/MarketplaceATP_CTL.spec:17`, `formal/atp/ltl/MarketplaceATP_LTL.spec:11` | Also aligned with `SELLER_NOT_CONFIRMED` guard |
| `MAP-007` | Foundry formal test + NuSMV CTL/LTL | Buyer effectively gets a full `PAY_TIMEOUT` window after sellerConfirm | `Audit.md:943`, `Audit.md:962`, `Audit.md:1857`, `Audit.md:1879` | `test/MarketplaceATPFormalVerification.t.sol:241`, `test/MarketplaceATPFormalVerification.t.sol:260`, `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv:53`, `formal/atp/ltl/MarketplaceATP_LTL.spec:11` | Subject to exact-deadline tx ordering/race note |
| `MAP-008` | Foundry formal test + NuSMV CTL/ATL | Auto-time cancel path exists after buyer pay timeout | `Audit.md:592`, `Audit.md:1954` | `test/MarketplaceATPFormalVerification.t.sol:270`, `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv:60`, `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv:105`, `formal/atp/ctl/MarketplaceATP_CTL.spec:29`, `formal/atp/atl/MarketplaceATP_ATL.strategy:16` | Implemented via `AutoTimeManager.checkAndExecute -> Marketplace.cancelOrder` |
| `MAP-009` | NuSMV CTL/LTL | Finality latch is sticky (terminal states remain terminal) | `Audit.md:394`, `Audit.md:2014`, `Audit.md:2028`, `Audit.md:2126` | `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv:157`, `formal/atp/ctl/MarketplaceATP_CTL.spec:5`, `formal/atp/ltl/MarketplaceATP_LTL.spec:5` | Abstract model encodes terminal stickiness |
| `MAP-010` | NuSMV CTL/LTL/ATL | Cooperative path exists to `PAID`/`FINALIZED`; seller alone cannot force `PAID` | `Audit.md:158`, `Audit.md:260`, `Audit.md:279`, `Audit.md:672` | `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv:105`, `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv:108`, `formal/atp/atl/MarketplaceATP_ATL.strategy:13`, `formal/atp/atl/MarketplaceATP_ATL.strategy:25` | Captures asymmetry and role limits |
| `MAP-011` | EVM Bytecode artifact | Bytecode-level ATP checks should target the compiled `MarketplaceATP` implementation | `Audit.md:197`, `Audit.md:227` | `formal/atp/evm/MarketplaceATP.creation.bytecode.hex:1`, `formal/atp/evm/MarketplaceATP.runtime.bytecode.hex:1` | Use both creation/runtime hex in ATP bytecode checks |
| `MAP-012` | Foundry formal test + code interface sanity | `MarketplaceATP` exposes `payDeadline(uint256)` getter required by `AutoTimeManager` | `Audit.md:592`, `Audit.md:1954` (timing path depends on `payDeadline`) | `src/AutoTimeManager.sol:16`, `src/AutoTimeManager.sol:73`, `src/MarketplaceATP.sol:182`, `test/MarketplaceATPFormalVerification.t.sol:284` | Integration compatibility fix; not a standalone semantic rule in `Audit.md` |

## 2. Known Resolved Finding (Pre-ATP, Internal)

This was found during formal/test alignment before ATP UI execution.

| Finding ID | Type | Symptom | Root Cause | Resolution | Refs | Audit Impact |
|---|---|---|---|---|---|---|
| `RES-001` | Interface compatibility | `AutoTimeManager` interface expects `marketplace.payDeadline(orderId)` | `MarketplaceATP` lacked explicit getter function for `payDeadline` | Added `function payDeadline(uint256)` to `MarketplaceATP` and updated formal test | `src/AutoTimeManager.sol:16`, `src/AutoTimeManager.sol:73`, `src/MarketplaceATP.sol:182`, `test/MarketplaceATPFormalVerification.t.sol:284`, `Audit.md:592`, `Audit.md:1954` | No semantic change; `Audit.md` unchanged except timeline corrections already applied |

## 3. ATP Findings Intake Template (Post-Run)

Copy ATP findings into this table after running ATP UI.

| ATP Finding ID | ATP Source (CTL/LTL/ATL/Bytecode) | Property / Counterexample Summary | Counterexample State Trace / Link | Mapped `MAP-*` | `Audit.md` Section(s) | Classification | Action | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|
| `ATP-XXX` | `CTL` | _(fill)_ | _(fill)_ | `MAP-00X` | `4.5`, `9.4` | `code bug` / `audit mismatch` / `model mismatch` / `tooling` | _(fix code / fix audit / refine model)_ | _(name)_ | `open` |

## 4. Triage Rules (How to Resolve ATP <-> Audit Conflicts)

1. If ATP bytecode-level result and Foundry tests agree, but `Audit.md` differs:
   - Treat as `audit mismatch`
   - Update `Audit.md` and this mapping

2. If ATP counterexample is only against NuSMV/ATL abstraction, while bytecode + Foundry tests disagree:
   - Treat as `model mismatch`
   - Fix `formal/atp/nusmv/*` or `formal/atp/atl/*`

3. If ATP finding reproduces on Solidity code / Foundry tests:
   - Treat as `code bug`
   - Patch code, rerun `forge test`, update `Audit.md`, then update ATP mapping

4. If finding is interface/wiring related (ABI selector mismatch, config mismatch, role wiring mismatch):
   - Treat as `tooling/integration`
   - Record in section 2 (resolved findings) if fixed before deploy

## 5. Recommended Review Order (Per ATP Run)

1. Verify ATP input artifacts match current code build:
   - `formal/atp/evm/MarketplaceATP.runtime.bytecode.hex`
   - `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv`
2. Run CTL/LTL checks and map any failure to `MAP-*`
3. Review ATL strategy counterexamples (if any)
4. Cross-check against Foundry formal suite:
   - `test/MarketplaceATPFormalVerification.t.sol`
5. Update `Audit.md` only if the source-of-truth code semantics require it
