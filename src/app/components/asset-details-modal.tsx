import { X, Heart, Layers, MessageSquare, Star, Minus, Plus, Shield, ExternalLink, Clock, Medal } from 'lucide-react';
import { useState } from 'react';
import { MarketplaceAsset } from '@/app/types/asset';
import { motion, AnimatePresence } from 'motion/react';
import { VerifiedUserIcon } from '@/app/components/verified-user-icon';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { useAccount } from 'wagmi';

interface AssetDetailsModalProps {
  asset: MarketplaceAsset;
  onClose: () => void;
  onNavigateToSeller?: (sellerAddress: string) => void;
}

export function AssetDetailsModal({ asset, onClose, onNavigateToSeller }: AssetDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('Description');
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const { address } = useAccount();
  const { requireWalletAction } = useRequireWalletAction();

  const images = asset.images || [asset.image];
  const maxQuantity = Math.min(asset.maxPurchaseSlots || 10, asset.availableSlots || 1);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= (asset.minPurchaseSlots || 1) && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleSellerClick = () => {
    if (onNavigateToSeller) {
      onNavigateToSeller(asset.seller.address);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm"
        onClick={handleOverlayClick}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-[var(--color-panel-bg)] w-full max-w-5xl rounded-[2.5rem] border border-[var(--color-panel-border)] overflow-hidden shadow-2xl flex flex-col max-h-[95vh] md:h-[95vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar md:overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-full md:h-full md:min-h-0">
              {/* Left Column - Image & Properties */}
              <div className="bg-zinc-900/30 md:h-full md:min-h-0 md:overflow-hidden">
                <div className="p-8 flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar overscroll-contain">
                  {/* Image Preview */}
                  <div className="relative shrink-0 flex items-center justify-center p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] backdrop-blur-xl rounded-[2rem] aspect-square overflow-hidden">
                    <img
                      alt={asset.name}
                      className="w-full h-full object-cover rounded-2xl"
                      src={images[currentImageIndex]}
                    />
                    {asset.verified && (
                      <div className="absolute top-6 left-6 bg-[var(--color-primary-custom)]/20 px-3 py-1.5 rounded-lg border border-[var(--color-primary-custom)]/30 text-[9px] font-bold uppercase tracking-widest text-[var(--color-primary-custom)] backdrop-blur-md flex items-center gap-1.5">
                        <Shield size={10} />
                        Verified
                      </div>
                    )}
                    {asset.rank && (
                      <div className="absolute bottom-20 left-6 bg-yellow-500/20 px-3 py-1.5 rounded-lg border border-yellow-500/30 text-[9px] font-bold uppercase tracking-widest text-yellow-300 backdrop-blur-md flex items-center gap-1.5">
                        <Medal size={10} />
                        Rank #{asset.rank}
                      </div>
                    )}
                    {asset.featured && (
                      <div className="absolute top-6 right-6 bg-orange-500/20 px-3 py-1.5 rounded-lg border border-orange-500/30 text-[9px] font-bold uppercase tracking-widest text-orange-300 backdrop-blur-md">
                        Featured
                      </div>
                    )}
                    {/* Image Carousel Dots */}
                    {images.length > 1 && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-2 bg-black/20 backdrop-blur-md rounded-full border border-white/5">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              currentImageIndex === index ? 'bg-white' : 'bg-white/20'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tabs & Properties */}
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="border-b border-[var(--color-panel-border)] flex-1">
                        <div className="flex gap-1">
                          {['Description', 'Properties', 'History', 'Details'].map((tab) => (
                            <button
                              key={tab}
                              onClick={() => setActiveTab(tab)}
                              className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all relative ${
                                activeTab === tab
                                  ? 'text-[var(--color-primary-custom)]'
                                  : 'text-zinc-400 hover:text-zinc-300'
                              }`}
                            >
                              {tab}
                              {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-custom)] shadow-[0_0_12px_rgba(44,194,149,0.6)]" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tab Content - Fixed Height */}
                    <div className="min-h-[280px]">
                      {/* Tab Content */}
                      {activeTab === 'Description' && (
                        <div className="space-y-3">
                          <p className="text-sm text-zinc-300 leading-relaxed">
                            {asset.description || 'No description available for this asset.'}
                          </p>
                          {asset.tags && asset.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {asset.tags.map((tag, i) => (
                                <span key={i} className="px-2 py-1 bg-zinc-900 border border-[var(--color-panel-border)] rounded-lg text-[10px] text-zinc-400 uppercase font-bold">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'Properties' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-2xl">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Category</p>
                            <p className="text-xs text-white font-medium">{asset.category}</p>
                          </div>
                          <div className="p-4 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-2xl">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Blockchain</p>
                            <p className="text-xs text-white font-medium">{asset.blockchain}</p>
                          </div>
                          <div className="p-4 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-2xl">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Token ID</p>
                            <p className="text-xs text-white font-medium">#{asset.tokenId}</p>
                          </div>
                          <div className="p-4 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-2xl">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Available Slots</p>
                            <p className="text-xs text-white font-medium">{asset.availableSlots} / {asset.totalSlots}</p>
                          </div>
                        </div>
                      )}

                      {activeTab === 'History' && (
                        <div className="space-y-2">
                          <div className="p-3 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-xl">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">Listed by {asset.seller.ensName || asset.seller.address.slice(0, 8)}</span>
                              <span className="text-white font-bold">{asset.price}</span>
                            </div>
                            <p className="text-[10px] text-zinc-600 mt-1">{asset.listingDuration}</p>
                          </div>
                          <div className="p-3 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-xl">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">Views</span>
                              <span className="text-white font-bold">{asset.views.toLocaleString()}</span>
                            </div>
                          </div>
                          <StudioActionButton
                            variant="secondary"
                            className="w-full rounded-xl text-xs font-bold justify-center"
                          >
                            <ExternalLink size={14} />
                            View on Explorer
                          </StudioActionButton>
                        </div>
                      )}

                      {activeTab === 'Details' && (
                        <div className="space-y-3 text-sm">
                          <p className="text-zinc-400 leading-relaxed">
                            {asset.description || 'No description available.'}
                          </p>
                          {asset.tags && asset.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {asset.tags.map((tag, i) => (
                                <span key={i} className="px-2 py-1 bg-zinc-900 border border-[var(--color-panel-border)] rounded-lg text-[10px] text-zinc-400 uppercase font-bold">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Details & Purchase */}
              <div className="p-8 flex flex-col md:min-h-0">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">{asset.name}</h2>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-sm text-zinc-500">{asset.category}</p>
                        {asset.listingDuration && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Clock size={12} className="text-orange-400" />
                            <span className="text-zinc-500 font-medium">Listing Ends In</span>
                            <span className="text-orange-300 font-bold">{asset.listingDuration}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <StudioActionButton
                      onClick={onClose}
                      size="icon"
                      variant="secondary"
                      className="w-10 h-10 rounded-lg text-zinc-500 hover:text-white"
                    >
                      <X size={20} />
                    </StudioActionButton>
                  </div>

                  {/* Seller Info */}
                  <StudioPanel
                    onClick={handleSellerClick}
                    className="flex items-center gap-3 p-4 rounded-xl mt-4 cursor-pointer hover:bg-zinc-900/70 hover:border-[var(--color-primary-custom)]/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary-custom)] to-[#1a8f6f] flex items-center justify-center text-white font-bold">
                      {asset.seller.ensName ? asset.seller.ensName[0].toUpperCase() : asset.seller.address[2].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white group-hover:text-[var(--color-primary-custom)] transition-colors">{asset.seller.ensName || asset.seller.address.slice(0, 8) + '...' + asset.seller.address.slice(-6)}</p>
                        {asset.seller.verified && (
                          <VerifiedUserIcon size={12} />
                        )}
                      </div>
                      {asset.seller.reputation && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star size={10} className="text-yellow-400 fill-yellow-400" />
                          <span className="text-[10px] text-zinc-500 font-bold">{asset.seller.reputation}% Rating</span>
                        </div>
                      )}
                    </div>
                    <StudioActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSellerClick();
                      }}
                      title="Contact seller"
                      aria-label="Contact seller"
                      size="icon"
                      variant="secondary"
                      className="w-10 h-10 rounded-lg text-white"
                    >
                      <MessageSquare size={14} />
                    </StudioActionButton>
                  </StudioPanel>
                </div>

                {/* Price Section */}
                <div className="mb-6">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Price per Slot</p>
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-3">
                      <p className="text-3xl font-bold text-white">{asset.price}</p>
                      {asset.priceUSD && (
                        <p className="text-base text-zinc-500">≈ {asset.priceUSD}</p>
                      )}
                    </div>
                    <StudioActionButton
                      onClick={() => {
                        if (!address) {
                          if (!requireWalletAction({ capability: 'favorite_write', actionLabel: 'favorite assets', fallbackPage: 'marketplace' })) return;
                          return;
                        }
                        setIsFavorited(!isFavorited);
                      }}
                      size="icon"
                      variant="ghost"
                      className={`p-2 transition-colors ${
                        isFavorited ? 'text-[var(--color-primary-custom)]' : 'text-zinc-500 hover:text-[var(--color-primary-custom)]'
                      }`}
                    >
                      <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                    </StudioActionButton>
                  </div>
                </div>

                {/* Quantity Selector */}
                <div className="mb-6">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Quantity (Slots)</p>
                  <div className="flex items-center gap-3">
                    <StudioActionButton
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= (asset.minPurchaseSlots || 1)}
                      size="icon"
                      variant="secondary"
                      className="w-10 h-10 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus size={16} />
                    </StudioActionButton>
                    <div className="flex-1 text-center">
                      <p className="text-2xl font-bold text-white">{quantity}</p>
                      <p className="text-[10px] text-zinc-500">of {asset.availableSlots} available</p>
                    </div>
                    <StudioActionButton
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= maxQuantity}
                      size="icon"
                      variant="secondary"
                      className="w-10 h-10 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} />
                    </StudioActionButton>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-3 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-xl text-center">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Views</p>
                    <p className="text-base font-bold text-white">{asset.views.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-xl text-center">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Likes</p>
                    <p className="text-base font-bold text-white">{asset.likes.toLocaleString()}</p>
                  </div>
                  {asset.rank && (
                    <div className="p-3 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-xl text-center">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Rank</p>
                      <p className="text-base font-bold text-[var(--color-primary-custom)]">#{asset.rank}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mb-6">
                  <StudioActionButton className="w-full py-4 rounded-xl text-sm font-bold justify-center">
                    <Layers size={18} />
                    Buy Now ({quantity} Slots)
                  </StudioActionButton>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
