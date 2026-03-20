import { useCallback } from 'react';
import { toast } from 'sonner';
import { useAccount, useSignMessage } from 'wagmi';
import { useAccessGuard } from '@/hooks/useAccessGuard';
import { isProtocolCapability, type AccessCapability } from '@/app/access/access-policy';
import { buildWalletAuthMessage, setWalletAuthSession } from '@/utils/walletAuthSession';
import { clearGuestModeForced } from '@/utils/guestMode';
import { getWalletErrorMessage, isWalletRequestPendingError } from '@/utils/walletErrors';
import { useProtocolChain } from '@/hooks/useProtocolChain';

interface RequireWalletActionOptions {
  capability: AccessCapability;
  actionLabel: string;
  fallbackPage?: string;
}

export function useRequireWalletAction(setActivePage?: (page: string) => void) {
  const accessGuard = useAccessGuard(setActivePage);
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const protocolChain = useProtocolChain();

  const requireWalletAction = useCallback((options: RequireWalletActionOptions): boolean => {
    const { capability, actionLabel, fallbackPage = 'home' } = options;
    if (accessGuard.canUseCapability(capability)) return true;
    toast.error(`Connect your wallet to ${actionLabel}`);
    accessGuard.denyToGuest(fallbackPage);
    return false;
  }, [accessGuard]);

  const requireWalletActionAsync = useCallback(async (options: RequireWalletActionOptions): Promise<boolean> => {
    const { capability, actionLabel, fallbackPage = 'home' } = options;
    if (accessGuard.canUseCapability(capability)) {
      if (isProtocolCapability(capability)) {
        return protocolChain.ensureProtocolChainAsync(actionLabel);
      }
      return true;
    }

    // Keep protocol auth as its own click. Chaining auth + tx/EIP-712 in the same gesture
    // causes MetaMask to keep the first request pending and never surface the next popup reliably.
    if (isProtocolCapability(capability)) {
      if (!address) {
        toast.error(`Connect your wallet to ${actionLabel}`);
        accessGuard.denyToGuest(fallbackPage);
        return false;
      }

      if (!(await protocolChain.ensureProtocolChainAsync(actionLabel))) {
        return false;
      }
    }

    if (accessGuard.mode === 'auth_pending' && isProtocolCapability(capability)) {
      if (!address) {
        toast.error(`Connect your wallet to ${actionLabel}`);
        accessGuard.denyToGuest(fallbackPage);
        return false;
      }

      try {
        const authMessage = buildWalletAuthMessage(address);
        const signature = await signMessageAsync({ message: authMessage });
        setWalletAuthSession(address, signature, { message: authMessage });
        clearGuestModeForced();
        toast.success(`Wallet session authenticated. Click again to ${actionLabel}.`);
        return false;
      } catch (error) {
        console.error('[Protocol Auth] Signature failed:', error);
        const message = getWalletErrorMessage(error, 'Signature required to continue with protocol action');
        if (isWalletRequestPendingError(error)) {
          toast.info(message);
        } else {
          toast.error(message);
        }
        return false;
      }
    }

    toast.error(`Connect your wallet to ${actionLabel}`);
    accessGuard.denyToGuest(fallbackPage);
    return false;
  }, [accessGuard, address, signMessageAsync, protocolChain]);

  return {
    requireWalletAction,
    requireWalletActionAsync,
  };
}
