import { useWalletModalContext } from '@/contexts/WalletModalContext';
import { ConnectWalletModal } from './connect-wallet-modal';
import { SecurityCheckModal } from './security-check-modal';
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
    handleSecurityCheckConfirm,
    handleSignatureConfirm,
    handleSignatureCancel,
  } = useWalletModalContext();

  const { step, securityCheckData, signatureData, transactionResult, isBusy } = modalState;

  if (!step) return null;

  return (
    <>
      {step === 'connect' && (
        <ConnectWalletModal onClose={closeModal} onConnect={handleWalletConnect} />
      )}

      {step === 'security_check' && securityCheckData && (
        <SecurityCheckModal
          data={securityCheckData}
          isSigning={Boolean(isBusy)}
          onConfirm={handleSecurityCheckConfirm}
          onCancel={handleSignatureCancel}
        />
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
