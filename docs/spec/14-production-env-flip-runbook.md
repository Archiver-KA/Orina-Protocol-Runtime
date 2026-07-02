# Production Env Flip Runbook

## Goal

Flip frontend, backend, and audit tooling to an operated ATP runtime deployment. The default beta network remains **BSC Testnet chain 97**, with additional networks gated through the runtime network registry.

This file is updated for the July 2, 2026 ATP v3.5 multi-testnet runtime. The March 29, 2026 v3.4.1 runtime is historical and must not be used for new beta traffic.

This runbook starts after contracts are already deployed and wired.

Use `foundry/CUTOVER_CHECKLIST.md` for the on-chain transaction checklist. Use this document for the app/backend/runtime flip. For production or mainnet readiness, also use `docs/mainnet-production-checklist.md` and the current protocol status in `docs/protocol-security-status-2026-06-27.md`.

## Current default beta address set

| Key | Address |
| --- | --- |
| `MARKETPLACE_ATP` | `0x18E1C8ab257FAf16Ec8257A9715d07661194150B` |
| `ORINA_RWA` | `0x3a591AB1aB3A281f999AAD1644b020CbEC463C47` |
| `RECEIPT_NFT` | `0x16A35bdD00dCfb9010504FbD1b2B97e26bB315ca` |
| `PAYMENT_GATEWAY` | `0x082d75D8cA96C6e97B6b451Ad4857454A53D5C15` |
| `FEE_MANAGER` | `0xD32fc966835D8eb7D26A12BEcCa86c749A60eFb3` |
| `DISPUTE_MANAGER` | `0xCD27B85e7EA6FB1FDC484ae9083286DdCC14DC21` |
| `AUTOTIME_MANAGER` | `0x5639792243617841800df8F1450B86223c3d86f4` |
| `UNIT_REGISTRY` | `0x4ea45450064CD5B7c88EcAaE6a145652FEDd5df0` |
| `SHIPPING_REGISTRY` | `0x16402c8C883a01dbfD2D7E58A46D3E9434396836` |
| `TIMELOCK` | `0x5452CE749EDA1bE82132743AA224e7C86023A7F4` |
| `DELEGATION_MANAGER` | `0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13` |
| `AI_WALLET_FACTORY_V2` | `0xD838268fa8dF6AFD1Fd79D9C0Fd243A3D23D0441` |

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

Confirm `src/config/contracts.ts` matches the current beta addresses above for BSC Testnet and contains explicit address maps for every additional operated network. `ACTIVE_CHAIN_ID` remains the default BSC Testnet chain id `97`; write access for other chains is controlled by `src/utils/protocolNetwork.ts`.

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

The root `.env` must keep the BSC legacy aliases while any additional live networks use chain-specific keys:

- `VITE_M2M_DELEGATION_MANAGER=0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13`
- `VITE_M2M_AI_WALLET_FACTORY_V2=0xD838268fa8dF6AFD1Fd79D9C0Fd243A3D23D0441`
- `VITE_BSC_TESTNET_M2M_DELEGATION_MANAGER=0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13`
- `VITE_BSC_TESTNET_M2M_AI_WALLET_FACTORY_V2=0xD838268fa8dF6AFD1Fd79D9C0Fd243A3D23D0441`
- `VITE_BASE_SEPOLIA_M2M_DELEGATION_MANAGER=0xFC0038B7CC628966f8a7f14414c9386c2d6cB288`
- `VITE_BASE_SEPOLIA_M2M_AI_WALLET_FACTORY_V2=0x0E5E106A7F81233Fe07115Aeb3777e847adB09cB`
- `VITE_AVALANCHE_FUJI_M2M_DELEGATION_MANAGER=0x52440e44ec34a64e19b92243262fe47819d65539`
- `VITE_AVALANCHE_FUJI_M2M_AI_WALLET_FACTORY_V2=0x7D6b498eDc3F469ED020116e8892EbB361753bCB`

Supabase values remain unchanged unless the backend project itself is also being rotated.

### 1.5 Testnet starter kit env

The Testnet Starter Kit is operated-testnet onboarding infrastructure. It is not part of the core ATP address set. Legacy `VITE_TESTNET_*` keys are still read as BSC Testnet aliases; new networks must use per-network keys.

For testnet beta builds only:

- `VITE_ENABLE_TESTNET_STARTER_KIT=true`
- `VITE_TESTNET_TBNB_FAUCET_URL=<external tBNB faucet URL>`
- `VITE_TESTNET_TOKEN_FAUCET_ADDRESS=0x6527262782C140e0A4724bef06431786556AfDE0`
- `VITE_TESTNET_USDT_T_ADDRESS=0x8800279B4a5528628ef069698169C58B89377809`
- `VITE_TESTNET_USDC_T_ADDRESS=0xbdcA834A71F5BFF1420eb5D1B0491d58a33141E5`
- `VITE_BSC_TESTNET_GAS_FAUCET_URL=<external tBNB faucet URL>`
- `VITE_BSC_TESTNET_TOKEN_FAUCET_ADDRESS=0x6527262782C140e0A4724bef06431786556AfDE0`
- `VITE_BSC_TESTNET_USDT_T_ADDRESS=0x8800279B4a5528628ef069698169C58B89377809`
- `VITE_BSC_TESTNET_USDC_T_ADDRESS=0xbdcA834A71F5BFF1420eb5D1B0491d58a33141E5`
- `VITE_BASE_SEPOLIA_GAS_FAUCET_URL=<external Base Sepolia ETH faucet URL>`
- `VITE_BASE_SEPOLIA_TOKEN_FAUCET_ADDRESS=0xbBd53C18F4d9fb98aA6c4837Ea0E8F221E1B5F0F`
- `VITE_BASE_SEPOLIA_USDT_T_ADDRESS=0x11E6c8f2806b32DaC427E7dF07F67602647Ef87a`
- `VITE_BASE_SEPOLIA_USDC_T_ADDRESS=0xd6e84789741ea2DE727961CCB383454e4A845035`
- `VITE_ARBITRUM_SEPOLIA_GAS_FAUCET_URL=<external Arbitrum Sepolia ETH faucet URL>`
- `VITE_ARBITRUM_SEPOLIA_TOKEN_FAUCET_ADDRESS=0xFA37557E4F6D066f6CF4B69BA865837d007c8D1e`
- `VITE_ARBITRUM_SEPOLIA_USDT_T_ADDRESS=0x279c62C97c6967d0E0F45f9D2460d38E3929c090`
- `VITE_ARBITRUM_SEPOLIA_USDC_T_ADDRESS=0x233Fb28c8166807b01DcBE2743bb85cF7cdC8b41`
- `VITE_ETHEREUM_SEPOLIA_GAS_FAUCET_URL=<external Ethereum Sepolia ETH faucet URL>`
- `VITE_ETHEREUM_SEPOLIA_TOKEN_FAUCET_ADDRESS=0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F`
- `VITE_ETHEREUM_SEPOLIA_USDT_T_ADDRESS=0x11E6c8f2806b32dAC427E7Df07F67602647eF87A`
- `VITE_ETHEREUM_SEPOLIA_USDC_T_ADDRESS=0xD6E84789741Ea2DE727961cCB383454E4A845035`
- `VITE_OPTIMISM_SEPOLIA_GAS_FAUCET_URL=<external Optimism Sepolia ETH faucet URL>`
- `VITE_OPTIMISM_SEPOLIA_TOKEN_FAUCET_ADDRESS=0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F`
- `VITE_OPTIMISM_SEPOLIA_USDT_T_ADDRESS=0x11E6c8f2806b32dAC427E7Df07F67602647eF87A`
- `VITE_OPTIMISM_SEPOLIA_USDC_T_ADDRESS=0xD6E84789741Ea2DE727961cCB383454E4A845035`
- `VITE_AVALANCHE_FUJI_GAS_FAUCET_URL=<external Avalanche Fuji AVAX faucet URL>`
- `VITE_AVALANCHE_FUJI_TOKEN_FAUCET_ADDRESS=0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F`
- `VITE_AVALANCHE_FUJI_USDT_T_ADDRESS=0x11E6c8f2806b32dAC427E7Df07F67602647eF87A`
- `VITE_AVALANCHE_FUJI_USDC_T_ADDRESS=0xD6E84789741Ea2DE727961cCB383454E4A845035`

Arbitrum Sepolia is live for testnet writes after the June 29, 2026 timelock M2M linkage. Ethereum Sepolia and Optimism Sepolia are live for testnet writes after the July 1, 2026 timelock M2M linkage. Avalanche Fuji is live for testnet writes after the July 2, 2026 timelock M2M linkage. These deployments use EOA-controlled zero-delay timelock governance for testnet only; mainnet must redeploy with the production multisig/Safe and a non-zero timelock delay.

For mainnet or production-mainnet previews:

- `VITE_ENABLE_TESTNET_STARTER_KIT=false`
- remove all `VITE_TESTNET_*`, `VITE_BSC_TESTNET_*`, `VITE_BASE_SEPOLIA_*`, `VITE_ARBITRUM_SEPOLIA_*`, `VITE_ETHEREUM_SEPOLIA_*`, `VITE_OPTIMISM_SEPOLIA_*`, and `VITE_AVALANCHE_FUJI_*` faucet addresses
- verify mock `USDT.t` / `USDC.t` are not allowlisted payment tokens
- verify no faucet contract is deployed or referenced by production app config

## Phase 2. Backend and operator readiness

### 2.1 Foundry env

`foundry/.env` must contain a single authoritative address block for the live runtime.

Required checks:

- no duplicate `MARKETPLACE_ATP_ADDRESS`
- no stale core addresses from the previous runtime
- current beta namespace: `DEPLOY_NAMESPACE=orina-atp-v3.5-fee-split-nft-orifee-bsc-testnet-20260604`
- v3.5 beta env must not include a protocol burn address or burn-fee distribution target
- production/mainnet env must not include testnet faucet addresses or mock stablecoin addresses

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

- `protocol_orders` rows belong to `0x18E1C8ab257FAf16Ec8257A9715d07661194150B`
- `protocol_assets` rows belong to `0x3a591AB1aB3A281f999AAD1644b020CbEC463C47`
- metadata shows chain-backed projection state

### 3.5 App build

```bash
npm run build
```

Expected result:

- production build succeeds
- no compile drift from the new EIP-712 shape or contract constants
- `MarketplaceATP` order domain remains version `3.4`; `FeeManager` and `PaymentGateway` report version `3.5` on the current v3.5 beta runtime

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
