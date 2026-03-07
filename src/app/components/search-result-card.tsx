/**
 * SEARCH RESULT CARD - Marketplace Assets
 * ========================================
 * 
 * Blockchain tooltip sử dụng React Portal → render tại document.body
 * → thoát hoàn toàn stacking context, không bị card kế bên che.
 */

import { Heart, Eye, TrendingUp, Clock, Shield } from 'lucide-react';
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { MarketplaceAsset } from '@/app/types/asset';
import { ImageWithFallback } from './figma/ImageWithFallback';

// ============================================================================
// BLOCKCHAIN DETAILED CONFIG
// ============================================================================

interface ChainInfo {
  color: string;
  active: boolean;
  fullName: string;
  network: string;
  chainId: string;
  currency: string;
  explorer: string;
  blockTime: string;
  consensus: string;
  status: 'live' | 'coming';
}

const CHAIN_DETAILS: Record<string, ChainInfo> = {
  BSC: {
    color: '#F0B90B', active: true,
    fullName: 'BNB Smart Chain', network: 'Testnet',
    chainId: '97', currency: 'tBNB',
    explorer: 'testnet.bscscan.com', blockTime: '~3s',
    consensus: 'PoSA', status: 'live',
  },
  Ethereum: {
    color: '#627EEA', active: false,
    fullName: 'Ethereum', network: 'Mainnet',
    chainId: '1', currency: 'ETH',
    explorer: 'etherscan.io', blockTime: '~12s',
    consensus: 'PoS', status: 'coming',
  },
  Polygon: {
    color: '#8247E5', active: false,
    fullName: 'Polygon PoS', network: 'Mainnet',
    chainId: '137', currency: 'MATIC',
    explorer: 'polygonscan.com', blockTime: '~2s',
    consensus: 'PoS', status: 'coming',
  },
  Arbitrum: {
    color: '#28A0F0', active: false,
    fullName: 'Arbitrum One', network: 'L2 Rollup',
    chainId: '42161', currency: 'ETH',
    explorer: 'arbiscan.io', blockTime: '~0.26s',
    consensus: 'Optimistic', status: 'coming',
  },
  Base: {
    color: '#0052FF', active: false,
    fullName: 'Base', network: 'L2 Rollup',
    chainId: '8453', currency: 'ETH',
    explorer: 'basescan.org', blockTime: '~2s',
    consensus: 'Optimistic', status: 'coming',
  },
};

const CHAIN_CONFIG = Object.fromEntries(
  Object.entries(CHAIN_DETAILS).map(([k, v]) => [k, { color: v.color, active: v.active }])
) as Record<string, { color: string; active: boolean }>;

// ============================================================================
// BLOCKCHAIN SVG ICONS
// ============================================================================

function BlockchainIcon({ chain, size = 16 }: { chain: string; size?: number }) {
  const c = CHAIN_CONFIG[chain] || { color: '#71717a', active: false };

  if (chain === 'BSC') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill={c.color} fillOpacity="0.15" />
        <path d="M16 6l3.2 3.2-6.4 6.4L9.6 12.4 16 6z" fill={c.color} />
        <path d="M22.4 12.4l3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2z" fill={c.color} />
        <path d="M9.6 12.4l3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2z" fill={c.color} />
        <path d="M16 18.8l3.2 3.2L16 25.2l-3.2-3.2L16 18.8z" fill={c.color} />
        <path d="M16 12.8l3.2 3.2L16 19.2l-3.2-3.2L16 12.8z" fill={c.color} fillOpacity="0.6" />
      </svg>
    );
  }
  if (chain === 'Ethereum') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill={c.color} fillOpacity="0.1" />
        <path d="M16 5l-7 11.5 7 4.1V5z" fill={c.color} fillOpacity="0.5" />
        <path d="M16 5v15.6l7-4.1L16 5z" fill={c.color} fillOpacity="0.7" />
        <path d="M9 16.5l7 4.1V27L9 18.5v-2z" fill={c.color} fillOpacity="0.5" />
        <path d="M23 16.5l-7 4.1V27l7-8.5v-2z" fill={c.color} fillOpacity="0.7" />
        <path d="M9 16.5l7-3.5 7 3.5-7 4.1-7-4.1z" fill={c.color} fillOpacity="0.3" />
      </svg>
    );
  }
  if (chain === 'Polygon') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill={c.color} fillOpacity="0.1" />
        <path d="M21.2 13.2c-.4-.2-.9-.2-1.3 0l-3 1.7-2 1.2-3 1.7c-.4.2-.9.2-1.3 0l-2.4-1.4c-.4-.2-.6-.7-.6-1.1v-2.7c0-.5.2-.9.6-1.1l2.3-1.3c.4-.2.9-.2 1.3 0l2.3 1.3c.4.2.6.7.6 1.1v1.7l2-1.2v-1.7c0-.5-.2-.9-.6-1.1l-4.3-2.5c-.4-.2-.9-.2-1.3 0l-4.4 2.5c-.4.2-.6.7-.6 1.1v5.1c0 .5.2.9.6 1.1l4.3 2.5c.4.2.9.2 1.3 0l3-1.7 2-1.2 3-1.7c.4-.2.9-.2 1.3 0l2.3 1.3c.4.2.6.7.6 1.1v2.7c0 .5-.2.9-.6 1.1l-2.3 1.4c-.4.2-.9.2-1.3 0l-2.3-1.4c-.4-.2-.6-.7-.6-1.1v-1.7l-2 1.2v1.7c0 .5.2.9.6 1.1l4.3 2.5c.4.2.9.2 1.3 0l4.3-2.5c.4-.2.6-.7.6-1.1v-5.1c0-.5-.2-.9-.6-1.1l-4.3-2.6z" fill={c.color} fillOpacity="0.6" />
      </svg>
    );
  }
  if (chain === 'Arbitrum') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill={c.color} fillOpacity="0.1" />
        <path d="M17.1 11.4l3.4 5.5-2.3 3.7-5.1-8.2h3.1l.9-.01z" fill={c.color} fillOpacity="0.7" />
        <path d="M22 18.3l-1.5 2.4-3.5-5.7 2.3-3.7L22 18.3z" fill={c.color} fillOpacity="0.5" />
        <path d="M10 18.3l2.7 4.4 1.5-2.4L10.7 14 10 18.3z" fill={c.color} fillOpacity="0.5" />
        <path d="M16 8l-5.3 6 3.5 6.3L16 17l1.8 3.3L21.3 14 16 8z" fill={c.color} fillOpacity="0.3" />
      </svg>
    );
  }
  // Base
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill={c.color} fillOpacity="0.1" />
      <circle cx="16" cy="16" r="7.5" stroke={c.color} strokeWidth="2" fill="none" strokeOpacity="0.6" />
      <path d="M16 10.5c3 0 5.5 2.5 5.5 5.5h-5.5v-5.5z" fill={c.color} fillOpacity="0.4" />
    </svg>
  );
}

// ============================================================================
// TOOLTIP CONTENT — Pure visual, no positioning
// ============================================================================

function TooltipContent({ chain }: { chain: string }) {
  const info = CHAIN_DETAILS[chain];
  if (!info) return null;
  const isActive = info.active;

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
          <BlockchainIcon chain={chain} size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-white truncate">{info.fullName}</span>
            {isActive && (
              <span className="flex-shrink-0 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#2CC295]/15 text-[#2CC295] border border-[#2CC295]/20">
                Live
              </span>
            )}
          </div>
          <span className="text-[9px] font-medium text-zinc-500">{info.network}</span>
        </div>
      </div>

      <div className="mx-3 h-px bg-white/5" />

      {/* Details Grid */}
      <div className="px-3.5 py-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
        <div>
          <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">Chain ID</p>
          <p className="text-[10px] font-mono font-bold text-zinc-300">{info.chainId}</p>
        </div>
        <div>
          <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">Currency</p>
          <p className="text-[10px] font-bold" style={{ color: info.color }}>{info.currency}</p>
        </div>
        <div>
          <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">Block Time</p>
          <p className="text-[10px] font-mono font-bold text-zinc-300">{info.blockTime}</p>
        </div>
        <div>
          <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">Consensus</p>
          <p className="text-[10px] font-bold text-zinc-300">{info.consensus}</p>
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
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Coming Soon</span>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// PORTAL TOOLTIP — renders at document.body, positioned via getBoundingClientRect
// ============================================================================

function PortalTooltip({ chain, anchorRef, visible }: {
  chain: string;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const info = CHAIN_DETAILS[chain];

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
      <TooltipContent chain={chain} />
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

function ChainBadge({ chain, size = 16, variant = 'overlay' }: {
  chain: string;
  size?: number;
  variant?: 'overlay' | 'inline';
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const config = CHAIN_CONFIG[chain] || { color: '#71717a', active: false };
  const isComingSoon = !config.active;

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
        <BlockchainIcon chain={chain} size={size} />
        {isComingSoon ? (
          <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-zinc-500 border ${dotBorder}`} />
        ) : (
          <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#2CC295] border ${dotBorder} animate-pulse`} />
        )}
      </div>

      {/* Portal Tooltip — renders at document.body level */}
      <PortalTooltip chain={chain} anchorRef={anchorRef} visible={showTooltip} />
    </div>
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

export function SearchResultCard({
  asset, viewMode, onLike, onClick, isLiked = false,
}: SearchResultCardProps) {
  const isFractionalListing =
    typeof asset.availableSlots === 'number' && typeof asset.totalSlots === 'number';
  const isNftListing = !isFractionalListing;
  const badgeLabel = isFractionalListing ? 'RWA' : 'NFT';
  const badgeClass = isFractionalListing
    ? 'text-[#2CC295] border border-[#2CC295]/30'
    : 'text-[#7DD3FC] border border-[#7DD3FC]/30';
  const accentTextClass = isFractionalListing ? 'text-[#2CC295]' : 'text-[#7DD3FC]';
  const accentBgClass = isFractionalListing ? 'bg-[#2CC295]/8' : 'bg-[#7DD3FC]/8';
  const accentBorderClass = isFractionalListing ? 'border-[#2CC295]/30' : 'border-[#7DD3FC]/30';

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

  const handleClick = () => { onClick?.(asset.id); };
  const handleLike = (e: React.MouseEvent) => { e.stopPropagation(); onLike?.(asset.id); };

  // === GRID VIEW ===
  if (viewMode === 'grid') {
    return (
      <div
        onClick={handleClick}
        className="w-full max-w-xs text-left bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl overflow-visible hover:bg-[#1a1a1d] hover:-translate-y-1 transition-all group cursor-pointer"
      >
        <div className="relative aspect-square">
          <div className="absolute inset-0 rounded-t-2xl overflow-hidden bg-zinc-800">
            <ImageWithFallback src={asset.image} alt={asset.name} className="w-full h-full object-cover" />
            <div className={`absolute top-2 left-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
              {badgeLabel}
            </div>
          </div>
          <div className="absolute bottom-2 right-2 z-10">
            <ChainBadge chain={asset.blockchain} size={16} variant="overlay" />
          </div>
        </div>

        <div className="p-4 relative">
          <button onClick={handleLike} className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
            <Heart size={16} className={isLiked ? 'fill-red-500 text-red-500' : ''} />
          </button>

          <div className="flex items-center gap-1.5 mb-2">
            <span className={`text-[10px] font-medium uppercase tracking-wider ${accentTextClass}`}>{asset.category}</span>
            {asset.seller?.verified && <Shield size={12} className={`${accentTextClass} ${isFractionalListing ? 'fill-[#2CC295]' : 'fill-[#7DD3FC]'}`} />}
            {isNftListing && (
              <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-[0.14em] ${accentBgClass} ${accentTextClass} border ${accentBorderClass}`}>
                1 / 1
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold text-white mb-2 line-clamp-1 pr-10">{asset.name}</h3>

          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-0.5">Price</p>
              <p className="text-base font-bold text-white">{asset.price}</p>
              {asset.priceUSD && <p className="text-xs text-zinc-500">{asset.priceUSD}</p>}
            </div>
            <div className="text-right">
              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-0.5">Ending In</p>
              <div className="flex items-center gap-1.5 text-white justify-end">
                <Clock size={14} className="text-[#2CC295]" />
                <p className="text-sm font-bold">{getListingDuration()}</p>
              </div>
              {asset.availableSlots !== undefined && asset.totalSlots !== undefined && (
                <p className="text-sm font-bold text-[#2CC295] mt-1">{asset.availableSlots} / {asset.totalSlots}</p>
              )}
              {isNftListing && (
                <p className={`text-xs font-bold mt-1 ${accentTextClass}`}>Token #{asset.tokenId}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <div className="flex items-center gap-1"><Eye size={14} /><span>{formatNumber(asset.views)}</span></div>
            <div className="flex items-center gap-1"><Heart size={14} /><span>{formatNumber(asset.likes)}</span></div>
            {asset.rank && <div className="flex items-center gap-1"><TrendingUp size={14} /><span>Rnk {asset.rank}</span></div>}
          </div>
        </div>
      </div>
    );
  }

  // === LIST VIEW ===
  return (
    <div
      onClick={handleClick}
      className="w-full text-left bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-4 flex gap-6 transition-all hover:bg-[#1a1a1d] hover:-translate-y-0.5 group items-center cursor-pointer"
    >
      <div className="w-[180px] aspect-square rounded-xl flex-shrink-0 bg-zinc-800 relative overflow-hidden">
        <ImageWithFallback src={asset.image} alt={asset.name} className="w-full h-full object-cover rounded-xl" />
        <div className={`absolute top-2 left-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
          {badgeLabel}
        </div>
        <div className="absolute bottom-2 right-2 z-10">
          <ChainBadge chain={asset.blockchain} size={16} variant="overlay" />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className={`text-[10px] font-medium uppercase tracking-wider ${accentTextClass}`}>{asset.category}</span>
          {asset.seller?.verified && <Shield size={12} className={`${accentTextClass} ${isFractionalListing ? 'fill-[#2CC295]' : 'fill-[#7DD3FC]'}`} />}
          {isNftListing && (
            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-[0.14em] ${accentBgClass} ${accentTextClass} border ${accentBorderClass}`}>
              Token #{asset.tokenId}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-white mb-2 pr-12 truncate">{asset.name}</h3>
        <div className="mb-3">
          <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Price</p>
          <span className="text-base font-bold text-white">{asset.price}</span>
          {asset.priceUSD && <p className="text-xs text-zinc-500 mt-0.5">{asset.priceUSD}</p>}
        </div>
        <div className="flex items-center gap-5 text-zinc-500 mt-1">
          <div className="flex items-center gap-1.5"><Eye size={18} /><span className="text-xs font-medium">{formatNumber(asset.views)}</span></div>
          <div className="flex items-center gap-1.5"><Heart size={18} /><span className="text-xs font-medium">{formatNumber(asset.likes)}</span></div>
          {asset.rank && <div className="flex items-center gap-1.5"><TrendingUp size={18} /><span className="text-xs font-medium">Rnk {asset.rank}</span></div>}
        </div>
      </div>

      <div className="flex-shrink-0 flex flex-col items-end justify-center gap-3 relative">
        <button onClick={handleLike} className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
          <Heart size={20} className={isLiked ? 'fill-red-500 text-red-500' : ''} />
        </button>
        <div className="text-right">
          <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Ending In</p>
          <div className="flex items-center gap-1.5 text-white justify-end">
            <Clock size={14} className="text-[#2CC295]" />
            <p className="text-sm font-bold">{getListingDuration()}</p>
          </div>
        </div>
        {asset.availableSlots !== undefined && asset.totalSlots !== undefined && (
          <div className="text-right">
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-0.5">Available</p>
            <p className="text-sm font-bold text-[#2CC295]">{asset.availableSlots} / {asset.totalSlots}</p>
          </div>
        )}
        {isNftListing && (
          <div className="text-right">
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-0.5">Edition</p>
            <p className={`text-sm font-bold ${accentTextClass}`}>1 / 1 NFT</p>
          </div>
        )}
        <ChainBadge chain={asset.blockchain} size={20} variant="inline" />
      </div>
    </div>
  );
}
