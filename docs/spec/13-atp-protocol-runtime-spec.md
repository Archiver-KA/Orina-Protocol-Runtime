# ATP Protocol Runtime Spec

## Scope

This document is the current protocol spec for the improved ATP deployment that went live on **BSC Testnet (chain 97)** on **March 29, 2026**.

It describes the protocol actually deployed in this repo, not a generic RWA, DeFi, vault, or AMM architecture.

ATP here means:

- escrowed bilateral order flow
- seller confirmation and delivery timing agreement
- dispute-managed settlement
- RWA consumption/finalization
- optional AI/M2M delegated execution bound to the ATP stack

## Current Deployment

### Core runtime

| Contract | Address |
| --- | --- |
| `MarketplaceATP` | `0xBc6f46000b2709714C3908BB6b71BAb67A2d1495` |
| `OrinaRWA` | `0x72C3477C57097f3791501F3839bB380A019B754f` |
| `RWAReceiptNFT` | `0x73719A7364c72cB0Ee77595773E9596976e298d1` |
| `PaymentGateway` | `0xC220B68De5C6A19CfD179a37Ba5F6caE8BC57008` |
| `FeeManager` | `0x418de18d1BD72A5Ff7A9470f94043D245C65a67B` |
| `DisputeManager` | `0x550debf6291a7EA8Aa27aCC9ACa92397972eC47e` |
| `AutoTimeManager` | `0xE8d1Ac4463fE0805eB7234ebEe51Dd85d091622C` |
| `UnitRegistry` | `0x07f460A5f3a346e060e3d810821fB020eDDCe718` |
| `ShippingRegistry` | `0xD3c02C986559145AC7f70ccA69b1A2A351810aA2` |
| `TimelockController` | `0x9B230c649c391d809617819a91ffB5FA6AB4888a` |

### M2M runtime

| Contract | Address |
| --- | --- |
| `DelegationManager` | `0x024478973e3bBD33C85c6A0271DbaCE6608b10dB` |
| `AIWalletFactoryV2` | `0xCFE177c0930eaDDD183262dff5B57E7397d55b7E` |

### Governance and fee endpoints

| Role / endpoint | Address |
| --- | --- |
| Governance safe | `0x554c4F489846e293bA251fb8B863FE1241306138` |
| Arbiter multisig | `0x1528378116b3D025761aB81AFF5F315c1905340A` |
| Emergency multisig | `0x404118A64Fa63409aC355E98d321a16eD0D5D21F` |
| Fee vault | `0x130fF04D269f0E9C0eaa984C167bd746bB68F82a` |
| DAO vault | `0x8069c3e6E6156707746885d9328a35C874B835CF` |
| Referral vault | `0x3FB0B92FcC489A53eb0F172e5D919346e2DeF3c2` |
| Burn address | `0x8A251D3340Fff21BA5Db0164fA3F3735B051a16d` |

### Deployment artifacts

- Core: `foundry/broadcast/DeployFullSystemDirect.s.sol/97/run-latest.json`
- M2M: `foundry/broadcast/DeployM2MSystem.s.sol/97/run-latest.json`
- Namespace: `orina-atp-v3.4.1-m2m-bsc-testnet-20260329-r6`

## Supported payment tokens

| Symbol | Address |
| --- | --- |
| `USDT` | `0x337610d27c682e347c9cd60bd4b3b107c9d34ddd` |
| `USDC` | `0x64544969ed7ebf5f083679233325356ebe738930` |
| `WBNB` | `0xae13d989dac2f0debff460ac112a837c89baa7cd` |
| `ORI` | `0x093969c2bb194e7424534918eca5119fa72a61d6` |

## Topology

`MarketplaceATP` is the coordinator. It owns the order state machine and binds:

- `PaymentGateway` for escrow, refunds, and settlement payout
- `DisputeManager` for agreement, arbiter, and timeout dispute resolution
- `AutoTimeManager` for time-based releases and cancellation handling
- `RWAReceiptNFT` for buyer receipt minting on finalized RWA orders
- `OrinaRWA` for asset mint, lock, consume, unlock, and finalize flows
- `DelegationManager` optionally, for AI/M2M execution

`OrinaRWA` is not a general-purpose liquid marketplace NFT. In this runtime it is the canonical asset registry for ATP order flow.

`RWAReceiptNFT` is the post-finalization receipt layer. It is non-transferable in the RWA branch.

## Roles and trust surface

| Contract | Role | Granted to |
| --- | --- | --- |
| `OrinaRWA` | `MARKETPLACE_ROLE` | `MarketplaceATP` |
| `PaymentGateway` | `MARKETPLACE_ROLE` | `MarketplaceATP`, `DisputeManager` |
| `PaymentGateway` | `EMERGENCY_ROLE` | emergency multisig |
| `RWAReceiptNFT` | `MINTER_ROLE` | `MarketplaceATP` |
| `DisputeManager` | `ARBITER_ROLE` | arbiter multisig |
| `DisputeManager` | `AUTOTIME_ROLE` | `AutoTimeManager` |
| `DelegationManager` | consumer allowlist | `MarketplaceATP` |

## Order signature model

### Order domain

- EIP-712 domain name: `MarketplaceATP`
- version: `3.4`
- verifying contract: live `MarketplaceATP`

### Order payload

The signed order payload is:

`Order(orderId,buyer,seller,paymentToken,assetId,grossPrice,amount,estDeliverySeconds)`

This payload is used across:

- `createOrder()` by the buyer
- `sellerConfirm()` by the seller
- `payOrder()` by the buyer only when the seller revised delivery timing

This runtime intentionally binds `paymentToken` and `assetId` into the signed payload. Older payloads without those fields are obsolete.

## Order lifecycle

1. Buyer signs and calls `createOrder`.
2. Buyer escrow is deposited into `PaymentGateway`.
3. Seller calls `sellerConfirm`.
4. If the seller accepts the proposed delivery time unchanged, the order becomes effectively paid immediately.
5. If the seller revises the delivery time, the buyer must sign again and call `payOrder` before `payDeadline`.
6. The happy path ends with `confirmDelivery` or timed auto-release.
7. The unhappy path opens a dispute, which is resolved by agreement, arbiter, or timeout split.
8. Finalized RWA orders mint `RWAReceiptNFT` and consume/finalize the underlying asset state in `OrinaRWA`.

## Dispute model

`DisputeManager` supports three settlement routes:

- agreement between buyer and seller
- arbiter decision
- timeout auto split

Agreement and mutual split payloads are EIP-712 domain-bound to the deployed `DisputeManager`.

Smart-wallet and `ERC1271` signatures are accepted through `IdentityValidator`, so dispute resolution works for root contract wallets and multisig-style participants.

## M2M model

The M2M stack is not a parallel marketplace. It is a constrained execution layer over ATP.

The session config binds:

- `allowedTarget = MarketplaceATP`
- `allowedSpender = PaymentGateway`
- `allowedToken = chosen payment token`
- expiry, action mask, per-order cap, total cap

The delegate can only act through the session bounds enforced by `DelegationManager` and the deployed AI wallet.

## Security changes in this runtime

This deployment includes the security fixes introduced during the March 29, 2026 cutover:

- `MarketplaceATP` order signatures bind `paymentToken` and `assetId`.
- `DisputeManager.resolveByAgreement` and mutual split verification use `IdentityValidator`, so `ERC1271` roots work.
- `DisputeManager` mutual split signatures are domain-bound to the deployed contract.
- `PaymentGateway` measures token balance delta on deposit and rejects short-transfer / fee-on-transfer escrow deposits.
- `RWAReceiptNFT` writes receipt state before `_safeMint`, removing the unnecessary reentrancy window.

## Operational invariants

- Chain-derived order and asset state is authoritative on-chain.
- Supabase projections are mirrors, not the source of truth.
- Clients must treat `protocol_assets`, `protocol_orders`, and `protocol_order_events` as read-only projection tables.
- Frontend signing must stay aligned with the live EIP-712 domain and payload shape.
- Broadcast artifacts and runtime config must point to the same deployment set.
- New traffic must only target the live `MarketplaceATP`.
- Old addresses must not remain in `.env`, `foundry/.env`, or audit scripts after cutover.

## Off-chain integration touchpoints

### Frontend

- `src/config/contracts.ts`
- `src/config/eip712.ts`
- `src/hooks/useEIP712Sign.ts`
- `src/app/components/create-order-modal.tsx`
- `src/app/components/rwa-buy-order-sign-modal.tsx`
- `src/app/components/nft-buy-direct-sign-modal.tsx`
- `src/app/components/pay-order-modal.tsx`
- `src/app/components/orders.tsx`

### Backend and audit tooling

- `.env`
- `foundry/.env`
- `supabase/audit/protocol_runtime_config.cjs`
- `supabase/audit/backfill_protocol_projection.cjs`
- `supabase/audit/backfill_protocol_order_events.cjs`
- `supabase/audit/verify_protocol_projection_rest.cjs`
- `supabase/audit/read_marketplace_order_state.cjs`
- `supabase/audit/run_smoke_ab.cjs`

### Client runtime shadow

Client-side runtime shadow state is local-only. It must not upsert into canonical projection tables in Supabase.

## Validation baseline

The current runtime has already passed:

- `forge build --sizes --skip test`
- `forge test --skip script`
- `npm run build`
- on-chain root flow smoke
- on-chain dispute flow smoke
- on-chain AI/M2M flow smoke

Use [14-production-env-flip-runbook.md](./14-production-env-flip-runbook.md) for the exact frontend/backend cutover procedure.
