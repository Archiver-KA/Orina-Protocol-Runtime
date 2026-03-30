import { ShoppingCart, PenLine, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useCreateOrder } from '@/hooks/useOrders';
import { useBuyerSign1 } from '@/hooks/useEIP712Sign';
import { formatAddress } from '@/utils/format';
import { formatUnits, parseUnits } from 'viem';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { StudioTxStatePanel } from '@/app/components/ui/studio-tx-state-panel';
import { StudioFieldHint, StudioFieldLabel, StudioNumberField } from '@/app/components/ui/studio-form-fields';
import { preventInvalidNumberKeyDown } from '@/utils/numericInput';
import { StudioModalBackdrop, StudioModalCloseButton, StudioModalPanel, StudioModalShell } from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { PAYMENT_TOKENS, PROTOCOL, type PaymentTokenSymbol } from '@/config/contracts';
import { createRuntimeOrderFromRwaIntent } from '@/utils/runtimeOrders';
import type { DeliveryAddressRecord } from '@/types/address';
import type { OrderShippingAddressSnapshot } from '@/types/order';
import {
  formatDeliveryAddressPreview,
  getPreferredDeliveryAddress,
  loadUserDeliveryAddresses,
} from '@/utils/deliveryAddressUtils';
import { toast } from 'sonner';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: bigint;
    assetUid?: string;
    tokenId?: string;
    assetContract?: `0x${string}`;
    name?: string;
    seller: `0x${string}`;
    unitId: bigint;
    unitName?: string;
    unitLabel?: string;
    availableAmount: bigint;
    pricePerUnit?: bigint;    // optional hint from listing
    imageUrl?: string;
  };
}

// ── Payment token options (BSC Testnet) ───────────────────────
const TOKEN_OPTIONS: { symbol: PaymentTokenSymbol; label: string }[] = [
  { symbol: 'USDT', label: 'USDT' },
  { symbol: 'USDC', label: 'USDC' },
  { symbol: 'WBNB', label: 'WBNB' },
  { symbol: 'ORI',  label: 'ORI'  },
];

const TOKEN_DECIMALS: Record<PaymentTokenSymbol, number> = {
  USDT: 6,
  USDC: 6,
  WBNB: 18,
  ORI: 18,
};

function getTokenDecimals(symbol: PaymentTokenSymbol) {
  return TOKEN_DECIMALS[symbol];
}

function getPlatformFeePreset(symbol: PaymentTokenSymbol) {
  if (symbol === 'USDT' || symbol === 'USDC') {
    return BigInt(PROTOCOL.STABLECOIN_PLATFORM_FEE_BPS);
  }
  if (symbol === 'ORI') {
    return BigInt(PROTOCOL.ORI_PLATFORM_FEE_BPS);
  }
  return BigInt(PROTOCOL.DEFAULT_PLATFORM_FEE_BPS);
}

function toOrderShippingSnapshot(
  addressRecord: DeliveryAddressRecord | null | undefined,
): OrderShippingAddressSnapshot | null {
  if (!addressRecord) return null;
  return {
    label: addressRecord.label ?? undefined,
    recipientName: addressRecord.recipientName,
    phoneE164: addressRecord.phoneE164 ?? undefined,
    countryCode: addressRecord.countryCode,
    countryNameSnapshot: addressRecord.countryNameSnapshot,
    geoPath: addressRecord.geoPath,
    leafPlaceId: addressRecord.leafPlaceId ?? undefined,
    postalCode: addressRecord.postalCode ?? undefined,
    addressLine1: addressRecord.addressLine1,
    addressLine2: addressRecord.addressLine2 ?? undefined,
    deliveryInstructions: addressRecord.deliveryInstructions ?? undefined,
    formatted: formatDeliveryAddressPreview(addressRecord),
  };
}

type StepId = 'form' | 'signing' | 'submitting' | 'done' | 'error';

export function CreateOrderModal({ isOpen, onClose, asset }: CreateOrderModalProps) {
  const [amount, setAmount] = useState('1');
  const [pricePerUnit, setPricePerUnit] = useState(
    asset.pricePerUnit ? formatUnits(asset.pricePerUnit, 18) : '0.001'
  );
  const [deliveryDays, setDeliveryDays] = useState('7');
  const [paymentSymbol, setPaymentSymbol] = useState<PaymentTokenSymbol>('USDT');
  const [step, setStep] = useState<StepId>('form');
  const [formError, setFormError] = useState<string | null>(null);
  const [preferredShippingAddress, setPreferredShippingAddress] = useState<DeliveryAddressRecord | null>(null);

  const { address, isConnected } = useAccount();
  const { createOrder, hash, isPending, isConfirming, isConfirmed, error, reset } = useCreateOrder();
  const buyerSig1 = useBuyerSign1();
  const { requireWalletActionAsync } = useRequireWalletAction();

  useEffect(() => {
    let active = true;

    if (!isOpen || !address) {
      setPreferredShippingAddress(null);
      return () => {
        active = false;
      };
    }

    void loadUserDeliveryAddresses(address)
      .then((addresses) => {
        if (!active) return;
        setPreferredShippingAddress(getPreferredDeliveryAddress(addresses));
      })
      .catch(() => {
        if (!active) return;
        setPreferredShippingAddress(null);
      });

    return () => {
      active = false;
    };
  }, [isOpen, address]);

  // Sync tx state → step
  useEffect(() => {
    if (isConfirmed && hash) {
      setStep('done');
      // Persist a local projection so the Orders screen reflects the chain flow immediately.
      try {
        const predictedOrderId = buyerSig1.predictedOrderId;
        if (!predictedOrderId || predictedOrderId <= 0n) {
          console.warn('[CreateOrderModal] Skipping runtime order sync because predicted orderId is unavailable');
          return;
        }
        const amountBig = BigInt(amount);
        const totalPrice = parseUnits(pricePerUnit, getTokenDecimals(paymentSymbol)) * amountBig;
        const estDeliverySeconds = BigInt(Number(deliveryDays) * 24 * 60 * 60);
        if (address) {
          createRuntimeOrderFromRwaIntent({
            orderId: predictedOrderId,
            buyer: address,
            asset: {
              id: asset.id,
              assetUid: asset.assetUid,
              tokenId: asset.tokenId,
              onchainAssetId: asset.id,
              assetContract: asset.assetContract,
              name: asset.name,
              imageUrl: asset.imageUrl,
              unitId: asset.unitId,
              unitName: asset.unitName,
              unitLabel: asset.unitLabel,
              seller: asset.seller,
            },
            quantity: Number(amountBig),
            grossPrice: totalPrice,
            estDeliverySeconds,
            paymentToken,
            paymentTokenSymbol: paymentSymbol,
            paymentTokenDecimals: getTokenDecimals(paymentSymbol),
            shippingAddressSnapshot: toOrderShippingSnapshot(preferredShippingAddress),
            shippingMethodLabel: preferredShippingAddress ? 'Buyer default delivery address' : undefined,
            selectedAttributes: [],
          });
        }
      } catch {
        // non-critical — runtime order sync failure
      }
    }
    if (error) setStep('error');
  }, [isConfirmed, hash, error, amount, pricePerUnit, paymentSymbol, deliveryDays, address, buyerSig1.predictedOrderId, asset, paymentToken, preferredShippingAddress]);

  if (!isOpen) return null;

  // ── Derived values ─────────────────────────────────────────────
  const paymentToken = PAYMENT_TOKENS[paymentSymbol];

  const computedTotalPrice = (): bigint => {
    try {
      return parseUnits(pricePerUnit, getTokenDecimals(paymentSymbol)) * BigInt(amount);
    } catch {
      return 0n;
    }
  };

  // ── Submit handler ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isConnected || !address) {
      setFormError('Please connect your wallet first');
      return;
    }

    if (!amount || !pricePerUnit || !deliveryDays) {
      setFormError('Please fill in all fields');
      return;
    }

    const amountBig = BigInt(amount);
    if (amountBig > asset.availableAmount) {
      setFormError(`Amount exceeds available supply: ${asset.availableAmount.toString()}`);
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
      const totalPrice = computedTotalPrice();
      const estDeliverySeconds = BigInt(Number(deliveryDays) * 24 * 60 * 60);

      // ── Step 1: EIP-712 Buyer Sig #1 ────────────────────────
      setStep('signing');
      const sig = await buyerSig1.sign({
        seller: asset.seller,
        paymentToken,
        assetId: asset.id,
        grossPrice: totalPrice,
        amount: amountBig,
        estDeliverySeconds,
      });

      // ── Step 2: Submit to contract ───────────────────────────
      setStep('submitting');
      await createOrder(
        asset.seller,
        paymentToken,
        asset.id,
        amountBig,
        totalPrice,
        estDeliverySeconds,
        sig,
      );
    } catch (err) {
      console.error('[CreateOrderModal] Failed:', err);
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      toast.error(msg);
      setStep('error');
    }
  };

  const handleClose = () => {
    reset();
    setStep('form');
    setFormError(null);
    onClose();
  };

  // ── Step label for submit button ───────────────────────────────
  const submitLabel = () => {
    if (step === 'signing')    return <><PenLine size={14} className="inline mr-1.5" />Signing…</>;
    if (step === 'submitting') return <StudioLoadingIndicator layout="inline" tone="inherit" size={14} label="Submitting…" labelClassName="text-current" />;
    if (step === 'done')       return <><CheckCircle2 size={14} className="inline mr-1.5" />Order Created!</>;
    return 'Sign & Create Order';
  };

  const isBusy = step === 'signing' || step === 'submitting' || isPending || isConfirming;

  return (
    <>
      <StudioModalBackdrop className="studio-form-backdrop bg-black/60" onBackdropClick={handleClose} />

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
                  <p className="text-xs text-ui-muted">
                    {asset.name ?? `Asset #${asset.id.toString()}`}
                  </p>
                </div>
              </div>
              <StudioModalCloseButton onClick={handleClose} />
            </div>

            {/* Tx / step status panel */}
            {(step === 'signing' || step === 'submitting' || step === 'done' || step === 'error') && (
              <StudioTxStatePanel
                className="mb-6 rounded-xl"
                variant={step === 'done' ? 'success' : step === 'error' ? 'error' : 'loading'}
                title={
                  step === 'signing'    ? 'Waiting for wallet signature (Buyer Sig #1)…' :
                  step === 'submitting' ? 'Submitting order to blockchain…' :
                  step === 'done'       ? 'Order created — awaiting seller confirmation' :
                                          `Error: ${error?.message ?? 'Transaction failed'}`
                }
                hash={hash}
              />
            )}

            {/* Form error */}
            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-400/10 border border-red-400/20 text-xs text-red-400">
                {formError}
              </div>
            )}

            {/* Asset Info */}
            <div className="bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-ui-muted text-xs mb-1">Seller</p>
                  <p className="text-ui-primary font-mono text-xs">{formatAddress(asset.seller)}</p>
                </div>
                <div>
                  <p className="text-ui-muted text-xs mb-1">Unit</p>
                  <p className="text-ui-primary font-bold text-xs">
                    {asset.unitName ?? `Unit ${asset.unitId.toString()}`}
                  </p>
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
              {/* Amount */}
              <div>
                <StudioFieldLabel className="text-ui-muted text-xs">Amount</StudioFieldLabel>
                <StudioNumberField
                  className="studio-form-input bg-[var(--t-surface-5)] border-ui-border-subtle"
                  placeholder="e.g. 10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={asset.availableAmount.toString()}
                  min="1"
                  required
                />
                <StudioFieldHint className="text-[10px] mt-1">
                  Max available: {asset.availableAmount.toString()}
                </StudioFieldHint>
              </div>

              {/* Price per unit */}
              <div>
                <StudioFieldLabel className="text-ui-muted text-xs">
                  Price Per Unit ({paymentSymbol})
                </StudioFieldLabel>
                <StudioNumberField
                  className="studio-form-input bg-[var(--t-surface-5)] border-ui-border-subtle font-mono"
                  placeholder="e.g. 10.00"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                  inputMode="decimal"
                  step="0.0001"
                  min="0"
                  onKeyDown={preventInvalidNumberKeyDown}
                  required
                />
              </div>

              {/* Payment token */}
              <div>
                <StudioFieldLabel className="text-ui-muted text-xs">Payment Token</StudioFieldLabel>
                <div className="flex gap-2 mt-1">
                  {TOKEN_OPTIONS.map(({ symbol, label }) => (
                    <button
                      key={symbol}
                      type="button"
                      onClick={() => setPaymentSymbol(symbol)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        paymentSymbol === symbol
                          ? 'bg-[#2CC295]/20 border-[#2CC295]/50 text-[#2CC295]'
                          : 'bg-[var(--t-surface-5)] border-ui-border-subtle text-ui-muted hover:text-ui-primary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <StudioFieldHint className="text-[10px] mt-1">
                  Token: <span className="font-mono">{paymentToken}</span>
                </StudioFieldHint>
              </div>

              <div>
                <StudioFieldLabel className="text-ui-muted text-xs">Shipping Snapshot</StudioFieldLabel>
                <div className="rounded-xl border border-ui-border-subtle bg-[var(--t-surface-5)] p-3 text-xs text-ui-secondary">
                  {preferredShippingAddress ? (
                    <>
                      <p className="font-semibold text-ui-primary">
                        {preferredShippingAddress.recipientName}
                      </p>
                      <p className="mt-1 break-words">
                        {formatDeliveryAddressPreview(preferredShippingAddress)}
                      </p>
                    </>
                  ) : (
                    <p>No default delivery address saved. Order runtime will be created without a shipping snapshot.</p>
                  )}
                </div>
              </div>

              {/* Delivery days */}
              <div>
                <StudioFieldLabel className="text-ui-muted text-xs">
                  Delivery Deadline (Days)
                </StudioFieldLabel>
                <StudioNumberField
                  className="studio-form-input bg-[var(--t-surface-5)] border-ui-border-subtle"
                  placeholder="e.g. 7"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  min="1"
                  required
                />
              </div>

              {/* Total price summary */}
              <div className="bg-[#2CC295]/10 border border-[#2CC295]/30 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-ui-secondary text-sm">Total Price</span>
                  <span className="text-[#2CC295] text-xl font-bold font-mono">
                    {formatUnits(computedTotalPrice(), getTokenDecimals(paymentSymbol))} {paymentSymbol}
                  </span>
                </div>
                <p className="text-[10px] text-ui-muted mt-1">
                  Buyer Sig #1 stores the proposed delivery time. Buyer signs again only if seller changes that time.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <StudioActionButton
                  type="button"
                  onClick={handleClose}
                  variant="secondary"
                  size="lg"
                  className="studio-form-secondary flex-1 font-semibold"
                  disabled={isBusy}
                >
                  {step === 'done' ? 'Close' : 'Cancel'}
                </StudioActionButton>
                <StudioActionButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="flex-1 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isBusy || step === 'done'}
                >
                  {submitLabel()}
                </StudioActionButton>
              </div>
            </form>
          </div>
        </StudioModalPanel>
      </StudioModalShell>
    </>
  );
}
