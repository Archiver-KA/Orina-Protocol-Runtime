import { useCallback } from 'react';
import { useWalletModalContext } from '@/contexts/WalletModalContext';
import type { WalletModalConfirmHandler } from '@/types/wallet';

export function useWalletSecurityPrompt() {
  const { openSecurityCheckModal } = useWalletModalContext();

  const promptChatSecurityCheck = useCallback((onConfirm?: unknown) => {
    const confirmHandler =
      typeof onConfirm === 'function'
        ? (onConfirm as WalletModalConfirmHandler)
        : undefined;

    openSecurityCheckModal({
      title: 'Unlock Secure Messages',
      description: 'Messages and conversations need a one-time wallet security check before Orina can sync your chat session.',
      surfaceLabel: 'Messages & conversations',
      confirmLabel: 'Unlock Messages',
      helpText: 'After you sign once, Orina will load your conversations automatically. No gas fee, transaction, or token approval is involved.',
      successMessage: 'Secure messages unlocked.',
      successDescription: 'Your conversations can now sync in Orina.',
    }, confirmHandler);
  }, [openSecurityCheckModal]);

  const promptProtocolSecurityCheck = useCallback((actionLabel: string, onConfirm?: unknown) => {
    const confirmHandler =
      typeof onConfirm === 'function'
        ? (onConfirm as WalletModalConfirmHandler)
        : undefined;

    openSecurityCheckModal({
      title: 'Security Check Required',
      description: `Before ${actionLabel}, confirm a one-time wallet signature to unlock secure wallet actions.`,
      surfaceLabel: actionLabel,
      confirmLabel: 'Continue to MetaMask',
      helpText: `This only confirms it's you in Orina. After signing, Orina will continue to ${actionLabel} automatically.`,
      successMessage: 'Security check complete.',
      successDescription: `You can now continue to ${actionLabel}.`,
    }, confirmHandler);
  }, [openSecurityCheckModal]);

  return {
    promptChatSecurityCheck,
    promptProtocolSecurityCheck,
  };
}
