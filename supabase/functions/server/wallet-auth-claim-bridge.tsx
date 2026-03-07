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
  expires_at: string;
  revoked_at: string | null;
};

type DbAssetCatalogRow = {
  id: string;
  asset_uid: string;
};

type DbAssetTagRow = {
  id: string;
  tag: string;
};

type VerificationMode =
  | 'dev_trust_client_session'
  | 'wallet_session_row';

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
      actorWalletAddress: body.actorWalletAddress ? normalizeAddress(String(body.actorWalletAddress)) : null,
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
