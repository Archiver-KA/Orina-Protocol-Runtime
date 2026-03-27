export type StoryBlockType = 'heading' | 'paragraph' | 'image';

export interface StoryBlock {
  id: string;
  type: StoryBlockType;
  content: string;
}

export interface StorySettings {
  category: string;
  tags: string;
}

export interface UserStoryDocument {
  draftBlocks: StoryBlock[];
  draftSettings: StorySettings;
  publishedBlocks: StoryBlock[];
  publishedSettings: StorySettings;
  updatedAt: number;
  publishedAt?: number;
}

export interface UserProfile {
  id: string;
  address: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  // Alias for IPFS uploads (backward compatible)
  avatarUrl?: string;
  bannerUrl?: string;
  
  // Social links
  socialLinks?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
    website?: string;
  };
  
  // Stats
  stats: {
    assetsOwned: number;
    totalSpent: number;
    totalSales: number;
    totalVolume: number;
    joinedDate: number;
    lastActive: number;
  };
  
  // Social
  followers: string[];
  following: string[];
  
  // Badges
  badges: string[];

  story: UserStoryDocument;
  
  // Settings
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
      language: 'en' | 'vi';
    };
  };
  
  // Verification
  verified: boolean;
  verifiedDate?: number;
}

export interface ActivityItem {
  id: string;
  userId: string;
  type: 'mint' | 'purchase' | 'sale' | 'transfer' | 'list' | 'offer';
  assetId: string;
  assetName: string;
  assetImage: string;
  price?: number;
  from?: string;
  to?: string;
  timestamp: number;
  txHash?: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedDate?: number;
}

export type ActivityFilter = 'all' | 'mint' | 'purchase' | 'sale' | 'transfer' | 'list' | 'offer';

export type ProfileTab = 'overview' | 'story' | 'activity' | 'collected' | 'created' | 'settings';

export interface ProfileStats {
  portfolioValue: number;
  totalSpent: number;
  totalSales: number;
  totalProfit: number;
  assetsOwned: number;
  assetsSold: number;
  avgPurchasePrice: number;
  avgSalePrice: number;
  mostExpensivePurchase: {
    assetName: string;
    price: number;
  };
  topCategory: string;
}
