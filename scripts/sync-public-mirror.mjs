#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MIRROR_ROOT = path.resolve(SOURCE_ROOT, '..', 'System - Orina Protocol');

const args = new Set(process.argv.slice(2));
const argValues = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--') || !arg.includes('=')) continue;
  const [name, ...rest] = arg.slice(2).split('=');
  argValues.set(name, rest.join('='));
}

const mirrorRoot = path.resolve(
  argValues.get('mirror-dir')
  || process.env.ORINA_PUBLIC_MIRROR_DIR
  || DEFAULT_MIRROR_ROOT,
);
const allowDirtySource = args.has('--allow-dirty-source');
const allowDirtyMirror = args.has('--allow-dirty-mirror');
const noCommit = args.has('--no-commit');
const noPush = args.has('--no-push') || noCommit;
const skipInstall = args.has('--skip-install');
const skipCi = args.has('--skip-ci');
const commitMessage = argValues.get('message') || '';

const sourceToMirrorCopies = [
  ['src', 'apps/web/src'],
  ['public', 'apps/web/public'],
  ['utils', 'apps/web/utils'],
];

const sourceFiles = [
  ['index.html', 'apps/web/index.html'],
  ['vite.config.ts', 'apps/web/vite.config.ts'],
  ['postcss.config.mjs', 'apps/web/postcss.config.mjs'],
  ['tsconfig.check.json', 'apps/web/tsconfig.check.json'],
  ['eslint.config.js', 'apps/web/eslint.config.js'],
  ['data/taxonomy/orina_ai_taxonomy_v1.json', 'apps/web/data/taxonomy/orina_ai_taxonomy_v1.json'],
];

const blockedCopySegments = new Set([
  '.git',
  '.github',
  '.codex',
  '.agents',
  '.clean-room',
  '.wrangler',
  'audit',
  'dist',
  'docs',
  'node_modules',
  'temp',
]);

const blockedCopyFileNames = new Set([
  '.env',
  '.env.local',
  '.env.supabase-audit.local',
  'supabaseJWT.md',
  'supabasekey_CLI.md',
  'AUDIT_REPORT.md',
  'RELEASE_CANDIDATE.md',
]);

function log(message) {
  console.log(`[public-mirror] ${message}`);
}

function fail(message) {
  console.error(`[public-mirror] ${message}`);
  process.exit(1);
}

function run(command, commandArgs, options = {}) {
  const useShell = process.platform === 'win32' && command === 'npm';
  const executable = command;
  const result = spawnSync(executable, commandArgs, {
    cwd: options.cwd || SOURCE_ROOT,
    encoding: 'utf8',
    stdio: options.quiet ? 'pipe' : 'inherit',
    shell: useShell,
  });

  if (result.error && !options.allowFailure) {
    fail(`Command failed to start: ${command} ${commandArgs.join(' ')}\n${result.error.message}`);
  }

  if (result.status !== 0 && !options.allowFailure) {
    const detail = options.quiet
      ? `\n${result.stdout || ''}${result.stderr || ''}`.trimEnd()
      : '';
    fail(`Command failed: ${command} ${commandArgs.join(' ')}${detail ? `\n${detail}` : ''}`);
  }

  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readGitStatus(cwd) {
  return run('git', ['status', '--porcelain'], { cwd, quiet: true }).stdout.trim();
}

function assertGitRepo(cwd, expectedPackageName) {
  if (!fs.existsSync(path.join(cwd, '.git'))) {
    fail(`Not a Git repo: ${cwd}`);
  }

  const packagePath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packagePath)) {
    fail(`Missing package.json: ${packagePath}`);
  }

  const packageJson = readJson(packagePath);
  if (packageJson.name !== expectedPackageName) {
    fail(`Unexpected package name in ${cwd}: ${packageJson.name}`);
  }
}

function assertInside(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    fail(`Refusing path outside expected root: ${childPath}`);
  }
}

function resetMirrorDir(relativePath) {
  const target = path.join(mirrorRoot, relativePath);
  assertInside(target, mirrorRoot);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
}

function copyFilter(sourcePath) {
  const relative = path.relative(SOURCE_ROOT, sourcePath).replace(/\\/g, '/');
  const baseName = path.basename(sourcePath);
  if (relative === 'supabase' || relative.startsWith('supabase/')) return false;
  if (blockedCopyFileNames.has(baseName)) return false;
  if (baseName === '.dev.vars' || baseName.startsWith('.dev.vars.')) return false;
  if (baseName === '.env' || baseName.startsWith('.env.')) return false;
  return !relative.split('/').some((segment) => blockedCopySegments.has(segment));
}

function copyDir(sourceRelativePath, mirrorRelativePath) {
  const source = path.join(SOURCE_ROOT, sourceRelativePath);
  const target = path.join(mirrorRoot, mirrorRelativePath);
  if (!fs.existsSync(source)) {
    fail(`Missing source directory: ${sourceRelativePath}`);
  }

  resetMirrorDir(mirrorRelativePath);
  fs.cpSync(source, target, {
    recursive: true,
    force: true,
    filter: copyFilter,
  });
}

function copyFile(sourceRelativePath, mirrorRelativePath) {
  const source = path.join(SOURCE_ROOT, sourceRelativePath);
  const target = path.join(mirrorRoot, mirrorRelativePath);
  if (!fs.existsSync(source)) {
    fail(`Missing source file: ${sourceRelativePath}`);
  }

  assertInside(target, mirrorRoot);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function replaceInFile(relativePath, replacements) {
  const filePath = path.join(mirrorRoot, relativePath);
  let text = fs.readFileSync(filePath, 'utf8');
  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }
  fs.writeFileSync(filePath, text, 'utf8');
}

function generateMirrorPackageFiles() {
  const sourcePackage = readJson(path.join(SOURCE_ROOT, 'package.json'));
  const dependencies = {
    ...(sourcePackage.dependencies || {}),
    ...(sourcePackage.peerDependencies || {}),
  };

  writeJson(path.join(mirrorRoot, 'package.json'), {
    name: 'system-orina-protocol',
    version: sourcePackage.version || '0.1.0',
    private: true,
    license: 'SEE LICENSE IN LICENSE.md',
    type: 'module',
    workspaces: [
      'apps/*',
      'packages/*',
    ],
    scripts: {
      'dev:web': 'npm run dev --workspace @orina/protocol-web',
      build: 'npm run build --workspace @orina/protocol-web',
      test: 'npm run test --workspace @orina/protocol-web',
      typecheck: 'npm run typecheck --workspace @orina/protocol-web && npm run typecheck --workspace @orina/protocol-contracts',
      'lint:check': 'npm run lint:check --workspace @orina/protocol-web',
      'verify:public': 'node scripts/verify-public-boundary.mjs',
      'security:check-client-secrets': 'node scripts/verify-public-boundary.mjs',
      ci: 'npm run verify:public && npm run lint:check && npm run typecheck && npm run test && npm run build',
    },
    dependencies,
    devDependencies: sourcePackage.devDependencies || {},
    overrides: sourcePackage.overrides || {},
  });

  writeJson(path.join(mirrorRoot, 'apps/web/package.json'), {
    name: '@orina/protocol-web',
    version: sourcePackage.version || '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      test: 'vitest run',
      typecheck: 'tsc -p tsconfig.check.json --noEmit',
      'lint:check': 'eslint . --max-warnings=0',
    },
  });
}

function sanitizeMirrorFrontend() {
  replaceInFile('apps/web/utils/runtimeConfig.ts', [
    [/const DEFAULT_SUPABASE_FUNCTIONS_NAMESPACE\s*=\s*["'][^"']*["'];/, "const DEFAULT_SUPABASE_FUNCTIONS_NAMESPACE = '';"],
  ]);

  replaceInFile('apps/web/src/utils/supabaseAuthClaimBridge.ts', [
    [/const DEFAULT_SHARED_SERVER_FN_NAME\s*=\s*["'][^"']*["'];/, "const DEFAULT_SHARED_SERVER_FN_NAME = '';"],
  ]);

  replaceInFile('apps/web/src/utils/ipfs-config.ts', [
    [/Check if IPFS upload is configured \(PINATA_JWT is set\)/, 'Check if IPFS upload is configured by the backend.'],
  ]);
}

function sourceCommitRef() {
  const sha = run('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: SOURCE_ROOT, quiet: true }).stdout.trim();
  return `${sha}${readGitStatus(SOURCE_ROOT) ? '+dirty' : ''}`;
}

function syncMirror() {
  assertGitRepo(SOURCE_ROOT, '@orina/protocol-app');
  assertGitRepo(mirrorRoot, 'system-orina-protocol');

  if (path.resolve(SOURCE_ROOT) === path.resolve(mirrorRoot)) {
    fail('Source and mirror directories must be different.');
  }

  const sourceStatus = readGitStatus(SOURCE_ROOT);
  if (sourceStatus && !allowDirtySource) {
    fail('Source repo has uncommitted changes. Commit/stash first, or rerun with --allow-dirty-source.');
  }

  const mirrorStatus = readGitStatus(mirrorRoot);
  if (mirrorStatus && !allowDirtyMirror) {
    fail('Mirror repo has uncommitted changes. Commit/stash them before syncing.');
  } else if (mirrorStatus) {
    log('mirror has existing uncommitted changes; continuing because --allow-dirty-mirror was set');
  }

  log(`source: ${SOURCE_ROOT}`);
  log(`mirror: ${mirrorRoot}`);
  log(`source ref: ${sourceCommitRef()}`);

  for (const [sourceRelativePath, mirrorRelativePath] of sourceToMirrorCopies) {
    log(`copy ${sourceRelativePath} -> ${mirrorRelativePath}`);
    copyDir(sourceRelativePath, mirrorRelativePath);
  }

  for (const [sourceRelativePath, mirrorRelativePath] of sourceFiles) {
    log(`copy ${sourceRelativePath} -> ${mirrorRelativePath}`);
    copyFile(sourceRelativePath, mirrorRelativePath);
  }

  generateMirrorPackageFiles();
  sanitizeMirrorFrontend();

  if (!skipInstall) {
    log('refresh package-lock');
    run('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: mirrorRoot });
    log('install locked dependencies');
    run('npm', ['ci', '--ignore-scripts'], { cwd: mirrorRoot });
  }

  log('verify public boundary');
  run('npm', ['run', 'verify:public'], { cwd: mirrorRoot });

  if (!skipCi) {
    log('run mirror CI');
    run('npm', ['run', 'ci'], { cwd: mirrorRoot });
  }

  const changed = readGitStatus(mirrorRoot);
  if (!changed) {
    log('mirror already up to date; no commit needed');
    return;
  }

  if (noCommit) {
    log('mirror has changes; --no-commit was set');
    console.log(changed);
    return;
  }

  run('git', ['add', '-A'], { cwd: mirrorRoot });
  run('npm', ['run', 'verify:public'], { cwd: mirrorRoot });

  const message = commitMessage || `Sync public mirror from runtime ${sourceCommitRef()}`;
  log(`commit mirror: ${message}`);
  run('git', ['commit', '-m', message], { cwd: mirrorRoot });

  if (noPush) {
    log('mirror commit created; --no-push was set');
    return;
  }

  log('push mirror main');
  run('git', ['push'], { cwd: mirrorRoot });
}

syncMirror();
