import { useState, useMemo, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Package, User, Store, Info, Check, Timer, ExternalLink, AlertTriangle } from 'lucide-react';
import { usePublicClient } from 'wagmi';
import { BaseError } from 'viem';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { formatAddress } from '@/utils/format';
import { MARKETPLACE_ABI } from '@/config/abis';
import { EXPLORER_URLS, PAYMENT_TOKENS } from '@/config/contracts';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { DurationPicker } from '@/app/components/duration-picker';
import { ConfirmDeliveryModal } from '@/app/components/confirm-delivery-modal';
import { OpenDisputeModal } from '@/app/components/open-dispute-modal';
import { DisputeResolutionModal } from '@/app/components/dispute-resolution-modal';
import { OrderDetailsModal } from '@/app/components/order-details-modal';
import { AssetThumb } from '@/app/components/asset-thumb';
import { StudioStatsCard } from '@/app/components/ui/studio-stats-card';
import { StudioSidebarShell, StudioSidebarHeader, StudioSidebarScroll, StudioSidebarFooter } from '@/app/components/ui/studio-sidebar';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioStatusBadge } from '@/app/components/ui/studio-status-badge';
import { StudioProgressBar } from '@/app/components/ui/studio-progress-bar';
import { StudioTimelineItem } from '@/app/components/ui/studio-list-parts';
import { ProtocolChainBanner } from '@/app/components/ui/protocol-chain-banner';
import type { OrderUiRecord } from '@/types/order';
import type { OrderNavigationRequest } from '@/types/orderNavigation';
import { useUserOrders } from '@/hooks/useUserOrders';
import {
  useSellerConfirm,
  usePayOrder,
  useConfirmDelivery,
  useCancelBySeller,
  useCancelByBuyer,
  useOpenDispute,
} from '@/hooks/useMarketplace';
import { useSellerSign2, useBuyerSign3 } from '@/hooks/useEIP712Sign';
import { upsertRuntimeOrder } from '@/utils/runtimeOrders';
import { createDisputeProjection } from '@/utils/disputeCase';
import {
  formatOrderGrossPrice,
  formatOrderQuantity,
  getOrderGrossPriceNumber,
  getOrderShippingDetails,
  hasOrderShippingDetails,
} from '@/utils/orderDisplay';
import {
  canBuyerAcceptRevisedTime,
  canBuyerCancelOrder,
  canConfirmDelivery,
  canOpenDispute,
  canSellerCancelOrder,
  canSellerConfirm,
  canViewerBuyerAcceptRevisedTime,
  canViewerBuyerCancelOrder,
  canViewerConfirmDelivery,
  canViewerOpenDispute,
  canViewerSellerCancelOrder,
  canViewerSellerConfirm,
  getOrderCountdownDeadline,
  getOrderLifecycleLabel,
  getOrderLifecyclePhase,
  isBuyerForOrder,
  isSellerForOrder,
  reconcileOrderFromChain,
  type MarketplaceOrderSnapshot,
} from '@/utils/orderLifecycle';
import { useAccessGuard } from '@/hooks/useAccessGuard';
import { useProtocolChain } from '@/hooks/useProtocolChain';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';
import { syncRuntimeReceiptsForWallet } from '@/utils/runtimeReceipts';
import {
  getWalletErrorMessage,
  isWalletChainMismatchError,
  isWalletRequestPendingError,
} from '@/utils/walletErrors';
import { compareOrdersNewestFirst } from '@/utils/orderSorting';
import { syncOrderProjectionViaBridge } from '@/utils/orderProjectionSync';
import { isOrderCompleted, resolveOrderSemantics } from '@/utils/orderSemantics';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';

const TEAL = '#2CC295';
function NetworkIconEth() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <polygon points="12,2 20,12 12,22 4,12" stroke={TEAL} strokeWidth="1.5" fill="rgba(44,194,149,0.15)" />
      <line x1="12" y1="2" x2="12" y2="22" stroke={TEAL} strokeWidth="1" />
      <line x1="4" y1="12" x2="20" y2="12" stroke={TEAL} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function NetworkIconPolygon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <polygon points="12,3 21,8.5 21,15.5 12,21 3,15.5 3,8.5" stroke="#a855f7" strokeWidth="1.5" fill="rgba(168,85,247,0.15)" />
    </svg>
  );
}

function NetworkIconArbitrum() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#a855f7" strokeWidth="1.5" fill="rgba(168,85,247,0.15)" />
      <path d="M8 16l4-8 4 8" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NetworkIconSolana() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="3" rx="1.5" fill="#f97316" />
      <rect x="3" y="10.5" width="14" height="3" rx="1.5" fill="#f97316" />
      <rect x="3" y="16" width="18" height="3" rx="1.5" fill="#f97316" />
    </svg>
  );
}

function NetworkIconBNB() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill="rgba(234,179,8,0.15)" stroke="#eab308" strokeWidth="1.5" />
      <text x="12" y="16" textAnchor="middle" fontSize="8" fill="#eab308" fontWeight="bold">BNB</text>
    </svg>
  );
}

const NETWORK_OPTIONS = [
  { value: 'all', label: 'All Networks' },
  { value: 'eth', label: 'Ethereum Mainnet', icon: <NetworkIconEth />, tag: 'EVM' },
  { value: 'poly', label: 'Polygon', icon: <NetworkIconPolygon /> },
  { value: 'arb', label: 'Arbitrum One', icon: <NetworkIconArbitrum /> },
  { value: 'sol', label: 'Solana', icon: <NetworkIconSolana /> },
  { value: 'bnb', label: 'BNB Chain', icon: <NetworkIconBNB />, tag: 'EVM' },
];

type OrderActionNoticeTone = 'success' | 'warning' | 'danger';
const ACTION_NOTICE_MS = 4500;

interface OrderActionNoticeState {
  id: number;
  title: string;
  description: string;
  assetName: string;
  assetImage: string;
  assetValueLabel: string;
  tone: OrderActionNoticeTone;
}

function OrderActionNoticeModal({
  notice,
  onClose,
}: {
  notice: OrderActionNoticeState | null;
  onClose: () => void;
}) {
  if (!notice || typeof document === 'undefined') return null;

  const toneStyles = {
    success: {
      iconWrap: 'bg-[#2CC295]/18',
      iconRing: 'ring-1 ring-[#2CC295]/22',
      bar: 'bg-[#2CC295]',
      trailing: <Check className="text-[#2CC295]" size={18} />,
      icon: <Check className="text-[#2CC295]" size={44} strokeWidth={3} />,
    },
    warning: {
      iconWrap: 'bg-amber-500/18',
      iconRing: 'ring-1 ring-amber-500/22',
      bar: 'bg-amber-500',
      trailing: <AlertTriangle className="text-amber-400" size={18} />,
      icon: <AlertTriangle className="text-amber-400" size={44} strokeWidth={3} />,
    },
    danger: {
      iconWrap: 'bg-red-500/18',
      iconRing: 'ring-1 ring-red-500/22',
      bar: 'bg-red-500',
      trailing: <XCircle className="text-red-400" size={18} />,
      icon: <XCircle className="text-red-400" size={44} strokeWidth={2.5} />,
    },
  }[notice.tone];

  return createPortal(
    <div
      className="fixed inset-0 z-[78] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
      onClick={onClose}
    >
      <AnimatePresence>
        <motion.div
          key={notice.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25 }}
          className="bg-[var(--t-card-bg)] border-0 rounded-[24px] shadow-2xl max-w-md w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-12 flex flex-col items-center justify-center space-y-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 220 }}
              className={`w-24 h-24 rounded-full ${toneStyles.iconWrap} ${toneStyles.iconRing} flex items-center justify-center`}
            >
              {toneStyles.icon}
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-4xl font-bold text-ui-primary leading-tight">{notice.title}</h3>
              <p className="text-sm text-ui-secondary">{notice.description}</p>
            </div>

            <div className="w-full p-4 bg-[rgba(255,255,255,0.02)] border-0 rounded-lg">
              <div className="flex items-center gap-3">
                <AssetThumb
                  src={notice.assetImage}
                  alt="Product"
                  className="w-12 h-12 rounded-lg bg-ui-input border border-ui-border-subtle shrink-0"
                />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-bold text-ui-primary leading-tight truncate">{notice.assetName}</p>
                  <p className="text-xs text-ui-muted mt-0.5">{notice.assetValueLabel}</p>
                </div>
                {toneStyles.trailing}
              </div>
            </div>

            <div className="w-full h-1 bg-ui-border-subtle rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, ease: 'linear' }}
                className={`h-full ${toneStyles.bar}`}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  );
}

interface OrdersProps {
  onNavigateToPage?: (page: string) => void;
  navigationRequest?: OrderNavigationRequest | null;
  onConsumeNavigationRequest?: (requestKey: string) => void;
}

export function Orders({ onNavigateToPage, navigationRequest, onConsumeNavigationRequest }: OrdersProps) {
  const { address, walletConnected } = useEffectiveViewer();
  const { assetAddress, chainId, marketplaceAddress, receiptNftAddress } = useProtocolDataNetwork();
  const publicClient = usePublicClient({ chainId: chainId ?? undefined });
  const accessGuard = useAccessGuard(onNavigateToPage);
  const protocolChain = useProtocolChain();
  const activeExplorerUrl = EXPLORER_URLS[chainId ?? 97] ?? 'https://testnet.bscscan.com';
  const activeExplorerLabel =
    chainId === 56 || chainId === 97 ? 'View on BscScan' : 'View on Explorer';
  const { orders: canonicalOrders, isLoading: ordersLoading, refresh: refreshOrders } = useUserOrders(address);
  const sellerConfirmTx = useSellerConfirm();
  const payOrderTx = usePayOrder();
  const confirmDeliveryTx = useConfirmDelivery();
  const cancelBySellerTx = useCancelBySeller();
  const cancelByBuyerTx = useCancelByBuyer();
  const openDisputeTx = useOpenDispute();
  const sellerSign2 = useSellerSign2();
  const buyerSign3 = useBuyerSign3();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('all');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const allOrders = useMemo(() => {
    return [...canonicalOrders].sort(compareOrdersNewestFirst);
  }, [canonicalOrders]);
  const [selectedOrder, setSelectedOrder] = useState<OrderUiRecord | null>(allOrders[0] ?? null);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<bigint | null>(null);
  const [showConfirmDeliveryModal, setShowConfirmDeliveryModal] = useState(false);
  const [showOpenDisputeModal, setShowOpenDisputeModal] = useState(false);
  const [showDisputeResolutionModal, setShowDisputeResolutionModal] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<OrderActionNoticeState | null>(null);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);
  const formatOrderValueLabel = (order: OrderUiRecord) =>
    formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals);
  const formatOrderQuantityLabel = (order: OrderUiRecord) =>
    formatOrderQuantity(order.amount, order.unitLabel, order.unitName);
  const receiptSyncScope = useMemo(() => ({
    chainId,
    marketplaceContract: marketplaceAddress,
    assetContract: assetAddress,
    receiptContract: receiptNftAddress,
  }), [assetAddress, chainId, marketplaceAddress, receiptNftAddress]);
  const selectedOrderShipping = getOrderShippingDetails(
    selectedOrder?.shippingAddressSnapshot,
    selectedOrder?.shippingMethodLabel,
  );

  // Auto-update timers
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTimeSec = Math.floor(currentTime / 1000);

  const requireBuyerRole = (order: OrderUiRecord, actionLabel: string) => {
    if (!address) {
      accessGuard.denyToGuest('orders');
      return false;
    }
    if (!isBuyerForOrder(order, address)) {
      showActionNotice('warning', 'Buyer Action Only', `Only the buyer can ${actionLabel} for this order.`, order);
      return false;
    }
    return true;
  };

  const requireSellerRole = (order: OrderUiRecord, actionLabel: string) => {
    if (!address) {
      accessGuard.denyToGuest('orders');
      return false;
    }
    if (!isSellerForOrder(order, address)) {
      showActionNotice('warning', 'Seller Action Only', `Only the seller can ${actionLabel} for this order.`, order);
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!allOrders.length) {
      if (selectedOrder !== null) {
        setSelectedOrder(null);
      }
      return;
    }
    if (!selectedOrder) {
      setSelectedOrder(allOrders[0]);
      return;
    }
    const matchedOrder = allOrders.find((order) => order.orderId === selectedOrder.orderId);
    if (matchedOrder) {
      if (matchedOrder !== selectedOrder) {
        setSelectedOrder(matchedOrder);
      }
      return;
    }
    setSelectedOrder(allOrders[0]);
  }, [allOrders, selectedOrder]);

  useEffect(() => {
    if (!navigationRequest?.orderId) return;

    const requestedOrderId = navigationRequest.orderId.trim();
    if (!requestedOrderId) {
      onConsumeNavigationRequest?.(navigationRequest.requestKey);
      return;
    }

    setSelectedNetwork('all');
    setSelectedFilter('all');
    setSearchQuery(requestedOrderId);

    const matchedOrder = allOrders.find((order) => order.orderId.toString() === requestedOrderId);
    if (matchedOrder) {
      setSelectedOrder(matchedOrder);
      onConsumeNavigationRequest?.(navigationRequest.requestKey);
      return;
    }

    if (ordersLoading) {
      return;
    }

    onConsumeNavigationRequest?.(navigationRequest.requestKey);
  }, [allOrders, navigationRequest, onConsumeNavigationRequest, ordersLoading]);

  const resolveOrderById = (orderId: bigint | null) => {
    if (orderId === null) return undefined;
    return allOrders.find((order) => order.orderId === orderId);
  };

  const getActionKey = (action: string, orderId: bigint) => `${action}:${orderId.toString()}`;

  const waitForMarketplaceReceipt = async (hash: `0x${string}`) => {
    if (!publicClient || !chainId || !marketplaceAddress) {
      throw new Error('Public client unavailable');
    }
    return publicClient.waitForTransactionReceipt({ hash });
  };

  const rereadOrderFromChain = async (order: OrderUiRecord) => {
    if (!publicClient) {
      throw new Error('Public client unavailable');
    }

    const chainOrder = await publicClient.readContract({
      chainId: chainId ?? undefined,
      address: marketplaceAddress,
      abi: MARKETPLACE_ABI,
      functionName: 'orders',
      args: [order.orderId],
    }) as unknown as MarketplaceOrderSnapshot;

    return reconcileOrderFromChain(order, chainOrder);
  };

  const syncOrderAfterWrite = async (order: OrderUiRecord) => {
    const reconciledOrder = await rereadOrderFromChain(order);
    upsertRuntimeOrder(reconciledOrder);
    void syncOrderProjectionViaBridge(reconciledOrder, address, {
      chainId,
      marketplaceContract: marketplaceAddress,
      assetContract: assetAddress,
    }).catch((error) => {
      console.warn('[Orders] Failed to sync order projection via bridge', {
        orderId: reconciledOrder.orderId.toString(),
        error,
      });
    });
    setSelectedOrder(reconciledOrder);
    void refreshOrders();
    return reconciledOrder;
  };

  const syncReceiptProjectionAfterFinalize = async (
    order: OrderUiRecord,
    blockNumber?: bigint,
  ) => {
    try {
      const scopedBlockNumber = blockNumber !== undefined ? Number(blockNumber) : undefined;
      const result = await syncRuntimeReceiptsForWallet(order.buyer, receiptSyncScope, {
        fromBlock: scopedBlockNumber,
        toBlock: scopedBlockNumber,
        promptOnAuthMissing: false,
      });
      if (!result) {
        return ' Receipt NFT projection will appear after the next authenticated sync.';
      }

      const matchedReceipt = result.ownedReceipts.some((receiptAsset) => receiptAsset.orderId === order.orderId.toString());
      return matchedReceipt
        ? ' Receipt NFT projection refreshed and is ready in Assets.'
        : ' Receipt sync completed, but the finalized receipt row is not indexed yet.';
    } catch (error) {
      console.warn('[Orders] Receipt sync after finalize failed', {
        orderId: order.orderId.toString(),
        error,
      });
      return ' Receipt sync trigger failed; refresh Assets after the next background sync.';
    }
  };

  const shortTxHash = (hash: `0x${string}`) => `${hash.slice(0, 10)}...${hash.slice(-6)}`;

  const formatOnChainDateTime = (timestamp?: bigint) => {
    if (!timestamp || timestamp <= 0n) return 'n/a';
    const millis = Number(timestamp) * 1000;
    if (!Number.isFinite(millis)) return timestamp.toString();
    return new Date(millis).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    });
  };

  const describeOnChainOrderState = (order: OrderUiRecord) => {
    const phase = getOrderLifecyclePhase(order, currentTimeSec);

    switch (phase) {
      case 'waiting_seller_confirm':
        return `Buyer Sig #1 is locked in. Seller has until ${formatOnChainDateTime(getOrderCountdownDeadline(order, currentTimeSec))} to accept, revise delivery time, or cancel. Buyer is waiting only. If seller does nothing, the order becomes auto-cancelable after this window.`;
      case 'seller_confirm_expired':
        return 'Seller confirm window expired. No manual party action remains in phase 1, and the auto-time flow can now cancel this pending order on-chain.';
      case 'waiting_buyer_accept':
        return `Seller changed the delivery time. Buyer Sig #3 is required before ${formatOnChainDateTime(order.payDeadline)} to lock the order. Buyer may cancel instead during this same 24-hour window.`;
      case 'buyer_accept_expired':
        return 'Buyer re-sign window expired. No manual party action remains in phase 2, and the auto-time flow can now cancel this pending order on-chain.';
      case 'agreed_delivery':
        return order.disputeDeadline && order.disputeDeadline > 0n
          ? `Agreed delivery time is active until ${formatOnChainDateTime(order.autoReleaseAt)}. Buyer can confirm delivery earlier. When this timer ends, Awaiting Auto Finalize begins and buyer may still either confirm delivery or open dispute until ${formatOnChainDateTime(order.disputeDeadline)}.`
          : `Agreed delivery time is active until ${formatOnChainDateTime(order.autoReleaseAt)}. Buyer can confirm delivery earlier, then the order moves into Awaiting Auto Finalize before protocol finalization.`;
      case 'awaiting_auto_finalize':
        return order.disputeDeadline && order.disputeDeadline > 0n
          ? `Agreed delivery time ended. This is the 3-day Awaiting Auto Finalize window. Buyer may still confirm delivery or open dispute until ${formatOnChainDateTime(order.disputeDeadline)}. If no buyer action happens, protocol auto-finalize takes over at that deadline.`
          : 'Agreed delivery time ended. This is the Awaiting Auto Finalize window before protocol finalization.';
      case 'auto_finalize_ready':
        return 'Agreed delivery time and the 3-day Awaiting Auto Finalize window are over. Order is now waiting for protocol auto-finalize execution.';
      case 'disputed':
        return order.disputeDeadline && order.disputeDeadline > 0n
          ? `On-chain DISPUTED. Arbiter flow remains open until ${formatOnChainDateTime(order.disputeDeadline)}.`
          : 'On-chain DISPUTED. Arbiter resolution is required before settlement can complete.';
      case 'finalized':
        return 'On-chain FINALIZED. Receipt and asset settlement should already be complete.';
      case 'cancelled':
        return 'On-chain CANCELLED. Escrow should already be refunded or closed.';
      default:
        return 'On-chain state is being refreshed.';
    }
  };

  const extractTxFailureReason = (error: unknown) => {
    if (error instanceof BaseError) {
      return error.shortMessage || error.details || error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Transaction failed before on-chain finalization.';
  };

  const syncOrderForDiagnostics = async (order: OrderUiRecord) => {
    try {
      return await syncOrderAfterWrite(order);
    } catch (syncError) {
      console.warn('Failed to refresh order from chain for diagnostics', {
        orderId: order.orderId.toString(),
        syncError,
      });
      return order;
    }
  };

  const getOrderChainHint = (order: OrderUiRecord) => {
    const phase = getOrderLifecyclePhase(order, currentTimeSec);

    if (phase === 'finalized' || phase === 'cancelled') return null;

    if (phase === 'waiting_seller_confirm') {
      if (isSellerForOrder(order, address)) {
        return 'Seller has 24 hours to accept the current agreed delivery time, revise it, or cancel the order. Buyer cannot cancel in this phase.';
      }
      if (isBuyerForOrder(order, address)) {
        return 'Buyer Sig #1 is already submitted. Buyer now waits for seller confirm or seller cancel within the 24-hour seller window.';
      }
      return 'Waiting for seller confirm within the 24-hour seller window.';
    }

    if (phase === 'waiting_buyer_accept') {
      return isBuyerForOrder(order, address)
        ? 'Seller revised the agreed delivery time. Buyer now has 24 hours to re-sign from this Orders card or cancel the order before lock.'
        : 'Waiting for buyer Sig #3 during the 24-hour buyer re-sign window before lock can happen.';
    }

    if (phase === 'seller_confirm_expired') {
      return 'Seller did not act within 24 hours. The order is now pending auto-cancel on-chain.';
    }

    if (phase === 'buyer_accept_expired') {
      return 'Buyer did not re-sign within 24 hours. The order is now pending auto-cancel on-chain.';
    }

    if (phase === 'agreed_delivery') {
      return isBuyerForOrder(order, address)
        ? 'This countdown is the agreed delivery time set by buyer and seller. Buyer can confirm early, and if that timer ends the 3-day Awaiting Auto Finalize window opens.'
        : isSellerForOrder(order, address)
          ? 'This countdown is the agreed delivery time. Seller waits for buyer confirm or for the order to move into Awaiting Auto Finalize.'
          : 'This countdown is the agreed delivery time. Delivery confirmation is buyer-only.';
    }

    if (phase === 'awaiting_auto_finalize') {
      return isBuyerForOrder(order, address)
        ? 'This 3-day countdown is Awaiting Auto Finalize. During this window the buyer may still confirm delivery or open dispute; otherwise protocol auto-finalize takes over at the end.'
        : isSellerForOrder(order, address)
          ? 'This 3-day countdown is Awaiting Auto Finalize. Seller is waiting for buyer confirm, buyer dispute, or protocol auto-finalize.'
          : 'This 3-day countdown is Awaiting Auto Finalize. Waiting for buyer confirm, buyer dispute, or protocol auto-finalize at the end of the window.';
    }

    if (phase === 'auto_finalize_ready') {
      return 'No party action remains. The Awaiting Auto Finalize window has ended, and protocol auto-finalize execution is now pending.';
    }

    if (phase === 'disputed') {
      return 'Escrow is frozen in dispute resolution.';
    }

    return describeOnChainOrderState(order);
  };

  const showActionNotice = (
    tone: OrderActionNoticeTone,
    title: string,
    description: string,
    orderForNotice: OrderUiRecord,
  ) => {
    const id = Date.now();
    setActionNotice({
      id,
      tone,
      title,
      description,
      assetName: orderForNotice.assetName,
      assetImage: orderForNotice.assetImage,
      assetValueLabel: formatOrderGrossPrice(
        orderForNotice.grossPrice,
        orderForNotice.paymentTokenSymbol,
        orderForNotice.paymentTokenDecimals,
      ),
    });

    window.setTimeout(() => {
      setActionNotice((current) => (current?.id === id ? null : current));
    }, ACTION_NOTICE_MS);
  };

  const showWalletActionFailure = (
    orderForNotice: OrderUiRecord,
    title: string,
    error: unknown,
    fallbackMessage: string,
  ) => {
    const pending = isWalletRequestPendingError(error);
    const wrongNetwork = isWalletChainMismatchError(error);
    showActionNotice(
      pending || wrongNetwork ? 'warning' : 'danger',
      pending ? 'Wallet Request Pending' : wrongNetwork ? 'Wrong Network' : title,
      getWalletErrorMessage(error, fallbackMessage),
      orderForNotice,
    );
  };

  const handleSwitchProtocolChain = async () => {
    await protocolChain.ensureProtocolChainAsync('continue with order actions');
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = allOrders;

    if (selectedNetwork !== 'all') {
      filtered = filtered.filter(o => o.network === selectedNetwork);
    }

    if (selectedFilter !== 'all') {
      const state = parseInt(selectedFilter);
      filtered = filtered.filter(o => o.state === state);
    }

    if (searchQuery) {
      filtered = filtered.filter(o =>
        o.orderId.toString().includes(searchQuery) ||
        o.assetName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [allOrders, searchQuery, selectedFilter, selectedNetwork]);

  // Stats
  const stats = useMemo(() => ({
    total: allOrders.length,
    active: allOrders.filter((order) => !resolveOrderSemantics(order).isClosed).length,
    completed: allOrders.filter((order) => isOrderCompleted(order)).length,
    volume: allOrders.reduce((sum, order) => sum + getOrderGrossPriceNumber(order.grossPrice, order.paymentTokenDecimals), 0),
  }), [allOrders]);

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedNetwork !== 'all' || selectedFilter !== 'all';

  if (!selectedOrder) {
    return (
      <>
        <section className="bg-ui-page overflow-y-auto hidden-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .hidden-scrollbar::-webkit-scrollbar { display: none; }
          `}</style>
          <div className="p-8">
            <div className="mb-6">
              <ProtocolChainBanner
                isConnected={walletConnected}
                isOnProtocolChain={protocolChain.isOnProtocolChain}
                currentChainLabel={protocolChain.currentChainLabel}
                targetChainLabel={protocolChain.targetChainLabel}
                isSwitching={protocolChain.isSwitching}
                onSwitch={handleSwitchProtocolChain}
              />
            </div>

            <div className="flex items-center justify-start mb-8">
              <div className="flex w-full flex-wrap lg:flex-nowrap gap-3">
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-muted" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Order ID..."
                    className="w-full h-[48px] rounded-full bg-[var(--t-card-bg)] border border-ui-border-subtle pl-11 pr-4 text-sm font-medium tracking-[-0.01em] text-ui-primary placeholder:text-ui-muted outline-none"
                  />
                </div>
                <CustomDropdown
                  options={NETWORK_OPTIONS}
                  defaultValue={selectedNetwork}
                  onChange={(value) => setSelectedNetwork(value)}
                  variant="compact"
                  splitRightPane={false}
                  className="min-w-[210px] shrink-0"
                />
                <CustomDropdown
                  options={[
                    { value: 'all', label: 'Filter Status' },
                    { value: '0', label: 'Pending Confirm' },
                    { value: '1', label: 'Paid' },
                    { value: '2', label: 'Disputed' },
                    { value: '3', label: 'Finalized' }
                  ]}
                  defaultValue={selectedFilter}
                  onChange={(value) => setSelectedFilter(value)}
                  variant="compact"
                  splitRightPane={false}
                  className="min-w-[180px] shrink-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              <StudioStatsCard label="Total Orders" value={stats.total.toLocaleString()} className="bg-[var(--t-card-bg)] border-0 backdrop-blur-[10px]" />
              <StudioStatsCard label="Active Escrow" value={stats.active} className="bg-[var(--t-card-bg)] border-0 backdrop-blur-[10px]" />
              <StudioStatsCard label="Completed" value={stats.completed.toLocaleString()} className="bg-[var(--t-card-bg)] border-0 backdrop-blur-[10px]" />
              <StudioStatsCard label="Volume" value={stats.volume.toFixed(2)} className="bg-[var(--t-card-bg)] border-0 backdrop-blur-[10px]" />
            </div>

            <div className="rounded-[24px] bg-[var(--t-card-bg)] border-0 backdrop-blur-[10px] p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(255,255,255,0.04)]">
                <Package className="text-ui-muted" size={24} />
              </div>
              <h3 className="text-xl font-bold text-ui-primary">
                {hasActiveFilters ? 'No Orders Match Current Filters' : 'No Canonical Orders Yet'}
              </h3>
              <p className="mx-auto mt-2 max-w-[540px] text-sm leading-6 text-ui-muted">
                {hasActiveFilters
                  ? 'The current search or filter combination returned no canonical on-chain orders. Clear the filters or search for another order.'
                  : 'This page now reads only canonical runtime and on-chain order data. Create an order or let the runtime projection sync before using the order workflow.'}
              </p>
            </div>
          </div>
        </section>

        <StudioSidebarShell widthClassName="w-full" className="bg-ui-page border-l-0 p-2.5">
          <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
            <StudioSidebarHeader className="p-5 border-b border-[var(--t-border-subtle)]">
              <h2 className="text-ui-primary font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                <CheckCircle className="text-primary" size={18} />
                Order Summary
              </h2>
              <p className="text-xs text-ui-muted mt-1">Waiting for canonical order data</p>
            </StudioSidebarHeader>
            <StudioSidebarScroll className="p-4">
              <div className="rounded-[24px] bg-[rgba(255,255,255,0.02)] p-5 text-sm leading-6 text-ui-muted">
                No order is selected because there are no canonical orders for the current wallet and filters.
              </div>
            </StudioSidebarScroll>
            <StudioSidebarFooter className="border-t border-[var(--t-border-subtle)] p-4 bg-transparent backdrop-blur-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-ui-muted uppercase">Node Health</span>
                <span className="text-[10px] font-black text-primary flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <StudioStatusBadge variant="success" className="border-0 bg-transparent p-0 text-[10px]">
                    SYNCED
                  </StudioStatusBadge>
                </span>
              </div>
              <StudioActionButton
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open(`${activeExplorerUrl}/address/${marketplaceAddress}`, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="w-full py-2.5 rounded-xl text-[11px] uppercase tracking-wider"
                leftIcon={<ExternalLink size={14} />}
              >
                {activeExplorerLabel}
              </StudioActionButton>
            </StudioSidebarFooter>
          </div>
        </StudioSidebarShell>
      </>
    );
  }

  // Format countdown timer
  const formatCountdown = (deadline: bigint) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = Number(deadline) - now;
    if (diff <= 0) return '00:00:00';

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Parse countdown to components (days, hours, mins, secs)
  const parseCountdown = (deadline: bigint) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = Number(deadline) - now;
    if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };

    const days = Math.floor(diff / (3600 * 24));
    const hours = Math.floor((diff % (3600 * 24)) / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;

    return { days, hours, mins, secs };
  };

  const getOrderBadgeVariant = (order: OrderUiRecord) => {
    switch (getOrderLifecyclePhase(order, currentTimeSec)) {
      case 'waiting_seller_confirm':
      case 'waiting_buyer_accept':
        return 'warning';
      case 'agreed_delivery':
        return 'success';
      case 'awaiting_auto_finalize':
      case 'disputed':
      case 'seller_confirm_expired':
      case 'buyer_accept_expired':
        return 'danger';
      case 'auto_finalize_ready':
        return 'muted';
      case 'finalized':
        return 'info';
      default:
        return 'muted';
    }
  };

  const getOrderCountdownTitle = (order: OrderUiRecord) => {
    switch (getOrderLifecyclePhase(order, currentTimeSec)) {
      case 'waiting_seller_confirm':
      case 'seller_confirm_expired':
        return 'Seller Window';
      case 'waiting_buyer_accept':
      case 'buyer_accept_expired':
        return 'Buyer Re-Sign';
      case 'agreed_delivery':
        return 'Agreed Delivery';
      case 'awaiting_auto_finalize':
        return 'Awaiting Auto Finalize';
      default:
        return null;
    }
  };

  // Handle seller confirm
  const handleSellerConfirm = (orderId: bigint) => {
    const order = resolveOrderById(orderId);
    if (!order) return;
    if (!requireSellerRole(order, 'confirm the delivery time')) return;
    if (!canSellerConfirm(order)) {
      if (order) {
        showActionNotice('warning', 'Order Already Updated', 'This order is no longer waiting for seller confirmation.', order);
      }
      return;
    }
    setSelectedOrder(order);
    setConfirmingOrderId(orderId);
    setShowDurationPicker(true);
  };

  const handleDurationConfirm = async (days: number, targetDate: Date) => {
    const order = resolveOrderById(confirmingOrderId);
    if (!order) {
      setShowDurationPicker(false);
      setConfirmingOrderId(null);
      return;
    }

    if (!(await protocolChain.ensureProtocolChainAsync('seller confirm the delivery time'))) {
      return;
    }

    const actionKey = getActionKey('sellerConfirm', order.orderId);
    if (activeActionKey === actionKey) return;
    try {
      const currentOrder = await rereadOrderFromChain(order);
      if (!canSellerConfirm(currentOrder)) {
        showActionNotice('warning', 'Order Already Updated', 'This order is no longer waiting for seller confirmation.', currentOrder);
        return;
      }

      setActiveActionKey(actionKey);
      const estDeliverySeconds = BigInt(days) * 24n * 60n * 60n;
      const sellerChangedTime = currentOrder.estDeliverySeconds !== estDeliverySeconds;
      const sellerSig = await sellerSign2.sign({
        orderId: currentOrder.orderId,
        buyer: currentOrder.buyer,
        paymentToken: currentOrder.paymentToken,
        assetId: currentOrder.assetId,
        grossPrice: currentOrder.grossPrice,
        amount: currentOrder.amount,
        estDeliverySeconds,
      });
      const txHash = await sellerConfirmTx.sellerConfirm(currentOrder.orderId, estDeliverySeconds, sellerSig);
      await waitForMarketplaceReceipt(txHash);
      const reconciledOrder = await syncOrderAfterWrite(currentOrder);
      showActionNotice(
        'success',
        sellerChangedTime ? 'Seller Updated Delivery Time' : 'Seller Accepted Buyer Time',
        sellerChangedTime
          ? 'Buyer Sig #3 is now required to accept the revised delivery time.'
          : 'Seller kept the buyer delivery time, so the order locks immediately.',
        reconciledOrder,
      );
    } catch (error) {
      console.error('sellerConfirm failed', { orderId: order.orderId.toString(), days, targetDate, error });
      showWalletActionFailure(
        order,
        'Seller Confirmation Failed',
        error,
        'Seller confirmation failed before the wallet request completed.',
      );
    } finally {
      setActiveActionKey((current) => (current === actionKey ? null : current));
      setShowDurationPicker(false);
      setConfirmingOrderId(null);
    }
  };

  const handleDurationCancel = () => {
    setShowDurationPicker(false);
    setConfirmingOrderId(null);
  };

  const handleSellerCancelOrder = async (orderId: bigint) => {
    const order = resolveOrderById(orderId);
    if (!order) return;
    if (!requireSellerRole(order, 'cancel this order')) return;

    if (!(await protocolChain.ensureProtocolChainAsync('cancel this order as seller'))) {
      return;
    }

    const actionKey = getActionKey('cancelBySeller', order.orderId);
    if (activeActionKey === actionKey) return;

    try {
      const currentOrder = await rereadOrderFromChain(order);
      if (!canSellerCancelOrder(currentOrder)) {
        showActionNotice('warning', 'Order Already Updated', 'This order can no longer be cancelled by the seller.', currentOrder);
        return;
      }

      setActiveActionKey(actionKey);
      const txHash = await cancelBySellerTx.cancelBySeller(currentOrder.orderId);
      await waitForMarketplaceReceipt(txHash);
      const reconciledOrder = await syncOrderAfterWrite(currentOrder);
      showActionNotice('warning', 'Order Cancelled By Seller', 'Seller cancelled during the initial 24-hour decision window. Escrow has been refunded.', reconciledOrder);
    } catch (error) {
      console.error('cancelBySeller failed', { orderId: order.orderId.toString(), error });
      showWalletActionFailure(
        order,
        'Seller Cancel Failed',
        error,
        'Seller cancellation failed before the wallet request completed.',
      );
    } finally {
      setActiveActionKey((current) => (current === actionKey ? null : current));
    }
  };

  // Handle confirm delivery
  const handleConfirmDelivery = (orderId: bigint) => {
    const order = resolveOrderById(orderId);
    if (!order) return;
    if (!requireBuyerRole(order, 'confirm delivery')) return;
    if (!canConfirmDelivery(order)) {
      showActionNotice('warning', 'Order Not Actionable', 'This order is no longer in the delivery confirmation window.', order);
      return;
    }
    setSelectedOrder(order);
    setShowConfirmDeliveryModal(true);
  };

  const handleDeliveryConfirm = async () => {
    const order = resolveOrderById(selectedOrder.orderId);
    if (!order) {
      setShowConfirmDeliveryModal(false);
      return;
    }

    if (!(await protocolChain.ensureProtocolChainAsync('confirm delivery'))) {
      return;
    }

    const actionKey = getActionKey('confirmDelivery', order.orderId);
    if (activeActionKey === actionKey) return;
    try {
      const currentOrder = await rereadOrderFromChain(order);
      if (!canConfirmDelivery(currentOrder)) {
        const currentOrderSemantics = resolveOrderSemantics(currentOrder);
        showActionNotice(
          'warning',
          currentOrderSemantics.isCompleted ? 'Order Already Finalized' : currentOrderSemantics.isCancelled ? 'Order Cancelled' : 'Order Not Actionable',
          currentOrderSemantics.isCompleted
            ? 'This order has already been finalized on-chain.'
            : currentOrderSemantics.isCancelled
              ? 'This order was cancelled on-chain.'
              : describeOnChainOrderState(currentOrder),
          currentOrder,
        );
        return;
      }

      setActiveActionKey(actionKey);
      const txHash = await confirmDeliveryTx.confirmDelivery(currentOrder.orderId);
      const receipt = await waitForMarketplaceReceipt(txHash);
      if (receipt.status !== 'success') {
        const latestOrder = await syncOrderForDiagnostics(currentOrder);
        showActionNotice(
          'danger',
          'Delivery Tx Reverted',
          `${describeOnChainOrderState(latestOrder)} Tx ${shortTxHash(txHash)} reverted before finalization.`,
          latestOrder,
        );
        return;
      }
      const reconciledOrder = await syncOrderAfterWrite(currentOrder);
      if (isOrderCompleted(reconciledOrder)) {
        const receiptProjectionMessage = await syncReceiptProjectionAfterFinalize(reconciledOrder, receipt.blockNumber);
        showActionNotice(
          'success',
          'Delivery Finalized On-Chain',
          `Order finalized successfully on-chain. Tx ${shortTxHash(txHash)} has been reconciled with the runtime projection.${receiptProjectionMessage}`,
          reconciledOrder,
        );
        return;
      }

      showActionNotice(
        'warning',
        'Chain Still Shows PAID',
        `${describeOnChainOrderState(reconciledOrder)} Tx ${shortTxHash(txHash)} mined, but no finalization was detected.`,
        reconciledOrder,
      );
    } catch (error) {
      console.error('confirmDelivery failed', { orderId: order.orderId.toString(), error });
      const latestOrder = await syncOrderForDiagnostics(order);
      const walletMessage = getWalletErrorMessage(error, extractTxFailureReason(error));
      const pending = isWalletRequestPendingError(error);
      const wrongNetwork = isWalletChainMismatchError(error);
      showActionNotice(
        pending || wrongNetwork ? 'warning' : 'danger',
        pending ? 'Wallet Request Pending' : wrongNetwork ? 'Wrong Network' : 'Delivery Not Finalized',
        `${walletMessage} ${describeOnChainOrderState(latestOrder)}`,
        latestOrder,
      );
    } finally {
      setActiveActionKey((current) => (current === actionKey ? null : current));
      setShowConfirmDeliveryModal(false);
    }
  };

  // Handle open dispute
  const handleOpenDispute = (orderId: bigint) => {
    const order = resolveOrderById(orderId);
    if (!order) return;
    if (!requireBuyerRole(order, 'open dispute')) return;
    if (!canOpenDispute(order)) {
      showActionNotice('warning', 'Dispute Window Closed', 'This order cannot open a dispute in its current on-chain state.', order);
      return;
    }
    setSelectedOrder(order);
    setShowOpenDisputeModal(true);
  };

  const handleDisputeConfirm = async (reason: string[], comment: string, evidenceUrls: string[]) => {
    const order = resolveOrderById(selectedOrder.orderId);
    if (!order) {
      setShowOpenDisputeModal(false);
      return;
    }

    if (!(await protocolChain.ensureProtocolChainAsync('open dispute'))) {
      return;
    }

    const actionKey = getActionKey('openDispute', order.orderId);
    if (activeActionKey === actionKey) return;
    try {
      const currentOrder = await rereadOrderFromChain(order);
      if (!canOpenDispute(currentOrder)) {
        showActionNotice('warning', 'Dispute Window Closed', 'This order cannot open a dispute in its current on-chain state.', currentOrder);
        return;
      }

      setActiveActionKey(actionKey);
      const txHash = await openDisputeTx.openDispute(currentOrder.orderId);
      await waitForMarketplaceReceipt(txHash);
      const reconciledOrder = await syncOrderAfterWrite(currentOrder);
      const projectedOrder = createDisputeProjection(reconciledOrder, {
        reasons: reason,
        comment,
        evidenceUrls,
        openerRole: 'buyer',
        openerAddress: currentOrder.buyer,
      });
      upsertRuntimeOrder(projectedOrder);
      setSelectedOrder(projectedOrder);
      showActionNotice('warning', 'Dispute Opened', 'Arbiter notified and escrow is now frozen.', reconciledOrder);
    } catch (error) {
      console.error('openDispute failed', { orderId: order.orderId.toString(), error });
      showWalletActionFailure(
        order,
        'Open Dispute Failed',
        error,
        'Dispute request failed before the wallet request completed.',
      );
    } finally {
      setActiveActionKey((current) => (current === actionKey ? null : current));
      setShowOpenDisputeModal(false);
    }
  };

  const handleDisputeCancel = () => {
    setShowOpenDisputeModal(false);
  };

  // Handle dispute resolution
  const handleDisputeResolution = (orderId: bigint) => {
    const order = resolveOrderById(orderId);
    if (order) {
      setSelectedOrder(order);
      setShowDisputeResolutionModal(true);
    }
  };

  const handleResolutionConfirm = () => {
    console.log('Dispute resolved for order:', selectedOrder.orderId.toString());
    // TODO: Call smart contract resolveDispute(orderId)
    const order = resolveOrderById(selectedOrder.orderId);
    if (order) {
      showActionNotice('success', 'Dispute Resolved', 'Settlement has been finalized for this dispute.', order);
    }
    setShowDisputeResolutionModal(false);
  };

  const handleResolutionCancel = () => {
    setShowDisputeResolutionModal(false);
  };

  // Handle buyer confirm order (Sig 2 + Pay)
  const handleBuyerConfirmOrder = async (orderId: bigint) => {
    const order = resolveOrderById(orderId);
    if (!order) return;
    if (!requireBuyerRole(order, 're-sign the revised delivery time')) return;

    if (!(await protocolChain.ensureProtocolChainAsync('re-sign the revised delivery time'))) {
      return;
    }

    const actionKey = getActionKey('payOrder', order.orderId);
    if (activeActionKey === actionKey) return;

    try {
      const currentOrder = await rereadOrderFromChain(order);
      if (!canBuyerAcceptRevisedTime(currentOrder)) {
        showActionNotice('warning', 'Order Already Updated', 'Buyer Sig #3 is no longer required for this order.', currentOrder);
        return;
      }

      setActiveActionKey(actionKey);
      const buyerSig2 = await buyerSign3.sign({
        orderId: currentOrder.orderId,
        seller: currentOrder.seller,
        paymentToken: currentOrder.paymentToken,
        assetId: currentOrder.assetId,
        grossPrice: currentOrder.grossPrice,
        amount: currentOrder.amount,
        estDeliverySeconds: currentOrder.estDeliverySeconds,
      });
      const txHash = await payOrderTx.payOrder(currentOrder.orderId, buyerSig2);
      await waitForMarketplaceReceipt(txHash);
      const reconciledOrder = await syncOrderAfterWrite(currentOrder);
      showActionNotice('success', 'Buyer Accepted Revised Time', 'Buyer Sig #3 submitted. Asset lock and escrow payment are now active.', reconciledOrder);
    } catch (error) {
      console.error('payOrder failed', { orderId: order.orderId.toString(), error });
      showWalletActionFailure(
        order,
        'Buyer Re-Sign Failed',
        error,
        'Buyer Sig #3 failed before the wallet request completed.',
      );
    } finally {
      setActiveActionKey((current) => (current === actionKey ? null : current));
    }
  };

  // Handle buyer cancel order
  const handleBuyerCancelOrder = async (orderId: bigint) => {
    const order = resolveOrderById(orderId);
    if (!order) return;
    if (!requireBuyerRole(order, 'cancel this order')) return;

    if (!(await protocolChain.ensureProtocolChainAsync('cancel this order'))) {
      return;
    }

    const actionKey = getActionKey('cancelByBuyer', order.orderId);
    if (activeActionKey === actionKey) return;

    try {
      const currentOrder = await rereadOrderFromChain(order);
      if (!canBuyerCancelOrder(currentOrder)) {
        showActionNotice('warning', 'Order Already Updated', 'This order can no longer be cancelled by the buyer.', currentOrder);
        return;
      }

      setActiveActionKey(actionKey);
      const txHash = await cancelByBuyerTx.cancelByBuyer(currentOrder.orderId);
      await waitForMarketplaceReceipt(txHash);
      const reconciledOrder = await syncOrderAfterWrite(currentOrder);
      showActionNotice('warning', 'Order Cancelled', 'Order has been cancelled and escrow flow stopped.', reconciledOrder);
    } catch (error) {
      console.error('cancelByBuyer failed', { orderId: order.orderId.toString(), error });
      showWalletActionFailure(
        order,
        'Buyer Cancel Failed',
        error,
        'Buyer cancellation failed before the wallet request completed.',
      );
    } finally {
      setActiveActionKey((current) => (current === actionKey ? null : current));
    }
  };

  // Progress ring calculation
  const getProgressDashOffset = (progress: number) => {
    const circumference = 2 * Math.PI * 16;
    return circumference - (progress / 100) * circumference;
  };

  const isAwaitingBuyerSig3 = (order: OrderUiRecord) => canViewerBuyerAcceptRevisedTime(order, address, currentTimeSec);
  const isAwaitingAutoFinalize = (order: OrderUiRecord) => getOrderLifecyclePhase(order, currentTimeSec) === 'awaiting_auto_finalize';

  return (
    <>
      {/* Main Content */}
      <section className="bg-ui-page overflow-y-auto hidden-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`
          .hidden-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
        <div className="p-8">
          <div className="mb-6">
            <ProtocolChainBanner
              isConnected={walletConnected}
              isOnProtocolChain={protocolChain.isOnProtocolChain}
              currentChainLabel={protocolChain.currentChainLabel}
              targetChainLabel={protocolChain.targetChainLabel}
              isSwitching={protocolChain.isSwitching}
              onSwitch={handleSwitchProtocolChain}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-start mb-8">
            <div className="flex w-full flex-wrap lg:flex-nowrap gap-3">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-muted" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Order ID..."
                  className="w-full h-[48px] rounded-full bg-ui-input border border-ui-border-subtle pl-11 pr-4 text-sm font-medium tracking-[-0.01em] text-ui-primary placeholder:text-ui-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <CustomDropdown
                options={NETWORK_OPTIONS}
                defaultValue={selectedNetwork}
                onChange={(value) => setSelectedNetwork(value)}
                variant="compact"
                splitRightPane={false}
                className="min-w-[210px] shrink-0"
              />
              <CustomDropdown
                options={[
                  { value: 'all', label: 'Filter Status' },
                  { value: '0', label: 'Pending Confirm' },
                  { value: '1', label: 'Paid' },
                  { value: '2', label: 'Disputed' },
                  { value: '3', label: 'Finalized' }
                ]}
                defaultValue={selectedFilter}
                onChange={(value) => setSelectedFilter(value)}
                variant="compact"
                splitRightPane={false}
                className="min-w-[180px] shrink-0"
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <StudioStatsCard
              label="Total Orders"
              value={stats.total.toLocaleString()}
              className="bg-[var(--t-card-bg)] border-0 backdrop-blur-[10px]"
            />
            <StudioStatsCard
              label="Active Escrow"
              value={stats.active}
              className="bg-[var(--t-card-bg)] border-0 backdrop-blur-[10px]"
            />
            <StudioStatsCard
              label="Completed"
              value={stats.completed.toLocaleString()}
              className="bg-[var(--t-card-bg)] border-0 backdrop-blur-[10px]"
            />
            <StudioStatsCard
              label="Volume"
              value={stats.volume.toFixed(2)}
              className="bg-[var(--t-card-bg)] border-0 backdrop-blur-[10px]"
            />
          </div>

          {/* Orders List */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="rounded-[24px] bg-[var(--t-card-bg)] border-0 backdrop-blur-[10px] p-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(255,255,255,0.04)]">
                  <Search className="text-ui-muted" size={24} />
                </div>
                <h3 className="text-xl font-bold text-ui-primary">No Orders Match Current Filters</h3>
                <p className="mx-auto mt-2 max-w-[520px] text-sm leading-6 text-ui-muted">
                  Clear the current search or filters to return to the canonical order list.
                </p>
              </div>
            ) : filteredOrders.map((order) => (
                <div
                  key={order.orderId.toString()}
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowOrderDetailsModal(true);
                  }}
                  className={`bg-[var(--t-card-bg)] border-0 rounded-[24px] backdrop-blur-[10px] overflow-hidden cursor-pointer transition-all duration-200 ${
                    selectedOrder.orderId === order.orderId
                      ? 'shadow-[0_0_0_1px_rgba(44,194,149,0.2),0_8px_18px_rgba(44,194,149,0.025)]'
                      : 'hover:shadow-[0_8px_18px_rgba(44,194,149,0.02)]'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex min-w-0 flex-1 gap-4">
                          <AssetThumb
                            src={order.assetImage}
                            alt={order.assetName}
                            loading="eager"
                            className="w-28 h-28 rounded-[22px] border-0 bg-ui-input shrink-0"
                          />

                          <div className="min-w-0 flex-1 space-y-4">
                            <div className="flex min-w-0 items-center gap-4">
                              <div className="relative w-10 h-10 shrink-0">
                                <svg className="w-full h-full" viewBox="0 0 36 36">
                                  <circle
                                    cx="18"
                                    cy="18"
                                    fill="none"
                                    r="16"
                                    strokeWidth="3"
                                    stroke="var(--t-border-medium)"
                                  />
                                  <circle
                                    className={order.state === 1 ? 'stroke-primary' : 'stroke-[#F7DC7F]'}
                                    cx="18"
                                    cy="18"
                                    fill="none"
                                    r="16"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeDasharray="100"
                                    strokeDashoffset={getProgressDashOffset(order.progress)}
                                    style={{
                                      transition: 'stroke-dashoffset 0.35s',
                                      transform: 'rotate(-90deg)',
                                      transformOrigin: '50% 50%'
                                    }}
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className={`text-[8px] font-bold ${order.state === 1 ? 'text-primary' : 'text-[#F7DC7F]'}`}>
                                    {order.progress}%
                                  </span>
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="text-base font-bold text-ui-primary font-mono">
                                    #ORD-{order.orderId.toString()}
                                  </span>
                                  <StudioStatusBadge
                                    variant={getOrderBadgeVariant(order)}
                                    size="sm"
                                    className="px-2 py-0.5 text-[10px]"
                                  >
                                    {getOrderLifecycleLabel(order, currentTimeSec)}
                                  </StudioStatusBadge>
                                </div>
                                <div className="mt-2 flex items-center gap-2 min-w-0">
                                  <Package size={16} className="text-ui-muted shrink-0" />
                                  <span className="truncate text-base font-semibold text-ui-secondary">
                                    {order.assetName}
                                  </span>
                                </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="flex items-center gap-3 p-3 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl">
                              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                <User className="text-blue-400" size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] uppercase font-bold text-ui-muted">Buyer</p>
                                <p className="truncate text-xs font-mono text-ui-secondary">
                                  {formatAddress(order.buyer)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl">
                              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                                <Store className="text-purple-400" size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] uppercase font-bold text-ui-muted">Seller</p>
                                <p className="truncate text-xs font-mono text-ui-secondary">
                                  {formatAddress(order.seller)}
                                </p>
                              </div>
                            </div>
                            </div>
                          </div>
                        </div>

                        <div className="xl:w-[220px] xl:shrink-0">
                          <div className="flex h-full flex-col justify-between px-2 py-1 text-right">
                            <div>
                              <p className="text-[10px] font-bold text-ui-muted uppercase mb-1">
                                Order Value
                              </p>
                              <p className="text-2xl font-black text-ui-primary">
                                {formatOrderValueLabel(order)}
                              </p>
                              <div className="mt-1 flex items-center justify-end gap-2 text-[11px] font-semibold text-ui-secondary">
                                <span className="uppercase tracking-wide text-ui-muted">Qty</span>
                                <span className="font-mono text-ui-primary">
                                  {formatOrderQuantityLabel(order)}
                                </span>
                              </div>
                            </div>

                            {(() => {
                              const countdownDeadline = getOrderCountdownDeadline(order, currentTimeSec);
                              const countdownTitle = getOrderCountdownTitle(order);
                              if (!countdownTitle || countdownDeadline <= 0n) return null;
                              const { days, hours, mins, secs } = parseCountdown(countdownDeadline);
                              return (
                                <div className="mt-4 ml-auto w-fit rounded-xl border border-ui-border-subtle bg-ui-input px-3 py-2 backdrop-blur-sm">
                                  <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-ui-muted text-center">
                                    {countdownTitle}
                                  </p>
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="flex flex-col items-center w-6">
                                      <span className="text-sm font-bold text-ui-primary leading-none tabular-nums">{days.toString().padStart(2, '0')}</span>
                                      <span className="text-[7px] font-bold text-ui-muted uppercase tracking-tighter mt-0.5">Days</span>
                                    </div>
                                    <div className="h-6 w-px bg-ui-border-subtle/80"></div>
                                    <div className="flex flex-col items-center w-6">
                                      <span className="text-sm font-bold text-ui-primary leading-none tabular-nums">{hours.toString().padStart(2, '0')}</span>
                                      <span className="text-[7px] font-bold text-ui-muted uppercase tracking-tighter mt-0.5">Hrs</span>
                                    </div>
                                    <div className="h-6 w-px bg-ui-border-subtle/80"></div>
                                    <div className="flex flex-col items-center w-6">
                                      <span className="text-sm font-bold text-ui-primary leading-none tabular-nums">{mins.toString().padStart(2, '0')}</span>
                                      <span className="text-[7px] font-bold text-ui-muted uppercase tracking-tighter mt-0.5">Min</span>
                                    </div>
                                    <div className="h-6 w-px bg-ui-border-subtle/80"></div>
                                    <div className="flex flex-col items-center w-6">
                                      <span className="text-sm font-bold text-ui-primary leading-none tabular-nums">{secs.toString().padStart(2, '0')}</span>
                                      <span className="text-[7px] font-bold text-ui-muted uppercase tracking-tighter mt-0.5">Sec</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-ui-border-subtle">
                        <StudioActionButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                            setShowOrderDetailsModal(true);
                          }}
                          variant="secondary"
                          size="lg"
                          className="orders-secondary-hover h-[45px] px-5 text-sm text-ui-secondary hover:text-ui-primary"
                          leftIcon={<Info size={14} />}
                        >
                          Details
                        </StudioActionButton>
                        <div className="flex max-w-[420px] flex-col items-end gap-2">
                          <div className="flex flex-wrap items-center justify-end gap-3">
                            {(() => {
                              const phase = getOrderLifecyclePhase(order, currentTimeSec);
                              const canViewerBuyerCancelPending = canViewerBuyerCancelOrder(order, address, currentTimeSec);
                              const canViewerSellerCancelPending = canViewerSellerCancelOrder(order, address, currentTimeSec);

                              if (canViewerSellerConfirm(order, address, currentTimeSec)) {
                                return (
                                  <>
                                    {canViewerSellerCancelPending ? (
                                      <StudioActionButton
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSellerCancelOrder(order.orderId);
                                        }}
                                        disabled={activeActionKey === getActionKey('cancelBySeller', order.orderId)}
                                        variant="secondary"
                                        size="lg"
                                        className="orders-secondary-hover h-[45px] px-5 text-sm text-ui-secondary"
                                        leftIcon={<XCircle size={14} />}
                                      >
                                        Cancel Order
                                      </StudioActionButton>
                                    ) : null}
                                    <StudioActionButton
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSellerConfirm(order.orderId);
                                      }}
                                      disabled={activeActionKey === getActionKey('sellerConfirm', order.orderId)}
                                      variant="primary"
                                      size="lg"
                                      className="orders-primary-hover h-[45px] text-sm px-5"
                                      leftIcon={<Check size={14} />}
                                    >
                                      Seller Confirm
                                    </StudioActionButton>
                                  </>
                                );
                              }

                              if (isAwaitingBuyerSig3(order)) {
                                return (
                                  <>
                                    <StudioActionButton
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleBuyerCancelOrder(order.orderId);
                                      }}
                                      disabled={activeActionKey === getActionKey('cancelByBuyer', order.orderId)}
                                      variant="secondary"
                                      size="lg"
                                      className="orders-secondary-hover h-[45px] px-5 text-sm text-ui-secondary"
                                      leftIcon={<XCircle size={14} />}
                                    >
                                      Cancel Order
                                    </StudioActionButton>
                                    <StudioActionButton
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleBuyerConfirmOrder(order.orderId);
                                      }}
                                      disabled={activeActionKey === getActionKey('payOrder', order.orderId)}
                                      variant="primary"
                                      size="lg"
                                      className="orders-primary-hover h-[45px] text-sm px-5"
                                      leftIcon={<Check size={14} />}
                                    >
                                      Re-Sign New Time
                                    </StudioActionButton>
                                  </>
                                );
                              }

                            if (phase === 'agreed_delivery') {
                              const canViewerConfirm = canViewerConfirmDelivery(order, address, currentTimeSec);

                              if (canViewerConfirm) {
                                return (
                                  <StudioActionButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleConfirmDelivery(order.orderId);
                                    }}
                                    disabled={activeActionKey === getActionKey('confirmDelivery', order.orderId)}
                                    variant="primary"
                                    size="lg"
                                    className="orders-primary-hover h-[45px] text-sm px-5"
                                    leftIcon={<Check size={14} />}
                                  >
                                    Confirm Delivery
                                  </StudioActionButton>
                                );
                              }

                              return (
                                <StudioStatusBadge variant="success" className="px-3 py-2 text-[10px]">
                                  Agreed Delivery
                                </StudioStatusBadge>
                              );
                            }

                            if (isAwaitingAutoFinalize(order)) {
                              const canViewerConfirm = canViewerConfirmDelivery(order, address, currentTimeSec);
                              const canViewerDispute = canViewerOpenDispute(order, address, currentTimeSec);

                              if (canViewerConfirm || canViewerDispute) {
                                return (
                                  <>
                                    {canViewerDispute ? (
                                      <StudioActionButton
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenDispute(order.orderId);
                                        }}
                                        disabled={activeActionKey === getActionKey('openDispute', order.orderId)}
                                        size="lg"
                                        className="orders-warning-hover h-[45px] bg-orange-500 text-black border-transparent text-sm px-5"
                                        leftIcon={<XCircle size={14} />}
                                      >
                                        Open Dispute
                                      </StudioActionButton>
                                    ) : null}
                                    {canViewerConfirm ? (
                                      <StudioActionButton
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleConfirmDelivery(order.orderId);
                                        }}
                                        disabled={activeActionKey === getActionKey('confirmDelivery', order.orderId)}
                                        variant="primary"
                                        size="lg"
                                        className="orders-primary-hover h-[45px] text-sm px-5"
                                        leftIcon={<Check size={14} />}
                                      >
                                        Confirm Delivery
                                      </StudioActionButton>
                                    ) : null}
                                  </>
                                );
                              }

                              return (
                                <StudioStatusBadge variant="warning" className="px-3 py-2 text-[10px]">
                                  Awaiting Auto Finalize
                                </StudioStatusBadge>
                              );
                            }

                            if (phase === 'disputed') {
                              return (
                                <StudioActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDisputeResolution(order.orderId);
                                  }}
                                  size="lg"
                                  className="orders-warning-hover h-[45px] bg-orange-500 text-black border-transparent text-sm px-5"
                                  leftIcon={<Timer size={14} />}
                                >
                                  View Dispute
                                </StudioActionButton>
                              );
                            }

                            if (phase === 'waiting_seller_confirm') {
                              return (
                                <StudioStatusBadge variant="muted" className="px-3 py-2 text-[10px]">
                                  Waiting Seller Confirm
                                </StudioStatusBadge>
                              );
                            }

                            if (phase === 'waiting_buyer_accept') {
                              return (
                                <StudioStatusBadge variant="muted" className="px-3 py-2 text-[10px]">
                                  Waiting Buyer Re-Sign
                                </StudioStatusBadge>
                              );
                            }

                            if (phase === 'agreed_delivery') {
                              return (
                                <StudioStatusBadge variant="success" className="px-3 py-2 text-[10px]">
                                  Agreed Delivery
                                </StudioStatusBadge>
                              );
                            }

                            if (phase === 'seller_confirm_expired') {
                              return (
                                <StudioStatusBadge variant="warning" className="px-3 py-2 text-[10px]">
                                  Seller Window Expired
                                </StudioStatusBadge>
                              );
                            }

                            if (phase === 'buyer_accept_expired') {
                              return (
                                <StudioStatusBadge variant="warning" className="px-3 py-2 text-[10px]">
                                  Buyer Re-Sign Expired
                                </StudioStatusBadge>
                              );
                            }

                            if (phase === 'awaiting_auto_finalize') {
                              return (
                                <StudioStatusBadge variant="warning" className="px-3 py-2 text-[10px]">
                                  Awaiting Auto Finalize
                                </StudioStatusBadge>
                              );
                            }

                            if (phase === 'auto_finalize_ready') {
                              return (
                                <StudioStatusBadge variant="muted" className="px-3 py-2 text-[10px]">
                                  Auto Finalize Ready
                                </StudioStatusBadge>
                              );
                            }

                              return null;
                            })()}
                          </div>
                          {getOrderChainHint(order) ? (
                            <p className="max-w-[420px] text-right text-[11px] leading-5 text-ui-muted">
                              {getOrderChainHint(order)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </section>

      {/* Right Sidebar - Order Summary */}
      <StudioSidebarShell widthClassName="w-full" className="bg-ui-page border-l-0 p-2.5">
        <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
          <StudioSidebarHeader className="p-5 border-b border-[var(--t-border-subtle)]">
            <h2 className="text-ui-primary font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
              <CheckCircle className="text-primary" size={18} />
              Order Summary
            </h2>
            <p className="text-xs text-ui-muted mt-1">EIP-712 Signature Status</p>
          </StudioSidebarHeader>

          <StudioSidebarScroll className="p-4 space-y-4">
            <div className="p-4 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px] space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">Canonical On-Chain Status</span>
                <StudioStatusBadge variant="muted" className="px-2 py-1 text-[10px]">
                  {getOrderLifecycleLabel(selectedOrder, currentTimeSec).toUpperCase()}
                </StudioStatusBadge>
              </div>
              <p className="text-xs leading-5 text-ui-secondary">
                {describeOnChainOrderState(selectedOrder)}
              </p>
            </div>

            {/* Signature Status */}
            <div
              className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-[24px] backdrop-blur-[10px] space-y-5"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedOrder.signatures.buyer1 ? 'bg-primary' : 'border border-ui-border'
                      }`}>
                      {selectedOrder.signatures.buyer1 ? (
                        <Check size={12} className="text-black font-bold" />
                      ) : (
                        <span className="text-[10px] font-bold text-ui-muted">1</span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${selectedOrder.signatures.buyer1 ? 'text-ui-primary' : 'text-ui-muted'}`}>
                      Buyer Sig 1
                    </span>
                  </div>
                  {selectedOrder.signatures.buyer1 && (
                    <span className="text-[10px] font-mono text-ui-muted">0x...f2</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedOrder.signatures.seller ? 'bg-primary' : 'border border-ui-border'
                      }`}>
                      {selectedOrder.signatures.seller ? (
                        <Check size={12} className="text-black font-bold" />
                      ) : (
                        <span className="text-[10px] font-bold text-ui-muted">2</span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${selectedOrder.signatures.seller ? 'text-ui-primary' : 'text-ui-muted'}`}>
                      Seller Sig
                    </span>
                  </div>
                  {!selectedOrder.signatures.seller && (
                    <StudioStatusBadge variant="muted">PENDING</StudioStatusBadge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedOrder.signatures.buyer2 ? 'bg-primary' : 'border border-ui-border'
                      }`}>
                      {selectedOrder.signatures.buyer2 ? (
                        <Check size={12} className="text-black font-bold" />
                      ) : (
                        <span className="text-[10px] font-bold text-ui-muted">3</span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${selectedOrder.signatures.buyer2 ? 'text-ui-primary' : 'text-ui-muted'}`}>
                      Buyer Sig 3
                    </span>
                  </div>
                  {!selectedOrder.signatures.buyer2 && (
                    <StudioStatusBadge variant="muted">WAITING</StudioStatusBadge>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--t-border-subtle)]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">Process Confidence</span>
                  <span className="text-[10px] font-bold text-primary">{selectedOrder.progress}%</span>
                </div>
                <StudioProgressBar
                  value={selectedOrder.progress}
                  variant="success"
                  trackClassName="bg-ui-border-subtle"
                />
              </div>
            </div>

            {/* History Feed */}
            <div className="space-y-4">
              <h3 className="text-[11px] uppercase tracking-widest font-black text-ui-muted px-2">History Feed</h3>
              <div className="space-y-4 px-2">
                {selectedOrder.state === 1 && (
                  <>
                    <StudioTimelineItem
                      tone="success"
                      title="Funds Deposited"
                      description={`${formatOrderValueLabel(selectedOrder)} sent to Escrow`}
                      timestamp="2 mins ago"
                    />
                    <StudioTimelineItem
                      tone="muted"
                      title="Buyer Signed (EIP-712)"
                      description="Signature Hash: 0x92...11"
                      timestamp="5 mins ago"
                    />
                  </>
                )}
                <StudioTimelineItem
                  tone="muted"
                  title="Order Proposed"
                  description={`Creation by ${formatAddress(selectedOrder.buyer)}`}
                  timestamp="12 mins ago"
                  showConnector={false}
                />

                {/* Product Information */}
                <div className="mt-4 p-4 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl">
                  <p className="text-[10px] font-bold text-ui-muted uppercase mb-2 tracking-wider">Product Information</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-ui-input border-0 overflow-hidden">
                      <img
                        alt="Product"
                        className="w-full h-full object-cover"
                        src={selectedOrder.assetImage}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ui-primary">{selectedOrder.assetName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-ui-muted">Qty:</span>
                        <span className="text-[10px] font-mono font-bold text-primary">
                          {formatOrderQuantityLabel(selectedOrder)}
                        </span>
                        <span className="text-[10px] text-ui-muted ml-1">Price:</span>
                        <span className="text-[10px] font-mono font-bold text-ui-primary">
                          {formatOrderValueLabel(selectedOrder)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {hasOrderShippingDetails(selectedOrderShipping) ? (
                    <div className="mt-3 border-t border-ui-border-subtle pt-3 space-y-1.5">
                      <p className="text-[10px] font-bold text-ui-muted uppercase tracking-wider">Shipping Snapshot</p>
                      {selectedOrderShipping.methodLabel ? (
                        <p className="text-[10px] font-semibold text-primary">{selectedOrderShipping.methodLabel}</p>
                      ) : null}
                      {selectedOrderShipping.recipientName ? (
                        <p className="text-[11px] text-ui-primary">{selectedOrderShipping.recipientName}</p>
                      ) : null}
                      {selectedOrderShipping.address ? (
                        <p className="text-[10px] leading-5 text-ui-secondary">{selectedOrderShipping.address}</p>
                      ) : null}
                      {selectedOrderShipping.phone ? (
                        <p className="text-[10px] text-ui-muted">{selectedOrderShipping.phone}</p>
                      ) : null}
                      {selectedOrderShipping.instructions ? (
                        <p className="text-[10px] leading-5 text-ui-muted">
                          Instructions: {selectedOrderShipping.instructions}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </StudioSidebarScroll>

          {/* Footer */}
          <StudioSidebarFooter className="border-t border-[var(--t-border-subtle)] p-4 bg-transparent backdrop-blur-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-ui-muted uppercase">Node Health</span>
              <span className="text-[10px] font-black text-primary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                <StudioStatusBadge variant="success" className="border-0 bg-transparent p-0 text-[10px]">
                  SYNCED
                </StudioStatusBadge>
              </span>
            </div>
            <StudioActionButton
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.open(`${activeExplorerUrl}/address/${marketplaceAddress}`, '_blank', 'noopener,noreferrer');
                }
              }}
              className="w-full py-2.5 rounded-xl text-[11px] uppercase tracking-wider"
              leftIcon={<ExternalLink size={14} />}
            >
              {activeExplorerLabel}
            </StudioActionButton>
          </StudioSidebarFooter>
        </div>
      </StudioSidebarShell>

      {/* Action Notification Modal */}
      <OrderActionNoticeModal
        notice={actionNotice}
        onClose={() => setActionNotice(null)}
      />

      {/* Duration Picker Modal */}
      {showDurationPicker && (
        <DurationPicker
          defaultDays={Number(resolveOrderById(confirmingOrderId)?.estDeliverySeconds || BigInt(7 * 24 * 3600)) / (24 * 3600)}
          onConfirm={handleDurationConfirm}
          onCancel={handleDurationCancel}
        />
      )}

      {/* Confirm Delivery Modal */}
      {showConfirmDeliveryModal && (
        <ConfirmDeliveryModal
          order={{
            orderId: selectedOrder.orderId,
            assetId: selectedOrder.assetId,
            assetUid: selectedOrder.assetUid,
            assetName: selectedOrder.assetName,
            assetImage: selectedOrder.assetImage,
            grossPrice: selectedOrder.grossPrice,
            amount: selectedOrder.amount,
            unitLabel: selectedOrder.unitLabel,
            unitName: selectedOrder.unitName,
            seller: selectedOrder.seller,
            paymentTokenSymbol: selectedOrder.paymentTokenSymbol,
            paymentTokenDecimals: selectedOrder.paymentTokenDecimals,
            shippingAddressSnapshot: selectedOrder.shippingAddressSnapshot,
            shippingMethodLabel: selectedOrder.shippingMethodLabel,
          }}
          onConfirm={handleDeliveryConfirm}
          onCancel={() => setShowConfirmDeliveryModal(false)}
        />
      )}

      {/* Open Dispute Modal */}
      {showOpenDisputeModal && (
        <OpenDisputeModal
          order={{
            orderId: selectedOrder.orderId,
            assetName: selectedOrder.assetName,
            assetImage: selectedOrder.assetImage,
            grossPrice: selectedOrder.grossPrice,
            amount: selectedOrder.amount,
            unitLabel: selectedOrder.unitLabel,
            unitName: selectedOrder.unitName,
            seller: selectedOrder.seller,
            paymentTokenSymbol: selectedOrder.paymentTokenSymbol,
            paymentTokenDecimals: selectedOrder.paymentTokenDecimals,
            shippingAddressSnapshot: selectedOrder.shippingAddressSnapshot,
            shippingMethodLabel: selectedOrder.shippingMethodLabel,
          }}
          onConfirm={handleDisputeConfirm}
          onCancel={handleDisputeCancel}
        />
      )}

      {/* Dispute Resolution Modal */}
      {showDisputeResolutionModal && (
        <DisputeResolutionModal
          order={selectedOrder}
          currentUser={address}
          userRole={
            isBuyerForOrder(selectedOrder, address)
              ? 'buyer'
              : isSellerForOrder(selectedOrder, address)
                ? 'seller'
                : 'arbiter'
          }
          onOrderUpdate={setSelectedOrder}
          onClose={handleResolutionCancel}
        />
      )}

      {/* Order Details Modal */}
      {showOrderDetailsModal && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setShowOrderDetailsModal(false)}
        />
      )}
    </>
  );
}
