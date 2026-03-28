import { Clock3, FileStack, Pencil, Trash2 } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import type { MintingDraftRecord } from '@/utils/mintingDrafts';

interface MintingDraftsListProps {
  drafts: MintingDraftRecord[];
  onEdit: (draftId: string) => void;
  onDelete: (draftId: string) => void;
}

function formatUpdatedAt(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m ago`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))}h ago`;
  return `${Math.max(1, Math.floor(diff / day))}d ago`;
}

export function MintingDraftsList({
  drafts,
  onEdit,
  onDelete,
}: MintingDraftsListProps) {
  if (drafts.length === 0) {
    return (
      <div className="rounded-[24px] bg-ui-card p-10 text-center backdrop-blur-[10px]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ui-input text-ui-muted">
          <FileStack size={26} />
        </div>
        <h3 className="mt-5 text-xl font-bold text-ui-primary">No drafts saved yet</h3>
        <p className="mt-2 text-sm text-ui-muted">
          Save an in-progress RWA or NFT here to continue editing later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {drafts.map((draft) => (
        <button
          key={draft.id}
          type="button"
          onClick={() => onEdit(draft.id)}
          className="group flex w-full items-center gap-4 rounded-[24px] bg-[var(--t-surface-5)] p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-[var(--t-surface-10)]"
        >
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[18px] bg-ui-input">
            {draft.previewImage ? (
              <ImageWithFallback
                src={draft.previewImage}
                alt={draft.name || `${draft.assetType} draft`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ui-muted">
                <FileStack size={22} />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                {draft.assetType}
              </span>
              <span className="rounded-full bg-ui-input px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ui-secondary">
                {draft.category || 'uncategorized'}
              </span>
              <span className="rounded-full bg-ui-input px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ui-secondary">
                {draft.completeness}% complete
              </span>
            </div>

            <h3 className="mt-3 truncate text-lg font-bold text-ui-primary">
              {draft.name || `${draft.assetType} Untitled Draft`}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-ui-muted">
              {draft.description || 'No description yet.'}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ui-secondary">
              <span>
                {draft.price ? `${draft.price} ${draft.priceCurrency}` : `0 ${draft.priceCurrency || 'ETH'}`}
              </span>
              <span>{draft.totalAmount || '0'} units</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={12} className="text-primary" />
                {formatUpdatedAt(draft.updatedAt)}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(draft.id);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--t-surface-5)] text-ui-secondary transition-colors hover:bg-[var(--t-surface-10)] hover:text-ui-primary"
              aria-label={`Edit ${draft.name || 'draft'}`}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(draft.id);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--t-surface-5)] text-ui-secondary transition-colors hover:bg-[rgba(239,68,68,0.1)] hover:text-red-400"
              aria-label={`Delete ${draft.name || 'draft'}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </button>
      ))}
    </div>
  );
}
