---
name: mercury
description: "Skill for the Mercury area of ATP2. 91 symbols across 25 files."
---

# Mercury

91 symbols | 25 files | Cohesion: 61%

## When to Use

- Working with code in `foundry/`
- Understanding how TestORM, TestORM_InsertTransmitRequest_MultipleServerURLs, TestORM_PruneTransmitRequests work
- Modifying mercury-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/services/relay/evm/mercury/queue.go` | Name, HealthReport, Push, IsEmpty, status (+4) |
| `foundry/lib/chainlink/core/services/relay/evm/mercury/orm.go` | InsertTransmitRequest, GetTransmitRequests, LatestReport, DeleteTransmitRequests, hashPayload (+2) |
| `foundry/lib/chainlink/core/services/relay/evm/mercury/config_digest_test.go` | TestConfigCalculationMatches, GenHash, GenAddress, GenClientPubKey, GenHashArray (+2) |
| `foundry/lib/chainlink/core/services/relay/evm/mercury/transmitter_test.go` | Test_MercuryTransmitter_Transmit, Test_MercuryTransmitter_LatestTimestamp, Test_MercuryTransmitter_LatestPrice, Test_MercuryTransmitter_FetchInitialMaxFinalizedBlockNumber, newMockQ (+2) |
| `foundry/lib/chainlink/core/services/relay/evm/mercury/transmitter.go` | sendToTrigger, Transmit, NewTransmitter, runDeleteQueueLoop, runQueueLoop (+1) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/mercury/helpers_test.go` | randomFeedID, addBootstrapJob, AddJob, addV1MercuryJob, addV2MercuryJob (+1) |
| `foundry/lib/chainlink/core/services/relay/evm/mercury/persistence_manager.go` | Insert, Delete, runFlushDeletesLoop, addToDeleteQueue, Start (+1) |
| `foundry/lib/chainlink/core/services/relay/evm/mercury/orm_test.go` | TestORM, TestORM_InsertTransmitRequest_MultipleServerURLs, TestORM_PruneTransmitRequests, TestORM_InsertTransmitRequest_LatestReport, Test_ReportCodec_FeedIDFromReport |
| `foundry/lib/chainlink/core/services/ocr2/plugins/mercury/integration_test.go` | detectPanicLogs, setupBlockchain, integration_MercuryV1, integration_MercuryV2, integration_MercuryV3 |
| `foundry/lib/chainlink/core/services/ocr2/plugins/mercury/plugin.go` | NewServices, newv3factory, newv2factory, newv1factory, initLoop |

## Entry Points

Start here when exploring this area:

- **`TestORM`** (Function) — `foundry/lib/chainlink/core/services/relay/evm/mercury/orm_test.go:21`
- **`TestORM_InsertTransmitRequest_MultipleServerURLs`** (Function) — `foundry/lib/chainlink/core/services/relay/evm/mercury/orm_test.go:152`
- **`TestORM_PruneTransmitRequests`** (Function) — `foundry/lib/chainlink/core/services/relay/evm/mercury/orm_test.go:197`
- **`TestORM_InsertTransmitRequest_LatestReport`** (Function) — `foundry/lib/chainlink/core/services/relay/evm/mercury/orm_test.go:290`
- **`TestNewServices`** (Function) — `foundry/lib/chainlink/core/services/ocr2/plugins/mercury/plugin_test.go:87`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TestORM` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/orm_test.go` | 21 |
| `TestORM_InsertTransmitRequest_MultipleServerURLs` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/orm_test.go` | 152 |
| `TestORM_PruneTransmitRequests` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/orm_test.go` | 197 |
| `TestORM_InsertTransmitRequest_LatestReport` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/orm_test.go` | 290 |
| `TestNewServices` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/mercury/plugin_test.go` | 87 |
| `NewServices` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/mercury/plugin.go` | 63 |
| `NewDataSource` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/v1/data_source.go` | 79 |
| `TestPacker_DecodeStreamsLookupRequest` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2keeper/evmregistry/v21/mercury/mercury_test.go` | 65 |
| `TestPersistenceManager` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/persistence_manager_test.go` | 28 |
| `TestPersistenceManagerAsyncDelete` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/persistence_manager_test.go` | 70 |
| `TestPersistenceManagerPrune` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/persistence_manager_test.go` | 115 |
| `TestConfigCalculationMatches` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/config_digest_test.go` | 25 |
| `GenHash` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/config_digest_test.go` | 99 |
| `GenAddress` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/config_digest_test.go` | 138 |
| `GenClientPubKey` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/config_digest_test.go` | 161 |
| `Test_MercuryTransmitter_Transmit` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/transmitter_test.go` | 38 |
| `Test_MercuryTransmitter_LatestTimestamp` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/transmitter_test.go` | 132 |
| `Test_MercuryTransmitter_LatestPrice` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/transmitter_test.go` | 238 |
| `Test_MercuryTransmitter_FetchInitialMaxFinalizedBlockNumber` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/transmitter_test.go` | 314 |
| `NewTransmitter` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/transmitter.go` | 303 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `CreateJob → Transmission` | cross_community | 6 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pipeline | 12 calls |
| Logpoller | 10 calls |
| Client | 8 calls |
| Ocr2keeper | 6 calls |
| Keeper | 5 calls |
| Mocks | 5 calls |
| Smoke | 5 calls |
| Rollups | 4 calls |

## How to Explore

1. `gitnexus_context({name: "TestORM"})` — see callers and callees
2. `gitnexus_query({query: "mercury"})` — find related execution flows
3. Read key files listed above for implementation details
