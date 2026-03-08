import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useCreateOrder } from '@/hooks/useOrders';
import { formatAddress } from '@/utils/format';
import { formatEther, parseEther } from 'viem';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { StudioTxStatePanel } from '@/app/components/ui/studio-tx-state-panel';
import { StudioFieldHint, StudioFieldLabel, StudioInputField, StudioNumberField } from '@/app/components/ui/studio-form-fields';
import { StudioModalBackdrop, StudioModalCloseButton, StudioModalPanel, StudioModalShell } from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: bigint;
    seller: `0x${string}`;
    unitId: bigint;
    availableAmount: bigint;
  };
}

export function CreateOrderModal({ isOpen, onClose, asset }: CreateOrderModalProps) {
  const [amount, setAmount] = useState('100');
  const [pricePerUnit, setPricePerUnit] = useState('0.001');
  const [deliveryDays, setDeliveryDays] = useState('7');
  const [paymentToken, setPaymentToken] = useState('0x0000000000000000000000000000000000000000'); // ETH

  const { address, isConnected } = useAccount();
  const { createOrder, hash, isPending, isConfirming, isConfirmed, error } = useCreateOrder();
  const { requireWalletActionAsync } = useRequireWalletAction();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!amount || !pricePerUnit || !deliveryDays) {
      alert('Please fill in all fields');
      return;
    }

    const amountBigInt = BigInt(amount);
    if (amountBigInt > asset.availableAmount) {
      alert(`Amount exceeds available: ${asset.availableAmount.toString()}`);
      return;
    }

    if (!(await requireWalletActionAsync({
      capability: 'protocol_order_write',
      actionLabel: 'create orders',
      fallbackPage: 'marketplace',
    }))) {
      return;
    }

    try {
      // Calculate total price
      const totalPrice = parseEther(pricePerUnit) * amountBigInt;
      
      // Calculate delivery deadline in seconds
      const estDeliverySeconds = BigInt(Number(deliveryDays) * 24 * 60 * 60);

      // For demo: use empty signature (0x00)
      const dummySignature = '0x00' as `0x${string}`;

      await createOrder(
        asset.seller,
        paymentToken as `0x${string}`,
        asset.id,
        amountBigInt,
        totalPrice,
        estDeliverySeconds,
        dummySignature
      );
    } catch (err) {
      console.error('Order creation failed:', err);
    }
  };

  const totalPrice = () => {
    try {
      return (parseEther(pricePerUnit) * BigInt(amount)).toString();
    } catch {
      return '0';
    }
  };

  const getStatusMessage = () => {
    if (isPending) return 'Waiting for wallet confirmation...';
    if (isConfirming) return 'Creating order on blockchain...';
    if (isConfirmed) return 'Order created successfully!';
    if (error) return `Error: ${error.message}`;
    return null;
  };

  const statusMessage = getStatusMessage();

  return (
    <>
      {/* Backdrop */}
      <StudioModalBackdrop className="studio-form-backdrop bg-black/60" onBackdropClick={onClose} />

      {/* Modal */}
      <StudioModalShell className="z-50 px-4">
        <StudioModalPanel className="studio-form-modal max-w-lg">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2CC295]/20 rounded-lg flex items-center justify-center">
                <ShoppingCart className="text-[#2CC295]" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ui-primary">Create Order</h2>
                <p className="text-xs text-ui-muted">Purchase asset #{asset.id.toString()}</p>
              </div>
            </div>
            <StudioModalCloseButton onClick={onClose} />
          </div>

          {/* Transaction Status */}
          {(isPending || isConfirming || isConfirmed || error) && statusMessage && (
            <StudioTxStatePanel
              className="mb-6 rounded-xl"
              variant={isConfirmed ? 'success' : error ? 'error' : 'loading'}
              title={statusMessage}
              hash={hash}
            />
          )}

          {/* Asset Info */}
          <div className="studio-form-surface bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-ui-muted text-xs mb-1">Seller</p>
                <p className="text-ui-primary font-mono">{formatAddress(asset.seller)}</p>
              </div>
              <div>
                <p className="text-ui-muted text-xs mb-1">Unit ID</p>
                <p className="text-ui-primary font-bold">{asset.unitId.toString()}</p>
              </div>
              <div>
                <p className="text-ui-muted text-xs mb-1">Available</p>
                <p className="text-ui-primary font-bold">{asset.availableAmount.toString()}</p>
              </div>
              <div>
                <p className="text-ui-muted text-xs mb-1">Asset ID</p>
                <p className="text-ui-primary font-bold">#{asset.id.toString()}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <StudioFieldLabel className="text-ui-muted text-xs">
                Amount
              </StudioFieldLabel>
              <StudioNumberField
                className="studio-form-input bg-[var(--t-surface-5)] border-ui-border-subtle"
                placeholder="e.g. 100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={asset.availableAmount.toString()}
                required
              />
              <StudioFieldHint className="text-[10px] mt-1">
                Max available: {asset.availableAmount.toString()}
              </StudioFieldHint>
            </div>

            <div>
              <StudioFieldLabel className="text-ui-muted text-xs">
                Price Per Unit (ETH)
              </StudioFieldLabel>
              <StudioInputField
                type="text"
                className="studio-form-input bg-[var(--t-surface-5)] border-ui-border-subtle font-mono"
                placeholder="e.g. 0.001"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                required
              />
            </div>

            <div>
              <StudioFieldLabel className="text-ui-muted text-xs">
                Delivery Deadline (Days)
              </StudioFieldLabel>
              <StudioNumberField
                className="studio-form-input bg-[var(--t-surface-5)] border-ui-border-subtle"
                placeholder="e.g. 7"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                required
              />
            </div>

            {/* Total Price */}
              <div className="bg-[#2CC295]/10 border border-[#2CC295]/30 rounded-xl p-4">
                <div className="flex justify-between items-center">
                <span className="text-ui-secondary text-sm">Total Price</span>
                <span className="text-[#2CC295] text-xl font-bold font-mono">
                  {formatEther(BigInt(totalPrice()))} ETH
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <StudioActionButton
                type="button"
                onClick={onClose}
                variant="secondary"
                size="lg"
                className="studio-form-secondary flex-1 font-semibold"
                disabled={isPending || isConfirming}
              >
                Cancel
              </StudioActionButton>
              <StudioActionButton
                type="submit"
                variant="primary"
                size="lg"
                className="flex-1 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isPending || isConfirming || isConfirmed}
              >
                {isPending || isConfirming ? (
                  <div className="flex items-center justify-center gap-2">
                    <StudioLoadingIndicator layout="inline" tone="inherit" size={16} label="Processing..." labelClassName="text-current" />
                  </div>
                ) : isConfirmed ? (
                  'Order Created!'
                ) : (
                  'Create Order'
                )}
              </StudioActionButton>
            </div>
          </form>
        </div>
        </StudioModalPanel>
      </StudioModalShell>
    </>
  );
}
