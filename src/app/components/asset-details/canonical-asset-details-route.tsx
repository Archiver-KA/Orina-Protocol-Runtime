import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, PackageSearch, RefreshCw } from 'lucide-react';
import { AssetDetailsModal } from '@/app/components/asset-details-modal';
import type { MarketplaceAsset } from '@/app/types/asset';
import {
  MARKETPLACE_CATALOG_SYNC_EVENT,
  getMarketplaceCatalogAssetById,
  hydrateMarketplaceCatalogFromSupabase,
  loadMarketplaceCatalogSync,
} from '@/utils/marketplaceCatalog';

interface CanonicalAssetDetailsRouteProps {
  assetId: string | null;
  onBack?: () => void;
  onNavigateToSeller?: (sellerAddress: string) => void;
  previousPage?: string;
}

function getBackLabel(previousPage?: string): string {
  switch (previousPage) {
    case 'search':
      return 'Back to Search';
    case 'favorites':
      return 'Back to Favorites';
    case 'marketplace':
      return 'Back to Marketplace';
    default:
      return 'Back';
  }
}

export function CanonicalAssetDetailsRoute({
  assetId,
  onBack,
  onNavigateToSeller,
  previousPage,
}: CanonicalAssetDetailsRouteProps) {
  const [assets, setAssets] = useState<MarketplaceAsset[]>(() => loadMarketplaceCatalogSync());
  const [isHydrating, setIsHydrating] = useState<boolean>(false);

  const syncAssets = useCallback(() => {
    setAssets(loadMarketplaceCatalogSync());
  }, []);

  const refreshCatalog = useCallback(async () => {
    setIsHydrating(true);
    try {
      await hydrateMarketplaceCatalogFromSupabase();
      syncAssets();
    } finally {
      setIsHydrating(false);
    }
  }, [syncAssets]);

  useEffect(() => {
    syncAssets();

    if (typeof window === 'undefined') return undefined;

    let cancelled = false;
    const handleSync = () => {
      if (cancelled) return;
      syncAssets();
    };

    window.addEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, handleSync as EventListener);
    void refreshCatalog();

    return () => {
      cancelled = true;
      window.removeEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, handleSync as EventListener);
    };
  }, [assetId, refreshCatalog, syncAssets]);

  const asset = useMemo(
    () => (assetId ? getMarketplaceCatalogAssetById(assetId, assets) : undefined),
    [assetId, assets]
  );

  if (asset) {
    return (
      <AssetDetailsModal
        asset={asset}
        onClose={onBack || (() => undefined)}
        onNavigateToSeller={onNavigateToSeller}
      />
    );
  }

  const backLabel = getBackLabel(previousPage);

  return (
    <div className="h-full overflow-y-auto bg-ui-page text-ui-secondary">
      <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-8 py-16">
        <div className="w-full rounded-[28px] border border-[var(--color-panel-border)] bg-[rgba(255,255,255,0.03)] p-8 text-center shadow-[0_24px_60px_-32px_rgba(0,0,0,0.8)] backdrop-blur-[18px]">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-panel-border)] bg-[rgba(255,255,255,0.04)] text-primary">
            <PackageSearch size={28} />
          </div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-500">
            Canonical Asset Detail
          </p>
          <h1 className="mb-3 text-3xl font-black text-white">
            {isHydrating ? 'Loading Asset' : 'Asset Not Found'}
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-sm leading-7 text-zinc-400">
            {isHydrating
              ? 'Refreshing the marketplace catalog from the canonical projection.'
              : 'This asset does not exist in the live marketplace catalog. Mock asset detail fallback has been removed to prevent mapping drift.'}
          </p>

          <div className="mb-8 rounded-2xl border border-[var(--color-panel-border)] bg-black/20 px-5 py-4 text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">
              Requested Asset
            </p>
            <p className="mt-2 break-all font-mono text-sm text-white">
              {assetId || 'No asset selected'}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => onBack?.()}
              className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl border border-[var(--color-panel-border)] bg-[rgba(255,255,255,0.04)] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[rgba(255,255,255,0.08)]"
            >
              <ArrowLeft size={16} />
              {backLabel}
            </button>
            <button
              type="button"
              onClick={() => void refreshCatalog()}
              disabled={isHydrating}
              className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary-custom)] px-5 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={isHydrating ? 'animate-spin' : ''} />
              {isHydrating ? 'Refreshing...' : 'Refresh Catalog'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
