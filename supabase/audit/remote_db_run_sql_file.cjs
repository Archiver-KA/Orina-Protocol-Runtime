/*
  Execute a SQL file against a remote Postgres DB (Supabase direct DB host) without Supabase CLI.
  Use for read-only audits or controlled schema apply after manual project creation.

  Usage:
    node supabase/audit/remote_db_run_sql_file.cjs <project_ref> <db_password> <sql_file>

  Notes:
    - Connects as postgres to db.<project_ref>.supabase.co:5432/postgres
    - Runs the SQL file as a single simple query (multiple statements allowed)
    - Does not manage migrations history table
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
  let sqlFile = null;
  let connectionString = process.env.SUPABASE_DB_URL || null;

  if (argv[0] === '--db-url') {
    connectionString = argv[1] || null;
    if (argv[2] === '--password') {
      dbPassword = argv[3] || null;
      sqlFile = argv[4] || null;
    } else {
      sqlFile = argv[2] || null;
    }
  } else if (argv[0] === '--db-url-file') {
    connectionString = fs.readFileSync(path.resolve(process.cwd(), argv[1] || ''), 'utf8').trim();
    if (argv[2] === '--password') {
      dbPassword = argv[3] || null;
      sqlFile = argv[4] || null;
    } else {
      sqlFile = argv[2] || null;
    }
  } else {
    [projectRef, dbPassword, sqlFile] = argv;
  }

  connectionString = applyPasswordToConnectionStringIfMissing(connectionString, dbPassword);

  if ((!connectionString && (!projectRef || !dbPassword)) || !sqlFile) {
    console.error('Usage: node supabase/audit/remote_db_run_sql_file.cjs <project_ref> <db_password> <sql_file>');
    console.error('   or: node supabase/audit/remote_db_run_sql_file.cjs --db-url <postgres_connection_uri> [--password <db_password>] <sql_file>');
    console.error('   or: node supabase/audit/remote_db_run_sql_file.cjs --db-url-file <path_to_uri_file> [--password <db_password>] <sql_file>');
    process.exit(2);
  }

  const resolvedFile = path.resolve(process.cwd(), sqlFile);
  if (!fs.existsSync(resolvedFile)) {
    console.error(`SQL_FILE_NOT_FOUND ${resolvedFile}`);
    process.exit(2);
  }

  const sql = fs.readFileSync(resolvedFile, 'utf8');
  const client = connectionString
    ? new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
        application_name: 'atp2_remote_db_sql_runner',
        statement_timeout: 120000,
        connectionTimeoutMillis: 15000,
      })
    : new Client({
        host: `db.${projectRef}.supabase.co`,
        port: 5432,
        user: 'postgres',
        password: dbPassword,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        application_name: 'atp2_remote_db_sql_runner',
        statement_timeout: 120000,
        connectionTimeoutMillis: 15000,
      });

  try {
    await client.connect();
    const result = await client.query(sql);
    console.error(`SQL_OK file=${sqlFile}`);
    const results = Array.isArray(result) ? result : [result];
    for (const [index, item] of results.entries()) {
      console.error(`RESULT ${index + 1} COMMAND ${item.command || 'UNKNOWN'}`);
      console.error(`RESULT ${index + 1} ROW_COUNT ${typeof item.rowCount === 'number' ? item.rowCount : 'n/a'}`);
      if (Array.isArray(item.rows) && item.rows.length > 0) {
        console.error(JSON.stringify(item.rows, null, 2));
      }
    }
  } catch (err) {
    console.error('SQL_RUN_ERROR');
    console.error(err && err.message ? err.message : String(err));
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
