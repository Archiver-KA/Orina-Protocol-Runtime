import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, X, ChevronDown, MapPin, Heart, Diamond, Grid, List, Map as MapIcon } from 'lucide-react';

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

interface MapRightSidebarProps {
  assets: MarketplaceAsset[];
  onAssetClick: (asset: MarketplaceAsset) => void;
  favorites: number[];
  onToggleFavorite: (id: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedRarity: string;
  setSelectedRarity: (rarity: string) => void;
  selectedCollection: string;
  setSelectedCollection: (collection: string) => void;
  filteredAssets: MarketplaceAsset[];
  viewMode: 'grid' | 'list' | 'map';
  setViewMode: (mode: 'grid' | 'list' | 'map') => void;
  selectedAssetId: number | null;
}

export function MapRightSidebar({
  assets,
  onAssetClick,
  favorites,
  onToggleFavorite,
  searchQuery,
  setSearchQuery,
  selectedCity,
  setSelectedCity,
  selectedRarity,
  setSelectedRarity,
  selectedCollection,
  setSelectedCollection,
  filteredAssets,
  viewMode,
  setViewMode,
  selectedAssetId
}: MapRightSidebarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const selectedAssetRef = useRef<HTMLDivElement>(null);

  // Scroll to selected asset
  useEffect(() => {
    if (selectedAssetId && selectedAssetRef.current) {
      selectedAssetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedAssetId]);

  // Extract unique values for filters
  const cities = useMemo(() => {
    const uniqueCities = Array.from(new Set(assets.map(a => a.city)));
    return ['all', ...uniqueCities];
  }, [assets]);

  const rarities = useMemo(() => {
    const uniqueRarities = Array.from(new Set(assets.map(a => a.rarity)));
    return ['all', ...uniqueRarities];
  }, [assets]);

  const collections = useMemo(() => {
    const uniqueCollections = Array.from(new Set(assets.map(a => a.collection)));
    return ['all', ...uniqueCollections];
  }, [assets]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCity('all');
    setSelectedRarity('all');
    setSelectedCollection('all');
  };

  const activeFiltersCount = [selectedCity, selectedRarity, selectedCollection].filter(f => f !== 'all').length;

  return (
    <aside className="w-80 bg-zinc-900/30 flex flex-col border-l border-[#27272a] overflow-hidden">
      <style>{`
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* View Mode Toggle */}
      <div className="p-4 border-b border-[#27272a]">
        <div className="flex bg-[#1a1a1c] p-1 rounded-lg border border-[#27272a] gap-1">
          <button 
            onClick={() => setViewMode('grid')}
            className={`flex-1 p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Grid View"
          >
            <Grid size={16} className="mx-auto" />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`flex-1 p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="List View"
          >
            <List size={16} className="mx-auto" />
          </button>
          <button 
            onClick={() => setViewMode('map')}
            className={`flex-1 p-2 rounded-md transition-all ${viewMode === 'map' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Map View"
          >
            <MapIcon size={16} className="mx-auto" />
          </button>
        </div>
      </div>

      {/* Search Section */}
      <div className="p-4 border-b border-[#27272a] space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="w-full bg-zinc-900/95 border border-[#27272a] rounded-lg pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#2CC295]/50 focus:border-[#2CC295]/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
            showFilters || activeFiltersCount > 0
              ? 'bg-[#2CC295] text-black'
              : 'bg-zinc-800 text-white hover:bg-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Filter size={16} />
            <span className="text-xs font-bold">Filters</span>
          </div>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-black text-[#2CC295] text-[10px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-4 border-b border-[#27272a] space-y-4 bg-zinc-900/30">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active Filters</h3>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-[10px] text-[#2CC295] hover:text-[#25a981] font-bold transition-colors uppercase tracking-wider"
              >
                Clear All
              </button>
            )}
          </div>

          {/* City Filter */}
          <div>
            <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-2 block">
              City
            </label>
            <div className="relative">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-zinc-800 border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2CC295]/50 focus:border-[#2CC295]/50 transition-all"
              >
                {cities.map(city => (
                  <option key={city} value={city}>
                    {city === 'all' ? 'All Cities' : city}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Rarity Filter */}
          <div>
            <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-2 block">
              Rarity
            </label>
            <div className="relative">
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value)}
                className="w-full bg-zinc-800 border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2CC295]/50 focus:border-[#2CC295]/50 transition-all"
              >
                {rarities.map(rarity => (
                  <option key={rarity} value={rarity}>
                    {rarity === 'all' ? 'All Rarities' : rarity}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Collection Filter */}
          <div>
            <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-2 block">
              Collection
            </label>
            <div className="relative">
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full bg-zinc-800 border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2CC295]/50 focus:border-[#2CC295]/50 transition-all"
              >
                {collections.map(collection => (
                  <option key={collection} value={collection}>
                    {collection === 'all' ? 'All Collections' : collection}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
            </div>
          </div>
        </div>
      )}

      {/* Live Marketplace Info */}
      <div className="p-4 border-b border-[#27272a]">
        <div className="bg-zinc-900/60 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#2CC295] rounded-full animate-pulse" />
            <p className="text-[10px] font-bold text-white uppercase tracking-wider">Live Marketplace</p>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            <span className="text-[#2CC295] font-bold">{filteredAssets.length}</span> of <span className="text-white font-bold">{assets.length}</span> assets {searchQuery || activeFiltersCount > 0 ? 'matching filters' : 'available worldwide'}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-b border-[#27272a]">
        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Map Legend</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#2CC295]/20 border border-[#2CC295] flex-shrink-0" />
            <p className="text-[10px] text-zinc-500">Verified Asset</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white/20 border border-white/40 flex-shrink-0" />
            <p className="text-[10px] text-zinc-500">Unverified Asset</p>
          </div>
        </div>
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto hidden-scrollbar">
        <div className="p-4">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-4">
            Available Assets ({filteredAssets.length})
          </h3>
          
          {filteredAssets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500 text-xs">No assets match your filters</p>
              <button
                onClick={clearFilters}
                className="mt-3 text-[10px] text-[#2CC295] hover:text-[#25a981] font-bold transition-colors uppercase tracking-wider"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  ref={selectedAssetId === asset.id ? selectedAssetRef : null}
                  onClick={() => onAssetClick(asset)}
                  className={`bg-zinc-900/40 border rounded-xl overflow-hidden cursor-pointer transition-all group ${
                    selectedAssetId === asset.id 
                      ? 'border-[#2CC295] bg-zinc-900/70 shadow-[0_0_20px_rgba(44,194,149,0.2)]' 
                      : 'border-[#27272a] hover:border-[#2CC295]/40 hover:bg-zinc-900/70'
                  }`}
                >
                  <div className="flex gap-3 p-3">
                    {/* Asset Image */}
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={`https://source.unsplash.com/200x200/?${asset.image.replace(/\s/g, ',')}`}
                        alt={asset.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      {asset.verified && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-[#2CC295] rounded-full flex items-center justify-center">
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Asset Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-white text-xs truncate">{asset.name}</h4>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(asset.id);
                          }}
                          className="flex-shrink-0"
                        >
                          <Heart 
                            size={12} 
                            className={`transition-colors ${
                              favorites.includes(asset.id) 
                                ? 'fill-[#2CC295] text-[#2CC295]' 
                                : 'text-zinc-500 hover:text-[#2CC295]'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <p className="text-[9px] text-zinc-500 mb-1 truncate">{asset.collection}</p>
                      
                      <div className="flex items-center gap-1 mb-2">
                        <MapPin size={10} className="text-zinc-600" />
                        <p className="text-[9px] text-zinc-600">{asset.city}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Diamond className="text-[#2CC295]" size={11} />
                          <p className="text-xs font-bold text-white">{asset.price}</p>
                        </div>
                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${asset.rarityColor} border uppercase`}>
                          {asset.rarity}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}