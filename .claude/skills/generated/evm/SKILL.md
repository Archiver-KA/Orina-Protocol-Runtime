---
name: evm
description: "Skill for the Evm area of ATP2. 144 symbols across 56 files."
---

# Evm

144 symbols | 56 files | Cohesion: 67%

## When to Use

- Working with code in `foundry/`
- Understanding how TestNewMedianProvider, NewOffchainConfigDigester, NewRelayOpts work
- Modifying evm-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/services/relay/evm/chain_reader_test.go` | TestChainReaderInterfaceTests, triggerFourTopics, Setup, deployNewContracts, deployNewContract (+9) |
| `foundry/lib/chainlink/core/services/relay/evm/evm.go` | NewOCR3CapabilityProvider, NewPluginProvider, NewMercuryProvider, NewLLOProvider, NewConfigProvider (+8) |
| `foundry/lib/chainlink/core/services/relay/evm/event_binding.go` | getLatestValueWithFilters, convertToOffChainType, encodeParams, derefTopics, wrapInternalErr (+8) |
| `foundry/lib/chainlink/core/services/relay/evm/cap_encoder_test.go` | TestEVMEncoder_SingleField, TestEVMEncoder_TwoFields, TestEVMEncoder_Tuple, TestEVMEncoder_ListOfTuples, TestEVMEncoder_InvalidIDs (+2) |
| `foundry/lib/chainlink/core/services/relay/evm/codec_test.go` | TestCodec, GetCodec, EncodeFields, encodeFieldsOnItem, encodeFieldsOnSliceOrArray (+2) |
| `foundry/lib/chainlink/core/services/relay/evm/config_poller.go` | LatestConfigDetails, LatestConfig, isConfigStoreAvailable, callLatestConfigDetails, callReadConfigFromStore (+2) |
| `foundry/lib/chainlink/core/services/relay/evm/chain_reader.go` | addEvent, addEncoderDef, addDecoderDef, setupEventInput, NewChainReaderService |
| `foundry/lib/chainlink/core/services/relay/evm/types/codec_entry.go` | NewCodecEntry, Init, GetMaxSize, EncodingPrefix, ToNative |
| `foundry/lib/chainlink/core/services/relay/evm/encoder.go` | GetMaxEncodingSize, Encode, pack, representArray, unrollItem |
| `foundry/lib/chainlink/core/services/relay/evm/decoder.go` | GetMaxDecodingSize, Decode, decodeArray, extractDecoding, setElements |

## Entry Points

Start here when exploring this area:

- **`TestNewMedianProvider`** (Function) — `foundry/lib/chainlink/core/services/relay/evm/median_test.go:18`
- **`NewOffchainConfigDigester`** (Function) — `foundry/lib/chainlink/core/services/relay/evm/mercury/offchain_config_digester.go:20`
- **`NewRelayOpts`** (Function) — `foundry/lib/chainlink/core/services/relay/evm/types/types.go:166`
- **`BuildMedianOCR2Config`** (Function) — `foundry/lib/chainlink/integration-tests/actions/ocr2_helpers.go:111`
- **`GetOracleIdentities`** (Function) — `foundry/lib/chainlink/integration-tests/actions/ocr2_helpers.go:172`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TestNewMedianProvider` | Function | `foundry/lib/chainlink/core/services/relay/evm/median_test.go` | 18 |
| `NewOffchainConfigDigester` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/offchain_config_digester.go` | 20 |
| `NewRelayOpts` | Function | `foundry/lib/chainlink/core/services/relay/evm/types/types.go` | 166 |
| `BuildMedianOCR2Config` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr2_helpers.go` | 111 |
| `GetOracleIdentities` | Function | `foundry/lib/chainlink/integration-tests/actions/ocr2_helpers.go` | 172 |
| `MustNewPeerID` | Function | `foundry/lib/chainlink/core/utils/utils.go` | 36 |
| `TestConfigPoller` | Function | `foundry/lib/chainlink/core/services/relay/evm/config_poller_test.go` | 45 |
| `AccountToAddress` | Function | `foundry/lib/chainlink/core/services/relay/evm/address.go` | 11 |
| `OnchainPublicKeyToAddress` | Function | `foundry/lib/chainlink/core/services/relay/evm/address.go` | 25 |
| `GenerateDefaultOCR2OnchainConfig` | Function | `foundry/lib/chainlink/core/services/ocr2/testhelpers/onchain_config.go` | 8 |
| `TestMercuryConfigPoller` | Function | `foundry/lib/chainlink/core/services/relay/evm/mercury/config_poller_test.go` | 22 |
| `NewCodec` | Function | `foundry/lib/chainlink/core/services/relay/evm/codec.go` | 40 |
| `NewChainWriterService` | Function | `foundry/lib/chainlink/core/services/relay/evm/chain_writer.go` | 32 |
| `NewCodecEntry` | Function | `foundry/lib/chainlink/core/services/relay/evm/types/codec_entry.go` | 36 |
| `TestEVMEncoder_SingleField` | Function | `foundry/lib/chainlink/core/services/relay/evm/cap_encoder_test.go` | 35 |
| `TestEVMEncoder_TwoFields` | Function | `foundry/lib/chainlink/core/services/relay/evm/cap_encoder_test.go` | 70 |
| `TestEVMEncoder_Tuple` | Function | `foundry/lib/chainlink/core/services/relay/evm/cap_encoder_test.go` | 106 |
| `TestEVMEncoder_ListOfTuples` | Function | `foundry/lib/chainlink/core/services/relay/evm/cap_encoder_test.go` | 145 |
| `TestEVMEncoder_InvalidIDs` | Function | `foundry/lib/chainlink/core/services/relay/evm/cap_encoder_test.go` | 187 |
| `NewEVMEncoder` | Function | `foundry/lib/chainlink/core/services/relay/evm/cap_encoder.go` | 27 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `NewLLOProvider → RegisterFilter` | cross_community | 6 |
| `NewLLOProvider → ConfigPollerFilterName` | cross_community | 6 |
| `NewLLOProvider → ConfigPoller` | cross_community | 6 |
| `NewLLOProvider → Client` | cross_community | 6 |
| `NewConfigProvider → RegisterFilter` | cross_community | 6 |
| `NewConfigProvider → ConfigPollerFilterName` | cross_community | 6 |
| `NewEVM → New` | cross_community | 5 |
| `NewEVM → HeadTracker` | cross_community | 5 |
| `NewLLOProvider → ConfigWatcher` | intra_community | 5 |
| `NewLLOProvider → Start` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Logpoller | 10 calls |
| Types | 7 calls |
| Cmd | 6 calls |
| Client | 5 calls |
| Pipeline | 5 calls |
| V21 | 5 calls |
| Legacyevm | 4 calls |
| Ocrcommon | 3 calls |

## How to Explore

1. `gitnexus_context({name: "TestNewMedianProvider"})` — see callers and callees
2. `gitnexus_query({query: "evm"})` — find related execution flows
3. Read key files listed above for implementation details
