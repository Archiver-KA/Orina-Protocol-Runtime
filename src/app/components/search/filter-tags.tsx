import { X } from 'lucide-react';
import { SearchFilters } from '@/types/search';
import { motion, AnimatePresence } from 'motion/react';

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
      label: category.charAt(0).toUpperCase() + category.slice(1),
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

  // Blockchain tags
  filters.blockchains.forEach((blockchain) => {
    tags.push({
      key: 'blockchain',
      value: blockchain,
      label: blockchain.charAt(0).toUpperCase() + blockchain.slice(1),
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
    <div className="flex items-center gap-4">
      <h2 className="text-ui-muted font-bold text-[11px] uppercase tracking-widest shrink-0">
        Active Filters:
      </h2>
      <div className="flex flex-wrap gap-2 items-center">
        <AnimatePresence mode="popLayout">
          {tags.map((tag, index) => (
            <motion.div
              key={`${tag.key}-${tag.value}-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-2 bg-[#2CC295]/10 border border-[#2CC295]/20 rounded-lg px-3 py-1.5 group cursor-pointer hover:border-[#2CC295]/40 transition-all"
              onClick={() => onRemoveFilter(tag.key, tag.value)}
            >
              <span className="text-[#2CC295] text-sm font-medium">{tag.label}</span>
              <X size={14} className="text-[#2CC295]/60 group-hover:text-[#2CC295]" />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {tags.length > 1 && (
          <button
            onClick={onClearAll}
            className="text-[10px] text-ui-muted hover:text-[#2CC295] transition-colors uppercase font-bold tracking-widest ml-2"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
