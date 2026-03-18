---
name: txmgr
description: "Skill for the Txmgr area of ATP2. 209 symbols across 54 files."
---

# Txmgr

209 symbols | 54 files | Cohesion: 62%

## When to Use

- Working with code in `foundry/`
- Understanding how TestEthConfirmer_Lifecycle, TestEthConfirmer_CheckForReceipts, TestEthConfirmer_CheckForReceipts_batching work
- Modifying txmgr-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | newTestChainScopedConfig, newBroadcastLegacyEthTxAttempt, mustInsertInProgressEthTx, TestEthConfirmer_Lifecycle, TestEthConfirmer_CheckForReceipts (+21) |
| `foundry/lib/chainlink/common/txmgr/confirmer.go` | ProcessHead, processHead, CheckConfirmedMissingReceipt, CheckForReceipts, RebroadcastWhereNecessary (+16) |
| `foundry/lib/chainlink/core/chains/evm/txmgr/evm_tx_store.go` | ToTx, preloadTxesAtomic, fromDBReceipts, dbEthTxAttemptsToEthTxAttempts, FindTxAttemptConfirmedByTxIDs (+9) |
| `foundry/lib/chainlink/common/txmgr/broadcaster.go` | ProcessUnstartedTxs, NewBroadcaster, processUnstartedTxs, handleAnyInProgressTx, handleUnstartedTx (+8) |
| `foundry/lib/chainlink/core/chains/evm/txmgr/broadcaster_test.go` | NewTestEthBroadcaster, TestEthBroadcaster_ProcessUnstartedEthTxs_Success, TestEthBroadcaster_TransmitChecking, TestEthBroadcaster_ProcessUnstartedEthTxs_OptimisticLockingOnEthTx, TestEthBroadcaster_ProcessUnstartedEthTxs_Success_WithMultiplier (+8) |
| `foundry/lib/chainlink/core/chains/evm/txmgr/txmgr_test.go` | mustCreateUnstartedGeneratedTx, withDefaults, mustCreateUnstartedTx, mustCreateUnstartedTxFromEvmTxRequest, TestTxm_CreateTransaction (+8) |
| `foundry/lib/chainlink/common/txmgr/txmgr.go` | NewTxm, runLoop, Trigger, CreateTransaction, SendNativeToken (+3) |
| `foundry/lib/chainlink/core/chains/evm/txmgr/stuck_tx_detector_test.go` | TestStuckTxDetector_Disabled, TestStuckTxDetector_FindPotentialStuckTxs, TestStuckTxDetector_LoadPurgeBlockNumMap, TestStuckTxDetector_DetectStuckTransactionsHeuristic, TestStuckTxDetector_DetectStuckTransactionsZkEVM (+2) |
| `foundry/lib/chainlink/core/chains/evm/txmgr/attempts_test.go` | TestTxm_EvmTxAttemptBuilder_RetryableEstimatorError, NewEvmAddress, newFeeConfig, TestTxm_NewDynamicFeeTx, TestTxm_NewLegacyAttempt (+1) |
| `foundry/lib/chainlink/common/txmgr/test_helpers.go` | XXXTestDisableUnstartedTxAutoProcessing, XXXTestStartInternal, XXXTestResendUnconfirmed, XXXTestAbandon, XXXTestCloseInternal |

## Entry Points

Start here when exploring this area:

- **`TestEthConfirmer_Lifecycle`** (Function) — `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go:113`
- **`TestEthConfirmer_CheckForReceipts`** (Function) — `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go:184`
- **`TestEthConfirmer_CheckForReceipts_batching`** (Function) — `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go:594`
- **`TestEthConfirmer_CheckForReceipts_HandlesNonFwdTxsWithForwardingEnabled`** (Function) — `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go:655`
- **`TestEthConfirmer_CheckForReceipts_only_likely_confirmed`** (Function) — `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go:707`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TestEthConfirmer_Lifecycle` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 113 |
| `TestEthConfirmer_CheckForReceipts` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 184 |
| `TestEthConfirmer_CheckForReceipts_batching` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 594 |
| `TestEthConfirmer_CheckForReceipts_HandlesNonFwdTxsWithForwardingEnabled` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 655 |
| `TestEthConfirmer_CheckForReceipts_only_likely_confirmed` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 707 |
| `TestEthConfirmer_CheckForReceipts_should_not_check_for_likely_unconfirmed` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 765 |
| `TestEthConfirmer_CheckForReceipts_confirmed_missing_receipt_scoped_to_key` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 793 |
| `TestEthConfirmer_CheckForReceipts_confirmed_missing_receipt` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 859 |
| `TestEthConfirmer_CheckConfirmedMissingReceipt` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 1115 |
| `TestEthConfirmer_CheckConfirmedMissingReceipt_batchSendTransactions_fails` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 1195 |
| `TestEthConfirmer_CheckConfirmedMissingReceipt_smallEvmRPCBatchSize_middleBatchSendTransactionFails` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 1259 |
| `TestEthConfirmer_FindTxsRequiringRebroadcast` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 1330 |
| `TestEthConfirmer_RebroadcastWhereNecessary_WithConnectivityCheck` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 1623 |
| `TestEthConfirmer_RebroadcastWhereNecessary_MaxFeeScenario` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 1727 |
| `TestEthConfirmer_RebroadcastWhereNecessary` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 1795 |
| `TestEthConfirmer_RebroadcastWhereNecessary_TerminallyUnderpriced_ThenGoesThrough` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 2408 |
| `TestEthConfirmer_RebroadcastWhereNecessary_WhenOutOfEth` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 2521 |
| `TestEthConfirmer_EnsureConfirmedTransactionsInLongestChain` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 2658 |
| `TestEthConfirmer_ForceRebroadcast` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 2832 |
| `TestEthConfirmer_ResumePendingRuns` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/confirmer_test.go` | 2932 |

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
| `NewTxm → Sugared` | cross_community | 5 |
| `NewTxm → Helper` | cross_community | 5 |
| `DeployKeeperContracts → ToInt` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Logpoller | 39 calls |
| Cltest | 15 calls |
| Smoke | 13 calls |
| Mocks | 8 calls |
| Client | 8 calls |
| Keeper | 6 calls |
| Headtracker | 4 calls |
| Rollups | 4 calls |

## How to Explore

1. `gitnexus_context({name: "TestEthConfirmer_Lifecycle"})` — see callers and callees
2. `gitnexus_query({query: "txmgr"})` — find related execution flows
3. Read key files listed above for implementation details
