---
name: v2
description: "Skill for the V2 area of ATP2. 271 symbols across 40 files."
---

# V2

271 symbols | 40 files | Cohesion: 56%

## When to Use

- Working with code in `foundry/`
- Understanding how TestVRFV2Integration_SingleConsumer_Wrapper, TestVRFV2Integration_Wrapper_High_Gas, TestIntegrationVRFV2 work
- Modifying v2-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_test.go` | sendEth, subscribeVRF, createVRFJobs, requestRandomnessForWrapper, requestRandomnessAndAssertRandomWordsRequestedEvent (+44) |
| `foundry/lib/chainlink/core/services/vrf/v2/coordinator_v2x_interface.go` | NewCoordinatorV2, NewCoordinatorV2_5, FromV2Proof, FromV2PlusProof, NewRequestCommitment (+25) |
| `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_plus_test.go` | TestVRFV2PlusIntegration_Migration, newVRFCoordinatorV2PlusUniverse, TestVRFV2PlusIntegration_SingleConsumer_HappyPath_BatchFulfillment, TestVRFV2PlusIntegration_SingleConsumer_HappyPath_BatchFulfillment_BigGasCallback, TestVRFV2PlusIntegration_SingleConsumer_HappyPath (+21) |
| `foundry/lib/chainlink/core/services/vrf/v2/integration_helpers_test.go` | testSingleConsumerHappyPath, testMultipleConsumersNeedBHS, testMultipleConsumersNeedTrustedBHS, verifyBlockhashStored, testSingleConsumerHappyPathBatchFulfillment (+14) |
| `foundry/lib/chainlink/core/services/vrf/v2/listener_v2_log_listener_test.go` | SetupGetUnfulfilledTH, TestGetUnfulfilled_NoVRFReqs, TestGetUnfulfilled_NoUnfulfilledVRFReqs, TestGetUnfulfilled_OneUnfulfilledVRFReq, TestGetUnfulfilled_SomeUnfulfilledVRFReq (+13) |
| `foundry/lib/chainlink/core/services/vrf/v2/listener_v2_log_processor.go` | getConfirmedLogsBySub, ready, pruneConfirmedRequestCounts, processPendingVRFRequests, processRequestsPerSubBatchHelper (+12) |
| `foundry/lib/chainlink/core/services/vrf/vrftesthelpers/consumer_v2.go` | SGasAvailable, CreateSubscriptionAndFundNative, NewVRFV2PlusConsumer, NewMaliciousConsumerPlus, NewRevertingConsumerPlus (+10) |
| `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_reverted_txns_test.go` | createVRFJobsNew, TestVRFV2Integration_SingleRevertedTxn_ForceFulfillment, TestVRFV2Integration_BatchRevertedTxn_ForceFulfillment, TestVRFV2Integration_ForceFulfillmentRevertedTxn_Retry, TestVRFV2Integration_CanceledSubForceFulfillmentRevertedTxn_Retry (+9) |
| `foundry/lib/chainlink/core/services/vrf/v2/reverted_txns.go` | handleRevertedTxns, fetchRecentSingleTxns, fetchRecentBatchTxns, fetchRevertedForceFulfilmentTxns, unique (+7) |
| `foundry/lib/chainlink/core/services/vrf/v2/listener_v2_test.go` | TestListener_Backoff, makeTestTxm, testMaybeSubtractReservedLink, testMaybeSubtractReservedNative, TestMaybeSubtractReservedNativeV2 (+6) |

## Entry Points

Start here when exploring this area:

- **`TestVRFV2Integration_SingleConsumer_Wrapper`** (Function) — `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_test.go:1160`
- **`TestVRFV2Integration_Wrapper_High_Gas`** (Function) — `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_test.go:1241`
- **`TestIntegrationVRFV2`** (Function) — `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_test.go:1619`
- **`TestVRFV2PlusIntegration_Migration`** (Function) — `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_plus_test.go:1127`
- **`TestStartHeartbeats`** (Function) — `foundry/lib/chainlink/core/services/vrf/v2/bhs_feeder_test.go:20`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TestVRFV2Integration_SingleConsumer_Wrapper` | Function | `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_test.go` | 1160 |
| `TestVRFV2Integration_Wrapper_High_Gas` | Function | `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_test.go` | 1241 |
| `TestIntegrationVRFV2` | Function | `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_test.go` | 1619 |
| `TestVRFV2PlusIntegration_Migration` | Function | `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_plus_test.go` | 1127 |
| `TestStartHeartbeats` | Function | `foundry/lib/chainlink/core/services/vrf/v2/bhs_feeder_test.go` | 20 |
| `FundVRFCoordinatorV2Subscription` | Function | `foundry/lib/chainlink/integration-tests/actions/vrf/vrfv2/contract_steps.go` | 339 |
| `SetupVRFOwnerContractIfNeeded` | Function | `foundry/lib/chainlink/integration-tests/actions/vrf/vrfv2/contract_steps.go` | 615 |
| `IncProcessedReqs` | Function | `foundry/lib/chainlink/core/services/vrf/vrfcommon/metrics.go` | 82 |
| `TestListener_Backoff` | Function | `foundry/lib/chainlink/core/services/vrf/v2/listener_v2_test.go` | 406 |
| `NewVRFV2PlusConsumer` | Function | `foundry/lib/chainlink/core/services/vrf/vrftesthelpers/consumer_v2.go` | 72 |
| `NewMaliciousConsumerPlus` | Function | `foundry/lib/chainlink/core/services/vrf/vrftesthelpers/consumer_v2.go` | 86 |
| `NewRevertingConsumerPlus` | Function | `foundry/lib/chainlink/core/services/vrf/vrftesthelpers/consumer_v2.go` | 100 |
| `NewUpgradeableConsumerPlus` | Function | `foundry/lib/chainlink/core/services/vrf/vrftesthelpers/consumer_v2.go` | 114 |
| `TestVRFV2Integration_SingleConsumer_NeedsTrustedBlockhashStore` | Function | `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_test.go` | 1344 |
| `TestVRFV2Integration_SingleConsumer_NeedsTrustedBlockhashStore_AfterDelay` | Function | `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_test.go` | 1364 |
| `TestVRFV2PlusIntegration_SingleConsumer_HappyPath_BatchFulfillment` | Function | `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_plus_test.go` | 313 |
| `TestVRFV2PlusIntegration_SingleConsumer_HappyPath_BatchFulfillment_BigGasCallback` | Function | `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_plus_test.go` | 366 |
| `TestVRFV2PlusIntegration_SingleConsumer_HappyPath` | Function | `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_plus_test.go` | 419 |
| `TestVRFV2PlusIntegration_SingleConsumer_EIP150_HappyPath` | Function | `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_plus_test.go` | 497 |
| `TestVRFV2PlusIntegration_SingleConsumer_EIP150_Revert` | Function | `foundry/lib/chainlink/core/services/vrf/v2/integration_v2_plus_test.go` | 512 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → ToInt` | cross_community | 7 |
| `Main → Secp256k1` | cross_community | 6 |
| `Main → ToInt` | cross_community | 6 |
| `ServicesForSpec → ToInt` | cross_community | 6 |
| `Run → ToInt` | cross_community | 6 |
| `Run → ToInt` | cross_community | 6 |
| `Run → ToInt` | cross_community | 6 |
| `Main → Secp256k1` | cross_community | 5 |
| `ServicesForSpec → Secp256k1` | cross_community | 5 |
| `Run → Secp256k1` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Txmgr | 34 calls |
| Logpoller | 32 calls |
| Web | 23 calls |
| Job | 18 calls |
| Pipeline | 17 calls |
| Mocks | 11 calls |
| V21 | 10 calls |
| Keeper | 8 calls |

## How to Explore

1. `gitnexus_context({name: "TestVRFV2Integration_SingleConsumer_Wrapper"})` — see callers and callees
2. `gitnexus_query({query: "v2"})` — find related execution flows
3. Read key files listed above for implementation details
