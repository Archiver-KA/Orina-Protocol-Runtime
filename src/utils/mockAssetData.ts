import { AssetDetails, SimilarAsset } from '@/types/asset';

/**
 * Generate mock asset details for demo
 */
export function generateMockAsset(id: string): AssetDetails {
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

  const asset = assetTypes[parseInt(id) % assetTypes.length];

  const baseTimestamp = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days ago

  return {
    id,
    tokenId: `${parseInt(id) + 1000}`,
    name: asset.name,
    description: asset.description,
    category: asset.category,
    blockchain: 'Ethereum',
    
    currentPrice: `${asset.price} ETH`,
    currentPriceUsd: `$${asset.priceUsd}`,
    floorPrice: `${(parseFloat(asset.price) * 0.85).toFixed(2)} ETH`,
    priceChange24h: (Math.random() * 20 - 10), // Random -10% to +10%
    
    image: asset.image,
    images: [
      asset.image,
      asset.image + ' detail',
      asset.image + ' view',
      asset.image + ' closeup',
    ],
    
    properties: generateProperties(asset.category),
    
    views: Math.floor(Math.random() * 10000) + 1000,
    favorites: Math.floor(Math.random() * 500) + 50,
    totalVolume: `${(parseFloat(asset.price) * 3.5).toFixed(2)} ETH`,
    totalSales: Math.floor(Math.random() * 10) + 3,
    
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
      name: `Seller ${parseInt(id) % 10}`,
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    },
    rating: Math.random() * 2 + 3, // 3.0 to 5.0
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

function generatePriceHistory(basePrice: string, startTime: number) {
  const price = parseFloat(basePrice);
  const ethToUsd = 2500; // Mock conversion rate
  
  const history = [];
  for (let i = 0; i < 90; i += 10) {
    const timestamp = startTime + i * 24 * 60 * 60 * 1000;
    const variance = 0.9 + Math.random() * 0.2; // 90-110% variance
    const currentPrice = price * variance;
    
    history.push({
      timestamp,
      price: currentPrice,
      priceUsd: currentPrice * ethToUsd,
      eventType: (i === 0 ? 'mint' : (Math.random() > 0.7 ? 'sale' : 'transfer')) as any,
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
  
  for (let i = 0; i < count; i++) {
    const id = `${parseInt(currentAssetId) + i + 1}`;
    const category = categories[i % categories.length];
    const price = (Math.random() * 5 + 0.5).toFixed(2);
    
    assets.push({
      id,
      name: `Premium ${category} #${id}`,
      image: `luxury ${category.toLowerCase()} premium`,
      price: `${price} ETH`,
      priceUsd: `$${(parseFloat(price) * 2500).toLocaleString()}`,
      category,
      location: locations[i % locations.length], // Add location
      verified: Math.random() > 0.3, // 70% verified
    });
  }
  
  return assets;
}