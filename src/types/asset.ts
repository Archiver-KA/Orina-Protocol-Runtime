export interface AssetProperty {
  trait_type: string;
  value: string | number;
  rarity?: number; // Percentage (0-100)
}

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

export interface AssetDeliverySnapshot {
  sourceMode: 'default' | 'other';
  preview: string;
  countryCode: string;
  countryNameSnapshot: string;
  geoPath: Array<{
    placeId: string;
    kind: string;
    code?: string | null;
    name: string;
    label: string;
  }>;
  postalCode?: string;
  addressLine1: string;
  addressLine2?: string;
  deliveryInstructions?: string;
  validationStatus: string;
  source: string;
  capturedAt: number;
}

export interface AssetLocationSnapshot {
  sourceMode: 'default' | 'other';
  displayAddress: string;
  countryCode: string;
  countryNameSnapshot: string;
  geoPath: Array<{
    placeId: string;
    kind: string;
    code?: string | null;
    name: string;
    label: string;
  }>;
  leafPlaceId?: string;
  postalCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  } | null;
  precision:
    | 'country'
    | 'admin1'
    | 'admin2'
    | 'admin3'
    | 'admin4'
    | 'admin5'
    | 'locality'
    | 'sublocality'
    | 'unstructured';
  capturedAt: number;
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
  assetUid?: string;
  tokenId: string;
  onchainAssetId?: string;
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
  configurableAttributes?: RwaConfigurableAttributeGroup[];
  deliverySnapshot?: AssetDeliverySnapshot;
  assetLocationSnapshot?: AssetLocationSnapshot;
  
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
  unitId?: string;
  unitName?: string;
  unitLabel?: string;
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
