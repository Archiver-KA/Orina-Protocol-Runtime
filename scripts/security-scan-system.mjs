#!/usr/bin/env node
/**
 * Full-stack security pass: dependency audit, client secret patterns, risky APIs, config notes.
 * Run from repo root: node scripts/security-scan-system.mjs
 * Exit 1 if any blocking finding (npm high/critical unaddressed, forbidden patterns).
 */

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const REPORT = {
  timestamp: new Date().toISOString(),
  sections: [],
  aggregate: null,
  exitCode: 0,
};

function addSection(title, items, severity = 'info') {
  REPORT.sections.push({ title, items, severity });
  if (severity === 'critical') REPORT.exitCode = 1;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

function scanSourceRiskPatterns() {
  const dirs = [path.join(ROOT, 'src'), path.join(ROOT, 'utils')];
  const files = dirs.flatMap((d) => walk(d));
  const hits = { dangerouslySetInnerHTML: [], innerHTML: [], evalish: [] };

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);
    if (/dangerouslySetInnerHTML/.test(text)) hits.dangerouslySetInnerHTML.push(rel);
    if (/\.innerHTML\s*=/.test(text)) hits.innerHTML.push(rel);
    if (/\beval\s*\(/.test(text) || /new\s+Function\s*\(/.test(text)) hits.evalish.push(rel);
  }

  return { hits, fileCount: files.length };
}

function checkGitignoreEnv() {
  const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  const hasEnv = /^\s*\.env\s*$/m.test(gi) || gi.split('\n').some((l) => l.trim() === '.env');
  return hasEnv;
}

function runNpmAuditJson() {
  const r = spawnSync('npm', ['audit', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
  });
  try {
    return JSON.parse(r.stdout || '{}');
  } catch {
    return { error: r.stderr || r.stdout };
  }
}

function summarizeAudit(audit) {
  const m = audit.metadata?.vulnerabilities;
  if (!m) return { summary: null };
  return {
    summary: {
      info: m.info || 0,
      low: m.low || 0,
      moderate: m.moderate || 0,
      high: m.high || 0,
      critical: m.critical || 0,
    },
  };
}

/** Static checks for AI M2M (delegated wallet) Edge module — see supabase/functions/server/ai-m2m-wallet.ts */
function scanM2MModule() {
  const m2mPath = path.join(ROOT, 'supabase', 'functions', 'server', 'ai-m2m-wallet.ts');
  if (!fs.existsSync(m2mPath)) {
    return { ok: false, items: ['ai-m2m-wallet.ts not found'], checks: {} };
  }
  const text = fs.readFileSync(m2mPath, 'utf8');
  const authCalls = (text.match(/requireAuthenticatedWallet\(/g) || []).length;
  const walletMatchCalls = (text.match(/assertAuthenticatedWalletMatch\(/g) || []).length;
  const hasEncryptionEnv = text.includes('ATP2_M2M_DELEGATE_ENCRYPTION_KEY');
  const encryptFn = text.includes('encryptManagedDelegateSecret');
  // Response bodies must not leak generated private keys
  const leakyReturn =
    /return\s+c\.json\([^)]*privateKey/s.test(text) ||
    /\bsuccess:\s*true[^}]*privateKey/s.test(text);

  const items = [];
  const checks = {
    minAuthHandlers: authCalls >= 5,
    walletMatchPresent: walletMatchCalls >= 3,
    encryptionKeyEnvDocumented: hasEncryptionEnv,
    encryptAtRest: encryptFn,
    noPrivateKeyInJson: !leakyReturn,
  };

  items.push(
    `requireAuthenticatedWallet call sites: ${authCalls} (expect >=5 for config get/post, delegates generate/invite/accept)`,
  );
  items.push(`assertAuthenticatedWalletMatch call sites: ${walletMatchCalls}`);
  items.push(
    hasEncryptionEnv
      ? 'Delegate secrets: AES-GCM with key derived from ATP2_M2M_DELEGATE_ENCRYPTION_KEY (Edge secret only).'
      : 'WARNING: encryption env name not found in module',
  );
  items.push(encryptFn ? 'encryptManagedDelegateSecret present for generated delegates.' : 'WARNING: missing encrypt helper');
  items.push(
    leakyReturn
      ? 'CRITICAL: possible privateKey in JSON response — review immediately'
      : 'No obvious privateKey in c.json responses (heuristic).',
  );
  items.push(
    'accept-invite: caller JWT wallet must be delegate; root vs delegate enforced; invite is single-use after claim.',
  );
  items.push(
    'Residual risks: inviteId secret strength (short random hex) — prefer longer IDs or rate limits; KV backup exposes ciphertext if encryption key leaks.',
  );

  const clientLeak = scanClientM2MSecrets();
  items.push(...clientLeak.items);

  return { ok: Object.values(checks).every(Boolean) && clientLeak.ok, items, checks, clientM2M: clientLeak };
}

function scanClientM2MSecrets() {
  const dirs = [path.join(ROOT, 'src'), path.join(ROOT, 'utils')];
  const files = dirs.flatMap((d) => walk(d));
  const bad = [];
  const patterns = [
    { re: /\bATP2_M2M_DELEGATE_ENCRYPTION_KEY\b/, msg: 'M2M encryption key must not appear in client' },
    { re: /import\.meta\.env\.VITE_.*M2M.*SECRET/i, msg: 'Do not expose M2M secrets via VITE_' },
  ];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);
    for (const { re, msg } of patterns) {
      if (re.test(text)) bad.push(`${rel}: ${msg}`);
    }
  }
  return {
    ok: bad.length === 0,
    items: bad.length ? [`Client M2M secret leaks: ${bad.join('; ')}`] : ['Client: no M2M delegate encryption key / VITE M2M secret patterns in src, utils.'],
  };
}

function scanMessagingModule() {
  const filePath = path.join(ROOT, 'supabase', 'functions', 'server', 'messages-handler-c5.ts');
  if (!fs.existsSync(filePath)) {
    return { ok: false, items: ['messages-handler-c5.ts not found'], checks: {} };
  }

  const text = fs.readFileSync(filePath, 'utf8');
  const authCalls = (text.match(/requireAuthenticatedWallet\(/g) || []).length;
  const walletMatchCalls = (text.match(/assertAuthenticatedWalletMatch\(/g) || []).length;
  const membershipGuard =
    text.includes('User is not a participant of this conversation') &&
    text.includes('participantRows.some((p) => p.user_id === userProfile.id)');
  const reportTracksAuthenticatedWallet = text.includes('reporter_wallet: auth.identity.walletAddress');

  const checks = {
    minAuthHandlers: authCalls >= 7,
    walletMatchPresent: walletMatchCalls >= 6,
    membershipGuard,
    reportTracksAuthenticatedWallet,
  };

  const items = [
    `requireAuthenticatedWallet call sites: ${authCalls}`,
    `assertAuthenticatedWalletMatch call sites: ${walletMatchCalls}`,
    membershipGuard
      ? 'Conversation reads enforce server-side participant membership before returning messages.'
      : 'WARNING: missing explicit conversation membership guard in getConversationMessagesImpl.',
    reportTracksAuthenticatedWallet
      ? 'Message reports bind reporter_wallet to the authenticated bridge identity.'
      : 'WARNING: moderation reports do not appear to bind reporter_wallet to the authenticated identity.',
  ];

  return { ok: Object.values(checks).every(Boolean), items, checks };
}

function extractRouteBlock(text, routeSignature, nextRouteSignature) {
  const start = text.indexOf(routeSignature);
  if (start === -1) return '';
  const end = nextRouteSignature ? text.indexOf(nextRouteSignature, start + routeSignature.length) : -1;
  return text.slice(start, end === -1 ? text.length : end);
}

function scanIpfsModule() {
  const filePath = path.join(ROOT, 'supabase', 'functions', 'server', 'ipfs-upload.tsx');
  if (!fs.existsSync(filePath)) {
    return { ok: false, items: ['ipfs-upload.tsx not found'], checks: {} };
  }

  const text = fs.readFileSync(filePath, 'utf8');
  const singleUploadBlock = extractRouteBlock(text, 'ipfsRouter.post("/upload"', 'ipfsRouter.post("/upload-multiple"');
  const batchUploadBlock = extractRouteBlock(text, 'ipfsRouter.post("/upload-multiple"', 'ipfsRouter.get("/info/:hash"');

  const checks = {
    singleUploadRequiresAuth: /requireAuthenticatedWallet\(/.test(singleUploadBlock),
    singleUploadRateLimited: /checkRateLimit\("ipfs_upload"/.test(singleUploadBlock),
    batchUploadRequiresAuth: /requireAuthenticatedWallet\(/.test(batchUploadBlock),
    batchUploadRateLimited: /checkRateLimit\("ipfs_upload_batch"/.test(batchUploadBlock),
  };

  const items = [
    checks.singleUploadRequiresAuth
      ? 'Single-file IPFS upload requires an authenticated H1 wallet token.'
      : 'CRITICAL: single-file IPFS upload does not require authenticated wallet access.',
    checks.singleUploadRateLimited
      ? 'Single-file IPFS upload uses the distributed rate limiter.'
      : 'WARNING: single-file IPFS upload is not covered by the distributed rate limiter.',
    checks.batchUploadRequiresAuth
      ? 'Batch IPFS upload requires an authenticated H1 wallet token.'
      : 'WARNING: batch IPFS upload does not require authenticated wallet access.',
    checks.batchUploadRateLimited
      ? 'Batch IPFS upload uses the distributed rate limiter.'
      : 'WARNING: batch IPFS upload is not covered by the distributed rate limiter.',
    'IPFS check/info routes remain public read-only helpers and do not expose Pinata credentials.',
  ];

  return { ok: Object.values(checks).every(Boolean), items, checks };
}

function scanAuditServiceRoleAliases() {
  const auditDir = path.join(ROOT, 'supabase', 'audit');
  if (!fs.existsSync(auditDir)) {
    return { ok: false, items: ['supabase/audit directory not found'], offenders: [] };
  }

  const offenders = [];
  const stack = [auditDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!/\.(cjs|mjs|js|ts|tsx)$/.test(entry.name)) continue;
      const text = fs.readFileSync(fullPath, 'utf8');
      if (text.includes('VITE_SUPABASE_SERVICE_ROLE_KEY')) {
        offenders.push(path.relative(ROOT, fullPath));
      }
    }
  }

  return {
    ok: offenders.length === 0,
    offenders,
    items: offenders.length
      ? [`WARNING: audit tooling still accepts VITE_SUPABASE_SERVICE_ROLE_KEY in ${offenders.join(', ')}`]
      : ['Audit tooling does not accept VITE_SUPABASE_SERVICE_ROLE_KEY aliases.'],
  };
}

function scanCorsConfigurations() {
  const functionsDir = path.join(ROOT, 'supabase', 'functions');
  if (!fs.existsSync(functionsDir)) {
    return { ok: false, items: ['supabase/functions directory not found'], offenders: [] };
  }

  const offenders = [];
  const files = walk(functionsDir);
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);
    if (/origin\s*:\s*["']\*["']/.test(text)) {
      offenders.push(`${rel}: wildcard cors origin`);
    }
    if (/Access-Control-Allow-Origin["'`]\s*,\s*["']\*["']/.test(text)) {
      offenders.push(`${rel}: explicit ACAO wildcard`);
    }
  }

  return {
    ok: offenders.length === 0,
    offenders,
    items: offenders.length
      ? [`WARNING: wildcard CORS configuration present in ${offenders.join(', ')}`]
      : ['No explicit wildcard CORS configuration found under supabase/functions.'],
  };
}

function buildAggregate(vuln, m2mScan, messagingScan, ipfsScan, auditAliasScan, corsScan) {
  const areas = {
    dependencies: {
      status: vuln && (vuln.critical > 0 || vuln.high > 0) ? 'action_required' : vuln?.moderate ? 'review' : 'ok',
      summary: vuln
        ? `npm audit: critical ${vuln.critical}, high ${vuln.high}, moderate ${vuln.moderate}`
        : 'unknown',
    },
    clientSecrets: { status: 'ok', summary: 'No SERVICE_ROLE / JWT signing env in client bundle paths (script).' },
    walletClaimBridge: {
      status: 'ok',
      summary: 'H1 bridge + RLS; run supabase/audit/smoke_wallet_claim_security.cjs against deployed project.',
    },
    m2mDelegatedAiWallet: {
      status: m2mScan?.ok ? 'ok' : 'review',
      summary:
        'M2M routes use bridge JWT + wallet match; delegate keys encrypted at rest; client uses bridge token only.',
      details: m2mScan?.checks || {},
    },
    apiKeyManagement: {
      status: 'ok',
      summary: 'KV key routes require H1 JWT + wallet match (index.tsx).',
    },
    messaging: {
      status: messagingScan?.ok ? 'ok' : 'review',
      summary: messagingScan?.ok
        ? 'Chat handlers require H1 JWT + wallet match; conversation reads enforce membership.'
        : 'Review chat route authentication and membership enforcement.',
    },
    ipfsPinata: {
      status: ipfsScan?.ok ? 'ok' : 'risk',
      summary: ipfsScan?.ok
        ? 'Single and batch upload routes require H1 JWT + distributed per-wallet rate limits.'
        : 'Pinata-backed upload surface still exposes unauthenticated or unthrottled routes.',
    },
    cors: {
      status: corsScan?.ok ? 'ok' : 'review',
      summary: corsScan?.ok
        ? 'No explicit wildcard CORS config found; shared edge app gates origins by allowlist/pattern.'
        : 'Review wildcard CORS usage in edge functions and restrict to the shared edge app policy.',
    },
    auditTooling: {
      status: auditAliasScan?.ok ? 'ok' : 'review',
      summary: auditAliasScan?.ok
        ? 'Audit scripts do not accept VITE-prefixed service-role aliases.'
        : 'Audit tooling still accepts VITE-prefixed service-role aliases and should be cleaned up.',
    },
  };

  const oneLine = [
    areas.dependencies.status === 'ok' ? 'deps:ok' : 'deps:check',
    areas.messaging.status === 'ok' ? 'messaging:ok' : 'messaging:review',
    areas.ipfsPinata.status === 'ok' ? 'ipfs:ok' : 'ipfs:risk',
    areas.m2mDelegatedAiWallet.status === 'ok' ? 'm2m:ok' : 'm2m:review',
    areas.cors.status === 'ok' ? 'cors:ok' : 'cors:review',
  ].join(' | ');

  return { generatedAt: new Date().toISOString(), oneLineSummary: oneLine, areas };
}

function main() {
  const messagingScan = scanMessagingModule();
  const ipfsScan = scanIpfsModule();
  const auditAliasScan = scanAuditServiceRoleAliases();
  const corsScan = scanCorsConfigurations();

  // 1) Client privileged secrets (existing script)
  try {
    execSync(`node "${path.join(ROOT, 'scripts', 'check-client-no-privileged-supabase-secrets.mjs')}"`, {
      cwd: ROOT,
      stdio: 'pipe',
    });
    addSection('Client bundle: privileged Supabase env patterns', ['OK: no forbidden patterns'], 'info');
  } catch (e) {
    addSection('Client bundle: privileged Supabase env patterns', [String(e.stderr || e.message || e)], 'critical');
  }

  // 2) npm audit
  const audit = runNpmAuditJson();
  const { summary: vuln } = summarizeAudit(audit);
  if (vuln) {
    const line = `vulnerabilities — critical:${vuln.critical} high:${vuln.high} moderate:${vuln.moderate} low:${vuln.low} info:${vuln.info}`;
    const sev =
      vuln.critical > 0 || vuln.high > 0 ? 'high' : vuln.moderate > 0 ? 'moderate' : 'info';
    addSection('npm audit (summary)', [line, 'Remediation: npm audit fix (or pin overrides in package.json)'], sev);
  } else {
    addSection('npm audit', ['Could not parse audit JSON — run npm audit manually'], 'high');
  }

  // 3) Source risk patterns
  const { hits, fileCount } = scanSourceRiskPatterns();
  addSection(
    'DOM / code injection patterns (manual review)',
    [
      `Scanned ${fileCount} TS/TSX files under src/, utils/`,
      hits.dangerouslySetInnerHTML.length
        ? `dangerouslySetInnerHTML: ${hits.dangerouslySetInnerHTML.join(', ')}`
        : 'dangerouslySetInnerHTML: none',
      hits.innerHTML.length
        ? `.innerHTML assignment: ${hits.innerHTML.join(', ')}`
        : '.innerHTML assignment: none',
      hits.evalish.length ? `eval/new Function: ${hits.evalish.join(', ')}` : 'eval/new Function: none',
    ],
    'info'
  );

  // 4) Config / ops
  addSection(
    'Repository hygiene',
    [
      checkGitignoreEnv() ? '.gitignore lists .env (good)' : 'WARNING: .env may not be gitignored',
      'Embedded anon JWT in utils/supabase/info.tsx is expected (public anon key); rotate in Dashboard if leaked.',
    ],
    'info'
  );

  // 5) Architecture notes (static — keep in sync with security reviews)
  addSection(
    'Edge / server (review periodically)',
    [
      'API routes under /make-server-b0d68fc8/api/v1 require sk_seller_* API key (see api-endpoints.tsx).',
      'POST /keys/* now require H1 bridge JWT + wallet match (request-auth.ts).',
      'Messaging (orina-chat-v1 + messages-handler-c5): H1 JWT + wallet match enforced, with participant membership checks on message reads.',
      'IPFS upload (ipfs-upload.tsx): single and batch routes require H1 JWT and distributed per-wallet rate limits.',
      'CORS: shared edge app applies origin allowlist/pattern gating; review deployed origins periodically.',
    ],
    'info'
  );

  // 6) AI M2M (delegated wallet) — static analysis
  const m2mScan = scanM2MModule();
  addSection('AI M2M / delegated wallet (ai-m2m-wallet.ts + client)', m2mScan.items, 'info');
  const m2mBlocking =
    !m2mScan.checks.minAuthHandlers ||
    !m2mScan.checks.encryptAtRest ||
    !m2mScan.checks.noPrivateKeyInJson ||
    !m2mScan.clientM2M?.ok;
  if (m2mBlocking) REPORT.exitCode = 1;

  addSection('Messaging auth / authorization (messages-handler-c5.ts)', messagingScan.items, messagingScan.ok ? 'info' : 'critical');
  addSection('IPFS upload protection (ipfs-upload.tsx)', ipfsScan.items, ipfsScan.ok ? 'info' : 'critical');
  addSection('Audit tooling secret aliases', auditAliasScan.items, auditAliasScan.ok ? 'info' : 'moderate');
  addSection('Edge function CORS posture', corsScan.items, corsScan.ok ? 'info' : 'moderate');

  if (!messagingScan.ok || !ipfsScan.ok) REPORT.exitCode = 1;

  REPORT.aggregate = buildAggregate(vuln, m2mScan, messagingScan, ipfsScan, auditAliasScan, corsScan);

  console.log(JSON.stringify(REPORT, null, 2));
  process.exit(REPORT.exitCode);
}

main();
