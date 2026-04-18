import { Clock, DollarSign, ExternalLink, Hash, MapPin, Package, Receipt, SlidersHorizontal, Store, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AssetThumb } from '@/app/components/asset-thumb';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { EXPLORER_URLS } from '@/config/contracts';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';
import type { OrderUiRecord } from '@/types/order';
import { formatAddress } from '@/utils/format';
import {
  formatOrderGrossPrice,
  formatOrderQuantity,
  getOrderGrossPriceNumber,
  getOrderPaymentSymbol,
  getOrderShippingDetails,
  hasOrderShippingDetails,
} from '@/utils/orderDisplay';

interface OrderDetailsModalProps {
  order: OrderUiRecord;
  onClose: () => void;
}

const ORDER_STATES = ['PENDING_CONFIRM', 'PAID', 'DISPUTED', 'FINALIZED', 'CANCELLED'] as const;

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
  if (!estDeliverySeconds || estDeliverySeconds === 0n) return 'Not set';
  const totalSeconds = Number(estDeliverySeconds);
  const days = Math.floor(totalSeconds / (24 * 3600));
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  const hours = Math.floor(totalSeconds / 3600);
  return `${hours} hour${hours > 1 ? 's' : ''}`;
}

export function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  const { chainId: liveChainId } = useProtocolDataNetwork();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const grossPriceNum = getOrderGrossPriceNumber(order.grossPrice, order.paymentTokenDecimals);
  const safeGrossPriceNum = Number.isFinite(grossPriceNum) ? grossPriceNum : 0;
  const platformFeeBps = Number.isFinite(Number(order.platformFeeBpsSnapshot)) ? Number(order.platformFeeBpsSnapshot) : 0;
  const daoFeeBps = Number.isFinite(Number(order.daoFeeBpsSnapshot)) ? Number(order.daoFeeBpsSnapshot) : 0;
  const burnFeeBps = Number.isFinite(Number(order.burnFeeBpsSnapshot)) ? Number(order.burnFeeBpsSnapshot) : 0;
  const platformFee = (safeGrossPriceNum * platformFeeBps) / 10000;
  const daoFee = (safeGrossPriceNum * daoFeeBps) / 10000;
  const burnFee = (safeGrossPriceNum * burnFeeBps) / 10000;
  const sellerReceives = Math.max(safeGrossPriceNum - platformFee - daoFee - burnFee, 0);
  const status = ORDER_STATES[order.state] ?? 'UNKNOWN';
  const paymentSymbol = getOrderPaymentSymbol(order.paymentTokenSymbol);
  const grossPriceLabel = formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals);
  const quantityLabel = formatOrderQuantity(order.amount, order.unitLabel, order.unitName);
  const shippingDetails = getOrderShippingDetails(order.shippingAddressSnapshot, order.shippingMethodLabel);
  const explorerBaseUrl = EXPLORER_URLS[liveChainId ?? 97] ?? EXPLORER_URLS[97];
  const formatPaymentValue = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    return `${safeValue.toFixed(safeValue >= 1 ? 4 : 6)} ${paymentSymbol}`;
  };
  const sectionShellClass = 'studio-portal-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-5';
  const insetShellClass = 'rounded-none border-0 bg-transparent p-0';
  const dividerClass = 'h-px bg-ui-border-subtle';
  const sectionLabelClass = 'text-[10px] font-medium uppercase tracking-[0.16em] text-ui-muted';
  const breakdownRowLabelClass = 'text-[11px] font-medium text-ui-secondary';
  const breakdownValueClass = 'tabular-nums text-sm font-semibold tracking-[-0.02em] text-ui-primary';
  const breakdownSubvalueClass = 'tabular-nums text-sm font-medium tracking-[-0.02em] text-ui-secondary';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="studio-portal-backdrop fixed inset-0 z-[75] flex items-center justify-center bg-black/85 p-4 backdrop-blur-[14px] md:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="studio-modal-theme studio-portal-modal studio-glass-modal relative flex h-[calc(100dvh-3rem)] w-full max-w-[860px] flex-col overflow-hidden rounded-[32px] border border-ui-border-subtle bg-ui-card backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`.hidden-scrollbar::-webkit-scrollbar{display:none;}`}</style>

          <div className="studio-portal-header studio-glass-header relative z-10 shrink-0 border-b border-ui-border-subtle bg-ui-card p-5 pb-4 backdrop-blur-[20px] md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight text-ui-primary">Order Details</h1>
                <p className="mt-0.5 text-[10px] uppercase tracking-widest text-ui-muted">
                  #{`ORD-${order.orderId.toString().slice(-6)}`} • {status}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="studio-portal-chip inline-flex h-7 items-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-3 text-[9px] font-semibold uppercase tracking-widest text-ui-secondary">
                  Qty {quantityLabel}
                </span>
                <span className="inline-flex h-7 items-center rounded-full border border-[#2CC295]/30 bg-[#2CC295]/15 px-3 text-[9px] font-semibold uppercase tracking-widest text-[#2CC295]">
                  {grossPriceLabel}
                </span>
                <StudioModalCloseButton onClick={onClose} />
              </div>
            </div>
          </div>

          <section className="min-w-0 min-h-0 flex-1 overflow-y-auto lg:overflow-hidden hidden-scrollbar relative">
            <div className="h-full p-5 md:p-6 pt-4 relative z-10">
              <div className="w-full h-full max-w-[860px] mx-auto flex flex-col lg:flex-row justify-center items-start gap-6 px-0 md:px-2">
                <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-4 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                  <div className={sectionShellClass}>
                    <div className="flex items-center gap-2 mb-3">
                      <Package size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">Asset Information</h3>
                    </div>
                    <div className={`${insetShellClass} flex items-center gap-3`}>
                      <AssetThumb
                        src={order.assetImage}
                        alt={order.assetName}
                        className="h-16 w-16 shrink-0 rounded-[18px] border border-ui-border-subtle bg-[var(--t-surface-3)]"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ui-primary">{order.assetName}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest text-ui-muted">
                          <span>Asset ID #{order.assetId.toString()}</span>
                          <span>{quantityLabel}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={sectionShellClass}>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">Shipping Address</h3>
                    </div>
                    <div className={`${insetShellClass} space-y-1.5`}>
                      {hasOrderShippingDetails(shippingDetails) ? (
                        <>
                          {shippingDetails.methodLabel ? <p className="text-xs font-semibold text-[#2CC295]">{shippingDetails.methodLabel}</p> : null}
                          {shippingDetails.recipientName ? <p className="text-sm font-semibold text-ui-primary">{shippingDetails.recipientName}</p> : null}
                          {shippingDetails.address ? <p className="text-xs leading-relaxed text-ui-secondary">{shippingDetails.address}</p> : null}
                          {shippingDetails.phone ? (
                            <div className="mt-2 border-t border-ui-border-subtle pt-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-widest text-ui-muted">Phone</span>
                                <span className="text-xs font-mono text-ui-primary">{shippingDetails.phone}</span>
                              </div>
                            </div>
                          ) : null}
                          {shippingDetails.instructions ? (
                            <div className="mt-2 border-t border-ui-border-subtle pt-2">
                              <p className="text-[10px] uppercase tracking-widest text-ui-muted">Instructions</p>
                              <p className="mt-1 text-xs leading-relaxed text-ui-secondary">{shippingDetails.instructions}</p>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-xs text-ui-secondary">No shipping snapshot was captured for this order.</p>
                      )}
                    </div>
                  </div>

                  <div className={sectionShellClass}>
                    <div className="flex items-center gap-2 mb-3">
                      <SlidersHorizontal size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">Buyer Selections</h3>
                    </div>
                    <div className={`${insetShellClass} space-y-2.5`}>
                      {order.selectedAttributes && order.selectedAttributes.length > 0 ? (
                        order.selectedAttributes.map((attribute) => (
                          <div
                            key={attribute.groupId}
                            className="flex items-start justify-between gap-3"
                          >
                            <span className="text-[10px] uppercase tracking-widest text-ui-muted">
                              {attribute.groupLabel}
                            </span>
                            <span className="text-right text-xs font-semibold text-ui-primary">
                              {attribute.values.join(', ')}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-ui-secondary">No buyer-selected off-chain attributes were attached to this order.</p>
                      )}
                    </div>
                  </div>

                  <div className={sectionShellClass}>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">Order Timeline</h3>
                    </div>
                    <div className={`${insetShellClass} space-y-3`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-ui-primary">Order Proposed</p>
                          <p className="mt-0.5 text-[10px] text-ui-muted">Buyer initiated order</p>
                        </div>
                        <span className="text-[10px] font-mono text-ui-secondary">{formatDate(order.proposedAt)}</span>
                      </div>

                      {order.sellerConfirmedAt && Number(order.sellerConfirmedAt) > 0 ? (
                        <>
                          <div className={dividerClass} />
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold text-ui-primary">Seller Confirmed</p>
                              <p className="mt-0.5 text-[10px] text-ui-muted">Delivery: {estimateDelivery(order.estDeliverySeconds)}</p>
                            </div>
                            <span className="text-[10px] font-mono text-ui-secondary">{formatDate(order.sellerConfirmedAt)}</span>
                          </div>
                        </>
                      ) : null}

                      {order.paidAt && Number(order.paidAt) > 0 ? (
                        <>
                          <div className={dividerClass} />
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold text-ui-primary">Payment Received</p>
                              <p className="mt-0.5 text-[10px] text-ui-muted">Escrow funded</p>
                            </div>
                            <span className="text-[10px] font-mono text-ui-secondary">{formatDate(order.paidAt)}</span>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-4 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                  <div className={sectionShellClass}>
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign size={14} className="text-[#2CC295]" />
                      <h3 className={sectionLabelClass}>Price Breakdown</h3>
                    </div>
                    <div className={`${insetShellClass} space-y-3`}>
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className={sectionLabelClass}>Gross Price</p>
                          <p className="mt-2 tabular-nums text-[30px] font-semibold leading-none tracking-[-0.03em] text-ui-primary">
                            {grossPriceLabel}
                          </p>
                        </div>
                      </div>
                      <div className={dividerClass} />
                      <div className="flex items-center justify-between">
                        <span className={breakdownRowLabelClass}>
                          Platform Fee ({platformFeeBps / 100}%)
                        </span>
                        <span className={breakdownSubvalueClass}>{formatPaymentValue(platformFee)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={breakdownRowLabelClass}>DAO Fee ({daoFeeBps / 100}%)</span>
                        <span className={breakdownSubvalueClass}>{formatPaymentValue(daoFee)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={breakdownRowLabelClass}>Burn Fee ({burnFeeBps / 100}%)</span>
                        <span className={breakdownSubvalueClass}>{formatPaymentValue(burnFee)}</span>
                      </div>
                      <div className={dividerClass} />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-ui-primary">Seller Receives</span>
                        <span className={`${breakdownValueClass} text-[#2CC295]`}>{formatPaymentValue(sellerReceives)}</span>
                      </div>
                    </div>
                  </div>

                  <div className={sectionShellClass}>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={insetShellClass}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <User className="text-blue-400" size={14} />
                          </div>
                          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">Buyer</h3>
                        </div>
                        <p className="text-xs font-mono text-ui-primary">{formatAddress(order.buyer)}</p>
                        <a
                          className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-[10px] font-semibold uppercase tracking-widest text-blue-300 transition-colors hover:bg-blue-500/20"
                          href={`${explorerBaseUrl}/address/${order.buyer}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={11} />
                          Explorer
                        </a>
                      </div>

                      <div className={insetShellClass}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                            <Store className="text-violet-300" size={14} />
                          </div>
                          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">Seller</h3>
                        </div>
                        <p className="text-xs font-mono text-ui-primary">{formatAddress(order.seller)}</p>
                        <a
                          className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-[10px] font-semibold uppercase tracking-widest text-violet-300 transition-colors hover:bg-violet-500/20"
                          href={`${explorerBaseUrl}/address/${order.seller}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={11} />
                          Explorer
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className={sectionShellClass}>
                    <div className="flex items-center gap-2 mb-3">
                      <Hash size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">Blockchain Information</h3>
                    </div>
                    <div className={`${insetShellClass} space-y-2.5`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-ui-muted">Order ID</span>
                        <span className="text-xs font-mono text-ui-primary">#{order.orderId.toString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-ui-muted">Asset ID</span>
                        <span className="text-xs font-mono text-ui-primary">#{order.assetId.toString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-ui-muted">Payment Token</span>
                        <span className="text-xs font-mono text-ui-primary">{paymentSymbol}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-ui-muted">Network</span>
                        <span className="text-xs font-semibold text-ui-primary">{order.network || 'BSC Testnet'}</span>
                      </div>
                    </div>
                  </div>

                  <div className={sectionShellClass}>
                    <div className="flex items-center gap-2 mb-3">
                      <Receipt size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">Settlement Summary</h3>
                    </div>
                    <div className={`${insetShellClass} text-xs leading-relaxed text-ui-secondary`}>
                      This order will settle according to the on-chain status, the fee snapshot captured on creation, and the agreed delivery/dispute lifecycle currently stored for this order.
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
