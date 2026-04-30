import { Heart } from 'lucide-react';
import type { MouseEvent } from 'react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import type { CollectionSummary } from '@/types/collection';
import { getCategoryDisplayLabel } from '@/utils/taxonomy';
import { navigateToMarketplaceCategory } from '@/utils/appNavigation';

interface CollectionCardProps {
  collection: CollectionSummary;
  viewMode: 'grid' | 'list';
  isLiked?: boolean;
  onLike?: (collectionId: string) => void;
  onClick?: (collectionId: string) => void;
  actionLabel?: string;
  statusLabel?: string;
}

function formatCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
}

function shortenWallet(value?: string): string {
  if (!value) return 'Unknown curator';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function CollectionCard({
  collection,
  viewMode,
  isLiked = false,
  onLike,
  onClick,
  actionLabel = 'View Collection',
  statusLabel,
}: CollectionCardProps) {
  const handleCardClick = () => {
    onClick?.(collection.id);
  };

  const handleLike = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onLike?.(collection.id);
  };

  const handleActionClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    handleCardClick();
  };

  const handleCategoryClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    navigateToMarketplaceCategory({ category: collection.category });
  };

  const containerClass =
    'market-card-shell card-hover-shell group w-full cursor-pointer overflow-hidden rounded-[var(--t-card-radius-xl)] text-left';
  const likeButtonClass =
    'flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-black/35 text-white/80 backdrop-blur-md transition-colors hover:bg-black/45 hover:text-white';
  const statLabelClass = 'text-[8px] font-semibold uppercase tracking-[0.14em] text-white/62';
  const statValueClass = 'mt-1 text-[12px] font-semibold text-white';

  const stats = (
    <div className="grid grid-cols-4 gap-2">
      <div className="min-w-0 text-center">
        <p className={statLabelClass}>Items</p>
        <p className={statValueClass}>{formatCount(collection.itemCount)}</p>
      </div>
      <div className="min-w-0 text-center">
        <p className={statLabelClass}>Floor</p>
        <p className={statValueClass}>{collection.floorPrice}</p>
      </div>
      <div className="min-w-0 text-center">
        <p className={statLabelClass}>Volume</p>
        <p className={statValueClass}>{collection.volume}</p>
      </div>
      <div className="min-w-0 text-center">
        <p className={statLabelClass}>Likes</p>
        <p className={statValueClass}>{formatCount(collection.likedCount)}</p>
      </div>
    </div>
  );

  const media = (
    <div className="relative h-full w-full overflow-hidden bg-[var(--t-surface-10)]">
      <ImageWithFallback src={collection.coverImage} alt={collection.name} className="card-hover-media h-full w-full object-cover" />
      <div className="card-hover-overlay card-cover-ambient absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-[128px] bg-[linear-gradient(180deg,rgba(6,8,11,0)_0%,rgba(6,8,11,0.08)_28%,rgba(6,8,11,0.44)_100%)]" />

      <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCategoryClick}
              className="inline-flex items-center rounded-full border border-white/12 bg-black/35 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/88 backdrop-blur-md transition-colors hover:border-[#2CC295]/28 hover:bg-[#2CC295]/14 hover:text-[#7ae6c5]"
            >
              {getCategoryDisplayLabel(collection.category)}
            </button>
            {statusLabel ? (
              <span className="inline-flex items-center rounded-full border border-[#2CC295]/24 bg-[#2CC295]/14 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#7ae6c5] backdrop-blur-md">
                {statusLabel}
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 line-clamp-2 max-w-[18rem] text-[18px] font-semibold leading-[1.18] tracking-[-0.02em] text-white">
            {collection.name}
          </h3>
        </div>

        <button type="button" onClick={handleLike} className={likeButtonClass}>
          <Heart size={16} className={isLiked ? 'fill-red-500 text-red-500' : ''} />
        </button>
      </div>

      <div className="absolute inset-x-4 bottom-5">
        {stats}
      </div>
    </div>
  );

  const footer = (
    <div className="mt-auto flex flex-col gap-4 pt-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Curated By</p>
        <p className="mt-1 truncate text-[13px] text-ui-secondary">{shortenWallet(collection.ownerWallet)}</p>
      </div>

      <StudioActionButton type="button" variant="secondary" size="md" onClick={handleActionClick} className="min-w-[160px]">
        {actionLabel}
      </StudioActionButton>
    </div>
  );

  if (viewMode === 'grid') {
    return (
      <div
        onClick={handleCardClick}
        className={`${containerClass} card-hover-grid collection-card-grid flex h-full flex-col`}
      >
        <div className="h-[var(--t-market-collection-media-h)]">
          {media}
        </div>

        <div className="market-card-info-area flex flex-1 flex-col px-5 pb-5 pt-4">
          <p className="line-clamp-2 text-[13px] leading-5 text-ui-secondary">
            {collection.description || 'Curated collection with verified ownership metadata and live marketplace performance.'}
          </p>

          {footer}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleCardClick}
      className={`${containerClass} card-hover-list collection-card-list flex flex-col lg:h-[var(--t-market-collection-list-h)] lg:flex-row`}
    >
      <div className="h-[var(--t-market-collection-media-h)] shrink-0 lg:h-full lg:w-[var(--t-market-collection-media-w)]">
        {media}
      </div>

      <div className="market-card-info-area flex min-w-0 flex-1 flex-col px-5 pb-5 pt-4 lg:px-6 lg:py-5">
        <p className="line-clamp-3 max-w-[32rem] text-[13px] leading-5 text-ui-secondary">
          {collection.description || 'Curated collection with verified ownership metadata and live marketplace performance.'}
        </p>

        {footer}
      </div>
    </div>
  );
}
