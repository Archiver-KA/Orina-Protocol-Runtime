import { Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationCenter } from '@/app/components/notifications/notification-center';
import { WalletConnectButton } from '@/app/components/wallet-connect-button';

interface NavbarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  onSearch?: (query: string) => void;
  isGuest?: boolean;
}

const TRENDING_SEARCHES = [
  { query: 'Luxury Real Estate', count: '1.2k' },
  { query: 'CyberSeries NFT', count: '890' },
  { query: 'Vintage Cars', count: '654' },
  { query: 'Art Collection', count: '421' },
];

const RECENT_SEARCHES = ['Ethereum Land', 'Digital Art', 'Virtual Worlds'];

const POPULAR_CATEGORIES = [
  { name: 'Real Estate', count: 142 },
  { name: 'Collectibles', count: 89 },
  { name: 'Art', count: 67 },
  { name: 'Music', count: 34 },
];

export function Navbar({ activePage, setActivePage, onSearch, isGuest = false }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    onSearch?.(query);
    setActivePage('search');
    setIsSearchOpen(false);
  };

  const handleSuggestionClick = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
    setActivePage('search');
    setIsSearchOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav
      className="relative mt-2.5 mx-2.5 h-[80px] rounded-[24px] px-6 flex items-center gap-4 z-20"
      style={{
        background: 'rgba(18, 18, 18, 1)',
        borderBottom: '0.666667px solid #000000',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      }}
      data-page={activePage}
    >
      <div ref={searchWrapRef} className="relative flex-1 max-w-[640px]">
        <form onSubmit={handleSearchSubmit}>
          <div
            className="relative h-[43px] rounded-full"
            style={{
              background: 'rgba(18, 18, 18, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Search
              size={13}
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60"
              style={{ color: '#4A4A4A' }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search assets, collections, or categories..."
              className="w-full h-full bg-transparent border-0 outline-none rounded-full pl-10 pr-4 text-[13px] leading-[17px] font-normal text-ui-secondary placeholder:text-[rgba(203,213,225,0.5)]"
              style={{ fontFamily: "'Space Grotesk', var(--font-sans)" }}
            />
          </div>
        </form>

        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="absolute top-full mt-2 w-full dropdown-panel rounded-[24px] overflow-hidden z-50"
              style={{
                background: 'rgba(18, 18, 18, 1)',
                backdropFilter: 'blur(20px) saturate(140%)',
                WebkitBackdropFilter: 'blur(20px) saturate(140%)',
              }}
            >
              <div className="p-3">
                <div className="flex items-center mb-2 px-2">
                  <span className="text-section-header text-ui-muted">Trending Searches</span>
                </div>
                {TRENDING_SEARCHES.map((item) => {
                  return (
                    <button
                      key={item.query}
                      onClick={() => handleSuggestionClick(item.query)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] hover:bg-[rgba(255,255,255,0.05)] transition-colors text-left"
                      type="button"
                    >
                      <div className="flex items-center">
                        <span className="text-sm text-ui-primary">{item.query}</span>
                      </div>
                      <span className="text-xs text-ui-muted">{item.count} items</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-3">
                <div className="flex items-center mb-2 px-2">
                  <span className="text-section-header text-ui-muted">Recent Searches</span>
                </div>
                {RECENT_SEARCHES.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleSuggestionClick(item)}
                    className="w-full flex items-center px-4 py-3 rounded-[12px] hover:bg-[rgba(255,255,255,0.05)] transition-colors text-left"
                    type="button"
                  >
                    <span className="text-sm text-ui-secondary">{item}</span>
                  </button>
                ))}
              </div>

              <div className="p-3">
                <div className="flex items-center gap-2 mb-2 px-2">
                  <span className="text-section-header text-ui-muted">Popular Categories</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_CATEGORIES.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => handleSuggestionClick(cat.name)}
                      className="px-3 py-1.5 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] rounded-full text-xs text-ui-secondary hover:text-ui-primary transition-all border-0"
                      type="button"
                    >
                      {cat.name} ({cat.count})
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {!isGuest && <NotificationCenter />}
        <WalletConnectButton onNavigate={setActivePage} />
      </div>
    </nav>
  );
}
