import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { toast } from 'sonner';
import { buildWalletAuthMessage, setWalletAuthSession } from '@/utils/walletAuthSession';
import { clearGuestModeForced } from '@/utils/guestMode';
import { WalletModalState, SignatureRequestData, TransactionResult, WalletModalConfirmHandler } from '@/types/wallet';

interface WalletModalContextValue {
  modalState: WalletModalState;
  openConnectModal: () => void;
  openSignatureModal: (data: SignatureRequestData, onConfirm?: WalletModalConfirmHandler) => void;
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

  const openSignatureModal = useCallback((signatureData: SignatureRequestData, onConfirm?: WalletModalConfirmHandler) => {
    setModalState({
      step: 'signature',
      source: 'tx',
      isBusy: false,
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
      // Immediate signature flow override: trigger auth signature right after connect.
      setModalState({
        step: 'signature',
        source: 'auth',
        isBusy: false,
        signatureData: {
          action: 'Authenticate Session',
          origin: window.location.hostname || 'MarketplaceATP',
          message: {
            item: 'Orina Session',
            timestamp: Date.now(),
          },
          details: [
            { label: 'Message', value: 'Please sign this message to securely authenticate your session with the protocol.' }
          ]
        }
      });
    },
    []
  );

  const handleSignatureConfirm = useCallback(async () => {
    try {
      if (modalState.signatureData?.action === 'Authenticate Session') {
        if (!address) {
          toast.error('Wallet address unavailable. Please reconnect.');
          closeModal();
          return;
        }
        setModalState((prev) => ({ ...prev, isBusy: true }));
        const authMessage = buildWalletAuthMessage(address);
        const signature = await signMessageAsync({ message: authMessage });
        setWalletAuthSession(address, signature, { message: authMessage });
        clearGuestModeForced();
        toast.success('Wallet session authenticated.');
        closeModal();
        return;
      }

      setModalState((prev) => ({ ...prev, isBusy: true }));
      if (modalState.onConfirm) {
        const result = await modalState.onConfirm();
        if (result) {
          showSuccess(result);
          return;
        }
      }
      closeModal();
    } catch (error) {
      console.error('[Wallet Auth] Signature rejected/failed:', error);
      // Do not stack a toast over the auth modal; keep the user in the same modal and let them retry.
      setModalState((prev) => ({ ...prev, step: 'signature', source: prev.source || 'auth', isBusy: false }));
    }
  }, [modalState, showSuccess, signMessageAsync, address, closeModal]);

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
