#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function existsAny(names) {
  return names.some((name) => fs.existsSync(path.join(ROOT, name)));
}

function readPackageJson() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
}

function hasDependency(pkg, name) {
  return Boolean(pkg.dependencies?.[name] || pkg.devDependencies?.[name] || pkg.optionalDependencies?.[name]);
}

const pkg = readPackageJson();
const scripts = pkg.scripts || {};
const hasTsConfig = existsAny(['tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'tsconfig.check.json']);
const hasTypeScript = hasDependency(pkg, 'typescript');
const hasTypecheckScript = Boolean(scripts.typecheck);
const linterDependencies = ['eslint', 'biome', '@biomejs/biome', 'oxlint'];
const linterConfigs = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  'biome.json',
  'biome.jsonc',
  '.oxlintrc.json',
];
const presentLinterDependencies = linterDependencies.filter((name) => hasDependency(pkg, name));
const hasLinterConfig = existsAny(linterConfigs);
const hasLintGovernance = fs.existsSync(path.join(ROOT, 'docs', 'lint-governance.md'));
const lintAvailable = Boolean(scripts.lint || scripts['lint:check']) && presentLinterDependencies.length && hasLinterConfig;
const typecheckAvailable = hasTypecheckScript && hasTypeScript && hasTsConfig;

const report = {
  generatedAt: new Date().toISOString(),
  packageManager: fs.existsSync(path.join(ROOT, 'package-lock.json')) ? 'npm' : 'unknown',
  viteConfig: fs.existsSync(path.join(ROOT, 'vite.config.ts')),
  typecheck: {
    scriptPresent: hasTypecheckScript,
    directTypeScriptDependency: hasTypeScript,
    tsconfigPresent: hasTsConfig,
    status: typecheckAvailable ? 'available' : 'blocked',
    blocker: typecheckAvailable
      ? ''
      : 'A typecheck baseline requires a typecheck script, direct typescript devDependency, and tsconfig.check.json or equivalent.',
  },
  lint: {
    scriptPresent: Boolean(scripts.lint || scripts['lint:check']),
    linterDependencies: presentLinterDependencies,
    linterConfigPresent: hasLinterConfig,
    governanceDocumentPresent: hasLintGovernance,
    status: lintAvailable ? 'available' : hasLintGovernance ? 'partial' : 'blocked',
    blocker: lintAvailable
      ? ''
      : hasLintGovernance
        ? 'Lint governance is documented, but no owner-selected linter dependency/configuration is present.'
        : 'No existing linter dependency/configuration is present; adding lint would introduce a new lint stack.',
  },
  pass: true,
};

console.log(JSON.stringify(report, null, 2));
