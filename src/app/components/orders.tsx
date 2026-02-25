import { useState, useMemo, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Package, User, Store, Info, Check, Timer, ExternalLink } from 'lucide-react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { formatAddress } from '@/utils/format';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { DurationPicker } from '@/app/components/duration-picker';
import { ConfirmDeliveryModal } from '@/app/components/confirm-delivery-modal';
import { OpenDisputeModal } from '@/app/components/open-dispute-modal';
import { DisputeResolutionModal } from '@/app/components/dispute-resolution-modal';
import { OrderDetailsModal } from '@/app/components/order-details-modal';
import { StudioStatsCard } from '@/app/components/ui/studio-stats-card';
import { StudioSidebarShell, StudioSidebarHeader, StudioSidebarScroll, StudioSidebarFooter } from '@/app/components/ui/studio-sidebar';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioStatusBadge } from '@/app/components/ui/studio-status-badge';
import { StudioProgressBar } from '@/app/components/ui/studio-progress-bar';
import { StudioTimelineItem } from '@/app/components/ui/studio-list-parts';

// Mock orders matching the HTML design
const mockOrders = [
  {
    orderId: BigInt(88220),
    buyer: '0x71C7fe5b2c5d9f8e4f22' as `0x${string}`,
    seller: '0x742d35Cc6634C0532925' as `0x${string}`,
    assetId: BigInt(15),
    assetName: 'Urban Property Token #15',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(mockOrders[0]);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<bigint | null>(null);
  const [showConfirmDeliveryModal, setShowConfirmDeliveryModal] = useState(false);
  const [showOpenDisputeModal, setShowOpenDisputeModal] = useState(false);
  const [showDisputeResolutionModal, setShowDisputeResolutionModal] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);

  // Auto-update timers
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = mockOrders;

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
  }, [searchQuery, selectedFilter]);

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

  const handleDurationConfirm = (days: number, targetDate: Date) => {
    console.log('Seller confirmed with delivery time:', days, 'days, target:', targetDate);
    // TODO: Call smart contract sellerConfirm with estDeliverySeconds = days * 24 * 60 * 60
    setShowDurationPicker(false);
    setConfirmingOrderId(null);
  };

  const handleDurationCancel = () => {
    setShowDurationPicker(false);
    setConfirmingOrderId(null);
  };

  // Handle confirm delivery
  const handleConfirmDelivery = (orderId: bigint) => {
    const order = mockOrders.find(o => o.orderId === orderId);
    if (order) {
      setSelectedOrder(order);
      setShowConfirmDeliveryModal(true);
    }
  };

  const handleDeliveryConfirm = () => {
    console.log('Buyer confirmed delivery for order:', selectedOrder.orderId.toString());
    // TODO: Call smart contract buyerFinalizeRelease(orderId)
    setShowConfirmDeliveryModal(false);
  };

  // Handle open dispute
  const handleOpenDispute = (orderId: bigint) => {
    const order = mockOrders.find(o => o.orderId === orderId);
    if (order) {
      setSelectedOrder(order);
      setShowOpenDisputeModal(true);
    }
  };

  const handleDisputeConfirm = () => {
    console.log('Buyer opened dispute for order:', selectedOrder.orderId.toString());
    // TODO: Call smart contract openDispute(orderId)
    setShowOpenDisputeModal(false);
  };

  const handleDisputeCancel = () => {
    setShowOpenDisputeModal(false);
  };

  // Handle dispute resolution
  const handleDisputeResolution = (orderId: bigint) => {
    const order = mockOrders.find(o => o.orderId === orderId);
    if (order) {
      setSelectedOrder(order);
      setShowDisputeResolutionModal(true);
    }
  };

  const handleResolutionConfirm = () => {
    console.log('Dispute resolved for order:', selectedOrder.orderId.toString());
    // TODO: Call smart contract resolveDispute(orderId)
    setShowDisputeResolutionModal(false);
  };

  const handleResolutionCancel = () => {
    setShowDisputeResolutionModal(false);
  };

  // Handle buyer confirm order (Sig 2 + Pay)
  const handleBuyerConfirmOrder = (orderId: bigint) => {
    console.log('Buyer confirming order (Sig 2 + Pay):', orderId.toString());
    // TODO: Call smart contract buyerConfirm(orderId) - This will trigger Sig 2 and payment
  };

  // Handle buyer cancel order
  const handleBuyerCancelOrder = (orderId: bigint) => {
    console.log('Buyer canceling order:', orderId.toString());
    // TODO: Call smart contract cancelOrder(orderId)
  };

  // Progress ring calculation
  const getProgressDashOffset = (progress: number) => {
    const circumference = 2 * Math.PI * 16;
    return circumference - (progress / 100) * circumference;
  };

  // Check if order is in dispute window
  const isInDisputeWindow = (order: typeof mockOrders[0]) => {
    if (order.state !== 1) return false; // Only PAID state
    const now = Math.floor(Date.now() / 1000);
    const autoReleasePassed = now > Number(order.autoReleaseAt);
    const disputeDeadlineNotPassed = order.disputeDeadline ? now <= Number(order.disputeDeadline) : true;
    return autoReleasePassed && disputeDeadlineNotPassed;
  };

  return (
    <>
      {/* Main Content */}
      <section className="bg-[#0f0f11] overflow-y-auto hidden-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`
          .hidden-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-end mb-8">
            <div className="flex gap-3 w-full max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Order ID..."
                  className="bg-[var(--color-panel-bg)] border border-[var(--color-panel-border)] rounded-lg pl-10 pr-4 py-2 text-sm w-full focus:ring-[var(--color-primary-custom)] focus:border-[var(--color-primary-custom)] text-white"
                />
              </div>
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
                className="min-w-[160px] shrink-0"
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <StudioStatsCard
              label="Total Orders"
              value={stats.total.toLocaleString()}
              className="bg-zinc-900/30 border-[#27272a]"
            />
            <StudioStatsCard
              label="Active Escrow"
              value={stats.active}
              className="bg-zinc-900/30 border-[#27272a] overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-[var(--color-primary-custom)] rounded-tl-2xl pointer-events-none"></div>
            </StudioStatsCard>
            <StudioStatsCard
              label="Completed"
              value={stats.completed.toLocaleString()}
              className="bg-zinc-900/30 border-[#27272a]"
            />
            <StudioStatsCard
              label="Volume (ETH)"
              value={stats.volume.toFixed(2)}
              className="bg-zinc-900/30 border-[#27272a] overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-[#F7DC7F] rounded-tl-2xl pointer-events-none"></div>
            </StudioStatsCard>
          </div>

          {/* Orders List */}
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.orderId.toString()}
                onClick={() => setSelectedOrder(order)}
                className={`bg-zinc-900/30 border border-[#27272a] rounded-2xl overflow-hidden cursor-pointer transition-all ${
                  selectedOrder.orderId === order.orderId ? 'ring-2 ring-[var(--color-primary-custom)]' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      {/* Progress Ring */}
                      <div className="relative w-10 h-10 shrink-0">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                          <circle
                            className="stroke-zinc-800"
                            cx="18"
                            cy="18"
                            fill="none"
                            r="16"
                            strokeWidth="3"
                          />
                          <circle
                            className={order.state === 1 ? 'stroke-[var(--color-primary-custom)]' : 'stroke-[#F7DC7F]'}
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
                          <span className={`text-[8px] font-bold ${order.state === 1 ? 'text-[var(--color-primary-custom)]' : 'text-[#F7DC7F]'}`}>
                            {order.progress}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-base font-bold text-white font-mono">
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
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">
                        Order Value
                      </p>
                      <p className="text-2xl font-black text-white">
                        {formatEther(order.grossPrice)} ETH
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Buyer and Seller Address Boxes */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-[#27272a] rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                          <User className="text-blue-400" size={16} />
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-zinc-600">Buyer</p>
                          <p className="text-xs font-mono text-zinc-300">
                            {formatAddress(order.buyer)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-[#27272a] rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                          <Store className="text-purple-400" size={16} />
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-zinc-600">Seller</p>
                          <p className="text-xs font-mono text-zinc-300">
                            {formatAddress(order.seller)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Asset Name with Countdown */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-zinc-500" />
                        <span className="text-sm font-semibold text-zinc-300">{order.assetName}</span>
                      </div>
                      {/* Countdown Timer */}
                      {(() => {
                        const deadline = order.state === 1 ? order.autoReleaseAt : order.payDeadline;
                        const { days, hours, mins, secs } = parseCountdown(deadline);
                        return (
                          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm shrink-0">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col items-center w-6">
                                <span className="text-sm font-bold text-white leading-none tabular-nums">{days.toString().padStart(2, '0')}</span>
                                <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-tighter mt-0.5">Days</span>
                              </div>
                              <div className="text-zinc-700 font-bold text-[10px] leading-none">:</div>
                              <div className="flex flex-col items-center w-6">
                                <span className="text-sm font-bold text-white leading-none tabular-nums">{hours.toString().padStart(2, '0')}</span>
                                <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-tighter mt-0.5">Hrs</span>
                              </div>
                              <div className="text-zinc-700 font-bold text-[10px] leading-none">:</div>
                              <div className="flex flex-col items-center w-6">
                                <span className="text-sm font-bold text-white leading-none tabular-nums">{mins.toString().padStart(2, '0')}</span>
                                <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-tighter mt-0.5">Min</span>
                              </div>
                              <div className="text-zinc-700 font-bold text-[10px] leading-none">:</div>
                              <div className="flex flex-col items-center w-6">
                                <span className="text-sm font-bold text-white leading-none tabular-nums">{secs.toString().padStart(2, '0')}</span>
                                <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-tighter mt-0.5">Sec</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Border and Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#27272a]">
                      <StudioActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setShowOrderDetailsModal(true);
                        }}
                        variant="secondary"
                        size="sm"
                        className="text-[10px] px-3 py-1.5 text-zinc-400 hover:text-white"
                        leftIcon={<Info size={12} />}
                      >
                        Details
                      </StudioActionButton>
                      <div className="flex items-center gap-2">
                        {order.state === 1 ? (
                          <>
                            {isInDisputeWindow(order) ? (
                              <>
                                <StudioActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDispute(order.orderId);
                                  }}
                                  size="sm"
                                  className="bg-orange-500 text-black border-transparent text-[10px] px-3 py-1.5 hover:opacity-90"
                                  leftIcon={<XCircle size={12} />}
                                >
                                  Open Dispute
                                </StudioActionButton>
                                <StudioActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirmDelivery(order.orderId);
                                  }}
                                  variant="primary"
                                  size="sm"
                                  className="text-[10px] px-4 py-1.5 hover:opacity-90"
                                  leftIcon={<Check size={12} />}
                                >
                                  Confirm Delivery
                                </StudioActionButton>
                              </>
                            ) : (
                              <StudioActionButton
                                variant="primary"
                                size="sm"
                                className="text-[10px] px-4 py-1.5 hover:opacity-90"
                                leftIcon={<Check size={12} />}
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
                                  variant="secondary"
                                  size="sm"
                                  className="text-[10px] px-3 py-1.5 text-zinc-400"
                                  leftIcon={<XCircle size={12} />}
                                >
                                  Reject
                                </StudioActionButton>
                                <StudioActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSellerConfirm(order.orderId);
                                  }}
                                  variant="primary"
                                  size="sm"
                                  className="text-[10px] px-4 py-1.5 hover:opacity-90"
                                  leftIcon={<Check size={12} />}
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
                                  size="sm"
                                  className="text-[10px] px-3 py-1.5 text-zinc-400"
                                  leftIcon={<XCircle size={12} />}
                                >
                                  Cancel Order
                                </StudioActionButton>
                                <StudioActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBuyerConfirmOrder(order.orderId);
                                  }}
                                  variant="primary"
                                  size="sm"
                                  className="text-[10px] px-4 py-1.5 hover:opacity-90"
                                  leftIcon={<Check size={12} />}
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
                            size="sm"
                            className="bg-orange-500 text-black border-transparent text-[10px] px-4 py-1.5 hover:opacity-90"
                            leftIcon={<Timer size={12} />}
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
      <StudioSidebarShell>
        <StudioSidebarHeader>
          <h2 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
            <CheckCircle className="text-[var(--color-primary-custom)]" size={18} />
            Order Summary
          </h2>
          <p className="text-xs text-zinc-500 mt-1">EIP-712 Signature Status</p>
        </StudioSidebarHeader>

        <StudioSidebarScroll>
          {/* Signature Status */}
          <div className="p-5 bg-[var(--color-panel-bg)] border border-[var(--color-panel-border)] rounded-2xl space-y-5 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5)]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    selectedOrder.signatures.buyer1 ? 'bg-[var(--color-primary-custom)]' : 'border border-zinc-700'
                  }`}>
                    {selectedOrder.signatures.buyer1 ? (
                      <Check size={12} className="text-black font-bold" />
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500">1</span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold ${selectedOrder.signatures.buyer1 ? 'text-white' : 'text-zinc-500'}`}>
                    Buyer Sig 1
                  </span>
                </div>
                {selectedOrder.signatures.buyer1 && (
                  <span className="text-[10px] font-mono text-zinc-500">0x...f2</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    selectedOrder.signatures.seller ? 'bg-[var(--color-primary-custom)]' : 'border border-zinc-700'
                  }`}>
                    {selectedOrder.signatures.seller ? (
                      <Check size={12} className="text-black font-bold" />
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500">2</span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold ${selectedOrder.signatures.seller ? 'text-white' : 'text-zinc-500'}`}>
                    Seller Sig
                  </span>
                </div>
                {!selectedOrder.signatures.seller && (
                  <StudioStatusBadge variant="muted">PENDING</StudioStatusBadge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    selectedOrder.signatures.buyer2 ? 'bg-[var(--color-primary-custom)]' : 'border border-zinc-700'
                  }`}>
                    {selectedOrder.signatures.buyer2 ? (
                      <Check size={12} className="text-black font-bold" />
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500">3</span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold ${selectedOrder.signatures.buyer2 ? 'text-white' : 'text-zinc-500'}`}>
                    Buyer Sig 2
                  </span>
                </div>
                {!selectedOrder.signatures.buyer2 && (
                  <StudioStatusBadge variant="muted">WAITING</StudioStatusBadge>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#27272a]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Process Confidence</span>
                <span className="text-[10px] font-bold text-[var(--color-primary-custom)]">{selectedOrder.progress}%</span>
              </div>
              <StudioProgressBar
                value={selectedOrder.progress}
                variant="success"
                trackClassName="bg-zinc-900"
              />
            </div>
          </div>

          {/* History Feed */}
          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-widest font-black text-zinc-600 px-2">History Feed</h3>
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
              <div className="mt-4 p-4 bg-zinc-900/50 rounded-xl border border-[#27272a]">
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-wider">Product Information</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-[#27272a] overflow-hidden">
                    <img
                      alt="Product"
                      className="w-full h-full object-cover"
                      src={selectedOrder.assetImage}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{selectedOrder.assetName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-500">Qty:</span>
                      <span className="text-[10px] font-mono font-bold text-[var(--color-primary-custom)]">
                        {selectedOrder.amount.toString()}.0
                      </span>
                      <span className="text-[10px] text-zinc-500 ml-1">Price:</span>
                      <span className="text-[10px] font-mono font-bold text-white">
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
        <StudioSidebarFooter className="mt-auto p-5 bg-[var(--color-panel-bg)] space-y-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Node Health</span>
            <span className="text-[10px] font-black text-[var(--color-primary-custom)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-custom)]"></span>
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
      </StudioSidebarShell>

      {/* Duration Picker Modal */}
      {showDurationPicker && (
        <DurationPicker
          defaultDays={Number(mockOrders.find(o => o.orderId === confirmingOrderId)?.estDeliverySeconds || BigInt(7 * 24 * 3600)) / (24 * 3600)}
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
