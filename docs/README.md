# ORINA ATP2 Docs

This documentation set was rewritten against the current codebase on March 8, 2026.

It replaces the previous mixed collection of audits, plans, migration notes, and aspirational subsystem writeups with a smaller set of source-of-truth specs based on the code currently in `src/`.

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

## How To Read This Set

- Start with `01` if you need the top-level app model.
- Read `02` before changing wallet-scoped state, theme behavior, or local persistence.
- Read `03`, `04`, and `07` for product features and page behavior.
- Read `05` before touching Supabase, chat, IPFS, AI agent, or settings flows.
- Read `06` before assuming a page is production-backed rather than mock-backed.
- Read `08` before changing Settings delivery address, mint delivery, asset address display, or marketplace map location logic.
- Read `09` and `10` before changing geo tables, migrations, or import workflow.

## Out Of Scope

- Historical implementation logs
- Legacy migration checklists
- Old UI audit reports
- Archived roadmap and deployment planning

Those were intentionally removed from the active docs set so the repo only carries documentation that matches the current code.
