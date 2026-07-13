import { Context, Hono } from 'npm:hono@4.12.29';
import { createClient } from 'npm:@supabase/supabase-js@2.100.1';
import { requireAuthenticatedWallet } from './request-auth.ts';
import { checkRateLimit, rateLimitExceededResponse } from './rate-limiter.ts';

const apiKeysHandler = new Hono();

const API_KEY_SELECT = [
  'id',
  'wallet_address',
  'key_name',
  'key_prefix',
  'permissions',
  'is_active',
  'created_at',
  'expires_at',
  'last_used_at',
  'usage_count',
  'revoked_at',
].join(',');

const ALLOWED_PERMISSIONS = new Set(['read', 'write', 'mint', 'delete']);

type ApiCredentialRow = {
  id: number | string;
  wallet_address: string;
  key_name: string;
  key_prefix: string;
  permissions: unknown;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  usage_count: number | null;
  revoked_at: string | null;
};

function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceKey);
}

function normalizePermissions(input: unknown): string[] {
  const normalized = Array.isArray(input)
    ? input
        .map((value) => String(value || '').trim().toLowerCase())
        .filter((value) => ALLOWED_PERMISSIONS.has(value))
    : [];

  const deduped = Array.from(new Set(normalized));
  if (!deduped.includes('read')) {
    deduped.unshift('read');
  }
  return deduped;
}

function parseExpiresInDays(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(3650, Math.floor(parsed));
}

function buildExpiryIso(expiresInDays: number | null): string | null {
  if (!expiresInDays) return null;
  return new Date(Date.now() + (expiresInDays * 24 * 60 * 60 * 1000)).toISOString();
}

function hexEncode(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return hexEncode(digest);
}

function buildRawKey(): string {
  return `sk_orina_${crypto.randomUUID().replace(/-/g, '')}`;
}

function toApiKeyRecord(row: ApiCredentialRow) {
  const permissions = normalizePermissions(row.permissions);
  const expiresAt = row.expires_at || null;
  const revokedAt = row.revoked_at || null;
  const isExpired = expiresAt ? Date.parse(expiresAt) <= Date.now() : false;

  return {
    id: String(row.id),
    walletAddress: row.wallet_address,
    name: row.key_name,
    keyPreview: `${row.key_prefix}...`,
    permissions,
    createdAt: row.created_at,
    expiresAt,
    lastUsedAt: row.last_used_at || null,
    revokedAt,
    isActive: Boolean(row.is_active) && !revokedAt && !isExpired,
    usageCount: Math.max(0, Number(row.usage_count || 0)),
  };
}

function parseKeyId(rawValue?: string | null): number | null {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

apiKeysHandler.get('/api-keys/list', async (c: Context) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;
    const rate = await checkRateLimit('api_key_read', auth.identity.walletAddress);
    if (!rate.allowed) return rateLimitExceededResponse(c, rate);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('api_credentials')
      .select(API_KEY_SELECT)
      .eq('wallet_address', auth.identity.walletAddress)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return c.json({ error: 'Unable to load API keys' }, 500);
    }

    const rows = (data ?? []) as unknown as ApiCredentialRow[];

    return c.json({
      success: true,
      keys: rows.map((row) => toApiKeyRecord(row)),
    });
  } catch (error) {
    console.error('[API Keys] Failed to list keys:', error);
    return c.json(
      { error: 'Unable to load API keys' },
      500,
    );
  }
});

apiKeysHandler.post('/api-keys/generate', async (c: Context) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;
    const rate = await checkRateLimit('api_key_write', auth.identity.walletAddress);
    if (!rate.allowed) return rateLimitExceededResponse(c, rate);

    const body = await c.req.json().catch(() => ({}));
    const keyName = String(body?.name || '').trim();
    if (!keyName || keyName.length > 120) {
      return c.json({ error: 'Key name is required and must not exceed 120 characters' }, 400);
    }
    const hasExpiryInput = body?.expiresInDays !== null
      && body?.expiresInDays !== undefined
      && body?.expiresInDays !== '';
    const expiresInDays = parseExpiresInDays(body?.expiresInDays);
    if (hasExpiryInput && expiresInDays === null) {
      return c.json({ error: 'expiresInDays must be a positive integer no greater than 3650' }, 400);
    }

    const permissions = normalizePermissions(body?.permissions);
    const expiresAt = buildExpiryIso(expiresInDays);
    const rawKey = buildRawKey();
    const keyHash = await sha256Hex(rawKey);
    const keyPrefix = rawKey.slice(0, 16);

    const supabase = getSupabaseClient();
    const { data: existingRows, error: existingError } = await supabase
      .from('api_credentials')
      .select('id,is_active,revoked_at,expires_at')
      .eq('wallet_address', auth.identity.walletAddress)
      .limit(100);
    if (existingError) return c.json({ error: 'Unable to verify API key quota' }, 500);
    if ((existingRows || []).length >= 100) {
      return c.json({ error: 'API key history limit reached; delete unused keys before creating another' }, 409);
    }
    const activeCount = (existingRows || []).filter((row) => (
      row.is_active
      && !row.revoked_at
      && (!row.expires_at || Date.parse(row.expires_at) > Date.now())
    )).length;
    if (activeCount >= 20) {
      return c.json({ error: 'Maximum active API key limit reached' }, 409);
    }
    const { data, error } = await supabase
      .from('api_credentials')
      .insert({
        wallet_address: auth.identity.walletAddress,
        key_name: keyName,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        permissions,
        is_active: true,
        expires_at: expiresAt,
      })
      .select(API_KEY_SELECT)
      .single();

    if (error) {
      return c.json({ error: 'Unable to create API key' }, 500);
    }

    if (!data) {
      return c.json({ error: 'API key was created but no record was returned' }, 500);
    }

    const record = data as unknown as ApiCredentialRow;

    return c.json({
      success: true,
      key: {
        ...toApiKeyRecord(record),
        rawKey,
      },
    });
  } catch (error) {
    console.error('[API Keys] Failed to generate key:', error);
    return c.json(
      { error: 'Unable to generate API key' },
      500,
    );
  }
});

apiKeysHandler.patch('/api-keys/:id/revoke', async (c: Context) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;
    const rate = await checkRateLimit('api_key_write', auth.identity.walletAddress);
    if (!rate.allowed) return rateLimitExceededResponse(c, rate);

    const keyId = parseKeyId(c.req.param('id'));
    if (!keyId) {
      return c.json({ error: 'Invalid key id' }, 400);
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('api_credentials')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('id', keyId)
      .eq('wallet_address', auth.identity.walletAddress)
      .select(API_KEY_SELECT)
      .maybeSingle();

    if (error) {
      return c.json({ error: 'Unable to revoke API key' }, 500);
    }
    if (!data) {
      return c.json({ error: 'API key not found' }, 404);
    }

    const record = data as unknown as ApiCredentialRow;

    return c.json({ success: true, key: toApiKeyRecord(record) });
  } catch (error) {
    console.error('[API Keys] Failed to revoke key:', error);
    return c.json(
      { error: 'Unable to revoke API key' },
      500,
    );
  }
});

apiKeysHandler.delete('/api-keys/:id', async (c: Context) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;
    const rate = await checkRateLimit('api_key_write', auth.identity.walletAddress);
    if (!rate.allowed) return rateLimitExceededResponse(c, rate);

    const keyId = parseKeyId(c.req.param('id'));
    if (!keyId) {
      return c.json({ error: 'Invalid key id' }, 400);
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('api_credentials')
      .delete()
      .eq('id', keyId)
      .eq('wallet_address', auth.identity.walletAddress);

    if (error) {
      return c.json({ error: 'Unable to delete API key' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('[API Keys] Failed to delete key:', error);
    return c.json(
      { error: 'Unable to delete API key' },
      500,
    );
  }
});

export default apiKeysHandler;
