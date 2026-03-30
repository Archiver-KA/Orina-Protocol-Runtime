# Production Env Flip Runbook

## Goal

Flip frontend, backend, and audit tooling to the improved ATP runtime deployed on **BSC Testnet chain 97** on **March 29, 2026**.

This runbook starts after contracts are already deployed and wired.

Use `foundry/CUTOVER_CHECKLIST.md` for the on-chain transaction checklist. Use this document for the app/backend/runtime flip.

## Live address set

| Key | Address |
| --- | --- |
| `MARKETPLACE_ATP` | `0xBc6f46000b2709714C3908BB6b71BAb67A2d1495` |
| `ORINA_RWA` | `0x72C3477C57097f3791501F3839bB380A019B754f` |
| `RECEIPT_NFT` | `0x73719A7364c72cB0Ee77595773E9596976e298d1` |
| `PAYMENT_GATEWAY` | `0xC220B68De5C6A19CfD179a37Ba5F6caE8BC57008` |
| `FEE_MANAGER` | `0x418de18d1BD72A5Ff7A9470f94043D245C65a67B` |
| `DISPUTE_MANAGER` | `0x550debf6291a7EA8Aa27aCC9ACa92397972eC47e` |
| `AUTOTIME_MANAGER` | `0xE8d1Ac4463fE0805eB7234ebEe51Dd85d091622C` |
| `UNIT_REGISTRY` | `0x07f460A5f3a346e060e3d810821fB020eDDCe718` |
| `SHIPPING_REGISTRY` | `0xD3c02C986559145AC7f70ccA69b1A2A351810aA2` |
| `TIMELOCK` | `0x9B230c649c391d809617819a91ffB5FA6AB4888a` |
| `DELEGATION_MANAGER` | `0x024478973e3bBD33C85c6A0271DbaCE6608b10dB` |
| `AI_WALLET_FACTORY_V2` | `0xCFE177c0930eaDDD183262dff5B57E7397d55b7E` |

## Source-of-truth files

These files must agree before traffic is flipped:

- `src/config/contracts.ts`
- `src/config/eip712.ts`
- `.env`
- `foundry/.env`
- `supabase/audit/protocol_runtime_config.cjs`
- `foundry/broadcast/DeployFullSystemDirect.s.sol/97/run-latest.json`
- `foundry/broadcast/DeployM2MSystem.s.sol/97/run-latest.json`

## Phase 1. Frontend readiness

### 1.1 Contracts

Confirm `src/config/contracts.ts` matches the live addresses above and keeps `ACTIVE_CHAIN_ID` on `97`.

### 1.2 Signing domain

Confirm `src/config/eip712.ts` still matches the deployed contracts:

- order domain name `MarketplaceATP`
- order version `3.4`
- dispute domain name `DisputeManager`
- dispute version `3.4`
- order payload includes `paymentToken` and `assetId`
- mutual split payload includes `orderId`, `openedAt`, and `deadline`

### 1.3 Hook and modal surface

Confirm these files are still aligned with the runtime schema:

- `src/hooks/useEIP712Sign.ts`
- `src/app/components/create-order-modal.tsx`
- `src/app/components/rwa-buy-order-sign-modal.tsx`
- `src/app/components/nft-buy-direct-sign-modal.tsx`
- `src/app/components/pay-order-modal.tsx`
- `src/app/components/orders.tsx`

These files should not be signing the legacy order payload anymore.

### 1.4 Runtime env

The root `.env` must keep:

- `VITE_M2M_DELEGATION_MANAGER=0x024478973e3bBD33C85c6A0271DbaCE6608b10dB`
- `VITE_M2M_AI_WALLET_FACTORY_V2=0xCFE177c0930eaDDD183262dff5B57E7397d55b7E`

Supabase values remain unchanged unless the backend project itself is also being rotated.

## Phase 2. Backend and operator readiness

### 2.1 Foundry env

`foundry/.env` must contain a single authoritative address block for the live runtime.

Required checks:

- no duplicate `MARKETPLACE_ATP_ADDRESS`
- no stale core addresses from the previous runtime
- `DEPLOY_NAMESPACE=orina-atp-v3.4.1-m2m-bsc-testnet-20260329-r6`

### 2.2 Audit runtime config

`supabase/audit/protocol_runtime_config.cjs` is the shared source of truth for:

- projection backfill
- order-event backfill
- REST projection verification
- smoke helpers
- post-deploy sync output

Do not hardcode addresses anywhere else in `supabase/audit/`.

### 2.3 Projection write boundary

`protocol_assets` and `protocol_orders` are canonical projection tables.

They must remain:

- public-readable
- service-role writable
- not writable by authenticated client wallets

### 2.4 SQL probes

The verification SQL files must target the live runtime:

- `supabase/audit/verify_protocol_assets.sql`
- `supabase/audit/verify_protocol_orders.sql`
- `supabase/audit/verify_protocol_sync.sql`

Generated backfill SQL files are not canonical and may be recreated by the scripts as needed.

## Phase 3. Validation commands

Run these from the repo root unless noted otherwise.

### 3.1 Runtime summary

```bash
node supabase/audit/render_post_deploy_sync.cjs
```

Expected result:

- prints the live core and M2M addresses
- points to the live broadcast artifacts
- lists current frontend/backend verification commands

### 3.2 On-chain config probe

```bash
node supabase/audit/onchain_runtime_status_probe.cjs
```

Expected result:

- active chain is `97`
- configured contracts are non-zero
- active-chain code checks show bytecode on the live addresses

### 3.3 Projection sync

```bash
node supabase/audit/backfill_protocol_projection.cjs --apply-linked
node supabase/audit/backfill_protocol_order_events.cjs --apply-linked
```

Expected result:

- the generated SQL targets the live marketplace and asset contracts
- linked Supabase apply succeeds
- no legacy deployment address appears in the output

### 3.4 Projection verification

```bash
node supabase/audit/verify_protocol_projection_rest.cjs
```

Expected result:

- `protocol_orders` rows belong to `0xBc6f46000b2709714C3908BB6b71BAb67A2d1495`
- `protocol_assets` rows belong to `0x72C3477C57097f3791501F3839bB380A019B754f`
- metadata shows chain-backed projection state

### 3.5 App build

```bash
npm run build
```

Expected result:

- production build succeeds
- no compile drift from the new EIP-712 shape or contract constants

### 3.6 Foundry regression

Run from `foundry/`:

```bash
forge test --skip script
```

Expected result:

- full Solidity suite passes on the improved runtime codebase

## Phase 4. Smoke gate

Before flipping real traffic, re-run the smoke flows against the live runtime:

- `script/SmokeRootMintOrderEndToEnd.s.sol`
- `script/SmokeNormalDisputeEndToEnd.s.sol`
- `script/SmokeAIMintOrderEndToEnd.s.sol`

The gate is open only if:

- root flow finalizes
- dispute flow opens successfully
- AI/M2M flow deploys the AI wallet and finalizes

## Phase 5. Traffic flip

1. Freeze new write traffic if this is a production maintenance window.
2. Promote the frontend build that already contains the live `src/config/contracts.ts` and `src/config/eip712.ts`.
3. Apply the projection backfill and order-event backfill to Supabase.
4. Run the REST verification probe.
5. Unfreeze write traffic only after projection and smoke checks pass.

## Rollback

There is no on-chain rollback.

Rollback here means:

- revert frontend and operator env only if no new traffic has been sent to the new runtime
- otherwise keep old stacks in drain mode only and continue on the live runtime

Do not point signing clients back to the legacy runtime after users have already created orders against the improved deployment.
