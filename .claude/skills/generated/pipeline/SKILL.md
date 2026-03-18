---
name: pipeline
description: "Skill for the Pipeline area of ATP2. 95 symbols across 40 files."
---

# Pipeline

95 symbols | 40 files | Cohesion: 37%

## When to Use

- Working with code in `foundry/`
- Understanding how TestShell_CleanupChainTables, TestRegistry, TestRegistry_NoDuplicateIDs work
- Modifying pipeline-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/services/pipeline/runner_test.go` | newRunner, Test_PipelineRunner_ExecuteTaskRuns, Test_PipelineRunner_ExecuteTaskRunsWithVars, Test_PipelineRunner_CBORParse, Test_PipelineRunner_HandleFaults (+11) |
| `foundry/lib/chainlink/core/services/pipeline/task.bridge_test.go` | mustReadFile, TestBridgeTask_ErrorMessage, TestBridgeTask_OnlyErrorMessage, TestBridgeTask_Headers, fakeIntermittentlyFailingPriceResponder (+9) |
| `foundry/lib/chainlink/core/services/pipeline/orm_test.go` | newTestORM, Test_Prune, setupLiteORM, Test_PipelineORM_FindRun, TestInsertFinishedRuns (+9) |
| `foundry/lib/chainlink/core/services/pipeline/task.http_test.go` | TestHTTPTask_ErrorMessage, TestHTTPTask_OnlyErrorMessage, TestHTTPTask_Headers, TestHTTPTask_Happy |
| `foundry/lib/chainlink/core/services/pipeline/common_eth.go` | convertToETHABIType, convertToETHABITuple, convertToETHABIBytes, convertToETHABIInteger |
| `foundry/lib/chainlink/core/capabilities/registry_test.go` | TestRegistry, TestRegistry_NoDuplicateIDs |
| `foundry/lib/chainlink/core/logger/test_logger.go` | TestLogger, TestLoggerObserved |
| `foundry/lib/chainlink/core/web/loop_registry_internal_test.go` | Header, WriteHeader |
| `foundry/lib/chainlink/core/internal/cltest/mocks.go` | NewHTTPMockServer, NewHTTPMockServerWithRequest |
| `foundry/lib/chainlink/core/services/blockhashstore/delegate_test.go` | createTestDelegate, TestDelegate_ServicesForSpec |

## Entry Points

Start here when exploring this area:

- **`TestShell_CleanupChainTables`** (Function) — `foundry/lib/chainlink/core/cmd/shell_local_test.go:496`
- **`TestRegistry`** (Function) — `foundry/lib/chainlink/core/capabilities/registry_test.go:34`
- **`TestRegistry_NoDuplicateIDs`** (Function) — `foundry/lib/chainlink/core/capabilities/registry_test.go:62`
- **`TestLogger`** (Function) — `foundry/lib/chainlink/core/logger/test_logger.go:16`
- **`Test_Delegate`** (Function) — `foundry/lib/chainlink/core/services/streams/delegate_test.go:28`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TestShell_CleanupChainTables` | Function | `foundry/lib/chainlink/core/cmd/shell_local_test.go` | 496 |
| `TestRegistry` | Function | `foundry/lib/chainlink/core/capabilities/registry_test.go` | 34 |
| `TestRegistry_NoDuplicateIDs` | Function | `foundry/lib/chainlink/core/capabilities/registry_test.go` | 62 |
| `TestLogger` | Function | `foundry/lib/chainlink/core/logger/test_logger.go` | 16 |
| `Test_Delegate` | Function | `foundry/lib/chainlink/core/services/streams/delegate_test.go` | 28 |
| `Test_DB_ReadWriteConfig` | Function | `foundry/lib/chainlink/core/services/ocrbootstrap/database_test.go` | 37 |
| `NewTestDB` | Function | `foundry/lib/chainlink/core/services/ocr/helpers_internal_test.go` | 13 |
| `Test_Keyring` | Function | `foundry/lib/chainlink/core/services/llo/keyring_test.go` | 53 |
| `TestMultiplyTask_Happy` | Function | `foundry/lib/chainlink/core/services/pipeline/task.multiply_test.go` | 22 |
| `Test_PipelineRunner_ExecuteTaskRuns` | Function | `foundry/lib/chainlink/core/services/pipeline/runner_test.go` | 52 |
| `Test_PipelineRunner_ExecuteTaskRunsWithVars` | Function | `foundry/lib/chainlink/core/services/pipeline/runner_test.go` | 175 |
| `Test_PipelineRunner_CBORParse` | Function | `foundry/lib/chainlink/core/services/pipeline/runner_test.go` | 347 |
| `Test_PipelineRunner_HandleFaults` | Function | `foundry/lib/chainlink/core/services/pipeline/runner_test.go` | 410 |
| `Test_PipelineRunner_MultipleOutputs` | Function | `foundry/lib/chainlink/core/services/pipeline/runner_test.go` | 540 |
| `Test_PipelineRunner_MultipleTerminatingOutputs` | Function | `foundry/lib/chainlink/core/services/pipeline/runner_test.go` | 569 |
| `Test_PipelineRunner_AsyncJob_Basic` | Function | `foundry/lib/chainlink/core/services/pipeline/runner_test.go` | 592 |
| `Test_PipelineRunner_AsyncJob_InstantRestart` | Function | `foundry/lib/chainlink/core/services/pipeline/runner_test.go` | 723 |
| `Test_PipelineRunner_LowercaseOutputs` | Function | `foundry/lib/chainlink/core/services/pipeline/runner_test.go` | 842 |
| `Test_PipelineRunner_UppercaseOutputs` | Function | `foundry/lib/chainlink/core/services/pipeline/runner_test.go` | 866 |
| `Test_PipelineRunner_HexDecodeOutputs` | Function | `foundry/lib/chainlink/core/services/pipeline/runner_test.go` | 889 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Run → ToInt` | cross_community | 6 |
| `Run → ToInt` | cross_community | 6 |
| `Run → ToInt` | cross_community | 6 |
| `Run → Secp256k1` | cross_community | 5 |
| `Run → Secp256k1` | cross_community | 5 |
| `NewAuthenticatingShell → Sugared` | cross_community | 5 |
| `NewAuthenticatingShell → Helper` | cross_community | 5 |
| `NewAuthenticatingShell → CopyFields` | cross_community | 5 |
| `NewAuthenticatingShell → Short` | cross_community | 5 |
| `ExportVRFKey → PublicKey` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Logpoller | 12 calls |
| Automationv2 | 10 calls |
| Job | 10 calls |
| V2 | 5 calls |
| Mocks | 5 calls |
| V21 | 4 calls |
| Solidity_cross_tests | 3 calls |
| Proof | 2 calls |

## How to Explore

1. `gitnexus_context({name: "TestShell_CleanupChainTables"})` — see callers and callees
2. `gitnexus_query({query: "pipeline"})` — find related execution flows
3. Read key files listed above for implementation details
