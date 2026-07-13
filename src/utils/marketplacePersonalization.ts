import type { MarketplaceAsset } from '@/app/types/asset';
import { isSupabaseRestEnabled, restPublicRpc } from '@/utils/supabaseRest';

export const DEFAULT_MARKETPLACE_PERSONALIZATION_SURFACE = 'marketplace_browse';
const MAX_PERSONALIZATION_ASSET_IDS = 250;

export type MarketplacePersonalizationReason =
  | 'favorite'
  | 'watchlist'
  | 'recent-view'
  | 'ai-memory-category'
  | 'search-category'
  | 'trusted-seller'
  | 'verified-asset'
  | 'popular'
  | 'fresh';

type MarketplacePersonalizationRpcRow = {
  asset_uid: string | null;
  score: number | string | null;
  reason_codes: string[] | null;
  ranking_version: string | null;
  personalized: boolean | null;
};

export type MarketplacePersonalizationRow = {
  assetUid: string;
  score: number;
  reasonCodes: MarketplacePersonalizationReason[];
  rankingVersion: string;
  personalized: boolean;
};

export type MarketplacePersonalizationSummary = {
  label: string;
  description: string;
  rankingVersion?: string;
};

function normalizeAssetUid(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeReasonCodes(value: string[] | null | undefined): MarketplacePersonalizationReason[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((entry) => String(entry || '').trim().toLowerCase())
        .filter((entry): entry is MarketplacePersonalizationReason =>
          [
            'favorite',
            'watchlist',
            'recent-view',
            'ai-memory-category',
            'search-category',
            'trusted-seller',
            'verified-asset',
            'popular',
            'fresh',
          ].includes(entry),
        ),
    ),
  );
}

export async function fetchMarketplacePersonalizationRows(
  assets: MarketplaceAsset[],
  options: {
    surface?: string;
    limit?: number;
  } = {},
): Promise<MarketplacePersonalizationRow[]> {
  if (!isSupabaseRestEnabled()) return [];

  const assetUids = Array.from(
    new Set(
      assets
        .map((asset) => normalizeAssetUid(asset.assetUid || asset.id))
        .filter(Boolean),
    ),
  ).slice(0, MAX_PERSONALIZATION_ASSET_IDS);

  if (assetUids.length === 0) return [];

  try {
    const rows = await restPublicRpc<MarketplacePersonalizationRpcRow[]>(
      'get_personalized_marketplace_assets_v1',
      {
        p_asset_uids: assetUids,
        p_surface: normalizeAssetUid(options.surface || DEFAULT_MARKETPLACE_PERSONALIZATION_SURFACE),
        p_limit: Math.max(1, Math.min(options.limit || assetUids.length, MAX_PERSONALIZATION_ASSET_IDS)),
      },
    );

    if (!Array.isArray(rows)) return [];

    return rows
      .map((row) => ({
        assetUid: normalizeAssetUid(row.asset_uid),
        score: toNumber(row.score),
        reasonCodes: normalizeReasonCodes(row.reason_codes),
        rankingVersion: String(row.ranking_version || '').trim() || 'phase1_v1',
        personalized: row.personalized === true,
      }))
      .filter((row) => row.assetUid);
  } catch (error) {
    console.debug('[MarketplacePersonalization] Ranking RPC failed:', error);
    return [];
  }
}

export function sortMarketplaceAssetsWithPersonalization(
  assets: MarketplaceAsset[],
  rows: MarketplacePersonalizationRow[],
): MarketplaceAsset[] {
  if (!Array.isArray(assets) || assets.length <= 1 || !Array.isArray(rows) || rows.length === 0) {
    return assets;
  }

  const rankingByAssetUid = new Map(
    rows.map((row, index) => [row.assetUid, { ...row, rankIndex: index }] as const),
  );

  return assets
    .map((asset, index) => ({
      asset,
      index,
      ranking: rankingByAssetUid.get(normalizeAssetUid(asset.assetUid || asset.id)) || null,
    }))
    .sort((left, right) => {
      if (left.ranking && right.ranking) {
        const scoreDiff = right.ranking.score - left.ranking.score;
        if (scoreDiff !== 0) return scoreDiff;

        if (left.ranking.personalized !== right.ranking.personalized) {
          return Number(right.ranking.personalized) - Number(left.ranking.personalized);
        }

        const rankIndexDiff = left.ranking.rankIndex - right.ranking.rankIndex;
        if (rankIndexDiff !== 0) return rankIndexDiff;
      }

      if (left.ranking && !right.ranking) return -1;
      if (!left.ranking && right.ranking) return 1;
      return left.index - right.index;
    })
    .map((entry) => entry.asset);
}

export function summarizeMarketplacePersonalizationRows(
  rows: MarketplacePersonalizationRow[],
): MarketplacePersonalizationSummary | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const rankingVersion = rows[0]?.rankingVersion || 'phase1_v1';
  const personalized = rows.some((row) => row.personalized);

  if (personalized) {
    return {
      label: 'For You',
      description: 'Sorted using your favorites, recent views, and category affinity signals.',
      rankingVersion,
    };
  }

  return {
    label: 'Browse Ranking',
    description: 'Sorted by trusted sellers, freshness, and marketplace activity when no viewer-specific signal is available.',
    rankingVersion,
  };
}
