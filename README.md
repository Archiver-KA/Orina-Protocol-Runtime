# ORINA ATP2

ORINA ATP2 is the current frontend workspace for the Orina marketplace product. The codebase is a single-shell React application covering guest landing, marketplace, orders, assets, community, messages, profile, settings, and a set of test or demo surfaces.

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
npm run build
```

## Documentation

The old mixed documentation set has been removed and replaced with a current-code spec set.

- [Docs Hub](./docs/README.md)
- [App Shell And Navigation](./docs/spec/01-app-shell-and-navigation.md)
- [Access, Theme, User, And Storage](./docs/spec/02-access-theme-user-and-storage.md)
- [Assets, Marketplace, Search, And Orders](./docs/spec/03-assets-marketplace-search-and-orders.md)
- [Community, Messages, And Profile](./docs/spec/04-community-messages-and-profile.md)
- [Integrations, Settings, And Tools](./docs/spec/05-integrations-settings-and-tools.md)
- [Current State And Demo Surfaces](./docs/spec/06-current-state-and-demo-surfaces.md)

## Important Repository Areas

- `src/` application source
- `public/` static assets and embedded guest landing content
- `supabase/` backend-related workspace files and migrations only
- `docs/` current-code documentation only

## Scope Note

The spec under `docs/spec/` describes the code as it exists now. It is not a forward-looking roadmap and it does not assume unfinished backend behavior is already live.

All future product and platform specs should be added under `docs/spec/`, not under `supabase/`.
