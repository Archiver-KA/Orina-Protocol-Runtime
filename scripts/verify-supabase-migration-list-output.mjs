#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readInput() {
  const fileArg = process.argv[2];
  const buffer = fileArg ? fs.readFileSync(path.resolve(ROOT, fileArg)) : fs.readFileSync(0);
  const utf16Like = buffer[0] === 0xff && buffer[1] === 0xfe;
  const hasFrequentNulls = buffer.subarray(0, Math.min(buffer.length, 200)).includes(0);
  return buffer.toString(utf16Like || hasFrequentNulls ? "utf16le" : "utf8").replace(/^\uFEFF/, "");
}

function localMigrationVersions() {
  const migrationsDir = path.join(ROOT, "supabase", "migrations");
  return fs
    .readdirSync(migrationsDir)
    .map((name) => /^(\d+)/.exec(name)?.[1])
    .filter(Boolean)
    .sort();
}

function parseRows(output) {
  const rows = [];
  for (const line of output.split(/\r?\n/)) {
    if (!line.includes("|") || /Local\s*\|\s*Remote/i.test(line) || /^[-\s|]+$/.test(line)) {
      continue;
    }
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length < 2) {
      continue;
    }
    const local = cells[0] || "";
    const remote = cells[1] || "";
    if (!/^\d+$/.test(local) && !/^\d+$/.test(remote)) {
      continue;
    }
    rows.push({ local, remote });
  }
  return rows;
}

function main() {
  const output = readInput();
  const localVersions = localMigrationVersions();
  const rows = parseRows(output);
  const alignedRows = rows.filter((row) => row.local && row.remote && row.local === row.remote);
  const mismatches = rows.filter((row) => row.local !== row.remote);
  const rowVersions = new Set(alignedRows.map((row) => row.local));
  const missingLocalVersions = localVersions.filter((version) => !rowVersions.has(version));

  const report = {
    generatedAt: new Date().toISOString(),
    localMigrationCount: localVersions.length,
    migrationListRows: rows.length,
    latestLocalMigration: localVersions.at(-1) || null,
    latestAlignedRemoteMigration: alignedRows.at(-1)?.remote || null,
    mismatches,
    missingLocalVersions,
    pass: rows.length > 0 && mismatches.length === 0 && missingLocalVersions.length === 0,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main();
