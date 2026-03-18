---
name: logprovider
description: "Skill for the Logprovider area of ATP2. 132 symbols across 26 files."
---

# Logprovider

132 symbols | 26 files | Cohesion: 62%

## When to Use

- Working with code in `foundry/`
- Understanding how TestLogRecoverer_GetRecoverables, NewLogRecoverer, NewLogEventsPacker work
- Modifying logprovider-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/recoverer.go` | NewLogRecoverer, GetRecoveryProposals, recover, getRecoveryWindow, getFilterBatch (+14) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/integration_test.go` | TestIntegration_LogEventProvider, TestIntegration_LogEventProvider_UpdateConfig, TestIntegration_LogEventProvider_Backfill, TestIntegration_LogRecoverer_Backfill, waitLogProvider (+9) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/provider.go` | ReadLogs, CurrentPartitionIdx, scheduleReadJobs, updateFiltersLastPoll, getFilters (+9) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/buffer_v1_test.go` | TestLogEventBufferV1, TestLogEventBufferV1_EnqueueViolations, TestLogEventBufferV1_Dequeue, TestLogEventBufferV1_Enqueue, TestLogEventBufferV1_UpkeepQueue_sizeOfRange (+5) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/buffer_v1.go` | Enqueue, trackBlockNumbersForUpkeep, getUpkeepQueue, newUpkeepLogQueue, dequeue (+5) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/recoverer_test.go` | TestLogRecoverer_GetRecoverables, TestLogRecoverer_Clean, TestLogRecoverer_Recover, TestLogRecoverer_SelectFilterBatch, TestLogRecoverer_getFilterBatch (+4) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/buffer.go` | latestBlockSeen, bufferSize, enqueue, peek, blockRangeToIndices (+4) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/provider_life_cycle.go` | validateLogTriggerConfig, RefreshActiveUpkeeps, UnregisterFilter, filterName, RegisterFilter (+2) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/filter_store.go` | NewUpkeepFilterStore, GetFilters, AddActiveUpkeeps, UpdateFilters, RemoveActiveUpkeeps (+1) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/factory.go` | New, NewOptions, Defaults, defaultBlockRate, defaultLogLimit |

## Entry Points

Start here when exploring this area:

- **`TestLogRecoverer_GetRecoverables`** (Function) — `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/recoverer_test.go:32`
- **`NewLogRecoverer`** (Function) — `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/recoverer.go:96`
- **`NewLogEventsPacker`** (Function) — `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/log_packer.go:20`
- **`TestIntegration_LogEventProvider`** (Function) — `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/integration_test.go:34`
- **`TestIntegration_LogEventProvider_UpdateConfig`** (Function) — `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/integration_test.go:146`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TestLogRecoverer_GetRecoverables` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/recoverer_test.go` | 32 |
| `NewLogRecoverer` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/recoverer.go` | 96 |
| `NewLogEventsPacker` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/log_packer.go` | 20 |
| `TestIntegration_LogEventProvider` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/integration_test.go` | 34 |
| `TestIntegration_LogEventProvider_UpdateConfig` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/integration_test.go` | 146 |
| `TestIntegration_LogEventProvider_Backfill` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/integration_test.go` | 220 |
| `TestIntegration_LogRecoverer_Backfill` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/integration_test.go` | 295 |
| `New` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/factory.go` | 14 |
| `TestLogEventProvider_GetFilters` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/provider_test.go` | 22 |
| `TestLogEventProvider_UpdateEntriesLastPoll` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/provider_test.go` | 64 |
| `TestLogEventProvider_ScheduleReadJobs` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/provider_test.go` | 108 |
| `TestLogEventProvider_ReadLogs` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/provider_test.go` | 238 |
| `TestLogEventProvider_LifeCycle` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/provider_life_cycle_test.go` | 21 |
| `TestEventLogProvider_RefreshActiveUpkeeps` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/provider_life_cycle_test.go` | 145 |
| `TestLogEventProvider_ValidateLogTriggerConfig` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/provider_life_cycle_test.go` | 188 |
| `NewUpkeepFilterStore` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/filter_store.go` | 27 |
| `NewOptions` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/factory.go` | 54 |
| `TestLogRecoverer_Clean` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/recoverer_test.go` | 102 |
| `TestLogRecoverer_Recover` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/recoverer_test.go` | 215 |
| `TestLogRecoverer_SelectFilterBatch` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/logprovider/recoverer_test.go` | 458 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pipeline | 25 calls |
| Logpoller | 9 calls |
| Smoke | 8 calls |
| V21 | 7 calls |
| Client | 4 calls |
| Blockhashstore | 3 calls |
| Cltest | 2 calls |
| Autotelemetry21 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "TestLogRecoverer_GetRecoverables"})` — see callers and callees
2. `gitnexus_query({query: "logprovider"})` — find related execution flows
3. Read key files listed above for implementation details
