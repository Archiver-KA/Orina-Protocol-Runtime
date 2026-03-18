---
name: actions
description: "Skill for the Actions area of ATP2. 91 symbols across 23 files."
---

# Actions

91 symbols | 23 files | Cohesion: 65%

## When to Use

- Working with code in `foundry/`
- Understanding how TestVRFBasic, TestVRFJobReplacement, CreateOCRJobsLocal work
- Modifying actions-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/integration-tests/client/chainlink.go` | MustCreateJob, MustReadRunsByJob, MustCreateBridge, MustReadOCRKeys, MustReadOCR2Keys (+7) |
| `foundry/lib/chainlink/integration-tests/actions/keeper_helpers.go` | CreateKeeperJobs, CreateKeeperJobsWithKeyIndex, DeployKeeperContracts, DeployPerformanceKeeperContracts, DeployPerformDataCheckerContracts (+5) |
| `foundry/lib/chainlink/integration-tests/actions/actions.go` | FundChainlinkNodes, ChainlinkNodeAddressesAtIndex, EncodeOnChainExternalJobID, TeardownRemoteSuite, DeleteAllJobs (+4) |
| `foundry/lib/chainlink/integration-tests/actions/ocr_helpers.go` | CreateOCRJobs, CreateOCRJobsWithForwarder, SetAdapterResponse, BuildNodeContractPairID, SetAllAdapterResponsesToTheSameValue (+2) |
| `foundry/lib/chainlink/integration-tests/contracts/contract_deployer.go` | DeployMockETHLINKFeed, DeployMockGasFeed, DeployUpkeepTranscoder, DeployKeeperRegistry, DeployKeeperPerformDataChecker (+2) |
| `foundry/lib/chainlink/integration-tests/actions/ocr2_helpers.go` | GetOracleIdentitiesWithKeyIndex, CreateOCRv2Jobs, BuildOCR2NodeContractPairID, SetOCR2AdapterResponse, SetOCR2AllAdapterResponsesToTheSameValue (+1) |
| `foundry/lib/chainlink/integration-tests/actions/automation_ocr_helpers.go` | CreateOCRKeeperJobs, deployRegistry, BuildAutoOCR2ConfigVarsWithKeyIndex, DeployAutoOCRRegistryAndRegistrar, deployRegistrar |
| `foundry/lib/chainlink/integration-tests/docker/test_env/cl_node.go` | AddMercuryOCRJob, GetPeerUrl, ChainlinkNodeAddress, Fund |
| `foundry/lib/chainlink/integration-tests/contracts/ethereum_keeper_contracts.go` | SetKeepers, Create21OnchainConfig, Encode20OnchainConfig |
| `foundry/lib/chainlink/integration-tests/actions/ocr_helpers_local.go` | CreateOCRJobsLocal, SetAdapterResponseLocal, CreateOCRJobsWithForwarderLocal |

## Entry Points

Start here when exploring this area:

- **`TestVRFBasic`** (Function) — `foundry/lib/chainlink/integration-tests/smoke/vrf_test.go:26`
- **`TestVRFJobReplacement`** (Function) — `foundry/lib/chainlink/integration-tests/smoke/vrf_test.go:95`
- **`CreateOCRJobsLocal`** (Function) — `foundry/lib/chainlink/integration-tests/actions/ocr_helpers_local.go:143`
- **`SetAdapterResponseLocal`** (Function) — `foundry/lib/chainlink/integration-tests/actions/ocr_helpers_local.go:221`
- **`CreateOCRJobsWithForwarderLocal`** (Function) — `foundry/lib/chainlink/integration-tests/actions/ocr_helpers_local.go:344`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TestVRFBasic` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrf_test.go` | 26 |
| `TestVRFJobReplacement` | Function | `foundry/lib/chainlink/integration-tests/smoke/vrf_test.go` | 95 |
| `CreateOCRJobsLocal` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr_helpers_local.go` | 143 |
| `SetAdapterResponseLocal` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr_helpers_local.go` | 221 |
| `CreateOCRJobsWithForwarderLocal` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr_helpers_local.go` | 344 |
| `CreateOCRJobs` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr_helpers.go` | 183 |
| `CreateOCRJobsWithForwarder` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr_helpers.go` | 263 |
| `SetAdapterResponse` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr_helpers.go` | 368 |
| `BuildNodeContractPairID` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr_helpers.go` | 435 |
| `CreateOCRv2JobsLocal` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr2_helpers_local.go` | 33 |
| `GetOracleIdentitiesWithKeyIndexLocal` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr2_helpers_local.go` | 233 |
| `GetOracleIdentitiesWithKeyIndex` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr2_helpers.go` | 177 |
| `CreateOCRv2Jobs` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr2_helpers.go` | 264 |
| `BuildOCR2NodeContractPairID` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr2_helpers.go` | 491 |
| `CreateKeeperJobs` | Function | `foundry/lib/chainlink/integration-tests/actions/keeper_helpers.go` | 24 |
| `CreateKeeperJobsWithKeyIndex` | Function | `foundry/lib/chainlink/integration-tests/actions/keeper_helpers.go` | 59 |
| `CreateOCRKeeperJobsLocal` | Function | `foundry/lib/chainlink/integration-tests/actions/automation_ocr_helpers_local.go` | 175 |
| `CreateOCRKeeperJobs` | Function | `foundry/lib/chainlink/integration-tests/actions/automation_ocr_helpers.go` | 176 |
| `FundChainlinkNodes` | Function | `foundry/lib/chainlink/integration-tests/actions/actions.go` | 50 |
| `ChainlinkNodeAddressesAtIndex` | Function | `foundry/lib/chainlink/integration-tests/actions/actions.go` | 167 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `NewBaseHandler → ExportedEVMKey` | cross_community | 6 |
| `NewBaseHandler → R` | cross_community | 6 |
| `Run → OCR2Keys` | cross_community | 5 |
| `DeployKeeperContracts → WrappedContractBackend` | cross_community | 5 |
| `DeployKeeperContracts → ToInt` | cross_community | 5 |
| `DeployPerformDataCheckerContracts → ToInt` | cross_community | 5 |
| `DeployPerformDataCheckerContracts → WrappedContractBackend` | cross_community | 5 |
| `LoadAutomationDeployment → ETHKeys` | cross_community | 5 |
| `LoadAutomationDeployment → R` | cross_community | 5 |
| `Run → Go` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Client | 22 calls |
| Contracts | 11 calls |
| Keeper | 9 calls |
| Smoke | 5 calls |
| Automationv2 | 5 calls |
| Solidity_cross_tests | 3 calls |
| Seth | 3 calls |
| Testsetups | 2 calls |

## How to Explore

1. `gitnexus_context({name: "TestVRFBasic"})` — see callers and callees
2. `gitnexus_query({query: "actions"})` — find related execution flows
3. Read key files listed above for implementation details
