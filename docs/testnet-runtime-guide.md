# Testnet Runtime Guide

Last aligned with runtime code and protocol deployment docs on 2026-06-27.

This guide defines the BSC Testnet starter flow and records the currently operated ATP testnet addresses. It exists to keep testnet faucet behavior, mock token names, rankings, Base Sepolia metadata, and mainnet boundaries explicit.

## Scope

The Testnet Starter Kit modal is enabled only when:

- `VITE_ENABLE_TESTNET_STARTER_KIT=true`
- the connected wallet is on BSC Testnet, chain id `97`
- runtime config is still targeting the testnet deployment namespace

The modal is not a core ATP contract surface. It is testnet onboarding infrastructure.

## Modal Tabs

| Tab | Purpose |
| --- | --- |
| Guide | Shows the beta setup sequence and network/faucet status. |
| Claim tBNB | Links to an external tBNB faucet for gas. Orina does not mint native gas token. |
| Claim USDT.t | Claims mock USDT testnet token from the Orina testnet faucet when configured. |
| Claim USDC.t | Claims mock USDC testnet token from the Orina testnet faucet when configured. |
| Rankings | Shows testnet QA activity for the connected wallet. This is not a reward promise. |

## Testnet Token Naming

Use `.t` suffix for faucet-minted testnet stablecoins:

- `USDT.t`
- `USDC.t`

These tokens are mock ERC20 assets for BSC Testnet. They are not USDT, USDC, cash, stablecoin claims, redemption rights, or mainnet assets.

## Current BSC Testnet Starter Kit

Starter-kit broadcast completed on chain id `97` on 2026-06-07.

| Contract | Address |
| --- | --- |
| `OrinaTestTokenFaucet` | `0x6527262782C140e0A4724bef06431786556AfDE0` |
| `USDT.t` | `0x8800279B4a5528628ef069698169C58B89377809` |
| `USDC.t` | `0xbdcA834A71F5BFF1420eb5D1B0491d58a33141E5` |

Current claim config:

- `USDT.t`: `1,000` tokens per claim
- `USDC.t`: `1,000` tokens per claim
- cooldown: `12 hours`

## Required Env

Deploy the faucet from the Foundry repo:

```bash
forge script script/DeployTestnetTokenFaucet.s.sol:DeployTestnetTokenFaucet --rpc-url bsc_testnet --legacy -vvvv
forge script script/DeployTestnetTokenFaucet.s.sol:DeployTestnetTokenFaucet --rpc-url bsc_testnet --broadcast --legacy --slow -vvvv
```

After broadcast, paste only the emitted Runtime values into the Runtime env:

```env
VITE_ENABLE_TESTNET_STARTER_KIT=true
VITE_TESTNET_TBNB_FAUCET_URL=
VITE_TESTNET_TOKEN_FAUCET_ADDRESS=0x6527262782C140e0A4724bef06431786556AfDE0
VITE_TESTNET_USDT_T_ADDRESS=0x8800279B4a5528628ef069698169C58B89377809
VITE_TESTNET_USDC_T_ADDRESS=0xbdcA834A71F5BFF1420eb5D1B0491d58a33141E5
```

Keep these env keys separate from `CONTRACTS` core protocol addresses. The faucet can be deployed, rotated, or disabled without changing the ATP core address set.

## Current Operated Testnets

The canonical contract address source is the Foundry address sheet. The runtime app currently treats BSC Testnet as the write-enabled beta network and Base Sepolia as documented/readiness metadata until runtime and governance owners enable write paths.

### BSC Testnet Core

| Contract | Address |
| --- | --- |
| `MarketplaceATP` | `0x18E1C8ab257FAf16Ec8257A9715d07661194150B` |
| `PaymentGateway` | `0x082d75D8cA96C6e97B6b451Ad4857454A53D5C15` |
| `FeeManager` | `0xD32fc966835D8eb7D26A12BEcCa86c749A60eFb3` |
| `OrinaRWA` | `0x3a591AB1aB3A281f999AAD1644b020CbEC463C47` |
| `RWAReceiptNFT` | `0x16A35bdD00dCfb9010504FbD1b2B97e26bB315ca` |
| `DisputeManager` | `0xCD27B85e7EA6FB1FDC484ae9083286DdCC14DC21` |
| `AutoTimeManager` | `0x5639792243617841800df8F1450B86223c3d86f4` |
| `DelegationManager` | `0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13` |
| `AIWalletFactoryV2` | `0xD838268fa8dF6AFD1Fd79D9C0Fd243A3D23D0441` |
| `TimelockController` | `0x5452CE749EDA1bE82132743AA224e7C86023A7F4` |

BSC runtime payment-token fallbacks are `USDT=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`, `USDC=0x64544969ED7EBf5f083679233325356EbE738930`, `WBNB=0xae13d989dac2f0debff460ac112a837c89baa7cd`, and `ORI=0x093969C2Bb194E7424534918eca5119fa72a61D6`. The `USDT.t` and `USDC.t` faucet assets are separate mock onboarding tokens.

### Base Sepolia Core

| Contract | Address |
| --- | --- |
| `MarketplaceATP` | `0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14` |
| `PaymentGateway` | `0x1A880Ae46993282dD77C2Ddcc5e36498eb616c92` |
| `FeeManager` | `0x51aB383A43d79f4127B7E7dCBcd892164FA2838F` |
| `OrinaRWA` | `0x0a9EfC1fb95be24743B1452Ac4C974E5e925A453` |
| `RWAReceiptNFT` | `0x82D2f4e131D1eB34f9B6ebc8CC37Bdd1CcA84E95` |
| `DisputeManager` | `0x952ae0562de695C63C1386458db537193CE293b4` |
| `AutoTimeManager` | `0xa12273Ad5B73c5F57139E84aa89db52fe7Af05De` |
| `DelegationManager` | `0xFC0038B7CC628966f8a7f14414c9386c2d6cB288` |
| `AIWalletFactoryV2` | `0x0E5E106A7F81233Fe07115Aeb3777e847adB09cB` |
| `TimelockController` | `0x989b893118237f710b7Efc8820147B61c68DcaEE` |

Base Sepolia starter-kit assets are `ORI=0xd87493F4C02AAD2c67Ce12aa534d188Bf44FCCAB`, `USDT.t=0x11E6c8f2806b32DaC427E7dF07F67602647Ef87a`, `USDC.t=0xd6e84789741ea2DE727961CCB383454e4A845035`, and `OrinaTestTokenFaucet=0xbBd53C18F4d9fb98aA6c4837Ea0E8F221E1B5F0F`.

On 2026-06-27, both networks were spot-checked for deployed bytecode on `MarketplaceATP`, `PaymentGateway`, and `DelegationManager`. `MarketplaceATP.delegationManager()` returned the listed DelegationManager on both networks, and each DelegationManager grants `CONSUMER_ROLE` to its Marketplace.

Operational note: M2M `DelegationManager.DEFAULT_ADMIN_ROLE` remains with deployment/admin EOA `0x282Be18838D7079C215F49749a9606d77e00888b` on both testnets. Production requires handoff to timelock/governance.

## Mainnet Boundary

Before any mainnet deployment:

- Set `VITE_ENABLE_TESTNET_STARTER_KIT=false`.
- Remove all `VITE_TESTNET_*` faucet env values from mainnet build environments.
- Do not allowlist `USDT.t` or `USDC.t` as production payment tokens.
- Do not deploy `OrinaTestStablecoin` or `OrinaTestTokenFaucet` to mainnet.
- Do not describe testnet rankings as rewards, eligibility, allocation, or financial entitlement.
- Replace beta ORI/payment-token parity assumptions with the production oracle quote layer.
- Complete the production checklist in `docs/mainnet-production-checklist.md`.

## Operator Checks

Run these checks before opening beta traffic:

1. Confirm wallet is on chain id `97`.
2. Confirm faucet address is non-zero and has mint role on both mock tokens.
3. Confirm token decimals are `6`.
4. Confirm claim amount and cooldown are acceptable.
5. Confirm UI labels show `USDT.t` and `USDC.t`.
6. Confirm production/mainnet env has starter kit disabled.
