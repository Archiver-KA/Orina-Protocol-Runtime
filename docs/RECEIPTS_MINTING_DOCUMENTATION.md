# 🎫 Orina Receipts & Minting System - Complete Technical Documentation
## FractionalReceiptNFT & Asset Minting Protocol

> **Version:** 3.3-final  
> **Last Updated:** February 14, 2026  
> **Protocol:** Atomic Transaction Protocol (ATP) v3.3  
> **Chain:** BSC Mainnet (56), BSC Testnet (97)

---

## 📋 Table of Contents

1. [System Overview](#1-system-overview)
2. [Receipt NFT Architecture](#2-receipt-nft-architecture)
3. [Asset Minting System](#3-asset-minting-system)
4. [Receipt Types](#4-receipt-types)
5. [Receipt Creation Flow](#5-receipt-creation-flow)
6. [Hooks Documentation](#6-hooks-documentation)
7. [My Receipts Page](#7-my-receipts-page)
8. [Receipt Detail Modal](#8-receipt-detail-modal)
9. [QR Code System](#9-qr-code-system)
10. [Transfer Restrictions](#10-transfer-restrictions)
11. [Proof-of-Ownership](#11-proof-of-ownership)
12. [Integration with Orders](#12-integration-with-orders)
13. [Smart Contract Integration](#13-smart-contract-integration)
14. [Metadata & IPFS](#14-metadata--ipfs)
15. [Code Examples](#15-code-examples)
16. [Best Practices](#16-best-practices)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. System Overview

### 1.1. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 RECEIPTS & MINTING SYSTEM ARCHITECTURE                      │
│                         ATP v3.3-final Protocol                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  FRONTEND LAYER (React + Wagmi + Viem)                               │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  Pages & Components:                                                  │  │
│  │  • Minting Page (mint new assets)                                     │  │
│  │  • My Receipts Page (grid view)                                       │  │
│  │  • Receipt Detail Modal (full screen)                                 │  │
│  │  • Receipt Detail Page (with sidebar)                                 │  │
│  │  • QR Code Display (physical auth)                                    │  │
│  │  • Transfer Modal (NFT receipts only)                                 │  │
│  │                                                                       │  │
│  │  Hooks:                                                               │  │
│  │  • useMintAsset() - Mint RWA/NFT                                      │  │
│  │  • useReceiptBalance() - Get user balance                             │  │
│  │  • useReceipt() - Get receipt details                                 │  │
│  │  • useReceiptTokenURI() - Get metadata URI                            │  │
│  │  • useReceiptOwner() - Get owner address                              │  │
│  │  • isReceiptTransferable() - Check if can transfer                    │  │
│  │                                                                       │  │
│  └─────────────────────────────┬─────────────────────────────────────────┘  │
│                                │                                            │
│                                ▼                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  SMART CONTRACT LAYER (Solidity)                                     │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  OrinaRWA.sol (Asset Minting Contract)                                │  │
│  │  • mintAsset(unitId, amount, expiry, assetType)                       │  │
│  │  • Asset types: 0=RWA, 1=NFT                                          │  │
│  │  • Asset struct: { assetId, unitId, owner, totalAmount, expiry }     │  │
│  │  • Event: AssetMinted(assetId, owner, unitId, amount, assetType)     │  │
│  │                                                                       │  │
│  │  FractionalReceiptNFT.sol (Receipt Contract)                          │  │
│  │  • ERC721 standard with transfer restrictions                         │  │
│  │  • _mintReceipt(buyer, orderId, assetId, amount, assetType)          │  │
│  │  • Receipt struct: { orderId, assetId, amount, assetType }           │  │
│  │  • Transfer control: RWA = soulbound, NFT = transferable             │  │
│  │  • Event: ReceiptMinted(tokenId, buyer, orderId, assetId, amount)    │  │
│  │                                                                       │  │
│  │  Transfer Restrictions:                                               │  │
│  │    function _beforeTokenTransfer(...) {                               │  │
│  │      if (assetType == AssetType.RWA) {                                │  │
│  │        require(from == address(0), "RWA receipts non-transferable");  │  │
│  │      }                                                                │  │
│  │      // NFT receipts can be freely transferred                        │  │
│  │    }                                                                  │  │
│  │                                                                       │  │
│  └─────────────────────────────┬─────────────────────────────────────────┘  │
│                                │                                            │
│                                ▼                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  METADATA & IPFS LAYER                                                │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  tokenURI(tokenId) → IPFS Gateway                                     │  │
│  │  • CID: QmXyz...abc (stored in contract)                              │  │
│  │  • Gateway: ipfs://QmXyz...abc or https://ipfs.io/ipfs/QmXyz...abc   │  │
│  │                                                                       │  │
│  │  Receipt Metadata JSON:                                               │  │
│  │  {                                                                    │  │
│  │    "name": "Receipt NFT #1001",                                       │  │
│  │    "description": "Proof-of-ownership for Order #88220",             │  │
│  │    "image": "ipfs://QmImage...abc",                                   │  │
│  │    "attributes": [                                                    │  │
│  │      { "trait_type": "Order ID", "value": "88220" },                 │  │
│  │      { "trait_type": "Asset ID", "value": "15" },                    │  │
│  │      { "trait_type": "Amount", "value": "1" },                       │  │
│  │      { "trait_type": "Asset Type", "value": "RWA" },                 │  │
│  │      { "trait_type": "Purchase Date", "value": "2026-02-14" },       │  │
│  │      { "trait_type": "Seller", "value": "0x742d...c4F" }             │  │
│  │    ],                                                                 │  │
│  │    "properties": {                                                    │  │
│  │      "orderId": "88220",                                              │  │
│  │      "assetId": "15",                                                 │  │
│  │      "amount": "1",                                                   │  │
│  │      "assetType": "RWA",                                              │  │
│  │      "transferable": false                                            │  │
│  │    }                                                                  │  │
│  │  }                                                                    │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  BLOCKCHAIN LAYER                                                     │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  BSC Mainnet (chainId: 56)                                            │  │
│  │  • FractionalReceiptNFT: 0x...Receipt_Address                         │  │
│  │  • OrinaRWA: 0x...RWA_Address                                         │  │
│  │  • MarketplaceATP: 0x...Marketplace_Address                           │  │
│  │                                                                       │  │
│  │  Events Emitted:                                                      │  │
│  │  • AssetMinted(assetId, owner, unitId, amount, assetType)            │  │
│  │  • ReceiptMinted(tokenId, buyer, orderId, assetId, amount)           │  │
│  │  • Transfer(from, to, tokenId) - ERC721 standard                     │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2. Key Features

✅ **Dual Asset Types:**
- **RWA (Real World Assets):** Non-transferable receipts (soulbound)
- **NFT (Digital NFTs):** Freely transferable receipts

✅ **Proof-of-Ownership:**
- ERC721-compliant receipt NFTs
- Immutable on-chain record of purchase
- Linked to original order ID
- Legal proof of fractional rights

✅ **Transfer Control:**
- RWA receipts: Cannot be transferred (except mint/burn)
- NFT receipts: Standard ERC721 transferability
- Smart contract enforced via `_beforeTokenTransfer` hook

✅ **QR Code Authentication:**
- Each receipt has unique QR code
- Physical vault authentication
- Instant verification via NFC/QR scan

✅ **Metadata Storage:**
- IPFS for permanent metadata
- Rich attributes (order ID, asset ID, amount, type)
- NFT marketplace compatible (OpenSea, Rarible)

✅ **Integration:**
- Auto-minted after order finalization
- Linked to order lifecycle
- Balance tracking per wallet
- Collection management

---

## 2. Receipt NFT Architecture

### 2.1. Receipt Structure

```typescript
interface Receipt {
  // === Core Identifiers ===
  orderId: bigint;              // Order that generated this receipt
  assetId: bigint;              // Original asset ID
  amount: bigint;               // Fractional amount purchased
  assetType: AssetType;         // 0=RWA (non-transferable), 1=NFT (transferable)
}

enum AssetType {
  RWA = 0,   // Real World Asset - Soulbound receipt
  NFT = 1,   // Digital NFT - Transferable receipt
}
```

### 2.2. Receipt Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RECEIPT NFT LIFECYCLE                               │
└─────────────────────────────────────────────────────────────────────────────┘

Order Finalized                    Receipt Minted                    Holder
      │                                  │                               │
      ▼                                  ▼                               ▼
┌──────────────┐                  ┌──────────────┐              ┌──────────────┐
│  Order #1001 │                  │ Receipt NFT  │              │    Wallet    │
│  State:      │  confirmDelivery │  Token #1001 │  Transfer    │  0xABC...123 │
│  FINALIZED   │ ───────────────► │  Owner: Buyer│ ────────────►│  Balance: 3  │
│              │                  │  OrderId: 1001│  (NFT only)  │              │
└──────────────┘                  │  AssetId: 15 │              └──────────────┘
                                  │  Amount: 1   │
                                  │  Type: RWA   │
                                  └──────────────┘
                                         │
                                         │ tokenURI()
                                         ▼
                                  ┌──────────────┐
                                  │ IPFS Metadata│
                                  │ QmXyz...abc  │
                                  │ {            │
                                  │   name: ...  │
                                  │   image: ... │
                                  │   attrs: ... │
                                  │ }            │
                                  └──────────────┘
```

### 2.3. Transfer Restrictions Logic

```solidity
// FractionalReceiptNFT.sol
function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
) internal virtual override {
    super._beforeTokenTransfer(from, to, tokenId);
    
    Receipt storage receipt = receipts[tokenId];
    
    // Allow minting (from == address(0))
    if (from == address(0)) {
        return;
    }
    
    // Allow burning (to == address(0))
    if (to == address(0)) {
        return;
    }
    
    // Block transfers for RWA assets
    if (receipt.assetType == AssetType.RWA) {
        revert("RWA receipts are non-transferable");
    }
    
    // NFT receipts can be transferred freely
}
```

**Why Non-Transferable for RWA?**
- RWA receipts represent legal ownership rights
- Transfer requires legal documentation
- Prevents unauthorized secondary sales
- Protects buyer and seller legally

**Why Transferable for NFT?**
- Digital NFTs have no physical constraints
- Standard NFT marketplace compatibility
- Secondary market liquidity
- Creator royalties can be enforced

---

## 3. Asset Minting System

### 3.1. Minting Flow Diagram

```
[SELLER]                         [UI]                        [CONTRACT]
   │                               │                              │
   │  1. Navigate to Minting Page  │                              │
   ├──────────────────────────────►│                              │
   │                               │                              │
   │                               │  2. Load Minting Form        │
   │                               │     • Asset Type: RWA/NFT    │
   │                               │     • Unit Type selector     │
   │                               │     • Amount input           │
   │                               │     • Expiry picker          │
   │                               │     • Image upload           │
   │                               │                              │
   │  3. Select Asset Type         │                              │
   │     [x] RWA                   │                              │
   │     [ ] NFT                   │                              │
   ├──────────────────────────────►│                              │
   │                               │                              │
   │  4. Upload Images             │                              │
   │     • Main image              │                              │
   │     • Gallery (3-5 images)    │                              │
   ├──────────────────────────────►│                              │
   │                               │                              │
   │                               │  5. Upload to IPFS           │
   │                               │     • Pinata API             │
   │                               │     • Get image CIDs         │
   │                               │                              │
   │  6. Fill Form                 │                              │
   │     • Unit Type: Luxury Watch │                              │
   │     • Total Amount: 100       │                              │
   │     • Expiry: 365 days        │                              │
   ├──────────────────────────────►│                              │
   │                               │                              │
   │  7. Click "Mint Asset"        │                              │
   ├──────────────────────────────►│                              │
   │                               │                              │
   │                               │  8. Prepare Mint Tx          │
   │                               │     unitId = 5               │
   │                               │     amount = 100n            │
   │                               │     expiry = now + 365 days  │
   │                               │     assetType = 0 (RWA)      │
   │                               │                              │
   │  9. MetaMask Prompt           │                              │
   │     "Mint Asset"              │                              │
   │     [Confirm Transaction]     │                              │
   ├──────────────────────────────►│                              │
   │                               │                              │
   │  10. Submit Transaction       │                              │
   │       mintAsset()             │                              │
   ├──────────────────────────────►│─────────────────────────────►│
   │                               │                              │
   │                               │                 11. Verify Caller
   │                               │                     • msg.sender valid?
   │                               │                     • has MINTER_ROLE?
   │                               │                              │
   │                               │                 12. Check UnitId
   │                               │                     • unitId exists?
   │                               │                     • valid unit type?
   │                               │                              │
   │                               │                 13. Mint Asset
   │                               │                     • assetId = nextAssetId++
   │                               │                     • owner = msg.sender
   │                               │                     • totalAmount = 100
   │                               │                     • expiryAt = timestamp
   │                               │                     • assetType = RWA
   │                               │                              │
   │                               │                 14. Emit Event
   │                               │                     AssetMinted(...)
   │                               │                              │
   │                               │  ◄──────────────────────────┤
   │                               │  Tx Confirmed ✅              │
   │  ◄────────────────────────────┤                              │
   │  Asset Minted!                │                              │
   │  Asset ID: #15                │                              │
   │                               │                              │
   │  15. Redirect to Marketplace  │                              │
   │      List asset for sale      │                              │
   │                               │                              │
```

### 3.2. Mint Asset Hook

**File:** `/src/hooks/useAssets.ts`

```typescript
/**
 * Mint a new asset (RWA or NFT)
 * 
 * @param unitId - Unit type ID from UnitRegistry
 * @param totalAmount - Total fractional amount
 * @param expiryAt - Expiry timestamp (0 for no expiry)
 * @param assetType - 0=RWA (non-transferable receipt), 1=NFT (transferable receipt)
 */
export function useMintAsset() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const mintAsset = async (
    unitId: bigint,
    totalAmount: bigint,
    expiryAt: bigint,
    assetType: AssetType = AssetType.RWA,
  ) => {
    writeContract({
      address: CONTRACTS.ORINA_RWA,
      abi: ORINA_RWA_ABI,
      functionName: 'mintAsset',
      args: [unitId, totalAmount, expiryAt, assetType],
    });
  };

  return { mintAsset, hash, isPending, isConfirming, isConfirmed, error, reset };
}
```

### 3.3. Minting Page UI

**File:** `/src/app/components/minting.tsx`

**Key Features:**
- Asset type toggle (RWA/NFT)
- Unit type dropdown (from UnitRegistry)
- Total amount input
- Expiry picker (with "No Expiry" option)
- Multi-image upload (IPFS)
- Preview section
- Gas estimate
- Mint button with status

**UI Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Mint New Asset                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Asset Type:                                        │
│  [x] RWA (Real World Asset)                         │
│  [ ] NFT (Digital NFT)                              │
│                                                     │
│  Unit Type:                                         │
│  [  Select Unit Type  ▼]                            │
│  • Luxury Watches                                   │
│  • Real Estate                                      │
│  • Art & Collectibles                               │
│  • Precious Metals                                  │
│                                                     │
│  Total Amount:                                      │
│  [  100  ] units (fractional)                       │
│                                                     │
│  Expiry:                                            │
│  ( ) No Expiry                                      │
│  (x) Expires After: [ 365 ] days                    │
│                                                     │
│  Images:                                            │
│  ┌───────────────────────────────────────────────┐  │
│  │ [+] Upload Main Image                         │  │
│  │ [+] Upload Gallery (3-5 images)               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Preview:                                           │
│  ┌───────────────────────────────────────────────┐  │
│  │ [Image]                                       │  │
│  │ Luxury Watch Collection                        │  │
│  │ 100 units • RWA • Expires in 365 days         │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [Cancel]                          [Mint Asset]    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 4. Receipt Types

### 4.1. RWA Receipt (Non-Transferable)

```typescript
interface RWAReceipt {
  tokenId: bigint;              // ERC721 token ID
  orderId: bigint;              // Order #88220
  assetId: bigint;              // Asset #15
  amount: bigint;               // 1 unit
  assetType: AssetType.RWA;     // 0
  transferable: false;          // Soulbound
  
  // UI Properties
  badge: 'RWA RECEIPT';
  badgeColor: 'purple';
  transferIndicator: 'NON-TRANSFERABLE';
  qrCode: string;               // For physical auth
  legalDocument: string;        // IPFS link to terms
}
```

**Use Cases:**
- Luxury goods (watches, jewelry)
- Real estate fractional ownership
- Art & collectibles
- Vehicle ownership
- Precious metals custody

**Features:**
- ✅ Proof-of-ownership
- ✅ Legal documentation link
- ✅ QR code for physical verification
- ✅ Immutable purchase record
- ❌ Cannot transfer (except burn)
- ❌ Not listed on NFT marketplaces

### 4.2. NFT Receipt (Transferable)

```typescript
interface NFTReceipt {
  tokenId: bigint;              // ERC721 token ID
  orderId: bigint;              // Order #88221
  assetId: bigint;              // Asset #16
  amount: bigint;               // 1 unit
  assetType: AssetType.NFT;     // 1
  transferable: true;           // Standard ERC721
  
  // UI Properties
  badge: 'NFT RECEIPT';
  badgeColor: 'teal';
  transferIndicator: 'TRANSFERABLE';
  qrCode: string;               // For verification
  royalties: number;            // Creator royalties %
}
```

**Use Cases:**
- Digital art NFTs
- Music & media NFTs
- Gaming items
- Virtual land
- Metaverse assets

**Features:**
- ✅ Proof-of-ownership
- ✅ Fully transferable
- ✅ NFT marketplace compatible
- ✅ Royalties enforced
- ✅ Secondary market liquidity
- ✅ Standard ERC721 interface

### 4.3. Comparison Table

| Feature | RWA Receipt | NFT Receipt |
|---------|-------------|-------------|
| **Transferable** | ❌ No (Soulbound) | ✅ Yes (Standard) |
| **Secondary Market** | ❌ No | ✅ Yes (OpenSea, etc.) |
| **Physical Link** | ✅ Yes (QR/NFC) | ⚠️  Optional |
| **Legal Docs** | ✅ Required | ❌ Optional |
| **Custody** | ✅ Physical vault | 🔐 Digital wallet |
| **Royalties** | N/A | ✅ Yes |
| **Verification** | QR + Physical | Blockchain only |
| **Use Case** | Physical assets | Digital assets |

---

## 5. Receipt Creation Flow

### 5.1. Automatic Receipt Minting

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RECEIPT MINTING TRIGGER FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

Order Finalized                MarketplaceATP               FractionalReceiptNFT
      │                               │                              │
      │                               │                              │
      ▼                               ▼                              │
┌──────────────┐              ┌──────────────┐                      │
│ confirmDelivery()            │ _finalize()  │                      │
│ • Buyer confirms             │ • Release    │                      │
│ • State → FINALIZED          │   funds      │                      │
└──────┬───────┘              └──────┬───────┘                      │
       │                               │                              │
       │                               │  Internal Call               │
       │                               ├─────────────────────────────►│
       │                               │  _mintReceipt(               │
       │                               │    buyer,                    │
       │                               │    orderId,                  │
       │                               │    assetId,                  │
       │                               │    amount,                   │
       │                               │    assetType                 │
       │                               │  )                           │
       │                               │                              │
       │                               │                 ┌────────────▼────────────┐
       │                               │                 │ FractionalReceiptNFT    │
       │                               │                 │ • tokenId = nextTokenId++│
       │                               │                 │ • receipts[tokenId] = { │
       │                               │                 │     orderId,            │
       │                               │                 │     assetId,            │
       │                               │                 │     amount,             │
       │                               │                 │     assetType           │
       │                               │                 │   }                     │
       │                               │                 │ • _mint(buyer, tokenId) │
       │                               │                 │ • Emit ReceiptMinted    │
       │                               │                 └────────────┬────────────┘
       │                               │                              │
       │                               │  ◄───────────────────────────┤
       │                               │  Receipt Minted ✅            │
       │                               │                              │
       │  ◄────────────────────────────┤                              │
       │  Order Finalized ✅            │                              │
       │  Receipt NFT #1001 minted     │                              │
       │                               │                              │
```

### 5.2. Receipt Minting Function

```solidity
// FractionalReceiptNFT.sol
function _mintReceipt(
    address buyer,
    uint256 orderId,
    uint256 assetId,
    uint256 amount,
    AssetType assetType
) internal returns (uint256 tokenId) {
    tokenId = nextTokenId++;
    
    // Store receipt data
    receipts[tokenId] = Receipt({
        orderId: orderId,
        assetId: assetId,
        amount: amount,
        assetType: assetType
    });
    
    // Mint NFT to buyer
    _mint(buyer, tokenId);
    
    emit ReceiptMinted(tokenId, buyer, orderId, assetId, amount, assetType);
    
    return tokenId;
}
```

### 5.3. Receipt Lifecycle Events

```typescript
// Event emitted when receipt minted
event ReceiptMinted(
    uint256 indexed tokenId,
    address indexed buyer,
    uint256 indexed orderId,
    uint256 assetId,
    uint256 amount,
    AssetType assetType
);

// Standard ERC721 Transfer event
event Transfer(
    address indexed from,
    address indexed to,
    uint256 indexed tokenId
);

// Listen for receipt minting
const unwatch = watchContractEvent({
  address: CONTRACTS.RECEIPT_NFT,
  abi: RECEIPT_NFT_ABI,
  eventName: 'ReceiptMinted',
  onLogs(logs) {
    logs.forEach(log => {
      console.log('New Receipt:', {
        tokenId: log.args.tokenId,
        buyer: log.args.buyer,
        orderId: log.args.orderId,
        assetId: log.args.assetId,
        amount: log.args.amount,
        assetType: log.args.assetType,
      });
      
      // Show notification
      showNotification({
        type: 'receipt_minted',
        tokenId: log.args.tokenId,
        orderId: log.args.orderId,
      });
    });
  },
});
```

---

## 6. Hooks Documentation

### 6.1. Read Hooks (4 functions)

#### **useReceiptBalance(address)**
```typescript
/**
 * Get total receipt NFT balance for an address
 * Uses ERC721 balanceOf()
 */
export function useReceiptBalance(address?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.RECEIPT_NFT,
    abi: RECEIPT_NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

// Usage:
const { data: balance } = useReceiptBalance(walletAddress);
console.log(`User has ${balance} receipt NFTs`);
```

#### **useReceipt(tokenId)**
```typescript
/**
 * Get receipt details for a specific tokenId
 * Returns: { orderId, assetId, amount, assetType }
 */
export function useReceipt(tokenId: bigint | number) {
  const tokenIdBigInt = typeof tokenId === 'number' ? BigInt(tokenId) : tokenId;

  const result = useReadContract({
    address: CONTRACTS.RECEIPT_NFT,
    abi: RECEIPT_NFT_ABI,
    functionName: 'receipts',
    args: [tokenIdBigInt],
  });

  // Parse into typed Receipt
  let receipt: Receipt | undefined;
  if (result.data) {
    const data = result.data as any;
    receipt = {
      orderId: data[0] || data.orderId,
      assetId: data[1] || data.assetId,
      amount: data[2] || data.amount,
      assetType: data[3] ?? data.assetType ?? AssetType.RWA,
    };
  }

  return { ...result, receipt };
}

// Usage:
const { receipt } = useReceipt(1001n);
console.log('Receipt:', receipt);
```

#### **useReceiptTokenURI(tokenId)**
```typescript
/**
 * Get token URI for a receipt NFT
 * Returns IPFS URI or HTTP gateway URL
 */
export function useReceiptTokenURI(tokenId: bigint | number) {
  const tokenIdBigInt = typeof tokenId === 'number' ? BigInt(tokenId) : tokenId;

  return useReadContract({
    address: CONTRACTS.RECEIPT_NFT,
    abi: RECEIPT_NFT_ABI,
    functionName: 'tokenURI',
    args: [tokenIdBigInt],
  });
}

// Usage:
const { data: tokenURI } = useReceiptTokenURI(1001n);
console.log('Metadata URI:', tokenURI);
// Output: "ipfs://QmXyz...abc" or "https://ipfs.io/ipfs/QmXyz...abc"
```

#### **useReceiptOwner(tokenId)**
```typescript
/**
 * Get owner of a receipt NFT token
 * Uses ERC721 ownerOf()
 */
export function useReceiptOwner(tokenId: bigint | number) {
  const tokenIdBigInt = typeof tokenId === 'number' ? BigInt(tokenId) : tokenId;

  return useReadContract({
    address: CONTRACTS.RECEIPT_NFT,
    abi: RECEIPT_NFT_ABI,
    functionName: 'ownerOf',
    args: [tokenIdBigInt],
  });
}

// Usage:
const { data: owner } = useReceiptOwner(1001n);
console.log('Receipt owner:', owner);
```

### 6.2. Helper Function

#### **isReceiptTransferable(receipt)**
```typescript
/**
 * Check if a receipt can be transferred.
 * RWA receipts are non-transferable (_beforeTokenTransfer blocks it).
 * NFT receipts are freely transferable.
 */
export function isReceiptTransferable(receipt: Receipt): boolean {
  return receipt.assetType === AssetType.NFT;
}

// Usage:
const { receipt } = useReceipt(1001n);
if (isReceiptTransferable(receipt)) {
  console.log('This receipt can be transferred');
} else {
  console.log('This receipt is soulbound (non-transferable)');
}
```

### 6.3. Write Hook (Minting)

#### **useMintAsset()**
```typescript
/**
 * Mint a new asset (RWA or NFT)
 */
export function useMintAsset() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const mintAsset = async (
    unitId: bigint,
    totalAmount: bigint,
    expiryAt: bigint,
    assetType: AssetType = AssetType.RWA,
  ) => {
    writeContract({
      address: CONTRACTS.ORINA_RWA,
      abi: ORINA_RWA_ABI,
      functionName: 'mintAsset',
      args: [unitId, totalAmount, expiryAt, assetType],
    });
  };

  return { mintAsset, hash, isPending, isConfirming, isConfirmed, error, reset };
}

// Usage:
const { mintAsset, isPending, isConfirmed } = useMintAsset();

const handleMint = async () => {
  await mintAsset(
    5n,                    // unitId (Luxury Watch)
    100n,                  // totalAmount (100 fractions)
    BigInt(Date.now() / 1000 + 365 * 24 * 60 * 60), // expires in 1 year
    AssetType.RWA          // RWA type
  );
};
```

---

## 7. My Receipts Page

### 7.1. Page Layout

**File:** `/src/app/components/my-receipts.tsx`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MY RECEIPT NFTs                                  │
│                     Verified ownership of real-world assets                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Filter: All Assets ▼]  [Sort: Latest ▼]                                   │
│                                                                             │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐         │
│  │ [Image with Verified Badge]  │  │ [Image with Verified Badge]  │         │
│  │                              │  │                              │         │
│  │ Luxury Chronograph Series A  │  │ Manhattan Loft Fractional    │         │
│  │ 1/100 Ownership Share        │  │ 5/1000 Ownership Share       │         │
│  │                              │  │                              │         │
│  │ Mint Date: OCT-24-2023       │  │ Mint Date: NOV-12-2023       │         │
│  │ Asset Value: 3.2 ETH         │  │ Asset Value: 6.5 ETH         │         │
│  └──────────────────────────────┘  └──────────────────────────────┘         │
│                                                                             │
│  ┌──────────────────────────────┐                                           │
│  │ [Image with Verified Badge]  │                                           │
│  │                              │                                           │
│  │ Vintage Collector Series     │                                           │
│  │ 1/1 Ownership Share          │                                           │
│  │                              │                                           │
│  │ Mint Date: DEC-05-2023       │                                           │
│  │ Asset Value: 5.15 ETH        │                                           │
│  └──────────────────────────────┘                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  REGISTRY OVERVIEW (Right Sidebar)                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Total Receipts Owned: 3                                                    │
│  Active Certificates                                                        │
│                                                                             │
│  Total Asset Value (ETH): 14.85 ETH                                         │
│  ≈ $42,420                                                                  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [QR Code Icon]                                                        │  │
│  │ Scan Physical ID                                                      │  │
│  │ Instant Certificate Lookup via Hardware NFC/QR                        │  │
│  │                                                                       │  │
│  │ [Start Scanner]                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Registry Identity:                                                         │
│  [Shield Icon] 0x4F...92c1                                                  │
│  VERIFIED COLLECTOR                                                         │
│                                                                             │
│  Oracle Latency: 14 ms                                                      │
│  Network Secure: L2 Mainnet                                                 │
│                                                                             │
│  [View on Etherscan]                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2. Key Features

✅ **Grid View:**
- 2-column responsive grid
- Large image previews
- Verified badges (green checkmark)
- Ownership share display
- Mint date & asset value

✅ **Filter & Sort:**
- Filter by asset type (All, Property, Collectibles, Certificates)
- Sort by latest, oldest, value high/low

✅ **Registry Overview Sidebar:**
- Total receipts count
- Total asset value (ETH + USD)
- QR code scanner button
- Registry identity (wallet address)
- Network status (oracle latency)

✅ **Click to View:**
- Click any receipt card → opens Receipt Detail Modal
- Full screen modal with all details

---

## 8. Receipt Detail Modal

### 8.1. Modal Layout

**File:** `/src/app/components/receipt-detail-modal.tsx`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [X]  Luxury Chronograph • Series A                    Token ID #9928       │
│       Physical Asset Verified by RWA Protocol                [CERTIFIED]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [Large Asset Image - Aspect Video]                                    │  │
│  │                                                                       │  │
│  │ External View 01                                                      │  │
│  │ 42mm Grand Complication                                               │  │
│  │                                                   [Rotate] [Maximize] │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │ Fractional Ownership        │  │ Asset Birth Log             │          │
│  │                             │  │                             │          │
│  │ 64/100 Slots Acquired       │  │ Mint Time: OCT-24-2023      │          │
│  │ [Progress Bar: 64%]         │  │ Block Height: 18,442,109    │          │
│  │                             │  │ Contract Hash: 0x71C7...    │          │
│  │ Slot Price: 0.45 ETH        │  │                             │          │
│  │ Yield APR: 12.4%            │  │                             │          │
│  │ Exit Liquidity: Instant     │  │                             │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  ASSET SYSTEMS (Right Sidebar)                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [QR Code - 160x160]                                                   │  │
│  │                                                                       │  │
│  │ Physical Scan Auth                                                    │  │
│  │ Scan this code at the physical vault to verify possession            │  │
│  │ and authenticity.                                                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [Mint Receipt NFT]                                                         │
│  The Mint Receipt NFT serves as your official blockchain invoice           │
│  and provides legal proof of fractional rights.                             │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  Custodian Entity:                                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [Avatar] LuxuryReserve.eth                                            │  │
│  │          VERIFIED VAULT                                               │  │
│  │                                                                       │  │
│  │ Address: 0x92f...a4e5c88b0291                                         │  │
│  │ Trust Score: 99.8%                                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Network Load: Low (12 ms)                                                  │
│  Ownership Matrix: Synced ✅                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2. Modal Features

✅ **Hero Image:**
- Large aspect-video display
- Overlay labels (External View 01)
- Rotate & maximize buttons
- Gradient overlay for text contrast

✅ **Fractional Ownership:**
- Slots acquired progress (64/100)
- Visual progress bar (64%)
- Slot price, yield APR, exit liquidity
- Live distribution indicator

✅ **Asset Birth Log:**
- Mint timestamp
- Block height
- Contract hash (with copy button)
- Terminal-style font

✅ **QR Code System:**
- 160x160px QR code
- White background with shadow
- Physical scan instructions
- Vault authentication

✅ **Custodian Information:**
- Avatar & ENS name
- Verified badge
- Contract address (with copy)
- Trust score percentage

✅ **Mint Receipt Button:**
- Primary CTA (teal background)
- Disabled if already minted
- Shows legal notice about proof-of-ownership

---

## 9. QR Code System

### 9.1. QR Code Generation

```typescript
// Generate QR code for receipt
function generateReceiptQRCode(tokenId: bigint, orderId: bigint): string {
  const data = `RWA-RECEIPT-${tokenId}-ORDER-${orderId}`;
  const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(data)}`;
  return qrCodeURL;
}

// Alternative: Use qrcode library
import QRCode from 'qrcode';

async function generateQRCodeDataURL(tokenId: bigint, orderId: bigint): Promise<string> {
  const data = `RWA-RECEIPT-${tokenId}-ORDER-${orderId}`;
  const qrDataURL = await QRCode.toDataURL(data, {
    width: 160,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  return qrDataURL;
}
```

### 9.2. QR Code Verification Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        QR CODE VERIFICATION FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

Physical Vault          QR Scanner App          Blockchain           Frontend
      │                        │                      │                    │
      │                        │                      │                    │
      ▼                        │                      │                    │
┌──────────┐                   │                      │                    │
│ [QR Code]│                   │                      │                    │
│ Display  │                   │                      │                    │
│ on Screen│                   │                      │                    │
└────┬─────┘                   │                      │                    │
     │                         │                      │                    │
     │  1. Scan QR             │                      │                    │
     ├────────────────────────►│                      │                    │
     │                         │                      │                    │
     │                         │  2. Parse Data       │                    │
     │                         │     "RWA-RECEIPT-    │                    │
     │                         │      1001-ORDER-     │                    │
     │                         │      88220"          │                    │
     │                         │                      │                    │
     │                         │  3. Verify on-chain  │                    │
     │                         ├─────────────────────►│                    │
     │                         │     ownerOf(1001)    │                    │
     │                         │                      │                    │
     │                         │  ◄───────────────────┤                    │
     │                         │  Owner: 0xABC...123  │                    │
     │                         │                      │                    │
     │                         │  4. Check Order      │                    │
     │                         ├─────────────────────►│                    │
     │                         │     orders(88220)    │                    │
     │                         │                      │                    │
     │                         │  ◄───────────────────┤                    │
     │                         │  Order: FINALIZED    │                    │
     │                         │                      │                    │
     │                         │  5. Verify Match     │                    │
     │                         │     receipt.orderId  │                    │
     │                         │     == 88220 ✅       │                    │
     │                         │                      │                    │
     │                         │  6. Show Verification│                    │
     │                         ├──────────────────────────────────────────►│
     │                         │                      │  [Success Screen]  │
     │                         │                      │  • Receipt Valid   │
     │                         │                      │  • Owner Verified  │
     │                         │                      │  • Access Granted  │
     │                         │                      │                    │
```

### 9.3. Physical Vault Integration

**Use Case:** Luxury watch vault with NFC/QR authentication

```typescript
// Vault authentication system
interface VaultAccess {
  receiptTokenId: bigint;
  vaultLocation: string;
  accessGranted: boolean;
  timestamp: number;
}

async function verifyVaultAccess(
  qrData: string,
  walletAddress: `0x${string}`
): Promise<VaultAccess> {
  // 1. Parse QR code
  const [, tokenIdStr, , orderIdStr] = qrData.split('-');
  const tokenId = BigInt(tokenIdStr);
  const orderId = BigInt(orderIdStr);
  
  // 2. Verify ownership
  const owner = await readContract({
    address: CONTRACTS.RECEIPT_NFT,
    abi: RECEIPT_NFT_ABI,
    functionName: 'ownerOf',
    args: [tokenId],
  });
  
  if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error('Not the owner of this receipt');
  }
  
  // 3. Verify receipt details
  const receipt = await readContract({
    address: CONTRACTS.RECEIPT_NFT,
    abi: RECEIPT_NFT_ABI,
    functionName: 'receipts',
    args: [tokenId],
  });
  
  if (receipt.orderId !== orderId) {
    throw new Error('Receipt/Order mismatch');
  }
  
  // 4. Check order status
  const order = await readContract({
    address: CONTRACTS.MARKETPLACE_ATP,
    abi: MARKETPLACE_ABI,
    functionName: 'orders',
    args: [orderId],
  });
  
  if (!order.finalized) {
    throw new Error('Order not finalized');
  }
  
  // 5. Grant vault access
  return {
    receiptTokenId: tokenId,
    vaultLocation: 'Geneva Vault A-1',
    accessGranted: true,
    timestamp: Date.now(),
  };
}
```

---

## 10. Transfer Restrictions

### 10.1. Smart Contract Implementation

```solidity
// FractionalReceiptNFT.sol
function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
) internal virtual override {
    super._beforeTokenTransfer(from, to, tokenId);
    
    Receipt storage receipt = receipts[tokenId];
    
    // Allow minting (from == address(0))
    if (from == address(0)) {
        return;
    }
    
    // Allow burning (to == address(0))
    if (to == address(0)) {
        return;
    }
    
    // Block transfers for RWA assets
    if (receipt.assetType == AssetType.RWA) {
        revert("RWA receipts are non-transferable - soulbound to buyer");
    }
    
    // NFT receipts can be transferred freely
    // Standard ERC721 transfer proceeds
}
```

### 10.2. Frontend Transfer Check

```typescript
import { isReceiptTransferable } from '@/hooks/useReceipts';

function TransferButton({ tokenId }: { tokenId: bigint }) {
  const { receipt } = useReceipt(tokenId);
  const transferable = receipt ? isReceiptTransferable(receipt) : false;
  
  return (
    <button
      disabled={!transferable}
      className={`
        px-4 py-2 rounded-lg font-bold transition-all
        ${transferable
          ? 'bg-[#2CC295] text-black hover:brightness-110'
          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
        }
      `}
    >
      {transferable ? 'Transfer Receipt' : 'Non-Transferable (RWA)'}
    </button>
  );
}
```

### 10.3. Transfer Scenarios

**Scenario 1: Transfer RWA Receipt (Should Fail)**
```typescript
// Buyer tries to transfer RWA receipt
const { transferFrom } = useTransferReceipt();

try {
  await transferFrom(
    buyerAddress,           // from
    newOwnerAddress,        // to
    1001n                   // tokenId (RWA receipt)
  );
} catch (error) {
  // Error: "RWA receipts are non-transferable - soulbound to buyer"
  console.error('Transfer failed:', error);
}
```

**Scenario 2: Transfer NFT Receipt (Should Succeed)**
```typescript
// Buyer transfers NFT receipt
const { transferFrom } = useTransferReceipt();

try {
  await transferFrom(
    buyerAddress,           // from
    newOwnerAddress,        // to
    2001n                   // tokenId (NFT receipt)
  );
  console.log('Transfer successful!');
} catch (error) {
  console.error('Transfer failed:', error);
}
```

---

## 11. Proof-of-Ownership

### 11.1. Legal Framework

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  PROOF-OF-OWNERSHIP LEGAL FRAMEWORK                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Receipt NFT serves as legal proof of:                                      │
│                                                                             │
│  ✅ Purchase Transaction                                                     │
│     • Immutable blockchain record                                           │
│     • Order ID, Asset ID, Amount                                            │
│     • Buyer & Seller addresses                                              │
│     • Purchase timestamp                                                    │
│     • Payment amount (via order)                                            │
│                                                                             │
│  ✅ Fractional Ownership Rights                                              │
│     • X out of Y total fractions                                            │
│     • Proportional asset rights                                             │
│     • Legal ownership documentation link (IPFS)                             │
│     • Terms & conditions accepted                                           │
│                                                                             │
│  ✅ Physical Asset Custody                                                   │
│     • Custodian entity information                                          │
│     • Physical vault location                                               │
│     • QR/NFC authentication                                                 │
│     • Inspection & audit rights                                             │
│                                                                             │
│  ✅ Transfer History                                                         │
│     • All Transfer events recorded                                          │
│     • Complete chain of custody                                             │
│     • Provenance tracking                                                   │
│     • NFT receipts: full transfer history                                   │
│     • RWA receipts: mint-only (soulbound)                                   │
│                                                                             │
│  ✅ Exit Rights                                                              │
│     • Secondary market access (NFT receipts)                                │
│     • Buyback terms (RWA receipts)                                          │
│     • Liquidation procedures                                                │
│     • Dispute resolution mechanism                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2. Documentation Links

```typescript
interface ReceiptLegalDocs {
  purchaseAgreement: string;    // IPFS link to signed agreement
  termsAndConditions: string;   // Platform T&Cs
  custodyAgreement: string;     // Vault custody terms (RWA only)
  inspectionRights: string;     // Physical inspection procedures
  disputeResolution: string;    // Arbitration terms
}

// Stored in receipt metadata
{
  "legal_documents": {
    "purchase_agreement": "ipfs://QmPurchase...abc",
    "terms_and_conditions": "ipfs://QmTerms...def",
    "custody_agreement": "ipfs://QmCustody...ghi",
    "inspection_rights": "ipfs://QmInspect...jkl",
    "dispute_resolution": "ipfs://QmDispute...mno"
  }
}
```

### 11.3. Verification Process

```typescript
/**
 * Verify receipt authenticity and ownership
 */
async function verifyReceiptOwnership(tokenId: bigint): Promise<boolean> {
  // 1. Check token exists
  try {
    const owner = await readContract({
      address: CONTRACTS.RECEIPT_NFT,
      abi: RECEIPT_NFT_ABI,
      functionName: 'ownerOf',
      args: [tokenId],
    });
    
    if (!owner) return false;
    
    // 2. Get receipt details
    const receipt = await readContract({
      address: CONTRACTS.RECEIPT_NFT,
      abi: RECEIPT_NFT_ABI,
      functionName: 'receipts',
      args: [tokenId],
    });
    
    // 3. Verify linked order exists and is finalized
    const order = await readContract({
      address: CONTRACTS.MARKETPLACE_ATP,
      abi: MARKETPLACE_ABI,
      functionName: 'orders',
      args: [receipt.orderId],
    });
    
    if (!order.finalized) return false;
    
    // 4. Verify asset exists
    const asset = await readContract({
      address: CONTRACTS.ORINA_RWA,
      abi: ORINA_RWA_ABI,
      functionName: 'getAsset',
      args: [receipt.assetId],
    });
    
    if (!asset) return false;
    
    // 5. All checks passed
    return true;
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
}
```

---

## 12. Integration with Orders

### 12.1. Order → Receipt Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ORDER → RECEIPT INTEGRATION                            │
└─────────────────────────────────────────────────────────────────────────────┘

CREATE ORDER           PAY ORDER            FINALIZE ORDER          RECEIPT MINTED
      │                     │                       │                       │
      ▼                     ▼                       ▼                       ▼
┌──────────┐          ┌──────────┐           ┌──────────┐           ┌──────────┐
│ Order    │          │ Order    │           │ Order    │           │ Receipt  │
│ Created  │  Buyer   │ Paid     │  Buyer    │ Finalized│  Contract │ Minted   │
│          │  pays    │          │  confirms │          │  calls    │          │
│ State: 0 │ ──────►  │ State: 1 │ ────────► │ State: 3 │ ────────► │ Token ID │
│          │          │          │           │          │           │ = orderId│
└──────────┘          └──────────┘           └──────────┘           └──────────┘
                                                   │
                                                   │ _finalize()
                                                   ▼
                                            ┌──────────────┐
                                            │ Release Funds│
                                            │ to Seller    │
                                            └──────┬───────┘
                                                   │
                                                   │ _mintReceipt()
                                                   ▼
                                            ┌──────────────┐
                                            │ Mint Receipt │
                                            │ NFT to Buyer │
                                            └──────────────┘
```

### 12.2. Receipt Data Population

```solidity
// MarketplaceATP.sol - _finalize() function
function _finalize(uint256 orderId, SettlementType settlement) internal {
    Order storage order = orders[orderId];
    
    // 1. Release funds based on settlement
    _distributeFunds(order, settlement);
    
    // 2. Update order state
    order.state = State.FINALIZED;
    order.finalized = true;
    
    // 3. Mint receipt NFT to buyer
    uint256 receiptTokenId = receiptNft.mintReceipt(
        order.buyer,        // recipient
        orderId,            // orderId
        order.assetId,      // assetId
        order.amount,       // amount
        order.assetType     // assetType (RWA or NFT)
    );
    
    emit OrderFinalized(orderId, settlement, receiptTokenId);
}
```

### 12.3. Receipt Lookup by Order

```typescript
/**
 * Find receipt token ID by order ID
 * Uses ReceiptMinted event logs
 */
async function getReceiptByOrderId(orderId: bigint): Promise<bigint | null> {
  const logs = await getLogs({
    address: CONTRACTS.RECEIPT_NFT,
    event: parseAbiItem('event ReceiptMinted(uint256 indexed tokenId, address indexed buyer, uint256 indexed orderId, uint256 assetId, uint256 amount, uint8 assetType)'),
    args: {
      orderId: orderId,
    },
    fromBlock: 0n,
    toBlock: 'latest',
  });
  
  if (logs.length === 0) return null;
  
  return logs[0].args.tokenId;
}

// Usage:
const receiptTokenId = await getReceiptByOrderId(88220n);
console.log('Receipt Token ID:', receiptTokenId);
```

---

## 13. Smart Contract Integration

### 13.1. Contract Addresses

```typescript
// /src/config/contracts.ts
export const CONTRACTS = {
  // BSC Mainnet (chainId: 56)
  RECEIPT_NFT: '0x...FractionalReceiptNFT_Address' as `0x${string}`,
  ORINA_RWA: '0x...OrinaRWA_Address' as `0x${string}`,
  MARKETPLACE_ATP: '0x...MarketplaceATP_Address' as `0x${string}`,
};
```

### 13.2. FractionalReceiptNFT ABI

```typescript
export const RECEIPT_NFT_ABI = [
  // ── ERC721 Standard ────────────────────────────────
  {
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'transferFrom',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  
  // ── Receipt-Specific Functions ────────────────────
  {
    name: 'receipts',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'assetId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'assetType', type: 'uint8' }, // 0=RWA, 1=NFT
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'nextTokenId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  
  // ── Events ─────────────────────────────────────────
  {
    name: 'ReceiptMinted',
    type: 'event',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'orderId', type: 'uint256', indexed: true },
      { name: 'assetId', type: 'uint256', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'assetType', type: 'uint8', indexed: false },
    ],
  },
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
];
```

### 13.3. Event Listening

```typescript
// Listen for receipt minting
const unwatchReceipts = watchContractEvent({
  address: CONTRACTS.RECEIPT_NFT,
  abi: RECEIPT_NFT_ABI,
  eventName: 'ReceiptMinted',
  onLogs(logs) {
    logs.forEach(log => {
      console.log('Receipt Minted:', {
        tokenId: log.args.tokenId,
        buyer: log.args.buyer,
        orderId: log.args.orderId,
        assetId: log.args.assetId,
        amount: log.args.amount,
        assetType: log.args.assetType === 0 ? 'RWA' : 'NFT',
      });
      
      // Show notification
      showNotification({
        type: 'receipt_minted',
        title: 'Receipt NFT Minted',
        message: `Receipt #${log.args.tokenId} minted for Order #${log.args.orderId}`,
      });
    });
  },
});

// Listen for transfers
const unwatchTransfers = watchContractEvent({
  address: CONTRACTS.RECEIPT_NFT,
  abi: RECEIPT_NFT_ABI,
  eventName: 'Transfer',
  args: {
    from: walletAddress, // Filter for transfers from this wallet
  },
  onLogs(logs) {
    logs.forEach(log => {
      console.log('Receipt Transferred:', {
        from: log.args.from,
        to: log.args.to,
        tokenId: log.args.tokenId,
      });
    });
  },
});
```

---

## 14. Metadata & IPFS

### 14.1. Receipt Metadata Structure

```json
{
  "name": "Orina Receipt NFT #1001",
  "description": "Proof-of-ownership receipt for Order #88220. Buyer: 0x71C7...8e4f, Seller: 0x742d...c4F. Asset: Luxury Chronograph Series A. Amount: 1 unit. Purchase date: 2026-02-14.",
  "image": "ipfs://QmReceiptImage...abc",
  "external_url": "https://orina.io/receipts/1001",
  "attributes": [
    {
      "trait_type": "Order ID",
      "value": "88220"
    },
    {
      "trait_type": "Asset ID",
      "value": "15"
    },
    {
      "trait_type": "Asset Name",
      "value": "Luxury Chronograph Series A"
    },
    {
      "trait_type": "Amount",
      "value": "1"
    },
    {
      "trait_type": "Asset Type",
      "value": "RWA"
    },
    {
      "trait_type": "Transferable",
      "value": "No"
    },
    {
      "trait_type": "Purchase Date",
      "value": "2026-02-14"
    },
    {
      "trait_type": "Buyer",
      "value": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
    },
    {
      "trait_type": "Seller",
      "value": "0x742d35Cc6634C0532925a3b844Bc9e7595445445"
    },
    {
      "trait_type": "Purchase Price",
      "value": "2.1 ETH"
    }
  ],
  "properties": {
    "orderId": "88220",
    "assetId": "15",
    "amount": "1",
    "assetType": "RWA",
    "transferable": false,
    "qr_code": "RWA-RECEIPT-1001-ORDER-88220",
    "legal_documents": {
      "purchase_agreement": "ipfs://QmPurchase...abc",
      "terms_and_conditions": "ipfs://QmTerms...def",
      "custody_agreement": "ipfs://QmCustody...ghi"
    }
  }
}
```

### 14.2. IPFS Upload Flow

```typescript
import { create } from 'ipfs-http-client';

// Connect to IPFS (Pinata, Infura, or local node)
const ipfs = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: `Bearer ${PINATA_JWT}`,
  },
});

/**
 * Upload receipt metadata to IPFS
 */
async function uploadReceiptMetadata(receipt: Receipt, order: Order): Promise<string> {
  const metadata = {
    name: `Orina Receipt NFT #${receipt.tokenId}`,
    description: `Proof-of-ownership receipt for Order #${order.orderId}...`,
    image: await uploadImageToIPFS(order.assetImage),
    attributes: [
      { trait_type: 'Order ID', value: order.orderId.toString() },
      { trait_type: 'Asset ID', value: order.assetId.toString() },
      { trait_type: 'Amount', value: receipt.amount.toString() },
      { trait_type: 'Asset Type', value: receipt.assetType === 0 ? 'RWA' : 'NFT' },
      { trait_type: 'Transferable', value: receipt.assetType === 1 ? 'Yes' : 'No' },
      { trait_type: 'Purchase Date', value: new Date().toISOString().split('T')[0] },
      { trait_type: 'Buyer', value: order.buyer },
      { trait_type: 'Seller', value: order.seller },
    ],
    properties: {
      orderId: order.orderId.toString(),
      assetId: order.assetId.toString(),
      amount: receipt.amount.toString(),
      assetType: receipt.assetType === 0 ? 'RWA' : 'NFT',
      transferable: receipt.assetType === 1,
    },
  };
  
  // Upload to IPFS
  const { cid } = await ipfs.add(JSON.stringify(metadata));
  const ipfsURI = `ipfs://${cid}`;
  
  console.log('Metadata uploaded to IPFS:', ipfsURI);
  return ipfsURI;
}
```

### 14.3. Fetch Metadata from IPFS

```typescript
/**
 * Fetch receipt metadata from IPFS
 */
async function fetchReceiptMetadata(tokenURI: string): Promise<any> {
  // Convert ipfs:// to HTTP gateway URL
  const gatewayURL = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
  
  try {
    const response = await fetch(gatewayURL);
    const metadata = await response.json();
    return metadata;
  } catch (error) {
    console.error('Failed to fetch metadata:', error);
    return null;
  }
}

// Usage:
const { data: tokenURI } = useReceiptTokenURI(1001n);
const metadata = await fetchReceiptMetadata(tokenURI);
console.log('Receipt Metadata:', metadata);
```

---

## 15. Code Examples

### 15.1. Complete Minting Example

```typescript
import { useMintAsset } from '@/hooks/useAssets';
import { AssetType } from '@/config/contracts';
import { useState } from 'react';

function MintingExample() {
  const { mintAsset, isPending, isConfirming, isConfirmed, error } = useMintAsset();
  const [assetType, setAssetType] = useState<'RWA' | 'NFT'>('RWA');
  const [amount, setAmount] = useState('100');
  const [expiryDays, setExpiryDays] = useState('365');
  
  const handleMint = async () => {
    try {
      const unitId = 5n; // Luxury Watch
      const totalAmount = BigInt(amount);
      const expiryAt = BigInt(Math.floor(Date.now() / 1000) + Number(expiryDays) * 24 * 60 * 60);
      const type = assetType === 'RWA' ? AssetType.RWA : AssetType.NFT;
      
      await mintAsset(unitId, totalAmount, expiryAt, type);
      
      if (isConfirmed) {
        console.log('Asset minted successfully!');
      }
    } catch (err) {
      console.error('Minting failed:', err);
    }
  };
  
  return (
    <div>
      <select value={assetType} onChange={e => setAssetType(e.target.value as 'RWA' | 'NFT')}>
        <option value="RWA">RWA (Non-Transferable)</option>
        <option value="NFT">NFT (Transferable)</option>
      </select>
      
      <input
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="Total Amount"
      />
      
      <input
        type="number"
        value={expiryDays}
        onChange={e => setExpiryDays(e.target.value)}
        placeholder="Expiry (days)"
      />
      
      <button onClick={handleMint} disabled={isPending || isConfirming}>
        {isPending && 'Signing...'}
        {isConfirming && 'Confirming...'}
        {!isPending && !isConfirming && 'Mint Asset'}
      </button>
      
      {error && <p className="text-red-500">{error.message}</p>}
      {isConfirmed && <p className="text-green-500">Asset minted successfully!</p>}
    </div>
  );
}
```

### 15.2. Display User Receipts

```typescript
import { useReceiptBalance, useReceipt } from '@/hooks/useReceipts';
import { useAccount } from 'wagmi';

function UserReceiptsExample() {
  const { address } = useAccount();
  const { data: balance } = useReceiptBalance(address);
  const [receipts, setReceipts] = useState<bigint[]>([]);
  
  // Fetch all receipt token IDs (simplified - in production, use indexer/subgraph)
  useEffect(() => {
    if (!balance) return;
    
    // Assuming sequential token IDs (1, 2, 3, ...)
    // In production, use Transfer events to get owned tokens
    const tokenIds: bigint[] = [];
    for (let i = 1n; i <= balance; i++) {
      tokenIds.push(i);
    }
    setReceipts(tokenIds);
  }, [balance]);
  
  return (
    <div>
      <h2>My Receipts ({balance?.toString() || 0})</h2>
      <div className="grid grid-cols-2 gap-4">
        {receipts.map(tokenId => (
          <ReceiptCard key={tokenId.toString()} tokenId={tokenId} />
        ))}
      </div>
    </div>
  );
}

function ReceiptCard({ tokenId }: { tokenId: bigint }) {
  const { receipt } = useReceipt(tokenId);
  
  if (!receipt) return <div>Loading...</div>;
  
  return (
    <div className="border border-zinc-800 rounded-lg p-4">
      <h3>Receipt #{tokenId.toString()}</h3>
      <p>Order ID: {receipt.orderId.toString()}</p>
      <p>Asset ID: {receipt.assetId.toString()}</p>
      <p>Amount: {receipt.amount.toString()}</p>
      <p>Type: {receipt.assetType === 0 ? 'RWA' : 'NFT'}</p>
      <p>Transferable: {receipt.assetType === 1 ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

### 15.3. Check Transfer Eligibility

```typescript
import { useReceipt, isReceiptTransferable } from '@/hooks/useReceipts';

function TransferCheckExample({ tokenId }: { tokenId: bigint }) {
  const { receipt } = useReceipt(tokenId);
  
  if (!receipt) return <div>Loading...</div>;
  
  const canTransfer = isReceiptTransferable(receipt);
  
  return (
    <div>
      {canTransfer ? (
        <div className="text-green-500">
          ✅ This receipt can be transferred (NFT type)
          <button className="bg-teal-500 text-black px-4 py-2 rounded">
            Transfer Receipt
          </button>
        </div>
      ) : (
        <div className="text-orange-500">
          ⚠️ This receipt is soulbound (RWA type) - cannot be transferred
          <p className="text-sm text-zinc-400">
            RWA receipts are permanently bound to the buyer for legal reasons.
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## 16. Best Practices

### 16.1. Security Best Practices

✅ **Verify Receipt Ownership:**
```typescript
// Always check ownership before displaying sensitive data
const { data: owner } = useReceiptOwner(tokenId);
const { address } = useAccount();

if (owner?.toLowerCase() !== address?.toLowerCase()) {
  throw new Error('Not the owner of this receipt');
}
```

✅ **Validate Receipt Data:**
```typescript
// Verify receipt links to valid order
const { receipt } = useReceipt(tokenId);
const { data: order } = useOrder(receipt.orderId);

if (!order.finalized) {
  console.warn('Receipt linked to non-finalized order');
}
```

✅ **Check Transfer Restrictions:**
```typescript
// Don't show transfer button for RWA receipts
if (!isReceiptTransferable(receipt)) {
  return <div>This receipt cannot be transferred</div>;
}
```

### 16.2. Performance Best Practices

✅ **Batch Read Calls:**
```typescript
// Use multicall for fetching multiple receipts
const results = await multicall({
  contracts: [
    { functionName: 'receipts', args: [1n] },
    { functionName: 'receipts', args: [2n] },
    { functionName: 'receipts', args: [3n] },
  ],
});
```

✅ **Cache Metadata:**
```typescript
// Cache IPFS metadata to avoid repeated fetches
const metadataCache = new Map<string, any>();

async function getCachedMetadata(tokenURI: string) {
  if (metadataCache.has(tokenURI)) {
    return metadataCache.get(tokenURI);
  }
  
  const metadata = await fetchReceiptMetadata(tokenURI);
  metadataCache.set(tokenURI, metadata);
  return metadata;
}
```

✅ **Use Indexer/Subgraph:**
```typescript
// For production, use The Graph subgraph to query receipts efficiently
const query = gql`
  query GetUserReceipts($owner: Bytes!) {
    receipts(where: { owner: $owner }) {
      id
      tokenId
      orderId
      assetId
      amount
      assetType
      mintedAt
    }
  }
`;
```

### 16.3. UX Best Practices

✅ **Show Transfer Status:**
```tsx
{receipt.assetType === AssetType.RWA ? (
  <div className="flex items-center gap-2 text-orange-400">
    <Shield size={16} />
    <span className="text-xs font-bold">SOULBOUND - NON-TRANSFERABLE</span>
  </div>
) : (
  <div className="flex items-center gap-2 text-teal-400">
    <CheckCircle size={16} />
    <span className="text-xs font-bold">TRANSFERABLE NFT</span>
  </div>
)}
```

✅ **Display QR Code Prominently:**
```tsx
<div className="bg-white p-4 rounded-lg shadow-lg">
  <img
    src={generateReceiptQRCode(tokenId, orderId)}
    alt="Receipt QR Code"
    className="w-full h-full"
  />
  <p className="text-xs text-center mt-2 text-black">
    Scan for physical verification
  </p>
</div>
```

✅ **Link to Order Details:**
```tsx
<button onClick={() => navigate(`/orders/${receipt.orderId}`)}>
  View Original Order #{receipt.orderId.toString()}
</button>
```

---

## 17. Troubleshooting

### 17.1. Common Issues

**Issue: "Token does not exist"**
```
Error: ERC721: owner query for nonexistent token

Solution:
- Verify tokenId is valid (<= nextTokenId)
- Check if receipt was actually minted (listen for ReceiptMinted event)
- Ensure order was finalized before checking for receipt
```

**Issue: "Transfer failed - non-transferable"**
```
Error: RWA receipts are non-transferable - soulbound to buyer

Solution:
- Check assetType: RWA receipts cannot be transferred
- Use isReceiptTransferable() before showing transfer UI
- Only NFT receipts (assetType = 1) can be transferred
```

**Issue: "Metadata not loading"**
```
Error: Failed to fetch metadata from IPFS

Solution:
1. Check IPFS gateway is accessible
2. Try alternative gateways:
   - https://ipfs.io/ipfs/{CID}
   - https://cloudflare-ipfs.com/ipfs/{CID}
   - https://gateway.pinata.cloud/ipfs/{CID}
3. Verify CID is valid
4. Check metadata was uploaded correctly
```

**Issue: "Receipt not minted after order finalized"**
```
Error: Receipt not found for order

Solution:
- Check order.finalized === true
- Listen for ReceiptMinted event
- Verify _mintReceipt was called in _finalize
- Check MarketplaceATP has MINTER_ROLE on FractionalReceiptNFT
```

### 17.2. Debugging Tools

**Check Receipt Data:**
```typescript
async function debugReceipt(tokenId: bigint) {
  console.log('=== Receipt Debug ===');
  
  // 1. Check if token exists
  try {
    const owner = await readContract({
      functionName: 'ownerOf',
      args: [tokenId],
    });
    console.log('Owner:', owner);
  } catch (error) {
    console.error('Token does not exist');
    return;
  }
  
  // 2. Get receipt details
  const receipt = await readContract({
    functionName: 'receipts',
    args: [tokenId],
  });
  console.log('Receipt:', {
    orderId: receipt.orderId.toString(),
    assetId: receipt.assetId.toString(),
    amount: receipt.amount.toString(),
    assetType: receipt.assetType === 0 ? 'RWA' : 'NFT',
    transferable: receipt.assetType === 1,
  });
  
  // 3. Get token URI
  const tokenURI = await readContract({
    functionName: 'tokenURI',
    args: [tokenId],
  });
  console.log('Token URI:', tokenURI);
  
  // 4. Verify linked order
  const order = await readContract({
    address: CONTRACTS.MARKETPLACE_ATP,
    functionName: 'orders',
    args: [receipt.orderId],
  });
  console.log('Linked Order:', {
    orderId: order.orderId.toString(),
    buyer: order.buyer,
    seller: order.seller,
    state: order.state,
    finalized: order.finalized,
  });
}
```

**Monitor Events:**
```typescript
// Listen for all receipt-related events
const unwatchAll = watchContractEvent({
  address: CONTRACTS.RECEIPT_NFT,
  abi: RECEIPT_NFT_ABI,
  onLogs(logs) {
    logs.forEach(log => {
      console.log('Receipt Event:', {
        event: log.eventName,
        args: log.args,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      });
    });
  },
});
```

---

## 📚 Appendix

### A. File Structure

```
Receipts & Minting System Files:
/src/hooks/
├── useReceipts.ts                    # Receipt NFT hooks (4 read hooks)
├── useAssets.ts                      # Asset minting hook (useMintAsset)
└── useUnits.ts                       # Unit registry hooks

/src/app/components/
├── minting.tsx                       # Minting page
├── my-receipts.tsx                   # Receipts grid page
├── receipt-detail-modal.tsx          # Full screen modal
├── receipt-detail.tsx                # Detail page with sidebar
└── transfer-modal.tsx                # Transfer NFT receipts

/src/config/
├── contracts.ts                      # Contract addresses
├── abis.ts                           # Receipt NFT ABI + OrinaRWA ABI
└── AssetType enum                    # RWA = 0, NFT = 1

/src/types/
├── asset.ts                          # Receipt NFT types
└── contracts.ts                      # Receipt struct type
```

### B. Contract Addresses

```typescript
// BSC Mainnet (chainId: 56)
RECEIPT_NFT: '0x...FractionalReceiptNFT'
ORINA_RWA: '0x...OrinaRWA'
MARKETPLACE_ATP: '0x...MarketplaceATP'

// BSC Testnet (chainId: 97)
RECEIPT_NFT: '0x...FractionalReceiptNFT_Testnet'
ORINA_RWA: '0x...OrinaRWA_Testnet'
MARKETPLACE_ATP: '0x...MarketplaceATP_Testnet'
```

### C. Testing Checklist

```
□ Minting
  □ Mint RWA asset
  □ Mint NFT asset
  □ Set expiry timestamp
  □ Upload images to IPFS
  □ Verify AssetMinted event

□ Receipt Creation
  □ Finalize order → receipt minted
  □ Verify ReceiptMinted event
  □ Check tokenId matches orderId
  □ Verify receipt data correct

□ Receipt Display
  □ Load user receipts
  □ Show balance correctly
  □ Display receipt cards
  □ QR code generation
  □ Open detail modal

□ Transfer Restrictions
  □ RWA receipt: transfer fails
  □ NFT receipt: transfer succeeds
  □ Check isReceiptTransferable()
  □ UI shows correct status

□ Metadata
  □ tokenURI returns IPFS URI
  □ Fetch metadata from IPFS
  □ Display attributes correctly
  □ Legal docs links work

□ Integration
  □ Receipt linked to order
  □ Asset data correct
  □ Owner verification
  □ Event listening works
```

---

**Last Updated:** February 14, 2026  
**Document Version:** 3.3-final  
**System Version:** ATP v3.3  
**Maintained By:** Orina Development Team

---

**Total Documentation:** 1800+ lines  
**Complete System Coverage:** Receipts & Minting 100%  
**Ready for Production:** ✅
