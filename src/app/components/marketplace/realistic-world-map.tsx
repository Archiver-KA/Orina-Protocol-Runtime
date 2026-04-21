/**
 * REALISTIC WORLD MAP
 * ===================
 * Dark themed world map using react-map-gl/MapLibre GL
 * Professional tile rendering with markers and interactive controls
 */

'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Gauge, Layers, MapPin, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { Map as MapCanvas, MapRef } from '@/app/components/ui/map';
import { Marker } from 'react-map-gl/maplibre';
import { getTaxonomyBadgeTone } from '@/utils/taxonomyAppearance';

interface MarketplaceAsset {
  id: number;
  name: string;
  category: string;
  categoryLabel: string;
  price: string;
  usdPrice: string;
  image: string;
  latitude: number;
  longitude: number;
  city: string;
  countryCode?: string;
  locationPrecision?: string;
  assetKey?: string;
  supplierKey?: string;
  trustScore?: number;
  successfulSales?: number;
  views?: number;
  likes?: number;
  rank?: number;
  totalSlots?: number;
  availableSlots?: number;
  displayScore?: number;
  seller: {
    name: string;
    rating: string;
  };
  verified: boolean;
}

interface RealisticWorldMapProps {
  filteredAssets: MarketplaceAsset[];
  totalListings: number;
  verifiedCount: number;
  viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  onViewStateChange: (viewState: {
    longitude: number;
    latitude: number;
    zoom: number;
  }) => void;
  onAssetClick: (asset: MarketplaceAsset) => void;
  selectedAssetId: number | null;
  onMarkerClick: (assetId: number) => void;
  verifiedOnly?: boolean;
  onToggleVerified?: (value: boolean) => void;
}

type MapMarkerLevel = 'country' | 'supplier' | 'grid' | 'asset';

interface MapDisplayMarker {
  key: string;
  level: MapMarkerLevel;
  id: number;
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  count: number;
  asset: MarketplaceAsset;
  assets: MarketplaceAsset[];
  trustScore: number;
  successfulSales: number;
  displayScore: number;
  category: string;
  categoryLabel: string;
  verified: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatCompactCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(value);
}

function normalizeScore(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getAssetScore(asset: MarketplaceAsset) {
  return Math.max(1, normalizeScore(asset.displayScore, 1));
}

function getTrustScore(asset: MarketplaceAsset) {
  return clamp(normalizeScore(asset.trustScore, asset.verified ? 80 : 50), 0, 100);
}

function createMarkerFromAssets(
  level: MapMarkerLevel,
  key: string,
  label: string,
  assets: MarketplaceAsset[],
): MapDisplayMarker {
  const sorted = [...assets].sort((left, right) => getAssetScore(right) - getAssetScore(left));
  const representative = sorted[0];
  const weightTotal = sorted.reduce((sum, asset) => sum + getAssetScore(asset), 0) || sorted.length || 1;
  const latitude = sorted.reduce((sum, asset) => sum + asset.latitude * getAssetScore(asset), 0) / weightTotal;
  const longitude = sorted.reduce((sum, asset) => sum + asset.longitude * getAssetScore(asset), 0) / weightTotal;
  const successfulSales = sorted.reduce((sum, asset) => sum + Math.max(0, normalizeScore(asset.successfulSales, 0)), 0);
  const trustScore = sorted.reduce((sum, asset) => sum + getTrustScore(asset), 0) / sorted.length;
  const displayScore = sorted.reduce((sum, asset) => sum + getAssetScore(asset), 0);
  const categoryCounts = new Map<string, { label: string; count: number }>();

  sorted.forEach((asset) => {
    const categoryKey = asset.category || asset.categoryLabel || 'uncategorized';
    const current = categoryCounts.get(categoryKey) || { label: asset.categoryLabel, count: 0 };
    categoryCounts.set(categoryKey, {
      label: current.label || asset.categoryLabel,
      count: current.count + 1,
    });
  });

  const topCategory = [...categoryCounts.entries()].sort((left, right) => right[1].count - left[1].count)[0];
  const topCategoryKey = topCategory?.[0] || representative.category || 'uncategorized';
  const topCategoryLabel = topCategory?.[1].label || representative.categoryLabel;
  const subtitle =
    level === 'country'
      ? `${sorted.length} assets - ${topCategoryLabel}`
      : level === 'supplier'
        ? `${representative.seller.name} - ${sorted.length} listings`
        : level === 'grid'
          ? `${sorted.length} nearby listings`
          : `${representative.seller.name} - ${representative.price}`;

  return {
    key,
    level,
    id: representative.id,
    label,
    subtitle,
    latitude,
    longitude,
    count: sorted.length,
    asset: representative,
    assets: sorted,
    trustScore,
    successfulSales,
    displayScore,
    category: topCategoryKey,
    categoryLabel: topCategoryLabel,
    verified: sorted.some((asset) => asset.verified),
  };
}

function groupAssets(
  assets: MarketplaceAsset[],
  level: MapMarkerLevel,
  getKey: (asset: MarketplaceAsset) => string,
  getLabel: (asset: MarketplaceAsset) => string,
) {
  const groups = new Map<string, MarketplaceAsset[]>();
  const labels = new Map<string, string>();

  assets.forEach((asset) => {
    const key = getKey(asset);
    const bucket = groups.get(key) || [];
    bucket.push(asset);
    groups.set(key, bucket);
    if (!labels.has(key)) labels.set(key, getLabel(asset));
  });

  return [...groups.entries()]
    .map(([key, bucket]) => createMarkerFromAssets(level, key, labels.get(key) || key, bucket))
    .sort((left, right) => right.displayScore - left.displayScore || right.count - left.count);
}

function buildGridKey(asset: MarketplaceAsset, cellSize: number) {
  const lat = Math.floor(asset.latitude / cellSize) * cellSize;
  const lng = Math.floor(asset.longitude / cellSize) * cellSize;
  return `${lat.toFixed(2)}:${lng.toFixed(2)}`;
}

function buildDisplayMarkers(assets: MarketplaceAsset[], zoom: number): MapDisplayMarker[] {
  if (zoom < 3.2) {
    return groupAssets(
      assets,
      'country',
      (asset) => asset.countryCode || asset.city || 'unknown',
      (asset) => asset.city || asset.countryCode || 'Unknown',
    ).slice(0, 32);
  }

  if (zoom < 5.8) {
    return groupAssets(
      assets,
      'supplier',
      (asset) => asset.supplierKey || asset.seller.name || String(asset.id),
      (asset) => asset.seller.name || asset.city || 'Supplier',
    ).slice(0, 56);
  }

  if (zoom < 8) {
    const cellSize = zoom < 6.8 ? 2.4 : 1.1;
    return groupAssets(
      assets,
      'grid',
      (asset) => buildGridKey(asset, cellSize),
      (asset) => asset.city || 'Local cluster',
    ).slice(0, 140);
  }

  return assets
    .map((asset) => createMarkerFromAssets('asset', `asset:${asset.id}`, asset.name, [asset]))
    .sort((left, right) => right.displayScore - left.displayScore);
}

function getMarkerSize(marker: MapDisplayMarker) {
  if (marker.level === 'asset') return marker.displayScore > 70 ? 13 : 9.6;
  return clamp(22 + Math.sqrt(marker.count) * 5.2, 30, 76);
}

function getMarkerTone(marker: MapDisplayMarker) {
  if (marker.successfulSales > 0) return '#f5b84b';
  if (marker.trustScore >= 75 || marker.verified) return '#2CC295';
  if (marker.trustScore >= 55) return '#76d7bd';
  return '#8da3ad';
}

function getZoomModeLabel(zoom: number) {
  if (zoom < 3.2) return 'Country hubs';
  if (zoom < 5.8) return 'Supplier leaders';
  if (zoom < 8) return 'Local clusters';
  return 'Asset pins';
}

export function RealisticWorldMap({
  filteredAssets,
  totalListings,
  verifiedCount,
  viewState,
  onViewStateChange,
  onAssetClick,
  selectedAssetId,
  onMarkerClick,
  verifiedOnly = false,
  onToggleVerified,
}: RealisticWorldMapProps) {
  const [hoveredMarkerKey, setHoveredMarkerKey] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<'default' | 'satellite'>('default');
  const mapRef = useRef<MapRef>(null);
  const displayMarkers = useMemo(
    () => buildDisplayMarkers(filteredAssets, viewState.zoom),
    [filteredAssets, viewState.zoom],
  );
  const visibleSupplierCount = useMemo(
    () => new Set(filteredAssets.map((asset) => asset.supplierKey || asset.seller.name)).size,
    [filteredAssets],
  );
  const totalSuccessfulSales = useMemo(
    () => filteredAssets.reduce((sum, asset) => sum + Math.max(0, normalizeScore(asset.successfulSales, 0)), 0),
    [filteredAssets],
  );
  const zoomModeLabel = getZoomModeLabel(viewState.zoom);

  const toggleMapStyle = useCallback(() => {
    setMapStyle((prev) => (prev === 'default' ? 'satellite' : 'default'));
  }, []);

  const handleMove = useCallback(
    (nextViewState: { longitude: number; latitude: number; zoom: number }) => {
      onViewStateChange(nextViewState);
    },
    [onViewStateChange]
  );

  const mapControlButtonClass =
    'flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(18,19,23,0.78)] text-[rgba(226,232,240,0.92)] backdrop-blur-[10px] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.42)] transition-colors hover:bg-[rgba(18,19,23,0.92)] hover:text-white select-none';

  const handleMarkerClick = useCallback(
    (marker: MapDisplayMarker) => {
      onMarkerClick(marker.id);
      if (marker.level !== 'asset' && viewState.zoom < 8) {
        mapRef.current?.getMap()?.easeTo({
          center: [marker.longitude, marker.latitude],
          zoom: Math.min(viewState.zoom + (marker.level === 'country' ? 2.4 : 1.6), 8.8),
          duration: 650,
        });
        return;
      }
      onAssetClick(marker.asset);
    },
    [onAssetClick, onMarkerClick, viewState.zoom],
  );

  // Get map style URLs
  const getMapStyles = () => {
    if (mapStyle === 'default') {
      return {
        light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      };
    } else {
      // Satellite style - need to create a proper MapLibre GL style object
      const satelliteStyle = {
        version: 8,
        sources: {
          'satellite-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: '© Esri'
          }
        },
        layers: [
          {
            id: 'satellite',
            type: 'raster',
            source: 'satellite-tiles',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      } as any;
      return {
        light: satelliteStyle,
        dark: satelliteStyle,
      };
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      {/* Hover-expand Stats Bar */}
      <div className="absolute left-4 top-4 z-20 pointer-events-auto">
        <div
          className="group flex max-w-[calc(100vw-7rem)] items-center gap-1 overflow-hidden rounded-full border border-white/[0.06] bg-[rgba(18,19,23,0.72)] px-2 py-2 backdrop-blur-[12px] shadow-[0_18px_34px_-22px_rgba(0,0,0,0.58)] transition-all duration-300 select-none hover:gap-2 hover:bg-[rgba(18,19,23,0.9)] hover:px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC295]/45"
          role="group"
          tabIndex={0}
          title={`${filteredAssets.length.toLocaleString()} visible assets of ${totalListings.toLocaleString()} total listings; ${verifiedCount.toLocaleString()} verified assets`}
          aria-label={`${filteredAssets.length.toLocaleString()} visible assets, ${displayMarkers.length.toLocaleString()} pins, ${visibleSupplierCount.toLocaleString()} suppliers, ${totalSuccessfulSales.toLocaleString()} sales`}
        >
          <div className="flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-1 transition-colors duration-300 group-hover:bg-white/[0.04] group-focus-within:bg-white/[0.04]">
            <div className="h-2.5 w-2.5 rounded-full bg-[#2CC295]" />
            <span className="text-[12px] font-semibold text-white group-hover:hidden group-focus-within:hidden">{formatCompactCount(filteredAssets.length)}</span>
            <span className="hidden text-[13px] font-semibold text-white group-hover:inline group-focus-within:inline">{filteredAssets.length.toLocaleString()}</span>
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13px] text-[rgba(203,213,225,0.9)] opacity-0 transition-all duration-300 group-hover:max-w-[52px] group-hover:opacity-100 group-focus-within:max-w-[52px] group-focus-within:opacity-100">Assets</span>
          </div>
          <div className="h-4 w-px scale-y-0 bg-white/10 opacity-0 transition-all duration-300 group-hover:scale-y-100 group-hover:opacity-100 group-focus-within:scale-y-100 group-focus-within:opacity-100" />
          <div className="flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-1 transition-colors duration-300 group-hover:bg-white/[0.04] group-focus-within:bg-white/[0.04]">
            <MapPin size={13} className="text-[rgba(148,163,184,0.82)]" />
            <span className="text-[12px] font-semibold text-white group-hover:hidden group-focus-within:hidden">{formatCompactCount(displayMarkers.length)}</span>
            <span className="hidden text-[13px] font-semibold text-white group-hover:inline group-focus-within:inline">{displayMarkers.length.toLocaleString()}</span>
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13px] text-[rgba(203,213,225,0.9)] opacity-0 transition-all duration-300 group-hover:max-w-[32px] group-hover:opacity-100 group-focus-within:max-w-[32px] group-focus-within:opacity-100">Pins</span>
          </div>
          <div className="h-4 w-px scale-y-0 bg-white/10 opacity-0 transition-all duration-300 group-hover:scale-y-100 group-hover:opacity-100 group-focus-within:scale-y-100 group-focus-within:opacity-100" />
          <div className="flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-1 transition-colors duration-300 group-hover:bg-white/[0.04] group-focus-within:bg-white/[0.04]">
            <Users size={13} className="text-[rgba(148,163,184,0.82)]" />
            <span className="text-[12px] font-semibold text-white group-hover:hidden group-focus-within:hidden">{formatCompactCount(visibleSupplierCount)}</span>
            <span className="hidden text-[13px] font-semibold text-white group-hover:inline group-focus-within:inline">{visibleSupplierCount.toLocaleString()}</span>
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13px] text-[rgba(203,213,225,0.9)] opacity-0 transition-all duration-300 group-hover:max-w-[66px] group-hover:opacity-100 group-focus-within:max-w-[66px] group-focus-within:opacity-100">Suppliers</span>
          </div>
          <div className="h-4 w-px scale-y-0 bg-white/10 opacity-0 transition-all duration-300 group-hover:scale-y-100 group-hover:opacity-100 group-focus-within:scale-y-100 group-focus-within:opacity-100" />
          <div className="flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-1 transition-colors duration-300 group-hover:bg-white/[0.04] group-focus-within:bg-white/[0.04]">
            <TrendingUp size={13} className="text-[rgba(148,163,184,0.82)]" />
            <span className="text-[12px] font-semibold text-white group-hover:hidden group-focus-within:hidden">{formatCompactCount(totalSuccessfulSales)}</span>
            <span className="hidden text-[13px] font-semibold text-white group-hover:inline group-focus-within:inline">{totalSuccessfulSales.toLocaleString()}</span>
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13px] text-[rgba(203,213,225,0.9)] opacity-0 transition-all duration-300 group-hover:max-w-[42px] group-hover:opacity-100 group-focus-within:max-w-[42px] group-focus-within:opacity-100">Sales</span>
          </div>
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute right-4 top-4 z-20 pointer-events-auto flex flex-col gap-2">
        <button
          onClick={toggleMapStyle}
          className={mapControlButtonClass}
          title="Toggle Map Style"
        >
          <Layers size={18} />
        </button>

        {/* Verified Filter Toggle */}
        <button
          onClick={() => onToggleVerified?.(!verifiedOnly)}
          className={`relative flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-[10px] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.42)] transition-all select-none ${
            verifiedOnly
              ? 'bg-[#2CC295]/14 text-[#2CC295] shadow-[0_14px_28px_-18px_rgba(44,194,149,0.35)]'
              : 'bg-[rgba(18,19,23,0.78)] text-[rgba(226,232,240,0.92)] hover:bg-[rgba(18,19,23,0.92)] hover:text-white'
          }`}
          title={verifiedOnly ? 'Showing Verified Only' : 'Show Verified Assets'}
        >
          <ShieldCheck size={18} className="transition-colors" />
          {verifiedOnly && (
            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#2CC295] border-2 border-[rgba(18,19,23,0.92)]" />
          )}
        </button>
      </div>

      <div
        className="group pointer-events-auto absolute bottom-4 left-4 z-20 max-w-[min(310px,calc(100vw-2rem))] overflow-hidden rounded-full border border-white/[0.08] bg-[rgba(18,19,23,0.72)] text-[11px] text-[rgba(226,232,240,0.82)] shadow-[0_18px_34px_-24px_rgba(0,0,0,0.62)] backdrop-blur-[14px] transition-all duration-300 hover:rounded-[18px] hover:bg-[rgba(18,19,23,0.9)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC295]/45"
        role="group"
        tabIndex={0}
        aria-label={`Map density: ${zoomModeLabel}`}
      >
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <span className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.16em] text-white/52">
            <Gauge size={13} className="text-[#2CC295]" />
            Density
          </span>
          <span className="font-semibold text-white">{zoomModeLabel}</span>
        </div>
        <div className="max-h-0 overflow-hidden px-3 opacity-0 transition-all duration-300 group-hover:max-h-[140px] group-hover:pb-3 group-hover:opacity-100 group-focus-within:max-h-[140px] group-focus-within:pb-3 group-focus-within:opacity-100">
          <p className="leading-5 text-white/60">
            Zoomed-out views rank pins by sales, trust, seller scale, and engagement. Zoom in to reveal denser suppliers and individual assets.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-[#f5b84b]" />
              Sales
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-[#2CC295]" />
              Trusted
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-[#8da3ad]" />
              Standard
            </span>
          </div>
        </div>
      </div>

      {/* Map */}
      <MapCanvas
        ref={mapRef}
        viewState={viewState}
        styles={getMapStyles()}
        onMove={handleMove}
      >
        {/* Zoom-aware marketplace markers */}
        {displayMarkers.map((marker) => {
          const asset = marker.asset;
          const isHovered = hoveredMarkerKey === marker.key;
          const isSelected = selectedAssetId === marker.id;
          const markerSize = getMarkerSize(marker);
          const markerTone = getMarkerTone(marker);
          const isCluster = marker.level !== 'asset';
          const markerZIndex = isHovered || isSelected ? 50000 : hoveredMarkerKey ? 1 : isCluster ? 30 : 10;
          const categoryTone = getTaxonomyBadgeTone(marker.category || asset.category);

          return (
            <Marker
              key={marker.key}
              longitude={marker.longitude}
              latitude={marker.latitude}
              anchor="center"
              style={{ zIndex: markerZIndex }}
            >
              <div
                className="relative isolate"
                style={{ zIndex: markerZIndex }}
              >
                {/* Marker Point */}
                <div
                  className="pointer-events-auto cursor-pointer transition-transform duration-200"
                  style={{
                    transform:
                      isHovered || isSelected ? 'scale(1.14)' : hoveredMarkerKey ? 'scale(0.92)' : 'scale(1)',
                    opacity: hoveredMarkerKey && !isHovered && !isSelected ? 0.55 : 1,
                  }}
                  onMouseEnter={() => setHoveredMarkerKey(marker.key)}
                  onMouseLeave={() => setHoveredMarkerKey(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkerClick(marker);
                  }}
                >
                  {/* Glow Effect on Hover */}
                  {(isHovered || isSelected) && (
                    <div
                      className="absolute left-1/2 top-1/2 -z-10 animate-pulse rounded-full opacity-30 blur-xl"
                      style={{
                        width: `${markerSize * 3}px`,
                        height: `${markerSize * 3}px`,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: markerTone,
                      }}
                    />
                  )}

                  {isCluster ? (
                    <div
                      className="relative flex items-center justify-center rounded-full border font-semibold text-[#06100d] shadow-[0_18px_38px_-20px_rgba(44,194,149,0.7)] backdrop-blur-sm"
                      style={{
                        width: `${markerSize}px`,
                        height: `${markerSize}px`,
                        borderColor: `${markerTone}cc`,
                        background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.88), ${markerTone} 48%, rgba(10,18,18,0.92) 115%)`,
                        boxShadow: `0 0 0 ${Math.max(6, markerSize * 0.22)}px ${markerTone}22, 0 0 ${Math.max(24, markerSize * 0.9)}px ${markerTone}55`,
                      }}
                    >
                      <span className="text-[11px] tracking-[-0.04em]">{formatCompactCount(marker.count)}</span>
                    </div>
                  ) : (
                    <div
                      className="rounded-full border shadow-lg transition-colors"
                      style={{
                        width: `${markerSize}px`,
                        height: `${markerSize}px`,
                        borderWidth: marker.verified ? '2px' : '1.6px',
                        borderColor: markerTone,
                        backgroundColor: markerTone,
                        boxShadow: `0 0 0 4px ${markerTone}1f, 0 0 18px ${markerTone}70`,
                      }}
                    />
                  )}
                </div>

                {/* Hover Card */}
                {isHovered && (
                  <div
                    className="absolute pointer-events-none z-[50001]"
                    style={{
                      left: '50%',
                      bottom: '26px',
                      transform: 'translateX(-35%)',
                    }}
                  >
                    <div
                      className="w-[210px] animate-in rounded-[22px] border border-ui-border-subtle bg-ui-card p-2 font-[var(--font-sans)] shadow-[0_10px_30px_-10px_rgba(44,194,149,0.4),0_0_20px_rgba(44,194,149,0.2)] backdrop-blur-[20px] fade-in slide-in-from-bottom-2 duration-200"
                    >
                      <div className="relative mb-2 aspect-[1.55] overflow-hidden rounded-xl">
                        <img
                          alt={marker.label}
                          className="h-full w-full object-cover"
                          src={asset.image}
                        />

                        <div
                          className="absolute right-1 top-1 inline-flex max-w-[calc(100%-0.5rem)] items-center rounded-full border px-2 py-0.5 text-[7px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md"
                          style={{
                            background: categoryTone.background,
                            borderColor: categoryTone.borderColor,
                            color: categoryTone.textColor,
                            boxShadow: `0 14px 32px -28px ${categoryTone.shadowColor}`,
                          }}
                          title={marker.categoryLabel}
                        >
                          <span className="truncate">{marker.categoryLabel}</span>
                        </div>

                        {marker.verified && (
                          <div className="absolute left-1 top-1 flex items-center gap-0.5 rounded border border-[#2CC295]/20 bg-black/90 px-1 py-0.5 text-[7px] font-semibold text-[#2CC295]">
                            <svg
                              className="h-2 w-2"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="mb-1.5 px-1.5">
                        <h4 className="line-clamp-2 text-[11px] font-semibold leading-tight tracking-tight text-ui-primary">
                          {marker.level === 'asset' ? asset.name : marker.label}
                        </h4>
                        <p className="mt-1 text-[10px] leading-tight text-ui-secondary">{marker.subtitle}</p>
                        <div className="mt-2 grid grid-cols-3 gap-1.5">
                          <div className="rounded-lg bg-[var(--t-surface-2)] px-2 py-1">
                            <p className="text-[8px] uppercase tracking-[0.12em] text-ui-muted">Trust</p>
                            <p className="text-[10px] font-semibold text-ui-primary">{Math.round(marker.trustScore)}</p>
                          </div>
                          <div className="rounded-lg bg-[var(--t-surface-2)] px-2 py-1">
                            <p className="text-[8px] uppercase tracking-[0.12em] text-ui-muted">Sales</p>
                            <p className="text-[10px] font-semibold text-ui-primary">{marker.successfulSales}</p>
                          </div>
                          <div className="rounded-lg bg-[var(--t-surface-2)] px-2 py-1">
                            <p className="text-[8px] uppercase tracking-[0.12em] text-ui-muted">Assets</p>
                            <p className="text-[10px] font-semibold text-ui-primary">{marker.count}</p>
                          </div>
                        </div>
                        {marker.level !== 'asset' && (
                          <p className="mt-2 text-[9px] leading-4 text-ui-muted">
                            Click to zoom into top supplier listings.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Marker>
          );
        })}
      </MapCanvas>
    </div>
  );
}
