import { useCallback, useEffect, useMemo, useState } from 'react';
import { Heart, Layers3, Pencil, Shield, Tag, Trash2, UserCheck, UserPlus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { AssetDetailsModal } from '@/app/components/asset-details-modal';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import {
  StudioModalBody,
  StudioModalCloseButton,
  StudioModalHeader,
  StudioModalPanel,
} from '@/app/components/ui/studio-modal';
import type { CollectionDraft, CollectionSummary } from '@/types/collection';
import {
  addAssetToCollection,
  COLLECTIONS_SYNC_EVENT,
  deleteCollection,
  isCollectionFavorite,
  isCollectionFollowed,
  loadCollectionAssetOptions,
  loadCollectionDetailsById,
  removeAssetFromCollection,
  toggleCollectionFavorite,
  toggleCollectionFollow,
  updateCollection,
} from '@/utils/collectionsUtils';
import {
  getMarketplaceCatalogAssetById,
  loadMarketplaceCatalogSync,
} from '@/utils/marketplaceCatalog';
import { formatUserDisplayName, loadUserProfile, shortenAddress } from '@/utils/profileUtils';
import { CollectionEditorModal } from '@/app/components/collections/collection-editor-modal';
import { AddAssetToCollectionModal } from '@/app/components/collections/add-asset-to-collection-modal';
import type { MarketplaceAsset } from '@/app/types/asset';
import { getRuntimeMintedAssetDetailsById } from '@/utils/runtimeMintedAssets';
import { getDeterministicOwnedAssetDetailsById } from '@/utils/testWalletAssetFixtures';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { getCategoryDisplayLabel } from '@/utils/taxonomy';
import { navigateToMarketplaceCategory } from '@/utils/appNavigation';

interface CollectionDetailsModalProps {
  isOpen: boolean;
  collectionId: string | null;
  onClose: () => void;
}

function formatMetaLabel(value: string | undefined): string | null {
  const normalized = String(value || '').trim();
  return normalized ? normalized : null;
}

function buildFallbackMarketplaceAsset(asset: ReturnType<typeof loadCollectionDetailsById>['assets'][number]): MarketplaceAsset | null {
  const details =
    getRuntimeMintedAssetDetailsById(asset.id) ||
    getDeterministicOwnedAssetDetailsById(asset.id);
  if (!details) return null;

  const ownerProfile = loadUserProfile(asset.ownerWallet);

  return {
    id: details.id,
    tokenId: details.tokenId,
    contractAddress: details.contractAddress,
    name: details.name,
    category: details.category,
    description: details.description,
    image: details.image,
    images: details.images,
    seller: {
      address: asset.ownerWallet,
      ensName: ownerProfile?.username || undefined,
      verified: false,
    },
    price: asset.price,
    priceUSD: details.currentPriceUsd,
    currency: 'ETH',
    listedAt: details.mintDate,
    views: details.views,
    likes: details.favorites,
    verified: details.verified,
    featured: false,
    tags: details.properties.map((property) => String(property.value)).filter(Boolean),
    blockchain: details.blockchain,
    network: 'testnet',
    createdAt: details.mintDate,
    updatedAt: details.lastSale || details.mintDate,
  };
}

export function CollectionDetailsModal({
  isOpen,
  collectionId,
  onClose,
}: CollectionDetailsModalProps) {
  const { address } = useEffectiveViewer();
  const { requireWalletActionAsync } = useRequireWalletAction();
  const [collection, setCollection] = useState<ReturnType<typeof loadCollectionDetailsById> | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MarketplaceAsset | null>(null);

  const refreshCollection = useCallback(() => {
    if (!collectionId) {
      setCollection(null);
      setIsFavorited(false);
      setIsFollowing(false);
      return;
    }

    const nextCollection = loadCollectionDetailsById(collectionId) || null;
    setCollection(nextCollection);

    if (address) {
      setIsFavorited(isCollectionFavorite(address, collectionId));
      setIsFollowing(isCollectionFollowed(address, collectionId));
    } else {
      setIsFavorited(false);
      setIsFollowing(false);
    }
  }, [address, collectionId]);

  useEffect(() => {
    if (!isOpen) return;
    refreshCollection();
  }, [isOpen, refreshCollection]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const sync = () => refreshCollection();
    window.addEventListener(COLLECTIONS_SYNC_EVENT, sync as EventListener);
    return () => {
      window.removeEventListener(COLLECTIONS_SYNC_EVENT, sync as EventListener);
    };
  }, [isOpen, refreshCollection]);

  const isOwner = Boolean(
    address &&
    collection &&
    address.toLowerCase() === collection.ownerWallet.toLowerCase()
  );

  const ownerProfile = useMemo(
    () => (collection ? loadUserProfile(collection.ownerWallet) : null),
    [collection]
  );
  const ownerDisplayName = collection
    ? formatUserDisplayName(ownerProfile?.displayName, collection.ownerWallet)
    : '';
  const ownerHandle = ownerProfile?.username || shortenAddress(collection?.ownerWallet || '');

  const assetOptions = useMemo(() => {
    if (!isOwner || !collection) return [];
    return loadCollectionAssetOptions(address).filter((asset) => !collection.itemIds.includes(asset.id));
  }, [address, collection, isOwner]);

  if (!isOpen || !collectionId || typeof document === 'undefined') return null;
  if (!collection) return null;

  const handleToggleFavorite = () => {
    if (!address || !collection) {
      toast.error('Please connect wallet to manage favorite collections');
      return;
    }

    const next = toggleCollectionFavorite(address, collection.id);
    setIsFavorited(next);
    toast.success(next ? 'Added collection to favorites' : 'Removed collection from favorites');
  };

  const handleToggleFollow = () => {
    if (!address || !collection) {
      toast.error('Please connect wallet to follow collections');
      return;
    }

    if (isOwner) {
      toast.info('You already own this collection');
      return;
    }

    const next = toggleCollectionFollow(address, collection.id);
    setIsFollowing(next);
    toast.success(next ? 'Now following collection' : 'Unfollowed collection');
  };

  const handleSaveCollection = async (draft: CollectionDraft) => {
    if (!address || !collection) return;

    const continueSaveCollection = async () => {
      const updated = updateCollection(address, collection.id, draft);
      if (!updated) {
        toast.error('Unable to update collection');
        return;
      }

      toast.success(`Updated collection "${updated.name}"`);
      setIsEditorOpen(false);
      refreshCollection();
    };

    const allowed = await requireWalletActionAsync({
      capability: 'protocol_asset_write',
      actionLabel: 'edit this collection',
      fallbackPage: 'assets',
      onSecurityCheckConfirmed: continueSaveCollection,
    });
    if (!allowed) return;

    await continueSaveCollection();
  };

  const handleAddAsset = async (targetCollectionId: string, assetId: string) => {
    if (!address || !collection) return;

    const continueAddAsset = async () => {
      const updated = addAssetToCollection(address, targetCollectionId, assetId);
      if (!updated) {
        toast.error('Unable to add asset to collection');
        return;
      }

      const addedAsset = assetOptions.find((asset) => asset.id === assetId);
      toast.success(
        addedAsset
          ? `Added "${addedAsset.name}" to "${updated.name}"`
          : `Added asset to "${updated.name}"`
      );
      setIsAddAssetOpen(false);
      refreshCollection();
    };

    const allowed = await requireWalletActionAsync({
      capability: 'protocol_asset_write',
      actionLabel: 'add an asset to this collection',
      fallbackPage: 'assets',
      onSecurityCheckConfirmed: continueAddAsset,
    });
    if (!allowed) return;

    await continueAddAsset();
  };

  const handleRemoveAsset = (assetId: string) => {
    if (!address || !collection) return;

    const updated = removeAssetFromCollection(address, collection.id, assetId);
    if (!updated) {
      toast.error('Unable to remove asset from collection');
      return;
    }

    const removedAsset = collection.assets.find((asset) => asset.id === assetId);
    toast.success(
      removedAsset
        ? `Removed "${removedAsset.name}" from "${updated.name}"`
        : `Removed asset from "${updated.name}"`
    );
    refreshCollection();
  };

  const handleDeleteCollection = async () => {
    if (!address || !collection) return;
    const shouldDelete = window.confirm(`Delete collection "${collection.name}"? This cannot be undone.`);
    if (!shouldDelete) return;

    const continueDeleteCollection = async () => {
      const removed = deleteCollection(address, collection.id);
      if (!removed) {
        toast.error('Unable to delete collection');
        return;
      }

      toast.success(`Deleted collection "${collection.name}"`);
      setIsEditorOpen(false);
      setIsAddAssetOpen(false);
      onClose();
    };

    const allowed = await requireWalletActionAsync({
      capability: 'protocol_asset_write',
      actionLabel: 'delete this collection',
      fallbackPage: 'assets',
      onSecurityCheckConfirmed: continueDeleteCollection,
    });
    if (!allowed) return;

    await continueDeleteCollection();
  };

  const handleOpenAssetDetails = (asset: (typeof collection.assets)[number]) => {
    const resolvedAsset =
      getMarketplaceCatalogAssetById(asset.id, loadMarketplaceCatalogSync()) ||
      buildFallbackMarketplaceAsset(asset);
    if (!resolvedAsset) {
      toast.error('Unable to open asset details for this collection item');
      return;
    }

    setSelectedAsset(resolvedAsset);
  };

  const actionButtonClass = 'text-sm font-semibold tracking-tight';

  return createPortal(
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="studio-form-backdrop fixed inset-0 z-[142] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[14px]"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative z-[1] w-full max-w-6xl h-[calc(100dvh-3rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <StudioModalPanel className="studio-form-modal max-w-6xl h-[calc(100dvh-3rem)]">
              <StudioModalHeader className="border-b-0 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">Collection Detail</p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight text-ui-primary">{collection.name}</h2>
                  </div>
                  <StudioModalCloseButton onClick={onClose} />
                </div>
              </StudioModalHeader>

              <StudioModalBody className="space-y-6 pt-0">
                <section className="relative h-[280px] overflow-hidden rounded-[28px] bg-black">
                  <ImageWithFallback
                    src={collection.coverImage}
                    alt={collection.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.38)_0%,rgba(0,0,0,0.08)_38%,rgba(0,0,0,0.15)_58%,rgba(0,0,0,0.88)_100%)]" />

                  <button
                    type="button"
                    onClick={() => navigateToMarketplaceCategory({ category: collection.category })}
                    className="absolute left-5 top-5 inline-flex items-center rounded-full border border-white/18 bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-md transition-colors hover:bg-black/65"
                  >
                    {getCategoryDisplayLabel(collection.category)}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-black/40 text-white/80 backdrop-blur-md transition-colors hover:bg-black/55 hover:text-white"
                  >
                    <Heart size={16} className={isFavorited ? 'fill-red-500 text-red-500' : ''} />
                  </button>

                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/30 px-3 py-1 backdrop-blur-sm">
                        <Shield size={12} className="text-[#2CC295]" />
                        {ownerDisplayName}
                      </span>
                      <span className="text-white/55">{ownerHandle}</span>
                    </div>

                    <h3 className="mt-4 text-[34px] font-semibold leading-none tracking-[-0.03em] text-white">
                      {collection.name}
                    </h3>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/78">
                      {collection.bio || collection.description}
                    </p>

                    {collection.tags.length > 0 ? (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {collection.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/30 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-sm"
                          >
                            <Tag size={12} />
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_320px]">
                  <div className="space-y-6">
                    <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-ui-primary">Collection Assets</h3>
                          <p className="mt-1 text-sm text-ui-secondary">
                            {collection.assets.length} asset{collection.assets.length === 1 ? '' : 's'} currently assigned to this collection.
                          </p>
                        </div>
                        {isOwner ? (
                          <StudioActionButton
                            type="button"
                            variant="primary"
                            size="lg"
                            className={`${actionButtonClass} `}
                            onClick={() => setIsAddAssetOpen(true)}
                          >
                            Add Asset
                          </StudioActionButton>
                        ) : null}
                      </div>

                      {collection.assets.length === 0 ? (
                        <div className="mt-6 rounded-[20px] border border-ui-border-subtle bg-[var(--t-surface-2)] p-8 text-center">
                          <h4 className="text-base font-semibold text-ui-primary">No assets yet</h4>
                          <p className="mt-2 text-sm text-ui-secondary">
                            {isOwner
                              ? 'Start curating this collection by adding assets from your wallet or marketplace listings.'
                              : 'This collection has not published any assets yet.'}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-6 space-y-3">
                          {collection.assets.map((asset) => {
                            const metaLabel = formatMetaLabel(asset.blockchain || asset.status);
                            return (
                              <div
                                key={asset.id}
                                className="flex cursor-pointer items-center gap-4 rounded-[20px] border border-ui-border-subtle bg-[var(--t-surface-2)] p-4 transition-colors hover:bg-[var(--t-surface-10)]"
                                onClick={() => handleOpenAssetDetails(asset)}
                              >
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[18px] bg-black/10">
                                  <ImageWithFallback
                                    src={asset.image}
                                    alt={asset.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      navigateToMarketplaceCategory({ category: asset.category });
                                    }}
                                    className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted transition-colors hover:text-primary"
                                  >
                                    {getCategoryDisplayLabel(asset.category)}
                                  </button>
                                  <h4 className="mt-1 line-clamp-2 text-base font-semibold text-ui-primary">
                                    {asset.name}
                                  </h4>
                                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ui-secondary">
                                    <span>{asset.price}</span>
                                    <span className="rounded-full bg-[var(--t-surface-10)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ui-muted">
                                      {asset.sourceLabel}
                                    </span>
                                    {metaLabel ? (
                                      <span className="rounded-full bg-[var(--t-surface-10)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ui-muted">
                                        {metaLabel}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                {isOwner ? (
                                  <StudioActionButton
                                    type="button"
                                    variant="secondary"
                                    size="md"
                                    className="shrink-0 text-xs font-semibold"
                                    leftIcon={<Trash2 size={14} />}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleRemoveAsset(asset.id);
                                    }}
                                  >
                                    Remove
                                  </StudioActionButton>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-5">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ui-secondary">Collection Stats</h3>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {[
                          { label: 'Items', value: String(collection.itemCount), accent: 'text-ui-strong' },
                          { label: 'Floor', value: collection.floorPrice, accent: 'text-primary' },
                          { label: 'Volume', value: collection.volume, accent: 'text-ui-strong' },
                          { label: 'Followers', value: String(collection.followerCount), accent: 'text-ui-strong' },
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-[18px] bg-[var(--t-surface-2)] p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ui-muted">{stat.label}</p>
                            <p className={`mt-2 text-lg font-semibold ${stat.accent}`}>{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-5">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ui-muted">Collection Owner</h3>
                      <div className="mt-4 rounded-[18px] bg-[var(--t-surface-2)] p-4">
                        <p className="text-sm font-semibold text-ui-primary">{ownerDisplayName}</p>
                        <p className="mt-1 text-xs text-ui-secondary">{ownerHandle}</p>
                        <p className="mt-3 text-xs leading-5 text-ui-secondary">
                          {isOwner
                            ? 'You created this collection and can edit metadata or curate assets inline.'
                            : 'Follow this collection to track future changes and updates from the owner.'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-5">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ui-muted">Actions</h3>
                      <div className="mt-4 space-y-3">
                        {isOwner ? (
                          <>
                            <StudioActionButton
                              type="button"
                              variant="primary"
                              size="lg"
                              className={`${actionButtonClass} w-full `}
                              leftIcon={<Pencil size={16} />}
                              onClick={() => setIsEditorOpen(true)}
                            >
                              Edit Collection
                            </StudioActionButton>
                            <StudioActionButton
                              type="button"
                              variant="secondary"
                              size="lg"
                              className={`${actionButtonClass} w-full studio-form-secondary`}
                              leftIcon={<Layers3 size={16} />}
                              onClick={() => setIsAddAssetOpen(true)}
                            >
                              Add Asset to Collection
                            </StudioActionButton>
                            <StudioActionButton
                              type="button"
                              variant="secondary"
                              size="lg"
                              className={`${actionButtonClass} w-full studio-form-secondary`}
                              leftIcon={<Trash2 size={16} />}
                              onClick={handleDeleteCollection}
                            >
                              Delete Collection
                            </StudioActionButton>
                          </>
                        ) : (
                          <StudioActionButton
                            type="button"
                            variant={isFollowing ? 'secondary' : 'primary'}
                            size="lg"
                            className={`${actionButtonClass} w-full ${isFollowing ? 'studio-form-secondary' : ''}`}
                            leftIcon={isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                            onClick={handleToggleFollow}
                          >
                            {isFollowing ? 'Following' : 'Follow Collection'}
                          </StudioActionButton>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </StudioModalBody>

            </StudioModalPanel>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <CollectionEditorModal
        isOpen={isEditorOpen}
        mode="edit"
        collection={(collection as CollectionSummary | null) || null}
        onClose={() => setIsEditorOpen(false)}
        onSubmit={handleSaveCollection}
      />

      <AddAssetToCollectionModal
        isOpen={isAddAssetOpen}
        collections={collection ? [collection] : []}
        assetOptions={assetOptions}
        onClose={() => setIsAddAssetOpen(false)}
        onSubmit={handleAddAsset}
      />

      {selectedAsset ? (
        <AssetDetailsModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          zIndexClassName="z-[155]"
        />
      ) : null}
    </>,
    document.body
  );
}
