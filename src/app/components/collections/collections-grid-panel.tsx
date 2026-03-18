import { FolderPlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { CollectionCard } from '@/app/components/collection-card';
import type { CollectionSummary } from '@/types/collection';

interface CollectionsGridPanelProps {
  title: string;
  subtitle?: string;
  collections: CollectionSummary[];
  actionLabel?: string;
  emptyTitle: string;
  emptyDescription: string;
  headerActions?: ReactNode;
  onCollectionClick?: (collectionId: string) => void;
}

export function CollectionsGridPanel({
  title,
  subtitle,
  collections,
  actionLabel = 'View Collection',
  emptyTitle,
  emptyDescription,
  headerActions,
  onCollectionClick,
}: CollectionsGridPanelProps) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-ui-primary">
            {title}
            <span className="ml-2 text-sm font-normal text-ui-secondary">({collections.length})</span>
          </h3>
          {subtitle ? <p className="mt-1 text-sm text-ui-secondary">{subtitle}</p> : null}
        </div>
        {headerActions}
      </div>

      {collections.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-5)]">
            <FolderPlus size={40} className="text-ui-muted" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-ui-primary">{emptyTitle}</h3>
          <p className="mx-auto max-w-md text-sm text-ui-secondary">{emptyDescription}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <div key={collection.id} className="flex justify-start">
              <CollectionCard
                collection={collection}
                viewMode="grid"
                actionLabel={actionLabel}
                onClick={onCollectionClick}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
