import { X, Package, MapPin, User, Store, Clock, Hash, ExternalLink, DollarSign, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatEther } from 'viem';
import { formatAddress } from '@/utils/format';
import { AssetThumb } from '@/app/components/asset-thumb';

interface OrderDetailsModalProps {
  order: {
    orderId: bigint;
    assetName: string;
    assetImage: string;
    amount: bigint;
    grossPrice: bigint;
    buyer: `0x${string}`;
    seller: `0x${string}`;
    state: number;
    proposedAt: bigint;
    paidAt?: bigint;
    sellerConfirmedAt?: bigint;
    estDeliverySeconds?: bigint;
    platformFeeBpsSnapshot: bigint;
    daoFeeBpsSnapshot: bigint;
    burnFeeBpsSnapshot: bigint;
  };
  onClose: () => void;
}

export function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  // Calculate fees
  const grossPriceNum = Number(formatEther(order.grossPrice));
  const platformFee = (grossPriceNum * Number(order.platformFeeBpsSnapshot)) / 10000;
  const daoFee = (grossPriceNum * Number(order.daoFeeBpsSnapshot)) / 10000;
  const burnFee = (grossPriceNum * Number(order.burnFeeBpsSnapshot)) / 10000;
  const totalFees = platformFee + daoFee + burnFee;
  const sellerReceives = grossPriceNum - totalFees;

  // Mock shipping address (in production, this would come from encrypted on-chain data or IPFS)
  const shippingAddress = {
    name: 'John Doe',
    street: '123 Blockchain Avenue',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    country: 'United States',
    phone: '+1 (555) 123-4567'
  };

  // Format date
  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate estimated delivery
  const getEstimatedDelivery = () => {
    if (!order.estDeliverySeconds || order.estDeliverySeconds === BigInt(0)) return 'Not set';
    const days = Number(order.estDeliverySeconds) / (24 * 3600);
    if (days < 1) {
      const hours = Number(order.estDeliverySeconds) / 3600;
      return `${hours.toFixed(0)} hours`;
    }
    return `${days.toFixed(0)} days`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#0f0f11] border border-[#27272a] rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-[#27272a] bg-zinc-900/30 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#2CC295]/10 border border-[#2CC295]/20 flex items-center justify-center shrink-0">
                  <Receipt className="text-[#2CC295]" size={24} />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                    Order Details
                  </h2>
                  <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-widest font-mono">
                    #ORD-{order.orderId.toString().slice(-6)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#27272a] bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
              >
                <X size={18} className="text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Product Information */}
            <div className="p-4 bg-zinc-900/30 border border-[#27272a] rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Package size={14} className="text-[#2CC295]" />
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Product Information
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <AssetThumb
                  src={order.assetImage}
                  alt={order.assetName}
                  className="w-16 h-16 rounded-lg bg-zinc-800 border border-[#27272a] shrink-0"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-white mb-2">{order.assetName}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Quantity:</span>
                      <span className="text-xs font-mono font-bold text-[#2CC295]">
                        {order.amount.toString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Asset ID:</span>
                      <span className="text-xs font-mono font-bold text-white">
                        #{order.orderId.toString().slice(-6)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="p-4 bg-zinc-900/30 border border-[#27272a] rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-[#2CC295]" />
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Shipping Address
                </h3>
                <span className="ml-auto text-[8px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                  Encrypted On-Chain
                </span>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-white">{shippingAddress.name}</p>
                <p className="text-xs text-zinc-400">{shippingAddress.street}</p>
                <p className="text-xs text-zinc-400">
                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
                </p>
                <p className="text-xs text-zinc-400">{shippingAddress.country}</p>
                <div className="pt-2 mt-2 border-t border-[#27272a]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Phone:</span>
                    <span className="text-xs font-mono text-white">{shippingAddress.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Buyer & Seller Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-900/30 border border-[#27272a] rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <User className="text-blue-400" size={14} />
                  </div>
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Buyer
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Address:</span>
                    <span className="text-xs font-mono text-white">{formatAddress(order.buyer)}</span>
                  </div>
                  <button className="w-full mt-2 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[9px] font-bold uppercase tracking-widest hover:bg-blue-500/20 transition-all flex items-center justify-center gap-1">
                    <ExternalLink size={11} />
                    View on Explorer
                  </button>
                </div>
              </div>

              <div className="p-4 bg-zinc-900/30 border border-[#27272a] rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Store className="text-purple-400" size={14} />
                  </div>
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Seller
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Address:</span>
                    <span className="text-xs font-mono text-white">{formatAddress(order.seller)}</span>
                  </div>
                  <button className="w-full mt-2 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[9px] font-bold uppercase tracking-widest hover:bg-purple-500/20 transition-all flex items-center justify-center gap-1">
                    <ExternalLink size={11} />
                    View on Explorer
                  </button>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="p-4 bg-zinc-900/30 border border-[#27272a] rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={14} className="text-[#2CC295]" />
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Price Breakdown
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Gross Price</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {formatEther(order.grossPrice)} ETH
                  </span>
                </div>
                <div className="h-px bg-[#27272a]"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">Platform Fee ({Number(order.platformFeeBpsSnapshot) / 100}%)</span>
                  <span className="text-xs font-mono text-zinc-400">
                    {platformFee.toFixed(6)} ETH
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">DAO Fee ({Number(order.daoFeeBpsSnapshot) / 100}%)</span>
                  <span className="text-xs font-mono text-zinc-400">
                    {daoFee.toFixed(6)} ETH
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">Burn Fee ({Number(order.burnFeeBpsSnapshot) / 100}%)</span>
                  <span className="text-xs font-mono text-zinc-400">
                    {burnFee.toFixed(6)} ETH
                  </span>
                </div>
                <div className="h-px bg-[#27272a]"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Seller Receives</span>
                  <span className="text-sm font-mono font-bold text-[#2CC295]">
                    {sellerReceives.toFixed(6)} ETH
                  </span>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="p-4 bg-zinc-900/30 border border-[#27272a] rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-[#2CC295]" />
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Order Timeline
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Order Proposed</p>
                    <p className="text-[9px] text-zinc-500 mt-0.5">Buyer initiated order</p>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {formatDate(order.proposedAt)}
                  </span>
                </div>
                {order.sellerConfirmedAt && Number(order.sellerConfirmedAt) > 0 && (
                  <>
                    <div className="h-px bg-[#27272a]"></div>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-white">Seller Confirmed</p>
                        <p className="text-[9px] text-zinc-500 mt-0.5">Delivery time set: {getEstimatedDelivery()}</p>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {formatDate(order.sellerConfirmedAt)}
                      </span>
                    </div>
                  </>
                )}
                {order.paidAt && Number(order.paidAt) > 0 && (
                  <>
                    <div className="h-px bg-[#27272a]"></div>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-white">Payment Received</p>
                        <p className="text-[9px] text-zinc-500 mt-0.5">Funds locked in escrow</p>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {formatDate(order.paidAt)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Blockchain Info */}
            <div className="p-4 bg-zinc-900/30 border border-[#27272a] rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Hash size={14} className="text-[#2CC295]" />
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Blockchain Information
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">Order ID</span>
                  <span className="text-xs font-mono text-white">
                    #{order.orderId.toString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">Transaction Hash</span>
                  <span className="text-xs font-mono text-[#2CC295]">
                    0x742d...5925
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">Block Number</span>
                  <span className="text-xs font-mono text-white">
                    18,234,567
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">Network</span>
                  <span className="text-xs font-bold text-white">
                    Ethereum Mainnet
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 border-t border-[#27272a] pt-6 flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#2CC295] text-black text-sm font-bold uppercase tracking-wider hover:opacity-90 transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
