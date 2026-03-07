# ATP2 Phase D / D2 - EIP712 Signing Contract Spec

Date: 2026-02-26  
Status: LOCKED (spec-only, implementation-aligned)  
Phase: D2 (EIP712 & Signing Contract Spec)  
Invariant: `format batch: pham vi hep, checklist chot ro, test sau tung buoc.`

## 1. Purpose
- Define the exact typed-data signing contract ATP2 must use for protocol order signatures.
- Lock signing sequence semantics (`buyerSig1`, `sellerSig`, `buyerSig2`) before D3/D4 execution.
- Prevent domain/payload drift between ATP2 client and `MarketplaceATP` contract.

## 2. Authoritative Inputs
- `docs/production/AuditORINA.md` (Sections 7.x signatures/EIP712)
- `src/config/eip712.ts`
- `src/hooks/useEIP712Sign.ts`
- `C:\Users\proje\Documents\GitHub\orina-atp\packages\contracts\foundry\src\MarketplaceATP.sol`

If conflict exists, contract code wins.

## 3. Canonical EIP-712 Domain (Must Match Contract)
Per ATP2 config and `AuditORINA`:
- `name = "MarketplaceATP"`
- `version = "3.3-final"`
- `chainId = active chain id`
- `verifyingContract = MarketplaceATP deployed address`

### D2 Domain Rules
- `chainId` MUST match current connected wallet chain.
- `verifyingContract` MUST be non-zero and equal to active `CONTRACTS.MARKETPLACE_ATP` for live signing.
- Changing chain or deployment invalidates prior signatures (expected, not a security bug).

## 4. Canonical Signed Payload (Order)
Signed type (and only signed order payload):

```text
Order(
  uint256 orderId,
  address buyer,
  address seller,
  uint256 grossPrice,
  uint256 amount,
  uint256 estDeliverySeconds
)
```

### What Is NOT Signed (AuditORINA-authoritative)
- `paymentToken`
- `assetId`
- fee snapshots
- time windows / `payDeadline`
- settlement type

ATP2 MUST NOT claim these are covered by signatures.

## 5. Signature Roles and Semantics
## 5.1 buyerSig1 (Buyer Intent)
- Provided at: `createOrder()` stage (off-chain before tx submission)
- Validated at: `payOrder()`
- Meaning:
  - Buyer agrees to signed order payload
  - Does NOT imply payment/finality/delivery
- ATP2 D1 UI mapping:
  - RWA modal `Sign`
  - NFT direct-buy modal `Sign Buy Intent`

## 5.2 sellerSig (Seller Confirmation)
- Provided at: `sellerConfirm()` stage
- Validated at:
  - `sellerConfirm()`
  - `payOrder()`
- Meaning:
  - Seller agrees to same digest
  - Required before buyer can pay

## 5.3 buyerSig2 (Buyer Final Consent for Pay)
- Provided at: `payOrder()` stage
- Validated at: `payOrder()`
- Meaning:
  - Buyer final confirmation of same payload
  - Required even if `buyerSig1` exists

## 5.4 Multi-signature Invariant
`payOrder()` requires ALL valid and signing the SAME digest:
- `buyerSig1`
- `sellerSig`
- `buyerSig2`

## 6. ATP2 Signing State Machine (Client Contract)
## 6.1 D1 Preview/Spec States (current)
- `IDLE`
- `MODAL_OPEN`
- `SIGNING`
- `SIGNED_PREVIEW` (zero-address/unmapped contract fallback)
- `SIGNED_PREDICTED_LIVE` (predicted `nextOrderId`, domain configured)
- `SIGN_ERROR`

Signing success in any state above:
- MUST NOT be rendered as on-chain state transition.

## 6.2 D4 Live Execution States (future)
- `CREATE_ORDER_SUBMITTING`
- `CREATE_ORDER_MINED`
- `AWAITING_SELLER_CONFIRM`
- `SELLER_SIG_COLLECTED`
- `PAY_SIGNING_BUYER_SIG2`
- `PAY_ORDER_SUBMITTING`
- `PAID_CONFIRMED`

These are execution-layer states, not signature semantics.

## 7. RWA vs NFT Payload Rules (ATP2 UI Contract)
## 7.1 RWA Buy Intent
- `amount = selected quantity` (slots)
- `estDeliverySeconds = user-selected duration` (derived from target date/days)
- Signing UI collects delivery duration/date before signing

## 7.2 NFT Direct Buy Intent
- `amount = 1`
- `estDeliverySeconds = 0`
- No delivery setup UI
- Direct-buy modal still signs canonical `Order` payload

This preserves one protocol signing schema while supporting two UX flows.

## 8. Replay / Portability / Upgrade Rules
## 8.1 Replay Boundary (Authoritative)
Replay scope is bounded by:
- `chainId`
- `verifyingContract`

Signatures are not portable across:
- different chains
- different deployments
- forks with different chain id

## 8.2 Operational UX Implication
ATP2 MUST detect and surface:
- chain mismatch
- zero contract address
- changed deployment address
- stale predicted-order signing context after chain/account change

## 9. Error UX Contract (Required)
ATP2 signing UI should differentiate:
- Wallet not connected
- Unsupported chain
- Contract address not configured (`0x0`)
- Invalid seller address (mock data / malformed address)
- `nextOrderId` unavailable (predicted live signing path unavailable)
- User rejected signature
- Wallet/provider error

In D1 preview-safe mode:
- Signing may proceed with preview order id and preview note
- UI MUST label it as preview (not live tx-ready)

## 10. D2 Pass Criteria (Spec Lock)
- Domain and payload match ATP2 config + `AuditORINA` semantics
- Signature role semantics are unambiguous
- RWA vs NFT signing parameter differences are explicit
- Replay boundaries and non-signed fields are explicitly documented
- D1 preview-safe behavior is documented without overstating protocol state

## 11. Immediate Next Step
- `D3` chain/address config + preflight gate:
  - non-zero addresses
  - `eth_getCode`
  - verifyingContract sanity
- Then `D4` write adapter execution (`createOrder`, `sellerConfirm`, `payOrder`) with simulation/revert parsing

