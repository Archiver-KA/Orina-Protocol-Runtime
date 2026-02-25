import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { toast } from 'sonner';
import { buildWalletAuthMessage, setWalletAuthSession } from '@/utils/walletAuthSession';
import { clearGuestModeForced } from '@/utils/guestMode';
import { WalletModalStep, WalletModalState, SignatureRequestData, TransactionResult } from '@/types/wallet';

interface WalletModalContextValue {
  modalState: WalletModalState;
  openConnectModal: () => void;
  openSignatureModal: (data: SignatureRequestData, onConfirm?: () => void) => void;
  showProcessing: () => void;
  showSuccess: (result: TransactionResult) => void;
  closeModal: () => void;
  handleWalletConnect: (connectorId: string) => void;
  handleSignatureConfirm: () => void;
  handleSignatureCancel: () => void;
}

const WalletModalContext = createContext<WalletModalContextValue | undefined>(undefined);

export function WalletModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<WalletModalState>({
    step: null,
  });
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const openSignatureModal = useCallback((signatureData: SignatureRequestData, onConfirm?: () => void) => {
    setModalState({
      step: 'signature',
      source: 'tx',
      signatureData,
      onConfirm,
    });
  }, []);

  const showProcessing = useCallback(() => {
    setModalState((prev) => ({
      ...prev,
      step: 'processing',
    }));
  }, []);

  const showSuccess = useCallback((result: TransactionResult) => {
    setModalState((prev) => ({
      step: 'success',
      source: prev.source,
      transactionResult: result,
    }));
  }, []);

  const closeModal = useCallback(() => {
    setModalState({
      step: null,
    });
  }, []);

  const openConnectModal = useCallback(() => {
    setModalState({
      step: 'connect',
      source: 'connect',
    });
  }, []);

  const handleWalletConnect = useCallback(
    (_connectorId: string) => {
      // Permission-level connect completed successfully.
      // By product decision, this is enough to unlock social/profile features.
      // Protocol auth signature is deferred until direct protocol interaction.
      clearGuestModeForced();
      closeModal();
    },
    [closeModal]
  );

  const handleSignatureConfirm = useCallback(async () => {
    try {
      if (modalState.signatureData?.action === 'Authenticate Session') {
        if (!address) {
          toast.error('Wallet address unavailable. Please reconnect.');
          closeModal();
          return;
        }
        showProcessing();
        const signature = await signMessageAsync({ message: buildWalletAuthMessage(address) });
        setWalletAuthSession(address, signature);
        clearGuestModeForced();
        showSuccess({
          hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          networkFee: '0 ETH',
          timestamp: Date.now(),
        });
        return;
      }

      if (modalState.onConfirm) {
        modalState.onConfirm();
      }
      showProcessing();

      // Simulate transaction processing (in real app, this would be actual blockchain interaction)
      setTimeout(() => {
        showSuccess({
          hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          networkFee: '0.002 ETH',
          timestamp: Date.now(),
        });
      }, 3000);
    } catch (error) {
      console.error('[Wallet Auth] Signature rejected/failed:', error);
      // Do not stack a toast over the auth modal; keep the user in the same modal and let them retry.
      setModalState((prev) => ({ ...prev, step: 'signature', source: prev.source || 'auth' }));
    }
  }, [modalState, showProcessing, showSuccess, signMessageAsync, address, closeModal]);

  const handleSignatureCancel = useCallback(() => {
    closeModal();
  }, [closeModal]);

  const value: WalletModalContextValue = {
    modalState,
    openConnectModal,
    openSignatureModal,
    showProcessing,
    showSuccess,
    closeModal,
    handleWalletConnect,
    handleSignatureConfirm,
    handleSignatureCancel,
  };

  return <WalletModalContext.Provider value={value}>{children}</WalletModalContext.Provider>;
}

export function useWalletModalContext() {
  const context = useContext(WalletModalContext);
  if (!context) {
    throw new Error('useWalletModalContext must be used within WalletModalProvider');
  }
  return context;
}
