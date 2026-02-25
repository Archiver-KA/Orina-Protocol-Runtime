# 📍 MARKETPLACE MAP - TECHNICAL DOCUMENTATION

## 🎯 Overview

Marketplace Map là hệ thống bản đồ tương tác dùng để hiển thị vị trí địa lý của các Real World Assets (RWA) đang được bán trên marketplace. Map sử dụng OpenStreetMap tiles với khả năng zoom, pan, và hiển thị asset markers với popup cards.

---

## 🔍 CURRENT IMPLEMENTATION STATUS

### ✅ **IMPLEMENTED FEATURES**

#### 1. **Map Core System**
- ✅ Interactive world map với OpenStreetMap tiles
- ✅ Dark theme (CartoDB Dark Matter) và Satellite view toggle
- ✅ Zoom controls (1-18 levels) với smooth transitions
- ✅ Pan/drag với tốc độ 2x (responsive movement)
- ✅ Mouse wheel zoom support
- ✅ Reset view button (trở về center: 20°N, 0°E, zoom: 2)

#### 2. **Asset Markers System**
- ✅ Asset markers hiển thị ở vị trí `latitude` và `longitude`
- ✅ Verified assets có marker màu teal (#2CC295) với glow effect
- ✅ Non-verified assets có marker màu zinc-700
- ✅ Hover effect: scale 1.2x với animated glow
- ✅ Click asset marker để mở Asset Details Modal

#### 3. **Hover Card Preview**
- ✅ Card xuất hiện khi hover asset marker
- ✅ Hiển thị: Image, Name, Price, Rarity badge, Verified badge
- ✅ Smooth fade-in animation
- ✅ Teal-themed border và shadow
- ✅ Position: bottom of marker với arrow pointer

#### 4. **UI Controls**
- ✅ Stats Info (top-left): Expandable button hiển thị asset count, views, likes
- ✅ Zoom controls (top-right): +, -, Reset, Toggle Map Style
- ✅ Zoom indicator (bottom-left): Hiển thị zoom level và center coordinates
- ✅ All UI elements có solid backgrounds (NO backdrop-blur)
- ✅ Text selection disabled (select-none) để tránh bôi đen map

#### 5. **Filter Integration**
- ✅ Map tự động filter theo: Search query, Category, Blockchain, Verified status
- ✅ Marker count updates realtime khi filter thay đổi
- ✅ Smooth re-render khi filter changes

#### 6. **Performance Optimizations**
- ✅ Viewport culling: Chỉ render markers trong visible area
- ✅ Tile-based rendering với lazy loading
- ✅ No heavy map libraries (pure React + Tiles)
- ✅ Efficient coordinate calculations

---

## ❌ **MISSING CRITICAL FEATURES FOR PRODUCTION**

### 🚨 **BLOCKER ISSUES**

#### 1. **NO GEOGRAPHIC DATA IN MarketplaceAsset TYPE**
```typescript
// ❌ PROBLEM: MarketplaceAsset interface KHÔNG CÓ latitude/longitude
export interface MarketplaceAsset {
  id: string;
  name: string;
  price: string;
  // ... other fields
  
  // ❌ MISSING:
  // latitude?: number;
  // longitude?: number;
  // city?: string;
  // country?: string;
  // address?: string;
}
```

**Current Workaround:**
```typescript
// Map component đang sử dụng mock data từ mockRWAData.ts
// với hardcoded locations
const MOCK_RWA_ASSETS = [
  {
    id: 1,
    name: 'Beach Villa',
    latitude: 7.8804, // ❌ Hardcoded
    longitude: 98.3923, // ❌ Hardcoded
    city: 'Phuket'
  }
]
```

**Impact:** 
- ❌ Không thể production-ready
- ❌ Real assets từ blockchain sẽ KHÔNG có location data
- ❌ Map sẽ EMPTY khi connect với real smart contracts

---

#### 2. **NO SELLER LOCATION SYSTEM**
```typescript
// ❌ PROBLEM: Seller profile KHÔNG CÓ location fields
export interface Seller {
  address: string;
  ensName?: string;
  verified: boolean;
  reputation?: number;
  
  // ❌ MISSING:
  // location?: {
  //   country?: string;
  //   city?: string;
  //   latitude?: number;
  //   longitude?: number;
  //   verified: boolean; // Location verified?
  // }
}
```

**Required Flow (NOT IMPLEMENTED):**
```
1. Seller opens Profile Settings
   ↓
2. Fills in Location Form:
   - Country (dropdown)
   - City (autocomplete)
   - Optional: Manual lat/lng
   ↓
3. System geocodes location → saves to profile
   ↓
4. When seller MINTS asset:
   - Asset inherits seller's location
   - Asset appears on map at seller's coordinates
   ↓
5. Buyer sees asset on map
```

**Current Reality:**
- ❌ No profile location settings UI
- ❌ No geocoding service integration
- ❌ No location inheritance during mint
- ❌ No location storage in smart contract

---

#### 3. **NO LOCATION DATA IN MINT FLOW**
```typescript
// ❌ PROBLEM: Mint Asset flow KHÔNG collect location
async function mintAsset(data: MintFormData) {
  const asset = {
    name: data.name,
    price: data.price,
    category: data.category,
    // ❌ MISSING: location data
  }
  
  // Mint on blockchain WITHOUT location
  await contract.mint(asset);
}
```

**What's Needed:**
```typescript
async function mintAsset(data: MintFormData) {
  // Get seller's location from profile
  const sellerLocation = await getSellerLocation(sellerAddress);
  
  const asset = {
    name: data.name,
    price: data.price,
    category: data.category,
    // ✅ Include location
    latitude: sellerLocation.latitude,
    longitude: sellerLocation.longitude,
    city: sellerLocation.city,
    country: sellerLocation.country,
  }
  
  // Store location in metadata (IPFS)
  const metadata = {
    ...asset,
    location: sellerLocation
  };
  const metadataURI = await uploadToIPFS(metadata);
  
  // Mint with metadata
  await contract.mint(metadataURI);
}
```

---

## 🔧 **REQUIRED CHANGES FOR PRODUCTION**

### **Phase 1: Type Definitions** ⏱️ 2 hours

#### 1.1. Update `MarketplaceAsset` Interface
```typescript
// File: /src/app/types/asset.ts

export interface MarketplaceAsset {
  // ... existing fields
  
  // === GEOGRAPHIC DATA (NEW) ===
  location?: {
    latitude: number;        // WGS84 coordinates
    longitude: number;       // WGS84 coordinates
    city?: string;          // "Phuket"
    country?: string;       // "Thailand"
    countryCode?: string;   // "TH" (ISO 3166-1 alpha-2)
    address?: string;       // Full address (optional)
    verified: boolean;      // Location verified by system?
    source: 'seller-profile' | 'manual' | 'geocoded'; // How was it set?
  };
}
```

#### 1.2. Update `RWAMintedAsset` Interface
```typescript
export interface RWAMintedAsset {
  // ... existing fields
  
  // === GEOGRAPHIC DATA (NEW) ===
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
    countryCode?: string;
    address?: string;
    verified: boolean;
    source: 'seller-profile' | 'manual' | 'geocoded';
  };
}
```

#### 1.3. Create Seller Location Type
```typescript
// File: /src/app/types/seller.ts (NEW FILE)

export interface SellerProfile {
  address: string;
  ensName?: string;
  verified: boolean;
  reputation?: number;
  
  // === LOCATION (NEW) ===
  location?: {
    country: string;           // Required for map
    countryCode: string;       // "US", "TH", "AE"
    city: string;              // Required for map
    state?: string;            // Optional (for US, etc.)
    latitude: number;          // Geocoded coordinates
    longitude: number;         // Geocoded coordinates
    address?: string;          // Full address (optional, private)
    verified: boolean;         // Email/SMS verification status
    verifiedAt?: number;       // Timestamp when verified
    setAt: number;             // When location was set
    updatedAt: number;         // Last update
  };
}
```

---

### **Phase 2: Seller Profile Location Settings** ⏱️ 8 hours

#### 2.1. Create Location Settings Component
```typescript
// File: /src/app/components/profile/location-settings.tsx (NEW FILE)

import { useState } from 'react';
import { MapPin, Check, X } from 'lucide-react';

interface LocationSettingsProps {
  currentLocation?: SellerProfile['location'];
  onSave: (location: SellerProfile['location']) => Promise<void>;
}

export function LocationSettings({ currentLocation, onSave }: LocationSettingsProps) {
  const [country, setCountry] = useState(currentLocation?.country || '');
  const [city, setCity] = useState(currentLocation?.city || '');
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  const handleSave = async () => {
    setIsGeocoding(true);
    
    // Geocode location using external API
    const coords = await geocodeLocation(country, city);
    
    const locationData = {
      country,
      city,
      countryCode: coords.countryCode,
      latitude: coords.latitude,
      longitude: coords.longitude,
      verified: false, // Needs email verification
      source: 'geocoded' as const,
      setAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await onSave(locationData);
    setIsGeocoding(false);
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Location Settings</h3>
      <p className="text-sm text-zinc-400">
        Set your location to display your assets on the marketplace map.
        Your exact address is never shown publicly.
      </p>
      
      {/* Country Dropdown */}
      <div>
        <label className="text-sm text-zinc-400">Country</label>
        <CountrySelect value={country} onChange={setCountry} />
      </div>
      
      {/* City Input with Autocomplete */}
      <div>
        <label className="text-sm text-zinc-400">City</label>
        <CityAutocomplete 
          country={country}
          value={city} 
          onChange={setCity}
        />
      </div>
      
      {/* Preview Map */}
      {country && city && (
        <div className="h-48 rounded-lg overflow-hidden border border-[#27272a]">
          <LocationPreviewMap 
            latitude={currentLocation?.latitude}
            longitude={currentLocation?.longitude}
          />
        </div>
      )}
      
      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!country || !city || isGeocoding}
        className="btn-primary"
      >
        {isGeocoding ? 'Saving...' : 'Save Location'}
      </button>
      
      {/* Verification Status */}
      {currentLocation && (
        <div className="flex items-center gap-2">
          {currentLocation.verified ? (
            <Check size={16} className="text-primary" />
          ) : (
            <X size={16} className="text-yellow-500" />
          )}
          <span className="text-sm text-zinc-400">
            {currentLocation.verified 
              ? 'Location verified' 
              : 'Location not verified - verify to increase trust'
            }
          </span>
        </div>
      )}
    </div>
  );
}
```

#### 2.2. Integrate with Profile Page
```typescript
// File: /src/app/components/profile.tsx

import { LocationSettings } from './profile/location-settings';

export function Profile() {
  const handleSaveLocation = async (location: SellerProfile['location']) => {
    // Save to backend/blockchain
    await saveSellerLocation(userAddress, location);
    
    // Show success toast
    toast.success('Location saved successfully');
  };
  
  return (
    <div className="profile-container">
      {/* ... other profile sections */}
      
      <LocationSettings 
        currentLocation={sellerProfile?.location}
        onSave={handleSaveLocation}
      />
    </div>
  );
}
```

---

### **Phase 3: Geocoding Service Integration** ⏱️ 4 hours

#### 3.1. Create Geocoding Utility
```typescript
// File: /src/utils/geocoding.ts (NEW FILE)

/**
 * GEOCODING SERVICE
 * Uses OpenStreetMap Nominatim API (FREE, no API key needed)
 * Alternative: Google Geocoding API (requires API key)
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  countryCode: string;
  displayName: string;
}

/**
 * Geocode a location (City + Country) to coordinates
 */
export async function geocodeLocation(
  city: string, 
  country: string
): Promise<GeocodingResult> {
  const query = `${city}, ${country}`;
  
  // OpenStreetMap Nominatim API
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(query)}` +
    `&format=json` +
    `&limit=1` +
    `&addressdetails=1`,
    {
      headers: {
        'User-Agent': 'MarketplaceATP/1.0' // Required by Nominatim
      }
    }
  );
  
  const data = await response.json();
  
  if (!data || data.length === 0) {
    throw new Error('Location not found');
  }
  
  const result = data[0];
  
  return {
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    city: result.address.city || result.address.town || result.address.village,
    country: result.address.country,
    countryCode: result.address.country_code.toUpperCase(),
    displayName: result.display_name,
  };
}

/**
 * Reverse geocode coordinates to location
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?` +
    `lat=${latitude}` +
    `&lon=${longitude}` +
    `&format=json` +
    `&addressdetails=1`,
    {
      headers: {
        'User-Agent': 'MarketplaceATP/1.0'
      }
    }
  );
  
  const result = await response.json();
  
  return {
    latitude,
    longitude,
    city: result.address.city || result.address.town,
    country: result.address.country,
    countryCode: result.address.country_code.toUpperCase(),
    displayName: result.display_name,
  };
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

/**
 * Calculate distance between two points (Haversine formula)
 */
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

---

### **Phase 4: Mint Flow Integration** ⏱️ 6 hours

#### 4.1. Update Mint Asset Form
```typescript
// File: /src/app/components/mint/mint-asset-form.tsx

export function MintAssetForm() {
  const [useProfileLocation, setUseProfileLocation] = useState(true);
  const [customLocation, setCustomLocation] = useState<Location | null>(null);
  
  // Get seller's profile location
  const { data: sellerProfile } = useSellerProfile(userAddress);
  
  const handleMint = async (formData: MintFormData) => {
    // Determine location to use
    let assetLocation: Location | undefined;
    
    if (useProfileLocation && sellerProfile?.location) {
      // Use seller's profile location
      assetLocation = {
        ...sellerProfile.location,
        source: 'seller-profile'
      };
    } else if (customLocation) {
      // Use custom location for this asset
      assetLocation = {
        ...customLocation,
        source: 'manual'
      };
    }
    
    // Create metadata with location
    const metadata = {
      name: formData.name,
      description: formData.description,
      image: formData.image,
      category: formData.category,
      
      // Include location in metadata
      location: assetLocation,
      
      attributes: formData.attributes,
    };
    
    // Upload metadata to IPFS
    const metadataURI = await uploadToIPFS(metadata);
    
    // Mint asset with metadata URI
    await mintAssetOnChain({
      metadataURI,
      price: formData.price,
      totalSlots: formData.totalSlots,
    });
    
    toast.success('Asset minted with location!');
  };
  
  return (
    <form onSubmit={handleSubmit(handleMint)}>
      {/* ... existing form fields */}
      
      {/* Location Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Asset Location</h3>
        
        {sellerProfile?.location ? (
          <>
            {/* Use Profile Location */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useProfileLocation}
                onChange={(e) => setUseProfileLocation(e.target.checked)}
              />
              <span className="text-sm text-zinc-400">
                Use my profile location: {sellerProfile.location.city}, {sellerProfile.location.country}
              </span>
            </label>
            
            {/* Custom Location Option */}
            {!useProfileLocation && (
              <LocationPicker
                value={customLocation}
                onChange={setCustomLocation}
              />
            )}
          </>
        ) : (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-500">
              You haven't set your location yet. 
              <button 
                type="button"
                onClick={() => navigate('/profile?tab=location')}
                className="underline ml-1"
              >
                Set location in Profile
              </button>
            </p>
          </div>
        )}
        
        {/* Location Preview Map */}
        {(useProfileLocation && sellerProfile?.location) || customLocation ? (
          <div className="h-48 rounded-lg overflow-hidden border border-[#27272a]">
            <LocationPreviewMap
              latitude={
                useProfileLocation 
                  ? sellerProfile?.location?.latitude 
                  : customLocation?.latitude
              }
              longitude={
                useProfileLocation 
                  ? sellerProfile?.location?.longitude 
                  : customLocation?.longitude
              }
            />
          </div>
        ) : null}
      </div>
      
      <button type="submit" className="btn-primary">
        Mint Asset
      </button>
    </form>
  );
}
```

---

### **Phase 5: Map Component Updates** ⏱️ 3 hours

#### 5.1. Update Map to Use Real Location Data
```typescript
// File: /src/app/components/marketplace/realistic-world-map.tsx

export function RealisticWorldMap({
  filteredAssets,
  onAssetClick,
  selectedAssetId,
  onMarkerClick,
}: RealisticWorldMapProps) {
  // Filter assets that have location data
  const assetsWithLocation = filteredAssets.filter(
    asset => asset.location?.latitude && asset.location?.longitude
  );
  
  return (
    <div className="map-container">
      {/* ... map tiles */}
      
      {/* Asset Markers */}
      {assetsWithLocation.map((asset) => {
        if (!asset.location) return null;
        
        const pixelPos = latLngToPixel(
          asset.location.latitude,
          asset.location.longitude,
          zoom,
          containerSize.width,
          containerSize.height,
          center.lat,
          center.lng
        );
        
        // Render marker at asset location
        return (
          <AssetMarker
            key={asset.id}
            asset={asset}
            position={pixelPos}
            onHover={() => setHoveredAsset(asset.id)}
            onClick={() => onAssetClick(asset)}
          />
        );
      })}
      
      {/* No Location Warning */}
      {filteredAssets.length > 0 && assetsWithLocation.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-6 bg-zinc-900/90 rounded-xl border border-[#27272a]">
            <MapPin size={48} className="text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 text-center">
              No assets with location data found.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### **Phase 6: Smart Contract Integration** ⏱️ 8 hours

#### 6.1. Update Smart Contract to Store Metadata URI
```solidity
// File: contracts/RWAMarketplace.sol

contract RWAMarketplace {
    struct Asset {
        uint256 tokenId;
        address seller;
        uint256 price;
        uint256 totalSlots;
        uint256 availableSlots;
        string metadataURI; // ✅ IPFS URI with location data
        bool active;
    }
    
    mapping(uint256 => Asset) public assets;
    
    function mintAsset(
        string memory metadataURI,
        uint256 price,
        uint256 totalSlots
    ) external returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        
        assets[tokenId] = Asset({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            totalSlots: totalSlots,
            availableSlots: totalSlots,
            metadataURI: metadataURI, // Store metadata URI
            active: true
        });
        
        emit AssetMinted(tokenId, msg.sender, metadataURI);
        return tokenId;
    }
}
```

#### 6.2. Fetch Metadata from IPFS in Frontend
```typescript
// File: /src/utils/ipfs.ts

export async function fetchAssetMetadata(metadataURI: string) {
  // Convert ipfs:// to gateway URL
  const gatewayURL = metadataURI.replace(
    'ipfs://',
    'https://ipfs.io/ipfs/'
  );
  
  const response = await fetch(gatewayURL);
  const metadata = await response.json();
  
  return metadata;
}

// Usage in asset loading
export async function loadMarketplaceAssets(): Promise<MarketplaceAsset[]> {
  // Fetch assets from blockchain
  const onChainAssets = await contract.getActiveAssets();
  
  // Fetch metadata for each asset
  const assets = await Promise.all(
    onChainAssets.map(async (onChainAsset) => {
      // Fetch metadata from IPFS
      const metadata = await fetchAssetMetadata(onChainAsset.metadataURI);
      
      return {
        id: onChainAsset.tokenId.toString(),
        tokenId: onChainAsset.tokenId.toString(),
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        category: metadata.category,
        
        // ✅ Location from metadata
        location: metadata.location,
        
        price: formatEther(onChainAsset.price),
        seller: {
          address: onChainAsset.seller,
          verified: true, // Check verification
        },
        // ... other fields
      };
    })
  );
  
  return assets;
}
```

---

## 🎯 **EVALUATION: DOES CURRENT MAP MEET REQUIREMENTS?**

### **Requirements Checklist**

| Requirement | Status | Notes |
|------------|--------|-------|
| 1. Seller sets location in profile | ❌ **NOT IMPLEMENTED** | No profile location settings UI |
| 2. Location stored in seller profile | ❌ **NOT IMPLEMENTED** | No location fields in SellerProfile type |
| 3. Mint asset inherits seller location | ❌ **NOT IMPLEMENTED** | Mint flow doesn't collect location |
| 4. Asset has latitude/longitude data | ❌ **NOT IMPLEMENTED** | MarketplaceAsset type missing location fields |
| 5. Asset appears on map at correct coords | ⚠️ **PARTIAL** | Map can render markers, but no real data source |
| 6. Map displays all assets with location | ⚠️ **PARTIAL** | Works with mock data only |
| 7. Click marker opens asset details | ✅ **WORKING** | Modal opens correctly |
| 8. Filter assets by location | ❌ **NOT IMPLEMENTED** | No geo-filtering |
| 9. Search assets near location | ❌ **NOT IMPLEMENTED** | No proximity search |
| 10. Location verification system | ❌ **NOT IMPLEMENTED** | No verification flow |

### **Overall Status: ⚠️ 20% COMPLETE**

**What Works:**
- ✅ Map rendering engine (tiles, markers, controls)
- ✅ UI/UX design (professional, performant)
- ✅ Asset markers with hover cards
- ✅ Filter integration (category, blockchain, etc.)

**What's Missing (CRITICAL):**
- ❌ No location data in type definitions
- ❌ No seller profile location settings
- ❌ No location collection in mint flow
- ❌ No geocoding service
- ❌ No smart contract metadata storage
- ❌ No IPFS metadata fetching

---

## 📊 **IMPLEMENTATION EFFORT ESTIMATION**

| Phase | Tasks | Time | Priority |
|-------|-------|------|----------|
| Phase 1 | Type definitions | 2h | 🔴 Critical |
| Phase 2 | Profile location settings | 8h | 🔴 Critical |
| Phase 3 | Geocoding service | 4h | 🔴 Critical |
| Phase 4 | Mint flow integration | 6h | 🔴 Critical |
| Phase 5 | Map component updates | 3h | 🟡 High |
| Phase 6 | Smart contract + IPFS | 8h | 🔴 Critical |
| Testing | Integration testing | 4h | 🟡 High |
| **TOTAL** | | **35 hours** | |

---

## 🚀 **RECOMMENDED IMPLEMENTATION ORDER**

### **Sprint 1: Foundation (12 hours)**
1. ✅ Update type definitions (Phase 1)
2. ✅ Integrate geocoding service (Phase 3)
3. ✅ Create location settings UI (Phase 2)

### **Sprint 2: Mint Integration (9 hours)**
4. ✅ Update mint flow (Phase 4)
5. ✅ Update map component (Phase 5)

### **Sprint 3: Blockchain (12 hours)**
6. ✅ Update smart contracts (Phase 6)
7. ✅ Implement IPFS metadata storage
8. ✅ Integration testing

---

## 🎨 **FINAL PRODUCTION FLOW**

```
STEP 1: SELLER SETUP
┌─────────────────────────────────┐
│  Seller opens Profile Settings  │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Fill Location Form:            │
│  - Country: Thailand            │
│  - City: Phuket                 │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  System geocodes location       │
│  → lat: 7.8804, lng: 98.3923   │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Location saved to profile      │
│  (indexed by wallet address)    │
└─────────────────────────────────┘

STEP 2: MINT ASSET
┌─────────────────────────────────┐
│  Seller clicks "Mint Asset"     │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Fill Asset Details:            │
│  - Name: Beach Villa #123       │
│  - Price: 5.8 ETH               │
│  - Category: Real Estate        │
│  ☑ Use my location (Phuket)     │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Create Metadata with Location: │
│  {                              │
│    name: "Beach Villa #123",   │
│    location: {                 │
│      latitude: 7.8804,         │
│      longitude: 98.3923,       │
│      city: "Phuket",           │
│      country: "Thailand"       │
│    }                           │
│  }                             │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Upload to IPFS                 │
│  → ipfs://Qm...abc123           │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Mint on Blockchain             │
│  contract.mint(ipfsURI, ...)    │
└─────────────────────────────────┘

STEP 3: BUYER VIEWS MAP
┌─────────────────────────────────┐
│  Buyer opens Marketplace        │
│  Clicks "Map View"              │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Frontend fetches assets from   │
│  smart contract                 │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  For each asset:                │
│  - Fetch metadata from IPFS     │
│  - Extract location data        │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Render markers on map:         │
│  📍 Phuket (7.88°N, 98.39°E)   │
│     Beach Villa #123            │
│     5.8 ETH                     │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Buyer clicks marker            │
│  → Asset Details Modal opens    │
└─────────────────────────────────┘
```

---

## 📝 **CONCLUSION**

### **Current Status:**
✅ **Map UI/UX: COMPLETE** - Professional, performant, feature-rich
❌ **Data Integration: NOT STARTED** - No location data pipeline

### **Blockers:**
1. No location fields in type definitions
2. No seller profile location system
3. No mint flow location collection
4. No smart contract metadata storage

### **Path to Production:**
- Estimated effort: **35 hours**
- Critical path: **Type definitions → Profile UI → Mint integration → Smart contract**
- Can be completed in **1-2 sprints** with focused effort

### **Final Verdict:**
⚠️ **Map is technically ready but needs full data pipeline implementation to be production-ready.**

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-02-09  
**Status:** ⚠️ REQUIRES ACTION - DATA PIPELINE NOT IMPLEMENTED
