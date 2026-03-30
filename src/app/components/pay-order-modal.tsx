import { AlertCircle, Package, TrendingUp, Shield, Clock, CheckCircle2 } from 'lucide-react';
import { formatAddress } from '@/utils/format';
import { ACTIVE_CHAIN_ID, EXPLORER_URLS } from '@/config/contracts';
import { usePayOrder } from '@/hooks/useMarketplace';
import { useBuyerSign3 } from '@/hooks/useEIP712Sign';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { StudioTxStatePanel } from '@/app/components/ui/studio-tx-state-panel';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';
import { StudioModalBody, StudioModalCloseButton, StudioModalFooter, StudioModalHeader, StudioModalPanel, StudioModalShell } from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { formatOrderGrossPrice, formatOrderQuantity } from '@/utils/orderDisplay';

interface PayOrderModalProps {
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
    estDeliverySeconds: bigint;
    state: number;
  };
  onSuccess?: () => void;
}

export function PayOrderModal({ isOpen, onClose, order, onSuccess }: PayOrderModalProps) {
  const { address } = useAccount();
  const { payOrder, hash, isPending, isConfirming, isConfirmed, error } = usePayOrder();
  const buyerSign3 = useBuyerSign3();
  const { requireWalletActionAsync } = useRequireWalletAction();
  const [txStatus, setTxStatus] = useState<'idle' | 'preparing' | 'pending' | 'confirming' | 'success' | 'error'>('idle');
  const paymentValueLabel = formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals);
  const quantityLabel = formatOrderQuantity(order.amount, order.unitLabel, order.unitName);
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
      }, 2000);
    } else if (error) {
      setTxStatus('error');
    }
  }, [isPending, isConfirming, isConfirmed, error, onSuccess, onClose]);

  if (!isOpen) return null;

  const handlePayOrder = async () => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    if (address.toLowerCase() !== order.buyer.toLowerCase()) {
      alert('Only the buyer can pay for this order');
      return;
    }

    if (!(await requireWalletActionAsync({
      capability: 'protocol_order_write',
      actionLabel: 'pay orders',
      fallbackPage: 'orders',
    }))) {
      return;
    }

    setTxStatus('preparing');
    
    try {
      const buyerSig3 = await buyerSign3.sign({
        orderId: order.orderId,
        seller: order.seller,
        paymentToken: order.paymentToken,
        assetId: order.assetId,
        grossPrice: order.grossPrice,
        amount: order.amount,
        estDeliverySeconds: order.estDeliverySeconds,
      });
      await payOrder(order.orderId, buyerSig3);
    } catch (err) {
      console.error('Failed to pay order:', err);
      setTxStatus('error');
    }
  };

  // Calculate time remaining
  const timeRemaining = () => {
    const now = Math.floor(Date.now() / 1000);
    const deadline = Number(order.payDeadline);
    const diff = deadline - now;
    
    if (diff <= 0) return 'EXPIRED';
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const isExpired = Number(order.payDeadline) <= Math.floor(Date.now() / 1000);
  const isBuyer = address?.toLowerCase() === order.buyer.toLowerCase();

  return (
    <StudioModalShell className="studio-form-backdrop bg-black/80 backdrop-blur-sm">
      <StudioModalPanel className="studio-form-modal max-w-lg">
        {/* Header */}
        <StudioModalHeader className="border-b border-ui-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2CC295]/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-[#2CC295]" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ui-primary">Pay Order</h2>
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
          {/* Warning if expired */}
          {isExpired && (
            <StudioNoticePanel variant="error" title="Payment Deadline Expired">
              This order has passed its payment deadline and will be automatically cancelled.
            </StudioNoticePanel>
          )}

          {/* Warning if not buyer */}
          {address && !isBuyer && (
            <StudioNoticePanel variant="warning" title="Not Authorized">
              Only the buyer can pay for this order. Your address: {formatAddress(address)}
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
              <span className="text-sm text-ui-secondary">Payment Deadline</span>
              <div className="flex items-center gap-2">
                <Clock size={14} className={isExpired ? 'text-red-400' : 'text-[#2CC295]'} />
                <span className={`text-sm font-bold font-mono ${isExpired ? 'text-red-400' : 'text-[#2CC295]'}`}>
                  {timeRemaining()}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="bg-[#2CC295]/10 border border-[#2CC295]/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#2CC295] uppercase tracking-widest">Total Payment</span>
              <Shield className="text-[#2CC295]" size={16} />
            </div>
            <div className="text-3xl font-bold text-[#2CC295] font-mono">
              {paymentValueLabel}
            </div>
            <p className="text-xs text-[#2CC295] mt-2">
              Funds will be held in escrow until delivery is confirmed
            </p>
          </div>

          {/* Transaction Status */}
          {txStatus !== 'idle' && (
            <StudioTxStatePanel
              variant={txStatus === 'success' ? 'success' : txStatus === 'error' ? 'error' : 'loading'}
              title={
                txStatus === 'preparing' ? 'Preparing transaction...' :
                txStatus === 'pending' ? 'Waiting for wallet confirmation...' :
                txStatus === 'confirming' ? 'Processing payment on blockchain...' :
                txStatus === 'success' ? 'Payment successful!' :
                'Transaction failed'
              }
              description={
                txStatus === 'preparing' ? 'Building transaction...' :
                txStatus === 'pending' ? 'Please confirm the transaction in your wallet' :
                txStatus === 'confirming' ? 'Waiting for blockchain confirmation...' :
                txStatus === 'success' ? 'Buyer Sig #3 accepted the revised delivery time and the order is now paid.' :
                (error?.message || 'An error occurred. Please try again.')
              }
              hash={hash}
              explorerUrl={hash && txStatus !== 'error' ? `${explorerBaseUrl}/tx/${hash}` : undefined}
            />
          )}

          {/* Protocol Info */}
          <StudioNoticePanel variant="neutral" compact icon={<Shield className="text-ui-muted flex-shrink-0 mt-0.5" size={14} />}>
            <strong className="text-ui-secondary">Escrow Protection:</strong> Your payment will be held securely in the smart contract.
            {' '}The seller has until <strong>{new Date(Number(order.autoReleaseAt) * 1000).toLocaleString()}</strong> to confirm delivery.
            {' '}If not confirmed, funds will be automatically released to the seller.
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
            onClick={handlePayOrder}
            disabled={
              isExpired || 
              !isBuyer || 
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
                Paid
              </>
            ) : (
              <>
                <TrendingUp size={18} />
                Pay {paymentValueLabel}
              </>
            )}
          </StudioActionButton>
        </StudioModalFooter>
      </StudioModalPanel>
    </StudioModalShell>
  );
}
