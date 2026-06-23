import { describe, expect, it } from 'vitest';
import type { MarketplaceAsset } from '@/app/types/asset';
import { buildMarketplaceMapAssets, normalizeMarketplaceLocationSnapshot } from './marketplaceLocation';

function createAsset(location: unknown): MarketplaceAsset {
  return {
    id: 'seed-42',
    tokenId: '42',
    contractAddress: '0x0000000000000000000000000000000000000001',
    name: 'Saigon Coffee Seed Lot',
    category: 'agri_food',
    image: 'ipfs://seed-cover',
    seller: {
      address: '0x0000000000000000000000000000000000000042',
      verified: true,
      reputation: 88,
    },
    price: '12 USDC',
    currency: 'USDC',
    availableSlots: 8,
    totalSlots: 10,
    listedAt: 1,
    views: 3,
    likes: 2,
    verified: true,
    blockchain: 'BSC',
    network: 'testnet',
    createdAt: 1,
    updatedAt: 1,
    assetLocationSnapshot: location as MarketplaceAsset['assetLocationSnapshot'],
  };
}

describe('marketplace location normalization', () => {
  it('normalizes legacy seed metadata that has long coordinate keys but no geoPath', () => {
    const location = normalizeMarketplaceLocationSnapshot({
      city: 'Saigon',
      address: 'District 1, Saigon',
      country: 'Vietnam',
      coordinates: { latitude: 10.7769, longitude: 106.7009 },
    });

    expect(location).toMatchObject({
      displayAddress: 'District 1, Saigon',
      countryNameSnapshot: 'Vietnam',
      geoPath: [{ kind: 'locality', name: 'Saigon' }],
      coordinates: { lat: 10.7769, lng: 106.7009 },
      precision: 'locality',
    });
  });

  it('builds a map marker without crashing when geoPath is absent', () => {
    const markers = buildMarketplaceMapAssets([createAsset({
      city: 'Saigon',
      address: 'District 1, Saigon',
      country: 'Vietnam',
      coordinates: { latitude: 10.7769, longitude: 106.7009 },
    })]);

    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({
      assetKey: 'seed-42',
      city: 'Saigon',
      latitude: 10.7769,
      longitude: 106.7009,
    });
  });

  it('drops invalid coordinates instead of passing them to MapLibre', () => {
    const markers = buildMarketplaceMapAssets([createAsset({
      countryNameSnapshot: 'Invalid',
      coordinates: { lat: 120, lng: 240 },
      geoPath: [],
    })]);

    expect(markers).toEqual([]);
  });
});
