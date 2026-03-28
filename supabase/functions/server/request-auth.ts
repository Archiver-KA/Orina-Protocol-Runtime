import { Context } from 'npm:hono';

export interface AuthenticatedWalletIdentity {
  walletAddress: string;
  profileId: string | null;
  token: string;
  claims: Record<string, unknown>;
}

type AuthResult =
  | { ok: true; identity: AuthenticatedWalletIdentity }
  | { ok: false; response: Response };

function getJwtSecret(): string | null {
  return (
    Deno.env.get('ATP2_SUPABASE_JWT_SECRET') ||
    Deno.env.get('SUPABASE_JWT_SECRET') ||
    Deno.env.get('JWT_SECRET') ||
    null
  );
}

function getExpectedIssuer(): string {
  return Deno.env.get('ATP2_SUPABASE_AUTH_BRIDGE_ISSUER') || 'atp2-claim-bridge';
}

function getExpectedClaimVersion(): string {
  return Deno.env.get('ATP2_SUPABASE_AUTH_BRIDGE_EXPECTED_CLAIM_VERSION') || 'h1';
}

export function normalizeWalletAddress(address: string | null | undefined): string {
  return String(address || '').trim().toLowerCase();
}

export function isValidWalletAddress(address: string): boolean {
  return /^0x[a-f0-9]{40}$/.test(normalizeWalletAddress(address));
}

export function walletAddressesMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = normalizeWalletAddress(left);
  const b = normalizeWalletAddress(right);
  return !!a && !!b && a === b;
}

function getBearerToken(c: Context): string | null {
  const header = c.req.header('Authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

function decodeBase64UrlBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
    + '='.repeat((4 - (value.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toOwnedUint8Array(bytes: Uint8Array): Uint8Array {
  const owned = new Uint8Array(bytes.length);
  owned.set(bytes);
  return owned;
}

function toOwnedArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const owned = toOwnedUint8Array(bytes);
  const buffer = new ArrayBuffer(owned.byteLength);
  new Uint8Array(buffer).set(owned);
  return buffer;
}

function decodeBase64UrlJson(value: string): Record<string, unknown> | null {
  try {
    const bytes = decodeBase64UrlBytes(value);
    const text = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function verifyHs256Jwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeBase64UrlJson(encodedHeader);
  const payload = decodeBase64UrlJson(encodedPayload);
  if (!header || !payload) return null;
  if (String(header.alg || '') !== 'HS256') return null;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const signatureBytes = toOwnedArrayBuffer(decodeBase64UrlBytes(encodedSignature));
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );

    return valid ? payload : null;
  } catch {
    return null;
  }
}

function isAudienceAuthenticated(aud: unknown): boolean {
  if (typeof aud === 'string') return aud === 'authenticated';
  if (Array.isArray(aud)) return aud.includes('authenticated');
  return false;
}

function buildIdentity(token: string, claims: Record<string, unknown>): AuthenticatedWalletIdentity | null {
  const exp = Number(claims.exp || 0);
  const role = String(claims.role || '');
  const issuer = String(claims.iss || '');
  const claimVersion = String(claims.claim_version || '');
  const authMethod = String(claims.auth_method || '');
  const walletAddress = normalizeWalletAddress(String(claims.wallet_address || ''));
  const profileId = typeof claims.profile_id === 'string' ? claims.profile_id : null;
  const subject = typeof claims.sub === 'string' ? claims.sub : null;
  const walletSessionId = typeof claims.wallet_session_id === 'string'
    ? claims.wallet_session_id.trim()
    : '';

  if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return null;
  if (role !== 'authenticated') return null;
  if (issuer !== getExpectedIssuer()) return null;
  if (claimVersion !== getExpectedClaimVersion()) return null;
  if (authMethod !== 'wallet_signature') return null;
  if (!isAudienceAuthenticated(claims.aud)) return null;
  if (!isValidWalletAddress(walletAddress)) return null;
  if (!profileId || !subject || profileId !== subject) return null;
  if (!walletSessionId) return null;

  return {
    walletAddress,
    profileId,
    token,
    claims,
  };
}

export async function requireAuthenticatedWallet(c: Context): Promise<AuthResult> {
  const token = getBearerToken(c);
  if (!token) {
    return { ok: false, response: c.json({ error: 'Authentication required' }, 401) };
  }

  const secret = getJwtSecret();
  if (!secret) {
    console.error('[AI Auth] Missing JWT secret for request verification');
    return { ok: false, response: c.json({ error: 'Server authentication is not configured' }, 500) };
  }

  const claims = await verifyHs256Jwt(token, secret);
  if (!claims) {
    return { ok: false, response: c.json({ error: 'Invalid or expired authentication token' }, 401) };
  }

  const identity = buildIdentity(token, claims);
  if (!identity) {
    return { ok: false, response: c.json({ error: 'Authenticated wallet claims are required' }, 401) };
  }

  return { ok: true, identity };
}

export function assertAuthenticatedWalletMatch(
  c: Context,
  identity: AuthenticatedWalletIdentity,
  candidateWallet: string | null | undefined,
  fieldName = 'walletAddress',
): Response | null {
  const normalized = normalizeWalletAddress(candidateWallet);
  if (!normalized) {
    return c.json({ error: `Missing ${fieldName}` }, 400);
  }
  if (!isValidWalletAddress(normalized)) {
    return c.json({ error: `Invalid ${fieldName}` }, 400);
  }
  if (!walletAddressesMatch(identity.walletAddress, normalized)) {
    return c.json({ error: `${fieldName} does not match authenticated wallet` }, 403);
  }
  return null;
}
