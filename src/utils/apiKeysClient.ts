import type { APIKey, APIKeyGenerateOptions, APIKeyPermission } from '@/app/types/api-key';
import { getSupabaseFunctionsBaseUrl } from '/utils/supabase/functions';
import {
  clearSupabaseBridgeSession,
  ensureSupabaseBridgeAccessToken,
  getSupabaseBridgeAccessToken,
  isBridgeAuthRequiredError,
  isSupabaseAuthClaimBridgeEnabled,
} from '@/utils/supabaseAuthClaimBridge';
import {
  createIdempotencyKey,
  resilientFetch,
} from '@/utils/resilience';

const BASE_URL = getSupabaseFunctionsBaseUrl();
const API_KEYS_BASE_PATH = '/ai/api-keys';

interface ApiKeyRecord {
  id: string;
  walletAddress: string;
  name: string;
  keyPreview: string;
  permissions: APIKeyPermission[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  isActive: boolean;
  usageCount: number;
}

interface ApiKeyListResponse {
  success: boolean;
  keys: ApiKeyRecord[];
}

interface ApiKeyGenerateResponse {
  success: boolean;
  key: ApiKeyRecord & { rawKey: string };
}

interface ApiKeyMutationResponse {
  success: boolean;
  key: ApiKeyRecord;
}

function normalizePreview(value: string): string {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Hidden after creation';
  return normalized.endsWith('...') ? normalized : `${normalized}...`;
}

function mapPermissions(value: unknown): APIKeyPermission[] {
  const allowed = new Set<APIKeyPermission>(['read', 'write', 'mint', 'delete']);
  return Array.isArray(value)
    ? value
        .map((permission) => String(permission || '').trim().toLowerCase() as APIKeyPermission)
        .filter((permission) => allowed.has(permission))
    : ['read'];
}

function mapRecordToApiKey(record: ApiKeyRecord, rawKey?: string): APIKey {
  return {
    id: record.id,
    key: rawKey || '',
    keyPreview: normalizePreview(record.keyPreview),
    rawKeyAvailable: Boolean(rawKey),
    name: record.name,
    walletAddress: record.walletAddress,
    permissions: mapPermissions(record.permissions),
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
    isActive: record.isActive,
    usageStats: {
      totalRequests: Math.max(0, Number(record.usageCount || 0)),
      successRate: 0,
      lastDayRequests: 0,
    },
  };
}

function buildSecurityCheck() {
  return {
    title: 'Unlock API Keys',
    description: 'Confirm a one-time wallet security check before Orina loads or updates your API keys.',
    surfaceLabel: 'API keys',
    confirmLabel: 'Unlock API Keys',
    helpText: 'This only unlocks protected API key controls in Orina. No gas fee, transaction, or token approval is involved.',
    successMessage: 'API key controls unlocked.',
    successDescription: 'Retry the API key action to continue.',
  } as const;
}

function readRequestErrorMessage(payload: any, status: number): string {
  return (
    payload?.error
    || payload?.message
    || `Request failed with HTTP ${status}`
  );
}

function isRetryableProtectedAuthFailure(status: number, payload: any): boolean {
  if (status !== 401) return false;
  const normalized = readRequestErrorMessage(payload, status).toLowerCase();
  return (
    normalized.includes('authentication required')
    || normalized.includes('invalid or expired authentication token')
    || normalized.includes('authenticated wallet claims are required')
    || normalized.includes('authenticated wallet session is no longer active')
  );
}

function isReplaySafeWrite(path: string, method: string): boolean {
  if (method === 'GET') return true;
  return !path.endsWith('/generate');
}

async function getProtectedHeaders(walletAddress: string, promptOnAuthMissing: boolean, withJson = false) {
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  if (!BASE_URL) {
    throw new Error('API keys are not available in this environment.');
  }

  let accessToken: string | null = null;
  if (isSupabaseAuthClaimBridgeEnabled()) {
    try {
      accessToken = await ensureSupabaseBridgeAccessToken({
        walletAddress,
        promptOnAuthMissing,
        securityCheck: buildSecurityCheck(),
      });
    } catch (error) {
      if (isBridgeAuthRequiredError(error)) {
        throw new Error('Confirm your wallet in Orina, then try the API key action again.');
      }
      throw error;
    }
  }

  accessToken = accessToken || getSupabaseBridgeAccessToken();
  if (!accessToken) {
    throw new Error('Please confirm your wallet once in Orina to continue with API keys.');
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    ...(withJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function request<T>(
  walletAddress: string,
  path: string,
  init?: RequestInit,
  promptOnAuthMissing = false,
  retryOnAuthFailure = true,
): Promise<T> {
  const method = String(init?.method || 'GET').toUpperCase();
  const replaySafeWrite = isReplaySafeWrite(path, method);
  const headers = await getProtectedHeaders(walletAddress, promptOnAuthMissing, method !== 'GET');
  const idempotencyKey = method === 'GET'
    ? undefined
    : createIdempotencyKey(`api-keys:${method.toLowerCase()}:${path}`);
  const response = await resilientFetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
  }, {
    operation: `api-keys:${method.toLowerCase()}:${path}`,
    timeoutMs: method === 'GET' ? 8_000 : 12_000,
    idempotencyKey,
    retry: {
      maxAttempts: method === 'GET' ? 3 : replaySafeWrite ? 2 : 1,
      baseDelayMs: 250,
      maxDelayMs: 1_500,
    },
    circuit: {
      key: 'edge-api-keys',
      failureThreshold: method === 'GET' ? 4 : 2,
      openMs: method === 'GET' ? 15_000 : 30_000,
    },
  });

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { error: text || `Request failed with HTTP ${response.status}` };
  }

  if (
    retryOnAuthFailure
    && response.status === 401
    && isRetryableProtectedAuthFailure(response.status, payload)
  ) {
    clearSupabaseBridgeSession();
    return request<T>(walletAddress, path, init, promptOnAuthMissing, false);
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(readRequestErrorMessage(payload, response.status));
  }

  return payload as T;
}

export class APIKeysClient {
  static async list(walletAddress: string): Promise<APIKey[]> {
    const response = await request<ApiKeyListResponse>(
      walletAddress,
      `${API_KEYS_BASE_PATH}/list`,
    );
    return response.keys.map((record) => mapRecordToApiKey(record));
  }

  static async generate(walletAddress: string, options: APIKeyGenerateOptions): Promise<APIKey> {
    const response = await request<ApiKeyGenerateResponse>(
      walletAddress,
      `${API_KEYS_BASE_PATH}/generate`,
      {
        method: 'POST',
        body: JSON.stringify(options),
      },
      true,
    );
    return mapRecordToApiKey(response.key, response.key.rawKey);
  }

  static async revoke(walletAddress: string, keyId: string): Promise<APIKey> {
    const response = await request<ApiKeyMutationResponse>(
      walletAddress,
      `${API_KEYS_BASE_PATH}/${keyId}/revoke`,
      { method: 'PATCH' },
      true,
    );
    return mapRecordToApiKey(response.key);
  }

  static async delete(walletAddress: string, keyId: string): Promise<void> {
    await request<{ success: boolean }>(
      walletAddress,
      `${API_KEYS_BASE_PATH}/${keyId}`,
      { method: 'DELETE' },
      true,
    );
  }
}
