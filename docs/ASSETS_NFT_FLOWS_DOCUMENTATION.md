# 🎨 Orina Assets & NFT Flows - Tài Liệu Kỹ Thuật Đầy Đủ

> **Version:** 2.0  
> **Last Updated:** February 13, 2026  
> **Author:** Orina Development Team  
> **Protocol:** MarketplaceATP Protocol v3.3-freeze

---

## 📋 Mục Lục

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Asset Types & Architecture](#2-asset-types--architecture)
3. [SearchResultCard Component](#3-searchresultcard-component)
4. [Marketplace Page](#4-marketplace-page)
5. [Assets Page](#5-assets-page)
6. [RWA Asset Flow](#6-rwa-asset-flow)
7. [NFT Asset Flow](#7-nft-asset-flow)
8. [Receipt NFT Flow](#8-receipt-nft-flow)
9. [Card Visual Design](#9-card-visual-design)
10. [Integration Guide](#10-integration-guide)

---

## 1. Tổng Quan Hệ Thống

### 1.1. Giới Thiệu

**Orina** là Web3 Analytics Dashboard với marketplace decentralized cho **RWA (Real World Assets)** và **NFTs**, sử dụng **Atomic Transaction Protocol (ATP) v3.3** để đảm bảo giao dịch an toàn và minh bạch.

### 1.2. Core Concepts

```
┌─────────────────────────────────────────────────────────────────┐
│                      ORINA ASSET ECOSYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐ │
│  │  MARKETPLACE   │   │     ASSETS     │   │   FAVORITES    │ │
│  │   (Public)     │   │   (Private)    │   │   (Watchlist)  │ │
│  ├────────────────┤   ├────────────────┤   ├────────────────┤ │
│  │ RWA Assets     │   │ RWA Minted     │   │ Liked Assets   │ │
│  │ Listed for Sale│   │ Receipts       │   │ Cross-page     │ │
│  │ Grid/List/Map  │   │ NFTs Owned     │   │ Sync via       │ │
│  │ view modes     │   │ Portfolio View │   │ Context        │ │
│  └────────────────┘   └────────────────┘   └────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              SEARCHRESULTCARD COMPONENT                  │   │
│  │  - Unified card design for all asset types              │   │
│  │  - Grid view (compact) & List view (detailed)           │   │
│  │  - Blockchain badge with tooltip                        │   │
│  │  - Like/Favorite button integration                     │   │
│  │  - Photography: High-quality Unsplash images            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React, TypeScript, Tailwind CSS v4 |
| **Smart Contracts** | Solidity, Wagmi, Viem |
| **Blockchain** | BSC Testnet (live), Ethereum, Polygon (coming) |
| **Storage** | IPFS (Pinata) |
| **Design System** | Custom Tailwind with `--primary: #2CC295` |
| **Protocol** | ATP v3.3 (Atomic Transaction Protocol) |
| **Data Source** | Mock data → Contract integration (Phase 3) |

---

## 2. Asset Types & Architecture

### 2.1. Asset Type Hierarchy

```
Asset (Union Type)
  │
  ├─── MarketplaceAsset (Public - Listed for Sale)
  │     ├─ RWA assets on marketplace
  │     ├─ Fractionalized (with slots)
  │     ├─ Viewed by: Everyone
  │     └─ Source: `/utils/mockMarketplaceData.ts`
  │
  ├─── RWAMintedAsset (Private - Seller's Inventory)
  │     ├─ Assets minted by seller
  │     ├─ Can list for sale → becomes MarketplaceAsset
  │     ├─ Viewed by: Seller only
  │     └─ Source: `/utils/mockAssetData.ts`
  │
  ├─── ReceiptNFT (Private - Proof of Purchase)
  │     ├─ Non-transferable proof NFT
  │     ├─ Issued after buying RWA slots
  │     ├─ Viewed by: Buyer only
  │     └─ Badge: Purple "RECEIPT" badge
  │
  └─── DigitalNFT (Private - Regular NFTs)
        ├─ Transferable digital NFTs
        ├─ Art, PFPs, collectibles
        ├─ Viewed by: Owner only
        └─ Badge: Blue "DIGITAL" badge
```

### 2.2. MarketplaceAsset (Public - Core Type)

**File:** `/src/app/types/asset.ts`

```typescript
export interface MarketplaceAsset {
  // === CORE IDENTIFIERS ===
  id: string;                      // "asset-001"
  tokenId: string;                 // "4521"
  contractAddress: string;         // "0x742d35Cc..."
  
  // === BASIC INFO ===
  name: string;                    // "Beach Villa Phuket #123"
  category: string;                // "Real Estate" | "Vehicles" | "Luxury Goods" | "Art"
  description?: string;            // Full description
  image: string;                   // Unsplash URL: "https://images.unsplash.com/photo-..."
  images?: string[];               // Gallery (multiple images)
  
  // === SELLER INFO ===
  seller: {
    address: string;               // "0x742d..."
    ensName?: string;              // "luxuryreserve.eth"
    verified: boolean;             // Verified seller badge (green shield)
    reputation?: number;           // 0-100 score
  };
  
  // === PRICING ===
  price: string;                   // "5.8 ETH"
  priceUSD?: string;               // "$12,450"
  currency: 'ETH' | 'WETH' | 'USDC' | 'DAI';
  
  // === AVAILABILITY (RWA with slots) ===
  availableSlots?: number;         // 45 slots available
  totalSlots?: number;             // 100 total slots
  minPurchaseSlots?: number;       // Min 1 slot
  maxPurchaseSlots?: number;       // Max 10 slots
  
  // === TIMING ===
  listedAt: number;                // Unix timestamp
  expiresAt?: number;              // Unix timestamp (optional)
  listingDuration?: string;        // "7d 0h 0m"
  
  // === STATS ===
  views: number;                   // 1234 views
  likes: number;                   // 456 likes
  rank?: number;                   // Rank 10
  
  // === METADATA ===
  verified: boolean;               // Asset verified
  featured?: boolean;              // Featured on homepage
  tags?: string[];                 // ["luxury", "beachfront"]
  
  // === BLOCKCHAIN ===
  blockchain: 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base' | 'BSC';
  network: 'mainnet' | 'testnet';
  
  // === TIMESTAMPS ===
  createdAt: number;
  updatedAt: number;
}
```

**Example Data:**
```typescript
{
  id: 'asset-001',
  tokenId: '4521',
  contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
  name: 'Beach Villa Phuket #123',
  category: 'Real Estate',
  description: 'Luxury beachfront villa with stunning ocean view...',
  image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
  
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
  
  listedAt: Date.now() - (3 * 24 * 60 * 60 * 1000),
  expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
  listingDuration: '7d 0h 0m',
  
  views: 1234,
  likes: 456,
  rank: 10,
  
  verified: true,
  featured: true,
  tags: ['luxury', 'beachfront', 'investment', 'thailand'],
  
  blockchain: 'BSC',
  network: 'testnet',
  
  createdAt: Date.now() - (30 * 24 * 60 * 60 * 1000),
  updatedAt: Date.now()
}
```

### 2.3. RWAMintedAsset (Private - Seller Inventory)

```typescript
export interface RWAMintedAsset {
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
  mintedBy: string;                // Wallet address of minter
  mintedAt: number;                // Unix timestamp
  mintDate: string;                // "2024-01-15"
  
  // === SUPPLY & AVAILABILITY ===
  totalAmount: number;             // 100 total minted
  availableAmount: number;         // 45 still available
  soldAmount: number;              // 55 already sold
  
  // === PRICING ===
  minPrice: string;                // "2.5 ETH" per slot
  maxPrice?: string;               // Optional max
  currentFloorPrice?: string;      // Current floor in marketplace
  
  // === STATUS ===
  status: 'Active' | 'Paused' | 'Sold Out' | 'Delisted';
  
  // === REVENUE (for seller) ===
  totalRevenue?: string;           // "137.5 ETH"
  totalRevenueUSD?: string;        // "$295,200"
  
  // === METADATA ===
  verified: boolean;
  tags?: string[];
  
  // === BLOCKCHAIN ===
  blockchain: 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base' | 'BSC';
  
  // === TIMESTAMPS ===
  createdAt: number;
  updatedAt: number;
}
```

**UI Actions for RWA Minted:**
- ✅ **List for Sale** → Becomes MarketplaceAsset
- ✅ **Pause Listing** → Status: 'Paused'
- ✅ **Delist** → Status: 'Delisted'
- ✅ **View Revenue** → Analytics dashboard
- ✅ **Transfer Ownership** → Transfer modal

### 2.4. ReceiptNFT (Private - Proof of Purchase)

```typescript
export interface ReceiptNFT {
  // === CORE IDENTIFIERS ===
  receiptId: string;               // "RCPT-12345"
  orderId: string;                 // "ORD-1001"
  tokenId: string;                 // Original RWA token ID
  contractAddress: string;         // Original RWA contract
  
  // === ASSET INFO ===
  assetName: string;               // "Beach Villa Phuket #123"
  assetImage: string;              // Original asset image
  category: string;                // "Real Estate"
  
  // === PURCHASE INFO ===
  purchasedFrom: {
    address: string;               // Seller wallet
    ensName?: string;              // "luxuryreserve.eth"
  };
  purchasedAt: number;             // Unix timestamp
  purchaseDate: string;            // "2024-02-10"
  
  // === OWNERSHIP ===
  ownershipShare: string;          // "5 / 100" or "1 / 1"
  slots: number;                   // 5 slots owned
  
  // === PAYMENT ===
  purchaseValue: string;           // "5.8 ETH"
  purchaseValueUSD?: string;       // "$12,450"
  currency: 'ETH' | 'WETH' | 'USDC' | 'DAI';
  
  // === STATUS ===
  verified: boolean;               // On-chain verified
  transferable: false;             // ⚠️ ALWAYS false
  
  // === BLOCKCHAIN ===
  blockchain: 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base' | 'BSC';
  transactionHash: string;         // Purchase tx hash
  blockNumber: number;
  
  // === TIMESTAMPS ===
  createdAt: number;
  updatedAt: number;
}
```

**⚠️ CRITICAL: Receipt NFTs are NON-TRANSFERABLE**

This is a **core business rule**. Receipts serve as proof of ownership and cannot be transferred or sold. They are final product after purchase completion.

**UI Badge:**
```tsx
<div className="px-2.5 py-1 rounded-full text-[9px] font-bold text-purple-300 
                border border-purple-400/30 bg-black/40 backdrop-blur-md 
                uppercase tracking-wider">
  RECEIPT · NON-TRANSFERABLE
</div>
```

### 2.5. DigitalNFT (Private - Regular NFTs)

```typescript
export interface DigitalNFT {
  // === CORE IDENTIFIERS ===
  id: string;
  tokenId: string;
  contractAddress: string;
  
  // === BASIC INFO ===
  name: string;                    // "Bored Ape #8942"
  category: string;                // "PFP" | "Art" | "Gaming"
  description?: string;
  image: string;
  
  // === COLLECTION INFO ===
  collection: {
    name: string;                  // "Bored Ape Yacht Club"
    address: string;               // Collection contract
    verified?: boolean;            // Blue checkmark
  };
  
  // === OWNERSHIP ===
  owner: string;                   // Current owner wallet
  acquiredAt: number;              // When acquired
  
  // === PRICING ===
  currentPrice?: string;           // "28.5 ETH" if listed
  floorPrice?: string;             // "25.0 ETH" collection floor
  lastSalePrice?: string;          // "30.0 ETH" last sale
  
  // === TRADING ===
  listedForSale: boolean;          // Currently listed?
  transferable: true;              // ✅ Always true
  
  // === METADATA ===
  traits?: {                       // NFT traits
    [key: string]: string | number;
  };
  rarity?: string;                 // "Common" | "Rare" | "Legendary"
  verified: boolean;
  
  // === BLOCKCHAIN ===
  blockchain: 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base' | 'BSC';
  
  // === TIMESTAMPS ===
  createdAt: number;
  updatedAt: number;
}
```

**UI Badge:**
```tsx
<div className="px-2.5 py-1 rounded-full text-[9px] font-bold text-blue-300 
                border border-blue-400/30 bg-black/40 backdrop-blur-md 
                uppercase tracking-wider">
  DIGITAL NFT
</div>
```

---

## 3. SearchResultCard Component

### 3.1. Overview

**File:** `/src/app/components/search-result-card.tsx`

`SearchResultCard` là **THE STANDARD CARD** component được sử dụng ở mọi nơi trong hệ thống:
- ✅ Marketplace page (grid/list/map views)
- ✅ Search page results
- ✅ Favorites watchlist page
- ✅ Assets page (all tabs)
- ✅ Asset detail page (similar assets)

### 3.2. Component Props

```typescript
interface SearchResultCardProps {
  asset: MarketplaceAsset;         // Data source
  viewMode: 'grid' | 'list';       // Display mode
  onLike?: (assetId: string) => void;    // Like handler
  onClick?: (assetId: string) => void;   // Click handler
  isLiked?: boolean;               // Liked state (red heart)
}
```

### 3.3. Grid View Design

**Dimensions:**
- Width: `max-w-xs` (320px max)
- Image height: `h-48` (192px)
- Total height: ~380px (dynamic)

**Layout Structure:**
```
┌─────────────────────────────────┐
│  ┌───────────────────────────┐  │ ← Image (h-48)
│  │                           │  │
│  │      Asset Image          │  │   [RWA Badge]
│  │   (Unsplash photo)        │  │   Top-left overlay
│  │                           │  │
│  │                           │  │   [Blockchain Badge]
│  └───────────────────────────┘  │   Bottom-right
│                                  │
│  [Category] ✓                    │ ← Category + Verified
│  Asset Name                      │ ← Title (1 line)
│                                  │
│  PRICE         ENDING IN         │ ← Price & Time
│  5.8 ETH       7d 0h 0m          │
│  $12,450       45 / 100          │ ← USD & Slots
│                                  │
│  👁 1.2k  ♥ 456  ↗ Rnk 10       │ ← Stats row
└─────────────────────────────────┘
```

**Code:**
```tsx
if (viewMode === 'grid') {
  return (
    <div
      onClick={handleClick}
      className="w-full max-w-xs text-left bg-[#141417] border border-[#27272a] 
                 rounded-2xl overflow-visible hover:bg-[#1a1a1d] hover:-translate-y-1 
                 transition-all group cursor-pointer"
    >
      {/* Image Section */}
      <div className="relative h-48">
        <div className="absolute inset-0 rounded-t-2xl overflow-hidden bg-zinc-800">
          <ImageWithFallback 
            src={asset.image} 
            alt={asset.name} 
            className="w-full h-full object-cover" 
          />
          
          {/* RWA Badge - Top Left */}
          <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md 
                          px-2.5 py-1 rounded-full text-[9px] font-bold 
                          text-[#2CC295] border border-[#2CC295]/30 
                          uppercase tracking-wider">
            RWA
          </div>
        </div>
        
        {/* Blockchain Badge - Bottom Right */}
        <div className="absolute bottom-2 right-2 z-10">
          <ChainBadge chain={asset.blockchain} size={16} variant="overlay" />
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 relative">
        {/* Like Button - Top Right */}
        <button 
          onClick={handleLike} 
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center 
                     justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 
                     transition-all"
        >
          <Heart size={16} className={isLiked ? 'fill-red-500 text-red-500' : ''} />
        </button>

        {/* Category + Verified */}
        <div className="flex items-center gap-1 mb-2">
          <span className="text-[10px] font-medium text-[#2CC295] uppercase tracking-wider">
            {asset.category}
          </span>
          {asset.seller?.verified && (
            <Shield size={12} className="text-[#2CC295] fill-[#2CC295]" />
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-white mb-2 line-clamp-1 pr-10">
          {asset.name}
        </h3>

        {/* Price & Time Row */}
        <div className="flex items-start justify-between mb-3">
          {/* Price */}
          <div>
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-0.5">
              Price
            </p>
            <p className="text-base font-bold text-white">{asset.price}</p>
            {asset.priceUSD && (
              <p className="text-xs text-zinc-500">{asset.priceUSD}</p>
            )}
          </div>
          
          {/* Ending In */}
          <div className="text-right">
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-0.5">
              Ending In
            </p>
            <div className="flex items-center gap-1.5 text-white justify-end">
              <Clock size={14} className="text-[#2CC295]" />
              <p className="text-sm font-bold">{getListingDuration()}</p>
            </div>
            {asset.availableSlots && asset.totalSlots && (
              <p className="text-sm font-bold text-[#2CC295] mt-1">
                {asset.availableSlots} / {asset.totalSlots}
              </p>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between text-zinc-500 text-xs">
          <div className="flex items-center gap-1">
            <Eye size={14} />
            <span>{formatNumber(asset.views)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart size={14} />
            <span>{formatNumber(asset.likes)}</span>
          </div>
          {asset.rank && (
            <div className="flex items-center gap-1">
              <TrendingUp size={14} />
              <span>Rnk {asset.rank}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 3.4. List View Design

**Dimensions:**
- Image: `w-[180px] h-[180px]` (square)
- Total height: 180px + padding
- Layout: Horizontal (flex-row)

**Layout Structure:**
```
┌────────┬────────────────────────────────────────────┬────────┐
│        │  [Category] ✓                              │ [Like] │
│ Image  │  Asset Name (larger text)                  │        │
│ 180x   │                                            │ TIME   │
│ 180px  │  PRICE                                     │ 7d 0h  │
│        │  5.8 ETH                                   │        │
│        │  $12,450                                   │ SLOTS  │
│ [RWA]  │                                            │ 45/100 │
│ [BSC]  │  👁 1.2k  ♥ 456  ↗ Rnk 10                │ [BSC]  │
└────────┴────────────────────────────────────────────┴────────┘
```

### 3.5. Blockchain Badge Component

**ChainBadge** with portal tooltip:

```tsx
function ChainBadge({ 
  chain, 
  size = 16, 
  variant = 'overlay' 
}: {
  chain: string;
  size?: number;
  variant?: 'overlay' | 'inline';
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Tooltip appears after 200ms hover
  // Positioned via getBoundingClientRect
  // Rendered at document.body (Portal)
  
  return (
    <div onMouseEnter={() => setShowTooltip(true)} 
         onMouseLeave={() => setShowTooltip(false)}>
      <div className={badgeClass}>
        <BlockchainIcon chain={chain} size={size} />
        {isComingSoon ? (
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 
                          rounded-full bg-zinc-500 border" />
        ) : (
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 
                          rounded-full bg-[#2CC295] border animate-pulse" />
        )}
      </div>
      
      {/* Portal Tooltip */}
      <PortalTooltip chain={chain} visible={showTooltip} />
    </div>
  );
}
```

**Blockchain Config:**
```typescript
const CHAIN_DETAILS = {
  BSC: {
    color: '#F0B90B',
    active: true,           // Live with green pulse
    fullName: 'BNB Smart Chain',
    network: 'Testnet',
    chainId: '97',
    currency: 'tBNB',
    explorer: 'testnet.bscscan.com',
    blockTime: '~3s',
    consensus: 'PoSA',
    status: 'live'
  },
  Ethereum: {
    color: '#627EEA',
    active: false,          // Coming soon with gray dot
    fullName: 'Ethereum',
    network: 'Mainnet',
    chainId: '1',
    currency: 'ETH',
    explorer: 'etherscan.io',
    blockTime: '~12s',
    consensus: 'PoS',
    status: 'coming'
  },
  // ... Polygon, Arbitrum, Base
};
```

**Tooltip UI:**
```
┌─────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Accent line
├─────────────────────────────────┤
│  [Icon]  BNB Smart Chain [LIVE] │ ← Header
│          Testnet                 │
├─────────────────────────────────┤
│  CHAIN ID    97                  │ ← Details grid
│  CURRENCY    tBNB                │
│  BLOCK TIME  ~3s                 │
│  CONSENSUS   PoSA                │
├─────────────────────────────────┤
│  • testnet.bscscan.com           │ ← Explorer
└─────────────────────────────────┘
      ▼ Arrow
```

---

## 4. Marketplace Page

### 4.1. Overview

**File:** `/src/app/components/marketplace.tsx`

Marketplace là trang **public** hiển thị tất cả RWA assets đang được list for sale.

**URL:** `/marketplace`

### 4.2. Features

1. **View Modes:**
   - ✅ Grid (4 columns on desktop)
   - ✅ List (full width rows)
   - ✅ Map (world map with asset pins)

2. **Filters:**
   - 🔍 Search bar (name, description, category)
   - 📁 Category dropdown (All, Real Estate, Vehicles, Luxury Goods, Art)
   - ⛓️ Blockchain dropdown (All, BSC, Ethereum, Polygon)
   - ✅ Verified only toggle

3. **Stats Bar:**
   - Total assets
   - Total volume
   - Floor price
   - Active listings

4. **Unified Favorites:**
   - Uses `FavoritesContext`
   - Synced across all pages
   - Stored in `localStorage` keyed by wallet address

### 4.3. Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  MARKETPLACE PAGE                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [=] [≡] [🗺]  │  [🔍 Search] [Category▼] [Chain▼] [✓Verified]│
│  Grid List Map │                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ Asset 1 │  │ Asset 2 │  │ Asset 3 │  │ Asset 4 │          │
│  │         │  │         │  │         │  │         │          │
│  │ 5.8 ETH │  │ 12.5 ETH│  │ 8.2 ETH │  │ 15.0 ETH│          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ Asset 5 │  │ Asset 6 │  │ Asset 7 │  │ Asset 8 │          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                 │
│  ... 48 total assets (mock data) ...                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4. Code Structure

```tsx
export function Marketplace({ onNavigateToPage }: MarketplaceProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBlockchain, setSelectedBlockchain] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  
  // ✅ Unified favorites from context
  const { isFavorite, toggleFavorite } = useFavorites();

  // Filter assets
  const filteredAssets = useMemo(() => {
    let filtered = [...MOCK_MARKETPLACE_ASSETS];

    if (searchQuery) {
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(asset => asset.category === selectedCategory);
    }

    if (selectedBlockchain !== 'all') {
      filtered = filtered.filter(asset => asset.blockchain === selectedBlockchain);
    }

    if (verifiedOnly) {
      filtered = filtered.filter(asset => asset.verified);
    }

    return filtered;
  }, [searchQuery, selectedCategory, selectedBlockchain, verifiedOnly]);

  const handleLike = (assetId: string) => {
    toggleFavorite(assetId);
  };

  const handleAssetClick = (assetId: string) => {
    // Open asset detail modal
    setSelectedAsset(MOCK_MARKETPLACE_ASSETS.find(a => a.id === assetId));
    setIsModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-[#0f0f11]">
      {/* View Mode Toggle */}
      {/* Filters */}
      
      {/* Asset Grid/List */}
      {viewMode !== 'map' && (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
        }>
          {filteredAssets.map((asset) => (
            <SearchResultCard
              key={asset.id}
              asset={asset}
              viewMode={viewMode}
              onLike={handleLike}
              onClick={handleAssetClick}
              isLiked={isFavorite(asset.id)}
            />
          ))}
        </div>
      )}
      
      {/* Map View */}
      {viewMode === 'map' && (
        <RealisticWorldMap 
          assets={filteredAssets}
          onAssetClick={handleAssetClick}
        />
      )}
      
      {/* Asset Detail Modal */}
      <AssetDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        asset={selectedAsset}
      />
    </div>
  );
}
```

### 4.5. Mock Data Source

**File:** `/src/utils/mockMarketplaceData.ts`

```typescript
export const MOCK_MARKETPLACE_ASSETS: MarketplaceAsset[] = [
  // Real Estate (15 assets)
  {
    id: 'asset-001',
    name: 'Beach Villa Phuket #123',
    category: 'Real Estate',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
    price: '5.8 ETH',
    priceUSD: '$12,450',
    availableSlots: 45,
    totalSlots: 100,
    blockchain: 'BSC',
    seller: { address: '0x742d...', verified: true },
    // ... full data
  },
  
  // Vehicles (12 assets)
  // Luxury Goods (10 assets)
  // Art (8 assets)
  // Gaming (3 assets)
  
  // Total: 48 assets
];

export const getMarketplaceStatistics = () => ({
  totalAssets: MOCK_MARKETPLACE_ASSETS.length,
  totalVolume: '2,847.5 ETH',
  floorPrice: '0.85 ETH',
  activeListings: 48
});

export const getAllCategories = () => [
  'Real Estate', 'Vehicles', 'Luxury Goods', 'Art', 'Gaming'
];

export const getAllBlockchains = () => [
  'BSC', 'Ethereum', 'Polygon', 'Arbitrum', 'Base'
];
```

---

## 5. Assets Page

### 5.1. Overview

**File:** `/src/app/components/assets.tsx`

Assets page là trang **private** hiển thị tất cả assets mà user sở hữu (as buyer hoặc seller).

**URL:** `/assets`

### 5.2. Tab Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  MY ASSETS                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [All Assets (18)] [RWA Minted (6)] [Receipts (5)] [NFT (7)]   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Active Tab Content:                                            │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ Asset 1 │  │ Asset 2 │  │ Asset 3 │  │ Asset 4 │          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Tab Definitions:**
```typescript
type AssetTab = 'All Assets' | 'RWA Minted' | 'Receipts' | 'NFT Owned';

const tabs = [
  { 
    key: 'All Assets', 
    icon: Grid3x3, 
    count: totalAssets,
    description: 'All your assets in one place'
  },
  { 
    key: 'RWA Minted', 
    icon: Sparkles, 
    count: totalRWA,
    color: '#2CC295',
    description: 'RWA assets you minted as seller'
  },
  { 
    key: 'Receipts', 
    icon: Package, 
    count: totalReceipts,
    color: '#a855f6',
    description: 'Proof-of-purchase NFTs (non-transferable)'
  },
  { 
    key: 'NFT Owned', 
    icon: ShoppingBag, 
    count: totalNFTs,
    color: '#3b82f6',
    description: 'Digital NFTs you own'
  }
];
```

### 5.3. Asset Actions per Type

#### **RWA Minted Actions:**
```tsx
// Click on RWA Minted card
<SellerAssetManagementModal
  asset={asset}
  actions={[
    { type: 'list', label: 'List for Sale', onClick: handleListForSale },
    { type: 'pause', label: 'Pause Listing', onClick: handlePause },
    { type: 'delist', label: 'Delist', onClick: handleDelist },
    { type: 'view_revenue', label: 'View Revenue', onClick: handleViewRevenue },
    { type: 'transfer', label: 'Transfer Ownership', onClick: handleTransfer }
  ]}
/>
```

#### **Receipt NFT Actions:**
```tsx
// Click on Receipt card
<ReceiptDetailModal
  receipt={receiptNFT}
  actions={[
    { type: 'view_tx', label: 'View Transaction', onClick: handleViewTx },
    { type: 'download_receipt', label: 'Download PDF', onClick: handleDownload },
    { type: 'share', label: 'Share Receipt', onClick: handleShare }
  ]}
  // NO TRANSFER button — receipts are non-transferable
/>
```

#### **Digital NFT Actions:**
```tsx
// Click on NFT card
<DigitalNFTModal
  nft={digitalNFT}
  actions={[
    { type: 'list', label: 'List for Sale', onClick: handleListForSale },
    { type: 'transfer', label: 'Transfer NFT', onClick: handleTransfer },
    { type: 'view_collection', label: 'View Collection', onClick: handleViewCollection }
  ]}
/>
```

### 5.4. Code Structure

```tsx
export function Assets() {
  const [activeTab, setActiveTab] = useState<AssetTab>('All Assets');
  const { address } = useAccount();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  // Filter mock data by category for demo
  const rwaAssets = useMemo(() => 
    MOCK_MARKETPLACE_ASSETS.filter(a => 
      ['Real Estate', 'Vehicles', 'Luxury Goods'].includes(a.category)
    ), []
  );
  
  const receiptAssets = useMemo(() => 
    MOCK_MARKETPLACE_ASSETS.filter(a => 
      a.category === 'Receipt' // Special category for receipts
    ), []
  );
  
  const nftAssets = useMemo(() => 
    MOCK_MARKETPLACE_ASSETS.filter(a => 
      ['Art', 'Gaming', 'Digital Art'].includes(a.category)
    ), []
  );
  
  // Calculate totals
  const totalRWA = rwaAssets.length;
  const totalReceipts = receiptAssets.length;
  const totalNFTs = nftAssets.length;
  const totalAssets = totalRWA + totalReceipts + totalNFTs;
  
  // Filter based on active tab
  const displayAssets = useMemo(() => {
    switch (activeTab) {
      case 'RWA Minted': return rwaAssets;
      case 'Receipts': return receiptAssets;
      case 'NFT Owned': return nftAssets;
      default: return MOCK_MARKETPLACE_ASSETS;
    }
  }, [activeTab, rwaAssets, receiptAssets, nftAssets]);
  
  const handleCardClick = (assetId: string) => {
    const asset = MOCK_MARKETPLACE_ASSETS.find(a => a.id === assetId);
    if (!asset) return;
    
    // Open appropriate modal based on type
    if (activeTab === 'RWA Minted') {
      setSelectedAsset(asset);
      setShowSellerModal(true);
    } else if (activeTab === 'Receipts') {
      setSelectedReceipt(asset);
      setShowReceiptModal(true);
    } else if (activeTab === 'NFT Owned') {
      setSelectedNFT(asset);
      setShowNFTModal(true);
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header with stats */}
      <header className="px-8 py-6 border-b border-[#27272a]">
        <h1 className="text-2xl font-bold text-white mb-2">My Assets</h1>
        <div className="flex gap-8">
          <div className="text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">
              RWA
            </p>
            <p className="text-2xl font-bold text-white">{totalRWA}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">
              Receipts
            </p>
            <p className="text-2xl font-bold text-white">{totalReceipts}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">
              NFTs
            </p>
            <p className="text-2xl font-bold text-white">{totalNFTs}</p>
          </div>
        </div>
      </header>
      
      {/* Tab Navigation */}
      <div className="px-8 py-4 border-b border-[#27272a] flex gap-3">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-full font-bold text-xs transition-all ${
              activeTab === tab.key
                ? 'bg-[#2CC295] text-black shadow-lg shadow-[#2CC295]/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <tab.icon size={14} />
              {tab.key} ({tab.count})
            </span>
          </button>
        ))}
      </div>
      
      {/* Asset Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayAssets.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package size={40} className="text-zinc-700" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No assets found</h3>
              <p className="text-sm text-zinc-500">Start by minting RWA or purchasing NFTs</p>
            </div>
          ) : (
            displayAssets.map((asset) => (
              <SearchResultCard
                key={asset.id}
                asset={asset}
                viewMode="grid"
                isLiked={isFavorite(asset.id)}
                onLike={toggleFavorite}
                onClick={handleCardClick}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Modals */}
      <SellerAssetManagementModal ... />
      <ReceiptDetailModal ... />
      <DigitalNFTModal ... />
    </div>
  );
}
```

---

## 6. RWA Asset Flow

### 6.1. Complete RWA Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                    RWA ASSET LIFECYCLE                        │
└──────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │   SELLER    │
    │  (Minter)   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────────────┐
    │  1. MINT RWA ASSET  │ ← Minting page
    │  - Upload images    │
    │  - Set total supply │
    │  - Set metadata     │
    └──────┬──────────────┘
           │
           ▼
    ┌─────────────────────────┐
    │  RWAMintedAsset Created │ ← Assets page "RWA Minted" tab
    │  Status: 'Active'       │
    │  Available: 100/100     │
    └──────┬──────────────────┘
           │
           ▼
    ┌──────────────────────────┐
    │  2. LIST FOR SALE        │ ← SellerAssetManagementModal
    │  - Set price per slot    │
    │  - Set expiry (optional) │
    │  - Set min/max purchase  │
    └──────┬───────────────────┘
           │
           ▼
    ┌───────────────────────────┐
    │  MarketplaceAsset Created │ ← Marketplace page (public)
    │  Listed, visible to all   │
    │  Available: 100/100       │
    └──────┬────────────────────┘
           │
           ├──────────────────┬─────────────────┬──────────────┐
           │                  │                 │              │
    ┌──────▼──────┐    ┌──────▼──────┐   ┌────▼─────┐  ┌─────▼─────┐
    │   BUYER 1   │    │   BUYER 2   │   │ BUYER 3  │  │  BUYER N  │
    │ Buys 10 slots│   │ Buys 5 slots│   │Buys 1 slot│ │Buys 2 slots│
    └──────┬──────┘    └──────┬──────┘   └────┬─────┘  └─────┬─────┘
           │                  │                 │              │
           ▼                  ▼                 ▼              ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  3. PURCHASE SLOTS                                          │
    │  - Select number of slots                                   │
    │  - Pay ETH (price × slots)                                  │
    │  - Transaction via ATP v3.3                                 │
    └──────┬──────────────────────────────────────────────────────┘
           │
           ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  MarketplaceAsset Updated                                   │
    │  Available: 82/100 (18 sold)                                │
    └──────┬──────────────────────────────────────────────────────┘
           │
           └────────────────┬─────────────────┬──────────────┬────┘
                           │                 │              │
                    ┌──────▼──────┐   ┌──────▼──────┐  ┌───▼───────┐
                    │ ReceiptNFT  │   │ ReceiptNFT  │  │ReceiptNFT │
                    │ → Buyer 1   │   │ → Buyer 2   │  │→ Buyer 3  │
                    │ 10/100 slots│   │ 5/100 slots │  │ 1/100 slot│
                    └─────────────┘   └─────────────┘  └───────────┘
                         │                  │               │
                         ▼                  ▼               ▼
                    Assets Page        Assets Page     Assets Page
                    "Receipts" tab     "Receipts" tab  "Receipts" tab
                    (Buyer's wallet)   (Buyer's wallet)(Buyer's wallet)

    ┌─────────────────────────────────────────────────────────────┐
    │  4. SOLD OUT                                                │
    │  MarketplaceAsset: Available 0/100                          │
    │  Status: 'Sold Out'                                         │
    │  All 100 slots distributed to buyers                        │
    └─────────────────────────────────────────────────────────────┘
```

### 6.2. RWA States

```typescript
type RWAStatus = 'Active' | 'Paused' | 'Sold Out' | 'Delisted';

// State transitions
'Active' → user clicks "Pause Listing" → 'Paused'
'Paused' → user clicks "Resume Listing" → 'Active'
'Active' → all slots sold → 'Sold Out'
'Active' → user clicks "Delist" → 'Delisted'
```

### 6.3. Smart Contract Integration (Phase 3)

**Contracts involved:**
1. **RWAFactory.sol** - Mint new RWA tokens
2. **Marketplace.sol** - List/delist/purchase
3. **ReceiptNFT.sol** - Mint receipt NFTs

**Hooks:**
```typescript
// From /src/hooks/useAssets.ts
const { data: assets } = useUserAssets(address);
const { mutate: mintAsset } = useMintAsset();
const { mutate: listForSale } = useListAsset();
const { mutate: purchase } = usePurchaseSlots();

// From /src/hooks/useReceipts.ts
const { data: receipts } = useReceiptBalance(address);
const { mutate: mintReceipt } = useMintReceipt();
```

### 6.4. Revenue Tracking

Seller can view revenue in `SellerAssetManagementModal`:

```tsx
<div className="p-4 bg-zinc-900 rounded-lg">
  <h3 className="text-sm font-bold text-white mb-3">Revenue Overview</h3>
  
  <div className="space-y-2">
    <div className="flex justify-between">
      <span className="text-xs text-zinc-500">Total Sold</span>
      <span className="text-xs font-bold text-white">55 / 100 slots</span>
    </div>
    
    <div className="flex justify-between">
      <span className="text-xs text-zinc-500">Total Revenue</span>
      <span className="text-xs font-bold text-[#2CC295]">137.5 ETH</span>
    </div>
    
    <div className="flex justify-between">
      <span className="text-xs text-zinc-500">USD Value</span>
      <span className="text-xs font-bold text-white">$295,200</span>
    </div>
    
    <div className="flex justify-between">
      <span className="text-xs text-zinc-500">Platform Fee (2.5%)</span>
      <span className="text-xs font-bold text-zinc-400">3.44 ETH</span>
    </div>
  </div>
  
  <div className="mt-3 pt-3 border-t border-[#27272a]">
    <div className="flex justify-between">
      <span className="text-sm font-bold text-white">Net Revenue</span>
      <span className="text-sm font-bold text-[#2CC295]">134.06 ETH</span>
    </div>
  </div>
</div>
```

---

## 7. NFT Asset Flow

### 7.1. Digital NFT Lifecycle (OpenSea-like)

```
┌──────────────────────────────────────────────────────────────┐
│               DIGITAL NFT LIFECYCLE (OpenSea-like)            │
└──────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │   CREATOR   │
    │  (Minter)   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────────────┐
    │  1. MINT NFT        │ ← Minting page (NFT mode)
    │  - Upload artwork   │
    │  - Set traits       │
    │  - Set royalties    │
    └──────┬──────────────┘
           │
           ▼
    ┌─────────────────────────┐
    │  DigitalNFT Created     │ ← Assets page "NFT Owned" tab
    │  Owner: Creator         │
    │  Transferable: true     │
    └──────┬──────────────────┘
           │
           ├─────────────────────┬─────────────────────┐
           │                     │                     │
    ┌──────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐
    │ LIST FOR    │      │ TRANSFER TO │      │ KEEP IN     │
    │ SALE        │      │ ANOTHER     │      │ WALLET      │
    │             │      │ WALLET      │      │ (Hold)      │
    └──────┬──────┘      └──────┬──────┘      └─────────────┘
           │                     │
           ▼                     ▼
    ┌───────────────┐     ┌────────────────┐
    │ Marketplace   │     │ Transfer Modal │
    │ (Public)      │     │ Enter address  │
    │ Listed        │     │ Confirm tx     │
    └──────┬────────┘     └────────┬───────┘
           │                       │
           ▼                       ▼
    ┌────────────┐          ┌──────────────┐
    │ BUYER      │          │ NEW OWNER    │
    │ Purchases  │          │ Receives NFT │
    └──────┬─────┘          └──────┬───────┘
           │                       │
           ▼                       ▼
    ┌────────────────────┐  ┌────────────────────┐
    │ DigitalNFT         │  │ DigitalNFT         │
    │ Owner: Buyer       │  │ Owner: New Owner   │
    │ In "NFT Owned" tab │  │ In "NFT Owned" tab │
    └────────────────────┘  └────────────────────┘
```

### 7.2. NFT vs RWA Differences

| Feature | RWA | Digital NFT |
|---------|-----|-------------|
| **Fractionalization** | ✅ Yes (slots) | ❌ No (1-of-1 or collection) |
| **Transferable** | ⚠️ Depends (slots → receipts) | ✅ Yes (always) |
| **Receipt NFT** | ✅ Yes (issued after purchase) | ❌ No |
| **Metadata** | Rich (location, specs, etc.) | Traits, rarity |
| **Use Case** | Tokenize real assets | Art, collectibles, PFPs |
| **Badge Color** | Green (#2CC295) | Blue (#3b82f6) |

### 7.3. NFT Collection Support

```typescript
interface DigitalNFT {
  // ... other fields
  
  collection: {
    name: string;                  // "Bored Ape Yacht Club"
    address: string;               // "0x..."
    verified?: boolean;            // Blue checkmark
  };
  
  traits?: {
    Background: 'Blue';
    Eyes: 'Laser';
    Fur: 'Golden';
    Hat: 'Captain';
    Mouth: 'Bored';
  };
  
  rarity?: string;                 // "Legendary" (top 1%)
}
```

**Collection Floor Price:**
```tsx
<div className="p-4 bg-zinc-900 rounded-lg">
  <h3 className="text-sm font-bold text-white mb-2">Collection Stats</h3>
  
  <div className="space-y-2">
    <div className="flex justify-between">
      <span className="text-xs text-zinc-500">Floor Price</span>
      <span className="text-xs font-bold text-white">25.0 ETH</span>
    </div>
    
    <div className="flex justify-between">
      <span className="text-xs text-zinc-500">Last Sale</span>
      <span className="text-xs font-bold text-white">30.0 ETH</span>
    </div>
    
    <div className="flex justify-between">
      <span className="text-xs text-zinc-500">Your NFT</span>
      <span className="text-xs font-bold text-[#2CC295]">28.5 ETH</span>
    </div>
    
    <div className="flex justify-between">
      <span className="text-xs text-zinc-500">Above Floor</span>
      <span className="text-xs font-bold text-green-400">+14%</span>
    </div>
  </div>
</div>
```

---

## 8. Receipt NFT Flow

### 8.1. Receipt Generation

**Trigger:** User purchases RWA slots

```
┌──────────────────────────────────────────────────────────────┐
│              RECEIPT NFT GENERATION FLOW                      │
└──────────────────────────────────────────────────────────────┘

    BUYER clicks "Buy Slots" on Marketplace
           │
           ▼
    ┌──────────────────────────────────┐
    │ Purchase Modal                   │
    │ - Select slots (1-10)            │
    │ - Review total price             │
    │ - Confirm wallet connection      │
    └──────┬───────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────┐
    │ Blockchain Transaction (ATP v3.3)│
    │ 1. Transfer ETH to seller        │
    │ 2. Update marketplace slots      │
    │ 3. Mint receipt NFT to buyer     │
    └──────┬───────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────┐
    │ Receipt NFT Created              │
    │ receiptId: "RCPT-12345"          │
    │ orderId: "ORD-1001"              │
    │ slots: 5                         │
    │ ownershipShare: "5 / 100"        │
    │ purchaseValue: "5.8 ETH"         │
    │ transferable: false ⚠️           │
    └──────┬───────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────┐
    │ Buyer's Wallet                   │
    │ Assets Page > "Receipts" tab     │
    │ Shows purple receipt card        │
    └──────────────────────────────────┘
```

### 8.2. Receipt Card Design

**Distinct purple styling:**

```tsx
<div className="bg-[#141417] border border-purple-400/30 rounded-2xl overflow-hidden">
  {/* Image with purple tint */}
  <div className="relative h-48">
    <ImageWithFallback src={receipt.assetImage} className="w-full h-full object-cover opacity-90" />
    
    {/* Purple overlay */}
    <div className="absolute inset-0 bg-purple-500/10" />
    
    {/* Receipt Badge */}
    <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md px-2.5 py-1 
                    rounded-full text-[9px] font-bold text-purple-300 
                    border border-purple-400/30 uppercase tracking-wider flex items-center gap-1.5">
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      RECEIPT · NON-TRANSFERABLE
    </div>
  </div>
  
  {/* Content */}
  <div className="p-4">
    <div className="flex items-center gap-1 mb-2">
      <span className="text-[10px] font-medium text-purple-300 uppercase tracking-wider">
        {receipt.category}
      </span>
      <Shield size={12} className="text-purple-400 fill-purple-400" />
    </div>
    
    <h3 className="text-sm font-bold text-white mb-2">{receipt.assetName}</h3>
    
    {/* Ownership Share - Large & Prominent */}
    <div className="mb-3 p-3 bg-purple-500/10 rounded-lg border border-purple-400/20">
      <p className="text-[9px] text-purple-400 uppercase font-bold tracking-widest mb-1">
        Ownership Share
      </p>
      <p className="text-2xl font-bold text-purple-300">{receipt.ownershipShare}</p>
      <p className="text-xs text-zinc-500 mt-1">{receipt.slots} slots owned</p>
    </div>
    
    {/* Purchase Details */}
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-xs text-zinc-500">Purchase Value</span>
        <span className="text-xs font-bold text-white">{receipt.purchaseValue}</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-xs text-zinc-500">Purchase Date</span>
        <span className="text-xs font-bold text-zinc-300">{receipt.purchaseDate}</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-xs text-zinc-500">Order ID</span>
        <span className="text-xs font-mono text-zinc-400">{receipt.orderId}</span>
      </div>
    </div>
    
    {/* Verified Badge */}
    {receipt.verified && (
      <div className="mt-3 flex items-center gap-2 p-2 bg-green-500/10 rounded-lg border border-green-400/20">
        <Shield size={14} className="text-green-400 fill-green-400" />
        <span className="text-xs font-bold text-green-300">Verified On-Chain</span>
      </div>
    )}
  </div>
</div>
```

### 8.3. Receipt Detail Modal

**Actions available:**
```tsx
const receiptActions = [
  {
    icon: ExternalLink,
    label: 'View Transaction',
    description: 'View purchase tx on block explorer',
    onClick: () => window.open(`https://bscscan.com/tx/${receipt.transactionHash}`, '_blank')
  },
  {
    icon: Download,
    label: 'Download PDF Receipt',
    description: 'Download printable receipt',
    onClick: handleDownloadPDF
  },
  {
    icon: Share2,
    label: 'Share Receipt',
    description: 'Share receipt URL',
    onClick: handleShareReceipt
  },
  // ❌ NO TRANSFER BUTTON
];
```

### 8.4. Receipt vs Regular NFT UI Comparison

| Feature | Receipt NFT | Digital NFT |
|---------|-------------|-------------|
| **Badge Color** | Purple | Blue |
| **Badge Text** | "RECEIPT · NON-TRANSFERABLE" | "DIGITAL NFT" |
| **Ownership Display** | "5 / 100 slots" (prominent) | "1 of 1" or collection info |
| **Transfer Button** | ❌ Never shown | ✅ Always available |
| **Actions** | View Tx, Download PDF, Share | List, Transfer, View Collection |
| **Border Accent** | `border-purple-400/30` | `border-blue-400/30` |
| **Hover Effect** | Purple glow | Blue glow |

---

## 9. Card Visual Design

### 9.1. Photography Standards

**All asset images use high-quality Unsplash photos:**

```typescript
// Real Estate
'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800'  // Beach villa
'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'      // Dubai apt
'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800'   // Tokyo loft

// Vehicles
'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800'   // Ferrari
'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?w=800'      // Lamborghini
'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800'   // BMW

// Luxury Goods
'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800'   // Rolex
'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800'   // Patek Philippe

// Art
'https://images.unsplash.com/photo-1549887534-1541e9326642?w=800'      // Abstract art
'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800'      // Modern art

// NFT/Gaming
'https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?w=800'   // Neon art
'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800'   // Cyberpunk
```

**Image Requirements:**
- ✅ Minimum 800px width
- ✅ 16:9 or 4:3 aspect ratio
- ✅ Professional photography
- ✅ High contrast, sharp focus
- ✅ Relevant to asset category

### 9.2. Color Palette

**Primary Colors:**
```css
--primary: #2CC295;        /* Orina green (RWA badge, buttons) */
--primary-dark: #25a37d;   /* Darker shade for hover */
--primary-light: #3dd4ab;  /* Lighter shade for accents */
```

**Asset Type Colors:**
```css
/* RWA Assets */
--rwa-badge: #2CC295;
--rwa-border: rgba(44, 194, 149, 0.3);
--rwa-bg: rgba(44, 194, 149, 0.1);

/* Receipt NFTs */
--receipt-badge: #c084fc;  /* Purple-300 */
--receipt-border: rgba(192, 132, 252, 0.3);
--receipt-bg: rgba(192, 132, 252, 0.1);

/* Digital NFTs */
--nft-badge: #93c5fd;      /* Blue-300 */
--nft-border: rgba(147, 197, 253, 0.3);
--nft-bg: rgba(147, 197, 253, 0.1);
```

**Background Colors:**
```css
--bg-primary: #0f0f11;     /* Page background */
--bg-card: #141417;        /* Card background */
--bg-card-hover: #1a1a1d;  /* Card hover */
--border-primary: #27272a; /* Card borders */
```

### 9.3. Typography

**Font Stack:**
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
  sans-serif;
```

**Text Sizes (Card):**
```css
/* Badge */
.badge {
  font-size: 9px;      /* text-[9px] */
  font-weight: 700;    /* font-bold */
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Category */
.category {
  font-size: 10px;     /* text-[10px] */
  font-weight: 500;    /* font-medium */
}

/* Title */
.title {
  font-size: 14px;     /* text-sm */
  font-weight: 700;    /* font-bold */
  line-height: 1.2;
}

/* Price */
.price {
  font-size: 16px;     /* text-base */
  font-weight: 700;    /* font-bold */
}

/* Stats */
.stats {
  font-size: 12px;     /* text-xs */
  font-weight: 500;    /* font-medium */
}
```

### 9.4. Animation & Transitions

**Card Hover:**
```css
.card {
  transition: all 0.3s ease;
}

.card:hover {
  background: #1a1a1d;
  transform: translateY(-4px);
}
```

**Like Button:**
```tsx
<motion.button
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.95 }}
  onClick={handleLike}
>
  <Heart 
    className={isLiked ? 'fill-red-500 text-red-500' : 'text-zinc-500'}
  />
</motion.button>
```

**Badge Pulse (Blockchain):**
```css
.blockchain-badge .status-dot {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 10. Integration Guide

### 10.1. Quick Start

**1. Import SearchResultCard:**
```tsx
import { SearchResultCard } from '@/app/components/search-result-card';
import { MarketplaceAsset } from '@/app/types/asset';
```

**2. Import mock data:**
```tsx
import { MOCK_MARKETPLACE_ASSETS } from '@/utils/mockMarketplaceData';
```

**3. Use in your component:**
```tsx
export function MyPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { isFavorite, toggleFavorite } = useFavorites();
  
  return (
    <div className={viewMode === 'grid' 
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
      : 'space-y-4'
    }>
      {MOCK_MARKETPLACE_ASSETS.map(asset => (
        <SearchResultCard
          key={asset.id}
          asset={asset}
          viewMode={viewMode}
          onLike={toggleFavorite}
          onClick={(id) => console.log('Clicked:', id)}
          isLiked={isFavorite(asset.id)}
        />
      ))}
    </div>
  );
}
```

### 10.2. Favorites Context Integration

**Setup (already done):**
```tsx
// /src/contexts/FavoritesContext.tsx
export const FavoritesProvider = ({ children }) => {
  const { address } = useAccount();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Load from localStorage keyed by wallet address
  useEffect(() => {
    if (address) {
      const saved = localStorage.getItem(`favorites_${address.toLowerCase()}`);
      if (saved) {
        setFavorites(new Set(JSON.parse(saved)));
      }
    }
  }, [address]);
  
  // Save to localStorage
  const saveFavorites = (newFavorites: Set<string>) => {
    if (address) {
      localStorage.setItem(
        `favorites_${address.toLowerCase()}`,
        JSON.stringify(Array.from(newFavorites))
      );
    }
  };
  
  const toggleFavorite = (assetId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(assetId)) {
        newFavorites.delete(assetId);
      } else {
        newFavorites.add(assetId);
      }
      saveFavorites(newFavorites);
      return newFavorites;
    });
  };
  
  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};
```

**Usage:**
```tsx
const { isFavorite, toggleFavorite } = useFavorites();

// In SearchResultCard
<button onClick={() => toggleFavorite(asset.id)}>
  <Heart className={isFavorite(asset.id) ? 'fill-red-500' : ''} />
</button>
```

### 10.3. Asset Detail Modal Integration

```tsx
import { AssetDetailsModal } from '@/app/components/asset-details-modal';

const [selectedAsset, setSelectedAsset] = useState<MarketplaceAsset | null>(null);
const [isModalOpen, setIsModalOpen] = useState(false);

const handleAssetClick = (assetId: string) => {
  const asset = MOCK_MARKETPLACE_ASSETS.find(a => a.id === assetId);
  setSelectedAsset(asset);
  setIsModalOpen(true);
};

return (
  <>
    <SearchResultCard onClick={handleAssetClick} ... />
    
    <AssetDetailsModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      asset={selectedAsset}
      onNavigateToSeller={handleNavigateToSeller}
    />
  </>
);
```

### 10.4. Type Guards Usage

```tsx
import { 
  isMarketplaceAsset, 
  isRWAMintedAsset, 
  isReceiptNFT, 
  isDigitalNFT 
} from '@/app/types/asset';

// Render different cards based on type
const renderAssetCard = (asset: Asset) => {
  if (isMarketplaceAsset(asset)) {
    return <SearchResultCard asset={asset} viewMode="grid" />;
  }
  
  if (isRWAMintedAsset(asset)) {
    return <RWAMintedCard asset={asset} />;
  }
  
  if (isReceiptNFT(asset)) {
    return <ReceiptCard receipt={asset} />;
  }
  
  if (isDigitalNFT(asset)) {
    return <DigitalNFTCard nft={asset} />;
  }
  
  return null;
};
```

### 10.5. Contract Integration Preparation

**Phase 3: Replace mock data with contract calls**

```tsx
// Before (mock data):
const assets = MOCK_MARKETPLACE_ASSETS;

// After (contract data):
const { data: assets } = useMarketplaceAssets();

// Hook implementation:
export function useMarketplaceAssets() {
  const { data: rawAssets } = useContractRead({
    address: MARKETPLACE_ADDRESS,
    abi: MarketplaceABI,
    functionName: 'getAllListedAssets'
  });
  
  // Transform contract data to MarketplaceAsset format
  const assets = useMemo(() => {
    if (!rawAssets) return [];
    
    return rawAssets.map(transformContractAsset);
  }, [rawAssets]);
  
  return { data: assets, isLoading, error };
}
```

---

## 📚 Appendix

### A. File Locations

```
src/
├── app/
│   ├── types/
│   │   └── asset.ts                         # All asset type definitions
│   └── components/
│       ├── search-result-card.tsx           # ★ Main card component
│       ├── marketplace.tsx                  # Marketplace page
│       ├── assets.tsx                       # Assets page (private)
│       ├── favorites/
│       │   └── favorites-page.tsx           # Favorites watchlist
│       ├── asset-details/
│       │   └── asset-details-page.tsx       # Asset detail modal
│       ├── seller-asset-management-modal.tsx # RWA actions
│       ├── receipt-detail-modal.tsx         # Receipt actions
│       └── transfer-modal.tsx               # Transfer modal
├── utils/
│   ├── mockMarketplaceData.ts               # ★ Marketplace mock data
│   └── mockAssetData.ts                     # Assets mock data
├── contexts/
│   └── FavoritesContext.tsx                 # ★ Favorites sync
└── hooks/
    ├── useAssets.ts                         # Contract hooks (Phase 3)
    ├── useReceipts.ts                       # Receipt hooks
    └── useMarketplace.ts                    # Marketplace hooks
```

### B. Key Constants

```typescript
// Colors
export const COLORS = {
  primary: '#2CC295',
  rwa: '#2CC295',
  receipt: '#c084fc',
  nft: '#93c5fd',
  bgCard: '#141417',
  border: '#27272a'
};

// View Modes
export type ViewMode = 'grid' | 'list' | 'map';

// Asset Categories
export const CATEGORIES = [
  'Real Estate',
  'Vehicles',
  'Luxury Goods',
  'Art',
  'Gaming',
  'Digital Art'
];

// Blockchains
export const BLOCKCHAINS = [
  'BSC',
  'Ethereum',
  'Polygon',
  'Arbitrum',
  'Base'
];

// Status
export type AssetStatus = 'Active' | 'Paused' | 'Sold Out' | 'Delisted';
```

### C. Component Props Reference

```typescript
// SearchResultCard
interface SearchResultCardProps {
  asset: MarketplaceAsset;
  viewMode: 'grid' | 'list';
  onLike?: (assetId: string) => void;
  onClick?: (assetId: string) => void;
  isLiked?: boolean;
}

// Marketplace
interface MarketplaceProps {
  onNavigateToPage?: (page: string) => void;
}

// AssetDetailsModal
interface AssetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: MarketplaceAsset | null;
  onNavigateToSeller?: (sellerAddress: string) => void;
}

// SellerAssetManagementModal
interface SellerAssetManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: RWAMintedAsset;
  onAction: (action: AssetAction) => void;
}

// ReceiptDetailModal
interface ReceiptDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptNFT;
}
```

### D. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-02-13 | Complete rewrite with full documentation |
| 1.5 | 2026-02-10 | Added Receipt NFT flow |
| 1.0 | 2026-02-01 | Initial documentation |

---

## 📞 Support & Resources

- **Documentation:** This file + `/ASSET_INFO_DOCUMENTATION.md`
- **Figma Design:** [View Prototype](https://figma.com/orina)
- **GitHub:** [Report Issues](https://github.com/orina/issues)
- **Discord:** [Join Community](https://discord.gg/orina)

---

**Last Updated:** February 13, 2026  
**Document Version:** 2.0  
**Maintained By:** Orina Development Team  
**Protocol Version:** ATP v3.3-freeze
