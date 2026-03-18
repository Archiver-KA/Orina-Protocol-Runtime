---
name: resolver
description: "Skill for the Resolver area of ATP2. 247 symbols across 81 files."
---

# Resolver

247 symbols | 81 files | Cohesion: 71%

## When to Use

- Working with code in `foundry/`
- Understanding how TestP2PKeysController_Create_HappyPath, TestResolver_GetVRFKey, TestResolver_GetVRFKeys work
- Modifying resolver-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/web/resolver/query.go` | Bridge, Chain, FeedsManager, FeedsManagers, Job (+23) |
| `foundry/lib/chainlink/core/web/resolver/spec_test.go` | TestResolver_CronSpec, TestResolver_OCRSpec, TestResolver_OCR2Spec, TestResolver_WebhookSpec, TestResolver_BootstrapSpec (+6) |
| `foundry/lib/chainlink/core/web/resolver/mutation.go` | UpdateUserPassword, CreateAPIToken, DeleteAPIToken, DeleteCSAKey, DeleteOCRKeyBundle (+6) |
| `foundry/lib/chainlink/core/web/loader/getters.go` | GetJobRunsByIDs, GetEthTxAttemptsByEthTxID, GetJobByPipelineSpecID, GetJobProposalsByFeedsManagerID, GetFeedsManagerByID (+4) |
| `foundry/lib/chainlink/core/web/resolver/ocr2_keys.go` | ToOCR2ChainType, NewOCR2KeyBundlesPayload, NewDeleteOCR2KeyBundlePayloadResolver, ChainType, OffChainPublicKey (+1) |
| `foundry/lib/chainlink/core/web/resolver/log.go` | NewGetSQLLoggingPayload, NewGlobalLogLevelPayload, NewSetSQLLoggingPayload, FromLogLevel, NewSetGlobalLogLevelPayload (+1) |
| `foundry/lib/chainlink/core/web/resolver/job_run.go` | NewJobRunPayload, NewJobRunsPayload, Job, NewRunJobPayload, NewJobRun (+1) |
| `foundry/lib/chainlink/core/web/resolver/job_proposal.go` | NewJobProposalPayload, NewJobProposal, NewJobProposals, FeedsManager, LatestSpec (+1) |
| `foundry/lib/chainlink/core/web/resolver/job.go` | NewJobPayload, Runs, NewJobsPayload, NewJob, NewJobs (+1) |
| `foundry/lib/chainlink/core/web/resolver/feeds_manager.go` | NewFeedsManagerPayload, NewFeedsManagersPayload, JobProposals, NewFeedsManager, NewFeedsManagers (+1) |

## Entry Points

Start here when exploring this area:

- **`TestP2PKeysController_Create_HappyPath`** (Function) — `foundry/lib/chainlink/core/web/p2p_keys_controller_test.go:40`
- **`TestResolver_GetVRFKey`** (Function) — `foundry/lib/chainlink/core/web/resolver/vrf_test.go:17`
- **`TestResolver_GetVRFKeys`** (Function) — `foundry/lib/chainlink/core/web/resolver/vrf_test.go:104`
- **`TestResolver_CreateVRFKey`** (Function) — `foundry/lib/chainlink/core/web/resolver/vrf_test.go:162`
- **`TestResolver_DeleteVRFKey`** (Function) — `foundry/lib/chainlink/core/web/resolver/vrf_test.go:214`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TestP2PKeysController_Create_HappyPath` | Function | `foundry/lib/chainlink/core/web/p2p_keys_controller_test.go` | 40 |
| `TestResolver_GetVRFKey` | Function | `foundry/lib/chainlink/core/web/resolver/vrf_test.go` | 17 |
| `TestResolver_GetVRFKeys` | Function | `foundry/lib/chainlink/core/web/resolver/vrf_test.go` | 104 |
| `TestResolver_CreateVRFKey` | Function | `foundry/lib/chainlink/core/web/resolver/vrf_test.go` | 162 |
| `TestResolver_DeleteVRFKey` | Function | `foundry/lib/chainlink/core/web/resolver/vrf_test.go` | 214 |
| `TestResolver_SolanaKeys` | Function | `foundry/lib/chainlink/core/web/resolver/solana_key_test.go` | 14 |
| `RunGQLTests` | Function | `foundry/lib/chainlink/core/web/resolver/resolver_test.go` | 162 |
| `TestResolver_GetP2PKeys` | Function | `foundry/lib/chainlink/core/web/resolver/p2p_test.go` | 16 |
| `TestResolver_CreateP2PKey` | Function | `foundry/lib/chainlink/core/web/resolver/p2p_test.go` | 69 |
| `TestResolver_DeleteP2PKey` | Function | `foundry/lib/chainlink/core/web/resolver/p2p_test.go` | 118 |
| `TestResolver_GetOCRKeyBundles` | Function | `foundry/lib/chainlink/core/web/resolver/ocr_test.go` | 15 |
| `TestResolver_OCRCreateBundle` | Function | `foundry/lib/chainlink/core/web/resolver/ocr_test.go` | 70 |
| `TestResolver_OCRDeleteBundle` | Function | `foundry/lib/chainlink/core/web/resolver/ocr_test.go` | 121 |
| `TestResolver_GetOCR2KeyBundles` | Function | `foundry/lib/chainlink/core/web/resolver/ocr2_keys_test.go` | 20 |
| `TestResolver_CreateOCR2KeyBundle` | Function | `foundry/lib/chainlink/core/web/resolver/ocr2_keys_test.go` | 104 |
| `TestResolver_DeleteOCR2KeyBundle` | Function | `foundry/lib/chainlink/core/web/resolver/ocr2_keys_test.go` | 187 |
| `ToOCR2ChainType` | Function | `foundry/lib/chainlink/core/web/resolver/ocr2_keys.go` | 30 |
| `TestResolver_Nodes` | Function | `foundry/lib/chainlink/core/web/resolver/node_test.go` | 15 |
| `Test_NodeQuery` | Function | `foundry/lib/chainlink/core/web/resolver/node_test.go` | 101 |
| `TestResolver_SetSQLLogging` | Function | `foundry/lib/chainlink/core/web/resolver/log_test.go` | 14 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → LoadersKey` | cross_community | 8 |
| `Main → EthTransactionAttemptResolver` | cross_community | 8 |
| `Main → LoadersKey` | cross_community | 8 |
| `Main → EthTransactionAttemptResolver` | cross_community | 8 |
| `Main → FromInt64` | cross_community | 6 |
| `Main → FromInt64` | cross_community | 6 |
| `CreateJob → SessionUserKey` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Web | 24 calls |
| Loader | 18 calls |
| Ocr2keeper | 8 calls |
| Logpoller | 7 calls |
| Smoke | 5 calls |
| V2 | 5 calls |
| Mocks | 3 calls |
| Keeper | 2 calls |

## How to Explore

1. `gitnexus_context({name: "TestP2PKeysController_Create_HappyPath"})` — see callers and callees
2. `gitnexus_query({query: "resolver"})` — find related execution flows
3. Read key files listed above for implementation details
