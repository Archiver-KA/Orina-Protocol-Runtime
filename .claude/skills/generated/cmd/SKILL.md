---
name: cmd
description: "Skill for the Cmd area of ATP2. 350 symbols across 95 files."
---

# Cmd

350 symbols | 95 files | Cohesion: 66%

## When to Use

- Working with code in `foundry/`
- Understanding how WriteFileWithMaxPerms, TestShellVRF_CRUD, TestVRF_ImportExport work
- Modifying cmd-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/cmd/shell_remote.go` | CreateExternalInitiator, DeleteExternalInitiator, getPage, RemoteLogin, Logout (+16) |
| `foundry/lib/chainlink/core/cmd/shell_remote_test.go` | TestShell_ChangePassword, TestShell_RunOCRJob_MissingJobID, TestShell_RunOCRJob_JobNotFound, startNewApplicationV2, withMocks (+15) |
| `foundry/lib/chainlink/core/cmd/shell_local.go` | ctx, ResetDatabase, PrepareTestDatabaseUserOnly, MigrateDatabase, RollbackDatabase (+15) |
| `foundry/lib/chainlink/core/cmd/shell.go` | errorOut, configExitErr, confirmAction, NewPromptingSessionRequestBuilder, NewPromptingAPIInitializer (+15) |
| `foundry/lib/chainlink/core/cmd/shell_test.go` | TestTerminalAPIInitializer_InitializeWithoutAPIUser, TestTerminalAPIInitializer_InitializeWithExistingAPIUser, TestFileAPIInitializer_InitializeWithoutAPIUser, TestFileAPIInitializer_InitializeWithExistingAPIUser, TestTerminalCookieAuthenticator_AuthenticateWithoutSession (+9) |
| `foundry/lib/chainlink/core/cmd/jobs_commands.go` | ShowJob, CreateJob, DeleteJob, TriggerPipelineRun, RenderTable (+6) |
| `foundry/lib/chainlink/core/cmd/eth_keys_commands_test.go` | ptr, TestShell_ListETHKeys, TestShell_ListETHKeys_Error, TestShell_ListETHKeys_Disabled, TestShell_CreateETHKey (+4) |
| `foundry/lib/chainlink/core/cmd/renderer.go` | renderVRFKeys, renderList, Render, renderLogPkgConfig, render (+3) |
| `foundry/lib/chainlink/core/cmd/jobs_commands_test.go` | TestJobPresenter_RenderTable, TestJob_ToRows, TestShell_CreateJobV2, TestShell_DeleteJob, requireJobsCount (+3) |
| `foundry/lib/chainlink/core/cmd/vrf_keys_commands.go` | CreateVRFKey, ImportVRFKey, ExportVRFKey, DeleteVRFKey, getPublicKey (+2) |

## Entry Points

Start here when exploring this area:

- **`WriteFileWithMaxPerms`** (Function) — `foundry/lib/chainlink/core/utils/files.go:65`
- **`TestShellVRF_CRUD`** (Function) — `foundry/lib/chainlink/core/cmd/vrf_keys_commands_test.go:68`
- **`TestVRF_ImportExport`** (Function) — `foundry/lib/chainlink/core/cmd/vrf_keys_commands_test.go:126`
- **`TestShell_StarkNetKeys`** (Function) — `foundry/lib/chainlink/core/cmd/starknet_keys_commands_test.go:57`
- **`TestShell_SolanaKeys`** (Function) — `foundry/lib/chainlink/core/cmd/solana_keys_commands_test.go:58`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `WriteFileWithMaxPerms` | Function | `foundry/lib/chainlink/core/utils/files.go` | 65 |
| `TestShellVRF_CRUD` | Function | `foundry/lib/chainlink/core/cmd/vrf_keys_commands_test.go` | 68 |
| `TestVRF_ImportExport` | Function | `foundry/lib/chainlink/core/cmd/vrf_keys_commands_test.go` | 126 |
| `TestShell_StarkNetKeys` | Function | `foundry/lib/chainlink/core/cmd/starknet_keys_commands_test.go` | 57 |
| `TestShell_SolanaKeys` | Function | `foundry/lib/chainlink/core/cmd/solana_keys_commands_test.go` | 58 |
| `TestShell_ChangePassword` | Function | `foundry/lib/chainlink/core/cmd/shell_remote_test.go` | 415 |
| `TestShell_RunOCRJob_MissingJobID` | Function | `foundry/lib/chainlink/core/cmd/shell_remote_test.go` | 610 |
| `TestShell_RunOCRJob_JobNotFound` | Function | `foundry/lib/chainlink/core/cmd/shell_remote_test.go` | 627 |
| `TestShell_OCR2Keys` | Function | `foundry/lib/chainlink/core/cmd/ocr2_keys_commands_test.go` | 69 |
| `TestShell_DKGSignKeys` | Function | `foundry/lib/chainlink/core/cmd/dkgsign_keys_commands_test.go` | 58 |
| `TestShell_DKGEncryptKeys` | Function | `foundry/lib/chainlink/core/cmd/dkgencrypt_keys_commands_test.go` | 58 |
| `TestShell_CosmosKeys` | Function | `foundry/lib/chainlink/core/cmd/cosmos_keys_commands_test.go` | 58 |
| `TestShell_CreateExternalInitiator_Errors` | Function | `foundry/lib/chainlink/core/cmd/shell_remote_test.go` | 178 |
| `TestShell_DestroyExternalInitiator_NotFound` | Function | `foundry/lib/chainlink/core/cmd/shell_remote_test.go` | 241 |
| `TestShell_RemoteLogin` | Function | `foundry/lib/chainlink/core/cmd/shell_remote_test.go` | 259 |
| `TestShell_RemoteBuildCompatibility` | Function | `foundry/lib/chainlink/core/cmd/shell_remote_test.go` | 300 |
| `TestShell_CheckRemoteBuildCompatibility` | Function | `foundry/lib/chainlink/core/cmd/shell_remote_test.go` | 339 |
| `TestShell_Profile_InvalidSecondsParam` | Function | `foundry/lib/chainlink/core/cmd/shell_remote_test.go` | 465 |
| `TestShell_Profile` | Function | `foundry/lib/chainlink/core/cmd/shell_remote_test.go` | 495 |
| `TestShell_ConfigV2` | Function | `foundry/lib/chainlink/core/cmd/shell_remote_test.go` | 545 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `StartBootstrapNode → RootDir` | cross_community | 8 |
| `StartBootstrapNode → NewHttpClient` | cross_community | 6 |
| `StartBootstrapNode → ErrorIfFn` | cross_community | 6 |
| `StartBootstrapNode → FindSessionCookie` | cross_community | 6 |
| `Main → TerminalPrompter` | cross_community | 5 |
| `Main → PromptingAPIInitializer` | cross_community | 5 |
| `Main → PromptingSessionRequestBuilder` | cross_community | 5 |
| `Main → ChangePasswordPrompter` | cross_community | 5 |
| `Main → HandleShutdown` | cross_community | 5 |
| `Main → ErrorOut` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Web | 41 calls |
| Logpoller | 18 calls |
| Pipeline | 18 calls |
| Keeper | 10 calls |
| Resolver | 6 calls |
| Txmgr | 6 calls |
| Migrate | 5 calls |
| Mocks | 4 calls |

## How to Explore

1. `gitnexus_context({name: "WriteFileWithMaxPerms"})` — see callers and callees
2. `gitnexus_query({query: "cmd"})` — find related execution flows
3. Read key files listed above for implementation details
