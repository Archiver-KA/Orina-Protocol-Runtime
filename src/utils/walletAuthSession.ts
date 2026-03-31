/**
 * Wallet auth session (EIP-191) is stored in localStorage. Same-origin XSS can read it and replay
 * within the signed message TTL. Mitigate with strict CSP, dependency review, and avoiding
 * unsanitized HTML injection; prefer httpOnly cookies only if you move auth off pure SPA storage.
 */
import { normalizeAddress } from '@/utils/storageScope';

const WALLET_AUTH_SESSION_KEY = 'orina_wallet_auth_session';

interface WalletAuthSession {
  address: string;
  signedAt: number;
  signature: string;
  message?: string;
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

  if (!/^Time:\s+.+$/m.test(normalizedMessage)) {
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
    const raw = localStorage.getItem(WALLET_AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WalletAuthSession;
    if (!parsed?.address || !parsed?.signature) return null;
    return {
      address: normalizeAddress(parsed.address),
      signedAt: Number(parsed.signedAt) || Date.now(),
      signature: String(parsed.signature),
      message: typeof parsed.message === 'string' ? parsed.message : undefined,
    };
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
  localStorage.setItem(WALLET_AUTH_SESSION_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event('orina:wallet-auth-change'));
}

export function clearWalletAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WALLET_AUTH_SESSION_KEY);
  window.dispatchEvent(new Event('orina:wallet-auth-change'));
}

export function buildWalletAuthMessage(address: string, signedAt: number = Date.now()) {
  const ts = new Date(signedAt).toISOString();
  return [
    'Orina Wallet Session Authentication',
    '',
    'Sign this message to authenticate your session in Orina.',
    'No blockchain transaction or gas fee is required.',
    '',
    `Address: ${normalizeAddress(address)}`,
    `Time: ${ts}`,
  ].join('\n');
}
