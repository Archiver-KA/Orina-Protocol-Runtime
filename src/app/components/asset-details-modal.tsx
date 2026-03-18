import { Heart, Layers, MessageSquare, Star, Minus, Plus, Shield, ExternalLink, Clock, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MarketplaceAsset, RwaConfigurableAttributeGroup, RwaSelectedAttribute } from '@/app/types/asset';
import { motion, AnimatePresence } from 'motion/react';
import { VerifiedUserIcon } from '@/app/components/verified-user-icon';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { useAccount } from 'wagmi';
import { RwaBuyOrderSignModal } from '@/app/components/rwa-buy-order-sign-modal';
import { NftBuyDirectSignModal } from '@/app/components/nft-buy-direct-sign-modal';

interface AssetDetailsModalProps {
  asset: MarketplaceAsset;
  onClose: () => void;
  onNavigateToSeller?: (sellerAddress: string) => void;
  zIndexClassName?: string;
}

export function AssetDetailsModal({
  asset,
  onClose,
  onNavigateToSeller,
  zIndexClassName = 'z-[60]',
}: AssetDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('Description');
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>({});
  const { address } = useAccount();
  const { requireWalletAction } = useRequireWalletAction();

  const images = asset.images || [asset.image];
  const configurableAttributes: RwaConfigurableAttributeGroup[] = asset.configurableAttributes || [];
  const isFractionalListing =
    typeof asset.availableSlots === 'number' && typeof asset.totalSlots === 'number';
  const minQuantity = isFractionalListing ? (asset.minPurchaseSlots || 1) : 1;
  const maxQuantity = isFractionalListing
    ? Math.min(asset.maxPurchaseSlots || 10, asset.availableSlots || 1)
    : 1;
  const selectedAttributeSnapshots: RwaSelectedAttribute[] = configurableAttributes.flatMap((group) => {
    const values = selectedAttributes[group.id] || [];
    if (values.length === 0) return [];
    return [{ groupId: group.id, groupLabel: group.label, values }];
  });
  const missingRequiredAttributes = configurableAttributes.filter(
    (group) => group.required && (selectedAttributes[group.id] || []).length === 0
  );
  const hasMissingRequiredAttributes = missingRequiredAttributes.length > 0;

  useEffect(() => {
    setSelectedAttributes({});
    setQuantity(1);
  }, [asset.id]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleQuantityChange = (delta: number) => {
    if (!isFractionalListing) return;
    const newQuantity = quantity + delta;
    if (newQuantity >= minQuantity && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleAttributeSelection = (
    group: RwaConfigurableAttributeGroup,
    optionLabel: string
  ) => {
    setSelectedAttributes((current) => {
      const currentValues = current[group.id] || [];

      if (group.selectionMode === 'single') {
        return {
          ...current,
          [group.id]: [optionLabel],
        };
      }

      const nextValues = currentValues.includes(optionLabel)
        ? currentValues.filter((value) => value !== optionLabel)
        : [...currentValues, optionLabel];

      return {
        ...current,
        [group.id]: nextValues,
      };
    });
  };

  const handleSellerClick = () => {
    if (onNavigateToSeller) {
      onNavigateToSeller(asset.seller.address);
      onClose();
    }
  };

  const handleBuyClick = () => {
    if (hasMissingRequiredAttributes) return;

    // Opening the buy modal should only require a connected wallet.
    // Protocol/auth signatures are collected inside the modal when user clicks "Sign".
    const allowed = requireWalletAction({
      capability: 'favorite_write',
      actionLabel: 'open the buy modal',
      fallbackPage: 'marketplace',
    });
    if (!allowed) return;

    setIsBuyModalOpen(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`studio-portal-backdrop fixed inset-0 ${zIndexClassName} flex items-center justify-center p-6 bg-black/70 backdrop-blur-[10px]`}
        onClick={handleOverlayClick}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative z-[1] w-full max-w-5xl max-h-[95vh] md:h-[95vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="studio-modal-theme studio-glass-modal w-full max-w-5xl max-h-[95vh] md:h-[95vh] rounded-[24px] border-0 bg-[rgba(255,255,255,0.03)] backdrop-blur-[20px] shadow-[0_24px_60px_-32px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar md:overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-full md:h-full md:min-h-0">
              {/* Left Column - Image & Properties */}
              <div className="studio-glass-header bg-zinc-900/30 md:h-full md:min-h-0 md:overflow-hidden">
                <div className="p-8 flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar overscroll-contain">
                  {/* Image Preview */}
                  <div className="studio-glass-surface relative shrink-0 flex items-center justify-center p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] backdrop-blur-xl rounded-[2rem] aspect-square overflow-hidden">
                    <img
                      alt={asset.name}
                      className="w-full h-full object-cover rounded-2xl"
                      src={images[currentImageIndex]}
                    />
                    {asset.verified && (
                      <div className="studio-glass-chip absolute top-6 left-6 bg-[var(--color-primary-custom)]/20 px-3 py-1.5 rounded-lg border border-[var(--color-primary-custom)]/30 text-[9px] font-bold uppercase tracking-widest text-primary backdrop-blur-md flex items-center gap-1.5">
                        <Shield size={10} />
                        Verified
                      </div>
                    )}
                    {asset.featured && (
                      <div className="studio-glass-chip absolute top-6 right-6 bg-orange-500/20 px-3 py-1.5 rounded-lg border border-orange-500/30 text-[9px] font-bold uppercase tracking-widest text-orange-300 backdrop-blur-md">
                        Featured
                      </div>
                    )}
                    {/* Image Carousel Dots */}
                    {images.length > 1 && (
                      <div className="studio-glass-chip absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-2 bg-black/20 backdrop-blur-md rounded-full border border-white/5">
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
                                  ? 'text-primary'
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
                                <span key={i} className="studio-glass-chip px-2 py-1 bg-zinc-900 border border-[var(--color-panel-border)] rounded-lg text-[10px] text-zinc-400 uppercase font-bold">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'Properties' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="studio-glass-surface p-4 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-2xl">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Category</p>
                            <p className="text-xs text-white font-medium">{asset.category}</p>
                          </div>
                          <div className="studio-glass-surface p-4 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-2xl">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Blockchain</p>
                            <p className="text-xs text-white font-medium">{asset.blockchain}</p>
                          </div>
                          <div className="studio-glass-surface p-4 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-2xl">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Token ID</p>
                            <p className="text-xs text-white font-medium">#{asset.tokenId}</p>
                          </div>
                          {isFractionalListing ? (
                            <div className="studio-glass-surface p-4 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-2xl">
                              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Available Slots</p>
                              <p className="text-xs text-white font-medium">{asset.availableSlots} / {asset.totalSlots}</p>
                            </div>
                          ) : (
                            <div className="studio-glass-surface p-4 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-2xl">
                              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Listing Type</p>
                              <p className="text-xs text-white font-medium">NFT / Single Unit</p>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'History' && (
                        <div className="space-y-2">
                          <div className="studio-glass-surface p-3 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-xl">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">Listed by {asset.seller.ensName || asset.seller.address.slice(0, 8)}</span>
                              <span className="text-white font-bold">{asset.price}</span>
                            </div>
                            <p className="text-[10px] text-zinc-600 mt-1">{asset.listingDuration}</p>
                          </div>
                          <div className="studio-glass-surface p-3 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-xl">
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
                          {asset.assetLocationSnapshot?.displayAddress && (
                            <div className="studio-glass-surface p-4 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-2xl">
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold mb-2">
                                <MapPin size={12} className="text-primary" />
                                Asset Address
                              </div>
                              <p className="text-sm text-white leading-relaxed">
                                {asset.assetLocationSnapshot.displayAddress}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                <span className="studio-glass-chip px-2 py-1 bg-zinc-900 border border-[var(--color-panel-border)] rounded-lg text-[10px] text-zinc-400 uppercase font-bold">
                                  {asset.assetLocationSnapshot.countryNameSnapshot}
                                </span>
                                <span className="studio-glass-chip px-2 py-1 bg-zinc-900 border border-[var(--color-panel-border)] rounded-lg text-[10px] text-zinc-400 uppercase font-bold">
                                  {asset.assetLocationSnapshot.precision}
                                </span>
                              </div>
                            </div>
                          )}
                          {asset.tags && asset.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {asset.tags.map((tag, i) => (
                                <span key={i} className="studio-glass-chip px-2 py-1 bg-zinc-900 border border-[var(--color-panel-border)] rounded-lg text-[10px] text-zinc-400 uppercase font-bold">
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
              <div className="p-8 flex flex-col min-h-0 md:h-full md:overflow-y-auto custom-scrollbar overscroll-contain">
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
                    <StudioModalCloseButton onClick={onClose} className="studio-glass-secondary" />
                  </div>

                  {/* Seller Info */}
                  <StudioPanel
                    onClick={handleSellerClick}
                    className="studio-glass-surface flex items-center gap-3 p-4 rounded-xl mt-4 cursor-pointer hover:bg-zinc-900/70 hover:border-[var(--color-primary-custom)]/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary-custom)] to-[#1a8f6f] flex items-center justify-center text-white font-bold">
                      {asset.seller.ensName ? asset.seller.ensName[0].toUpperCase() : asset.seller.address[2].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{asset.seller.ensName || asset.seller.address.slice(0, 8) + '...' + asset.seller.address.slice(-6)}</p>
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
                        isFavorited ? 'text-primary' : 'text-zinc-500 hover:text-primary'
                      }`}
                    >
                      <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                    </StudioActionButton>
                  </div>
                </div>

                {/* Quantity Selector */}
                {isFractionalListing ? (
                  <div className="mb-6">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Quantity (Slots)</p>
                    <div className="flex items-center gap-3">
                      <StudioActionButton
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= minQuantity}
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
                ) : (
                  <div className="mb-6">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Purchase Quantity</p>
                    <div className="studio-glass-surface rounded-xl border border-[var(--color-panel-border)] bg-zinc-900/50 px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-base font-bold text-white">1 NFT</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.15em]">Single-unit listing</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Token ID</p>
                        <p className="text-sm font-semibold text-white">#{asset.tokenId}</p>
                      </div>
                    </div>
                  </div>
                )}

                {configurableAttributes.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Buyer Attributes</p>
                      <span className="text-[10px] text-zinc-500">
                        {selectedAttributeSnapshots.length}/{configurableAttributes.length} selected
                      </span>
                    </div>
                    <div className="space-y-3">
                      {configurableAttributes.map((group) => {
                        const selectedValues = selectedAttributes[group.id] || [];

                        return (
                          <div
                            key={group.id}
                            className="studio-glass-surface p-4 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-2xl"
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <p className="text-sm font-semibold text-white">{group.label}</p>
                                {group.helpText && (
                                  <p className="text-[11px] text-zinc-500 mt-1">{group.helpText}</p>
                                )}
                              </div>
                              <span className="px-2 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                                {group.required ? 'Required' : group.selectionMode === 'multi' ? 'Multi' : 'Optional'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {group.options.map((option) => {
                                const isSelected = selectedValues.includes(option.label);

                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleAttributeSelection(group, option.label)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                                      isSelected
                                        ? 'bg-[#2CC295] text-black'
                                        : 'bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10'
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {hasMissingRequiredAttributes && (
                        <p className="text-[11px] text-orange-300">
                          Select required attributes: {missingRequiredAttributes.map((group) => group.label).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="studio-glass-surface p-3 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-xl text-center">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Views</p>
                    <p className="text-base font-bold text-white">{asset.views.toLocaleString()}</p>
                  </div>
                  <div className="studio-glass-surface p-3 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-xl text-center">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Likes</p>
                    <p className="text-base font-bold text-white">{asset.likes.toLocaleString()}</p>
                  </div>
                  {asset.rank && (
                    <div className="studio-glass-surface p-3 bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-xl text-center">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Rank</p>
                      <p className="text-base font-bold text-primary">#{asset.rank}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mb-6">
                  <StudioActionButton
                    onClick={handleBuyClick}
                    disabled={hasMissingRequiredAttributes}
                    className="w-full py-4 rounded-xl text-sm font-bold justify-center"
                  >
                    <Layers size={18} />
                    {hasMissingRequiredAttributes
                      ? 'Select Required Attributes'
                      : isFractionalListing
                        ? `Buy Now (${quantity} Slot${quantity > 1 ? 's' : ''})`
                        : 'Buy NFT'}
                  </StudioActionButton>
                </div>
              </div>
              </div>
            </div>
          </div>
        </motion.div>

        {isBuyModalOpen && isFractionalListing && (
          <RwaBuyOrderSignModal
            asset={asset}
            quantity={quantity}
            selectedAttributes={selectedAttributeSnapshots}
            unitLabel="slot"
            transparentBackdrop
            onClose={() => setIsBuyModalOpen(false)}
          />
        )}

        {isBuyModalOpen && !isFractionalListing && (
          <NftBuyDirectSignModal
            asset={asset}
            transparentBackdrop
            onClose={() => setIsBuyModalOpen(false)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
