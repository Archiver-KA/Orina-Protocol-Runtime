import { Heart } from 'lucide-react';
import type { MouseEvent } from 'react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import type { CollectionSummary } from '@/types/collection';

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

  const likeButtonClass =
    'flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/80 backdrop-blur-md transition-colors hover:bg-black/55 hover:text-white';

  const actionButtonClass =
    'h-[46px] w-full rounded-full border border-white/25 bg-white/12 text-[13px] font-semibold tracking-[0.02em] text-white transition-colors hover:bg-white/18';

  const overlayContent = (
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/58 to-transparent px-5 pb-5 pt-16">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="line-clamp-1 text-[22px] font-extrabold leading-[1.15] tracking-[-0.02em] text-white">
            {collection.name}
          </h3>
          <div className="mt-3 flex items-center gap-6">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/55">Items</p>
              <p className="mt-0.5 text-[13px] font-bold text-white">{formatCount(collection.itemCount)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/55">Floor</p>
              <p className="mt-0.5 text-[13px] font-bold text-[#2CC295]">{collection.floorPrice}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/55">Volume</p>
              <p className="mt-0.5 text-[13px] font-bold text-white">{collection.volume}</p>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCardClick}
        className={`${actionButtonClass} mt-4`}
      >
        {actionLabel}
      </button>
    </div>
  );

  if (viewMode === 'grid') {
    return (
      <div
        onClick={handleCardClick}
        className="collection-card-grid group relative w-full overflow-hidden rounded-[24px] bg-[var(--t-surface-2)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.18)] cursor-pointer"
      >
        <div className="relative h-[278px] w-full overflow-hidden bg-black">
          <ImageWithFallback src={collection.coverImage} alt={collection.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0)_40%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.85)_100%)]" />

          <div className="absolute left-4 top-4 inline-flex items-center rounded-full border border-white/18 bg-black/55 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur-md">
            {collection.category}
          </div>

          <button type="button" onClick={handleLike} className={`${likeButtonClass} absolute right-4 top-4`}>
            <Heart size={16} className={isLiked ? 'fill-red-500 text-red-500' : ''} />
          </button>

          {statusLabel ? (
            <div className="absolute right-4 top-[58px] inline-flex items-center rounded-full border border-[#2CC295]/25 bg-[#2CC295]/15 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#2CC295] backdrop-blur-md">
              {statusLabel}
            </div>
          ) : null}

          {overlayContent}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleCardClick}
      className="collection-card-list group flex w-full cursor-pointer flex-col overflow-hidden rounded-[24px] bg-[var(--t-surface-2)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.18)] lg:h-[278px] lg:flex-row"
    >
      <div className="relative h-[278px] shrink-0 overflow-hidden bg-black lg:w-[370px]">
        <ImageWithFallback src={collection.coverImage} alt={collection.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0.1)_100%)]" />
        <div className="absolute left-4 top-4 inline-flex items-center rounded-full border border-white/18 bg-black/55 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur-md">
          {collection.category}
        </div>
        <button type="button" onClick={handleLike} className={`${likeButtonClass} absolute right-4 top-4`}>
          <Heart size={16} className={isLiked ? 'fill-red-500 text-red-500' : ''} />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ui-muted">
            {collection.category}
          </span>
          {statusLabel ? (
            <span className="rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#2CC295]">
              {statusLabel}
            </span>
          ) : null}
        </div>

        <h3 className="mt-4 line-clamp-1 text-[22px] font-extrabold leading-[1.15] tracking-[-0.02em] text-ui-primary">
          {collection.name}
        </h3>
        <p className="mt-3 line-clamp-3 max-w-[32rem] text-sm leading-6 text-ui-secondary">
          {collection.description}
        </p>

        <div className="mt-auto flex flex-col gap-5 pt-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ui-muted">Items</p>
              <p className="mt-1 text-[13px] font-bold text-ui-primary">{formatCount(collection.itemCount)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ui-muted">Floor</p>
              <p className="mt-1 text-[13px] font-bold text-primary">{collection.floorPrice}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ui-muted">Volume</p>
              <p className="mt-1 text-[13px] font-bold text-ui-primary">{collection.volume}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCardClick}
            className="h-[46px] min-w-[210px] rounded-full border border-ui-border bg-ui-input px-8 text-[13px] font-semibold tracking-[0.02em] text-ui-primary transition-colors hover:bg-[var(--t-surface-hover)]"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
