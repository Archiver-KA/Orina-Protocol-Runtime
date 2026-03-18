---
name: logpoller
description: "Skill for the Logpoller area of ATP2. 114 symbols across 52 files."
---

# Logpoller

114 symbols | 52 files | Cohesion: 39%

## When to Use

- Working with code in `foundry/`
- Understanding how ApplyMultiplier, DeployStakingEventsMock, DeployStaking work
- Modifying logpoller-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/chains/evm/logpoller/orm_test.go` | GenLogWithData, TestORM, insertLogsTopicValueRange, TestORM_IndexedLogs, TestORM_SelectIndexedLogsByTxHash (+9) |
| `foundry/lib/chainlink/core/chains/evm/logpoller/log_poller_test.go` | populateDatabase, TestPopulateLoadedDB, Test_BackupLogPoller, TestLogPoller_BackupPollAndSaveLogsWithPollerNotWorking, TestLogPoller_BackupPollAndSaveLogsWithDeepBlockDelay (+4) |
| `foundry/lib/chainlink/core/chains/evm/logpoller/observability_test.go` | TestMultipleMetricsArePublished, TestShouldPublishDurationInCaseOfError, TestMetricsAreProperlyPopulatedWithLabels, TestNotPublishingDatasetSizeInCaseOfError, TestMetricsAreProperlyPopulatedForWrites (+4) |
| `foundry/lib/chainlink/core/chains/evm/logpoller/observability.go` | InsertLogs, InsertLogsWithBlock, withObservedExec, trackInsertedLogsAndBlock, withObservedQueryAndResults (+1) |
| `foundry/lib/chainlink/core/chains/evm/logpoller/query.go` | newQueryArgs, newQueryArgsForEvent, concatBytes, withIndexableField |
| `foundry/lib/chainlink/core/chains/evm/logpoller/parser.go` | whereClause, orderClause, cmpOpToString, orderToString |
| `foundry/lib/chainlink/core/chains/evm/logpoller/log_poller.go` | convertLogs, getCurrentBlockMaybeHandleReorg, fetchBlocks, validateBlockResponse |
| `foundry/lib/chainlink/core/services/relay/evm/functions/contract_transmitter.go` | createEthTransaction, Transmit, parseTransmitted, LatestConfigDigestAndEpoch |
| `foundry/lib/chainlink/core/services/job/orm.go` | toVRFSpecRow, toBlockhashStoreSpecRow, toBlockHeaderFeederSpecRow, toLegacyGasStationServerSpecRow |
| `foundry/lib/chainlink/core/services/keystore/keys/cosmoskey/key.go` | Key, newFrom, PublicKeyStr |

## Entry Points

Start here when exploring this area:

- **`ApplyMultiplier`** (Function) — `foundry/lib/chainlink/common/fee/utils.go:10`
- **`DeployStakingEventsMock`** (Function) — `foundry/lib/chainlink/integration-tests/contracts/ethereum/StakingEventsMock.go:41`
- **`DeployStaking`** (Function) — `foundry/lib/chainlink/integration-tests/contracts/ethereum/Staking.go:63`
- **`DeployOffchainAggregatorEventsMock`** (Function) — `foundry/lib/chainlink/integration-tests/contracts/ethereum/OffchainAggregatorEventsMock.go:41`
- **`Test_DataSource`** (Function) — `foundry/lib/chainlink/core/services/llo/data_source_test.go:43`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ApplyMultiplier` | Function | `foundry/lib/chainlink/common/fee/utils.go` | 10 |
| `DeployStakingEventsMock` | Function | `foundry/lib/chainlink/integration-tests/contracts/ethereum/StakingEventsMock.go` | 41 |
| `DeployStaking` | Function | `foundry/lib/chainlink/integration-tests/contracts/ethereum/Staking.go` | 63 |
| `DeployOffchainAggregatorEventsMock` | Function | `foundry/lib/chainlink/integration-tests/contracts/ethereum/OffchainAggregatorEventsMock.go` | 41 |
| `Test_DataSource` | Function | `foundry/lib/chainlink/core/services/llo/data_source_test.go` | 43 |
| `TestModeTask` | Function | `foundry/lib/chainlink/core/services/pipeline/task.mode_test.go` | 16 |
| `TestETHABIEncodeTask2` | Function | `foundry/lib/chainlink/core/services/pipeline/task.eth_abi_encode_2_test.go` | 16 |
| `TestETHABIDecodeLogTask` | Function | `foundry/lib/chainlink/core/services/pipeline/task.eth_abi_decode_log_test.go` | 18 |
| `NewBlocks` | Function | `foundry/lib/chainlink/core/internal/cltest/cltest.go` | 1393 |
| `TestClientErrorsConfig` | Function | `foundry/lib/chainlink/core/chains/evm/config/config_test.go` | 330 |
| `TestChainClient_BatchCallContext` | Function | `foundry/lib/chainlink/core/chains/evm/client/chain_client_test.go` | 758 |
| `New` | Function | `foundry/lib/chainlink/core/chains/evm/utils/big/big.go` | 55 |
| `TestInsertSelectDelete` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/upkeepstate/orm_test.go` | 15 |
| `NewORM` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/upkeepstate/orm.go` | 28 |
| `MarshalRLPWith` | Function | `foundry/lib/chainlink/core/scripts/common/polygonedge.go` | 96 |
| `GenLogWithData` | Function | `foundry/lib/chainlink/core/chains/evm/logpoller/orm_test.go` | 65 |
| `TestORM` | Function | `foundry/lib/chainlink/core/chains/evm/logpoller/orm_test.go` | 187 |
| `TestORM_IndexedLogs` | Function | `foundry/lib/chainlink/core/chains/evm/logpoller/orm_test.go` | 589 |
| `TestORM_SelectIndexedLogsByTxHash` | Function | `foundry/lib/chainlink/core/chains/evm/logpoller/orm_test.go` | 760 |
| `TestORM_DataWords` | Function | `foundry/lib/chainlink/core/chains/evm/logpoller/orm_test.go` | 843 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → ToInt` | cross_community | 7 |
| `Main → ToInt` | cross_community | 6 |
| `ServicesForSpec → ToInt` | cross_community | 6 |
| `Run → ToInt` | cross_community | 6 |
| `Run → ToInt` | cross_community | 6 |
| `AssetDetailsPage → ToInt` | cross_community | 6 |
| `Run → ToInt` | cross_community | 6 |
| `NewEVM → New` | cross_community | 5 |
| `Main → ToInt` | cross_community | 4 |
| `Main → ToInt` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pipeline | 6 calls |
| Smoke | 6 calls |
| Keeper | 5 calls |
| Mocks | 4 calls |
| Client | 3 calls |
| Txmgr | 1 calls |
| V2 | 1 calls |
| V21 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "ApplyMultiplier"})` — see callers and callees
2. `gitnexus_query({query: "logpoller"})` — find related execution flows
3. Read key files listed above for implementation details
