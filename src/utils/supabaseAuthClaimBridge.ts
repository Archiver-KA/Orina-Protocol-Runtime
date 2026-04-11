/**
 * Bridge tokens and metadata are stored in localStorage (see STORAGE_KEY). Treat as sensitive to
 * same-origin XSS like the wallet session; do not add VITE_* or client-side secrets for signing JWTs.
 */
import { supabaseUrl, publicAnonKey } from '/utils/supabase/info';
import { clearWalletAuthSession, getWalletAuthSession, hasCompatibleWalletAuthMessage } from '@/utils/walletAuthSession';
import { normalizeAddress } from '@/utils/storageScope';
import type { SecurityCheckRequestData } from '@/types/wallet';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const DEFAULT_AUTH_BRIDGE_FN_NAME = 'orina-auth-bridge-v1';
const LEGACY_AUTH_BRIDGE_PATH_PREFIX = '/auth/supabase-claim-bridge';

function readEnvString(name: string): string | null {
  const value = env[name];
  return typeof value === 'string' ? value.trim() : null;
}

const BRIDGE_ENABLED =
  (env.VITE_SUPABASE_AUTH_BRIDGE_ENABLED || '').toLowerCase() === 'true';
const BRIDGE_FN_NAME =
  readEnvString('VITE_SUPABASE_AUTH_BRIDGE_FN_NAME') || DEFAULT_AUTH_BRIDGE_FN_NAME;
const BRIDGE_PATH_PREFIX =
  readEnvString('VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX')
  ?? (BRIDGE_FN_NAME === DEFAULT_AUTH_BRIDGE_FN_NAME ? '' : LEGACY_AUTH_BRIDGE_PATH_PREFIX);

const STORAGE_KEY = 'orina_supabase_auth_claim_bridge_session';
const SESSION_EVENT = 'orina:supabase-auth-claim-bridge';
export const BRIDGE_SECURITY_CHECK_EVENT = 'orina:bridge-security-check-request';
let lastExchangeFailureAt = 0;
let lastExchangeFailureMessage = '';
const EXCHANGE_FAILURE_COOLDOWN_MS = 30_000;

export interface SupabaseAuthClaimBridgeSession {
  accessToken: string;
  tokenType: 'Bearer';
  issuedAt: number;
  expiresAt: number;
  walletAddress: string;
  profileId?: string | null;
  claimVersion?: string;
  source?: string;
}

interface ExchangeResponse {
  accessToken: string;
  expiresAt: string | number;
  walletAddress: string;
  profileId?: string | null;
  claimVersion?: string;
}

interface AssetMetadataSeedBridgeItem {
  assetUid: string;
  title: string;
  slug: string;
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
  media?: Array<{
    mediaType: 'image' | 'video' | 'document';
    url: string;
    sortOrder?: number;
    metadata?: Record<string, unknown>;
  }>;
  tags?: string[];
}

interface AssetMetadataSeedBridgeResponse {
  ok: boolean;
  rows?: Array<{ assetUid: string; assetId: string }>;
}

interface ProtocolOrderSeedBridgeItem {
  orderUid: string;
  chainId: number;
  marketplaceContract: string;
  assetContract?: string | null;
  assetTokenId?: string | null;
  buyerAddress: string;
  sellerAddress: string;
  status: string;
  amount?: string | number | null;
  pricePerUnit?: string | number | null;
  totalValue?: string | number | null;
  currencySymbol?: string | null;
  metadata?: Record<string, unknown>;
}

interface ProtocolOrderSeedBridgeResponse {
  ok: boolean;
  rows?: Array<{ orderUid: string; id: string }>;
}

export interface BridgeWalletSessionSummary {
  id: string;
  walletAddress: string;
  createdAt: string;
  lastSeenAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  deviceLabel: string | null;
  status: 'active' | 'expired' | 'revoked';
  isCurrent: boolean;
}

interface BridgeWalletSessionsResponse {
  ok: boolean;
  currentSessionId?: string | null;
  sessions?: Array<{
    id?: string;
    walletAddress?: string;
    createdAt?: string;
    lastSeenAt?: string | null;
    expiresAt?: string;
    revokedAt?: string | null;
    deviceLabel?: string | null;
    status?: 'active' | 'expired' | 'revoked';
    isCurrent?: boolean;
  }>;
}

interface BridgeLogoutResponse {
  ok: boolean;
  status?: string;
  revokedCount?: number;
  currentSessionId?: string | null;
  revokedAt?: string;
}

type BridgeWalletAuthLikeSession = {
  address: string;
  signedAt: number;
  signature: string;
  message?: string;
};

export interface BridgeSecurityCheckRequest extends SecurityCheckRequestData {
  walletAddress?: string | null;
}

interface BridgeSecurityCheckEventDetail {
  request: BridgeSecurityCheckRequest;
}

interface EnsureBridgeAccessTokenOptions {
  walletAddress?: string | null;
  promptOnAuthMissing?: boolean;
  securityCheck?: Partial<BridgeSecurityCheckRequest>;
}

export class BridgeAuthRequiredError extends Error {
  code = 'wallet_security_check_required' as const;
  request: BridgeSecurityCheckRequest;

  constructor(request: BridgeSecurityCheckRequest, message?: string) {
    super(message || 'Wallet security check required');
    this.name = 'BridgeAuthRequiredError';
    this.request = request;
  }
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof fetch === 'function';
}

function getBridgeBaseUrl(): string {
  if (!supabaseUrl || !BRIDGE_FN_NAME) return '';
  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/${BRIDGE_FN_NAME}${BRIDGE_PATH_PREFIX}`;
}

function bridgeHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function bridgeAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const bearer = getSupabaseBridgeAccessToken();
  if (!bearer) {
    throw new Error('Missing Supabase bridge access token');
  }
  return {
    Authorization: `Bearer ${bearer}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function parseExpiry(input: string | number): number {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  const parsed = Date.parse(input);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readStoredSession(): SupabaseAuthClaimBridgeSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SupabaseAuthClaimBridgeSession;
    if (!parsed?.accessToken || !parsed?.walletAddress) return null;
    return {
      ...parsed,
      walletAddress: normalizeAddress(parsed.walletAddress),
      issuedAt: Number(parsed.issuedAt) || 0,
      expiresAt: Number(parsed.expiresAt) || 0,
      tokenType: 'Bearer',
    };
  } catch {
    return null;
  }
}

function writeStoredSession(session: SupabaseAuthClaimBridgeSession | null): void {
  if (!isBrowser()) return;
  try {
    if (!session) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
    window.dispatchEvent(new Event(SESSION_EVENT));
  } catch {
    // ignore storage failures
  }
}

function isExpired(session: SupabaseAuthClaimBridgeSession, skewMs = 15_000): boolean {
  if (!session.expiresAt) return true;
  return session.expiresAt <= Date.now() + skewMs;
}

function isBridgeReauthRequiredMessage(message?: string | null): boolean {
  const normalized = String(message || '').toLowerCase();
  return (
    normalized.includes('locked after inactivity') ||
    normalized.includes('requires a fresh wallet signature') ||
    normalized.includes('sign the orina wallet auth message again')
  );
}

function isWalletSessionAligned(session: SupabaseAuthClaimBridgeSession): boolean {
  const walletSession = getWalletAuthSession();
  if (!walletSession) return false;
  return normalizeAddress(walletSession.address) === normalizeAddress(session.walletAddress);
}

function normalizeBridgeSecurityCheckRequest(
  request?: Partial<BridgeSecurityCheckRequest>,
  walletAddress?: string | null,
): BridgeSecurityCheckRequest {
  return {
    title: request?.title || 'Security Check Required',
    description:
      request?.description ||
      'Confirm a one-time wallet signature to unlock this protected feature in Orina.',
    surfaceLabel: request?.surfaceLabel || 'Protected feature',
    confirmLabel: request?.confirmLabel || 'Continue to MetaMask',
    helpText:
      request?.helpText ||
      'This signature only verifies your wallet session in Orina. No gas fee, transaction, or token approval is involved.',
    successMessage: request?.successMessage || 'Security check complete.',
    successDescription: request?.successDescription,
    walletAddress: request?.walletAddress || walletAddress || null,
  };
}

export function isBridgeAuthRequiredError(error: unknown): error is BridgeAuthRequiredError {
  return error instanceof BridgeAuthRequiredError;
}

export function dispatchBridgeSecurityCheckRequest(
  request?: Partial<BridgeSecurityCheckRequest>,
  walletAddress?: string | null,
): BridgeSecurityCheckRequest {
  const normalizedRequest = normalizeBridgeSecurityCheckRequest(request, walletAddress);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<BridgeSecurityCheckEventDetail>(BRIDGE_SECURITY_CHECK_EVENT, {
        detail: { request: normalizedRequest },
      }),
    );
  }
  return normalizedRequest;
}

export function isSupabaseAuthClaimBridgeEnabled(): boolean {
  return BRIDGE_ENABLED && isBrowser() && !!supabaseUrl && !!publicAnonKey && !!BRIDGE_FN_NAME;
}

export function clearSupabaseBridgeSession(): void {
  writeStoredSession(null);
}

export function getSupabaseBridgeSession(): SupabaseAuthClaimBridgeSession | null {
  const session = readStoredSession();
  if (!session) return null;
  if (!isWalletSessionAligned(session) || isExpired(session)) {
    clearSupabaseBridgeSession();
    return null;
  }
  return session;
}

export function getSupabaseBridgeAccessToken(): string | null {
  return getSupabaseBridgeSession()?.accessToken ?? null;
}

export async function ensureSupabaseBridgeAccessToken(
  options: EnsureBridgeAccessTokenOptions = {},
): Promise<string | null> {
  if (!isSupabaseAuthClaimBridgeEnabled()) {
    return null;
  }

  const requestedWallet = options.walletAddress ? normalizeAddress(options.walletAddress) : '';
  const existingToken = getSupabaseBridgeAccessToken();
  if (existingToken) {
    return existingToken;
  }

  const walletSession: BridgeWalletAuthLikeSession | null = getWalletAuthSession();
  const sessionWallet = walletSession?.address ? normalizeAddress(walletSession.address) : '';
  const targetWallet = requestedWallet || sessionWallet || null;
  const hasWalletSessionMessage = hasCompatibleWalletAuthMessage(
    walletSession?.message,
    targetWallet,
  );
  const isWalletAligned =
    !!targetWallet &&
    !!sessionWallet &&
    normalizeAddress(targetWallet) === normalizeAddress(sessionWallet);

  if (!hasWalletSessionMessage || !isWalletAligned) {
    if (options.promptOnAuthMissing && targetWallet) {
      const request = dispatchBridgeSecurityCheckRequest(options.securityCheck, targetWallet);
      throw new BridgeAuthRequiredError(request);
    }
    return null;
  }

  let session: SupabaseAuthClaimBridgeSession | null = null;
  try {
    session = await exchangeWalletAuthForSupabaseClaimSession(targetWallet);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to establish a secure Orina session.';
    if (isBridgeReauthRequiredMessage(message)) {
      clearSupabaseBridgeSession();
      clearWalletAuthSession();
      if (options.promptOnAuthMissing && targetWallet) {
        const request = dispatchBridgeSecurityCheckRequest(options.securityCheck, targetWallet);
        throw new BridgeAuthRequiredError(request, message);
      }
      return null;
    }
    throw error;
  }
  const accessToken = session?.accessToken || getSupabaseBridgeAccessToken();
  if (accessToken) {
    return accessToken;
  }

  if (hasWalletSessionMessage && isWalletAligned) {
    throw new Error('Unable to establish a secure Orina session. Please retry in a moment.');
  }

  return null;
}

export async function exchangeWalletAuthForSupabaseClaimSession(
  walletAddress?: string | null
): Promise<SupabaseAuthClaimBridgeSession | null> {
  if (!isSupabaseAuthClaimBridgeEnabled()) return null;

  const requestedWallet = walletAddress ? normalizeAddress(walletAddress) : '';
  const walletSession: BridgeWalletAuthLikeSession | null = getWalletAuthSession();
  if (!walletSession) return null;
  if (!walletSession.message) return null;

  const normalizedWallet = normalizeAddress(walletAddress || walletSession.address);
  if (!normalizedWallet || normalizedWallet !== normalizeAddress(walletSession.address)) {
    clearSupabaseBridgeSession();
    return null;
  }

  const existing = getSupabaseBridgeSession();
  if (existing && existing.walletAddress === normalizedWallet) {
    return existing;
  }

  if (lastExchangeFailureAt && Date.now() - lastExchangeFailureAt < EXCHANGE_FAILURE_COOLDOWN_MS) {
    throw new Error(lastExchangeFailureMessage || 'Bridge exchange temporarily unavailable. Please retry in a moment.');
  }

  let res: Response;
  try {
    res = await fetch(`${getBridgeBaseUrl()}/exchange`, {
      method: 'POST',
      headers: bridgeHeaders(),
      body: JSON.stringify({
        walletAddress: normalizedWallet,
        walletAuthSession: {
          address: walletSession.address,
          signedAt: walletSession.signedAt,
          signature: walletSession.signature,
          message: walletSession.message || undefined,
        },
        client: {
          app: 'ATP2',
          phase: 'H1-scaffold',
          requestedAt: new Date().toISOString(),
        },
      }),
    });
  } catch (error) {
    lastExchangeFailureAt = Date.now();
    lastExchangeFailureMessage =
      error instanceof Error ? error.message : 'Bridge exchange network error';
    throw error instanceof Error
      ? error
      : new Error('Bridge exchange network error');
  }

  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!res.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      `Bridge exchange failed (${res.status})`;
    if (res.status >= 500 || res.status === 429) {
      lastExchangeFailureAt = Date.now();
      lastExchangeFailureMessage = message;
    } else {
      lastExchangeFailureAt = 0;
      lastExchangeFailureMessage = '';
    }
    throw new Error(message);
  }

  const data = payload as ExchangeResponse;
  const expiresAt = parseExpiry(data.expiresAt);
  if (!data.accessToken || !expiresAt) {
    throw new Error('Bridge exchange returned an invalid session payload');
  }

  const session: SupabaseAuthClaimBridgeSession = {
    accessToken: data.accessToken,
    tokenType: 'Bearer',
    issuedAt: Date.now(),
    expiresAt,
    walletAddress: normalizeAddress(data.walletAddress || normalizedWallet),
    profileId: data.profileId || null,
    claimVersion: data.claimVersion || 'h1-scaffold',
    source: 'wallet-auth-claim-bridge',
  };

  lastExchangeFailureAt = 0;
  lastExchangeFailureMessage = '';
  writeStoredSession(session);
  return session;
}

export function getSupabaseBridgeSessionEventName(): string {
  return SESSION_EVENT;
}

export async function listSupabaseBridgeWalletSessions(
  options: EnsureBridgeAccessTokenOptions = {},
): Promise<BridgeWalletSessionSummary[] | null> {
  if (!isSupabaseAuthClaimBridgeEnabled()) {
    return null;
  }

  const accessToken = await ensureSupabaseBridgeAccessToken({
    ...options,
    promptOnAuthMissing: false,
  });
  if (!accessToken) {
    return null;
  }

  const res = await fetch(`${getBridgeBaseUrl()}/sessions`, {
    method: 'GET',
    headers: bridgeAuthHeaders(),
  });

  const text = await res.text().catch(() => '');
  let payload: BridgeWalletSessionsResponse | { error?: string; message?: string } | null = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { error: text || 'Unable to read session history response' };
  }

  if (!res.ok) {
    throw new Error(
      payload && typeof payload === 'object'
        ? String((payload as { error?: string; message?: string }).error || (payload as { error?: string; message?: string }).message || `Failed to load recent sessions (${res.status})`)
        : `Failed to load recent sessions (${res.status})`,
    );
  }

  const sessions = Array.isArray((payload as BridgeWalletSessionsResponse | null)?.sessions)
    ? (payload as BridgeWalletSessionsResponse).sessions || []
    : [];

  return sessions
    .filter((session): session is NonNullable<BridgeWalletSessionsResponse['sessions']>[number] => {
      return Boolean(session?.id && session.walletAddress && session.createdAt && session.expiresAt);
    })
    .map((session) => ({
      id: String(session.id),
      walletAddress: normalizeAddress(String(session.walletAddress)),
      createdAt: String(session.createdAt),
      lastSeenAt: session.lastSeenAt ? String(session.lastSeenAt) : null,
      expiresAt: String(session.expiresAt),
      revokedAt: session.revokedAt ? String(session.revokedAt) : null,
      deviceLabel: session.deviceLabel ? String(session.deviceLabel) : null,
      status:
        session.status === 'expired' || session.status === 'revoked'
          ? session.status
          : 'active',
      isCurrent: Boolean(session.isCurrent),
    }));
}

export async function revokeAllSupabaseBridgeWalletSessions(
  options: EnsureBridgeAccessTokenOptions = {},
): Promise<{ revokedCount: number; revokedAt?: string }> {
  if (!isSupabaseAuthClaimBridgeEnabled()) {
    return { revokedCount: 0 };
  }

  const accessToken = await ensureSupabaseBridgeAccessToken({
    ...options,
    promptOnAuthMissing: false,
  });
  if (!accessToken) {
    throw new Error('A secure Orina session is required before revoking sessions.');
  }

  const res = await fetch(`${getBridgeBaseUrl()}/logout`, {
    method: 'POST',
    headers: bridgeAuthHeaders(),
  });

  const text = await res.text().catch(() => '');
  let payload: BridgeLogoutResponse | { error?: string; message?: string } | null = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { error: text || 'Unable to read logout response' };
  }

  if (!res.ok) {
    throw new Error(
      payload && typeof payload === 'object'
        ? String((payload as { error?: string; message?: string }).error || (payload as { error?: string; message?: string }).message || `Failed to revoke sessions (${res.status})`)
        : `Failed to revoke sessions (${res.status})`,
    );
  }

  clearSupabaseBridgeSession();

  return {
    revokedCount: Math.max(0, Number((payload as BridgeLogoutResponse | null)?.revokedCount || 0)),
    revokedAt: (payload as BridgeLogoutResponse | null)?.revokedAt,
  };
}

export async function sendCommunityNotificationViaBridge(params: {
  targetWalletAddress: string;
  title: string;
  message: string;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
  actorWalletAddress?: string | null;
  actorName?: string | null;
}): Promise<boolean> {
  if (!isBrowser() || !supabaseUrl || !publicAnonKey || !getBridgeBaseUrl()) return false;

  try {
    if (isSupabaseAuthClaimBridgeEnabled() && !getSupabaseBridgeAccessToken() && params.actorWalletAddress) {
      await ensureSupabaseBridgeAccessToken({
        walletAddress: params.actorWalletAddress,
        promptOnAuthMissing: false,
      });
    }
  } catch (error) {
    console.debug('[H1 Bridge] Community notify token exchange skipped:', error);
  }

  if (isSupabaseAuthClaimBridgeEnabled() && !getSupabaseBridgeAccessToken()) {
    return false;
  }

  try {
    const res = await fetch(`${getBridgeBaseUrl()}/community-notify`, {
      method: 'POST',
      headers: bridgeAuthHeaders(),
      body: JSON.stringify({
        targetWalletAddress: normalizeAddress(params.targetWalletAddress),
        title: params.title,
        message: params.message,
        sourceId: params.sourceId || null,
        metadata: params.metadata || {},
        actorWalletAddress: params.actorWalletAddress ? normalizeAddress(params.actorWalletAddress) : null,
        actorName: params.actorName || null,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.debug('[H1 Bridge] community-notify failed:', res.status, text);
      return false;
    }
    return true;
  } catch (error) {
    console.debug('[H1 Bridge] community-notify network error:', error);
    return false;
  }
}

export async function sendAssetMetadataSeedViaBridge(
  assetItems: AssetMetadataSeedBridgeItem[],
  walletAddress?: string | null
): Promise<AssetMetadataSeedBridgeResponse | null> {
  if (!isBrowser() || !supabaseUrl || !publicAnonKey || !getBridgeBaseUrl()) return null;
  if (!assetItems?.length) return { ok: true, rows: [] };

  try {
    if (isSupabaseAuthClaimBridgeEnabled() && !getSupabaseBridgeAccessToken()) {
      if (!walletAddress) return null;
      await ensureSupabaseBridgeAccessToken({
        walletAddress,
        promptOnAuthMissing: false,
      });
    }
  } catch (error) {
    console.debug('[H1 Bridge] asset-metadata-seed token exchange skipped:', error);
    return null;
  }

  if (isSupabaseAuthClaimBridgeEnabled() && !getSupabaseBridgeAccessToken()) {
    return null;
  }

  try {
    const res = await fetch(`${getBridgeBaseUrl()}/asset-metadata-seed`, {
      method: 'POST',
      headers: bridgeAuthHeaders(),
      body: JSON.stringify({
        assetItems,
        client: {
          app: 'ATP2',
          phase: 'C2.3',
          requestedAt: new Date().toISOString(),
        },
      }),
    });

    const text = await res.text().catch(() => '');
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }

    if (!res.ok) {
      console.debug('[H1 Bridge] asset-metadata-seed failed:', res.status, payload);
      return null;
    }

    return (payload || { ok: false }) as AssetMetadataSeedBridgeResponse;
  } catch (error) {
    console.debug('[H1 Bridge] asset-metadata-seed network error:', error);
    return null;
  }
}

export async function sendProtocolOrderSeedViaBridge(
  orderItems: ProtocolOrderSeedBridgeItem[],
  walletAddress?: string | null,
): Promise<ProtocolOrderSeedBridgeResponse | null> {
  if (!isBrowser() || !supabaseUrl || !publicAnonKey || !getBridgeBaseUrl()) return null;
  if (!orderItems?.length) return { ok: true, rows: [] };

  try {
    if (isSupabaseAuthClaimBridgeEnabled() && !getSupabaseBridgeAccessToken()) {
      if (!walletAddress) return null;
      await ensureSupabaseBridgeAccessToken({
        walletAddress,
        promptOnAuthMissing: false,
      });
    }
  } catch (error) {
    console.debug('[H1 Bridge] protocol-order-seed token exchange skipped:', error);
    return null;
  }

  if (isSupabaseAuthClaimBridgeEnabled() && !getSupabaseBridgeAccessToken()) {
    return null;
  }

  try {
    const res = await fetch(`${getBridgeBaseUrl()}/protocol-order-seed`, {
      method: 'POST',
      headers: bridgeAuthHeaders(),
      body: JSON.stringify({
        orderItems,
        client: {
          app: 'ATP2',
          phase: 'C2.4',
          requestedAt: new Date().toISOString(),
        },
      }),
    });

    const text = await res.text().catch(() => '');
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }

    if (!res.ok) {
      console.debug('[H1 Bridge] protocol-order-seed failed:', res.status, payload);
      return null;
    }

    return (payload || { ok: false }) as ProtocolOrderSeedBridgeResponse;
  } catch (error) {
    console.debug('[H1 Bridge] protocol-order-seed network error:', error);
    return null;
  }
}
