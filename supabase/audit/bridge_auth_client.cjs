const fs = require('fs');
const path = require('path');
const { privateKeyToAccount } = require('viem/accounts');

function parseEnvFile(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    map[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }

  return map;
}

function loadFoundryEnv(rootDir) {
  return parseEnvFile(path.join(rootDir, 'foundry', '.env'));
}

function parseNamedArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const raw = String(args[index] || '');
    if (!raw.startsWith('--')) continue;

    const trimmed = raw.slice(2);
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex >= 0) {
      options[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1);
      continue;
    }

    const next = args[index + 1];
    if (next != null && !String(next).startsWith('--')) {
      options[trimmed] = String(next);
      index += 1;
      continue;
    }

    options[trimmed] = 'true';
  }

  return options;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return '';
}

function normalizeAddress(value) {
  return String(value || '').trim().toLowerCase();
}

function buildWalletAuthMessage(address, signedAt) {
  const walletAddress = normalizeAddress(address);
  const iso = new Date(Number(signedAt)).toISOString();
  return [
    'Orina Wallet Session Authentication',
    '',
    'Sign this message to authenticate your session in Orina.',
    'No blockchain transaction or gas fee is required.',
    '',
    `Address: ${walletAddress}`,
    `Time: ${iso}`,
  ].join('\n');
}

function buildRoutePath(prefix, routePath) {
  const normalizedRoutePath = String(routePath || '').replace(/^\/+/, '');
  const normalizedPrefix = String(prefix || '').trim().replace(/\/+$/, '');

  if (!normalizedRoutePath) {
    return normalizedPrefix || '';
  }

  return normalizedPrefix ? `${normalizedPrefix}/${normalizedRoutePath}` : `/${normalizedRoutePath}`;
}

async function requestJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, json };
}

function parseJsonString(raw, label) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `${label} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function parseSignedAt(value, label) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  throw new Error(`${label} must include a valid signedAt timestamp`);
}

function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length < 2) return {};

  const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  try {
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return {};
  }
}

function getScopedNamedArg(namedArgs, baseName, suffix) {
  const key = suffix ? `${baseName}-${suffix.toLowerCase()}` : baseName;
  return firstNonEmpty(namedArgs[key]);
}

function getScopedEnv(env, baseName, suffix) {
  const key = suffix ? `${baseName}_${suffix.toUpperCase()}` : baseName;
  return firstNonEmpty(env[key]);
}

function parseWalletAuthSession(rawSession, walletAddressHint, label) {
  const parsed = typeof rawSession === 'string' ? parseJsonString(rawSession, label) : rawSession;
  const address = normalizeAddress(parsed?.address || walletAddressHint);
  const message = firstNonEmpty(parsed?.message);
  const signature = firstNonEmpty(parsed?.signature);
  const signedAt = parseSignedAt(parsed?.signedAt, label);

  if (!address) {
    throw new Error(`${label} must include an address or matching wallet override`);
  }

  if (!message || !signature) {
    throw new Error(`${label} must include message and signature`);
  }

  return {
    address,
    message,
    signature,
    signedAt,
  };
}

async function buildWalletAuthSessionFromPrivateKey(privateKey) {
  const account = privateKeyToAccount(String(privateKey || '').trim());
  const address = normalizeAddress(account.address);
  const signedAt = Date.now();
  const message = buildWalletAuthMessage(address, signedAt);
  const signature = await account.signMessage({ message });

  return {
    address,
    message,
    signature,
    signedAt,
  };
}

async function exchangeWalletAuthSession({
  baseUrl,
  anonKey,
  fnName,
  routePrefix,
  walletAuthSession,
  phase,
  clientApp = 'ATP2',
}) {
  return requestJson(`${baseUrl}/functions/v1/${fnName}${buildRoutePath(routePrefix, 'exchange')}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress: walletAuthSession.address,
      walletAuthSession,
      client: {
        app: clientApp,
        phase,
        requestedAt: new Date().toISOString(),
      },
    }),
  });
}

async function lookupProfileWithToken({ baseUrl, anonKey, accessToken, profileId, walletAddress }) {
  const claims = decodeJwtPayload(accessToken);
  const claimedProfileId = firstNonEmpty(profileId, claims.sub);
  const claimedWallet = normalizeAddress(
    firstNonEmpty(
      walletAddress,
      claims.wallet_address,
      claims.user_metadata?.wallet_address,
      claims.app_metadata?.wallet_address,
    ),
  );

  async function queryProfile(pathname) {
    const response = await requestJson(`${baseUrl}/rest/v1${pathname}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        Accept: 'application/json',
      },
    });

    return Array.isArray(response.json) ? response.json[0] || null : null;
  }

  let row = null;
  if (claimedProfileId) {
    row = await queryProfile(
      `/profiles?id=eq.${encodeURIComponent(claimedProfileId)}&select=id,wallet_address&limit=1`,
    );
  }

  if (!row && claimedWallet) {
    row = await queryProfile(
      `/profiles?wallet_address=eq.${encodeURIComponent(claimedWallet)}&select=id,wallet_address&limit=1`,
    );
  }

  return {
    claims,
    profileId: firstNonEmpty(row?.id, claimedProfileId) || null,
    walletAddress: normalizeAddress(firstNonEmpty(row?.wallet_address, claimedWallet)) || null,
  };
}

async function resolveBridgePrincipal({
  baseUrl,
  anonKey,
  fnName,
  routePrefix = '',
  namedArgs = {},
  env = process.env,
  suffix = '',
  phase,
  fallbackPrivateKeys = [],
  requireProfileId = false,
  requireWalletAddress = false,
  clientApp = 'ATP2',
}) {
  const accessToken = firstNonEmpty(
    getScopedNamedArg(namedArgs, 'bridge-access-token', suffix),
    getScopedEnv(env, 'ATP2_BRIDGE_ACCESS_TOKEN', suffix),
  );
  const profileIdHint = firstNonEmpty(
    getScopedNamedArg(namedArgs, 'bridge-profile-id', suffix),
    getScopedEnv(env, 'ATP2_BRIDGE_PROFILE_ID', suffix),
  );
  const walletAddressHint = normalizeAddress(
    firstNonEmpty(
      getScopedNamedArg(namedArgs, 'bridge-wallet-address', suffix),
      getScopedEnv(env, 'ATP2_BRIDGE_WALLET_ADDRESS', suffix),
    ),
  );
  const sessionJson = firstNonEmpty(
    getScopedNamedArg(namedArgs, 'bridge-session-json', suffix),
    getScopedEnv(env, 'ATP2_BRIDGE_SESSION_JSON', suffix),
  );
  const privateKey = firstNonEmpty(
    getScopedNamedArg(namedArgs, 'bridge-private-key', suffix),
    getScopedEnv(env, 'ATP2_BRIDGE_PRIVATE_KEY', suffix),
    ...fallbackPrivateKeys,
  );

  let resolved = null;

  if (accessToken) {
    const tokenProfile = await lookupProfileWithToken({
      baseUrl,
      anonKey,
      accessToken,
      profileId: profileIdHint,
      walletAddress: walletAddressHint,
    });
    resolved = {
      accessToken,
      profileId: tokenProfile.profileId,
      walletAddress: tokenProfile.walletAddress,
      authSource: 'access-token',
      claims: tokenProfile.claims,
    };
  } else {
    let walletAuthSession = null;
    let authSource = '';

    if (sessionJson) {
      walletAuthSession = parseWalletAuthSession(
        sessionJson,
        walletAddressHint,
        `ATP2 bridge session${suffix ? ` ${suffix}` : ''}`,
      );
      authSource = 'wallet-session';
    } else if (privateKey) {
      walletAuthSession = await buildWalletAuthSessionFromPrivateKey(privateKey);
      if (walletAddressHint && walletAddressHint !== walletAuthSession.address) {
        throw new Error(
          `Bridge wallet override ${walletAddressHint} does not match the resolved private-key address ${walletAuthSession.address}`,
        );
      }
      authSource = 'private-key';
    }

    if (!walletAuthSession) {
      throw new Error(
        `Missing bridge auth input${suffix ? ` for ${suffix}` : ''}. Provide a bridge JWT, wallet session JSON, or private key.`,
      );
    }

    const exchange = await exchangeWalletAuthSession({
      baseUrl,
      anonKey,
      fnName,
      routePrefix,
      walletAuthSession,
      phase,
      clientApp,
    });

    if (!exchange.ok || !exchange.json?.accessToken) {
      throw new Error(
        `Bridge exchange failed${suffix ? ` for ${suffix}` : ''}: ${JSON.stringify(exchange.json)}`,
      );
    }

    resolved = {
      accessToken: exchange.json.accessToken,
      profileId: firstNonEmpty(exchange.json.profileId, profileIdHint) || null,
      walletAddress: walletAuthSession.address,
      authSource,
      claims: decodeJwtPayload(exchange.json.accessToken),
    };
  }

  if (requireProfileId && !resolved.profileId) {
    throw new Error(`Bridge auth resolved without a profile id${suffix ? ` for ${suffix}` : ''}`);
  }

  if (requireWalletAddress && !resolved.walletAddress) {
    throw new Error(`Bridge auth resolved without a wallet address${suffix ? ` for ${suffix}` : ''}`);
  }

  return resolved;
}

module.exports = {
  buildRoutePath,
  buildWalletAuthMessage,
  loadFoundryEnv,
  normalizeAddress,
  parseEnvFile,
  parseNamedArgs,
  requestJson,
  resolveBridgePrincipal,
};