import { useState, useCallback } from 'react';
import { useConnect, useAccount, useSignMessage } from 'wagmi';
import { WalletModalStep, WalletModalState, SignatureRequestData, TransactionResult } from '@/types/wallet';

export function useWalletModal() {
  const [modalState, setModalState] = useState<WalletModalState>({
    step: null,
  });

  const { isConnected } = useAccount();
  const { connectors } = useConnect();

  // Open connect modal
  const openConnectModal = useCallback(() => {
    setModalState({
      step: 'connect',
    });
  }, []);

  // Open signature request modal with data
  const openSignatureModal = useCallback((signatureData: SignatureRequestData, onConfirm?: () => void) => {
    setModalState({
      step: 'signature',
      signatureData,
      onConfirm,
    });
  }, []);

  // Show processing state
  const showProcessing = useCallback(() => {
    setModalState((prev) => ({
      ...prev,
      step: 'processing',
    }));
  }, []);

  // Show success with transaction result
  const showSuccess = useCallback((result: TransactionResult) => {
    setModalState({
      step: 'success',
      transactionResult: result,
    });
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setModalState({
      step: null,
    });
  }, []);

  // Handle wallet connection
  const handleWalletConnect = useCallback(async (connectorId: string) => {
    // This will be handled by individual wallet components
    // After successful connection, close the modal
    closeModal();
  }, [closeModal]);

  // Handle signature confirmation
  const handleSignatureConfirm = useCallback(() => {
    if (modalState.onConfirm) {
      modalState.onConfirm();
    }
    showProcessing();
  }, [modalState, showProcessing]);

  // Handle signature cancel
  const handleSignatureCancel = useCallback(() => {
    closeModal();
  }, [closeModal]);

  return {
    modalState,
    openConnectModal,
    openSignatureModal,
    showProcessing,
    showSuccess,
    closeModal,
    handleWalletConnect,
    handleSignatureConfirm,
    handleSignatureCancel,
    isConnected,
    hasWallets: connectors.length > 0,
  };
}