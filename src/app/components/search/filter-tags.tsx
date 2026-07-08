import { X } from 'lucide-react';
import { SearchFilters } from '@/types/search';
import { motion, AnimatePresence } from 'motion/react';
import { getMarketplaceNetworkFilterOptionLabel } from '@/utils/marketplaceNetwork';
import { getCategoryDisplayLabel } from '@/utils/taxonomy';

interface FilterTagsProps {
  filters: SearchFilters;
  onRemoveFilter: (key: string, value?: any) => void;
  onClearAll: () => void;
}

export function FilterTags({ filters, onRemoveFilter, onClearAll }: FilterTagsProps) {
  const tags: Array<{ key: string; value: any; label: string }> = [];

  // Query tag
  if (filters.query.trim()) {
    tags.push({
      key: 'query',
      value: filters.query,
      label: `"${filters.query}"`,
    });
  }

  // Category tags
  filters.categories.forEach((category) => {
    tags.push({
      key: 'category',
      value: category,
      label: getCategoryDisplayLabel(category),
    });
  });

  // Price range tags
  if (filters.priceRange.min !== null) {
    tags.push({
      key: 'priceMin',
      value: filters.priceRange.min,
      label: `Min: ${filters.priceRange.min} ETH`,
    });
  }
  if (filters.priceRange.max !== null) {
    tags.push({
      key: 'priceMax',
      value: filters.priceRange.max,
      label: `Max: ${filters.priceRange.max} ETH`,
    });
  }

  // Network tags
  filters.blockchains.forEach((network) => {
    tags.push({
      key: 'network',
      value: network,
      label: getMarketplaceNetworkFilterOptionLabel(network),
    });
  });

  // Verified tag
  if (filters.verifiedOnly) {
    tags.push({
      key: 'verified',
      value: true,
      label: 'Verified Only',
    });
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2 shrink-0">
        <h2 className="text-ui-muted font-semibold text-[10px] uppercase tracking-[0.18em]">
          Active Filters
        </h2>
        <span className="inline-flex items-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-2.5 py-1 text-[10px] font-semibold text-ui-primary">
          {tags.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <AnimatePresence mode="popLayout">
          {tags.map((tag, index) => (
            <motion.div
              key={`${tag.key}-${tag.value}-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 group cursor-pointer transition-all ${
                tag.key === 'query'
                  ? 'bg-[var(--t-accent-bg)] border-[var(--t-accent-border)] hover:border-[var(--t-accent-border-strong)]'
                  : 'bg-[var(--t-surface-2)] border-ui-border-subtle hover:border-[var(--t-accent-border)] hover:bg-[var(--t-surface-5)]'
              }`}
              onClick={() => onRemoveFilter(tag.key, tag.value)}
            >
              <span className={`text-sm font-medium ${tag.key === 'query' ? 'text-[var(--t-accent-text)]' : 'text-ui-primary'}`}>
                {tag.label}
              </span>
              <X
                size={14}
                className={tag.key === 'query' ? 'text-[var(--t-accent-text)] opacity-60 group-hover:opacity-100' : 'text-ui-muted group-hover:text-ui-primary'}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {tags.length > 1 && (
          <button
            onClick={onClearAll}
            className="rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-4 py-2 text-[10px] text-ui-secondary hover:text-ui-primary hover:bg-[var(--t-surface-5)] transition-colors uppercase font-semibold tracking-[0.18em]"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
