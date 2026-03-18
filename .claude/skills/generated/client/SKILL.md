---
name: client
description: "Skill for the Client area of ATP2. 227 symbols across 67 files."
---

# Client

227 symbols | 67 files | Cohesion: 55%

## When to Use

- Working with code in `foundry/`
- Understanding how TrackForwarderLocal, Test_groupID, BestEffortExtractEAStatus work
- Modifying client-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/integration-tests/client/chainlink.go` | Health, CreateJobRaw, ReadRunsByJob, CreateBridge, CreateOCRKey (+40) |
| `foundry/lib/chainlink/common/client/multi_node.go` | nLiveNodes, broadcastTxAsync, reportSendTxAnomalies, SendTransaction, Dial (+10) |
| `foundry/lib/chainlink/common/client/node_fsm.go` | transitionToAlive, transitionToInSync, transitionToOutOfSync, transitionToUnreachable, transitionToInvalidChainID (+9) |
| `foundry/lib/chainlink/core/chains/evm/client/chain_client_test.go` | mustNewChainClient, mustNewChainClientWithChainID, TestEthClient_TransactionReceipt, TestEthClient_PendingNonceAt, TestEthClient_BalanceAt (+7) |
| `foundry/lib/chainlink/common/client/multi_node_test.go` | newTestMultiNode, newMultiNodeRPCClient, TestMultiNode_CheckLease, TestMultiNode_selectNode, TestMultiNode_nLiveNodes (+7) |
| `foundry/lib/chainlink/common/client/node_lifecycle_test.go` | TestUnit_NodeLifecycle_outOfSyncLoop, TestUnit_NodeLifecycle_aliveLoop, ToMockHead, writeHeads, TestUnit_NodeLifecycle_SyncingLoop (+5) |
| `foundry/lib/chainlink/common/client/node.go` | disconnectAll, Order, NewNode, Start, start (+4) |
| `foundry/lib/chainlink/common/client/node_lifecycle.go` | zombieNodeCheckInterval, setLatestReceived, aliveLoop, outOfSyncLoop, syncingLoop (+4) |
| `foundry/lib/chainlink/core/chains/evm/client/simulated_backend_client.go` | ethGetLogs, interfaceToHash, CallContract, ethEstimateGas, ethCall (+2) |
| `foundry/lib/chainlink/core/chains/evm/client/mocks/client.go` | Dial, HeadByNumber, PendingNonceAt, SendTransaction, NewClient |

## Entry Points

Start here when exploring this area:

- **`TrackForwarderLocal`** (Function) — `foundry/lib/chainlink/integration-tests/actions/ocr_helpers_local.go:258`
- **`Test_groupID`** (Function) — `foundry/lib/chainlink/core/services/p2p/counter_test.go:8`
- **`BestEffortExtractEAStatus`** (Function) — `foundry/lib/chainlink/core/services/pipeline/internal/eautils/eautils.go:14`
- **`TestEthClient_TransactionReceipt`** (Function) — `foundry/lib/chainlink/core/chains/evm/client/chain_client_test.go:51`
- **`TestEthClient_PendingNonceAt`** (Function) — `foundry/lib/chainlink/core/chains/evm/client/chain_client_test.go:127`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TrackForwarderLocal` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr_helpers_local.go` | 258 |
| `Test_groupID` | Function | `foundry/lib/chainlink/core/services/p2p/counter_test.go` | 8 |
| `BestEffortExtractEAStatus` | Function | `foundry/lib/chainlink/core/services/pipeline/internal/eautils/eautils.go` | 14 |
| `TestEthClient_TransactionReceipt` | Function | `foundry/lib/chainlink/core/chains/evm/client/chain_client_test.go` | 51 |
| `TestEthClient_PendingNonceAt` | Function | `foundry/lib/chainlink/core/chains/evm/client/chain_client_test.go` | 127 |
| `TestEthClient_BalanceAt` | Function | `foundry/lib/chainlink/core/chains/evm/client/chain_client_test.go` | 164 |
| `TestEthClient_LatestBlockHeight` | Function | `foundry/lib/chainlink/core/chains/evm/client/chain_client_test.go` | 209 |
| `TestEthClient_GetERC20Balance` | Function | `foundry/lib/chainlink/core/chains/evm/client/chain_client_test.go` | 238 |
| `TestEthClient_HeaderByNumber` | Function | `foundry/lib/chainlink/core/chains/evm/client/chain_client_test.go` | 313 |
| `TestEthClient_SendTransaction_NoSecondaryURL` | Function | `foundry/lib/chainlink/core/chains/evm/client/chain_client_test.go` | 380 |
| `TestEthClient_SendTransaction_WithSecondaryURLs` | Function | `foundry/lib/chainlink/core/chains/evm/client/chain_client_test.go` | 410 |
| `TestEthClient_SendTransactionReturnCode` | Function | `foundry/lib/chainlink/core/chains/evm/client/chain_client_test.go` | 453 |
| `TestEthClient_SubscribeNewHead` | Function | `foundry/lib/chainlink/core/chains/evm/client/chain_client_test.go` | 707 |
| `NewBaseHandler` | Function | `foundry/lib/chainlink/core/scripts/chaincli/handler/handler.go` | 97 |
| `NewEthClientMock` | Function | `foundry/lib/chainlink/core/internal/testutils/evmtest/evmtest.go` | 290 |
| `Test_SetNonceAfterInit` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/nonce_tracker_test.go` | 258 |
| `TestLogPoller_BackupPollerStartup` | Function | `foundry/lib/chainlink/core/chains/evm/logpoller/log_poller_internal_test.go` | 203 |
| `NewEthClientMock` | Function | `foundry/lib/chainlink/core/chains/evm/testutils/client.go` | 24 |
| `NewClient` | Function | `foundry/lib/chainlink/core/chains/evm/client/mocks/client.go` | 1013 |
| `SetAllAdapterResponsesToDifferentValues` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr_helpers.go` | 409 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → LoadersKey` | cross_community | 8 |
| `Main → EthTransactionAttemptResolver` | cross_community | 8 |
| `Main → LoadersKey` | cross_community | 8 |
| `Main → EthTransactionAttemptResolver` | cross_community | 8 |
| `Main → FromInt64` | cross_community | 6 |
| `Main → FromInt64` | cross_community | 6 |
| `NewBaseHandler → ExportedEVMKey` | cross_community | 6 |
| `NewBaseHandler → R` | cross_community | 6 |
| `NewEthMocksWithTransactionsOnBlocksAssertions → ChainlinkClientToChainlinkNodeWithKeysAndAddress` | cross_community | 6 |
| `NewEthMocksWithTransactionsOnBlocksAssertions → NodeAPIs` | cross_community | 6 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Logpoller | 21 calls |
| Txmgr | 12 calls |
| Mocks | 8 calls |
| Keeper | 8 calls |
| Cltest | 6 calls |
| Smoke | 5 calls |
| Actions | 4 calls |
| Headtracker | 3 calls |

## How to Explore

1. `gitnexus_context({name: "TrackForwarderLocal"})` — see callers and callees
2. `gitnexus_query({query: "client"})` — find related execution flows
3. Read key files listed above for implementation details
