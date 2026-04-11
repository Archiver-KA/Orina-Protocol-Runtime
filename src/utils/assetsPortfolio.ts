import type {
  MyAssetNft,
  MyAssetReceipt,
  MyAssetRwa,
} from '@/app/components/cards/my-asset-cards';
import { getTestWalletMyAssets } from '@/utils/testWalletAssetFixtures';
import { LIVE_PROTOCOL_CHAIN_ID } from '@/utils/protocolNetwork';
import type { RuntimeMintedAssetRecord } from '@/utils/runtimeMintedAssets';
import { getCategoryDisplayLabel } from '@/utils/taxonomy';

export type AnyOwnedAsset = MyAssetRwa | MyAssetReceipt | MyAssetNft;

export interface AssetCategoryBreakdown {
  name: string;
  count: number;
}

export interface TopValuedOwnedAsset {
  id: string;
  name: string;
  type: AnyOwnedAsset['type'];
  category: string;
  valueLabel: string;
  valueEth: number;
}

export interface CanonicalOwnedPortfolio {
  rwaAssets: MyAssetRwa[];
  receiptAssets: MyAssetReceipt[];
  nftAssets: MyAssetNft[];
  allAssets: AnyOwnedAsset[];
  totalAssets: number;
  totalEstimatedEth: number;
  typeValueEth: {
    rwa: number;
    receipts: number;
    nfts: number;
  };
  typeCounts: {
    rwa: number;
    receipts: number;
    nfts: number;
  };
  listingStatus: {
    activeRwa: number;
    soldOutRwa: number;
    nonTransferableReceipts: number;
    transferableNfts: number;
  };
  categories: AssetCategoryBreakdown[];
  topAssets: TopValuedOwnedAsset[];
  fixtureWallet: boolean;
  networkLabel: string;
}

export interface RuntimeOwnedPortfolioAssets {
  rwaAssets: MyAssetRwa[];
  receiptAssets?: MyAssetReceipt[];
  nftAssets: MyAssetNft[];
}

function coerceText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function coerceLowerText(value: unknown): string {
  return coerceText(value).toLowerCase();
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const merged = new Map<string, T>();
  for (const item of items) {
    if (!merged.has(item.id)) {
      merged.set(item.id, item);
    }
  }
  return Array.from(merged.values());
}

function mergeById<T extends { id: string }>(primary: T[], fallback: T[]): T[] {
  return dedupeById([...primary, ...fallback]);
}

export function parseEthLikeValue(raw: string): number {
  const numeric = Number.parseFloat(String(raw || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function formatEthDisplay(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 ETH';
  const normalized = value >= 10 ? value.toFixed(2) : value.toFixed(3);
  return `${normalized.replace(/\.?0+$/, '')} ETH`;
}

function getAssetValueEth(asset: AnyOwnedAsset): number {
  switch (asset.type) {
    case 'RWA':
      return parseEthLikeValue(coerceText(asset.minPrice));
    case 'Receipt':
      return parseEthLikeValue(coerceText(asset.purchaseValue));
    case 'NFT':
      return parseEthLikeValue(coerceText(asset.currentPrice));
    default:
      return 0;
  }
}

function getTopAssets(assets: AnyOwnedAsset[]): TopValuedOwnedAsset[] {
  return [...assets]
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      category: getCategoryDisplayLabel(asset.category),
      valueEth: getAssetValueEth(asset),
      valueLabel:
        asset.type === 'RWA'
          ? coerceText(asset.minPrice, '0 ETH')
          : asset.type === 'Receipt'
            ? coerceText(asset.purchaseValue, '0 ETH')
            : coerceText(asset.currentPrice, '0 ETH'),
    }))
    .sort((a, b) => b.valueEth - a.valueEth)
    .slice(0, 5);
}

function getCategoryBreakdown(assets: AnyOwnedAsset[]): AssetCategoryBreakdown[] {
  const counts = new Map<string, number>();
  for (const asset of assets) {
    const category = getCategoryDisplayLabel(asset.category || 'uncategorized');
    counts.set(category, (counts.get(category) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
}

function getNetworkLabel(): string {
  const liveChainId = LIVE_PROTOCOL_CHAIN_ID;

  switch (liveChainId) {
    case 97:
      return 'BSC Testnet';
    case 56:
      return 'BSC';
    case 1:
      return 'Ethereum';
    default:
      return `Chain ${liveChainId}`;
  }
}

export function buildCanonicalOwnedPortfolio(
  walletAddress?: string | null,
  runtimeOwnedAssets?: RuntimeOwnedPortfolioAssets,
): CanonicalOwnedPortfolio {
  const fixture = getTestWalletMyAssets(walletAddress);
  const runtime = runtimeOwnedAssets || { rwaAssets: [], receiptAssets: [], nftAssets: [] };

  const rwaAssets = fixture
    ? mergeById(runtime.rwaAssets, fixture.rwaAssets)
    : dedupeById(runtime.rwaAssets);
  const receiptAssets = fixture
    ? mergeById(runtime.receiptAssets ?? [], fixture.receiptAssets)
    : dedupeById(runtime.receiptAssets ?? []);
  const nftAssets = fixture
    ? mergeById(runtime.nftAssets, fixture.nftAssets)
    : dedupeById(runtime.nftAssets);

  const allAssets: AnyOwnedAsset[] = [...rwaAssets, ...receiptAssets, ...nftAssets];
  const rwaValue = rwaAssets.reduce((sum, asset) => sum + parseEthLikeValue(asset.minPrice), 0);
  const receiptValue = receiptAssets.reduce((sum, asset) => sum + parseEthLikeValue(asset.purchaseValue), 0);
  const nftValue = nftAssets.reduce((sum, asset) => sum + parseEthLikeValue(asset.currentPrice), 0);

  return {
    rwaAssets,
    receiptAssets,
    nftAssets,
    allAssets,
    totalAssets: allAssets.length,
    totalEstimatedEth: rwaValue + receiptValue + nftValue,
    typeValueEth: {
      rwa: rwaValue,
      receipts: receiptValue,
      nfts: nftValue,
    },
    typeCounts: {
      rwa: rwaAssets.length,
      receipts: receiptAssets.length,
      nfts: nftAssets.length,
    },
    listingStatus: {
      activeRwa: rwaAssets.filter((asset) => coerceLowerText(asset.status) === 'active').length,
      soldOutRwa: rwaAssets.filter((asset) => coerceLowerText(asset.status) === 'sold out').length,
      nonTransferableReceipts: receiptAssets.length,
      transferableNfts: nftAssets.filter((asset) => asset.transferable).length,
    },
    categories: getCategoryBreakdown(allAssets),
    topAssets: getTopAssets(allAssets),
    fixtureWallet: Boolean(fixture),
    networkLabel: getNetworkLabel(),
  };
}

export function hasRuntimeMintedRecords(records: RuntimeMintedAssetRecord[] | undefined): boolean {
  return Boolean(records && records.length > 0);
}
