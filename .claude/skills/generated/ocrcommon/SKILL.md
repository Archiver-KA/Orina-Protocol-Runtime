---
name: ocrcommon
description: "Skill for the Ocrcommon area of ATP2. 90 symbols across 33 files."
---

# Ocrcommon

90 symbols | 33 files | Cohesion: 56%

## When to Use

- Working with code in `foundry/`
- Understanding how Test_DefaultTransmitter_CreateEthTransaction, Test_DefaultTransmitter_Forwarding_Enabled_CreateEthTransaction, Test_DefaultTransmitter_Forwarding_Enabled_CreateEthTransaction_Round_Robin_Error work
- Modifying ocrcommon-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/services/ocrcommon/telemetry.go` | getContract, getChainID, getJsonParsedValue, getObservation, getParsedValue (+14) |
| `foundry/lib/chainlink/core/services/ocrcommon/data_source.go` | executeRun, Observe, updater, updateCache, observe (+3) |
| `foundry/lib/chainlink/core/services/ocrcommon/adapters.go` | PublicKey, NewOCR3OnchainKeyringMultiChainAdapter, NewOCR3OnchainKeyringAdapter, MaxSignatureLength, Sign (+2) |
| `foundry/lib/chainlink/core/services/ocrcommon/transmitter_test.go` | newMockTxStrategy, Test_DefaultTransmitter_CreateEthTransaction, Test_DefaultTransmitter_Forwarding_Enabled_CreateEthTransaction, Test_DefaultTransmitter_Forwarding_Enabled_CreateEthTransaction_Round_Robin_Error, Test_DefaultTransmitter_Forwarding_Enabled_CreateEthTransaction_No_Keystore_Error |
| `foundry/lib/chainlink/core/services/ocrcommon/arbitrum_block_translator.go` | BinarySearch, reverseLookup, arbL2ToL1, NewArbitrumBlockTranslator, NumberToQueryRange |
| `foundry/lib/chainlink/core/services/ocrcommon/telemetry_test.go` | TestGetObservation, TestSendEATelemetry, TestCollectAndSend, TestGetPricesFromResults |
| `foundry/lib/chainlink/core/services/ocrcommon/arbitrum_block_translator_test.go` | TestArbitrumBlockTranslator_BinarySearch, generateDeterministicL2Blocks, TestArbitrumBlockTranslator_NumberToQueryRange |
| `foundry/lib/chainlink/core/services/ocrcommon/peer_wrapper.go` | Start, peerConfig, NewSingletonPeerWrapper |
| `foundry/lib/chainlink/core/services/ocrcommon/data_source_test.go` | Test_InMemoryDataSource, Test_CachedInMemoryDataSourceErrHandling, Test_InMemoryDataSourceWithProm |
| `foundry/lib/chainlink/core/services/ocrcommon/peer_wrapper_test.go` | Test_SingletonPeerWrapper_Start, Test_SingletonPeerWrapper_Close, ptr |

## Entry Points

Start here when exploring this area:

- **`Test_DefaultTransmitter_CreateEthTransaction`** (Function) — `foundry/lib/chainlink/core/services/ocrcommon/transmitter_test.go:23`
- **`Test_DefaultTransmitter_Forwarding_Enabled_CreateEthTransaction`** (Function) — `foundry/lib/chainlink/core/services/ocrcommon/transmitter_test.go:63`
- **`Test_DefaultTransmitter_Forwarding_Enabled_CreateEthTransaction_Round_Robin_Error`** (Function) — `foundry/lib/chainlink/core/services/ocrcommon/transmitter_test.go:114`
- **`Test_DefaultTransmitter_Forwarding_Enabled_CreateEthTransaction_No_Keystore_Error`** (Function) — `foundry/lib/chainlink/core/services/ocrcommon/transmitter_test.go:144`
- **`NewTransmitter`** (Function) — `foundry/lib/chainlink/core/services/ocrcommon/transmitter.go:40`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `Test_DefaultTransmitter_CreateEthTransaction` | Function | `foundry/lib/chainlink/core/services/ocrcommon/transmitter_test.go` | 23 |
| `Test_DefaultTransmitter_Forwarding_Enabled_CreateEthTransaction` | Function | `foundry/lib/chainlink/core/services/ocrcommon/transmitter_test.go` | 63 |
| `Test_DefaultTransmitter_Forwarding_Enabled_CreateEthTransaction_Round_Robin_Error` | Function | `foundry/lib/chainlink/core/services/ocrcommon/transmitter_test.go` | 114 |
| `Test_DefaultTransmitter_Forwarding_Enabled_CreateEthTransaction_No_Keystore_Error` | Function | `foundry/lib/chainlink/core/services/ocrcommon/transmitter_test.go` | 144 |
| `NewTransmitter` | Function | `foundry/lib/chainlink/core/services/ocrcommon/transmitter.go` | 40 |
| `TestORM_CreateEthTransaction` | Function | `foundry/lib/chainlink/core/services/fluxmonitorv2/orm_test.go` | 170 |
| `TestETHCallTask` | Function | `foundry/lib/chainlink/core/services/pipeline/task.eth_call_test.go` | 30 |
| `NewMockEvmTxManager` | Function | `foundry/lib/chainlink/core/chains/evm/txmgr/mocks/utils.go` | 15 |
| `TransferModal` | Function | `src/app/components/transfer-modal.tsx` | 21 |
| `ListForSaleModal` | Function | `src/app/components/list-for-sale-modal.tsx` | 27 |
| `TestGetObservation` | Function | `foundry/lib/chainlink/core/services/ocrcommon/telemetry_test.go` | 279 |
| `TestArbitrumBlockTranslator_BinarySearch` | Function | `foundry/lib/chainlink/core/services/ocrcommon/arbitrum_block_translator_test.go` | 22 |
| `ShouldCollectEnhancedTelemetryMercury` | Function | `foundry/lib/chainlink/core/services/ocrcommon/telemetry.go` | 445 |
| `MaybeEnqueueEnhancedTelem` | Function | `foundry/lib/chainlink/core/services/ocrcommon/telemetry.go` | 516 |
| `Test_DiscovererDatabase` | Function | `foundry/lib/chainlink/core/services/ocrcommon/discoverer_database_test.go` | 18 |
| `NewOCRDiscovererDatabase` | Function | `foundry/lib/chainlink/core/services/ocrcommon/discoverer_database.go` | 33 |
| `Test_InMemoryDataSource` | Function | `foundry/lib/chainlink/core/services/ocrcommon/data_source_test.go` | 35 |
| `Test_CachedInMemoryDataSourceErrHandling` | Function | `foundry/lib/chainlink/core/services/ocrcommon/data_source_test.go` | 54 |
| `Test_InMemoryDataSourceWithProm` | Function | `foundry/lib/chainlink/core/services/ocrcommon/data_source_test.go` | 146 |
| `NewInMemoryDataSource` | Function | `foundry/lib/chainlink/core/services/ocrcommon/data_source.go` | 96 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ServicesForSpec → ArbitrumBlockTranslator` | cross_community | 5 |
| `ServicesForSpec → L1BlockTranslator` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pipeline | 22 calls |
| Logpoller | 8 calls |
| Telemetry | 4 calls |
| V2 | 4 calls |
| Smoke | 4 calls |
| Job | 3 calls |
| Client | 3 calls |
| Keeper | 2 calls |

## How to Explore

1. `gitnexus_context({name: "Test_DefaultTransmitter_CreateEthTransaction"})` — see callers and callees
2. `gitnexus_query({query: "ocrcommon"})` — find related execution flows
3. Read key files listed above for implementation details
