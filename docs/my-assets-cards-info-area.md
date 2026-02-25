# My Assets Cards - Info Area Documentation

## Overview
This document defines the **Info Area** structure for all 3 My Assets Card variants. Use this as a reference when building or modifying My Assets cards.

**Location:** `/src/app/components/assets.tsx`  
**Used in:** My Assets page - RWA Minted, Receipts, NFT Owned tabs

---

## Design Principles

### 1. **Layout Structure**
All My Assets cards follow this vertical structure:
```
┌─────────────────────────────┐
│  IMAGE (h-48)               │ <- 192px height
│  + Badge Overlay            │
│  + Status Indicators        │
├─────────────────────────────┤
│  CONTENT AREA (p-4)         │
│  ├─ Category + Verified     │
│  ├─ Asset Name              │
│  ├─ INFO AREA ⭐            │ <- Focus of this doc
│  ├─ Spacer (flex-1)         │
│  └─ Action Buttons          │
└─────────────────────────────┘
```

### 2. **Info Area Typography (STANDARDIZED)**
All labels must use this exact style:
```tsx
className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest"
```

This matches the Marketplace "Price" label style for consistency.

---

## Card Type 1: RWA Minted Card

### Purpose
Display Real-World Assets that the **seller has minted** and is currently selling.

### Info Area Fields

| Field Name | Data Type | Display Format | Description |
|------------|-----------|----------------|-------------|
| **Available / Total** | `string` | `"45 / 100"` | Shows slots available vs total minted |
| **Min Price** | `string` | `"2.5 ETH"` | Minimum price per slot |
| **Minted** | `string` | `"2024-01-15"` | Date when RWA was minted |

### Code Example
```tsx
<div className="space-y-2 mb-3">
  <div className="flex items-center justify-between text-xs">
    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
      Available / Total:
    </span>
    <span className="text-zinc-300 font-medium">45 / 100</span>
  </div>
  <div className="flex items-center justify-between text-xs">
    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
      Min Price:
    </span>
    <span className="text-white font-bold">2.5 ETH</span>
  </div>
  <div className="flex items-center justify-between text-xs">
    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
      Minted:
    </span>
    <span className="text-zinc-400">2024-01-15</span>
  </div>
</div>
```

### Mock Data Structure
```typescript
{
  id: 'rwa-1',
  name: 'Luxury Apartment #442',
  type: 'RWA',
  category: 'Real Estate',
  image: 'luxury apartment modern interior',
  totalAmount: '100',        // For "Total"
  availableAmount: '45',     // For "Available"
  minPrice: '2.5 ETH',       // For "Min Price"
  status: 'Active',          // For status badge
  mintedDate: '2024-01-15',  // For "Minted"
  transferable: false,
}
```

---

## Card Type 2: Receipt NFT Card

### Purpose
Display **Receipt NFTs** that the buyer receives after purchasing RWA slots.

### Info Area Fields

| Field Name | Data Type | Display Format | Description |
|------------|-----------|----------------|-------------|
| **Order ID** | `string` | `"ORD-1001"` | Unique order identifier |
| **Purchase Date** | `string` | `"2024-02-10"` | Date of purchase |
| **Seller** | `string` | `"0x742d...9c4F"` | Seller's wallet address (shortened) |

### Code Example
```tsx
<div className="space-y-2 mb-3">
  <div className="flex items-center justify-between text-xs">
    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
      Order ID:
    </span>
    <span className="text-zinc-400 font-medium">ORD-1001</span>
  </div>
  <div className="flex items-center justify-between text-xs">
    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
      Purchase Date:
    </span>
    <span className="text-zinc-400">2024-02-10</span>
  </div>
  <div className="flex items-center justify-between text-xs">
    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
      Seller:
    </span>
    <span className="text-zinc-400 font-medium">0x742d...9c4F</span>
  </div>
</div>
```

### Mock Data Structure
```typescript
{
  id: 'receipt-1',
  name: 'Beach Villa #123 Receipt',
  type: 'Receipt',
  category: 'Real Estate',
  orderId: 'ORD-1001',         // For "Order ID"
  image: 'beach villa ocean sunset',
  purchaseValue: '5.8 ETH',    // For bottom section
  purchaseDate: '2024-02-10',  // For "Purchase Date"
  seller: '0x742d...9c4F',     // For "Seller"
  blockchain: 'ETH',           // For bottom badge
}
```

---

## Card Type 3: Digital NFT Card

### Purpose
Display **Digital NFTs** that the user owns and can transfer or sell.

### Info Area Fields

| Field Name | Data Type | Display Format | Description |
|------------|-----------|----------------|-------------|
| **Current Price** | `string` | `"0.45 ETH"` | Current market price |
| **Floor Price** | `string` | `"0.35 ETH"` | Floor price of collection |

### Code Example
```tsx
<div className="space-y-2 mb-3">
  <div className="flex items-center justify-between text-xs">
    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
      Current Price:
    </span>
    <span className="text-white font-bold">0.45 ETH</span>
  </div>
  <div className="flex items-center justify-between text-xs">
    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
      Floor Price:
    </span>
    <span className="text-zinc-400">0.35 ETH</span>
  </div>
</div>
```

### Mock Data Structure
```typescript
{
  id: 'nft-1',
  name: 'CyberPunk #4421',
  type: 'NFT',
  category: 'Digital Art',
  image: 'cyberpunk neon city digital art',
  currentPrice: '0.45 ETH',   // For "Current Price"
  floorPrice: '0.35 ETH',     // For "Floor Price"
  collection: 'Neon Dreams Collection',
  transferable: true,
}
```

---

## Visual Comparison

### Info Area Spacing
```tsx
// Standard spacing pattern for all Info Areas:
<div className="space-y-2 mb-3">
  {/* Each row */}
  <div className="flex items-center justify-between text-xs">
    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
      LABEL:
    </span>
    <span className="[value-style]">[VALUE]</span>
  </div>
</div>
```

### Value Styles by Importance

| Value Type | Style Class | Example |
|------------|-------------|---------|
| **Primary (Price)** | `text-white font-bold` | Min Price, Current Price |
| **Secondary** | `text-zinc-300 font-medium` | Available/Total count |
| **Tertiary** | `text-zinc-400` | Dates, addresses |

---

## Additional Bottom Sections

### RWA Minted Card - Bottom
```tsx
<div className="pt-3 border-t border-[#27272a] mt-auto">
  <button className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-[#27272a] rounded-lg text-xs font-bold text-white transition-colors flex items-center justify-center gap-2">
    <Eye size={14} />
    View Details
  </button>
</div>
```

### Receipt NFT Card - Bottom
```tsx
<div className="flex items-center justify-between pt-3 border-t border-[#27272a] mt-auto">
  <div>
    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">
      Purchase Value
    </p>
    <p className="text-base font-bold text-white">5.8 ETH</p>
  </div>
  <div className="px-3 py-1 bg-zinc-900 border border-[#27272a] rounded-lg">
    <span className="text-xs font-bold text-zinc-400">ETH</span>
  </div>
</div>
```

### Digital NFT Card - Bottom
```tsx
<div className="pt-3 border-t border-[#27272a] flex gap-2 mt-auto">
  <button className="flex-1 py-2.5 bg-[#2CC295] hover:bg-[#2CC295]/90 text-black rounded-lg text-xs font-bold transition-colors">
    Transfer
  </button>
  <button className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-[#27272a] text-white rounded-lg text-xs font-bold transition-colors">
    List for Sale
  </button>
</div>
```

---

## Badge Overlays

### RWA Minted Card
- **Top-left:** `RWA MINTED` badge (teal/green)
- **Top-right:** Status badge (`Active`, `Sold Out`)
- **No Heart button** (My Assets = owned, not marketplace)

### Receipt NFT Card
- **Top-left:** `RECEIPT NFT` badge (purple)
- **Bottom overlay:** `Non-Transferable` indicator (orange)
- **No Heart button**

### Digital NFT Card
- **Top-left:** `DIGITAL NFT` badge (blue)
- **Bottom overlay:** `Transferable` indicator (teal, animated pulse)
- **No Heart button**

---

## Future Development Notes

### Expandable Info Area
Consider adding expandable sections for:
- **Transaction History** (for Receipt NFTs)
- **Price History Chart** (for Digital NFTs)
- **Buyer List** (for RWA Minted with multiple slots)

### Interactive Features
- Click label to copy value (e.g., Order ID, Seller address)
- Hover tooltip for more details
- Real-time price updates for Digital NFTs

### Blockchain Integration
When connecting to real contracts:
```typescript
// RWA Minted Card
const { totalSupply, availableSupply } = useRWAContract(assetId);
const availableTotal = `${availableSupply} / ${totalSupply}`;

// Receipt NFT Card
const { orderId, seller, purchaseDate } = useReceiptNFT(tokenId);

// Digital NFT Card
const { currentPrice, floorPrice } = useNFTMarketData(collectionAddress);
```

---

## Design System Reference

### Colors
- **Teal accent:** `#2CC295` (primary actions, RWA badges)
- **Purple accent:** `purple-400` (Receipt NFT theme)
- **Blue accent:** `blue-400` (Digital NFT theme)
- **Orange warning:** `orange-400` (Non-transferable)
- **Green success:** `green-400` (Active status, Transferable)

### Typography Scale
- **Label:** `text-[9px]` + uppercase + font-bold + tracking-widest
- **Value (primary):** `text-white font-bold`
- **Value (secondary):** `text-zinc-300 font-medium`
- **Value (tertiary):** `text-zinc-400`

---

## Complete Card Examples

See `/src/app/components/notifications/card-layout-tab.tsx` for complete working examples of all 3 card types with proper styling and structure.

---

**Last Updated:** 2026-02-07  
**Version:** 1.0  
**Maintained by:** Web3 Analytics Dashboard Studio Pro Team
