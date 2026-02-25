/*
  Read-only remote schema audit for an existing Supabase Postgres project.
  Compares runtime public-schema tables against ATP2 D1 expected tables.
*/

const fs = require('fs');
const path = require('path');

function applyPasswordToConnectionStringIfMissing(connectionString, password) {
  if (!connectionString || !password) return connectionString;
  try {
    const url = new URL(connectionString);
    if (!url.password) {
      url.password = password;
      return url.toString();
    }
  } catch {
    // ignore parse errors and fall back
  }
  return connectionString;
}

async function main() {
  let Client;
  try {
    ({ Client } = require('pg'));
  } catch (err) {
    console.error('MISSING_PG_PACKAGE');
    console.error('Run with: npx -p pg node supabase/audit/inspect_remote_schema.cjs');
    process.exit(2);
  }

  const argv = process.argv.slice(2);
  let projectRef = process.env.SUPABASE_PROJECT_REF || null;
  let dbPassword = process.env.SUPABASE_DB_PASSWORD || null;
  let connectionString = process.env.SUPABASE_DB_URL || null;

  if (argv[0] === '--db-url' && argv[1]) {
    connectionString = argv[1];
    if (argv[2] === '--password' && argv[3]) dbPassword = argv[3];
  } else if (argv[0] === '--db-url-file' && argv[1]) {
    connectionString = fs.readFileSync(path.resolve(process.cwd(), argv[1]), 'utf8').trim();
    if (argv[2] === '--password' && argv[3]) dbPassword = argv[3];
  } else if (argv[0] && argv[1]) {
    projectRef = argv[0];
    dbPassword = argv[1];
  }

  connectionString = applyPasswordToConnectionStringIfMissing(connectionString, dbPassword);

  if (!connectionString && (!projectRef || !dbPassword)) {
    console.error('Usage: node inspect_remote_schema.cjs <project_ref> <db_password>');
    console.error('   or: node inspect_remote_schema.cjs --db-url <postgres_connection_uri> [--password <db_password>]');
    console.error('   or: node inspect_remote_schema.cjs --db-url-file <path_to_uri_file> [--password <db_password>]');
    process.exit(2);
  }

  if (!projectRef && connectionString) {
    try {
      const u = new URL(connectionString);
      const host = u.hostname || '';
      const refMatch = host.match(/(?:db\.|pooler\.supabase\.com$|\.supabase\.co$)/i);
      if (!refMatch) {
        // best effort only; keep null if not derivable
      }
    } catch {
      // ignore
    }
  }

  const client = connectionString
    ? new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
        statement_timeout: 15000,
        connectionTimeoutMillis: 15000,
        application_name: 'atp2_schema_audit_readonly',
      })
    : new Client({
        host: `db.${projectRef}.supabase.co`,
        port: 5432,
        user: 'postgres',
        password: dbPassword,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        statement_timeout: 15000,
        connectionTimeoutMillis: 15000,
        application_name: 'atp2_schema_audit_readonly',
      });

  const expectedTables = [
    'wallet_auth_challenges',
    'wallet_sessions',
    'profiles',
    'user_preferences',
    'user_badges',
    'assets_catalog',
    'asset_media',
    'asset_tags',
    'asset_tag_map',
    'user_follows',
    'user_favorites',
    'user_watchlist',
    'watchlist_alerts',
    'notifications',
    'community_posts',
    'community_comments',
    'community_reactions',
    'protocol_assets',
    'protocol_asset_events',
    'protocol_orders',
    'protocol_order_events',
    'asset_protocol_links',
  ];

  const deferredTables = [
    'conversations',
    'conversation_participants',
    'messages',
  ];

  try {
    await client.connect();

    const [
      tableRes,
      columnRes,
      indexRes,
      extensionRes,
      functionRes,
      migrationsRes,
    ] = await Promise.all([
      client.query(`
        select table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_type = 'BASE TABLE'
        order by table_name
      `),
      client.query(`
        select table_name, column_name, data_type, udt_name, is_nullable
        from information_schema.columns
        where table_schema = 'public'
        order by table_name, ordinal_position
      `),
      client.query(`
        select
          schemaname,
          tablename,
          indexname,
          indexdef
        from pg_indexes
        where schemaname = 'public'
        order by tablename, indexname
      `),
      client.query(`
        select extname
        from pg_extension
        order by extname
      `),
      client.query(`
        select p.proname
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
        order by p.proname
      `),
      client.query(`
        select table_schema, table_name
        from information_schema.tables
        where table_schema in ('supabase_migrations', 'public')
          and table_name = 'schema_migrations'
      `),
    ]);

    const runtimeTables = tableRes.rows.map((r) => r.table_name);
    const runtimeTableSet = new Set(runtimeTables);
    const expectedSet = new Set(expectedTables);
    const deferredSet = new Set(deferredTables);

    const missingExpected = expectedTables.filter((t) => !runtimeTableSet.has(t));
    const presentExpected = expectedTables.filter((t) => runtimeTableSet.has(t));
    const presentDeferred = deferredTables.filter((t) => runtimeTableSet.has(t));
    const unexpectedPublicTables = runtimeTables.filter(
      (t) => !expectedSet.has(t) && !deferredSet.has(t)
    );

    const columnsByTable = {};
    for (const row of columnRes.rows) {
      (columnsByTable[row.table_name] ||= []).push({
        column_name: row.column_name,
        data_type: row.data_type,
        udt_name: row.udt_name,
        is_nullable: row.is_nullable,
      });
    }

    const indexesByTable = {};
    for (const row of indexRes.rows) {
      (indexesByTable[row.tablename] ||= []).push({
        indexname: row.indexname,
        indexdef: row.indexdef,
      });
    }

    const report = {
      audited_at_utc: new Date().toISOString(),
      project_ref: projectRef || 'from_db_url',
      mode: 'read-only runtime schema audit',
      strategy_note: 'Option A (new project) remains recommended; this audit is for drift awareness only.',
      expected_tables_count: expectedTables.length,
      runtime_public_tables_count: runtimeTables.length,
      present_expected,
      missing_expected,
      present_deferred_messaging_tables: presentDeferred,
      unexpected_public_tables: unexpectedPublicTables,
      extensions: extensionRes.rows.map((r) => r.extname),
      public_functions: functionRes.rows.map((r) => r.proname),
      schema_migrations_table_presence: migrationsRes.rows,
      sample_columns: Object.fromEntries(
        Object.entries(columnsByTable)
          .filter(([table]) =>
            [
              'profiles',
              'notifications',
              'community_posts',
              'protocol_orders',
              'wallet_sessions',
            ].includes(table)
          )
      ),
      indexes_summary_counts: Object.fromEntries(
        Object.keys(indexesByTable).sort().map((t) => [t, indexesByTable[t].length])
      ),
      runtime_public_tables: runtimeTables,
    };

    const outDir = path.join(process.cwd(), 'supabase', 'audit');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${(projectRef || 'from_db_url')}_runtime_schema_audit.json`);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

    console.error(`AUDIT_OK ${outPath}`);
    console.error(`RUNTIME_TABLES ${runtimeTables.length}`);
    console.error(`EXPECTED_PRESENT ${presentExpected.length}/${expectedTables.length}`);
    console.error(`EXPECTED_MISSING ${missingExpected.length}`);
    if (missingExpected.length) {
      console.error(`MISSING_LIST ${missingExpected.join(', ')}`);
    }
    console.error(`DEFERRED_MESSAGING_PRESENT ${presentDeferred.length}`);
    if (presentDeferred.length) {
      console.error(`DEFERRED_PRESENT_LIST ${presentDeferred.join(', ')}`);
    }
    console.error(`UNEXPECTED_PUBLIC_TABLES ${unexpectedPublicTables.length}`);
    if (unexpectedPublicTables.length) {
      console.error(`UNEXPECTED_LIST ${unexpectedPublicTables.join(', ')}`);
    }
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error('AUDIT_ERROR');
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
