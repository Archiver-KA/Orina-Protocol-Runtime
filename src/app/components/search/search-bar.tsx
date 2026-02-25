import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { loadSearchHistory, deleteSearchHistoryItem } from '@/utils/searchUtils';
import { SearchHistoryItem } from '@/types/search';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, onSearch, placeholder = 'Search assets...', className = '' }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load search history
  useEffect(() => {
    setSearchHistory(loadSearchHistory());
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value);
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const handleSelectHistory = (query: string) => {
    onChange(query);
    onSearch(query);
    setShowSuggestions(false);
  };

  const handleDeleteHistory = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSearchHistoryItem(query);
    setSearchHistory(loadSearchHistory());
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
  };

  const popularSearches = [
    'Luxury Real Estate',
    'Classic Cars',
    'Fine Art',
    'Vintage Watches',
  ];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className={`
          relative flex items-center transition-all
          ${isFocused ? 'ring-2 ring-[#2CC295]' : ''}
        `}>
          <Search className="absolute left-3 text-zinc-500" size={18} />
          
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            placeholder={placeholder}
            className="bg-zinc-900 border border-[#27272a] rounded-lg pl-10 pr-10 py-2.5 text-sm w-full text-white outline-none transition-all"
          />

          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 p-1 hover:bg-zinc-800 rounded transition-colors"
            >
              <X size={16} className="text-zinc-500" />
            </button>
          )}
        </div>
      </form>

      {/* Search Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (isFocused || value) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-full bg-[#141417] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="border-b border-zinc-800">
                <div className="px-4 py-3 border-b border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Recent Searches
                  </h4>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {searchHistory.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectHistory(item.query)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-900 transition-colors text-left group"
                    >
                      <Clock size={16} className="text-zinc-500" />
                      <span className="flex-1 text-sm text-white">{item.query}</span>
                      <button
                        onClick={(e) => handleDeleteHistory(item.query, e)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 rounded transition-all"
                      >
                        <X size={14} className="text-zinc-500" />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            {!value && (
              <div>
                <div className="px-4 py-3 border-b border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={14} />
                    Popular Searches
                  </h4>
                </div>
                <div>
                  {popularSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectHistory(search)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-900 transition-colors text-left"
                    >
                      <TrendingUp size={16} className="text-[#2CC295]" />
                      <span className="text-sm text-white">{search}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
