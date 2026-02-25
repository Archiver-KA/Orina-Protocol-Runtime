import { useState, useEffect } from 'react';
import { X, ArrowLeft, Shield, Package, TrendingUp, Edit3, BarChart3, Clock, CheckCircle2, AlertCircle, Eye, DollarSign, Users, Activity, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SellerAssetManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: string;
    name: string;
    category: string;
    image: string;
    totalAmount: string;
    availableAmount: string;
    minPrice: string;
    status: string;
    mintedDate: string;
  } | null;
}

type SellerTab = 'overview' | 'active-orders' | 'sales-history' | 'manage-listing' | 'analytics';

export function SellerAssetManagementModal({ isOpen, onClose, asset }: SellerAssetManagementModalProps) {
  const [activeTab, setActiveTab] = useState<SellerTab>('overview');

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !asset) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      >
        {/* Backdrop Overlay */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        ></div>

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-[95vw] h-[90vh] bg-[#0f0f11] rounded-xl shadow-2xl border border-[#27272a] overflow-hidden flex"
        >
          <style>{`
            .hidden-scrollbar::-webkit-scrollbar { display: none; }
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

          {/* Left Sidebar - Navigation & Asset Info */}
          <aside className="w-64 bg-zinc-900/30 flex flex-col border-r border-[#27272a] overflow-hidden relative z-10">
            {/* Header with Close Button */}
            <div className="p-6 border-b border-[#27272a]">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#27272a] bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
                >
                  <X className="text-zinc-400" size={20} />
                </button>
                <div>
                  <h2 className="text-white font-bold text-sm uppercase tracking-wider">Manage Asset</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Seller Dashboard</p>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="p-6">
              <nav className="space-y-2">
                <NavItem
                  icon={<BarChart3 size={14} />}
                  label="Overview"
                  isActive={activeTab === 'overview'}
                  onClick={() => setActiveTab('overview')}
                />
                <NavItem
                  icon={<Clock size={14} />}
                  label="Active Orders"
                  badge="3"
                  isActive={activeTab === 'active-orders'}
                  onClick={() => setActiveTab('active-orders')}
                />
                <NavItem
                  icon={<CheckCircle2 size={14} />}
                  label="Sales History"
                  isActive={activeTab === 'sales-history'}
                  onClick={() => setActiveTab('sales-history')}
                />
                <NavItem
                  icon={<Edit3 size={14} />}
                  label="Manage Listing"
                  highlighted
                  isActive={activeTab === 'manage-listing'}
                  onClick={() => setActiveTab('manage-listing')}
                />
                <NavItem
                  icon={<TrendingUp size={14} />}
                  label="Analytics"
                  isActive={activeTab === 'analytics'}
                  onClick={() => setActiveTab('analytics')}
                />
              </nav>
            </div>
          </aside>

          {/* Middle Section - Asset Display */}
          <section className="flex-1 overflow-y-auto hidden-scrollbar relative">
            <div className="p-6 md:p-8 relative z-10">
              {/* Title */}
              <div className="pb-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-lg font-bold text-white tracking-tight">{asset.name}</h1>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                      TOKEN ID #{asset.id.slice(-4)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest ${
                    asset.status === 'Active' 
                      ? 'bg-[#2CC295]/10 border-[#2CC295]/20 text-[#2CC295]' 
                      : 'bg-zinc-900 border-[#27272a] text-zinc-400'
                  }`}>
                    {asset.status}
                  </span>
                </div>
              </div>

              {/* Asset Image - Smaller */}
              <div className="rounded-xl overflow-hidden bg-black relative group mb-6">
                <div className="aspect-video">
                  <img
                    src={asset.image}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                    style={{ filter: 'brightness(1.15) contrast(1.1)', opacity: 1 }}
                  />
                </div>
                
                {/* Glass Badge */}
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] font-bold text-white uppercase tracking-widest border border-white/10">
                    External View 01
                  </span>
                </div>
              </div>

              {/* Asset Stats Grid - Compact */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-4">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5">Total Minted</p>
                  <p className="text-xl font-bold text-white">{asset.totalAmount}</p>
                </div>
                <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-4">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5">Available</p>
                  <p className="text-xl font-bold text-[#2CC295]">{asset.availableAmount}</p>
                </div>
                <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-4">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5">Min Price</p>
                  <p className="text-xl font-bold text-white">{asset.minPrice}</p>
                </div>
                <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-4">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1.5">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${asset.status === 'Active' ? 'bg-green-400 animate-pulse' : 'bg-zinc-500'}`}></div>
                    <p className="text-base font-bold text-white">{asset.status}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right Sidebar - Content Tabs */}
          <aside className="w-96 bg-zinc-900/30 flex flex-col border-l border-[#27272a] overflow-hidden">
            {/* Tab Content Header */}
            <div className="p-6 border-b border-[#27272a]">
              <h2 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                <Shield className="text-[#2CC295]" size={18} />
                {activeTab === 'overview' && 'Overview'}
                {activeTab === 'active-orders' && 'Active Orders'}
                {activeTab === 'sales-history' && 'Sales History'}
                {activeTab === 'manage-listing' && 'Manage Listing'}
                {activeTab === 'analytics' && 'Analytics'}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Management Dashboard</p>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto hidden-scrollbar p-6">
              {activeTab === 'overview' && <OverviewTab asset={asset} />}
              {activeTab === 'active-orders' && <ActiveOrdersTab />}
              {activeTab === 'sales-history' && <SalesHistoryTab />}
              {activeTab === 'manage-listing' && <ManageListingTab asset={asset} />}
              {activeTab === 'analytics' && <AnalyticsTab />}
            </div>
          </aside>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Navigation Item Component - STANDARDIZED
function NavItem({
  icon,
  label,
  badge,
  highlighted,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  highlighted?: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all text-left border
        ${isActive
          ? 'bg-[#2CC295]/10 border-[#2CC295]/30 text-[#2CC295]'
          : highlighted
          ? 'bg-zinc-900/50 border-[#2CC295]/20 text-zinc-300 hover:bg-[#2CC295]/5'
          : 'border-transparent text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300'
        }
      `}
    >
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      </div>
      {badge && (
        <span className="px-2 py-0.5 bg-[#2CC295] text-black text-[9px] font-bold rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

// Overview Tab - STANDARDIZED
function OverviewTab({ asset }: { asset: any }) {
  return (
    <div className="space-y-6">
      {/* Asset Information */}
      <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={14} className="text-[#2CC295]" />
          <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Asset Information</h3>
        </div>
        <div className="space-y-0">
          <div className="flex items-center justify-between py-3 border-b border-[#27272a]">
            <span className="text-xs text-zinc-500">Category</span>
            <span className="text-xs font-bold text-white">{asset.category}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#27272a]">
            <span className="text-xs text-zinc-500">Minted Date</span>
            <span className="text-xs font-bold text-white">{asset.mintedDate}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#27272a]">
            <span className="text-xs text-zinc-500">Asset Type</span>
            <span className="text-xs font-bold text-[#2CC295]">RWA (Real World Asset)</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-xs text-zinc-500">Verification</span>
            <div className="flex items-center gap-2">
              <Shield size={12} className="text-[#2CC295]" />
              <span className="text-xs font-bold text-[#2CC295]">VERIFIED</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-white mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<DollarSign size={18} className="text-[#2CC295]" />}
            label="Total Revenue"
            value="47.5 ETH"
            change="+12.4%"
          />
          <StatCard
            icon={<Users size={18} className="text-blue-400" />}
            label="Total Buyers"
            value="55"
            change="+8"
          />
          <StatCard
            icon={<Package size={18} className="text-purple-400" />}
            label="Units Sold"
            value={`${parseInt(asset.totalAmount) - parseInt(asset.availableAmount)}`}
            subtitle={`of ${asset.totalAmount}`}
          />
          <StatCard
            icon={<Activity size={18} className="text-orange-400" />}
            label="Active Orders"
            value="3"
            subtitle="Pending"
          />
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={12} className="text-[#2CC295]" />
          <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Recent Activity</h4>
        </div>
        <div className="space-y-0">
          <ActivityItem
            type="sale"
            message="Order #1234 completed"
            time="2 hours ago"
            amount="0.85 ETH"
          />
          <ActivityItem
            type="pending"
            message="New order received"
            time="5 hours ago"
            amount="1.2 ETH"
          />
          <ActivityItem
            type="sale"
            message="Order #1230 completed"
            time="1 day ago"
            amount="0.95 ETH"
          />
        </div>
      </div>
    </div>
  );
}

// Active Orders Tab - STANDARDIZED
function ActiveOrdersTab() {
  const mockOrders = [
    { id: 'ORD-1245', buyer: '0x742d...9c4F', amount: '2', price: '5.0 ETH', status: 'Pending Payment', time: '2h ago' },
    { id: 'ORD-1244', buyer: '0x8f3a...2b1D', amount: '1', price: '2.5 ETH', status: 'Paid - Awaiting Release', time: '5h ago' },
    { id: 'ORD-1243', buyer: '0x1c7e...5a9B', amount: '3', price: '7.5 ETH', status: 'Pending Payment', time: '1d ago' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Active Orders</h3>
        <span className="text-xs text-zinc-500">{mockOrders.length} pending</span>
      </div>
      {mockOrders.map((order) => (
        <div key={order.id} className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-5 transition-all hover:border-[#2CC295]/30">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-white mb-1">{order.id}</p>
              <p className="text-[10px] text-zinc-500">Buyer: {order.buyer}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
              order.status.includes('Paid')
                ? 'bg-green-500/20 text-green-300 border-green-500/30'
                : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
            }`}>
              {order.status}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] mb-4">
            <div className="flex items-center gap-4">
              <span className="text-zinc-500">Amount: <span className="text-white font-bold">{order.amount} units</span></span>
              <span className="text-zinc-500">Price: <span className="text-[#2CC295] font-bold">{order.price}</span></span>
            </div>
            <span className="text-zinc-600">{order.time}</span>
          </div>
          {order.status.includes('Paid') && (
            <button className="w-full py-3 bg-[#2CC295] hover:brightness-110 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#2CC295]/10">
              Release Asset
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// Sales History Tab - STANDARDIZED
function SalesHistoryTab() {
  const mockSales = [
    { id: 'ORD-1240', buyer: '0x9a2b...3c4D', amount: '1', price: '2.5 ETH', date: '2024-02-01', status: 'Finalized' },
    { id: 'ORD-1238', buyer: '0x5e6f...7g8H', amount: '2', price: '5.0 ETH', date: '2024-01-28', status: 'Finalized' },
    { id: 'ORD-1235', buyer: '0x1i2j...3k4L', amount: '1', price: '2.5 ETH', date: '2024-01-25', status: 'Finalized' },
    { id: 'ORD-1230', buyer: '0x5m6n...7o8P', amount: '3', price: '7.5 ETH', date: '2024-01-20', status: 'Finalized' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Sales History</h3>
        <span className="text-xs text-zinc-500">{mockSales.length} completed</span>
      </div>
      {mockSales.map((sale) => (
        <div key={sale.id} className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-white mb-1">{sale.id}</p>
              <p className="text-[10px] text-zinc-500">Buyer: {sale.buyer}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 rounded-full border border-green-500/30">
              <CheckCircle2 size={10} className="text-green-400" />
              <span className="text-[9px] font-bold text-green-300 uppercase tracking-widest">{sale.status}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-4">
              <span className="text-zinc-500">Amount: <span className="text-white font-bold">{sale.amount} units</span></span>
              <span className="text-zinc-500">Price: <span className="text-[#2CC295] font-bold">{sale.price}</span></span>
            </div>
            <span className="text-zinc-600">{sale.date}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Manage Listing Tab - STANDARDIZED
function ManageListingTab({ asset }: { asset: any }) {
  const [minPrice, setMinPrice] = useState(asset.minPrice);
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white mb-5">Listing Settings</h3>
        
        {/* Price Management */}
        <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-5 mb-4">
          <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Minimum Price per Unit</label>
          <div className="flex gap-3 mb-2">
            <input
              type="text"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="flex-1 bg-zinc-950 border border-[#27272a] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2CC295]"
              placeholder="2.5 ETH"
            />
            <button className="px-6 py-3 bg-[#2CC295] hover:brightness-110 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#2CC295]/10">
              Update
            </button>
          </div>
          <p className="text-[10px] text-zinc-600">Current: {asset.minPrice}</p>
        </div>

        {/* Pause/Resume Listing */}
        <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-white mb-1">Listing Status</h4>
              <p className="text-[10px] text-zinc-500">Pause listing to prevent new orders</p>
            </div>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all border ${
                isPaused
                  ? 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30'
                  : 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30'
              }`}
            >
              {isPaused ? 'Resume Listing' : 'Pause Listing'}
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-orange-400' : 'bg-green-400 animate-pulse'}`}></div>
            <span className="text-zinc-500">{isPaused ? 'Listing is paused' : 'Listing is active'}</span>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={14} className="text-red-400" />
            <h4 className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Danger Zone</h4>
          </div>
          <p className="text-[10px] text-zinc-500 mb-4">Permanently remove this listing from marketplace</p>
          <button className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
            Delist Asset
          </button>
        </div>
      </div>
    </div>
  );
}

// Analytics Tab - STANDARDIZED
function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-white mb-4">Performance Analytics</h3>
      
      {/* Chart Placeholder */}
      <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6 h-64 flex items-center justify-center">
        <div className="text-center">
          <TrendingUp size={48} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-xs text-zinc-500">Sales chart coming soon</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-4">
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Avg Sale Price</p>
          <p className="text-2xl font-bold text-white">2.64 ETH</p>
          <p className="text-[10px] text-[#2CC295] font-bold mt-1">+5.2% vs avg</p>
        </div>
        <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-4">
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Conversion Rate</p>
          <p className="text-2xl font-bold text-white">68%</p>
          <p className="text-[10px] text-zinc-500 mt-1">Views to sales</p>
        </div>
      </div>
    </div>
  );
}

// Helper Components - STANDARDIZED
function StatCard({ icon, label, value, change, subtitle }: any) {
  return (
    <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {change && (
        <p className={`text-[10px] font-bold mt-1 ${change.startsWith('+') ? 'text-[#2CC295]' : 'text-red-400'}`}>
          {change}
        </p>
      )}
      {subtitle && <p className="text-[10px] text-zinc-600 mt-1">{subtitle}</p>}
    </div>
  );
}

function ActivityItem({ type, message, time, amount }: any) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#27272a] last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${
          type === 'sale' ? 'bg-[#2CC295]' : 'bg-orange-400'
        }`}></div>
        <div>
          <p className="text-xs text-white font-bold">{message}</p>
          <p className="text-[10px] text-zinc-600">{time}</p>
        </div>
      </div>
      <span className="text-xs font-bold text-[#2CC295]">{amount}</span>
    </div>
  );
}