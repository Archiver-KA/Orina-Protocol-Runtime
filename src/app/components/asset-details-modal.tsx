import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Layers, MessageSquare, Star, Minus, Plus, Shield, ExternalLink, Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { MarketplaceAsset, RwaConfigurableAttributeGroup, RwaSelectedAttribute } from '@/app/types/asset';
import type { Rating } from '@/types/reputation';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { VerifiedUserIcon } from '@/app/components/verified-user-icon';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { useAccessMode } from '@/hooks/useAccessMode';
import { useProtocolChain } from '@/hooks/useProtocolChain';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import { RwaBuyOrderSignModal } from '@/app/components/rwa-buy-order-sign-modal';
import { NftBuyDirectSignModal } from '@/app/components/nft-buy-direct-sign-modal';
import { loadFavorites, toggleFavorite } from '@/utils/favoritesUtils';
import {
  MARKETPLACE_CATALOG_SYNC_EVENT,
  getMarketplaceCatalogAssetById,
  incrementMarketplaceAssetView,
  loadMarketplaceCatalogSync,
} from '@/utils/marketplaceCatalog';
import { REPUTATION_SYNC_EVENT, hydrateReputationFromSupabase } from '@/utils/profileReputationSync';
import {
  getMarketplaceSellerAddress,
  getMarketplaceSellerDisplayName,
  getMarketplaceSellerInitial,
} from '@/utils/marketplaceAsset';
import { loadRatings } from '@/utils/reputationUtils';
import { getCategoryDisplayLabel } from '@/utils/taxonomy';
import { navigateToMarketplaceCategory } from '@/utils/appNavigation';

interface AssetDetailsModalProps {
  asset: MarketplaceAsset;
  onClose: () => void;
  onNavigateToSeller?: (sellerAddress: string) => void;
  onNavigateToSellerReviews?: (sellerAddress: string) => void;
  onNavigateToSellerMessages?: (sellerAddress: string) => void;
  zIndexClassName?: string;
}

function normalizeReviewAssetKey(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

function buildAssetReviewKeys(asset: MarketplaceAsset): Set<string> {
  return new Set(
    [asset.id, asset.assetUid, asset.onchainAssetId, asset.tokenId]
      .map((value) => normalizeReviewAssetKey(value))
      .filter(Boolean),
  );
}

function filterRatingsForAsset(asset: MarketplaceAsset, ratings: Rating[]): Rating[] {
  const reviewKeys = buildAssetReviewKeys(asset);
  const assetName = String(asset.name || '').trim().toLowerCase();

  return ratings
    .filter((rating) => {
      if (rating.ratingType !== 'seller') return false;

      const ratingAssetKey = normalizeReviewAssetKey(rating.assetId);
      if (ratingAssetKey && reviewKeys.has(ratingAssetKey)) {
        return true;
      }

      const ratingAssetName = String(rating.assetName || '').trim().toLowerCase();
      return Boolean(assetName && ratingAssetName && ratingAssetName === assetName);
    })
    .sort((left, right) => right.timestamp - left.timestamp);
}

function formatAssetReviewDate(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return '';

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

function getAssetListingDurationDisplay(asset: MarketplaceAsset): string | null {
  if (typeof asset.expiresAt !== 'number' || !Number.isFinite(asset.expiresAt)) return null;

  const existingLabel = String(asset.listingDuration || '').trim();
  if (existingLabel && existingLabel.toLowerCase() !== 'no expiry') return existingLabel;

  const diff = asset.expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${days}d ${hours}h ${minutes}m`;
}

export function AssetDetailsModal({
  asset: initialAsset,
  onClose,
  onNavigateToSeller,
  onNavigateToSellerReviews,
  onNavigateToSellerMessages,
  zIndexClassName = 'z-[60]',
}: AssetDetailsModalProps) {
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [activeTab, setActiveTab] = useState('Description');
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [assetRatings, setAssetRatings] = useState<Rating[]>([]);
  const [isLoadingAssetReviews, setIsLoadingAssetReviews] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>({});
  const asset = useMemo(() => {
    const catalog = loadMarketplaceCatalogSync();
    return (
      getMarketplaceCatalogAssetById(initialAsset.id, catalog)
      || (initialAsset.assetUid
        ? getMarketplaceCatalogAssetById(initialAsset.assetUid, catalog)
        : undefined)
      || (initialAsset.onchainAssetId
        ? getMarketplaceCatalogAssetById(initialAsset.onchainAssetId, catalog)
        : undefined)
      || getMarketplaceCatalogAssetById(initialAsset.tokenId, catalog)
      || initialAsset
    );
  }, [catalogRevision, initialAsset]);
  const assetListingDuration = useMemo(() => getAssetListingDurationDisplay(asset), [asset]);
  const { address } = useEffectiveViewer();
  const access = useAccessMode();
  const protocolChain = useProtocolChain();
  const { requireWalletAction, requireWalletActionAsync } = useRequireWalletAction();

  const images = asset.images?.length ? asset.images : [asset.image].filter(Boolean);
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
  const sellerAddress = getMarketplaceSellerAddress(asset.seller) || '';
  const assetRouteAddress = asset.assetLocationSnapshot?.displayAddress?.trim() ?? '';
  const sellerAvatarLetter = getMarketplaceSellerInitial(asset.seller);
  const sellerDisplayName = getMarketplaceSellerDisplayName(asset.seller);
  const sellerVerified = Boolean(asset.seller?.verified);
  const sellerReputation = Number.isFinite(asset.seller?.reputation)
    ? asset.seller.reputation
    : 0;
  const assetReviewAverage = assetRatings.length > 0
    ? assetRatings.reduce((sum, rating) => sum + rating.overallRating, 0) / assetRatings.length
    : 0;
  const isSelfBuyer = Boolean(
    address && sellerAddress && address.toLowerCase() === sellerAddress.toLowerCase()
  );
  const canNavigateToSeller = Boolean(onNavigateToSeller && sellerAddress);
  const canNavigateToSellerReviews = Boolean(onNavigateToSellerReviews && sellerAddress);
  const canNavigateToSellerMessages = Boolean(onNavigateToSellerMessages && sellerAddress);
  const canContactSeller = canNavigateToSellerMessages;
  const sectionShellClassName =
    'studio-glass-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)] shadow-[0_24px_60px_-42px_rgba(0,0,0,0.32)]';
  const statCardClassName = `${sectionShellClassName} p-4`;
  const compactCardClassName = `${sectionShellClassName} rounded-[20px] p-3`;
  const chipClassName =
    'studio-glass-chip rounded-full border border-ui-border-subtle bg-[var(--t-surface-10)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ui-secondary';
  const metaPillClassName =
    'inline-flex items-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-10)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-secondary';
  const sectionLabelClassName = 'text-[10px] font-medium uppercase tracking-[0.16em] text-ui-muted';

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleCatalogSync = () => {
      setCatalogRevision((current) => current + 1);
    };

    window.addEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, handleCatalogSync as EventListener);
    return () => {
      window.removeEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, handleCatalogSync as EventListener);
    };
  }, []);

  useEffect(() => {
    setSelectedAttributes({});
    setQuantity(1);
    setCurrentImageIndex(0);
  }, [asset.id]);

  useEffect(() => {
    incrementMarketplaceAssetView(asset.id);
  }, [asset.id]);

  useEffect(() => {
    if (!sellerAddress) {
      setAssetRatings([]);
      setIsLoadingAssetReviews(false);
      return;
    }

    const syncAssetRatings = () => {
      setAssetRatings(filterRatingsForAsset(asset, loadRatings(sellerAddress)));
    };

    syncAssetRatings();
    setIsLoadingAssetReviews(true);

    void hydrateReputationFromSupabase(sellerAddress, { force: true })
      .catch(() => undefined)
      .finally(() => {
        syncAssetRatings();
        setIsLoadingAssetReviews(false);
      });

    window.addEventListener(REPUTATION_SYNC_EVENT, syncAssetRatings as EventListener);
    return () => {
      window.removeEventListener(REPUTATION_SYNC_EVENT, syncAssetRatings as EventListener);
    };
  }, [asset.id, asset.assetUid, asset.onchainAssetId, asset.tokenId, asset.name, sellerAddress]);

  useEffect(() => {
    if (!address) {
      setIsFavorited(false);
      return;
    }

    const favorites = loadFavorites(address);
    setIsFavorited(favorites.some((favorite: { assetId: string }) => favorite.assetId === asset.id));
  }, [address, asset.id]);

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

  const handlePreviousImage = () => {
    if (images.length <= 1) return;
    setCurrentImageIndex((current) => (current - 1 + images.length) % images.length);
  };

  const handleNextImage = () => {
    if (images.length <= 1) return;
    setCurrentImageIndex((current) => (current + 1) % images.length);
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
    if (onNavigateToSeller && sellerAddress) {
      onNavigateToSeller(sellerAddress);
    }
  };

  const handleContactSellerClick = () => {
    if (onNavigateToSellerMessages && sellerAddress) {
      onNavigateToSellerMessages(sellerAddress);
    }
  };

  const handleSellerReviewsClick = () => {
    if (onNavigateToSellerReviews && sellerAddress) {
      onNavigateToSellerReviews(sellerAddress);
    }
  };

  const handleCategoryRoute = () => {
    onClose();
    navigateToMarketplaceCategory({ category: asset.category });
  };

  const handleBuyClick = async () => {
    if (hasMissingRequiredAttributes) return;
    if (isSelfBuyer) {
      toast.error('Switch to a different wallet to buy your own listing.');
      return;
    }

    const continueBuy = async () => {
      setIsBuyModalOpen(true);
    };

    // Align the entrypoint with protocol-order access so wallet, auth, and
    // network issues are resolved before the order-sign modal opens.
    const allowed = await requireWalletActionAsync({
      capability: 'protocol_order_write',
      actionLabel: 'continue with this purchase',
      fallbackPage: 'marketplace',
      onSecurityCheckConfirmed: continueBuy,
    });
    if (!allowed) return;

    await continueBuy();
  };

  const buyButtonLabel = isSelfBuyer
    ? 'You Own This Asset'
    : hasMissingRequiredAttributes
      ? 'Select Required Attributes'
      : !protocolChain.isConnected
        ? 'Connect Wallet'
        : access.isAuthPending
          ? 'Unlock Wallet'
          : !protocolChain.isOnProtocolChain
            ? 'Switch Network'
            : isFractionalListing
              ? `Buy Now (${quantity} Slot${quantity > 1 ? 's' : ''})`
              : 'Buy NFT';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`studio-portal-backdrop fixed inset-0 ${zIndexClassName} flex items-stretch justify-center bg-black/78 p-0 backdrop-blur-[16px] sm:items-center sm:p-6`}
        onClick={handleOverlayClick}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative z-[1] h-[100dvh] max-h-[100dvh] w-full max-w-none sm:h-auto sm:max-h-[95vh] sm:max-w-5xl md:h-[95vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 top-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 p-0 text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.5)] backdrop-blur-md transition-colors hover:border-white/15 hover:bg-black/80 hover:text-white sm:hidden"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="studio-modal-theme studio-glass-modal flex h-full w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-[var(--t-card-bg)] shadow-none backdrop-blur-[20px] sm:max-h-[95vh] sm:max-w-5xl sm:rounded-[32px] sm:border sm:border-ui-border-subtle sm:shadow-[0_24px_60px_-32px_rgba(0,0,0,0.8)] md:h-[95vh]">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar md:overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-full md:h-full md:min-h-0">
              {/* Left Column - Image & Properties */}
              <div className="studio-glass-header bg-[var(--t-surface-2)] md:h-full md:min-h-0 md:overflow-hidden">
                <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4 custom-scrollbar overscroll-contain sm:p-6 md:p-8">
                  {/* Image Preview */}
                  <div className={`${sectionShellClassName} relative flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-[2rem] p-4 backdrop-blur-xl`}>
                    <img
                      alt={asset.name}
                      className="w-full h-full object-cover rounded-2xl"
                      src={images[currentImageIndex]}
                    />
                    {asset.verified && (
                      <div className="studio-glass-chip absolute left-6 top-6 flex items-center gap-1.5 rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7CF0CB] backdrop-blur-md">
                        <Shield size={10} />
                        Verified
                      </div>
                    )}
                    {asset.featured && (
                      <div className="studio-glass-chip absolute right-6 top-6 rounded-full border border-orange-400/20 bg-orange-400/12 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-orange-200 backdrop-blur-md">
                        Featured
                      </div>
                    )}
                    {/* Image Carousel Controls */}
                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={handlePreviousImage}
                          className="studio-glass-chip absolute bottom-6 left-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-10)] text-ui-primary shadow-[0_18px_35px_-28px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors hover:border-[#2CC295]/35 hover:bg-[#2CC295]/12 hover:text-[#7CF0CB]"
                          aria-label="Previous image"
                          title="Previous image"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextImage}
                          className="studio-glass-chip absolute bottom-6 right-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-10)] text-ui-primary shadow-[0_18px_35px_-28px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors hover:border-[#2CC295]/35 hover:bg-[#2CC295]/12 hover:text-[#7CF0CB]"
                          aria-label="Next image"
                          title="Next image"
                        >
                          <ChevronRight size={18} />
                        </button>
                        <div className="studio-glass-chip absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full border border-ui-border-subtle bg-[var(--t-surface-10)] px-3 py-2 backdrop-blur-md">
                          {images.map((_: string, index: number) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setCurrentImageIndex(index)}
                              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                                currentImageIndex === index ? 'bg-[#2CC295]' : 'bg-ui-border'
                              }`}
                              aria-label={`Show image ${index + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Tabs & Properties */}
                  <div className="mt-5 sm:mt-8">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="grid w-full grid-cols-4 items-center gap-1 rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] p-1 sm:inline-grid sm:w-auto sm:gap-2 sm:p-1.5">
                          {['Description', 'Properties', 'History', 'Details'].map((tab) => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setActiveTab(tab)}
                              className={`inline-flex min-w-0 items-center justify-center rounded-full px-1.5 py-2.5 text-[11px] font-semibold tracking-[-0.01em] transition-colors sm:px-5 sm:text-sm ${
                                activeTab === tab
                                  ? 'bg-[var(--t-card-bg)] text-ui-primary shadow-[0_18px_35px_-28px_rgba(0,0,0,0.3)]'
                                  : 'text-ui-secondary hover:bg-[var(--t-surface-10)] hover:text-ui-primary'
                              }`}
                            >
                              <span className="truncate">{tab}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tab Content - Fixed Height */}
                    <div className={`${sectionShellClassName} min-h-[320px] p-4 sm:p-5`}>
                      {/* Tab Content */}
                      {activeTab === 'Description' && (
                        <div className="space-y-3">
                          <p className={sectionLabelClassName}>Asset Overview</p>
                          <p className="text-sm leading-relaxed text-ui-secondary">
                            {asset.description || 'No description available for this asset.'}
                          </p>
                          {asset.tags && asset.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {asset.tags.map((tag: string, i: number) => (
                                <span key={i} className={`${chipClassName} px-2.5 py-1`}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'Properties' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className={statCardClassName}>
                            <p className={`${sectionLabelClassName} mb-1`}>Category</p>
                            <button
                              type="button"
                              onClick={handleCategoryRoute}
                              className="text-left text-xs font-medium text-ui-primary transition-colors hover:text-[#2CC295]"
                            >
                              {getCategoryDisplayLabel(asset.category)}
                            </button>
                          </div>
                          <div className={statCardClassName}>
                            <p className={`${sectionLabelClassName} mb-1`}>Blockchain</p>
                            <p className="text-xs font-medium text-ui-primary">{asset.blockchain}</p>
                          </div>
                          <div className={statCardClassName}>
                            <p className={`${sectionLabelClassName} mb-1`}>Token ID</p>
                            <p className="text-xs font-medium text-ui-primary">#{asset.tokenId}</p>
                          </div>
                          {isFractionalListing ? (
                            <div className={statCardClassName}>
                              <p className={`${sectionLabelClassName} mb-1`}>Available Slots</p>
                              <p className="text-xs font-medium text-ui-primary">{asset.availableSlots} / {asset.totalSlots}</p>
                            </div>
                          ) : (
                            <div className={statCardClassName}>
                              <p className={`${sectionLabelClassName} mb-1`}>Listing Type</p>
                              <p className="text-xs font-medium text-ui-primary">NFT / Single Unit</p>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'History' && (
                        <div className="space-y-2">
                          <div className={compactCardClassName}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-ui-secondary">Listed by {sellerDisplayName}</span>
                              <span className="font-semibold text-ui-primary">{asset.price}</span>
                            </div>
                            {assetListingDuration ? (
                              <p className="mt-1 text-[10px] text-ui-muted">{assetListingDuration}</p>
                            ) : null}
                          </div>
                          <div className={compactCardClassName}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-ui-secondary">Views</span>
                              <span className="font-semibold text-ui-primary">{asset.views.toLocaleString()}</span>
                            </div>
                          </div>
                          <StudioActionButton
                            variant="secondary"
                            className="w-full justify-center text-xs font-semibold"
                          >
                            <ExternalLink size={14} />
                            View on Explorer
                          </StudioActionButton>
                        </div>
                      )}

                      {activeTab === 'Details' && (
                        <div className="space-y-3 text-sm">
                          <div className={statCardClassName}>
                            <p className={`${sectionLabelClassName} mb-2`}>Route Address</p>
                            <p className="min-h-[1.5rem] break-words text-sm leading-relaxed text-ui-primary">
                              {assetRouteAddress}
                            </p>
                          </div>
                          <div className={statCardClassName}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className={`${sectionLabelClassName} mb-1`}>Asset Reviews</p>
                                <div className="flex items-center gap-2">
                                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm font-semibold text-ui-primary">
                                    {assetRatings.length > 0 ? assetReviewAverage.toFixed(1) : '0.0'}
                                  </span>
                                  <span className="text-xs text-ui-muted">
                                    {assetRatings.length} review{assetRatings.length === 1 ? '' : 's'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {assetRatings.length > 0 ? (
                              <div className="mt-3 space-y-3">
                                {assetRatings.slice(0, 3).map((rating) => (
                                  <div key={`${rating.id}-${rating.timestamp}`} className={compactCardClassName}>
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-xs font-semibold text-ui-primary">
                                          {rating.fromUsername || `${rating.fromUserId.slice(0, 6)}...${rating.fromUserId.slice(-4)}`}
                                        </p>
                                        <div className="mt-1 flex items-center gap-1">
                                          {Array.from({ length: 5 }).map((_, index) => (
                                            <Star
                                              key={`${rating.id}-star-${index}`}
                                              size={10}
                                              className={index < Math.round(rating.overallRating)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-ui-muted'}
                                            />
                                          ))}
                                          <span className="ml-1 text-[11px] text-ui-muted">
                                            {rating.overallRating.toFixed(1)}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ui-muted">
                                        {formatAssetReviewDate(rating.timestamp)}
                                      </span>
                                    </div>
                                    {rating.review && (
                                      <p className="mt-3 text-xs leading-relaxed text-ui-secondary">
                                        {rating.review}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-xs leading-relaxed text-ui-muted">
                                {isLoadingAssetReviews
                                  ? 'Loading recent reviews for this asset.'
                                  : 'No reviews recorded for this asset yet.'}
                              </p>
                            )}
                          </div>
                          {canNavigateToSellerReviews && (
                            <StudioActionButton
                              variant="secondary"
                              className="w-full justify-center text-xs font-semibold"
                              onClick={handleSellerReviewsClick}
                            >
                              <Star size={14} />
                              View Seller Reviews
                            </StudioActionButton>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Details & Purchase */}
              <div className="flex min-h-0 flex-col gap-4 p-4 custom-scrollbar overscroll-contain sm:p-6 md:h-full md:gap-5 md:overflow-y-auto md:p-8">
                {/* Header */}
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCategoryRoute}
                      className={`${metaPillClassName} transition-colors hover:border-[#2CC295]/24 hover:bg-[#2CC295]/10 hover:text-[#2CC295]`}
                    >
                      {getCategoryDisplayLabel(asset.category)}
                    </button>
                    <span className={metaPillClassName}>{isFractionalListing ? 'Fractional Listing' : 'Single Edition'}</span>
                    {asset.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7CF0CB]">
                        <Shield size={10} />
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <h2 className="mb-2 text-[22px] font-semibold leading-[1.12] tracking-[-0.02em] text-ui-primary sm:text-[28px] md:text-[32px] md:leading-[1.08] md:tracking-[-0.03em]">{asset.name}</h2>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {assetListingDuration && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Clock size={12} className="text-[#2CC295]" />
                            <span className="font-medium text-ui-muted">Listing Ends In</span>
                            <span className="font-semibold text-ui-primary">{assetListingDuration}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <StudioModalCloseButton onClick={onClose} className="studio-glass-secondary shrink-0 self-start rounded-full" />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1.45fr)_minmax(210px,0.95fr)] md:items-stretch">
                  {/* Seller Info */}
                  <StudioPanel
                    className={`studio-glass-surface flex h-full items-center gap-3 rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-4 transition-all ${
                      canNavigateToSeller
                        ? 'hover:border-[var(--color-primary-custom)]/30 hover:bg-[var(--t-surface-10)]'
                        : ''
                    }`}
                  >
                      {canNavigateToSeller ? (
                        <button
                          type="button"
                          onClick={handleSellerClick}
                          className="group flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary-custom)] to-[#1a8f6f] text-white font-semibold">
                            {sellerAvatarLetter}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-ui-primary transition-colors group-hover:text-primary">{sellerDisplayName}</p>
                              {sellerVerified && (
                                <VerifiedUserIcon size={12} />
                              )}
                            </div>
                            {sellerReputation > 0 && (
                              <div className="mt-0.5 flex items-center gap-1">
                                <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                <span className="text-[10px] font-medium text-ui-muted">{sellerReputation}% Rating</span>
                              </div>
                            )}
                          </div>
                        </button>
                      ) : (
                        <>
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary-custom)] to-[#1a8f6f] text-white font-semibold">
                            {sellerAvatarLetter}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-ui-primary">{sellerDisplayName}</p>
                              {sellerVerified && (
                                <VerifiedUserIcon size={12} />
                              )}
                            </div>
                            {sellerReputation > 0 && (
                              <div className="mt-0.5 flex items-center gap-1">
                                <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                <span className="text-[10px] font-medium text-ui-muted">{sellerReputation}% Rating</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      <StudioActionButton
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleContactSellerClick();
                        }}
                        title="Contact seller"
                        aria-label="Contact seller"
                        size="icon"
                        variant="secondary"
                        disabled={!canContactSeller}
                        className="h-10 w-10 shrink-0 text-ui-primary"
                      >
                        <MessageSquare size={14} />
                      </StudioActionButton>
                  </StudioPanel>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={`${compactCardClassName} flex min-h-[92px] flex-col justify-center text-center`}>
                      <p className="mb-1 text-[10px] font-medium uppercase text-ui-muted">Views</p>
                      <p className="text-base font-semibold text-ui-primary">{(asset.views ?? 0).toLocaleString()}</p>
                    </div>
                    <div className={`${compactCardClassName} flex min-h-[92px] flex-col justify-center text-center`}>
                      <p className="mb-1 text-[10px] font-medium uppercase text-ui-muted">Likes</p>
                      <p className="text-base font-semibold text-ui-primary">{(asset.likes ?? 0).toLocaleString()}</p>
                    </div>
                    {typeof asset.rank === 'number' && asset.rank > 0 && (
                      <div className={`${compactCardClassName} col-span-2 flex min-h-[72px] flex-col justify-center text-center`}>
                        <p className="mb-1 text-[10px] font-medium uppercase text-ui-muted">Rank</p>
                        <p className="text-base font-semibold text-primary">#{asset.rank}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Section */}
                <div className={`${sectionShellClassName} p-5`}>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className={sectionLabelClassName}>Price Summary</p>
                      <div className="mt-2 flex items-baseline gap-3">
                        <p className="text-[38px] font-semibold leading-none tracking-[-0.03em] text-ui-primary">{asset.price}</p>
                        {asset.priceUSD && (
                          <p className="text-sm text-ui-muted">≈ {asset.priceUSD}</p>
                        )}
                      </div>
                    </div>
                    <StudioActionButton
                      onClick={async () => {
                        if (!address) {
                          if (!requireWalletAction({ capability: 'favorite_write', actionLabel: 'favorite assets', fallbackPage: 'marketplace' })) return;
                          return;
                        }

                        const nextFavoriteState = await toggleFavorite(address, asset.id);
                        setIsFavorited(nextFavoriteState);
                      }}
                      size="icon"
                      variant="secondary"
                      className={isFavorited ? 'text-primary' : 'text-ui-muted hover:text-primary'}
                    >
                      <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
                    </StudioActionButton>
                  </div>
                </div>

                {/* Quantity Selector */}
                {isFractionalListing ? (
                  <div className={`${sectionShellClassName} p-5`}>
                    <p className={sectionLabelClassName}>Purchase Quantity</p>
                    <div className="mt-4 flex items-center gap-3">
                      <StudioActionButton
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= minQuantity}
                        size="icon"
                        variant="secondary"
                        className="h-10 w-10 text-ui-primary disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Minus size={16} />
                      </StudioActionButton>
                      <div className="flex flex-1 flex-col items-center justify-center text-center">
                        <p className="text-[32px] font-semibold leading-none tracking-[-0.03em] text-ui-primary">{quantity}</p>
                        <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-ui-muted">of {asset.availableSlots} available</p>
                      </div>
                      <StudioActionButton
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= maxQuantity}
                        size="icon"
                        variant="secondary"
                        className="h-10 w-10 text-ui-primary disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Plus size={16} />
                      </StudioActionButton>
                    </div>
                  </div>
                ) : (
                  <div className={`${sectionShellClassName} p-5`}>
                    <p className={sectionLabelClassName}>Purchase Quantity</p>
                    <div className="mt-4 flex items-center justify-between rounded-[20px] border border-ui-border-subtle bg-[var(--t-surface-10)] px-4 py-3">
                      <div>
                        <p className="text-base font-semibold text-ui-primary">1 NFT</p>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-ui-muted">Single-unit listing</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-medium uppercase text-ui-muted">Token ID</p>
                        <p className="text-sm font-semibold text-ui-primary">#{asset.tokenId}</p>
                      </div>
                    </div>
                  </div>
                )}

                {configurableAttributes.length > 0 && (
                  <div className={`${sectionShellClassName} p-5`}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className={sectionLabelClassName}>Buyer Attributes</p>
                      <span className="text-[10px] text-ui-muted">
                        {selectedAttributeSnapshots.length}/{configurableAttributes.length} selected
                      </span>
                    </div>
                    <div className="space-y-3">
                      {configurableAttributes.map((group) => {
                        const selectedValues = selectedAttributes[group.id] || [];

                        return (
                          <div
                            key={group.id}
                            className={statCardClassName}
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <p className="text-sm font-semibold text-ui-primary">{group.label}</p>
                                {group.helpText && (
                                  <p className="mt-1 text-[11px] text-ui-muted">{group.helpText}</p>
                                )}
                              </div>
                              <span className={chipClassName}>
                                {group.required ? 'Required' : group.selectionMode === 'multi' ? 'Multi' : 'Optional'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {group.options.map((option: RwaConfigurableAttributeGroup['options'][number]) => {
                                const isSelected = selectedValues.includes(option.label);

                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleAttributeSelection(group, option.label)}
                                    className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                                      isSelected
                                        ? 'bg-[#2CC295] text-black'
                                        : 'border border-ui-border-subtle bg-[var(--t-surface-10)] text-ui-secondary hover:bg-[var(--t-surface-5)] hover:text-ui-primary'
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

                {/* Action Buttons */}
                <div className={`${sectionShellClassName} p-5`}>
                  <p className={sectionLabelClassName}>Ready To Proceed</p>
                  <p className="mt-2 text-sm leading-6 text-ui-secondary">
                    Review the listing details and confirm the purchase flow in the secure signing step.
                  </p>
                  {isSelfBuyer ? (
                    <p className="mt-3 text-[11px] text-orange-300">
                      Connected wallet matches the seller address. Switch wallets to place a buy order.
                    </p>
                  ) : null}
                  <StudioActionButton
                    onClick={handleBuyClick}
                    disabled={hasMissingRequiredAttributes || isSelfBuyer}
                    className="mt-5 w-full justify-center py-4 text-sm font-semibold"
                  >
                    <Layers size={18} />
                    {buyButtonLabel}
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
            unitLabel={asset.unitLabel ?? asset.unitName ?? 'unit'}
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
