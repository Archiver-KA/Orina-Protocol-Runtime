#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function check(name, passed, evidence, residualRisk = '') {
  return { name, passed: Boolean(passed), evidence, residualRisk };
}

function main() {
  const pkg = JSON.parse(read('package.json'));
  const scripts = pkg.scripts || {};
  const workflow = read('.github/workflows/protocol-release-gate.yml');
  const securityScan = read('scripts/security-scan-system.mjs');
  const cdpSmoke = read('scripts/smoke-cdp-readonly-security.mjs');
  const m2m = read('supabase/functions/server/ai-m2m-wallet.ts');
  const cors = read('supabase/functions/server/edge-app.ts');
  const freshness = read('scripts/verify-marketplace-browse-freshness.mjs');

  const checks = [
    check(
      'npm lockfile is present',
      exists('package-lock.json'),
      'package-lock.json exists for npm ci reproducibility.',
    ),
    check(
      'security scan is available as an npm script',
      scripts['security:scan'] === 'node scripts/security-scan-system.mjs',
      'package.json maps security:scan to scripts/security-scan-system.mjs.',
    ),
    check(
      'client secret scan is available as an npm script',
      scripts['security:check-client-secrets'] === 'node scripts/check-client-no-privileged-supabase-secrets.mjs',
      'package.json maps security:check-client-secrets to the privileged-secret scanner.',
    ),
    check(
      'deterministic build verification is available',
      scripts['verify:deterministic-build'] === 'node scripts/verify-deterministic-build.mjs' &&
        exists('scripts/verify-deterministic-build.mjs'),
      'package.json exposes verify:deterministic-build and the script exists.',
    ),
    check(
      'typecheck baseline is available',
      scripts.typecheck === 'tsc -p tsconfig.check.json --noEmit' &&
        exists('tsconfig.check.json'),
      'package.json exposes typecheck and tsconfig.check.json exists.',
      'The baseline is intentionally narrow and staged in docs/type-safety-baseline.md.',
    ),
    check(
      'lint governance is documented',
      exists('docs/lint-governance.md'),
      'docs/lint-governance.md records the owner decision needed before lint enforcement.',
      'No lint command is enforced until an owner selects a linter and baseline.',
    ),
    check(
      'SBOM generation is available',
      scripts['security:sbom'] === 'node scripts/generate-sbom.mjs' &&
        exists('scripts/generate-sbom.mjs'),
      'package.json exposes security:sbom and the script exists.',
    ),
    check(
      'unsigned release manifest generation is available',
      scripts['release:manifest'] === 'node scripts/generate-release-manifest.mjs' &&
        exists('scripts/generate-release-manifest.mjs') &&
        exists('docs/release-provenance.md'),
      'package.json exposes release:manifest, the generator exists, and release provenance docs exist.',
      'Signing authority remains an owner decision outside this repository command.',
    ),
    check(
      'release CI runs security scan',
      /npm run security:scan/.test(workflow),
      '.github/workflows/protocol-release-gate.yml contains npm run security:scan.',
      'Branch protection cannot be proven from repository files.',
    ),
    check(
      'release CI runs repo-tooling verification',
      /npm run verify:repo-tooling/.test(workflow),
      '.github/workflows/protocol-release-gate.yml contains npm run verify:repo-tooling.',
      'The command reports lint as partial until an owner-selected linter exists.',
    ),
    check(
      'release CI runs typecheck baseline',
      /npm run typecheck/.test(workflow),
      '.github/workflows/protocol-release-gate.yml contains npm run typecheck.',
    ),
    check(
      'release CI runs marketplace freshness verification',
      /npm run verify:marketplace-freshness/.test(workflow),
      '.github/workflows/protocol-release-gate.yml contains npm run verify:marketplace-freshness.',
    ),
    check(
      'release CI runs deterministic build verification',
      /npm run verify:deterministic-build/.test(workflow),
      '.github/workflows/protocol-release-gate.yml contains npm run verify:deterministic-build.',
    ),
    check(
      'release CI generates SBOM',
      /npm run security:sbom/.test(workflow),
      '.github/workflows/protocol-release-gate.yml contains npm run security:sbom.',
    ),
    check(
      'release CI generates unsigned release manifest',
      /npm run release:manifest/.test(workflow),
      '.github/workflows/protocol-release-gate.yml contains npm run release:manifest.',
      'The manifest is unsigned by design.',
    ),
    check(
      'connected smoke remains manual-only',
      /github\.event_name == 'workflow_dispatch' && inputs\.run_connected_smoke/.test(workflow),
      'connected-protocol-smoke job is gated by workflow_dispatch and run_connected_smoke.',
    ),
    check(
      'M2M invite entropy floor is 32 bytes',
      /DELEGATE_INVITE_RANDOM_BYTES\s*=\s*32/.test(m2m),
      'supabase/functions/server/ai-m2m-wallet.ts sets DELEGATE_INVITE_RANDOM_BYTES = 32.',
    ),
    check(
      'M2M invite IDs use cryptographic randomness',
      /crypto\.getRandomValues\(new Uint8Array\(bytesLength\)\)/.test(m2m),
      'randomHex uses crypto.getRandomValues.',
    ),
    check(
      'M2M invite replay is rejected',
      /invite\.status !== 'pending'/.test(m2m) && /status:\s*'claimed'/.test(m2m),
      'accept-invite rejects non-pending invites and marks successful claims as claimed.',
    ),
    check(
      'M2M invite creation and accept are rate limited',
      /checkRateLimit\('ai_m2m_delegate_invite'/.test(m2m) &&
        /checkRateLimit\('ai_m2m_delegate_accept'/.test(m2m),
      'delegate invite and accept routes call distributed rate limiter.',
    ),
    check(
      'Managed delegate backup uses authenticated encryption',
      /AES-GCM/.test(m2m) && /new Uint8Array\(12\)/.test(m2m),
      'managed delegate secret encryption uses AES-GCM with a 12-byte IV.',
    ),
    check(
      'Managed delegate private key is not returned in JSON',
      !/return\s+c\.json\([^)]*privateKey/s.test(m2m) &&
        !/\bsuccess:\s*true[^}]*privateKey/s.test(m2m),
      'No privateKey return pattern was found in M2M JSON responses.',
    ),
    check(
      'CORS blocks localhost in production mode',
      /isProductionCorsMode/.test(cors) && /LOCAL_ORIGIN_PATTERNS/.test(cors),
      'edge-app.ts gates local origins behind non-production mode.',
    ),
    check(
      'CORS preview hosts require explicit flag',
      /ORINA_CORS_ALLOW_PREVIEW_ORIGINS/.test(cors) &&
        /PREVIEW_ORIGIN_PATTERNS/.test(cors) &&
        /isPreviewOriginAllowed/.test(cors),
      'edge-app.ts requires ORINA_CORS_ALLOW_PREVIEW_ORIGINS for broad preview patterns.',
    ),
    check(
      'CORS never returns wildcard origin in shared edge app',
      !/Access-Control-Allow-Origin["'`]\s*,\s*["']\*["']/.test(cors) &&
        !/return\s+["']\*["']/.test(cors),
      'edge-app.ts echoes approved origins and has no wildcard return pattern.',
    ),
    check(
      'Browser smoke blocks unapproved origins',
      /unexpectedOrigins/.test(cdpSmoke) && /isApprovedOrigin/.test(cdpSmoke),
      'smoke-cdp-readonly-security.mjs records unexpected network origins.',
      'Allowed supplier media origins still require explicit owner policy.',
    ),
    check(
      'Marketplace freshness command covers all browse surfaces',
      /marketplace_asset_browse_index_v1/.test(freshness) &&
        /marketplace_collection_browse_index_v1/.test(freshness) &&
        /marketplace_profile_browse_index_v1/.test(freshness),
      'verify-marketplace-browse-freshness.mjs defines asset, collection, and profile surfaces.',
    ),
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    checks,
    pass: checks.every((entry) => entry.passed),
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main();
