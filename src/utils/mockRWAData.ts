/**
 * Shared RWA (Real World Assets) mock data
 * Used by both Marketplace and Search pages
 */

export interface RWAAsset {
  id: number;
  name: string;
  description: string;
  category: 'Real Estate' | 'Collectibles' | 'Vehicles' | 'Art' | 'Luxury Goods';
  price: string; // "2.5 ETH"
  priceNumeric: number; // 2.5
  priceUsd: string; // "$6,250"
  usdPrice: string; // Alias for ProductModal compatibility
  blockchain: 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base' | 'BSC';
  image: string; // Unsplash query
  verified: boolean;
  views: number;
  favorites: number;
  mintDate: number; // timestamp
  seller: {
    name: string;
    avatar: string;
    rating: string;
    memberSince: string;
    isCreator: boolean;
  };
  stock: string; // "5 available"
  // Geographic data for map view
  latitude: number;
  longitude: number;
  city: string;
}

// Helper to generate seller data
function generateSeller(index: number) {
  const sellers = [
    { name: 'RealEstate_Pro', rating: '4.9', memberSince: 'Member since Jan 2022' },
    { name: 'Luxury_Collector', rating: '4.8', memberSince: 'Member since Mar 2021' },
    { name: 'Premium_Assets', rating: '5.0', memberSince: 'Member since May 2021' },
    { name: 'Elite_Trader', rating: '4.7', memberSince: 'Member since Aug 2022' },
    { name: 'Asset_Master', rating: '4.9', memberSince: 'Member since Dec 2021' },
  ];
  
  const seller = sellers[index % sellers.length];
  return {
    ...seller,
    avatar: 'https://source.unsplash.com/100x100/?business,professional',
    isCreator: Math.random() > 0.5,
  };
}

// Helper to generate geographic coordinates
function generateLocation(index: number): { latitude: number; longitude: number; city: string } {
  const locations = [
    { latitude: 40.7128, longitude: -74.0060, city: 'New York' }, // NYC
    { latitude: 34.0522, longitude: -118.2437, city: 'Los Angeles' }, // LA
    { latitude: 51.5074, longitude: -0.1278, city: 'London' }, // London
    { latitude: 25.2048, longitude: 55.2708, city: 'Dubai' }, // Dubai
    { latitude: 48.8566, longitude: 2.3522, city: 'Paris' }, // Paris
    { latitude: 35.6762, longitude: 139.6503, city: 'Tokyo' }, // Tokyo
    { latitude: 37.7749, longitude: -122.4194, city: 'San Francisco' }, // SF
    { latitude: 1.3521, longitude: 103.8198, city: 'Singapore' }, // Singapore
  ];
  
  return locations[index % locations.length];
}

/**
 * Base RWA asset data
 */
const baseAssets = [
  // Real Estate
  { 
    name: 'Luxury Apartment #442', 
    desc: 'Premium luxury apartment in Manhattan with stunning city views', 
    category: 'Real Estate' as const, 
    price: 2.5, 
    image: 'luxury apartment modern interior',
    stock: '3 available'
  },
  { 
    name: 'Beach Villa #123', 
    desc: 'Oceanfront villa in Malibu with private beach access', 
    category: 'Real Estate' as const, 
    price: 5.8, 
    image: 'beach villa ocean sunset',
    stock: '1 available'
  },
  { 
    name: 'Commercial Building #15', 
    desc: 'Prime office space in San Francisco financial district', 
    category: 'Real Estate' as const, 
    price: 12, 
    image: 'modern commercial building downtown',
    stock: '8 available'
  },
  { 
    name: 'Penthouse Suite #77', 
    desc: 'Exclusive penthouse in Dubai with panoramic views', 
    category: 'Real Estate' as const, 
    price: 8.5, 
    image: 'penthouse luxury interior dubai',
    stock: '2 available'
  },
  { 
    name: 'Historic Mansion #91', 
    desc: 'Restored Victorian mansion in London', 
    category: 'Real Estate' as const, 
    price: 6.2, 
    image: 'victorian mansion historic london',
    stock: '1 available'
  },
  
  // Collectibles
  { 
    name: 'Vintage Wine Collection #88', 
    desc: 'Rare vintage wines from 1945-1985', 
    category: 'Collectibles' as const, 
    price: 0.8, 
    image: 'vintage wine collection cellar',
    stock: '12 available'
  },
  { 
    name: 'Rolex Watch Collection #45', 
    desc: 'Limited edition Rolex Daytona and Submariner', 
    category: 'Collectibles' as const, 
    price: 1.2, 
    image: 'luxury watches rolex collection',
    stock: '5 available'
  },
  { 
    name: 'Rare Coin Set #234', 
    desc: 'Ancient Roman coins certified by PCGS', 
    category: 'Collectibles' as const, 
    price: 0.3, 
    image: 'ancient coins gold collection',
    stock: '20 available'
  },
  { 
    name: 'Baseball Card Collection #56', 
    desc: 'Mickey Mantle and Babe Ruth rookie cards', 
    category: 'Collectibles' as const, 
    price: 0.6, 
    image: 'vintage baseball cards collection',
    stock: '3 available'
  },
  { 
    name: 'Comic Book Collection #99', 
    desc: 'First edition Marvel and DC comics', 
    category: 'Collectibles' as const, 
    price: 0.4, 
    image: 'vintage comic books collection',
    stock: '15 available'
  },
  
  // Vehicles
  { 
    name: 'Classic Ferrari 250 GTO', 
    desc: '1962 Ferrari 250 GTO in pristine condition', 
    category: 'Vehicles' as const, 
    price: 18, 
    image: 'ferrari 250 gto red classic',
    stock: '1 available'
  },
  { 
    name: 'Lamborghini Aventador SVJ', 
    desc: '2020 Aventador SVJ with custom paint', 
    category: 'Vehicles' as const, 
    price: 2.5, 
    image: 'lamborghini aventador supercar',
    stock: '2 available'
  },
  { 
    name: 'Porsche 911 GT3 RS', 
    desc: '2022 GT3 RS track-ready configuration', 
    category: 'Vehicles' as const, 
    price: 1.8, 
    image: 'porsche 911 gt3 racing',
    stock: '4 available'
  },
  { 
    name: 'Rolls Royce Phantom', 
    desc: '2023 Phantom with extended wheelbase', 
    category: 'Vehicles' as const, 
    price: 2.2, 
    image: 'rolls royce phantom luxury',
    stock: '3 available'
  },
  { 
    name: 'Tesla Roadster Founder Series', 
    desc: 'Original Tesla Roadster collector edition', 
    category: 'Vehicles' as const, 
    price: 0.5, 
    image: 'tesla roadster electric sports',
    stock: '6 available'
  },
  
  // Art
  { 
    name: 'Fine Art - "Urban Dreams"', 
    desc: 'Contemporary masterpiece by Maya Chen', 
    category: 'Art' as const, 
    price: 0.4, 
    image: 'contemporary abstract art colorful',
    stock: '1 available'
  },
  { 
    name: 'Sculpture - "Eternal Balance"', 
    desc: 'Bronze sculpture by renowned artist', 
    category: 'Art' as const, 
    price: 0.7, 
    image: 'bronze sculpture modern art',
    stock: '1 available'
  },
  { 
    name: 'Photography - "Desert Sunset"', 
    desc: 'Limited edition fine art photography', 
    category: 'Art' as const, 
    price: 0.15, 
    image: 'desert landscape sunset photography',
    stock: '10 available'
  },
  { 
    name: 'Oil Painting - "Ocean Waves"', 
    desc: 'Impressionist ocean scene on canvas', 
    category: 'Art' as const, 
    price: 0.3, 
    image: 'ocean waves oil painting',
    stock: '1 available'
  },
  { 
    name: 'Digital Art - "Neon City"', 
    desc: 'NFT digital artwork with physical display', 
    category: 'Art' as const, 
    price: 0.25, 
    image: 'neon city digital art cyberpunk',
    stock: '5 available'
  },
  
  // Luxury Goods
  { 
    name: 'Diamond Necklace #888', 
    desc: 'Cartier diamond necklace with certificate', 
    category: 'Luxury Goods' as const, 
    price: 3.5, 
    image: 'diamond necklace luxury jewelry',
    stock: '1 available'
  },
  { 
    name: 'Hermès Birkin Bag', 
    desc: 'Rare Himalayan Birkin with diamond hardware', 
    category: 'Luxury Goods' as const, 
    price: 1.5, 
    image: 'hermes birkin luxury handbag',
    stock: '2 available'
  },
  { 
    name: 'Patek Philippe Watch', 
    desc: 'Patek Philippe Nautilus platinum edition', 
    category: 'Luxury Goods' as const, 
    price: 2.8, 
    image: 'patek philippe luxury watch',
    stock: '1 available'
  },
  { 
    name: 'Louis Vuitton Trunk', 
    desc: 'Vintage Louis Vuitton steamer trunk', 
    category: 'Luxury Goods' as const, 
    price: 0.6, 
    image: 'louis vuitton vintage trunk',
    stock: '4 available'
  },
  { 
    name: 'Fabergé Egg Replica', 
    desc: 'Hand-crafted Fabergé egg with gemstones', 
    category: 'Luxury Goods' as const, 
    price: 0.9, 
    image: 'faberge egg luxury collectible',
    stock: '3 available'
  },
];

/**
 * Generate complete RWA asset data with all fields
 */
export function generateRWAAssets(): RWAAsset[] {
  const blockchains: Array<'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base' | 'BSC'> = ['BSC', 'Ethereum', 'Polygon', 'Arbitrum', 'Base'];
  
  return baseAssets.map((asset, index) => {
    const id = index + 1;
    const priceNumeric = asset.price;
    const priceUsd = `$${(priceNumeric * 2500).toLocaleString()}`;
    const usdPrice = priceUsd; // Alias for ProductModal compatibility
    const blockchain = blockchains[index % blockchains.length];
    const verified = Math.random() > 0.3; // 70% verified
    const views = Math.floor(Math.random() * 10000) + 500;
    const favorites = Math.floor(Math.random() * 500) + 20;
    const mintDate = Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000;
    const location = generateLocation(index);
    
    return {
      id,
      name: asset.name,
      description: asset.desc,
      category: asset.category,
      price: `${priceNumeric} ETH`,
      priceNumeric,
      priceUsd,
      usdPrice,
      blockchain,
      image: asset.image,
      verified,
      views,
      favorites,
      mintDate,
      seller: generateSeller(index),
      stock: asset.stock,
      latitude: location.latitude,
      longitude: location.longitude,
      city: location.city,
    };
  });
}

/**
 * Get single RWA asset by ID
 */
export function getRWAAssetById(id: number): RWAAsset | undefined {
  const assets = generateRWAAssets();
  return assets.find(asset => asset.id === id);
}

/**
 * Filter RWA assets by category
 */
export function filterRWAByCategory(category: string): RWAAsset[] {
  const assets = generateRWAAssets();
  if (!category) return assets;
  return assets.filter(asset => asset.category === category);
}

/**
 * Filter RWA assets by price range
 */
export function filterRWAByPriceRange(minPrice: number, maxPrice: number): RWAAsset[] {
  const assets = generateRWAAssets();
  return assets.filter(asset => asset.priceNumeric >= minPrice && asset.priceNumeric <= maxPrice);
}

/**
 * Search RWA assets by query
 */
export function searchRWAAssets(query: string): RWAAsset[] {
  const assets = generateRWAAssets();
  if (!query) return assets;
  
  const lowerQuery = query.toLowerCase();
  return assets.filter(asset => 
    asset.name.toLowerCase().includes(lowerQuery) ||
    asset.description.toLowerCase().includes(lowerQuery) ||
    asset.category.toLowerCase().includes(lowerQuery)
  );
}