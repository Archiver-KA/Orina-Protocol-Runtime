import { useState, useMemo, useEffect } from 'react';
import { Package, Sparkles, ShoppingBag, Grid3x3, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { SellerAssetManagementModal } from '@/app/components/seller-asset-management-modal';
import { TransferModal } from '@/app/components/transfer-modal';
import { ListForSaleModal } from '@/app/components/list-for-sale-modal';
import { ReceiptDetailModal } from '@/app/components/receipt-detail-modal';
import { CollectionEditorModal } from '@/app/components/collections/collection-editor-modal';
import { AddAssetToCollectionModal } from '@/app/components/collections/add-asset-to-collection-modal';
import { CollectionDetailsModal } from '@/app/components/collections/collection-details-modal';
import { CollectionsGridPanel } from '@/app/components/collections/collections-grid-panel';
import { WarehouseInventoryList } from '@/app/components/warehouse-inventory-list';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { EmptyStateCard } from '@/app/components/ui/empty-state-card';
import { StudioPillGroup, StudioPillButton } from '@/app/components/ui/studio-pill-group';
import { StudioPageHeader } from '@/app/components/ui/studio-page-header';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import {
  MyAssetNftCard,
  MyAssetReceiptCard,
  MyAssetRwaCard,
  type MyAssetNft,
  type MyAssetReceipt,
  type MyAssetRwa,
} from '@/app/components/cards/my-asset-cards';
import { ensureAssetMetadataSeedForWalletFixtures } from '@/utils/assetMetadataSync';
import {
  hydrateRuntimeMintedAssetsFromSupabase,
  loadRuntimeMintedAssets,
  loadRuntimeMyAssets,
  subscribeToRuntimeMintedAssets,
} from '@/utils/runtimeMintedAssets';
import {
  hydrateRuntimeReceiptsFromSupabase,
  loadRuntimeReceipts,
  subscribeToRuntimeReceipts,
  syncRuntimeReceiptsForWallet,
} from '@/utils/runtimeReceipts';
import {
  buildCanonicalOwnedPortfolio,
  formatEthDisplay,
} from '@/utils/assetsPortfolio';
import {
  hydrateMarketplaceCatalogFromSupabase,
  loadMarketplaceCatalogSync,
  MARKETPLACE_CATALOG_SYNC_EVENT,
} from '@/utils/marketplaceCatalog';
import { buildWarehouseInventory, sortWarehouseInventory } from '@/utils/warehouseInventory';
import type { CollectionSummary } from '@/types/collection';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';
import {
  addAssetToCollection,
  COLLECTIONS_SYNC_EVENT,
  createCollection,
  loadCollectionAssetOptions,
  loadCollectionsByOwner,
  queueCollectionsBackfillForWallet,
  updateCollection,
} from '@/utils/collectionsUtils';

type AssetTab = 'All Assets' | 'Warehouse' | 'Receipts' | 'NFT Owned';
type AnyAsset = MyAssetRwa | MyAssetReceipt | MyAssetNft;

function normalizeMatchValue(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function findMarketplaceListingForOwnedRwa(
  asset: MyAssetRwa,
  walletAddress: string | undefined,
  runtimeMintedRecords: Array<{ id: string; assetType: 'RWA' | 'NFT'; details: { id?: string; tokenId?: string; onchainAssetId?: string; name?: string } }>,
  marketplaceCatalog: Array<{ id: string; tokenId: string; onchainAssetId?: string; name: string; seller: { address: string }; availableSlots?: number }>,
) {
  const normalizedWallet = normalizeMatchValue(walletAddress);
  if (!normalizedWallet) return null;

  const runtimeRecord = runtimeMintedRecords.find((record) => {
    if (record.assetType !== 'RWA') return false;
    const candidates = [record.id, record.details.id, record.details.tokenId, record.details.onchainAssetId]
      .map(normalizeMatchValue)
      .filter(Boolean);
    return (
      candidates.includes(normalizeMatchValue(asset.id)) ||
      normalizeMatchValue(record.details.name) === normalizeMatchValue(asset.name)
    );
  });

  const candidateIds = new Set(
    [
      asset.id,
      runtimeRecord?.id,
      runtimeRecord?.details.id,
      runtimeRecord?.details.tokenId,
      runtimeRecord?.details.onchainAssetId,
    ]
      .map(normalizeMatchValue)
      .filter(Boolean),
  );

  const exactMatch = marketplaceCatalog.find((marketplaceAsset) => {
    if (normalizeMatchValue(marketplaceAsset.seller.address) !== normalizedWallet) return false;
    return (
      candidateIds.has(normalizeMatchValue(marketplaceAsset.id)) ||
      candidateIds.has(normalizeMatchValue(marketplaceAsset.tokenId)) ||
      candidateIds.has(normalizeMatchValue(marketplaceAsset.onchainAssetId))
    );
  });

  if (exactMatch) return exactMatch;

  const nameMatches = marketplaceCatalog.filter((marketplaceAsset) => (
    normalizeMatchValue(marketplaceAsset.seller.address) === normalizedWallet &&
    normalizeMatchValue(marketplaceAsset.name) === normalizeMatchValue(asset.name)
  ));

  return nameMatches.length === 1 ? nameMatches[0] : null;
}

function overlayMarketplaceListingState(
  rwaAssets: MyAssetRwa[],
  walletAddress: string | undefined,
  runtimeMintedRecords: Array<{ id: string; assetType: 'RWA' | 'NFT'; details: { id?: string; tokenId?: string; onchainAssetId?: string; name?: string } }>,
  marketplaceCatalog: Array<{ id: string; tokenId: string; onchainAssetId?: string; name: string; seller: { address: string }; availableSlots?: number; totalSlots?: number; price: string }>,
) {
  return rwaAssets.map((asset) => {
    const listing = findMarketplaceListingForOwnedRwa(asset, walletAddress, runtimeMintedRecords, marketplaceCatalog);
    if (!listing) return asset;

    const nextAvailable = typeof listing.availableSlots === 'number'
      ? listing.availableSlots
      : asset.availableAmount;
    const nextTotal = typeof listing.totalSlots === 'number'
      ? listing.totalSlots
      : asset.totalAmount;

    return {
      ...asset,
      status: Number(nextAvailable) <= 0 ? 'Sold Out' : 'Active',
      availableAmount: nextAvailable,
      totalAmount: nextTotal,
      minPrice: listing.price || asset.minPrice,
    };
  });
}

function coerceText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function getAssetSortValue(asset: AnyAsset) {
  switch (asset.type) {
    case 'RWA':
      return Number.parseFloat(coerceText(asset.minPrice).replace(/[^0-9.]/g, '')) || 0;
    case 'Receipt':
      return Number.parseFloat(coerceText(asset.purchaseValue).replace(/[^0-9.]/g, '')) || 0;
    case 'NFT':
      return Number.parseFloat(coerceText(asset.currentPrice).replace(/[^0-9.]/g, '')) || 0;
    default:
      return 0;
  }
}

function getAssetSortDate(asset: AnyAsset) {
  switch (asset.type) {
    case 'RWA':
      return Date.parse(coerceText(asset.mintedDate)) || 0;
    case 'Receipt':
      return Date.parse(coerceText(asset.purchaseDate)) || 0;
    case 'NFT':
      return 0;
    default:
      return 0;
  }
}

function sortAssets<T extends AnyAsset>(items: T[], sortBy: string): T[] {
  const next = [...items];

  switch (sortBy) {
    case 'Value: High to Low':
      return next.sort((a, b) => getAssetSortValue(b) - getAssetSortValue(a));
    case 'Value: Low to High':
      return next.sort((a, b) => getAssetSortValue(a) - getAssetSortValue(b));
    case 'A-Z':
      return next.sort((a, b) => coerceText(a.name, 'Untitled Asset').localeCompare(coerceText(b.name, 'Untitled Asset')));
    case 'Z-A':
      return next.sort((a, b) => coerceText(b.name, 'Untitled Asset').localeCompare(coerceText(a.name, 'Untitled Asset')));
    case 'Recent':
    default:
      return next.sort((a, b) => getAssetSortDate(b) - getAssetSortDate(a));
  }
}

export function Assets() {
  const { address, isConnected } = useEffectiveViewer();
  const { assetAddress, chainId, marketplaceAddress, receiptNftAddress } = useProtocolDataNetwork();
  const { requireWalletActionAsync } = useRequireWalletAction();
  const [activeTab, setActiveTab] = useState<AssetTab>('All Assets');
  const [selectedAsset, setSelectedAsset] = useState<AnyAsset | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<MyAssetReceipt | null>(null);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isListForSaleModalOpen, setIsListForSaleModalOpen] = useState(false);
  const [isReceiptDetailModalOpen, setIsReceiptDetailModalOpen] = useState(false);
  const [ownedCollections, setOwnedCollections] = useState<CollectionSummary[]>([]);
  const [isCollectionEditorOpen, setIsCollectionEditorOpen] = useState(false);
  const [collectionEditorMode, setCollectionEditorMode] = useState<'create' | 'edit'>('create');
  const [selectedCollection, setSelectedCollection] = useState<CollectionSummary | null>(null);
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const runtimeAssetScope = useMemo(() => ({
    chainId,
    assetContract: assetAddress,
  }), [assetAddress, chainId]);
  const receiptScope = useMemo(() => ({
    chainId,
    marketplaceContract: marketplaceAddress,
    assetContract: assetAddress,
    receiptContract: receiptNftAddress,
  }), [assetAddress, chainId, marketplaceAddress, receiptNftAddress]);
  const emptyOwnedAssets = useMemo(() => ({
    rwaAssets: [] as MyAssetRwa[],
    receiptAssets: [] as MyAssetReceipt[],
    nftAssets: [] as MyAssetNft[],
  }), []);
  const [runtimeOwnedAssets, setRuntimeOwnedAssets] = useState(() => ({
    ...emptyOwnedAssets,
    ...(address ? loadRuntimeMyAssets(address, runtimeAssetScope) : {}),
    receiptAssets: address ? loadRuntimeReceipts(address, receiptScope) : [],
  }));
  const [runtimeMintedRecords, setRuntimeMintedRecords] = useState(() => (
    address ? loadRuntimeMintedAssets(address, runtimeAssetScope) : []
  ));
  const [marketplaceCatalog, setMarketplaceCatalog] = useState(() => loadMarketplaceCatalogSync());
  const runtimeOwnedAssetsForDisplay = useMemo(() => ({
    ...runtimeOwnedAssets,
    rwaAssets: overlayMarketplaceListingState(
      runtimeOwnedAssets.rwaAssets,
      address,
      runtimeMintedRecords,
      marketplaceCatalog,
    ),
  }), [address, marketplaceCatalog, runtimeMintedRecords, runtimeOwnedAssets]);
  const portfolio = useMemo(
    () => buildCanonicalOwnedPortfolio(address, runtimeOwnedAssetsForDisplay),
    [address, runtimeOwnedAssetsForDisplay],
  );
  const rwaAssets = portfolio.rwaAssets;
  const receiptAssets = portfolio.receiptAssets;
  const nftAssets = portfolio.nftAssets;
  const collectionAssetOptions = useMemo(
    () => loadCollectionAssetOptions(address, runtimeAssetScope),
    [address, runtimeAssetScope],
  );

  useEffect(() => {
    const refreshRuntimeAssets = () => {
      if (!address) {
        setRuntimeOwnedAssets(emptyOwnedAssets);
        setRuntimeMintedRecords([]);
        return;
      }
      setRuntimeOwnedAssets({
        ...loadRuntimeMyAssets(address, runtimeAssetScope),
        receiptAssets: loadRuntimeReceipts(address, receiptScope),
      });
      setRuntimeMintedRecords(loadRuntimeMintedAssets(address, runtimeAssetScope));
    };

    refreshRuntimeAssets();
    if (address) {
      const hydrationTasks: Array<Promise<unknown>> = [
        hydrateRuntimeMintedAssetsFromSupabase(address, runtimeAssetScope),
        hydrateRuntimeReceiptsFromSupabase(address, receiptScope),
      ];
      if (isConnected) {
        hydrationTasks.push(
          syncRuntimeReceiptsForWallet(address, receiptScope, { promptOnAuthMissing: false })
            .catch((error) => {
              console.warn('[Assets] Failed to trigger receipt sync', error);
              return null;
            }),
        );
      }
      void Promise.allSettled(hydrationTasks).then(refreshRuntimeAssets);
    }
    const unsubscribeMinted = subscribeToRuntimeMintedAssets(refreshRuntimeAssets);
    const unsubscribeReceipts = subscribeToRuntimeReceipts(refreshRuntimeAssets);
    return () => {
      unsubscribeMinted();
      unsubscribeReceipts();
    };
  }, [address, emptyOwnedAssets, isConnected, receiptScope, runtimeAssetScope]);

  useEffect(() => {
    const refreshMarketplaceCatalog = () => {
      setMarketplaceCatalog(loadMarketplaceCatalogSync());
    };

    refreshMarketplaceCatalog();
    void hydrateMarketplaceCatalogFromSupabase().then(refreshMarketplaceCatalog);
    window.addEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, refreshMarketplaceCatalog as EventListener);
    return () => {
      window.removeEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, refreshMarketplaceCatalog as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isConnected || !address) return;
    // Seed deterministic owned fixture metadata only; public listing mocks are no longer bridged.
    void ensureAssetMetadataSeedForWalletFixtures(address);
  }, [address, isConnected]);

  useEffect(() => {
    const refreshCollections = () => {
      if (!address) {
        setOwnedCollections([]);
        return;
      }
      queueCollectionsBackfillForWallet(address);
      setOwnedCollections(loadCollectionsByOwner(address));
    };

    refreshCollections();
    window.addEventListener(COLLECTIONS_SYNC_EVENT, refreshCollections as EventListener);
    return () => {
      window.removeEventListener(COLLECTIONS_SYNC_EVENT, refreshCollections as EventListener);
    };
  }, [address]);

  // Calculate totals
  const totalRWA = portfolio.typeCounts.rwa;
  const totalReceipts = portfolio.typeCounts.receipts;
  const totalNFTs = portfolio.typeCounts.nfts;
  const sortedRwaAssets = useMemo(() => sortAssets(rwaAssets, 'Recent'), [rwaAssets]);
  const sortedReceiptAssets = useMemo(() => sortAssets(receiptAssets, 'Recent'), [receiptAssets]);
  const sortedNftAssets = useMemo(() => sortAssets(nftAssets, 'Recent'), [nftAssets]);
  const warehouseItems = useMemo(
    () =>
      sortWarehouseInventory(
        buildWarehouseInventory({
          walletAddress: address,
          rwaAssets,
          runtimeRecords: runtimeMintedRecords,
          marketplaceAssets: marketplaceCatalog,
        }),
        'Recent',
      ),
    [address, marketplaceCatalog, rwaAssets, runtimeMintedRecords],
  );

  const showRwaSection = activeTab === 'All Assets';
  const showWarehouseSection = activeTab === 'Warehouse';
  const showReceiptSection = activeTab === 'All Assets' || activeTab === 'Receipts';
  const showNftSection = activeTab === 'All Assets' || activeTab === 'NFT Owned';
  const hasVisibleAssets =
    (showRwaSection && sortedRwaAssets.length > 0) ||
    (showReceiptSection && sortedReceiptAssets.length > 0) ||
    (showNftSection && sortedNftAssets.length > 0);
  const visibleAssets = useMemo<AnyAsset[]>(() => {
    const items: AnyAsset[] = [];

    if (showRwaSection) items.push(...sortedRwaAssets);
    if (showReceiptSection) items.push(...sortedReceiptAssets);
    if (showNftSection) items.push(...sortedNftAssets);

    return items;
  }, [
    showNftSection,
    showReceiptSection,
    showRwaSection,
    sortedNftAssets,
    sortedReceiptAssets,
    sortedRwaAssets,
  ]);

  const handleOpenCreateCollection = () => {
    setIsAddAssetModalOpen(false);
    setCollectionEditorMode('create');
    setSelectedCollection(null);
    setIsCollectionEditorOpen(true);
  };

  const handleOpenEditCollection = (collectionId: string) => {
    const nextCollection = ownedCollections.find((item) => item.id === collectionId) || null;
    if (!nextCollection) {
      toast.error('Collection not found');
      return;
    }
    setCollectionEditorMode('edit');
    setSelectedCollection(nextCollection);
    setIsCollectionEditorOpen(true);
  };

  const handleSaveCollection = async (draft: {
    name: string;
    category: string;
    bio: string;
    tags: string[];
    coverImage: string;
    itemIds: string[];
  }) => {
    if (!address) {
      toast.error('Connect wallet to manage collections');
      return;
    }

    const continueSaveCollection = async () => {
      if (collectionEditorMode === 'create') {
        const created = createCollection(address, draft);
        setSelectedCollection(created);
        toast.success(`Created collection "${created.name}"`);
      } else if (selectedCollection) {
        const updated = updateCollection(address, selectedCollection.id, draft);
        if (updated) {
          setSelectedCollection(updated);
          toast.success(`Updated collection "${updated.name}"`);
        }
      }

      setIsCollectionEditorOpen(false);
    };

    const allowed = await requireWalletActionAsync({
      capability: 'protocol_asset_write',
      actionLabel: collectionEditorMode === 'create' ? 'create a collection' : 'edit this collection',
      fallbackPage: 'assets',
      onSecurityCheckConfirmed: continueSaveCollection,
    });
    if (!allowed) return;

    await continueSaveCollection();
  };

  const handleAddAssetToCollection = async (collectionId: string, assetId: string) => {
    if (!address) {
      toast.error('Connect wallet to manage collections');
      return;
    }

    const continueAddAssetToCollection = async () => {
      const updated = addAssetToCollection(address, collectionId, assetId);
      if (!updated) {
        toast.error('Unable to add asset to collection');
        return;
      }

      const addedAsset = collectionAssetOptions.find((asset) => asset.id === assetId);
      toast.success(
        addedAsset
          ? `Added "${addedAsset.name}" to "${updated.name}"`
          : `Added asset to "${updated.name}"`
      );
      setIsAddAssetModalOpen(false);
    };

    const allowed = await requireWalletActionAsync({
      capability: 'protocol_asset_write',
      actionLabel: 'add an asset to this collection',
      fallbackPage: 'assets',
      onSecurityCheckConfirmed: continueAddAssetToCollection,
    });
    if (!allowed) return;

    await continueAddAssetToCollection();
  };

  return (
    <div className="assets-page-shell h-full flex flex-col overflow-hidden relative bg-ui-page">
      <style>{`
        .assets-page-shell {
          isolation: isolate;
        }
        .assets-page-shell .dropdown-panel {
          background: var(--t-dropdown-glass-bg) !important;
          backdrop-filter: blur(20px);
          border: 1px solid var(--t-border-subtle);
          z-index: 9999 !important;
        }
      `}</style>

      {/* Seller Asset Management Modal */}
      <SellerAssetManagementModal
        isOpen={isSellerModalOpen}
        onClose={() => {
          setIsSellerModalOpen(false);
          setSelectedAsset(null);
        }}
        asset={selectedAsset}
      />

      {/* Transfer Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setSelectedAsset(null);
        }}
        asset={selectedAsset}
      />

      {/* List for Sale Modal */}
      <ListForSaleModal
        isOpen={isListForSaleModalOpen}
        onClose={() => {
          setIsListForSaleModalOpen(false);
          setSelectedAsset(null);
        }}
        asset={selectedAsset}
      />

      {/* Receipt Detail Modal */}
      <ReceiptDetailModal
        isOpen={isReceiptDetailModalOpen}
        onClose={() => {
          setIsReceiptDetailModalOpen(false);
          setSelectedReceipt(null);
        }}
        receipt={selectedReceipt}
      />

      <CollectionEditorModal
        isOpen={isCollectionEditorOpen}
        mode={collectionEditorMode}
        collection={selectedCollection}
        onClose={() => {
          setIsCollectionEditorOpen(false);
          setSelectedCollection(null);
        }}
        onSubmit={handleSaveCollection}
      />

      <AddAssetToCollectionModal
        isOpen={isAddAssetModalOpen}
        collections={ownedCollections}
        assetOptions={collectionAssetOptions}
        onClose={() => setIsAddAssetModalOpen(false)}
        onSubmit={handleAddAssetToCollection}
        onCreateCollection={handleOpenCreateCollection}
      />

      <CollectionDetailsModal
        isOpen={isCollectionModalOpen}
        collectionId={selectedCollectionId}
        onClose={() => {
          setIsCollectionModalOpen(false);
          setSelectedCollectionId(null);
        }}
      />

      {/* Content Wrapper - Scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-6 relative z-10">
        <StudioPageHeader title="My Asset" compact />

        {/* Portfolio Overview */}
        <StudioPanel elevation="none" className="rounded-[24px] p-6 backdrop-blur-[10px]">
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-xs text-ui-muted uppercase tracking-widest font-semibold">Portfolio Snapshot</p>
              <h2 className="text-4xl font-semibold text-ui-primary mt-1">
                {formatEthDisplay(portfolio.totalEstimatedEth)}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-ui-muted text-xs font-medium">
                  {portfolio.totalAssets} tracked assets on {portfolio.networkLabel}
                </span>
                {portfolio.fixtureWallet && (
                  <span className="text-primary text-xs font-semibold">
                    Sample data added
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-xs text-ui-muted uppercase tracking-widest font-semibold mb-1">RWA</p>
                <p className="text-2xl font-semibold text-ui-primary">{totalRWA}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-ui-muted uppercase tracking-widest font-semibold mb-1">Receipts</p>
                <p className="text-2xl font-semibold text-ui-primary">{totalReceipts}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-ui-muted uppercase tracking-widest font-semibold mb-1">NFTs</p>
                <p className="text-2xl font-semibold text-ui-primary">{totalNFTs}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-ui-muted">
                <span>RWA Minted</span>
                <span>{formatEthDisplay(portfolio.typeValueEth.rwa)}</span>
              </div>
              <div className="h-2 rounded-full bg-ui-card">
                <div
                  className="h-full rounded-full bg-[#2CC295]"
                  style={{
                    width: `${portfolio.totalEstimatedEth > 0 ? (portfolio.typeValueEth.rwa / portfolio.totalEstimatedEth) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-ui-muted">
                <span>Receipts</span>
                <span>{formatEthDisplay(portfolio.typeValueEth.receipts)}</span>
              </div>
              <div className="h-2 rounded-full bg-ui-card">
                <div
                  className="h-full rounded-full bg-violet-400"
                  style={{
                    width: `${portfolio.totalEstimatedEth > 0 ? (portfolio.typeValueEth.receipts / portfolio.totalEstimatedEth) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-ui-muted">
                <span>NFT Owned</span>
                <span>{formatEthDisplay(portfolio.typeValueEth.nfts)}</span>
              </div>
              <div className="h-2 rounded-full bg-ui-card">
                <div
                  className="h-full rounded-full bg-sky-400"
                  style={{
                    width: `${portfolio.totalEstimatedEth > 0 ? (portfolio.typeValueEth.nfts / portfolio.totalEstimatedEth) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </StudioPanel>

        {/* Pill Segmented Toggle + Sort */}
        <StudioPanel className="relative z-[80] rounded-[24px] p-3 backdrop-blur-[10px]">
          <div className="flex flex-wrap items-center gap-4">
            <StudioPillGroup className="flex-wrap">
              <StudioPillButton
                onClick={() => setActiveTab('All Assets')}
                active={activeTab === 'All Assets'}
              >
                <span className="flex items-center gap-2">
                  <Grid3x3 size={14} />
                  All Assets
                </span>
              </StudioPillButton>
              <StudioPillButton
                onClick={() => setActiveTab('Warehouse')}
                active={activeTab === 'Warehouse'}
              >
                <span className="flex items-center gap-2">
                  <Boxes size={14} />
                  Warehouse ({warehouseItems.length})
                </span>
              </StudioPillButton>
              <StudioPillButton
                onClick={() => setActiveTab('Receipts')}
                active={activeTab === 'Receipts'}
              >
                <span className="flex items-center gap-2">
                  <Package size={14} />
                  Receipts ({totalReceipts})
                </span>
              </StudioPillButton>
              <StudioPillButton
                onClick={() => setActiveTab('NFT Owned')}
                active={activeTab === 'NFT Owned'}
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag size={14} />
                  NFT Owned ({totalNFTs})
                </span>
              </StudioPillButton>
            </StudioPillGroup>
          </div>
        </StudioPanel>

        <div className="rounded-[24px] p-6">
          <CollectionsGridPanel
            title="My Collections"
            subtitle="Create and curate collections from assets owned or managed by this wallet."
            collections={ownedCollections}
            actionLabel="Manage Collection"
            emptyTitle="No collections yet"
            emptyDescription="Create a collection and start grouping owned assets or marketplace listings into themed sets."
            headerActions={
              <div className="flex flex-wrap items-center gap-3">
                <StudioActionButton
                  type="button"
                  onClick={handleOpenCreateCollection}
                  variant="secondary"
                  size="lg"
                  className="studio-form-secondary text-sm font-semibold tracking-tight transition-all hover:border-[#2CC295]/35 hover:bg-[var(--t-surface-hover)] hover:text-ui-primary"
                >
                  Create Collection
                </StudioActionButton>
                <StudioActionButton
                  type="button"
                  onClick={() => {
                    if (ownedCollections.length === 0 || collectionAssetOptions.length === 0) {
                      handleOpenCreateCollection();
                      return;
                    }
                    setIsAddAssetModalOpen(true);
                  }}
                  variant="primary"
                  size="lg"
                  className="text-sm font-semibold tracking-tight"
                >
                  Add Asset to Collection
                </StudioActionButton>
              </div>
            }
            onCollectionClick={(collectionId) => {
              setSelectedCollectionId(collectionId);
              setIsCollectionModalOpen(true);
            }}
          />
        </div>

        {/* Assets Grid */}
        <div className="relative z-[10] pb-20">
          {showWarehouseSection ? (
            <WarehouseInventoryList
              items={warehouseItems}
              onManage={(asset) => {
                setSelectedAsset(asset);
                setIsSellerModalOpen(true);
              }}
            />
          ) : null}

          {!showWarehouseSection && !hasVisibleAssets && (
            <EmptyStateCard
              icon={<Package size={30} className="text-ui-muted" />}
              title="No assets found"
              description={
                address
                  ? 'No assets are available for this wallet yet.'
                  : 'Connect a wallet to inspect owned RWA, receipt NFTs, and digital NFTs.'
              }
              className="py-16 px-6 text-center"
            />
          )}

          {!showWarehouseSection && hasVisibleAssets && (
            <div className="grid grid-cols-2 gap-[var(--t-market-grid-gap)] md:grid-cols-2 xl:grid-cols-3">
              {visibleAssets.map((asset) => {
                if (asset.type === 'RWA') {
                  return (
                    <MyAssetRwaCard
                      key={asset.id}
                      asset={asset}
                      onManage={(a) => {
                        setSelectedAsset(a);
                        setIsSellerModalOpen(true);
                      }}
                    />
                  );
                }

                if (asset.type === 'Receipt') {
                  return (
                    <MyAssetReceiptCard
                      key={asset.id}
                      asset={asset}
                      onOpen={() => {
                        setSelectedReceipt(asset);
                        setIsReceiptDetailModalOpen(true);
                      }}
                    />
                  );
                }

                return (
                  <MyAssetNftCard
                    key={asset.id}
                    asset={asset}
                    onTransfer={(a) => {
                      setSelectedAsset(a);
                      setIsTransferModalOpen(true);
                    }}
                    onListForSale={(a) => {
                      setSelectedAsset(a);
                      setIsListForSaleModalOpen(true);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
