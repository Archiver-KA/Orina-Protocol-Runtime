# Testnet Runtime Guide

Last aligned with runtime code and protocol deployment docs on 2026-07-02.

This guide defines the operated ATP testnet starter flow and records the currently operated ATP testnet addresses. It exists to keep testnet faucet behavior, mock token names, rankings, Base Sepolia activation, Arbitrum Sepolia, Ethereum Sepolia, Optimism Sepolia, and Avalanche Fuji EOA-governed testnet status, and mainnet boundaries explicit.

## Scope

The Testnet Starter Kit modal is enabled only when:

- `VITE_ENABLE_TESTNET_STARTER_KIT=true`
- the connected wallet is on a configured operated testnet: BSC Testnet `97`, Base Sepolia `84532`, Arbitrum Sepolia `421614`, Ethereum Sepolia `11155111`, Optimism Sepolia `11155420`, or Avalanche Fuji `43113`
- runtime config is still targeting the testnet deployment namespace

The modal is not a core ATP contract surface. It is testnet onboarding infrastructure.

Protocol writes are currently enabled for BSC Testnet, Base Sepolia, Arbitrum Sepolia, Ethereum Sepolia, Optimism Sepolia, and Avalanche Fuji. Arbitrum Sepolia, Ethereum Sepolia, Optimism Sepolia, and Avalanche Fuji are testnet-only EOA-governed through zero-delay timelocks. Mainnet deployments must redeploy with the production multisig/Safe and non-zero timelock delay.

## Modal Tabs

| Tab | Purpose |
| --- | --- |
| Guide | Shows the beta setup sequence and network/faucet status. |
| Get Gas | Links to an external native gas faucet for the selected testnet. Orina does not mint native gas token. |
| Claim USDT.t | Claims mock USDT testnet token from the Orina testnet faucet when configured. |
| Claim USDC.t | Claims mock USDC testnet token from the Orina testnet faucet when configured. |
| Rankings | Shows testnet QA activity for the connected wallet. This is not a reward promise. |

## Testnet Token Naming

Use `.t` suffix for faucet-minted testnet stablecoins:

- `USDT.t`
- `USDC.t`

These tokens are mock ERC20 assets for operated testnets. They are not USDT, USDC, cash, stablecoin claims, redemption rights, or mainnet assets.

## Current Starter Kit Deployments

Starter-kit broadcast completed on BSC Testnet chain id `97` on 2026-06-07. Base Sepolia, Arbitrum Sepolia, Ethereum Sepolia, Optimism Sepolia, and Avalanche Fuji starter-kit assets are deterministic testnet deployments recorded below.

| Network | Chain id | Native gas | `OrinaTestTokenFaucet` | `USDT.t` | `USDC.t` |
| --- | ---: | --- | --- | --- | --- |
| BSC Testnet | `97` | `tBNB` | `0x6527262782C140e0A4724bef06431786556AfDE0` | `0x8800279B4a5528628ef069698169C58B89377809` | `0xbdcA834A71F5BFF1420eb5D1B0491d58a33141E5` |
| Base Sepolia | `84532` | `ETH` | `0xbBd53C18F4d9fb98aA6c4837Ea0E8F221E1B5F0F` | `0x11E6c8f2806b32DaC427E7dF07F67602647Ef87a` | `0xd6e84789741ea2DE727961CCB383454e4A845035` |
| Arbitrum Sepolia | `421614` | `ETH` | `0xFA37557E4F6D066f6CF4B69BA865837d007c8D1e` | `0x279c62C97c6967d0E0F45f9D2460d38E3929c090` | `0x233Fb28c8166807b01DcBE2743bb85cF7cdC8b41` |
| Ethereum Sepolia | `11155111` | `ETH` | `0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F` | `0x11E6c8f2806b32dAC427E7Df07F67602647eF87A` | `0xD6E84789741Ea2DE727961cCB383454E4A845035` |
| Optimism Sepolia | `11155420` | `ETH` | `0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F` | `0x11E6c8f2806b32dAC427E7Df07F67602647eF87A` | `0xD6E84789741Ea2DE727961cCB383454E4A845035` |
| Avalanche Fuji | `43113` | `AVAX` | `0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F` | `0x11E6c8f2806b32dAC427E7Df07F67602647eF87A` | `0xD6E84789741Ea2DE727961cCB383454E4A845035` |

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

After broadcast, paste only the emitted Runtime values into the Runtime env. Legacy `VITE_TESTNET_*` keys are still read as BSC aliases, but new networks must use per-network keys:

```env
VITE_ENABLE_TESTNET_STARTER_KIT=true
VITE_TESTNET_TBNB_FAUCET_URL=
VITE_TESTNET_TOKEN_FAUCET_ADDRESS=0x6527262782C140e0A4724bef06431786556AfDE0
VITE_TESTNET_USDT_T_ADDRESS=0x8800279B4a5528628ef069698169C58B89377809
VITE_TESTNET_USDC_T_ADDRESS=0xbdcA834A71F5BFF1420eb5D1B0491d58a33141E5
VITE_BSC_TESTNET_GAS_FAUCET_URL=
VITE_BSC_TESTNET_TOKEN_FAUCET_ADDRESS=0x6527262782C140e0A4724bef06431786556AfDE0
VITE_BSC_TESTNET_USDT_T_ADDRESS=0x8800279B4a5528628ef069698169C58B89377809
VITE_BSC_TESTNET_USDC_T_ADDRESS=0xbdcA834A71F5BFF1420eb5D1B0491d58a33141E5
VITE_BASE_SEPOLIA_GAS_FAUCET_URL=
VITE_BASE_SEPOLIA_TOKEN_FAUCET_ADDRESS=0xbBd53C18F4d9fb98aA6c4837Ea0E8F221E1B5F0F
VITE_BASE_SEPOLIA_USDT_T_ADDRESS=0x11E6c8f2806b32DaC427E7dF07F67602647Ef87a
VITE_BASE_SEPOLIA_USDC_T_ADDRESS=0xd6e84789741ea2DE727961CCB383454e4A845035
VITE_ARBITRUM_SEPOLIA_GAS_FAUCET_URL=
VITE_ARBITRUM_SEPOLIA_TOKEN_FAUCET_ADDRESS=0xFA37557E4F6D066f6CF4B69BA865837d007c8D1e
VITE_ARBITRUM_SEPOLIA_USDT_T_ADDRESS=0x279c62C97c6967d0E0F45f9D2460d38E3929c090
VITE_ARBITRUM_SEPOLIA_USDC_T_ADDRESS=0x233Fb28c8166807b01DcBE2743bb85cF7cdC8b41
VITE_ETHEREUM_SEPOLIA_GAS_FAUCET_URL=
VITE_ETHEREUM_SEPOLIA_TOKEN_FAUCET_ADDRESS=0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F
VITE_ETHEREUM_SEPOLIA_USDT_T_ADDRESS=0x11E6c8f2806b32dAC427E7Df07F67602647eF87A
VITE_ETHEREUM_SEPOLIA_USDC_T_ADDRESS=0xD6E84789741Ea2DE727961cCB383454E4A845035
VITE_OPTIMISM_SEPOLIA_GAS_FAUCET_URL=
VITE_OPTIMISM_SEPOLIA_TOKEN_FAUCET_ADDRESS=0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F
VITE_OPTIMISM_SEPOLIA_USDT_T_ADDRESS=0x11E6c8f2806b32dAC427E7Df07F67602647eF87A
VITE_OPTIMISM_SEPOLIA_USDC_T_ADDRESS=0xD6E84789741Ea2DE727961cCB383454E4A845035
VITE_AVALANCHE_FUJI_GAS_FAUCET_URL=
VITE_AVALANCHE_FUJI_TOKEN_FAUCET_ADDRESS=0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F
VITE_AVALANCHE_FUJI_USDT_T_ADDRESS=0x11E6c8f2806b32dAC427E7Df07F67602647eF87A
VITE_AVALANCHE_FUJI_USDC_T_ADDRESS=0xD6E84789741Ea2DE727961cCB383454E4A845035
```

Keep these env keys separate from `CONTRACTS` core protocol addresses. The faucet can be deployed, rotated, or disabled without changing the ATP core address set.

## Current Operated Testnets

The canonical contract address source is the Foundry address sheet. The runtime app currently treats BSC Testnet, Base Sepolia, Arbitrum Sepolia, Ethereum Sepolia, Optimism Sepolia, and Avalanche Fuji as write-enabled beta networks.

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

### Arbitrum Sepolia Core

| Contract | Address |
| --- | --- |
| `MarketplaceATP` | `0x5863f25A8250EBe20Bd1E3d04FD796081Fc3D72E` |
| `PaymentGateway` | `0x39F539903b75A0bF0FEF16a443904C8c9DF787EE` |
| `FeeManager` | `0x0c4AccB88E2Cc530FEFBAb31Ca77371a2a68Ba20` |
| `OrinaRWA` | `0x0244Ad5ca0BC9Cd8555352Cd53Dc51Fd8eD2f011` |
| `RWAReceiptNFT` | `0x6A695E8356b6F80664E31402038CbBdBCfffa816` |
| `DisputeManager` | `0xEE36B67BE61A37672D4ae041A89aEd12B333753E` |
| `AutoTimeManager` | `0x75ac6efE7483c03B971Fb8E635dEE8ed8D527c61` |
| `DelegationManager` | `0x56D454f55D5d05b060777F70e653BbBEb1167D2e` |
| `AIWalletFactoryV2` | `0x143519194A9Df4678b602BEE329C1A96381d1CBD` |
| `TimelockController` | `0x66Bf76Fdf268976080f119278982B082f417FbAD` |

Arbitrum Sepolia starter-kit assets are `ORI=0x5e41f1155AB4E614037C9C481BB8c1d398915cd0`, `USDT.t=0x279c62C97c6967d0E0F45f9D2460d38E3929c090`, `USDC.t=0x233Fb28c8166807b01DcBE2743bb85cF7cdC8b41`, and `OrinaTestTokenFaucet=0xFA37557E4F6D066f6CF4B69BA865837d007c8D1e`.

On 2026-06-29, on-chain checks confirmed Arbitrum Sepolia bytecode, `MarketplaceATP.delegationManager() == 0x56D454f55D5d05b060777F70e653BbBEb1167D2e`, `DelegationManager` grants `CONSUMER_ROLE` to its Marketplace, and the deployer EOA does not retain Marketplace or DelegationManager admin. The Arbitrum Sepolia timelock itself is intentionally controlled by deployer EOA `0x282Be18838D7079C215F49749a9606d77e00888b` with zero delay for testnet operations only.

### Ethereum Sepolia Core

| Contract | Address |
| --- | --- |
| `MarketplaceATP` | `0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14` |
| `PaymentGateway` | `0x1A880Ae46993282dd77C2dDCc5e36498eB616C92` |
| `FeeManager` | `0x51aB383A43d79f4127B7E7dCBcd892164FA2838F` |
| `OrinaRWA` | `0x0a9efc1fb95be24743b1452ac4c974E5E925A453` |
| `RWAReceiptNFT` | `0x82d2f4e131d1EB34F9B6Ebc8CC37bdD1cca84e95` |
| `DisputeManager` | `0x952aE0562De695c63c1386458DB537193Ce293b4` |
| `AutoTimeManager` | `0xa12273AD5b73c5F57139e84aa89Db52FE7Af05de` |
| `DelegationManager` | `0x52440e44ec34a64e19b92243262fe47819d65539` |
| `AIWalletFactoryV2` | `0x7D6b498eDc3F469ED020116e8892EbB361753bCB` |
| `TimelockController` | `0x5C842728C357B9b18eb8A9A7a840499936132e67` |

Ethereum Sepolia starter-kit assets are `ORI=0xD87493f4C02aad2c67Ce12aa534d188Bf44FCcAB`, `USDT.t=0x11E6c8f2806b32dAC427E7Df07F67602647eF87A`, `USDC.t=0xD6E84789741Ea2DE727961cCB383454E4A845035`, and `OrinaTestTokenFaucet=0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F`.

On 2026-07-01, on-chain checks confirmed Ethereum Sepolia bytecode, `MarketplaceATP.delegationManager() == 0x52440e44ec34a64e19b92243262fe47819d65539`, `DelegationManager` grants `CONSUMER_ROLE` to its Marketplace, and the deployer EOA does not retain Marketplace or DelegationManager admin. The Ethereum Sepolia timelock itself is intentionally controlled by deployer EOA `0x282Be18838D7079C215F49749a9606d77e00888b` with zero delay for testnet operations only.

### Optimism Sepolia Core

| Contract | Address |
| --- | --- |
| `MarketplaceATP` | `0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14` |
| `PaymentGateway` | `0x1A880Ae46993282dd77C2dDCc5e36498eB616C92` |
| `FeeManager` | `0x51aB383A43d79f4127B7E7dCBcd892164FA2838F` |
| `OrinaRWA` | `0x0a9efc1fb95be24743b1452ac4c974E5E925A453` |
| `RWAReceiptNFT` | `0x82d2f4e131d1EB34F9B6Ebc8CC37bdD1cca84e95` |
| `DisputeManager` | `0x952aE0562De695c63c1386458DB537193Ce293b4` |
| `AutoTimeManager` | `0xa12273AD5b73c5F57139e84aa89Db52FE7Af05de` |
| `DelegationManager` | `0x52440e44ec34a64e19b92243262fe47819d65539` |
| `AIWalletFactoryV2` | `0x7D6b498eDc3F469ED020116e8892EbB361753bCB` |
| `TimelockController` | `0x5C842728C357B9b18eb8A9A7a840499936132e67` |

Optimism Sepolia starter-kit assets are `ORI=0xD87493f4C02aad2c67Ce12aa534d188Bf44FCcAB`, `USDT.t=0x11E6c8f2806b32dAC427E7Df07F67602647eF87A`, `USDC.t=0xD6E84789741Ea2DE727961cCB383454E4A845035`, and `OrinaTestTokenFaucet=0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F`.

On 2026-07-01, on-chain checks confirmed Optimism Sepolia bytecode, `MarketplaceATP.delegationManager() == 0x52440e44ec34a64e19b92243262fe47819d65539`, `DelegationManager` grants `CONSUMER_ROLE` to its Marketplace, and the deployer EOA does not retain Marketplace or DelegationManager admin. The Optimism Sepolia timelock itself is intentionally controlled by deployer EOA `0x282Be18838D7079C215F49749a9606d77e00888b` with zero delay for testnet operations only.

### Avalanche Fuji Core

| Contract | Address |
| --- | --- |
| `MarketplaceATP` | `0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14` |
| `PaymentGateway` | `0x1A880Ae46993282dd77C2dDCc5e36498eB616C92` |
| `FeeManager` | `0x51aB383A43d79f4127B7E7dCBcd892164FA2838F` |
| `OrinaRWA` | `0x0a9efc1fb95be24743b1452ac4c974E5E925A453` |
| `RWAReceiptNFT` | `0x82d2f4e131d1EB34F9B6Ebc8CC37bdD1cca84e95` |
| `DisputeManager` | `0x952aE0562De695c63c1386458DB537193Ce293b4` |
| `AutoTimeManager` | `0xa12273AD5b73c5F57139e84aa89Db52FE7Af05de` |
| `DelegationManager` | `0x52440e44ec34a64e19b92243262fe47819d65539` |
| `AIWalletFactoryV2` | `0x7D6b498eDc3F469ED020116e8892EbB361753bCB` |
| `TimelockController` | `0x5C842728C357B9b18eb8A9A7a840499936132e67` |

Avalanche Fuji starter-kit assets are `ORI=0xD87493f4C02aad2c67Ce12aa534d188Bf44FCcAB`, `USDT.t=0x11E6c8f2806b32dAC427E7Df07F67602647eF87A`, `USDC.t=0xD6E84789741Ea2DE727961cCB383454E4A845035`, and `OrinaTestTokenFaucet=0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F`.

On 2026-07-02, on-chain checks confirmed Avalanche Fuji bytecode, `MarketplaceATP.delegationManager() == 0x52440e44ec34a64e19b92243262fe47819d65539`, `DelegationManager` grants `CONSUMER_ROLE` to its Marketplace, and the deployer EOA does not retain Marketplace or DelegationManager admin. The Avalanche Fuji timelock itself is intentionally controlled by deployer EOA `0x282Be18838D7079C215F49749a9606d77e00888b` with zero delay for testnet operations only. Avalanche-C mainnet must redeploy with a production multisig/Safe, non-zero timelock delay, and a new address set.

## Mainnet Boundary

Before any mainnet deployment:

- Set `VITE_ENABLE_TESTNET_STARTER_KIT=false`.
- Remove all `VITE_TESTNET_*` faucet env values from mainnet build environments.
- Do not allowlist `USDT.t` or `USDC.t` as production payment tokens.
- Do not deploy `OrinaTestStablecoin` or `OrinaTestTokenFaucet` to mainnet.
- Do not describe testnet rankings as rewards, eligibility, allocation, or financial entitlement.
- Replace beta ORI/payment-token parity assumptions with the production oracle quote layer.
- Redeploy Arbitrum, Ethereum, Optimism, and Avalanche-C mainnet targets with the production multisig/Safe and non-zero timelock delay; do not reuse the EOA-governed testnet address sets for mainnet.
- Complete the production checklist in `docs/mainnet-production-checklist.md`.

## Operator Checks

Run these checks before opening beta traffic:

1. Confirm wallet is on a configured operated testnet chain id.
2. Confirm faucet address is non-zero and has mint role on both mock tokens.
3. Confirm token decimals are `6`.
4. Confirm claim amount and cooldown are acceptable.
5. Confirm UI labels show `USDT.t` and `USDC.t`.
6. Confirm production/mainnet env has starter kit disabled.
7. Run `npm run verify:testnet-networks` before changing a network from blocked/coming to live.

The verification script is the shared operations gate for BSC Testnet, Base Sepolia, Arbitrum Sepolia, Ethereum Sepolia, Optimism Sepolia, and Avalanche Fuji. It fails if declared bytecode, runtime versions, `MarketplaceATP.delegationManager()`, starter-kit token metadata, or network-specific governance expectations drift from the recorded address set.
