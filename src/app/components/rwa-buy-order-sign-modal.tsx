import { AnimatePresence, motion } from 'motion/react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Minus,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useAccount, usePublicClient, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { toast } from 'sonner';
import type { MarketplaceAsset, RwaSelectedAttribute } from '@/app/types/asset';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { ProtocolChainBanner } from '@/app/components/ui/protocol-chain-banner';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { useBuyerSign1, useSignOrder } from '@/hooks/useEIP712Sign';
import { useAccessMode } from '@/hooks/useAccessMode';
import { useProtocolChain } from '@/hooks/useProtocolChain';
import { useCreateOrder } from '@/hooks/useOrders';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { PAYMENT_TOKENS, type PaymentTokenSymbol } from '@/config/contracts';
import { ERC20_ABI, MARKETPLACE_ABI } from '@/config/abis';
import { createRuntimeOrderFromRwaIntent } from '@/utils/runtimeOrders';
import { upsertRuntimeOrder } from '@/utils/runtimeOrders';
import { StudioTxStatePanel } from '@/app/components/ui/studio-tx-state-panel';
import { getWalletErrorMessage } from '@/utils/walletErrors';
import { parseOnchainBigIntLike } from '@/utils/onchainNormalization';
import { getCategoryDisplayLabel } from '@/utils/taxonomy';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';
import type { DeliveryAddressRecord } from '@/types/address';
import type { OrderShippingAddressSnapshot } from '@/types/order';
import {
  reconcileOrderFromChain,
  type MarketplaceOrderSnapshot,
} from '@/utils/orderLifecycle';
import { syncOrderProjectionViaBridge } from '@/utils/orderProjectionSync';
import {
  formatDeliveryAddressPreview,
  getPreferredDeliveryAddress,
  loadUserDeliveryAddresses,
} from '@/utils/deliveryAddressUtils';
import { dispatchAppNavigation, navigateToMarketplaceCategory } from '@/utils/appNavigation';

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

function isZeroMarketplaceOrderSnapshot(snapshot: MarketplaceOrderSnapshot) {
  const [
    buyer,
    seller,
    payer,
    refundRecipient,
    paymentToken,
    assetId,
    amount,
    grossPrice,
    proposedAt,
    paidAt,
    autoReleaseAt,
    estDeliverySeconds,
    payDeadline,
    stateValue,
    settlementTypeValue,
    split,
    platformFeeBpsSnapshot,
    daoFeeBpsSnapshot,
    burnFeeBpsSnapshot,
    referralFeeBpsSnapshot,
    finalized,
    sellerConfirmed,
    buyerSig1,
    sellerSig,
    buyerSig2,
  ] = snapshot;

  return (
    buyer.toLowerCase() === ZERO_ADDRESS
    && seller.toLowerCase() === ZERO_ADDRESS
    && payer.toLowerCase() === ZERO_ADDRESS
    && refundRecipient.toLowerCase() === ZERO_ADDRESS
    && paymentToken.toLowerCase() === ZERO_ADDRESS
    && assetId === 0n
    && amount === 0n
    && grossPrice === 0n
    && proposedAt === 0n
    && paidAt === 0n
    && autoReleaseAt === 0n
    && estDeliverySeconds === 0n
    && payDeadline === 0n
    && Number(stateValue) === 0
    && Number(settlementTypeValue) === 0
    && split[0] === 0n
    && split[1] === 0n
    && platformFeeBpsSnapshot === 0n
    && daoFeeBpsSnapshot === 0n
    && burnFeeBpsSnapshot === 0n
    && referralFeeBpsSnapshot === 0n
    && finalized === false
    && sellerConfirmed === false
    && buyerSig1 === '0x'
    && sellerSig === '0x'
    && buyerSig2 === '0x'
  );
}

function parseAssetPriceToBaseUnits(price: string, decimals: number): bigint | null {
  const raw = price.replace(/[^\d.]/g, '');
  if (!raw) return null;
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
} {
  if (currency === 'USDC') {
    return {
      symbol: 'USDC',
      address: PAYMENT_TOKENS.USDC,
    };
  }

  if (currency === 'USDT') {
    return {
      symbol: 'USDT',
      address: PAYMENT_TOKENS.USDT,
    };
  }

  return {
    symbol: 'WBNB',
    address: PAYMENT_TOKENS.WBNB,
  };
}

function formatTokenAmountDisplay(amount: bigint | undefined, decimals: number | null) {
  if (amount === undefined || decimals === null) return '...';
  const formatted = formatUnits(amount, decimals);
  const numeric = Number(formatted);
  if (Number.isFinite(numeric)) {
    return numeric.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: Math.min(decimals, 6),
    });
  }
  return formatted;
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
  unitLabel = 'unit',
  transparentBackdrop = false,
  onClose,
}: RwaBuyOrderSignModalProps) {
  const { address } = useAccount();
  const { assetAddress, chainId, marketplaceAddress, paymentGatewayAddress } = useProtocolDataNetwork();
  const publicClient = usePublicClient({ chainId: chainId ?? undefined });
  const access = useAccessMode();
  const protocolChain = useProtocolChain();
  const { requireWalletActionAsync } = useRequireWalletAction();
  const buyerSig1 = useBuyerSign1();
  const previewSigner = useSignOrder();
  const { createOrder, hash: orderHash, isPending: orderPending, isConfirming: orderConfirming, isConfirmed: orderConfirmed, error: orderError, reset: resetOrder } = useCreateOrder();
  const { data: approvalHash, writeContractAsync: writeApprovalAsync, isPending: approvalPending, error: approvalError, reset: resetApproval } = useWriteContract();
  const { isLoading: approvalConfirming } = useWaitForTransactionReceipt({
    hash: approvalHash,
    chainId: chainId ?? undefined,
  });
  const paymentToken = useMemo(() => resolveProtocolPaymentToken(asset.currency), [asset.currency]);
  const paymentTokenDecimalsRead = useReadContract({
    chainId: chainId ?? undefined,
    address: paymentToken.address,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: Boolean(chainId) },
  });
  const paymentTokenBalanceRead = useReadContract({
    chainId: chainId ?? undefined,
    address: paymentToken.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address && isValidEvmAddress(address) ? [address] : undefined,
    query: { enabled: Boolean(chainId && address && isValidEvmAddress(address)) },
  });
  const paymentTokenAllowanceRead = useReadContract({
    chainId: chainId ?? undefined,
    address: paymentToken.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && isValidEvmAddress(address) && paymentGatewayAddress ? [address, paymentGatewayAddress] : undefined,
    query: { enabled: Boolean(chainId && address && isValidEvmAddress(address) && paymentGatewayAddress) },
  });

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
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [submittedProjectionSynced, setSubmittedProjectionSynced] = useState<boolean | null>(null);

  useEffect(() => {
    if (!orderError) return;
    setSubmittedOrderId(null);
    setSubmittedProjectionSynced(null);
    resetOrder();
  }, [orderError, resetOrder]);

  useEffect(() => {
    if (approvalError) resetApproval();
  }, [address, approvalError, resetApproval]);

  useEffect(() => {
    let active = true;

    if (!address) {
      setPreferredShippingAddress(null);
      return () => {
        active = false;
      };
    }

    void loadUserDeliveryAddresses(address)
      .then((addresses: DeliveryAddressRecord[]) => {
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

  const paymentTokenDecimals = paymentTokenDecimalsRead.data !== undefined
    ? Number(paymentTokenDecimalsRead.data)
    : null;
  const paymentTokenBalance = paymentTokenBalanceRead.data !== undefined
    ? paymentTokenBalanceRead.data as bigint
    : undefined;
  const paymentTokenAllowance = paymentTokenAllowanceRead.data !== undefined
    ? paymentTokenAllowanceRead.data as bigint
    : undefined;

  const unitPriceBase = useMemo(
    () => (paymentTokenDecimals === null ? null : parseAssetPriceToBaseUnits(asset.price, paymentTokenDecimals)),
    [asset.price, paymentTokenDecimals],
  );
  const totalPriceBase = useMemo(
    () => (unitPriceBase !== null ? unitPriceBase * BigInt(quantity) : null),
    [unitPriceBase, quantity]
  );
  const unitPriceNumeric = useMemo(() => {
    const raw = Number.parseFloat(asset.price.replace(/[^\d.]/g, ''));
    return Number.isFinite(raw) ? raw : 0;
  }, [asset.price]);
  const canonicalAssetId = useMemo(
    () => parseOnchainBigIntLike(asset.onchainAssetId ?? asset.tokenId),
    [asset.onchainAssetId, asset.tokenId],
  );
  const sellerAddress = isValidEvmAddress(asset.seller.address) ? asset.seller.address : null;
  const previewOrderId = useMemo(() => BigInt(Date.now()), []);
  const predictedOrderId = buyerSig1.predictedOrderId;
  const canUsePredictedSignature =
    marketplaceAddress !== ZERO_ADDRESS &&
    predictedOrderId !== undefined &&
    canonicalAssetId !== null &&
    sellerAddress !== null &&
    totalPriceBase !== null &&
    address &&
    isValidEvmAddress(address);

  const hasValidOrderData =
    canonicalAssetId !== null &&
    sellerAddress !== null &&
    totalPriceBase !== null &&
    paymentTokenDecimals !== null;
  const orderDataIssues = [
    canonicalAssetId === null ? 'Missing on-chain asset ID' : null,
    sellerAddress === null ? 'Missing seller wallet address' : null,
    totalPriceBase === null ? 'Missing or invalid price/token amount' : null,
    paymentTokenDecimals === null ? 'Payment token metadata unavailable' : null,
  ].filter((issue): issue is string => Boolean(issue));
  const hasEnoughPaymentTokenBalance = totalPriceBase !== null
    && paymentTokenBalance !== undefined
    && paymentTokenBalance >= totalPriceBase;
  const hasEnoughPaymentTokenAllowance = totalPriceBase !== null
    && paymentTokenAllowance !== undefined
    && paymentTokenAllowance >= totalPriceBase;
  const needsApprovalStep = Boolean(signedPayload)
    && totalPriceBase !== null
    && paymentTokenDecimals !== null
    && hasEnoughPaymentTokenBalance
    && !hasEnoughPaymentTokenAllowance;

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
    if (!hasValidOrderData) {
      toast.error('Missing valid order data for signing');
      return;
    }

    const continueSignBuyerIntent = async () => {
      if (!address || !isValidEvmAddress(address) || !sellerAddress || canonicalAssetId === null || totalPriceBase === null) {
        toast.error('Wallet address unavailable. Please reconnect and try again.');
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
            paymentToken: paymentToken.address,
            assetId: canonicalAssetId,
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
            paymentToken: paymentToken.address,
            assetId: canonicalAssetId,
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
        toast.success('Buyer signature created');
      } catch (error) {
        console.error('[RWA Buy Modal] Sign failed:', error);
        toast.error(getWalletErrorMessage(error, 'Failed to sign order intent'));
      }
    };

    if (!(await requireWalletActionAsync({
      capability: 'protocol_order_write',
      actionLabel: 'sign the order',
      fallbackPage: 'marketplace',
      onSecurityCheckConfirmed: continueSignBuyerIntent,
    }))) {
      return;
    }

    await continueSignBuyerIntent();
  };

  const handleApprovePaymentToken = async () => {
    if (totalPriceBase === null || paymentTokenDecimals === null) {
      toast.error('Payment token is not ready yet. Please wait and try again.');
      return;
    }

    if (!hasEnoughPaymentTokenBalance) {
      toast.error(`Insufficient ${paymentToken.symbol} balance for escrow`);
      return;
    }

    const continueApprovePaymentToken = async () => {
      if (!chainId) {
        toast.error('Protocol network is not enabled for token approval');
        return;
      }

      try {
        const currentAllowance = paymentTokenAllowance ?? 0n;

        if (currentAllowance >= totalPriceBase) {
          await paymentTokenAllowanceRead.refetch();
          toast.success(`${paymentToken.symbol} approval already available`);
          return;
        }

        if (!publicClient) {
          toast.error('Protocol client is not ready. Reconnect wallet and try again.');
          return;
        }

        if (currentAllowance > 0n) {
          const resetHash = await writeApprovalAsync({
            chainId,
            address: paymentToken.address,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [paymentGatewayAddress, 0n],
          });

          const resetReceipt = await publicClient.waitForTransactionReceipt({ hash: resetHash });
          if (resetReceipt.status !== 'success') {
            throw new Error(`Failed to reset ${paymentToken.symbol} approval`);
          }
        }

        const approvalTxHash = await writeApprovalAsync({
          chainId,
          address: paymentToken.address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [paymentGatewayAddress, totalPriceBase],
        });

        const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approvalTxHash });
        if (approvalReceipt.status !== 'success') {
          throw new Error(`${paymentToken.symbol} approval transaction reverted`);
        }

        await Promise.all([
          paymentTokenAllowanceRead.refetch(),
          paymentTokenBalanceRead.refetch(),
        ]);

        toast.success(`${paymentToken.symbol} approved for order escrow`);
      } catch (error) {
        console.error('[RWA Modal] Approve payment token failed:', error);
        toast.error(getWalletErrorMessage(error, `Failed to approve ${paymentToken.symbol}`));
      }
    };

    if (!(await requireWalletActionAsync({
      capability: 'protocol_order_write',
      actionLabel: `approve ${paymentToken.symbol}`,
      fallbackPage: 'marketplace',
      onSecurityCheckConfirmed: continueApprovePaymentToken,
    }))) {
      return;
    }

    await continueApprovePaymentToken();
  };

  // ── Step 2: Submit signed order on-chain ──────────────────────
  const handleSubmitOrder = async () => {
    if (!signedPayload || !hasValidOrderData) {
      toast.error('Signature missing — please sign first');
      return;
    }

    if (signedPayload.mode !== 'predicted-live') {
      toast.error('This signature was created in preview mode. Fetch the live order ID and sign again before submitting.');
      return;
    }

    if (!(await requireWalletActionAsync({
      capability: 'protocol_order_write',
      actionLabel: 'submit the order',
      fallbackPage: 'marketplace',
    }))) {
      return;
    }

    if (!hasEnoughPaymentTokenBalance) {
      toast.error(`Insufficient ${paymentToken.symbol} balance for escrow`);
      return;
    }

    if (!hasEnoughPaymentTokenAllowance) {
      toast.error(`Approve ${paymentToken.symbol} for the escrow contract before submitting`);
      return;
    }

    const continueSubmitOrder = async () => {
      try {
        setSubmittedOrderId(null);
        setSubmittedProjectionSynced(null);
        if (!publicClient || !marketplaceAddress) {
          toast.error('Protocol client is not ready. Reconnect wallet and try again.');
          return;
        }

        const liveNextOrderId = await publicClient.readContract({
          chainId: chainId ?? undefined,
          address: marketplaceAddress,
          abi: MARKETPLACE_ABI,
          functionName: 'nextOrderId',
        }) as bigint;

        if (liveNextOrderId !== predictedOrderId) {
          throw new Error('Order ID changed before submission. Please sign again with the latest order slot.');
        }

        const txHash = await createOrder(
          sellerAddress as `0x${string}`,
          paymentToken.address,
          canonicalAssetId,
          BigInt(quantity),
          totalPriceBase,
          estDeliverySeconds,
          signedPayload.signature,
        );

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== 'success') {
          throw new Error('Order transaction reverted before creation was finalized.');
        }

        const baseOrder = createRuntimeOrderFromRwaIntent({
          orderId: predictedOrderId,
          buyer: address,
          asset: {
            ...asset,
            assetUid: asset.assetUid ?? asset.id,
            onchainAssetId: canonicalAssetId,
            assetContract: assetAddress ?? asset.assetContract,
            unitLabel: asset.unitLabel ?? asset.unitName ?? unitLabel,
          },
          quantity,
          grossPrice: totalPriceBase,
          estDeliverySeconds,
          paymentToken: paymentToken.address,
          paymentTokenSymbol: paymentToken.symbol,
          paymentTokenDecimals: paymentTokenDecimals,
          shippingAddressSnapshot: toOrderShippingSnapshot(preferredShippingAddress),
          shippingMethodLabel: preferredShippingAddress ? 'Buyer default delivery address' : undefined,
          selectedAttributes,
          scope: {
            chainId,
            marketplaceContract: marketplaceAddress,
            assetContract: assetAddress,
          },
        });

        const chainOrder = await publicClient.readContract({
          chainId: chainId ?? undefined,
          address: marketplaceAddress,
          abi: MARKETPLACE_ABI,
          functionName: 'orders',
          args: [predictedOrderId],
        }) as unknown as MarketplaceOrderSnapshot;

        if (isZeroMarketplaceOrderSnapshot(chainOrder)) {
          throw new Error('Order transaction confirmed but contract order slot is still empty. Please retry after refreshing the latest order state.');
        }

        const reconciledOrder = reconcileOrderFromChain(baseOrder, chainOrder);
        upsertRuntimeOrder(reconciledOrder, {
          chainId,
          marketplaceContract: marketplaceAddress,
          assetContract: assetAddress,
        });

        const projectionSync = await syncOrderProjectionViaBridge(
          reconciledOrder,
          address,
          {
            chainId,
            marketplaceContract: marketplaceAddress,
            assetContract: assetAddress,
          },
        );

        setSubmittedOrderId(predictedOrderId.toString());
        setSubmittedProjectionSynced(projectionSync.ok);

        toast.success(
          projectionSync.ok
            ? 'Order submitted and synced for seller view'
            : 'Order submitted on-chain. Seller view will update after projection sync.',
        );
      } catch (err) {
        console.error('[RWA Modal] Submit order failed:', err);
        toast.error(getWalletErrorMessage(err, 'Order submission failed'));
      }
    };

    if (!(await requireWalletActionAsync({
      capability: 'protocol_order_write',
      actionLabel: 'submit the order',
      fallbackPage: 'marketplace',
      onSecurityCheckConfirmed: continueSubmitOrder,
    }))) {
      return;
    }

    await continueSubmitOrder();
  };

  const isSigning = buyerSig1.isPending || previewSigner.isPending;
  const signatureError = buyerSig1.error || previewSigner.error;
  const paymentTokenBalanceDisplay = formatTokenAmountDisplay(paymentTokenBalance, paymentTokenDecimals);
  const paymentTokenAllowanceDisplay = formatTokenAmountDisplay(paymentTokenAllowance, paymentTokenDecimals);
  const requiredEscrowDisplay = totalPriceBase !== null
    ? formatTokenAmountDisplay(totalPriceBase, paymentTokenDecimals)
    : '...';
  const signButtonLabel = isSigning
    ? 'Signing…'
    : !protocolChain.isConnected
      ? 'Connect Wallet'
      : access.isAuthPending
        ? 'Unlock Wallet'
        : !protocolChain.isOnProtocolChain
          ? 'Switch Network'
          : 'Sign Order';
  const approveButtonLabel = approvalPending || approvalConfirming
    ? `Approving ${paymentToken.symbol}…`
    : `Approve ${paymentToken.symbol}`;
  const submitButtonLabel = orderPending || orderConfirming
    ? 'Submitting…'
    : orderConfirmed
      ? 'Submitted!'
      : !signedPayload
        ? signButtonLabel
        : signedPayload.mode !== 'predicted-live'
          ? 'Live Order ID Required'
          : !protocolChain.isConnected
            ? 'Connect Wallet'
            : access.isAuthPending
              ? 'Unlock Wallet'
              : !protocolChain.isOnProtocolChain
                ? 'Switch Network'
                : !hasEnoughPaymentTokenBalance
                  ? 'Insufficient Balance'
                  : needsApprovalStep
                    ? approveButtonLabel
                    : !hasEnoughPaymentTokenAllowance
                      ? `Approve ${paymentToken.symbol}`
                      : 'Submit Order';
  const totalDisplay = `${(unitPriceNumeric * quantity).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${asset.currency}`;
  const estTargetLabel = formatDateLong(targetDate);
  const panelSurfaceClass = 'studio-glass-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)]';
  const insetSurfaceClass = 'rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)]';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 ${
          transparentBackdrop ? 'bg-transparent backdrop-blur-[10px]' : 'studio-portal-backdrop bg-black/85 backdrop-blur-[14px]'
        }`}
        onClick={handleOverlayClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-[1] w-full max-w-5xl max-h-[95vh] md:h-[95vh]"
        >
          <div className="studio-modal-theme studio-glass-modal flex w-full max-w-5xl max-h-[95vh] flex-col overflow-hidden rounded-[32px] border border-ui-border-subtle bg-ui-card backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] md:h-[95vh]">
            <div className="studio-glass-header flex items-start justify-between gap-4 border-b border-ui-border-subtle px-6 py-6 md:px-8">
            <div>
              <h3 className="text-2xl font-semibold text-ui-primary">Set Delivery Time</h3>
              <p className="mt-1 text-sm text-ui-secondary">
                Confirm order price, choose delivery duration, and sign Buyer Sig #1.
              </p>
            </div>
            <StudioModalCloseButton onClick={onClose} iconSize={18} className="studio-glass-secondary rounded-full" />
          </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-5 p-6 md:p-8 lg:grid-cols-[1.02fr_0.98fr]">
                <div className="space-y-4">
              {!signedPayload ? (
                <div className={`${panelSurfaceClass} p-3`}>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-lg font-semibold text-ui-primary">{calendarTitle}</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] text-ui-secondary transition-colors hover:text-ui-primary"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] text-ui-secondary transition-colors hover:text-ui-primary"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-1 grid grid-cols-7 gap-1 text-center">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label) => (
                      <div key={label} className="py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ui-muted">
                        {label}
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
                            'aspect-square w-full rounded-lg border text-sm font-semibold transition-colors',
                            isSelected
                              ? 'border-[#2CC295] bg-[#2CC295] text-black shadow-[0_0_0_1px_rgba(44,194,149,0.15)]'
                              : isToday
                                ? 'border-[#2CC295]/60 bg-[#2CC295]/8 text-ui-primary'
                                : 'border-transparent bg-transparent',
                            !isSelected && !isToday && isCurrentMonth ? 'text-ui-secondary hover:bg-[var(--t-surface-2)]' : '',
                            !isCurrentMonth && !isSelected ? 'text-ui-muted' : '',
                            disabled ? 'cursor-not-allowed opacity-35' : '',
                          ].join(' ')}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Compact delivery summary (replaces full calendar after signing) */
                <div className={`${panelSurfaceClass} p-3`}>
                  <div className="flex items-center gap-2.5">
                    <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] text-[#2CC295]">
                      <Calendar size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ui-muted">Delivery</p>
                      <p className="text-sm font-semibold text-ui-primary">{effectiveDeliveryDays} days — {formatDateShort(targetDate)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Buyer Sig card — shown in left column after signing */}
              {signedPayload && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-[28px] border border-[#2CC295]/20 bg-[#2CC295]/8 p-4"
                >
                  <div className="flex items-center gap-2 text-[#2CC295] mb-2">
                    <ShieldCheck size={16} />
                    <p className="text-sm font-semibold">Buyer Sig #1 Ready</p>
                  </div>
                  <p className="mb-2 text-[11px] text-ui-secondary">{signedPayload.note}</p>
                  <div className={`${insetSurfaceClass} p-3`}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ui-muted">Signature</p>
                    <p className="break-all font-mono text-[11px] text-ui-secondary">
                      {signedPayload.signature}
                    </p>
                  </div>
                  {signedPayload.mode !== 'predicted-live' && (
                    <div className="mt-3 rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                      Preview signatures do not match the live on-chain order ID. Re-sign after the live order ID is available.
                    </div>
                  )}
                </motion.div>
              )}

              {/* Escrow Readiness card — shown in left column after signing */}
              {signedPayload && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.06 }}
                  className={`${panelSurfaceClass} p-4`}
                >
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ui-muted">Escrow Readiness</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-ui-secondary">Required</span>
                      <span className="font-semibold text-ui-primary">{requiredEscrowDisplay} {paymentToken.symbol}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-ui-secondary">Wallet Balance</span>
                      <span className="font-semibold text-ui-primary">{paymentTokenBalanceDisplay} {paymentToken.symbol}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-ui-secondary">Approved To Escrow</span>
                      <span className="font-semibold text-ui-primary">{paymentTokenAllowanceDisplay} {paymentToken.symbol}</span>
                    </div>
                  </div>
                  {!hasEnoughPaymentTokenBalance && (
                    <div className="mt-3 rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                      This wallet does not hold enough {paymentToken.symbol} to fund the escrow for this order.
                    </div>
                  )}
                  {hasEnoughPaymentTokenBalance && !hasEnoughPaymentTokenAllowance && (
                    <div className="mt-3 rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                      Approve {paymentToken.symbol} for {requiredEscrowDisplay} before submitting the order on-chain.
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* ── Right Column ── */}
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

              <div className={`${panelSurfaceClass} p-4`}>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ui-muted">Order Summary</p>
                <div className="mb-3 overflow-hidden rounded-[24px] border border-ui-border-subtle">
                  <div className="border-b border-ui-border-subtle bg-[var(--t-surface-2)] px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ui-muted">Delivery Duration</p>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1.2fr] items-stretch gap-0">
                    <div className="flex items-center justify-between bg-[var(--t-surface-2)] px-3 py-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ui-muted">Days</p>
                        <p className="mt-1 text-xl font-semibold text-ui-primary">{effectiveDeliveryDays}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => syncDeliveryDays(deliveryDays + 1)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-1)] text-ui-secondary transition-colors hover:text-ui-primary"
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => syncDeliveryDays(deliveryDays - 1)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-1)] text-ui-secondary transition-colors hover:text-ui-primary"
                        >
                          <Minus size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="w-px bg-ui-border-subtle" />
                    <div className="px-3 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] leading-none whitespace-nowrap text-ui-muted">Target Date</p>
                        <p className="mt-1 text-lg font-semibold text-ui-primary">{estTargetLabel}</p>
                      </div>
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-1)] text-ui-secondary">
                        <Calendar size={16} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ui-primary">{asset.name}</p>
                      <button
                        type="button"
                        onClick={() => navigateToMarketplaceCategory({ category: asset.category })}
                        className="mt-0.5 text-xs text-ui-muted transition-colors hover:text-primary"
                      >
                        {getCategoryDisplayLabel(asset.category)}
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-ui-muted">Qty</p>
                      <p className="text-sm font-semibold text-ui-primary">
                        {quantity} {unitLabel}
                        {quantity > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {selectedAttributes.length > 0 && (
                    <>
                      <div className="h-px bg-ui-border-subtle" />
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ui-muted">
                          Selected Attributes
                        </p>
                        <div className="space-y-2">
                          {selectedAttributes.map((attribute) => (
                            <div
                              key={attribute.groupId}
                              className="flex items-start justify-between gap-3 text-xs"
                            >
                              <span className="text-ui-secondary">{attribute.groupLabel}</span>
                              <span className="text-right font-semibold text-ui-primary">
                                {attribute.values.join(', ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="h-px bg-ui-border-subtle" />
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-ui-secondary">Payment Token</span>
                    <span className="text-right font-semibold text-ui-primary">
                      {paymentToken.symbol}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-ui-secondary">Shipping Snapshot</span>
                    <span className="max-w-[18rem] text-right font-semibold text-ui-primary">
                      {preferredShippingAddress
                        ? formatDeliveryAddressPreview(preferredShippingAddress)
                        : 'No default address saved'}
                    </span>
                  </div>
                  <div className="h-px bg-ui-border-subtle" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ui-primary">Total</span>
                    <div className="text-right">
                      <p className="text-xl font-semibold text-ui-primary">{totalDisplay}</p>
                      {asset.priceUSD && (
                        <p className="text-xs text-ui-muted">
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

              {!hasValidOrderData && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  This listing cannot be signed yet: {orderDataIssues.join(', ')}.
                </div>
              )}

              {/* On-chain tx status */}
              {(orderPending || orderConfirming || orderConfirmed || orderError) && (
                <StudioTxStatePanel
                  className="rounded-[24px]"
                  variant={orderConfirmed ? 'success' : orderError ? 'error' : 'loading'}
                  title={
                    orderConfirmed ? 'Order submitted successfully' :
                      orderError ? `Error: ${orderError.message}` :
                        orderConfirming ? 'Confirming on blockchain…' :
                          'Submitting order…'
                  }
                  description={
                    orderConfirmed
                      ? submittedOrderId
                        ? `Order #${submittedOrderId} is awaiting seller confirmation${submittedProjectionSynced === false ? '. Seller-view sync is still pending.' : '.'}`
                        : 'The order is awaiting seller confirmation.'
                      : undefined
                  }
                  hash={orderHash}
                />
              )}

              {approvalError && !approvalPending && !approvalConfirming && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {approvalError.message}
                </div>
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

                {orderConfirmed ? (
                  <StudioActionButton
                    onClick={() => {
                      dispatchAppNavigation({
                        page: 'orders',
                        orderId: submittedOrderId || undefined,
                      });
                    }}
                    size="lg"
                    className="flex-1 h-[45px] rounded-full justify-center text-sm"
                  >
                    <ExternalLink size={16} />
                    View Orders
                  </StudioActionButton>
                ) : !signedPayload ? (
                  <StudioActionButton
                    onClick={handleSignBuyerIntent}
                    disabled={isSigning}
                    size="lg"
                    className="flex-1 h-[45px] rounded-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {!hasValidOrderData ? 'Listing Data Required' : signButtonLabel}
                  </StudioActionButton>
                ) : (
                  <StudioActionButton
                    onClick={needsApprovalStep ? handleApprovePaymentToken : handleSubmitOrder}
                    disabled={
                      approvalPending
                      || approvalConfirming
                      || orderPending
                      || orderConfirming
                      || orderConfirmed
                      || signedPayload.mode !== 'predicted-live'
                      || paymentTokenDecimals === null
                      || !hasEnoughPaymentTokenBalance
                      || (!needsApprovalStep && !hasEnoughPaymentTokenAllowance)
                    }
                    size="lg"
                    className="flex-1 h-[45px] rounded-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitButtonLabel}
                  </StudioActionButton>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
