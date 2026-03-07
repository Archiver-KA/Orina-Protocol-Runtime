import { AlertCircle, XCircle, CheckCircle2, Shield, DollarSign } from 'lucide-react';
import { formatEther } from 'viem';
import { formatAddress } from '@/utils/format';
import { useCancelOrder } from '@/hooks/useOrders';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { StudioTxStatePanel } from '@/app/components/ui/studio-tx-state-panel';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';
import { StudioFieldHint, StudioFieldLabel, StudioTextareaField } from '@/app/components/ui/studio-form-fields';
import { StudioModalBody, StudioModalCloseButton, StudioModalFooter, StudioModalHeader, StudioModalPanel, StudioModalShell } from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    orderId: bigint;
    buyer: `0x${string}`;
    seller: `0x${string}`;
    assetId: bigint;
    amount: bigint;
    grossPrice: bigint;
    payDeadline: bigint;
    autoReleaseAt: bigint;
    state: number;
  };
  onSuccess?: () => void;
}

export function CancelOrderModal({ isOpen, onClose, order, onSuccess }: CancelOrderModalProps) {
  const { address } = useAccount();
  const { cancelOrder, hash, isPending, isConfirming, isConfirmed, error } = useCancelOrder();
  const { requireWalletActionAsync } = useRequireWalletAction();
  const [txStatus, setTxStatus] = useState<'idle' | 'preparing' | 'pending' | 'confirming' | 'success' | 'error'>('idle');
  const [cancelReason, setCancelReason] = useState('');

  // Reset status when modal opens
  useEffect(() => {
    if (isOpen) {
      setTxStatus('idle');
      setCancelReason('');
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

  const handleCancelOrder = async () => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    const isBuyer = address.toLowerCase() === order.buyer.toLowerCase();
    const isSeller = address.toLowerCase() === order.seller.toLowerCase();

    if (!isBuyer && !isSeller) {
      alert('Only buyer or seller can cancel this order');
      return;
    }

    if (!(await requireWalletActionAsync({
      capability: 'protocol_order_write',
      actionLabel: 'cancel orders',
      fallbackPage: 'orders',
    }))) {
      return;
    }

    setTxStatus('preparing');
    
    try {
      await cancelOrder(order.orderId);
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setTxStatus('error');
    }
  };

  const isBuyer = address?.toLowerCase() === order.buyer.toLowerCase();
  const isSeller = address?.toLowerCase() === order.seller.toLowerCase();
  const canCancel = isBuyer || isSeller;
  const isPaid = order.state === 1;
  const willRefund = isPaid && isBuyer;

  // Calculate who initiated cancel
  const canceller = isBuyer ? 'Buyer' : isSeller ? 'Seller' : 'Unknown';

  return (
    <StudioModalShell className="bg-black/80 backdrop-blur-sm">
      <StudioModalPanel className="max-w-lg rounded-xl">
        {/* Header */}
        <StudioModalHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <XCircle className="text-red-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Cancel Order</h2>
              <p className="text-xs text-zinc-500">Order #{order.orderId.toString()}</p>
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
          {/* Warning if not authorized */}
          {address && !canCancel && (
            <StudioNoticePanel variant="error" title="Not Authorized">
              Only buyer or seller can cancel this order. Your address: {formatAddress(address)}
            </StudioNoticePanel>
          )}

          {/* Important Notice */}
          {canCancel && txStatus === 'idle' && (
            <StudioNoticePanel variant="error" title="Important Notice">
              <span className="leading-relaxed">
                By cancelling this order, the agreement will be terminated.
                {isPaid && isBuyer && (
                  <strong className="block mt-2">Your payment will be refunded.</strong>
                )}
                {isPaid && isSeller && (
                  <strong className="block mt-2">Payment will be refunded to buyer.</strong>
                )}
                <strong className="block mt-2">This action cannot be undone.</strong>
              </span>
            </StudioNoticePanel>
          )}

          {/* Order Summary */}
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Order Details</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Asset ID</span>
              <span className="text-sm text-white font-bold">#{order.assetId.toString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Amount</span>
              <span className="text-sm text-white font-bold">{order.amount.toString()} units</span>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-zinc-800">
              <span className="text-sm text-zinc-400">Buyer</span>
              <span className="text-sm text-white font-mono">{formatAddress(order.buyer)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Seller</span>
              <span className="text-sm text-white font-mono">{formatAddress(order.seller)}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-zinc-800">
              <span className="text-sm text-zinc-400">Order Value</span>
              <span className="text-sm text-white font-bold font-mono">
                {formatEther(order.grossPrice)} ETH
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Order State</span>
              <span className={`text-sm font-bold ${
                order.state === 0 ? 'text-blue-400' : 
                order.state === 1 ? 'text-amber-400' : 
                'text-zinc-500'
              }`}>
                {order.state === 0 ? 'Proposed' : order.state === 1 ? 'Paid' : 'Unknown'}
              </span>
            </div>

            {address && (
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span className="text-sm text-zinc-400">You are</span>
                <span className="text-sm text-[#2CC295] font-bold">{canceller}</span>
              </div>
            )}
          </div>

          {/* Refund Info */}
          {isPaid && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <DollarSign className="text-amber-400 flex-shrink-0 mt-1" size={20} />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-amber-400 mb-2">Refund Information</h3>
                  <div className="space-y-2 text-xs text-zinc-300">
                    <p>💰 Payment amount: <strong className="text-amber-400">{formatEther(order.grossPrice)} ETH</strong></p>
                    <p>↩️ Refund to: <strong className="text-white font-mono">{formatAddress(order.buyer)}</strong></p>
                    <p>⏱️ Timing: Immediate (same transaction)</p>
                    <p>🔐 Security: Funds returned from escrow</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Reason (Optional) */}
          {canCancel && txStatus === 'idle' && (
            <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4">
              <StudioFieldLabel className="text-zinc-400 text-xs mb-2">
                Cancellation Reason (Optional)
              </StudioFieldLabel>
              <StudioTextareaField
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="E.g., Changed my mind, Found better deal, Delivery too long..."
                className="bg-zinc-900 border-zinc-700 rounded-lg px-3 py-2"
                rows={3}
                maxLength={200}
              />
              <StudioFieldHint className="text-zinc-600 mt-1">{cancelReason.length}/200 characters</StudioFieldHint>
            </div>
          )}

          {/* What Happens */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <XCircle className="text-red-400 flex-shrink-0 mt-1" size={20} />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-400 mb-2">What happens next?</h3>
                <div className="space-y-2 text-xs text-zinc-300">
                  <p>❌ Order state changes to "Cancelled"</p>
                  {isPaid && <p>💰 Payment refunded to buyer wallet</p>}
                  {!isPaid && <p>🔓 No payments to refund (order not paid)</p>}
                  <p>📝 Cancellation recorded on blockchain</p>
                  <p>🚫 Order cannot be reactivated</p>
                  <p>⛔ Assets remain with seller</p>
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
                txStatus === 'confirming' ? 'Cancelling order on blockchain...' :
                txStatus === 'success' ? 'Order cancelled successfully!' :
                'Transaction failed'
              }
              description={
                txStatus === 'preparing' ? 'Building transaction...' :
                txStatus === 'pending' ? 'Please confirm the cancellation in your wallet' :
                txStatus === 'confirming' ? (isPaid ? 'Processing refund...' : 'Cancelling order...') :
                txStatus === 'success' ? (isPaid ? 'Order cancelled and payment refunded!' : 'Order cancelled successfully!') :
                (error?.message || 'An error occurred. Please try again.')
              }
              hash={hash}
              explorerUrl={hash && txStatus !== 'error' ? `https://etherscan.io/tx/${hash}` : undefined}
            />
          )}

          {/* Protocol Info */}
          <StudioNoticePanel variant="neutral" compact icon={<Shield className="text-zinc-600 flex-shrink-0 mt-0.5" size={14} />}>
            <strong className="text-zinc-400">Cancellation Rights:</strong> Either party can cancel the order
            {' '}before delivery. If payment has been made, it will be automatically refunded to the buyer&apos;s wallet.
            {' '}This action is permanent and cannot be reversed.
          </StudioNoticePanel>
        </StudioModalBody>

        {/* Footer Actions */}
        <StudioModalFooter className="border-t border-zinc-800">
          <StudioActionButton
            onClick={onClose}
            disabled={txStatus === 'pending' || txStatus === 'confirming'}
            variant="secondary"
            size="lg"
            className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Keep Order
          </StudioActionButton>
          <StudioActionButton
            onClick={handleCancelOrder}
            disabled={
              !canCancel || 
              txStatus === 'pending' || 
              txStatus === 'confirming' || 
              txStatus === 'success' ||
              !address
            }
            variant="danger"
            size="lg"
            className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {txStatus === 'pending' || txStatus === 'confirming' ? (
              <>
                <StudioLoadingIndicator layout="inline" tone="inherit" size={18} label="Cancelling..." labelClassName="text-current" />
              </>
            ) : txStatus === 'success' ? (
              <>
                <CheckCircle2 size={18} />
                Cancelled
              </>
            ) : (
              <>
                <XCircle size={18} />
                Cancel Order
              </>
            )}
          </StudioActionButton>
        </StudioModalFooter>
      </StudioModalPanel>
    </StudioModalShell>
  );
}
