import { AnimatePresence, motion } from 'motion/react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { MarketplaceAsset, RwaSelectedAttribute } from '@/app/types/asset';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { ProtocolChainBanner } from '@/app/components/ui/protocol-chain-banner';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { useBuyerSign1, useSignOrder } from '@/hooks/useEIP712Sign';
import { useProtocolChain } from '@/hooks/useProtocolChain';
import { useCreateOrder } from '@/hooks/useOrders';
import { CONTRACTS, PAYMENT_TOKENS, type PaymentTokenSymbol } from '@/config/contracts';
import { createRuntimeOrderFromRwaIntent } from '@/utils/runtimeOrders';
import { StudioTxStatePanel } from '@/app/components/ui/studio-tx-state-panel';
import { getWalletErrorMessage } from '@/utils/walletErrors';
import type { DeliveryAddressRecord } from '@/types/address';
import type { OrderShippingAddressSnapshot } from '@/types/order';
import {
  formatDeliveryAddressPreview,
  getPreferredDeliveryAddress,
  loadUserDeliveryAddresses,
} from '@/utils/deliveryAddressUtils';

interface RwaBuyOrderSignModalProps {
  asset: MarketplaceAsset;
  quantity: number;
  selectedAttributes?: RwaSelectedAttribute[];
  unitLabel?: string;
  transparentBackdrop?: boolean;
  onClose: () => void;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  return new Date(startOfLocalDay(date).getTime() + days * DAY_MS);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isValidEvmAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function parseAssetPriceToBaseUnits(price: string, currency: MarketplaceAsset['currency']): bigint | null {
  const raw = price.replace(/[^\d.]/g, '');
  if (!raw) return null;
  const decimals = currency === 'USDC' || currency === 'USDT' ? 6 : 18;
  try {
    return parseUnits(raw, decimals);
  } catch {
    return null;
  }
}

function formatDateLong(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function resolveProtocolPaymentToken(currency: MarketplaceAsset['currency']): {
  symbol: PaymentTokenSymbol;
  address: `0x${string}`;
  decimals: number;
} {
  if (currency === 'USDC') {
    return {
      symbol: 'USDC',
      address: PAYMENT_TOKENS.USDC,
      decimals: 6,
    };
  }

  return {
    symbol: 'WBNB',
    address: PAYMENT_TOKENS.WBNB,
    decimals: 18,
  };
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

function buildMonthGrid(monthDate: Date) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(monthStart);
  const offset = monthStart.getDay();
  gridStart.setDate(monthStart.getDate() - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + index);
    return d;
  });
}

export function RwaBuyOrderSignModal({
  asset,
  quantity,
  selectedAttributes = [],
  unitLabel = 'slot',
  transparentBackdrop = false,
  onClose,
}: RwaBuyOrderSignModalProps) {
  const { address } = useAccount();
  const protocolChain = useProtocolChain();
  const buyerSig1 = useBuyerSign1();
  const previewSigner = useSignOrder();
  const { createOrder, hash: orderHash, isPending: orderPending, isConfirming: orderConfirming, isConfirmed: orderConfirmed, error: orderError, reset: resetOrder } = useCreateOrder();
  const paymentToken = useMemo(() => resolveProtocolPaymentToken(asset.currency), [asset.currency]);

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const [deliveryDays, setDeliveryDays] = useState(7);
  const [targetDate, setTargetDate] = useState(() => addDays(today, 7));
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [preferredShippingAddress, setPreferredShippingAddress] = useState<DeliveryAddressRecord | null>(null);
  const [signedPayload, setSignedPayload] = useState<{
    signature: `0x${string}`;
    signedAt: number;
    mode: 'preview' | 'predicted-live';
    note: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    if (!address) {
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
  }, [address]);

  const unitPriceBase = useMemo(() => parseAssetPriceToBaseUnits(asset.price, asset.currency), [asset.price, asset.currency]);
  const totalPriceBase = useMemo(
    () => (unitPriceBase !== null ? unitPriceBase * BigInt(quantity) : null),
    [unitPriceBase, quantity]
  );
  const unitPriceNumeric = useMemo(() => {
    const raw = Number.parseFloat(asset.price.replace(/[^\d.]/g, ''));
    return Number.isFinite(raw) ? raw : 0;
  }, [asset.price]);
  const sellerAddress = isValidEvmAddress(asset.seller.address) ? asset.seller.address : null;
  const previewOrderId = useMemo(() => BigInt(Date.now()), []);
  const predictedOrderId = buyerSig1.predictedOrderId;
  const canUsePredictedSignature =
    CONTRACTS.MARKETPLACE_ATP !== ZERO_ADDRESS &&
    predictedOrderId !== undefined &&
    sellerAddress !== null &&
    totalPriceBase !== null &&
    address &&
    isValidEvmAddress(address);

  const canSignPreview =
    address &&
    isValidEvmAddress(address) &&
    sellerAddress !== null &&
    totalPriceBase !== null;

  const targetDays = Math.max(1, Math.ceil((startOfLocalDay(targetDate).getTime() - today.getTime()) / DAY_MS));
  const effectiveDeliveryDays = Math.max(1, targetDays);
  const estDeliverySeconds = BigInt(effectiveDeliveryDays * 24 * 60 * 60);

  const monthGrid = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth]);
  const calendarTitle = useMemo(
    () => calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    [calendarMonth]
  );

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const syncDeliveryDays = (nextDays: number) => {
    const clamped = Math.min(90, Math.max(1, nextDays));
    setDeliveryDays(clamped);
    const nextTarget = addDays(today, clamped);
    setTargetDate(nextTarget);
    setCalendarMonth(new Date(nextTarget.getFullYear(), nextTarget.getMonth(), 1));
  };

  const handleSelectTargetDate = (date: Date) => {
    if (startOfLocalDay(date).getTime() < today.getTime()) return;
    const nextDays = Math.max(1, Math.ceil((startOfLocalDay(date).getTime() - today.getTime()) / DAY_MS));
    setTargetDate(startOfLocalDay(date));
    setDeliveryDays(nextDays);
  };

  const handleSignBuyerIntent = async () => {
    if (!canSignPreview || !address || !isValidEvmAddress(address) || !sellerAddress || totalPriceBase === null) {
      toast.error('Missing wallet or valid order data for signing');
      return;
    }

    if (!(await protocolChain.ensureProtocolChainAsync('sign the order'))) {
      return;
    }

    try {
      const amount = BigInt(quantity);
      let signature: `0x${string}`;
      let mode: 'preview' | 'predicted-live' = 'preview';
      let note = 'Buyer Sig #1 ready (preview mode — orderId may differ at submission).';

      if (canUsePredictedSignature && predictedOrderId !== undefined) {
        signature = await buyerSig1.sign({
          seller: sellerAddress,
          grossPrice: totalPriceBase,
          amount,
          estDeliverySeconds,
        });
        mode = 'predicted-live';
        note = `Buyer Sig #1 created for predicted orderId ${predictedOrderId.toString()}.`;
      } else {
        signature = await previewSigner.signOrder({
          orderId: previewOrderId,
          buyer: address,
          seller: sellerAddress,
          grossPrice: totalPriceBase,
          amount,
          estDeliverySeconds,
        });
      }

      setSignedPayload({
        signature,
        signedAt: Date.now(),
        mode,
        note,
      });
      createRuntimeOrderFromRwaIntent({
        orderId: mode === 'predicted-live' && predictedOrderId !== undefined ? predictedOrderId : previewOrderId,
        buyer: address,
        asset,
        quantity,
        grossPrice: totalPriceBase,
        estDeliverySeconds,
        paymentToken: paymentToken.address,
        paymentTokenSymbol: paymentToken.symbol,
        paymentTokenDecimals: paymentToken.decimals,
        shippingAddressSnapshot: toOrderShippingSnapshot(preferredShippingAddress),
        shippingMethodLabel: preferredShippingAddress ? 'Buyer default delivery address' : undefined,
        selectedAttributes,
      });
      toast.success('Buyer signature created');
    } catch (error) {
      console.error('[RWA Buy Modal] Sign failed:', error);
      toast.error(getWalletErrorMessage(error, 'Failed to sign order intent'));
    }
  };

  // ── Step 2: Submit signed order on-chain ──────────────────────
  const handleSubmitOrder = async () => {
    if (!signedPayload || !address || !sellerAddress || totalPriceBase === null) {
      toast.error('Signature missing — please sign first');
      return;
    }

    if (!(await protocolChain.ensureProtocolChainAsync('submit the order'))) {
      return;
    }

    try {
      await createOrder(
        sellerAddress as `0x${string}`,
        paymentToken.address,
        asset.id as unknown as bigint,
        BigInt(quantity),
        totalPriceBase,
        estDeliverySeconds,
        signedPayload.signature,
      );
    } catch (err) {
      console.error('[RWA Modal] Submit order failed:', err);
      toast.error(getWalletErrorMessage(err, 'Order submission failed'));
    }
  };

  const isSigning = buyerSig1.isPending || previewSigner.isPending;
  const signatureError = buyerSig1.error || previewSigner.error;

  const totalDisplay = `${(unitPriceNumeric * quantity).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${asset.currency}`;
  const estTargetLabel = formatDateLong(targetDate);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 ${
          transparentBackdrop ? 'bg-transparent backdrop-blur-[10px]' : 'studio-portal-backdrop bg-black/70 backdrop-blur-[10px]'
        }`}
        onClick={handleOverlayClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
          className="studio-modal-theme studio-glass-modal w-full max-w-[700px] rounded-[2rem] border border-ui-border-subtle bg-ui-card backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden"
        >
          <div className="studio-glass-header px-6 md:px-8 py-6 border-b border-[rgba(255,255,255,0.06)] flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white">Set Delivery Time</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Confirm order price, choose delivery duration, and sign Buyer Sig #1.
              </p>
            </div>
            <StudioModalCloseButton onClick={onClose} />
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-5">
            <div className="space-y-4">
              <div className="studio-glass-surface rounded-2xl border border-ui-border-subtle bg-[rgba(255,255,255,0.02)] p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-lg font-bold text-white">{calendarTitle}</p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                      className="studio-glass-secondary w-8 h-8 rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white inline-flex items-center justify-center"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                      className="studio-glass-secondary w-8 h-8 rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white inline-flex items-center justify-center"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                    <div key={d} className="text-[10px] font-bold text-zinc-500 uppercase py-1">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {monthGrid.map((date) => {
                    const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                    const isToday = sameDay(date, today);
                    const isSelected = sameDay(date, targetDate);
                    const disabled = startOfLocalDay(date).getTime() < today.getTime();
                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleSelectTargetDate(date)}
                        className={[
                          'aspect-square w-full rounded-lg text-sm font-semibold transition-colors border',
                          isSelected
                            ? 'bg-[#2CC295] text-black border-[#2CC295] shadow-[0_0_0_1px_rgba(44,194,149,0.15)]'
                            : isToday
                              ? 'border-[#2CC295]/60 text-white bg-[#2CC295]/8'
                              : 'border-transparent bg-transparent',
                          !isSelected && !isToday && isCurrentMonth ? 'text-zinc-300 hover:bg-white/5' : '',
                          !isCurrentMonth && !isSelected ? 'text-zinc-600' : '',
                          disabled ? 'opacity-35 cursor-not-allowed' : '',
                        ].join(' ')}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <ProtocolChainBanner
                isConnected={protocolChain.isConnected}
                isOnProtocolChain={protocolChain.isOnProtocolChain}
                currentChainLabel={protocolChain.currentChainLabel}
                targetChainLabel={protocolChain.targetChainLabel}
                isSwitching={protocolChain.isSwitching}
                onSwitch={() => protocolChain.ensureProtocolChainAsync('sign the order')}
                showWhenMatched={false}
              />

              <div className="studio-glass-surface rounded-2xl border border-ui-border-subtle bg-[rgba(255,255,255,0.02)] p-4">
                <p className="text-[10px] font-bold tracking-[0.18em] text-zinc-500 uppercase mb-3">Order Summary</p>
                <div className="mb-3 rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="px-3 py-2.5 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.06)]">
                    <p className="text-[10px] font-bold tracking-[0.18em] text-zinc-500 uppercase">Delivery Duration</p>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1.2fr] items-stretch gap-0">
                    <div className="px-3 py-3 flex items-center justify-between bg-[rgba(255,255,255,0.02)]">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Days</p>
                        <p className="text-xl font-bold text-white mt-1">{effectiveDeliveryDays}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => syncDeliveryDays(deliveryDays + 1)}
                          className="w-7 h-7 rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:border-white/20 inline-flex items-center justify-center"
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => syncDeliveryDays(deliveryDays - 1)}
                          className="w-7 h-7 rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:border-white/20 inline-flex items-center justify-center"
                        >
                          <Minus size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="w-px bg-[rgba(255,255,255,0.06)]" />
                    <div className="px-3 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] leading-none whitespace-nowrap text-zinc-500">Target Date</p>
                        <p className="text-lg font-bold text-white mt-1">{estTargetLabel}</p>
                      </div>
                      <div className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 inline-flex items-center justify-center text-zinc-300">
                        <Calendar size={16} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{asset.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{asset.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Qty</p>
                      <p className="text-sm font-bold text-white">
                        {quantity} {unitLabel}
                        {quantity > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {selectedAttributes.length > 0 && (
                    <>
                      <div className="h-px bg-white/5" />
                      <div>
                        <p className="text-[10px] font-bold tracking-[0.18em] text-zinc-500 uppercase mb-2">
                          Selected Attributes
                        </p>
                        <div className="space-y-2">
                          {selectedAttributes.map((attribute) => (
                            <div
                              key={attribute.groupId}
                              className="flex items-start justify-between gap-3 text-xs"
                            >
                              <span className="text-zinc-400">{attribute.groupLabel}</span>
                              <span className="text-right font-semibold text-white">
                                {attribute.values.join(', ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="h-px bg-white/5" />
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-zinc-400">Payment Token</span>
                    <span className="text-right font-semibold text-white">
                      {paymentToken.symbol}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-zinc-400">Shipping Snapshot</span>
                    <span className="text-right font-semibold text-white max-w-[18rem]">
                      {preferredShippingAddress
                        ? formatDeliveryAddressPreview(preferredShippingAddress)
                        : 'No default address saved'}
                    </span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-semibold">Total</span>
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">{totalDisplay}</p>
                      {asset.priceUSD && (
                        <p className="text-xs text-zinc-500">
                          Approx. {(Number.parseFloat(asset.priceUSD.replace(/[^\d.]/g, '')) * quantity).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {signatureError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {signatureError.message}
                </div>
              )}

              {signedPayload && (
                <div className="rounded-2xl border border-[rgba(44,194,149,0.2)] bg-[rgba(44,194,149,0.04)] p-4">
                  <div className="flex items-center gap-2 text-[#2CC295] mb-2">
                    <ShieldCheck size={16} />
                    <p className="text-sm font-bold">Buyer Sig #1 Ready</p>
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-2">{signedPayload.note}</p>
                  <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                    <p className="text-[10px] font-bold tracking-[0.18em] text-zinc-500 uppercase mb-1">Signature</p>
                    <p className="font-mono text-[11px] text-zinc-300 break-all">
                      {signedPayload.signature}
                    </p>
                  </div>
                </div>
              )}

              {/* On-chain tx status */}
              {(orderPending || orderConfirming || orderConfirmed || orderError) && (
                <StudioTxStatePanel
                  className="rounded-xl"
                  variant={orderConfirmed ? 'success' : orderError ? 'error' : 'loading'}
                  title={
                    orderConfirmed ? 'Order submitted — awaiting seller confirmation' :
                    orderError     ? `Error: ${orderError.message}` :
                    orderConfirming ? 'Confirming on blockchain…' :
                                      'Submitting order…'
                  }
                  hash={orderHash}
                />
              )}

              <div className="flex items-center gap-3 pt-1">
                <StudioActionButton
                  onClick={onClose}
                  variant="secondary"
                  size="lg"
                  className="flex-1 h-[45px] rounded-full justify-center"
                >
                  {orderConfirmed ? 'Close' : 'Cancel'}
                </StudioActionButton>

                {!signedPayload ? (
                  <StudioActionButton
                    onClick={handleSignBuyerIntent}
                    disabled={!canSignPreview || isSigning}
                    size="lg"
                    className="flex-1 h-[45px] rounded-full justify-center text-sm"
                  >
                    {isSigning
                      ? 'Signing…'
                      : !protocolChain.isConnected
                        ? 'Connect Wallet'
                        : !protocolChain.isOnProtocolChain
                          ? 'Switch Network'
                          : 'Sign Order'}
                  </StudioActionButton>
                ) : (
                  <StudioActionButton
                    onClick={handleSubmitOrder}
                    disabled={orderPending || orderConfirming || orderConfirmed}
                    size="lg"
                    className="flex-1 h-[45px] rounded-full justify-center text-sm"
                  >
                    {orderPending || orderConfirming
                      ? 'Submitting…'
                      : orderConfirmed
                        ? 'Submitted!'
                        : !protocolChain.isConnected
                          ? 'Connect Wallet'
                          : !protocolChain.isOnProtocolChain
                            ? 'Switch Network'
                            : 'Submit Order →'}
                  </StudioActionButton>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
