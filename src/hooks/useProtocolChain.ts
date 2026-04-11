import { useCallback } from 'react';
import { toast } from 'sonner';
import { formatChainLabel } from '@/utils/protocolNetwork';
import { useProtocolNetworkRouter } from '@/contexts/ProtocolNetworkContext';
import { getWalletErrorMessage } from '@/utils/walletErrors';

export function useProtocolChain() {
  const {
    liveNetwork,
    liveChainId,
    liveContracts,
    selectedNetwork,
    walletChainId,
    status,
    isConnected,
    isOnLiveNetwork,
    isSwitching,
    switchWalletToLiveNetwork,
  } = useProtocolNetworkRouter();

  const currentChainId = isConnected ? (walletChainId ?? undefined) : undefined;
  const currentChainLabel = isConnected ? formatChainLabel(currentChainId) : 'Wallet not connected';
  const targetChainId = liveChainId ?? undefined;
  const targetChainLabel = liveNetwork.label;
  const isOnProtocolChain = status === 'ready' && isOnLiveNetwork;

  const ensureProtocolChainAsync = useCallback(async (actionLabel: string) => {
    if (!isConnected) {
      toast.error(`Connect your wallet to ${actionLabel}.`);
      return false;
    }

    if (!liveNetwork.chainId || liveNetwork.status !== 'live' || !liveContracts) {
      toast.error(`${targetChainLabel} is not enabled for protocol actions yet.`);
      return false;
    }

    if (currentChainId === targetChainId) {
      return true;
    }

    try {
      const switched = await switchWalletToLiveNetwork();
      if (!switched) {
        return false;
      }
      toast.success(`Wallet switched to ${targetChainLabel}. Click again to ${actionLabel}.`);
      return false;
    } catch (error) {
      toast.error(
        getWalletErrorMessage(
          error,
          `Switch wallet from ${currentChainLabel} to ${targetChainLabel} to ${actionLabel}.`,
        ),
      );
      return false;
    }
  }, [
    currentChainId,
    currentChainLabel,
    isConnected,
    liveContracts,
    liveNetwork,
    switchWalletToLiveNetwork,
    targetChainId,
    targetChainLabel,
  ]);

  return {
    isConnected,
    currentChainId,
    currentChainLabel,
    targetChainId,
    targetChainLabel,
    isOnProtocolChain,
    isSwitching,
    status,
    selectedNetwork,
    liveNetwork,
    ensureProtocolChainAsync,
  };
}
