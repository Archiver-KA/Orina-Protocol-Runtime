import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import type { AccessMode } from '../app/access/access-policy';
import { useAccessMode } from './useAccessMode';

export type ViewerAddressSource = 'wallet' | 'wallet_suppressed' | 'none';

export interface EffectiveViewerState {
  address?: `0x${string}`;
  walletAddress?: `0x${string}`;
  chainId?: number;
  mode: AccessMode;
  isGuest: boolean;
  isAuthPending: boolean;
  isConnected: boolean;
  walletConnected: boolean;
  source: ViewerAddressSource;
}

export function useEffectiveViewer(): EffectiveViewerState {
  const { address: walletAddress, chainId, isConnected: walletConnected } = useAccount();
  const { mode, isGuest, isAuthPending, effectiveConnectedAddress } = useAccessMode();

  return useMemo(() => ({
    address: effectiveConnectedAddress,
    walletAddress,
    chainId,
    mode,
    isGuest,
    isAuthPending,
    isConnected: Boolean(effectiveConnectedAddress),
    walletConnected,
    source: effectiveConnectedAddress
      ? 'wallet'
      : walletConnected
        ? 'wallet_suppressed'
        : 'none',
  }), [chainId, effectiveConnectedAddress, isAuthPending, isGuest, mode, walletAddress, walletConnected]);
}