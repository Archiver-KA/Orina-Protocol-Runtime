# Testnet Runtime Guide

Last aligned with runtime code on 2026-06-07.

This guide defines the BSC Testnet-only starter flow for ATP v3.5 beta. It exists to keep testnet faucet behavior, mock token names, rankings, and mainnet boundaries explicit.

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

## Current BSC Testnet Deployment

Broadcast completed on chain id `97` on 2026-06-07.

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

## Mainnet Boundary

Before any mainnet deployment:

- Set `VITE_ENABLE_TESTNET_STARTER_KIT=false`.
- Remove all `VITE_TESTNET_*` faucet env values from mainnet build environments.
- Do not allowlist `USDT.t` or `USDC.t` as production payment tokens.
- Do not deploy `OrinaTestStablecoin` or `OrinaTestTokenFaucet` to mainnet.
- Do not describe testnet rankings as rewards, eligibility, allocation, or financial entitlement.
- Replace beta ORI/payment-token parity assumptions with the production oracle quote layer.

## Operator Checks

Run these checks before opening beta traffic:

1. Confirm wallet is on chain id `97`.
2. Confirm faucet address is non-zero and has mint role on both mock tokens.
3. Confirm token decimals are `6`.
4. Confirm claim amount and cooldown are acceptable.
5. Confirm UI labels show `USDT.t` and `USDC.t`.
6. Confirm production/mainnet env has starter kit disabled.
