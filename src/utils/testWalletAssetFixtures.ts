import type { MyAssetNft, MyAssetReceipt, MyAssetRwa } from '@/app/components/cards/my-asset-cards';
import type { AssetDetails } from '@/types/asset';

export const TEST_WALLET_A = '0xB43F3f31fae56C4e8C0be36EC6f84dD5B1571c14';
export const TEST_WALLET_B = '0x282Be18838D7079C215F49749a9606d77e00888b';

function normalize(address?: string | null): string {
  return (address || '').toLowerCase();
}

function short(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isDeterministicTestWallet(address?: string | null): boolean {
  const n = normalize(address);
  return n === normalize(TEST_WALLET_A) || n === normalize(TEST_WALLET_B);
}

export interface TestWalletMyAssetsFixture {
  walletAddress: string;
  rwaAssets: MyAssetRwa[];
  receiptAssets: MyAssetReceipt[];
  nftAssets: MyAssetNft[];
  favoriteListingAssetIds: string[];
}

const FIXTURE_TS = {
  mintedA: '2026-02-20',
  mintedB: '2026-02-21',
  purchasedA: '2026-02-22',
  purchasedB: '2026-02-23',
};

const WALLET_A_FIXTURE: TestWalletMyAssetsFixture = {
  walletAddress: TEST_WALLET_A,
  rwaAssets: [
    {
      id: 'twf-a-rwa-001',
      name: 'Da Nang Boutique Villa Fraction #A01',
      type: 'RWA',
      category: 'Real Estate',
      image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&auto=format&fit=crop',
      status: 'Active',
      availableAmount: '62',
      totalAmount: '100',
      minPrice: '1.8 ETH',
      mintedDate: FIXTURE_TS.mintedA,
    },
  ],
  receiptAssets: [
    {
      id: 'twf-a-receipt-001',
      name: 'Arabica Reserve Vault Fraction #B02 Receipt',
      type: 'Receipt',
      category: 'Collectibles',
      orderId: 'ORD-B2A-0001',
      image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop',
      purchaseValue: '0.95 ETH',
      purchaseDate: FIXTURE_TS.purchasedA,
      seller: short(TEST_WALLET_B),
      blockchain: 'BSC TESTNET',
    },
  ],
  nftAssets: [
    {
      id: 'twf-a-nft-001',
      name: 'Orina Signal Frame #A11',
      type: 'NFT',
      category: 'Digital Art',
      image: 'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=800&auto=format&fit=crop',
      currentPrice: '0.62 ETH',
      floorPrice: '0.54 ETH',
      collection: 'Orina Signals',
      transferable: true,
    },
  ],
  favoriteListingAssetIds: ['asset-001', 'asset-004', 'asset-013'],
};

const WALLET_B_FIXTURE: TestWalletMyAssetsFixture = {
  walletAddress: TEST_WALLET_B,
  rwaAssets: [
    {
      id: 'twf-b-rwa-001',
      name: 'Arabica Reserve Vault Fraction #B02',
      type: 'RWA',
      category: 'Collectibles',
      image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&auto=format&fit=crop',
      status: 'Active',
      availableAmount: '14',
      totalAmount: '40',
      minPrice: '0.95 ETH',
      mintedDate: FIXTURE_TS.mintedB,
    },
  ],
  receiptAssets: [
    {
      id: 'twf-b-receipt-001',
      name: 'Da Nang Boutique Villa Fraction #A01 Receipt',
      type: 'Receipt',
      category: 'Real Estate',
      orderId: 'ORD-A2B-0001',
      image: 'https://images.unsplash.com/photo-1613977257365-aaae5a9817ff?w=800&auto=format&fit=crop',
      purchaseValue: '1.80 ETH',
      purchaseDate: FIXTURE_TS.purchasedB,
      seller: short(TEST_WALLET_A),
      blockchain: 'BSC TESTNET',
    },
  ],
  nftAssets: [
    {
      id: 'twf-b-nft-001',
      name: 'Orina Trade Pass #B07',
      type: 'NFT',
      category: 'Gaming',
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop',
      currentPrice: '0.31 ETH',
      floorPrice: '0.27 ETH',
      collection: 'Orina Trade Pass',
      transferable: true,
    },
  ],
  favoriteListingAssetIds: ['asset-003', 'asset-009', 'asset-014'],
};

function cloneFixture<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function getTestWalletMyAssets(walletAddress?: string | null): TestWalletMyAssetsFixture | null {
  const n = normalize(walletAddress);
  if (n === normalize(TEST_WALLET_A)) return cloneFixture(WALLET_A_FIXTURE);
  if (n === normalize(TEST_WALLET_B)) return cloneFixture(WALLET_B_FIXTURE);
  return null;
}

function deterministicBaseAssetDetails(
  id: string,
  tokenId: string,
  name: string,
  category: string,
  image: string,
  owner: string
): AssetDetails {
  const mintDate = Date.parse('2026-02-20T00:00:00Z');
  return {
    id,
    tokenId,
    name,
    description: `${name} deterministic fixture for ATP2 Phase C offchain testing`,
    category,
    blockchain: 'BSC',
    currentPrice: '1.00 ETH',
    currentPriceUsd: '$2,000',
    floorPrice: '0.90 ETH',
    priceChange24h: 0,
    image,
    images: [image],
    properties: [
      { trait_type: 'Fixture', value: 'Test Wallet Deterministic', rarity: 100 },
      { trait_type: 'Category', value: category, rarity: 100 },
    ],
    views: 100,
    favorites: 10,
    totalVolume: '1.00 ETH',
    totalSales: 1,
    currentOwner: owner,
    creator: owner,
    ownerHistory: [
      { address: owner, timestamp: mintDate, price: 'Minted', txHash: '0xfixture' },
    ],
    priceHistory: [
      { timestamp: mintDate, price: 1, priceUsd: 2000, eventType: 'mint' },
    ],
    contractAddress: '0x1111111111111111111111111111111111111111',
    tokenStandard: 'ERC-721',
    mintDate,
    lastSale: mintDate,
    verified: true,
    royalty: 2.5,
    externalUrl: `https://orina.local/fixtures/${id}`,
    ipfsUrl: `ipfs://fixture/${id}`,
    seller: { name: short(owner), address: owner },
    rating: 4.8,
  };
}

const OWNED_ASSET_DETAILS_FIXTURES: Record<string, AssetDetails> = {
  'twf-a-rwa-001': deterministicBaseAssetDetails(
    'twf-a-rwa-001',
    '12001',
    'Da Nang Boutique Villa Fraction #A01',
    'Real Estate',
    WALLET_A_FIXTURE.rwaAssets[0].image,
    TEST_WALLET_A
  ),
  'twf-a-receipt-001': deterministicBaseAssetDetails(
    'twf-a-receipt-001',
    '12002',
    'Arabica Reserve Vault Fraction #B02 Receipt',
    'Collectibles',
    WALLET_A_FIXTURE.receiptAssets[0].image,
    TEST_WALLET_A
  ),
  'twf-a-nft-001': deterministicBaseAssetDetails(
    'twf-a-nft-001',
    '12003',
    'Orina Signal Frame #A11',
    'Digital Art',
    WALLET_A_FIXTURE.nftAssets[0].image,
    TEST_WALLET_A
  ),
  'twf-b-rwa-001': deterministicBaseAssetDetails(
    'twf-b-rwa-001',
    '22001',
    'Arabica Reserve Vault Fraction #B02',
    'Collectibles',
    WALLET_B_FIXTURE.rwaAssets[0].image,
    TEST_WALLET_B
  ),
  'twf-b-receipt-001': deterministicBaseAssetDetails(
    'twf-b-receipt-001',
    '22002',
    'Da Nang Boutique Villa Fraction #A01 Receipt',
    'Real Estate',
    WALLET_B_FIXTURE.receiptAssets[0].image,
    TEST_WALLET_B
  ),
  'twf-b-nft-001': deterministicBaseAssetDetails(
    'twf-b-nft-001',
    '22003',
    'Orina Trade Pass #B07',
    'Gaming',
    WALLET_B_FIXTURE.nftAssets[0].image,
    TEST_WALLET_B
  ),
};

export function getDeterministicOwnedAssetDetailsById(id: string): AssetDetails | null {
  const match = OWNED_ASSET_DETAILS_FIXTURES[id];
  return match ? cloneFixture(match) : null;
}
