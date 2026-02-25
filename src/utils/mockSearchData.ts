import { SearchResult } from '@/types/search';
import { generateRWAAssets } from './mockRWAData';

/**
 * Generate mock search results from shared RWA data
 */
export function generateMockSearchResults(): SearchResult[] {
  const rwaAssets = generateRWAAssets();
  
  // Convert RWAAsset to SearchResult format
  return rwaAssets.map(asset => ({
    id: asset.id.toString(),
    name: asset.name,
    description: asset.description,
    category: asset.category,
    blockchain: asset.blockchain,
    price: asset.price,
    priceUsd: asset.priceUsd,
    priceNumeric: asset.priceNumeric,
    image: asset.image,
    verified: asset.verified,
    views: asset.views,
    favorites: asset.favorites,
    mintDate: asset.mintDate,
  }));
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  return ['Real Estate', 'Collectibles', 'Vehicles', 'Art', 'Luxury Goods'];
}

/**
 * Get all unique blockchains
 */
export function getAllBlockchains(): string[] {
  return ['BSC', 'Ethereum', 'Polygon', 'Arbitrum', 'Base'];
}