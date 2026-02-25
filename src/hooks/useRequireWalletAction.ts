import { useCallback } from 'react';
import { toast } from 'sonner';
import { useAccount, useSignMessage } from 'wagmi';
import { useAccessGuard } from '@/hooks/useAccessGuard';
import { isProtocolCapability, type AccessCapability } from '@/app/access/access-policy';
import { buildWalletAuthMessage, setWalletAuthSession } from '@/utils/walletAuthSession';
import { clearGuestModeForced } from '@/utils/guestMode';

interface RequireWalletActionOptions {
  capability: AccessCapability;
  actionLabel: string;
  fallbackPage?: string;
}

export function useRequireWalletAction(setActivePage?: (page: string) => void) {
  const accessGuard = useAccessGuard(setActivePage);
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const requireWalletAction = useCallback((options: RequireWalletActionOptions): boolean => {
    const { capability, actionLabel, fallbackPage = 'home' } = options;
    if (accessGuard.canUseCapability(capability)) return true;
    toast.error(`Connect your wallet to ${actionLabel}`);
    accessGuard.denyToGuest(fallbackPage);
    return false;
  }, [accessGuard]);

  const requireWalletActionAsync = useCallback(async (options: RequireWalletActionOptions): Promise<boolean> => {
    const { capability, actionLabel, fallbackPage = 'home' } = options;
    if (accessGuard.canUseCapability(capability)) return true;

    // Deferred auth: wallet permission-connected users (auth_pending) can access social/profile,
    // but protocol actions require a one-time signature on demand.
    if (accessGuard.mode === 'auth_pending' && isProtocolCapability(capability)) {
      if (!address) {
        toast.error(`Connect your wallet to ${actionLabel}`);
        accessGuard.denyToGuest(fallbackPage);
        return false;
      }

      try {
        const signature = await signMessageAsync({ message: buildWalletAuthMessage(address) });
        setWalletAuthSession(address, signature);
        clearGuestModeForced();
        return true;
      } catch (error) {
        console.error('[Protocol Auth] Signature failed:', error);
        toast.error('Signature required to continue with protocol action');
        return false;
      }
    }

    toast.error(`Connect your wallet to ${actionLabel}`);
    accessGuard.denyToGuest(fallbackPage);
    return false;
  }, [accessGuard, address, signMessageAsync]);

  return {
    requireWalletAction,
    requireWalletActionAsync,
  };
}
