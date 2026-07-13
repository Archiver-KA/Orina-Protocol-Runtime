# Security

Last verified by Codex audit: 2026-07-13

## Reporting

This repository does not currently publish a dedicated public vulnerability intake address. Report security issues through the project maintainer channel used for this repository, and do not include raw secrets, private keys, service-role keys, JWT signing secrets, or generated API keys in issue text or logs.

## Supported Source

The current supported source is the runtime repository on `main` plus the release gate in `.github/workflows/protocol-release-gate.yml`.

## Protocol Contract Status

The runtime app currently targets the ATP v3.5 testnet contract stack. The public-safe contract assurance summary is in [Protocol Security Status](./docs/protocol-security-status-2026-06-27.md), and the production gate is in [Mainnet Production Checklist](./docs/mainnet-production-checklist.md).

Current summary:

- Foundry full suite passes at 110/110 after dispute-settlement hardening.
- Slither has no High/Medium impact findings after current triage.
- Echidna, Medusa, and deep invariants pass for the current ATP harnesses.
- Mythril runtime-bytecode findings for core contracts are source-triaged with no confirmed exploitable issue.
- Certora currently passes for the initial `FeeManager` scope; broader formal coverage and human review remain required before production claims.

## Runtime Security Assumptions

- Browser-exposed `VITE_*` values may contain only public Supabase URL/project/anon or publishable configuration.
- Supabase service-role keys, JWT secrets, delegate encryption keys, Pinata credentials, and database audit URLs belong only in server, Edge Function, CI secret, or local operator environments.
- Wallet auth proofs and Supabase bridge sessions are tab-scoped in `sessionStorage` and remain sensitive to same-origin XSS. Proofs expire after five minutes by default; bridge JWTs default to 15 minutes and are capped at one hour. Legacy `localStorage` entries are purged on read/write/clear.
- Wallet claim exchange requires a server-issued, one-time challenge bound to the exact wallet, chain, origin, and message; replayed, expired, or mismatched challenges must fail closed.
- Protected Edge Function writes must require H1 wallet claim JWTs and wallet-address matching.
- Upload, chat, AI, and moderation write paths should use the distributed rate limiter backed by `public.rate_limit_increment`.
- Public marketplace browse RPCs may be readable by `anon` and `authenticated`, but `SECURITY DEFINER` functions must be reviewed in `scripts/audit-supabase-security-definer.mjs`.
- Public-schema tables exposed through Supabase Data API must have explicit table grants in migrations. RLS remains the authorization boundary; do not use broad default table grants as a substitute for per-table review.
- PostGIS `public.spatial_ref_sys` is extension-owned in the linked project. If Supabase Advisor reports RLS disabled for that table, resolve it through owner/Supabase-admin authority; do not add migration SQL that the normal migration role cannot execute.
- Edge CORS must echo approved origins only. In production set `ORINA_CORS_ENV=production`, list extra production origins in `ORINA_CORS_ALLOWED_ORIGINS`, and enable broad preview hosts only with `ORINA_CORS_ALLOW_PREVIEW_ORIGINS=true`.
- Browser smoke treats external network origins as policy-controlled. Supplier/product media CDNs, including Alibaba-derived image hosts, are not approved unless documented and added to the smoke allowlist by an owner decision.
- AI M2M delegate invite ids must use cryptographic randomness with at least 32 bytes of entropy, expire before accept, reject replay after claim, and stay behind the distributed rate limiter.
- Server-managed AI M2M delegate private keys must remain server-side only. The stored backup record is AES-GCM ciphertext plus IV metadata; do not log, return, export, or back up `ATP2_M2M_DELEGATE_ENCRYPTION_KEY` with ciphertext.
- AI conversation history is relational (`agent_threads`/`agent_messages`). Migration `000084` backfills wallet-scoped legacy records and revokes runtime Data API access to the owner-only KV archive; apply it in the same approved window as the relational-only Edge bundle.
- Browser responses must retain the CSP, HSTS, nosniff, frame, referrer, permissions, opener, and resource policies declared in `public/_headers`.

## Verification

Run the repository security checks before release:

```bash
npm run security:check-client-secrets
npm run security:check-tracked-secrets
npm run security:scan
npm run security:audit-edge
npm run security:sbom
npm run release:manifest
npm run audit:supabase:data-api-grants
npm run audit:supabase:security-definer
npm run typecheck
npm run typecheck:edge
npm run lint:check
npm run verify:repo-tooling
npm run verify:marketplace-freshness
npm run verify:assurance-invariants
npm run verify:deterministic-build
```

`npm run audit:profile-reputation-view` requires an authenticated JWT or JWT signing secret that matches the target Supabase project. If the generated authenticated token returns `PGRST301`, stop and correct the audit credential source outside the repository; do not guess, print, or rotate secrets during repository verification.
