# 👤 Orina User System - Tài Liệu Kỹ Thuật Đầy Đủ
## Wallet → User Profile → User Info

> **Version:** 2.0 (Address-based Architecture)  
> **Last Updated:** February 13, 2026  
> **Migration:** Completed from userId to address-based system

---

## 📋 Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Architecture](#2-architecture)
3. [Wallet Connection](#3-wallet-connection)
4. [User Profile System](#4-user-profile-system)
5. [Avatar System](#5-avatar-system)
6. [UserContext](#6-usercontext)
7. [Profile Storage](#7-profile-storage)
8. [Display Names & Usernames](#8-display-names--usernames)
9. [Profile Editing](#9-profile-editing)
10. [Migration Guide](#10-migration-guide)
11. [Code Examples](#11-code-examples)
12. [Best Practices](#12-best-practices)

---

## 1. Tổng Quan

### 1.1. System Overview

Hệ thống User của Orina được thiết kế theo mô hình **Address-First**, không sử dụng `userId`:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORINA USER SYSTEM FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. WALLET CONNECTION (Wagmi + Web3Provider)                    │
│     User clicks "Connect"                                       │
│          ↓                                                      │
│     MetaMask/Wallet opens                                       │
│          ↓                                                      │
│     User approves connection                                    │
│          ↓                                                      │
│     Wagmi returns: { address, isConnected }                     │
│          ↓                                                      │
│  ┌────────────────────────────────────────────────────┐         │
│  │  address: "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F"      │
│  │  isConnected: true                                 │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                 │
│  2. USER INITIALIZATION (useUserInitialization hook)            │
│     Check localStorage for profile:                             │
│          user_profile_0x742d35cc...                             │
│          ↓                                                      │
│     ┌─────────────────┐                                         │
│     │ Profile exists? │                                         │
│     └────┬────────────┘                                         │
│          │                                                      │
│    ┌─────┴─────┐                                                │
│    │Yes        │No                                              │
│    ▼           ▼                                                │
│  Load     Create Default                                        │
│  Profile  Profile                                               │
│    │           │                                                │
│    └─────┬─────┘                                                │
│          ▼                                                      │
│  Update UserContext                                             │
│  {                                                              │
│    address: "0x742d35Cc...",                                    │
│    displayName: "0x742d...c4F",  // or custom                  │
│    username: "@742d35cc",                                       │
│    avatarUrl: null,              // or custom                   │
│    avatarType: "avatar6"         // deterministic               │
│  }                                                              │
│          ↓                                                      │
│  3. UI UPDATE                                                   │
│     ✅ Navbar shows: avatar + displayName                       │
│     ✅ Profile page: full profile data                          │
│     ✅ Messages: avatar + displayName in chats                  │
│     ✅ Community: avatar + displayName in posts                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2. Key Principles

✅ **Address-First:**
- Wallet address là unique identifier duy nhất
- Không có `userId` concept
- Storage keys: `user_profile_{address}`

✅ **Deterministic Avatars:**
- Mỗi address có 1 default avatar cố định
- Avatar seed được hash từ address
- Có thể upload custom avatar

✅ **Persistent Storage:**
- All user data trong localStorage
- Key format: `user_profile_{address.toLowerCase()}`
- Auto-sync với UserContext

✅ **Privacy-First:**
- Không có server-side user database
- Profile data chỉ trên client
- Wallet address public, profile customizable

---

## 2. Architecture

### 2.1. System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPONENT ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Web3Provider (Wagmi + React Query)                      │   │
│  │  - WagmiProvider config                                  │   │
│  │  - Chains: BSC, BSC Testnet, Sepolia                     │   │
│  │  - Connectors: injected (MetaMask, Trust Wallet, etc.)   │   │
│  │  - QueryClientProvider                                   │   │
│  └────────────────┬─────────────────────────────────────────┘   │
│                   │                                              │
│                   ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  WalletConnectButton                                     │   │
│  │  - Connect/Disconnect UI                                 │   │
│  │  - Wallet dropdown menu                                  │   │
│  │  - Address display                                       │   │
│  │  - Copy address function                                 │   │
│  └────────────────┬─────────────────────────────────────────┘   │
│                   │                                              │
│                   ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  useAccount() hook (Wagmi)                               │   │
│  │  Returns: { address, isConnected, ... }                  │   │
│  └────────────────┬─────────────────────────────────────────┘   │
│                   │                                              │
│                   ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  useUserInitialization()                                 │   │
│  │  - Detects wallet connection                             │   │
│  │  - Loads profile from localStorage                       │   │
│  │  - Creates default if not exists                         │   │
│  │  - Updates UserContext                                   │   │
│  └────────────────┬─────────────────────────────────────────┘   │
│                   │                                              │
│                   ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  UserContext (React Context)                             │   │
│  │  - userData: UserData                                    │   │
│  │  - displayName: string                                   │   │
│  │  - updateUserData()                                      │   │
│  │  - updateAvatar()                                        │   │
│  │  - updateBanner()                                        │   │
│  └────────────────┬─────────────────────────────────────────┘   │
│                   │                                              │
│                   ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Profile System (profileUtils.ts)                        │   │
│  │  - loadUserProfile(address)                              │   │
│  │  - saveUserProfile(profile)                              │   │
│  │  - createDefaultProfile(address)                         │   │
│  │  - updateUserProfile(address, updates)                   │   │
│  │  - Follow/unfollow system                                │   │
│  │  - Activity tracking                                     │   │
│  │  - Badges system                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                   │                                              │
│                   ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Avatar System (avatarUtils.ts + user-avatars.tsx)       │   │
│  │  - 8 default SVG avatars (Avatar1-20)                    │   │
│  │  - getAvatarByUserId(address)                            │   │
│  │  - Deterministic mapping                                 │   │
│  │  - Custom avatar support                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                   │                                              │
│                   ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  localStorage                                            │   │
│  │  Keys:                                                   │   │
│  │  - user_profile_{address}         // Profile data       │   │
│  │  - orina_user_data                // UserContext state  │   │
│  │  - orina_avatar_seed_{address}    // Avatar randomness  │   │
│  │  - studio_user_activities_{addr}  // Activity history   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2. Data Flow Diagram

```
User Action                    System Response
    │                              │
    ▼                              │
[Click Connect]                    │
    │                              │
    ▼                              │
MetaMask Prompt ──────────────────►│
    │                              │
    ▼                              │
Approve Connection                 │
    │                              │
    ▼                              ▼
useAccount() ─────────►  { address: "0x...", isConnected: true }
    │                              │
    │                              ▼
    │                    useUserInitialization detects connection
    │                              │
    │                              ▼
    │                    Check localStorage:
    │                    localStorage.getItem('user_profile_0x...')
    │                              │
    │                         ┌────┴────┐
    │                         │         │
    │                    Found?        Not Found?
    │                         │         │
    │                         ▼         ▼
    │                   Load Profile  Create Default
    │                         │         │
    │                         └────┬────┘
    │                              ▼
    │                    updateUserData({
    │                      address: "0x...",
    │                      displayName: "...",
    │                      avatarType: "avatar6"
    │                    })
    │                              │
    │                              ▼
    │                    UserContext updated
    │                              │
    │                              ▼
    └─────────────────────►  UI Re-renders:
                                 - Navbar: ✅
                                 - Profile: ✅
                                 - Messages: ✅
                                 - Community: ✅
```

---

## 3. Wallet Connection

### 3.1. Web3Provider Setup

**File:** `/src/providers/Web3Provider.tsx`

```typescript
import { WagmiProvider, createConfig, http } from 'wagmi';
import { bsc, bscTestnet, sepolia, mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configure Wagmi with BSC as primary chain
const config = createConfig({
  chains: [bsc, bscTestnet, sepolia, mainnet],
  connectors: [
    injected(), // MetaMask, Trust Wallet, Coinbase Wallet, etc.
  ],
  transports: {
    [bsc.id]: http(RPC_URLS[56]),
    [bscTestnet.id]: http(RPC_URLS[97]),
    [sepolia.id]: http(RPC_URLS[11155111]),
    [mainnet.id]: http(),
  },
});

// React Query client for caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10_000,
    },
  },
});

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

**Key Features:**
- ✅ **Multi-Chain Support:** BSC, BSC Testnet, Sepolia, Mainnet
- ✅ **Auto-Detect Wallets:** MetaMask, Trust Wallet, Coinbase Wallet
- ✅ **Caching:** React Query caches wallet data
- ✅ **Custom RPC:** Configurable RPC URLs per chain

---

### 3.2. WalletConnectButton Component

**File:** `/src/app/components/wallet-connect-button.tsx`

**Features:**
- Connect button when disconnected
- Dropdown menu when connected
- Display address + avatar
- Copy address to clipboard
- Navigation (Profile, Favorites, Settings)
- Disconnect button

**UI States:**

```typescript
// 1. DISCONNECTED STATE
<button onClick={handleConnect}>
  Connect
</button>

// 2. CONNECTED STATE
<button onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
  <div>
    <span>{displayName || formatAddress(address)}</span>
    <span className="text-[#2CC295]">Pro Member</span>
  </div>
  <Avatar />
</button>

// 3. DROPDOWN MENU
<div className="dropdown">
  <div>Connected Wallet: {address}</div>
  <button onClick={handleCopyAddress}>Copy Address</button>
  <hr />
  <button onClick={() => navigate('profile')}>Profile</button>
  <button onClick={() => navigate('favorites')}>Favorites</button>
  <button onClick={() => navigate('settings')}>Settings</button>
  <hr />
  <button onClick={handleDisconnect}>Disconnect</button>
</div>
```

---

### 3.3. useAccount Hook

**Wagmi Hook Usage:**

```typescript
import { useAccount } from 'wagmi';

function MyComponent() {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount();
  
  // address: "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F" | undefined
  // isConnected: boolean
  // isConnecting: boolean (during connection)
  // isDisconnected: boolean
  
  if (!isConnected) {
    return <ConnectWallet />;
  }
  
  return <UserProfile address={address} />;
}
```

**Hook Returns:**
```typescript
{
  address?: `0x${string}`;         // Wallet address
  addresses?: readonly `0x${string}`[]; // Multiple accounts
  chainId?: number;                // Current chain ID
  connector?: Connector;           // Active connector
  isConnected: boolean;            // Connection status
  isConnecting: boolean;           // Is connecting?
  isDisconnected: boolean;         // Is disconnected?
  isReconnecting: boolean;         // Is reconnecting?
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
}
```

---

## 4. User Profile System

### 4.1. UserProfile Type

**File:** `/src/types/profile.ts`

```typescript
export interface UserProfile {
  id: string;                    // address (lowercase)
  address: string;               // Wallet address (normalized)
  username: string;              // @address format
  displayName: string;           // Custom display name
  bio?: string;                  // Profile bio
  avatar?: string;               // Custom avatar URL
  banner?: string;               // Banner image URL
  socialLinks: {
    twitter?: string;
    discord?: string;
    website?: string;
  };
  stats: {
    assetsOwned: number;
    totalSpent: number;
    totalSales: number;
    totalVolume: number;
    joinedDate: number;          // Unix timestamp
    lastActive: number;          // Unix timestamp
  };
  followers: string[];           // Array of addresses
  following: string[];           // Array of addresses
  badges: string[];              // Badge IDs
  settings: {
    notifications: {
      email: boolean;
      push: boolean;
      sales: boolean;
      offers: boolean;
      followers: boolean;
    };
    privacy: {
      showActivity: boolean;
      showBalance: boolean;
      showFollowers: boolean;
    };
    display: {
      theme: 'dark' | 'light';
      currency: 'ETH' | 'USD';
      language: string;
    };
  };
  verified: boolean;
}
```

---

### 4.2. Profile Storage Keys

**localStorage Structure:**

```
┌───────────────────────────────────────────────────────────┐
│  localStorage Keys (Address-based)                        │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  user_profile_{address}                                   │
│  ├─ Full UserProfile object                               │
│  └─ Example: user_profile_0x742d35cc6634c0532925...       │
│                                                           │
│  orina_user_data                                          │
│  ├─ Current UserContext state                             │
│  └─ Synced with active wallet                             │
│                                                           │
│  orina_avatar_seed_{address}                              │
│  ├─ Random seed for avatar selection                      │
│  └─ Used when profile reset                               │
│                                                           │
│  studio_user_activities_{address}                         │
│  ├─ Array of ActivityItem[]                               │
│  └─ User's transaction/activity history                   │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

### 4.3. Profile Utils Functions

**File:** `/src/utils/profileUtils.ts`

#### **Load Profile**
```typescript
export function loadUserProfile(address: string): UserProfile | null {
  try {
    const key = `user_profile_${address.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load user profile:', error);
    return null;
  }
}
```

#### **Save Profile**
```typescript
export function saveUserProfile(profile: UserProfile): void {
  try {
    if (!profile.address) {
      console.error('Cannot save profile without wallet address');
      return;
    }
    const key = `user_profile_${profile.address.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (error) {
    console.error('Failed to save user profile:', error);
  }
}
```

#### **Create Default Profile**
```typescript
export function createDefaultProfile(address: string): UserProfile {
  const normalized = address.toLowerCase();
  return {
    id: normalized,
    address: normalized,
    username: `@${address.slice(2, 10)}`,
    displayName: shortenUserDisplayName(address), // "0x742d...c4F"
    bio: undefined,
    avatar: undefined,
    banner: undefined,
    socialLinks: {},
    stats: {
      assetsOwned: 0,
      totalSpent: 0,
      totalSales: 0,
      totalVolume: 0,
      joinedDate: Date.now(),
      lastActive: Date.now(),
    },
    followers: [],
    following: [],
    badges: [],
    settings: {
      notifications: {
        email: true,
        push: true,
        sales: true,
        offers: true,
        followers: true,
      },
      privacy: {
        showActivity: true,
        showBalance: true,
        showFollowers: true,
      },
      display: {
        theme: 'dark',
        currency: 'ETH',
        language: 'en',
      },
    },
    verified: false,
  };
}
```

#### **Update Profile**
```typescript
export function updateUserProfile(
  address: string, 
  updates: Partial<UserProfile>
): UserProfile {
  const profile = loadUserProfile(address) || createDefaultProfile(address);
  const updated = { 
    ...profile, 
    ...updates, 
    address: address.toLowerCase() 
  };
  saveUserProfile(updated);
  return updated;
}
```

---

### 4.4. Follow/Unfollow System

```typescript
// Follow user
export function followUser(currentAddress: string, targetAddress: string): void {
  const profile = loadUserProfile(currentAddress);
  if (!profile) return;
  
  const normalizedTarget = targetAddress.toLowerCase();
  
  if (!profile.following.includes(normalizedTarget)) {
    // Add to current user's following list
    profile.following.push(normalizedTarget);
    saveUserProfile(profile);
    
    // Add to target user's followers list
    const targetProfile = loadUserProfile(targetAddress);
    if (targetProfile && !targetProfile.followers.includes(currentAddress.toLowerCase())) {
      targetProfile.followers.push(currentAddress.toLowerCase());
      saveUserProfile(targetProfile);
    }
  }
}

// Unfollow user
export function unfollowUser(currentAddress: string, targetAddress: string): void {
  const profile = loadUserProfile(currentAddress);
  if (!profile) return;
  
  const normalizedTarget = targetAddress.toLowerCase();
  const normalizedCurrent = currentAddress.toLowerCase();
  
  // Remove from current user's following list
  profile.following = profile.following.filter(addr => addr !== normalizedTarget);
  saveUserProfile(profile);
  
  // Remove from target user's followers list
  const targetProfile = loadUserProfile(targetAddress);
  if (targetProfile) {
    targetProfile.followers = targetProfile.followers.filter(addr => addr !== normalizedCurrent);
    saveUserProfile(targetProfile);
  }
}

// Check if following
export function isFollowing(currentAddress: string, targetAddress: string): boolean {
  const profile = loadUserProfile(currentAddress);
  if (!profile) return false;
  return profile.following.includes(targetAddress.toLowerCase());
}
```

---

## 5. Avatar System

### 5.1. Default Avatars

**8 SVG Avatars:**

| Avatar | Description | Colors |
|--------|-------------|--------|
| Avatar1 | Purple girl with blue shirt | Pink, Blue, Yellow |
| Avatar2 | Blue boy with blue shirt | Blue, Yellow, Brown |
| Avatar6 | Orange hair boy with cyan | Cyan, Orange, Gray |
| Avatar14 | Dark skin with orange shirt | Teal, Orange, Brown |
| Avatar17 | Yellow shirt with dark skin | Pink, Yellow, Dark |
| Avatar18 | Purple hair with blue shirt | Purple, Cyan, Pink |
| Avatar19 | Pink girl with blue earrings | Pink, Blue, Yellow |
| Avatar20 | Blue boy with purple headphone | Blue, Purple, Yellow |

**All avatars are:**
- 44x44px SVG
- Imported from Figma
- Stored in `/src/app/components/user-avatars.tsx`
- Colorful, diverse, friendly design

---

### 5.2. Avatar Selection Logic

**Deterministic Mapping:**

```typescript
// File: /src/utils/avatarUtils.ts
export function getAvatarTypeForAddress(address: string): AvatarType {
  if (!address) return getRandomAvatarType();
  
  // 1. Check if there's a random seed (from profile reset)
  const seedKey = `orina_avatar_seed_${address.toLowerCase()}`;
  const storedSeed = localStorage.getItem(seedKey);
  
  if (storedSeed) {
    // Use stored random seed
    const seed = parseInt(storedSeed, 10);
    const index = seed % AVATAR_TYPES.length;
    return AVATAR_TYPES[index];
  }
  
  // 2. Use address to generate deterministic index
  const hash = address.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  const index = hash % AVATAR_TYPES.length;
  return AVATAR_TYPES[index]; // e.g., "avatar6"
}
```

**Example:**
```typescript
// Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F
// Hash: 3842 (sum of char codes)
// Index: 3842 % 8 = 2
// Avatar: AVATAR_TYPES[2] = "avatar6"
```

---

### 5.3. getAvatarByUserId Function

**File:** `/src/app/components/user-avatars.tsx`

```typescript
export function getAvatarByUserId(userId: string): React.ComponentType<{ className?: string }> {
  const userIdStr = String(userId || '');
  
  // Check for stored random seed
  const seedKey = `orina_avatar_seed_${userIdStr.toLowerCase()}`;
  const storedSeed = localStorage.getItem(seedKey);
  
  if (storedSeed) {
    const seed = parseInt(storedSeed, 10);
    const index = Math.abs(seed) % AVATAR_COMPONENTS.length;
    return AVATAR_COMPONENTS[index];
  }
  
  // Create hash from userId/address
  let hash = 0;
  for (let i = 0; i < userIdStr.length; i++) {
    hash = ((hash << 5) - hash) + userIdStr.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % AVATAR_COMPONENTS.length;
  return AVATAR_COMPONENTS[index]; // Returns Avatar6, Avatar14, etc.
}
```

**Usage:**
```typescript
// Get avatar component
const AvatarComponent = getAvatarByUserId(address);

// Render avatar
<AvatarComponent className="w-10 h-10" />
```

---

### 5.4. Custom Avatar Upload

**User can upload custom avatar via Profile Edit:**

```typescript
// In EditProfileModal
const [avatarImages, setAvatarImages] = useState<UploadedImage[]>([]);

const handleSave = () => {
  const updates: Partial<UserProfile> = {
    displayName,
    username,
    bio,
    avatar: avatarImages[0]?.url || undefined, // Custom avatar URL
    banner: bannerImages[0]?.url || undefined,
    socialLinks: { twitter, discord, website },
  };
  
  onSave(updates);
};
```

**Priority Order:**
1. Custom avatar (`profile.avatar`) - if uploaded
2. Default SVG avatar - deterministic based on address

---

## 6. UserContext

### 6.1. Context Structure

**File:** `/src/contexts/UserContext.tsx`

```typescript
interface UserData {
  address?: string;
  avatarUrl?: string;
  avatarType?: AvatarType;
  username?: string;
  displayName?: string;
  bio?: string;
  bannerUrl?: string;
  twitter?: string;
  website?: string;
}

interface UserContextType {
  userData: UserData;
  displayName: string;
  updateUserData: (data: Partial<UserData>) => void;
  updateAvatar: (avatarUrl: string) => void;
  updateBanner: (bannerUrl: string) => void;
}
```

---

### 6.2. UserProvider Implementation

```typescript
export function UserProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData>(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('orina_user_data');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse user data:', e);
        }
      }
    }
    return {};
  });

  // Persist to localStorage whenever userData changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('orina_user_data', JSON.stringify(userData));
    }
  }, [userData]);

  // Memoized update functions
  const updateUserData = useCallback((data: Partial<UserData>) => {
    setUserData(prev => ({ ...prev, ...data }));
  }, []);

  const updateAvatar = useCallback((avatarUrl: string) => {
    setUserData(prev => ({ ...prev, avatarUrl }));
  }, []);

  const updateBanner = useCallback((bannerUrl: string) => {
    setUserData(prev => ({ ...prev, bannerUrl }));
  }, []);

  return (
    <UserContext.Provider value={{ 
      userData, 
      displayName: userData.displayName || '', 
      updateUserData, 
      updateAvatar, 
      updateBanner 
    }}>
      {children}
    </UserContext.Provider>
  );
}
```

---

### 6.3. useUser Hook

```typescript
export function useUser() {
  const context = useContext(UserContext);
  
  if (!context) {
    // Safe fallback for hot reload
    return {
      userData: {},
      displayName: '',
      updateUserData: () => {},
      updateAvatar: () => {},
      updateBanner: () => {},
    };
  }
  
  return context;
}
```

**Usage in Components:**
```typescript
import { useUser } from '@/contexts/UserContext';

function MyComponent() {
  const { userData, displayName, updateUserData } = useUser();
  
  // Read user data
  console.log(displayName); // "0x742d...c4F" or custom name
  console.log(userData.avatarUrl); // Custom avatar or undefined
  
  // Update user data
  const handleUpdateName = () => {
    updateUserData({ displayName: 'Satoshi Nakamoto' });
  };
  
  return <div>{displayName}</div>;
}
```

---

## 7. Profile Storage

### 7.1. Storage Architecture

```
┌───────────────────────────────────────────────────────────┐
│  localStorage Structure (Address-based)                   │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  Key: user_profile_0x742d35cc6634c0532925a3b844bc9e7595f9c4f  │
│  Value: {                                                 │
│    "id": "0x742d35cc6634c0532925a3b844bc9e7595f9c4f",    │
│    "address": "0x742d35cc6634c0532925a3b844bc9e7595f9c4f",│
│    "username": "@742d35cc",                               │
│    "displayName": "Crypto Trader",                        │
│    "bio": "DeFi enthusiast",                              │
│    "avatar": "https://ipfs.io/...",                       │
│    "banner": null,                                        │
│    "socialLinks": {                                       │
│      "twitter": "@cryptotrader",                          │
│      "discord": "trader#1234"                             │
│    },                                                     │
│    "stats": {                                             │
│      "assetsOwned": 12,                                   │
│      "totalSpent": 4.5,                                   │
│      "totalSales": 2.8,                                   │
│      "totalVolume": 7.3,                                  │
│      "joinedDate": 1707829522000,                         │
│      "lastActive": 1707829800000                          │
│    },                                                     │
│    "followers": ["0xabc...", "0xdef..."],                 │
│    "following": ["0x123...", "0x456..."],                 │
│    "badges": ["early_adopter", "collector"],              │
│    "settings": { ... },                                   │
│    "verified": false                                      │
│  }                                                        │
│                                                           │
│  ───────────────────────────────────────────────────────  │
│                                                           │
│  Key: orina_user_data                                     │
│  Value: {                                                 │
│    "address": "0x742d35cc...",                            │
│    "displayName": "Crypto Trader",                        │
│    "username": "@742d35cc",                               │
│    "avatarUrl": "https://ipfs.io/...",                    │
│    "avatarType": "avatar6"                                │
│  }                                                        │
│                                                           │
│  ───────────────────────────────────────────────────────  │
│                                                           │
│  Key: orina_avatar_seed_0x742d35cc...                     │
│  Value: "428572"                                          │
│                                                           │
│  ───────────────────────────────────────────────────────  │
│                                                           │
│  Key: studio_user_activities_0x742d35cc...                │
│  Value: [                                                 │
│    {                                                      │
│      "id": "activity_1707829522000_0",                    │
│      "userId": "0x742d35cc...",                           │
│      "type": "purchase",                                  │
│      "assetId": "42",                                     │
│      "assetName": "Asset #42",                            │
│      "price": 2.5,                                        │
│      "timestamp": 1707829522000,                          │
│      "txHash": "0xabc123...",                             │
│      "status": "completed"                                │
│    },                                                     │
│    ...                                                    │
│  ]                                                        │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

### 7.2. Migration from Old System

**Old System (DEPRECATED):**
```
studio_user_profile_user_1
studio_user_profile_user_2
studio_address_to_userid
```

**New System (CURRENT):**
```
user_profile_{address}
```

**Migration Function:**
```typescript
export function migrateOldProfiles(): void {
  console.log('🔄 [Migration] Starting old profile cleanup...');
  let cleaned = 0;
  
  // Find and remove old profile keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('studio_user_profile_user_')) {
      console.log(`🗑️ [Migration] Removing old profile: ${key}`);
      localStorage.removeItem(key);
      cleaned++;
    }
  }
  
  // Remove old mapping table
  localStorage.removeItem('studio_address_to_userid');
  
  console.log(`✅ [Migration] Cleanup complete. Removed ${cleaned} old profiles.`);
}
```

**Auto-run on App startup:**
```typescript
// In App.tsx or index.tsx
useEffect(() => {
  migrateOldProfiles();
}, []);
```

---

## 8. Display Names & Usernames

### 8.1. Display Name Logic

**Priority Order:**
1. Custom displayName (if set by user)
2. Username (if set)
3. Shortened address (`0x742d...c4F`)

**Implementation:**
```typescript
// In UserContext
const displayName = userData.displayName || 
                   userData.username || 
                   shortenUserDisplayName(userData.address);

// In WalletConnectButton
<span>{userData?.displayName || userData?.username || formatAddress(address)}</span>
```

---

### 8.2. shortenUserDisplayName Function

```typescript
/**
 * Shorten address for user display name (5 chars ... 3 chars)
 * Format: 0x8a1...2f3 (5 chars + ... + 3 chars)
 */
export function shortenUserDisplayName(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 5)}...${address.slice(-3)}`;
}

// Examples:
shortenUserDisplayName('0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F')
// Returns: "0x742...c4F"
```

---

### 8.3. formatAddress Function

```typescript
/**
 * Shorten address (6 chars ... 4 chars)
 * Used for technical displays
 */
export function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Examples:
shortenAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F')
// Returns: "0x742d...9c4F"
```

---

### 8.4. Username Format

**Auto-generated username:**
```typescript
username: `@${address.slice(2, 10)}`

// Example:
// Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F
// Username: @742d35Cc
```

**User can customize in Edit Profile:**
```typescript
// User enters: "satoshi"
username: "@satoshi"
```

---

## 9. Profile Editing

### 9.1. EditProfileModal Component

**File:** `/src/app/components/profile/edit-profile-modal.tsx`

**Editable Fields:**
- Display Name
- Username
- Bio
- Avatar (image upload)
- Banner (image upload)
- Social Links (Twitter, Discord, Website)

**UI Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Edit Profile                                      [X]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Avatar                                                 │
│  [Upload Avatar]                  [Current Avatar]     │
│                                                         │
│  Banner                                                 │
│  [Upload Banner]                                        │
│                                                         │
│  Display Name                                           │
│  [Crypto Trader                                    ]    │
│                                                         │
│  Username                                               │
│  [@cryptotrader                                    ]    │
│                                                         │
│  Bio                                                    │
│  [DeFi enthusiast...                               ]    │
│  [                                                  ]    │
│                                                         │
│  Social Links                                           │
│  Twitter:  [@cryptotrader                          ]    │
│  Discord:  [trader#1234                            ]    │
│  Website:  [https://...                            ]    │
│                                                         │
│  [Cancel]                              [Save Changes]   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 9.2. Save Flow

```typescript
const handleSaveProfile = (updates: Partial<UserProfile>) => {
  // 1. Update Profile System
  const updatedProfile = updateUserProfile(profileAddress, updates);
  
  // 2. Update UserContext
  updateUserData({
    displayName: updates.displayName,
    username: updates.username,
    bio: updates.bio,
    avatarUrl: updates.avatar,
    bannerUrl: updates.banner,
  });
  
  // 3. Update local state
  setProfile(updatedProfile);
  
  // 4. Close modal
  setIsEditModalOpen(false);
  
  // 5. Show success toast
  toast.success('Profile updated successfully!');
};
```

---

## 10. Migration Guide

### 10.1. Old vs New System

| Feature | Old System (v1) | New System (v2) |
|---------|-----------------|-----------------|
| **Identifier** | `userId` (user_1, user_2) | `address` (0x742d...) |
| **Storage Key** | `studio_user_profile_user_1` | `user_profile_0x742d...` |
| **Mapping** | `studio_address_to_userid` | Direct address lookup |
| **Avatar** | Random per userId | Deterministic per address |
| **Migration** | Required | Auto-cleanup on startup |

---

### 10.2. Migration Steps

**Step 1: Run Migration Function**
```typescript
import { migrateOldProfiles } from '@/utils/profileUtils';

useEffect(() => {
  migrateOldProfiles();
}, []);
```

**Step 2: Verify localStorage**
```javascript
// In browser console
Object.keys(localStorage)
  .filter(key => key.includes('user_profile'))
  .forEach(key => console.log(key));

// Should only see: user_profile_{address}
// No more: studio_user_profile_user_*
```

**Step 3: Test Profile Loading**
```typescript
const { address } = useAccount();
const profile = loadUserProfile(address);
console.log('Profile loaded:', profile);
```

---

## 11. Code Examples

### 11.1. Complete User Flow

```typescript
// 1. Connect Wallet
import { useAccount } from 'wagmi';
import { useUser } from '@/contexts/UserContext';

function App() {
  const { address, isConnected } = useAccount();
  const { userData, displayName, updateUserData } = useUser();
  
  // 2. Auto-initialize on connection
  useEffect(() => {
    if (isConnected && address) {
      // Load or create profile
      let profile = loadUserProfile(address);
      
      if (!profile) {
        profile = createDefaultProfile(address);
        saveUserProfile(profile);
      }
      
      // Update UserContext
      updateUserData({
        address: profile.address,
        displayName: profile.displayName,
        username: profile.username,
        avatarUrl: profile.avatar,
        avatarType: getAvatarTypeForAddress(address),
      });
    }
  }, [isConnected, address]);
  
  // 3. Display user info
  return (
    <div>
      {isConnected ? (
        <UserProfile 
          address={address} 
          displayName={displayName}
        />
      ) : (
        <ConnectWallet />
      )}
    </div>
  );
}
```

---

### 11.2. Get User Avatar

```typescript
import { getAvatarByUserId } from '@/app/components/user-avatars';

function UserAvatar({ address }: { address: string }) {
  // Get avatar component (deterministic)
  const AvatarComponent = getAvatarByUserId(address);
  
  return (
    <div className="w-12 h-12 rounded-full overflow-hidden">
      <AvatarComponent className="w-full h-full" />
    </div>
  );
}
```

---

### 11.3. Update Profile

```typescript
import { updateUserProfile } from '@/utils/profileUtils';
import { useUser } from '@/contexts/UserContext';

function EditProfile() {
  const { address } = useAccount();
  const { updateUserData } = useUser();
  
  const handleSave = (updates: Partial<UserProfile>) => {
    // 1. Update Profile System
    const updatedProfile = updateUserProfile(address, updates);
    
    // 2. Update UserContext
    updateUserData({
      displayName: updates.displayName,
      avatarUrl: updates.avatar,
    });
    
    // 3. Success feedback
    toast.success('Profile updated!');
  };
  
  return <EditProfileModal onSave={handleSave} />;
}
```

---

### 11.4. Follow/Unfollow User

```typescript
import { followUser, unfollowUser, isFollowing } from '@/utils/profileUtils';

function FollowButton({ targetAddress }: { targetAddress: string }) {
  const { address } = useAccount();
  const [following, setFollowing] = useState(false);
  
  useEffect(() => {
    if (address && targetAddress) {
      setFollowing(isFollowing(address, targetAddress));
    }
  }, [address, targetAddress]);
  
  const handleToggle = () => {
    if (!address) return;
    
    if (following) {
      unfollowUser(address, targetAddress);
      setFollowing(false);
      toast.success('Unfollowed');
    } else {
      followUser(address, targetAddress);
      setFollowing(true);
      toast.success('Following');
    }
  };
  
  return (
    <button onClick={handleToggle}>
      {following ? 'Unfollow' : 'Follow'}
    </button>
  );
}
```

---

## 12. Best Practices

### 12.1. Do's ✅

✅ **Always normalize addresses:**
```typescript
const normalized = address.toLowerCase();
```

✅ **Use ProfileUtils functions:**
```typescript
// Good
const profile = loadUserProfile(address);

// Bad
const profile = JSON.parse(localStorage.getItem(`user_profile_${address}`));
```

✅ **Check for wallet connection:**
```typescript
const { address, isConnected } = useAccount();

if (!isConnected) {
  return <ConnectWallet />;
}
```

✅ **Use UserContext for global state:**
```typescript
const { userData, displayName } = useUser();
```

✅ **Memoize update functions:**
```typescript
const updateUserData = useCallback((data) => {
  setUserData(prev => ({ ...prev, ...data }));
}, []);
```

---

### 12.2. Don'ts ❌

❌ **Don't use userId:**
```typescript
// Bad
const profile = loadUserProfile('user_1');

// Good
const profile = loadUserProfile(address);
```

❌ **Don't directly mutate localStorage:**
```typescript
// Bad
localStorage.setItem('user_profile_...', JSON.stringify(data));

// Good
saveUserProfile(profile);
```

❌ **Don't forget to normalize:**
```typescript
// Bad
const key = `user_profile_${address}`;

// Good
const key = `user_profile_${address.toLowerCase()}`;
```

❌ **Don't assume wallet is connected:**
```typescript
// Bad
const profile = loadUserProfile(address); // address might be undefined

// Good
if (address) {
  const profile = loadUserProfile(address);
}
```

---

## 📚 Appendix

### A. Type Definitions

```typescript
// UserProfile (complete)
interface UserProfile {
  id: string;
  address: string;
  username: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  socialLinks: {
    twitter?: string;
    discord?: string;
    website?: string;
  };
  stats: ProfileStats;
  followers: string[];
  following: string[];
  badges: string[];
  settings: ProfileSettings;
  verified: boolean;
}

// UserData (UserContext)
interface UserData {
  address?: string;
  avatarUrl?: string;
  avatarType?: AvatarType;
  username?: string;
  displayName?: string;
  bio?: string;
  bannerUrl?: string;
  twitter?: string;
  website?: string;
}

// AvatarType
type AvatarType = 'avatar1' | 'avatar2' | 'avatar6' | 'avatar14' | 
                  'avatar17' | 'avatar18' | 'avatar19' | 'avatar20';
```

### B. File Structure

```
User System Files:
/src/providers/
├── Web3Provider.tsx                  # Wagmi + React Query

/src/contexts/
├── UserContext.tsx                   # User state management

/src/app/components/
├── wallet-connect-button.tsx         # Connect/disconnect UI
├── user-avatars.tsx                  # 8 default avatars
└── profile/
    ├── enhanced-profile.tsx          # Profile page
    └── edit-profile-modal.tsx        # Edit UI

/src/utils/
├── profileUtils.ts                   # Profile CRUD
├── avatarUtils.ts                    # Avatar logic
└── format.ts                         # Address formatting

/src/hooks/
└── useUserInitialization.ts          # Auto-load profile
```

### C. Storage Keys Reference

```typescript
// Profile data
`user_profile_{address}`              // Full UserProfile object

// Context state
`orina_user_data`                     // Current UserContext

// Avatar randomness
`orina_avatar_seed_{address}`         // Random seed for avatar

// Activity history
`studio_user_activities_{address}`    // ActivityItem[]

// Deprecated (old system)
`studio_user_profile_user_{id}`       // ❌ Remove after migration
`studio_address_to_userid`            // ❌ Remove after migration
```

### D. Common Patterns

```typescript
// Pattern 1: Load profile on mount
useEffect(() => {
  if (address) {
    const profile = loadUserProfile(address);
    if (profile) {
      setProfile(profile);
    }
  }
}, [address]);

// Pattern 2: Get display name
const displayName = userData?.displayName || 
                   userData?.username || 
                   shortenUserDisplayName(address);

// Pattern 3: Get avatar
const AvatarComponent = userData?.avatarUrl 
  ? <img src={userData.avatarUrl} />
  : <AvatarSVG address={address} />;

// Pattern 4: Update profile
const handleUpdate = (updates: Partial<UserProfile>) => {
  const updated = updateUserProfile(address, updates);
  updateUserData(updates);
  toast.success('Saved!');
};
```

---

## 📞 Support

- **Documentation:** This file
- **Migration Issues:** Check browser console for errors
- **GitHub:** [Report Issues](https://github.com/orina/issues)
- **Discord:** [#user-system channel](https://discord.gg/orina)

---

**Last Updated:** February 13, 2026  
**Document Version:** 2.0  
**System Version:** Address-based (v2)  
**Maintained By:** Orina Development Team
