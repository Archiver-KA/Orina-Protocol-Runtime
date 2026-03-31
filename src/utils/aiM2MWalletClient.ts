import type {
  AIM2MClientError,
  AIM2MClientResult,
  AIM2MConfigResponse,
  AIM2MDelegateInvite,
  AIM2MDelegateRecord,
  AIM2MWalletConfig,
} from '@/app/types/ai-m2m-wallet';
import { publicAnonKey } from '/utils/supabase/info';
import { getSupabaseFunctionsBaseUrl } from '/utils/supabase/functions';
import {
  ensureSupabaseBridgeAccessToken,
  isBridgeAuthRequiredError,
  getSupabaseBridgeAccessToken,
  isSupabaseAuthClaimBridgeEnabled,
} from '@/utils/supabaseAuthClaimBridge';

const BASE_URL = getSupabaseFunctionsBaseUrl();
const AI_M2M_CONFIG_CACHE = new Map<string, AIM2MConfigResponse>();

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

  if (!BASE_URL || !publicAnonKey) {
    throw makeClientError(
      'service_not_configured',
      'Supabase function configuration is missing in this environment.',
    );
  }

  const bridgeEnabled = isSupabaseAuthClaimBridgeEnabled();
  if (!bridgeEnabled) {
    const existingToken = getSupabaseBridgeAccessToken();
    if (!existingToken) {
      throw makeClientError(
        'bridge_disabled',
        'Supabase auth bridge is disabled. Set VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true for delegated AI wallet settings.',
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
          'Confirm the wallet security check in Orina, then retry the delegated AI wallet action.',
          { details: error.request },
        );
      }
      throw coerceClientError(
        error,
        'bridge_exchange_failed',
        'Wallet auth bridge exchange failed.',
      );
    }
  }

  const accessToken = getSupabaseBridgeAccessToken();
  if (!accessToken) {
    throw makeClientError(
      'wallet_session_required',
      'Wallet session authentication required. Sign the Orina wallet auth message, then retry the delegated AI wallet setup.',
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
  requestPath: string,
  promptOnAuthMissing: boolean,
  init?: RequestInit,
): Promise<AIM2MClientResult<T>> {
  try {
    const headers = init?.method && init.method !== 'GET'
      ? await getProtectedJsonHeadersWithMode(walletAddress, promptOnAuthMissing)
      : await getProtectedHeaders(walletAddress);

    const response = await fetch(`${BASE_URL}${requestPath}`, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers || {}),
      },
    });

    const payload = await parseResponseBody(response);
    if (!response.ok) {
      const message =
        payload?.error ||
        payload?.message ||
        `AI M2M request failed with HTTP ${response.status}`;

      return {
        ok: false,
        error: makeClientError(classifyHttpError(response.status), message, {
          status: response.status,
          requestPath,
          details: payload,
        }),
      };
    }

    if (!payload?.success) {
      return {
        ok: false,
        error: makeClientError(
          'http_error',
          payload?.error || payload?.message || 'AI M2M service returned an unexpected response.',
          {
            status: response.status,
            requestPath,
            details: payload,
          },
        ),
      };
    }

    return {
      ok: true,
      data: payload as T,
    };
  } catch (error) {
    return {
      ok: false,
      error: coerceClientError(
        error,
        'network_error',
        'Unable to reach the AI M2M configuration service.',
        requestPath,
      ),
    };
  }
}

export class AIM2MWalletClient {
  static isConfigured(): boolean {
    return Boolean(BASE_URL && publicAnonKey);
  }

  static peekConfig(walletAddress: string): AIM2MConfigResponse | null {
    return AI_M2M_CONFIG_CACHE.get(walletAddress.toLowerCase()) || null;
  }

  static async getConfig(walletAddress: string): Promise<AIM2MClientResult<AIM2MConfigResponse>> {
    const result = await requestWithWalletAuth<AIM2MConfigResponse>(
      walletAddress,
      `/ai/m2m/config/${walletAddress}`,
      false,
    );
    if (result.ok) {
      AI_M2M_CONFIG_CACHE.set(walletAddress.toLowerCase(), result.data);
    }
    return result;
  }

  static async saveConfig(config: Partial<AIM2MWalletConfig> & { walletAddress: string }): Promise<AIM2MClientResult<AIM2MConfigResponse>> {
    const result = await requestWithWalletAuth<AIM2MConfigResponse>(config.walletAddress, '/ai/m2m/config', true, {
      method: 'POST',
      body: JSON.stringify(config),
    });
    if (result.ok) {
      AI_M2M_CONFIG_CACHE.set(config.walletAddress.toLowerCase(), result.data);
    }
    return result;
  }

  static async generateDelegate(walletAddress: string): Promise<AIM2MClientResult<AIM2MDelegateResponse>> {
    return requestWithWalletAuth<AIM2MDelegateResponse>(walletAddress, '/ai/m2m/delegates/generate', true, {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    });
  }

  static async createDelegateInvite(walletAddress: string): Promise<AIM2MClientResult<AIM2MInviteResponse>> {
    return requestWithWalletAuth<AIM2MInviteResponse>(walletAddress, '/ai/m2m/delegates/invite', true, {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    });
  }

  static async acceptDelegateInvite(walletAddress: string, inviteId: string): Promise<AIM2MClientResult<AIM2MDelegateResponse>> {
    return requestWithWalletAuth<AIM2MDelegateResponse>(walletAddress, '/ai/m2m/delegates/accept-invite', true, {
      method: 'POST',
      body: JSON.stringify({ inviteId }),
    });
  }
}
