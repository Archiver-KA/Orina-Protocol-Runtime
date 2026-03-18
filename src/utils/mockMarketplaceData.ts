/**
 * MOCK MARKETPLACE DATA - MarketplaceATP Protocol v3.3-freeze
 * ==========================================================
 * 
 * Mock data cho Marketplace Assets (public - đang bán)
 * Sử dụng trong Search page, Marketplace page, Browse Assets
 */

import { MarketplaceAsset } from '@/app/types/asset';

// Helper to generate timestamps
const daysAgo = (days: number) => Date.now() - (days * 24 * 60 * 60 * 1000);
const daysFromNow = (days: number) => Date.now() + (days * 24 * 60 * 60 * 1000);

// Helper to format listing duration
const formatDuration = (expiresAt: number) => {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${days}d ${hours}h ${minutes}m`;
};

function createAssetLocationSnapshot({
  displayAddress,
  countryCode,
  countryNameSnapshot,
  geoPath,
  lat,
  lng,
}: {
  displayAddress: string;
  countryCode: string;
  countryNameSnapshot: string;
  geoPath: Array<{
    placeId: string;
    kind: string;
    name: string;
    label: string;
  }>;
  lat: number;
  lng: number;
}) {
  return {
    sourceMode: 'other' as const,
    displayAddress,
    countryCode,
    countryNameSnapshot,
    geoPath,
    leafPlaceId: geoPath[geoPath.length - 1]?.placeId,
    coordinates: { lat, lng },
    precision: (geoPath[geoPath.length - 1]?.kind || 'unstructured') as
      | 'country'
      | 'admin1'
      | 'admin2'
      | 'admin3'
      | 'admin4'
      | 'admin5'
      | 'locality'
      | 'sublocality'
      | 'unstructured',
    capturedAt: Date.now(),
  };
}

export const MOCK_MARKETPLACE_ASSETS: MarketplaceAsset[] = [
  // ============================================================================
  // REAL ESTATE CATEGORY
  // ============================================================================
  {
    id: 'asset-001',
    tokenId: '4521',
    contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
    
    name: 'Beach Villa Phuket #123',
    category: 'Real Estate',
    description: 'Luxury beachfront villa with stunning ocean view in Phuket, Thailand. Prime location near Patong Beach.',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    ],
    
    seller: {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
      ensName: 'luxuryreserve.eth',
      verified: true,
      reputation: 98
    },
    
    price: '5.8 ETH',
    priceUSD: '$12,450',
    currency: 'ETH',
    
    availableSlots: 45,
    totalSlots: 100,
    minPurchaseSlots: 1,
    maxPurchaseSlots: 10,
    
    listedAt: daysAgo(3),
    expiresAt: daysFromNow(7),
    listingDuration: '7d 0h 0m',
    
    views: 1234,
    likes: 456,
    rank: 10,
    
    verified: true,
    featured: true,
    tags: ['luxury', 'beachfront', 'investment', 'thailand'],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: 'Patong Beach, Kathu District, Phuket 83150, Thailand',
      countryCode: 'TH',
      countryNameSnapshot: 'Thailand',
      geoPath: [
        { placeId: 'th-phuket', kind: 'admin1', name: 'Phuket', label: 'Province / City' },
        { placeId: 'th-kathu', kind: 'admin2', name: 'Kathu District', label: 'District' },
        { placeId: 'th-patong', kind: 'locality', name: 'Patong Beach', label: 'Ward / Locality' },
      ],
      lat: 7.8963,
      lng: 98.2966,
    }),
    
    blockchain: 'BSC',
    network: 'testnet',
    
    createdAt: daysAgo(30),
    updatedAt: Date.now()
  },

  {
    id: 'asset-002',
    tokenId: '4522',
    contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
    
    name: 'Dubai Marina Apartment #442',
    category: 'Real Estate',
    description: 'Modern 2-bedroom apartment in Dubai Marina with city skyline view. Fully furnished.',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    
    seller: {
      address: '0x8B3a8C9f2D4E6F7a1B2C3D4E5F6a7B8C9D0E1F2',
      ensName: 'dubai.properties',
      verified: true,
      reputation: 95
    },
    
    price: '12.5 ETH',
    priceUSD: '$26,850',
    currency: 'ETH',
    
    availableSlots: 78,
    totalSlots: 100,
    minPurchaseSlots: 5,
    maxPurchaseSlots: 20,
    
    listedAt: daysAgo(5),
    expiresAt: daysFromNow(10),
    listingDuration: '10d 0h 0m',
    
    views: 2341,
    likes: 892,
    rank: 5,
    
    verified: true,
    featured: true,
    tags: ['luxury', 'dubai', 'apartment', 'investment'],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: 'Dubai Marina, Dubai, United Arab Emirates',
      countryCode: 'AE',
      countryNameSnapshot: 'United Arab Emirates',
      geoPath: [
        { placeId: 'ae-dubai', kind: 'admin1', name: 'Dubai', label: 'Province / City' },
        { placeId: 'ae-dubai-marina', kind: 'locality', name: 'Dubai Marina', label: 'Ward / Locality' },
      ],
      lat: 25.0800,
      lng: 55.1403,
    }),
    
    blockchain: 'Ethereum',
    network: 'mainnet',
    
    createdAt: daysAgo(45),
    updatedAt: Date.now()
  },

  {
    id: 'asset-003',
    tokenId: '4523',
    contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
    
    name: 'Tokyo Shibuya Loft #88',
    category: 'Real Estate',
    description: 'Contemporary loft in the heart of Shibuya, Tokyo. Walking distance to Shibuya Crossing.',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
    
    seller: {
      address: '0x9C4E5F6a7B8C9D0E1F2a3B4C5D6E7F8a9B0C1D2',
      verified: false,
      reputation: 72
    },
    
    price: '8.2 ETH',
    priceUSD: '$17,610',
    currency: 'ETH',
    
    availableSlots: 22,
    totalSlots: 50,
    minPurchaseSlots: 1,
    maxPurchaseSlots: 5,
    
    listedAt: daysAgo(1),
    expiresAt: daysFromNow(14),
    listingDuration: '14d 0h 0m',
    
    views: 987,
    likes: 234,
    rank: 15,
    
    verified: false,
    featured: false,
    tags: ['tokyo', 'loft', 'urban', 'japan'],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: 'Shibuya, Tokyo 150-0002, Japan',
      countryCode: 'JP',
      countryNameSnapshot: 'Japan',
      geoPath: [
        { placeId: 'jp-tokyo', kind: 'admin1', name: 'Tokyo', label: 'Province / City' },
        { placeId: 'jp-shibuya', kind: 'locality', name: 'Shibuya', label: 'Ward / Locality' },
      ],
      lat: 35.6595,
      lng: 139.7005,
    }),
    
    blockchain: 'Ethereum',
    network: 'mainnet',
    
    createdAt: daysAgo(15),
    updatedAt: Date.now()
  },

  // ============================================================================
  // LUXURY WATCH CATEGORY
  // ============================================================================
  {
    id: 'asset-004',
    tokenId: '8901',
    contractAddress: '0xA1B2C3D4E5F6a7B8C9D0E1F2a3B4C5D6E7F8a9B',
    
    name: 'Rolex Submariner Date 126610LN',
    category: 'Luxury Watch',
    description: 'Brand new Rolex Submariner Date with black dial and ceramic bezel. 41mm case, box and papers included.',
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800',
    
    seller: {
      address: '0xF1E2D3C4B5A6978869504132230241',
      ensName: 'luxurywatches.eth',
      verified: true,
      reputation: 99
    },
    
    price: '3.2 ETH',
    priceUSD: '$6,880',
    currency: 'ETH',
    
    availableSlots: 8,
    totalSlots: 10,
    minPurchaseSlots: 1,
    maxPurchaseSlots: 3,
    
    listedAt: daysAgo(2),
    expiresAt: daysFromNow(5),
    listingDuration: '5d 0h 0m',
    
    views: 3456,
    likes: 1203,
    rank: 2,
    
    verified: true,
    featured: true,
    tags: ['rolex', 'luxury', 'watch', 'collectible'],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: 'Rue du Rhone, Geneva 1204, Switzerland',
      countryCode: 'CH',
      countryNameSnapshot: 'Switzerland',
      geoPath: [
        { placeId: 'ch-geneva', kind: 'admin1', name: 'Geneva', label: 'Province / City' },
        { placeId: 'ch-rue-rhone', kind: 'locality', name: 'Rue du Rhone', label: 'Ward / Locality' },
      ],
      lat: 46.2044,
      lng: 6.1432,
    }),
    
    blockchain: 'Ethereum',
    network: 'mainnet',
    
    createdAt: daysAgo(20),
    updatedAt: Date.now()
  },

  {
    id: 'asset-005',
    tokenId: '8902',
    contractAddress: '0xA1B2C3D4E5F6a7B8C9D0E1F2a3B4C5D6E7F8a9B',
    
    name: 'Patek Philippe Nautilus 5711/1A',
    category: 'Luxury Watch',
    description: 'Rare Patek Philippe Nautilus 5711/1A steel with blue dial. One of the most sought-after watches.',
    image: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800',
    
    seller: {
      address: '0xF1E2D3C4B5A6978869504132230241',
      ensName: 'luxurywatches.eth',
      verified: true,
      reputation: 99
    },
    
    price: '45.0 ETH',
    priceUSD: '$96,750',
    currency: 'ETH',
    
    availableSlots: 2,
    totalSlots: 5,
    minPurchaseSlots: 1,
    maxPurchaseSlots: 1,
    
    listedAt: daysAgo(7),
    expiresAt: daysFromNow(3),
    listingDuration: '3d 0h 0m',
    
    views: 5678,
    likes: 2341,
    rank: 1,
    
    verified: true,
    featured: true,
    tags: ['patek', 'nautilus', 'rare', 'investment'],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: 'Plan-les-Ouates, Geneva, Switzerland',
      countryCode: 'CH',
      countryNameSnapshot: 'Switzerland',
      geoPath: [
        { placeId: 'ch-geneva', kind: 'admin1', name: 'Geneva', label: 'Province / City' },
        { placeId: 'ch-plan-les-ouates', kind: 'locality', name: 'Plan-les-Ouates', label: 'Ward / Locality' },
      ],
      lat: 46.1674,
      lng: 6.1166,
    }),
    
    blockchain: 'Ethereum',
    network: 'mainnet',
    
    createdAt: daysAgo(60),
    updatedAt: Date.now()
  },

  {
    id: 'asset-006',
    tokenId: '8903',
    contractAddress: '0xA1B2C3D4E5F6a7B8C9D0E1F2a3B4C5D6E7F8a9B',
    
    name: 'Omega Speedmaster Professional',
    category: 'Luxury Watch',
    description: 'Iconic Omega Speedmaster "Moonwatch" - The first watch worn on the moon. Manual wind, hesalite crystal.',
    image: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=800',
    
    seller: {
      address: '0x1A2B3C4D5E6F7a8B9C0D1E2F3a4B5C6D7E8F9a0',
      verified: false,
      reputation: 85
    },
    
    price: '1.8 ETH',
    priceUSD: '$3,870',
    currency: 'ETH',
    
    availableSlots: 15,
    totalSlots: 20,
    minPurchaseSlots: 1,
    maxPurchaseSlots: 5,
    
    listedAt: daysAgo(4),
    expiresAt: daysFromNow(11),
    listingDuration: '11d 0h 0m',
    
    views: 1892,
    likes: 567,
    rank: 8,
    
    verified: false,
    featured: false,
    tags: ['omega', 'speedmaster', 'moonwatch', 'classic'],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: 'Biel/Bienne, Bern, Switzerland',
      countryCode: 'CH',
      countryNameSnapshot: 'Switzerland',
      geoPath: [
        { placeId: 'ch-bern', kind: 'admin1', name: 'Bern', label: 'Province / City' },
        { placeId: 'ch-biel', kind: 'locality', name: 'Biel/Bienne', label: 'Ward / Locality' },
      ],
      lat: 47.1367,
      lng: 7.2468,
    }),
    
    blockchain: 'Polygon',
    network: 'mainnet',
    
    createdAt: daysAgo(25),
    updatedAt: Date.now()
  },

  // ============================================================================
  // ART CATEGORY
  // ============================================================================
  {
    id: 'asset-007',
    tokenId: '7701',
    contractAddress: '0xD9E8F7a6B5C4d3E2F1a0B9C8D7E6F5a4B3C2D1E',
    
    name: 'Abstract Neon Dreams #42',
    category: 'Digital Art',
    description: 'Vibrant abstract digital artwork with neon color palette. 4K resolution, unique 1/1 piece.',
    image: 'https://images.unsplash.com/photo-1768936918008-4661573f8c78?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMG5lb24lMjBhcnQlMjBjb2xvcmZ1bHxlbnwxfHx8fDE3NzA0OTMyNjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    
    seller: {
      address: '0xE1F2a3B4C5D6E7F8a9B0C1D2E3F4a5B6C7D8E9F',
      ensName: 'neonartist.eth',
      verified: true,
      reputation: 92
    },
    
    price: '0.85 ETH',
    priceUSD: '$1,828',
    currency: 'ETH',
    
    listedAt: daysAgo(6),
    expiresAt: daysFromNow(9),
    listingDuration: '9d 0h 0m',
    
    views: 789,
    likes: 345,
    rank: 12,
    
    verified: true,
    featured: false,
    tags: ['art', 'abstract', 'neon', 'digital'],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: 'Kreuzberg, Berlin 10997, Germany',
      countryCode: 'DE',
      countryNameSnapshot: 'Germany',
      geoPath: [
        { placeId: 'de-berlin', kind: 'admin1', name: 'Berlin', label: 'Province / City' },
        { placeId: 'de-kreuzberg', kind: 'locality', name: 'Kreuzberg', label: 'Ward / Locality' },
      ],
      lat: 52.4986,
      lng: 13.4034,
    }),
    
    blockchain: 'Ethereum',
    network: 'mainnet',
    
    createdAt: daysAgo(40),
    updatedAt: Date.now()
  },

  {
    id: 'asset-008',
    tokenId: '7702',
    contractAddress: '0xD9E8F7a6B5C4d3E2F1a0B9C8D7E6F5a4B3C2D1E',
    
    name: 'Urban Landscape Series #8',
    category: 'Digital Art',
    description: 'Photorealistic urban landscape from cyberpunk Tokyo. Limited edition 1/25.',
    image: 'https://images.unsplash.com/photo-1596650990361-213a3c0840ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1cmJhbiUyMGxhbmRzY2FwZSUyMGN5YmVycHVuayUyMGNpdHl8ZW58MXx8fHwxNzcwNDkzMjYyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    
    seller: {
      address: '0x2B3C4D5E6F7a8B9C0D1E2F3a4B5C6D7E8F9a0B1',
      ensName: 'urbanart.eth',
      verified: true,
      reputation: 88
    },
    
    price: '0.45 ETH',
    priceUSD: '$967',
    currency: 'ETH',
    
    availableSlots: 12,
    totalSlots: 25,
    minPurchaseSlots: 1,
    maxPurchaseSlots: 5,
    
    listedAt: daysAgo(8),
    expiresAt: daysFromNow(7),
    listingDuration: '7d 0h 0m',
    
    views: 1456,
    likes: 678,
    rank: 7,
    
    verified: true,
    featured: false,
    tags: ['art', 'urban', 'cyberpunk', 'limited'],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: 'Shinjuku City, Tokyo 160-0022, Japan',
      countryCode: 'JP',
      countryNameSnapshot: 'Japan',
      geoPath: [
        { placeId: 'jp-tokyo', kind: 'admin1', name: 'Tokyo', label: 'Province / City' },
        { placeId: 'jp-shinjuku', kind: 'locality', name: 'Shinjuku City', label: 'Ward / Locality' },
      ],
      lat: 35.6938,
      lng: 139.7034,
    }),
    
    blockchain: 'Arbitrum',
    network: 'mainnet',
    
    createdAt: daysAgo(50),
    updatedAt: Date.now()
  },

  // ============================================================================
  // COLLECTIBLES CATEGORY
  // ============================================================================
  {
    id: 'asset-009',
    tokenId: '5501',
    contractAddress: '0xC8D7E6F5a4B3C2D1E0F9a8B7C6D5E4F3a2B1C0D',
    
    name: 'Rare Pokémon Card - Charizard 1st Edition',
    category: 'Collectibles',
    description: 'PSA 9 Mint 1st Edition Base Set Charizard. One of the most valuable Pokémon cards.',
    image: 'https://images.unsplash.com/photo-1613771404738-65d22f979710?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb2tlbW9uJTIwY2hhcml6YXJkJTIwY2FyZCUyMGNvbGxlY3RpYmxlfGVufDF8fHx8MTc3MDQ5MzI2Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    
    seller: {
      address: '0x3C4D5E6F7a8B9C0D1E2F3a4B5C6D7E8F9a0B1C2',
      ensName: 'cardcollector.eth',
      verified: true,
      reputation: 96
    },
    
    price: '28.5 ETH',
    priceUSD: '$61,245',
    currency: 'ETH',
    
    availableSlots: 3,
    totalSlots: 10,
    minPurchaseSlots: 1,
    maxPurchaseSlots: 2,
    
    listedAt: daysAgo(10),
    expiresAt: daysFromNow(5),
    listingDuration: '5d 0h 0m',
    
    views: 4321,
    likes: 1876,
    rank: 3,
    
    verified: true,
    featured: true,
    tags: ['pokemon', 'collectible', 'rare', 'psa'],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: 'Beverly Hills, California 90210, United States',
      countryCode: 'US',
      countryNameSnapshot: 'United States',
      geoPath: [
        { placeId: 'us-california', kind: 'admin1', name: 'California', label: 'Province / City' },
        { placeId: 'us-beverly-hills', kind: 'locality', name: 'Beverly Hills', label: 'Ward / Locality' },
      ],
      lat: 34.0736,
      lng: -118.4004,
    }),
    
    blockchain: 'Ethereum',
    network: 'mainnet',
    
    createdAt: daysAgo(70),
    updatedAt: Date.now()
  },

  {
    id: 'asset-010',
    tokenId: '5502',
    contractAddress: '0xC8D7E6F5a4B3C2D1E0F9a8B7C6D5E4F3a2B1C0D',
    
    name: 'Vintage Nike Air Jordan 1 Chicago 1985',
    category: 'Collectibles',
    description: 'Original 1985 Air Jordan 1 Chicago in excellent condition. Size US 10. Authenticated.',
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800',
    
    seller: {
      address: '0x4D5E6F7a8B9C0D1E2F3a4B5C6D7E8F9a0B1C2D3',
      ensName: 'sneakerhead.eth',
      verified: true,
      reputation: 94
    },
    
    price: '6.5 ETH',
    priceUSD: '$13,975',
    currency: 'ETH',
    
    availableSlots: 5,
    totalSlots: 10,
    minPurchaseSlots: 1,
    maxPurchaseSlots: 3,
    
    listedAt: daysAgo(2),
    expiresAt: daysFromNow(8),
    listingDuration: '8d 0h 0m',
    
    views: 2789,
    likes: 1034,
    rank: 6,
    
    verified: true,
    featured: true,
    tags: ['sneakers', 'jordan', 'vintage', 'nike'],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: 'Chicago, Illinois 60607, United States',
      countryCode: 'US',
      countryNameSnapshot: 'United States',
      geoPath: [
        { placeId: 'us-illinois', kind: 'admin1', name: 'Illinois', label: 'Province / City' },
        { placeId: 'us-chicago', kind: 'locality', name: 'Chicago', label: 'Ward / Locality' },
      ],
      lat: 41.8781,
      lng: -87.6298,
    }),
    
    blockchain: 'Ethereum',
    network: 'mainnet',
    
    createdAt: daysAgo(35),
    updatedAt: Date.now()
  },

  // ============================================================================
  // VEHICLE CATEGORY
  // ============================================================================
  {
    id: 'asset-011',
    tokenId: '6601',
    contractAddress: '0xB7C6D5E4F3a2B1C0D9E8F7a6B5C4d3E2F1a0B9C',
    
    name: '2020 Lamborghini Huracán EVO',
    category: 'Luxury Vehicle',
    description: 'Low mileage Lamborghini Huracán EVO in Verde Mantis green. Full service history, single owner.',
    image: 'https://images.unsplash.com/photo-1621135802920-133df287f89c?w=800',
    
    seller: {
      address: '0x5E6F7a8B9C0D1E2F3a4B5C6D7E8F9a0B1C2D3E4',
      ensName: 'supercars.eth',
      verified: true,
      reputation: 97
    },
    
    price: '95.0 ETH',
    priceUSD: '$204,250',
    currency: 'ETH',
    
    availableSlots: 38,
    totalSlots: 50,
    minPurchaseSlots: 5,
    maxPurchaseSlots: 10,
    
    listedAt: daysAgo(12),
    expiresAt: daysFromNow(18),
    listingDuration: '18d 0h 0m',
    
    views: 6789,
    likes: 2567,
    rank: 4,
    
    verified: true,
    featured: true,
    tags: ['lamborghini', 'supercar', 'luxury', 'vehicle'],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: "Sant'Agata Bolognese, Emilia-Romagna, Italy",
      countryCode: 'IT',
      countryNameSnapshot: 'Italy',
      geoPath: [
        { placeId: 'it-emilia-romagna', kind: 'admin1', name: 'Emilia-Romagna', label: 'Province / City' },
        { placeId: 'it-santagata', kind: 'locality', name: "Sant'Agata Bolognese", label: 'Ward / Locality' },
      ],
      lat: 44.6645,
      lng: 11.1345,
    }),
    
    blockchain: 'Ethereum',
    network: 'mainnet',
    
    createdAt: daysAgo(80),
    updatedAt: Date.now()
  },

  {
    id: 'asset-012',
    tokenId: '6602',
    contractAddress: '0xB7C6D5E4F3a2B1C0D9E8F7a6B5C4d3E2F1a0B9C',
    
    name: '2022 Tesla Model S Plaid',
    category: 'Luxury Vehicle',
    description: 'Top spec Tesla Model S Plaid with full self-driving capability. Pearl white multi-coat.',
    image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800',
    
    seller: {
      address: '0x6F7a8B9C0D1E2F3a4B5C6D7E8F9a0B1C2D3E4F5',
      verified: false,
      reputation: 78
    },
    
    price: '22.0 ETH',
    priceUSD: '$47,300',
    currency: 'ETH',
    
    availableSlots: 18,
    totalSlots: 25,
    minPurchaseSlots: 2,
    maxPurchaseSlots: 5,
    
    listedAt: daysAgo(5),
    expiresAt: daysFromNow(10),
    listingDuration: '10d 0h 0m',
    
    views: 3421,
    likes: 987,
    rank: 9,
    
    verified: false,
    featured: false,
    tags: ['tesla', 'electric', 'luxury', 'tech'],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: 'Palo Alto, California 94301, United States',
      countryCode: 'US',
      countryNameSnapshot: 'United States',
      geoPath: [
        { placeId: 'us-california', kind: 'admin1', name: 'California', label: 'Province / City' },
        { placeId: 'us-palo-alto', kind: 'locality', name: 'Palo Alto', label: 'Ward / Locality' },
      ],
      lat: 37.4419,
      lng: -122.1430,
    }),
    
    blockchain: 'Polygon',
    network: 'mainnet',
    
    createdAt: daysAgo(42),
    updatedAt: Date.now()
  },

  // ============================================================================
  // WINE & SPIRITS CATEGORY
  // ============================================================================
  {
    id: 'asset-013',
    tokenId: '9901',
    contractAddress: '0xA6B5C4d3E2F1a0B9C8D7E6F5a4B3C2D1E0F9a8B',
    
    name: 'Château Lafite Rothschild 1982',
    category: 'Wine & Spirits',
    description: 'Legendary 1982 Bordeaux from Château Lafite Rothschild. Perfect provenance, stored in optimal conditions.',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800',
    
    seller: {
      address: '0x7a8B9C0D1E2F3a4B5C6D7E8F9a0B1C2D3E4F5a6',
      ensName: 'winecollector.eth',
      verified: true,
      reputation: 93
    },
    
    price: '4.2 ETH',
    priceUSD: '$9,030',
    currency: 'ETH',
    
    availableSlots: 6,
    totalSlots: 12,
    minPurchaseSlots: 1,
    maxPurchaseSlots: 3,
    
    listedAt: daysAgo(14),
    expiresAt: daysFromNow(6),
    listingDuration: '6d 0h 0m',
    
    views: 1678,
    likes: 542,
    rank: 11,
    
    verified: true,
    featured: true,
    tags: ['wine', 'bordeaux', 'vintage', 'investment'],
    configurableAttributes: [
      {
        id: 'bottle-format',
        label: 'Bottle Format',
        helpText: 'Choose the physical bottle format for settlement and delivery.',
        required: true,
        selectionMode: 'single',
        options: [
          { id: 'standard-750ml', label: '750ml Standard' },
          { id: 'magnum-1-5l', label: '1.5L Magnum' },
        ],
      },
      {
        id: 'storage-transfer',
        label: 'Storage Transfer',
        helpText: 'Select how the wine should be transferred after settlement.',
        required: true,
        selectionMode: 'single',
        options: [
          { id: 'ship-to-buyer', label: 'Ship to Buyer' },
          { id: 'keep-in-vault', label: 'Keep in Seller Vault' },
        ],
      },
      {
        id: 'presentation',
        label: 'Presentation',
        helpText: 'Optional extras packaged with the bottle.',
        required: false,
        selectionMode: 'multi',
        options: [
          { id: 'wooden-case', label: 'Wooden Case' },
          { id: 'auth-documents', label: 'Auth Documents' },
          { id: 'insurance-slip', label: 'Insurance Slip' },
        ],
      },
    ],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: 'Pauillac, Bordeaux 33250, France',
      countryCode: 'FR',
      countryNameSnapshot: 'France',
      geoPath: [
        { placeId: 'fr-nouvelle-aquitaine', kind: 'admin1', name: 'Nouvelle-Aquitaine', label: 'Province / City' },
        { placeId: 'fr-pauillac', kind: 'locality', name: 'Pauillac', label: 'Ward / Locality' },
      ],
      lat: 45.2001,
      lng: -0.7485,
    }),
    
    blockchain: 'Ethereum',
    network: 'mainnet',
    
    createdAt: daysAgo(55),
    updatedAt: Date.now()
  },

  // ============================================================================
  // JEWELRY CATEGORY
  // ============================================================================
  {
    id: 'asset-014',
    tokenId: '3301',
    contractAddress: '0x9C8D7E6F5a4B3C2D1E0F9a8B7C6D5E4F3a2B1C0',
    
    name: 'Tiffany & Co. Diamond Engagement Ring 3.5ct',
    category: 'Jewelry',
    description: 'Stunning 3.5 carat round brilliant diamond engagement ring from Tiffany & Co. E color, VVS1 clarity.',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
    
    seller: {
      address: '0x8B9C0D1E2F3a4B5C6D7E8F9a0B1C2D3E4F5a6B7',
      ensName: 'luxuryjewelry.eth',
      verified: true,
      reputation: 98
    },
    
    price: '18.5 ETH',
    priceUSD: '$39,775',
    currency: 'ETH',
    
    availableSlots: 4,
    totalSlots: 8,
    minPurchaseSlots: 1,
    maxPurchaseSlots: 2,
    
    listedAt: daysAgo(9),
    expiresAt: daysFromNow(6),
    listingDuration: '6d 0h 0m',
    
    views: 3892,
    likes: 1456,
    rank: 5,
    
    verified: true,
    featured: true,
    tags: ['jewelry', 'diamond', 'tiffany', 'luxury'],
    configurableAttributes: [
      {
        id: 'ring-size',
        label: 'Ring Size',
        helpText: 'Pick the desired ring size for final handover.',
        required: true,
        selectionMode: 'single',
        options: [
          { id: 'size-5', label: 'US 5' },
          { id: 'size-6', label: 'US 6' },
          { id: 'size-7', label: 'US 7' },
          { id: 'size-8', label: 'US 8' },
        ],
      },
      {
        id: 'certificate-package',
        label: 'Certificate Package',
        helpText: 'Select which certificate bundle should be included.',
        required: true,
        selectionMode: 'single',
        options: [
          { id: 'gia-only', label: 'GIA Only' },
          { id: 'gia-tiffany', label: 'GIA + Tiffany Warranty' },
        ],
      },
      {
        id: 'delivery-extras',
        label: 'Delivery Extras',
        helpText: 'Optional extras for insured delivery.',
        required: false,
        selectionMode: 'multi',
        options: [
          { id: 'gift-box', label: 'Gift Box' },
          { id: 'premium-insurance', label: 'Premium Insurance' },
          { id: 'private-courier', label: 'Private Courier' },
        ],
      },
    ],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: 'Fifth Avenue, New York, NY 10022, United States',
      countryCode: 'US',
      countryNameSnapshot: 'United States',
      geoPath: [
        { placeId: 'us-new-york', kind: 'admin1', name: 'New York', label: 'Province / City' },
        { placeId: 'us-manhattan', kind: 'locality', name: 'Manhattan', label: 'Ward / Locality' },
      ],
      lat: 40.7580,
      lng: -73.9787,
    }),
    
    blockchain: 'Ethereum',
    network: 'mainnet',
    
    createdAt: daysAgo(48),
    updatedAt: Date.now()
  },

  // ============================================================================
  // MUSIC MEMORABILIA
  // ============================================================================
  {
    id: 'asset-015',
    tokenId: '2201',
    contractAddress: '0x8D7E6F5a4B3C2D1E0F9a8B7C6D5E4F3a2B1C0D9',
    
    name: 'Signed Fender Stratocaster - Eric Clapton',
    category: 'Collectibles',
    description: 'Fender Stratocaster signed by Eric Clapton with certificate of authenticity. Excellent condition.',
    image: 'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=800',
    
    seller: {
      address: '0x9C0D1E2F3a4B5C6D7E8F9a0B1C2D3E4F5a6B7C8',
      ensName: 'musiclegends.eth',
      verified: true,
      reputation: 91
    },
    
    price: '15.8 ETH',
    priceUSD: '$33,970',
    currency: 'ETH',
    
    availableSlots: 7,
    totalSlots: 10,
    minPurchaseSlots: 1,
    maxPurchaseSlots: 3,
    
    listedAt: daysAgo(11),
    expiresAt: daysFromNow(4),
    listingDuration: '4d 0h 0m',
    
    views: 2543,
    likes: 891,
    rank: 13,
    
    verified: true,
    featured: false,
    tags: ['guitar', 'music', 'signed', 'clapton'],
    assetLocationSnapshot: createAssetLocationSnapshot({
      displayAddress: 'Soho, London W1D, United Kingdom',
      countryCode: 'GB',
      countryNameSnapshot: 'United Kingdom',
      geoPath: [
        { placeId: 'gb-england', kind: 'admin1', name: 'England', label: 'Province / City' },
        { placeId: 'gb-london-soho', kind: 'locality', name: 'Soho', label: 'Ward / Locality' },
      ],
      lat: 51.5136,
      lng: -0.1365,
    }),
    
    blockchain: 'Ethereum',
    network: 'mainnet',
    
    createdAt: daysAgo(65),
    updatedAt: Date.now()
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get marketplace asset by ID
 */
export function getMarketplaceAssetById(id: string): MarketplaceAsset | undefined {
  return MOCK_MARKETPLACE_ASSETS.find(asset => asset.id === id);
}

/**
 * Get marketplace assets by category
 */
export function getMarketplaceAssetsByCategory(category: string): MarketplaceAsset[] {
  return MOCK_MARKETPLACE_ASSETS.filter(asset => 
    asset.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get featured marketplace assets
 */
export function getFeaturedMarketplaceAssets(): MarketplaceAsset[] {
  return MOCK_MARKETPLACE_ASSETS.filter(asset => asset.featured === true);
}

/**
 * Get verified marketplace assets
 */
export function getVerifiedMarketplaceAssets(): MarketplaceAsset[] {
  return MOCK_MARKETPLACE_ASSETS.filter(asset => asset.verified === true);
}

/**
 * Get marketplace assets by blockchain
 */
export function getMarketplaceAssetsByBlockchain(blockchain: string): MarketplaceAsset[] {
  return MOCK_MARKETPLACE_ASSETS.filter(asset => 
    asset.blockchain.toLowerCase() === blockchain.toLowerCase()
  );
}

/**
 * Get marketplace assets by price range
 */
export function getMarketplaceAssetsByPriceRange(min: number, max: number): MarketplaceAsset[] {
  return MOCK_MARKETPLACE_ASSETS.filter(asset => {
    const priceStr = asset.price.replace(/[^\d.]/g, '');
    const price = parseFloat(priceStr);
    return price >= min && price <= max;
  });
}

/**
 * Search marketplace assets
 */
export function searchMarketplaceAssets(query: string): MarketplaceAsset[] {
  const lowercaseQuery = query.toLowerCase();
  return MOCK_MARKETPLACE_ASSETS.filter(asset => 
    asset.name.toLowerCase().includes(lowercaseQuery) ||
    asset.description?.toLowerCase().includes(lowercaseQuery) ||
    asset.category.toLowerCase().includes(lowercaseQuery) ||
    asset.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
}

/**
 * Get top ranked marketplace assets
 */
export function getTopRankedMarketplaceAssets(limit: number = 10): MarketplaceAsset[] {
  return [...MOCK_MARKETPLACE_ASSETS]
    .filter(asset => asset.rank !== undefined)
    .sort((a, b) => (a.rank || 999) - (b.rank || 999))
    .slice(0, limit);
}

/**
 * Get recently listed marketplace assets
 */
export function getRecentlyListedMarketplaceAssets(limit: number = 10): MarketplaceAsset[] {
  return [...MOCK_MARKETPLACE_ASSETS]
    .sort((a, b) => b.listedAt - a.listedAt)
    .slice(0, limit);
}

/**
 * Get marketplace assets ending soon
 */
export function getMarketplaceAssetsEndingSoon(limit: number = 10): MarketplaceAsset[] {
  return [...MOCK_MARKETPLACE_ASSETS]
    .filter(asset => asset.expiresAt !== undefined)
    .sort((a, b) => (a.expiresAt || Infinity) - (b.expiresAt || Infinity))
    .slice(0, limit);
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  const categories = new Set(MOCK_MARKETPLACE_ASSETS.map(asset => asset.category));
  return Array.from(categories).sort();
}

/**
 * Get all blockchains
 */
export function getAllBlockchains(): string[] {
  const blockchains = new Set(MOCK_MARKETPLACE_ASSETS.map(asset => asset.blockchain));
  return Array.from(blockchains).sort();
}

/**
 * Get statistics
 */
export function getMarketplaceStatistics() {
  return {
    totalAssets: MOCK_MARKETPLACE_ASSETS.length,
    totalViews: MOCK_MARKETPLACE_ASSETS.reduce((sum, asset) => sum + asset.views, 0),
    totalLikes: MOCK_MARKETPLACE_ASSETS.reduce((sum, asset) => sum + asset.likes, 0),
    verifiedAssets: MOCK_MARKETPLACE_ASSETS.filter(a => a.verified).length,
    featuredAssets: MOCK_MARKETPLACE_ASSETS.filter(a => a.featured).length,
    categories: getAllCategories().length,
    blockchains: getAllBlockchains().length,
  };
}
