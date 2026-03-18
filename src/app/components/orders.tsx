import { useState, useMemo, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Package, User, Store, Info, Check, Timer, ExternalLink, AlertTriangle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { formatAddress } from '@/utils/format';
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
import type { OrderUiRecord } from '@/types/order';
import {
  useSellerConfirm,
  usePayOrder,
  useConfirmDelivery,
  useCancelByBuyer,
  useOpenDispute,
} from '@/hooks/useMarketplace';
import { useSellerSign2, useBuyerSign3 } from '@/hooks/useEIP712Sign';
import {
  hydrateRuntimeOrdersFromSupabase,
  loadRuntimeOrders,
  subscribeToRuntimeOrders,
} from '@/utils/runtimeOrders';

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

interface OrderActionNoticeState {
  id: number;
  title: string;
  description: string;
  assetName: string;
  assetImage: string;
  assetValueEth: string;
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
                  <p className="text-xs text-ui-muted mt-0.5">{notice.assetValueEth} ETH</p>
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

// Mock orders matching the HTML design
const mockOrders: OrderUiRecord[] = [
  {
    orderId: BigInt(88220),
    buyer: '0x71C7fe5b2c5d9f8e4f22' as `0x${string}`,
    seller: '0x742d35Cc6634C0532925' as `0x${string}`,
    assetId: BigInt(15),
    assetName: 'Urban Property Token #15',
    network: 'eth',
    assetImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=400&fit=crop',
    amount: BigInt(1),
    grossPrice: BigInt('2100000000000000000'), // 2.10 ETH
    payDeadline: BigInt(Math.floor(Date.now() / 1000) + 3600 * 2.75), // 02:45:11
    autoReleaseAt: BigInt(0),
    state: 0, // PENDING_CONFIRM - Buyer đã sig 1, chờ Seller Confirm/Reject
    finalized: false,
    proposedAt: BigInt(Math.floor(Date.now() / 1000) - 180), // 3 mins ago
    paidAt: BigInt(0),
    depositedAt: BigInt(0),
    sellerConfirmedAt: BigInt(0),
    estDeliverySeconds: BigInt(0),
    paymentToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    platformFeeBpsSnapshot: BigInt(250),
    daoFeeBpsSnapshot: BigInt(50),
    burnFeeBpsSnapshot: BigInt(25),
    selectedAttributes: [],
    settlementType: 0,
    sellerConfirmed: false,
    progress: 0,
    signatures: {
      buyer1: true,  // Buyer đã sig 1
      seller: false, // Chờ seller confirm
      buyer2: false, // Chờ buyer sig 2
    }
  },
  {
    orderId: BigInt(88219),
    buyer: '0x9aC7fe5b2c5d9f8e12e8' as `0x${string}`,
    seller: '0x3Bf9a7c2e4d1f92a' as `0x${string}`,
    assetId: BigInt(12),
    assetName: 'Project Genesis #12',
    network: 'eth',
    assetImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=400&fit=crop',
    amount: BigInt(1),
    grossPrice: BigInt('1450000000000000000'), // 1.45 ETH
    payDeadline: BigInt(Math.floor(Date.now() / 1000) + 3600 * 4), // 4 hours to pay
    autoReleaseAt: BigInt(0),
    state: 0, // PENDING_CONFIRM - Nhưng seller đã confirm, chờ Buyer Sig 2
    finalized: false,
    proposedAt: BigInt(Math.floor(Date.now() / 1000) - 720), // 12 mins ago
    paidAt: BigInt(0),
    depositedAt: BigInt(0),
    sellerConfirmedAt: BigInt(Math.floor(Date.now() / 1000) - 300), // Seller confirmed 5 mins ago
    estDeliverySeconds: BigInt(3600 * 24 * 7), // 7 days delivery time
    paymentToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    platformFeeBpsSnapshot: BigInt(250),
    daoFeeBpsSnapshot: BigInt(50),
    burnFeeBpsSnapshot: BigInt(25),
    selectedAttributes: [],
    settlementType: 0,
    sellerConfirmed: true, // ✅ Seller ĐÃ confirm delivery time
    progress: 25, // Seller đã confirm, chờ buyer accept
    signatures: {
      buyer1: true,  // ✅ Buyer đã sig 1
      seller: true,  // ✅ Seller đã confirm delivery time
      buyer2: false, // ⏳ CHỜ BUYER SIG 2
    }
  },
  {
    orderId: BigInt(88221),
    buyer: '0x8aC7fe5b2c5d9f8e32a1' as `0x${string}`,
    seller: '0x6Bf9a7c2e4d1f92b' as `0x${string}`,
    assetId: BigInt(22),
    assetName: 'Gold Reserve Certificate #22',
    network: 'arb',
    assetImage: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=400&fit=crop',
    amount: BigInt(10),
    grossPrice: BigInt('3200000000000000000'), // 3.2 ETH
    payDeadline: BigInt(0),
    autoReleaseAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 6), // 6 hours AGO (passed!)
    disputeDeadline: BigInt(Math.floor(Date.now() / 1000) + 3600 * 24 * 3 - 3600 * 6), // 3 days from autoRelease - 6 hours
    disputeOpenedAt: BigInt(0),
    state: 1, // PAID - in dispute window (autoRelease đã qua, chờ dispute deadline)
    finalized: false,
    proposedAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 48),
    paidAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 36),
    depositedAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 36),
    sellerConfirmedAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 47),
    estDeliverySeconds: BigInt(3600 * 24 * 3),
    paymentToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    platformFeeBpsSnapshot: BigInt(250),
    daoFeeBpsSnapshot: BigInt(50),
    burnFeeBpsSnapshot: BigInt(25),
    selectedAttributes: [
      {
        groupId: 'bar-size',
        groupLabel: 'Bar Size',
        values: ['1kg'],
      },
      {
        groupId: 'vault-location',
        groupLabel: 'Vault Location',
        values: ['Singapore Vault'],
      },
      {
        groupId: 'packaging',
        groupLabel: 'Packaging',
        values: ['Sealed Case'],
      },
    ],
    settlementType: 0,
    sellerConfirmed: true,
    progress: 85,
    signatures: {
      buyer1: true,
      seller: true,
      buyer2: true,
    }
  },
  {
    orderId: BigInt(88222),
    buyer: '0x8aC7fe5b2c5d9f8e32a1' as `0x${string}`,
    seller: '0x6Bf9a7c2e4d1f92b' as `0x${string}`,
    assetId: BigInt(27),
    assetName: 'Vintage Watch Collection #27',
    network: 'poly',
    assetImage: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=400&fit=crop',
    amount: BigInt(1),
    grossPrice: BigInt('4500000000000000000'), // 4.5 ETH
    payDeadline: BigInt(0),
    autoReleaseAt: BigInt(Math.floor(Date.now() / 1000) + 3600 * 2), // 2 hours
    disputeOpenedAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 12), // 12 hours ago
    disputeDeadline: BigInt(Math.floor(Date.now() / 1000) + 3600 * 24 * 14 - 3600 * 12), // 14 days - 12 hours
    state: 2, // DISPUTED
    finalized: false,
    proposedAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 48),
    paidAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 36),
    depositedAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 36),
    sellerConfirmedAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 47),
    estDeliverySeconds: BigInt(3600 * 24 * 3),
    paymentToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    platformFeeBpsSnapshot: BigInt(250),
    daoFeeBpsSnapshot: BigInt(50),
    burnFeeBpsSnapshot: BigInt(25),
    selectedAttributes: [],
    settlementType: 0,
    sellerConfirmed: true,
    progress: 80,
    signatures: {
      buyer1: true,
      seller: true,
      buyer2: true,
    }
  },
  {
    orderId: BigInt(88223),
    buyer: '0x9aC7fe5b2c5d9f8e12e8' as `0x${string}`,
    seller: '0x3Bf9a7c2e4d1f92a' as `0x${string}`,
    assetId: BigInt(8),
    assetName: 'Digital Art Collection #8',
    network: 'bnb',
    assetImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop',
    amount: BigInt(1),
    grossPrice: BigInt('880000000000000000'), // 0.88 ETH
    payDeadline: BigInt(0),
    autoReleaseAt: BigInt(0),
    state: 3, // FINALIZED
    finalized: true,
    proposedAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 72),
    paidAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 60),
    depositedAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 60),
    sellerConfirmedAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 71),
    estDeliverySeconds: BigInt(3600 * 24 * 2),
    paymentToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    platformFeeBpsSnapshot: BigInt(250),
    daoFeeBpsSnapshot: BigInt(50),
    burnFeeBpsSnapshot: BigInt(25),
    selectedAttributes: [],
    settlementType: 0,
    sellerConfirmed: true,
    progress: 100,
    signatures: {
      buyer1: true,
      seller: true,
      buyer2: true,
    }
  },
];

interface OrdersProps {
  onNavigateToPage?: (page: string) => void;
}

export function Orders({ onNavigateToPage }: OrdersProps) {
  const { address, isConnected } = useAccount();
  const sellerConfirmTx = useSellerConfirm();
  const payOrderTx = usePayOrder();
  const confirmDeliveryTx = useConfirmDelivery();
  const cancelByBuyerTx = useCancelByBuyer();
  const openDisputeTx = useOpenDispute();
  const sellerSign2 = useSellerSign2();
  const buyerSign3 = useBuyerSign3();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('all');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [runtimeOrdersVersion, setRuntimeOrdersVersion] = useState(0);
  const allOrders = useMemo(() => {
    const runtimeOrders = loadRuntimeOrders(address);
    const baseOrders = runtimeOrders.length > 0 ? runtimeOrders : mockOrders;
    return [...baseOrders].sort((a, b) => Number(b.proposedAt - a.proposedAt));
  }, [address, runtimeOrdersVersion]);
  const [selectedOrder, setSelectedOrder] = useState<OrderUiRecord>(allOrders[0] ?? mockOrders[0]);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<bigint | null>(null);
  const [showConfirmDeliveryModal, setShowConfirmDeliveryModal] = useState(false);
  const [showOpenDisputeModal, setShowOpenDisputeModal] = useState(false);
  const [showDisputeResolutionModal, setShowDisputeResolutionModal] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<OrderActionNoticeState | null>(null);

  // Auto-update timers
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (address) {
      void hydrateRuntimeOrdersFromSupabase(address).then(() => {
        setRuntimeOrdersVersion((value) => value + 1);
      });
    }
    return subscribeToRuntimeOrders(() => {
      setRuntimeOrdersVersion((value) => value + 1);
    });
  }, [address]);

  useEffect(() => {
    if (!allOrders.length) return;
    const matchedOrder = allOrders.find((order) => order.orderId === selectedOrder.orderId);
    if (matchedOrder) {
      if (matchedOrder !== selectedOrder) {
        setSelectedOrder(matchedOrder);
      }
      return;
    }
    setSelectedOrder(allOrders[0]);
  }, [allOrders, selectedOrder]);

  const resolveOrderById = (orderId: bigint | null) => {
    if (orderId === null) return undefined;
    return allOrders.find((order) => order.orderId === orderId);
  };

  const showActionNotice = (
    tone: OrderActionNoticeTone,
    title: string,
    description: string,
    orderForNotice: (typeof mockOrders)[number],
  ) => {
    const id = Date.now();
    setActionNotice({
      id,
      tone,
      title,
      description,
      assetName: orderForNotice.assetName,
      assetImage: orderForNotice.assetImage,
      assetValueEth: formatEther(orderForNotice.grossPrice),
    });

    window.setTimeout(() => {
      setActionNotice((current) => (current?.id === id ? null : current));
    }, 1500);
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
    total: 1284,
    active: 42,
    completed: 1190,
    volume: 842.15,
  }), []);

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

  // Handle seller confirm
  const handleSellerConfirm = (orderId: bigint) => {
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

    try {
      const estDeliverySeconds = BigInt(days) * 24n * 60n * 60n;
      const sellerSig = await sellerSign2.sign({
        orderId: order.orderId,
        buyer: order.buyer,
        grossPrice: order.grossPrice,
        amount: order.amount,
        estDeliverySeconds,
      });
      await sellerConfirmTx.sellerConfirm(order.orderId, estDeliverySeconds, sellerSig);
      showActionNotice('success', 'Seller Confirmed!', 'Delivery duration has been set. Redirecting to orders...', order);
    } catch (error) {
      console.error('sellerConfirm failed', { orderId: order.orderId.toString(), days, targetDate, error });
    }
    setShowDurationPicker(false);
    setConfirmingOrderId(null);
  };

  const handleDurationCancel = () => {
    setShowDurationPicker(false);
    setConfirmingOrderId(null);
  };

  // Handle confirm delivery
  const handleConfirmDelivery = (orderId: bigint) => {
    const order = resolveOrderById(orderId);
    if (order) {
      setSelectedOrder(order);
      setShowConfirmDeliveryModal(true);
    }
  };

  const handleDeliveryConfirm = async () => {
    const order = resolveOrderById(selectedOrder.orderId);
    if (!order) {
      setShowConfirmDeliveryModal(false);
      return;
    }
    try {
      await confirmDeliveryTx.confirmDelivery(order.orderId);
      showActionNotice('success', 'Delivery Confirmed!', 'Delivery confirmation has been submitted onchain.', order);
    } catch (error) {
      console.error('confirmDelivery failed', { orderId: order.orderId.toString(), error });
    }
    setShowConfirmDeliveryModal(false);
  };

  // Handle open dispute
  const handleOpenDispute = (orderId: bigint) => {
    const order = resolveOrderById(orderId);
    if (order) {
      setSelectedOrder(order);
      setShowOpenDisputeModal(true);
    }
  };

  const handleDisputeConfirm = async () => {
    const order = resolveOrderById(selectedOrder.orderId);
    if (!order) {
      setShowOpenDisputeModal(false);
      return;
    }
    try {
      await openDisputeTx.openDispute(order.orderId);
      showActionNotice('warning', 'Dispute Opened', 'Arbiter notified and escrow is now frozen.', order);
    } catch (error) {
      console.error('openDispute failed', { orderId: order.orderId.toString(), error });
    }
    setShowOpenDisputeModal(false);
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
    if (!order || order.estDeliverySeconds <= 0n) return;

    try {
      const buyerSig2 = await buyerSign3.sign({
        orderId: order.orderId,
        seller: order.seller,
        grossPrice: order.grossPrice,
        amount: order.amount,
        estDeliverySeconds: order.estDeliverySeconds,
      });
      await payOrderTx.payOrder(order.orderId, buyerSig2);
      showActionNotice('success', 'Order Confirmed!', 'Buyer signature submitted. Proceeding to payment...', order);
    } catch (error) {
      console.error('payOrder failed', { orderId: order.orderId.toString(), error });
    }
  };

  // Handle buyer cancel order
  const handleBuyerCancelOrder = async (orderId: bigint) => {
    const order = resolveOrderById(orderId);
    if (!order) return;

    try {
      await cancelByBuyerTx.cancelByBuyer(order.orderId);
      showActionNotice('warning', 'Order Cancelled', 'Order has been cancelled and escrow flow stopped.', order);
    } catch (error) {
      console.error('cancelByBuyer failed', { orderId: order.orderId.toString(), error });
    }
  };

  // Handle seller reject order
  const handleSellerRejectOrder = (orderId: bigint) => {
    console.log('Seller rejecting order:', orderId.toString());
    // TODO: Call smart contract sellerReject(orderId)
    const order = resolveOrderById(orderId);
    if (order) {
      showActionNotice('danger', 'Order Rejected', 'Proposal rejected by seller. Redirecting to orders...', order);
    }
  };

  // Handle confirm release (auto-release path)
  const handleConfirmRelease = async (orderId: bigint) => {
    const order = resolveOrderById(orderId);
    if (!order) return;

    try {
      await confirmDeliveryTx.confirmDelivery(order.orderId);
      showActionNotice('success', 'Release Confirmed!', 'Escrow settlement finalized for this order.', order);
    } catch (error) {
      console.error('confirmRelease failed', { orderId: order.orderId.toString(), error });
    }
  };

  // Progress ring calculation
  const getProgressDashOffset = (progress: number) => {
    const circumference = 2 * Math.PI * 16;
    return circumference - (progress / 100) * circumference;
  };

  // Check if order is in dispute window
  const isInDisputeWindow = (order: OrderUiRecord) => {
    if (order.state !== 1) return false; // Only PAID state
    const now = Math.floor(Date.now() / 1000);
    const autoReleasePassed = now > Number(order.autoReleaseAt);
    const disputeDeadlineNotPassed = order.disputeDeadline ? now <= Number(order.disputeDeadline) : true;
    return autoReleasePassed && disputeDeadlineNotPassed;
  };

  return (
    <>
      {/* Main Content */}
      <section className="bg-ui-page overflow-y-auto hidden-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`
          .hidden-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
        <div className="p-8">
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
                  className="bg-ui-input border border-ui-border rounded-full pl-10 pr-4 py-2 text-sm w-full focus:ring-primary/35 focus:border-primary text-ui-primary"
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
              label="Volume (ETH)"
              value={stats.volume.toFixed(2)}
              className="bg-[var(--t-card-bg)] border-0 backdrop-blur-[10px]"
            />
          </div>

          {/* Orders List */}
          <div className="space-y-4">
            {filteredOrders.map((order) => (
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
                                    variant={
                                      order.state === 0
                                        ? 'warning'
                                        : order.state === 1
                                          ? 'success'
                                          : order.state === 2
                                            ? 'danger'
                                            : order.state === 3
                                              ? 'info'
                                              : 'muted'
                                    }
                                    size="sm"
                                    className="px-2 py-0.5 text-[10px]"
                                  >
                                    {order.state === 0
                                      ? 'Pending Confirm'
                                      : order.state === 1
                                        ? 'Paid'
                                        : order.state === 2
                                          ? 'Disputed'
                                          : order.state === 3
                                            ? 'Finalized'
                                            : 'Cancelled'}
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
                              {formatEther(order.grossPrice)} ETH
                            </p>
                            <div className="mt-1 flex items-center justify-end gap-2 text-[11px] font-semibold text-ui-secondary">
                              <span className="uppercase tracking-wide text-ui-muted">Qty</span>
                              <span className="font-mono text-ui-primary">
                                {order.amount.toString()}
                              </span>
                            </div>
                          </div>

                          {(() => {
                            const deadline = order.state === 1 ? order.autoReleaseAt : order.payDeadline;
                            const { days, hours, mins, secs } = parseCountdown(deadline);
                            return (
                              <div className="mt-4 ml-auto w-fit rounded-xl border border-ui-border-subtle bg-ui-input px-3 py-2 backdrop-blur-sm">
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
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        {order.state === 1 ? (
                          <>
                            {isInDisputeWindow(order) ? (
                              <>
                                <StudioActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDispute(order.orderId);
                                  }}
                                  size="lg"
                                  className="orders-warning-hover h-[45px] bg-orange-500 text-black border-transparent text-sm px-5"
                                  leftIcon={<XCircle size={14} />}
                                >
                                  Open Dispute
                                </StudioActionButton>
                                <StudioActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirmDelivery(order.orderId);
                                  }}
                                  variant="primary"
                                  size="lg"
                                  className="orders-primary-hover h-[45px] text-sm px-5"
                                  leftIcon={<Check size={14} />}
                                >
                                  Confirm Delivery
                                </StudioActionButton>
                              </>
                            ) : (
                              <StudioActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirmRelease(order.orderId);
                                  }}
                                  variant="primary"
                                  size="lg"
                                  className="orders-primary-hover h-[45px] text-sm px-5"
                                  leftIcon={<Check size={14} />}
                                >
                                  Confirm Release
                                </StudioActionButton>
                            )}
                          </>
                        ) : order.state === 0 ? (
                          <>
                            {!order.sellerConfirmed ? (
                              <>
                                <StudioActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSellerRejectOrder(order.orderId);
                                  }}
                                  variant="secondary"
                                  size="lg"
                                  className="orders-secondary-hover h-[45px] px-5 text-sm text-ui-secondary"
                                  leftIcon={<XCircle size={14} />}
                                >
                                  Reject
                                </StudioActionButton>
                                <StudioActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSellerConfirm(order.orderId);
                                  }}
                                  variant="primary"
                                  size="lg"
                                  className="orders-primary-hover h-[45px] text-sm px-5"
                                  leftIcon={<Check size={14} />}
                                >
                                  Seller Confirm
                                </StudioActionButton>
                              </>
                            ) : (
                              <>
                                <StudioActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBuyerCancelOrder(order.orderId);
                                  }}
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
                                  variant="primary"
                                  size="lg"
                                  className="orders-primary-hover h-[45px] text-sm px-5"
                                  leftIcon={<Check size={14} />}
                                >
                                  Confirm Order
                                </StudioActionButton>
                              </>
                            )}
                          </>
                        ) : order.state === 2 ? (
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
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                      Buyer Sig 2
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
                      description={`${formatEther(selectedOrder.grossPrice)} ETH sent to Escrow`}
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
                          {selectedOrder.amount.toString()}.0
                        </span>
                        <span className="text-[10px] text-ui-muted ml-1">Price:</span>
                        <span className="text-[10px] font-mono font-bold text-ui-primary">
                          {formatEther(selectedOrder.grossPrice)} ETH
                        </span>
                      </div>
                    </div>
                  </div>
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
              className="w-full py-2.5 rounded-xl text-[11px] uppercase tracking-wider"
              leftIcon={<ExternalLink size={14} />}
            >
              View on Etherscan
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
            assetName: selectedOrder.assetName,
            assetImage: selectedOrder.assetImage,
            grossPrice: selectedOrder.grossPrice,
            amount: selectedOrder.amount,
            seller: selectedOrder.seller,
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
            seller: selectedOrder.seller,
          }}
          onConfirm={handleDisputeConfirm}
          onCancel={handleDisputeCancel}
        />
      )}

      {/* Dispute Resolution Modal */}
      {showDisputeResolutionModal && (
        <DisputeResolutionModal
          order={{
            orderId: selectedOrder.orderId,
            assetName: selectedOrder.assetName,
            assetImage: selectedOrder.assetImage,
            grossPrice: selectedOrder.grossPrice,
            amount: selectedOrder.amount,
            buyer: selectedOrder.buyer,
            seller: selectedOrder.seller,
            disputeOpenedAt: selectedOrder.disputeOpenedAt || BigInt(Math.floor(Date.now() / 1000) - 3600 * 12),
            disputeDeadline: selectedOrder.disputeDeadline || BigInt(Math.floor(Date.now() / 1000) + 3600 * 24 * 14),
            disputeReason: ['Product damaged or defective', 'Not as described in listing'],
            disputeComment: 'The watch received is not in the condition described. The crystal has scratches that were not mentioned in the listing.',
            disputeEvidence: [
              'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=400&fit=crop',
              'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=400&h=400&fit=crop',
            ],
          }}
          currentUser={address || '0x8aC7fe5b2c5d9f8e32a1' as `0x${string}`}
          userRole="buyer"
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
