# Geo Data Import

This folder is the working area for global address reference imports.

## Why It Exists

ATP2 keeps schema and large geo datasets on separate tracks:

1. `supabase/migrations` for schema, constraints, triggers, and RLS
2. `data/geo` plus `scripts/geo/build-geo-import.mjs` for mutable world-scale reference data

## Expected Raw Inputs

Place local source files here:

- `data/geo/raw/iso/countries.csv`
- `data/geo/raw/iso/subdivisions.csv`
- `data/geo/raw/geonames/countryInfo.txt`
- `data/geo/raw/geonames/admin1CodesASCII.txt`
- `data/geo/raw/geonames/admin2Codes.txt`
- `data/geo/raw/geonames/cities15000.txt`
- `data/geo/raw/mappings/geonames-admin-overrides.csv`

## Minimum CSV Contracts

### countries.csv

Required columns:

- `code`
- `iso3`
- `name`

Optional columns:

- `native_name`
- `phone_code`
- `postal_code_label`
- `postal_code_required`
- `postal_code_pattern`

### subdivisions.csv

Required columns:

- `country_code`
- `code`
- `name`

Optional columns:

- `parent_code`
- `type`
- `local_name`
- `lat`
- `lng`
- `geonames_admin1_code`
- `geonames_admin2_code`

## Product Overrides

Country-specific UX rules live in:

- `data/geo/config/country-address-overrides.json`

Use this file for:

- field labels
- required levels
- postal regex patterns
- activation flags

## Build

Generate import artifacts:

```bash
npm run geo:build -- --dataset-version 2026-03-09
```

Export split Supabase migrations for large world datasets:

```bash
npm run geo:export:migrations -- --migration-start 23 --migration-prefix c9_geo_reference_import_global_r4 --cleanup-seed c7
```

Strict mode:

```bash
npm run geo:build:strict -- --dataset-version 2026-03-09
```

## Outputs

Generated files are written to `data/geo/out`:

- `geo-countries.json`
- `geo-places.json`
- `geo-import.sql`
- `geo-import-manifest.json`
- `geo-import-unmapped-localities.csv`
- `chunked-migrations/*.sql`
