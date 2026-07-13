import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const APP_FUNCTION_RULES = new Map([
  ['asset_catalog_metadata_defaults_v1(asset assets_catalog)', { roles: ['postgres', 'service_role'], searchPath: 'public' }],
  ['assets_catalog_apply_metadata_defaults_v1()', { roles: ['postgres', 'service_role'], searchPath: 'public' }],
  ['assets_catalog_projection_is_visible_v1(p_asset_id uuid, p_chain_id bigint, p_contract_address text, p_token_id text)', { roles: ['anon', 'authenticated', 'postgres', 'service_role'], searchPath: 'public' }],
  ['agent_thread_sync_stats(tid text)', { roles: ['postgres', 'service_role'], searchPath: 'public' }],
  ['atp2_claim_m2m_delegate_invite_v1(p_invite_id text, p_claimed_wallet_address text, p_delegate_id text)', { roles: ['postgres', 'service_role'], searchPath: 'pg_catalog, public' }],
  ['atp2_create_m2m_delegate_invite_v1(p_id text, p_root_wallet_address text, p_expires_at timestamp with time zone)', { roles: ['postgres', 'service_role'], searchPath: 'pg_catalog, public' }],
  ['atp2_is_conversation_participant_v1(p_conversation_id uuid)', { roles: ['authenticated', 'postgres', 'service_role'], searchPath: 'public' }],
  ['atp2_register_m2m_managed_delegate_v1(p_id text, p_root_wallet_address text, p_delegate_address text, p_label text, p_iv_hex text, p_ciphertext_hex text)', { roles: ['postgres', 'service_role'], searchPath: 'pg_catalog, public' }],
  ['get_asset_listing_stats_v1(p_asset_uids text[])', { roles: ['anon', 'authenticated', 'postgres', 'service_role'], searchPath: 'public' }],
  ['increment_thread_message_count(tid text)', { roles: ['postgres', 'service_role'], searchPath: 'public' }],
  ['protocol_projection_is_visible_v1(p_entity_type text, p_chain_id bigint, p_contract_address text, p_entity_uid text)', { roles: ['anon', 'authenticated', 'postgres', 'service_role'], searchPath: 'public' }],
  ['rate_limit_cleanup()', { roles: ['postgres', 'service_role'], searchPath: 'public' }],
  ['rate_limit_increment(p_scope_key text, p_endpoint text, p_wallet text, p_window_start timestamp with time zone)', { roles: ['postgres', 'service_role'], searchPath: 'public' }],
  ['record_asset_view_v1(p_asset_uid text, p_viewer_key text, p_wallet_address text)', { roles: ['anon', 'authenticated', 'postgres', 'service_role'], searchPath: 'public' }],
  [
    'submit_profile_review_v2(p_chain_id bigint, p_marketplace_contract text, p_order_uid text, p_reviewed_wallet text, p_rating_type text, p_overall_rating numeric, p_communication_rating numeric, p_delivery_rating numeric, p_accuracy_rating numeric, p_review_text text, p_asset_uid text, p_asset_name text)',
    { roles: ['authenticated', 'postgres'], searchPath: 'pg_catalog, public' },
  ],
]);

const REVIEWED_PRIVILEGED_FUNCTION_RULES = new Map([
  [
    'configure_order_autotime_keeper_cron(p_schedule text, p_job_name text, p_limit integer, p_batch_size integer, p_sync_receipts boolean)',
    {
      roles: ['postgres', 'service_role'],
      searchPath: ['public', 'public, extensions'],
      note: 'Operator-only cron scheduler. Reads Vault secrets and programs pg_cron + pg_net jobs.',
    },
  ],
  [
    'disable_order_autotime_keeper_cron(p_job_name text)',
    {
      roles: ['postgres', 'service_role'],
      searchPath: ['public', 'public, extensions'],
      note: 'Operator-only cron control surface for disabling the autotime keeper job.',
    },
  ],
  [
    'get_personalized_marketplace_assets_v1(p_asset_uids text[], p_surface text, p_limit integer)',
    {
      roles: ['anon', 'authenticated', 'postgres', 'service_role'],
      searchPath: 'public',
      note: 'Viewer-aware ranking RPC. SECURITY DEFINER is intentional because it reads ranking config and affinity tables while binding viewer identity to JWT claims, not caller-supplied parameters.',
    },
  ],
  [
    'get_marketplace_catalog_page_v1(p_limit integer, p_cursor_updated_at timestamp with time zone, p_cursor_id uuid, p_search_query text, p_category text, p_chain_id bigint, p_blockchain text, p_verified_only boolean)',
    {
      roles: ['anon', 'authenticated', 'postgres', 'service_role'],
      searchPath: 'public',
      note: 'Public catalog browse RPC. SECURITY DEFINER is intentional because the materialized browse index is service-role-readable only; inputs are typed filters and search text, not dynamic SQL.',
    },
  ],
  [
    'get_marketplace_collection_page_v1(p_limit integer, p_cursor_score numeric, p_cursor_updated_at timestamp with time zone, p_cursor_id text, p_search_query text, p_category text, p_verified_only boolean, p_sort text)',
    {
      roles: ['anon', 'authenticated', 'postgres', 'service_role'],
      searchPath: 'public',
      note: 'Public collection browse RPC. SECURITY DEFINER is intentional because it reads the protected collection browse index and binds optional personalization to JWT claim helpers.',
    },
  ],
  [
    'get_marketplace_profile_page_v1(p_limit integer, p_cursor_score numeric, p_cursor_updated_at timestamp with time zone, p_cursor_user_id uuid, p_search_query text, p_verified_only boolean, p_sort text)',
    {
      roles: ['anon', 'authenticated', 'postgres', 'service_role'],
      searchPath: 'public',
      note: 'Public profile browse RPC. SECURITY DEFINER is intentional because it reads the protected profile browse index and binds optional personalization to JWT claim helpers.',
    },
  ],
  [
    'refresh_marketplace_asset_browse_index_v1()',
    {
      roles: ['postgres', 'service_role'],
      searchPath: 'public',
      note: 'Service-role-only maintenance RPC for refreshing the marketplace asset materialized browse index.',
    },
  ],
  [
    'refresh_marketplace_collection_browse_index_v1()',
    {
      roles: ['postgres', 'service_role'],
      searchPath: 'public',
      note: 'Service-role-only maintenance RPC for refreshing the marketplace collection materialized browse index.',
    },
  ],
  [
    'refresh_marketplace_profile_browse_index_v1()',
    {
      roles: ['postgres', 'service_role'],
      searchPath: 'public',
      note: 'Service-role-only maintenance RPC for refreshing the marketplace profile materialized browse index.',
    },
  ],
]);

const IGNORED_FUNCTION_KEYS = new Set([
  'st_estimatedextent(text, text)',
  'st_estimatedextent(text, text, text)',
  'st_estimatedextent(text, text, text, boolean)',
]);

const SQL = `
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as returns,
  p.prosecdef,
  coalesce(array_to_string(p.proacl, ','), 'NULL') as proacl,
  coalesce(array_to_string(p.proconfig, ','), 'NULL') as proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and p.prosecdef = true
order by p.proname, args;
`;

function parseArgs(argv) {
  const named = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;
    const [key, inline] = value.slice(2).split('=', 2);
    if (inline !== undefined) {
      named.set(key, inline);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      named.set(key, next);
      index += 1;
      continue;
    }
    named.set(key, 'true');
  }
  return named;
}

function parseSupabaseJson(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) throw new Error('Supabase audit query returned empty output.');
  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Could not locate JSON payload in Supabase output:\n${trimmed}`);
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

function parseExecuteRoles(proacl) {
  if (!proacl || proacl === 'NULL') {
    return new Set(['public']);
  }

  const roles = new Set();
  for (const entry of proacl.split(',')) {
    const [rawRole, privileges] = entry.split('=');
    if (!privileges || !privileges.includes('X')) continue;
    roles.add(rawRole === '' ? 'public' : rawRole);
  }
  return roles;
}

function parseSearchPath(proconfig) {
  if (!proconfig || proconfig === 'NULL') return null;
  const marker = 'search_path=';
  const markerIndex = proconfig.indexOf(marker);
  if (markerIndex >= 0) return proconfig.slice(markerIndex + marker.length).trim() || null;
  return null;
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function setsEqual(left, right) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function searchPathMatches(expected, actual) {
  if (Array.isArray(expected)) {
    return expected.includes(actual);
  }
  return expected === actual;
}

function formatFunctionKey(row) {
  return `${row.proname}(${row.args || ''})`;
}

function runProcess(command, args) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function resolveNpxCliPath() {
  const candidate = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');
  return existsSync(candidate) ? candidate : null;
}

function runSupabaseQuery(queryArgs) {
  const npxCliPath = resolveNpxCliPath();
  if (npxCliPath) {
    const npxCliResult = runProcess(process.execPath, [npxCliPath, 'supabase', ...queryArgs]);
    if (!npxCliResult.error) {
      return npxCliResult;
    }

    if (npxCliResult.error.code && npxCliResult.error.code !== 'ENOENT') {
      return npxCliResult;
    }
  }

  const npxResult = runProcess('npx', ['supabase', ...queryArgs]);
  if (!npxResult.error) {
    return npxResult;
  }

  if (npxResult.error.code && npxResult.error.code !== 'ENOENT') {
    return npxResult;
  }

  return runProcess('supabase', queryArgs);
}

const namedArgs = parseArgs(process.argv.slice(2));
const dbUrl = String(namedArgs.get('db-url') || process.env.SUPABASE_DB_AUDIT_URL || process.env.SUPABASE_DB_URL || '').trim();
const useLinked = namedArgs.get('linked') === 'true' || (!dbUrl && namedArgs.get('linked') !== 'false');

if (!dbUrl && !useLinked) {
  console.error('Usage: node scripts/audit-supabase-security-definer.mjs [--db-url <postgres-url> | --linked]');
  process.exit(1);
}

const normalizedSql = SQL.replace(/\s+/g, ' ').trim().replace(/;\s*$/, '');

const queryArgs = ['db', 'query', '--agent=no', '-o', 'json'];
if (dbUrl) {
  queryArgs.push('--db-url', dbUrl);
} else {
  queryArgs.push('--linked');
}
queryArgs.push(normalizedSql);

const result = runSupabaseQuery(queryArgs);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'Supabase audit query failed.');
  process.exit(result.status || 1);
}

const rows = parseSupabaseJson(result.stdout);
const findings = [];
const seen = new Set();
const reviewedPrivileged = [];

for (const row of rows) {
  const functionKey = formatFunctionKey(row);
  if (IGNORED_FUNCTION_KEYS.has(functionKey)) {
    continue;
  }

  const expected = APP_FUNCTION_RULES.get(functionKey) || REVIEWED_PRIVILEGED_FUNCTION_RULES.get(functionKey);
  if (!expected) {
    findings.push(`Unexpected SECURITY DEFINER function in public: ${functionKey}`);
    continue;
  }

  seen.add(functionKey);
  if (REVIEWED_PRIVILEGED_FUNCTION_RULES.has(functionKey)) {
    reviewedPrivileged.push({
      function: functionKey,
      note: REVIEWED_PRIVILEGED_FUNCTION_RULES.get(functionKey).note,
    });
  }

  const actualRoles = parseExecuteRoles(row.proacl);
  const expectedRoles = new Set(expected.roles);
  if (!setsEqual(actualRoles, expectedRoles)) {
    findings.push(
      `${functionKey} execute grants mismatch. expected=[${sorted(expectedRoles).join(', ')}] actual=[${sorted(actualRoles).join(', ')}]`,
    );
  }

  const actualSearchPath = parseSearchPath(row.proconfig);
  if (!searchPathMatches(expected.searchPath, actualSearchPath)) {
    const expectedLabel = Array.isArray(expected.searchPath)
      ? expected.searchPath.join(' | ')
      : expected.searchPath;
    findings.push(
      `${functionKey} search_path mismatch. expected=${expectedLabel} actual=${actualSearchPath ?? 'NULL'}`,
    );
  }
}

for (const functionKey of [...APP_FUNCTION_RULES.keys(), ...REVIEWED_PRIVILEGED_FUNCTION_RULES.keys()]) {
  if (!seen.has(functionKey) && !IGNORED_FUNCTION_KEYS.has(functionKey)) {
    findings.push(`Expected SECURITY DEFINER function missing from audit result: ${functionKey}`);
  }
}

const summary = {
  auditedAt: new Date().toISOString(),
  source: dbUrl ? 'db-url' : 'linked',
  auditedFunctions: rows.length,
  checkedFunctions: sorted(seen),
  ignoredFunctions: sorted(IGNORED_FUNCTION_KEYS),
  reviewedPrivilegedFunctions: reviewedPrivileged,
  findings,
  pass: findings.length === 0,
};

console.log(JSON.stringify(summary, null, 2));
if (findings.length > 0) {
  process.exit(1);
}
