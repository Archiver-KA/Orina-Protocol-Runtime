#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

function ensureInsideRoot(target) {
  const resolved = path.resolve(target);
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${path.sep}`)) {
    throw new Error(`Refusing to operate outside repository root: ${resolved}`);
  }
  return resolved;
}

function runBuild(label) {
  fs.rmSync(ensureInsideRoot(DIST), { recursive: true, force: true });
  const startedAt = Date.now();
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: ROOT,
    env: {
      ...process.env,
      SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '0',
    },
    encoding: 'utf8',
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });

  return {
    label,
    exitCode: result.status,
    durationMs: Date.now() - startedAt,
    stdoutTail: String(result.stdout || '').split(/\r?\n/).slice(-8).filter(Boolean),
    stderrTail: String(result.stderr || '').split(/\r?\n/).slice(-8).filter(Boolean),
  };
}

function listFiles(dir, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(fullPath, output);
    } else if (entry.isFile()) {
      output.push(fullPath);
    }
  }
  return output;
}

function hashDist() {
  const distPath = ensureInsideRoot(DIST);
  const files = listFiles(distPath).sort((left, right) => left.localeCompare(right));
  const entries = files.map((file) => {
    const rel = path.relative(distPath, file).replaceAll(path.sep, '/');
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    return [rel, hash];
  });
  return Object.fromEntries(entries);
}

function diffHashes(left, right) {
  const files = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  return files
    .filter((file) => left[file] !== right[file])
    .map((file) => ({
      file,
      first: left[file] || null,
      second: right[file] || null,
    }));
}

function main() {
  const firstBuild = runBuild('first');
  if (firstBuild.exitCode !== 0) {
    console.log(JSON.stringify({ pass: false, firstBuild }, null, 2));
    process.exit(firstBuild.exitCode || 1);
  }
  const firstHash = hashDist();

  const secondBuild = runBuild('second');
  if (secondBuild.exitCode !== 0) {
    console.log(JSON.stringify({ pass: false, firstBuild, secondBuild }, null, 2));
    process.exit(secondBuild.exitCode || 1);
  }
  const secondHash = hashDist();

  const differences = diffHashes(firstHash, secondHash);
  const report = {
    generatedAt: new Date().toISOString(),
    command: 'npm run build (twice with dist removed before each run)',
    sourceDateEpoch: process.env.SOURCE_DATE_EPOCH || '0',
    dist: path.relative(ROOT, DIST).replaceAll(path.sep, '/'),
    firstBuild,
    secondBuild,
    firstFileCount: Object.keys(firstHash).length,
    secondFileCount: Object.keys(secondHash).length,
    differences,
    pass: differences.length === 0,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main();
