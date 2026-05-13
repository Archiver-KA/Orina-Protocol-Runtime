#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import process from 'node:process';

const API_BASE = 'https://api.github.com';
const TOKEN_ENV = 'GITHUB_BRANCH_PROTECTION_TOKEN';

function parseArgs(argv) {
  const options = {
    repo: process.env.GITHUB_REPOSITORY || '',
    branch: process.env.GITHUB_REF_NAME || 'main',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--repo') {
      options.repo = String(argv[index + 1] || options.repo);
      index += 1;
      continue;
    }
    if (arg === '--branch') {
      options.branch = String(argv[index + 1] || options.branch);
      index += 1;
    }
  }

  if (!options.repo) {
    try {
      const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
      const match = remote.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/.]+)(?:\.git)?$/i);
      if (match?.groups) options.repo = `${match.groups.owner}/${match.groups.repo}`;
    } catch {
      // Keep the explicit missing-repo failure below.
    }
  }

  return options;
}

function sanitizeHeaderValue(value) {
  return String(value || '').replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer <redacted>');
}

async function githubGet(pathname, token) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'orina-readonly-branch-protection-audit',
    },
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return {
    status: response.status,
    ok: response.ok,
    rateLimitRemaining: response.headers.get('x-ratelimit-remaining') || '',
    body: json,
  };
}

function summarizeProtection(result) {
  if (!result.ok) {
    return {
      status: result.status,
      ok: false,
      message: result.body?.message || 'Branch protection metadata unavailable.',
    };
  }
  const body = result.body || {};
  return {
    status: result.status,
    ok: true,
    enforceAdmins: body.enforce_admins?.enabled === true,
    requiredStatusChecks: {
      enabled: Boolean(body.required_status_checks),
      strict: body.required_status_checks?.strict === true,
      contexts: Array.isArray(body.required_status_checks?.contexts)
        ? body.required_status_checks.contexts
        : [],
      checks: Array.isArray(body.required_status_checks?.checks)
        ? body.required_status_checks.checks.map((check) => ({
            context: check.context || '',
            appId: check.app_id ?? null,
          }))
        : [],
    },
    requiredPullRequestReviews: {
      enabled: Boolean(body.required_pull_request_reviews),
      requiredApprovingReviewCount: body.required_pull_request_reviews?.required_approving_review_count ?? null,
      dismissStaleReviews: body.required_pull_request_reviews?.dismiss_stale_reviews === true,
    },
    restrictionsEnabled: Boolean(body.restrictions),
    requiredLinearHistory: body.required_linear_history?.enabled === true,
    allowForcePushes: body.allow_force_pushes?.enabled === true,
    allowDeletions: body.allow_deletions?.enabled === true,
  };
}

function summarizeSecrets(result) {
  if (!result.ok) {
    return {
      status: result.status,
      ok: false,
      message: result.body?.message || 'Actions secret metadata unavailable.',
    };
  }
  return {
    status: result.status,
    ok: true,
    names: Array.isArray(result.body?.secrets)
      ? result.body.secrets.map((secret) => String(secret.name || '')).filter(Boolean).sort()
      : [],
  };
}

function summarizeWorkflows(result) {
  if (!result.ok) {
    return {
      status: result.status,
      ok: false,
      message: result.body?.message || 'Actions workflow metadata unavailable.',
    };
  }
  return {
    status: result.status,
    ok: true,
    workflows: Array.isArray(result.body?.workflows)
      ? result.body.workflows.map((workflow) => ({
          name: workflow.name || '',
          path: workflow.path || '',
          state: workflow.state || '',
        }))
      : [],
  };
}

async function main() {
  const token = String(process.env[TOKEN_ENV] || '').trim();
  const options = parseArgs(process.argv.slice(2));

  if (!token) {
    console.error(JSON.stringify({
      pass: false,
      blocked: true,
      requiredEnv: TOKEN_ENV,
      message: `Set ${TOKEN_ENV} to a read-only GitHub token that can read branch protection metadata. No token values are printed.`,
    }, null, 2));
    process.exit(2);
  }
  if (!/^[^/]+\/[^/]+$/.test(options.repo)) {
    throw new Error('Missing repository. Use --repo owner/name or set GITHUB_REPOSITORY.');
  }

  const [owner, repo] = options.repo.split('/');
  const encodedRepo = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const encodedBranch = encodeURIComponent(options.branch || 'main');

  const protection = await githubGet(`/repos/${encodedRepo}/branches/${encodedBranch}/protection`, token);
  const secrets = await githubGet(`/repos/${encodedRepo}/actions/secrets?per_page=100`, token);
  const workflows = await githubGet(`/repos/${encodedRepo}/actions/workflows?per_page=100`, token);

  const report = {
    checkedAt: new Date().toISOString(),
    authority: 'NETWORK_READ',
    repository: options.repo,
    branch: options.branch || 'main',
    tokenSource: TOKEN_ENV,
    tokenPrinted: false,
    branchProtection: summarizeProtection(protection),
    actionsSecrets: summarizeSecrets(secrets),
    workflows: summarizeWorkflows(workflows),
    pass: protection.ok,
  };

  const safe = JSON.stringify(report, null, 2);
  if (/Bearer\s+[A-Za-z0-9._-]+/i.test(safe)) {
    throw new Error(sanitizeHeaderValue('Unsafe output contained an Authorization bearer value.'));
  }
  console.log(safe);
  if (!report.pass) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({
    pass: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
