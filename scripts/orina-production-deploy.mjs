#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const repo = 'Archiver-KA/Orina-Protocol-Runtime';
const workflow = 'supabase-production-deploy.yml';
const workflowName = 'Supabase Production Deploy';
const productionEnvironment = 'production';
const productionProjectRef = 'ystjugghyteyylkevbsl';
const defaultApprovalRecord = 'audit/deployment-approval-contract.json';
const requiredSecretNames = [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_PROJECT_REF',
  'SUPABASE_DB_AUDIT_URL',
  'VITE_SUPABASE_ANON_KEY',
];

function parseArgs(argv) {
  const out = {
    approvalRecord: defaultApprovalRecord,
    waitMs: 30 * 60 * 1000,
    pollIntervalMs: 30 * 1000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--preflight') out.preflight = true;
    else if (arg === '--dispatch') out.dispatch = true;
    else if (arg === '--poll') out.poll = true;
    else if (arg === '--verify-backend') out.verifyBackend = true;
    else if (arg === '--ci') out.ci = true;
    else if (arg === '--skip-github-secret-check') out.skipGithubSecretCheck = true;
    else if (arg === '--skip-git-clean-check') out.skipGitCleanCheck = true;
    else if (arg === '--approved-commit') out.approvedCommit = argv[++index];
    else if (arg === '--approval-record') out.approvalRecord = argv[++index];
    else if (arg === '--run-id') out.runId = argv[++index];
    else if (arg === '--wait-ms') out.waitMs = Number(argv[++index]);
    else if (arg === '--poll-interval-ms') out.pollIntervalMs = Number(argv[++index]);
    else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!out.preflight && !out.dispatch && !out.poll && !out.verifyBackend) {
    out.preflight = true;
  }

  return out;
}

function parseDotEnv(path) {
  const values = new Map();
  if (!existsSync(path)) return values;

  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(name, value);
  }

  return values;
}

const dotenv = parseDotEnv('.env');

function envValue(name) {
  return process.env[name] || dotenv.get(name) || '';
}

function log(key, value) {
  console.log(`${key}=${value}`);
}

function fail(message) {
  throw new Error(message);
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function currentHead() {
  return git(['rev-parse', 'HEAD']);
}

function validateEnvPresence() {
  const missing = requiredSecretNames.filter((name) => !envValue(name));
  if (missing.length > 0) {
    fail(`Missing required secret or environment variable names: ${missing.join(', ')}`);
  }
  log('required_secret_names_present', true);
}

function validateSecretShapes() {
  const projectRef = envValue('SUPABASE_PROJECT_REF');
  if (!/^[a-z0-9]{20}$/.test(projectRef)) {
    fail('SUPABASE_PROJECT_REF must look like a 20-character Supabase project ref.');
  }
  if (projectRef !== productionProjectRef) {
    fail('SUPABASE_PROJECT_REF does not match the canonical Orina production project.');
  }

  const anonKey = envValue('VITE_SUPABASE_ANON_KEY');
  if (anonKey.length < 40) {
    fail('VITE_SUPABASE_ANON_KEY is present but too short to be a valid anon key.');
  }

  const publicProjectId = envValue('VITE_SUPABASE_PROJECT_ID');
  if (publicProjectId && publicProjectId !== projectRef) {
    fail('VITE_SUPABASE_PROJECT_ID does not match SUPABASE_PROJECT_REF.');
  }

  const publicUrl = envValue('VITE_SUPABASE_URL');
  if (publicUrl) {
    let parsedPublicUrl;
    try {
      parsedPublicUrl = new URL(publicUrl);
    } catch {
      fail('VITE_SUPABASE_URL must be a parseable HTTPS URL.');
    }
    if (
      parsedPublicUrl.protocol !== 'https:'
      || parsedPublicUrl.hostname.toLowerCase() !== `${projectRef}.supabase.co`
    ) {
      fail('VITE_SUPABASE_URL does not match SUPABASE_PROJECT_REF.');
    }
  }

  const jwtPayload = anonKey.split('.')[1] || '';
  if (jwtPayload) {
    try {
      const normalized = jwtPayload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const jwtProjectRef = String(JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))?.ref || '');
      if (jwtProjectRef && jwtProjectRef !== projectRef) {
        fail('VITE_SUPABASE_ANON_KEY does not belong to SUPABASE_PROJECT_REF.');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('does not belong')) throw error;
      fail('VITE_SUPABASE_ANON_KEY contains a malformed JWT payload.');
    }
  }

  const dbUrl = envValue('SUPABASE_DB_AUDIT_URL');
  if (/[<>\[\]]/.test(dbUrl)) {
    fail('SUPABASE_DB_AUDIT_URL contains placeholder brackets; replace it with the real Postgres connection string.');
  }

  let parsed;
  try {
    parsed = new URL(dbUrl);
  } catch {
    fail('SUPABASE_DB_AUDIT_URL must be a parseable Postgres connection URL.');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    fail('SUPABASE_DB_AUDIT_URL must use postgres:// or postgresql://.');
  }
  if (!parsed.username || !parsed.password || !parsed.hostname) {
    fail('SUPABASE_DB_AUDIT_URL must include username, password, and hostname.');
  }
  if (!parsed.port) {
    fail('SUPABASE_DB_AUDIT_URL must include an explicit port.');
  }

  const dbUsername = decodeURIComponent(parsed.username).toLowerCase();
  const dbHostname = parsed.hostname.toLowerCase();
  if (!dbUsername.includes(projectRef) && !dbHostname.includes(projectRef)) {
    fail('SUPABASE_DB_AUDIT_URL does not identify SUPABASE_PROJECT_REF.');
  }

  log('secret_shape_validation', 'passed');
}

function validateGitState(options) {
  if (options.ci || options.skipGitCleanCheck) {
    log('git_clean_check', 'skipped');
    return;
  }

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== 'main') {
    fail(`Deployment preflight must run on main; current branch is ${branch}.`);
  }

  const porcelain = git(['status', '--porcelain']);
  if (porcelain) {
    fail('Working tree is dirty; commit or intentionally discard changes before production dispatch.');
  }

  const head = currentHead();
  const originMain = git(['rev-parse', 'origin/main']);
  if (head !== originMain) {
    fail('Local HEAD does not match origin/main; push or pull before production dispatch.');
  }

  log('git_clean_main_aligned', true);
}

function gh(args) {
  try {
    return execFileSync('gh', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const stderr = String(error?.stderr || '').trim();
    fail(`GitHub CLI command failed${stderr ? `: ${stderr.slice(0, 300)}` : '.'}`);
  }
}

async function verifyGithubSecretNames(options) {
  if (options.skipGithubSecretCheck || options.ci) {
    log('github_secret_name_check', 'skipped');
    return;
  }

  const seen = new Set(
    JSON.parse(gh(['secret', 'list', '--repo', repo, '--json', 'name']) || '[]')
      .map((secret) => secret.name),
  );

  try {
    const environmentSecrets = JSON.parse(
      gh(['secret', 'list', '--repo', repo, '--env', productionEnvironment, '--json', 'name']) || '[]',
    );
    for (const secret of environmentSecrets) seen.add(secret.name);
  } catch (error) {
    if (requiredSecretNames.some((name) => !seen.has(name))) throw error;
  }

  const missing = requiredSecretNames.filter((name) => !seen.has(name));
  if (missing.length > 0) {
    fail(`GitHub Actions is missing required secret names: ${missing.join(', ')}`);
  }
  log('github_required_secret_names_present', true);
}

async function runPreflight(options) {
  validateEnvPresence();
  validateSecretShapes();
  validateGitState(options);
  await verifyGithubSecretNames(options);
  log('production_deploy_preflight', 'passed');
}

async function dispatchWorkflow(options) {
  const approvedCommit = options.approvedCommit || currentHead();
  gh([
    'workflow', 'run', workflow,
    '--repo', repo,
    '--ref', 'main',
    '-f', `approved_commit=${approvedCommit}`,
    '-f', `approval_record=${options.approvalRecord}`,
    '-f', 'confirm=DEPLOY_SUPABASE_PRODUCTION',
  ]);
  log('workflow_dispatch_status', 'accepted');
  log('approved_commit', approvedCommit);
}

async function latestWorkflowRunForHead(approvedCommit) {
  const discoveryDeadline = Date.now() + 60_000;
  while (Date.now() <= discoveryDeadline) {
    const runs = JSON.parse(gh([
      'run', 'list',
      '--repo', repo,
      '--workflow', workflow,
      '--branch', 'main',
      '--event', 'workflow_dispatch',
      '--limit', '20',
      '--json', 'databaseId,headSha,status,conclusion,url,createdAt',
    ]) || '[]');
    const matches = runs
      .filter((run) => run.headSha === approvedCommit)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (matches.length > 0) {
      return {
        id: String(matches[0].databaseId),
        html_url: matches[0].url,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  fail(`No ${workflowName} workflow_dispatch run found for ${approvedCommit} within 60 seconds.`);
}

async function pollWorkflow(options) {
  const approvedCommit = options.approvedCommit || currentHead();
  let runId = options.runId;
  if (!runId) {
    const latestRun = await latestWorkflowRunForHead(approvedCommit);
    runId = String(latestRun.id);
    log('workflow_run_id', runId);
    log('workflow_run_url', latestRun.html_url);
  }

  const start = Date.now();
  while (Date.now() - start <= options.waitMs) {
    const run = JSON.parse(gh([
      'run', 'view', runId,
      '--repo', repo,
      '--json', 'status,conclusion,url',
    ]) || '{}');
    log('workflow_run_status', `${run.status}${run.conclusion ? `:${run.conclusion}` : ''}`);
    if (run.status === 'completed') {
      if (run.conclusion !== 'success') {
        fail(`Workflow run ${runId} completed with conclusion ${run.conclusion}.`);
      }
      return run;
    }
    await new Promise((resolve) => setTimeout(resolve, options.pollIntervalMs));
  }
  fail(`Timed out waiting for workflow run ${runId}.`);
}

async function verifyBackendProduction() {
  const projectRef = envValue('SUPABASE_PROJECT_REF');
  const anonKey = envValue('VITE_SUPABASE_ANON_KEY');
  if (!projectRef || !anonKey) {
    fail('Backend verification requires SUPABASE_PROJECT_REF and VITE_SUPABASE_ANON_KEY.');
  }

  const healthUrl = `https://${projectRef}.supabase.co/functions/v1/make-server-b0d68fc8/health`;
  const allowedGet = await fetch(healthUrl, {
    headers: {
      Origin: 'https://app.orina.io',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  if (allowedGet.status !== 200) fail(`Production health GET failed with status ${allowedGet.status}.`);
  const getOrigin = allowedGet.headers.get('access-control-allow-origin') || '';
  if (getOrigin !== 'https://app.orina.io') {
    fail(`Production health GET returned unexpected allow-origin: ${getOrigin || '(empty)'}.`);
  }

  const allowedOptions = await fetch(healthUrl, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://app.orina.io',
      'Access-Control-Request-Method': 'GET',
    },
  });
  if (allowedOptions.status !== 204) {
    fail(`Production allowed-origin OPTIONS failed with status ${allowedOptions.status}.`);
  }
  if ((allowedOptions.headers.get('access-control-allow-origin') || '') !== 'https://app.orina.io') {
    fail('Production allowed-origin OPTIONS did not return the approved origin.');
  }

  const deniedOptions = await fetch(healthUrl, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://evil.example',
      'Access-Control-Request-Method': 'GET',
    },
  });
  if (deniedOptions.headers.has('access-control-allow-origin')) {
    fail('Production denied-origin OPTIONS unexpectedly returned access-control-allow-origin.');
  }

  log('backend_health_get', allowedGet.status);
  log('backend_allowed_options', allowedOptions.status);
  log('backend_denied_options', deniedOptions.status);
  log('backend_production_verification', 'passed');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.preflight) await runPreflight(options);
  if (options.dispatch) await dispatchWorkflow(options);
  if (options.poll) await pollWorkflow(options);
  if (options.verifyBackend) await verifyBackendProduction();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
