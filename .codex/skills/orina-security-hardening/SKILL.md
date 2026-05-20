---
name: orina-security-hardening
description: Plan, audit, and implement Orina Protocol Runtime security hardening across Postgres concurrency, Supabase RLS and SECURITY DEFINER functions, Edge/CORS security, browser-wallet isolation, supplier media origin governance, supply-chain provenance, distributed tracing, runtime tracing, capability-based JavaScript isolation, eBPF monitoring, and zero-trust infrastructure. Use when Codex is asked to prioritize Tier 1/2/3 security work, classify P0/P1/P2 controls, review Orina runtime AppSec, prepare security roadmaps, or reconcile ATP/Foundry/formal invariant evidence.
---

# Orina Security Hardening

Use this skill for Orina Runtime security planning and review. Prefer repository evidence first, classify residuals explicitly, and do not mutate production infrastructure, GitHub settings, Supabase, Cloudflare, wallet state, or secrets without exact current-turn authority.

## Non-Negotiable Rules

- Never read, print, copy, rotate, or store secret values, wallet private keys, seed phrases, recovery phrases, cookies, auth tokens, service-role keys, JWT signing secrets, or delegate encryption keys.
- Treat owner-policy gaps as `OWNER_DECISION_REQUIRED`; do not invent approval for supplier media origins, preview origins, branch protection, signing identity, incident owners, RTO/RPO, or zero-trust topology.
- Treat browser wallet work as sensitive: read-only observation is allowed only when authorized; signing, minting, transfer, approval, transaction submission, or wallet configuration changes require explicit owner approval.
- Keep database security changes migration-backed, auditable, and reversible where possible. New `SECURITY DEFINER` functions require explicit grant review and fixed `search_path`.
- Separate evidence, decision, implementation, and verification. A control is not closed until a command, smoke, policy artifact, or owner evidence proves it.

## Tier Model

Tier 1 is release-blocking application and data security:

- Postgres concurrency
- RLS
- Edge security
- Wallet isolation
- CORS policy

Tier 2 is operational assurance and provenance:

- eBPF observability
- Runtime syscall tracing
- Distributed tracing
- Supply-chain verification

Tier 3 is advanced isolation and infrastructure posture:

- Capability-based JS isolation
- Kernel-level runtime security
- Zero-trust infra mesh

## Priority Model

Use this order unless the user overrides it:

- `P0`: supply-chain security, GitHub Actions/environment protection, release provenance/signing, Supabase/Postgres RLS plus `SECURITY DEFINER` audit, browser-wallet AppSec, origin/CORS governance.
- `P1`: distributed tracing, marketplace freshness/live cron monitoring, incident runbooks, secrets custody and backup boundary.
- `P2`: eBPF runtime security, Tetragon/Falco syscall monitoring, service mesh or zero-trust network.

Do not start P2 implementation until P0 owner decisions and P1 operational gaps are at least tracked with named acceptance criteria.

## Standard Workflow

1. Gather evidence from `SECURITY.md`, `package.json`, `.github/workflows`, `audit/invariants.md`, `audit/assurance-controls.md`, `audit/browser-smoke.md`, `docs/release-provenance.md`, `docs/github-branch-protection-governance.md`, and `docs/operational-governance-owner-decisions.md`.
2. Classify each control as `IMPLEMENTED`, `PARTIAL`, `OWNER_DECISION_REQUIRED`, `BLOCKED`, or `NOT_STARTED`.
3. Map each control to P0/P1/P2, an owner decision if needed, concrete repository files, and a verification command.
4. For code changes, keep edits scoped to the affected boundary: database migrations and audit scripts for RLS, Edge function shared security code for CORS, wallet/session utilities for wallet isolation, release gate workflow/scripts for provenance.
5. After implementation, run the smallest relevant verification set first, then the release security gate set before declaring closure.

Read `references/control-catalog.md` when building a detailed plan or checklist.

## Invariant Triage

Preserve these invariants when reviewing runtime protocol behavior:

- Bytecode/model freshness: `hash(runtime bytecode) == hash(current compiled artifact runtime bytecode)`.
- Revert atomicity: a failed delegated or root action must not partially mutate order state, escrow, asset lock, or finality latch.
- Terminal exclusivity: once final, no path can move to another terminal state or reopen payment or confirmation windows.

Use this classification rule:

- If ATP fails and Foundry reproduces, classify `CODE BUG`.
- If ATP fails but Foundry contradicts, classify `MODEL MISMATCH` unless audit docs assert ATP semantics.
- If ATP passes but Foundry invariant fails, classify `MODEL INCOMPLETE`.
- If bytecode hash mismatches, classify `TOOLING` and stop.

Formal methods such as KEVM, Certora, Isabelle/Coq fragments, SMT-backed proving, symbolic execution, and continuous formal CI require owned model scope, bytecode freshness proof, and CI authority before they can close a control.

## Verification Commands

Use the relevant subset:

```powershell
npm run test
npm run typecheck
npm run lint:check
npm run security:check-client-secrets
npm run security:scan
npm run audit:supabase:data-api-grants
npm run audit:supabase:security-definer
npm run verify:repo-tooling
npm run verify:marketplace-freshness
npm run verify:assurance-invariants
npm run verify:deterministic-build
npm run security:sbom
npm run release:manifest
npm run smoke:cdp:readonly-security
```

Use `npm run verify:github-branch-protection` only with a read-only token, and never print the token value.

## Output Standard

For plans and reviews, lead with the P0 blockers and owner decisions. Include a compact table with priority, control, current classification, next action, verification, and residual risk. Keep advanced P2 platform work separate from release-blocking Tier 1 controls.
