import { AssetDetails, SimilarAsset } from '@/types/asset';
import { getMarketplaceAssetById } from '@/utils/mockMarketplaceData';
import { getDeterministicOwnedAssetDetailsById } from '@/utils/testWalletAssetFixtures';

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: string, salt: string = '0'): number {
  return (hashString(`${seed}:${salt}`) % 10000) / 10000;
}

function numericIdFromString(id: string): number {
  const raw = String(id || '');
  const direct = Number.parseInt(raw, 10);
  if (Number.isFinite(direct)) return direct;

  const match = raw.match(/(\d+)(?!.*\d)/);
  if (match) return Number.parseInt(match[1], 10);

  return hashString(raw) % 1000;
}

function parseEthAmount(value?: string): number {
  const parsed = Number.parseFloat(String(value || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function shortAddress(address: string): string {
  if (!address) return 'Unknown Seller';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function marketplaceAssetToDetails(id: string): AssetDetails | null {
  const listing = getMarketplaceAssetById(id);
  if (!listing) return null;

  const priceEth = parseEthAmount(listing.price);
  const baseTimestamp = listing.createdAt || Date.now();
  const sellerName = listing.seller.ensName || shortAddress(listing.seller.address);
  const rating = typeof listing.seller.reputation === 'number'
    ? Math.max(3, Math.min(5, listing.seller.reputation / 20))
    : 4;

  return {
    id: listing.id,
    tokenId: listing.tokenId,
    name: listing.name,
    description: listing.description || `${listing.name} marketplace listing`,
    category: listing.category,
    blockchain: listing.blockchain,

    currentPrice: listing.price,
    currentPriceUsd: listing.priceUSD || `$${(priceEth * 2500).toLocaleString()}`,
    floorPrice: `${Math.max(priceEth * 0.9, 0.01).toFixed(2)} ETH`,
    priceChange24h: (seededUnit(listing.id, 'change') * 20) - 10,

    image: listing.image,
    images: listing.images?.length ? listing.images : [listing.image],

    properties: [
      ...generateProperties(listing.category),
      { trait_type: 'Network', value: `${listing.blockchain} ${listing.network}` },
      { trait_type: 'Listing Type', value: 'Marketplace' },
    ],

    views: listing.views,
    favorites: listing.likes,
    totalVolume: `${(priceEth * (1 + seededUnit(listing.id, 'vol-mult') * 4)).toFixed(2)} ETH`,
    totalSales: Math.max(1, Math.round(seededUnit(listing.id, 'sales') * 8)),

    currentOwner: listing.seller.address,
    creator: listing.seller.address,
    ownerHistory: [
      {
        address: listing.seller.address,
        timestamp: listing.listedAt || baseTimestamp,
        price: listing.price,
        txHash: `0x${hashString(`${listing.id}:list`).toString(16).padStart(8, '0')}...`,
      },
    ],

    priceHistory: generatePriceHistory(priceEth.toString(), baseTimestamp, listing.id),

    contractAddress: listing.contractAddress,
    tokenStandard: 'ERC-721',
    mintDate: baseTimestamp,
    lastSale: listing.listedAt,

    verified: !!listing.verified,
    royalty: 2.5,
    externalUrl: `https://example.com/marketplace/${listing.id}`,
    ipfsUrl: `ipfs://mock-marketplace/${listing.id}`,
    seller: {
      name: sellerName,
      address: listing.seller.address,
    },
    rating,
  };
}

/**
 * Generate mock asset details for demo
 */
export function generateMockAsset(id: string): AssetDetails {
  // Phase C2 invariant: owned My Asset fixtures and marketplace listings must stay in separate namespaces.
  const ownedFixture = getDeterministicOwnedAssetDetailsById(id);
  if (ownedFixture) return ownedFixture;

  const marketplaceDetails = marketplaceAssetToDetails(id);
  if (marketplaceDetails) return marketplaceDetails;

  const assetTypes = [
    {
      name: 'Luxury Apartment #442',
      category: 'Real Estate',
      description: 'Premium luxury apartment located in downtown Manhattan, New York. This stunning 3-bedroom, 2-bathroom residence features floor-to-ceiling windows with breathtaking city views, high-end finishes, and modern smart home technology. The building offers world-class amenities including a fitness center, rooftop terrace, and 24/7 concierge service.',
      price: '2.5',
      priceUsd: '6,250,000',
      image: 'luxury apartment interior modern',
      location: 'Manhattan, NY',
    },
    {
      name: 'Vintage Wine Collection #88',
      category: 'Collectibles',
      description: 'Rare vintage wine collection featuring premium bottles from 1945-1985. Includes Château Lafite Rothschild, Romanée-Conti, and other prestigious labels. All bottles are professionally stored and authenticated with certificates of provenance.',
      price: '0.8',
      priceUsd: '2,000,000',
      image: 'vintage wine collection cellar',
      location: 'Paris',
    },
    {
      name: 'Classic Ferrari 250 GTO',
      category: 'Vehicles',
      description: '1962 Ferrari 250 GTO in pristine condition. One of only 36 ever made. Complete restoration by Ferrari Classiche, matching numbers, extensive documentation. This is one of the most valuable and sought-after classic cars in the world.',
      price: '18',
      priceUsd: '45,000,000',
      image: 'ferrari 250 gto red classic',
      location: 'Monaco',
    },
    {
      name: 'Commercial Building #15',
      category: 'Real Estate',
      description: 'Prime commercial property in San Francisco\'s financial district. 50,000 sq ft of Class A office space with modern infrastructure, fully leased to AAA-rated tenants. Excellent investment opportunity with strong cash flow.',
      price: '12',
      priceUsd: '30,000,000',
      image: 'modern commercial building downtown',
      location: 'San Francisco',
    },
    {
      name: 'Fine Art - "Urban Dreams"',
      category: 'Art',
      description: 'Contemporary masterpiece by renowned artist Maya Chen. Oil on canvas, 72" x 48". Featured in major galleries worldwide. Certificate of authenticity included. This piece captures the essence of modern urban life with vibrant colors and dynamic composition.',
      price: '0.4',
      priceUsd: '1,000,000',
      image: 'contemporary abstract art colorful',
      location: 'London',
    },
  ];

  const numericId = numericIdFromString(id);
  const asset = assetTypes[numericId % assetTypes.length];

  const baseTimestamp = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days ago
  const seed = String(id);
  const price = parseFloat(asset.price);

  return {
    id,
    tokenId: `${numericId + 1000}`,
    name: asset.name,
    description: asset.description,
    category: asset.category,
    blockchain: 'Ethereum',
    
    currentPrice: `${asset.price} ETH`,
    currentPriceUsd: `$${asset.priceUsd}`,
    floorPrice: `${(price * 0.85).toFixed(2)} ETH`,
    priceChange24h: (seededUnit(seed, 'priceChange24h') * 20 - 10),
    
    image: asset.image,
    images: [
      asset.image,
      asset.image + ' detail',
      asset.image + ' view',
      asset.image + ' closeup',
    ],
    
    properties: generateProperties(asset.category),
    
    views: Math.floor(seededUnit(seed, 'views') * 10000) + 1000,
    favorites: Math.floor(seededUnit(seed, 'favorites') * 500) + 50,
    totalVolume: `${(price * (2 + seededUnit(seed, 'volumeMult') * 3)).toFixed(2)} ETH`,
    totalSales: Math.floor(seededUnit(seed, 'sales') * 10) + 3,
    
    currentOwner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    creator: '0x8a90dE2E3b1c65c0c8b9A7D3F5E6C7D8E9F0A1B2',
    ownerHistory: generateOwnerHistory(asset.price, baseTimestamp),
    
    priceHistory: generatePriceHistory(asset.price, baseTimestamp),
    
    contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
    tokenStandard: 'ERC-721',
    mintDate: baseTimestamp,
    lastSale: baseTimestamp + 60 * 24 * 60 * 60 * 1000,
    
    verified: true,
    royalty: 2.5,
    externalUrl: 'https://example.com/asset/' + id,
    ipfsUrl: 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    
    // Location from asset definition
    location: asset.location,
    seller: {
      name: `Seller ${numericId % 10}`,
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    },
    rating: seededUnit(seed, 'rating') * 2 + 3,
  };
}

function generateProperties(category: string) {
  const commonProps = [
    { trait_type: 'Category', value: category, rarity: 45 },
    { trait_type: 'Verified', value: 'Yes', rarity: 15 },
    { trait_type: 'Blockchain', value: 'Ethereum', rarity: 30 },
  ];

  const categoryProps: Record<string, any[]> = {
    'Real Estate': [
      { trait_type: 'Location', value: 'Manhattan, NY', rarity: 12 },
      { trait_type: 'Size', value: '2,500 sq ft', rarity: 25 },
      { trait_type: 'Bedrooms', value: 3, rarity: 40 },
      { trait_type: 'Bathrooms', value: 2, rarity: 35 },
      { trait_type: 'Year Built', value: 2020, rarity: 18 },
    ],
    'Collectibles': [
      { trait_type: 'Year', value: '1945-1985', rarity: 8 },
      { trait_type: 'Bottles', value: 24, rarity: 15 },
      { trait_type: 'Condition', value: 'Pristine', rarity: 10 },
      { trait_type: 'Provenance', value: 'Certified', rarity: 12 },
    ],
    'Vehicles': [
      { trait_type: 'Make', value: 'Ferrari', rarity: 5 },
      { trait_type: 'Model', value: '250 GTO', rarity: 2 },
      { trait_type: 'Year', value: 1962, rarity: 3 },
      { trait_type: 'Mileage', value: '12,000 mi', rarity: 8 },
      { trait_type: 'Condition', value: 'Excellent', rarity: 15 },
    ],
    'Art': [
      { trait_type: 'Artist', value: 'Maya Chen', rarity: 20 },
      { trait_type: 'Medium', value: 'Oil on Canvas', rarity: 35 },
      { trait_type: 'Size', value: '72" x 48"', rarity: 25 },
      { trait_type: 'Year', value: 2023, rarity: 40 },
      { trait_type: 'Style', value: 'Contemporary', rarity: 30 },
    ],
  };

  return [...commonProps, ...(categoryProps[category] || [])];
}

function generateOwnerHistory(basePrice: string, startTime: number) {
  const price = parseFloat(basePrice);
  return [
    {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      timestamp: startTime + 60 * 24 * 60 * 60 * 1000,
      price: `${price.toFixed(2)} ETH`,
      txHash: '0xabc123...',
    },
    {
      address: '0x9876543210fedcba9876543210fedcba98765432',
      timestamp: startTime + 30 * 24 * 60 * 60 * 1000,
      price: `${(price * 0.9).toFixed(2)} ETH`,
      txHash: '0xdef456...',
    },
    {
      address: '0x8a90dE2E3b1c65c0c8b9A7D3F5E6C7D8E9F0A1B2',
      timestamp: startTime,
      price: 'Minted',
      txHash: '0x789xyz...',
    },
  ];
}

function generatePriceHistory(basePrice: string, startTime: number, seed: string = basePrice) {
  const price = parseFloat(basePrice);
  const ethToUsd = 2500; // Mock conversion rate
  
  const history = [];
  for (let i = 0; i < 90; i += 10) {
    const timestamp = startTime + i * 24 * 60 * 60 * 1000;
    const variance = 0.9 + seededUnit(seed, `priceHistory:${i}`) * 0.2; // 90-110% variance
    const currentPrice = price * variance;
    
    history.push({
      timestamp,
      price: currentPrice,
      priceUsd: currentPrice * ethToUsd,
      eventType: (i === 0
        ? 'mint'
        : (seededUnit(seed, `eventType:${i}`) > 0.7 ? 'sale' : 'transfer')) as any,
    });
  }
  
  return history;
}

/**
 * Generate similar assets
 */
export function generateSimilarAssets(currentAssetId: string, count: number = 4): SimilarAsset[] {
  const assets = [];
  const categories = ['Real Estate', 'Collectibles', 'Vehicles', 'Art', 'Luxury Goods'];
  const locations = ['Dubai', 'Singapore', 'Tokyo', 'London', 'Paris', 'New York', 'Monaco', 'Hong Kong'];
  const baseId = numericIdFromString(currentAssetId);
  
  for (let i = 0; i < count; i++) {
    const id = `${baseId + i + 1}`;
    const category = categories[i % categories.length];
    const price = (seededUnit(currentAssetId, `similarPrice:${i}`) * 5 + 0.5).toFixed(2);
    
    assets.push({
      id,
      name: `Premium ${category} #${id}`,
      image: `luxury ${category.toLowerCase()} premium`,
      price: `${price} ETH`,
      priceUsd: `$${(parseFloat(price) * 2500).toLocaleString()}`,
      category,
      location: locations[i % locations.length], // Add location
      verified: seededUnit(currentAssetId, `similarVerified:${i}`) > 0.3, // ~70% verified
    });
  }
  
  return assets;
}
