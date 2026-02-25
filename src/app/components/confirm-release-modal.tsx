import { X, AlertCircle, Package, CheckCircle2, Shield, TrendingUp } from 'lucide-react';
import { formatEther } from 'viem';
import { formatAddress } from '@/utils/format';
import { useConfirmRelease } from '@/hooks/useOrders';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { StudioTxStatePanel } from '@/app/components/ui/studio-tx-state-panel';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';
import { StudioModalBody, StudioModalFooter, StudioModalHeader, StudioModalPanel, StudioModalShell } from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';

interface ConfirmReleaseModalProps {
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

export function ConfirmReleaseModal({ isOpen, onClose, order, onSuccess }: ConfirmReleaseModalProps) {
  const { address } = useAccount();
  const { confirmRelease, hash, isPending, isConfirming, isConfirmed, error } = useConfirmRelease();
  const { requireWalletActionAsync } = useRequireWalletAction();
  const [txStatus, setTxStatus] = useState<'idle' | 'preparing' | 'pending' | 'confirming' | 'success' | 'error'>('idle');

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
    <StudioModalShell className="bg-black/80 backdrop-blur-sm">
      <StudioModalPanel className="max-w-lg rounded-xl">
        {/* Header */}
        <StudioModalHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2CC295]/20 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="text-[#2CC295]" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Confirm Release</h2>
              <p className="text-xs text-zinc-500">Order #{order.orderId.toString()}</p>
            </div>
          </div>
          <StudioActionButton
            onClick={onClose}
            disabled={txStatus === 'pending' || txStatus === 'confirming'}
            size="icon"
            variant="ghost"
            className="text-zinc-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </StudioActionButton>
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
              <span className="text-sm text-zinc-400">Payment Amount</span>
              <span className="text-sm text-[#2CC295] font-bold font-mono">
                {formatEther(order.grossPrice)} ETH
              </span>
            </div>
          </div>

          {/* Release Details */}
          <div className="bg-[#2CC295]/10 border border-[#2CC295]/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="text-[#2CC295] flex-shrink-0 mt-1" size={20} />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#2CC295] mb-2">What happens next?</h3>
                <div className="space-y-2 text-xs text-zinc-300">
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
              explorerUrl={hash && txStatus !== 'error' ? `https://etherscan.io/tx/${hash}` : undefined}
            />
          )}

          {/* Protocol Info */}
          <StudioNoticePanel variant="neutral" compact icon={<Shield className="text-zinc-600 flex-shrink-0 mt-0.5" size={14} />}>
            <strong className="text-zinc-400">Seller Responsibility:</strong> By confirming release, you certify
            {' '}that the goods/services have been delivered to the buyer. Funds will be immediately transferred to
            {' '}your wallet address. This action cannot be reversed.
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
