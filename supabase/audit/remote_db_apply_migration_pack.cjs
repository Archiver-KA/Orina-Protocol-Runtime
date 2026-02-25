/*
  Apply ATP2 migration pack directly to a remote Supabase Postgres DB without Supabase CLI login.
  Intended for Option A (new project) after manual project creation in Dashboard.

  Usage:
    node supabase/audit/remote_db_apply_migration_pack.cjs <project_ref> <db_password> [from] [to]

  Examples:
    node ... <ref> <pw>                # apply all .sql files in supabase/migrations
    node ... <ref> <pw> 000001 000003  # apply a subset range (inclusive by filename prefix)

  Safety:
    - No automatic rollback
    - No migration-history bookkeeping
    - Stops on first error
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
    // ignore parse errors
  }
  return connectionString;
}

async function main() {
  let Client;
  try {
    ({ Client } = require('pg'));
  } catch (err) {
    console.error('MISSING_PG_PACKAGE');
    console.error('Install once (local to audit tools): npm install --prefix supabase\\audit pg --no-save');
    process.exit(2);
  }

  const argv = process.argv.slice(2);
  let projectRef = null;
  let dbPassword = null;
  let fromPrefix = null;
  let toPrefix = null;
  let connectionString = process.env.SUPABASE_DB_URL || null;

  if (argv[0] === '--db-url') {
    connectionString = argv[1] || null;
    if (argv[2] === '--password') {
      dbPassword = argv[3] || null;
      fromPrefix = argv[4] || null;
      toPrefix = argv[5] || null;
    } else {
      fromPrefix = argv[2] || null;
      toPrefix = argv[3] || null;
    }
  } else if (argv[0] === '--db-url-file') {
    connectionString = fs.readFileSync(path.resolve(process.cwd(), argv[1] || ''), 'utf8').trim();
    if (argv[2] === '--password') {
      dbPassword = argv[3] || null;
      fromPrefix = argv[4] || null;
      toPrefix = argv[5] || null;
    } else {
      fromPrefix = argv[2] || null;
      toPrefix = argv[3] || null;
    }
  } else {
    [projectRef, dbPassword, fromPrefix, toPrefix] = argv;
  }

  connectionString = applyPasswordToConnectionStringIfMissing(connectionString, dbPassword);

  if (!connectionString && (!projectRef || !dbPassword)) {
    console.error('Usage: node supabase/audit/remote_db_apply_migration_pack.cjs <project_ref> <db_password> [from] [to]');
    console.error('   or: node supabase/audit/remote_db_apply_migration_pack.cjs --db-url <postgres_connection_uri> [--password <db_password>] [from] [to]');
    console.error('   or: node supabase/audit/remote_db_apply_migration_pack.cjs --db-url-file <path_to_uri_file> [--password <db_password>] [from] [to]');
    process.exit(2);
  }

  const migrationsDir = path.resolve(process.cwd(), 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`MIGRATIONS_DIR_NOT_FOUND ${migrationsDir}`);
    process.exit(2);
  }

  let files = fs.readdirSync(migrationsDir)
    .filter((f) => f.toLowerCase().endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  if (fromPrefix) {
    files = files.filter((f) => f >= `${fromPrefix}` && (!toPrefix || f <= `${toPrefix}`));
  }

  if (files.length === 0) {
    console.error('NO_MIGRATION_FILES_SELECTED');
    process.exit(2);
  }

  const client = connectionString
    ? new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
        application_name: 'atp2_remote_migration_pack_runner',
        statement_timeout: 180000,
        connectionTimeoutMillis: 15000,
      })
    : new Client({
        host: `db.${projectRef}.supabase.co`,
        port: 5432,
        user: 'postgres',
        password: dbPassword,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        application_name: 'atp2_remote_migration_pack_runner',
        statement_timeout: 180000,
        connectionTimeoutMillis: 15000,
      });

  try {
    await client.connect();
    console.error(`CONNECTED project_ref=${projectRef || 'from_db_url'}`);
    console.error(`MIGRATION_FILES ${files.length}`);

    for (const file of files) {
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.error(`APPLY_START ${file}`);
      try {
        await client.query(sql);
        console.error(`APPLY_OK ${file}`);
      } catch (err) {
        console.error(`APPLY_ERROR ${file}`);
        console.error(err && err.message ? err.message : String(err));
        process.exit(1);
      }
    }

    console.error('PACK_APPLY_DONE');
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error('PACK_RUNNER_FATAL');
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
