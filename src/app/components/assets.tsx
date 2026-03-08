import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { TrendingUp, Package, Sparkles, ShoppingBag, Grid3x3 } from 'lucide-react';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { useAccount } from 'wagmi';
import { SellerAssetManagementModal } from '@/app/components/seller-asset-management-modal';
import { TransferModal } from '@/app/components/transfer-modal';
import { ListForSaleModal } from '@/app/components/list-for-sale-modal';
import { ReceiptDetailModal } from '@/app/components/receipt-detail-modal';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { EmptyStateCard } from '@/app/components/ui/empty-state-card';
import { StudioPillGroup, StudioPillButton } from '@/app/components/ui/studio-pill-group';
import { StudioPageHeader } from '@/app/components/ui/studio-page-header';
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

function AssetSectionHeader({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2CC295]/30 bg-[#2CC295]/15">
          <span className="text-[12px] font-bold leading-[18px] text-primary">{step}</span>
        </div>
        <h2 className="text-[20px] font-bold leading-[30px] text-ui-primary">{title}</h2>
      </div>
      <p className="pl-11 text-[13px] leading-5 text-ui-secondary">
        {description}
      </p>
    </div>
  );
}

function AssetSection({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-7">
      <AssetSectionHeader step={step} title={title} description={description} />
      {children}
    </section>
  );
}

export function Assets() {
  const [activeTab, setActiveTab] = useState<AssetTab>('All Assets');
  const [sortBy, setSortBy] = useState('Recent');
  const [selectedAsset, setSelectedAsset] = useState<AnyAsset | null>(null);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isListForSaleModalOpen, setIsListForSaleModalOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>('');
  const [isReceiptDetailModalOpen, setIsReceiptDetailModalOpen] = useState(false);

  const { address, isConnected } = useAccount();
  const walletFixture = useMemo(() => getTestWalletMyAssets(address), [address]);
  const rwaAssets = walletFixture?.rwaAssets ?? mockRWAAssets;
  const receiptAssets = walletFixture?.receiptAssets ?? mockReceiptNFTs;
  const nftAssets = walletFixture?.nftAssets ?? mockDigitalNFTs;

  useEffect(() => {
    if (!isConnected || !address) return;
    // C2.3: seed persisted asset metadata for deterministic A/B fixtures (owned + linked listing ids).
    void ensureAssetMetadataSeedForWalletFixtures(address);
  }, [address, isConnected]);

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

        {/* Asset Sections */}
        <div className="relative z-[10] space-y-20 pb-20">
          {!hasVisibleAssets && (
            <EmptyStateCard
              icon={<Package size={30} className="text-ui-muted" />}
              title="No assets found"
              description="Start by minting RWA or purchasing NFTs"
              className="py-16 px-6 text-center"
            />
          )}

          {showRwaSection && sortedRwaAssets.length > 0 && (
            <AssetSection
              step="01"
              title="RWA Asset Cards"
              description="On-chain real-world assets with ownership status, available supply, minimum price, and seller management action."
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {sortedRwaAssets.map((asset) => (
                  <MyAssetRwaCard
                    key={asset.id}
                    asset={asset}
                    onManage={(a) => {
                      setSelectedAsset(a);
                      setIsSellerModalOpen(true);
                    }}
                  />
                ))}
              </div>
            </AssetSection>
          )}

          {showReceiptSection && sortedReceiptAssets.length > 0 && (
            <AssetSection
              step="02"
              title="Receipt NFT Cards"
              description="Purchase receipts minted on-chain as non-transferable proof of completed acquisition and settlement."
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {sortedReceiptAssets.map((asset) => (
                  <MyAssetReceiptCard
                    key={asset.id}
                    asset={asset}
                    onOpen={(receiptId) => {
                      setSelectedReceiptId(receiptId);
                      setIsReceiptDetailModalOpen(true);
                    }}
                  />
                ))}
              </div>
            </AssetSection>
          )}

          {showNftSection && sortedNftAssets.length > 0 && (
            <AssetSection
              step="03"
              title="Digital NFT Cards"
              description="On-chain digital assets with current pricing, floor pricing, transfer action, and secondary sale listing flow."
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {sortedNftAssets.map((asset) => (
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
                ))}
              </div>
            </AssetSection>
          )}
        </div>
      </div>
    </div>
  );
}
