import { createHmac, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return '';
}

function stripValue(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('`') && trimmed.endsWith('`'))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const values = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    values[match[1]] = stripValue(match[2]);
  }
  return values;
}

function parseSupabaseJwtMarkdown(filePath) {
  if (!existsSync(filePath)) return {};
  const values = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^:=]+?)\s*[:=]\s*(.+?)\s*$/);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    const value = stripValue(match[2]);
    if (key === 'access token') values.SUPABASE_ACCESS_TOKEN = value;
    if (key === 'public key') values.SUPABASE_PUBLISHABLE_KEY = value;
    if (key === 'jwt') values.SUPABASE_JWT_SECRET = value;
  }
  return values;
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${signingInput}.${signature}`;
}

function createAuthenticatedToken(jwtSecret) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt(
    {
      aud: 'authenticated',
      exp: now + 15 * 60,
      iat: now,
      iss: 'supabase',
      role: 'authenticated',
      sub: '00000000-0000-4000-8000-000000000001',
      email: 'audit-authenticated@orina.local',
    },
    jwtSecret,
  );
}

function isJwtLike(value) {
  return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || ''));
}

function redactError(value) {
  if (!value || typeof value !== 'object') return value ?? null;
  const safe = {};
  for (const [key, raw] of Object.entries(value)) {
    if (/token|secret|key|jwt|authorization/i.test(key)) {
      safe[key] = '<redacted>';
    } else if (typeof raw === 'string' && raw.length > 300) {
      safe[key] = `${raw.slice(0, 300)}...`;
    } else {
      safe[key] = raw;
    }
  }
  return safe;
}

async function readRole({ role, restBase, apiKey, bearerToken }) {
  const url = new URL(`${restBase}/profile_reputation_summaries`);
  url.searchParams.set('select', 'wallet_address,average_rating,total_reviews');
  url.searchParams.set('limit', '1');

  const headers = {
    Accept: 'application/json',
    apikey: apiKey,
  };
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  const response = await fetch(url, { method: 'GET', headers });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 300) };
  }

  const rows = Array.isArray(json) ? json : [];
  const firstRow = rows[0] || {};
  return {
    role,
    status: response.status,
    ok: response.ok,
    rowCount: rows.length,
    columns: Object.keys(firstRow).sort(),
    error: response.ok ? null : redactError(json),
  };
}

function randomToken(bytes = 16) {
  return randomBytes(bytes).toString('hex');
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text.slice(0, 300) };
  }
}

async function createTemporaryAuthSession({ supabaseUrl, apiKey, serviceRoleKey }) {
  const email = `profile-reputation-audit-${Date.now()}-${randomToken(4)}@orina.local`;
  const password = `${randomToken(18)}Aa1!`;
  const adminHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        source: 'profile-reputation-view-audit',
      },
    }),
  });
  const created = await readJsonResponse(createResponse);
  if (!createResponse.ok || !created?.id) {
    throw new Error(`Temporary Auth user creation failed: ${JSON.stringify(redactError(created))}`);
  }

  let accessToken = '';
  let signInError = null;
  try {
    const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const tokenJson = await readJsonResponse(tokenResponse);
    if (!tokenResponse.ok || !tokenJson?.access_token) {
      signInError = `Temporary Auth sign-in failed: ${JSON.stringify(redactError(tokenJson))}`;
    } else {
      accessToken = tokenJson.access_token;
    }
  } catch (error) {
    signInError = error instanceof Error ? error.message : String(error);
  }

  async function cleanup() {
    const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(created.id)}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    if (!deleteResponse.ok) {
      const deleteJson = await readJsonResponse(deleteResponse);
      throw new Error(`Temporary Auth user cleanup failed: ${JSON.stringify(redactError(deleteJson))}`);
    }
  }

  if (!accessToken) {
    await cleanup();
    throw new Error(signInError || 'Temporary Auth sign-in failed without a response body.');
  }

  return {
    accessToken,
    cleanup,
  };
}

async function main() {
  const dotEnv = parseEnvFile(path.join(ROOT, '.env'));
  const auditEnv = parseEnvFile(path.join(ROOT, '.env.supabase-audit.local'));
  const markdownEnv = parseSupabaseJwtMarkdown(path.join(ROOT, 'supabaseJWT.md'));
  const config = {
    ...dotEnv,
    ...markdownEnv,
    ...auditEnv,
    ...process.env,
  };
  const createTempAuthUser =
    process.argv.includes('--create-temp-auth-user') ||
    String(config.SUPABASE_AUTH_SMOKE_TEMP_USER || '').toLowerCase() === 'true';

  const supabaseUrl = firstNonEmpty(
    config.VITE_SUPABASE_URL,
    config.SUPABASE_URL,
    config.NEXT_PUBLIC_SUPABASE_URL,
  ).replace(/\/+$/, '');
  const anonKey = firstNonEmpty(
    config.VITE_SUPABASE_ANON_KEY,
    config.SUPABASE_ANON_KEY,
    config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const publishableKey = firstNonEmpty(
    config.VITE_SUPABASE_PUBLISHABLE_KEY,
    config.SUPABASE_PUBLISHABLE_KEY,
  );
  const serviceRoleKey = firstNonEmpty(
    config.VITE_SUPABASE_SERVICE_ROLE_KEY,
    config.SUPABASE_SERVICE_ROLE_KEY,
    config.ATP2_SUPABASE_SERVICE_ROLE_KEY,
  );
  const jwtSecret = firstNonEmpty(config.SUPABASE_JWT_SECRET, config.ATP2_SUPABASE_JWT_SECRET);
  const providedAuthenticatedJwt = firstNonEmpty(
    config.SUPABASE_AUTHENTICATED_JWT,
    config.ATP2_BRIDGE_ACCESS_TOKEN,
  );

  const apiKey = firstNonEmpty(anonKey, publishableKey);
  if (!supabaseUrl || !apiKey) {
    throw new Error('Missing Supabase URL or anon/publishable API key.');
  }

  let authenticatedToken = providedAuthenticatedJwt || (jwtSecret ? createAuthenticatedToken(jwtSecret) : '');
  let authenticatedBearerSource = providedAuthenticatedJwt
    ? 'provided'
    : jwtSecret
      ? 'generated-from-jwt-secret'
      : 'missing';
  if (!authenticatedToken && !createTempAuthUser) {
    throw new Error('Missing authenticated JWT input. Set SUPABASE_AUTHENTICATED_JWT or SUPABASE_JWT_SECRET.');
  }

  const restBase = `${supabaseUrl}/rest/v1`;
  const anonBearer = isJwtLike(anonKey) ? anonKey : '';
  const checks = [await readRole({ role: 'anon', restBase, apiKey, bearerToken: anonBearer })];

  let temporaryAuthCleanup = null;
  let temporaryAuthCleanupStatus = 'not-used';
  let authenticatedCheck = authenticatedToken
    ? await readRole({ role: 'authenticated', restBase, apiKey, bearerToken: authenticatedToken })
    : null;

  if ((!authenticatedCheck || !authenticatedCheck.ok) && createTempAuthUser) {
    if (!serviceRoleKey) {
      throw new Error('Temporary Auth user fallback requires SUPABASE_SERVICE_ROLE_KEY.');
    }
    const tempAuth = await createTemporaryAuthSession({ supabaseUrl, apiKey, serviceRoleKey });
    authenticatedToken = tempAuth.accessToken;
    authenticatedBearerSource = 'temporary-auth-user';
    temporaryAuthCleanup = tempAuth.cleanup;
    authenticatedCheck = await readRole({ role: 'authenticated', restBase, apiKey, bearerToken: authenticatedToken });
  }

  if (authenticatedCheck) checks.push(authenticatedCheck);

  if (serviceRoleKey) {
    checks.push(await readRole({ role: 'service_role', restBase, apiKey, bearerToken: serviceRoleKey }));
  }

  if (temporaryAuthCleanup) {
    try {
      await temporaryAuthCleanup();
      temporaryAuthCleanupStatus = 'deleted';
    } catch (error) {
      temporaryAuthCleanupStatus = error instanceof Error ? error.message : String(error);
    }
  }

  const requiredRoles = new Set(['anon', 'authenticated']);
  if (serviceRoleKey) requiredRoles.add('service_role');
  const pass = checks.every((check) => !requiredRoles.has(check.role) || check.ok);

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        target: {
          host: new URL(supabaseUrl).host,
          view: 'public.profile_reputation_summaries',
        },
        inputs: {
          anonBearer: anonBearer ? 'configured' : 'omitted',
          authenticatedBearer: authenticatedBearerSource,
          serviceRoleBearer: serviceRoleKey ? 'configured' : 'missing',
          temporaryAuthCleanup: temporaryAuthCleanupStatus,
        },
        checks,
        pass,
      },
      null,
      2,
    ),
  );

  if (!pass) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
