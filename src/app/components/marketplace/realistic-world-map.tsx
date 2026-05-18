/**
 * REALISTIC WORLD MAP
 * ===================
 * Dark themed world map using react-map-gl/MapLibre GL
 * Professional tile rendering with markers and interactive controls
 */

'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Gauge, Layers, MapPin, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { Map as MapCanvas, MapRef } from '@/app/components/ui/map';
import { Marker, Popup } from 'react-map-gl/maplibre';
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

const SYSTEM_MARKER_GREEN = '#2CC295';
const HOVER_CARD_CLOSE_DELAY_MS = 180;

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

function buildAssetCoordinateKey(asset: MarketplaceAsset) {
  return `${asset.latitude.toFixed(5)}:${asset.longitude.toFixed(5)}`;
}

function getAssetPinOffset(asset: MarketplaceAsset, duplicateIndex: number, zoom: number) {
  if (duplicateIndex === 0) return { latitude: 0, longitude: 0 };

  const seed = Array.from(asset.assetKey || String(asset.id)).reduce(
    (hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0,
    0,
  );
  const angle = ((Math.abs(seed) % 360) * Math.PI) / 180;
  const radiusPx = 8 + (duplicateIndex % 5) * 3.5;
  const degreesPerPixel = 360 / (512 * Math.pow(2, Math.max(zoom, 1)));
  const latitudeScale = Math.max(0.35, Math.cos((asset.latitude * Math.PI) / 180));

  return {
    latitude: Math.sin(angle) * radiusPx * degreesPerPixel,
    longitude: (Math.cos(angle) * radiusPx * degreesPerPixel) / latitudeScale,
  };
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

  const coordinateCounts = new Map<string, number>();

  return assets
    .map((asset) => {
      const coordinateKey = buildAssetCoordinateKey(asset);
      const duplicateIndex = coordinateCounts.get(coordinateKey) || 0;
      coordinateCounts.set(coordinateKey, duplicateIndex + 1);

      const marker = createMarkerFromAssets('asset', `asset:${asset.id}`, asset.name, [asset]);
      const offset = getAssetPinOffset(asset, duplicateIndex, zoom);

      return {
        ...marker,
        latitude: clamp(marker.latitude + offset.latitude, -85, 85),
        longitude: marker.longitude + offset.longitude,
      };
    })
    .sort((left, right) => right.displayScore - left.displayScore);
}

function getMarkerSize(marker: MapDisplayMarker) {
  if (marker.level === 'asset') return marker.displayScore > 70 ? 15 : 11.5;
  return clamp(22 + Math.sqrt(marker.count) * 5.2, 30, 76);
}

function getMarkerTone(marker: MapDisplayMarker) {
  if (marker.successfulSales > 0) return '#f5b84b';
  if (marker.trustScore >= 75 || marker.verified) return SYSTEM_MARKER_GREEN;
  if (marker.trustScore >= 55) return '#76d7bd';
  return SYSTEM_MARKER_GREEN;
}

function getZoomModeLabel(zoom: number) {
  if (zoom < 3.2) return 'Country hubs';
  if (zoom < 5.8) return 'Supplier leaders';
  if (zoom < 8) return 'Local clusters';
  return 'Asset pins';
}

function MarketplaceMarkerHoverCard({
  marker,
  onActivate,
  onPointerEnter,
  onPointerLeave,
}: {
  marker: MapDisplayMarker;
  onActivate: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const asset = marker.asset;
  const categoryTone = getTaxonomyBadgeTone(marker.category || asset.category);

  return (
    <button
      type="button"
      className="block w-[210px] max-w-[calc(100vw-2rem)] animate-in cursor-pointer rounded-[22px] border border-ui-border-subtle bg-ui-card p-2 text-left font-[var(--font-sans)] shadow-[0_10px_30px_-10px_rgba(44,194,149,0.4),0_0_20px_rgba(44,194,149,0.2)] backdrop-blur-[20px] transition-transform fade-in slide-in-from-bottom-2 duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC295]/45"
      aria-label={marker.level === 'asset' ? `Open ${asset.name}` : `Zoom into ${marker.label}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
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
        <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-ui-secondary">{marker.subtitle}</p>
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
    </button>
  );
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
  const hoverCloseTimeoutRef = useRef<number | null>(null);
  const displayMarkers = useMemo(
    () => buildDisplayMarkers(filteredAssets, viewState.zoom),
    [filteredAssets, viewState.zoom],
  );
  const hoveredMarker = useMemo(
    () => displayMarkers.find((marker) => marker.key === hoveredMarkerKey) || null,
    [displayMarkers, hoveredMarkerKey],
  );
  const visibleSupplierCount = useMemo(
    () => new Set(filteredAssets.map((asset) => asset.supplierKey || asset.seller.name)).size,
    [filteredAssets],
  );
  const totalSuccessfulSales = useMemo(
    () => filteredAssets.reduce((sum, asset) => sum + Math.max(0, normalizeScore(asset.successfulSales, 0)), 0),
    [filteredAssets],
  );
  const displayMarkerKeys = useMemo(() => new Set(displayMarkers.map((marker) => marker.key)), [displayMarkers]);
  const zoomModeLabel = getZoomModeLabel(viewState.zoom);

  const clearHoverCloseTimer = useCallback(() => {
    if (hoverCloseTimeoutRef.current === null) return;
    window.clearTimeout(hoverCloseTimeoutRef.current);
    hoverCloseTimeoutRef.current = null;
  }, []);

  const openMarkerCard = useCallback(
    (markerKey: string) => {
      clearHoverCloseTimer();
      setHoveredMarkerKey(markerKey);
    },
    [clearHoverCloseTimer],
  );

  const scheduleMarkerCardClose = useCallback(() => {
    clearHoverCloseTimer();
    hoverCloseTimeoutRef.current = window.setTimeout(() => {
      setHoveredMarkerKey(null);
      hoverCloseTimeoutRef.current = null;
    }, HOVER_CARD_CLOSE_DELAY_MS);
  }, [clearHoverCloseTimer]);

  useEffect(() => () => clearHoverCloseTimer(), [clearHoverCloseTimer]);

  useEffect(() => {
    if (hoveredMarkerKey && !displayMarkerKeys.has(hoveredMarkerKey)) {
      clearHoverCloseTimer();
      setHoveredMarkerKey(null);
    }
  }, [clearHoverCloseTimer, displayMarkerKeys, hoveredMarkerKey]);

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
      <div className="pointer-events-none absolute left-4 right-4 top-4 z-20">
        <div
          className="group pointer-events-auto flex w-fit max-w-full items-center gap-1 overflow-hidden rounded-full bg-[var(--t-card-bg)] px-2 py-2 text-ui-secondary shadow-[0_18px_34px_-24px_rgba(0,0,0,0.58)] backdrop-blur-[12px] transition-all duration-300 select-none hover:gap-2 hover:px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC295]/45"
          role="group"
          tabIndex={0}
          title={`${filteredAssets.length.toLocaleString()} visible assets of ${totalListings.toLocaleString()} total listings; ${verifiedCount.toLocaleString()} verified assets`}
          aria-label={`${filteredAssets.length.toLocaleString()} visible assets, ${displayMarkers.length.toLocaleString()} pins, ${visibleSupplierCount.toLocaleString()} suppliers, ${totalSuccessfulSales.toLocaleString()} sales`}
        >
          <div className="flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-1 transition-colors duration-300 group-hover:bg-[var(--t-surface-5)] group-focus-within:bg-[var(--t-surface-5)]">
            <div className="h-2.5 w-2.5 rounded-full bg-[#2CC295]" />
            <span className="text-[12px] font-semibold text-ui-primary group-hover:hidden group-focus-within:hidden">{formatCompactCount(filteredAssets.length)}</span>
            <span className="hidden text-[13px] font-semibold text-ui-primary group-hover:inline group-focus-within:inline">{filteredAssets.length.toLocaleString()}</span>
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13px] text-ui-secondary opacity-0 transition-all duration-300 group-hover:max-w-[52px] group-hover:opacity-100 group-focus-within:max-w-[52px] group-focus-within:opacity-100">Assets</span>
          </div>
          <div className="h-4 w-px scale-y-0 bg-ui-border-subtle opacity-0 transition-all duration-300 group-hover:scale-y-100 group-hover:opacity-100 group-focus-within:scale-y-100 group-focus-within:opacity-100" />
          <div className="flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-1 transition-colors duration-300 group-hover:bg-[var(--t-surface-5)] group-focus-within:bg-[var(--t-surface-5)]">
            <MapPin size={13} className="text-ui-muted" />
            <span className="text-[12px] font-semibold text-ui-primary group-hover:hidden group-focus-within:hidden">{formatCompactCount(displayMarkers.length)}</span>
            <span className="hidden text-[13px] font-semibold text-ui-primary group-hover:inline group-focus-within:inline">{displayMarkers.length.toLocaleString()}</span>
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13px] text-ui-secondary opacity-0 transition-all duration-300 group-hover:max-w-[32px] group-hover:opacity-100 group-focus-within:max-w-[32px] group-focus-within:opacity-100">Pins</span>
          </div>
          <div className="h-4 w-px scale-y-0 bg-ui-border-subtle opacity-0 transition-all duration-300 group-hover:scale-y-100 group-hover:opacity-100 group-focus-within:scale-y-100 group-focus-within:opacity-100" />
          <div className="flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-1 transition-colors duration-300 group-hover:bg-[var(--t-surface-5)] group-focus-within:bg-[var(--t-surface-5)]">
            <Users size={13} className="text-ui-muted" />
            <span className="text-[12px] font-semibold text-ui-primary group-hover:hidden group-focus-within:hidden">{formatCompactCount(visibleSupplierCount)}</span>
            <span className="hidden text-[13px] font-semibold text-ui-primary group-hover:inline group-focus-within:inline">{visibleSupplierCount.toLocaleString()}</span>
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13px] text-ui-secondary opacity-0 transition-all duration-300 group-hover:max-w-[66px] group-hover:opacity-100 group-focus-within:max-w-[66px] group-focus-within:opacity-100">Suppliers</span>
          </div>
          <div className="h-4 w-px scale-y-0 bg-ui-border-subtle opacity-0 transition-all duration-300 group-hover:scale-y-100 group-hover:opacity-100 group-focus-within:scale-y-100 group-focus-within:opacity-100" />
          <div className="flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-1 transition-colors duration-300 group-hover:bg-[var(--t-surface-5)] group-focus-within:bg-[var(--t-surface-5)]">
            <TrendingUp size={13} className="text-ui-muted" />
            <span className="text-[12px] font-semibold text-ui-primary group-hover:hidden group-focus-within:hidden">{formatCompactCount(totalSuccessfulSales)}</span>
            <span className="hidden text-[13px] font-semibold text-ui-primary group-hover:inline group-focus-within:inline">{totalSuccessfulSales.toLocaleString()}</span>
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13px] text-ui-secondary opacity-0 transition-all duration-300 group-hover:max-w-[42px] group-hover:opacity-100 group-focus-within:max-w-[42px] group-focus-within:opacity-100">Sales</span>
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
        className="group pointer-events-auto absolute bottom-4 left-4 z-20 w-[360px] max-w-[calc(100%-2rem)] select-none overflow-hidden rounded-[20px] bg-[var(--t-card-bg)] text-[11px] text-ui-secondary shadow-[0_18px_34px_-24px_rgba(0,0,0,0.62)] backdrop-blur-[14px] transition-[box-shadow] duration-200 hover:shadow-[0_22px_42px_-26px_rgba(0,0,0,0.72)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC295]/45"
        role="group"
        tabIndex={0}
        aria-label={`Map density: ${zoomModeLabel}`}
      >
        <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-3">
          <span className="inline-flex min-w-0 items-center gap-2 font-semibold uppercase tracking-[0.16em] text-ui-muted">
            <Gauge size={13} className="shrink-0 text-[#2CC295]" />
            <span className="truncate">Density</span>
          </span>
          <span className="shrink-0 whitespace-nowrap text-right font-semibold text-ui-primary">{zoomModeLabel}</span>
        </div>
        <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 ease-out group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100">
          <div className="min-h-0 overflow-hidden">
            <div className="px-4 pb-4">
              <p className="max-w-[32rem] leading-5 text-ui-secondary">
                Zoomed-out views rank pins by sales, trust, seller scale, and engagement. Zoom in to reveal denser suppliers and individual assets.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--t-surface-5)] px-2 py-1 text-ui-secondary">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#f5b84b]" />
                  Sales
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--t-surface-5)] px-2 py-1 text-ui-secondary">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#2CC295]" />
                  Trusted
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--t-surface-5)] px-2 py-1 text-ui-secondary">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary-custom)]" />
                  Standard
                </span>
              </div>
            </div>
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
          const isHovered = hoveredMarkerKey === marker.key;
          const isSelected = selectedAssetId === marker.id;
          const markerSize = getMarkerSize(marker);
          const markerTone = getMarkerTone(marker);
          const isCluster = marker.level !== 'asset';
          const hasActiveHover = Boolean(hoveredMarker);
          const markerZIndex = isHovered || isSelected ? 50000 : hasActiveHover ? 1 : isCluster ? 30 : 10;

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
                      isHovered || isSelected ? 'scale(1.14)' : hasActiveHover ? 'scale(0.92)' : 'scale(1)',
                    opacity: hasActiveHover && !isHovered && !isSelected ? 0.55 : 1,
                  }}
                  onPointerEnter={() => openMarkerCard(marker.key)}
                  onPointerLeave={scheduleMarkerCardClose}
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
                        boxShadow: `0 0 0 5px ${markerTone}26, 0 0 22px ${markerTone}80`,
                      }}
                    />
                  )}
                </div>

              </div>
            </Marker>
          );
        })}

        {hoveredMarker && (
          <Popup
            longitude={hoveredMarker.longitude}
            latitude={hoveredMarker.latitude}
            closeButton={false}
            closeOnClick={false}
            focusAfterOpen={false}
            offset={Math.max(18, getMarkerSize(hoveredMarker) / 2 + 10)}
            padding={{ top: 12, right: 12, bottom: 12, left: 12 }}
            maxWidth="210px"
            className="marketplace-map-hover-popup"
          >
            <MarketplaceMarkerHoverCard
              marker={hoveredMarker}
              onActivate={() => handleMarkerClick(hoveredMarker)}
              onPointerEnter={() => openMarkerCard(hoveredMarker.key)}
              onPointerLeave={scheduleMarkerCardClose}
            />
          </Popup>
        )}
      </MapCanvas>
    </div>
  );
}
