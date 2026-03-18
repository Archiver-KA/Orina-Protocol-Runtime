---
name: s4
description: "Skill for the S4 area of ATP2. 97 symbols across 18 files."
---

# S4

97 symbols | 18 files | Cohesion: 57%

## When to Use

- Working with code in `foundry/`
- Understanding how NewFullAddressRange, Test_MarshalUnmarshalQuery, TestS4Integration_HappyDON work
- Modifying s4-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/services/ocr2/plugins/s4/plugin_test.go` | createPluginConfig, generateTestOrmRow, generateTestOrmRows, generateConfirmedTestOrmRows, generateTestRows (+9) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/s4/integration_test.go` | newDON, simulateOCR, checkNoErrors, checkNoUnconfirmedRows, TestS4Integration_HappyDON (+7) |
| `foundry/lib/chainlink/core/services/s4/postgres_orm_test.go` | setupORM, generateTestRows, TestPostgresORM_UpdateAndGet, TestPostgresORM_UpdateSimpleFlow, TestPostgresORM_DeleteExpired (+4) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/s4/plugin.go` | NewReportingPlugin, Observation, convertRow, convertRows, snapshotToVersionMap (+1) |
| `foundry/lib/chainlink/core/services/s4/cached_orm_wrapper_test.go` | TestGetSnapshotEmpty, TestGetSnapshotCacheFilled, TestUpdateInvalidatesSnapshotCache, TestGet, TestGetUnconfirmedRows (+1) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/s4/messages.go` | UnmarshalQuery, UnmarshalAddress, MarshalQuery, MarshalRows, UnmarshalRows (+1) |
| `foundry/lib/chainlink/core/services/s4/address_range.go` | NewFullAddressRange, NewInitialAddressRangeForIntervals, Advance, Interval, NewSingleAddressRange |
| `foundry/lib/chainlink/core/services/ocr2/plugins/s4/messages_test.go` | Test_MarshalUnmarshalQuery, Test_MarshalUnmarshalRows, marshalUnmarshal, signRow, Test_VerifySignature |
| `foundry/lib/chainlink/core/services/s4/storage_test.go` | TestStorage_Errors, TestStorage_PutAndGet, setupTestStorage, TestStorage_Constraints, TestStorage_List |
| `foundry/lib/chainlink/core/services/s4/in_memory_orm_test.go` | TestInMemoryORM_GetSnapshot, TestInMemoryORM, TestInMemoryORM_DeleteExpired, TestInMemoryORM_GetUnconfirmedRows |

## Entry Points

Start here when exploring this area:

- **`NewFullAddressRange`** (Function) — `foundry/lib/chainlink/core/services/s4/address_range.go:27`
- **`Test_MarshalUnmarshalQuery`** (Function) — `foundry/lib/chainlink/core/services/ocr2/plugins/s4/messages_test.go:34`
- **`TestS4Integration_HappyDON`** (Function) — `foundry/lib/chainlink/core/services/ocr2/plugins/s4/integration_test.go:155`
- **`TestS4Integration_HappyDON_4X`** (Function) — `foundry/lib/chainlink/core/services/ocr2/plugins/s4/integration_test.go:181`
- **`TestS4Integration_WrongSignature`** (Function) — `foundry/lib/chainlink/core/services/ocr2/plugins/s4/integration_test.go:210`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `NewFullAddressRange` | Function | `foundry/lib/chainlink/core/services/s4/address_range.go` | 27 |
| `Test_MarshalUnmarshalQuery` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/s4/messages_test.go` | 34 |
| `TestS4Integration_HappyDON` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/s4/integration_test.go` | 155 |
| `TestS4Integration_HappyDON_4X` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/s4/integration_test.go` | 181 |
| `TestS4Integration_WrongSignature` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/s4/integration_test.go` | 210 |
| `TestS4Integration_MaxObservations` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/s4/integration_test.go` | 245 |
| `TestS4Integration_Expired` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/s4/integration_test.go` | 272 |
| `TestS4Integration_NSnapshotShards` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/s4/integration_test.go` | 297 |
| `TestS4Integration_OneNodeOutOfSync` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/s4/integration_test.go` | 325 |
| `TestS4Integration_RandomState` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/s4/integration_test.go` | 352 |
| `TestPostgresORM_UpdateAndGet` | Function | `foundry/lib/chainlink/core/services/s4/postgres_orm_test.go` | 57 |
| `TestPostgresORM_UpdateSimpleFlow` | Function | `foundry/lib/chainlink/core/services/s4/postgres_orm_test.go` | 89 |
| `TestPostgresORM_DeleteExpired` | Function | `foundry/lib/chainlink/core/services/s4/postgres_orm_test.go` | 117 |
| `TestPostgresORM_GetSnapshot` | Function | `foundry/lib/chainlink/core/services/s4/postgres_orm_test.go` | 146 |
| `TestPostgresORM_GetUnconfirmedRows` | Function | `foundry/lib/chainlink/core/services/s4/postgres_orm_test.go` | 202 |
| `TestPostgresORM_Namespace` | Function | `foundry/lib/chainlink/core/services/s4/postgres_orm_test.go` | 234 |
| `TestPostgresORM_BigIntVersion` | Function | `foundry/lib/chainlink/core/services/s4/postgres_orm_test.go` | 268 |
| `TestInMemoryORM_GetSnapshot` | Function | `foundry/lib/chainlink/core/services/s4/in_memory_orm_test.go` | 134 |
| `TestPlugin_NewReportingPlugin` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/s4/plugin_test.go` | 121 |
| `TestPlugin_Close` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/s4/plugin_test.go` | 167 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Logpoller | 33 calls |
| Pipeline | 13 calls |
| Functions | 8 calls |
| Ocr2 | 7 calls |
| Resolver | 5 calls |
| Cltest | 4 calls |
| Promwrapper | 4 calls |
| Client | 2 calls |

## How to Explore

1. `gitnexus_context({name: "NewFullAddressRange"})` — see callers and callees
2. `gitnexus_query({query: "s4"})` — find related execution flows
3. Read key files listed above for implementation details
