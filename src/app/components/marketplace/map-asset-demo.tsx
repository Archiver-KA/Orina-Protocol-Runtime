/**
 * MAP ASSET CARD DEMO
 * ===================
 * Demo component showing persistent cards on map background
 * Matching HTML template exactly
 */

'use client';

import { MapAssetCard } from './map-asset-card';

const DEMO_ASSETS = [
  {
    name: 'Neon Drifter #821',
    price: '1.25 ETH',
    rarity: 'Legendary',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop',
    verified: true,
    position: { top: '30%', left: '42%' }
  },
  {
    name: 'Cyber Ghost #02',
    price: '2.45 ETH',
    rarity: 'Legendary',
    image: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&h=300&fit=crop',
    verified: false,
    position: { top: '52%', left: '54%' }
  },
  {
    name: 'Void Catalyst',
    price: '3.20 ETH',
    rarity: 'Epic',
    image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=300&fit=crop',
    verified: true,
    position: { top: '23%', left: '72%' }
  },
  {
    name: 'Aether Orb X-4',
    price: '0.85 ETH',
    rarity: 'Rare',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=300&fit=crop',
    verified: false,
    position: { top: '60%', left: '65%' }
  },
];

export function MapAssetDemo() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-[#27272a] bg-[#0c0c0e]">
      {/* Map Background Pattern */}
      <div 
        className="absolute inset-0" 
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Dark Map Image Overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <img
          alt="Dark Map World"
          className="w-full h-full object-cover mix-blend-luminosity grayscale contrast-125 brightness-50"
          src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1920&h=1080&fit=crop"
        />
      </div>

      {/* Asset Cards */}
      {DEMO_ASSETS.map((asset, index) => (
        <MapAssetCard
          key={index}
          asset={asset}
          position={asset.position}
          onClick={() => console.log('Clicked:', asset.name)}
          onHover={(isHovered) => console.log('Hovered:', asset.name, isHovered)}
        />
      ))}

      {/* Live Viewport Data Card - Bottom Left */}
      <div className="absolute bottom-6 left-6 z-30">
        <div className="glass-card rounded-xl px-4 py-3 border border-[#27272a] max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Live Viewport Data
            </span>
            <span className="flex h-2 w-2 rounded-full bg-[#2CC295] animate-pulse"></span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-[18px] w-[18px] text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm font-medium text-white">Aggregated Floor: 0.85 ETH</p>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">
            Data-centric view enabled: showing persistent asset stats
          </p>
        </div>
      </div>

      {/* View Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-4">
        <div className="flex bg-[#1a1a1c]/90 backdrop-blur-md p-1 rounded-lg border border-[#27272a]">
          <button className="flex items-center gap-2 px-3 py-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-wider">List</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-black bg-[#2CC295] rounded-md shadow-[0_0_15px_rgba(44,194,149,0.3)]">
            <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-wider">Map</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="bg-[#1a1a1c]/90 backdrop-blur-md border border-[#27272a] rounded-lg p-1 flex items-center">
          <button className="p-2 text-zinc-400 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <div className="w-px h-4 bg-zinc-800 mx-1"></div>
          <button className="p-2 text-zinc-400 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
