import { useEffect, useState } from 'react';
import { ArrowLeft, Heart, Share2, Eye, Star, ExternalLink, Shield, Clock, TrendingUp, MessageSquare, Maximize2, Activity } from 'lucide-react';
import { AssetDetails, SimilarAsset } from '@/types/asset';
import { generateMockAsset, generateSimilarAssets } from '@/utils/mockAssetData';
import { ASSET_METADATA_CHANGED_EVENT } from '@/utils/assetMetadataSync';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { ShareAssetModal } from './share-asset-modal';
import { SearchResultCard } from '@/app/components/search-result-card';
import { MarketplaceAsset } from '@/app/types/asset';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface AssetDetailsPageProps {
  assetId: string;
  onBack?: () => void;
  onAssetClick?: (assetId: string) => void;
  previousPage?: string; // NEW: Track which page user came from
}

export function AssetDetailsPage({ assetId, onBack, onAssetClick, previousPage }: AssetDetailsPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'properties'>('overview');
  const [isFavorited, setIsFavorited] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [, setMetadataRefreshTick] = useState(0);

  useEffect(() => {
    const refresh = () => setMetadataRefreshTick((v) => v + 1);
    window.addEventListener(ASSET_METADATA_CHANGED_EVENT, refresh as EventListener);
    return () => window.removeEventListener(ASSET_METADATA_CHANGED_EVENT, refresh as EventListener);
  }, []);

  // Load asset data
  const asset = generateMockAsset(assetId);
  const similarAssets = generateSimilarAssets(assetId);

  // Convert AssetDetails to SearchResult format
  const assetToSearchResult = (asset: AssetDetails): MarketplaceAsset => {
    const priceStr = asset.currentPrice.replace(' ETH', '').replace(',', '');
    const priceNumeric = parseFloat(priceStr) || 0;
    
    return {
      id: asset.id,
      name: asset.name,
      description: asset.description || '',
      category: asset.category,
      blockchain: 'Ethereum',
      price: asset.currentPrice,
      priceUsd: `$${(priceNumeric * 2000).toLocaleString()}`,
      priceNumeric,
      image: asset.image.replace('https://images.unsplash.com/', ''),
      verified: asset.verified || false,
      views: Math.floor(Math.random() * 10000),
      favorites: Math.floor(Math.random() * 1000),
      mintDate: Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000),
      location: asset.location, // RWA location
      holders: Math.floor(Math.random() * 50) + 1, // Number of holders
    };
  };

  // Convert SimilarAsset to SearchResult format
  const similarAssetToSearchResult = (asset: SimilarAsset): MarketplaceAsset => {
    const priceStr = asset.price.replace(' ETH', '').replace(',', '');
    const priceNumeric = parseFloat(priceStr) || 0;
    
    return {
      id: asset.id,
      name: asset.name,
      description: '',
      category: asset.category,
      blockchain: 'BSC',
      price: asset.price,
      priceUsd: asset.priceUsd,
      priceNumeric,
      image: asset.image.replace(/\s/g, ','),
      verified: asset.verified || false,
      views: Math.floor(Math.random() * 10000),
      favorites: Math.floor(Math.random() * 1000),
      mintDate: Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000),
      location: asset.location, // RWA location
      holders: Math.floor(Math.random() * 50) + 1, // Number of holders
    };
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Determine back button text based on previous page
  const getBackButtonText = () => {
    switch (previousPage) {
      case 'search':
        return 'Back to Search';
      case 'marketplace':
        return 'Back to Explorer';
      case 'favorites':
        return 'Back to Favorites';
      default:
        return 'Back to Explorer';
    }
  };

  const mockImages = [asset.image, asset.image, asset.image, asset.image];

  return (
    <div className="h-full overflow-y-auto bg-[#121212] custom-scrollbar relative">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .ambient-blob {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(44, 194, 149, 0.03) 0%, rgba(18, 18, 18, 0) 70%);
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          pointer-events: none;
        }
      `}</style>

      {/* Ambient Blobs */}
      <div className="ambient-blob -top-40 -left-40"></div>
      <div className="ambient-blob -bottom-40 -right-40"></div>

      <div className="p-8 pb-20 max-w-7xl mx-auto relative z-10">
        {/* Breadcrumb Header */}
        <div className="px-6 py-4 border-b border-[#27272a] bg-zinc-900/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">{getBackButtonText()}</span>
            </button>
            <div className="h-4 w-px bg-[#27272a]"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Collection</span>
              <span className="text-sm font-bold text-white">Techno Core X</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFavorited(!isFavorited)}
              className={`
                w-10 h-10 rounded-lg border flex items-center justify-center transition-colors
                ${isFavorited
                  ? 'bg-red-500/10 border-red-500/20 text-red-500'
                  : 'bg-zinc-900 border-[#27272a] text-zinc-500 hover:text-zinc-300'
                }
              `}
            >
              <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.02)] border-0 text-zinc-500 flex items-center justify-center hover:text-zinc-300 transition-all"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          <div className="max-w-[1400px] mx-auto">
            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
              {/* Left Column - Image + Info */}
              <div className="lg:col-span-5 space-y-6">
                {/* Main Image */}
                <div className="relative aspect-square rounded-3xl bg-[rgba(255,255,255,0.02)] border-0 overflow-hidden flex items-center justify-center p-8 group">
                  <ImageWithFallback
                    src={mockImages[currentImageIndex]}
                    alt={asset.name}
                    className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-700"
                  />
                  
                  {/* Badge */}
                  <div className="absolute top-6 left-6 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#2CC295] animate-pulse"></div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">3D Model</span>
                  </div>

                  {/* Fullscreen Button */}
                  <button className="absolute bottom-6 right-6 w-12 h-12 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                    <Maximize2 size={20} />
                  </button>
                </div>

                {/* Image Thumbnails */}
                <div className="flex justify-center gap-3">
                  {mockImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`
                        w-3 h-3 rounded-full transition-all
                        ${currentImageIndex === index ? 'bg-[#2CC295]' : 'bg-zinc-700'}
                      `}
                    />
                  ))}
                </div>

                {/* Contract Info Panel */}
                <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-6">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <Activity size={18} className="text-zinc-500" />
                    Contract Info
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Token ID</p>
                      <p className="text-xs text-white font-mono">{asset.tokenId}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Standard</p>
                      <p className="text-xs text-white">{asset.tokenStandard}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Mint Date</p>
                      <p className="text-xs text-white">{format(new Date(asset.mintDate), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Royalties</p>
                      <p className="text-xs text-[#2CC295] font-bold">{asset.royalty || 5.0}%</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#27272a]">
                    <a
                      href="#"
                      className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 uppercase tracking-wider transition-colors"
                    >
                      View on Explorer
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Right Column - Details */}
              <div className="lg:col-span-7 space-y-8">
                {/* Tags & Title */}
                <div className="space-y-4">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-300 border border-[#27272a] uppercase tracking-widest">
                      {asset.category}
                    </span>
                    <span className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-300 border border-[#27272a] uppercase tracking-widest flex items-center gap-1">
                      <Activity size={14} />
                      {asset.blockchain}
                    </span>
                    {asset.verified && (
                      <div className="flex items-center gap-1.5 ml-2 text-[#2CC295]">
                        <Shield size={18} fill="currentColor" />
                        <span className="text-xs font-bold uppercase tracking-wider">Verified Asset</span>
                      </div>
                    )}
                  </div>
                  <h1 className="text-5xl font-black text-white leading-tight">
                    {asset.name}
                  </h1>
                  <p className="text-zinc-400 leading-relaxed text-base max-w-2xl">
                    {asset.description}
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="stat-card">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Views</p>
                    <p className="text-xl font-bold text-white">{(asset.views / 1000).toFixed(1)}k</p>
                  </div>
                  <div className="stat-card">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Favorites</p>
                    <p className="text-xl font-bold text-white">{asset.favorites}</p>
                  </div>
                  <div className="stat-card">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Volume</p>
                    <p className="text-xl font-bold text-white">{asset.totalVolume}</p>
                  </div>
                  <div className="stat-card">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Sales</p>
                    <p className="text-xl font-bold text-white">{asset.totalSales}</p>
                  </div>
                </div>

                {/* Price Section */}
                <div className="bg-zinc-900 border-2 border-[#2CC295]/20 rounded-3xl p-8 relative overflow-hidden group">
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#2CC295]/5 rounded-full blur-[80px]"></div>
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                    <div>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Current Price</p>
                      <div className="flex items-end gap-3">
                        <span className="text-5xl font-black text-white">{asset.currentPrice}</span>
                        <span className="text-lg font-medium text-zinc-500 mb-1">{asset.currentPriceUsd}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 min-w-[240px]">
                      <button className="teal-gradient-btn w-full py-4 rounded-xl text-black font-black text-lg hover:scale-[1.02] transition-transform active:scale-95">
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>

                {/* Owner & Creator */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-2xl border border-[#27272a]">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-[#2CC295] to-blue-500">
                      <ImageWithFallback
                        src={`https://source.unsplash.com/100x100/?portrait,face,${asset.currentOwner}`}
                        alt="Owner"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Current Owner</p>
                      <p className="text-sm font-bold text-white">cryptopunk.eth</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-2xl border border-[#27272a]">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-yellow-500 to-orange-500">
                      <ImageWithFallback
                        src={`https://source.unsplash.com/100x100/?portrait,face,${asset.creator}`}
                        alt="Creator"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Created By</p>
                      <p className="text-sm font-bold text-white">orina_creator.ens</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Section */}
            <div className="mb-16">
              <div className="mb-8 border-b border-[#27272a]">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`
                      flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all relative
                      ${activeTab === 'overview'
                        ? 'text-[#2CC295]'
                        : 'text-zinc-400 hover:text-zinc-300'
                      }
                    `}
                  >
                    <Activity size={18} />
                    Overview
                    {activeTab === 'overview' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2CC295] shadow-[0_0_12px_rgba(44,194,149,0.6)]" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`
                      flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all relative
                      ${activeTab === 'history'
                        ? 'text-[#2CC295]'
                        : 'text-zinc-400 hover:text-zinc-300'
                      }
                    `}
                  >
                    <Clock size={18} />
                    History
                    {activeTab === 'history' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2CC295] shadow-[0_0_12px_rgba(44,194,149,0.6)]" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('properties')}
                    className={`
                      flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all relative
                      ${activeTab === 'properties'
                        ? 'text-[#2CC295]'
                        : 'text-zinc-400 hover:text-zinc-300'
                      }
                    `}
                  >
                    <Star size={18} />
                    Properties
                    {activeTab === 'properties' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2CC295] shadow-[0_0_12px_rgba(44,194,149,0.6)]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-zinc-900 rounded-3xl border border-[#27272a] p-8"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-bold text-white">Price History (ETH)</h3>
                      <div className="flex bg-zinc-800 rounded-lg p-1">
                        <button className="px-4 py-1.5 rounded-md bg-zinc-700 text-xs font-bold text-white">7D</button>
                        <button className="px-4 py-1.5 rounded-md text-xs font-bold text-zinc-500 hover:text-white">1M</button>
                        <button className="px-4 py-1.5 rounded-md text-xs font-bold text-zinc-500 hover:text-white">All</button>
                      </div>
                    </div>
                    
                    {/* Bar Chart */}
                    <div className="h-64 w-full flex items-end gap-1 relative pt-4">
                      <div className="flex-1 bg-[#2CC295]/20 hover:bg-[#2CC295]/40 transition-colors rounded-t-sm h-[30%]"></div>
                      <div className="flex-1 bg-[#2CC295]/20 hover:bg-[#2CC295]/40 transition-colors rounded-t-sm h-[45%]"></div>
                      <div className="flex-1 bg-[#2CC295]/20 hover:bg-[#2CC295]/40 transition-colors rounded-t-sm h-[35%]"></div>
                      <div className="flex-1 bg-[#2CC295]/20 hover:bg-[#2CC295]/40 transition-colors rounded-t-sm h-[60%]"></div>
                      <div className="flex-1 bg-[#2CC295]/20 hover:bg-[#2CC295]/40 transition-colors rounded-t-sm h-[55%]"></div>
                      <div className="flex-1 bg-[#2CC295]/20 hover:bg-[#2CC295]/40 transition-colors rounded-t-sm h-[75%]"></div>
                      <div className="flex-1 bg-[#2CC295]/40 hover:bg-[#2CC295]/60 transition-colors rounded-t-sm h-[90%] border-t-2 border-[#2CC295]"></div>
                      
                      {/* Y-axis labels */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-zinc-700 font-bold uppercase">
                        <div className="border-t border-zinc-800/50 w-full pt-1">4.0 ETH</div>
                        <div className="border-t border-zinc-800/50 w-full pt-1">3.0 ETH</div>
                        <div className="border-t border-zinc-800/50 w-full pt-1">2.0 ETH</div>
                        <div className="border-t border-zinc-800/50 w-full pt-1">1.0 ETH</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-zinc-900 rounded-3xl border border-[#27272a] p-8"
                  >
                    <h3 className="text-lg font-bold text-white mb-6">Transaction History</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-zinc-800/50 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">Sale</p>
                          <p className="text-xs text-zinc-500">2 days ago</p>
                        </div>
                        <p className="text-sm font-bold text-[#2CC295]">3.45 ETH</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'properties' && (
                  <motion.div
                    key="properties"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-zinc-900 rounded-3xl border border-[#27272a] p-8"
                  >
                    <h3 className="text-lg font-bold text-white mb-6">Asset Properties</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {asset.properties?.map((prop, index) => (
                        <div key={index} className="p-4 bg-zinc-800/50 rounded-xl">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">{prop.trait_type}</p>
                          <p className="text-sm font-bold text-white">{prop.value}</p>
                          <p className="text-xs text-zinc-600 mt-1">{prop.rarity}% have this</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Similar Assets */}
            <section className="space-y-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white">Similar Assets</h2>
                <a href="#" className="text-[#2CC295] text-sm font-bold flex items-center gap-1 hover:underline">
                  View Collection
                  <ArrowLeft size={14} className="rotate-180" />
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {similarAssets.map((similarAsset) => (
                  <SearchResultCard
                    key={similarAsset.id}
                    asset={similarAssetToSearchResult(similarAsset)}
                    onClick={() => onAssetClick?.(similarAsset.id)}
                    viewMode="grid"
                  />
                ))}
              </div>
            </section>

            {/* User Reviews */}
            <section className="pb-20 mt-12">
              <h2 className="text-2xl font-black text-white mb-8">User Reviews</h2>
              <div className="space-y-6">
                <div className="p-6 bg-zinc-900 rounded-2xl border border-[#27272a]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-[#2CC295]">
                        S
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Satoshi_01</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} size={14} className="text-[#2CC295] fill-[#2CC295]" />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase">2 days ago</span>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed italic">
                    "Incredible detail on the 3D model. The emissive textures look insane in VRChat. Definitely worth the price for anyone building their digital wardrobe."
                  </p>
                </div>
                
                <div className="p-6 bg-zinc-900 rounded-2xl border border-[#27272a]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-[#2CC295]">
                        D
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">D_Alpha</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map((star) => (
                            <Star key={star} size={14} className="text-[#2CC295] fill-[#2CC295]" />
                          ))}
                          <Star size={14} className="text-zinc-700" />
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase">1 week ago</span>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed italic">
                    "Solid technical execution. Rigging is clean, and the mesh is optimized. One of the best assets in the market right now."
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Share Modal */}
        <ShareAssetModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          assetName={asset.name}
          assetUrl={`/asset/${assetId}`}
        />
      </div>
    </div>
  );
}
