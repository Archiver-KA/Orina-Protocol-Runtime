import { Hono } from 'npm:hono';

const router = new Hono();

type ExchangeRequest = {
  walletAddress?: string;
  walletAuthSession?: {
    address?: string;
    signedAt?: number;
    signature?: string;
  };
  client?: {
    app?: string;
    phase?: string;
    requestedAt?: string;
  };
};

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function isValidWalletAddress(address: string): boolean {
  return /^0x[a-f0-9]{40}$/.test(address);
}

function scaffoldDisabledResponse(reason: string) {
  return {
    ok: false,
    status: 'not_implemented',
    reason,
    hint: 'H1 scaffold only. Implement wallet-session verification + Supabase JWT signing before enabling.',
    expectedClaims: {
      role: 'authenticated',
      profile_id: 'uuid',
      wallet_address: '0x... (lowercase)',
      claim_version: 'h1',
      auth_method: 'wallet_signature',
      wallet_session_id: 'uuid|null',
    },
    nextSteps: [
      'Validate wallet session against public.wallet_sessions (server-side)',
      'Resolve/create profiles row (service role) and canonical profile_id',
      'Sign Supabase-compatible JWT using SUPABASE_JWT_SECRET',
      'Return short-lived access token + expiresAt',
    ],
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

  if (!body.walletAuthSession?.signature) {
    return c.json({ error: 'Missing walletAuthSession.signature' }, 400);
  }

  // Safety gate: scaffold endpoint is disabled by default.
  // Set ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE=true only after implementing
  // server-side wallet session verification + JWT signing.
  const enabled =
    (Deno.env.get('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE') || '').toLowerCase() === 'true';

  if (!enabled) {
    return c.json(
      {
        ...scaffoldDisabledResponse('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE is not enabled'),
        requestEcho: {
          walletAddress,
          client: body.client || null,
        },
      },
      501
    );
  }

  // H1 scaffold intentionally stops here. Implementers must:
  // 1) Verify wallet session hash/signature server-side
  // 2) Resolve/create profiles row and get canonical profile_id
  // 3) Sign Supabase-compatible JWT (role=authenticated, sub=profile_id)
  // 4) Return short-lived token
  return c.json(
    {
      ...scaffoldDisabledResponse('Bridge enabled flag set, but JWT signing/verification not implemented yet'),
      requestEcho: {
        walletAddress,
        client: body.client || null,
      },
    },
    501
  );
});

router.post('/refresh', async (c) => {
  return c.json(scaffoldDisabledResponse('refresh endpoint scaffold only'), 501);
});

router.post('/logout', async (c) => {
  // Client can clear local bridge token without server coordination for now.
  return c.json({ ok: true, status: 'noop_scaffold' });
});

router.get('/health', async (c) => {
  return c.json({
    ok: true,
    status: 'scaffold',
    enabled:
      (Deno.env.get('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE') || '').toLowerCase() === 'true',
  });
});

export default router;
