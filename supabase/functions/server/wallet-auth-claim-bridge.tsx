import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyMessage } from 'npm:viem';
import { assertAuthenticatedWalletMatch, requireAuthenticatedWallet } from './request-auth.ts';

const router = new Hono();

type ExchangeRequest = {
  walletAddress?: string;
  walletAuthSession?: {
    address?: string;
    signedAt?: number;
    signature?: string;
    message?: string;
  };
  client?: {
    app?: string;
    phase?: string;
    requestedAt?: string;
  };
};

type CommunityNotifyRequest = {
  targetWalletAddress?: string;
  title?: string;
  message?: string;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
  actorWalletAddress?: string | null;
  actorName?: string | null;
};

type AssetMetadataSeedMediaItem = {
  mediaType?: 'image' | 'video' | 'document';
  url?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

type AssetMetadataSeedItem = {
  assetUid?: string;
  title?: string;
  slug?: string | null;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  galleryImages?: string[];
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  contractAddress?: string | null;
  tokenId?: string | null;
  chainId?: number | null;
  isActive?: boolean;
  media?: AssetMetadataSeedMediaItem[];
  tags?: string[];
};

type AssetMetadataSeedRequest = {
  assetItems?: AssetMetadataSeedItem[];
  client?: {
    app?: string;
    phase?: string;
    requestedAt?: string;
  };
};

type DbProfileRow = {
  id: string;
  wallet_address: string;
  status: string | null;
};

type DbWalletSessionRow = {
  id: string;
  wallet_address: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_seen_at: string | null;
};

type DbWalletSessionListRow = {
  id: string;
  wallet_address: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_seen_at: string | null;
  device_label: string | null;
};

type DbUserAppSettingsSecurityRow = {
  user_id: string;
  security_settings: Record<string, unknown> | null;
};

type DbAssetCatalogRow = {
  id: string;
  asset_uid: string;
};

type DbAssetTagRow = {
  id: string;
  tag: string;
};

type VerificationMode = 'wallet_session_row';

type VerificationFailure = {
  ok: false;
  status: 400 | 401;
  error: string;
};

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function normalizeAssetUid(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeTag(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 64);
}

function normalizeSlug(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function isValidWalletAddress(address: string): boolean {
  return /^0x[a-f0-9]{40}$/.test(address);
}

function isEnabled(name: string): boolean {
  return (Deno.env.get(name) || '').toLowerCase() === 'true';
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getVerificationMode(): VerificationMode {
  const raw = (Deno.env.get('ATP2_SUPABASE_AUTH_BRIDGE_VERIFY_MODE') || '')
    .toLowerCase()
    .trim();
  if (raw === 'wallet_session_row') return 'wallet_session_row';
  throw new Error('ATP2_SUPABASE_AUTH_BRIDGE_VERIFY_MODE must be wallet_session_row');
}

function getTtlSeconds(): number {
  const raw = Number(Deno.env.get('ATP2_SUPABASE_AUTH_BRIDGE_TTL_SECONDS') || 900);
  if (!Number.isFinite(raw) || raw <= 0) return 900;
  return Math.min(Math.max(Math.floor(raw), 60), 3600);
}

function getClientSessionMaxAgeMs(): number {
  const raw = Number(Deno.env.get('ATP2_SUPABASE_AUTH_BRIDGE_CLIENT_SESSION_MAX_AGE_MS') || 7 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(raw) || raw <= 0) return 7 * 24 * 60 * 60 * 1000;
  return Math.floor(raw);
}

function getWalletSessionTtlMs(): number {
  const raw = Number(
    Deno.env.get('ATP2_WALLET_SESSION_TTL_MS') ||
    Deno.env.get('ATP2_SUPABASE_AUTH_BRIDGE_CLIENT_SESSION_MAX_AGE_MS') ||
    7 * 24 * 60 * 60 * 1000,
  );
  if (!Number.isFinite(raw) || raw <= 0) return 7 * 24 * 60 * 60 * 1000;
  return Math.floor(raw);
}

function getSessionLockoutIdleMs(): number {
  const raw = Number(Deno.env.get('ATP2_WALLET_SESSION_LOCKOUT_IDLE_MS') || 30 * 60 * 1000);
  if (!Number.isFinite(raw) || raw <= 0) return 30 * 60 * 1000;
  return Math.min(Math.max(Math.floor(raw), 5 * 60 * 1000), 12 * 60 * 60 * 1000);
}

function getJwtSecret(): string | null {
  return (
    Deno.env.get('ATP2_SUPABASE_JWT_SECRET') ||
    Deno.env.get('SUPABASE_JWT_SECRET') ||
    Deno.env.get('JWT_SECRET') ||
    null
  );
}

function getIssuer(): string {
  return Deno.env.get('ATP2_SUPABASE_AUTH_BRIDGE_ISSUER') || 'atp2-claim-bridge';
}

function scaffoldDisabledResponse(reason: string) {
  return {
    ok: false,
    status: 'disabled',
    reason,
    hint: 'Enable ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE only after env + verification mode are configured.',
    expectedClaims: {
      role: 'authenticated',
      sub: 'profile_id uuid',
      profile_id: 'uuid',
      wallet_address: '0x... (lowercase)',
      claim_version: 'h1',
      auth_method: 'wallet_signature',
      wallet_session_id: 'uuid|null',
    },
  };
}

function shortDisplayName(walletAddress: string): string {
  return `${walletAddress.slice(0, 5)}...${walletAddress.slice(-3)}`;
}

function extractWalletAuthMessageTimestamp(message: string): number | null {
  const match = message.match(/^Time:\s+(.+)$/m);
  if (!match?.[1]) return null;
  const parsed = Date.parse(match[1].trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function assertWalletAuthSessionMessage(message: string | undefined, walletAddress: string): string | null {
  if (typeof message !== 'string' || !message.trim()) {
    return 'Missing walletAuthSession.message';
  }

  const normalized = message.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('Orina Wallet Session Authentication\n')) {
    return 'Unexpected walletAuthSession.message prefix';
  }
  if (!normalized.includes(`Address: ${walletAddress}`)) {
    return 'walletAuthSession.message address mismatch';
  }

  const signedMessageAt = extractWalletAuthMessageTimestamp(normalized);
  if (!signedMessageAt) {
    return 'walletAuthSession.message is missing a valid Time field';
  }
  if (signedMessageAt > Date.now() + 60_000) {
    return 'walletAuthSession.message Time is in the future';
  }
  if (Date.now() - signedMessageAt > getClientSessionMaxAgeMs()) {
    return 'walletAuthSession.message is too old';
  }

  return null;
}

function assertClientWalletSessionPayload(body: ExchangeRequest, walletAddress: string): string | null {
  const session = body.walletAuthSession;
  if (!session?.signature) return 'Missing walletAuthSession.signature';
  if (!/^0x[a-fA-F0-9]{130}$/.test(String(session.signature))) {
    return 'Invalid walletAuthSession.signature format';
  }
  if (!session.address || normalizeAddress(session.address) !== walletAddress) {
    return 'walletAuthSession.address mismatch';
  }
  const signedAt = Number(session.signedAt || 0);
  if (!Number.isFinite(signedAt) || signedAt <= 0) {
    return 'Invalid walletAuthSession.signedAt';
  }
  if (signedAt > Date.now() + 60_000) {
    return 'walletAuthSession.signedAt is in the future';
  }
  if (Date.now() - signedAt > getClientSessionMaxAgeMs()) {
    return 'walletAuthSession is too old';
  }
  const messageError = assertWalletAuthSessionMessage(session.message, walletAddress);
  if (messageError) {
    return messageError;
  }
  const signedMessageAt = extractWalletAuthMessageTimestamp(String(session.message || ''));
  if (signedMessageAt && Math.abs(signedMessageAt - signedAt) > 5 * 60 * 1000) {
    return 'walletAuthSession.signedAt does not align with signed message time';
  }
  return null;
}

function getServiceSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceRoleKey);
}

type ServiceSupabaseClient = ReturnType<typeof getServiceSupabaseClient>;

async function findActiveWalletSession(
  supabase: ServiceSupabaseClient,
  walletAddress: string
): Promise<DbWalletSessionRow | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('wallet_sessions')
    .select('id,wallet_address,created_at,expires_at,revoked_at,last_seen_at')
    .eq('wallet_address', walletAddress)
    .is('revoked_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(`wallet_sessions lookup failed: ${error.message}`);
  return (data?.[0] as DbWalletSessionRow | undefined) || null;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function createWalletSession(
  supabase: ServiceSupabaseClient,
  walletAddress: string,
  opts?: { signedAt?: number; clientApp?: string | null; signature?: string | null }
): Promise<DbWalletSessionRow> {
  const now = Date.now();
  const signedAt = Number(opts?.signedAt || now);
  const createdAt = Math.min(now, Math.max(0, signedAt));
  const expiresAt = new Date(createdAt + getWalletSessionTtlMs()).toISOString();
  const sessionEntropy = [
    walletAddress,
    opts?.signature || '',
    String(signedAt),
    crypto.randomUUID(),
  ].join(':');
  const sessionTokenHash = await sha256Hex(sessionEntropy);

  const { data, error } = await supabase
    .from('wallet_sessions')
    .insert({
      wallet_address: walletAddress,
      session_token_hash: sessionTokenHash,
      expires_at: expiresAt,
      last_seen_at: new Date(now).toISOString(),
      device_label: opts?.clientApp ? `claim_bridge:${String(opts.clientApp).slice(0, 120)}` : 'claim_bridge',
    })
    .select('id,wallet_address,created_at,expires_at,revoked_at,last_seen_at')
    .limit(1);

  if (error) {
    throw new Error(`wallet_sessions insert failed: ${error.message}`);
  }

  const inserted = (data?.[0] as DbWalletSessionRow | undefined) || null;
  if (!inserted) {
    throw new Error('wallet_sessions insert failed: empty insert result');
  }

  return inserted;
}

async function ensureActiveWalletSession(
  supabase: ServiceSupabaseClient,
  walletAddress: string,
  body: ExchangeRequest,
  existingSession?: DbWalletSessionRow | null,
): Promise<DbWalletSessionRow> {
  const existing = existingSession ?? await findActiveWalletSession(supabase, walletAddress);
  if (existing) {
    void touchWalletSessionLastSeen(supabase, existing.id);
    return existing;
  }

  return createWalletSession(supabase, walletAddress, {
    signedAt: body.walletAuthSession?.signedAt,
    clientApp: body.client?.app || null,
    signature: body.walletAuthSession?.signature || null,
  });
}

async function touchWalletSessionLastSeen(
  supabase: ServiceSupabaseClient,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from('wallet_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) {
    console.warn('[H1 Bridge] Failed to touch wallet_sessions.last_seen_at:', error.message);
  }
}

async function revokeWalletSession(
  supabase: ServiceSupabaseClient,
  sessionId: string,
): Promise<void> {
  const { error } = await supabase
    .from('wallet_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId)
    .is('revoked_at', null);
  if (error) {
    throw new Error(`wallet_sessions revoke stale session failed: ${error.message}`);
  }
}

async function resolveOrCreateProfile(
  supabase: ServiceSupabaseClient,
  walletAddress: string
): Promise<DbProfileRow> {
  const { data: existingRows, error: selectError } = await supabase
    .from('profiles')
    .select('id,wallet_address,status')
    .eq('wallet_address', walletAddress)
    .limit(1);

  if (selectError) {
    throw new Error(`profiles lookup failed: ${selectError.message}`);
  }

  const existing = (existingRows?.[0] as DbProfileRow | undefined) || null;
  if (existing) {
    if (existing.status === 'deleted') {
      throw new Error('Profile is deleted; bridge token issuance denied');
    }
    return existing;
  }

  const { data: insertedRows, error: insertError } = await supabase
    .from('profiles')
    .insert({
      wallet_address: walletAddress,
      display_name: shortDisplayName(walletAddress),
      status: 'active',
    })
    .select('id,wallet_address,status')
    .limit(1);

  if (insertError) {
    // Handle race on unique(wallet_address): re-read
    const duplicate = `${(insertError as any).code || ''}` === '23505';
    if (!duplicate) {
      throw new Error(`profiles create failed: ${insertError.message}`);
    }
    const { data: racedRows, error: racedErr } = await supabase
      .from('profiles')
      .select('id,wallet_address,status')
      .eq('wallet_address', walletAddress)
      .limit(1);
    if (racedErr || !racedRows?.[0]) {
      throw new Error(`profiles create race re-read failed: ${racedErr?.message || 'not found'}`);
    }
    return racedRows[0] as DbProfileRow;
  }

  const inserted = (insertedRows?.[0] as DbProfileRow | undefined) || null;
  if (!inserted) throw new Error('profiles create failed: empty insert result');
  return inserted;
}

async function isSessionLockoutEnabled(
  supabase: ServiceSupabaseClient,
  profileId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_app_settings')
    .select('user_id,security_settings')
    .eq('user_id', profileId)
    .limit(1);

  if (error) {
    throw new Error(`user_app_settings lookup failed: ${error.message}`);
  }

  const row = (data?.[0] as DbUserAppSettingsSecurityRow | undefined) || null;
  const security = safeObject(row?.security_settings);
  return security.sessionLockout === true;
}

function getWalletSessionLastActivityMs(session: DbWalletSessionRow | null): number {
  const raw = session?.last_seen_at || session?.created_at || '';
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasFreshWalletAuthSignature(
  body: ExchangeRequest,
): boolean {
  const signedAt = Number(body.walletAuthSession?.signedAt || 0);
  if (!Number.isFinite(signedAt) || signedAt <= 0) return false;
  return Date.now() - signedAt <= getSessionLockoutIdleMs();
}

async function applySessionLockoutPolicy(
  supabase: ServiceSupabaseClient,
  body: ExchangeRequest,
  activeSession: DbWalletSessionRow | null,
  sessionLockoutEnabled: boolean,
): Promise<{
  error?: string;
  nextSession: DbWalletSessionRow | null;
}> {
  if (!sessionLockoutEnabled) {
    return { nextSession: activeSession };
  }

  const idleWindowMs = getSessionLockoutIdleMs();
  const now = Date.now();
  const lastActivityMs = getWalletSessionLastActivityMs(activeSession);
  const sessionIsIdleLocked =
    !!activeSession &&
    lastActivityMs > 0 &&
    now - lastActivityMs > idleWindowMs;

  if (!activeSession) {
    return hasFreshWalletAuthSignature(body)
      ? { nextSession: null }
      : {
          error: 'Secure Orina session locked after inactivity. Sign the Orina wallet auth message again to continue.',
          nextSession: null,
        };
  }

  if (!sessionIsIdleLocked) {
    return { nextSession: activeSession };
  }

  if (!hasFreshWalletAuthSignature(body)) {
    return {
      error: 'Secure Orina session locked after inactivity. Sign the Orina wallet auth message again to continue.',
      nextSession: null,
    };
  }

  await revokeWalletSession(supabase, activeSession.id);
  return { nextSession: null };
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function signHs256Jwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncodeString(JSON.stringify(header));
  const encodedPayload = base64UrlEncodeString(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
}

async function issueSupabaseClaimToken(params: {
  walletAddress: string;
  profileId: string;
  walletSessionId?: string | null;
}) {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    throw new Error('Missing SUPABASE_JWT_SECRET (or ATP2_SUPABASE_JWT_SECRET)');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const ttlSec = getTtlSeconds();
  const expSec = nowSec + ttlSec;
  const issuer = getIssuer();

  const payload = {
    iss: issuer,
    aud: 'authenticated',
    iat: nowSec,
    exp: expSec,
    sub: params.profileId,
    role: 'authenticated',
    profile_id: params.profileId,
    wallet_address: params.walletAddress,
    claim_version: 'h1',
    auth_method: 'wallet_signature',
    wallet_session_id: params.walletSessionId ?? null,
  };

  const accessToken = await signHs256Jwt(payload, jwtSecret);

  return {
    accessToken,
    expiresAt: new Date(expSec * 1000).toISOString(),
    claimVersion: 'h1',
    tokenType: 'Bearer' as const,
  };
}

async function assertWalletAuthSignature(body: ExchangeRequest, walletAddress: string): Promise<string | null> {
  const session = body.walletAuthSession;
  if (!session?.signature || !session.message) {
    return 'Missing walletAuthSession proof payload';
  }

  try {
    const valid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: session.message,
      signature: session.signature as `0x${string}`,
    });
    return valid ? null : 'walletAuthSession signature verification failed';
  } catch {
    return 'walletAuthSession signature verification failed';
  }
}

async function verifyRequestAndResolveIdentity(
  body: ExchangeRequest,
  walletAddress: string
): Promise<
  | VerificationFailure
  | {
      ok: true;
      supabase: ServiceSupabaseClient;
      mode: VerificationMode;
      profile: DbProfileRow;
      walletSessionRow: DbWalletSessionRow | null;
    }
> {
  const payloadError = assertClientWalletSessionPayload(body, walletAddress);
  if (payloadError) {
    return { ok: false as const, status: 400, error: payloadError };
  }

  const signatureError = await assertWalletAuthSignature(body, walletAddress);
  if (signatureError) {
    return { ok: false as const, status: 401, error: signatureError };
  }

  const supabase = getServiceSupabaseClient();
  const mode = getVerificationMode();
  const profile = await resolveOrCreateProfile(supabase, walletAddress);
  const sessionLockoutEnabled = await isSessionLockoutEnabled(supabase, profile.id);
  const activeWalletSession = mode === 'wallet_session_row'
    ? await findActiveWalletSession(supabase, walletAddress)
    : null;
  const lockoutResult = await applySessionLockoutPolicy(
    supabase,
    body,
    activeWalletSession,
    sessionLockoutEnabled,
  );
  if (lockoutResult.error) {
    return { ok: false as const, status: 401, error: lockoutResult.error };
  }

  let walletSessionRow: DbWalletSessionRow | null = null;
  if (mode === 'wallet_session_row') {
    walletSessionRow = await ensureActiveWalletSession(
      supabase,
      walletAddress,
      body,
      lockoutResult.nextSession,
    );
  }

  if (walletSessionRow?.id) {
    void touchWalletSessionLastSeen(supabase, walletSessionRow.id);
  }

  return {
    ok: true as const,
    supabase,
    mode,
    profile,
    walletSessionRow,
  };
}

router.post('/exchange', async (c) => {
  let body: ExchangeRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const rawWallet = String(body.walletAddress || body.walletAuthSession?.address || '').trim();
  const walletAddress = normalizeAddress(rawWallet);

  if (!isValidWalletAddress(walletAddress)) {
    return c.json({ error: 'Invalid walletAddress (expected lowercase 0x + 40 hex chars)' }, 400);
  }

  const enabled = isEnabled('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE');
  if (!enabled) {
    return c.json(
      {
        ...scaffoldDisabledResponse('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE is not enabled'),
        requestEcho: { walletAddress, client: body.client || null },
      },
      501
    );
  }

  try {
    const verified = await verifyRequestAndResolveIdentity(body, walletAddress);
    if (!verified.ok) {
      return c.json({ error: verified.error }, { status: verified.status });
    }

    const token = await issueSupabaseClaimToken({
      walletAddress,
      profileId: verified.profile.id,
      walletSessionId: verified.walletSessionRow?.id ?? null,
    });

    return c.json({
      ok: true,
      ...token,
      walletAddress,
      profileId: verified.profile.id,
      verificationMode: verified.mode,
      source: 'atp2-wallet-auth-claim-bridge',
    });
  } catch (error) {
    console.error('[H1 Bridge] Exchange failed:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Bridge exchange failed',
      },
      500
    );
  }
});

router.post('/refresh', async (c) => {
  // H1 implementation keeps refresh narrow: reuse exchange request contract for now.
  // A dedicated refresh-token flow can be added in a later hardening batch.
  return c.json(
    {
      ok: false,
      status: 'not_supported_yet',
      hint: 'Reuse /exchange for short-lived token renewal in H1. Dedicated refresh flow deferred.',
    },
    501
  );
});

router.post('/logout', async (c) => {
  const auth = await requireAuthenticatedWallet(c);
  if (!auth.ok) {
    return auth.response;
  }

  if (!isEnabled('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE')) {
    return c.json({ error: 'Bridge is disabled' }, 501);
  }

  try {
    const supabase = getServiceSupabaseClient();
    const revokedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('wallet_sessions')
      .update({ revoked_at: revokedAt })
      .eq('wallet_address', auth.identity.walletAddress)
      .is('revoked_at', null)
      .select('id');

    if (error) {
      throw new Error(`wallet_sessions revoke failed: ${error.message}`);
    }

    return c.json({
      ok: true,
      status: 'revoked',
      walletAddress: auth.identity.walletAddress,
      currentSessionId: auth.identity.walletSessionId,
      revokedCount: Array.isArray(data) ? data.length : 0,
      revokedAt,
    });
  } catch (error) {
    console.error('[H1 Bridge] logout failed:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Unable to revoke wallet sessions' },
      500,
    );
  }
});

router.get('/sessions', async (c) => {
  const auth = await requireAuthenticatedWallet(c);
  if (!auth.ok) {
    return auth.response;
  }

  if (!isEnabled('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE')) {
    return c.json({ error: 'Bridge is disabled' }, 501);
  }

  try {
    const supabase = getServiceSupabaseClient();
    const currentSessionId = auth.identity.walletSessionId;

    if (currentSessionId) {
      void touchWalletSessionLastSeen(supabase, currentSessionId);
    }

    const { data, error } = await supabase
      .from('wallet_sessions')
      .select('id,wallet_address,created_at,expires_at,revoked_at,last_seen_at,device_label')
      .eq('wallet_address', auth.identity.walletAddress)
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) {
      throw new Error(`wallet_sessions list failed: ${error.message}`);
    }

    const now = Date.now();
    const sessions = ((data || []) as DbWalletSessionListRow[]).map((row) => {
      const expiresAtMs = Date.parse(row.expires_at);
      const status =
        row.revoked_at
          ? 'revoked'
          : Number.isFinite(expiresAtMs) && expiresAtMs > now
            ? 'active'
            : 'expired';

      return {
        id: row.id,
        walletAddress: row.wallet_address,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
        deviceLabel: row.device_label,
        status,
        isCurrent: !!currentSessionId && row.id === currentSessionId,
      };
    });

    return c.json({
      ok: true,
      source: 'wallet_sessions',
      currentSessionId,
      sessions,
    });
  } catch (error) {
    console.error('[H1 Bridge] sessions failed:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Unable to load wallet sessions' },
      500,
    );
  }
});

router.post('/community-notify', async (c) => {
  const auth = await requireAuthenticatedWallet(c);
  if (!auth.ok) {
    return auth.response;
  }

  let body: CommunityNotifyRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const targetWalletAddress = normalizeAddress(String(body.targetWalletAddress || '').trim());
  if (!isValidWalletAddress(targetWalletAddress)) {
    return c.json({ error: 'Invalid targetWalletAddress (expected lowercase 0x + 40 hex chars)' }, 400);
  }

  const title = String(body.title || '').trim();
  const message = String(body.message || '').trim();
  if (!title || !message) {
    return c.json({ error: 'title and message are required' }, 400);
  }

  const requestedSourceId = String(body.sourceId || '').trim();
  const sourceId =
    requestedSourceId && requestedSourceId.length <= 200
      ? requestedSourceId
      : `notif_${crypto.randomUUID()}`;

  if (!isEnabled('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE')) {
    return c.json({ error: 'Bridge is disabled' }, 501);
  }

  if (body.actorWalletAddress) {
    const walletMismatch = assertAuthenticatedWalletMatch(
      c,
      auth.identity,
      body.actorWalletAddress,
      'actorWalletAddress'
    );
    if (walletMismatch) return walletMismatch;
  }

  try {
    const supabase = getServiceSupabaseClient();
    const targetProfile = await resolveOrCreateProfile(supabase, targetWalletAddress);
    const rawMetadata =
      body.metadata && typeof body.metadata === 'object'
        ? { ...(body.metadata as Record<string, unknown>) }
        : {};
    const normalizedEventCode = String(
      (rawMetadata as any).eventCode ||
      (rawMetadata as any).event_code ||
      'community_event'
    )
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9:_-]+/g, '_')
      .slice(0, 120) || 'community_event';

    const payload = {
      ...rawMetadata,
      eventCode: normalizedEventCode,
      event_code: normalizedEventCode,
      sourceId,
      source_id: sourceId,
      actorWalletAddress: body.actorWalletAddress
        ? normalizeAddress(String(body.actorWalletAddress))
        : auth.identity.walletAddress,
      actorName: body.actorName || null,
      delivered_by: 'h1_bridge_service_role',
    };

    const { data: existingRows, error: existingLookupError } = await supabase
      .from('notifications')
      .select('id,user_id,source_id,created_at,is_read')
      .eq('user_id', targetProfile.id)
      .eq('source_type', 'atp2_app_v1')
      .eq('source_id', sourceId)
      .limit(1);

    if (existingLookupError) {
      throw new Error(`notifications lookup failed: ${existingLookupError.message}`);
    }

    const existing = (existingRows?.[0] as any) || null;
    if (existing?.id) {
      const { data: updatedRows, error: updateError } = await supabase
        .from('notifications')
        .update({
          title,
          body: message,
          payload,
          // Preserve read-state on dedupe updates to avoid unread resurrection after user action.
          is_read: !!existing.is_read,
          read_at: existing.is_read ? new Date().toISOString() : null,
        })
        .eq('id', existing.id)
        .select('id,user_id,source_id,created_at')
        .limit(1);

      if (updateError) {
        throw new Error(`notifications dedupe update failed: ${updateError.message}`);
      }

      return c.json({
        ok: true,
        deduped: true,
        targetWalletAddress,
        profileId: targetProfile.id,
        sourceId,
        row: updatedRows?.[0] || existing,
      });
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: targetProfile.id,
        type: 'community',
        title,
        body: message,
        payload,
        source_type: 'atp2_app_v1',
        source_id: sourceId,
        is_read: false,
        read_at: null,
      })
      .select('id,user_id,source_id,created_at')
      .limit(1);

    if (error) {
      throw new Error(`notifications insert failed: ${error.message}`);
    }

    return c.json({
      ok: true,
      targetWalletAddress,
      profileId: targetProfile.id,
      sourceId,
      row: data?.[0] || null,
    });
  } catch (error) {
    console.error('[H1 Bridge] community-notify failed:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'community-notify failed' },
      500
    );
  }
});

router.post('/asset-metadata-seed', async (c) => {
  const auth = await requireAuthenticatedWallet(c);
  if (!auth.ok) {
    return auth.response;
  }

  let body: AssetMetadataSeedRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!isEnabled('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE')) {
    return c.json({ error: 'Bridge is disabled' }, 501);
  }

  const rawItems = Array.isArray(body.assetItems) ? body.assetItems : [];
  if (rawItems.length === 0) {
    return c.json({ ok: true, rows: [], count: 0 });
  }
  if (rawItems.length > 100) {
    return c.json({ error: 'Too many assetItems (max 100)' }, 400);
  }

  const normalizedItems = rawItems
    .map((item) => {
      const assetUid = normalizeAssetUid(String(item.assetUid || ''));
      const title = String(item.title || '').trim();
      if (!assetUid || !title) return null;

      const media = (Array.isArray(item.media) ? item.media : [])
        .map((m, index) => ({
          media_type: (m.mediaType === 'video' || m.mediaType === 'document' ? m.mediaType : 'image') as 'image' | 'video' | 'document',
          url: String(m.url || '').trim(),
          sort_order: Number.isFinite(Number(m.sortOrder)) ? Math.max(0, Math.floor(Number(m.sortOrder))) : index,
          metadata: (m.metadata && typeof m.metadata === 'object') ? m.metadata : {},
        }))
        .filter((m) => !!m.url);

      const tags = Array.from(
        new Set((Array.isArray(item.tags) ? item.tags : []).map((t) => normalizeTag(String(t || ''))).filter(Boolean))
      );

      return {
        asset_uid: assetUid,
        title,
        slug: normalizeSlug(String(item.slug || `${assetUid}-${title}`)) || assetUid,
        category: item.category ? String(item.category).trim() : null,
        subcategory: item.subcategory ? String(item.subcategory).trim() : null,
        description: item.description ? String(item.description) : null,
        cover_image_url: item.coverImageUrl ? String(item.coverImageUrl) : null,
        gallery_images: Array.isArray(item.galleryImages) ? item.galleryImages.filter((x) => typeof x === 'string') : [],
        attributes: (item.attributes && typeof item.attributes === 'object') ? item.attributes : {},
        metadata: (item.metadata && typeof item.metadata === 'object') ? item.metadata : {},
        contract_address: item.contractAddress ? String(item.contractAddress) : null,
        token_id: item.tokenId ? String(item.tokenId) : null,
        chain_id: Number.isFinite(Number(item.chainId)) ? Number(item.chainId) : null,
        is_active: !!item.isActive,
        media,
        tags,
      };
    })
    .filter(Boolean) as Array<{
      asset_uid: string;
      title: string;
      slug: string;
      category: string | null;
      subcategory: string | null;
      description: string | null;
      cover_image_url: string | null;
      gallery_images: string[];
      attributes: Record<string, unknown>;
      metadata: Record<string, unknown>;
      contract_address: string | null;
      token_id: string | null;
      chain_id: number | null;
      is_active: boolean;
      media: Array<{ media_type: 'image' | 'video' | 'document'; url: string; sort_order: number; metadata: Record<string, unknown> }>;
      tags: string[];
    }>;

  if (normalizedItems.length === 0) {
    return c.json({ error: 'No valid assetItems after normalization' }, 400);
  }

  try {
    const supabase = getServiceSupabaseClient();

    const { data: upsertedAssets, error: assetUpsertError } = await supabase
      .from('assets_catalog')
      .upsert(
        normalizedItems.map((item) => ({
          asset_uid: item.asset_uid,
          title: item.title,
          slug: item.slug,
          category: item.category,
          subcategory: item.subcategory,
          description: item.description,
          cover_image_url: item.cover_image_url,
          gallery_images: item.gallery_images,
          attributes: item.attributes,
          metadata: {
            ...(item.metadata || {}),
            seeded_by: 'h1_bridge_asset_metadata_seed',
            seeded_at: new Date().toISOString(),
            seeded_by_wallet: auth.identity.walletAddress,
          },
          contract_address: item.contract_address,
          token_id: item.token_id,
          chain_id: item.chain_id,
          is_active: item.is_active,
        })),
        { onConflict: 'asset_uid' }
      )
      .select('id,asset_uid');

    if (assetUpsertError) {
      throw new Error(`assets_catalog upsert failed: ${assetUpsertError.message}`);
    }

    const assetRows = (upsertedAssets || []) as DbAssetCatalogRow[];
    const assetIdByUid = new Map(assetRows.map((row) => [normalizeAssetUid(row.asset_uid), row.id]));

    // Tags upsert + lookup
    const allTags = Array.from(
      new Set(normalizedItems.flatMap((item) => item.tags))
    );
    let tagIdByTag = new Map<string, string>();
    if (allTags.length > 0) {
      const { error: tagsUpsertError } = await supabase
        .from('asset_tags')
        .upsert(allTags.map((tag) => ({ tag })), { onConflict: 'tag', ignoreDuplicates: true });
      if (tagsUpsertError) {
        throw new Error(`asset_tags upsert failed: ${tagsUpsertError.message}`);
      }
      const { data: tagRows, error: tagSelectError } = await supabase
        .from('asset_tags')
        .select('id,tag')
        .in('tag', allTags);
      if (tagSelectError) {
        throw new Error(`asset_tags select failed: ${tagSelectError.message}`);
      }
      tagIdByTag = new Map(((tagRows || []) as DbAssetTagRow[]).map((row) => [row.tag, row.id]));
    }

    for (const item of normalizedItems) {
      const assetId = assetIdByUid.get(item.asset_uid);
      if (!assetId) continue;

      const { error: mediaDeleteError } = await supabase
        .from('asset_media')
        .delete()
        .eq('asset_id', assetId);
      if (mediaDeleteError) {
        throw new Error(`asset_media delete failed for ${item.asset_uid}: ${mediaDeleteError.message}`);
      }

      if (item.media.length > 0) {
        const { error: mediaInsertError } = await supabase
          .from('asset_media')
          .insert(
            item.media.map((m) => ({
              asset_id: assetId,
              media_type: m.media_type,
              url: m.url,
              sort_order: m.sort_order,
              metadata: m.metadata,
            }))
          );
        if (mediaInsertError) {
          throw new Error(`asset_media insert failed for ${item.asset_uid}: ${mediaInsertError.message}`);
        }
      }

      const { error: mapDeleteError } = await supabase
        .from('asset_tag_map')
        .delete()
        .eq('asset_id', assetId);
      if (mapDeleteError) {
        throw new Error(`asset_tag_map delete failed for ${item.asset_uid}: ${mapDeleteError.message}`);
      }

      const tagRows = item.tags
        .map((tag) => {
          const tagId = tagIdByTag.get(tag);
          return tagId ? { asset_id: assetId, tag_id: tagId } : null;
        })
        .filter(Boolean);
      if (tagRows.length > 0) {
        const { error: mapInsertError } = await supabase
          .from('asset_tag_map')
          .insert(tagRows as Array<{ asset_id: string; tag_id: string }>);
        if (mapInsertError) {
          throw new Error(`asset_tag_map insert failed for ${item.asset_uid}: ${mapInsertError.message}`);
        }
      }
    }

    return c.json({
      ok: true,
      count: normalizedItems.length,
      rows: normalizedItems.map((item) => ({
        assetUid: item.asset_uid,
        assetId: assetIdByUid.get(item.asset_uid) || null,
      })),
    });
  } catch (error) {
    console.error('[H1 Bridge] asset-metadata-seed failed:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'asset-metadata-seed failed' },
      500
    );
  }
});

router.get('/health', async (c) => {
  return c.json({
    ok: true,
    status: 'implemented_h1',
    enabled: isEnabled('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE'),
    verificationMode: getVerificationMode(),
    hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    hasJwtSecret: !!getJwtSecret(),
    ttlSeconds: getTtlSeconds(),
  });
});

export default router;
