import { describe, expect, it, vi } from 'vitest';
import type { GeoCountry, GeoPlace } from '@/types/address';
import { loadGeoPlacesForLevel } from '@/utils/deliveryAddressUtils';

function makeCountry(levels: GeoCountry['addressSchema']['levels']): GeoCountry {
  return {
    code: 'AF',
    iso3: 'AFG',
    name: 'Afghanistan',
    postalCodeLabel: 'Postal code',
    postalCodeRequired: false,
    addressSchema: { levels },
    isActive: true,
  };
}

function makePlace(overrides: Partial<GeoPlace> & Pick<GeoPlace, 'id' | 'countryCode' | 'depth' | 'placeKind' | 'name'>): GeoPlace {
  return {
    parentId: null,
    isSelectable: true,
    sortOrder: 0,
    ...overrides,
  };
}

describe('loadGeoPlacesForLevel', () => {
  it('returns direct kind matches when the requested level exists on the current parent', async () => {
    const country = makeCountry([
      { kind: 'admin1', label: 'Region', required: true },
      { kind: 'locality', label: 'City / Locality', required: true },
    ]);
    const locality = makePlace({
      id: 'GN-1',
      countryCode: 'AF',
      depth: 2,
      placeKind: 'locality',
      parentId: 'AF-BDG',
      name: 'Qal‘ah-ye Now',
    });
    const loader = vi.fn(async () => [locality]);

    const result = await loadGeoPlacesForLevel(country, 1, 'AF-BDG', loader);

    expect(result).toEqual([locality]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('walks one descendant layer when the schema skips an intermediate admin level', async () => {
    const country = makeCountry([
      { kind: 'admin1', label: 'Region', required: true },
      { kind: 'locality', label: 'City / Locality', required: true },
    ]);
    const admin2 = makePlace({
      id: 'GA2-AF-02-1901',
      countryCode: 'AF',
      depth: 2,
      placeKind: 'admin2',
      parentId: 'AF-BDG',
      name: 'Qal‘ah-ye Now District',
    });
    const locality = makePlace({
      id: 'GN-1140001',
      countryCode: 'AF',
      depth: 3,
      placeKind: 'locality',
      parentId: admin2.id,
      name: 'Qal‘ah-ye Now',
    });
    const loader = vi.fn(async (_countryCode: string, parentId: string | null) => {
      if (parentId === 'AF-BDG') return [admin2];
      if (parentId === admin2.id) return [locality];
      return [];
    });

    const result = await loadGeoPlacesForLevel(country, 1, 'AF-BDG', loader);

    expect(result).toEqual([locality]);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('falls back to the best available direct places when no exact descendant kind exists', async () => {
    const country = makeCountry([
      { kind: 'admin1', label: 'Region', required: true },
      { kind: 'locality', label: 'City / Locality', required: true },
    ]);
    const admin2 = makePlace({
      id: 'GA2-AF-02-1905',
      countryCode: 'AF',
      depth: 2,
      placeKind: 'admin2',
      parentId: 'AF-BDG',
      name: 'Ghōrmāch',
    });
    const loader = vi.fn(async (_countryCode: string, parentId: string | null) => {
      if (parentId === 'AF-BDG') return [admin2];
      return [];
    });

    const result = await loadGeoPlacesForLevel(country, 1, 'AF-BDG', loader);

    expect(result).toEqual([admin2]);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});