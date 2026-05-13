# Release Provenance Plan

Last verified by Codex audit: 2026-05-13

## Status

Unsigned provenance manifest: IMPLEMENTED

Signed releases: OWNER_DECISION_REQUIRED

This repository can now generate an unsigned release manifest:

```powershell
npm run release:manifest
```

The command writes:

- `audit/release-manifest.unsigned.json`

The manifest is intentionally unsigned. No signing key, signing identity, release publishing permission, deployment permission, or artifact-signing authority is used by this repository command.

## Manifest Schema

Schema identifier:

- `orina.release-manifest.unsigned.v1`

Required top-level fields:

- `schema`: schema identifier.
- `generatedAt`: generation timestamp.
- `signed`: always `false` for this local manifest.
- `signing`: status and reason explaining that signing is not performed.
- `source`: package name/version, Git commit, branch, status, and origin remote.
- `build`: build command, Node version, platform, architecture, and optional `SOURCE_DATE_EPOCH`.
- `dependencyInputs`: hashes for `package.json`, `package-lock.json`, and `audit/sbom.cdx.json` when present.
- `artifacts`: `dist` presence, artifact count, and SHA-256 hash plus byte length for each generated file.

## CI Behavior

The release gate generates the unsigned manifest after build, deterministic-build verification, and SBOM generation. This improves artifact accountability without claiming signed provenance.

## Owner Decision Required

To close signed releases, an owner must decide:

- signing system, such as Sigstore/Cosign, GPG, or another owner-approved mechanism;
- signing identity and custody;
- whether signing occurs in CI or outside CI;
- which artifacts are signed;
- where signed provenance is stored;
- which checks enforce provenance before release or deployment.

## Risk If Deferred

The repository can produce deterministic build evidence, an SBOM, and an unsigned manifest, but consumers still cannot cryptographically verify release provenance.

## Minimum Authority Required

Planning requires no secret. Implementing signed releases requires signing authority and likely CI or release-system write access. That authority must not be granted to this local workspace unless a separate explicit approval contract is accepted.
