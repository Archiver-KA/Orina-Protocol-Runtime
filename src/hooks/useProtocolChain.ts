import { useCallback } from 'react';
import { toast } from 'sonner';
import { formatChainLabel } from '@/utils/protocolNetwork';
import { useProtocolNetworkRouter } from '@/contexts/ProtocolNetworkContext';
import { getWalletErrorMessage } from '@/utils/walletErrors';

export function useProtocolChain() {
  const {
    selectedNetwork,
    selectedChainId,
    walletChainId,
    status,
    isConnected,
    isOnSelectedNetwork,
    isSwitching,
    selectNetwork,
  } = useProtocolNetworkRouter();

  const currentChainId = isConnected ? (walletChainId ?? undefined) : undefined;
  const currentChainLabel = isConnected ? formatChainLabel(currentChainId) : 'Wallet not connected';
  const targetChainId = selectedChainId ?? undefined;
  const targetChainLabel = selectedNetwork.label;
  const isOnProtocolChain = isOnSelectedNetwork;

  const ensureProtocolChainAsync = useCallback(async (actionLabel: string) => {
    if (!isConnected) {
      toast.error(`Connect your wallet to ${actionLabel}.`);
      return false;
    }

    if (!selectedNetwork.chainId || selectedNetwork.status !== 'live' || !selectedNetwork.contracts) {
      toast.error(`${selectedNetwork.label} is not enabled for protocol actions yet.`);
      return false;
    }

    if (currentChainId === targetChainId) {
      return true;
    }

    try {
      const switched = await selectNetwork(selectedNetwork.key);
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
    selectedNetwork,
    selectNetwork,
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
    ensureProtocolChainAsync,
  };
}
