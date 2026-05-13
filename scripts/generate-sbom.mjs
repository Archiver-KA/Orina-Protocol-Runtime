#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT_DIR = path.join(ROOT, 'audit');
const OUTPUT = path.join(AUDIT_DIR, 'sbom.cdx.json');

function ensureInsideRoot(target) {
  const resolved = path.resolve(target);
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${path.sep}`)) {
    throw new Error(`Refusing to write outside repository root: ${resolved}`);
  }
  return resolved;
}

function main() {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const outputPath = ensureInsideRoot(OUTPUT);
  const result = spawnSync(
    'npm',
    ['sbom', '--json', '--sbom-format', 'cyclonedx', '--sbom-type', 'application'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      shell: true,
      maxBuffer: 64 * 1024 * 1024,
    },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || 'npm sbom failed\n');
    process.exit(result.status || 1);
  }

  let sbom;
  try {
    sbom = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`npm sbom did not return JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(sbom, null, 2)}\n`);

  const summary = {
    generatedAt: new Date().toISOString(),
    command: 'npm sbom --json --sbom-format cyclonedx --sbom-type application',
    output: path.relative(ROOT, outputPath).replaceAll(path.sep, '/'),
    format: sbom.bomFormat || '',
    specVersion: sbom.specVersion || '',
    componentCount: Array.isArray(sbom.components) ? sbom.components.length : 0,
    dependencyCount: Array.isArray(sbom.dependencies) ? sbom.dependencies.length : 0,
    pass: sbom.bomFormat === 'CycloneDX' && Array.isArray(sbom.components),
  };

  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.pass ? 0 : 1);
}

main();
