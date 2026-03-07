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
  collection: string;
  price: string;
  usdPrice: string;
  rarity: string;
  rarityColor: string;
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
  onAssetClick: (asset: MarketplaceAsset) => void;
  selectedAssetId: number | null;
  onMarkerClick: (assetId: number) => void;
  verifiedOnly?: boolean;
  onToggleVerified?: (value: boolean) => void;
}

export function RealisticWorldMap({
  filteredAssets,
  onAssetClick,
  selectedAssetId,
  onMarkerClick,
  verifiedOnly = false,
  onToggleVerified,
}: RealisticWorldMapProps) {
  const [hoveredAsset, setHoveredAsset] = useState<number | null>(null);
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 2,
  });
  const mapRef = useRef<MapRef>(null);

  const toggleMapStyle = useCallback(() => {
    setMapStyle((prev) => (prev === 'dark' ? 'satellite' : 'dark'));
  }, []);

  const handleMove = useCallback((evt: any) => {
    setViewState({
      longitude: evt.viewState.longitude,
      latitude: evt.viewState.latitude,
      zoom: evt.viewState.zoom,
    });
  }, []);

  // Get map style URLs
  const getMapStyles = () => {
    if (mapStyle === 'dark') {
      return {
        dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      };
    } else {
      // Satellite style - need to create a proper MapLibre GL style object
      return {
        dark: {
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
        } as any,
      };
    }
  };

  // Get rarity style helper
  const getRarityStyle = (rarity: string) => {
    const r = rarity.toLowerCase();
    if (r.includes('legend'))
      return {
        text: 'text-[#2CC295]',
        border: 'border-[#2CC295]/20',
        label: 'LEGEN',
      };
    if (r.includes('epic'))
      return {
        text: 'text-purple-400',
        border: 'border-purple-400/20',
        label: 'EPIC',
      };
    if (r.includes('rare'))
      return {
        text: 'text-blue-400',
        border: 'border-blue-400/20',
        label: 'RARE',
      };
    return {
      text: 'text-zinc-400',
      border: 'border-zinc-400/20',
      label: 'COMMON',
    };
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      {/* Stats Info - Expandable on Hover */}
      <div className="absolute left-4 top-4 z-20 group pointer-events-auto">
        <div className="flex items-center gap-2 rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 transition-all duration-300 hover:px-4 hover:gap-3 select-none">
          {/* Asset Count - Always Visible */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-2 h-2 rounded-full bg-[#2CC295]"></div>
            <span className="text-sm font-bold text-white">
              {filteredAssets.length}
            </span>
            <span className="text-xs text-zinc-400">Assets</span>
          </div>

          {/* Expanded Stats - Show on Hover */}
          <div className="flex items-center gap-3 max-w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-w-xs group-hover:opacity-100">
            <div className="h-4 w-px bg-[#27272a]"></div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Clock size={12} className="text-zinc-500" />
              <span className="text-sm font-bold text-white">43,266</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Star size={12} className="text-zinc-500" />
              <span className="text-sm font-bold text-white">16,069</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Style Toggle - Only Control */}
      <div className="absolute right-4 top-4 z-20 pointer-events-auto flex flex-col gap-2">
        <button
          onClick={toggleMapStyle}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#27272a] bg-[#18181b] transition-colors hover:border-[#2CC295]/50 hover:bg-zinc-800 select-none"
          title="Toggle Map Style"
        >
          <Layers size={18} className="text-zinc-400" />
        </button>

        {/* Verified Filter Toggle */}
        <button
          onClick={() => onToggleVerified?.(!verifiedOnly)}
          className={`relative flex h-10 w-10 items-center justify-center rounded-lg border transition-all select-none ${
            verifiedOnly
              ? 'border-[#2CC295]/60 bg-[#2CC295]/10 shadow-[0_0_12px_rgba(44,194,149,0.25)]'
              : 'border-[#27272a] bg-[#18181b] hover:border-[#2CC295]/50 hover:bg-zinc-800'
          }`}
          title={verifiedOnly ? 'Showing Verified Only' : 'Show Verified Assets'}
        >
          <ShieldCheck size={18} className={`transition-colors ${verifiedOnly ? 'text-[#2CC295]' : 'text-zinc-400'}`} />
          {verifiedOnly && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#2CC295] border-2 border-[#18181b]" />
          )}
        </button>
      </div>

      {/* Map */}
      <Map
        ref={mapRef}
        center={[viewState.longitude, viewState.latitude]}
        zoom={viewState.zoom}
        styles={getMapStyles()}
        onMove={handleMove}
      >
        {/* Asset Markers */}
        {filteredAssets.map((asset) => {
          const isHovered = hoveredAsset === asset.id;
          const isSelected = selectedAssetId === asset.id;
          const rarityStyle = getRarityStyle(asset.rarity);

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
                    className={`h-3 w-3 rounded-full border-2 transition-colors ${
                      asset.verified
                        ? 'bg-[#2CC295] border-[#2CC295] shadow-lg shadow-[#2CC295]/50'
                        : 'bg-zinc-700 border-zinc-500'
                    }`}
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
                      className="w-[140px] rounded-xl p-2 border shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
                      style={{
                        background: '#141417',
                        borderColor: 'rgba(44, 194, 149, 0.3)',
                        boxShadow:
                          '0 10px 30px -10px rgba(44, 194, 149, 0.4), 0 0 20px rgba(44, 194, 149, 0.2)',
                      }}
                    >
                      {/* Image */}
                      <div className="relative mb-2 aspect-square overflow-hidden rounded-lg">
                        <img
                          alt={asset.name}
                          className="h-full w-full object-cover"
                          src={asset.image}
                        />

                        {/* Rarity Badge - Top Right */}
                        <div
                          className={`absolute right-1 top-1 bg-black/90 px-1 py-0.5 rounded text-[7px] font-bold ${rarityStyle.text} border ${rarityStyle.border}`}
                        >
                          {rarityStyle.label}
                        </div>

                        {/* Verified Badge - Top Left */}
                        {asset.verified && (
                          <div className="absolute left-1 top-1 flex items-center gap-0.5 rounded border border-[#2CC295]/20 bg-black/90 px-1 py-0.5 text-[7px] font-bold text-[#2CC295]">
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
                      <div className="px-1 mb-2">
                        <h4 className="text-white text-[10px] font-bold truncate leading-tight">
                          {asset.name}
                        </h4>
                        <div className="flex items-center gap-1 mt-0.5">
                          <svg
                            className="h-[10px] w-[10px] text-[#2CC295]"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                          </svg>
                          <span className="text-white text-[10px] font-bold">
                            {asset.price}
                          </span>
                        </div>
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
