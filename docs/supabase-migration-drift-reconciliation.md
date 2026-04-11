# Supabase Migration Drift Reconciliation

This repo previously drifted from the linked Supabase project because remote migration history contained versions `000053` through `000058`, while the local `supabase/migrations` folder skipped directly from `000052` to `000059`.

That state is unsafe for normal sync workflows:

- `npx supabase migration list` reports remote-only versions.
- Blind `npx supabase db push` can try to replay later migrations against an incomplete local history.
- Historical spec docs were not reliable enough to reconstruct the missing files. In this case, the remote names for `000057` and `000058` did not match stale docs.

## Reconciled Versions

The missing local files were backfilled from the remote migration tracker with these exact version and name pairs:

- `000053_rate_limit_atomic_and_protocol_receipts.sql`
- `000054_m2m_wallet_relational_tables.sql`
- `000055_rls_security_hardening.sql`
- `000056_security_audit_log.sql`
- `000057_api_keys_handler_support.sql`
- `000058_ai_threads_rls_and_rpc.sql`

## Source Of Truth

When repo history is missing migration files, use the linked database history table instead of guessing from docs:

```sql
select version, name, array_length(statements, 1) as statement_count
from supabase_migrations.schema_migrations
where version between '000053' and '000058'
order by version;
```

To recover the SQL body for one version:

```sql
select array_to_string(statements, ';' || chr(10) || chr(10)) || ';' as sql
from supabase_migrations.schema_migrations
where version = '000053';
```

The important fields are:

- `version`
- `name`
- `statements`

## Safe Workflow For Future Drift

1. Run `npx supabase migration list` before any repair or push.
2. If remote-only versions appear, stop. Do not run `npx supabase db push` yet.
3. Query `supabase_migrations.schema_migrations` on the linked database to recover the missing `version`, `name`, and `statements`.
4. Recreate the missing local files with the exact remote version and name.
5. Re-run `npx supabase migration list` and confirm local and remote history align.
6. Only after alignment should normal deploy steps continue.

## Notes

- `000062_c18_profile_reputation_summary_precision_fix.sql` was applied remotely after this drift investigation and repaired into remote migration history.
- Post-reconciliation security audit found `public.increment_thread_message_count(text)` exposed `EXECUTE` to `PUBLIC`, `anon`, and `authenticated` while running as `SECURITY DEFINER`; this is tightened in `000063_harden_helper_function_grants.sql`.
- Follow-up audit of `public` SECURITY DEFINER functions keeps intentional marketplace RPCs public to `anon` and `authenticated`, removes redundant owner policies from `000052`, and narrows internal helper execute grants in `000064_rls_policy_cleanup_and_public_rpc_audit.sql`.
- Treat `schema_migrations` as the authoritative recovery source for missing historical files.
- Treat old design docs as secondary context only.