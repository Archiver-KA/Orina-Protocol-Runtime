---
name: secp256k1
description: "Skill for the Secp256k1 area of ATP2. 104 symbols across 21 files."
---

# Secp256k1

104 symbols | 21 files | Cohesion: 56%

## When to Use

- Working with code in `foundry/`
- Understanding how TestField_SmokeTestPick, TestField_Neg, TestField_Sub work
- Modifying secp256k1-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `foundry/lib/chainlink/core/services/signatures/secp256k1/scalar.go` | newScalar, Inv, IsSecp256k1Scalar, SetInt64, Zero (+16) |
| `foundry/lib/chainlink/core/services/signatures/secp256k1/point.go` | Pick, Embed, Sub, Neg, MarshalBinary (+13) |
| `foundry/lib/chainlink/core/services/signatures/secp256k1/scalar_test.go` | observedScalar, TestScalar_SmokeTestPick, TestScalar_Neg, TestScalar_Sub, TestScalar_Marshal (+8) |
| `foundry/lib/chainlink/core/services/signatures/secp256k1/field_test.go` | observedFieldElt, TestField_SmokeTestPick, TestField_Neg, TestField_Sub, TestField_SetBytesAndBytes (+5) |
| `foundry/lib/chainlink/core/services/signatures/secp256k1/field.go` | newFieldZero, Equal, fieldSquare, maybeSqrtInField, rightHandSide (+5) |
| `foundry/lib/chainlink/core/services/signatures/secp256k1/point_test.go` | TestPoint_NullAndAdd, TestPoint_AddSubAndNeg, TestPoint_Mul, TestIsSecp256k1Point, TestCoordinates (+3) |
| `foundry/lib/chainlink/core/services/signatures/secp256k1/public_key.go` | NewPublicKeyFromHex, SetFromHex, init, Point, Hash |
| `foundry/lib/chainlink/core/services/signatures/secp256k1/suite.go` | New, RandomStream, NewBlakeKeccackSecp256k1 |
| `foundry/lib/chainlink/core/services/signatures/secp256k1/curve.go` | Point, Scalar |
| `foundry/lib/chainlink/core/services/signatures/ethschnorr/ethschnorr.go` | ChallengeHash, Sign |

## Entry Points

Start here when exploring this area:

- **`TestField_SmokeTestPick`** (Function) — `foundry/lib/chainlink/core/services/signatures/secp256k1/field_test.go:72`
- **`TestField_Neg`** (Function) — `foundry/lib/chainlink/core/services/signatures/secp256k1/field_test.go:80`
- **`TestField_Sub`** (Function) — `foundry/lib/chainlink/core/services/signatures/secp256k1/field_test.go:93`
- **`TestField_SetBytesAndBytes`** (Function) — `foundry/lib/chainlink/core/services/signatures/secp256k1/field_test.go:113`
- **`TestField_MaybeSquareRootInField`** (Function) — `foundry/lib/chainlink/core/services/signatures/secp256k1/field_test.go:126`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TestField_SmokeTestPick` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/field_test.go` | 72 |
| `TestField_Neg` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/field_test.go` | 80 |
| `TestField_Sub` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/field_test.go` | 93 |
| `TestField_SetBytesAndBytes` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/field_test.go` | 113 |
| `TestField_MaybeSquareRootInField` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/field_test.go` | 126 |
| `TestScalar_SmokeTestPick` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/scalar_test.go` | 57 |
| `TestScalar_Neg` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/scalar_test.go` | 67 |
| `TestScalar_Sub` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/scalar_test.go` | 78 |
| `TestScalar_Marshal` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/scalar_test.go` | 97 |
| `TestScalar_MulDivInv` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/scalar_test.go` | 122 |
| `TestScalar_AllowVarTime` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/scalar_test.go` | 146 |
| `TestScalar_InvPanicsOnZero` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/scalar_test.go` | 166 |
| `ChallengeHash` | Function | `foundry/lib/chainlink/core/services/signatures/ethschnorr/ethschnorr.go` | 64 |
| `Sign` | Function | `foundry/lib/chainlink/core/services/signatures/ethschnorr/ethschnorr.go` | 92 |
| `TestScalar_IsSecp256k1Scalar` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/scalar_test.go` | 177 |
| `IsSecp256k1Scalar` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/scalar.go` | 206 |
| `TestRaw` | Function | `foundry/lib/chainlink/core/services/keystore/keys/dkgencryptkey/key_test.go` | 33 |
| `TestRaw` | Function | `foundry/lib/chainlink/core/services/keystore/keys/dkgsignkey/key_test.go` | 33 |
| `TestPoint_NullAndAdd` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/point_test.go` | 41 |
| `TestPoint_AddSubAndNeg` | Function | `foundry/lib/chainlink/core/services/signatures/secp256k1/point_test.go` | 95 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → ToInt` | cross_community | 7 |
| `Main → Secp256k1` | cross_community | 6 |
| `Main → ToInt` | cross_community | 6 |
| `ServicesForSpec → ToInt` | cross_community | 6 |
| `Run → ToInt` | cross_community | 6 |
| `Run → ToInt` | cross_community | 6 |
| `Run → ToInt` | cross_community | 6 |
| `Main → Secp256k1` | cross_community | 5 |
| `ServicesForSpec → Secp256k1` | cross_community | 5 |
| `Run → Secp256k1` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Smoke | 14 calls |
| Cltest | 11 calls |
| Logpoller | 8 calls |
| Solidity_cross_tests | 7 calls |
| Resolver | 5 calls |
| Gas | 3 calls |
| Vrfkey | 2 calls |
| V2 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "TestField_SmokeTestPick"})` — see callers and callees
2. `gitnexus_query({query: "secp256k1"})` — find related execution flows
3. Read key files listed above for implementation details
