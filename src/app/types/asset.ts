import type { AssetDeliverySnapshot, AssetLocationSnapshot } from '@/types/asset';

/**
 * ASSET INFO STRUCTURE - MarketplaceATP Protocol v3.3-freeze
 * ==========================================================
 * 
 * Đây là type definitions cho Asset trong Web3 Analytics Dashboard Studio Pro
 * Được sử dụng trong Search Results, Marketplace, My Assets, Portfolio
 * 
 * RWA = Real World Asset (Tokenized physical assets)
 * Receipt NFT = Proof of purchase (buyer receives after buying RWA slots)
 * Digital NFT = Pure digital NFTs (art, collectibles, etc.)
 */

// ============================================================================
// MARKETPLACE ASSET (Public - đang được list for sale)
// ============================================================================

export type RwaAttributeSelectionMode = 'single' | 'multi';

export interface RwaConfigurableAttributeOption {
  id: string;
  label: string;
  note?: string;
}

export interface RwaConfigurableAttributeGroup {
  id: string;
  label: string;
  helpText?: string;
  required: boolean;
  selectionMode: RwaAttributeSelectionMode;
  options: RwaConfigurableAttributeOption[];
}

export interface RwaSelectedAttribute {
  groupId: string;
  groupLabel: string;
  values: string[];
}

export interface MarketplaceAsset {
  // === CORE IDENTIFIERS ===
  id: string;                      // UI/catalog route ID trong hệ thống
  assetUid?: string;               // Explicit off-chain catalog/projection identity
  tokenId: string;                 // Legacy on-chain token ID snapshot (string form)
  onchainAssetId?: string;         // Canonical uint256 assetId trên OrinaRWA (string form)
  contractAddress: string;         // Smart contract address
  unitId?: string;                 // Canonical uint256 unitId (string form)
  unitName?: string;               // Canonical unit short name from UnitRegistry
  unitLabel?: string;              // Canonical display label derived from UnitRegistry
  
  // === BASIC INFO ===
  name: string;                    // Tên asset: "Beach Villa #123"
  category: string;                // Canonical taxonomy slug, render via getCategoryDisplayLabel(...)
  description?: string;            // Mô tả chi tiết
  image: string;                   // Main image URL hoặc IPFS hash
  images?: string[];               // Gallery images (optional)
  
  // === SELLER INFO ===
  seller: {
    address: string;               // Wallet address: "0x742d...9c4F"
    ensName?: string;              // ENS name nếu có
    verified: boolean;             // Verified seller badge
    reputation?: number;           // Reputation score (0-100)
  };
  
  // === PRICING ===
  price: string;                   // Current price: "5.8 ETH" hoặc "5800000000000000000" (wei)
  priceUSD?: string;               // USD equivalent: "$12,450"
  currency: 'ETH' | 'WETH' | 'USDC' | 'USDT' | 'WBNB' | 'DAI'; // Payment currency
  
  // === AVAILABILITY (for RWA with slots) ===
  availableSlots?: number;         // Available slots: 45
  totalSlots?: number;             // Total slots: 100
  minPurchaseSlots?: number;       // Minimum slots per purchase: 1
  maxPurchaseSlots?: number;       // Maximum slots per purchase: 10
  
  // === TIMING ===
  listedAt: number;                // Unix timestamp khi list
  expiresAt?: number;              // Unix timestamp khi hết hạn (optional)
  listingDuration?: string;        // Formatted: "3d 12h 45m"
  
  // === STATS ===
  views: number;                   // View count: 1234
  likes: number;                   // Like/favorite count: 456
  rank?: number;                   // Ranking: 10
  
  // === METADATA ===
  verified: boolean;               // Asset verified by platform
  featured?: boolean;              // Featured listing
  tags?: string[];                 // Tags: ["luxury", "beachfront", "investment"]
  configurableAttributes?: RwaConfigurableAttributeGroup[]; // Offchain buyer-selectable metadata for RWA flows
  deliverySnapshot?: AssetDeliverySnapshot; // Delivery snapshot captured at mint time for owned/runtime surfaces
  assetLocationSnapshot?: AssetLocationSnapshot; // Location snapshot captured at mint time for display/map surfaces
  
  // === BLOCKCHAIN ===
  blockchain: 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base' | 'BSC';
  network: 'mainnet' | 'testnet';
  
  // === TIMESTAMPS ===
  createdAt: number;               // Unix timestamp
  updatedAt: number;               // Unix timestamp
}

// ============================================================================
// RWA MINTED ASSET (Private - assets minted by user as seller)
// ============================================================================

export interface RWAMintedAsset {
  // === CORE IDENTIFIERS ===
  id: string;
  assetUid?: string;
  tokenId: string;
  onchainAssetId?: string;
  contractAddress: string;
  unitId?: string;
  unitName?: string;
  unitLabel?: string;
  
  // === BASIC INFO ===
  name: string;
  category: string;
  description?: string;
  image: string;
  images?: string[];
  
  // === MINTING INFO ===
  mintedBy: string;                // Wallet address of minter
  mintedAt: number;                // Unix timestamp
  mintDate: string;                // Formatted: "2024-01-15"
  
  // === SUPPLY & AVAILABILITY ===
  totalAmount: number;             // Total minted: 100
  availableAmount: number;         // Still available: 45
  soldAmount: number;              // Already sold: 55
  
  // === PRICING ===
  minPrice: string;                // Min price per slot: "2.5 ETH"
  maxPrice?: string;               // Max price per slot (optional)
  currentFloorPrice?: string;      // Current floor price in marketplace
  
  // === STATUS ===
  status: 'Active' | 'Paused' | 'Sold Out' | 'Delisted';
  
  // === REVENUE (for seller) ===
  totalRevenue?: string;           // Total ETH earned
  totalRevenueUSD?: string;        // USD equivalent
  
  // === METADATA ===
  verified: boolean;
  tags?: string[];
  configurableAttributes?: RwaConfigurableAttributeGroup[]; // Offchain buyer-selectable metadata
  deliverySnapshot?: AssetDeliverySnapshot;
  assetLocationSnapshot?: AssetLocationSnapshot;
  
  // === BLOCKCHAIN ===
  blockchain: 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base' | 'BSC';
  
  // === TIMESTAMPS ===
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// RECEIPT NFT (Private - proof of purchase for buyer)
// ============================================================================

export interface ReceiptNFT {
  // === CORE IDENTIFIERS ===
  receiptId: string;               // Unique receipt ID
  orderId: string;                 // Order ID: "ORD-1001"
  tokenId: string;                 // Original RWA token ID
  onchainAssetId?: string;         // Canonical uint256 assetId (string form)
  contractAddress: string;         // Original RWA contract
  
  // === ASSET INFO ===
  assetName: string;               // Original asset name
  assetImage: string;              // Original asset image
  category: string;
  
  // === PURCHASE INFO ===
  purchasedFrom: {
    address: string;               // Seller wallet
    ensName?: string;
  };
  purchasedAt: number;             // Unix timestamp
  purchaseDate: string;            // Formatted: "2024-02-10"
  
  // === OWNERSHIP ===
  ownershipShare: string;          // "5 / 100" hoặc "1 / 1"
  slots: number;                   // Number of slots owned: 5
  
  // === PAYMENT ===
  purchaseValue: string;           // Amount paid: "5.8 ETH"
  purchaseValueUSD?: string;       // USD at time of purchase
  currency: 'ETH' | 'WETH' | 'USDC' | 'USDT' | 'WBNB' | 'DAI';
  
  // === STATUS ===
  verified: boolean;               // Receipt verified on-chain
  transferable: false;             // Receipts are ALWAYS non-transferable
  
  // === BLOCKCHAIN ===
  blockchain: 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base' | 'BSC';
  transactionHash: string;         // Purchase tx hash
  blockNumber: number;
  
  // === TIMESTAMPS ===
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// DIGITAL NFT (Private - regular NFTs owned by user)
// ============================================================================

export interface DigitalNFT {
  // === CORE IDENTIFIERS ===
  id: string;
  assetUid?: string;
  tokenId: string;
  onchainAssetId?: string;
  contractAddress: string;
  
  // === BASIC INFO ===
  name: string;
  category: string;
  description?: string;
  image: string;
  
  // === COLLECTION INFO ===
  collection: {
    name: string;                  // "Neon Dreams Collection"
    address: string;               // Collection contract
    verified?: boolean;
  };
  
  // === OWNERSHIP ===
  owner: string;                   // Current owner wallet
  acquiredAt: number;              // When acquired
  
  // === PRICING ===
  currentPrice?: string;           // Current asking price if listed
  floorPrice?: string;             // Collection floor price: "0.35 ETH"
  lastSalePrice?: string;          // Last sale price in collection
  
  // === TRADING ===
  listedForSale: boolean;          // Currently listed?
  transferable: true;              // Digital NFTs are transferable
  
  // === METADATA ===
  traits?: {                       // NFT traits/attributes
    [key: string]: string | number;
  };
  rarity?: string;                 // "Common", "Rare", "Legendary", etc.
  verified: boolean;
  
  // === BLOCKCHAIN ===
  blockchain: 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base' | 'BSC';
  
  // === TIMESTAMPS ===
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// ASSET STATS (for analytics/metrics)
// ============================================================================

export interface AssetStats {
  totalViews: number;
  totalLikes: number;
  totalSales: number;
  totalVolume: string;             // Total trading volume
  averagePrice: string;
  floorPrice: string;
  ceilingPrice: string;
  uniqueOwners: number;
  listedCount: number;
}

// ============================================================================
// SEARCH FILTERS
// ============================================================================

export interface SearchFilters {
  // === CATEGORY ===
  categories?: string[];           // Canonical taxonomy slugs
  
  // === PRICE RANGE ===
  minPrice?: string;
  maxPrice?: string;
  
  // === STATUS ===
  status?: ('Active' | 'Paused' | 'Sold Out')[];
  
  // === AVAILABILITY ===
  hasAvailableSlots?: boolean;     // Only show with available slots
  minAvailableSlots?: number;
  
  // === VERIFICATION ===
  verifiedOnly?: boolean;
  
  // === BLOCKCHAIN ===
  blockchains?: ('Ethereum' | 'Polygon' | 'Arbitrum' | 'Base' | 'BSC')[];
  
  // === SORTING ===
  sortBy?: 'price-asc' | 'price-desc' | 'recent' | 'popular' | 'ending-soon';
  
  // === TAGS ===
  tags?: string[];
}

// ============================================================================
// VIEW MODES
// ============================================================================

export type ViewMode = 'grid' | 'list';

// ============================================================================
// ASSET TYPE UNION
// ============================================================================

export type Asset = MarketplaceAsset | RWAMintedAsset | ReceiptNFT | DigitalNFT;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isMarketplaceAsset(asset: Asset): asset is MarketplaceAsset {
  return 'seller' in asset && 'listedAt' in asset;
}

export function isRWAMintedAsset(asset: Asset): asset is RWAMintedAsset {
  return 'mintedBy' in asset && 'totalAmount' in asset;
}

export function isReceiptNFT(asset: Asset): asset is ReceiptNFT {
  return 'receiptId' in asset && 'orderId' in asset;
}

export function isDigitalNFT(asset: Asset): asset is DigitalNFT {
  return 'collection' in asset && !('orderId' in asset);
}
