import { ChevronDown, ChevronUp, Shield, X } from 'lucide-react';
import { useState } from 'react';
import { SearchFilters } from '@/types/search';
import { ToggleSwitch } from '@/app/components/ui/toggle-switch';
import { preventInvalidNumberKeyDown } from '@/utils/numericInput';

interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  resultCount: number;
  totalCount: number;
}

export function FilterPanel({ filters, onFiltersChange, resultCount, totalCount }: FilterPanelProps) {
  const categories = getAllCategories();
  const blockchains = getAllBlockchains();

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'date-desc', label: 'Newest First' },
    { value: 'date-asc', label: 'Oldest First' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'popularity', label: 'Most Popular' },
    { value: 'name-asc', label: 'Name: A-Z' },
    { value: 'name-desc', label: 'Name: Z-A' },
  ];

  const handleCategoryToggle = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const handleBlockchainToggle = (blockchain: string) => {
    const newBlockchains = filters.blockchains.includes(blockchain)
      ? filters.blockchains.filter((b) => b !== blockchain)
      : [...filters.blockchains, blockchain];
    
    onFiltersChange({ ...filters, blockchains: newBlockchains });
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    onFiltersChange({
      ...filters,
      priceRange: {
        ...filters.priceRange,
        [type]: numValue,
      },
    });
  };

  const handleSortChange = (sortBy: SortOption) => {
    onFiltersChange({ ...filters, sortBy });
  };

  const handleVerifiedToggle = () => {
    onFiltersChange({ ...filters, verifiedOnly: !filters.verifiedOnly });
  };

  const handleReset = () => {
    onFiltersChange({
      query: filters.query, // Keep search query
      categories: [],
      priceRange: { min: null, max: null },
      blockchains: [],
      verifiedOnly: false,
      sortBy: 'date-desc',
    });
  };

  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-[#141417] border-r border-zinc-800 h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-[#2CC295]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Filters</h3>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-zinc-500 hover:text-[#2CC295] transition-colors font-bold"
          >
            Reset All
          </button>
        </div>

        {/* Result Count */}
        <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <p className="text-xs text-zinc-400">
            Showing <span className="text-[#2CC295] font-bold">{resultCount}</span> of{' '}
            <span className="font-bold">{totalCount}</span> results
          </p>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
            Sort By
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#2CC295] transition-colors"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
            Category
          </label>
          <div className="space-y-2">
            {categories.map((category) => (
              <label
                key={category}
                className="flex items-center justify-between cursor-pointer group p-2 rounded-lg hover:bg-zinc-900/30 transition-colors"
              >
                <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">
                  {category}
                </span>
                <ToggleSwitch
                  checked={filters.categories.includes(category)}
                  onChange={() => handleCategoryToggle(category)}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <DollarSign size={14} />
            Price Range (ETH)
          </label>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Minimum</label>
              <input
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                placeholder="0.0"
                value={filters.priceRange.min ?? ''}
                onChange={(e) => handlePriceChange('min', e.target.value)}
                onKeyDown={preventInvalidNumberKeyDown}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2CC295] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Maximum</label>
              <input
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                placeholder="∞"
                value={filters.priceRange.max ?? ''}
                onChange={(e) => handlePriceChange('max', e.target.value)}
                onKeyDown={preventInvalidNumberKeyDown}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2CC295] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Blockchain */}
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
            Blockchain
          </label>
          <div className="space-y-2">
            {blockchains.map((blockchain) => (
              <label
                key={blockchain}
                className="flex items-center justify-between cursor-pointer group p-2 rounded-lg hover:bg-zinc-900/30 transition-colors"
              >
                <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">
                  {blockchain}
                </span>
                <ToggleSwitch
                  checked={filters.blockchains.includes(blockchain)}
                  onChange={() => handleBlockchainToggle(blockchain)}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Verified Only */}
        <div>
          <label className="flex items-center justify-between cursor-pointer group p-3 bg-zinc-900/30 rounded-lg border border-zinc-800 hover:border-[#2CC295]/30 transition-colors">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-green-400" />
              <div>
                <p className="text-sm font-bold text-white">Verified Only</p>
                <p className="text-xs text-zinc-500">Show only verified assets</p>
              </div>
            </div>
            <ToggleSwitch
              checked={filters.verifiedOnly}
              onChange={handleVerifiedToggle}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
