---
name: web
description: "Skill for the Web area of ATP2. 384 symbols across 137 files."
---

# Web

384 symbols | 137 files | Cohesion: 60%

## When to Use

- Working with code in `foundry/`
- Understanding how ValidateBridgeType, ParseBridgeName, ToInt64 work
- Modifying web-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/web/resolver/mutation.go` | CreateCSAKey, CreateFeedsManagerChainConfig, DeleteFeedsManagerChainConfig, UpdateFeedsManagerChainConfig, CreateFeedsManager (+14) |
| `foundry/lib/chainlink/core/web/eth_keys_controller_test.go` | TestETHKeysController_Index_Success, TestETHKeysController_Index_Errors, TestETHKeysController_Index_Disabled, TestETHKeysController_Index_NotDev, TestETHKeysController_CreateSuccess (+13) |
| `foundry/lib/chainlink/core/web/router.go` | v2Routes, NewRouter, rateLimiter, sessionRoutes, healthRoutes (+12) |
| `foundry/lib/chainlink/core/web/eth_keys_controller.go` | Import, Export, createETHKeyResource, formatETHKeyResponse, setEthBalance (+8) |
| `foundry/lib/chainlink/core/web/jobs_controller_test.go` | mustInt32FromString, TestJobsController_Create_WebhookSpec, TestJobsController_Show_InvalidID, TestJobsController_Show_NonExistentID, setupJobSpecsControllerTestsWithJobs (+8) |
| `foundry/lib/chainlink/core/web/bridge_types_controller.go` | ValidateBridgeType, Create, Show, Update, Destroy (+2) |
| `foundry/lib/chainlink/core/web/pipeline_runs_controller_test.go` | TestPipelineRunsController_Index_GlobalHappyPath, TestPipelineRunsController_CreateWithBody_HappyPath, TestPipelineRunsController_CreateNoBody_HappyPath, TestPipelineRunsController_Index_HappyPath, TestPipelineRunsController_Index_Pagination (+2) |
| `foundry/lib/chainlink/core/web/external_initiators_controller_test.go` | TestExternalInitiatorsController_Create_success, TestExternalInitiatorsController_Create_without_URL, TestExternalInitiatorsController_Create_invalid, TestExternalInitiatorsController_Delete, TestExternalInitiatorsController_DeleteNotFound (+2) |
| `foundry/lib/chainlink/core/web/user_controller.go` | Index, UpdateRole, Delete, UpdatePassword, updateUserPassword (+2) |
| `foundry/lib/chainlink/core/web/health_controller.go` | Health, writeTextTo, newCheckTree, WriteHTMLTo, writeHTMLTo (+2) |

## Entry Points

Start here when exploring this area:

- **`ValidateBridgeType`** (Function) — `foundry/lib/chainlink/core/web/bridge_types_controller.go:36`
- **`ParseBridgeName`** (Function) — `foundry/lib/chainlink/core/bridges/bridge_type.go:148`
- **`ToInt64`** (Function) — `foundry/lib/chainlink/core/utils/stringutils/string_utils.go:5`
- **`NewCreateVRFKeyPayloadResolver`** (Function) — `foundry/lib/chainlink/core/web/resolver/vrf.go:113`
- **`NewCreateP2PKeyPayload`** (Function) — `foundry/lib/chainlink/core/web/resolver/p2p.go:66`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ValidateBridgeType` | Function | `foundry/lib/chainlink/core/web/bridge_types_controller.go` | 36 |
| `ParseBridgeName` | Function | `foundry/lib/chainlink/core/bridges/bridge_type.go` | 148 |
| `ToInt64` | Function | `foundry/lib/chainlink/core/utils/stringutils/string_utils.go` | 5 |
| `NewCreateVRFKeyPayloadResolver` | Function | `foundry/lib/chainlink/core/web/resolver/vrf.go` | 113 |
| `NewCreateP2PKeyPayload` | Function | `foundry/lib/chainlink/core/web/resolver/p2p.go` | 66 |
| `NewDeleteP2PKeyPayload` | Function | `foundry/lib/chainlink/core/web/resolver/p2p.go` | 97 |
| `NewCreateOCRKeyBundlePayload` | Function | `foundry/lib/chainlink/core/web/resolver/ocr.go` | 56 |
| `NewApproveJobProposalSpecPayload` | Function | `foundry/lib/chainlink/core/web/resolver/job_proposal_spec.go` | 107 |
| `NewCancelJobProposalSpecPayload` | Function | `foundry/lib/chainlink/core/web/resolver/job_proposal_spec.go` | 178 |
| `NewRejectJobProposalSpecPayload` | Function | `foundry/lib/chainlink/core/web/resolver/job_proposal_spec.go` | 219 |
| `NewUpdateJobProposalSpecDefinitionPayload` | Function | `foundry/lib/chainlink/core/web/resolver/job_proposal_spec.go` | 260 |
| `NewDismissJobErrorPayload` | Function | `foundry/lib/chainlink/core/web/resolver/job_error.go` | 61 |
| `NewCreateJobPayload` | Function | `foundry/lib/chainlink/core/web/resolver/job.go` | 187 |
| `NewDeleteJobPayload` | Function | `foundry/lib/chainlink/core/web/resolver/job.go` | 234 |
| `NewCreateFeedsManagerChainConfigPayload` | Function | `foundry/lib/chainlink/core/web/resolver/feeds_manager_chain_config.go` | 145 |
| `NewDeleteFeedsManagerChainConfigPayload` | Function | `foundry/lib/chainlink/core/web/resolver/feeds_manager_chain_config.go` | 198 |
| `NewUpdateFeedsManagerChainConfigPayload` | Function | `foundry/lib/chainlink/core/web/resolver/feeds_manager_chain_config.go` | 235 |
| `NewCreateFeedsManagerPayload` | Function | `foundry/lib/chainlink/core/web/resolver/feeds_manager.go` | 129 |
| `NewUpdateFeedsManagerPayload` | Function | `foundry/lib/chainlink/core/web/resolver/feeds_manager.go` | 211 |
| `NewCreateCSAKeyPayload` | Function | `foundry/lib/chainlink/core/web/resolver/csa_keys.go` | 67 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `CreateJob → Transmission` | cross_community | 6 |
| `StartBootstrapNode → NewHttpClient` | cross_community | 6 |
| `StartBootstrapNode → ErrorIfFn` | cross_community | 6 |
| `StartBootstrapNode → FindSessionCookie` | cross_community | 6 |
| `Run → GetUpkeepType` | cross_community | 6 |
| `Run → WithJitter` | cross_community | 5 |
| `Run → ZapDiskPollConfig` | cross_community | 5 |
| `Run → NewZapConfigBase` | cross_community | 5 |
| `Run → NodeBatcher` | cross_community | 5 |
| `Run → ChainBatcher` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Mocks | 64 calls |
| Cmd | 20 calls |
| Pipeline | 18 calls |
| Keeper | 15 calls |
| Resolver | 14 calls |
| Logpoller | 13 calls |
| Job | 10 calls |
| Ocr2keeper | 9 calls |

## How to Explore

1. `gitnexus_context({name: "ValidateBridgeType"})` — see callers and callees
2. `gitnexus_query({query: "web"})` — find related execution flows
3. Read key files listed above for implementation details
