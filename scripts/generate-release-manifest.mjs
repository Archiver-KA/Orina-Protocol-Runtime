#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(ROOT, 'dist');
const OUT_PATH = path.join(ROOT, 'audit', 'release-manifest.unsigned.json');

function sha256File(filePath) {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function git(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function listFiles(baseDir) {
  if (!fs.existsSync(baseDir)) return [];
  const out = [];
  const stack = [baseDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function relativeSlash(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function maybeFile(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return {
    path: relativePath,
    sha256: sha256File(filePath),
    bytes: fs.statSync(filePath).size,
  };
}

function main() {
  const pkg = readJson('package.json');
  const distFiles = listFiles(DIST_DIR).map((filePath) => ({
    path: relativeSlash(filePath),
    sha256: sha256File(filePath),
    bytes: fs.statSync(filePath).size,
  }));

  const manifest = {
    schema: 'orina.release-manifest.unsigned.v1',
    generatedAt: new Date().toISOString(),
    signed: false,
    signing: {
      status: 'not-signed',
      reason: 'Signing authority is intentionally outside this local assurance pass.',
    },
    source: {
      packageName: pkg.name,
      packageVersion: pkg.version,
      gitCommit: git(['rev-parse', 'HEAD']),
      gitBranch: git(['branch', '--show-current']),
      gitStatusShort: git(['status', '--short']),
      remoteOrigin: git(['remote', 'get-url', 'origin']),
    },
    build: {
      command: 'npm run build',
      sourceDateEpoch: process.env.SOURCE_DATE_EPOCH || '',
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    dependencyInputs: [
      maybeFile('package.json'),
      maybeFile('package-lock.json'),
      maybeFile('audit/sbom.cdx.json'),
    ].filter(Boolean),
    artifacts: {
      distDirectory: fs.existsSync(DIST_DIR),
      fileCount: distFiles.length,
      files: distFiles,
    },
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({
    pass: true,
    output: relativeSlash(OUT_PATH),
    artifactCount: distFiles.length,
    signed: false,
  }, null, 2));
}

main();
