import { useState, useMemo } from 'react';
import { Heart, TrendingUp, Package, Sparkles, ShoppingBag, Grid3x3, Eye } from 'lucide-react';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { useAccount } from 'wagmi';
import { useReceiptBalance } from '@/hooks/useReceipts';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
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
} from '@/app/components/cards/my-asset-cards';

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

export function Assets() {
  const [activeTab, setActiveTab] = useState<AssetTab>('All Assets');
  const [sortBy, setSortBy] = useState('Recent');
  type RwaAsset = (typeof mockRWAAssets)[number];
  type ReceiptAsset = (typeof mockReceiptNFTs)[number];
  type NftAsset = (typeof mockDigitalNFTs)[number];
  type AnyAsset = RwaAsset | ReceiptAsset | NftAsset;
  const [selectedAsset, setSelectedAsset] = useState<AnyAsset | null>(null);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isListForSaleModalOpen, setIsListForSaleModalOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>('');
  const [isReceiptDetailModalOpen, setIsReceiptDetailModalOpen] = useState(false);

  const { address, isConnected } = useAccount();
  const { data: receiptBalance } = useReceiptBalance(address);

  // Calculate totals
  const totalRWA = mockRWAAssets.length;
  const totalReceipts = mockReceiptNFTs.length;
  const totalNFTs = mockDigitalNFTs.length;
  const totalAssets = totalRWA + totalReceipts + totalNFTs;

  // Filter assets based on active tab
  const displayAssets = useMemo(() => {
    switch (activeTab) {
      case 'RWA Minted':
        return mockRWAAssets;
      case 'Receipts':
        return mockReceiptNFTs;
      case 'NFT Owned':
        return mockDigitalNFTs;
      case 'All Assets':
      default:
        return [...mockRWAAssets, ...mockReceiptNFTs, ...mockDigitalNFTs];
    }
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col overflow-hidden relative" style={{ background: '#121212' }}>
      <style>{`
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
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
      `}</style>

      {/* Ambient Blobs */}
      <div className="ambient-blob -top-40 -left-40"></div>
      <div className="ambient-blob -bottom-40 -right-40"></div>

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
        <StudioPanel className="rounded-2xl p-6">
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Total Portfolio Value</p>
              <h2 className="text-4xl font-bold text-white mt-1">$142,892.45</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[#2CC295] text-sm font-bold flex items-center">
                  <TrendingUp size={14} className="mr-1" />
                  +12.4%
                </span>
                <span className="text-zinc-600 text-xs font-medium">vs last week</span>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">RWA</p>
                <p className="text-2xl font-bold text-white">{totalRWA}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Receipts</p>
                <p className="text-2xl font-bold text-white">{totalReceipts}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">NFTs</p>
                <p className="text-2xl font-bold text-white">{totalNFTs}</p>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-zinc-950/40 p-4">
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
          </div>
        </StudioPanel>

        {/* Pill Segmented Toggle + Sort */}
        <div className="flex items-center justify-between">
          {/* Pill Segmented Toggle */}
          <StudioPillGroup>
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Sort By:</span>
            <CustomDropdown
              options={['Recent', 'Value: High to Low', 'Value: Low to High', 'A-Z', 'Z-A']}
              defaultOption={sortBy}
              onChange={setSortBy}
            />
          </div>
        </div>

        {/* Assets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
          {displayAssets.length === 0 ? (
            <div className="col-span-full">
              <EmptyStateCard
                icon={<Package size={30} className="text-zinc-700" />}
                title="No assets found"
                description="Start by minting RWA or purchasing NFTs"
                className="py-16 px-6 text-center"
              />
            </div>
          ) : (
            displayAssets.map((asset) => {
              // Render different card types based on asset type
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
              } else if (asset.type === 'Receipt') {
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
              } else if (asset.type === 'NFT') {
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
              }

              // Fallback
              return null;
            })
          )}
        </div>
      </div>
    </div>
  );
}
