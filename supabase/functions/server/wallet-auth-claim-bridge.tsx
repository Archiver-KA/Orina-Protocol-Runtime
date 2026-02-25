import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';

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

type DbProfileRow = {
  id: string;
  wallet_address: string;
  status: string | null;
};

type DbWalletSessionRow = {
  id: string;
  wallet_address: string;
  expires_at: string;
  revoked_at: string | null;
};

type VerificationMode =
  | 'dev_trust_client_session'
  | 'wallet_session_row';

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function isValidWalletAddress(address: string): boolean {
  return /^0x[a-f0-9]{40}$/.test(address);
}

function isEnabled(name: string): boolean {
  return (Deno.env.get(name) || '').toLowerCase() === 'true';
}

function getVerificationMode(): VerificationMode {
  const raw = (Deno.env.get('ATP2_SUPABASE_AUTH_BRIDGE_VERIFY_MODE') || 'dev_trust_client_session')
    .toLowerCase()
    .trim();
  if (raw === 'wallet_session_row') return 'wallet_session_row';
  return 'dev_trust_client_session';
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

async function findActiveWalletSession(
  supabase: ReturnType<typeof createClient>,
  walletAddress: string
): Promise<DbWalletSessionRow | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('wallet_sessions')
    .select('id,wallet_address,expires_at,revoked_at')
    .eq('wallet_address', walletAddress)
    .is('revoked_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(`wallet_sessions lookup failed: ${error.message}`);
  return (data?.[0] as DbWalletSessionRow | undefined) || null;
}

async function touchWalletSessionLastSeen(
  supabase: ReturnType<typeof createClient>,
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

async function resolveOrCreateProfile(
  supabase: ReturnType<typeof createClient>,
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

async function verifyRequestAndResolveIdentity(body: ExchangeRequest, walletAddress: string) {
  const payloadError = assertClientWalletSessionPayload(body, walletAddress);
  if (payloadError) {
    return { ok: false as const, status: 400, error: payloadError };
  }

  const supabase = getServiceSupabaseClient();
  const mode = getVerificationMode();

  let walletSessionRow: DbWalletSessionRow | null = null;
  if (mode === 'wallet_session_row') {
    walletSessionRow = await findActiveWalletSession(supabase, walletAddress);
    if (!walletSessionRow) {
      return { ok: false as const, status: 401, error: 'No active wallet session found for wallet_address' };
    }
  }

  const profile = await resolveOrCreateProfile(supabase, walletAddress);

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
      return c.json({ error: verified.error }, verified.status);
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
  // Client can clear local bridge token without server coordination in H1.
  return c.json({ ok: true, status: 'noop_h1' });
});

router.post('/community-notify', async (c) => {
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

  try {
    const supabase = getServiceSupabaseClient();
    const targetProfile = await resolveOrCreateProfile(supabase, targetWalletAddress);

    const payload = {
      ...(body.metadata || {}),
      actorWalletAddress: body.actorWalletAddress ? normalizeAddress(String(body.actorWalletAddress)) : null,
      actorName: body.actorName || null,
      delivered_by: 'h1_bridge_service_role',
    };

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
