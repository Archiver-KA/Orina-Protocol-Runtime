---
name: mocks
description: "Skill for the Mocks area of ATP2. 146 symbols across 117 files."
---

# Mocks

146 symbols | 117 files | Cohesion: 43%

## When to Use

- Working with code in `foundry/`
- Understanding how TestTransfersController_TransferZeroAddressError, NewMockLogger, NewBasicAdminUsersORM work
- Modifying mocks-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/services/vrf/mocks/vrf_coordinator_v2.go` | NewVRFCoordinatorV2Interface, DeregisterProvingKey, FulfillRandomWords, Owner, OwnerCancelSubscription (+6) |
| `foundry/lib/chainlink/core/services/ocr2/plugins/ocr2vrf/coordinator/mocks/vrf_coordinator.go` | CreateSubscription, FilterSubscriptionCreated, SetCallbackConfig, SetProducer |
| `foundry/lib/chainlink/core/services/keystore/mocks/dkg_sign.go` | NewDKGSign, EnsureKey, Get |
| `foundry/lib/chainlink/core/services/keystore/mocks/dkg_encrypt.go` | NewDKGEncrypt, EnsureKey, Get |
| `foundry/lib/chainlink/core/services/keystore/mocks/master.go` | NewMaster, OCR2, P2P |
| `foundry/lib/chainlink/core/services/keystore/mocks/ocr2.go` | Create, EnsureKeys, Get |
| `foundry/lib/chainlink/core/scripts/common/helpers.go` | explorerLinkPrefix, ContractExplorerLink, ConfirmCodeAt |
| `foundry/lib/chainlink/integration-tests/docker/test_env/test_env.go` | Cleanup, handleNodeCoverageReports |
| `foundry/lib/chainlink/core/services/keystore/mocks/cosmos.go` | NewCosmos, Get |
| `foundry/lib/chainlink/core/services/vrf/vrftesthelpers/consumer_v2.go` | SRequestId, SRandomWords |

## Entry Points

Start here when exploring this area:

- **`TestTransfersController_TransferZeroAddressError`** (Function) — `foundry/lib/chainlink/core/web/evm_transfer_controller_test.go:163`
- **`NewMockLogger`** (Function) — `foundry/lib/chainlink/core/logger/logger_mock_test.go:308`
- **`NewBasicAdminUsersORM`** (Function) — `foundry/lib/chainlink/core/sessions/mocks/basic_admin_users_orm.go:94`
- **`NewChecker`** (Function) — `foundry/lib/chainlink/core/services/mocks/checker.go:148`
- **`NewTestORM`** (Function) — `foundry/lib/chainlink/core/services/job/orm_test.go:21`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TestTransfersController_TransferZeroAddressError` | Function | `foundry/lib/chainlink/core/web/evm_transfer_controller_test.go` | 163 |
| `NewMockLogger` | Function | `foundry/lib/chainlink/core/logger/logger_mock_test.go` | 308 |
| `NewBasicAdminUsersORM` | Function | `foundry/lib/chainlink/core/sessions/mocks/basic_admin_users_orm.go` | 94 |
| `NewChecker` | Function | `foundry/lib/chainlink/core/services/mocks/checker.go` | 148 |
| `NewTestORM` | Function | `foundry/lib/chainlink/core/services/job/orm_test.go` | 21 |
| `Context` | Function | `foundry/lib/chainlink/core/internal/testutils/testutils.go` | 126 |
| `NewPrometheusBackend` | Function | `foundry/lib/chainlink/core/internal/mocks/prometheus_backend.go` | 42 |
| `NewFluxAggregator` | Function | `foundry/lib/chainlink/core/internal/mocks/flux_aggregator.go` | 2368 |
| `NewFlags` | Function | `foundry/lib/chainlink/core/internal/mocks/flags.go` | 1360 |
| `NewApplication` | Function | `foundry/lib/chainlink/core/internal/mocks/application.go` | 730 |
| `NewTelemetryIngressEndpoint` | Function | `foundry/lib/chainlink/core/config/mocks/telemetry_ingress_endpoint.go` | 91 |
| `NewTelemetryIngress` | Function | `foundry/lib/chainlink/core/config/mocks/telemetry_ingress.go` | 164 |
| `NewSimulatedBackend` | Function | `foundry/lib/chainlink/core/internal/cltest/simulated_backend.go` | 19 |
| `NewPrompter` | Function | `foundry/lib/chainlink/core/cmd/mocks/prompter.go` | 67 |
| `NewORM` | Function | `foundry/lib/chainlink/core/bridges/mocks/orm.go` | 372 |
| `NewLogger` | Function | `foundry/lib/chainlink/core/logger/mocks/logger.go` | 310 |
| `NewVRFCoordinatorV2Interface` | Function | `foundry/lib/chainlink/core/services/vrf/mocks/vrf_coordinator_v2.go` | 2502 |
| `NewConfig` | Function | `foundry/lib/chainlink/core/services/vrf/mocks/config.go` | 49 |
| `NewTelemClient` | Function | `foundry/lib/chainlink/core/services/synchronization/mocks/telem_client.go` | 78 |
| `NewHTTPClient` | Function | `foundry/lib/chainlink/core/services/webhook/mocks/http_client.go` | 47 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → LoadersKey` | cross_community | 8 |
| `Main → EthTransactionAttemptResolver` | cross_community | 8 |
| `Main → ToInt` | cross_community | 7 |
| `Main → FromInt64` | cross_community | 6 |
| `Main → Secp256k1` | cross_community | 6 |
| `SetupLogPollerTestDocker → ChainlinkClientToChainlinkNodeWithKeysAndAddress` | cross_community | 6 |
| `NewBaseHandler → ExportedEVMKey` | cross_community | 6 |
| `NewBaseHandler → R` | cross_community | 6 |
| `NewEthMocksWithTransactionsOnBlocksAssertions → ChainlinkClientToChainlinkNodeWithKeysAndAddress` | cross_community | 6 |
| `NewEthMocksWithTransactionsOnBlocksAssertions → NodeAPIs` | cross_community | 6 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pipeline | 7 calls |
| Logpoller | 6 calls |
| Txmgr | 5 calls |
| Solidity_cross_tests | 5 calls |
| V2 | 5 calls |
| Ocr2vrf | 4 calls |
| V2scripts | 4 calls |
| Contracts | 4 calls |

## How to Explore

1. `gitnexus_context({name: "TestTransfersController_TransferZeroAddressError"})` — see callers and callees
2. `gitnexus_query({query: "mocks"})` — find related execution flows
3. Read key files listed above for implementation details
