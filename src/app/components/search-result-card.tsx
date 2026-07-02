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

const NETWORK_LOGO_PATHS: Record<string, string> = {
  bsc: '/network-logos/bnb.png',
  bnb: '/network-logos/bnb.png',
  'bnb-testnet': '/network-logos/bnb.png',
  ethereum: '/network-logos/ethereum.png',
  'ethereum-testnet': '/network-logos/ethereum.png',
  polygon: '/network-logos/polygon.png',
  base: '/network-logos/base.png',
  arbitrum: '/network-logos/arbitrum.png',
  arb: '/network-logos/arbitrum.png',
  'arbitrum-one': '/network-logos/arbitrum.png',
  'arbitrum-sepolia': '/network-logos/arbitrum.png',
  'arbitrum-testnet': '/network-logos/arbitrum.png',
  optimism: '/network-logos/ethereum.png',
  'optimism-sepolia': '/network-logos/ethereum.png',
  'op-sepolia': '/network-logos/ethereum.png',
  avalanche: '/network-logos/avalanche.png',
  'avalanche-fuji': '/network-logos/avalanche.png',
  'avalanche-testnet': '/network-logos/avalanche.png',
  fuji: '/network-logos/avalanche.png',
  solana: '/network-logos/solana.png',
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

function getNetworkLogoPath(info: { blockchain: string; filterValue?: string }) {
  const filterKey = String(info.filterValue || '').trim().toLowerCase();
  const chainKey = String(info.blockchain || '').trim().toLowerCase();
  return NETWORK_LOGO_PATHS[filterKey] || NETWORK_LOGO_PATHS[chainKey] || null;
}

function BlockchainIcon({
  info,
  size = 16,
}: {
  info: { blockchain: string; filterValue?: string; fullName?: string; color?: string };
  size?: number;
}) {
  const logoPath = getNetworkLogoPath(info);

  if (logoPath) {
    return (
      <img
        src={logoPath}
        alt={info.fullName || info.blockchain}
        width={size}
        height={size}
        className="block object-contain"
        draggable={false}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-[10px] font-semibold"
      style={{
        width: size,
        height: size,
        color: info.color || 'var(--t-text-primary)',
        backgroundColor: `${info.color || '#94a3b8'}1f`,
      }}
      aria-hidden="true"
    >
      {String(info.blockchain || '?').slice(0, 1)}
    </span>
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
      className="studio-modal-theme studio-glass-modal w-[260px] overflow-hidden rounded-[28px] border border-ui-border-subtle bg-ui-card shadow-2xl"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center">
            <BlockchainIcon info={info} size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-semibold text-ui-primary">{info.fullName}</p>
              {isActive ? (
                <span className="shrink-0 rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#2CC295]">
                  Live
                </span>
              ) : (
                <span className="shrink-0 rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-ui-muted">
                  Coming
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] font-medium text-ui-secondary">{info.label}</p>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Chain ID</p>
              <p className="mt-1 text-xs font-semibold text-ui-primary">{info.chainId}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Currency</p>
              <p className="mt-1 text-xs font-semibold text-ui-primary">{info.currency}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Block Time</p>
              <p className="mt-1 text-xs font-semibold text-ui-primary">{info.blockTime}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Consensus</p>
              <p className="mt-1 text-xs font-semibold text-ui-primary">{info.consensus}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-3 py-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2CC295]" />
          <span className="truncate text-[10px] font-medium text-ui-secondary">{info.explorer}</span>
        </div>
      </div>
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
      const tooltipW = 260; // fixed width
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

  const arrowColor = 'var(--t-card-bg)';

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
    ? `relative flex items-center justify-center transition-all cursor-pointer ${
        isComingSoon ? 'opacity-60 hover:opacity-90' : 'hover:brightness-110'
      }`
    : `relative flex items-center justify-center transition-all cursor-pointer ${
        isComingSoon ? 'opacity-50 hover:opacity-80' : 'hover:brightness-110'
      }`;

  const badgeSize = variant === 'overlay' ? size + 2 : size + 4;
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
        <BlockchainIcon info={chainInfo} size={size} />
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
      className={`asset-category-badge inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] transition duration-200 hover:-translate-y-px hover:brightness-110 ${overlay ? 'backdrop-blur-md' : ''} ${className}`}
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
    'market-card-shell card-hover-shell search-result-card-shell group w-full cursor-pointer overflow-hidden rounded-[var(--t-card-radius-xl)] text-left';

  const getListingDuration = () => {
    if (typeof asset.expiresAt !== 'number' || !Number.isFinite(asset.expiresAt)) return null;
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
    <div className="relative h-[var(--t-market-card-media-h)] overflow-hidden bg-[var(--t-surface-10)]">
      <ImageWithFallback
        src={asset.image}
        alt={asset.name}
        loading="lazy"
        decoding="async"
        className="card-hover-media h-full w-full object-cover"
      />
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

  const listingDuration = getListingDuration();

  const pricePanel = (
    <div className="shrink-0">
      <p className={metricLabelClass}>Price</p>
      <p className="card-price-value mt-1">{asset.price}</p>
      {asset.priceUSD && <p className="asset-card-price-usd mt-1.5 text-[10px] text-ui-muted">{asset.priceUSD}</p>}
    </div>
  );

  const listPricePanel = (
    <div className="w-full rounded-[22px] border border-transparent bg-transparent px-1 py-1 lg:text-right">
      <p className={`${metricLabelClass} text-left lg:text-right`}>Price</p>
      <p className="card-price-value mt-2">
        {asset.price}
      </p>
      {asset.priceUSD ? (
        <p className="asset-card-price-usd mt-2 text-[10px] text-ui-muted">{asset.priceUSD}</p>
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
    <div className="asset-card-footer-stats">
      {viewMetric}
      {likeMetric}
    </div>
  );

  const expiryMetric = listingDuration ? (
    <div className="asset-card-expiry-row">
      <p className={metricLabelClass}>Ending In</p>
      <div className="mt-1 flex items-center justify-end gap-1.5">
        <Clock size={12} className="text-primary" />
        <p className="asset-card-expiry-value text-[13px] font-semibold leading-[1.35] text-primary">{listingDuration}</p>
      </div>
    </div>
  ) : null;

  const availabilityMetric = (
    <div className="min-w-0">
      <p className={metricLabelClass}>{availabilityLabel}</p>
      <p className={`asset-card-availability-value mt-1 text-[13px] font-semibold ${isFractionalListing ? 'text-primary' : 'text-ui-primary'}`}>
        {availabilityValue}
      </p>
    </div>
  );

  const availabilityPanelCompact = (
    <div className="asset-card-summary-panel">
      {expiryMetric}
      {availabilityMetric}
    </div>
  );

  const availabilityPanelList = (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:items-end lg:max-w-[32rem]">
      {expiryMetric}
      {availabilityMetric}
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
      <div onClick={handleClick} className={`${containerClass} card-hover-grid search-result-card-grid flex h-full min-h-[var(--t-market-card-grid-h)] flex-col`}>
        {media}

        <div className="market-card-info-area search-result-info-area flex flex-1 flex-col px-5 pb-4 pt-3.5">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-[1.2] text-ui-primary">
              {asset.name}
            </h3>
          </div>

          <div className="asset-card-bottom-grid mt-auto">
            {pricePanel}
            {availabilityPanelCompact}
          </div>

          <div className="asset-card-footer-row">
            {primaryStatsGroup}
            {rankMetric ? <div className="shrink-0">{rankMetric}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={handleClick} className={`${containerClass} card-hover-list search-result-card-list flex flex-col lg:h-[var(--t-market-card-list-h)] lg:flex-row`}>
      <div className="relative h-[var(--t-market-card-media-h)] shrink-0 overflow-hidden bg-[var(--t-surface-10)] lg:h-full lg:w-[var(--t-market-card-list-media-w)]">
        {media}
      </div>

      <div className="market-card-info-area search-result-info-area flex min-w-0 flex-1 flex-col px-5 pb-5 pt-5 lg:h-full lg:px-6 lg:py-5">
        <div className="flex min-w-0 flex-1 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_236px] lg:grid-rows-[1fr_auto] lg:gap-x-8 lg:gap-y-4">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[16px] font-semibold leading-[1.2] text-ui-primary">
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
