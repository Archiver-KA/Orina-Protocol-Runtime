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
const hasTsConfig = existsAny(['tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']);
const hasTypeScript = hasDependency(pkg, 'typescript');
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

const report = {
  generatedAt: new Date().toISOString(),
  packageManager: fs.existsSync(path.join(ROOT, 'package-lock.json')) ? 'npm' : 'unknown',
  viteConfig: fs.existsSync(path.join(ROOT, 'vite.config.ts')),
  typecheck: {
    scriptPresent: Boolean(scripts.typecheck),
    directTypeScriptDependency: hasTypeScript,
    tsconfigPresent: hasTsConfig,
    status: hasTypeScript && hasTsConfig ? 'available' : 'blocked',
    blocker: hasTypeScript && hasTsConfig
      ? ''
      : 'No direct typescript dependency and no tsconfig.json are present; adding tsc --noEmit would require new dev tooling/configuration.',
  },
  lint: {
    scriptPresent: Boolean(scripts.lint),
    linterDependencies: presentLinterDependencies,
    linterConfigPresent: hasLinterConfig,
    status: presentLinterDependencies.length && hasLinterConfig ? 'available' : 'blocked',
    blocker: presentLinterDependencies.length && hasLinterConfig
      ? ''
      : 'No existing linter dependency/configuration is present; adding lint would introduce a new lint stack.',
  },
  pass: true,
};

console.log(JSON.stringify(report, null, 2));
