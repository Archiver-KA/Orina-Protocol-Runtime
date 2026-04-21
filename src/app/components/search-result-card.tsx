/**
 * SEARCH RESULT CARD - Marketplace Assets
 * ========================================
 * 
 * Blockchain tooltip sử dụng React Portal → render tại document.body
 * → thoát hoàn toàn stacking context, không bị card kế bên che.
 */

import { Heart, Eye, TrendingUp, Clock } from 'lucide-react';
import { memo, useState, useRef, useEffect, useCallback, useLayoutEffect, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { MarketplaceAsset } from '@/app/types/asset';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { getMarketplaceAssetChainInfo } from '@/utils/marketplaceNetwork';
import { getCategoryDisplayLabel } from '@/utils/taxonomy';
import { getTaxonomyBadgeTone } from '@/utils/taxonomyAppearance';
import { navigateToMarketplaceCategory } from '@/utils/appNavigation';

// ============================================================================
// BLOCKCHAIN DETAILED CONFIG
// ============================================================================

const CHAIN_COLORS: Record<string, string> = {
  BSC: '#F0B90B',
  Ethereum: '#627EEA',
  Polygon: '#8247E5',
  Arbitrum: '#28A0F0',
  Base: '#0052FF',
};

const INTERNAL_DESCRIPTION_MARKERS = [
  'buyer-ready rwa listing',
  'search intent',
  'product data mapped',
  'asset is positioned',
  'canonical marketplace',
] as const;

function getPublicAssetDescription(asset: MarketplaceAsset, categoryLabel: string): string {
  const fallback = 'Marketplace listing with live pricing, availability, and ownership details.';
  const rawDescription = String(asset.description || '').replace(/\s+/g, ' ').trim();
  if (!rawDescription) return fallback;

  const lowered = rawDescription.toLowerCase();
  const exposesInternalDescription = INTERNAL_DESCRIPTION_MARKERS.some((marker) => lowered.includes(marker));
  if (!exposesInternalDescription) return rawDescription;

  return `${asset.name} is listed in ${categoryLabel} with live marketplace pricing and availability details.`;
}

// ============================================================================
// BLOCKCHAIN SVG ICONS
// ============================================================================

function BlockchainIcon({ chain, size = 16 }: { chain: string; size?: number }) {
  const color = CHAIN_COLORS[chain] || '#71717a';

  if (chain === 'BSC') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill={color} fillOpacity="0.15" />
        <path d="M16 6l3.2 3.2-6.4 6.4L9.6 12.4 16 6z" fill={color} />
        <path d="M22.4 12.4l3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2z" fill={color} />
        <path d="M9.6 12.4l3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2z" fill={color} />
        <path d="M16 18.8l3.2 3.2L16 25.2l-3.2-3.2L16 18.8z" fill={color} />
        <path d="M16 12.8l3.2 3.2L16 19.2l-3.2-3.2L16 12.8z" fill={color} fillOpacity="0.6" />
      </svg>
    );
  }
  if (chain === 'Ethereum') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill={color} fillOpacity="0.1" />
        <path d="M16 5l-7 11.5 7 4.1V5z" fill={color} fillOpacity="0.5" />
        <path d="M16 5v15.6l7-4.1L16 5z" fill={color} fillOpacity="0.7" />
        <path d="M9 16.5l7 4.1V27L9 18.5v-2z" fill={color} fillOpacity="0.5" />
        <path d="M23 16.5l-7 4.1V27l7-8.5v-2z" fill={color} fillOpacity="0.7" />
        <path d="M9 16.5l7-3.5 7 3.5-7 4.1-7-4.1z" fill={color} fillOpacity="0.3" />
      </svg>
    );
  }
  if (chain === 'Polygon') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill={color} fillOpacity="0.1" />
        <path d="M21.2 13.2c-.4-.2-.9-.2-1.3 0l-3 1.7-2 1.2-3 1.7c-.4.2-.9.2-1.3 0l-2.4-1.4c-.4-.2-.6-.7-.6-1.1v-2.7c0-.5.2-.9.6-1.1l2.3-1.3c.4-.2.9-.2 1.3 0l2.3 1.3c.4.2.6.7.6 1.1v1.7l2-1.2v-1.7c0-.5-.2-.9-.6-1.1l-4.3-2.5c-.4-.2-.9-.2-1.3 0l-4.4 2.5c-.4.2-.6.7-.6 1.1v5.1c0 .5.2.9.6 1.1l4.3 2.5c.4.2.9.2 1.3 0l3-1.7 2-1.2 3-1.7c.4-.2.9-.2 1.3 0l2.3 1.3c.4.2.6.7.6 1.1v2.7c0 .5-.2.9-.6 1.1l-2.3 1.4c-.4.2-.9.2-1.3 0l-2.3-1.4c-.4-.2-.6-.7-.6-1.1v-1.7l-2 1.2v1.7c0 .5.2.9.6 1.1l4.3 2.5c.4.2.9.2 1.3 0l4.3-2.5c.4-.2.6-.7.6-1.1v-5.1c0-.5-.2-.9-.6-1.1l-4.3-2.6z" fill={color} fillOpacity="0.6" />
      </svg>
    );
  }
  if (chain === 'Arbitrum') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill={color} fillOpacity="0.1" />
        <path d="M17.1 11.4l3.4 5.5-2.3 3.7-5.1-8.2h3.1l.9-.01z" fill={color} fillOpacity="0.7" />
        <path d="M22 18.3l-1.5 2.4-3.5-5.7 2.3-3.7L22 18.3z" fill={color} fillOpacity="0.5" />
        <path d="M10 18.3l2.7 4.4 1.5-2.4L10.7 14 10 18.3z" fill={color} fillOpacity="0.5" />
        <path d="M16 8l-5.3 6 3.5 6.3L16 17l1.8 3.3L21.3 14 16 8z" fill={color} fillOpacity="0.3" />
      </svg>
    );
  }
  // Base
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill={color} fillOpacity="0.1" />
      <circle cx="16" cy="16" r="7.5" stroke={color} strokeWidth="2" fill="none" strokeOpacity="0.6" />
      <path d="M16 10.5c3 0 5.5 2.5 5.5 5.5h-5.5v-5.5z" fill={color} fillOpacity="0.4" />
    </svg>
  );
}

// ============================================================================
// TOOLTIP CONTENT — Pure visual, no positioning
// ============================================================================

function TooltipContent({ asset }: { asset: Pick<MarketplaceAsset, 'blockchain' | 'network'> }) {
  const info = getMarketplaceAssetChainInfo(asset);
  const isActive = info.status === 'live';

  return (
    <div
      className="w-[220px] rounded-xl border overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(30,30,34,0.98) 0%, rgba(20,20,23,0.98) 100%)',
        borderColor: `${info.color}25`,
        boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      {/* Top accent line */}
      <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${info.color} 50%, transparent 100%)` }} />

      {/* Header */}
      <div className="px-3.5 pt-3 pb-2.5 flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${info.color}15`, border: `1px solid ${info.color}30` }}
        >
          <BlockchainIcon chain={info.blockchain} size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-white truncate">{info.fullName}</span>
            {isActive && (
              <span className="flex-shrink-0 text-[7px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#2CC295]/15 text-[#2CC295] border border-[#2CC295]/20">
                Live
              </span>
            )}
          </div>
          <span className="text-[9px] font-medium text-zinc-500">{info.label}</span>
        </div>
      </div>

      <div className="mx-3 h-px bg-white/5" />

      {/* Details Grid */}
      <div className="px-3.5 py-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
        <div>
          <p className="text-[8px] font-semibold text-zinc-600 uppercase tracking-wider">Chain ID</p>
          <p className="text-[10px] font-mono font-semibold text-zinc-300">{info.chainId}</p>
        </div>
        <div>
          <p className="text-[8px] font-semibold text-zinc-600 uppercase tracking-wider">Currency</p>
          <p className="text-[10px] font-semibold" style={{ color: info.color }}>{info.currency}</p>
        </div>
        <div>
          <p className="text-[8px] font-semibold text-zinc-600 uppercase tracking-wider">Block Time</p>
          <p className="text-[10px] font-mono font-semibold text-zinc-300">{info.blockTime}</p>
        </div>
        <div>
          <p className="text-[8px] font-semibold text-zinc-600 uppercase tracking-wider">Consensus</p>
          <p className="text-[10px] font-semibold text-zinc-300">{info.consensus}</p>
        </div>
      </div>

      <div className="mx-3 h-px bg-white/5" />
      <div className="px-3.5 py-2 flex items-center gap-1.5">
        <div className="w-1 h-1 rounded-full" style={{ background: info.color }} />
        <span className="text-[9px] font-mono text-zinc-500 truncate">{info.explorer}</span>
      </div>

      {!isActive && (
        <>
          <div className="mx-3 h-px bg-white/5" />
          <div className="px-3.5 py-2.5 flex items-center justify-center gap-1.5 bg-white/[0.02]">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
            <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Coming Soon</span>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// PORTAL TOOLTIP — renders at document.body, positioned via getBoundingClientRect
// ============================================================================

function PortalTooltip({ asset, anchorRef, visible }: {
  asset: Pick<MarketplaceAsset, 'blockchain' | 'network'>;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const info = getMarketplaceAssetChainInfo(asset);

  // Calculate position when visible or on scroll/resize
  useLayoutEffect(() => {
    if (!visible || !anchorRef.current) { setPos(null); return; }

    const calc = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      const tooltipW = 220; // fixed width
      const tooltipH = tooltipRef.current?.offsetHeight || 200;
      const gap = 10;

      let top = rect.top - tooltipH - gap + window.scrollY;
      let left = rect.left + rect.width / 2 - tooltipW / 2 + window.scrollX;

      // Clamp horizontal
      if (left < 8) left = 8;
      if (left + tooltipW > window.innerWidth - 8) left = window.innerWidth - tooltipW - 8;

      // If not enough space above, show below
      if (rect.top - tooltipH - gap < 0) {
        top = rect.bottom + gap + window.scrollY;
      }

      setPos({ top, left });
    };

    calc();
    window.addEventListener('scroll', calc, true);
    window.addEventListener('resize', calc);
    return () => {
      window.removeEventListener('scroll', calc, true);
      window.removeEventListener('resize', calc);
    };
  }, [visible, anchorRef]);

  if (!visible || !info) return null;

  const arrowColor = '#1e1e22';

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed pointer-events-none"
      style={{
        zIndex: 99999,
        top: pos ? pos.top : -9999,
        left: pos ? pos.left : -9999,
        opacity: pos ? 1 : 0,
        transform: pos ? 'scale(1)' : 'scale(0.95)',
        transition: 'opacity 180ms ease-out, transform 180ms ease-out',
      }}
    >
      <TooltipContent asset={asset} />
      {/* Arrow — centered below tooltip */}
      <div className="flex justify-center">
        <div
          className="w-0 h-0"
          style={{
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `6px solid ${arrowColor}`,
          }}
        />
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// CHAIN BADGE — icon + status dot + portal tooltip on hover
// ============================================================================

function ChainBadge({ asset, size = 16, variant = 'overlay' }: {
  asset: Pick<MarketplaceAsset, 'blockchain' | 'network'>;
  size?: number;
  variant?: 'overlay' | 'inline';
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const chainInfo = getMarketplaceAssetChainInfo(asset);
  const isComingSoon = chainInfo.status !== 'live';

  const handleEnter = useCallback(() => {
    timerRef.current = setTimeout(() => setShowTooltip(true), 200);
  }, []);
  const handleLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowTooltip(false);
  }, []);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const badgeClass = variant === 'overlay'
    ? `relative flex items-center justify-center rounded-full border backdrop-blur-md transition-all cursor-pointer ${
        isComingSoon
          ? 'bg-black/50 border-white/5 opacity-60 hover:opacity-90'
          : 'bg-black/60 border-white/10 hover:border-white/20'
      }`
    : `relative flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
        isComingSoon
          ? 'border-white/5 bg-white/[0.02] opacity-50 hover:opacity-80'
          : 'border-[#F0B90B]/20 bg-[#F0B90B]/[0.05] hover:border-[#F0B90B]/40'
      }`;

  const badgeSize = variant === 'overlay' ? size + 12 : size + 14;
  const dotBorder = variant === 'overlay' ? 'border-black' : 'border-[#141417]';

  return (
    <div
      ref={anchorRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={badgeClass} style={{ width: badgeSize, height: badgeSize }}>
        <BlockchainIcon chain={chainInfo.blockchain} size={size} />
        {isComingSoon ? (
          <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-zinc-500 border ${dotBorder}`} />
        ) : (
          <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#2CC295] border ${dotBorder} animate-pulse`} />
        )}
      </div>

      {/* Portal Tooltip — renders at document.body level */}
      <PortalTooltip asset={asset} anchorRef={anchorRef} visible={showTooltip} />
    </div>
  );
}

function CategoryBadge({
  category,
  label,
  onClick,
  className = '',
  overlay = false,
}: {
  category: string;
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  overlay?: boolean;
}) {
  const tone = getTaxonomyBadgeTone(category);

  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] transition duration-200 hover:-translate-y-px hover:brightness-110 ${overlay ? 'backdrop-blur-md' : ''} ${className}`}
      style={{
        background: tone.background,
        borderColor: tone.borderColor,
        color: tone.textColor,
        boxShadow: `0 14px 32px -28px ${tone.shadowColor}`,
      }}
    >
      <span className="truncate">{label}</span>
    </button>
  );
}

// ============================================================================
// SEARCH RESULT CARD
// ============================================================================

interface SearchResultCardProps {
  asset: MarketplaceAsset;
  viewMode: 'grid' | 'list';
  onLike?: (assetId: string) => void;
  onClick?: (assetId: string) => void;
  isLiked?: boolean;
}

function SearchResultCardComponent({
  asset, viewMode, onLike, onClick, isLiked = false,
}: SearchResultCardProps) {
  const categoryLabel = getCategoryDisplayLabel(asset.category);
  const publicDescription = getPublicAssetDescription(asset, categoryLabel);
  const isFractionalListing =
    typeof asset.availableSlots === 'number' && typeof asset.totalSlots === 'number';
  const availabilityValue = isFractionalListing
    ? `${asset.availableSlots} / ${asset.totalSlots}`
    : `Token #${asset.tokenId}`;
  const availabilityLabel = isFractionalListing ? 'Available' : 'Edition';
  const metricLabelClass = 'text-[9px] font-semibold uppercase tracking-[0.14em] text-ui-muted';
  const footerMetricClass = 'inline-flex items-center gap-1.5 text-[10px] font-medium text-ui-secondary';
  const containerClass =
    'market-card-shell card-hover-shell search-result-card-shell group w-full cursor-pointer overflow-hidden rounded-[32px] text-left';

  const getListingDuration = () => {
    if (!asset.expiresAt) return asset.listingDuration || 'No expiry';
    const now = Date.now();
    const diff = asset.expiresAt - now;
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatNumber = (num: number | undefined): string => {
    if (!num && num !== 0) return '0';
    if (num >= 1000) return `${(num / 1000).toFixed(2)}k`;
    return num.toString();
  };

  const handleClick = () => {
    onClick?.(asset.id);
  };

  const handleLike = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onLike?.(asset.id);
  };

  const handleCategoryRoute = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    navigateToMarketplaceCategory({ category: asset.category });
  };

  const media = (
    <div className="relative h-[240px] overflow-hidden bg-[var(--t-surface-10)]">
      <ImageWithFallback src={asset.image} alt={asset.name} className="card-hover-media h-full w-full object-cover" />
      <div className="card-hover-overlay absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent" />
      {viewMode === 'grid' ? (
        <div className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-4.75rem)]">
          <CategoryBadge
            category={asset.category}
            label={categoryLabel}
            onClick={handleCategoryRoute}
            overlay
          />
        </div>
      ) : null}
      <div className="absolute bottom-3 right-3 z-10">
        <ChainBadge asset={asset} size={18} variant="overlay" />
      </div>
    </div>
  );

  const pricePanel = (
    <div className="shrink-0">
      <p className={metricLabelClass}>Price</p>
      <p className="card-price-value mt-1 text-[24px] font-semibold leading-none">{asset.price}</p>
      {asset.priceUSD && <p className="mt-1.5 text-[10px] text-ui-muted">{asset.priceUSD}</p>}
    </div>
  );

  const availabilityPanelCompact = (
    <div className="min-w-0">
      <p className={metricLabelClass}>Ending In</p>
      <div className="mt-1 flex items-center gap-1.5">
        <Clock size={12} className="text-primary" />
        <p className="text-[13px] font-semibold leading-[1.4] text-primary">{getListingDuration()}</p>
      </div>
      <p className={`${metricLabelClass} mt-2`}>{availabilityLabel}</p>
      <p className={`mt-1 text-[13px] font-semibold ${isFractionalListing ? 'text-primary' : 'text-ui-primary'}`}>
        {availabilityValue}
      </p>
    </div>
  );

  const availabilityPanelList = (
    <div className="min-w-0">
      <p className={metricLabelClass}>Ending In</p>
      <div className="mt-1 flex items-center gap-1.5">
        <Clock size={12} className="text-primary" />
        <p className="text-[13px] font-semibold leading-[1.4] text-primary">{getListingDuration()}</p>
      </div>
      <p className={`${metricLabelClass} mt-2.5`}>{availabilityLabel}</p>
      <p className={`mt-1 text-[15px] font-semibold ${isFractionalListing ? 'text-primary' : 'text-ui-primary'}`}>
        {availabilityValue}
      </p>
    </div>
  );

  const listPricePanel = (
    <div className="w-full rounded-[22px] border border-transparent bg-transparent px-1 py-1 lg:text-right">
      <p className={`${metricLabelClass} text-left lg:text-right`}>Price</p>
      <p className="card-price-value mt-2 text-[26px] font-semibold leading-none tracking-[-0.03em]">
        {asset.price}
      </p>
      {asset.priceUSD ? (
        <p className="mt-2 text-[10px] text-ui-muted">{asset.priceUSD}</p>
      ) : null}
    </div>
  );

  const viewMetric = (
    <div className={footerMetricClass}>
      <Eye size={14} />
      <span>{formatNumber(asset.views)}</span>
    </div>
  );

  const likeMetric = (
    <button
      type="button"
      onClick={handleLike}
      className={`-mx-1 inline-flex items-center gap-1.5 rounded-full px-1 py-0.5 text-[11px] font-medium transition-colors ${
        isLiked ? 'text-red-500' : 'text-ui-secondary hover:text-ui-primary'
      }`}
    >
      <Heart size={13} className={isLiked ? 'fill-red-500 text-red-500' : ''} />
      <span>{formatNumber(asset.likes)}</span>
    </button>
  );

  const rankMetric = typeof asset.rank === 'number' && asset.rank > 0 ? (
    <div className={footerMetricClass}>
      <TrendingUp size={14} />
      <span>Rnk {asset.rank}</span>
    </div>
  ) : null;

  const primaryStatsGroup = (
    <div className="flex flex-wrap items-center gap-4">
      {viewMetric}
      {likeMetric}
    </div>
  );

  const listMetricChipClass =
    'inline-flex items-center gap-1.5 rounded-full bg-[var(--t-surface-2)] px-3 py-1.5 text-[10px] font-semibold text-ui-secondary transition-colors';

  const listViewMetric = (
    <div className={listMetricChipClass}>
      <Eye size={13} />
      <span>{formatNumber(asset.views)}</span>
    </div>
  );

  const listLikeMetric = (
    <button
      type="button"
      onClick={handleLike}
      className={`${listMetricChipClass} ${
        isLiked
          ? 'bg-red-500/10 text-red-400'
          : 'hover:bg-[#2CC295]/10 hover:text-ui-primary'
      }`}
    >
      <Heart size={13} className={isLiked ? 'fill-red-500 text-red-500' : ''} />
      <span>{formatNumber(asset.likes)}</span>
    </button>
  );

  const listRankMetric = typeof asset.rank === 'number' && asset.rank > 0 ? (
    <div className={listMetricChipClass}>
      <TrendingUp size={13} />
      <span>Rnk {asset.rank}</span>
    </div>
  ) : null;

  if (viewMode === 'grid') {
    return (
      <div onClick={handleClick} className={`${containerClass} card-hover-grid search-result-card-grid flex h-full flex-col`}>
        {media}

        <div className="market-card-info-area search-result-info-area flex flex-1 flex-col px-5 pb-5 pt-4">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[17px] font-semibold leading-[1.18] text-ui-primary">
              {asset.name}
            </h3>
          </div>

          <div className="card-value-row mt-auto">
            {pricePanel}
            {availabilityPanelCompact}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {primaryStatsGroup}
            </div>
            {rankMetric ? <div className="shrink-0">{rankMetric}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={handleClick} className={`${containerClass} card-hover-list search-result-card-list flex flex-col lg:h-[240px] lg:flex-row`}>
      <div className="relative h-[240px] shrink-0 overflow-hidden bg-[var(--t-surface-10)] lg:h-full lg:w-[395px]">
        {media}
      </div>

      <div className="market-card-info-area search-result-info-area flex min-w-0 flex-1 flex-col px-5 pb-5 pt-5 lg:h-full lg:px-6 lg:py-5">
        <div className="flex min-w-0 flex-1 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_236px] lg:grid-rows-[1fr_auto] lg:gap-x-8 lg:gap-y-4">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[18px] font-semibold leading-[1.18] text-ui-primary">
              {asset.name}
            </h3>
            <p className="mt-2 line-clamp-2 max-w-[32rem] text-[13px] leading-5 text-ui-secondary">
              {publicDescription}
            </p>
          </div>

          <div className="shrink-0 lg:row-span-2 lg:min-w-0">
            <div className="flex h-full flex-col gap-3 lg:items-end">
              <CategoryBadge
                category={asset.category}
                label={categoryLabel}
                onClick={handleCategoryRoute}
                className="self-start lg:max-w-full lg:self-end"
              />
              {listPricePanel}
              <div className="mt-auto flex flex-wrap items-center gap-2.5 lg:w-full lg:justify-end">
                {listViewMetric}
                {listLikeMetric}
                {listRankMetric}
              </div>
            </div>
          </div>

          <div className="min-w-0 pt-1 lg:self-end">
            {availabilityPanelList}
          </div>
        </div>
      </div>
    </div>
  );
}

export const SearchResultCard = memo(SearchResultCardComponent);
