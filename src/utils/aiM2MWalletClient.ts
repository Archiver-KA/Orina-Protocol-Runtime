import type {
  AIM2MClientError,
  AIM2MClientResult,
  AIM2MConfigResponse,
  AIM2MDelegateInvite,
  AIM2MDelegateRecord,
  AIM2MWalletConfig,
} from '@/app/types/ai-m2m-wallet';
import { publicAnonKey } from '/utils/supabase/info';
import {
  getSupabaseFunctionsBaseUrl,
  getSupabaseFunctionsNamespace,
} from '/utils/supabase/functions';
import {
  clearSupabaseBridgeSession,
  ensureSupabaseBridgeAccessToken,
  isBridgeAuthRequiredError,
  getSupabaseBridgeAccessToken,
  isSupabaseAuthClaimBridgeEnabled,
} from '@/utils/supabaseAuthClaimBridge';
import {
  createIdempotencyKey,
  resilientFetch,
} from '@/utils/resilience';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const DEFAULT_AI_M2M_FN_NAME = 'orina-ai-m2m-v2';
const LEGACY_AI_M2M_PATH_PREFIX = '/ai/m2m';

function readEnvString(name: string): string | null {
  const value = env[name];
  return typeof value === 'string' ? value.trim() : null;
}

const SHARED_FUNCTION_NAMESPACE = getSupabaseFunctionsNamespace();
const AI_M2M_FN_NAME = readEnvString('VITE_SUPABASE_AI_M2M_FN_NAME') || DEFAULT_AI_M2M_FN_NAME;
const EXPLICIT_AI_M2M_PATH_PREFIX = readEnvString('VITE_SUPABASE_AI_M2M_PATH_PREFIX');
const AI_M2M_CONFIG_CACHE = new Map<string, AIM2MConfigResponse>();

interface AIM2MEndpoint {
  baseUrl: string;
  functionName: string;
  pathPrefix: string;
  kind: 'configured' | 'shared_fallback';
}

function normalizePathPrefix(value: string | null | undefined): string {
  return String(value || '').trim().replace(/\/+$/, '');
}

function buildAIM2MEndpoint(
  functionName: string,
  pathPrefix: string | null | undefined,
  kind: AIM2MEndpoint['kind'],
): AIM2MEndpoint | null {
  const normalizedFunctionName = String(functionName || '').trim();
  const baseUrl = getSupabaseFunctionsBaseUrl(normalizedFunctionName);
  if (!normalizedFunctionName || !baseUrl) return null;

  return {
    baseUrl,
    functionName: normalizedFunctionName,
    pathPrefix: normalizePathPrefix(pathPrefix),
    kind,
  };
}

const PRIMARY_AI_M2M_ENDPOINT = buildAIM2MEndpoint(
  AI_M2M_FN_NAME,
  EXPLICIT_AI_M2M_PATH_PREFIX
    ?? (AI_M2M_FN_NAME === SHARED_FUNCTION_NAMESPACE ? LEGACY_AI_M2M_PATH_PREFIX : ''),
  'configured',
);
const SHARED_AI_M2M_FALLBACK_ENDPOINT =
  !EXPLICIT_AI_M2M_PATH_PREFIX
  && SHARED_FUNCTION_NAMESPACE
  && SHARED_FUNCTION_NAMESPACE !== AI_M2M_FN_NAME
    ? buildAIM2MEndpoint(SHARED_FUNCTION_NAMESPACE, LEGACY_AI_M2M_PATH_PREFIX, 'shared_fallback')
    : null;
const AI_M2M_ENDPOINTS = [PRIMARY_AI_M2M_ENDPOINT, SHARED_AI_M2M_FALLBACK_ENDPOINT]
  .filter((endpoint): endpoint is AIM2MEndpoint => Boolean(endpoint))
  .filter((endpoint, index, endpoints) => {
    return endpoints.findIndex((candidate) => (
      candidate.baseUrl === endpoint.baseUrl
      && candidate.pathPrefix === endpoint.pathPrefix
    )) === index;
  });

function buildAIM2MRequestPath(endpoint: AIM2MEndpoint, path: string): string {
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  const prefix = endpoint.pathPrefix;
  return prefix ? `${prefix}/${normalizedPath}` : `/${normalizedPath}`;
}

interface AIM2MDelegateResponse {
  success: boolean;
  delegate: AIM2MDelegateRecord;
  delegates?: AIM2MDelegateRecord[];
  pendingInvites?: AIM2MDelegateInvite[];
  rootWalletAddress?: string;
}

interface AIM2MInviteResponse {
  success: boolean;
  invite: AIM2MDelegateInvite;
  pendingInvites?: AIM2MDelegateInvite[];
}

function makeClientError(
  code: AIM2MClientError['code'],
  message: string,
  extra: Partial<Omit<AIM2MClientError, 'code' | 'message'>> = {},
): AIM2MClientError {
  return {
    code,
    message,
    ...extra,
  };
}

function isClientError(value: unknown): value is AIM2MClientError {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'code' in value &&
    'message' in value,
  );
}

function coerceClientError(
  error: unknown,
  fallbackCode: AIM2MClientError['code'],
  fallbackMessage: string,
  requestPath?: string,
): AIM2MClientError {
  if (isClientError(error)) {
    return {
      ...error,
      requestPath: error.requestPath ?? requestPath,
    };
  }

  if (error instanceof Error) {
    return makeClientError(fallbackCode, error.message || fallbackMessage, { requestPath });
  }

  return makeClientError(fallbackCode, fallbackMessage, {
    requestPath,
    details: error ?? null,
  });
}

async function parseResponseBody(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function classifyHttpError(status: number): AIM2MClientError['code'] {
  if (status === 400) return 'invalid_request';
  if (status === 401) return 'http_unauthorized';
  if (status === 403) return 'http_forbidden';
  if (status === 404) return 'http_not_found';
  if (status >= 500) return 'http_server_error';
  return 'http_error';
}

function readRequestErrorMessage(payload: any, status: number): string {
  return (
    payload?.error
    || payload?.message
    || `AI M2M request failed with HTTP ${status}`
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
    || normalized.includes('invalid jwt')
  );
}

function shouldRetryViaSharedFallback(error: AIM2MClientError, endpoint: AIM2MEndpoint): boolean {
  if (endpoint.kind !== 'configured') return false;
  return (
    error.code === 'network_error'
    || error.code === 'http_not_found'
    || error.code === 'http_server_error'
  );
}

async function getProtectedJsonHeaders(walletAddress: string): Promise<Record<string, string>> {
  return getProtectedJsonHeadersWithMode(walletAddress, false);
}

function buildAIM2MSecurityCheck(surfaceLabel: string, confirmLabel = 'Unlock AI Wallet') {
  return {
    title: 'Unlock AI Wallet Settings',
    description: 'AI wallet configuration needs a one-time wallet security check before Orina can load or update delegated wallet settings.',
    surfaceLabel,
    confirmLabel,
    helpText: 'This signature unlocks protected AI wallet controls in Orina. No gas fee, transaction, or token approval is involved.',
    successMessage: 'AI wallet settings unlocked.',
    successDescription: 'Retry the AI wallet action to continue.',
  } as const;
}

async function getProtectedJsonHeadersWithMode(
  walletAddress: string,
  promptOnAuthMissing: boolean,
): Promise<Record<string, string>> {
  if (!walletAddress) {
    throw makeClientError('invalid_request', 'Wallet address is required');
  }

  if (!AI_M2M_ENDPOINTS.length || !publicAnonKey) {
    throw makeClientError(
      'service_not_configured',
      'AI wallet settings are not available in this environment.',
    );
  }

  const bridgeEnabled = isSupabaseAuthClaimBridgeEnabled();
  if (!bridgeEnabled) {
    const existingToken = getSupabaseBridgeAccessToken();
    if (!existingToken) {
      throw makeClientError(
        'bridge_disabled',
        'AI wallet setup is not available right now.',
      );
    }
  } else {
    try {
      const accessToken = await ensureSupabaseBridgeAccessToken({
        walletAddress,
        promptOnAuthMissing,
        securityCheck: buildAIM2MSecurityCheck('AI wallet settings'),
      });
      if (accessToken) {
        return {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };
      }
    } catch (error) {
      if (isBridgeAuthRequiredError(error)) {
        throw makeClientError(
          'wallet_session_required',
          'Confirm your wallet in Orina, then try AI wallet setup again.',
          { details: error.request },
        );
      }
      throw coerceClientError(
        error,
        'bridge_exchange_failed',
        'We could not confirm your wallet right now.',
      );
    }
  }

  const accessToken = getSupabaseBridgeAccessToken();
  if (!accessToken) {
    throw makeClientError(
      'wallet_session_required',
      'Please confirm your wallet once in Orina, then try AI wallet setup again.',
    );
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

async function getProtectedHeaders(walletAddress: string): Promise<Record<string, string>> {
  const headers = await getProtectedJsonHeadersWithMode(walletAddress, false);
  return { Authorization: headers.Authorization };
}

async function requestWithWalletAuth<T>(
  walletAddress: string,
  requestResourcePath: string,
  promptOnAuthMissing: boolean,
  init?: RequestInit,
  retryOnAuthFailure = true,
): Promise<AIM2MClientResult<T>> {
  try {
    const headers = init?.method && init.method !== 'GET'
      ? await getProtectedJsonHeadersWithMode(walletAddress, promptOnAuthMissing)
      : await getProtectedHeaders(walletAddress);

    let lastError: AIM2MClientError | null = null;
    for (const endpoint of AI_M2M_ENDPOINTS) {
      const requestPath = buildAIM2MRequestPath(endpoint, requestResourcePath);
      try {
        const method = String(init?.method || 'GET').toUpperCase();
        const response = await resilientFetch(`${endpoint.baseUrl}${requestPath}`, {
          ...init,
          headers: {
            ...headers,
            ...(init?.headers || {}),
          },
        }, {
          operation: `ai-m2m:${method.toLowerCase()}:${requestResourcePath}`,
          timeoutMs: method === 'GET' ? 8_000 : 12_000,
          idempotencyKey: method === 'GET'
            ? undefined
            : createIdempotencyKey(`ai-m2m:${method.toLowerCase()}:${requestResourcePath}`),
          retry: {
            maxAttempts: method === 'GET' ? 3 : 2,
            baseDelayMs: 250,
            maxDelayMs: 1_500,
          },
          circuit: {
            key: `edge-ai-m2m:${endpoint.functionName}:${endpoint.kind}`,
            failureThreshold: method === 'GET' ? 4 : 2,
            openMs: method === 'GET' ? 15_000 : 30_000,
          },
        });

        const payload = await parseResponseBody(response);
        if (
          retryOnAuthFailure
          && response.status === 401
          && isRetryableProtectedAuthFailure(response.status, payload)
        ) {
          clearSupabaseBridgeSession();
          return requestWithWalletAuth<T>(
            walletAddress,
            requestResourcePath,
            promptOnAuthMissing,
            init,
            false,
          );
        }

        if (!response.ok) {
          const error = makeClientError(
            classifyHttpError(response.status),
            readRequestErrorMessage(payload, response.status),
            {
              status: response.status,
              requestPath,
              details: {
                endpointKind: endpoint.kind,
                functionName: endpoint.functionName,
                payload,
              },
            },
          );
          if (shouldRetryViaSharedFallback(error, endpoint)) {
            lastError = error;
            continue;
          }
          return {
            ok: false,
            error,
          };
        }

        if (!payload?.success) {
          const error = makeClientError(
            'http_error',
            payload?.error || payload?.message || 'AI M2M service returned an unexpected response.',
            {
              status: response.status,
              requestPath,
              details: {
                endpointKind: endpoint.kind,
                functionName: endpoint.functionName,
                payload,
              },
            },
          );
          if (shouldRetryViaSharedFallback(error, endpoint)) {
            lastError = error;
            continue;
          }
          return {
            ok: false,
            error,
          };
        }

        return {
          ok: true,
          data: payload as T,
        };
      } catch (error) {
        const clientError = coerceClientError(
          error,
          'network_error',
          'Unable to reach the AI M2M configuration service.',
          requestPath,
        );
        if (shouldRetryViaSharedFallback(clientError, endpoint)) {
          lastError = clientError;
          continue;
        }
        return {
          ok: false,
          error: clientError,
        };
      }
    }

    return {
      ok: false,
      error: lastError || makeClientError(
        'service_not_configured',
        'AI wallet settings are not available in this environment.',
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error: coerceClientError(
        error,
        'network_error',
        'Unable to reach the AI M2M configuration service.',
        requestResourcePath,
      ),
    };
  }
}

export class AIM2MWalletClient {
  static isConfigured(): boolean {
    return Boolean(AI_M2M_ENDPOINTS.length && publicAnonKey);
  }

  static peekConfig(walletAddress: string): AIM2MConfigResponse | null {
    return AI_M2M_CONFIG_CACHE.get(walletAddress.toLowerCase()) || null;
  }

  static async getConfig(walletAddress: string): Promise<AIM2MClientResult<AIM2MConfigResponse>> {
    const result = await requestWithWalletAuth<AIM2MConfigResponse>(
      walletAddress,
      `config/${walletAddress}`,
      false,
    );
    if (result.ok) {
      AI_M2M_CONFIG_CACHE.set(walletAddress.toLowerCase(), result.data);
    }
    return result;
  }

  static async saveConfig(config: Partial<AIM2MWalletConfig> & { walletAddress: string }): Promise<AIM2MClientResult<AIM2MConfigResponse>> {
    const result = await requestWithWalletAuth<AIM2MConfigResponse>(config.walletAddress, 'config', true, {
      method: 'POST',
      body: JSON.stringify(config),
    });
    if (result.ok) {
      AI_M2M_CONFIG_CACHE.set(config.walletAddress.toLowerCase(), result.data);
    }
    return result;
  }

  static async generateDelegate(walletAddress: string): Promise<AIM2MClientResult<AIM2MDelegateResponse>> {
    return requestWithWalletAuth<AIM2MDelegateResponse>(walletAddress, 'delegates/generate', true, {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    });
  }

  static async createDelegateInvite(walletAddress: string): Promise<AIM2MClientResult<AIM2MInviteResponse>> {
    return requestWithWalletAuth<AIM2MInviteResponse>(walletAddress, 'delegates/invite', true, {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    });
  }

  static async acceptDelegateInvite(walletAddress: string, inviteId: string): Promise<AIM2MClientResult<AIM2MDelegateResponse>> {
    return requestWithWalletAuth<AIM2MDelegateResponse>(walletAddress, 'delegates/accept-invite', true, {
      method: 'POST',
      body: JSON.stringify({ inviteId }),
    });
  }
}
