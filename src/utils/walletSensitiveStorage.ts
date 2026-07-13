import { normalizeAddress } from '@/utils/storageScope';

const WALLET_SCOPED_PREFIXES = [
  'orina_delivery_addresses_',
  'orina_user_settings_',
  'orina_notifications_',
  'user_profile_',
];

const GLOBAL_SENSITIVE_PREFIXES = [
  'orina_runtime_orders_v2:',
  'orina_runtime_orders_v1:',
];

function purgeStorage(storage: Storage | undefined, walletAddress: string): void {
  if (!storage) return;
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key) keys.push(key);
  }

  for (const key of keys) {
    const normalizedKey = key.toLowerCase();
    const isGlobalSensitive = GLOBAL_SENSITIVE_PREFIXES.some((prefix) => normalizedKey.startsWith(prefix));
    const isWalletScoped = WALLET_SCOPED_PREFIXES.some((prefix) => normalizedKey.startsWith(prefix))
      && normalizedKey.includes(walletAddress);
    if (isGlobalSensitive || isWalletScoped) storage.removeItem(key);
  }
}

export function purgeWalletScopedSensitiveStorage(walletAddress?: string | null): void {
  if (typeof window === 'undefined') return;
  const normalizedWallet = normalizeAddress(walletAddress || '');
  purgeStorage(window.sessionStorage, normalizedWallet);
  purgeStorage(window.localStorage, normalizedWallet);
}
