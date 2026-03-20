import { useCallback } from 'react';
import { toast } from 'sonner';
import { useAccount, useSwitchChain } from 'wagmi';
import { ACTIVE_CHAIN_ID } from '@/config/contracts';
import { formatChainLabel, PROTOCOL_CHAIN_LABEL } from '@/utils/protocolNetwork';
import { getWalletErrorMessage } from '@/utils/walletErrors';

export function useProtocolChain() {
  const { chainId, isConnected } = useAccount();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const currentChainId = isConnected ? chainId : undefined;
  const currentChainLabel = isConnected
    ? formatChainLabel(currentChainId)
    : 'Wallet not connected';
  const targetChainId = ACTIVE_CHAIN_ID;
  const targetChainLabel = PROTOCOL_CHAIN_LABEL;
  const isOnProtocolChain = currentChainId === targetChainId;

  const ensureProtocolChainAsync = useCallback(async (actionLabel: string) => {
    if (!isConnected) {
      toast.error(`Connect your wallet to ${actionLabel}.`);
      return false;
    }

    if (currentChainId === targetChainId) {
      return true;
    }

    try {
      await switchChainAsync({ chainId: targetChainId });
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
  }, [currentChainId, currentChainLabel, isConnected, switchChainAsync, targetChainId, targetChainLabel]);

  return {
    isConnected,
    currentChainId,
    currentChainLabel,
    targetChainId,
    targetChainLabel,
    isOnProtocolChain,
    isSwitching,
    ensureProtocolChainAsync,
  };
}
