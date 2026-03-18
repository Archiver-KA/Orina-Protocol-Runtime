import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Package, Sparkles, ShoppingBag, Grid3x3 } from 'lucide-react';
import { toast } from 'sonner';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { useAccount } from 'wagmi';
import { SellerAssetManagementModal } from '@/app/components/seller-asset-management-modal';
import { TransferModal } from '@/app/components/transfer-modal';
import { ListForSaleModal } from '@/app/components/list-for-sale-modal';
import { ReceiptDetailModal } from '@/app/components/receipt-detail-modal';
import { CollectionEditorModal } from '@/app/components/collections/collection-editor-modal';
import { AddAssetToCollectionModal } from '@/app/components/collections/add-asset-to-collection-modal';
import { CollectionDetailsModal } from '@/app/components/collections/collection-details-modal';
import { CollectionsGridPanel } from '@/app/components/collections/collections-grid-panel';
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
import { getTestWalletMyAssets } from '@/utils/testWalletAssetFixtures';
import { ensureAssetMetadataSeedForWalletFixtures } from '@/utils/assetMetadataSync';
import {
  hydrateRuntimeMintedAssetsFromSupabase,
  loadRuntimeMyAssets,
  subscribeToRuntimeMintedAssets,
} from '@/utils/runtimeMintedAssets';
import type { CollectionSummary } from '@/types/collection';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import {
  addAssetToCollection,
  COLLECTIONS_SYNC_EVENT,
  createCollection,
  loadCollectionAssetOptions,
  loadCollectionsByOwner,
  queueCollectionsBackfillForWallet,
  updateCollection,
} from '@/utils/collectionsUtils';

// Mock data for RWA Assets (user minted) - OPTIMIZED: Direct Unsplash URLs for bright, clear photos
const mockRWAAssets = [
  {
    id: 'rwa-1',
    name: 'Luxury Apartment #442',
    type: 'RWA',
    category: 'Real Estate',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop',
    totalAmount: '100',
    availableAmount: '45',
    minPrice: '2.5 ETH',
    status: 'Active',
    mintedDate: '2024-01-15',
    transferable: false,
  },
  {
    id: 'rwa-2',
    name: 'Ferrari 250 GTO',
    type: 'RWA',
    category: 'Vehicles',
    image: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=800&auto=format&fit=crop',
    totalAmount: '1',
    availableAmount: '0',
    minPrice: '18.0 ETH',
    status: 'Sold Out',
    mintedDate: '2024-01-20',
    transferable: false,
  },
  {
    id: 'rwa-3',
    name: 'Diamond Necklace Collection',
    type: 'RWA',
    category: 'Luxury Goods',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&auto=format&fit=crop',
    totalAmount: '50',
    availableAmount: '12',
    minPrice: '3.5 ETH',
    status: 'Active',
    mintedDate: '2024-02-01',
    transferable: false,
  },
  {
    id: 'rwa-4',
    name: 'Penthouse Manhattan #88',
    type: 'RWA',
    category: 'Real Estate',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop',
    totalAmount: '200',
    availableAmount: '156',
    minPrice: '1.2 ETH',
    status: 'Active',
    mintedDate: '2024-01-08',
    transferable: false,
  },
  {
    id: 'rwa-5',
    name: 'Rolex Daytona Platinum',
    type: 'RWA',
    category: 'Luxury Goods',
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&auto=format&fit=crop',
    totalAmount: '10',
    availableAmount: '3',
    minPrice: '4.8 ETH',
    status: 'Active',
    mintedDate: '2024-01-25',
    transferable: false,
  },
  {
    id: 'rwa-6',
    name: 'Vintage Wine Collection 1982',
    type: 'RWA',
    category: 'Collectibles',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop',
    totalAmount: '24',
    availableAmount: '8',
    minPrice: '0.9 ETH',
    status: 'Active',
    mintedDate: '2024-02-03',
    transferable: false,
  },
];

// Mock data for Receipt NFTs (user purchased)
const mockReceiptNFTs = [
  {
    id: 'receipt-1',
    name: 'Beach Villa #123 Receipt',
    type: 'Receipt',
    category: 'Real Estate',
    orderId: 'ORD-1001',
    image: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&auto=format&fit=crop',
    purchaseValue: '5.8 ETH',
    purchaseDate: '2024-02-10',
    seller: '0x742d...9c4F',
    blockchain: 'ETH',
  },
  {
    id: 'receipt-2',
    name: 'Vintage Wine Collection Receipt',
    type: 'Receipt',
    category: 'Collectibles',
    orderId: 'ORD-1002',
    image: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=800&auto=format&fit=crop',
    purchaseValue: '0.8 ETH',
    purchaseDate: '2024-02-03',
    seller: '0x8f3a...2b1D',
    blockchain: 'ETH',
  },
  {
    id: 'receipt-3',
    name: 'Fine Art - Urban Dreams Receipt',
    type: 'Receipt',
    category: 'Art',
    orderId: 'ORD-1003',
    image: 'https://images.unsplash.com/photo-1549887534-1541e9326642?w=800&auto=format&fit=crop',
    purchaseValue: '0.4 ETH',
    purchaseDate: '2024-02-05',
    seller: '0x1c7e...5a9B',
    blockchain: 'ETH',
  },
  {
    id: 'receipt-4',
    name: 'Lamborghini Aventador Receipt',
    type: 'Receipt',
    category: 'Vehicles',
    orderId: 'ORD-1004',
    image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&auto=format&fit=crop',
    purchaseValue: '12.5 ETH',
    purchaseDate: '2024-01-28',
    seller: '0x9a4b...7c2E',
    blockchain: 'ETH',
  },
  {
    id: 'receipt-5',
    name: 'Gold Bar 1kg Receipt',
    type: 'Receipt',
    category: 'Commodities',
    orderId: 'ORD-1005',
    image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&auto=format&fit=crop',
    purchaseValue: '2.1 ETH',
    purchaseDate: '2024-02-01',
    seller: '0x3f8d...4a9C',
    blockchain: 'ETH',
  },
];

// Mock data for Digital NFTs (user owned)
const mockDigitalNFTs = [
  {
    id: 'nft-1',
    name: 'CyberPunk #4421',
    type: 'NFT',
    category: 'Digital Art',
    image: 'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=800&auto=format&fit=crop',
    currentPrice: '0.45 ETH',
    floorPrice: '0.38 ETH',
    collection: 'CyberPunk Society',
    transferable: true,
  },
  {
    id: 'nft-2',
    name: 'Neon Genesis #08',
    type: 'NFT',
    category: 'Digital Art',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop',
    currentPrice: '0.88 ETH',
    floorPrice: '0.75 ETH',
    collection: 'Neon Genesis',
    transferable: true,
  },
  {
    id: 'nft-3',
    name: 'Cyber Shell #12',
    type: 'NFT',
    category: 'Gaming',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop',
    currentPrice: '3.12 ETH',
    floorPrice: '2.95 ETH',
    collection: 'Cyber Shells',
    transferable: true,
  },
  {
    id: 'nft-4',
    name: 'Bored Ape #8942',
    type: 'NFT',
    category: 'PFP',
    image: 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&auto=format&fit=crop',
    currentPrice: '28.5 ETH',
    floorPrice: '25.2 ETH',
    collection: 'Bored Ape Yacht Club',
    transferable: true,
  },
  {
    id: 'nft-5',
    name: 'Azuki #3301',
    type: 'NFT',
    category: 'PFP',
    image: 'https://images.unsplash.com/photo-1633114128174-2f8aa49759b0?w=800&auto=format&fit=crop',
    currentPrice: '8.2 ETH',
    floorPrice: '7.5 ETH',
    collection: 'Azuki',
    transferable: true,
  },
  {
    id: 'nft-6',
    name: 'Doodle #7721',
    type: 'NFT',
    category: 'Art',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&auto=format&fit=crop',
    currentPrice: '2.1 ETH',
    floorPrice: '1.9 ETH',
    collection: 'Doodles',
    transferable: true,
  },
  {
    id: 'nft-7',
    name: 'Moonbird #4455',
    type: 'NFT',
    category: 'PFP',
    image: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=800&auto=format&fit=crop',
    currentPrice: '5.5 ETH',
    floorPrice: '4.8 ETH',
    collection: 'Moonbirds',
    transferable: true,
  },
];

type AssetTab = 'All Assets' | 'RWA Minted' | 'Receipts' | 'NFT Owned';
type AnyAsset = MyAssetRwa | MyAssetReceipt | MyAssetNft;

function parseEthLikeValue(raw: string) {
  const numeric = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function getAssetSortValue(asset: AnyAsset) {
  switch (asset.type) {
    case 'RWA':
      return parseEthLikeValue(asset.minPrice);
    case 'Receipt':
      return parseEthLikeValue(asset.purchaseValue);
    case 'NFT':
      return parseEthLikeValue(asset.currentPrice);
    default:
      return 0;
  }
}

function getAssetSortDate(asset: AnyAsset) {
  switch (asset.type) {
    case 'RWA':
      return Date.parse(asset.mintedDate) || 0;
    case 'Receipt':
      return Date.parse(asset.purchaseDate) || 0;
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
      return next.sort((a, b) => a.name.localeCompare(b.name));
    case 'Z-A':
      return next.sort((a, b) => b.name.localeCompare(a.name));
    case 'Recent':
    default:
      return next.sort((a, b) => getAssetSortDate(b) - getAssetSortDate(a));
  }
}

function mergeById<T extends { id: string }>(primary: T[], fallback: T[]): T[] {
  const merged = new Map<string, T>();
  [...primary, ...fallback].forEach((item) => {
    if (!merged.has(item.id)) {
      merged.set(item.id, item);
    }
  });
  return Array.from(merged.values());
}

export function Assets() {
  const { address, isConnected } = useAccount();
  const { requireWalletActionAsync } = useRequireWalletAction();
  const [activeTab, setActiveTab] = useState<AssetTab>('All Assets');
  const [sortBy, setSortBy] = useState('Recent');
  const [selectedAsset, setSelectedAsset] = useState<AnyAsset | null>(null);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isListForSaleModalOpen, setIsListForSaleModalOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>('');
  const [isReceiptDetailModalOpen, setIsReceiptDetailModalOpen] = useState(false);
  const [ownedCollections, setOwnedCollections] = useState<CollectionSummary[]>([]);
  const [isCollectionEditorOpen, setIsCollectionEditorOpen] = useState(false);
  const [collectionEditorMode, setCollectionEditorMode] = useState<'create' | 'edit'>('create');
  const [selectedCollection, setSelectedCollection] = useState<CollectionSummary | null>(null);
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [runtimeOwnedAssets, setRuntimeOwnedAssets] = useState(() => loadRuntimeMyAssets(address));
  const walletFixture = useMemo(() => getTestWalletMyAssets(address), [address]);
  const hasRuntimeRwa = runtimeOwnedAssets.rwaAssets.length > 0;
  const hasRuntimeNft = runtimeOwnedAssets.nftAssets.length > 0;
  const rwaAssets = hasRuntimeRwa
    ? mergeById(runtimeOwnedAssets.rwaAssets, walletFixture?.rwaAssets ?? [])
    : walletFixture?.rwaAssets ?? mockRWAAssets;
  const receiptAssets = walletFixture?.receiptAssets ?? mockReceiptNFTs;
  const nftAssets = hasRuntimeNft
    ? mergeById(runtimeOwnedAssets.nftAssets, walletFixture?.nftAssets ?? [])
    : walletFixture?.nftAssets ?? mockDigitalNFTs;
  const collectionAssetOptions = useMemo(() => loadCollectionAssetOptions(address), [address]);

  useEffect(() => {
    const refreshRuntimeAssets = () => {
      setRuntimeOwnedAssets(loadRuntimeMyAssets(address));
    };

    refreshRuntimeAssets();
    if (address) {
      void hydrateRuntimeMintedAssetsFromSupabase(address).then(refreshRuntimeAssets);
    }
    return subscribeToRuntimeMintedAssets(refreshRuntimeAssets);
  }, [address]);

  useEffect(() => {
    if (!isConnected || !address) return;
    // C2.3: seed persisted asset metadata for deterministic A/B fixtures (owned + linked listing ids).
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
  const totalRWA = rwaAssets.length;
  const totalReceipts = receiptAssets.length;
  const totalNFTs = nftAssets.length;
  const sortedRwaAssets = useMemo(() => sortAssets(rwaAssets, sortBy), [rwaAssets, sortBy]);
  const sortedReceiptAssets = useMemo(() => sortAssets(receiptAssets, sortBy), [receiptAssets, sortBy]);
  const sortedNftAssets = useMemo(() => sortAssets(nftAssets, sortBy), [nftAssets, sortBy]);

  const showRwaSection = activeTab === 'All Assets' || activeTab === 'RWA Minted';
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

    const allowed = await requireWalletActionAsync({
      capability: 'protocol_asset_write',
      actionLabel: collectionEditorMode === 'create' ? 'create a collection' : 'edit this collection',
      fallbackPage: 'assets',
    });
    if (!allowed) return;

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

  const handleAddAssetToCollection = async (collectionId: string, assetId: string) => {
    if (!address) {
      toast.error('Connect wallet to manage collections');
      return;
    }

    const allowed = await requireWalletActionAsync({
      capability: 'protocol_asset_write',
      actionLabel: 'add an asset to this collection',
      fallbackPage: 'assets',
    });
    if (!allowed) return;

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
          setSelectedReceiptId('');
        }}
        receiptId={selectedReceiptId}
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
        onCreateCollection={() => {
          setIsAddAssetModalOpen(false);
          handleOpenCreateCollection();
        }}
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
        <StudioPanel className="rounded-[24px] p-6 backdrop-blur-[10px]">
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-xs text-ui-muted uppercase tracking-widest font-bold">Total Portfolio Value</p>
              <h2 className="text-4xl font-bold text-ui-primary mt-1">$142,892.45</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-primary text-sm font-bold flex items-center">
                  <TrendingUp size={14} className="mr-1" />
                  +12.4%
                </span>
                <span className="text-ui-muted text-xs font-medium">vs last week</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-xs text-ui-muted uppercase tracking-widest font-bold mb-1">RWA</p>
                <p className="text-2xl font-bold text-ui-primary">{totalRWA}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-ui-muted uppercase tracking-widest font-bold mb-1">Receipts</p>
                <p className="text-2xl font-bold text-ui-primary">{totalReceipts}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-ui-muted uppercase tracking-widest font-bold mb-1">NFTs</p>
                <p className="text-2xl font-bold text-ui-primary">{totalNFTs}</p>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-44 relative">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2CC295" stopOpacity="0.2"></stop>
                  <stop offset="100%" stopColor="#2CC295" stopOpacity="0"></stop>
                </linearGradient>
              </defs>
              <path
                d="M0 200 L0 150 C100 140, 200 170, 300 120 S400 100, 500 130 S600 40, 700 80 S800 60, 900 30 L1000 20 L1000 200 Z"
                fill="url(#chartGradient)"
              />
              <path
                d="M0 150 C100 140, 200 170, 300 120 S400 100, 500 130 S600 40, 700 80 S800 60, 900 30 L1000 20"
                fill="none"
                stroke="#2CC295"
                strokeWidth="3"
              />
            </svg>
          </div>
        </StudioPanel>

        {/* Pill Segmented Toggle + Sort */}
        <StudioPanel className="relative z-[80] rounded-[24px] p-3 backdrop-blur-[10px]">
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-4">
            {/* Pill Segmented Toggle */}
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
                onClick={() => setActiveTab('RWA Minted')}
                active={activeTab === 'RWA Minted'}
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={14} />
                  RWA Minted ({totalRWA})
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

            {/* Sort Dropdown */}
            <div className="relative z-[90] flex items-center gap-3 shrink-0">
              <span className="text-xs text-ui-muted font-bold uppercase tracking-widest">Sort By:</span>
              <CustomDropdown
                options={['Recent', 'Value: High to Low', 'Value: Low to High', 'A-Z', 'Z-A']}
                defaultOption={sortBy}
                onChange={setSortBy}
                variant="compact"
                className="w-[220px] z-[100]"
              />
            </div>
          </div>
        </StudioPanel>

        <StudioPanel className="rounded-[24px] p-6 backdrop-blur-[10px]">
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
                  className="studio-form-secondary text-sm font-bold tracking-tight transition-all hover:border-[#2CC295]/35 hover:bg-[var(--t-surface-hover)] hover:text-ui-primary"
                >
                  Create Collection
                </StudioActionButton>
                <StudioActionButton
                  type="button"
                  onClick={() => setIsAddAssetModalOpen(true)}
                  variant="primary"
                  size="lg"
                  className="text-sm font-bold tracking-tight shadow-lg shadow-[#2CC295]/20"
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
        </StudioPanel>

        {/* Assets Grid */}
        <div className="relative z-[10] pb-20">
          {!hasVisibleAssets && (
            <EmptyStateCard
              icon={<Package size={30} className="text-ui-muted" />}
              title="No assets found"
              description="Start by minting RWA or purchasing NFTs"
              className="py-16 px-6 text-center"
            />
          )}

          {hasVisibleAssets && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
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
                      onOpen={(receiptId) => {
                        setSelectedReceiptId(receiptId);
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
