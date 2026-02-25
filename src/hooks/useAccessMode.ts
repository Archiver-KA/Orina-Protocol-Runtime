import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useGuestMode } from '@/hooks/useGuestMode';
import { hasWalletAuthSession } from '@/utils/walletAuthSession';
import { AccessMode, canAccessPage, canUseCapability, isGuestAccessMode, resolveAccessiblePage, type AccessCapability } from '@/app/access/access-policy';

export function useAccessMode() {
  const { address } = useAccount();
  const { forceGuestMode } = useGuestMode();
  const [authSessionTick, setAuthSessionTick] = useState(0);

  useEffect(() => {
    const sync = () => setAuthSessionTick((v) => v + 1);
    window.addEventListener('orina:wallet-auth-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('orina:wallet-auth-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const mode: AccessMode = useMemo(() => {
    if (forceGuestMode) return 'guest_forced';
    if (address && hasWalletAuthSession(address)) return 'user_connected';
    if (address) return 'auth_pending';
    return 'guest_disconnected';
  }, [forceGuestMode, address, authSessionTick]);

  // `auth_pending` is permission-connected (wallet connected) and should unlock UI/social surfaces.
  // Only true guest modes should collapse UI into guest-only experience.
  const isGuest = isGuestAccessMode(mode);
  const effectiveConnectedAddress = isGuest ? undefined : address;
  const isAuthPending = mode === 'auth_pending';

  return {
    mode,
    isGuest,
    isAuthPending,
    effectiveConnectedAddress,
    canAccessPage: (page: string) => canAccessPage(mode, page),
    resolvePageForMode: (page: string) => resolveAccessiblePage(mode, page),
    canUseCapability: (capability: AccessCapability) => canUseCapability(mode, capability),
  };
}
