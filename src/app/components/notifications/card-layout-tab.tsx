import { useState } from 'react';
import { Heart, TrendingUp, TrendingDown, Eye, Package, User, Clock, CheckCircle, XCircle, Diamond, Layers, Sparkles, ShoppingBag, Shield, ArrowRight, Users } from 'lucide-react';

type CardVariant = 
  | 'search-grid-card'
  | 'search-list-card'
  | 'rwa-minted-card' 
  | 'receipt-nft-card'
  | 'digital-nft-card'
  | 'portfolio-table-row';

export function CardLayoutTab() {
  const [selectedVariants, setSelectedVariants] = useState<Set<CardVariant>>(new Set());

  const toggleVariant = (variant: CardVariant) => {
    const newSet = new Set(selectedVariants);
    if (newSet.has(variant)) {
      newSet.delete(variant);
    } else {
      newSet.add(variant);
    }
    setSelectedVariants(newSet);
  };

  const handleApply = () => {
    if (selectedVariants.size === 0) {
      alert('Please select at least one card variant to apply.');
      return;
    }
    alert(`Selected variants:\n${Array.from(selectedVariants).map(v => `• ${v}`).join('\n')}\n\nThis will be applied across the entire system.`);
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Card Design System - Complete Collection</h2>
        <p className="text-sm text-zinc-400 mb-4">
          TOÀN BỘ card designs đã được implement trong hệ thống. Chọn variants để so sánh và thống nhất design.
        </p>
        
        <div className="flex items-center gap-4">
          <button
            onClick={handleApply}
            disabled={selectedVariants.size === 0}
            className="px-6 py-3 bg-[#2CC295] hover:bg-[#25a882] disabled:bg-zinc-700 disabled:cursor-not-allowed text-black disabled:text-zinc-500 font-bold rounded-lg transition-all"
          >
            Apply Selected ({selectedVariants.size})
          </button>
          
          <button
            onClick={() => setSelectedVariants(new Set())}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-all"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* SEARCH RESULT CARDS */}
      <section className="pt-8 border-t border-[#27272a]">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-1">Search Result Cards (2 view modes) ⭐ STANDARD REFERENCE</h3>
          <p className="text-sm text-zinc-500">Location: /src/app/components/search/search-result-card.tsx</p>
          <p className="text-xs text-zinc-600 mt-1">Used in: Search page with Grid/List toggle</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Grid View - STANDARD REFERENCE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white">Grid View (Compact) ⭐</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-zinc-400">Select</span>
                <input
                  type="checkbox"
                  checked={selectedVariants.has('search-grid-card')}
                  onChange={() => toggleVariant('search-grid-card')}
                  className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-[#2CC295] focus:ring-[#2CC295] focus:ring-offset-0 cursor-pointer"
                />
              </label>
            </div>

            <div className="w-full max-w-xs text-left bg-[#141417] border border-[#27272a] rounded-2xl overflow-hidden hover:bg-[#1a1a1d] hover:-translate-y-1 transition-all group cursor-pointer">
              <div className="relative h-48 bg-zinc-800">
                <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                  <Package size={40} className="text-zinc-600" />
                </div>
                <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-[#2CC295] border border-[#2CC295]/30 uppercase tracking-wider">
                  RWA
                </div>
              </div>
              <div className="p-4 relative">
                {/* Heart button - Top right of content area */}
                <button className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
                  <Heart size={16} />
                </button>

                {/* Category */}
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[10px] font-medium text-[#2CC295] uppercase tracking-wider">
                    Real Estate
                  </span>
                  <Shield size={12} className="text-[#2CC295] fill-[#2CC295]" />
                </div>

                {/* Asset Name */}
                <h3 className="text-sm font-bold text-white mb-2 line-clamp-1 pr-10">
                  Beach Villa #123
                </h3>

                {/* Price & Ending In Row */}
                <div className="flex items-start justify-between mb-3">
                  {/* Price Section */}
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-0.5">
                      Price
                    </p>
                    <p className="text-base font-bold text-white">5.8 ETH</p>
                    <p className="text-xs text-zinc-500">$12,450</p>
                  </div>

                  {/* Ending In */}
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-0.5">
                      Ending In
                    </p>
                    <div className="flex items-center gap-1.5 text-white">
                      <Clock size={14} className="text-[#2CC295]" />
                      <p className="text-sm font-bold">3d 12h 45m</p>
                    </div>
                    <p className="text-sm font-bold text-[#2CC295] mt-1">45 / 100</p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-4 text-zinc-500 text-xs">
                  <div className="flex items-center gap-1">
                    <Eye size={14} />
                    <span>1,234</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart size={14} />
                    <span>456</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp size={14} />
                    <span>Feb 10</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* List View - STANDARD REFERENCE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white">List View (Detailed with Stats) ⭐</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-zinc-400">Select</span>
                <input
                  type="checkbox"
                  checked={selectedVariants.has('search-list-card')}
                  onChange={() => toggleVariant('search-list-card')}
                  className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-[#2CC295] focus:ring-[#2CC295] focus:ring-offset-0 cursor-pointer"
                />
              </label>
            </div>

            <div className="w-full text-left bg-[#141417] border border-[#27272a] rounded-2xl p-4 flex gap-6 transition-all hover:bg-[#1a1a1d] hover:-translate-y-0.5 group items-center cursor-pointer">
              {/* Image */}
              <div className="w-32 h-32 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800 relative">
                <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                  <Package size={36} className="text-zinc-600" />
                </div>
                <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-[#2CC295] border border-[#2CC295]/30 uppercase tracking-wider">
                  RWA
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col justify-center relative">
                {/* Heart button - Top right of content area */}
                <button className="absolute top-0 right-0 w-10 h-10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
                  <Heart size={20} />
                </button>

                <div className="flex items-center gap-1.5 mb-1 pr-12">
                  <span className="text-[10px] font-medium text-[#2CC295] uppercase tracking-wider">
                    Real Estate Official
                  </span>
                  <Shield size={12} className="text-[#2CC295] fill-[#2CC295]" />
                </div>

                <h3 className="text-lg font-bold text-white mb-2 pr-12">
                  Beach Villa #123
                </h3>

                {/* Price & Timer Row */}
                <div className="flex items-center gap-8 mb-3">
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">
                      Price
                    </p>
                    <span className="text-base font-bold text-white">5.8 ETH</span>
                    <p className="text-xs text-zinc-500 mt-0.5">$12,450</p>
                  </div>

                  <div className="h-8 w-px bg-[#27272a]"></div>

                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">
                      Ending In
                    </p>
                    <div className="flex items-center gap-1.5 text-white">
                      <Clock size={14} className="text-[#2CC295]" />
                      <p className="text-sm font-bold">3d 12h 45m</p>
                    </div>
                    <p className="text-sm font-bold text-[#2CC295] mt-1">45 / 100</p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-5 text-zinc-500 mt-1">
                  <div className="flex items-center gap-1.5">
                    <Eye size={18} />
                    <span className="text-xs font-medium">1,234</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Heart size={18} />
                    <span className="text-xs font-medium">456</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={18} />
                    <span className="text-xs font-medium">Feb 10, 2024</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MY ASSETS CARDS */}
      <section className="pt-8 border-t border-[#27272a]">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-1">My Assets Cards (3 variants)</h3>
          <p className="text-sm text-zinc-500">Location: /src/app/components/assets.tsx</p>
          <p className="text-xs text-zinc-600 mt-1">Used in: My Assets page - RWA Minted, Receipts, NFT Owned tabs</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* RWA Minted Card - STANDARDIZED */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white">RWA Minted Card</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-zinc-400">Select</span>
                <input
                  type="checkbox"
                  checked={selectedVariants.has('rwa-minted-card')}
                  onChange={() => toggleVariant('rwa-minted-card')}
                  className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-[#2CC295] focus:ring-[#2CC295] focus:ring-offset-0 cursor-pointer"
                />
              </label>
            </div>

            {/* STANDARDIZED DESIGN */}
            <div className="w-full max-w-xs bg-[#141417] border border-[#27272a] rounded-2xl overflow-hidden hover:bg-[#1a1a1d] hover:-translate-y-1 transition-all group cursor-pointer flex flex-col">
              {/* Image */}
              <div className="h-48 bg-zinc-800 relative overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                  <Sparkles size={40} className="text-zinc-600" />
                </div>
                
                {/* RWA Badge - Standardized */}
                <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-[#2CC295] border border-[#2CC295]/30 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={10} />
                  RWA MINTED
                </div>

                {/* Status Badge */}
                <div className="absolute top-2 right-2 px-2.5 py-1 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-wider bg-green-500/40 text-green-300 border border-green-400/30">
                  Active
                </div>
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[10px] font-medium text-[#2CC295] uppercase tracking-wider">
                    Real Estate
                  </span>
                  <Shield size={12} className="text-[#2CC295] fill-[#2CC295]" />
                </div>
                <h3 className="text-sm font-bold text-white mb-3">Luxury Apartment #442</h3>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Available / Total:</span>
                    <span className="text-zinc-300 font-medium">45 / 100</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Min Price:</span>
                    <span className="text-white font-bold">2.5 ETH</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Minted:</span>
                    <span className="text-zinc-400">2024-01-15</span>
                  </div>
                </div>

                <div className="flex-1"></div>

                <div className="pt-3 border-t border-[#27272a] mt-auto">
                  <button className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-[#27272a] rounded-lg text-xs font-bold text-white transition-colors flex items-center justify-center gap-2">
                    <Eye size={14} />
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt NFT Card - STANDARDIZED */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white">Receipt NFT Card</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-zinc-400">Select</span>
                <input
                  type="checkbox"
                  checked={selectedVariants.has('receipt-nft-card')}
                  onChange={() => toggleVariant('receipt-nft-card')}
                  className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-[#2CC295] focus:ring-[#2CC295] focus:ring-offset-0 cursor-pointer"
                />
              </label>
            </div>

            {/* STANDARDIZED DESIGN */}
            <div className="w-full max-w-xs bg-[#141417] border border-[#27272a] rounded-2xl overflow-hidden hover:bg-[#1a1a1d] hover:-translate-y-1 transition-all group cursor-pointer flex flex-col">
              {/* Image */}
              <div className="h-48 bg-zinc-800 relative overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-zinc-800 flex items-center justify-center">
                  <Package size={40} className="text-purple-600/50" />
                </div>
                
                {/* Receipt Badge - Standardized */}
                <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-purple-300 border border-purple-400/30 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={10} />
                  RECEIPT NFT
                </div>

                {/* Non-transferable indicator */}
                <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2 border border-orange-500/20">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                  <span className="text-[9px] font-bold text-orange-300 uppercase tracking-wider">Non-Transferable</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[10px] font-medium text-purple-400 uppercase tracking-wider">
                    Real Estate
                  </span>
                  <Shield size={12} className="text-purple-400 fill-purple-400" />
                </div>
                <h3 className="text-sm font-bold text-white mb-3">Beach Villa #123 Receipt</h3>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Order ID:</span>
                    <span className="text-zinc-400 font-medium">ORD-1001</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Purchase Date:</span>
                    <span className="text-zinc-400">2024-02-10</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Seller:</span>
                    <span className="text-zinc-400 font-medium">0x742d...9c4F</span>
                  </div>
                </div>

                <div className="flex-1"></div>

                <div className="flex items-center justify-between pt-3 border-t border-[#27272a] mt-auto">
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Purchase Value</p>
                    <p className="text-base font-bold text-white">5.8 ETH</p>
                  </div>
                  <div className="px-3 py-1 bg-zinc-900 border border-[#27272a] rounded-lg">
                    <span className="text-xs font-bold text-zinc-400">ETH</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Digital NFT Card - STANDARDIZED */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white">Digital NFT Card</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-zinc-400">Select</span>
                <input
                  type="checkbox"
                  checked={selectedVariants.has('digital-nft-card')}
                  onChange={() => toggleVariant('digital-nft-card')}
                  className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-[#2CC295] focus:ring-[#2CC295] focus:ring-offset-0 cursor-pointer"
                />
              </label>
            </div>

            {/* STANDARDIZED DESIGN */}
            <div className="w-full max-w-xs bg-[#141417] border border-[#27272a] rounded-2xl overflow-hidden hover:bg-[#1a1a1d] hover:-translate-y-1 transition-all group cursor-pointer flex flex-col">
              {/* Image */}
              <div className="h-48 bg-zinc-800 relative overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-blue-900/20 to-zinc-800 flex items-center justify-center">
                  <ShoppingBag size={40} className="text-blue-600/50" />
                </div>
                
                {/* NFT Badge - Standardized */}
                <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-blue-300 border border-blue-400/30 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag size={10} />
                  DIGITAL NFT
                </div>

                {/* Transferable indicator */}
                <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2 border border-[#2CC295]/20">
                  <div className="w-1.5 h-1.5 bg-[#2CC295] rounded-full animate-pulse"></div>
                  <span className="text-[9px] font-bold text-[#2CC295] uppercase tracking-wider">Transferable</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">
                    Digital Art
                  </span>
                  <Shield size={12} className="text-blue-400 fill-blue-400" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">CyberPunk #4421</h3>
                <p className="text-xs text-zinc-500 mb-3">Neon Dreams Collection</p>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Current Price:</span>
                    <span className="text-white font-bold">0.45 ETH</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Floor Price:</span>
                    <span className="text-zinc-400">0.35 ETH</span>
                  </div>
                </div>

                <div className="flex-1"></div>

                <div className="pt-3 border-t border-[#27272a] flex gap-2 mt-auto">
                  <button className="flex-1 py-2.5 bg-[#2CC295] hover:bg-[#2CC295]/90 text-black rounded-lg text-xs font-bold transition-colors">
                    Transfer
                  </button>
                  <button className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-[#27272a] text-white rounded-lg text-xs font-bold transition-colors">
                    List for Sale
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PORTFOLIO TABLE */}
      <section className="pt-8 border-t border-[#27272a]">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-1">Portfolio Table Row</h3>
          <p className="text-sm text-zinc-500">Location: /src/app/components/portfolio-table.tsx</p>
          <p className="text-xs text-zinc-600 mt-1">Used in: Portfolio page</p>
        </div>

        <div className="space-y-8">
          {/* Portfolio Table Row - STANDARDIZED */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-white">Portfolio Table Row</h4>
                <p className="text-xs text-zinc-600 mt-1">Location: /src/app/components/portfolio-table.tsx</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-sm text-zinc-400">Select</span>
                <input
                  type="checkbox"
                  checked={selectedVariants.has('portfolio-table-row')}
                  onChange={() => toggleVariant('portfolio-table-row')}
                  className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 text-[#2CC295] focus:ring-[#2CC295] focus:ring-offset-0 cursor-pointer"
                />
              </label>
            </div>

            <div className="bg-[#141417] border border-[#27272a] rounded-2xl overflow-hidden max-w-4xl">
              <div className="p-6 border-b border-[#27272a] flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Layers className="text-[#2CC295]" size={20} />
                  Portfolio Summary
                </h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[9px] text-zinc-500 uppercase tracking-widest border-b border-[#27272a]/50">
                    <th className="px-6 py-4 font-bold">Asset Name</th>
                    <th className="px-6 py-4 font-bold">Price</th>
                    <th className="px-6 py-4 font-bold">24h Change</th>
                    <th className="px-6 py-4 font-bold">Balance</th>
                    <th className="px-6 py-4 font-bold">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]/30">
                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#2CC295]/20 flex items-center justify-center">
                          <Diamond className="text-[#2CC295]" size={16} />
                        </div>
                        <span className="text-sm font-medium text-white">Ethereum</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-zinc-300">$2,450.12</td>
                    <td className="px-6 py-4 text-sm font-bold text-[#2CC295]">+2.45%</td>
                    <td className="px-6 py-4 text-sm text-zinc-300">12.5 ETH</td>
                    <td className="px-6 py-4 text-sm font-bold text-white">$30,626</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                          <Layers className="text-zinc-400" size={16} />
                        </div>
                        <span className="text-sm font-medium text-white">Wrapped BTC</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-zinc-300">$64,120.00</td>
                    <td className="px-6 py-4 text-sm font-bold text-red-500">-1.12%</td>
                    <td className="px-6 py-4 text-sm text-zinc-300">0.42 WBTC</td>
                    <td className="px-6 py-4 text-sm font-bold text-white">$26,930</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* APPLY STICKY BUTTON */}
      <div className="sticky bottom-8 pt-8">
        <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border-2 border-[#2CC295] rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Ready to Apply Design?</h3>
              <p className="text-sm text-zinc-400">
                {selectedVariants.size > 0 
                  ? `${selectedVariants.size} card variant(s) selected - changes will apply to entire system` 
                  : 'Select at least one card variant to apply changes'}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedVariants(new Set())}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-all"
              >
                Clear Selection
              </button>
              <button
                onClick={handleApply}
                disabled={selectedVariants.size === 0}
                className="px-8 py-3 bg-[#2CC295] hover:bg-[#25a882] disabled:bg-zinc-700 disabled:cursor-not-allowed text-black disabled:text-zinc-500 font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(44,194,149,0.3)]"
              >
                Apply to System
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}