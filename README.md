# Orina Protocol - Runtime

Last verified by Codex audit: 2026-06-27

Orina Protocol - Runtime is the standalone runtime repository for the Orina marketplace application. It keeps the production-facing frontend, Supabase runtime surfaces, release gates, and current-code documentation without the old workspace-specific agent metadata and local archive material.

## Current Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Wagmi + Viem
- Supabase

## Development

```bash
npm install
npm run dev
npm run test
npm run typecheck
npm run lint:check
npm run security:scan
npm run security:sbom
npm run release:manifest
npm run audit:supabase:data-api-grants
npm run verify:repo-tooling
npm run verify:marketplace-freshness
npm run verify:assurance-invariants
npm run verify:deterministic-build
npm run verify:viewer-release
npm run build
```

## Documentation

Current runtime and release references live under `docs/`.

- [Docs Hub](./docs/README.md)
- [Security](./SECURITY.md)
- [Protocol Security Status](./docs/protocol-security-status-2026-06-27.md)
- [Mainnet Production Checklist](./docs/mainnet-production-checklist.md)
- [Testnet Runtime Guide](./docs/testnet-runtime-guide.md)
- [Type Safety Baseline](./docs/type-safety-baseline.md)
- [Lint Governance](./docs/lint-governance.md)
- [Release Provenance Plan](./docs/release-provenance.md)
- [Operational Governance Owner Decisions](./docs/operational-governance-owner-decisions.md)
- [GitHub Branch Protection Governance](./docs/github-branch-protection-governance.md)
- [AI M2M Runtime Enablement](./docs/spec/11-ai-m2m-runtime-enablement.md)
- [AI M2M Supabase Deploy And Runtime Verification](./docs/spec/12-ai-m2m-supabase-deploy-runtime-checklist.md)
- [Supabase Split Function Runbook](./docs/spec/19-supabase-split-function-runbook.md)
- [SEO And System Completion Roadmap](./docs/spec/20-seo-and-system-completion-roadmap.md)

## Important Repository Areas

- `src/` application source
- `public/` static assets and prerendered route inputs
- `supabase/` edge functions, audits, and migrations
- `scripts/` release checks, prerender, and smoke helpers
- `docs/` current-code runtime documentation
- `utils/` shared runtime configuration helpers

## Scope Note

This repo is intended to stay runtime-focused. Local agent metadata, archived planning material, nested repo artifacts, and scratch files are intentionally excluded from the tracked surface.
