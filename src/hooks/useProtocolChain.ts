import { useCallback } from 'react';
import { toast } from 'sonner';
import { formatChainLabel } from '@/utils/protocolNetwork';
import { useProtocolNetworkRouter } from '@/contexts/ProtocolNetworkContext';
import { getWalletErrorMessage } from '@/utils/walletErrors';

export function useProtocolChain() {
  const {
    selectedNetwork,
    selectedChainId,
    selectedContracts,
    walletChainId,
    selectionStatus,
    isConnected,
    isOnSelectedNetwork,
    isSwitching,
    switchWalletToSelectedNetwork,
  } = useProtocolNetworkRouter();

  const currentChainId = isConnected ? (walletChainId ?? undefined) : undefined;
  const currentChainLabel = isConnected ? formatChainLabel(currentChainId) : 'Wallet not connected';
  const targetChainId = selectedChainId ?? undefined;
  const targetChainLabel = selectedNetwork.label;
  const isOnProtocolChain = selectionStatus === 'ready' && isOnSelectedNetwork;

  const ensureProtocolChainAsync = useCallback(async (actionLabel: string) => {
    if (!isConnected) {
      toast.error(`Connect your wallet to ${actionLabel}.`);
      return false;
    }

    if (selectedNetwork.status === 'blocked') {
      toast.error(`${targetChainLabel} is not enabled for protocol actions yet. ${selectedNetwork.statusReason ?? ''}`.trim());
      return false;
    }

    if (!selectedNetwork.chainId || selectedNetwork.status !== 'live' || !selectedContracts) {
      toast.error(`${targetChainLabel} is not enabled for protocol actions yet.`);
      return false;
    }

    if (currentChainId === targetChainId) {
      return true;
    }

    try {
      const switched = await switchWalletToSelectedNetwork();
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
    selectedContracts,
    selectedNetwork,
    switchWalletToSelectedNetwork,
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
    status: selectionStatus,
    selectedNetwork,
    liveNetwork: selectedNetwork,
    ensureProtocolChainAsync,
  };
}
