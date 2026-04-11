import { AlertCircle, Package, CheckCircle2, Shield, TrendingUp } from 'lucide-react';
import { formatAddress } from '@/utils/format';
import { EXPLORER_URLS } from '@/config/contracts';
import { useConfirmRelease } from '@/hooks/useOrders';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { StudioTxStatePanel } from '@/app/components/ui/studio-tx-state-panel';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';
import { StudioModalBody, StudioModalCloseButton, StudioModalFooter, StudioModalHeader, StudioModalPanel, StudioModalShell } from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { useProtocolChain } from '@/hooks/useProtocolChain';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';
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
  const protocolChain = useProtocolChain();
  const { chainId: liveChainId } = useProtocolDataNetwork();
  const [txStatus, setTxStatus] = useState<'idle' | 'preparing' | 'pending' | 'confirming' | 'success' | 'error'>('idle');
  const paymentValueLabel = formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals);
  const quantityLabel = formatOrderQuantity(order.amount, order.unitLabel, order.unitName);
  const explorerBaseUrl = EXPLORER_URLS[liveChainId ?? 97] ?? EXPLORER_URLS[97];
  const summaryPanelClass = 'studio-form-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-4 space-y-3';
  const emphasisPanelClass = 'rounded-[28px] border border-[#2CC295]/25 bg-[#2CC295]/10 p-4';

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

    const continueConfirmRelease = async () => {
      if (!(await protocolChain.ensureProtocolChainAsync('confirm this release'))) {
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

    if (!(await requireWalletActionAsync({
      capability: 'protocol_order_write',
      actionLabel: 'confirm order release',
      fallbackPage: 'orders',
      onSecurityCheckConfirmed: continueConfirmRelease,
    }))) {
      return;
    }

    await continueConfirmRelease();
  };

  const isSeller = address?.toLowerCase() === order.seller.toLowerCase();

  return (
    <StudioModalShell className="studio-form-backdrop bg-black/85 backdrop-blur-[14px]">
      <StudioModalPanel className="studio-form-modal max-w-lg rounded-[32px]">
        {/* Header */}
        <StudioModalHeader className="border-b border-ui-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2CC295]/20 bg-[#2CC295]/12">
              <CheckCircle2 className="text-[#2CC295]" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ui-primary">Confirm Release</h2>
              <p className="text-xs text-ui-muted">Escrow release for order #{order.orderId.toString()}</p>
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
                By confirming release, you attest that the asset order has been fulfilled for the buyer.
                <strong className="block mt-2">This transfers escrowed payment and cannot be undone.</strong>
              </span>
            </StudioNoticePanel>
          )}

          {/* Order Summary */}
          <div className={summaryPanelClass}>
            <h3 className="text-xs font-semibold text-ui-muted uppercase tracking-widest mb-3">Order Details</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-ui-secondary">Asset ID</span>
              <span className="text-sm text-ui-primary font-semibold">#{order.assetId.toString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-ui-secondary">Amount</span>
              <span className="text-sm text-ui-primary font-semibold">{quantityLabel}</span>
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
              <span className="text-sm text-[#2CC295] font-semibold font-mono">
                {paymentValueLabel}
              </span>
            </div>
          </div>

          {/* Release Details */}
          <div className={emphasisPanelClass}>
            <div className="flex items-start gap-3">
                <TrendingUp className="text-[#2CC295] flex-shrink-0 mt-1" size={20} />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[#2CC295] mb-2">What happens next?</h3>
                  <div className="space-y-2 text-xs text-ui-secondary">
                    <p>Escrowed payment is released to the seller wallet.</p>
                    <p>The order moves to the released state.</p>
                    <p>The completion event is recorded on-chain.</p>
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
            <strong className="text-ui-secondary">Seller Responsibility:</strong> Confirm release only after the
            {' '}buyer-facing fulfillment is complete. Escrowed funds move immediately to the seller wallet and
            {' '}the action is permanent.
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
