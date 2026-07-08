import { useEffect, useRef } from 'react';
import { Search, Command as CommandIcon, Clock } from 'lucide-react';
import { SearchResult } from '@/types/command';
import { motion, AnimatePresence } from 'motion/react';

interface CommandPaletteProps {
  isOpen: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedIndex: number;
  searchResults: SearchResult[];
  onClose: () => void;
}

export function CommandPalette({
  isOpen,
  searchQuery,
  setSearchQuery,
  selectedIndex,
  searchResults,
  onClose,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const handleResultClick = (result: SearchResult) => {
    result.action();
    onClose();
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'asset':
        return '💎';
      case 'user':
        return '👤';
      case 'page':
        return '📄';
      case 'command':
        return '⚡';
      default:
        return '•';
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'asset':
        return 'Asset';
      case 'user':
        return 'User';
      case 'page':
        return 'Page';
      case 'command':
        return 'Command';
      default:
        return '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[20vh] left-1/2 -translate-x-1/2 w-full max-w-2xl z-[101]"
          >
            <div className="mx-4 overflow-hidden rounded-xl border border-ui-border-subtle bg-[var(--t-dropdown-glass-bg)] shadow-2xl backdrop-blur-[18px]">
              {/* Search Input */}
              <div className="flex items-center gap-3 border-b border-ui-border-subtle px-4 py-4">
                <Search size={20} className="flex-shrink-0 text-ui-muted" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search or type a command..."
                  className="flex-1 bg-transparent text-base text-ui-primary placeholder:text-ui-muted outline-none"
                />
                <div className="flex items-center gap-1.5">
                  <kbd className="rounded border border-ui-border-subtle bg-[var(--t-surface-5)] px-2 py-1 text-xs text-ui-secondary">
                    ESC
                  </kbd>
                  <span className="text-xs text-ui-muted">to close</span>
                </div>
              </div>

              {/* Results */}
              <div
                ref={resultsRef}
                className="max-h-[400px] overflow-y-auto custom-scrollbar"
              >
                {searchResults.length > 0 ? (
                  <div className="py-2">
                    {/* Group by type */}
                    {searchQuery && (
                      <div className="px-3 py-2 text-xs font-semibold uppercase text-ui-muted">
                        Results ({searchResults.length})
                      </div>
                    )}
                    
                    {!searchQuery && searchResults.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase text-ui-muted">
                        <Clock size={14} />
                        Recent
                      </div>
                    )}

                    {searchResults.map((result, index) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left ${
                          index === selectedIndex
                            ? 'border-l-2 border-[var(--t-accent)] bg-[var(--t-accent-bg)]'
                            : 'border-l-2 border-transparent hover:bg-[var(--t-surface-hover)]'
                        }`}
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0 text-xl">
                          {result.icon || getTypeIcon(result.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium truncate ${
                              index === selectedIndex ? 'text-ui-primary' : 'text-ui-secondary'
                            }`}>
                              {result.title}
                            </span>
                            <span className="flex-shrink-0 text-xs text-ui-muted">
                              {getTypeLabel(result.type)}
                            </span>
                          </div>
                          {result.subtitle && (
                            <p className="truncate text-xs text-ui-muted">
                              {result.subtitle}
                            </p>
                          )}
                        </div>

                        {/* Enter hint */}
                        {index === selectedIndex && (
                          <kbd className="flex-shrink-0 rounded border border-ui-border-subtle bg-[var(--t-surface-5)] px-2 py-1 text-xs text-ui-secondary">
                            ↵
                          </kbd>
                        )}
                      </button>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="py-12 text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-sm text-ui-secondary">No results found</p>
                    <p className="mt-1 text-xs text-ui-muted">Try a different search term</p>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <div className="text-4xl mb-3">
                      <CommandIcon size={48} className="mx-auto text-ui-muted" />
                    </div>
                    <p className="mb-2 text-sm font-medium text-ui-secondary">Quick Navigation</p>
                    <p className="text-xs text-ui-muted">
                      Type to search pages, assets, or commands
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-ui-border-subtle bg-[var(--t-surface-2)] px-4 py-3">
                <div className="flex items-center gap-4 text-xs text-ui-muted">
                  <div className="flex items-center gap-1.5">
                    <kbd className="rounded border border-ui-border-subtle bg-[var(--t-surface-5)] px-1.5 py-0.5">↑</kbd>
                    <kbd className="rounded border border-ui-border-subtle bg-[var(--t-surface-5)] px-1.5 py-0.5">↓</kbd>
                    <span>Navigate</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="rounded border border-ui-border-subtle bg-[var(--t-surface-5)] px-1.5 py-0.5">↵</kbd>
                    <span>Select</span>
                  </div>
                </div>
                <div className="text-xs text-ui-muted">
                  Powered by Orina
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
