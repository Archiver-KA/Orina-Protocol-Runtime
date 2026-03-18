# Supabase Migration And Geo Import Strategy

## Objective

This document describes the recommended operational path for:

1. applying ATP2 schema migrations to a linked Supabase project
2. expanding geo reference data beyond the current six-country sample
3. keeping schema history clean while allowing geo datasets to evolve

## Recommended Approach

Use a two-track deployment model:

1. `Schema track`
   - managed through `supabase/migrations`
   - applied with `supabase db push`
2. `Geo data track`
   - managed as an idempotent import pipeline
   - not embedded as large SQL migration files

This split is intentional.

## Why This Is The Best Fit

### Keep migrations small and auditable

Schema migrations should define:

- tables
- constraints
- indexes
- triggers
- RLS
- lightweight bootstrap seed only when necessary

They should not carry a global country, subdivision, and city dataset with potentially hundreds of thousands of rows.

### Keep geo data refreshable

Geo data changes independently from application schema.

Examples:

- ISO subdivision codes are revised
- city populations change
- locality aliases need enrichment
- a new import source may replace part of the pipeline

If large geo data is embedded inside migrations:

- deploys become slow
- failures are harder to repair
- reruns are expensive
- updating one source means writing another heavy migration

### Keep production risk lower

For production, the safe sequence is:

1. apply schema migrations
2. verify new tables and policies exist
3. run a controlled geo import job
4. verify row counts and query behavior
5. switch the UI to broader datasets if needed

## Supabase Apply Workflow

### Local validation

Run local database validation before touching remote:

1. `supabase start`
2. `supabase db reset`
3. verify the schema and sample seed load locally

This ensures every migration replays from zero.

### Remote apply

Recommended remote flow:

1. `supabase login`
2. `supabase link --project-ref <project-ref>`
3. `supabase db push --dry-run`
4. inspect pending migrations carefully
5. `supabase db push`

Only use `--include-seed` for small bootstrap data. Do not use it for full global geo imports.

### Recovery

If migration history drifts:

- inspect remote migration history
- use `supabase migration list`
- use `supabase migration repair` only when you fully understand the mismatch

Do not patch the remote state manually unless the history table and actual schema are reconciled.

## Dataset Strategy

### Countries

Canonical requirement:

- ISO 3166-1 alpha-2 and alpha-3

Recommended source class:

- open ISO 3166 CSV dataset with stable country codes

Recommended usage:

- populate `geo_countries`
- store canonical code, name, optional native name, phone code, and address schema

### Subdivisions

Canonical requirement:

- ISO 3166-2 codes

Recommended source class:

- open ISO 3166-2 dataset for code authority
- open admin dataset for hierarchy and locality mapping

Recommended usage:

- keep ISO subdivision codes as the canonical subdivision identifier when available
- use admin dataset attributes to enrich parent-child structure, type, and local naming

### Cities / Localities

Recommended source class:

- GeoNames or equivalent open locality dataset

Recommended initial scope:

- start with `cities15000` or `cities5000`, not `allCountries`

Rationale:

- enough coverage for settings and delivery flows
- much smaller import footprint
- easier to validate and re-import

## Best Data Mapping Strategy

### Canonical tables

Keep the current runtime target tables:

- `geo_countries`
- `geo_places`

### Import staging

Add staging or in-memory transform steps outside app migrations:

- `country reference input`
- `subdivision reference input`
- `admin hierarchy input`
- `city/locality input`

Then normalize into:

- `geo_countries`
- `geo_places`

### ID strategy

The current implementation uses stable text IDs for `geo_places`.

This is preferred over random UUIDs for reference data because:

- imports remain deterministic
- local fallback and remote records can share the same geo identifier
- re-imports can upsert cleanly

## Recommended Import Pipeline

### Step 1: raw landing

Store raw source files outside `supabase/migrations`, for example:

- `data/geo/raw/iso/countries.csv`
- `data/geo/raw/iso/subdivisions.csv`
- `data/geo/raw/geonames/countryInfo.txt`
- `data/geo/raw/geonames/admin1CodesASCII.txt`
- `data/geo/raw/geonames/admin2Codes.txt`
- `data/geo/raw/geonames/cities15000.txt`

### Step 2: normalize

Use an import script to:

1. normalize country codes to ISO alpha-2
2. normalize subdivision codes to ISO 3166-2 when available
3. build parent-child chains
4. assign stable `geo_places.id` values
5. generate canonical rows for `geo_countries` and `geo_places`

### Step 3: upsert

Run an idempotent import into Supabase:

1. upsert countries first
2. upsert admin-level places
3. upsert localities
4. write import version metadata

### Step 4: validate

Validation checklist:

1. every `geo_places.country_code` exists in `geo_countries`
2. every child row has a valid `parent_id`
3. UI query patterns return expected levels
4. address saves still resolve valid `leaf_place_id`

## Practical Recommendation For ATP2

### Immediately

1. apply migrations `000015` through `000021` to the target Supabase project
2. keep the current six-country sample as bootstrap/fallback
3. verify wallet-scoped settings and address sync against the linked project

### Next

1. add an import script for ISO + GeoNames raw files
2. import countries for all supported jurisdictions
3. import subdivisions globally
4. import localities at `cities15000` scale first

### Later

1. expand to denser locality datasets only where product value exists
2. add alternate names and multilingual aliases
3. add dataset versioning and re-import commands

## What Not To Do

1. Do not place the full global geo dataset directly inside SQL migrations.
2. Do not treat `supabase/seed.sql` as the main delivery vehicle for large geo imports.
3. Do not mix mutable import jobs with irreversible schema migration history.
4. Do not use dashboard-only table edits for this pipeline once migrations are the source of truth.
