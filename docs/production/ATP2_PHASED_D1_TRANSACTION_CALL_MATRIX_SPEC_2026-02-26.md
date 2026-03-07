# ATP2 Phase D / D1 - Transaction Call Matrix Spec (UI -> Contract)

Date: 2026-02-26  
Status: PASS (doc-only matrix locked)  
Phase: D1 (Transaction Call Matrix Spec)  
Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## 1. Purpose
- Define the canonical mapping from ATP2 UI transaction actions to on-chain entrypoints.
- Freeze signer role, popup timing, preconditions, and expected side effects per action.
- Prevent UI behavior drift before D3/D4 (address config + write adapter execution).

## 2. Authoritative Inputs
- `docs/production/AuditORINA.md`
- `C:\Users\proje\Documents\GitHub\orina-atp\packages\contracts\foundry\src`
- ATP2 D1 UI preview implementation:
  - `src/app/components/asset-details-modal.tsx`
  - `src/app/components/rwa-buy-order-sign-modal.tsx`
  - `src/app/components/nft-buy-direct-sign-modal.tsx`
  - `src/hooks/useEIP712Sign.ts`
  - `src/config/eip712.ts`

If this spec conflicts with contract code, contract code wins.

## 3. D1 Scope (What This Matrix Covers)
### Included
- Buyer-side write intents (RWA + NFT buy initiation/signing)
- Core lifecycle actions:
  - `createOrder`
  - `sellerConfirm`
  - `payOrder`
  - `cancelByBuyer`
  - `confirmDelivery`
  - `openDispute`
- Read helpers needed for transaction status rendering

### Excluded (D1)
- Actual write execution adapter implementation (D4)
- Contract deployment/address binding (D3)
- Testnet write smoke (D5)
- Operator/admin execution UX (`AutoTimeManager`, `DisputeManager`) beyond matrix references

## 4. UI Flow Split (Must Preserve)
### 4.1 RWA Listing Buy Flow
- `Buy` click opens modal only (no signature popup).
- Buyer configures delivery duration / target date.
- Wallet signature popup appears only when user clicks `Sign` in modal.
- Result of D1: `buyerSig1` preview/predicted signature only (no on-chain write yet).

### 4.2 NFT Listing Buy Flow (Direct Buy)
- `Buy` click opens direct-buy modal only (OpenSea-style).
- No delivery-time/calendar setup.
- Wallet signature popup appears only when user clicks `Sign Buy Intent`.
- D1 NFT signing still uses protocol `Order` typed-data payload with:
  - `amount = 1`
  - `estDeliverySeconds = 0`

### 4.3 Wallet Popup Timing Rule (Normative)
- Clicking `Buy` MUST NOT trigger MetaMask signature popup.
- Signing popup MUST occur only on explicit `Sign` action inside modal.

## 5. Canonical Transaction Call Matrix
## 5.1 Buyer Pre-Proposal (Off-chain signing only)
| UI Action | Actor | Wallet Popup | Off-chain Output | On-chain Call | Notes |
|---|---|---|---|---|---|
| RWA `Buy` button | Buyer | No | Open `RwaBuyOrderSignModal` | None | Delivery duration chosen in modal |
| RWA modal `Sign` | Buyer | Yes (EIP-712) | `buyerSig1` | None (D1 preview) | Signs `Order(...)` with chosen `estDeliverySeconds` |
| NFT `Buy` button | Buyer | No | Open `NftBuyDirectSignModal` | None | No calendar/setup |
| NFT modal `Sign Buy Intent` | Buyer | Yes (EIP-712) | `buyerSig1` | None (D1 preview) | Uses `amount=1`, `estDeliverySeconds=0` |

## 5.2 Canonical Lifecycle Actions (On-chain target mapping)
| UI Action (future D4+) | Actor / Signer | Contract Call | Signature Inputs | Key Preconditions (AuditORINA) | Expected Effects |
|---|---|---|---|---|---|
| Create order (submit buyer intent) | Buyer tx signer | `MarketplaceATP.createOrder(...)` | `buyerSig1` payload already prepared | Order not yet created; chain/address config valid; buyer params valid | Creates order in `PENDING_CONFIRM`; stores buyer proposal + snapshots; pre-PAID phase starts |
| Seller confirm | Seller tx signer | `MarketplaceATP.sellerConfirm(orderId, ...)` | `sellerSig` | `state == PENDING_CONFIRM`, seller caller, within confirm window, `finalized == false` | Records seller confirm timestamp; informational/non-binding; no asset lock/finality |
| Buyer pay / commit | Buyer tx signer | `MarketplaceATP.payOrder(orderId, buyerSig2)` | Requires valid `buyerSig1`, `sellerSig`, `buyerSig2` all same digest | `state == PENDING_CONFIRM`, `sellerConfirmed == true`, `time <= payDeadline`, `finalized == false` | Transitions to `PAID`; sets `paidAt`, `autoReleaseAt`; hard commitment boundary |
| Buyer cancel (pre-PAID) | Buyer tx signer | `MarketplaceATP.cancelByBuyer(orderId)` | None | Buyer caller, `state == PENDING_CONFIRM`, `finalized == false` | `state = CANCELLED`, `finalized = true` |
| Buyer confirm delivery | Buyer tx signer | `MarketplaceATP.confirmDelivery(orderId)` | None | Buyer caller, `state == PAID`, `time <= autoReleaseAt`, `finalized == false` | Sets full release settlement and finalizes |
| Open dispute | Buyer or Seller tx signer | `MarketplaceATP.openDispute(orderId)` | None | `state == PAID`, `autoReleaseAt < now <= autoReleaseAt + BUYER_ACTION_WINDOW`, `finalized == false` | `state = DISPUTED`; hands off to dispute manager path |

## 5.3 Non-User / Operator Paths (Referenced for UI state)
| Path | Actor | Call | UI Role |
|---|---|---|---|
| Auto release | `AUTOTIME_ROLE` | `MarketplaceATP.autoRelease(orderId)` | Status transition visibility only (user sees outcome) |
| Auto cancel expired pending | `AUTOTIME_ROLE` (`AutoTimeManager`) | `cancelOrder(orderId)` / `checkAndExecute(orderId)` | Status transition visibility only |
| Dispute resolution | `DisputeManager` | `setDisputeResolved(...)` callback to Marketplace | Final settlement state rendering |

## 6. Read-Path Matrix (Status Rendering Requirements)
ATP2 transaction UI/read adapter MUST support (direct or composed reads):
- `getOrderStatus(orderId)`
- `isPendingConfirm(orderId)`
- `isPaid(orderId)`
- `isOrderDisputed(orderId)`
- `isFinalized(orderId)`
- `isSellerConfirmed(orderId)`
- `proposedAt(orderId)`
- `autoReleaseAt(orderId)`
- `grossPrice(orderId)`
- `payDeadline(orderId)` (from interface usage in `AutoTimeManager`)

### Finality Rule (Non-negotiable)
- UI terminality MUST key off `finalized == true`.
- `state == FINALIZED` or `state == CANCELLED` alone is not authoritative.

## 7. Preconditions / UX Guardrails by Action
## 7.1 Shared preflight (all write paths)
- Wallet connected
- Correct chain selected
- `CONTRACTS.MARKETPLACE_ATP != 0x0`
- `verifyingContract` in EIP-712 domain matches active Marketplace address
- Asset/seller address passes EVM address validation

## 7.2 Buy flow UX rules (RWA + NFT)
- `Buy` opens modal only; no signature prompt.
- Explicit `Sign` button triggers typed-data signing.
- Signing success does not imply on-chain state transition.
- UI copy must not label signed intent as "paid", "confirmed", or "finalized".

## 7.3 Time semantics UI warnings (derived from AuditORINA)
- `payDeadline` is fixed at `createOrder()`.
- Seller confirming late shortens effective buyer pay window.
- UI must not promise full 24h after seller confirm.

## 8. Known Ambiguity to Resolve in D4 (Do Not Guess in UI)
`AuditORINA.md` contains duplicated lifecycle descriptions with differing wording around escrow timing (`createOrder()` vs `payOrder()` phrasing in some sections). For ATP2 integration:
- Use `PAID` boundary (`payOrder`) as first hard commitment UI checkpoint.
- Re-verify exact escrow call sequencing against `MarketplaceATP.sol` + `PaymentGateway.sol` during D4 implementation.
- Do not hardcode escrow-side effect copy beyond "protocol commitment begins at pay step" until D4 verification closure.

## 9. D1 Pass Criteria (Doc Closure)
- Every ATP2 transaction UI action maps to exactly one canonical contract entrypoint or explicit "off-chain sign only".
- RWA and NFT buy flows are split clearly in matrix and UI rule set.
- Wallet popup timing rule is explicit and matches current D1 implementation.
- Finality and time-window guardrails align with `AuditORINA.md`.

## 10. Immediate Next Step
- Execute D2 EIP-712 signing contract spec (domain, payload, replay boundaries, UI state machine).
- Then D3 contract address/config preflight gating before D4 write adapter execution.

