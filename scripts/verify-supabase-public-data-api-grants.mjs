#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const DATA_API_ROLES = new Set(['anon', 'authenticated', 'service_role']);

function readMigrations() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({
      name,
      text: fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8'),
    }));
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\r\n]*/g, ' ');
}

function normalizeIdent(value) {
  return String(value || '').replace(/^"|"$/g, '').toLowerCase();
}

function collectCreatedTables(migrations) {
  const tables = new Map();
  const createTableRe = /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:(public)\.)?("?[\w]+"?)/gi;

  for (const migration of migrations) {
    const sql = stripSqlComments(migration.text);
    for (const match of sql.matchAll(createTableRe)) {
      const table = normalizeIdent(match[2]);
      if (!tables.has(table)) {
        tables.set(table, {
          table,
          firstMigration: migration.name,
          explicitSchema: Boolean(match[1]),
        });
      }
    }
  }

  return tables;
}

function splitStatements(sql) {
  return stripSqlComments(sql)
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function collectTableGrants(migrations) {
  const grants = new Map();

  for (const migration of migrations) {
    for (const statement of splitStatements(migration.text)) {
      const grantMatch = statement.match(/\bgrant\s+([\s\S]+?)\s+on\s+(?:table\s+)?([\s\S]+?)\s+to\s+([\s\S]+)$/i);
      if (!grantMatch) continue;
      if (/^\s*(function|sequence|schema|routine)\b/i.test(grantMatch[2])) continue;

      const privileges = grantMatch[1]
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
      const roleText = grantMatch[3].toLowerCase();
      const roles = roleText
        .split(',')
        .map((entry) => entry.trim().replace(/\s+with\s+grant\s+option.*$/i, ''))
        .filter((role) => DATA_API_ROLES.has(role));
      if (roles.length === 0) continue;

      const targetText = grantMatch[2];
      for (const target of targetText.matchAll(/\bpublic\.("?[\w]+"?)/gi)) {
        const table = normalizeIdent(target[1]);
        const entry = grants.get(table) || {
          table,
          roles: {},
          migrations: new Set(),
        };
        for (const role of roles) {
          const rolePrivileges = entry.roles[role] || new Set();
          privileges.forEach((privilege) => rolePrivileges.add(privilege));
          entry.roles[role] = rolePrivileges;
        }
        entry.migrations.add(migration.name);
        grants.set(table, entry);
      }
    }
  }

  return grants;
}

function collectPostgisRls(migrations) {
  const rawCombined = migrations.map((migration) => migration.text).join('\n');
  const combined = stripSqlComments(rawCombined);
  return {
    enabled:
      /\balter\s+table\s+public\.spatial_ref_sys\s+enable\s+row\s+level\s+security\b/i.test(combined),
    readPolicy:
      /\bcreate\s+policy\s+spatial_ref_sys_select_reference_v1\b[\s\S]+?\bon\s+public\.spatial_ref_sys\b[\s\S]+?\bfor\s+select\b/i.test(combined),
    selectGrant:
      /\bgrant\s+select\s+on\s+table\s+public\.spatial_ref_sys\s+to\s+anon\s*,\s*authenticated\s*,\s*service_role\b/i.test(combined),
    ownerActionRequired:
      /spatial_ref_sys[\s\S]+?owner\/supabase-admin action/i.test(rawCombined) ||
      /normal migration role cannot alter its RLS state/i.test(rawCombined),
  };
}

function serializeGrant(entry) {
  if (!entry) return null;
  return Object.fromEntries(
    Object.entries(entry.roles)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([role, privileges]) => [role, [...privileges].sort()]),
  );
}

function main() {
  const migrations = readMigrations();
  const createdTables = collectCreatedTables(migrations);
  const grants = collectTableGrants(migrations);
  const missingExplicitGrant = [];

  for (const table of [...createdTables.values()].sort((left, right) => left.table.localeCompare(right.table))) {
    if (!grants.has(table.table)) {
      missingExplicitGrant.push(table);
    }
  }

  const postgisSpatialRefSys = collectPostgisRls(migrations);
  const report = {
    generatedAt: new Date().toISOString(),
    checkedMigrations: migrations.map((migration) => migration.name),
    publicTablesCreated: createdTables.size,
    tablesWithExplicitDataApiGrant: [...grants.keys()].filter((table) => createdTables.has(table)).length,
    missingExplicitGrant,
    postgisSpatialRefSys,
    grants: Object.fromEntries(
      [...createdTables.keys()]
        .sort()
        .map((table) => [table, serializeGrant(grants.get(table))]),
    ),
  };

  report.pass =
    missingExplicitGrant.length === 0 &&
    (
      (
        postgisSpatialRefSys.enabled &&
        postgisSpatialRefSys.readPolicy &&
        postgisSpatialRefSys.selectGrant
      ) ||
      postgisSpatialRefSys.ownerActionRequired
    );

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main();
