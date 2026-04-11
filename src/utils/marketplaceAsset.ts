import type { MarketplaceAsset } from '@/app/types/asset';

type MarketplaceSellerLike = Partial<MarketplaceAsset['seller']> | null | undefined;

export type MarketplaceCurrencyLike =
  | 'BNB'
  | 'WBNB'
  | 'ETH'
  | 'WETH'
  | 'USDC'
  | 'USDT'
  | 'ORI'
  | 'DAI';

export function getMarketplaceSellerAddress(seller: MarketplaceSellerLike): string | null {
  const address = String(seller?.address || '').trim();
  return address.length > 0 ? address : null;
}

export function formatMarketplaceSellerAddress(
  address: string | null | undefined,
  leading = 8,
  trailing = 6,
): string | null {
  const normalized = String(address || '').trim();
  if (!normalized) return null;
  if (leading <= 0 || trailing <= 0 || normalized.length <= leading + trailing) {
    return normalized;
  }
  return `${normalized.slice(0, leading)}...${normalized.slice(-trailing)}`;
}

export function getMarketplaceSellerDisplayName(
  seller: MarketplaceSellerLike,
  fallback = 'Unknown seller',
): string {
  const ensName = String(seller?.ensName || '').trim();
  if (ensName) return ensName;

  const addressLabel = formatMarketplaceSellerAddress(getMarketplaceSellerAddress(seller));
  return addressLabel || fallback;
}

export function getMarketplaceSellerInitial(
  seller: MarketplaceSellerLike,
  fallback = '?',
): string {
  const ensName = String(seller?.ensName || '').trim();
  if (ensName) return ensName.charAt(0).toUpperCase();

  const address = getMarketplaceSellerAddress(seller);
  const firstAddressChar = address ? address.replace(/^0x/i, '').charAt(0) : '';
  return firstAddressChar ? firstAddressChar.toUpperCase() : fallback;
}

export function normalizeMarketplaceCurrency<T extends string>(
  value: unknown,
  fallback: T,
): T | MarketplaceCurrencyLike {
  const normalized = String(value || '').trim().toUpperCase();
  switch (normalized) {
    case 'BNB':
    case 'WBNB':
    case 'ETH':
    case 'WETH':
    case 'USDC':
    case 'USDT':
    case 'ORI':
    case 'DAI':
      return normalized;
    default:
      return fallback;
  }
}

export function extractMarketplaceCurrencyFromPrice<T extends string>(
  price: string | null | undefined,
  fallback: T,
): T | MarketplaceCurrencyLike {
  const parts = String(price || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return normalizeMarketplaceCurrency(parts[parts.length - 1], fallback);
}
