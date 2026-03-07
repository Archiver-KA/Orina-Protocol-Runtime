import { useState, useMemo, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Package, User, Store, Info, Check, Timer, ExternalLink, Circle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { formatAddress } from '@/utils/format';
import { motion, AnimatePresence } from 'motion/react';

// Mock orders matching the HTML design
const mockOrders = [
  {
    orderId: BigInt(88219),
    buyer: '0x9aC7fe5b2c5d9f8e12e8' as `0x${string}`,
    seller: '0x3Bf9a7c2e4d1f92a' as `0x${string}`,
    assetId: BigInt(12),
    assetName: 'Project Genesis #12',
    assetImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=400&fit=crop',
    amount: BigInt(1),
    grossPrice: BigInt('1450000000000000000'), // 1.45 ETH
    payDeadline: BigInt(Math.floor(Date.now() / 1000) + 3600 * 4),
    autoReleaseAt: BigInt(Math.floor(Date.now() / 1000) + 3600 * 14.37), // 14:22:05
    state: 1, // Paid
    finalized: false,
    proposedAt: BigInt(Math.floor(Date.now() / 1000) - 720), // 12 mins ago
    paidAt: BigInt(Math.floor(Date.now() / 1000) - 300), // 5 mins ago
    estDeliverySeconds: BigInt(3600 * 24 * 7),
    paymentToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    platformFeeBpsSnapshot: BigInt(250),
    daoFeeBpsSnapshot: BigInt(50),
    burnFeeBpsSnapshot: BigInt(25),
    settlementType: 0,
    sellerConfirmed: false,
    progress: 65,
    signatures: {
      buyer1: true,
      seller: false,
      buyer2: false,
    }
  },
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
    autoReleaseAt: BigInt(Math.floor(Date.now() / 1000) + 3600 * 48),
    state: 0, // Proposed
    finalized: false,
    proposedAt: BigInt(Math.floor(Date.now() / 1000) - 180),
    paidAt: BigInt(0),
    estDeliverySeconds: BigInt(3600 * 24 * 5),
    paymentToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    platformFeeBpsSnapshot: BigInt(250),
    daoFeeBpsSnapshot: BigInt(50),
    burnFeeBpsSnapshot: BigInt(25),
    settlementType: 0,
    sellerConfirmed: false,
    progress: 15,
    signatures: {
      buyer1: false,
      seller: false,
      buyer2: false,
    }
  },
];

interface OrdersStudioProps {
  onNavigateToPage?: (page: string) => void;
}

export function OrdersStudio({ onNavigateToPage }: OrdersStudioProps) {
  const { address, isConnected } = useAccount();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(mockOrders[0]);

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
    total: mockOrders.length,
    active: mockOrders.filter(o => o.state === 1).length,
    completed: mockOrders.filter(o => o.finalized).length,
    volume: mockOrders.reduce((sum, o) => sum + Number(formatEther(o.grossPrice)), 0),
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

  // Progress ring calculation
  const getProgressDashOffset = (progress: number) => {
    const circumference = 2 * Math.PI * 16;
    return circumference - (progress / 100) * circumference;
  };

  return (
    <div className="h-full flex bg-[#0f0f11] relative overflow-hidden">
      <style>{`
        .ambient-blob {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(44, 194, 149, 0.03) 0%, rgba(18, 18, 18, 0) 70%);
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          pointer-events: none;
        }
      `}</style>

      {/* Ambient Blobs */}
      <div className="ambient-blob -top-40 -left-40"></div>
      <div className="ambient-blob -bottom-40 -right-40"></div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-8 relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              {/* Removed Orders title and description */}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-[rgba(255,255,255,0.02)] border-0 p-5 rounded-2xl shadow-lg shadow-black/50">
              <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest mb-1">Total Orders</p>
              <h3 className="text-2xl font-bold text-ui-primary">{stats.total}</h3>
            </div>
            <div className="bg-[rgba(255,255,255,0.02)] border-0 border-l-2 border-l-[#2CC295] p-5 rounded-2xl shadow-lg shadow-black/50">
              <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest mb-1">Active Escrow</p>
              <h3 className="text-2xl font-bold text-ui-primary">{stats.active}</h3>
            </div>
            <div className="bg-[rgba(255,255,255,0.02)] border-0 p-5 rounded-2xl shadow-lg shadow-black/50">
              <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest mb-1">Completed</p>
              <h3 className="text-2xl font-bold text-ui-primary">{stats.completed}</h3>
            </div>
            <div className="bg-[rgba(255,255,255,0.02)] border-0 border-l-2 border-l-[#F7DC7F] p-5 rounded-2xl shadow-lg shadow-black/50">
              <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest mb-1">Volume (ETH)</p>
              <h3 className="text-2xl font-bold text-ui-primary">{stats.volume.toFixed(2)}</h3>
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.orderId.toString()}
                onClick={() => setSelectedOrder(order)}
                className={`bg-[#141417] border rounded-2xl overflow-hidden cursor-pointer transition-all ${order.state === 1
                    ? 'border-l-4 border-l-[#2CC295] border-[#27272a]'
                    : 'border-l-4 border-l-[#F7DC7F] border-[#27272a]'
                  } ${selectedOrder.orderId === order.orderId ? 'ring-2 ring-[#2CC295]' : ''}`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      {/* Progress Ring */}
                      <div className="relative w-10 h-10 shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle
                            className="stroke-zinc-800"
                            cx="18"
                            cy="18"
                            fill="none"
                            r="16"
                            strokeWidth="3"
                          />
                          <circle
                            className={order.state === 1 ? 'stroke-[#2CC295]' : 'stroke-[#F7DC7F]'}
                            cx="18"
                            cy="18"
                            fill="none"
                            r="16"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="100"
                            strokeDashoffset={getProgressDashOffset(order.progress)}
                            style={{ transition: 'stroke-dashoffset 0.35s' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-[8px] font-bold ${order.state === 1 ? 'text-primary' : 'text-[#F7DC7F]'}`}>
                            {order.progress}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-base font-bold text-ui-primary font-mono">#{order.orderId.toString()}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${order.state === 1
                              ? 'bg-zinc-800 text-primary border-[#27272a]'
                              : 'bg-zinc-800 text-[#F7DC7F] border-[#27272a]'
                            }`}>
                            {order.state === 0 ? 'Proposed' : order.state === 1 ? 'Paid' : 'Completed'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Timer size={14} className="text-ui-muted" />
                          <p className="text-[11px] text-ui-muted font-medium">
                            {order.state === 1 ? 'Auto-Release: ' : 'Payment Due: '}
                            <span className="font-mono text-ui-primary">
                              {order.state === 1
                                ? formatCountdown(order.autoReleaseAt)
                                : formatCountdown(order.payDeadline)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-bold text-ui-muted uppercase mb-1">
                        {order.state === 0 ? 'Total Due' : 'Order Value'}
                      </p>
                      <p className="text-2xl font-black text-ui-primary">
                        {formatEther(order.grossPrice)} ETH
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                          <User className="text-blue-400" size={16} />
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-ui-muted">Buyer</p>
                          <p className="text-xs font-mono text-ui-secondary">{formatAddress(order.buyer)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-[rgba(255,255,255,0.02)] border-0 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                          <Store className="text-purple-400" size={16} />
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-ui-muted">Seller</p>
                          <p className="text-xs font-mono text-ui-secondary">{formatAddress(order.seller)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[#27272a]">
                      <button className="bg-zinc-800 text-ui-secondary border border-[#27272a] text-[10px] font-bold px-3 py-1.5 rounded-lg hover:text-ui-primary transition-all flex items-center gap-1">
                        <Info size={12} />
                        Details
                      </button>
                      {order.state === 1 ? (
                        <button className="bg-[#2CC295] text-black text-[10px] font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition-all flex items-center gap-1">
                          <Check size={12} />
                          Confirm Release
                        </button>
                      ) : order.state === 0 ? (
                        <>
                          <button className="bg-zinc-800 text-ui-secondary border border-[#27272a] text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-all flex items-center gap-1">
                            <XCircle size={12} />
                            Cancel Order
                          </button>
                          <button className="bg-[#2CC295] text-black text-[10px] font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition-all flex items-center gap-1">
                            <Check size={12} />
                            Pay Now
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Order Summary */}
      <aside className="w-[340px] bg-[#141417] flex flex-col border-l border-[#27272a]">
        <div className="p-6 border-b border-[#27272a]">
          <h2 className="text-ui-primary font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
            <CheckCircle className="text-ui-muted" size={18} />
            Order Summary
          </h2>
          <p className="text-xs text-ui-muted mt-1">EIP-712 Signature Status</p>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-6">
          {/* Signature Status */}
          <div className="p-5 bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl space-y-5 shadow-lg shadow-black/50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedOrder.signatures.buyer1 ? 'bg-[#2CC295]' : 'border border-zinc-700'
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
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedOrder.signatures.seller ? 'bg-[#2CC295]' : 'border border-zinc-700'
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
                  <span className="text-[10px] text-ui-muted bg-zinc-800 px-1.5 py-0.5 rounded font-bold">PENDING</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedOrder.signatures.buyer2 ? 'bg-[#2CC295]' : 'border border-zinc-700'
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
                  <span className="text-[10px] text-ui-muted bg-zinc-800 px-1.5 py-0.5 rounded font-bold">WAITING</span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#27272a]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">Process Confidence</span>
                <span className="text-[10px] font-bold text-primary">{selectedOrder.progress}%</span>
              </div>
              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2CC295] transition-all duration-500"
                  style={{ width: `${selectedOrder.progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* History Feed */}
          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-widest font-black text-ui-muted px-2">History Feed</h3>
            <div className="space-y-4 px-2">
              {selectedOrder.state === 1 && (
                <>
                  <div className="relative pl-6 border-l border-zinc-800 pb-4">
                    <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-[#2CC295]" />
                    <p className="text-xs font-bold text-ui-primary">Funds Deposited</p>
                    <p className="text-[10px] text-ui-muted mt-1">{formatEther(selectedOrder.grossPrice)} ETH sent to Escrow</p>
                    <p className="text-[9px] font-mono text-ui-muted mt-1">2 mins ago</p>
                  </div>
                  <div className="relative pl-6 border-l border-zinc-800 pb-4">
                    <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <p className="text-xs font-bold text-ui-secondary">Buyer Signed (EIP-712)</p>
                    <p className="text-[10px] text-ui-muted mt-1">Signature Hash: 0x92...11</p>
                    <p className="text-[9px] font-mono text-ui-muted mt-1">5 mins ago</p>
                  </div>
                </>
              )}
              <div className="relative pl-6 border-l border-zinc-800 pb-4">
                <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <p className="text-xs font-bold text-ui-secondary">Order Proposed</p>
                <p className="text-[10px] text-ui-muted mt-1">Creation by {formatAddress(selectedOrder.buyer)}</p>
                <p className="text-[9px] font-mono text-ui-muted mt-1">12 mins ago</p>
              </div>

              {/* Product Information */}
              <div className="mt-4 p-4 bg-zinc-900/50 rounded-xl border border-[#27272a]">
                <p className="text-[10px] font-bold text-ui-muted uppercase mb-2 tracking-wider">Product Information</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-[#27272a] overflow-hidden">
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
                      <span className="text-[10px] font-mono font-bold text-primary">{selectedOrder.amount.toString()}.0</span>
                      <span className="text-[10px] text-ui-muted ml-1">Price:</span>
                      <span className="text-[10px] font-mono font-bold text-ui-primary">{formatEther(selectedOrder.grossPrice)} ETH</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-[#27272a] p-5 bg-[#141417]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-ui-muted uppercase">Node Health</span>
            <span className="text-[10px] font-black text-primary flex items-center gap-1.5">
              <Circle size={6} className="fill-[#2CC295]" />
              SYNCED
            </span>
          </div>
          <button className="w-full py-2.5 rounded-xl bg-[rgba(255,255,255,0.02)] border-0 text-[11px] font-bold text-ui-primary uppercase tracking-wider hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
            <ExternalLink size={14} />
            View on Etherscan
          </button>
        </div>
      </aside>
    </div>
  );
}