/**
 * Bridge tokens and metadata are stored in localStorage (see STORAGE_KEY). Treat as sensitive to
 * same-origin XSS like the wallet session; do not add VITE_* or client-side secrets for signing JWTs.
 */
import { supabaseUrl, publicAnonKey } from '/utils/supabase/info';
import { getWalletAuthSession } from '@/utils/walletAuthSession';
import { normalizeAddress } from '@/utils/storageScope';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

const BRIDGE_ENABLED =
  (env.VITE_SUPABASE_AUTH_BRIDGE_ENABLED || '').toLowerCase() === 'true';
const BRIDGE_FN_NAME = env.VITE_SUPABASE_AUTH_BRIDGE_FN_NAME || 'make-server-b0d68fc8';
const BRIDGE_PATH_PREFIX =
  env.VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX || '/auth/supabase-claim-bridge';

const STORAGE_KEY = 'orina_supabase_auth_claim_bridge_session';
const SESSION_EVENT = 'orina:supabase-auth-claim-bridge';
let lastExchangeFailureAt = 0;
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

type BridgeWalletAuthLikeSession = {
  address: string;
  signedAt: number;
  signature: string;
  message?: string;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof fetch === 'function';
}

function getBridgeBaseUrl(): string {
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

function isWalletSessionAligned(session: SupabaseAuthClaimBridgeSession): boolean {
  const walletSession = getWalletAuthSession();
  if (!walletSession) return false;
  return normalizeAddress(walletSession.address) === normalizeAddress(session.walletAddress);
}

export function isSupabaseAuthClaimBridgeEnabled(): boolean {
  return BRIDGE_ENABLED && isBrowser() && !!supabaseUrl && !!publicAnonKey;
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
    return null;
  }

  const res = await fetch(`${getBridgeBaseUrl()}/exchange`, {
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

  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!res.ok) {
    lastExchangeFailureAt = Date.now();
    const message =
      payload?.error ||
      payload?.message ||
      `Bridge exchange failed (${res.status})`;
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
  writeStoredSession(session);
  return session;
}

export function getSupabaseBridgeSessionEventName(): string {
  return SESSION_EVENT;
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
  if (!isBrowser() || !supabaseUrl || !publicAnonKey) return false;

  try {
    if (isSupabaseAuthClaimBridgeEnabled() && !getSupabaseBridgeAccessToken() && params.actorWalletAddress) {
      await exchangeWalletAuthForSupabaseClaimSession(params.actorWalletAddress);
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
  if (!isBrowser() || !supabaseUrl || !publicAnonKey) return null;
  if (!assetItems?.length) return { ok: true, rows: [] };

  try {
    if (isSupabaseAuthClaimBridgeEnabled() && !getSupabaseBridgeAccessToken()) {
      if (!walletAddress) return null;
      await exchangeWalletAuthForSupabaseClaimSession(walletAddress);
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
