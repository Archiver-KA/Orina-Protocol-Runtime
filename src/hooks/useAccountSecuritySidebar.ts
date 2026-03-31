import { useCallback, useEffect, useState } from 'react';
import {
  getSupabaseBridgeSessionEventName,
  listSupabaseBridgeWalletSessions,
  type BridgeWalletSessionSummary,
} from '@/utils/supabaseAuthClaimBridge';
import { hasWalletAuthSession } from '@/utils/walletAuthSession';

export type AccountSecuritySidebarStatus =
  | 'idle'
  | 'loading'
  | 'auth_required'
  | 'ready'
  | 'error';

export function useAccountSecuritySidebar(walletAddress?: string | null) {
  const [status, setStatus] = useState<AccountSecuritySidebarStatus>('idle');
  const [sessions, setSessions] = useState<BridgeWalletSessionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setStatus('idle');
      setSessions([]);
      setError(null);
      return;
    }

    if (!hasWalletAuthSession(walletAddress)) {
      setStatus('auth_required');
      setSessions([]);
      setError(null);
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const nextSessions = await listSupabaseBridgeWalletSessions({
        walletAddress,
        promptOnAuthMissing: false,
      });

      if (!nextSessions) {
        setStatus('auth_required');
        setSessions([]);
        return;
      }

      setSessions(nextSessions);
      setStatus('ready');
    } catch (err) {
      setSessions([]);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unable to load recent sessions');
    }
  }, [walletAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined' || !walletAddress) return;

    const handleRefresh = () => {
      void refresh();
    };

    window.addEventListener('orina:wallet-auth-change', handleRefresh);
    window.addEventListener(getSupabaseBridgeSessionEventName(), handleRefresh as EventListener);

    return () => {
      window.removeEventListener('orina:wallet-auth-change', handleRefresh);
      window.removeEventListener(getSupabaseBridgeSessionEventName(), handleRefresh as EventListener);
    };
  }, [refresh, walletAddress]);

  return {
    status,
    sessions,
    error,
    refresh,
    needsSecurityCheck: status === 'auth_required',
  };
}
