# ORINA ATP2 Runtime Docs

Last verified by Codex audit: 2026-06-07

This documentation set is aligned with the current runtime code as of 2026-06-07.

It separates user-facing guides, runtime verification runbooks, and current-code specs. Older planning notes and stale Make/Figma-era docs should not be treated as source of truth unless they are explicitly linked here.

## User Documentation

- [System User Guide](./system-user-guide.md)
- [Runtime FAQ](./system-faq.md)
- [Testnet Runtime Guide](./testnet-runtime-guide.md)
- [Port 9222 Runtime Verification](./port-9222-runtime-verification.md)
- [Repository Security](../SECURITY.md)
- [Type Safety Baseline](./type-safety-baseline.md)
- [Lint Governance](./lint-governance.md)
- [Release Provenance Plan](./release-provenance.md)
- [Operational Governance Owner Decisions](./operational-governance-owner-decisions.md)
- [GitHub Branch Protection Governance](./github-branch-protection-governance.md)

## Spec Index

1. [App Shell And Navigation](./spec/01-app-shell-and-navigation.md)
2. [Access, Theme, User, And Storage](./spec/02-access-theme-user-and-storage.md)
3. [Assets, Marketplace, Search, And Orders](./spec/03-assets-marketplace-search-and-orders.md)
4. [Community, Messages, And Profile](./spec/04-community-messages-and-profile.md)
5. [Integrations, Settings, And Tools](./spec/05-integrations-settings-and-tools.md)
6. [Current State And Demo Surfaces](./spec/06-current-state-and-demo-surfaces.md)
7. [Collections And RWA Configurable Attributes](./spec/07-collections-and-rwa-configurable-attributes.md)
8. [Global Delivery Address And Asset Location](./spec/08-global-delivery-address.md)
9. [Supabase Migration And Geo Import Strategy](./spec/09-supabase-migration-and-geo-import.md)
10. [Geo Import Runbook](./spec/10-geo-import-runbook.md)
11. [AI M2M Runtime Enablement](./spec/11-ai-m2m-runtime-enablement.md)
12. [AI M2M Supabase Deploy And Runtime Verification](./spec/12-ai-m2m-supabase-deploy-runtime-checklist.md)
13. [ATP Protocol Runtime Spec](./spec/13-atp-protocol-runtime-spec.md)
14. [Production Env Flip Runbook](./spec/14-production-env-flip-runbook.md)
15. [Service Boundary Separation](./spec/16-service-boundary-separation.md)
16. [Supabase Split Function Runbook](./spec/19-supabase-split-function-runbook.md)
17. [SEO And System Completion Roadmap](./spec/20-seo-and-system-completion-roadmap.md)

## How To Read This Set

- Start with the [System User Guide](./system-user-guide.md) for end-user workflows.
- Read the [Runtime FAQ](./system-faq.md) for support and troubleshooting.
- Read [Port 9222 Runtime Verification](./port-9222-runtime-verification.md) before running Chrome CDP smoke tests.
- Read [Testnet Runtime Guide](./testnet-runtime-guide.md) before enabling faucet env or testnet rankings.
- Read `01` and `02` before changing the shell, routes, access mode, wallet identity, or local storage.
- Read `03`, `04`, `07`, and `08` before changing product surfaces.
- Read `05` before changing Supabase, settings, API keys, AI, M2M, or Edge Function integration.
- Read `06` before assuming a UI page is fully production-backed.
- Read `13` and `14` before changing protocol addresses, EIP-712 payloads, or runtime deployment cutover.
- Read `19` before changing split-function routing or shared Supabase function boundaries.

## Source-Of-Truth Rules

- On-chain contract state is authoritative for ATP assets, orders, escrow, disputes, and receipts.
- Supabase `protocol_assets`, `protocol_orders`, and `protocol_order_events` are projections.
- Browser localStorage is cache, wallet-scoped preference, auth-session, or runtime shadow state depending on feature.
- The marketplace/search catalog is hydrated through `marketplaceCatalog.ts`, not an old durable mock catalog.
- Port `9222` is the Chrome DevTools Protocol endpoint, not the app port.

## Out Of Scope

- Historical implementation logs
- Superseded deployment notes for older ATP runtimes
- Old UI audit reports
- Archived roadmap planning
- Stale documentation copied from the documentation-site repo before runtime reconciliation
