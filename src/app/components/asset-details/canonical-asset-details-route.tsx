import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, PackageSearch, RefreshCw } from 'lucide-react';
import { AssetDetailsModal } from '@/app/components/asset-details-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioPanel } from '@/app/components/ui/studio-panel';
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
  onNavigateToSellerReviews?: (sellerAddress: string) => void;
  onNavigateToSellerMessages?: (sellerAddress: string) => void;
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
  onNavigateToSellerReviews,
  onNavigateToSellerMessages,
  previousPage,
}: CanonicalAssetDetailsRouteProps) {
  const [assets, setAssets] = useState<MarketplaceAsset[]>(() => loadMarketplaceCatalogSync());
  const [isHydrating, setIsHydrating] = useState<boolean>(false);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  const syncAssets = useCallback(() => {
    setAssets(loadMarketplaceCatalogSync());
  }, []);

  const refreshCatalog = useCallback(async () => {
    setIsHydrating(true);
    setHydrateError(null);
    try {
      await hydrateMarketplaceCatalogFromSupabase();
      syncAssets();
    } catch (error) {
      const nextMessage =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : 'The marketplace catalog could not be refreshed.';
      console.error('[CanonicalAssetDetailsRoute] Catalog refresh failed:', error);
      setHydrateError(nextMessage);
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
    if (assetId) {
      void refreshCatalog();
    }

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
        onNavigateToSellerReviews={onNavigateToSellerReviews}
        onNavigateToSellerMessages={onNavigateToSellerMessages}
      />
    );
  }

  const backLabel = getBackLabel(previousPage);
  const catalogCount = assets.length;
  const isInitialLoading = Boolean(assetId) && isHydrating && !catalogCount && !hydrateError;
  const statusEyebrow = !assetId
    ? 'Selection Required'
    : hydrateError
      ? 'Catalog Refresh Failed'
      : isInitialLoading
        ? 'Asset Details'
        : 'Asset Details';
  const statusTitle = !assetId
    ? 'No Asset Selected'
    : hydrateError
      ? 'Unable to Load Asset'
      : isInitialLoading
        ? 'Loading Asset'
        : 'Asset Not Found';
  const statusCopy = !assetId
    ? 'Open an asset from Marketplace, Search, or Favorites to view its details.'
    : hydrateError
      ? 'We could not refresh the marketplace catalog for this asset. You can retry or go back.'
      : isInitialLoading
        ? 'Refreshing the marketplace catalog before opening this asset.'
        : 'This asset is not available in the current marketplace catalog.';
  const StatusIcon = hydrateError ? AlertCircle : PackageSearch;

  return (
    <div className="h-full overflow-y-auto bg-ui-page text-ui-secondary">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center px-6 py-10 sm:px-8 sm:py-14">
        <StudioPanel className="w-full rounded-[32px] p-6 sm:p-8">
          <div className="mx-auto flex max-w-3xl flex-col text-center">
            <div
              className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-ui-border-subtle ${
                hydrateError ? 'bg-[rgba(224,82,82,0.12)] text-[rgba(224,82,82,0.92)]' : 'bg-[var(--t-surface-5)] text-primary'
              }`}
            >
              <StatusIcon size={28} className={isInitialLoading ? 'animate-pulse' : ''} />
            </div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-ui-muted">
              {statusEyebrow}
            </p>
            <h1 className="mb-3 text-[32px] font-semibold tracking-[-0.03em] text-ui-primary sm:text-[38px]">
              {statusTitle}
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-sm leading-7 text-ui-secondary sm:text-[15px]">
              {statusCopy}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.9fr)]">
            <StudioPanel className="rounded-[28px] bg-[var(--t-surface-2)] p-5 text-left shadow-none">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ui-muted">
                Requested Asset
              </p>
              <p className="mt-2 break-all font-mono text-sm text-ui-primary">
                {assetId || 'No asset selected'}
              </p>
              {hydrateError ? (
                <p className="mt-4 rounded-[20px] border border-[rgba(224,82,82,0.22)] bg-[rgba(224,82,82,0.08)] px-4 py-3 text-sm leading-6 text-ui-primary">
                  {hydrateError}
                </p>
              ) : isInitialLoading ? (
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-40 rounded-full bg-[var(--t-surface-10)] animate-pulse" />
                  <div className="h-3 w-full rounded-full bg-[var(--t-surface-10)] animate-pulse" />
                  <div className="h-3 w-5/6 rounded-full bg-[var(--t-surface-10)] animate-pulse" />
                </div>
              ) : null}
            </StudioPanel>

            <div className="grid gap-4">
              <StudioPanel className="rounded-[28px] bg-[var(--t-surface-2)] p-5 shadow-none">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ui-muted">
                  Catalog Snapshot
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ui-primary">
                  {catalogCount.toLocaleString()}
                </p>
                <p className="mt-1 text-sm leading-6 text-ui-secondary">
                  {catalogCount === 1 ? 'asset available locally' : 'assets available locally'}
                </p>
              </StudioPanel>

              <StudioPanel className="rounded-[28px] bg-[var(--t-surface-2)] p-5 shadow-none">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ui-muted">
                  Route State
                </p>
                <p className="mt-2 text-sm font-semibold text-ui-primary">
                  {hydrateError
                    ? 'Catalog refresh failed'
                    : isInitialLoading
                      ? 'Refreshing catalog'
                      : assetId
                        ? 'Catalog loaded, asset unresolved'
                        : 'Awaiting asset selection'}
                </p>
              </StudioPanel>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <StudioActionButton
              type="button"
              onClick={() => onBack?.()}
              variant="secondary"
              size="lg"
              className="min-w-[180px] text-sm font-semibold"
            >
              <ArrowLeft size={16} />
              {backLabel}
            </StudioActionButton>
            <StudioActionButton
              type="button"
              onClick={() => void refreshCatalog()}
              disabled={isHydrating || !assetId}
              variant="primary"
              size="lg"
              className="min-w-[180px] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={isHydrating ? 'animate-spin' : ''} />
              {isHydrating ? 'Refreshing...' : 'Refresh Catalog'}
            </StudioActionButton>
          </div>
        </StudioPanel>
      </div>
    </div>
  );
}
