# SEO And System Completion Roadmap

## Current Audit Snapshot

The current ATP2 frontend now exposes a crawlable public discovery surface for Orina Protocol with native React landing pages, canonical public URLs, and a prerender pipeline fed from public Supabase data. The core SEO blockers from the original audit are closed.

The highest-impact improvements now in place are:

- The public landing surface is now native and Webflow-free inside `src/app/components/public-home-page.tsx`.
- The main app now exposes canonical public routes for homepage, marketplace, search, category landings, asset details, seller profiles, and collections.
- Root SEO metadata now includes canonical, Open Graph, Twitter, manifest, robots, favicon, and structured data wiring.
- Public entity metadata is generated through a prerender pipeline backed by public Supabase read models.
- Sitemap output is now partitioned by core pages, assets, profiles, collections, and categories, with a root sitemap index.

## Baseline Applied In This Pass

This pass moves the public system from baseline SEO to a production-ready public discovery layer.

- Root app naming now reflects Orina Protocol instead of the scaffold defaults.
- Root metadata now includes title, description, canonical, robots, Open Graph, Twitter, manifest, sitemap, and favicon wiring.
- The app now updates `document.title` and social/description metadata by top-level surface through `src/app/components/seo/app-seo.tsx`.
- The public landing surface now uses native Orina Protocol components and metadata with no iframe/Webflow dependency.
- Public category routes now use canonical path-based URLs for marketplace and search discovery.
- The build now generates prerendered HTML snapshots for homepage, marketplace, search, categories, assets, profiles, and collections.
- Release verification now exercises the prerender build and asserts partitioned sitemap artifacts in CI.
- The system now uses the Orina brand mark as the primary favicon asset.

## Phase 1: Public SEO Foundation

Objective: make the root app technically indexable and shareable.
Status: complete.

- Replace the iframe-based homepage with a native React landing page inside the main app shell.
- Introduce real URL routing for public surfaces:
  - `/`
  - `/marketplace`
  - `/search`
  - `/profile/:address`
  - `/asset/:assetId`
  - `/collections/:slug`
- Move internal navigation state into route state for every public page that should be indexable.
- Add stable canonical rules so every public entity resolves to exactly one URL.
- Expand structured data:
  - `Organization`
  - `WebSite`
  - `CollectionPage`
  - `ProfilePage`
  - `Product`
  - `BreadcrumbList`

## Phase 2: Searchable Public Inventory

Objective: expose canonical marketplace content to search engines and social crawlers.
Status: complete for current public catalog scope.

- Create a public read model for SEO-safe entity data from Supabase canonical tables:
  - asset snapshots
  - seller profile summaries
  - collection summaries
  - category landing data
- Add slug generation rules and uniqueness constraints for public entities.
- Generate per-entity metadata from canonical fields:
  - title
  - description
  - OG image
  - JSON-LD
  - canonical URL
- Generate sitemap partitions instead of a root-only sitemap:
  - core pages
  - assets
  - profiles
  - collections
  - categories

## Phase 3: Rendering Strategy

Objective: remove the SPA-only SEO ceiling.
Status: complete for the public surface via build-time prerendering.

- Add SSR or prerendering for the public surface only.
- Keep the authenticated application shell client-side if desired, but split public marketing/discovery pages into a render path search engines can parse without executing the full app.
- Pre-render high-value pages:
  - homepage
  - marketplace landing
  - top categories
  - top collections
  - top seller profiles
- If full SSR is deferred, build a scheduled prerender job from canonical Supabase data to static HTML snapshots.

## Phase 4: Performance And Crawl Quality

Objective: improve ranking readiness and reduce wasted crawl/render budget.
Status: remaining optimization phase.

- Keep the homepage fully native within the app shell.
- Self-host critical brand fonts or reduce font dependency for the public landing.
- Optimize hero and OG images.
- Audit LCP, CLS, and JS payload by separating public marketing code from authenticated dashboard code.
- Add cache rules for static public assets and sitemap/robots files.
- Ensure every public page has a single H1, clean heading order, descriptive alt text, and no hidden duplication.

## Phase 5: Full System Completion

Objective: move from strong UI coverage to production-grade platform readiness.

### Product and data

- Separate production-ready surfaces from demo or transitional surfaces documented in `docs/spec/06-current-state-and-demo-surfaces.md`.
- Define which public pages are canonical and which pages remain authenticated-only.
- Audit all asset, order, and profile states for consistency between local runtime overlays and Supabase canonical projections.

### Reliability

- Add end-to-end tests for guest landing, marketplace browse, profile view, asset detail, wallet connect, and order state transitions.
- Add smoke checks for all public URLs after deployment, not just runtime wallet flows.
- Add error monitoring and release markers for client and edge functions.

### Security

- Continue the current direction of keeping privileged writes off the client and within edge/server boundaries.
- Review every public SEO/data endpoint so no owner-only or privileged fields leak into public metadata.
- Add explicit abuse limits for public search and public entity metadata endpoints.

### Analytics and growth

- Define funnel analytics for:
  - landing visit
  - marketplace browse
  - search intent
  - asset detail open
  - seller profile open
  - wallet connect
  - order initiation
- Track zero-result searches and top viewed categories to drive content and inventory strategy.

## Recommended Execution Order

1. Replace the iframe homepage with a native routed landing page.
2. Add real public routes for asset, profile, collection, and search/category pages.
3. Build SEO-safe public read models from canonical Supabase data.
4. Add SSR or scheduled prerender for those public routes.
5. Expand sitemaps, structured data, and analytics after the public URLs become canonical.

## Practical Decision

If the goal is serious SEO on `orina.io`, the critical architectural move is not more meta tags. It is converting the current state-driven SPA and iframe landing into a routed, crawlable, server-rendered or prerendered public surface backed by canonical marketplace data.
