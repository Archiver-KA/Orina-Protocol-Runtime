import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Layers3, RefreshCw, Shield, Tag } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { EmptyStateCard } from '@/app/components/ui/empty-state-card';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { COLLECTIONS_SYNC_EVENT, loadCollectionDetailsById } from '@/utils/collectionsUtils';
import { getCategoryDisplayLabel } from '@/utils/taxonomy';
import { formatUserDisplayName, loadUserProfile, shortenAddress } from '@/utils/profileUtils';
import type { CollectionDetails } from '@/types/collection';
import { navigateToMarketplaceCategory } from '@/utils/appNavigation';

interface CollectionDetailsRouteProps {
  collectionId: string | null;
  onBack?: () => void;
  onNavigateToAsset?: (assetId: string, fromPage?: string) => void;
  onNavigateToOwnerProfile?: (walletAddress: string) => void;
}

function formatMetaLabel(value?: string) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export function CollectionDetailsRoute({
  collectionId,
  onBack,
  onNavigateToAsset,
  onNavigateToOwnerProfile,
}: CollectionDetailsRouteProps) {
  const [collection, setCollection] = useState<CollectionDetails | null>(() => (
    collectionId ? loadCollectionDetailsById(collectionId) || null : null
  ));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshCollection = useCallback(() => {
    if (!collectionId) {
      setCollection(null);
      return;
    }
    setCollection(loadCollectionDetailsById(collectionId) || null);
  }, [collectionId]);

  useEffect(() => {
    refreshCollection();
  }, [refreshCollection]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleSync = () => {
      refreshCollection();
      setIsRefreshing(false);
    };

    window.addEventListener(COLLECTIONS_SYNC_EVENT, handleSync as EventListener);
    return () => {
      window.removeEventListener(COLLECTIONS_SYNC_EVENT, handleSync as EventListener);
    };
  }, [refreshCollection]);

  const ownerProfile = useMemo(
    () => (collection ? loadUserProfile(collection.ownerWallet) : null),
    [collection]
  );

  if (!collectionId) {
    return (
      <div className="h-full overflow-y-auto bg-ui-page text-ui-secondary">
        <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center px-6 py-10 sm:px-8 sm:py-14">
          <EmptyStateCard
            icon={<Layers3 size={30} className="text-ui-muted" />}
            title="No collection selected"
            description="Open a collection from Marketplace, Search, or Profile to view its public detail page."
            className="rounded-[32px] py-20"
          />
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="h-full overflow-y-auto bg-ui-page text-ui-secondary">
        <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center px-6 py-10 sm:px-8 sm:py-14">
          <StudioPanel className="rounded-[32px] p-8 sm:p-10">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ui-muted">Collection Details</p>
              <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.03em] text-ui-primary">Collection not available</h1>
              <p className="mt-4 text-sm leading-7 text-ui-secondary">
                This collection is not available in the current client-side catalog yet. Refresh the collection cache or return to Marketplace.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <StudioActionButton type="button" variant="secondary" size="lg" onClick={() => onBack?.()}>
                  <ArrowLeft size={16} />
                  Back
                </StudioActionButton>
                <StudioActionButton
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    setIsRefreshing(true);
                    refreshCollection();
                  }}
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  Refresh
                </StudioActionButton>
              </div>
            </div>
          </StudioPanel>
        </div>
      </div>
    );
  }

  const ownerDisplayName = formatUserDisplayName(ownerProfile?.displayName, collection.ownerWallet);
  const ownerHandle = ownerProfile?.username || shortenAddress(collection.ownerWallet);

  return (
    <div className="h-full overflow-y-auto bg-ui-page text-ui-secondary">
      <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col px-6 py-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <StudioActionButton type="button" variant="secondary" size="lg" onClick={() => onBack?.()}>
            <ArrowLeft size={16} />
            Back
          </StudioActionButton>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateToMarketplaceCategory({ category: collection.category })}
              className="inline-flex items-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ui-secondary transition-colors hover:border-[#2CC295]/24 hover:bg-[#2CC295]/10 hover:text-[#2CC295]"
            >
              {getCategoryDisplayLabel(collection.category)}
            </button>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[32px] border border-white/8 bg-black">
          <div className="absolute inset-0">
            <ImageWithFallback src={collection.coverImage} alt={collection.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,9,14,0.2)_0%,rgba(5,9,14,0.26)_25%,rgba(5,9,14,0.68)_70%,rgba(5,9,14,0.94)_100%)]" />
          </div>

          <div className="relative z-[1] flex min-h-[340px] flex-col justify-end p-7 sm:p-8 lg:min-h-[380px] lg:p-10">
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/82">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/28 px-3 py-1 backdrop-blur-md">
                <Shield size={12} className="text-[#2CC295]" />
                {ownerDisplayName}
              </span>
              <span className="text-white/58">{ownerHandle}</span>
            </div>

            <h1 className="mt-5 max-w-4xl text-[34px] font-semibold leading-none tracking-[-0.04em] text-white sm:text-[44px]">
              {collection.name}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/78">
              {collection.bio || collection.description}
            </p>

            {collection.tags.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {collection.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/28 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-md"
                  >
                    <Tag size={12} />
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_320px]">
          <div className="space-y-6">
            <StudioPanel className="rounded-[28px] bg-[var(--t-surface-2)] p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ui-muted">Collection Assets</p>
                  <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-ui-primary">
                    {collection.assets.length} asset{collection.assets.length === 1 ? '' : 's'}
                  </h2>
                </div>
                <p className="max-w-sm text-sm leading-6 text-ui-secondary">
                  Public route for this collection with direct links to asset detail pages and curator profile context.
                </p>
              </div>

              {collection.assets.length === 0 ? (
                <div className="mt-6">
                  <EmptyStateCard
                    icon={<Layers3 size={26} className="text-ui-muted" />}
                    title="No collection assets yet"
                    description="This collection has not published any assets in the current client catalog."
                    className="rounded-[24px] py-16"
                  />
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {collection.assets.map((asset) => {
                    const metaLabel = formatMetaLabel(asset.blockchain || asset.status);
                    return (
                      <button
                        type="button"
                        key={asset.id}
                        onClick={() => onNavigateToAsset?.(asset.id, 'collection-details')}
                        className="flex w-full items-center gap-4 rounded-[22px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-4 text-left transition-colors hover:bg-[var(--t-surface-10)]"
                      >
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[18px] bg-black/10">
                          <ImageWithFallback src={asset.image} alt={asset.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ui-muted">
                            {getCategoryDisplayLabel(asset.category)}
                          </p>
                          <h3 className="mt-1 line-clamp-2 text-[16px] font-semibold text-ui-primary">
                            {asset.name}
                          </h3>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ui-secondary">
                            <span>{asset.price}</span>
                            <span className="rounded-full bg-[var(--t-surface-10)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ui-muted">
                              {asset.sourceLabel}
                            </span>
                            {metaLabel ? (
                              <span className="rounded-full bg-[var(--t-surface-10)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ui-muted">
                                {metaLabel}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </StudioPanel>
          </div>

          <div className="space-y-4">
            <StudioPanel className="rounded-[28px] bg-[var(--t-surface-2)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ui-muted">Collection Stats</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'Items', value: String(collection.itemCount) },
                  { label: 'Floor', value: collection.floorPrice },
                  { label: 'Volume', value: collection.volume },
                  { label: 'Followers', value: String(collection.followerCount) },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[18px] bg-[var(--t-surface-5)] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ui-muted">{stat.label}</p>
                    <p className="mt-2 text-lg font-semibold text-ui-primary">{stat.value}</p>
                  </div>
                ))}
              </div>
            </StudioPanel>

            <StudioPanel className="rounded-[28px] bg-[var(--t-surface-2)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ui-muted">Curator</p>
              <button
                type="button"
                onClick={() => onNavigateToOwnerProfile?.(collection.ownerWallet)}
                className="mt-4 w-full rounded-[20px] bg-[var(--t-surface-5)] p-4 text-left transition-colors hover:bg-[var(--t-surface-10)]"
              >
                <p className="text-sm font-semibold text-ui-primary">{ownerDisplayName}</p>
                <p className="mt-1 text-xs text-ui-secondary">{ownerHandle}</p>
                <p className="mt-3 text-xs leading-5 text-ui-secondary">
                  Open the curator profile to review reputation, marketplace history, and other published collections.
                </p>
              </button>
            </StudioPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
