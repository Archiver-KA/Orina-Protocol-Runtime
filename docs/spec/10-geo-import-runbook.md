# Geo Import Runbook

## Goal

Use `supabase db push` for schema, then use a separate geo import artifact for global country, subdivision, and locality data.

## Recommended Apply Sequence

### 1. Validate migrations locally

Run:

1. `supabase start`
2. `supabase db reset`

Expected result:

- migrations `000015` through `000021` replay cleanly
- the six-country bootstrap seed is present

### 2. Apply schema to remote Supabase

Run:

1. `supabase login`
2. `supabase link --project-ref <project-ref>`
3. `supabase db push --dry-run`
4. review the pending migrations
5. `supabase db push`

This is the safe path because schema history stays in `supabase/migrations` and remains auditable.

## Recommended Data Sources

### Countries

Requirement:

- ISO 3166-1 alpha-2 and alpha-3

Recommended input:

- open CSV derived from ISO 3166-1
- optionally enrich with GeoNames `countryInfo.txt`

### Subdivisions

Requirement:

- ISO 3166-2 codes

Recommended input:

- open subdivision CSV with stable ISO 3166-2 identifiers
- optional columns for GeoNames admin-code mapping

### Cities / Localities

Requirement:

- GeoNames or an equivalent open locality source

Recommended first pass:

- `cities15000.txt`

That keeps import size and QA scope manageable while still covering major delivery destinations.

## Repo Workflow

Raw files live under:

- `data/geo/raw/iso`
- `data/geo/raw/geonames`
- `data/geo/raw/mappings`

Product-specific country UX rules live under:

- `data/geo/config/country-address-overrides.json`

Build artifacts with:

```bash
npm run geo:build -- --dataset-version 2026-03-09
```

Strict validation:

```bash
npm run geo:build:strict -- --dataset-version 2026-03-09
```

Artifacts are written to:

- `data/geo/out/geo-countries.json`
- `data/geo/out/geo-places.json`
- `data/geo/out/geo-import.sql`
- `data/geo/out/geo-import-manifest.json`
- `data/geo/out/geo-import-unmapped-localities.csv`

## Import Rule

Do not guess locality parents.

If a city cannot be mapped confidently to a subdivision chain:

1. skip it
2. write it to `geo-import-unmapped-localities.csv`
3. resolve it with `geonames-admin-overrides.csv`

Incorrect geography is worse than incomplete geography for delivery accuracy.

## Import To Supabase

Recommended path:

1. build artifacts locally
2. inspect `geo-import-manifest.json`
3. run `geo-import.sql` through a direct Postgres connection

Example:

```bash
psql "$SUPABASE_DB_URL" -f data/geo/out/geo-import.sql
```

This keeps large mutable datasets outside irreversible migration history.
