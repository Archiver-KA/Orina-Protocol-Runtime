/**
 * REALISTIC WORLD MAP
 * ===================
 * Dark themed world map using react-map-gl/MapLibre GL
 * Professional tile rendering with markers and interactive controls
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Layers, ShieldCheck } from 'lucide-react';
import { Map, MapRef } from '@/app/components/ui/map';
import { Marker } from 'react-map-gl/maplibre';
import { Clock, Star } from 'lucide-react';

interface MarketplaceAsset {
  id: number;
  name: string;
  categoryLabel: string;
  price: string;
  usdPrice: string;
  image: string;
  latitude: number;
  longitude: number;
  city: string;
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
  const [hoveredAsset, setHoveredAsset] = useState<number | null>(null);
  const [mapStyle, setMapStyle] = useState<'default' | 'satellite'>('default');
  const mapRef = useRef<MapRef>(null);

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
      {/* Compact Stats Bar */}
      <div className="absolute left-4 top-4 z-20 pointer-events-auto">
        <div className="flex items-center gap-3 rounded-full bg-[rgba(18,19,23,0.82)] px-4 py-3 backdrop-blur-[12px] shadow-[0_18px_34px_-22px_rgba(0,0,0,0.58)] select-none">
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-2.5 w-2.5 rounded-full bg-[#2CC295]" />
            <span className="text-[13px] font-semibold text-white">{filteredAssets.length.toLocaleString()}</span>
            <span className="text-[13px] text-[rgba(203,213,225,0.9)]">Assets</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 shrink-0">
            <Clock size={13} className="text-[rgba(148,163,184,0.82)]" />
            <span className="text-[13px] font-semibold text-white">{totalListings.toLocaleString()}</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 shrink-0">
            <Star size={13} className="text-[rgba(148,163,184,0.82)]" />
            <span className="text-[13px] font-semibold text-white">{verifiedCount.toLocaleString()}</span>
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

      {/* Map */}
      <Map
        ref={mapRef}
        viewState={viewState}
        styles={getMapStyles()}
        onMove={handleMove}
      >
        {/* Asset Markers */}
        {filteredAssets.map((asset) => {
          const isHovered = hoveredAsset === asset.id;
          const isSelected = selectedAssetId === asset.id;

          return (
            <Marker
              key={asset.id}
              longitude={asset.longitude}
              latitude={asset.latitude}
              anchor="center"
            >
              <div
                className="relative"
                style={{
                  zIndex: isHovered || isSelected ? 9999 : hoveredAsset ? 1 : 10,
                }}
              >
                {/* Marker Point */}
                <div
                  className="pointer-events-auto cursor-pointer transition-transform duration-200"
                  style={{
                    transform:
                      isHovered || isSelected ? 'scale(1.2)' : hoveredAsset ? 'scale(0.9)' : 'scale(1)',
                    opacity: hoveredAsset && !isHovered && !isSelected ? 0.55 : 1,
                  }}
                  onMouseEnter={() => setHoveredAsset(asset.id)}
                  onMouseLeave={() => setHoveredAsset(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssetClick(asset);
                  }}
                >
                  {/* Glow Effect on Hover */}
                  {(isHovered || isSelected) && (
                    <div className="absolute inset-0 -z-10 h-12 w-12 -translate-x-1/4 -translate-y-1/4 animate-pulse rounded-full bg-[#2CC295] opacity-30 blur-xl" />
                  )}

                  {/* Point Marker */}
                  <div
                    className="rounded-full border border-[#2CC295] bg-[#2CC295] shadow-lg shadow-[#2CC295]/50 transition-colors"
                    style={{ width: '9.6px', height: '9.6px', borderWidth: '1.6px' }}
                  />
                </div>

                {/* Hover Card */}
                {isHovered && (
                  <div
                    className="absolute pointer-events-none z-[10000]"
                    style={{
                      left: '50%',
                      bottom: '26px',
                      transform: 'translateX(-35%)',
                    }}
                  >
                    {/* Glass Card Container */}
                    <div
                      className="w-[148px] animate-in rounded-[20px] border border-ui-border-subtle bg-ui-card p-2 font-[var(--font-sans)] shadow-[0_10px_30px_-10px_rgba(44,194,149,0.4),0_0_20px_rgba(44,194,149,0.2)] backdrop-blur-[20px] fade-in slide-in-from-bottom-2 duration-200"
                    >
                      {/* Image */}
                      <div className="relative mb-2 aspect-square overflow-hidden rounded-lg">
                        <img
                          alt={asset.name}
                          className="h-full w-full object-cover"
                          src={asset.image}
                        />

                        {/* Category Badge - Top Right */}
                        <div
                          className="absolute right-1 top-1 inline-flex items-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-5)] px-2 py-0.5 text-[7px] font-semibold uppercase tracking-[0.12em] text-ui-secondary backdrop-blur-md"
                        >
                          {asset.categoryLabel}
                        </div>

                        {/* Verified Badge - Top Left */}
                        {asset.verified && (
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

                      {/* Card Content */}
                      <div className="mb-1.5 px-1">
                        <h4 className="truncate text-[10px] font-semibold leading-tight tracking-tight text-ui-primary">
                          {asset.name}
                        </h4>
                        <p className="mt-1 text-[10px] font-semibold leading-tight text-ui-primary">{asset.price}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}
