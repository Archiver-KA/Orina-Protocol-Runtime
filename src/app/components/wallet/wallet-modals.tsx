import { useWalletModalContext } from '@/contexts/WalletModalContext';
import { ConnectWalletModal } from './connect-wallet-modal';
import { SignatureRequestModal } from './signature-request-modal';
import { TransactionProcessingModal } from './transaction-processing-modal';
import { TransactionSuccessModal } from './transaction-success-modal';

/**
 * WalletModals - Central orchestration component for all wallet modals
 * Manages the entire wallet interaction flow:
 * 1. Connect wallet
 * 2. Sign transaction
 * 3. Processing state
 * 4. Success confirmation
 */
export function WalletModals() {
  const {
    modalState,
    closeModal,
    handleWalletConnect,
    handleSignatureConfirm,
    handleSignatureCancel,
  } = useWalletModalContext();

  const { step, signatureData, transactionResult, isBusy } = modalState;

  if (!step) return null;

  return (
    <>
      {step === 'connect' && (
        <ConnectWalletModal onClose={closeModal} onConnect={handleWalletConnect} />
      )}

      {step === 'signature' && signatureData && (
        <SignatureRequestModal
          data={signatureData}
          isSigning={Boolean(isBusy)}
          onSign={handleSignatureConfirm}
          onCancel={handleSignatureCancel}
        />
      )}

      {step === 'processing' && <TransactionProcessingModal />}

      {step === 'success' && transactionResult && (
        <TransactionSuccessModal result={transactionResult} onClose={closeModal} />
      )}
    </>
  );
}
