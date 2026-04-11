# ORINA ATP2 Docs

This documentation set was rewritten against the current codebase on March 8, 2026.

It replaces most of the previous mixed collection of audits, plans, migration notes, and aspirational subsystem writeups with a smaller set of current-code specs and active runbooks, while keeping a short list of clearly labeled historical audit and design references.

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
15. [Local API Audit And Server Migration Plan](./spec/15-local-api-audit-and-server-migration-plan.md)
16. [Service Boundary Separation](./spec/16-service-boundary-separation.md)
17. [AI Store Advisor Architecture](./spec/17-ai-store-advisor-architecture.md)
18. [API Credential And AI Agent Separation](./spec/18-api-credential-ai-agent-separation.md)
19. [Supabase Split Function Runbook](./spec/19-supabase-split-function-runbook.md)
20. [SEO And System Completion Roadmap](./spec/20-seo-and-system-completion-roadmap.md)

## How To Read This Set

- Start with `01` if you need the top-level app model.
- Read `02` before changing wallet-scoped state, theme behavior, or local persistence.
- Read `03`, `04`, and `07` for product features and page behavior.
- Read `05` before touching Supabase, chat, IPFS, AI agent, or settings flows.
- Read `06` before assuming a page is production-backed rather than mock-backed.
- Read `08` before changing Settings delivery address, mint delivery, asset address display, or marketplace map location logic.
- Read `09` and `10` before changing geo tables, migrations, or import workflow.
- Read `19` before changing split-function routing, bridge slugs, AI/M2M runtime deployment, or shared-core IPFS and API-key surfaces.
- Read `11` and `12` only for historical context on the legacy shared-bundle M2M runtime.
- Read `13` before changing on-chain protocol assumptions, addresses, or role topology.
- Read `14` before flipping frontend/backend runtime to a new deployment.
- Read `15` only for historical audit context when revisiting server-truth migration, local-state removal, or separation between Messages and AI.
- Read `16` before adding any integration between the Chat service, AI workspace, or seller auto-reply automation.
- Read `17` and `18` only as retained design references for deferred seller-AI and API-credential work; they are not live-runtime source-of-truth docs.

## Out Of Scope

- Historical implementation logs
- Superseded deployment notes for older ATP runtimes
- Old UI audit reports
- Archived roadmap planning

The active docs set keeps current-code specs, live runtime and cutover runbooks, and a small number of explicitly labeled historical audit or design references.
