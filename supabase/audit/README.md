# Supabase Audit Layout

Last verified by Codex audit: 2026-05-14

This directory keeps runnable audit tooling at the top level and separates generated output into dedicated folders.

## Active Tooling

- `batch_*.cjs`: multi-step smoke and verification probes.
- `probe_*.cjs`: targeted runtime reachability or config checks.
- `smoke_*.cjs`: live end-to-end flows that exercise real runtime surfaces.
- `smoke_messaging_rls_direct.cjs`: bridge-authenticated REST smoke for messaging read/write RLS.
- `inspect_*.cjs`: read-only schema or REST inspection helpers.
- `run_*.cjs`: wrappers that load `.env` defaults before invoking a probe.
- `verify_*.cjs`: verification helpers that transform raw inspection output into pass/fail summaries.

## Admin And Manual Helpers

- `backfill_*.cjs`: admin-oriented projection backfill and reconstruction tools.
- `import_*.cjs`: targeted import or projection-write smokes for canonical runtime tables.
- `remote_db_*.cjs`: privileged remote SQL helpers; not release-gate probes.
- `read_*.cjs`, `onchain_*.cjs`, `post_cutover_*.cjs`: manual runtime and chain-state readers.
- `print_*.cjs`, `scan_*.cjs`, `render_*.cjs`: operator convenience helpers, formatters, and summaries.

Treat these helpers as operator tooling, not as the default release-validation suite.

## Bridge Auth Inputs

Hardened bridge-compatible probes accept any of these inputs:

- pre-issued JWTs:
  `ATP2_BRIDGE_ACCESS_TOKEN`, `ATP2_BRIDGE_ACCESS_TOKEN_A`, `ATP2_BRIDGE_ACCESS_TOKEN_B`
- signed wallet-session JSON:
  `ATP2_BRIDGE_SESSION_JSON`, `ATP2_BRIDGE_SESSION_JSON_A`, `ATP2_BRIDGE_SESSION_JSON_B`
- private keys:
  `ATP2_BRIDGE_PRIVATE_KEY`, `ATP2_BRIDGE_PRIVATE_KEY_A`, `ATP2_BRIDGE_PRIVATE_KEY_B`

Optional identity hints:

- `ATP2_BRIDGE_PROFILE_ID`, `ATP2_BRIDGE_PROFILE_ID_A`, `ATP2_BRIDGE_PROFILE_ID_B`
- `ATP2_BRIDGE_WALLET_ADDRESS`, `ATP2_BRIDGE_WALLET_ADDRESS_A`, `ATP2_BRIDGE_WALLET_ADDRESS_B`

Wrapper scripts also forward extra CLI flags to the underlying probes, for example:

```powershell
node supabase/audit/run_h3_smoke_from_env.cjs --bridge-access-token-a <jwtA> --bridge-access-token-b <jwtB>
```

## Privileged Projection Writes

Canonical protocol projection tables are service-role-only for writes.

- supported env vars:
  `SUPABASE_SERVICE_ROLE_KEY`, `ATP2_SUPABASE_SERVICE_ROLE_KEY`
- supported CLI override for the importer:
  `--service-role-key <service-role-key>`

Scripts that validate seller identity through the bridge and then write canonical projection rows must use one of those privileged keys for the write phase. The bridge JWT proves actor identity; it is no longer sufficient to upsert `protocol_assets` or `protocol_orders` directly.

## CI Supabase Audit

The SECURITY DEFINER audit entrypoint is:

- `npm run audit:supabase:security-definer -- --linked`

The public Data API grant audit entrypoint is:

- `npm run audit:supabase:data-api-grants`

Supabase's 2026 public-schema default change means migrations that create
`public` tables must also make Data API grants explicit for the roles that need
access. The verifier scans repository migrations for `CREATE TABLE` statements
and checks for explicit `anon`, `authenticated`, or `service_role` table grants.

The PostGIS `public.spatial_ref_sys` reference table may be owned by
`supabase_admin`, which means the normal migration role cannot enable RLS on it.
When that ownership boundary appears, track the Advisor item as an owner or
Supabase-admin action instead of adding unexecutable SQL to a migration.

When adding a new `public` table:

- enable RLS in the same migration series;
- grant only the Data API role privileges required by existing RLS policy intent;
- grant service-role access only for Edge Functions or operator jobs that use the
  Data API;
- do not use broad `ALTER DEFAULT PRIVILEGES` or `GRANT ... ON ALL TABLES`
  defaults as a substitute for per-table review.

The audit checks exact execute grants and `search_path` for every reviewed `public` `SECURITY DEFINER` function. New `SECURITY DEFINER` functions must be added to the audit script with a written note explaining why elevated execution is required; marketplace browse page RPCs and service-role-only browse-index refresh functions are intentionally reviewed there.

For CI, prefer a direct database connection string secret:

- `SUPABASE_DB_AUDIT_URL`

The `protocol-release-gate` workflow runs this audit when that secret is configured.

## Profile Reputation View Audit

The profile reputation audit entrypoint is:

- `npm run audit:profile-reputation-view`

It performs anon, authenticated, and service-role read checks against `public.profile_reputation_summaries`. The authenticated check requires either a valid `SUPABASE_AUTHENTICATED_JWT` for the target project or a JWT signing secret that actually matches that project. If the generated authenticated token returns `PGRST301`, stop and correct the audit credential source outside the repository; do not infer, print, or rotate secrets from this workspace.

## Output Folders

- `supabase/audit/artifacts/`: current generated reports from active probes.
- `supabase/audit/archive/json/`: retained historical JSON outputs kept only for audit history.
- `supabase/audit/reference/`: retained static captures, baselines, and derived verification references.
- `supabase/audit/reference/batch1/`: raw table/index stats and derived expected-table summaries.
- `supabase/audit/reference/foundry/`: retained foundry signature or source-reference snapshots.

## Negative Security Probes

These scripts intentionally keep malformed or mismatched auth cases because they validate fail-closed behavior rather than successful bridge issuance:

- `smoke_wallet_claim_security.cjs`
- `test_h1_claim_bridge_http.cjs`
