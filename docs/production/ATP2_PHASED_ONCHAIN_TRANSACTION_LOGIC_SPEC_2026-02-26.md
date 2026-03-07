# ATP2 Phase D - Onchain Transaction Logic Integration Spec

Date: 2026-02-26  
Status: ACTIVE (D0/D1/D2 doc checkpoints locked; execution pending D3+)  
Phase: D (Protocol Onchain Integration)  
Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## 1. Purpose
- Define the onchain transaction integration plan for ATP2 UI/app.
- Anchor all transaction logic to code-derived protocol behavior.
- Prevent spec drift between ATP2 integration assumptions and MarketplaceATP contracts.

## 2. Authoritative Sources
- `docs/production/AuditORINA.md` (code-derived protocol spec, on-chain behavior source-of-truth)
- `C:\Users\proje\Documents\GitHub\orina-atp\packages\contracts\foundry\src`

If this document conflicts with contract code, contract code wins.

## 3. Normative Guardrails (Inherited from AuditORINA)
- Seller confirm is non-binding intent (does not lock funds/assets, does not block cancellation pre-PAID).
- Buyer cancellation after seller confirm is valid by design.
- Asset lock starts only at `payOrder()` (PAID boundary).
- Receipt NFT is informational only (not ownership control over escrow).
- DisputeManager resolves state, not funds directly (PaymentGateway remains escrow authority).
- Time windows are absolute; `payDeadline` is fixed at order creation.
- Finality is enforced by `finalized == true`, not by `state` label alone.

These are mandatory assumptions for ATP2 transaction UI/UX and adapter design.

## 4. Scope of Phase D
### In Scope
- Transaction write-path spec (UI -> contract calls)
- Read-path spec for order state / lifecycle rendering
- EIP-712 signing contract for ATP2 client
- Chain/contract config gating + preflight rules
- Testnet integration checkpoints and smoke gates

### Out of Scope (for this phase spec)
- Legal/RWA off-chain enforcement
- Governance process design
- Production ops/SRE runbooks beyond protocol interaction checkpoints
- UI polish unrelated to transaction correctness

## 5. Contract Inventory (foundry/src)
Core transaction path modules:
- `MarketplaceATP.sol` (state coordinator, order lifecycle authority)
- `PaymentGateway.sol` (escrow/funds movement authority)
- `OrinaRWA.sol` (asset mint/lock/consume/unlock authority)
- `FractionalReceiptNFT.sol` (post-finalization informational receipt minting)
- `DisputeManager.sol` (dispute state resolution authority)
- `AutoTimeManager.sol` (time-based enforcement executor)

Supporting/admin modules:
- `FeeManager.sol` (fee configuration/calculation)
- `ShippingRegistry.sol` (shipping options registry)
- `UnitRegistry.sol` (unit metadata/validation)

## 6. Key Entry Functions (Integration-Relevant)
### MarketplaceATP
- `createOrder(...)`
- `sellerConfirm(...)`
- `payOrder(uint256 orderId, bytes buyerSig2)`
- `confirmDelivery(uint256 orderId)`
- `autoRelease(uint256 orderId)`
- `cancelOrder(uint256 orderId)` (AUTOTIME role path)
- `cancelByBuyer(uint256 orderId)`
- `openDispute(uint256 orderId)`
- `setDisputeResolved(...)` (DisputeManager callback path)
- read helpers: `getOrderStatus(...)`, `isPendingConfirm`, `isPaid`, `isOrderDisputed`, `isFinalized`, `isSellerConfirmed`, `proposedAt`, `autoReleaseAt`, `grossPrice`

### PaymentGateway
- `depositEscrow(...)`
- `releaseToSeller(...)`
- `refundBuyer(...)`
- `distributeFees(...)`
- `deductDisputeFee(...)`

### OrinaRWA
- `mintAsset(...)`
- `lockAmount(...)`
- `consumeLocked(...)`
- `unlockAmount(...)`
- `getAsset(...)`

### FractionalReceiptNFT
- `mint(...)`
- `tokenURI(...)`

### DisputeManager
- `openDispute(uint256 orderId)`
- `extendDispute(uint256 orderId)`
- `resolveMutualSplit(...)`
- `resolveDispute(...)`
- `resolveStaleDispute(uint256 orderId)`

### AutoTimeManager
- `checkAndExecute(uint256 orderId)`
- `batchCheckAndExecute(uint256[] calldata orderIds)`

## 7. Canonical Transaction Lifecycle (ATP2 Integration View)
### 7.1 Pre-PAID (Buyer-dominant phase)
1. `createOrder(...)` by buyer
2. `sellerConfirm(...)` by seller (soft signal only)
3. Exit paths:
- `payOrder(...)` by buyer -> enters `PAID`
- `cancelByBuyer(...)` by buyer -> terminal `CANCELLED`
- `AutoTimeManager.cancelOrder(...)` path -> terminal `CANCELLED`

### 7.2 PAID (hard commitment boundary)
At `payOrder(...)`:
- escrowed funds deposited via PaymentGateway
- seller assets locked via OrinaRWA
- order transitions to `PAID`
- `autoReleaseAt` becomes active

### 7.3 Post-PAID outcomes
- Buyer `confirmDelivery(...)` -> finalization path
- AutoTimeManager `autoRelease(...)` after deadline -> finalization path
- `openDispute(...)` -> `DISPUTED`

### 7.4 Dispute path
- DisputeManager chooses settlement (`FULL_RELEASE` / `FULL_REFUND` / `SPLIT`)
- Marketplace `setDisputeResolved(...)` records settlement and immediately calls `_finalize(...)`
- `_finalize(...)` is the only place where final funds/assets/receipt side effects complete

## 8. ATP2 Transaction Adapter Rules (Must Follow)
### 8.1 UI must not infer stronger guarantees than code
- Do not present seller confirm as locking order.
- Do not present pre-PAID assets as reserved.
- Do not treat signature collection as a state transition.

### 8.2 PAID boundary is the first hard commitment checkpoint
ATP2 must visually separate:
- `Intent/Negotiation` (pre-PAID)
- `Escrow + Asset Lock` (PAID onward)

### 8.3 Finality display must key off `finalized`
- UI status rendering must not rely solely on `OrderState`.

### 8.4 Time windows are absolute
- ATP2 countdown logic must use absolute deadlines returned/read from chain-derived values.
- Do not shift pay window based on seller confirm time.

## 9. Phase D Execution Batches (Planned)
### D0 - Onchain Baseline Inventory Lock (doc-only)
Goal:
- Freeze module inventory, entrypoints, and assumptions for ATP2 integration.

Deliverables:
- This Phase D spec
- D0 checkpoint doc
- `need_Fix` phase board update

Pass Criteria:
- Contract inventory locked
- Transaction lifecycle assumptions align with `AuditORINA.md`

### D1 - Transaction Call Matrix Spec (UI -> Contract)
Goal:
- Define exact UI action -> contract call -> signer -> preconditions -> side effects.

Scope:
- `createOrder`, `sellerConfirm`, `payOrder`, `cancelByBuyer`, `confirmDelivery`, `openDispute`
- read helpers needed for transaction status rendering

Pass Criteria:
- Every ATP2 transaction action maps to one canonical on-chain call path
- No UI action depends on invalid assumptions from Section 3
- Status:
  - ✅ PASS (doc-only)
  - ✅ RWA vs NFT buy-flow split documented
  - ✅ Wallet popup timing rule locked (`Buy` opens modal only; `Sign` triggers wallet)

### D2 - EIP712 & Signing Contract Spec
Goal:
- Define ATP2 typed-data signing sequence and payload contract exactly.

Scope:
- `buyerSig1`, `sellerSig`, `buyerSig2`
- domain binding (`MarketplaceATP`, `3.3-final`, chainId, verifyingContract)
- replay boundaries and error UX

Pass Criteria:
- Typed-data payload spec matches code/AuditORINA
- Frontend signing sequence and state machine are unambiguous
- Status:
  - ✅ PASS (spec-only)
  - ✅ Domain/payload/role semantics/replay boundaries locked
  - ✅ D1 preview-safe signing behavior documented

### D3 - Chain/Address Config + Preflight Gate
Goal:
- Bind ATP2 to actual deployed contract addresses and chain(s) safely.

Scope:
- config schema for contract addresses
- `eth_getCode` verification gates
- version/module sanity checks

Pass Criteria:
- No zero-address placeholders in active config
- Preflight report passes before any write-path smoke

### D4 - Write Adapter Scaffold + Simulation
Goal:
- Build transaction adapter boundaries and dry-run/prepare flows.

Scope:
- viem/wagmi write helpers
- gas estimation / revert parsing
- pre-submit validation and post-tx reconciliation hooks

Pass Criteria:
- Build passes
- Simulation/preflight can detect invalid state before submit

### D5 - Testnet Transaction Smoke (2 wallet)
Goal:
- End-to-end transaction lifecycle smoke on testnet with real wallets.

Scope:
- happy path + cancellation + timeout/dispute subset (batch-scoped)

Pass Criteria:
- Onchain tx hashes emitted and state transitions observed correctly
- ATP2 UI status aligns with chain state

### D6 - Time/Dispute Execution Runbooks
Goal:
- Document/test AutoTime + Dispute admin/operator paths used in ATP2 validation.

Pass Criteria:
- Deterministic steps for timeout/dispute tests
- No hidden manual assumptions

### D7 - Onchain Integration Closure Gate
Goal:
- Final readiness gate before protocol integration phase is declared complete.

Pass Criteria:
- D0-D6 checkpoints closed
- Regression smoke on offchain integration unaffected

## 10. Checkpoint Artifacts (Phase D)
- `ATP2_PHASED_ONCHAIN_TRANSACTION_LOGIC_SPEC_2026-02-26.md` (this doc)
- `ATP2_PHASED_D0_ONCHAIN_BASELINE_INVENTORY_LOCK_CHECKPOINT_2026-02-26.md`
- `ATP2_PHASED_D1_TRANSACTION_CALL_MATRIX_SPEC_2026-02-26.md`
- `ATP2_PHASED_D1_TRANSACTION_CALL_MATRIX_CHECKPOINT_2026-02-26.md`
- `ATP2_PHASED_D2_EIP712_SIGNING_CONTRACT_SPEC_2026-02-26.md`
- `ATP2_PHASED_D2_EIP712_SIGNING_CONTRACT_CHECKPOINT_2026-02-26.md`

## 11. Immediate Next Step
- Execute `D3` chain/address config + preflight gate (non-zero addresses, `eth_getCode`, verifyingContract sanity).
- Then begin `D4` write adapter scaffold + simulation with D1/D2 specs as execution contract.
