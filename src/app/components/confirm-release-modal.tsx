import { AlertCircle, Package, CheckCircle2, Shield, TrendingUp } from 'lucide-react';
import { formatAddress } from '@/utils/format';
import { ACTIVE_CHAIN_ID, EXPLORER_URLS } from '@/config/contracts';
import { useConfirmRelease } from '@/hooks/useOrders';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { StudioTxStatePanel } from '@/app/components/ui/studio-tx-state-panel';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';
import { StudioModalBody, StudioModalCloseButton, StudioModalFooter, StudioModalHeader, StudioModalPanel, StudioModalShell } from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { formatOrderGrossPrice, formatOrderQuantity } from '@/utils/orderDisplay';

interface ConfirmReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    orderId: bigint;
    buyer: `0x${string}`;
    seller: `0x${string}`;
    assetId: bigint;
    amount: bigint;
    unitName?: string;
    grossPrice: bigint;
    paymentTokenSymbol?: string;
    paymentTokenDecimals?: number;
    payDeadline: bigint;
    autoReleaseAt: bigint;
    state: number;
  };
  onSuccess?: () => void;
}

export function ConfirmReleaseModal({ isOpen, onClose, order, onSuccess }: ConfirmReleaseModalProps) {
  const { address } = useAccount();
  const { confirmRelease, hash, isPending, isConfirming, isConfirmed, error } = useConfirmRelease();
  const { requireWalletActionAsync } = useRequireWalletAction();
  const [txStatus, setTxStatus] = useState<'idle' | 'preparing' | 'pending' | 'confirming' | 'success' | 'error'>('idle');
  const paymentValueLabel = formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals);
  const quantityLabel = formatOrderQuantity(order.amount, order.unitName);
  const explorerBaseUrl = EXPLORER_URLS[ACTIVE_CHAIN_ID] ?? EXPLORER_URLS[97];

  // Reset status when modal opens
  useEffect(() => {
    if (isOpen) {
      setTxStatus('idle');
    }
  }, [isOpen]);

  // Track transaction status
  useEffect(() => {
    if (isPending) {
      setTxStatus('pending');
    } else if (isConfirming) {
      setTxStatus('confirming');
    } else if (isConfirmed) {
      setTxStatus('success');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2500);
    } else if (error) {
      setTxStatus('error');
    }
  }, [isPending, isConfirming, isConfirmed, error, onSuccess, onClose]);

  if (!isOpen) return null;

  const handleConfirmRelease = async () => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    if (address.toLowerCase() !== order.seller.toLowerCase()) {
      alert('Only the seller can confirm release');
      return;
    }

    if (!(await requireWalletActionAsync({
      capability: 'protocol_order_write',
      actionLabel: 'confirm order release',
      fallbackPage: 'orders',
    }))) {
      return;
    }

    setTxStatus('preparing');
    
    try {
      await confirmRelease(order.orderId);
    } catch (err) {
      console.error('Failed to confirm release:', err);
      setTxStatus('error');
    }
  };

  const isSeller = address?.toLowerCase() === order.seller.toLowerCase();

  return (
    <StudioModalShell className="studio-form-backdrop bg-black/80 backdrop-blur-sm">
      <StudioModalPanel className="studio-form-modal max-w-lg rounded-xl">
        {/* Header */}
        <StudioModalHeader className="border-b border-ui-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2CC295]/20 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="text-[#2CC295]" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ui-primary">Confirm Release</h2>
              <p className="text-xs text-ui-muted">Order #{order.orderId.toString()}</p>
            </div>
          </div>
          <StudioModalCloseButton
            onClick={onClose}
            disabled={txStatus === 'pending' || txStatus === 'confirming'}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        </StudioModalHeader>

        {/* Content */}
        <StudioModalBody className="space-y-6 max-h-[60vh]">
          {/* Warning if not seller */}
          {address && !isSeller && (
            <StudioNoticePanel variant="error" title="Not Authorized">
              Only the seller can confirm release. Your address: {formatAddress(address)}
            </StudioNoticePanel>
          )}

          {/* Important Notice */}
          {isSeller && txStatus === 'idle' && (
            <StudioNoticePanel variant="warning" title="Important Notice">
              <span className="leading-relaxed">
                By confirming release, you acknowledge that you have delivered the goods/services to the buyer.
                <strong className="block mt-2">This action is irreversible.</strong>
              </span>
            </StudioNoticePanel>
          )}

          {/* Order Summary */}
          <div className="studio-form-surface bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold text-ui-muted uppercase tracking-widest mb-3">Order Details</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-ui-secondary">Asset ID</span>
              <span className="text-sm text-ui-primary font-bold">#{order.assetId.toString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-ui-secondary">Amount</span>
              <span className="text-sm text-ui-primary font-bold">{quantityLabel}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-ui-border-subtle">
              <span className="text-sm text-ui-secondary">Buyer</span>
              <span className="text-sm text-ui-primary font-mono">{formatAddress(order.buyer)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-ui-secondary">Seller</span>
              <span className="text-sm text-ui-primary font-mono">{formatAddress(order.seller)}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-ui-border-subtle">
              <span className="text-sm text-ui-secondary">Payment Amount</span>
              <span className="text-sm text-[#2CC295] font-bold font-mono">
                {paymentValueLabel}
              </span>
            </div>
          </div>

          {/* Release Details */}
          <div className="bg-[#2CC295]/10 border border-[#2CC295]/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
                <TrendingUp className="text-[#2CC295] flex-shrink-0 mt-1" size={20} />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-[#2CC295] mb-2">What happens next?</h3>
                  <div className="space-y-2 text-xs text-ui-secondary">
                    <p>✅ Payment will be released from escrow to your wallet</p>
                    <p>✅ Asset ownership transfers to the buyer</p>
                    <p>✅ Order state changes to "Released"</p>
                  <p>✅ Transaction is recorded on blockchain (permanent)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Status */}
          {txStatus !== 'idle' && (
            <StudioTxStatePanel
              variant={txStatus === 'success' ? 'success' : txStatus === 'error' ? 'error' : 'loading'}
              title={
                txStatus === 'preparing' ? 'Preparing transaction...' :
                txStatus === 'pending' ? 'Waiting for wallet confirmation...' :
                txStatus === 'confirming' ? 'Confirming release on blockchain...' :
                txStatus === 'success' ? 'Release confirmed successfully!' :
                'Transaction failed'
              }
              description={
                txStatus === 'preparing' ? 'Building transaction...' :
                txStatus === 'pending' ? 'Please confirm the transaction in your wallet' :
                txStatus === 'confirming' ? 'Payment is being released to your wallet...' :
                txStatus === 'success' ? 'Payment has been released! Order is now complete.' :
                (error?.message || 'An error occurred. Please try again.')
              }
              hash={hash}
              explorerUrl={hash && txStatus !== 'error' ? `${explorerBaseUrl}/tx/${hash}` : undefined}
            />
          )}

          {/* Protocol Info */}
          <StudioNoticePanel variant="neutral" compact icon={<Shield className="text-ui-muted flex-shrink-0 mt-0.5" size={14} />}>
            <strong className="text-ui-secondary">Seller Responsibility:</strong> By confirming release, you certify
            {' '}that the goods/services have been delivered to the buyer. Funds will be immediately transferred to
            {' '}your wallet address. This action cannot be reversed.
          </StudioNoticePanel>
        </StudioModalBody>

        {/* Footer Actions */}
        <StudioModalFooter className="border-t border-ui-border-subtle">
          <StudioActionButton
            onClick={onClose}
            disabled={txStatus === 'pending' || txStatus === 'confirming'}
            variant="secondary"
            size="lg"
            className="studio-form-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </StudioActionButton>
          <StudioActionButton
            onClick={handleConfirmRelease}
            disabled={
              !isSeller || 
              txStatus === 'pending' || 
              txStatus === 'confirming' || 
              txStatus === 'success' ||
              !address
            }
            variant="primary"
            size="lg"
            className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {txStatus === 'pending' || txStatus === 'confirming' ? (
              <>
                <StudioLoadingIndicator layout="inline" tone="inherit" size={18} label="Processing..." labelClassName="text-current" />
              </>
            ) : txStatus === 'success' ? (
              <>
                <CheckCircle2 size={18} />
                Released
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Confirm Release
              </>
            )}
          </StudioActionButton>
        </StudioModalFooter>
      </StudioModalPanel>
    </StudioModalShell>
  );
}
