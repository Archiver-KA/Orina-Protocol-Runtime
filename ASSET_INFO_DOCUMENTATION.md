# ASSET INFO STRUCTURE - Web3 Analytics Dashboard Studio Pro
## MarketplaceATP Protocol v3.3-freeze

> **Mục đích:** Xây dựng hệ thống quản lý asset types và chuẩn bị cho việc xây dựng danh mục sau này.

---

## 📋 TABLE OF CONTENTS

1. [Asset Types Overview](#asset-types-overview)
2. [MarketplaceAsset - Public Assets](#marketplaceasset)
3. [RWAMintedAsset - Seller Assets](#rwamintedasset)
4. [ReceiptNFT - Buyer Proof](#receiptnft)
5. [DigitalNFT - Regular NFTs](#digitalnft)
6. [SearchResultCard Component](#searchresultcard-component)
7. [Marketplace Demo Page](#marketplace-demo-page)
8. [Usage & Integration](#usage--integration)
9. [Mock Data Examples](#mock-data-examples)

---

## ASSET TYPES OVERVIEW

Hệ thống có **4 loại assets chính**:

```typescript
export type Asset = MarketplaceAsset | RWAMintedAsset | ReceiptNFT | DigitalNFT;
```

### 🔍 Type Guards để phân biệt:

```typescript
// Check if asset is Marketplace Asset (public sale)
if (isMarketplaceAsset(asset)) { ... }

// Check if asset is RWA Minted (seller's asset)
if (isRWAMintedAsset(asset)) { ... }

// Check if asset is Receipt NFT (buyer's proof)
if (isReceiptNFT(asset)) { ... }

// Check if asset is Digital NFT (regular NFT)
if (isDigitalNFT(asset)) { ... }
```

---

## MARKETPLACEASSET

**Vị trí sử dụng:** Search page, Marketplace, Browse Assets  
**Visibility:** Public - ai cũng thấy  
**Purpose:** Assets đang được list for sale

### 📦 Structure:

```typescript
interface MarketplaceAsset {
  // === CORE IDENTIFIERS ===
  id: string;                      // "asset-001"
  tokenId: string;                 // "4521"
  contractAddress: string;         // "0x742d...9c4F"
  
  // === BASIC INFO ===
  name: string;                    // "Beach Villa #123"
  category: string;                // "Real Estate"
  description?: string;            // "Luxury beachfront property..."
  image: string;                   // URL or IPFS hash
  images?: string[];               // Gallery images
  
  // === SELLER INFO ===
  seller: {
    address: string;               // "0x742d...9c4F"
    ensName?: string;              // "luxuryreserve.eth"
    verified: boolean;             // true/false
    reputation?: number;           // 0-100
  };
  
  // === PRICING ===
  price: string;                   // "5.8 ETH"
  priceUSD?: string;               // "$12,450"
  currency: 'ETH' | 'WETH' | 'USDC' | 'DAI';
  
  // === AVAILABILITY (RWA slots) ===
  availableSlots?: number;         // 45
  totalSlots?: number;             // 100
  minPurchaseSlots?: number;       // 1
  maxPurchaseSlots?: number;       // 10
  
  // === TIMING ===
  listedAt: number;                // Unix timestamp
  expiresAt?: number;              // Unix timestamp
  listingDuration?: string;        // "3d 12h 45m"
  
  // === STATS ===
  views: number;                   // 1234
  likes: number;                   // 456
  rank?: number;                   // 10
  
  // === METADATA ===
  verified: boolean;               // Platform verified
  featured?: boolean;              // Featured listing
  tags?: string[];                 // ["luxury", "beachfront"]
  
  // === BLOCKCHAIN ===
  blockchain: 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base';
  network: 'mainnet' | 'testnet';
  
  // === TIMESTAMPS ===
  createdAt: number;
  updatedAt: number;
}
```

### 🎨 UI Component: **SearchResultCard**

Grid View (compact):
- Image: h-48 (192px)
- Category badge với Shield icon (nếu verified)
- Price + Available/Total slots
- Listing duration với Clock icon
- Stats: Views, Likes, Rank

List View (detailed):
- Image: 180x180px square
- Horizontal layout
- More spacing cho stats

---

## RWAMINTEDASSET

**Vị trí sử dụng:** My Assets page → RWA Minted tab  
**Visibility:** Private - chỉ seller thấy  
**Purpose:** Assets đã mint bởi user (as seller)

### 📦 Structure:

```typescript
interface RWAMintedAsset {
  // === CORE IDENTIFIERS ===
  id: string;
  tokenId: string;
  contractAddress: string;
  
  // === BASIC INFO ===
  name: string;
  category: string;
  description?: string;
  image: string;
  images?: string[];
  
  // === MINTING INFO ===
  mintedBy: string;                // Minter's wallet
  mintedAt: number;                // Unix timestamp
  mintDate: string;                // "2024-01-15"
  
  // === SUPPLY & AVAILABILITY ===
  totalAmount: number;             // 100
  availableAmount: number;         // 45
  soldAmount: number;              // 55
  
  // === PRICING ===
  minPrice: string;                // "2.5 ETH"
  maxPrice?: string;
  currentFloorPrice?: string;
  
  // === STATUS ===
  status: 'Active' | 'Paused' | 'Sold Out' | 'Delisted';
  
  // === REVENUE (seller earnings) ===
  totalRevenue?: string;           // "137.5 ETH"
  totalRevenueUSD?: string;        // "$295,000"
  
  // === METADATA ===
  verified: boolean;
  tags?: string[];
  
  // === BLOCKCHAIN ===
  blockchain: 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base';
  
  // === TIMESTAMPS ===
  createdAt: number;
  updatedAt: number;
}
```

### 🎨 UI Component: **RWAMintedCard**

Features:
- Teal badge: "RWA MINTED"
- Status badge: Active/Paused/Sold Out
- Available / Total display
- Min Price
- "View Details" button

---

## RECEIPTNFT

**Vị trí sử dụng:** My Assets page → Receipts tab, My Receipts page  
**Visibility:** Private - chỉ buyer thấy  
**Purpose:** Proof of purchase NFT cho buyer

### 📦 Structure:

```typescript
interface ReceiptNFT {
  // === CORE IDENTIFIERS ===
  receiptId: string;               // "receipt-001"
  orderId: string;                 // "ORD-1001"
  tokenId: string;                 // Original RWA token
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
  purchaseDate: string;            // "2024-02-10"
  
  // === OWNERSHIP ===
  ownershipShare: string;          // "5 / 100"
  slots: number;                   // 5
  
  // === PAYMENT ===
  purchaseValue: string;           // "5.8 ETH"
  purchaseValueUSD?: string;       // "$12,450"
  currency: 'ETH' | 'WETH' | 'USDC' | 'DAI';
  
  // === STATUS ===
  verified: boolean;
  transferable: false;             // ALWAYS false for receipts
  
  // === BLOCKCHAIN ===
  blockchain: 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base';
  transactionHash: string;         // Purchase tx hash
  blockNumber: number;
  
  // === TIMESTAMPS ===
  createdAt: number;
  updatedAt: number;
}
```

### 🎨 UI Component: **ReceiptNFTCard**

Features:
- Purple badge: "RECEIPT NFT"
- Non-Transferable indicator (orange)
- Order ID, Purchase Date, Seller
- Purchase Value
- Blockchain badge

**⚠️ QUAN TRỌNG:** Receipt NFTs are **NON-TRANSFERABLE** - đây là final proof of purchase

---

## DIGITALNFT

**Vị trí sử dụng:** My Assets page → NFT Owned tab  
**Visibility:** Private - chỉ owner thấy  
**Purpose:** Regular NFTs owned by user

### 📦 Structure:

```typescript
interface DigitalNFT {
  // === CORE IDENTIFIERS ===
  id: string;
  tokenId: string;
  contractAddress: string;
  
  // === BASIC INFO ===
  name: string;
  category: string;
  description?: string;
  image: string;
  
  // === COLLECTION INFO ===
  collection: {
    name: string;                  // "Neon Dreams Collection"
    address: string;
    verified?: boolean;
  };
  
  // === OWNERSHIP ===
  owner: string;                   // Current owner wallet
  acquiredAt: number;
  
  // === PRICING ===
  currentPrice?: string;           // If listed
  floorPrice?: string;             // "0.35 ETH"
  lastSalePrice?: string;
  
  // === TRADING ===
  listedForSale: boolean;
  transferable: true;              // ALWAYS true for digital NFTs
  
  // === METADATA ===
  traits?: {
    [key: string]: string | number;
  };
  rarity?: string;                 // "Common", "Rare", "Legendary"
  verified: boolean;
  
  // === BLOCKCHAIN ===
  blockchain: 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base';
  
  // === TIMESTAMPS ===
  createdAt: number;
  updatedAt: number;
}
```

### 🎨 UI Component: **DigitalNFTCard**

Features:
- Blue badge: "DIGITAL NFT"
- Transferable indicator (green, animated pulse)
- Collection name
- Current Price / Floor Price
- "Transfer" button + "List for Sale" button

---

## SEARCHRESULTCARD COMPONENT

**File:** `/src/app/components/search-result-card.tsx`  
**Usage:** Search page, Marketplace browse

### Props:

```typescript
interface SearchResultCardProps {
  asset: MarketplaceAsset;
  viewMode: 'grid' | 'list';
  onLike?: (assetId: string) => void;
  onClick?: (assetId: string) => void;
  isLiked?: boolean;
}
```

### Features:

#### Grid View:
- **Image size:** `h-48` (192px height)
- **RWA badge:** Top-left, teal, glassmorphism
- **Verified badge:** Top-right (if verified)
- **Heart button:** Top-right of content area
- **Category:** Text with Shield icon (if seller verified)
- **Price section:** Price + USD equivalent
- **Ending In section:** Duration + Available/Total slots
- **Stats row:** Views, Likes, Rank

#### List View:
- **Image size:** `180x180px` square
- **Layout:** Horizontal flex
- **Heart button:** Larger (20px icon)
- **Stats:** Larger spacing và icons

### Helper Functions:

```typescript
// Format listing duration
getListingDuration(): string
// Returns: "3d 12h 45m" or "Expired"

// Format numbers (1234 -> 1.23k)
formatNumber(num: number): string
```

---

## MARKETPLACE DEMO PAGE

**File:** `/src/app/components/marketplace-demo.tsx`  
**Route:** Access via URL by appending `#marketplace-demo` or via JavaScript console: `window.location.hash = 'marketplace-demo'`

### 🚀 How to Access:

#### Method 1: Browser Console
```javascript
// In browser console, run:
const app = document.querySelector('[activepage]');
// Or simply navigate:
window.location.hash = 'marketplace-demo';
```

#### Method 2: URL Parameter
```
https://your-app.com/#marketplace-demo
```

#### Method 3: Add to Left Sidebar (Developer Mode)
Add a temporary link in `/src/app/components/left-sidebar.tsx`:
```typescript
<button onClick={() => setActivePage('marketplace-demo')}>
  Marketplace Demo
</button>
```

### 📦 Features:

**1. Stats Dashboard:**
- Total Assets count
- Total Views aggregated
- Total Likes aggregated  
- Categories count

**2. Filter Controls:**
- **Search:** Text input to search by name, description, tags
- **Category Filter:** Dropdown với all categories
- **Blockchain Filter:** Dropdown với Ethereum, Polygon, Arbitrum
- **Verified Only:** Checkbox to filter verified assets

**3. View Toggle:**
- **Grid View:** 4-column responsive grid
- **List View:** Full-width list with horizontal layout

**4. Live Data:**
- **15 Mock Assets** across 8 categories:
  - Real Estate (3 assets)
  - Luxury Watch (3 assets)
  - Digital Art (2 assets)
  - Collectibles (2 assets)
  - Luxury Vehicle (2 assets)
  - Wine & Spirits (1 asset)
  - Jewelry (1 asset)
  - Music Memorabilia (1 asset)

**5. Interactive Elements:**
- Like/Unlike functionality (local state)
- Asset click (logs to console, ready for navigation)
- Real-time filtering
- Dynamic result count

### 🎨 UI Components Used:

```typescript
<SearchResultCard
  asset={asset}
  viewMode={viewMode}  // 'grid' | 'list'
  onLike={handleLike}
  onClick={handleAssetClick}
  isLiked={likedAssets.has(asset.id)}
/>
```

### 📊 Mock Data Stats:

```typescript
{
  totalAssets: 15,
  totalViews: 45,679,
  totalLikes: 16,789,
  verifiedAssets: 11,
  featuredAssets: 9,
  categories: 8,
  blockchains: 3
}
```

### 🔧 Code Structure:

```typescript
export function MarketplaceDemo() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBlockchain, setSelectedBlockchain] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [likedAssets, setLikedAssets] = useState<Set<string>>(new Set());

  // Filtering logic
  const filteredAssets = useMemo(() => {
    // Filter by search, category, blockchain, verified
  }, [searchQuery, selectedCategory, selectedBlockchain, verifiedOnly]);

  // Render Grid or List
  return (
    <div className={viewMode === 'grid' 
      ? 'grid grid-cols-4 gap-6' 
      : 'space-y-4'
    }>
      {filteredAssets.map(asset => (
        <SearchResultCard ... />
      ))}
    </div>
  );
}
```

### 🎯 Perfect For:

- **Testing:** Test SearchResultCard in Grid and List views
- **Demo:** Show client/stakeholders the marketplace UI
- **Development:** Develop new features with live data
- **Screenshots:** Capture UI for documentation

---

## USAGE & INTEGRATION

### 1. Import Types:

```typescript
import { 
  MarketplaceAsset, 
  RWAMintedAsset, 
  ReceiptNFT, 
  DigitalNFT,
  Asset,
  isMarketplaceAsset,
  isRWAMintedAsset,
  isReceiptNFT,
  isDigitalNFT
} from '@/app/types/asset';
```

### 2. Import SearchResultCard:

```typescript
import { SearchResultCard } from '@/app/components/search-result-card';
```

### 3. Usage Example:

```typescript
// In Search page
<SearchResultCard
  asset={marketplaceAsset}
  viewMode={viewMode}
  onLike={handleLike}
  onClick={handleAssetClick}
  isLiked={likedAssets.has(marketplaceAsset.id)}
/>
```

### 4. Render Different Card Types:

```typescript
{assets.map((asset) => {
  if (isMarketplaceAsset(asset)) {
    return <SearchResultCard key={asset.id} asset={asset} viewMode="grid" />;
  } else if (isRWAMintedAsset(asset)) {
    return <RWAMintedCard key={asset.id} asset={asset} />;
  } else if (isReceiptNFT(asset)) {
    return <ReceiptNFTCard key={asset.id} asset={asset} />;
  } else if (isDigitalNFT(asset)) {
    return <DigitalNFTCard key={asset.id} asset={asset} />;
  }
})}
```

---

## MOCK DATA EXAMPLES

### MarketplaceAsset Example:

```typescript
const mockMarketplaceAsset: MarketplaceAsset = {
  id: 'asset-001',
  tokenId: '4521',
  contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
  
  name: 'Beach Villa #123',
  category: 'Real Estate',
  description: 'Luxury beachfront property with ocean view',
  image: 'https://images.unsplash.com/photo-...',
  
  seller: {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
    ensName: 'luxuryreserve.eth',
    verified: true,
    reputation: 98
  },
  
  price: '5.8 ETH',
  priceUSD: '$12,450',
  currency: 'ETH',
  
  availableSlots: 45,
  totalSlots: 100,
  minPurchaseSlots: 1,
  maxPurchaseSlots: 10,
  
  listedAt: Date.now() - 86400000 * 3, // 3 days ago
  expiresAt: Date.now() + 86400000 * 7, // 7 days from now
  listingDuration: '3d 12h 45m',
  
  views: 1234,
  likes: 456,
  rank: 10,
  
  verified: true,
  featured: true,
  tags: ['luxury', 'beachfront', 'investment'],
  
  blockchain: 'Ethereum',
  network: 'mainnet',
  
  createdAt: Date.now() - 86400000 * 30,
  updatedAt: Date.now()
};
```

### RWAMintedAsset Example:

```typescript
const mockRWAMintedAsset: RWAMintedAsset = {
  id: 'rwa-001',
  tokenId: '1001',
  contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
  
  name: 'Luxury Apartment #442',
  category: 'Real Estate',
  image: 'https://images.unsplash.com/photo-...',
  
  mintedBy: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
  mintedAt: Date.now() - 86400000 * 60,
  mintDate: '2024-01-15',
  
  totalAmount: 100,
  availableAmount: 45,
  soldAmount: 55,
  
  minPrice: '2.5 ETH',
  currentFloorPrice: '2.8 ETH',
  
  status: 'Active',
  
  totalRevenue: '137.5 ETH',
  totalRevenueUSD: '$295,000',
  
  verified: true,
  blockchain: 'Ethereum',
  
  createdAt: Date.now() - 86400000 * 60,
  updatedAt: Date.now()
};
```

### ReceiptNFT Example:

```typescript
const mockReceiptNFT: ReceiptNFT = {
  receiptId: 'receipt-001',
  orderId: 'ORD-1001',
  tokenId: '4521',
  contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
  
  assetName: 'Beach Villa #123 Receipt',
  assetImage: 'https://images.unsplash.com/photo-...',
  category: 'Real Estate',
  
  purchasedFrom: {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
    ensName: 'luxuryreserve.eth'
  },
  purchasedAt: Date.now() - 86400000 * 10,
  purchaseDate: '2024-02-10',
  
  ownershipShare: '5 / 100',
  slots: 5,
  
  purchaseValue: '5.8 ETH',
  purchaseValueUSD: '$12,450',
  currency: 'ETH',
  
  verified: true,
  transferable: false,
  
  blockchain: 'Ethereum',
  transactionHash: '0xabc123...',
  blockNumber: 18442109,
  
  createdAt: Date.now() - 86400000 * 10,
  updatedAt: Date.now()
};
```

### DigitalNFT Example:

```typescript
const mockDigitalNFT: DigitalNFT = {
  id: 'nft-001',
  tokenId: '4421',
  contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
  
  name: 'CyberPunk #4421',
  category: 'Digital Art',
  image: 'https://images.unsplash.com/photo-...',
  
  collection: {
    name: 'Neon Dreams Collection',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
    verified: true
  },
  
  owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
  acquiredAt: Date.now() - 86400000 * 90,
  
  currentPrice: '0.45 ETH',
  floorPrice: '0.35 ETH',
  lastSalePrice: '0.42 ETH',
  
  listedForSale: false,
  transferable: true,
  
  traits: {
    'Background': 'Neon City',
    'Eyes': 'Laser Blue',
    'Outfit': 'Cyber Suit'
  },
  rarity: 'Rare',
  verified: true,
  
  blockchain: 'Ethereum',
  
  createdAt: Date.now() - 86400000 * 180,
  updatedAt: Date.now()
};
```

---

## SEARCH FILTERS

```typescript
interface SearchFilters {
  categories?: string[];
  minPrice?: string;
  maxPrice?: string;
  status?: ('Active' | 'Paused' | 'Sold Out')[];
  hasAvailableSlots?: boolean;
  minAvailableSlots?: number;
  verifiedOnly?: boolean;
  blockchains?: ('Ethereum' | 'Polygon' | 'Arbitrum' | 'Base')[];
  sortBy?: 'price-asc' | 'price-desc' | 'recent' | 'popular' | 'ending-soon';
  tags?: string[];
}
```

### Usage:

```typescript
const filters: SearchFilters = {
  categories: ['Real Estate', 'Luxury Watch'],
  minPrice: '1 ETH',
  maxPrice: '10 ETH',
  verifiedOnly: true,
  hasAvailableSlots: true,
  sortBy: 'price-asc'
};
```

---

## FILE LOCATIONS

```
/src/app/types/asset.ts                      # Type definitions
/src/app/components/search-result-card.tsx   # SearchResultCard component

# Các vị trí cần import SearchResultCard:
/src/app/components/search.tsx               # Search page
/src/app/components/marketplace.tsx          # Marketplace page (if exists)
/src/app/components/browse.tsx               # Browse page (if exists)

# Các vị trí sử dụng RWA/Receipt/Digital cards:
/src/app/components/assets.tsx               # My Assets page
/src/app/components/my-receipts.tsx          # My Receipts page
/src/app/components/portfolio.tsx            # Portfolio page
```

---

## NEXT STEPS - XÂY DỰNG DANH MỤC

### Phase 1: Component Integration
- [ ] Import SearchResultCard vào Search page
- [ ] Import SearchResultCard vào Marketplace page
- [ ] Tạo RWAMintedCard component (nếu chưa có)
- [ ] Tạo ReceiptNFTCard component (nếu chưa có)
- [ ] Tạo DigitalNFTCard component (nếu chưa có)

### Phase 2: Mock Data
- [ ] Tạo mock data cho MarketplaceAsset
- [ ] Tạo mock data cho RWAMintedAsset
- [ ] Tạo mock data cho ReceiptNFT
- [ ] Tạo mock data cho DigitalNFT

### Phase 3: State Management
- [ ] Implement like/favorite functionality
- [ ] Implement view tracking
- [ ] Implement filtering system
- [ ] Implement sorting system

### Phase 4: Blockchain Integration
- [ ] Connect with Wagmi/Viem
- [ ] Implement real-time data fetching
- [ ] Implement transaction handling
- [ ] Implement on-chain verification

---

## NOTES

### Design Consistency:
- ✅ Tất cả cards sử dụng glassmorphism badges
- ✅ Consistent spacing và typography
- ✅ Hover effects: `-translate-y-1` for grid, `-translate-y-0.5` for list
- ✅ Teal color (#2CC295) cho primary actions
- ✅ Dark theme (#121212 background, #141417 cards)

### Protocol Requirements:
- ✅ No backend server - UI connects directly to blockchain
- ✅ Asymmetric trust model
- ✅ Receipt NFTs are NON-TRANSFERABLE
- ✅ Digital NFTs are TRANSFERABLE
- ✅ RWA supports fractional ownership (slots)

### Performance:
- Use React.memo for card components
- Lazy load images with ImageWithFallback
- Virtualize long lists with react-window
- Cache blockchain data locally

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-07  
**Protocol:** MarketplaceATP v3.3-freeze