/**
 * The short-lived EIP-191 proof is kept in tab-scoped sessionStorage. The backend consumes the
 * server-issued nonce once, so a copied proof cannot mint another bridge session.
 */
import { normalizeAddress } from '@/utils/storageScope';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const WALLET_AUTH_SESSION_KEY = 'orina_wallet_auth_session';
// Keep the browser proof window aligned with the claim-bridge max age so protected surfaces do
// not force a new signature much earlier than the backend session model.
const DEFAULT_WALLET_AUTH_SESSION_TTL_MS = 5 * 60 * 1000;

interface WalletAuthSession {
  address: string;
  signedAt: number;
  signature: string;
  message?: string;
}

function getWalletAuthSessionTtlMs() {
  const configuredValue = Number(env.VITE_WALLET_AUTH_SESSION_TTL_MS || '');
  if (Number.isFinite(configuredValue) && configuredValue > 0) {
    return Math.floor(configuredValue);
  }
  return DEFAULT_WALLET_AUTH_SESSION_TTL_MS;
}

function isWalletAuthSessionExpired(session: WalletAuthSession) {
  const signedAt = Number(session.signedAt) || 0;
  if (signedAt <= 0) return true;
  return signedAt + getWalletAuthSessionTtlMs() <= Date.now();
}

function normalizeWalletAuthMessage(message?: string): string {
  return typeof message === 'string' ? message.replace(/\r\n/g, '\n').trim() : '';
}

export function hasCompatibleWalletAuthMessage(
  message?: string,
  address?: string | null,
): boolean {
  const normalizedMessage = normalizeWalletAuthMessage(message);
  if (!normalizedMessage.startsWith('Orina Wallet Session Authentication\n')) {
    return false;
  }

  if (
    !/^Domain:\s+[^\s]+$/m.test(normalizedMessage)
    || !/^URI:\s+https?:\/\/[^\s]+$/m.test(normalizedMessage)
    || !/^Chain ID:\s+\d+$/m.test(normalizedMessage)
    || !/^Nonce:\s+[a-f0-9]{64}$/m.test(normalizedMessage)
    || !/^Issued At:\s+.+$/m.test(normalizedMessage)
    || !/^Expiration Time:\s+.+$/m.test(normalizedMessage)
  ) {
    return false;
  }

  if (address) {
    return normalizedMessage.includes(`Address: ${normalizeAddress(address)}`);
  }

  return true;
}

export function getWalletAuthSession(): WalletAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    // Never migrate a legacy persistent proof: remove it and require a fresh challenge.
    window.localStorage?.removeItem(WALLET_AUTH_SESSION_KEY);
    const raw = window.sessionStorage.getItem(WALLET_AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WalletAuthSession;
    if (!parsed?.address || !parsed?.signature) return null;
    const session = {
      address: normalizeAddress(parsed.address),
      signedAt: Number(parsed.signedAt) || Date.now(),
      signature: String(parsed.signature),
      message: typeof parsed.message === 'string' ? parsed.message : undefined,
    };

    if (!hasCompatibleWalletAuthMessage(session.message, session.address) || isWalletAuthSessionExpired(session)) {
      clearWalletAuthSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function hasWalletAuthSession(address?: string | null): boolean {
  if (!address) return false;
  const session = getWalletAuthSession();
  if (!session) return false;
  if (!hasCompatibleWalletAuthMessage(session.message, address)) return false;
  return session.address === normalizeAddress(address);
}

export function setWalletAuthSession(
  address: string,
  signature: string,
  opts?: { message?: string; signedAt?: number }
) {
  if (typeof window === 'undefined') return;
  const signedAt =
    typeof opts?.signedAt === 'number' && Number.isFinite(opts.signedAt) && opts.signedAt > 0
      ? Math.floor(opts.signedAt)
      : Date.now();
  const payload: WalletAuthSession = {
    address: normalizeAddress(address),
    signedAt,
    signature,
    message: opts?.message,
  };
  window.localStorage?.removeItem(WALLET_AUTH_SESSION_KEY);
  window.sessionStorage.setItem(WALLET_AUTH_SESSION_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event('orina:wallet-auth-change'));
}

export function clearWalletAuthSession() {
  if (typeof window === 'undefined') return;
  window.localStorage?.removeItem(WALLET_AUTH_SESSION_KEY);
  window.sessionStorage.removeItem(WALLET_AUTH_SESSION_KEY);
  window.dispatchEvent(new Event('orina:wallet-auth-change'));
}
