---
name: contracts
description: "Skill for the Contracts area of ATP2. 271 symbols across 71 files."
---

# Contracts

271 symbols | 71 files | Cohesion: 59%

## When to Use

- Working with code in `foundry/`
- Understanding how TestRunLogBasic, TestOCRBasic, TestOCRJobReplacement work
- Modifying contracts-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/integration-tests/contracts/ethereum_contracts_automation_seth.go` | DeployUpkeepPerformCounterRestrictive, DeployKeeperConsumerPerformance, LoadKeeperRegistry, loadRegistry1_1, loadRegistry1_2 (+25) |
| `foundry/lib/chainlink/integration-tests/contracts/ethereum_vrfv2_contracts.go` | GetBlockHashStoreAddress, DeployVRFCoordinatorV2, DeployVRFConsumerV2, DeployVRFv2Consumer, DeployVRFv2LoadTestConsumer (+15) |
| `foundry/lib/chainlink/integration-tests/contracts/ethereum_contracts.go` | ChainlinkK8sClientToChainlinkNodeWithKeysAndAddress, ChainlinkClientToChainlinkNodeWithKeysAndAddress, V2OffChainAgrregatorToOffChainAggregatorWithRounds, V1OffChainAgrregatorToOffChainAggregatorWithRounds, Address (+13) |
| `foundry/lib/chainlink/integration-tests/contracts/ethereum_keeper_contracts.go` | Address, RegistryOwnerAddress, GetKeeperInfo, CancelUpkeep, logDetails (+12) |
| `foundry/lib/chainlink/integration-tests/contracts/ethereum_contracts_seth.go` | DeployEthereumOperatorFactory, DeployLinkTokenContract, LoadLinkTokenContract, DeployOffchainAggregator, DeployOffchainAggregatorV2 (+8) |
| `foundry/lib/chainlink/integration-tests/docker/test_env/test_env_builder.go` | NewCLTestEnvBuilder, WithTestInstance, WithChainlinkNodeLogScanner, WithCLNodes, WithTestConfig (+8) |
| `foundry/lib/chainlink/integration-tests/contracts/contract_deployer.go` | DefaultFluxAggregatorOptions, DefaultOffChainAggregatorOptions, DefaultOffChainAggregatorConfig, DeployOffChainAggregator, DeployOffchainAggregatorV2 (+7) |
| `foundry/lib/chainlink/integration-tests/actions/seth/actions.go` | FundChainlinkNodesFromRootAddress, DeployForwarderContracts, WatchNewOCRRound, ConfigureOCRv2AggregatorContracts, DeployOCRContractsForwarderFlow (+5) |
| `foundry/lib/chainlink/integration-tests/contracts/ethereum_vrf_contracts.go` | DeployVRFMockETHLINKFeed, DeployVRFv1Contract, DeployVRFCoordinator, DeployVRFCoordinatorTestV2, DeployVRFConsumer (+4) |
| `foundry/lib/chainlink/integration-tests/contracts/ethereum_ocr2vrf_contracts.go` | SetPayees, DeployBatchBlockhashStore, WaitForConfigSetEvent, DeployDKG, DeployOCR2VRFCoordinator (+4) |

## Entry Points

Start here when exploring this area:

- **`TestRunLogBasic`** (Function) — `foundry/lib/chainlink/integration-tests/smoke/runlog_test.go:25`
- **`TestOCRBasic`** (Function) — `foundry/lib/chainlink/integration-tests/smoke/ocr_test.go:27`
- **`TestOCRJobReplacement`** (Function) — `foundry/lib/chainlink/integration-tests/smoke/ocr_test.go:46`
- **`TestOCRv2Basic`** (Function) — `foundry/lib/chainlink/integration-tests/smoke/ocr2_test.go:44`
- **`TestOCRv2Request`** (Function) — `foundry/lib/chainlink/integration-tests/smoke/ocr2_test.go:78`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TestRunLogBasic` | Function | `foundry/lib/chainlink/integration-tests/smoke/runlog_test.go` | 25 |
| `TestOCRBasic` | Function | `foundry/lib/chainlink/integration-tests/smoke/ocr_test.go` | 27 |
| `TestOCRJobReplacement` | Function | `foundry/lib/chainlink/integration-tests/smoke/ocr_test.go` | 46 |
| `TestOCRv2Basic` | Function | `foundry/lib/chainlink/integration-tests/smoke/ocr2_test.go` | 44 |
| `TestOCRv2Request` | Function | `foundry/lib/chainlink/integration-tests/smoke/ocr2_test.go` | 78 |
| `TestOCRv2JobReplacement` | Function | `foundry/lib/chainlink/integration-tests/smoke/ocr2_test.go` | 100 |
| `TestForwarderOCRBasic` | Function | `foundry/lib/chainlink/integration-tests/smoke/forwarder_ocr_test.go` | 22 |
| `TestForwarderOCR2Basic` | Function | `foundry/lib/chainlink/integration-tests/smoke/forwarders_ocr2_test.go` | 23 |
| `TestFluxBasic` | Function | `foundry/lib/chainlink/integration-tests/smoke/flux_test.go` | 26 |
| `TestCronBasic` | Function | `foundry/lib/chainlink/integration-tests/smoke/cron_test.go` | 19 |
| `TestCronJobReplacement` | Function | `foundry/lib/chainlink/integration-tests/smoke/cron_test.go` | 75 |
| `TestVersionUpgrade` | Function | `foundry/lib/chainlink/integration-tests/migration/upgrade_version_test.go` | 14 |
| `DeployVRFMockETHLINKFeed` | Function | `foundry/lib/chainlink/integration-tests/contracts/ethereum_vrf_contracts.go` | 320 |
| `DeployEthereumOperatorFactory` | Function | `foundry/lib/chainlink/integration-tests/contracts/ethereum_contracts_seth.go` | 284 |
| `DeployLinkTokenContract` | Function | `foundry/lib/chainlink/integration-tests/contracts/ethereum_contracts_seth.go` | 586 |
| `LoadLinkTokenContract` | Function | `foundry/lib/chainlink/integration-tests/contracts/ethereum_contracts_seth.go` | 609 |
| `ChainlinkK8sClientToChainlinkNodeWithKeysAndAddress` | Function | `foundry/lib/chainlink/integration-tests/contracts/ethereum_contracts.go` | 2488 |
| `ChainlinkClientToChainlinkNodeWithKeysAndAddress` | Function | `foundry/lib/chainlink/integration-tests/contracts/ethereum_contracts.go` | 2497 |
| `V2OffChainAgrregatorToOffChainAggregatorWithRounds` | Function | `foundry/lib/chainlink/integration-tests/contracts/ethereum_contracts.go` | 2506 |
| `V1OffChainAgrregatorToOffChainAggregatorWithRounds` | Function | `foundry/lib/chainlink/integration-tests/contracts/ethereum_contracts.go` | 2515 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `SetupLogPollerTestDocker → TestEnvConfig` | cross_community | 6 |
| `SetupLogPollerTestDocker → ParseJSONFile` | cross_community | 6 |
| `SetupLogPollerTestDocker → CLClusterTestEnv` | cross_community | 6 |
| `SetupLogPollerTestDocker → WithLogStream` | cross_community | 6 |
| `SetupLogPollerTestDocker → ChainlinkClientToChainlinkNodeWithKeysAndAddress` | cross_community | 6 |
| `NewBaseHandler → ExportedEVMKey` | cross_community | 6 |
| `NewBaseHandler → R` | cross_community | 6 |
| `NewEthMocksWithTransactionsOnBlocksAssertions → ChainlinkClientToChainlinkNodeWithKeysAndAddress` | cross_community | 6 |
| `NewEthMocksWithTransactionsOnBlocksAssertions → NodeAPIs` | cross_community | 6 |
| `SetupLogPollerTestDocker → GetLoggingConfig` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Smoke | 66 calls |
| Actions | 38 calls |
| Keeper | 24 calls |
| Seth | 16 calls |
| Cltest | 8 calls |
| Client | 7 calls |
| Automationv2 | 6 calls |
| Testconfig | 6 calls |

## How to Explore

1. `gitnexus_context({name: "TestRunLogBasic"})` — see callers and callees
2. `gitnexus_query({query: "contracts"})` — find related execution flows
3. Read key files listed above for implementation details
