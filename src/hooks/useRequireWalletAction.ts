import { useCallback } from 'react';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { useAccessGuard } from '@/hooks/useAccessGuard';
import { isProtocolCapability, type AccessCapability } from '@/app/access/access-policy';
import { useProtocolChain } from '@/hooks/useProtocolChain';
import { useWalletSecurityPrompt } from '@/hooks/useWalletSecurityPrompt';

interface RequireWalletActionOptions {
  capability: AccessCapability;
  actionLabel: string;
  fallbackPage?: string;
}

export function useRequireWalletAction(setActivePage?: (page: string) => void) {
  const accessGuard = useAccessGuard(setActivePage);
  const { address } = useAccount();
  const protocolChain = useProtocolChain();
  const { promptProtocolSecurityCheck } = useWalletSecurityPrompt();

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

      promptProtocolSecurityCheck(actionLabel);
      return false;
    }

    toast.error(`Connect your wallet to ${actionLabel}`);
    accessGuard.denyToGuest(fallbackPage);
    return false;
  }, [accessGuard, address, promptProtocolSecurityCheck, protocolChain]);

  return {
    requireWalletAction,
    requireWalletActionAsync,
  };
}
