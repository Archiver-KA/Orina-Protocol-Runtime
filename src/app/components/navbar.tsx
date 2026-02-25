import { Search, Bell, ChevronDown, TrendingUp, UserCircle, Settings, LogOut, X, Clock, TrendingUp as TrendingUpIcon, Home, Palette, Car, Image } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { WalletConnectButton } from '@/app/components/wallet-connect-button';
import { NotificationCenter } from '@/app/components/notifications/notification-center';
import { motion, AnimatePresence } from 'motion/react';
import LogoFrame from '@/imports/Frame2147226440';

interface NavbarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  onSearch?: (query: string) => void;
  isGuest?: boolean;
}

// Mock suggestions data
const TRENDING_SEARCHES = [
  { query: 'Luxury Real Estate', icon: Home, count: '1.2k' },
  { query: 'CyberSeries NFT', icon: Palette, count: '890' },
  { query: 'Vintage Cars', icon: Car, count: '654' },
  { query: 'Art Collection', icon: Image, count: '421' },
];

const RECENT_SEARCHES = [
  'Ethereum Land',
  'Digital Art',
  'Virtual Worlds',
];

const POPULAR_CATEGORIES = [
  { name: 'Real Estate', count: 142 },
  { name: 'Collectibles', count: 89 },
  { name: 'Art', count: 67 },
  { name: 'Music', count: 34 },
];

export function Navbar({ activePage, setActivePage, onSearch, isGuest = false }: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleNavigation = (page: string) => {
    setActivePage(page);
    setIsDropdownOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search page with query
      onSearch?.(searchQuery);
      setActivePage('search');
      searchInputRef.current?.blur();
      setIsSearchFocused(false);
    }
  };

  const handleSuggestionClick = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
    setActivePage('search');
    setIsSearchFocused(false);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  // Focus search with Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter trending searches based on query
  const filteredSuggestions = searchQuery.trim()
    ? TRENDING_SEARCHES.filter(s => 
        s.query.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : TRENDING_SEARCHES;

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'marketplace', label: 'Marketplace' },
    { id: 'community', label: 'Community' },
  ].filter(item => !isGuest || item.id !== 'overview');

  return (
    <nav className="h-[85.33px] flex-shrink-0 border-b border-[#27272a] flex items-center justify-between px-6 bg-[#121212]/95 backdrop-blur-md z-50">
      <div className="flex items-center space-x-10">
        <div className="w-10 h-10">
          <LogoFrame />
        </div>
        <div className="hidden md:flex gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`
                flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all relative
                ${activePage === item.id
                  ? 'text-[#2CC295]'
                  : 'text-zinc-400 hover:text-zinc-300'
                }
              `}
              onClick={() => handleNavigation(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Center - Search Bar with Dropdown */}
      <div className="flex-1 max-w-xl mx-12 relative" ref={dropdownRef}>
        <form onSubmit={handleSearchSubmit}>
          <div
            className={`
              relative group transition-all rounded-xl border bg-zinc-900/50
              ${isSearchFocused
                ? 'border-[#2CC295]/50 shadow-[0_0_20px_rgba(44,194,149,0.15)]'
                : 'border-[#27272a]'
              }
            `}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search assets, collections, or categories..."
              className="bg-transparent border-none focus:ring-0 rounded-xl pl-12 pr-20 py-3 text-sm w-full text-white placeholder-zinc-500 outline-none"
            />
            
            {/* Clear Button */}
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-14 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-800 rounded transition-colors"
                >
                  <X size={14} className="text-zinc-500" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Keyboard Shortcut */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded text-[10px] font-bold">
              ⌘K
            </div>
          </div>
        </form>

        {/* Dropdown Suggestions */}
        <AnimatePresence>
          {isSearchFocused && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-2 w-full bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden z-50"
            >
              {/* Trending Searches */}
              <div className="space-y-2">
                <div className="p-3 border-b border-[#27272a]">
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <TrendingUpIcon size={14} className="text-[#2CC295]" />
                    <span className="text-section-header text-zinc-500">
                      Trending Searches
                    </span>
                  </div>
                  {TRENDING_SEARCHES.map((item, index) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(item.query)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent size={16} className="text-[#2CC295]" />
                          <span className="text-sm text-white group-hover:text-[#2CC295] transition-colors">
                            {item.query}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500">{item.count} items</span>
                      </button>
                    );
                  })}
                </div>

                {/* Recent Searches */}
                <div className="p-3 border-b border-[#27272a]">
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <Clock size={14} className="text-zinc-500" />
                    <span className="text-section-header text-zinc-500">
                      Recent Searches
                    </span>
                  </div>
                  {RECENT_SEARCHES.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(item)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors group"
                    >
                      <Search size={14} className="text-zinc-600" />
                      <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">
                        {item}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Popular Categories */}
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <span className="text-section-header text-zinc-500">
                      Popular Categories
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_CATEGORIES.map((cat, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(cat.name)}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-[#2CC295]/10 border border-[#27272a] hover:border-[#2CC295]/20 rounded-lg text-xs text-zinc-400 hover:text-[#2CC295] transition-all"
                      >
                        {cat.name} ({cat.count})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Side */}
      <div className="flex items-center space-x-5">
        {!isGuest && (
          <>
            <NotificationCenter />
            <div className="h-8 w-px bg-[#27272a]"></div>
          </>
        )}
        <WalletConnectButton onNavigate={setActivePage} />
      </div>
    </nav>
  );
}