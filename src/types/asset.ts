export interface AssetProperty {
  trait_type: string;
  value: string | number;
  rarity?: number; // Percentage (0-100)
}

export interface AssetOwner {
  address: string;
  timestamp: number;
  price?: string;
  txHash?: string;
}

export interface PriceHistory {
  timestamp: number;
  price: number;
  priceUsd: number;
  eventType: 'mint' | 'sale' | 'transfer';
}

export interface AssetDetails {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  category: string;
  blockchain: string;
  
  // Pricing
  currentPrice: string;
  currentPriceUsd: string;
  floorPrice?: string;
  priceChange24h?: number; // Percentage change
  
  // Media
  image: string;
  images?: string[]; // Gallery
  video?: string;
  
  // Properties
  properties: AssetProperty[];
  
  // Stats
  views: number;
  favorites: number;
  totalVolume: string;
  totalSales: number;
  
  // Owner info
  currentOwner: string;
  creator: string;
  ownerHistory: AssetOwner[];
  
  // Price history
  priceHistory: PriceHistory[];
  
  // Metadata
  contractAddress: string;
  tokenStandard: string;
  mintDate: number;
  lastSale?: number;
  
  // Additional
  verified: boolean;
  royalty?: number;
  externalUrl?: string;
  ipfsUrl?: string;
  location?: string; // For real estate
  seller?: { name: string; address: string }; // Seller info
  rating?: number; // Asset/seller rating
}

export interface SimilarAsset {
  id: string;
  name: string;
  image: string;
  price: string;
  priceUsd: string;
  category: string;
  location?: string; // Location for RWA assets
  verified?: boolean; // Verified status
}