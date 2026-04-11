import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const APP_FUNCTION_RULES = new Map([
  ['asset_catalog_metadata_defaults_v1(asset assets_catalog)', { roles: ['postgres', 'service_role'], searchPath: 'public' }],
  ['assets_catalog_apply_metadata_defaults_v1()', { roles: ['postgres', 'service_role'], searchPath: 'public' }],
  ['atp2_is_conversation_participant_v1(p_conversation_id uuid)', { roles: ['authenticated', 'postgres', 'service_role'], searchPath: 'public' }],
  ['get_asset_listing_stats_v1(p_asset_uids text[])', { roles: ['anon', 'authenticated', 'postgres', 'service_role'], searchPath: 'public' }],
  ['increment_thread_message_count(tid text)', { roles: ['postgres', 'service_role'], searchPath: 'public' }],
  ['rate_limit_cleanup()', { roles: ['postgres', 'service_role'], searchPath: 'public' }],
  ['rate_limit_increment(p_scope_key text, p_endpoint text, p_wallet text, p_window_start timestamp with time zone)', { roles: ['postgres', 'service_role'], searchPath: 'public' }],
  ['record_asset_view_v1(p_asset_uid text, p_viewer_key text, p_wallet_address text)', { roles: ['anon', 'authenticated', 'postgres', 'service_role'], searchPath: 'public' }],
  ['rls_auto_enable()', { roles: ['anon', 'authenticated', 'postgres', 'public', 'service_role'], searchPath: 'pg_catalog' }],
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
  for (const entry of proconfig.split(',')) {
    const [key, value] = entry.split('=', 2);
    if (key === 'search_path') return value || null;
  }
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

for (const row of rows) {
  const functionKey = formatFunctionKey(row);
  if (IGNORED_FUNCTION_KEYS.has(functionKey)) {
    continue;
  }

  const expected = APP_FUNCTION_RULES.get(functionKey);
  if (!expected) {
    findings.push(`Unexpected SECURITY DEFINER function in public: ${functionKey}`);
    continue;
  }

  seen.add(functionKey);

  const actualRoles = parseExecuteRoles(row.proacl);
  const expectedRoles = new Set(expected.roles);
  if (!setsEqual(actualRoles, expectedRoles)) {
    findings.push(
      `${functionKey} execute grants mismatch. expected=[${sorted(expectedRoles).join(', ')}] actual=[${sorted(actualRoles).join(', ')}]`,
    );
  }

  const actualSearchPath = parseSearchPath(row.proconfig);
  if (actualSearchPath !== expected.searchPath) {
    findings.push(
      `${functionKey} search_path mismatch. expected=${expected.searchPath} actual=${actualSearchPath ?? 'NULL'}`,
    );
  }
}

for (const functionKey of APP_FUNCTION_RULES.keys()) {
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
  findings,
  pass: findings.length === 0,
};

console.log(JSON.stringify(summary, null, 2));
if (findings.length > 0) {
  process.exit(1);
}