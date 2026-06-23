import type { MarketplaceAsset } from '@/app/types/asset';
import type { AssetLocationSnapshot } from '@/types/asset';
import { getCategoryDisplayLabel } from '@/utils/taxonomy';

const LOCATION_PRECISIONS = new Set<AssetLocationSnapshot['precision']>([
  'country',
  'admin1',
  'admin2',
  'admin3',
  'admin4',
  'admin5',
  'locality',
  'sublocality',
  'unstructured',
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readString(...values: unknown[]): string {
  for (const value of values) {
    const normalized = String(value ?? '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function readFiniteNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function normalizeMarketplaceLocationSnapshot(
  value: unknown,
  fallback?: AssetLocationSnapshot,
): AssetLocationSnapshot | undefined {
  const record = asRecord(value);
  const fallbackRecord = asRecord(fallback);
  if (!record && !fallbackRecord) return undefined;

  const rawGeoPath = Array.isArray(record?.geoPath)
    ? record.geoPath
    : Array.isArray(fallbackRecord?.geoPath)
      ? fallbackRecord.geoPath
      : [];
  const geoPath = rawGeoPath.flatMap((entry) => {
    const segment = asRecord(entry);
    if (!segment) return [];
    const name = readString(segment.name, segment.label);
    if (!name) return [];
    return [{
      placeId: readString(segment.placeId),
      kind: readString(segment.kind, 'unknown'),
      code: readString(segment.code) || null,
      name,
      label: readString(segment.label, name),
    }];
  });
  const legacyCity = readString(record?.city);
  if (geoPath.length === 0 && legacyCity) {
    geoPath.push({
      placeId: '',
      kind: 'locality',
      code: null,
      name: legacyCity,
      label: legacyCity,
    });
  }

  const coordinateRecord = asRecord(record?.coordinates) ?? asRecord(fallbackRecord?.coordinates);
  const latitude = readFiniteNumber(coordinateRecord?.lat, coordinateRecord?.latitude);
  const longitude = readFiniteNumber(coordinateRecord?.lng, coordinateRecord?.longitude);
  const coordinates = latitude !== null && longitude !== null &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    ? { lat: latitude, lng: longitude }
    : null;
  const rawPrecision = readString(
    record?.precision,
    fallbackRecord?.precision,
    legacyCity ? 'locality' : '',
  );
  const precision = LOCATION_PRECISIONS.has(rawPrecision as AssetLocationSnapshot['precision'])
    ? rawPrecision as AssetLocationSnapshot['precision']
    : 'unstructured';
  const sourceMode = readString(record?.sourceMode, fallbackRecord?.sourceMode) === 'default'
    ? 'default'
    : 'other';

  return {
    sourceMode,
    displayAddress: readString(
      record?.displayAddress,
      record?.address,
      record?.label,
      fallbackRecord?.displayAddress,
    ),
    countryCode: readString(record?.countryCode, fallbackRecord?.countryCode).toUpperCase(),
    countryNameSnapshot: readString(
      record?.countryNameSnapshot,
      record?.country,
      fallbackRecord?.countryNameSnapshot,
    ),
    geoPath,
    leafPlaceId: readString(record?.leafPlaceId, fallbackRecord?.leafPlaceId) || undefined,
    postalCode: readString(record?.postalCode, fallbackRecord?.postalCode) || undefined,
    coordinates,
    precision,
    capturedAt: readFiniteNumber(record?.capturedAt, fallbackRecord?.capturedAt) ?? 0,
  };
}

export interface MarketplaceMapAsset {
  id: number;
  name: string;
  category: string;
  categoryLabel: string;
  price: string;
  usdPrice: string;
  image: string;
  latitude: number;
  longitude: number;
  city: string;
  countryCode?: string;
  locationPrecision?: string;
  assetKey?: string;
  supplierKey?: string;
  trustScore?: number;
  successfulSales?: number;
  views?: number;
  likes?: number;
  rank?: number;
  totalSlots?: number;
  availableSlots?: number;
  displayScore?: number;
  seller: {
    name: string;
    rating: string;
  };
  verified: boolean;
}

export function buildMarketplaceMapAssets(assets: MarketplaceAsset[]): MarketplaceMapAsset[] {
  return assets.flatMap((asset, index) => {
    const location = normalizeMarketplaceLocationSnapshot(asset.assetLocationSnapshot);
    const coordinates = location?.coordinates;
    if (!location || !coordinates) return [];

    const city = location.geoPath.at(-1)?.name ||
      location.countryNameSnapshot ||
      location.displayAddress ||
      'Unknown';
    const trustScore = Math.max(
      0,
      Math.min(100, asset.seller.reputation ?? (asset.seller.verified ? 80 : 50)),
    );
    const successfulSales = Math.max(0, (asset.totalSlots || 0) - (asset.availableSlots || 0));

    return [{
      id: parseInt(asset.id.replace(/\D/g, ''), 10) || index,
      name: asset.name,
      category: asset.category,
      categoryLabel: getCategoryDisplayLabel(asset.category),
      price: asset.price,
      usdPrice: asset.priceUSD || '$0',
      image: asset.image,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      city,
      countryCode: location.countryCode,
      locationPrecision: location.precision,
      assetKey: asset.id,
      supplierKey: asset.seller.address || asset.seller.ensName || 'unknown-supplier',
      trustScore,
      successfulSales,
      views: asset.views || 0,
      likes: asset.likes || 0,
      rank: asset.rank,
      totalSlots: asset.totalSlots || 0,
      availableSlots: asset.availableSlots || 0,
      displayScore:
        trustScore * 0.45 +
        successfulSales * 3 +
        Math.log1p(asset.views || 0) * 7 +
        Math.log1p(asset.likes || 0) * 10 +
        (asset.verified ? 18 : 0) +
        (typeof asset.rank === 'number' && asset.rank > 0 ? Math.max(0, 40 - asset.rank) : 0),
      seller: {
        name: asset.seller.ensName || asset.seller.address.slice(0, 10),
        rating: `${asset.seller.reputation ?? 0}%`,
      },
      verified: asset.verified,
    }];
  });
}
