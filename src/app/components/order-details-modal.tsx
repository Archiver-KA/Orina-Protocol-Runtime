import { Clock, DollarSign, ExternalLink, Hash, MapPin, Package, Receipt, SlidersHorizontal, Store, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { formatEther } from 'viem';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AssetThumb } from '@/app/components/asset-thumb';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import type { RwaSelectedAttribute } from '@/app/types/asset';
import { formatAddress } from '@/utils/format';

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
    selectedAttributes?: RwaSelectedAttribute[];
    platformFeeBpsSnapshot: bigint;
    daoFeeBpsSnapshot: bigint;
    burnFeeBpsSnapshot: bigint;
  };
  onClose: () => void;
}

const ORDER_STATES = ['PENDING_CONFIRM', 'PAID', 'DISPUTED', 'FINALIZED', 'CANCELLED'] as const;

const shippingAddress = {
  name: 'John Doe',
  street: '123 Blockchain Avenue',
  city: 'San Francisco',
  state: 'CA',
  zip: '94102',
  country: 'United States',
  phone: '+1 (555) 123-4567',
};

function formatDate(timestamp?: bigint) {
  if (!timestamp || Number(timestamp) <= 0) return '-';
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function estimateDelivery(estDeliverySeconds?: bigint) {
  if (!estDeliverySeconds || estDeliverySeconds === BigInt(0)) return 'Not set';
  const totalSeconds = Number(estDeliverySeconds);
  const days = Math.floor(totalSeconds / (24 * 3600));
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  const hours = Math.floor(totalSeconds / 3600);
  return `${hours} hour${hours > 1 ? 's' : ''}`;
}

export function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const grossPriceNum = Number(formatEther(order.grossPrice));
  const platformFee = (grossPriceNum * Number(order.platformFeeBpsSnapshot)) / 10000;
  const daoFee = (grossPriceNum * Number(order.daoFeeBpsSnapshot)) / 10000;
  const burnFee = (grossPriceNum * Number(order.burnFeeBpsSnapshot)) / 10000;
  const totalFees = platformFee + daoFee + burnFee;
  const sellerReceives = grossPriceNum - totalFees;
  const status = ORDER_STATES[order.state] ?? 'UNKNOWN';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="studio-portal-backdrop fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="studio-modal-theme studio-portal-modal relative w-full max-w-[860px] h-[calc(100dvh-3rem)] rounded-[2rem] border-0 bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`.hidden-scrollbar::-webkit-scrollbar{display:none;}`}</style>

          <div className="studio-portal-header shrink-0 p-5 md:p-6 pb-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-white tracking-tight truncate">Order Details</h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                  #{`ORD-${order.orderId.toString().slice(-6)}`} • {status}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="studio-portal-chip h-7 px-3 inline-flex items-center bg-[rgba(255,255,255,0.04)] rounded-full border border-[rgba(255,255,255,0.08)] text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                  Qty {order.amount.toString()}
                </span>
                <span className="h-7 px-3 inline-flex items-center bg-[#2CC295]/15 rounded-full border border-[#2CC295]/30 text-[9px] font-bold text-[#2CC295] uppercase tracking-widest">
                  {formatEther(order.grossPrice)} ETH
                </span>
                <StudioModalCloseButton onClick={onClose} />
              </div>
            </div>
          </div>

          <section className="min-w-0 min-h-0 flex-1 overflow-y-auto lg:overflow-hidden hidden-scrollbar relative">
            <div className="h-full p-5 md:p-6 pt-4 relative z-10">
              <div className="w-full h-full max-w-[860px] mx-auto flex flex-col lg:flex-row justify-center items-start gap-6 px-0 md:px-2">
                <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-4 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Package size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Product Information</h3>
                    </div>
                    <div className="studio-portal-subsurface rounded-xl bg-black/40 border border-[rgba(255,255,255,0.08)] p-3 flex items-center gap-3">
                      <AssetThumb
                        src={order.assetImage}
                        alt={order.assetName}
                        className="w-16 h-16 rounded-xl bg-zinc-800 border border-[#27272a] shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{order.assetName}</p>
                        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-zinc-500 uppercase tracking-widest">
                          <span>Asset ID #{order.orderId.toString().slice(-6)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Shipping Address</h3>
                    </div>
                    <div className="studio-portal-subsurface rounded-xl bg-black/40 border border-[rgba(255,255,255,0.08)] p-3 space-y-1.5">
                      <p className="text-sm font-semibold text-white">{shippingAddress.name}</p>
                      <p className="text-xs text-zinc-400">{shippingAddress.street}</p>
                      <p className="text-xs text-zinc-400">
                        {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
                      </p>
                      <p className="text-xs text-zinc-400">{shippingAddress.country}</p>
                      <div className="pt-2 mt-2 border-t border-[rgba(255,255,255,0.08)]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Phone</span>
                          <span className="text-xs font-mono text-white">{shippingAddress.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <SlidersHorizontal size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Buyer Selections</h3>
                    </div>
                    <div className="studio-portal-subsurface rounded-xl bg-black/40 border border-[rgba(255,255,255,0.08)] p-3 space-y-2.5">
                      {order.selectedAttributes && order.selectedAttributes.length > 0 ? (
                        order.selectedAttributes.map((attribute) => (
                          <div
                            key={attribute.groupId}
                            className="flex items-start justify-between gap-3"
                          >
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                              {attribute.groupLabel}
                            </span>
                            <span className="text-xs font-semibold text-white text-right">
                              {attribute.values.join(', ')}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-zinc-400">No buyer-selected offchain attributes were attached to this order.</p>
                      )}
                    </div>
                  </div>

                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Order Timeline</h3>
                    </div>
                    <div className="studio-portal-subsurface rounded-xl bg-black/40 border border-[rgba(255,255,255,0.08)] p-3 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-white">Order Proposed</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Buyer initiated order</p>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">{formatDate(order.proposedAt)}</span>
                      </div>

                      {order.sellerConfirmedAt && Number(order.sellerConfirmedAt) > 0 && (
                        <>
                          <div className="h-px bg-[rgba(255,255,255,0.08)]" />
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold text-white">Seller Confirmed</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">Delivery: {estimateDelivery(order.estDeliverySeconds)}</p>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400">{formatDate(order.sellerConfirmedAt)}</span>
                          </div>
                        </>
                      )}

                      {order.paidAt && Number(order.paidAt) > 0 && (
                        <>
                          <div className="h-px bg-[rgba(255,255,255,0.08)]" />
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold text-white">Payment Received</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">Escrow funded</p>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400">{formatDate(order.paidAt)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-4 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Price Breakdown</h3>
                    </div>
                    <div className="studio-portal-subsurface rounded-xl bg-black/40 border border-[rgba(255,255,255,0.08)] p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Gross Price</span>
                        <span className="text-sm font-mono font-bold text-white">{formatEther(order.grossPrice)} ETH</span>
                      </div>
                      <div className="h-px bg-[rgba(255,255,255,0.08)]" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">
                          Platform Fee ({Number(order.platformFeeBpsSnapshot) / 100}%)
                        </span>
                        <span className="text-xs font-mono text-zinc-400">{platformFee.toFixed(6)} ETH</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">DAO Fee ({Number(order.daoFeeBpsSnapshot) / 100}%)</span>
                        <span className="text-xs font-mono text-zinc-400">{daoFee.toFixed(6)} ETH</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">Burn Fee ({Number(order.burnFeeBpsSnapshot) / 100}%)</span>
                        <span className="text-xs font-mono text-zinc-400">{burnFee.toFixed(6)} ETH</span>
                      </div>
                      <div className="h-px bg-[rgba(255,255,255,0.08)]" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Seller Receives</span>
                        <span className="text-sm font-mono font-bold text-[#2CC295]">{sellerReceives.toFixed(6)} ETH</span>
                      </div>
                    </div>
                  </div>

                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="studio-portal-subsurface rounded-xl bg-black/40 border border-[rgba(255,255,255,0.08)] p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <User className="text-blue-400" size={14} />
                          </div>
                          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Buyer</h3>
                        </div>
                        <p className="text-xs font-mono text-white">{formatAddress(order.buyer)}</p>
                        <button className="w-full mt-3 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-bold uppercase tracking-widest hover:bg-blue-500/20 transition-colors inline-flex items-center justify-center gap-1.5">
                          <ExternalLink size={11} />
                          Explorer
                        </button>
                      </div>

                      <div className="studio-portal-subsurface rounded-xl bg-black/40 border border-[rgba(255,255,255,0.08)] p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                            <Store className="text-violet-300" size={14} />
                          </div>
                          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Seller</h3>
                        </div>
                        <p className="text-xs font-mono text-white">{formatAddress(order.seller)}</p>
                        <button className="w-full mt-3 h-8 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[10px] font-bold uppercase tracking-widest hover:bg-violet-500/20 transition-colors inline-flex items-center justify-center gap-1.5">
                          <ExternalLink size={11} />
                          Explorer
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Hash size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Blockchain Information</h3>
                    </div>
                    <div className="studio-portal-subsurface rounded-xl bg-black/40 border border-[rgba(255,255,255,0.08)] p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">Order ID</span>
                        <span className="text-xs font-mono text-white">#{order.orderId.toString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">Transaction Hash</span>
                        <span className="text-xs font-mono text-[#2CC295]">0x742d...5925</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">Block Number</span>
                        <span className="text-xs font-mono text-white">18,234,567</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">Network</span>
                        <span className="text-xs font-bold text-white">Ethereum Mainnet</span>
                      </div>
                    </div>
                  </div>

                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Receipt size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Settlement Summary</h3>
                    </div>
                    <div className="studio-portal-subsurface rounded-xl bg-black/40 border border-[rgba(255,255,255,0.08)] p-3 text-xs text-zinc-400 leading-relaxed">
                      This order will settle according to on-chain state transition and fee snapshot at execution time.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
