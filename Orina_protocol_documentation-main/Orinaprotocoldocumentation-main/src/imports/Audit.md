==================================================
COMMON FALSE ASSUMPTIONS (EXPLICITLY INVALID)
==================================================

This section enumerates assumptions that are commonly
(but incorrectly) made when reviewing, auditing, or
documenting this system.

Any specification, audit finding, or analysis that relies
on one of the assumptions below is INVALID by definition.

--------------------------------------------------

X.1 "Seller confirmation locks the order"
--------------------------------------------------
INVALID.

Facts from code:
- sellerConfirm does NOT:
  - lock assets
  - newly escrow or lock buyer funds (buyer escrow occurs at createOrder)
  - advance order to PAID
  - prevent cancellation
  - lock seller assets

- sellerConfirm DOES:
  - mark sellerConfirmed = true
  - set payDeadline = sellerConfirmTime + PAY_TIMEOUT
  - start buyer payment window

Consequences:
- Buyer can cancel after sellerConfirm
- AutoTimeManager can cancel after sellerConfirm
- Seller has no unilateral control pre-PAID

Seller confirmation is a NON-BINDING intent signal with timing side effects.

--------------------------------------------------

X.2 "Buyer cancellation after seller confirmation is a bug"
--------------------------------------------------
INVALID.

Facts from code:
- Cancellation dominates confirmation
- Cancellation is always final (finalized == true)
- No function checks “seller already confirmed” to block cancel

This behavior is intentional and enforced by design.

Any spec calling this a bug contradicts the code.

--------------------------------------------------

X.3 "Assets are locked when the order is created or confirmed"
--------------------------------------------------
INVALID.

Facts from code:
- Assets are locked only via OrinaRWA.lockAmount
- lockAmount is called only after PAID
- No pre-payment asset reservation exists

Implication:
- Seller bears zero asset risk pre-PAID
- Oversubscription risk is accepted by design

--------------------------------------------------

X.4 "Receipt NFT represents ownership or a financial claim"
--------------------------------------------------
INVALID.

Facts from code:
- Receipt minting is allowed only AFTER finalization
- NFT has no authority over escrow or assets
- NFT cannot trigger settlement or withdrawal
- Receipt NFT has TWO transfer modes by asset type:
  - RWA receipt: non-transferable
  - NFT receipt: transferable

Receipt NFTs are informational artifacts only.

--------------------------------------------------

X.5 "DisputeManager controls funds"
--------------------------------------------------
INVALID.

Facts from code:
- DisputeManager never transfers tokens
- PaymentGateway is the sole escrow authority
- DisputeManager only instructs Marketplace

Disputes resolve state, not balances.

--------------------------------------------------

X.6 "Time windows are flexible or extendable by actors"
--------------------------------------------------
INVALID.

Facts from code:
- All timeouts are absolute
- Only arbiter can extend dispute deadline (once)
- Seller cannot extend confirmation window
- Buyer cannot extend payDeadline

AutoTimeManager enforces deadlines permissionlessly.

--------------------------------------------------

X.7 "AutoTimeManager is optional or best-effort"
--------------------------------------------------
INVALID.

Facts from code:
- Any address can trigger checkAndExecute
- Batch execution is permissionless
- Time-based transitions are guaranteed eventually

The system does NOT rely on goodwill keepers.

--------------------------------------------------

X.8 "Signatures imply binding commitments"
--------------------------------------------------
INVALID.

Facts from code:
- All signatures are off-chain
- Used only for intent verification
- No signature alone causes state transition

Only function execution changes state.

--------------------------------------------------

X.9 "PAID is not a hard boundary"
--------------------------------------------------
INVALID.

Facts from code:
- PAID is the first point where:
  - seller assets are locked
  - cancellation paths narrow
  - order enters settlement semantics with buyerSig2 validated

- Buyer funds are escrowed earlier at createOrder()

Before PAID:
- Buyer dominance applies
After PAID:
- Settlement logic applies

--------------------------------------------------

X.10 "The system follows standard DeFi marketplace symmetry"
--------------------------------------------------
INVALID.

Facts from code:
- Buyer and seller obligations are asymmetric
- Buyer controls order survival pre-PAID
- Seller commits only after payment

This asymmetry is deliberate and non-negotiable.

--------------------------------------------------

X.11 Enforcement Rule
--------------------------------------------------
Any reviewer MUST:

- Read code before spec
- Treat this section as normative
- Reject assumptions imported from:
  - DeFi AMMs
  - NFT marketplaces
  - Generic RWA frameworks

Failure to do so results in spec-code divergence.

==================================================


MarketplaceATP Protocol Specification
Version: 3.3-final
Status: Code-derived, post-implementation specification
Scope: On-chain behavior only

==================================================
TABLE OF CONTENTS
==================================================

1. System Overview & Trust Model
   1.1 Scope of Specification
   1.2 Design Goals and Non-Goals
   1.3 Actors and Authorities
   1.4 Trust Assumptions
   1.5 Global System Principles

==================================================
1. SYSTEM OVERVIEW & TRUST MODEL
==================================================

1.1 Scope of Specification
--------------------------------------------------
This specification describes the on-chain behavior of the
MarketplaceATP protocol version 3.3-final, derived strictly
from deployed smart contract code.

The specification covers:
- State transitions
- Authority boundaries
- Fund and asset custody behavior
- Time-based enforcement
- Dispute and settlement mechanics

The specification explicitly excludes:
- Off-chain order matching or negotiation
- UI/UX behavior
- Legal or real-world asset enforcement
- Any assumptions about honest behavior beyond what is stated
- Any behavior not directly observable from contract execution

In case of conflict, the smart contract code is the single
source of truth. This document is descriptive, not normative.

--------------------------------------------------

1.2 Design Goals and Non-Goals
--------------------------------------------------

Design Goals (as implemented in code):
- Enforce clear finality for each order
- Prevent fund or asset release before settlement
- Separate responsibilities across specialized contracts
- Externalize time-based logic to a dedicated executor
- Allow dispute resolution through a trusted arbiter
- Maintain simple, acyclic order state transitions

Explicit Non-Goals:
- Trustless or decentralized arbitration
- Censorship resistance
- Guaranteed liveness without trusted executors
- Atomic delivery-versus-payment guarantees
- Fairness guarantees in adversarial governance scenarios
- Prevention of griefing beyond explicit fees and timeouts

--------------------------------------------------

1.3 Actors and Authorities
--------------------------------------------------

The protocol defines the following actors. Their authorities are
derived strictly from callable functions and enforced roles.

--------------------------------------------------
1.3.1 Buyer
--------------------------------------------------
Capabilities:
- Create orders
- Provide off-chain signatures
- Pay escrowed funds
- Cancel orders while in PENDING_CONFIRM
- Confirm delivery before auto-release
- Open disputes within the dispute window

Limitations:
- Cannot prevent AutoTimeManager actions
- Cannot resolve disputes
- Cannot modify settlement after finalization
- Cannot release funds or assets directly

Buyer actions do not override time-based enforcement.

--------------------------------------------------
1.3.2 Seller
--------------------------------------------------
Capabilities:
- Confirm order intent (sellerConfirm)
- Participate in disputes
- Receive funds if settlement allows

Important Clarification:
- sellerConfirm is a soft intent signal
- sellerConfirm does NOT:
  - lock the buyer
  - prevent buyer cancellation
  - create a binding commitment

Seller has no authority over timeouts or settlement outcomes.

--------------------------------------------------
1.3.3 MarketplaceATP (Core Coordinator)
--------------------------------------------------
Role:
- Central state coordinator
- Stateless with respect to funds and assets

Responsibilities:
- Maintain order state
- Validate caller permissions
- Trigger cross-contract actions
- Enforce state invariants

Explicit Limitations:
- Does not custody funds
- Does not custody assets
- Does not enforce timeouts autonomously
- Does not decide dispute outcomes

MarketplaceATP is passive with respect to time.

--------------------------------------------------
1.3.4 AutoTimeManager (Trusted Time Executor)
--------------------------------------------------
Role:
- Sole authority for time-based state enforcement

Capabilities:
- Cancel orders after seller or buyer timeout
- Trigger automatic fund release after delivery window
- Resolve stale disputes by escalation

Properties:
- Trusted executor
- No economic stake in outcomes
- Marketplace must accept its calls as valid

If AutoTimeManager fails or acts maliciously:
- Orders may stall or transition incorrectly
- The protocol does not provide recovery guarantees

--------------------------------------------------
1.3.5 DisputeManager (Trusted Arbiter)
--------------------------------------------------
Role:
- Exclusive authority over dispute outcomes

Capabilities:
- Open disputes (via Marketplace only)
- Resolve disputes with binding verdicts
- Deduct dispute fees
- Resolve disputes after deadline expiry

Properties:
- Fully trusted arbitration
- Verdicts are final and unchallengeable on-chain
- Marketplace does not validate arbitration logic

DisputeManager behavior is assumed correct by design.

--------------------------------------------------
1.3.6 Governance (Timelock)
--------------------------------------------------
Role:
- Root administrative authority

Capabilities:
- Assign and revoke roles
- Configure fees
- Register modules
- Pause system components
- Set dispute manager
- Emergency fund withdrawal (with escrow protection)

Governance is explicitly trusted.
The protocol does not defend against malicious governance.

--------------------------------------------------

1.4 Trust Assumptions
--------------------------------------------------

The protocol relies on the following assumptions:

1. Governance acts in the protocol’s intended interest
2. AutoTimeManager executes time-based actions correctly
3. DisputeManager resolves disputes honestly or per governance intent
4. External ERC20 tokens behave according to standard semantics
5. No role key compromise occurs

Violation of these assumptions may result in:
- Loss of fairness
- Order griefing
- Arbitrary settlement outcomes

The protocol does not attempt to mitigate these risks.

--------------------------------------------------

1.5 Global System Principles
--------------------------------------------------

The following principles are enforced by code:

- Finality is absolute:
  Once orders[orderId].finalized == true, no further state
  transitions or value movements are valid.

- Time is externalized:
  MarketplaceATP does not track elapsed time logically.
  All deadline enforcement is delegated.

- Soft intent vs hard commitment:
  sellerConfirm expresses intent only.
  Hard commitment begins at the PAID state.

- Effects before interactions:
  State transitions occur before cross-contract effects.

- No hidden state:
  All critical order data is stored on-chain and publicly observable.

==================================================
2. ORDER LIFECYCLE & STATE MACHINE
==================================================
CANONICAL ASCII DIAGRAM
--------------------------------------------------
┌──────────────────────┐
│ PENDING_CONFIRM      │
│ buyer sig1 + escrow  │ 24H
│ seller confirm       │
└─────────┬────────────┘
    24H   │ buyer sig2
          ▼
┌──────────────────────┐
│ PAID                 │
│ escrow + asset lock  │ SELLER SET TIME
│ autoReleaseAt active │
└──────┬─────────┬─────┘
       │         │ 
       │         │ autoRelease
       │         ▼
       │   ┌──────────────────┐
 3 DAYS│   │ FINALIZED        │
       │   └──────────────────┘
       │
       │ open dispute
       ▼
┌──────────────────────┐
│ DISPUTED             │ 14 DAY + 14 DAY EXTEND
│ deadline active      │
└─────────┬────────────┘
          ▼
     ┌──────────────┐
     │ FINALIZED    │
     └──────────────┘

--------------------------------------------------    
This section defines the full order lifecycle as implemented
in code. All transitions described here are exhaustive.
Any transition not listed is INVALID and MUST revert.

--------------------------------------------------
2.1 Order Structure
--------------------------------------------------

Each order is represented by the following logical fields
(reduced to lifecycle-relevant data):

- buyer: address
- seller: address
- state: OrderState enum
- finalized: bool
- proposedAt: uint256
- sellerConfirmed: bool
- payDeadline: uint256 (set on sellerConfirm)
- paidAt: uint256 (optional)

The following fields are authoritative:

- finalized: sole source of truth for terminality
- state: workflow phase indicator only

--------------------------------------------------
2.2 OrderState Enumeration
--------------------------------------------------

enum OrderState {
    PENDING_CONFIRM,
    PAID,
    DISPUTED,
    FINALIZED,
    CANCELLED
}

Semantic meaning:

- PENDING_CONFIRM:
  Order exists, buyer escrow funded, no asset lock.

- PAID:
  Buyer funds escrowed.
  Seller assets locked.

- DISPUTED:
  Settlement paused pending arbitration.

- FINALIZED:
  Label applied during final settlement.
  Terminal only because finalized == true.

- CANCELLED:
  Order aborted.
  Terminal only because finalized == true.

--------------------------------------------------
2.3 Order Creation
--------------------------------------------------

Entry Point:
- createOrder(...)

Preconditions:
- buyer == msg.sender
- parameters valid per constructor checks

Effects:
- orders[orderId].state = PENDING_CONFIRM
- orders[orderId].finalized = false
- orders[orderId].proposedAt = block.timestamp

Postconditions:
- Buyer funds escrowed (depositEscrow at createOrder)
- No assets locked
- Seller not committed

Creation does NOT imply:
- seller consent
- asset availability
- seller asset lock or PAID state

--------------------------------------------------
2.4 PENDING_CONFIRM Phase
--------------------------------------------------

This phase exists from order creation until one of the
following terminal or advancing events occurs.

--------------------------------------------------
2.4.1 Seller Confirmation
--------------------------------------------------

Entry Point:
- sellerConfirm(orderId)

Preconditions:
- msg.sender == seller
- orders[orderId].state == PENDING_CONFIRM
- finalized == false
- current time within SELLER_CONFIRM_WINDOW

Effects:
- orders[orderId].sellerConfirmed = true
- orders[orderId].sellerSig stored
- orders[orderId].estDeliverySeconds set/updated
- orders[orderId].payDeadline = block.timestamp + PAY_TIMEOUT

Non-Effects (explicit):
- state remains PENDING_CONFIRM
- finalized remains false
- no escrow movement
- no asset lock

Seller confirmation is non-binding economically, but starts the buyer pay window.

--------------------------------------------------
2.4.2 Buyer Cancellation
--------------------------------------------------

Entry Point:
- cancelByBuyer(orderId)

Preconditions:
- msg.sender == buyer
- orders[orderId].state == PENDING_CONFIRM
- finalized == false

Effects:
- orders[orderId].state = CANCELLED
- orders[orderId].finalized = true

Postconditions:
- Order is terminal
- Seller confirmation (if any) is void
- No dispute may be opened

--------------------------------------------------
2.4.3 AutoTimeManager Cancellation
--------------------------------------------------

Entry Point:
- AutoTimeManager.checkAndExecute(orderId) -> Marketplace.cancelOrder(orderId)

Caller:
- AutoTimeManager only

Preconditions:
- orders[orderId].state == PENDING_CONFIRM
- finalized == false
- current time >= seller confirmation deadline
  OR current time >= payDeadline (when sellerConfirmed == true)

Effects:
- orders[orderId].state = CANCELLED
- orders[orderId].finalized = true

Postconditions:
- Terminal cancellation
- No recovery path

--------------------------------------------------
2.4.4 Buyer Payment
--------------------------------------------------

Entry Point:
- payOrder(orderId)

Preconditions:
- msg.sender == buyer
- orders[orderId].state == PENDING_CONFIRM
- finalized == false
- sellerConfirmed == true
- payDeadline != 0
- current time <= payDeadline

Effects (order-local):
- orders[orderId].state = PAID
- orders[orderId].paidAt = block.timestamp

Effects (external, after state change):
- Buyer escrow was already funded at createOrder (no new core escrow deposit here)
- OrinaRWA.lockAmount locks seller assets

Postconditions:
- Order advances to settlement phase
- Cancellation paths are restricted

--------------------------------------------------
2.4.5 Invalid Actions in PENDING_CONFIRM
--------------------------------------------------

The following MUST revert:

- Seller attempting to cancel
- Seller attempting to force payment
- Buyer opening dispute
- Any action if finalized == true

--------------------------------------------------
2.4.6 Exit Conditions Summary
--------------------------------------------------

From PENDING_CONFIRM, the order may:

- Advance to PAID (buyer payment)
- Terminate as CANCELLED (buyer or AutoTimeManager)

No other transitions are valid.

==================================================
3. POST-PAYMENT LIFECYCLE (PAID → FINALIZATION)
==================================================

This section specifies all behavior after a successful
buyer payment. All rules are derived strictly from code.

--------------------------------------------------
3.1 Entry Into PAID State
--------------------------------------------------

Entry Point:
- payOrder(orderId)

Authoritative transitions:
- state: PENDING_CONFIRM → PAID
- paidAt = block.timestamp
- autoReleaseAt = block.timestamp + estDeliverySeconds

Authoritative invariants after entry:
- finalized == false
- sellerConfirmed == true
- escrow funded
- seller asset locked

Single source of truth for “paid”:
- state == PAID
- paidAt != 0 is auxiliary only

--------------------------------------------------
3.2 PAID State Semantics
--------------------------------------------------

While state == PAID and finalized == false, the order
exists in one of three implicit sub-phases determined
ONLY by time comparisons. No explicit enum tracks these.

Sub-phases are DERIVED, not stored.

--------------------------------------------------
3.2.1 Delivery Window
--------------------------------------------------

Condition:
- block.timestamp <= autoReleaseAt

Allowed actions:
- confirmDelivery() by buyer

Forbidden actions:
- dispute
- autoRelease
- cancellation

--------------------------------------------------
3.2.2 Auto-Release Eligible Window
--------------------------------------------------

Condition:
- block.timestamp > autoReleaseAt

This phase is logically split:

a) Dispute window:
   - block.timestamp <= autoReleaseAt + BUYER_ACTION_WINDOW

b) Post-dispute window:
   - block.timestamp > autoReleaseAt + BUYER_ACTION_WINDOW

--------------------------------------------------
3.3 Buyer Delivery Confirmation
--------------------------------------------------

Entry Point:
- confirmDelivery(orderId)

Preconditions:
- msg.sender == buyer
- state == PAID
- finalized == false
- block.timestamp <= autoReleaseAt

Effects:
- settlementType = FULL_RELEASE
- immediate finalize(orderId)

Postconditions:
- Order becomes terminal
- Funds released to seller
- Assets consumed
- Receipt minted

--------------------------------------------------
3.4 Auto Release
--------------------------------------------------

Entry Point:
- autoRelease(orderId)

Caller:
- AUTOTIME_ROLE only

Preconditions:
- state == PAID
- finalized == false
- block.timestamp >= autoReleaseAt

Effects:
- settlementType = FULL_RELEASE
- finalize(orderId)

Notes:
- Does NOT wait for dispute window to close
- BUYER_ACTION_WINDOW applies ONLY to dispute opening

--------------------------------------------------
3.5 Dispute Opening
--------------------------------------------------

Entry Point:
- openDispute(orderId)

Callers:
- buyer OR seller

Preconditions (ALL required):
- state == PAID
- finalized == false
- block.timestamp > autoReleaseAt
- block.timestamp <= autoReleaseAt + BUYER_ACTION_WINDOW

Effects:
- state = DISPUTED
- disputeManager.openDispute(orderId)

Postconditions:
- Settlement frozen pending dispute resolution

--------------------------------------------------
3.6 DISPUTED State Semantics
--------------------------------------------------

state == DISPUTED implies:
- escrow locked
- assets remain locked
- no autoRelease
- no confirmDelivery
- no cancellation

Only valid exit:
- setDisputeResolved()

--------------------------------------------------
3.7 Dispute Resolution
--------------------------------------------------

Entry Point:
- setDisputeResolved(orderId, settlement, ...)

Caller:
- disputeManager ONLY

Preconditions:
- state == DISPUTED
- finalized == false

Effects:
- settlementType set
- optional split ratios validated
- finalize(orderId)

--------------------------------------------------
3.8 Finalization (Authoritative Terminal Transition)
--------------------------------------------------

Entry Point:
- _finalize(orderId)

Preconditions:
- finalized == false
- state == PAID OR state == DISPUTED

Authoritative effects:
- finalized = true
- state = FINALIZED

Side effects (external):
- fee distribution
- seller payout and/or buyer refund
- asset consume/unlock
- receipt mint

--------------------------------------------------
3.9 Terminality Rules (CRITICAL)
--------------------------------------------------

The ONLY authoritative terminal flag is:

- finalized == true

state == FINALIZED or state == CANCELLED
is NOT authoritative on its own.

Any logic treating state as terminal without checking
finalized is INVALID by spec.

--------------------------------------------------
3.10 Invalid Actions Post-Payment
--------------------------------------------------

MUST revert:
- cancelByBuyer
- cancelOrder
- sellerConfirm
- payOrder again
- create dispute outside window
- any action if finalized == true

==================================================
4. TIME SEMANTICS & DEADLINES (AUTHORITATIVE)
==================================================

This section defines ALL time-related semantics.
No inferred intent. Code is the only source.

--------------------------------------------------
4.1 Time Sources
--------------------------------------------------

The ONLY time source is:
- block.timestamp

No off-chain clocks.
No oracle time.
No monotonic assumptions beyond EVM guarantees.

--------------------------------------------------
4.2 Constants (Hard-Coded)
--------------------------------------------------

SELLER_CONFIRM_WINDOW = 24 hours
PAY_TIMEOUT           = 24 hours
BUYER_ACTION_WINDOW   = 3 days

These values are immutable at runtime.

--------------------------------------------------
4.3 Order Proposal Time
--------------------------------------------------

At createOrder():

- proposedAt = block.timestamp

proposedAt is the anchor for:
- seller confirmation deadline

payDeadline is initialized later in sellerConfirm().

--------------------------------------------------
4.4 Seller Confirmation Window
--------------------------------------------------

Seller confirmation deadline:

- sellerConfirmDeadline
  = proposedAt + SELLER_CONFIRM_WINDOW

Enforced in:
- sellerConfirm()

Rules:
- sellerConfirm MUST occur on or before deadline
- no grace period
- no extension
- expiration does NOT auto-cancel
- cancellation requires explicit action

--------------------------------------------------
4.5 Buyer Payment Deadline (CRITICAL SEMANTICS)
--------------------------------------------------

payDeadline is set at sellerConfirm():

- payDeadline
  = sellerConfirmTime + PAY_TIMEOUT

Authoritative behavior:
- Buyer payment window STARTS at sellerConfirm
- sellerConfirm initializes and shifts payDeadline to the confirmation timestamp

This is the implemented code path.

Spec correction:
- Buyer payment window DOES begin at sellerConfirm
- Seller confirmation DOES set/shift payDeadline

--------------------------------------------------
4.6 Payment Time Invariants
--------------------------------------------------

payOrder() requires:
- block.timestamp <= payDeadline
- sellerConfirmed == true

Thus:
- Seller may confirm late within window
- Buyer receives a PAY_TIMEOUT window after sellerConfirm (subject to exact-deadline tx ordering)

No violation of code invariants occurs.

--------------------------------------------------
4.7 Paid Timestamp
--------------------------------------------------

At successful payment:

- paidAt = block.timestamp

paidAt is informational only.
No logic depends on paidAt directly.

--------------------------------------------------
4.8 Auto Release Timestamp
--------------------------------------------------

At successful payment:

- autoReleaseAt
  = block.timestamp + estDeliverySeconds

estDeliverySeconds:
- provided at order creation
- not bounded by protocol
- trusted input

--------------------------------------------------
4.9 Delivery Window
--------------------------------------------------

Delivery window:
- [paidAt, autoReleaseAt]

Within this window:
- buyer may confirm delivery
- autoRelease is forbidden
- dispute is forbidden

--------------------------------------------------
4.10 Dispute Window
--------------------------------------------------

Dispute eligibility window:
- (autoReleaseAt, autoReleaseAt + BUYER_ACTION_WINDOW]

Rules:
- dispute can ONLY be opened in this window
- autoRelease does NOT wait for window close
- dispute window is independent of autoRelease execution

--------------------------------------------------
4.11 Post-Dispute Window
--------------------------------------------------

After:
- block.timestamp > autoReleaseAt + BUYER_ACTION_WINDOW

Effects:
- dispute can no longer be opened
- autoRelease remains valid if not finalized
- order can still be finalized

--------------------------------------------------
4.12 Cancel Timing
--------------------------------------------------

cancelOrder():
- callable ONLY by autoTimeManager
- ONLY after sellerConfirm window expires
- ONLY if state == PENDING_CONFIRM

cancelByBuyer():
- callable anytime while PENDING_CONFIRM
- ignores windows

--------------------------------------------------
4.13 No Time-Based Reversal
--------------------------------------------------

Once finalized == true:
- no timestamp can reopen state
- no dispute
- no cancel
- no re-release

--------------------------------------------------
4.14 Invalid Time Assumptions (REJECTED)
--------------------------------------------------

The following assumptions are INVALID:
- Buyer payment window starts at order creation
- autoRelease waits for dispute window end
- sellerConfirm does NOT set/shift payDeadline
- time windows compose dynamically

--------------------------------------------------
4.15 Single Source of Truth (TIME)
--------------------------------------------------

All time logic is derived from:
- proposedAt
- paidAt (informational)
- autoReleaseAt
- block.timestamp

No derived timestamps are stored besides payDeadline.

==================================================
5. STATE MACHINE, FINALITY & SINGLE SOURCE OF TRUTH
==================================================

This section defines the authoritative state machine.
Any deviation is a spec violation.

--------------------------------------------------
5.1 Stored State Variables
--------------------------------------------------

Each order stores TWO related but distinct fields:

- OrderState state
- bool finalized

Both exist in code and MUST be specified.

--------------------------------------------------
5.2 OrderState Enum (Non-Terminal by Itself)
--------------------------------------------------

OrderState values:

- PENDING_CONFIRM
- PAID
- DISPUTED
- FINALIZED
- CANCELLED

IMPORTANT:
- state is NOT sufficient to determine terminality
- FINALIZED is a label, not authority

--------------------------------------------------
5.3 finalized Flag (Authoritative Terminal Indicator)
--------------------------------------------------

The ONLY authoritative indicator that an order is
terminal and immutable is:

- finalized == true

This flag is checked by:
- notFinalized modifier
- all critical mutating functions

--------------------------------------------------
5.4 Single Source of Truth (FINALITY)
--------------------------------------------------

Single source of truth for finality:

- orders[orderId].finalized

state MUST NOT be used alone to infer finality.

--------------------------------------------------
5.5 Why FINALIZED Exists in state (EXPLANATORY, NOT INTENT)
--------------------------------------------------

From code behavior:

- state is used for coarse lifecycle routing
- finalized is used for hard lock

state == FINALIZED occurs ONLY inside _finalize(),
together with finalized = true.

There is NO code path where:
- finalized == true
- AND state != FINALIZED or CANCELLED

But the inverse is NOT generally safe by design.

--------------------------------------------------
5.6 CANCELLED vs FINALIZED
--------------------------------------------------

Cancellation paths:

- cancelOrder()
- cancelByBuyer()

Effects:
- state = CANCELLED
- finalized = true

Thus:
- CANCELLED is terminal
- FINALIZED is terminal
- terminality is still governed by finalized flag

--------------------------------------------------
5.7 Valid State Transitions (Authoritative)
--------------------------------------------------

PENDING_CONFIRM →
- PAID
- CANCELLED

PAID →
- DISPUTED
- FINALIZED (via finalize)

DISPUTED →
- FINALIZED (via finalize)

FINALIZED →
- no transitions

CANCELLED →
- no transitions

--------------------------------------------------
5.8 Forbidden Transitions
--------------------------------------------------

MUST NEVER occur:

- FINALIZED → any
- CANCELLED → any
- PAID → PENDING_CONFIRM
- DISPUTED → PAID
- any → CANCELLED except from PENDING_CONFIRM

--------------------------------------------------
5.9 Invariant Enforcement
--------------------------------------------------

Invariant A:
- finalized == true ⇒ order is immutable

Invariant B:
- finalized == false ⇒ order may transition
  only if state permits

Invariant C:
- state == FINALIZED ⇒ finalized == true
  (enforced in _finalize)

Invariant D (IMPORTANT):
- state alone is NEVER authoritative for terminality

--------------------------------------------------
5.10 Audit Pitfall (COMMON)
--------------------------------------------------

Treating:
- state == FINALIZED
as equivalent to:
- finalized == true

is INVALID unless explicitly paired.

--------------------------------------------------
5.11 Spec Correction (DISPUTE POINT)
--------------------------------------------------

Any prior spec claiming:
- “state == FINALIZED is the terminal truth”

is WRONG.

Correct statement:
- finalized flag is the single source of truth
- state is descriptive, not authoritative

--------------------------------------------------
5.12 Consequences
--------------------------------------------------

- Double source exists by design
- Only ONE is authoritative
- This is NOT a bug if respected
- It IS a spec violation if undocumented

==================================================
6. ASSETS, ESCROW, FEES & IRREVERSIBILITY
==================================================

This section specifies all value movement and
irreversible effects. Code is authoritative.

--------------------------------------------------
6.1 Escrow Funding
--------------------------------------------------

At createOrder():

- paymentGateway.depositEscrow()
- buyer funds escrow immediately
- escrow is protocol-controlled

Invariant:
- No order exists without escrow funded

--------------------------------------------------
6.2 Asset Locking
--------------------------------------------------

At payOrder():

- rwa.lockAmount(assetId, orderId, amount)

Effects:
- seller’s asset is locked
- cannot be transferred or reused
- lock is order-scoped

Invariant:
- PAID ⇒ asset locked
- non-PAID ⇒ asset not locked

--------------------------------------------------
6.3 Fee Snapshots
--------------------------------------------------

At createOrder(), the following are snapshotted:

- platformFeeBpsSnapshot
- daoFeeBpsSnapshot
- burnFeeBpsSnapshot

Rules:
- Fees are IMMUTABLE per order
- Governance changes do NOT affect existing orders

--------------------------------------------------
6.4 Finalization Fee Calculation
--------------------------------------------------

At _finalize():

- p = grossPrice * platformFeeBpsSnapshot / 10000
- d = grossPrice * daoFeeBpsSnapshot / 10000
- b = grossPrice * burnFeeBpsSnapshot / 10000
- net = grossPrice - (p + d + b)

Fees are distributed BEFORE settlement.

--------------------------------------------------
6.5 Settlement Types
--------------------------------------------------

SettlementType enum:

- FULL_RELEASE
- FULL_REFUND
- SPLIT

SettlementType MUST be set before finalize().

--------------------------------------------------
6.6 FULL_RELEASE Semantics
--------------------------------------------------

Effects:
- paymentGateway.releaseToSeller(net)
- rwa.consumeLocked(amount)
- receiptNFT.mint(buyer, amount)

Irreversible:
- asset consumed
- receipt minted
- seller paid

--------------------------------------------------
6.7 FULL_REFUND Semantics
--------------------------------------------------

Effects:
- paymentGateway.refundBuyer(grossPrice)
- rwa.unlockAmount(amount)

Irreversible:
- escrow emptied
- asset returned to seller control

--------------------------------------------------
6.8 SPLIT Semantics
--------------------------------------------------

Preconditions:
- buyerShareBps + sellerShareBps == 10000

Effects:
- seller receives proportional net
- buyer refunded proportional net
- seller asset consumed partially
- remaining asset unlocked
- receipt minted for buyer portion

--------------------------------------------------
6.9 Irreversibility Invariant
--------------------------------------------------

Once _finalize() executes successfully:

- funds have moved
- assets have been consumed/unlocked
- receipts may have been minted

There is NO rollback path.

--------------------------------------------------
6.10 Disallowed Post-Finalization Effects
--------------------------------------------------

After finalized == true:

MUST NOT occur:
- any escrow movement
- asset lock/unlock
- receipt mint
- dispute
- cancellation

--------------------------------------------------
6.11 External Calls Safety Model
--------------------------------------------------

External calls during finalize:
- paymentGateway
- rwa
- receiptNft

Assumptions:
- All external calls are unsafe
- Reentrancy protected by:
  - nonReentrant modifiers
  - finalized flag set at end

Spec NOTE:
- finalize sets finalized AFTER external calls
- reentrancy relies on guard + state checks

--------------------------------------------------
6.12 Finality vs Economic Completion
--------------------------------------------------

Economic completion occurs ONLY when:
- finalize() succeeds fully

Partial execution is INVALID.

==================================================
7. SIGNATURES, EIP712 USAGE & REPLAY BOUNDARIES
==================================================

This section specifies all signature logic exactly
as implemented. No “best practice” inference.

--------------------------------------------------
7.1 Signature Scheme
--------------------------------------------------

Standard used:
- EIP-712 Typed Data
- OpenZeppelin EIP712 base

Domain:
- name    = "MarketplaceATP"
- version = "3.3-final"
- chainId = implicit via EIP712
- verifyingContract = this contract

--------------------------------------------------
7.2 Signed Payload Definition
--------------------------------------------------

Type hash:

Order(
  uint256 orderId,
  address buyer,
  address seller,
  uint256 grossPrice,
  uint256 amount,
  uint256 estDeliverySeconds
)

NO other fields are signed.

--------------------------------------------------
7.3 Signature Roles
--------------------------------------------------

Required signatures per order:

- buyerSig1: buyer intent (pre-proposal)
- sellerSig: seller confirmation
- buyerSig2: buyer payment confirmation

--------------------------------------------------
7.4 buyerSig1 Semantics
--------------------------------------------------

Provided at:
- createOrder()

Validated at:
- payOrder()

Rules:
- Must recover to buyer
- Must match same digest as other signatures
- Stored permanently

buyerSig1 alone does NOT authorize payment.

--------------------------------------------------
7.5 sellerSig Semantics
--------------------------------------------------

Provided at:
- sellerConfirm()

Validated at:
- sellerConfirm()
- payOrder()

Rules:
- Must recover to seller
- Confirms agreement to order terms
- Required before buyer can pay

--------------------------------------------------
7.6 buyerSig2 Semantics
--------------------------------------------------

Provided at:
- payOrder()

Validated at:
- payOrder()

Rules:
- Must recover to buyer
- Confirms final buyer consent
- Required even if buyerSig1 exists

--------------------------------------------------
7.7 Multi-Signature Invariant
--------------------------------------------------

payOrder() requires ALL:

- valid buyerSig1
- valid sellerSig
- valid buyerSig2

All signatures MUST sign the SAME digest.

--------------------------------------------------
7.8 Replay Scope
--------------------------------------------------

Replay protection scope:

- chainId (via EIP712 domain)
- verifyingContract address

Signatures are NOT portable across:
- chains
- deployments
- forks with different chainId

--------------------------------------------------
7.9 Cross-Chain Replay Risk (CLARIFIED)
--------------------------------------------------

Risk profile:

- No bypass of authorization
- No loss of funds
- BUT signatures are tightly coupled
  to deployment context

Consequences:
- Client-side signing errors possible
- Migration or upgrade invalidates signatures
- Not spec-incorrect, but operationally brittle

--------------------------------------------------
7.10 What Is NOT Signed (IMPORTANT)
--------------------------------------------------

The following are NOT signed:

- paymentToken
- assetId
- fee snapshots
- time windows
- settlement type
- payDeadline

These values are trusted to on-chain logic.

--------------------------------------------------
7.11 Signature Timing Assumptions
--------------------------------------------------

Signatures are assumed to be:

- off-chain generated
- non-expiring
- single-use per orderId

No nonce beyond orderId exists.

--------------------------------------------------
7.12 Invalid Assumptions (REJECTED)
--------------------------------------------------

INVALID:
- Signatures imply payment happened
- Signatures imply delivery
- Signatures imply finality

They only imply agreement to parameters.

--------------------------------------------------
7.13 Spec Compliance Note
--------------------------------------------------

Any spec claiming:
- EIP712 misuse causes authorization bypass

is WRONG.

Correct statement:
- EIP712 usage is safe but non-portable
- Risk is operational, not security-critical

==================================================
8. DISPUTE SYSTEM, FREEZE GUARANTEES & LOCK SEMANTICS
==================================================

This section mirrors on-chain behavior exactly.
No inferred arbitration powers.

--------------------------------------------------
8.1 Dispute Eligibility
--------------------------------------------------

An order MAY enter dispute iff ALL:

- state == PAID
- block.timestamp > autoReleaseAt
- block.timestamp <= autoReleaseAt + BUYER_ACTION_WINDOW
- caller ∈ {buyer, seller}
- finalized == false

Else: revert("WINDOW" | "BAD_STATE" | "NOT_PARTY")

--------------------------------------------------
8.2 Dispute Entry Effects
--------------------------------------------------

openDispute(orderId):

- state := DISPUTED
- external call:
    IDisputeManager.openDispute(orderId)

NO funds moved.
NO locks changed.

--------------------------------------------------
8.3 Freeze Guarantees
--------------------------------------------------

While DISPUTED:

- _finalize() blocked except via disputeManager
- autoRelease impossible (state mismatch)
- buyer cannot confirmDelivery

Escrow, RWA locks, and receipts remain frozen.

--------------------------------------------------
8.4 Dispute Authority (Single Source of Truth)
--------------------------------------------------

ONLY disputeManager may call:

setDisputeResolved(
  orderId,
  settlement,
  buyerShareBps,
  sellerShareBps
)

No other address can resolve.

This is the ONLY resolution path once DISPUTED.

--------------------------------------------------
8.5 Settlement Types
--------------------------------------------------

Allowed settlements:

- FULL_RELEASE
- FULL_REFUND
- SPLIT (buyerShareBps + sellerShareBps == 10000)

Invalid ratios revert.

--------------------------------------------------
8.6 Resolution Side Effects
--------------------------------------------------

On setDisputeResolved():

- settlementType set
- optional split recorded
- optional module hook:
    disputeResolver.execute(...)
- _finalize(orderId) invoked immediately

No intermediate state exists.

--------------------------------------------------
8.7 Lock Semantics (RWA)
--------------------------------------------------

Locks are applied ONLY at payOrder():

- rwa.lockAmount(assetId, orderId, amount)

Locks are released or consumed ONLY at finalize:

- FULL_RELEASE:
    consumeLocked(full amount)

- FULL_REFUND:
    unlockAmount(full amount)

- SPLIT:
    consumeLocked(seller portion)
    unlockAmount(buyer portion)

No other path mutates RWA locks.

--------------------------------------------------
8.8 Escrow Semantics
--------------------------------------------------

Funds deposited at createOrder().

Funds released ONLY in _finalize():

- seller receives net (after fees)
- buyer refunded per settlement
- platform/dao/burn fees distributed once

No partial releases outside finalize.

--------------------------------------------------
8.9 Receipt NFT Semantics
--------------------------------------------------

Receipt minted ONLY in finalize():

- FULL_RELEASE:
    mint full amount

- SPLIT:
    mint buyer portion

- FULL_REFUND:
    no mint

Transferability depends on assetType recorded at mint:

- assetType == RWA:
  receipt is non-transferable (only mint path allowed;
  transfer/burn paths are blocked by receipt contract logic)

- assetType == NFT:
  receipt is transferable via standard ERC721 transfer flow

Receipt issuance is final and irreversible.

--------------------------------------------------
8.10 Auto-Release vs Dispute Precedence
--------------------------------------------------

If autoReleaseAt passed AND no dispute opened:

- autoRelease() may finalize

If dispute opened BEFORE autoRelease execution:

- autoRelease blocked
- dispute flow dominates

--------------------------------------------------
8.11 What Dispute Manager CANNOT Do
--------------------------------------------------

Dispute manager CANNOT:

- change prices
- change fees
- re-lock or unlock arbitrarily
- mint receipts directly
- bypass finalize logic

Its power is limited to choosing settlementType.

--------------------------------------------------
8.12 Spec Clarification (Important)
--------------------------------------------------

Dispute system is:

- synchronous
- final
- single-authority
- non-appealable on-chain

Any spec claiming multi-stage or appeal
is INVALID.

==================================================
9. TIME WINDOWS, DEADLINES & AUTOTIME AUTHORITY
==================================================

This section strictly reflects implemented semantics.
No inferred fairness guarantees.

--------------------------------------------------
9.1 Time Constants (Authoritative)
--------------------------------------------------

- SELLER_CONFIRM_WINDOW = 24 hours
- PAY_TIMEOUT           = 24 hours
- BUYER_ACTION_WINDOW   = 3 days

All timestamps are unix seconds.
block.timestamp is the sole clock.

--------------------------------------------------
9.2 Order Proposal Time Anchor
--------------------------------------------------

At createOrder():

- proposedAt := block.timestamp

This is the ONLY anchor for:
- seller confirmation window
- seller confirmation timeout path

payDeadline is set later when sellerConfirm() succeeds.

--------------------------------------------------
9.3 Seller Confirmation Window
--------------------------------------------------

Seller MUST confirm iff:

- state == PENDING_CONFIRM
- block.timestamp <= proposedAt + SELLER_CONFIRM_WINDOW

Else:
- sellerConfirm reverts ("CONFIRM_EXPIRED")

No grace period.
No extension.
No override.

--------------------------------------------------
9.4 Pay Deadline Semantics (Important)
--------------------------------------------------

payDeadline is set at sellerConfirm():

payDeadline :=
  sellerConfirmTime
+ PAY_TIMEOUT

Key properties:

- payDeadline is created from the sellerConfirm timestamp
- buyer gets a PAY_TIMEOUT window after sellerConfirm
- this is INTENTIONAL per current code

Spec MUST NOT claim:
- “buyer pay window starts at order creation”
- “sellerConfirm does not set/shift payDeadline”

Those statements are INVALID.

--------------------------------------------------
9.5 Buyer Pay Window (Effective)
--------------------------------------------------

Buyer MAY pay iff:

- sellerConfirmed == true
- block.timestamp <= payDeadline
- state == PENDING_CONFIRM

Effective buyer window =
  [sellerConfirmTime, payDeadline]

This window is PAY_TIMEOUT long by construction (subject to exact-deadline tx ordering).

--------------------------------------------------
9.6 Paid Time Anchors
--------------------------------------------------

At payOrder():

- paidAt := block.timestamp
- autoReleaseAt := block.timestamp + estDeliverySeconds

autoReleaseAt is independent of:
- proposedAt
- payDeadline
- sellerConfirm timing

--------------------------------------------------
9.7 Delivery / Auto-Release Boundary
--------------------------------------------------

Before autoReleaseAt:

- buyer may confirmDelivery()

After autoReleaseAt:

- confirmDelivery blocked
- dispute window may open
- autoRelease MAY execute (if no dispute)

--------------------------------------------------
9.8 Buyer Action / Dispute Window
--------------------------------------------------

Dispute window:

(block.timestamp > autoReleaseAt)
AND
(block.timestamp <= autoReleaseAt + BUYER_ACTION_WINDOW)

Outside this range:
- openDispute reverts

--------------------------------------------------
9.9 AutoTime Authority
--------------------------------------------------

MarketplaceATP access model (authoritative):

- autoRelease(orderId):
  direct caller MUST have AUTOTIME_ROLE

- cancelOrder(orderId):
  direct caller MUST equal stored autoTimeManager contract address

AutoTimeManager entrypoints (`checkAndExecute`, `batchCheckAndExecute`)
are permissionless, so any EOA may trigger the autoTimeManager contract
to call MarketplaceATP.

AUTOTIME_ROLE is initially granted in constructor and remains
admin-manageable via AccessControl.

--------------------------------------------------
9.10 Auto-Cancel Semantics
--------------------------------------------------

Auto-cancel (via AutoTimeManager.checkAndExecute) is allowed iff:

- state == PENDING_CONFIRM
- caller == autoTimeManager path
- AND either:
  - seller not confirmed AND block.timestamp >= proposedAt + SELLER_CONFIRM_WINDOW
  - seller confirmed AND payDeadline != 0 AND block.timestamp >= payDeadline

Effects:

- state := CANCELLED
- finalized := true
- buyer refunded

--------------------------------------------------
9.11 No Implicit Time-Based Finalization
--------------------------------------------------

Time passing alone NEVER finalizes an order.

All finalization requires:
- explicit function call
- passing state + time guards

--------------------------------------------------
9.12 Spec Corrections Summary
--------------------------------------------------

The following spec claims are INVALID and REMOVED:

- “Buyer pay window starts at order creation”
- “Seller confirmation does not set payDeadline”
- “Deadlines shift dynamically”

The following is AUTHORITATIVE:

- payDeadline is set on sellerConfirm and anchored to sellerConfirmTime.

==================================================
10. FINALITY, STATE vs finalized FLAG & INVARIANTS
==================================================

This section corrects prior spec errors.
It is CRITICAL and authoritative.

--------------------------------------------------
10.1 Dual Fields Overview
--------------------------------------------------

Each order has TWO related but distinct fields:

- OrderState state
- bool finalized

They do NOT represent the same concept.

--------------------------------------------------
10.2 Single Source of Truth (Terminality)
--------------------------------------------------

The ONLY authoritative indicator of terminality is:

    orders[orderId].finalized == true

All hard guards enforce finality via:

    modifier notFinalized()

OrderState is NOT used to gate terminal behavior.

--------------------------------------------------
10.3 Meaning of finalized Flag
--------------------------------------------------

finalized == true guarantees:

- no further lifecycle transitions
- no dispute
- no payment
- no delivery confirmation
- no autoRelease
- no cancel

This is an irreversible latch.

--------------------------------------------------
10.4 Meaning of OrderState.FINALIZED
--------------------------------------------------

OrderState.FINALIZED is a LABEL indicating:

- settlement completed
- UI / indexing clarity
- post-finalize status reporting

It is NOT a guard.
It is NOT authoritative.

Spec MUST NOT claim otherwise.

--------------------------------------------------
10.5 Legitimate Coexistence
--------------------------------------------------

The following state is VALID and EXPECTED:

- finalized == true
- state == FINALIZED

But finality is derived ONLY from finalized.

--------------------------------------------------
10.6 Why Two Fields Exist (Non-Normative)
--------------------------------------------------

- finalized: safety latch
- state: workflow marker

They serve different purposes.
No redundancy exists at runtime enforcement level.

--------------------------------------------------
10.7 Invariant Definitions
--------------------------------------------------

Invariant A (Hard):

    finalized == true
    ⇒ no external entrypoint may mutate order

Invariant B (Soft):

    state == FINALIZED
    ⇒ finalized == true

Invariant B is enforced by _finalize() only.

--------------------------------------------------
10.8 Forbidden Spec Claims
--------------------------------------------------

The following claims are INVALID and REMOVED:

- “OrderState is the single source of truth”
- “FINALIZED state alone prevents mutation”
- “state machine enforces terminality”

--------------------------------------------------
10.9 Correct Spec Language
--------------------------------------------------

Correct phrasing:

> Finality is enforced exclusively via the `finalized` flag.
> `OrderState` is a descriptive lifecycle indicator.

--------------------------------------------------
10.10 Audit Resolution Note
--------------------------------------------------

Any audit finding asserting:

- duplicated source of truth
- inconsistent state machine
- finality ambiguity

is INVALID once spec language is corrected.

--------------------------------------------------
10.11 Summary
--------------------------------------------------

- No bug exists.
- No invariant is violated.
- Spec error caused the confusion.

==================================================
END
==================================================
