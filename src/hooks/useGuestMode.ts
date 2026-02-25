import { useCallback, useEffect, useState } from 'react';
import { clearGuestModeForced, isGuestModeForced, setGuestModeForced } from '@/utils/guestMode';

export function useGuestMode() {
  const [forceGuestMode, setForceGuestModeState] = useState(false);

  useEffect(() => {
    const syncGuestMode = () => setForceGuestModeState(isGuestModeForced());
    syncGuestMode();
    window.addEventListener('orina:guest-mode-change', syncGuestMode);
    window.addEventListener('storage', syncGuestMode);
    return () => {
      window.removeEventListener('orina:guest-mode-change', syncGuestMode);
      window.removeEventListener('storage', syncGuestMode);
    };
  }, []);

  const enableGuestMode = useCallback(() => setGuestModeForced(true), []);
  const disableGuestMode = useCallback(() => clearGuestModeForced(), []);

  return {
    forceGuestMode,
    enableGuestMode,
    disableGuestMode,
  };
}
