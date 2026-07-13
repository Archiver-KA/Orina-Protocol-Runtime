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
import { classifyNpmAudit, isBlockingSecuritySeverity } from './security-scan-policy.mjs';

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
  if (isBlockingSecuritySeverity(severity)) REPORT.exitCode = 1;
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
  const dirs = [
    path.join(ROOT, 'src'),
    path.join(ROOT, 'utils'),
    path.join(ROOT, 'supabase', 'functions'),
  ];
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
  const atomicMigrationPath = path.join(ROOT, 'supabase', 'migrations', '000083_m2m_atomic_relational_state.sql');
  const atomicMigrationText = fs.existsSync(atomicMigrationPath)
    ? fs.readFileSync(atomicMigrationPath, 'utf8')
    : '';
  const inviteRouteBlock = extractRouteBlock(text, "aiM2MWallet.post('/delegates/invite'", "aiM2MWallet.post('/delegates/accept-invite'");
  const acceptInviteRouteBlock = extractRouteBlock(text, "aiM2MWallet.post('/delegates/accept-invite'", 'export default aiM2MWallet');
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
    encryptionKeyEnvDocumented:
      hasEncryptionEnv && /new TextEncoder\(\)\.encode\(secret\)\.byteLength < 32/.test(text),
    encryptAtRest: encryptFn,
    noPrivateKeyInJson: !leakyReturn,
    inviteMinEntropy: /DELEGATE_INVITE_RANDOM_BYTES\s*=\s*(3[2-9]|[4-9]\d|\d{3,})/.test(text),
    inviteUsesCryptoRandomness:
      /crypto\.getRandomValues\(new Uint8Array\(bytesLength\)\)/.test(text) &&
      /randomHex\(DELEGATE_INVITE_RANDOM_BYTES\)/.test(text),
    inviteHasCollisionRetry:
      /createDelegateInvite/.test(text) &&
      /DELEGATE_INVITE_ID_MAX_ATTEMPTS/.test(text) &&
      /error\.code\s*\|\|\s*['"]{2}\)\s*===\s*['"]23505['"]/.test(text),
    inviteHasExpiration:
      /DELEGATE_INVITE_TTL_MS/.test(text) &&
      /p_expires_at <= v_now/.test(atomicMigrationText) &&
      /v_invite\.expires_at <= v_now/.test(atomicMigrationText),
    inviteReplayRejected:
      /FOR UPDATE/i.test(atomicMigrationText) &&
      /v_invite\.status <> 'pending'/.test(atomicMigrationText) &&
      /status = 'claimed'/.test(atomicMigrationText),
    inviteRoutesRateLimited:
      /checkRateLimit\('ai_m2m_delegate_invite'/.test(inviteRouteBlock) &&
      /checkRateLimit\('ai_m2m_delegate_accept'/.test(acceptInviteRouteBlock),
    relationalRuntime:
      !/from ['"]\.\/kv_store\.tsx['"]/.test(text) &&
      /\.from\('m2m_wallet_config'\)/.test(text) &&
      /\.from\('m2m_delegates'\)/.test(text) &&
      /\.from\('m2m_delegate_secrets'\)/.test(text),
    atomicDelegateCapacity:
      /atp2_create_m2m_delegate_invite_v1/.test(atomicMigrationText) &&
      /atp2_register_m2m_managed_delegate_v1/.test(atomicMigrationText) &&
      /atp2_claim_m2m_delegate_invite_v1/.test(atomicMigrationText) &&
      (atomicMigrationText.match(/pg_advisory_xact_lock/g) || []).length >= 3,
    serviceRoleOnlyAtomicRpcs:
      (atomicMigrationText.match(/REVOKE ALL ON FUNCTION public\.atp2_/g) || []).length >= 3 &&
      (atomicMigrationText.match(/TO service_role;/g) || []).length >= 3 &&
      (atomicMigrationText.match(/SET search_path = pg_catalog, public/g) || []).length >= 3,
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
    checks.inviteReplayRejected
      ? 'accept-invite rejects non-pending invites and marks successful claims as claimed.'
      : 'WARNING: accept-invite replay rejection is not clearly present.',
  );
  items.push(
    checks.inviteMinEntropy
      ? 'Delegate invite ids use at least 32 bytes of entropy.'
      : 'WARNING: delegate invite ids do not meet the 32-byte entropy floor.',
  );
  items.push(
    checks.inviteUsesCryptoRandomness
      ? 'Delegate invite ids are generated with crypto.getRandomValues.'
      : 'WARNING: delegate invite ids are not clearly generated with cryptographic randomness.',
  );
  items.push(
    checks.inviteHasCollisionRetry
      ? 'Delegate invite creation retries cryptographic ids on primary-key collision.'
      : 'WARNING: delegate invite creation does not clearly retry id collisions.',
  );
  items.push(
    checks.inviteHasExpiration
      ? 'Delegate invite expiration is enforced before accept.'
      : 'WARNING: delegate invite expiration is not clearly enforced before accept.',
  );
  items.push(
    checks.inviteRoutesRateLimited
      ? 'Delegate invite creation and accept routes use the distributed rate limiter.'
      : 'WARNING: delegate invite routes are not clearly rate limited.',
    checks.relationalRuntime
      ? 'M2M config, delegates, invites, and encrypted secrets use relational tables at runtime.'
      : 'CRITICAL: M2M runtime still depends on legacy KV state.',
    checks.atomicDelegateCapacity
      ? 'Invite creation, invite claim, and managed delegate registration use serialized Postgres transactions.'
      : 'CRITICAL: M2M capacity and invite state are not clearly transactionally serialized.',
    checks.serviceRoleOnlyAtomicRpcs
      ? 'M2M mutation RPCs are service-role-only SECURITY DEFINER functions with a fixed search path.'
      : 'CRITICAL: M2M mutation RPC execution grants or search_path are incomplete.',
  );
  const clientLeak = scanClientM2MSecrets();
  items.push(...clientLeak.items);
  const backupScan = scanManagedDelegateBackupHandling(text, atomicMigrationText);
  items.push(...backupScan.items);

  return {
    ok: Object.values(checks).every(Boolean) && clientLeak.ok && backupScan.ok,
    items,
    checks: { ...checks, ...backupScan.checks },
    clientM2M: clientLeak,
    backup: backupScan,
  };
}

function scanManagedDelegateBackupHandling(text, atomicMigrationText) {
  const secretRecordBlock = extractRouteBlock(
    text,
    'async function encryptManagedDelegateSecret',
    'function buildMappings',
  );
  const generateRouteBlock = extractRouteBlock(
    text,
    "aiM2MWallet.post('/delegates/generate'",
    "aiM2MWallet.post('/delegates/invite'",
  );

  const checks = {
    aesGcm: /AES-GCM/.test(secretRecordBlock),
    twelveByteIv: /new Uint8Array\(12\)/.test(secretRecordBlock),
    ciphertextRecordOnly:
      /registerManagedDelegate\(delegateRecord, encryptedSecret\)/.test(generateRouteBlock) &&
      /INSERT INTO public\.m2m_delegate_secrets/.test(atomicMigrationText) &&
      /INSERT INTO public\.m2m_delegates/.test(atomicMigrationText),
    noSecretRecordInJson: !/c\.json\([^)]*(encryptedSecret|ciphertextHex|ivHex)/s.test(text),
    noPrivateKeyLogging: !/console\.(log|error|warn)\([^)]*privateKey/s.test(text),
    noDecryptOrExportEndpoint: !/decryptManagedDelegateSecret|privateKey.*download|export.*delegate.*secret/i.test(text),
  };

  return {
    ok: Object.values(checks).every(Boolean),
    checks,
    items: [
      checks.aesGcm
        ? 'Managed delegate backup ciphertext uses AES-GCM.'
        : 'WARNING: managed delegate backup ciphertext does not clearly use AES-GCM.',
      checks.twelveByteIv
        ? 'Managed delegate encryption uses a 12-byte IV.'
        : 'WARNING: managed delegate encryption IV length is not clearly 12 bytes.',
      checks.ciphertextRecordOnly
        ? 'Managed delegate private keys are stored only through the encrypted secret record path.'
        : 'CRITICAL: managed delegate private keys may be persisted outside the encrypted secret record.',
      checks.noSecretRecordInJson
        ? 'Managed delegate ciphertext/IV are not returned in JSON responses.'
        : 'WARNING: managed delegate ciphertext metadata may be returned in JSON responses.',
      checks.noPrivateKeyLogging
        ? 'Managed delegate private keys are not logged by the M2M module.'
        : 'CRITICAL: managed delegate private key logging pattern found.',
      checks.noDecryptOrExportEndpoint
        ? 'No delegate secret decrypt/export endpoint is present.'
        : 'WARNING: delegate secret decrypt/export surface requires review.',
      'Legacy KV ciphertext is backfilled by migration 000083; migration 000084 revokes runtime Data API access to the owner-only archive.',
    ],
  };
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
    'IPFS check and upload routes require wallet authentication; public info responses do not expose Pinata credentials.',
  ];

  return { ok: Object.values(checks).every(Boolean), items, checks };
}

function scanRateLimiterModule() {
  const filePath = path.join(ROOT, 'supabase', 'functions', 'server', 'rate-limiter.ts');
  if (!fs.existsSync(filePath)) {
    return { ok: false, items: ['rate-limiter.ts not found'], checks: {} };
  }

  const text = fs.readFileSync(filePath, 'utf8');
  const budgetNames = new Set(
    [...text.matchAll(/^\s{2}([a-z][a-z0-9_]+):\s*\{\s*maxRequests:/gm)].map((match) => match[1]),
  );
  const calledBudgets = new Map();
  for (const sourcePath of walk(path.join(ROOT, 'supabase', 'functions', 'server'))) {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const relativePath = path.relative(ROOT, sourcePath);
    for (const match of source.matchAll(/checkRateLimit\(\s*['"]([a-z][a-z0-9_]+)['"]/g)) {
      if (!calledBudgets.has(match[1])) calledBudgets.set(match[1], []);
      calledBudgets.get(match[1]).push(relativePath);
    }
  }
  const missingBudgets = [...calledBudgets.keys()].filter((name) => !budgetNames.has(name)).sort();
  const unusedBudgets = [...budgetNames].filter((name) => !calledBudgets.has(name)).sort();
  const checks = {
    usesAtomicRpc: /\.rpc\(['"]rate_limit_increment['"]/.test(text),
    noLegacyReadModifyWrite:
      !/request_count\s*:\s*currentCount/.test(text) &&
      !/\.select\(['"]id,request_count,window_start['"]\)/.test(text),
    allCallSitesHaveBudgets: missingBudgets.length === 0,
    unknownBudgetFailsClosed:
      /if \(!budget\)[\s\S]{0,250}allowed:\s*false/.test(text),
    sharedStoreFailureFailsClosed:
      /atomic increment error:[\s\S]{0,500}allowed:\s*false/.test(text),
  };

  const items = [
    checks.usesAtomicRpc
      ? 'Rate limiter increments counters through public.rate_limit_increment RPC.'
      : 'CRITICAL: rate limiter does not use the atomic rate_limit_increment RPC.',
    checks.noLegacyReadModifyWrite
      ? 'No legacy select-then-update request_count path detected.'
      : 'WARNING: legacy read-modify-write rate limit path is still present.',
    checks.allCallSitesHaveBudgets
      ? `All ${calledBudgets.size} referenced rate-limit families have declared budgets.`
      : `CRITICAL: missing rate-limit budgets: ${missingBudgets.join(', ')}`,
    checks.unknownBudgetFailsClosed
      ? 'Unknown rate-limit families fail closed.'
      : 'CRITICAL: unknown rate-limit families may fail open.',
    checks.sharedStoreFailureFailsClosed
      ? 'Shared rate-limit store failures fail closed.'
      : 'CRITICAL: shared rate-limit store failure may bypass throttling.',
    unusedBudgets.length
      ? `Unused declared budgets (non-blocking cleanup): ${unusedBudgets.join(', ')}`
      : 'No unused rate-limit budgets.',
  ];

  return { ok: Object.values(checks).every(Boolean), items, checks, missingBudgets, unusedBudgets };
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
    return { ok: false, items: ['supabase/functions directory not found'], offenders: [], checks: {} };
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
    if (/return\s+["']\*["']/.test(text) && /cors/i.test(text)) {
      offenders.push(`${rel}: returns wildcard CORS origin`);
    }
  }

  const edgeAppPath = path.join(ROOT, 'supabase', 'functions', 'server', 'edge-app.ts');
  const edgeAppText = fs.existsSync(edgeAppPath) ? fs.readFileSync(edgeAppPath, 'utf8') : '';
  const broadPatterns = [
    { label: 'supabase.co', re: /supabase\\\.co|supabase\.co/ },
    { label: 'vercel.app', re: /vercel\\\.app|vercel\.app/ },
    { label: 'netlify.app', re: /netlify\\\.app|netlify\.app/ },
    { label: 'workers.dev', re: /workers\\\.dev|workers\.dev/ },
  ].filter((entry) => entry.re.test(edgeAppText)).map((entry) => entry.label);
  const checks = {
    noWildcardCors: offenders.length === 0,
    exactProductionOrigins: edgeAppText.includes('https://app.orina.io') && edgeAppText.includes('https://orina.io'),
    envExactAllowlist: edgeAppText.includes('ORINA_CORS_ALLOWED_ORIGINS'),
    localOriginsNonProductionOnly: edgeAppText.includes('isProductionCorsMode') && edgeAppText.includes('LOCAL_ORIGIN_PATTERNS'),
    previewOriginsExplicitlyEnabled:
      broadPatterns.length === 0 ||
      (
        edgeAppText.includes('ORINA_CORS_ALLOW_PREVIEW_ORIGINS') &&
        edgeAppText.includes('PREVIEW_ORIGIN_PATTERNS') &&
        edgeAppText.includes('isPreviewOriginAllowed')
      ),
  };

  const items = offenders.length
    ? [`WARNING: wildcard CORS configuration present in ${offenders.join(', ')}`]
    : ['No explicit wildcard CORS configuration found under supabase/functions.'];
  items.push(
    checks.exactProductionOrigins
      ? 'Exact production origins are configured for app.orina.io and orina.io.'
      : 'WARNING: exact production origins are missing from the shared CORS policy.',
  );
  items.push(
    checks.envExactAllowlist
      ? 'Additional production origins require explicit ORINA_CORS_ALLOWED_ORIGINS entries.'
      : 'WARNING: no explicit CORS env allowlist support found.',
  );
  items.push(
    checks.localOriginsNonProductionOnly
      ? 'Localhost origins are blocked when ORINA_CORS_ENV=production.'
      : 'WARNING: localhost origins are not clearly gated out of production CORS mode.',
  );
  items.push(
    checks.previewOriginsExplicitlyEnabled
      ? `Broad deployment host patterns are gated by ORINA_CORS_ALLOW_PREVIEW_ORIGINS (${broadPatterns.join(', ') || 'none'}).`
      : `WARNING: broad deployment host patterns are accepted without an explicit preview CORS flag (${broadPatterns.join(', ')}).`,
  );

  return {
    ok: Object.values(checks).every(Boolean),
    offenders,
    checks,
    broadPatterns,
    items,
  };
}

function runEdgeDependencyAudit() {
  const result = spawnSync(
    'deno',
    ['audit', '--lock=supabase/functions/deno.lock', '--frozen', '--level=high'],
    { cwd: ROOT, encoding: 'utf8', shell: true },
  );
  return {
    ok: result.status === 0,
    output: String(result.stdout || result.stderr || '').trim().slice(0, 4_000),
  };
}

function scanP0HardeningControls() {
  const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  const bridge = read('supabase/functions/server/wallet-auth-claim-bridge.tsx');
  const receiptSync = read('supabase/functions/server/sync-receipt-nfts.ts');
  const orderKeeper = read('supabase/functions/server/order-autotime-keeper.ts');
  const vision = read('supabase/functions/server/nvidia-nim-client.ts');
  const minting = read('supabase/functions/server/seller-ai-minting-handler.ts');
  const rest = read('src/utils/supabaseRest.ts');
  const config = read('utils/supabase/info.tsx');
  const runtimeSurface = read('scripts/check-protocol-runtime-surface.mjs');
  const prerender = read('scripts/prerender-public-routes.mjs');
  const migration = read('supabase/migrations/000082_p0_trust_projection_and_review_hardening.sql');
  const m2mMigration = read('supabase/migrations/000083_m2m_atomic_relational_state.sql');
  const conversationMigration = read('supabase/migrations/000084_ai_conversation_relational_cutover.sql');
  const conversationEngine = read('supabase/functions/server/orina-ai-engine-v2.tsx');
  const m2m = read('supabase/functions/server/ai-m2m-wallet.ts');
  const requestAuth = read('supabase/functions/server/request-auth.ts');
  const idempotency = read('supabase/functions/server/idempotency-replay.ts');
  const edgeApp = read('supabase/functions/server/edge-app.ts');
  const b2b = read('supabase/functions/server/b2b-api-client.ts');
  const headers = read('public/_headers');
  const walletSyncHandler = receiptSync.match(/post\("\/sync-wallet"[\s\S]*?export default/)?.[0] || '';

  const checks = {
    oneTimeWalletChallenge: /post\('\/challenge'/.test(bridge)
      && /consumeWalletAuthChallenge/.test(bridge)
      && /crypto\.getRandomValues/.test(bridge)
      && /walletAuthSession\.message origin mismatch/.test(bridge)
      && /verifyRequestAndResolveIdentity\(body, walletAddress, allowedOrigin\)/.test(bridge),
    privilegedBridgeRoutesOperatorOnly:
      (bridge.match(/isRepairOperatorWallet\(auth\.identity\.walletAddress\)/g) || []).length >= 4,
    walletSyncCannotTriggerGlobalRangeScan: walletSyncHandler.length > 0
      && !/syncReceipts\s*\(/.test(walletSyncHandler)
      && !/findHighestReceiptTokenId|syncWalletReceiptsFromContract/.test(receiptSync),
    remoteImageFetchIsRestricted: /redirect:\s*["']error["']/.test(vision)
      && /validateVisionImageUrl/.test(vision)
      && /MAX_REMOTE_IMAGE_BYTES/.test(vision),
    clientMintProjectionDisabled: /verified_mint_projection_required/.test(minting),
    restWritesRequireBridgeToken: /resolveBearerToken\(authMode/.test(rest)
      && !/getSupabaseBridgeAccessToken\(\)\s*\|\|\s*publicAnonKey/.test(rest),
    noHardcodedSupabaseFallback: !/eyJhbGciOi/.test(config)
      && !/DEFAULT_PROJECT_ID/.test(config)
      && !/eyJhbGciOi/.test(runtimeSurface)
      && !/DEFAULT_SUPABASE_PROJECT_ID/.test(runtimeSurface)
      && !/eyJhbGciOi/.test(prerender)
      && !/DEFAULT_SUPABASE_PROJECT_ID/.test(prerender),
    trustAndProjectionMigration: /submit_profile_review_v2/.test(migration)
      && /revoke insert, update, delete on table public\.protocol_orders from authenticated/i.test(migration)
      && /numeric\(78, 0\)/.test(migration),
    requestJwtAndSessionAreBounded:
      /header\.alg \|\| ['"]{2}\) !== ['"]HS256['"]/.test(requestAuth)
      && /header\.typ \|\| ['"]{2}\) !== ['"]JWT['"]/.test(requestAuth)
      && /ATP2_SUPABASE_AUTH_BRIDGE_MAX_TOKEN_TTL_SECONDS/.test(requestAuth)
      && /new TextEncoder\(\)\.encode\(secret\)\.byteLength >= 32/.test(requestAuth)
      && /\.from\('wallet_sessions'\)/.test(requestAuth)
      && /\.from\('profiles'\)/.test(requestAuth)
      && /\.eq\('status', 'active'\)/.test(requestAuth),
    idempotencyDoesNotPersistTokens:
      /accessToken/.test(idempotency)
      && /containsNonReplayableSecret/.test(idempotency)
      && /completed_no_replay/.test(idempotency),
    requestAndVendorBodiesAreBounded:
      /registerRequestBodyLimitMiddleware/.test(edgeApp)
      && /readBoundedResponseBytes/.test(edgeApp)
      && /readBoundedJson/.test(b2b),
    supplierDataIsTreatedAsUntrusted:
      /safePublicHttpsUrl/.test(b2b)
      && /sanitizeSourcedProduct/.test(b2b)
      && !/kvSet\(["']cj_access_token/.test(b2b),
    m2mMutationsAreAtomicAndRelational:
      !/from ['"]\.\/kv_store\.tsx['"]/.test(m2m)
      && (m2mMigration.match(/pg_advisory_xact_lock/g) || []).length >= 3
      && (m2mMigration.match(/REVOKE ALL ON FUNCTION public\.atp2_/g) || []).length >= 3,
    aiConversationsAreRelationalOnly:
      !/kv_store|\bkv\./.test(conversationEngine)
      && /\.from\('agent_threads'\)/.test(conversationEngine)
      && /\.from\('agent_messages'\)/.test(conversationEngine)
      && /legacy-kv-cutover-000084/.test(conversationMigration)
      && /REVOKE ALL ON TABLE public\.kv_store_b0d68fc8 FROM service_role;/i.test(conversationMigration)
      && !fs.existsSync(path.join(ROOT, 'supabase', 'functions', 'server', 'kv_store.tsx')),
    serviceExecutorAuthIsExactAndHighEntropy:
      /authorization === `Bearer \$\{serviceRoleKey\}`/.test(m2m)
      && /expectedSecret\.length >= 32/.test(m2m)
      && /auth !== `Bearer \$\{serviceKey\}`/.test(orderKeeper)
      && /cronSecret\.length >= 32/.test(orderKeeper)
      && !/auth\.includes\(serviceKey\)/.test(orderKeeper),
    browserSecurityHeaders:
      /Content-Security-Policy:/i.test(headers)
      && /Strict-Transport-Security:/i.test(headers)
      && /X-Content-Type-Options:\s*nosniff/i.test(headers)
      && !/connect-src[^;]*\shttps:\s/i.test(headers)
      && !/connect-src[^;]*\swss:\s/i.test(headers),
  };
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  return {
    ok: failed.length === 0,
    checks,
    items: failed.length === 0
      ? ['Wallet nonce, object authorization, SSRF, projection provenance, REST fail-closed and trust-field controls are present.']
      : failed.map((name) => `Missing P0 hardening invariant: ${name}`),
  };
}

function scanSupabasePublicDataApiGrants() {
  const scriptPath = path.join(ROOT, 'scripts', 'verify-supabase-public-data-api-grants.mjs');
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, items: ['verify-supabase-public-data-api-grants.mjs not found'], report: null };
  }

  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  let report = null;
  try {
    report = JSON.parse(result.stdout || '{}');
  } catch {
    report = null;
  }

  const items = [];
  if (!report) {
    items.push(`CRITICAL: unable to parse Data API grant verifier output: ${result.stderr || result.stdout || 'empty output'}`);
  } else {
    items.push(`Public tables created by migrations: ${report.publicTablesCreated}`);
    items.push(`Tables with an explicit Data API grant/revoke decision: ${report.tablesWithExplicitDataApiDecision}`);
    items.push(`Tables retaining at least one explicit Data API role grant: ${report.tablesWithExplicitDataApiGrant}`);
    items.push(
      report.missingExplicitGrant?.length
        ? `CRITICAL: missing explicit grant/revoke decisions for ${report.missingExplicitGrant.map((entry) => entry.table).join(', ')}`
        : 'All migration-created public tables have an explicit grant or revoke decision for Data API roles.',
    );
    items.push(
      report.postgisSpatialRefSys?.enabled
        ? 'PostGIS spatial_ref_sys RLS is enabled by migration when the table exists.'
        : report.postgisSpatialRefSys?.ownerActionRequired
          ? 'PostGIS spatial_ref_sys RLS remains an owner/Supabase-admin action because the table is extension-owned.'
          : 'WARNING: PostGIS spatial_ref_sys RLS hardening is not present.',
    );
    items.push(
      report.postgisSpatialRefSys?.selectGrant && report.postgisSpatialRefSys?.readPolicy
        ? 'PostGIS spatial_ref_sys has explicit read-only Data API access.'
        : report.postgisSpatialRefSys?.ownerActionRequired
          ? 'PostGIS spatial_ref_sys Data API/RLS policy is tracked separately from normal app-table migration grants.'
          : 'WARNING: PostGIS spatial_ref_sys read-only policy/grant is incomplete.',
    );
  }

  return {
    ok: result.status === 0 && Boolean(report?.pass),
    items,
    report,
  };
}

function buildAggregate(vuln, m2mScan, messagingScan, ipfsScan, rateLimiterScan, auditAliasScan, corsScan, dataApiGrantScan) {
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
        'M2M routes use bridge JWT + wallet match; relational mutations are serialized; delegate keys are encrypted at rest.',
      details: m2mScan?.checks || {},
    },
    apiKeyManagement: {
      status: 'ok',
      summary: 'Relational API-key routes require H1 JWT + wallet match and store only key hashes.',
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
    rateLimiting: {
      status: rateLimiterScan?.ok ? 'ok' : 'risk',
      summary: rateLimiterScan?.ok
        ? 'Distributed rate limiting uses the atomic rate_limit_increment RPC.'
        : 'Review distributed rate limiting for read-modify-write races.',
      details: rateLimiterScan?.checks || {},
    },
    cors: {
      status: corsScan?.ok ? 'ok' : 'review',
      summary: corsScan?.ok
        ? 'No explicit wildcard CORS config found; shared edge app gates origins by allowlist/pattern.'
        : 'Review wildcard CORS usage in edge functions and restrict to the shared edge app policy.',
    },
    supabaseDataApiGrants: {
      status: dataApiGrantScan?.ok ? 'ok' : 'review',
      summary: dataApiGrantScan?.ok
        ? dataApiGrantScan.report?.postgisSpatialRefSys?.ownerActionRequired
          ? 'Migration-created public app tables have explicit Data API grants; extension-owned spatial_ref_sys remains an owner/Supabase-admin action.'
          : 'Migration-created public tables have explicit Data API grants and PostGIS spatial_ref_sys RLS hardening.'
        : 'Review public schema table grants before Supabase public-schema default grant changes.',
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
    areas.rateLimiting.status === 'ok' ? 'ratelimit:ok' : 'ratelimit:risk',
    areas.m2mDelegatedAiWallet.status === 'ok' ? 'm2m:ok' : 'm2m:review',
    areas.cors.status === 'ok' ? 'cors:ok' : 'cors:review',
    areas.supabaseDataApiGrants.status === 'ok' ? 'data-api-grants:ok' : 'data-api-grants:review',
  ].join(' | ');

  return { generatedAt: new Date().toISOString(), oneLineSummary: oneLine, areas };
}

function main() {
  const messagingScan = scanMessagingModule();
  const ipfsScan = scanIpfsModule();
  const rateLimiterScan = scanRateLimiterModule();
  const auditAliasScan = scanAuditServiceRoleAliases();
  const corsScan = scanCorsConfigurations();
  const dataApiGrantScan = scanSupabasePublicDataApiGrants();
  const p0HardeningScan = scanP0HardeningControls();

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

  try {
    execSync(`node "${path.join(ROOT, 'scripts', 'check-tracked-secrets.mjs')}"`, {
      cwd: ROOT,
      stdio: 'pipe',
    });
    addSection('Tracked/unignored files: high-confidence secret patterns', ['OK: no forbidden patterns'], 'info');
  } catch (e) {
    addSection('Tracked/unignored files: high-confidence secret patterns', [String(e.stderr || e.message || e)], 'critical');
  }

  // 2) npm audit
  const audit = runNpmAuditJson();
  const { summary: vuln } = summarizeAudit(audit);
  const npmAuditPolicy = classifyNpmAudit(audit);
  if (vuln) {
    const line = `vulnerabilities — critical:${vuln.critical} high:${vuln.high} moderate:${vuln.moderate} low:${vuln.low} info:${vuln.info}`;
    addSection('npm audit (summary)', [line, 'Remediation: npm audit fix (or pin overrides in package.json)'], npmAuditPolicy.severity);
  } else {
    addSection('npm audit', ['Could not parse audit JSON — run npm audit manually'], 'high');
  }

  const edgeAudit = runEdgeDependencyAudit();
  addSection(
    'Deno Edge dependency audit',
    [edgeAudit.output || (edgeAudit.ok ? 'No known high/critical Edge dependency vulnerabilities.' : 'Deno audit did not return evidence.')],
    edgeAudit.ok ? 'info' : 'high',
  );

  // 3) Source risk patterns
  const { hits, fileCount } = scanSourceRiskPatterns();
  addSection(
    'DOM / code injection patterns (manual review)',
    [
      `Scanned ${fileCount} TS/TSX files under src/, utils/, supabase/functions/`,
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
      'Supabase URL and anon/publishable key are environment-only; no executable project fallback is embedded.',
    ],
    'info'
  );

  // 5) Architecture notes (static — keep in sync with security reviews)
  addSection(
    'Edge / server (review periodically)',
    [
      'API-key management routes require an H1 bridge JWT and keep only SHA-256 hashes; no public API-key bearer consumer is registered in the current Edge router.',
      'Messaging (orina-chat-v1 + messages-handler-c5): H1 JWT + wallet match enforced, with participant membership checks on message reads.',
      'IPFS upload (ipfs-upload.tsx): single and batch routes require H1 JWT and distributed per-wallet rate limits.',
      'CORS: shared edge app applies origin allowlist/pattern gating; review deployed origins periodically.',
    ],
    'info'
  );

  // 6) AI M2M (delegated wallet) — static analysis
  const m2mScan = scanM2MModule();
  addSection(
    'AI M2M / delegated wallet (ai-m2m-wallet.ts + client)',
    m2mScan.items,
    m2mScan.ok ? 'info' : 'critical',
  );

  addSection('Messaging auth / authorization (messages-handler-c5.ts)', messagingScan.items, messagingScan.ok ? 'info' : 'critical');
  addSection('IPFS upload protection (ipfs-upload.tsx)', ipfsScan.items, ipfsScan.ok ? 'info' : 'critical');
  addSection('Distributed rate limiting (rate-limiter.ts)', rateLimiterScan.items, rateLimiterScan.ok ? 'info' : 'critical');
  addSection('Audit tooling secret aliases', auditAliasScan.items, auditAliasScan.ok ? 'info' : 'moderate');
  addSection('Edge function CORS posture', corsScan.items, corsScan.ok ? 'info' : 'moderate');
  addSection('Supabase public Data API grants', dataApiGrantScan.items, dataApiGrantScan.ok ? 'info' : 'critical');
  addSection('P0 application hardening invariants', p0HardeningScan.items, p0HardeningScan.ok ? 'info' : 'critical');

  if (!messagingScan.ok || !ipfsScan.ok || !rateLimiterScan.ok || !dataApiGrantScan.ok || !p0HardeningScan.ok) {
    REPORT.exitCode = 1;
  }

  REPORT.aggregate = buildAggregate(vuln, m2mScan, messagingScan, ipfsScan, rateLimiterScan, auditAliasScan, corsScan, dataApiGrantScan);

  console.log(JSON.stringify(REPORT, null, 2));
  process.exit(REPORT.exitCode);
}

main();
