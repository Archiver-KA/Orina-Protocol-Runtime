# ATP Protocol Runtime Spec

## Scope

This document records the current ATP v3.5 beta deployment that went live on **BSC Testnet (chain 97)** on **June 4, 2026**.

It describes ATP as implemented by this repo, not a generic RWA, DeFi, vault, or AMM architecture. Address tables below are the current beta source of truth for the Foundry runtime and app/backend cutover work.

ATP here means:

- escrowed bilateral order flow
- seller confirmation and delivery timing agreement
- dispute-managed settlement
- RWA consumption/finalization
- optional AI/M2M delegated execution bound to the ATP stack

## Current BSC Testnet Beta Deployment

### Core runtime

| Contract | Address |
| --- | --- |
| `MarketplaceATP` | `0x18E1C8ab257FAf16Ec8257A9715d07661194150B` |
| `OrinaRWA` | `0x3a591AB1aB3A281f999AAD1644b020CbEC463C47` |
| `RWAReceiptNFT` | `0x16A35bdD00dCfb9010504FbD1b2B97e26bB315ca` |
| `PaymentGateway` | `0x082d75D8cA96C6e97B6b451Ad4857454A53D5C15` |
| `FeeManager` | `0xD32fc966835D8eb7D26A12BEcCa86c749A60eFb3` |
| `DisputeManager` | `0xCD27B85e7EA6FB1FDC484ae9083286DdCC14DC21` |
| `AutoTimeManager` | `0x5639792243617841800df8F1450B86223c3d86f4` |
| `UnitRegistry` | `0x4ea45450064CD5B7c88EcAaE6a145652FEDd5df0` |
| `ShippingRegistry` | `0x16402c8C883a01dbfD2D7E58A46D3E9434396836` |
| `TimelockController` | `0x5452CE749EDA1bE82132743AA224e7C86023A7F4` |

### M2M runtime

| Contract | Address |
| --- | --- |
| `DelegationManager` | `0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13` |
| `AIWalletFactoryV2` | `0xD838268fa8dF6AFD1Fd79D9C0Fd243A3D23D0441` |

## Base Sepolia Deployment

Base Sepolia is a separately deployed ATP v3.5 testnet stack on chain `84532`, deployed on June 26, 2026 under namespace `orina-atp-v3.5-base-sepolia-20260626`. The runtime app remains write-enabled only for BSC Testnet; this Base address set is available for integration and verification work.

| Contract | Address |
| --- | --- |
| `MarketplaceATP` | `0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14` |
| `OrinaRWA` | `0x0a9efc1fb95be24743b1452ac4c974E5E925A453` |
| `RWAReceiptNFT` | `0x82d2f4e131d1EB34F9B6Ebc8CC37bdD1cca84e95` |
| `PaymentGateway` | `0x1A880Ae46993282dd77C2dDCc5e36498eB616C92` |
| `FeeManager` | `0x51aB383A43d79f4127B7E7dCBcd892164FA2838F` |
| `DisputeManager` | `0x952aE0562De695c63c1386458DB537193Ce293b4` |
| `AutoTimeManager` | `0xa12273AD5b73c5F57139e84aa89Db52FE7Af05de` |
| `UnitRegistry` | `0x5a709d6f4F0a084315C64272FFc158Dc61F0De38` |
| `ShippingRegistry` | `0x50fD56DcA706471B7f0Ab59051006aA2712c2DF2` |
| `TimelockController` | `0x989b893118237f710b7Efc8820147B61c68DcaEE` |
| `DelegationManager` | `0xFC0038B7CC628966f8a7f14414c9386c2d6cB288` |
| `AIWalletFactoryV2` | `0x0E5E106A7F81233Fe07115Aeb3777e847adB09cB` |

| Token | Address |
| --- | --- |
| `ORI` | `0xD87493f4C02aad2c67Ce12aa534d188Bf44FCcAB` |
| `USDT.t` | `0x11E6c8f2806b32dAC427E7Df07F67602647eF87A` |
| `USDC.t` | `0xD6E84789741Ea2DE727961cCB383454E4A845035` |

`MarketplaceATP.VERSION` is `3.4`; `FeeManager.VERSION` and `PaymentGateway.VERSION` are `3.5`, matching the BSC Testnet beta. Base Sepolia currently uses timelock `0x989b893118237f710b7Efc8820147B61c68DcaEE` as the Marketplace governance actor. The remaining shared hardening item is M2M `DelegationManager.DEFAULT_ADMIN_ROLE`, which is still held by deployment/admin EOA `0x282Be18838D7079C215F49749a9606d77e00888b` on both testnets.

### Governance and fee endpoints

| Role / endpoint | Address |
| --- | --- |
| Governance safe | `0x554c4F489846e293bA251fb8B863FE1241306138` |
| Arbiter multisig | `0x1528378116b3D025761aB81AFF5F315c1905340A` |
| Emergency multisig | `0x404118A64Fa63409aC355E98d321a16eD0D5D21F` |
| Fee vault | `0x130fF04D269f0E9C0eaa984C167bd746bB68F82a` |
| DAO vault | `0x8069c3e6E6156707746885d9328a35C874B835CF` |
| Referral vault | `0x3FB0B92FcC489A53eb0F172e5D919346e2DeF3c2` |

No protocol burn address is used by the v3.5 beta fee model.

### Deployment artifacts

- Core: `foundry/broadcast/DeployFullSystemDirect.s.sol/97/run-latest.json`
- M2M: `foundry/broadcast/DeployM2MSystem.s.sol/97/run-latest.json`
- Namespace: `orina-atp-v3.5-fee-split-nft-orifee-bsc-testnet-20260604`
- Smoke root flow: `foundry/broadcast/SmokeRootMintOrderEndToEnd.s.sol/97/run-latest.json`
- Smoke dispute flow: `foundry/broadcast/SmokeNormalDisputeEndToEnd.s.sol/97/run-latest.json`
- Smoke AI/M2M flow: `foundry/broadcast/SmokeAIMintOrderEndToEnd.s.sol/97/run-latest.json`

### Runtime version and fee status

- Release label: `ATP v3.5` fee/delegation hardening.
- `FeeManager.VERSION` and `PaymentGateway.VERSION` are `3.5`.
- `MarketplaceATP.VERSION` remains `3.4` for EIP-712 order-domain compatibility.
- Protocol burn fee is removed from fee calculation, order snapshots, payment distribution, deploy env template, and smoke/deploy scripts.

### Post-deploy beta smoke result

| Check | Result |
| --- | --- |
| Root mint/order/finalize | PASS, asset `0`, order `0`, finalized |
| Normal dispute open | PASS, asset `1`, order `1`, disputed |
| AI/M2M mint/order/finalize | PASS, wallet `0x09718EA91cC28C53DFb644C4886A16Da9742a478`, session `0`, asset `2`, order `2`, finalized |
| AI/M2M session cleanup | PASS, `DelegationManager.hasActiveCycle(seller) == false` |
| Counters after smoke | `nextAssetId == 3`, `nextOrderId == 3` |

### Previous testnet deployment

The March 29, 2026 v3.4.1 deployment is retained only as historical context. It is not the current target for new beta traffic.

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
- `RWAReceiptNFT` for buyer receipt/asset token minting on finalized RWA and NFT orders
- `OrinaRWA` for asset mint, lock, consume, unlock, and finalize flows
- `DelegationManager` optionally, for AI/M2M execution

`OrinaRWA` is not a general-purpose liquid marketplace NFT. In this runtime it is the canonical asset registry for ATP order flow.

`RWAReceiptNFT` is the post-finalization ERC721 layer. Tokens backed by `AssetType.RWA` remain non-transferable receipts. Tokens backed by `AssetType.NFT` are transferable ERC721 tokens.

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

For orders where protocol fees are paid in a separate token, the signed payload is:

`OrderWithFeeToken(orderId,buyer,seller,paymentToken,feeToken,assetId,grossPrice,amount,estDeliverySeconds)`

This payload is used across:

- `createOrder()` by the buyer
- `createOrderWithFeeToken()` by the buyer when `feeToken != paymentToken`
- `sellerConfirm()` by the seller
- `payOrder()` by the buyer only when the seller revised delivery timing

This runtime intentionally binds `paymentToken`, `assetId`, and separate `feeToken` when used into the signed payload. Older payloads without `paymentToken` and `assetId` are obsolete.

## Order lifecycle

1. Buyer signs and calls `createOrder`.
2. Buyer escrow is deposited into `PaymentGateway`.
3. Seller calls `sellerConfirm`.
4. If the seller accepts the proposed delivery time unchanged, the order becomes effectively paid immediately.
5. If the seller revises the delivery time, the buyer must sign again and call `payOrder` before `payDeadline`.
6. The happy path ends with `confirmDelivery` or timed auto-release.
7. The unhappy path opens a dispute, which is resolved by agreement, arbiter, or timeout split.
8. Finalized RWA orders mint non-transferable `RWAReceiptNFT` receipts and consume/finalize the underlying asset state in `OrinaRWA`.
9. Finalized NFT orders mint transferable ERC721 tokens through `RWAReceiptNFT` and consume/finalize the underlying asset state in `OrinaRWA`.

## Dispute model

`DisputeManager` supports three settlement routes:

- agreement between buyer and seller
- arbiter decision
- timeout auto split

Agreement and mutual split payloads are EIP-712 domain-bound to the deployed `DisputeManager`.

Smart-wallet and `ERC1271` signatures are accepted through `IdentityValidator`, so dispute resolution works for root contract wallets and multisig-style participants.

## M2M model

The M2M stack is not a parallel marketplace. It is a constrained execution layer over ATP.

The current session config binds:

- `paymentToken = chosen payment token`
- expiry or `NO_EXPIRY`, action mask, per-order cap, and total cap
- counterparty allowlist hash when required by no-expiry buy/pay/confirm authority
- ATP term policy: `restrictAssetId`, `assetId`, `maxAmount`, `minGrossPrice`, `maxGrossPrice`, and `maxDeliverySeconds`

The delegate can only act through the session bounds enforced by `DelegationManager` and the deployed AI wallet.

## Security changes in this runtime

This deployment includes the security fixes introduced during the March 29, 2026 cutover:

- `MarketplaceATP` order signatures bind `paymentToken` and `assetId`.
- `DisputeManager.resolveByAgreement` and mutual split verification use `IdentityValidator`, so `ERC1271` roots work.
- `DisputeManager` mutual split signatures are domain-bound to the deployed contract.
- `PaymentGateway` measures token balance delta on deposit and rejects short-transfer / fee-on-transfer escrow deposits.
- `RWAReceiptNFT` writes receipt state before `_safeMint`, removing the unnecessary reentrancy window.

The current v3.5 beta runtime additionally:

- removes protocol burn fee from ATP settlement; fees are platform / DAO / referral only.
- uses token-specific fee presets: USDT/USDC fee tokens charge total 2% (`1%` platform + `1%` DAO), while ORI fee tokens charge total 1% (`0.5%` platform + `0.5%` DAO).
- snapshots both platform and DAO fee bps from the selected fee token. In `createOrderWithFeeToken()`, the fee token can differ from the payment token.
- supports separate fee-token escrow, allowing USDT/USDC order payments with ORI protocol-fee payment through `createOrderWithFeeToken()`. The testnet/beta ORI fee mode assumes nominal ORI/payment-token parity; mainnet requires an oracle-provided price ratio before order signature and escrow.
- supports `AssetType.NFT` order flow with transferable post-finalization ERC721 tokens while preserving non-transferable `AssetType.RWA` receipts.
- splits dispute fees 50% platform / 50% DAO.
- hardens delegated M2M sessions with ATP term binding and an explicit no-expiry option guarded by counterparty binding and root revoke.
- keeps the exact auto-release boundary for buyer dispute and starts auto-release only after the buyer action window has fully closed.

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

The June 4, 2026 Foundry and on-chain beta gate passed:

- `forge test -vv`: 96 passed, 0 failed, 0 skipped.
- `forge build --sizes --skip test`: pass; `MarketplaceATP` runtime size is 24,538 bytes with 38 bytes EIP-170 margin.
- Fee readback: USDT/USDC total `200` bps split `100` platform + `100` DAO; ORI total `100` bps split `50` platform + `50` DAO.
- On-chain root flow smoke: pass.
- On-chain dispute flow smoke: pass.
- On-chain AI/M2M flow smoke: pass.

Use [14-production-env-flip-runbook.md](./14-production-env-flip-runbook.md) for the exact frontend/backend cutover procedure and app build checks.

### 2026-06-27 Security Baseline Addendum

The latest contract assurance baseline supersedes the earlier local beta test count for production-readiness discussion:

- Current full Foundry suite passes at 110/110 after dispute-settlement hardening.
- Slither has no High/Medium impact findings after current triage.
- Echidna, Medusa, and deep invariants pass for the current ATP harnesses.
- Mythril runtime-bytecode findings for `FeeManager`, `PaymentGateway`, and `MarketplaceATP` are source-triaged with no confirmed exploitable issue.
- Certora remote proof passes for the initial `FeeManager` scope; broader formal coverage and human review remain required before production claims.
