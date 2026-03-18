---
name: smoke
description: "Skill for the Smoke area of ATP2. 138 symbols across 52 files."
---

# Smoke

138 symbols | 52 files | Cohesion: 67%

## When to Use

- Working with code in `foundry/`
- Understanding how GetConfigurationNameFromEnv, TestVRFv2Basic, TestVRFv2MultipleSendingKeys work
- Modifying smoke-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/integration-tests/smoke/keeper_test.go` | TestKeeperBasicSmoke, TestKeeperBlockCountPerTurn, TestKeeperSimulation, TestKeeperCheckPerformGasLimit, TestKeeperRegisterUpkeep (+9) |
| `foundry/lib/chainlink/integration-tests/smoke/automation_test.go` | automationDefaultRegistryConfig, SetupAutomationBasic, TestSetUpkeepTriggerConfig, TestAutomationAddFunds, TestAutomationPauseUnPause (+7) |
| `foundry/lib/chainlink/integration-tests/testconfig/testconfig.go` | MustCopy, GetNetworkConfig, GetVRFv2Config, GetVRFv2PlusConfig, GetConfigurationNameFromEnv (+5) |
| `foundry/lib/chainlink/integration-tests/smoke/vrfv2plus_test.go` | TestVRFv2Plus, TestVRFv2PlusMultipleSendingKeys, TestVRFv2PlusMigration, TestVRFV2PlusWithBHS, TestVRFV2PlusWithBHF (+4) |
| `foundry/lib/chainlink/integration-tests/actions/actions.go` | GenerateWallet, GetTxFromAddress, DecodeTxInputData, WaitForBlockNumberToBe, GetRPCUrl (+2) |
| `foundry/lib/chainlink/integration-tests/actions/vrf/vrfv2/contract_steps.go` | FundSubscriptions, DirectFundingRequestRandomnessAndWaitForFulfillment, RequestRandomnessAndWaitForFulfillment, RequestRandomness, RequestRandomnessWithForceFulfillAndWaitForFulfillment (+2) |
| `foundry/lib/chainlink/integration-tests/actions/vrf/vrfv2plus/contract_steps.go` | CreateSubAndFindSubID, FundSubscriptions, RequestRandomness, RequestRandomnessAndWaitForFulfillment, DirectFundingRequestRandomnessAndWaitForFulfillment (+2) |
| `foundry/lib/chainlink/integration-tests/smoke/vrfv2_test.go` | TestVRFv2Basic, TestVRFv2MultipleSendingKeys, TestVRFOwner, TestVRFV2WithBHS, TestVRFV2NodeReorg (+1) |
| `foundry/lib/chainlink/integration-tests/actions/vrf/vrfv2plus/setup_steps.go` | CreateVRFV2PlusJob, SetupVRFV2PlusWrapperEnvironment, SetupVRFV2PlusUniverse, SetupSubsAndConsumersForExistingEnv |
| `foundry/lib/chainlink/integration-tests/load/vrfv2plus/vrfv2plus_test.go` | TestVRFV2PlusPerformance, TestVRFV2PlusBHSPerformance, teardown |

## Entry Points

Start here when exploring this area:

- **`GetConfigurationNameFromEnv`** (Function) — `foundry/lib/chainlink/integration-tests/testconfig/testconfig.go:251`
- **`TestVRFv2Basic`** (Function) — `foundry/lib/chainlink/integration-tests/smoke/vrfv2_test.go:40`
- **`TestVRFv2MultipleSendingKeys`** (Function) — `foundry/lib/chainlink/integration-tests/smoke/vrfv2_test.go:568`
- **`TestVRFOwner`** (Function) — `foundry/lib/chainlink/integration-tests/smoke/vrfv2_test.go:681`
- **`TestVRFV2WithBHS`** (Function) — `foundry/lib/chainlink/integration-tests/smoke/vrfv2_test.go:818`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `GetConfigurationNameFromEnv` | Function | `foundry/lib/chainlink/integration-tests/testconfig/testconfig.go` | 251 |
| `TestVRFv2Basic` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2_test.go` | 40 |
| `TestVRFv2MultipleSendingKeys` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2_test.go` | 568 |
| `TestVRFOwner` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2_test.go` | 681 |
| `TestVRFV2WithBHS` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2_test.go` | 818 |
| `TestVRFV2NodeReorg` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2_test.go` | 1044 |
| `TestVRFv2BatchFulfillmentEnabledDisabled` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2_test.go` | 1227 |
| `TestVRFv2Plus` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2plus_test.go` | 37 |
| `TestVRFv2PlusMultipleSendingKeys` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2plus_test.go` | 743 |
| `TestVRFv2PlusMigration` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2plus_test.go` | 852 |
| `TestVRFV2PlusWithBHS` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2plus_test.go` | 1252 |
| `TestVRFV2PlusWithBHF` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2plus_test.go` | 1487 |
| `TestVRFv2PlusReplayAfterTimeout` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2plus_test.go` | 1649 |
| `TestVRFv2PlusPendingBlockSimulationAndZeroConfirmationDelays` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2plus_test.go` | 1821 |
| `TestVRFv2PlusNodeReorg` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2plus_test.go` | 1916 |
| `TestVRFv2PlusBatchFulfillmentEnabledDisabled` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrfv2plus_test.go` | 2098 |
| `TestGasExperiment` | Function | `foundry/lib/chainlink/integration-tests/experiments/gas_test.go` | 16 |
| `ParseRandomWordsFulfilledLogs` | Function | `foundry/lib/chainlink/integration-tests/contracts/ethereum_vrf_common.go` | 105 |
| `DeleteJobs` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr2_helpers_local.go` | 319 |
| `GenerateWallet` | Function | `foundry/lib/chainlink/integration-tests/actions/actions.go` | 465 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DeployKeeperContracts → ToInt` | cross_community | 5 |
| `DeployPerformDataCheckerContracts → ToInt` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Contracts | 66 calls |
| Mocks | 50 calls |
| Seth | 27 calls |
| Actions | 22 calls |
| Keeper | 17 calls |
| Cltest | 16 calls |
| Solidity_cross_tests | 11 calls |
| Logpoller | 8 calls |

## How to Explore

1. `gitnexus_context({name: "GetConfigurationNameFromEnv"})` — see callers and callees
2. `gitnexus_query({query: "smoke"})` — find related execution flows
3. Read key files listed above for implementation details
