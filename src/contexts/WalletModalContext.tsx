import { createContext, useContext, ReactNode, useState, useCallback, useEffect, useRef, type Context } from 'react';
import { useAccount, useChainId, useSignMessage } from 'wagmi';
import { toast } from 'sonner';
import { clearWalletAuthSession, setWalletAuthSession } from '@/utils/walletAuthSession';
import { clearGuestModeForced } from '@/utils/guestMode';
import { getWalletErrorMessage, isWalletRequestPendingError } from '@/utils/walletErrors';
import {
  BRIDGE_SECURITY_CHECK_EVENT,
  clearSupabaseBridgeSession,
  requestWalletAuthChallenge,
  type BridgeSecurityCheckRequest,
} from '@/utils/supabaseAuthClaimBridge';
import { purgeWalletScopedSensitiveStorage } from '@/utils/walletSensitiveStorage';
import { WalletModalState, SignatureRequestData, SecurityCheckRequestData, TransactionResult, WalletModalConfirmHandler } from '@/types/wallet';

interface WalletModalContextValue {
  modalState: WalletModalState;
  openConnectModal: () => void;
  openSecurityCheckModal: (data: SecurityCheckRequestData, onConfirm?: WalletModalConfirmHandler) => void;
  openSignatureModal: (data: SignatureRequestData, onConfirm?: WalletModalConfirmHandler) => void;
  showProcessing: () => void;
  showSuccess: (result: TransactionResult) => void;
  closeModal: () => void;
  handleWalletConnect: (connectorId: string) => void;
  handleSecurityCheckConfirm: () => void;
  handleSignatureConfirm: () => void;
  handleSignatureCancel: () => void;
}

declare global {
  var __orinaWalletModalContext: Context<WalletModalContextValue | undefined> | undefined;
}

const WalletModalContext = globalThis.__orinaWalletModalContext
  ?? createContext<WalletModalContextValue | undefined>(undefined);

if (!globalThis.__orinaWalletModalContext) {
  WalletModalContext.displayName = 'WalletModalContext';
  globalThis.__orinaWalletModalContext = WalletModalContext;
}

export function WalletModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<WalletModalState>({
    step: null,
  });
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const connectToastShownRef = useRef(false);
  const previousAddressRef = useRef<string | null>(null);

  useEffect(() => {
    const currentAddress = address?.toLowerCase() || null;
    const previousAddress = previousAddressRef.current;
    if (previousAddress && previousAddress !== currentAddress) {
      purgeWalletScopedSensitiveStorage(previousAddress);
      clearSupabaseBridgeSession();
      clearWalletAuthSession();
    }
    previousAddressRef.current = currentAddress;
  }, [address]);

  const openSecurityCheckModal = useCallback((securityCheckData: SecurityCheckRequestData, onConfirm?: WalletModalConfirmHandler) => {
    setModalState({
      step: 'security_check',
      source: 'auth',
      isBusy: false,
      securityCheckData,
      onConfirm,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBridgeSecurityRequest = (event: Event) => {
      const customEvent = event as CustomEvent<{ request?: BridgeSecurityCheckRequest }>;
      const request = customEvent.detail?.request;
      if (!request) return;
      openSecurityCheckModal(request);
    };

    window.addEventListener(BRIDGE_SECURITY_CHECK_EVENT, handleBridgeSecurityRequest as EventListener);
    return () => {
      window.removeEventListener(BRIDGE_SECURITY_CHECK_EVENT, handleBridgeSecurityRequest as EventListener);
    };
  }, [openSecurityCheckModal]);

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

  const completeConnectFlow = useCallback(() => {
    clearGuestModeForced();
    closeModal();
    if (connectToastShownRef.current) return;
    connectToastShownRef.current = true;
    toast.success('Wallet connected.', {
      description: 'No signature or gas is required at login. Protected actions will ask only when needed.',
    });
  }, [closeModal]);

  const openConnectModal = useCallback(() => {
    connectToastShownRef.current = false;
    setModalState({
      step: 'connect',
      source: 'connect',
    });
  }, []);

  const handleWalletConnect = useCallback(
    (_connectorId: string) => {
      // Some injected connectors resolve late after the extension approval popup closes.
      // Keep connect-only login resilient by finalizing as soon as wagmi reports a wallet.
      completeConnectFlow();
    },
    [completeConnectFlow]
  );

  useEffect(() => {
    if (modalState.step !== 'connect') {
      connectToastShownRef.current = false;
      return;
    }
    if (!isConnected || !address) return;
    completeConnectFlow();
  }, [address, completeConnectFlow, isConnected, modalState.step]);

  const handleSecurityCheckConfirm = useCallback(async () => {
    try {
      if (!address) {
        toast.error('Wallet address unavailable. Please reconnect.');
        closeModal();
        return;
      }

      setModalState((prev) => ({ ...prev, isBusy: true }));
      const challenge = await requestWalletAuthChallenge(address, chainId);
      const signedAt = Date.parse(challenge.issuedAt);
      const authMessage = challenge.message;
      const signature = await signMessageAsync({ message: authMessage });

      setWalletAuthSession(address, signature, { message: authMessage, signedAt });
      clearGuestModeForced();

      if (typeof modalState.onConfirm === 'function') {
        await modalState.onConfirm();
      }

      toast.success(
        modalState.securityCheckData?.successMessage || 'Security check complete.',
        modalState.securityCheckData?.successDescription
          ? { description: modalState.securityCheckData.successDescription }
          : undefined,
      );
      closeModal();
    } catch (error) {
      console.error('[Wallet Security Check] Signature rejected/failed:', error);
      const message = getWalletErrorMessage(error, 'Signature required to continue.');
      if (isWalletRequestPendingError(error)) {
        toast.info(message);
      } else {
        toast.error(message);
      }
      setModalState((prev) => ({ ...prev, step: 'security_check', source: 'auth', isBusy: false }));
    }
  }, [address, chainId, closeModal, modalState, signMessageAsync]);

  const handleSignatureConfirm = useCallback(async () => {
    try {
      setModalState((prev) => ({ ...prev, isBusy: true }));
      if (typeof modalState.onConfirm === 'function') {
        const result = await modalState.onConfirm();
        if (result) {
          showSuccess(result);
          return;
        }
      }
      closeModal();
    } catch (error) {
      console.error('[Wallet Modal] Signature rejected/failed:', error);
      setModalState((prev) => ({ ...prev, step: 'signature', source: prev.source || 'tx', isBusy: false }));
    }
  }, [modalState, showSuccess, closeModal]);

  const handleSignatureCancel = useCallback(() => {
    closeModal();
  }, [closeModal]);

  const value: WalletModalContextValue = {
    modalState,
    openConnectModal,
    openSecurityCheckModal,
    openSignatureModal,
    showProcessing,
    showSuccess,
    closeModal,
    handleWalletConnect,
    handleSecurityCheckConfirm,
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
