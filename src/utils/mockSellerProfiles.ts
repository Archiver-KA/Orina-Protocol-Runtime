import { loadUserProfile, shortenUserDisplayName } from '@/utils/profileUtils';

export interface SellerProfileCardData {
  address: string;
  displayName: string;
  username: string;
  bio: string;
  avatarUrl?: string;
  bannerUrl?: string;
  totalSalesEth: string;
  followers: string;
  rating: string;
  floorPriceEth: string;
  itemsListed: string;
  verified: boolean;
}

function formatCompactCount(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${value}`;
}

function formatEth(value: number): string {
  if (!value || value <= 0) return '0 ETH';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K ETH`;
  return `${value.toFixed(2)} ETH`;
}

const BASE_SELLERS: SellerProfileCardData[] = [
  {
    address: '0x3f5a5216ac1D5044e094c5E434C742D6fC024154',
    displayName: 'KAKAK',
    username: '@kakak_rwa',
    bio: 'Verified RWA seller with active listings across marketplace.',
    totalSalesEth: '12.5K ETH',
    followers: '45k',
    rating: '4.9',
    floorPriceEth: '0.85 ETH',
    itemsListed: '142',
    verified: true,
  },
  {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F',
    displayName: 'CyberPunk Nomad',
    username: '@cyber_nomad',
    bio: 'Top performer in digital collectibles and RWA hybrids.',
    totalSalesEth: '9.8K ETH',
    followers: '31k',
    rating: '4.8',
    floorPriceEth: '0.62 ETH',
    itemsListed: '96',
    verified: true,
  },
  {
    address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    displayName: 'Void Architect',
    username: '@void_arch',
    bio: 'Architectural and metaverse-linked assets.',
    totalSalesEth: '6.1K ETH',
    followers: '22k',
    rating: '4.7',
    floorPriceEth: '0.41 ETH',
    itemsListed: '73',
    verified: true,
  },
];

export function getMockSellerProfiles(): SellerProfileCardData[] {
  return BASE_SELLERS.map((seller) => {
    const saved = loadUserProfile(seller.address);
    if (!saved) return seller;

    const avatarUrl = saved.avatarUrl || saved.avatar;
    const bannerUrl = saved.bannerUrl || saved.banner;
    const realFollowers = saved.followers?.length ?? 0;
    const realTotalSales = saved.stats?.totalSales ?? 0;
    const realItemsListed = saved.stats?.assetsOwned ?? 0;
    return {
      ...seller,
      displayName: saved.displayName || seller.displayName || shortenUserDisplayName(seller.address),
      username: saved.username || seller.username,
      bio: saved.bio || seller.bio,
      avatarUrl: avatarUrl || seller.avatarUrl,
      bannerUrl: bannerUrl || seller.bannerUrl,
      followers: realFollowers > 0 ? formatCompactCount(realFollowers) : seller.followers,
      totalSalesEth: realTotalSales > 0 ? formatEth(realTotalSales) : seller.totalSalesEth,
      itemsListed: realItemsListed > 0 ? `${realItemsListed}` : seller.itemsListed,
    };
  });
}
