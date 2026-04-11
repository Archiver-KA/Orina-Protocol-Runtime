/*
  Read-only Supabase REST audit using anon/public API key (JWT).
  This does NOT provide full DB schema inspection; it checks API reachability
  and table endpoint behavior under anon role (RLS/grants/public exposure).
*/

const fs = require('fs');
const path = require('path');
const { buildActiveArtifactPath } = require('./audit_artifact_paths.cjs');

function b64urlToUtf8(segment) {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 ? '='.repeat(4 - (normalized.length % 4)) : '';
  return Buffer.from(normalized + pad, 'base64').toString('utf8');
}

function decodeJwtClaims(jwt) {
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(b64urlToUtf8(parts[1]));
  } catch {
    return null;
  }
}

async function requestJson(url, headers, method = 'GET') {
  const res = await fetch(url, {
    method,
    headers,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    bodyText: text,
    bodyJson: json,
  };
}

async function checkTable(baseUrl, headers, table) {
  const url = `${baseUrl}/rest/v1/${table}?select=*&limit=1`;
  const res = await requestJson(url, headers, 'GET');

  let inference = 'unknown';
  if (res.status === 200) {
    inference = 'readable_or_exposed';
  } else if (res.status === 401 || res.status === 403) {
    inference = 'exists_or_exposed_but_denied';
  } else if (res.status === 404) {
    inference = 'likely_missing_or_not_exposed';
  } else if (res.bodyJson && res.bodyJson.code === '42P01') {
    inference = 'missing_relation';
  }

  return {
    table,
    inference,
    status: res.status,
    ok: res.ok,
    code: res.bodyJson && res.bodyJson.code ? res.bodyJson.code : null,
    message: res.bodyJson && res.bodyJson.message ? res.bodyJson.message : null,
    details: res.bodyJson && res.bodyJson.details ? res.bodyJson.details : null,
    sample_row_count: Array.isArray(res.bodyJson) ? res.bodyJson.length : null,
  };
}

async function main() {
  const projectRef = process.argv[2];
  const anonKey = process.argv[3];
  if (!projectRef || !anonKey) {
    console.error('Usage: node inspect_supabase_rest_anon.cjs <project_ref> <anon_jwt>');
    process.exit(2);
  }

  const claims = decodeJwtClaims(anonKey);
  const baseUrl = `https://${projectRef}.supabase.co`;
  const headers = {
    apikey: anonKey,
    authorization: `Bearer ${anonKey}`,
    accept: 'application/json',
  };

  const publicReadCandidates = [
    'profiles',
    'assets_catalog',
    'asset_media',
    'asset_tags',
    'asset_tag_map',
    'community_posts',
    'community_comments',
    'protocol_assets',
    'protocol_asset_events',
    'protocol_orders',
    'protocol_order_events',
  ];

  const shouldBePrivateOrDeferred = [
    'notifications',
    'user_preferences',
    'user_favorites',
    'user_watchlist',
    'watchlist_alerts',
    'wallet_auth_challenges',
    'wallet_sessions',
    'conversations',
    'conversation_participants',
    'messages',
  ];

  const rootRes = await requestJson(`${baseUrl}/rest/v1/`, headers);
  const authSettingsRes = await requestJson(`${baseUrl}/auth/v1/settings`, { apikey: anonKey, accept: 'application/json' });

  const tableChecks = [];
  for (const t of [...publicReadCandidates, ...shouldBePrivateOrDeferred]) {
    try {
      tableChecks.push(await checkTable(baseUrl, headers, t));
    } catch (err) {
      tableChecks.push({
        table: t,
        inference: 'request_error',
        status: null,
        ok: false,
        code: null,
        message: err && err.message ? err.message : String(err),
        details: null,
        sample_row_count: null,
      });
    }
  }

  const readablePublicCandidates = tableChecks
    .filter((t) => publicReadCandidates.includes(t.table) && t.status === 200)
    .map((t) => t.table);
  const missingPublicCandidates = tableChecks
    .filter((t) => publicReadCandidates.includes(t.table) && (t.code === '42P01' || t.inference === 'missing_relation'))
    .map((t) => t.table);
  const deferredMessagingVisible = tableChecks
    .filter((t) => ['conversations', 'conversation_participants', 'messages'].includes(t.table) && t.status === 200)
    .map((t) => t.table);

  const report = {
    audited_at_utc: new Date().toISOString(),
    project_ref: projectRef,
    audit_mode: 'anon_rest_readonly',
    limitation: 'Anon key can verify API surface access and infer some table existence; it cannot provide full DB schema inspection.',
    jwt_claims: claims,
    endpoints: {
      rest_root: {
        status: rootRes.status,
        ok: rootRes.ok,
        code: rootRes.bodyJson && rootRes.bodyJson.code ? rootRes.bodyJson.code : null,
        message: rootRes.bodyJson && rootRes.bodyJson.message ? rootRes.bodyJson.message : null,
      },
      auth_settings: {
        status: authSettingsRes.status,
        ok: authSettingsRes.ok,
      },
    },
    table_checks: tableChecks,
    summary: {
      public_read_candidates_readable: readablePublicCandidates,
      public_read_candidates_missing_or_not_exposed: missingPublicCandidates,
      deferred_messaging_tables_readable_under_anon: deferredMessagingVisible,
    },
    strategy_note: 'Still follow Option A (new project). This audit is only for drift/runtime awareness on the old project.',
  };

  const outPath = buildActiveArtifactPath(`${projectRef}_anon_rest_audit.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.error(`ANON_AUDIT_OK ${outPath}`);
  console.error(`REST_ROOT ${rootRes.status}`);
  console.error(`AUTH_SETTINGS ${authSettingsRes.status}`);
  console.error(`PUBLIC_READABLE ${readablePublicCandidates.length}/${publicReadCandidates.length}`);
  if (readablePublicCandidates.length) {
    console.error(`PUBLIC_READABLE_LIST ${readablePublicCandidates.join(', ')}`);
  }
  if (missingPublicCandidates.length) {
    console.error(`PUBLIC_MISSING_OR_NOT_EXPOSED_LIST ${missingPublicCandidates.join(', ')}`);
  }
  if (deferredMessagingVisible.length) {
    console.error(`DEFERRED_MESSAGING_VISIBLE ${deferredMessagingVisible.join(', ')}`);
  }
}

main().catch((err) => {
  console.error('ANON_AUDIT_ERROR');
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});

