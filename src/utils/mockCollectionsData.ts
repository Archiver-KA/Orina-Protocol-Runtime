import type { MarketplaceAsset } from '@/app/types/asset';
import type { CollectionAssetItem, CollectionDetails, CollectionMembership, CollectionSummary } from '@/types/collection';
import { MOCK_MARKETPLACE_ASSETS, getMarketplaceAssetById } from '@/utils/mockMarketplaceData';
import { TEST_WALLET_A, TEST_WALLET_B, getDeterministicOwnedAssetDetailsById } from '@/utils/testWalletAssetFixtures';

const daysAgo = (days: number) => Date.now() - days * 24 * 60 * 60 * 1000;

function parseEthAmount(value: string): number {
  const parsed = Number.parseFloat(String(value || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatEthAmount(value: number): string {
  return `${value.toFixed(value >= 10 ? 0 : 2).replace(/\.00$/, '')} ETH`;
}

type CollectionSeed = Omit<CollectionSummary, 'itemCount' | 'floorPrice' | 'volume'>;

const COLLECTION_SEEDS: CollectionSeed[] = [
  {
    id: 'collection-orina-genesis',
    slug: 'orina-genesis',
    name: 'Orina Genesis',
    category: 'Generative Art',
    description: 'Core genesis collection curated from the first public digital drops across the ORINA marketplace.',
    coverImage: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1200&auto=format&fit=crop',
    ownerWallet: TEST_WALLET_A,
    bio: 'A flagship generative art collection built from early ORINA releases and high-signal digital drops.',
    tags: ['genesis', 'digital', 'curated'],
    itemIds: ['asset-007', 'asset-008'],
    followerCount: 182,
    likedCount: 244,
    verified: true,
    featured: true,
    createdAt: daysAgo(38),
    updatedAt: daysAgo(2),
  },
  {
    id: 'collection-rwa-villas-s1',
    slug: 'rwa-villas-s1',
    name: 'RWA Villas S1',
    category: 'Real Estate',
    description: 'Fractional real-estate opportunities across premium APAC and GCC markets.',
    coverImage: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&auto=format&fit=crop',
    ownerWallet: TEST_WALLET_A,
    bio: 'Yield-oriented property allocation spanning beachfront villas, marina apartments, and urban lofts.',
    tags: ['rwa', 'property', 'yield'],
    itemIds: ['asset-001', 'asset-002', 'asset-003'],
    followerCount: 129,
    likedCount: 201,
    verified: true,
    featured: true,
    createdAt: daysAgo(31),
    updatedAt: daysAgo(4),
  },
  {
    id: 'collection-vaulted-collectibles',
    slug: 'vaulted-collectibles',
    name: 'Vaulted Collectibles',
    category: 'Collectibles',
    description: 'Rare signed, graded, and authenticated collectibles gathered for long-horizon collectors.',
    coverImage: 'https://images.unsplash.com/photo-1613771404738-65d22f979710?w=1200&auto=format&fit=crop',
    ownerWallet: TEST_WALLET_A,
    bio: 'Legacy collectibles and music memorabilia curated for scarcity, provenance, and resale strength.',
    tags: ['collectibles', 'rare', 'vault'],
    itemIds: ['asset-009', 'asset-010', 'asset-015'],
    followerCount: 94,
    likedCount: 148,
    verified: true,
    createdAt: daysAgo(26),
    updatedAt: daysAgo(5),
  },
  {
    id: 'collection-neon-synthetics',
    slug: 'neon-synthetics',
    name: 'Neon Synthetics',
    category: 'Digital Art',
    description: 'Cyber aesthetics, neon palettes, and synthetic worlds selected for high visual identity.',
    coverImage: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200&auto=format&fit=crop',
    ownerWallet: TEST_WALLET_B,
    bio: 'A digital-native collection focused on cyberpunk visual language, motion, and luminous abstract forms.',
    tags: ['neon', 'cyberpunk', 'synthetic'],
    itemIds: ['asset-007', 'asset-008'],
    followerCount: 143,
    likedCount: 197,
    verified: true,
    featured: true,
    createdAt: daysAgo(34),
    updatedAt: daysAgo(3),
  },
  {
    id: 'collection-jewel-vault',
    slug: 'jewel-vault',
    name: 'Jewel Vault',
    category: 'Luxury',
    description: 'High-value jewelry and watch pieces assembled into a premium luxury vault.',
    coverImage: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200&auto=format&fit=crop',
    ownerWallet: TEST_WALLET_B,
    bio: 'Luxury curation centered on timepieces, diamonds, and prestige items with verified provenance.',
    tags: ['luxury', 'watches', 'diamonds'],
    itemIds: ['asset-004', 'asset-005', 'asset-014'],
    followerCount: 111,
    likedCount: 167,
    verified: true,
    createdAt: daysAgo(28),
    updatedAt: daysAgo(1),
  },
  {
    id: 'collection-motion-garage',
    slug: 'motion-garage',
    name: 'Motion Garage',
    category: 'Luxury Vehicle',
    description: 'Performance vehicles and machine-grade mobility assets with strong enthusiast demand.',
    coverImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&auto=format&fit=crop',
    ownerWallet: TEST_WALLET_B,
    bio: 'Automotive curation for collectors who want premium mobility exposure and high-attention listings.',
    tags: ['vehicle', 'performance', 'garage'],
    itemIds: ['asset-011', 'asset-012'],
    followerCount: 78,
    likedCount: 126,
    verified: false,
    createdAt: daysAgo(22),
    updatedAt: daysAgo(6),
  },
];

function buildMemberships(seed: CollectionSeed): CollectionMembership[] {
  return seed.itemIds.map((assetId, index) => ({
    collectionId: seed.id,
    assetId,
    addedByWallet: seed.ownerWallet,
    addedAt: seed.createdAt + index * 60_000,
  }));
}

function toCollectionAssetItem(asset: MarketplaceAsset): CollectionAssetItem {
  return {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    image: asset.image,
    price: asset.price,
    ownerWallet: asset.seller.address,
    source: 'marketplace',
    sourceLabel: 'Marketplace Listing',
    blockchain: asset.blockchain,
  };
}

function resolveAssets(itemIds: string[]): CollectionAssetItem[] {
  return itemIds
    .map((assetId) => {
      const marketplaceAsset = getMarketplaceAssetById(assetId);
      if (marketplaceAsset) return toCollectionAssetItem(marketplaceAsset);

      const ownedAsset = getDeterministicOwnedAssetDetailsById(assetId);
      if (!ownedAsset) return null;

      return {
        id: ownedAsset.id,
        name: ownedAsset.name,
        category: ownedAsset.category,
        image: ownedAsset.image,
        price: ownedAsset.currentPrice,
        ownerWallet: ownedAsset.currentOwner,
        source: 'owned' as const,
        sourceLabel: 'Owned Asset',
        blockchain: ownedAsset.blockchain,
      };
    })
    .filter((asset): asset is CollectionAssetItem => Boolean(asset));
}

function buildSummary(seed: CollectionSeed): CollectionSummary {
  const assets = resolveAssets(seed.itemIds);
  const itemCount = assets.length;
  const floorPrice = assets.length > 0 ? Math.min(...assets.map((asset) => parseEthAmount(asset.price))) : 0;
  const volume = assets.reduce((sum, asset) => sum + parseEthAmount(asset.price), 0);

  return {
    ...seed,
    itemCount,
    floorPrice: formatEthAmount(floorPrice),
    volume: formatEthAmount(volume),
  };
}

export const MOCK_COLLECTIONS: CollectionSummary[] = COLLECTION_SEEDS.map(buildSummary);

export const MOCK_COLLECTION_DETAILS: CollectionDetails[] = COLLECTION_SEEDS.map((seed) => {
  const summary = buildSummary(seed);
  const assets = resolveAssets(seed.itemIds);
  return {
    ...summary,
    assets,
    memberships: buildMemberships(seed),
  };
});

export function getCollectionById(collectionId: string): CollectionDetails | undefined {
  return MOCK_COLLECTION_DETAILS.find((collection) => collection.id === collectionId);
}

export function getCollectionsByOwner(ownerWallet: string): CollectionSummary[] {
  const normalizedWallet = ownerWallet.toLowerCase();
  return MOCK_COLLECTIONS.filter((collection) => collection.ownerWallet.toLowerCase() === normalizedWallet);
}

export function getCollectionAssets(collectionId: string): CollectionAssetItem[] {
  return getCollectionById(collectionId)?.assets || [];
}

export function getCollectionsForAsset(assetId: string): CollectionSummary[] {
  return MOCK_COLLECTIONS.filter((collection) => collection.itemIds.includes(assetId));
}

export function searchMockCollections(query: string): CollectionSummary[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return MOCK_COLLECTIONS;

  return MOCK_COLLECTIONS.filter((collection) =>
    collection.name.toLowerCase().includes(normalizedQuery) ||
    collection.description.toLowerCase().includes(normalizedQuery) ||
    collection.category.toLowerCase().includes(normalizedQuery) ||
    collection.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
  );
}

export function getCollectionCategories(): string[] {
  return Array.from(new Set(MOCK_COLLECTIONS.map((collection) => collection.category))).sort();
}

export function getCollectionStatistics() {
  return {
    totalCollections: MOCK_COLLECTIONS.length,
    totalItems: MOCK_COLLECTIONS.reduce((sum, collection) => sum + collection.itemCount, 0),
    totalFollowers: MOCK_COLLECTIONS.reduce((sum, collection) => sum + collection.followerCount, 0),
    totalLikes: MOCK_COLLECTIONS.reduce((sum, collection) => sum + collection.likedCount, 0),
    totalVolumeEth: formatEthAmount(
      MOCK_COLLECTIONS.reduce((sum, collection) => sum + parseEthAmount(collection.volume), 0)
    ),
  };
}

export function getMarketplaceAssetsLinkedToCollections(): string[] {
  return Array.from(new Set(MOCK_COLLECTIONS.flatMap((collection) => collection.itemIds)));
}

export const ALL_RUNTIME_COLLECTION_ASSETS = MOCK_MARKETPLACE_ASSETS.filter((asset) =>
  getMarketplaceAssetsLinkedToCollections().includes(asset.id)
);
