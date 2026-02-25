import { useCallback } from 'react';
import { useAccessMode } from '@/hooks/useAccessMode';
import { useWalletModalContext } from '@/contexts/WalletModalContext';

export function useAccessGuard(setActivePage?: (page: string) => void) {
  const access = useAccessMode();
  const { openConnectModal } = useWalletModalContext();

  const denyToGuest = useCallback((fallbackPage: string = 'home') => {
    if (setActivePage) {
      setActivePage(access.resolvePageForMode(fallbackPage));
    }
    openConnectModal();
  }, [setActivePage, openConnectModal, access]);

  const guardPageNavigation = useCallback((page: string, fallbackPage: string = 'home') => {
    if (access.canAccessPage(page)) {
      if (setActivePage) setActivePage(access.resolvePageForMode(page));
      return true;
    }
    denyToGuest(fallbackPage);
    return false;
  }, [access, setActivePage, denyToGuest]);

  return {
    ...access,
    denyToGuest,
    guardPageNavigation,
  };
}
