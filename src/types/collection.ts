export interface CollectionMembership {
  collectionId: string;
  assetId: string;
  addedByWallet: string;
  addedAt: number;
}

export type CollectionAssetSource = 'marketplace' | 'owned';

export interface CollectionAssetItem {
  id: string;
  name: string;
  category: string;
  image: string;
  price: string;
  ownerWallet: string;
  source: CollectionAssetSource;
  sourceLabel: string;
  blockchain?: string;
  status?: string;
}

export interface CollectionSummary {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  coverImage: string;
  ownerWallet: string;
  bio: string;
  tags: string[];
  itemIds: string[];
  itemCount: number;
  floorPrice: string;
  volume: string;
  followerCount: number;
  likedCount: number;
  verified: boolean;
  featured?: boolean;
  viewerFavorited?: boolean;
  viewerFollowing?: boolean;
  viewerOwner?: boolean;
  rankingVersion?: string;
  personalized?: boolean;
  reasonCodes?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface CollectionDetails extends CollectionSummary {
  assets: CollectionAssetItem[];
  memberships: CollectionMembership[];
}

export interface CollectionDraft {
  name: string;
  category: string;
  bio: string;
  tags: string[];
  coverImage: string;
  itemIds: string[];
}

export interface CollectionFavorite {
  collectionId: string;
  userId: string;
  addedAt: number;
}

export interface CollectionFollow {
  collectionId: string;
  userId: string;
  followedAt: number;
}
