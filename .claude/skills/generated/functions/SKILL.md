---
name: functions
description: "Skill for the Functions area of ATP2. 150 symbols across 44 files."
---

# Functions

150 symbols | 44 files | Cohesion: 64%

## When to Use

- Working with code in `foundry/`
- Understanding how TestFunctionsConnectorHandler, NewStorage, NewThresholdService work
- Modifying functions-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/services/ocr2/plugins/functions/reporting_test.go` | newRequest, newRequestWithResult, newRequestFinalized, newRequestTimedOut, newRequestConfirmed (+17) |
| `foundry/lib/chainlink/core/services/functions/orm_test.go` | setupORM, newRequestID, createRequestWithTimestamp, TestORM_CreateRequestsAndFindByID, TestORM_StateTransitions (+10) |
| `foundry/lib/chainlink/core/services/functions/listener_test.go` | NewFunctionsListenerUniverse, TestFunctionsListener_HandleOffchainRequest_Success, TestFunctionsListener_HandleOffchainRequest_Invalid, TestFunctionsListener_HandleOffchainRequest_InternalError, TestFunctionsListener_ORMDoesNotFreezeHandlersForever (+6) |
| `foundry/lib/chainlink/core/services/relay/evm/functions/logpoller_wrapper_test.go` | newSubscriber, addr, setUp, TestLogPollerWrapper_SingleSubscriberEmptyEvents, TestLogPollerWrapper_ErrorOnZeroAddresses (+6) |
| `foundry/lib/chainlink/core/services/gateway/handlers/functions/handler.functions_test.go` | newFunctionsHandlerForATestDON, TestFunctionsHandler_Minimal, TestFunctionsHandler_CleanStartAndClose, newSignedMessage, TestFunctionsHandler_HandleUserMessage_InvalidMethod (+4) |
| `foundry/lib/chainlink/core/services/relay/evm/functions/logpoller_wrapper.go` | LatestEvents, filterPreviouslyDetectedEvents, checkForRouteUpdates, handleRouteUpdate, filterPrefix (+2) |
| `foundry/lib/chainlink/core/services/functions/listener.go` | formatRequestId, setError, handleOracleRequestV1, parseCBOR, handleRequest (+1) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/functions/reporting.go` | ShouldIncludeCoordinator, Query, Report, formatRequestId, Observation (+1) |
| `foundry/lib/chainlink/integration-tests/contracts/ethereum_contracts_seth.go` | LoadFunctionsCoordinator, LoadFunctionsRouter, DeployFunctionsLoadTestClient, LoadFunctionsLoadTestClient |
| `foundry/lib/chainlink/integration-tests/load/functions/gateway_gun.go` | NewGatewaySecretsSetGun, callSecretsList, Call, callSecretsSet |

## Entry Points

Start here when exploring this area:

- **`TestFunctionsConnectorHandler`** (Function) — `foundry/lib/chainlink/core/services/functions/connector_handler_test.go:62`
- **`NewStorage`** (Function) — `foundry/lib/chainlink/core/services/s4/mocks/storage.go:126`
- **`NewThresholdService`** (Function) — `foundry/lib/chainlink/core/services/ocr2/plugins/threshold/plugin.go:23`
- **`TestNewConnector_Success`** (Function) — `foundry/lib/chainlink/core/services/ocr2/plugins/functions/plugin_test.go:24`
- **`TestNewConnector_NoKeyForConfiguredAddress`** (Function) — `foundry/lib/chainlink/core/services/ocr2/plugins/functions/plugin_test.go:53`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TestFunctionsConnectorHandler` | Function | `foundry/lib/chainlink/core/services/functions/connector_handler_test.go` | 62 |
| `NewStorage` | Function | `foundry/lib/chainlink/core/services/s4/mocks/storage.go` | 126 |
| `NewThresholdService` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/threshold/plugin.go` | 23 |
| `TestNewConnector_Success` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/functions/plugin_test.go` | 24 |
| `TestNewConnector_NoKeyForConfiguredAddress` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/functions/plugin_test.go` | 53 |
| `NewFunctionsServices` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/functions/plugin.go` | 62 |
| `NewConnector` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/functions/plugin.go` | 203 |
| `NewDON` | Function | `foundry/lib/chainlink/core/services/gateway/handlers/mocks/don.go` | 37 |
| `TestRateLimiter_Simple` | Function | `foundry/lib/chainlink/core/services/gateway/handlers/common/ratelimiter_test.go` | 10 |
| `NewRateLimiter` | Function | `foundry/lib/chainlink/core/services/gateway/handlers/common/ratelimiter.go` | 24 |
| `NewOnchainAllowlist` | Function | `foundry/lib/chainlink/core/services/gateway/handlers/functions/allowlist/mocks/onchain_allowlist.go` | 91 |
| `NewOnchainSubscriptions` | Function | `foundry/lib/chainlink/core/services/gateway/handlers/functions/subscriptions/mocks/onchain_subscriptions.go` | 86 |
| `TestPlugin_ShouldTransmitAcceptedReport` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/s4/plugin_test.go` | 180 |
| `TestFunctionsReporting_Observation` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/functions/reporting_test.go` | 169 |
| `TestFunctionsReporting_ShouldAcceptFinalizedReport` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/functions/reporting_test.go` | 434 |
| `TestFunctionsReporting_ShouldAcceptFinalizedReport_OffchainTransmission` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/functions/reporting_test.go` | 473 |
| `TestFunctionsReporting_ShouldTransmitAcceptedReport` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/functions/reporting_test.go` | 488 |
| `TestFunctionsReporting_Report` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/functions/reporting_test.go` | 231 |
| `TestFunctionsReporting_Report_WithGasLimitAndMetadata` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/functions/reporting_test.go` | 268 |
| `TestFunctionsReporting_Report_HandleCoordinatorMismatch` | Function | `foundry/lib/chainlink/core/services/ocr2/plugins/functions/reporting_test.go` | 309 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Client | 17 calls |
| Pipeline | 15 calls |
| Logpoller | 15 calls |
| S4 | 14 calls |
| Mocks | 8 calls |
| Keeper | 8 calls |
| Smoke | 7 calls |
| Cluster_1279 | 4 calls |

## How to Explore

1. `gitnexus_context({name: "TestFunctionsConnectorHandler"})` — see callers and callees
2. `gitnexus_query({query: "functions"})` — find related execution flows
3. Read key files listed above for implementation details
