import { Search } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationCenter } from '@/app/components/notifications/notification-center';
import { WalletConnectButton } from '@/app/components/wallet-connect-button';
import { OrinaMark } from '@/app/components/brand/OrinaMark';
import { OrinaWordmark } from '@/app/components/brand/OrinaWordmark';
import {
  hydrateMarketplaceCatalogFromSupabase,
  loadMarketplaceCatalogSync,
  MARKETPLACE_CATALOG_SYNC_EVENT,
} from '@/utils/marketplaceCatalog';
import { COLLECTIONS_SYNC_EVENT, loadRuntimeCollections } from '@/utils/collectionsUtils';
import { loadSearchHistory } from '@/utils/searchUtils';
import {
  getCategoryDisplayLabel,
  getTaxonomyCategoryOptions,
  normalizeTaxonomySelection,
} from '@/utils/taxonomy';

interface NavbarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  onSearch?: (query: string) => void;
  isGuest?: boolean;
  onToggleAI?: () => void;
  aiActive?: boolean;
}

const PRIMARY_NAV_LINKS = [
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'community', label: 'Community' },
];

function formatCompactCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(value);
}

function buildCategoryCounts(values: string[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    const label = getCategoryDisplayLabel(value);
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function formatHistoryQuery(query: string): string {
  const trimmed = String(query || '').trim();
  if (!trimmed) return trimmed;

  const normalized = normalizeTaxonomySelection(trimmed);
  return normalized.matchedBy === 'raw_fallback' ? trimmed : normalized.categoryLabel;
}

export function Navbar({ activePage, setActivePage, onSearch, isGuest = false, onToggleAI, aiActive }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [marketplaceCategories, setMarketplaceCategories] = useState<string[]>(() =>
    loadMarketplaceCatalogSync().map((asset) => asset.category)
  );
  const [collectionCategories, setCollectionCategories] = useState<string[]>(() =>
    loadRuntimeCollections().map((collection) => collection.category)
  );
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const popularCategoryEntries = useMemo(() => {
    const liveCounts = buildCategoryCounts([...marketplaceCategories, ...collectionCategories]);
    if (liveCounts.length > 0) return liveCounts.slice(0, 4);

    return getTaxonomyCategoryOptions()
      .slice(0, 4)
      .map((option) => ({ label: option.label, count: 0 }));
  }, [collectionCategories, marketplaceCategories]);

  const trendingSearches = useMemo(
    () =>
      popularCategoryEntries.map((entry) => ({
        query: entry.label,
        count: formatCompactCount(entry.count),
      })),
    [popularCategoryEntries]
  );

  const visibleRecentSearches = useMemo(() => recentSearches.slice(0, 3), [recentSearches]);

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

  useEffect(() => {
    const syncCatalog = () => {
      setMarketplaceCategories(loadMarketplaceCatalogSync().map((asset) => asset.category));
    };

    const syncCollections = () => {
      setCollectionCategories(loadRuntimeCollections().map((collection) => collection.category));
    };

    syncCatalog();
    syncCollections();
    void hydrateMarketplaceCatalogFromSupabase().then(syncCatalog);
    window.addEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, syncCatalog as EventListener);
    window.addEventListener(COLLECTIONS_SYNC_EVENT, syncCollections as EventListener);
    return () => {
      window.removeEventListener(MARKETPLACE_CATALOG_SYNC_EVENT, syncCatalog as EventListener);
      window.removeEventListener(COLLECTIONS_SYNC_EVENT, syncCollections as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;

    const nextRecent = loadSearchHistory()
      .map((item) => formatHistoryQuery(item.query))
      .filter(Boolean)
      .slice(0, 3);

    setRecentSearches(nextRecent);
  }, [isSearchOpen]);

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
      <div className="flex items-center gap-4 shrink-0">
        {isGuest && (
          <button
            type="button"
            onClick={() => setActivePage('home')}
            className="flex items-center gap-2 rounded-full px-1.5 py-1 text-white transition-opacity hover:opacity-85"
            aria-label="Go to home"
          >
            <div className="h-9 w-9 flex-shrink-0">
              <OrinaMark />
            </div>
            <OrinaWordmark className="hidden h-[18px] w-auto lg:block" />
          </button>
        )}

        <div className="flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] p-1">
          {PRIMARY_NAV_LINKS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
                className={`rounded-full px-3 py-2 text-[13px] font-medium leading-none transition-all ${
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-[rgba(148,163,184,0.9)] hover:bg-white/[0.04] hover:text-white'
                }`}
                style={{ fontFamily: "'Space Grotesk', var(--font-sans)" }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={searchWrapRef} className="relative min-w-0 flex-1 max-w-[640px] md:ml-[80px]">
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
              className="w-full h-full bg-transparent border-0 outline-none rounded-full pl-10 pr-4 text-[13px] leading-[17px] font-normal text-[rgba(241,245,249,0.92)] placeholder:text-[rgba(148,163,184,0.72)]"
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
                  <span className="text-section-header text-[rgba(148,163,184,0.9)]">Trending Searches</span>
                </div>
                {trendingSearches.map((item) => {
                  return (
                    <button
                      key={item.query}
                      onClick={() => handleSuggestionClick(item.query)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] hover:bg-[rgba(255,255,255,0.05)] transition-colors text-left group"
                      type="button"
                    >
                      <div className="flex items-center">
                        <span className="text-sm text-[rgba(226,232,240,0.95)] group-hover:text-white transition-colors">{item.query}</span>
                      </div>
                      <span className="text-xs text-[rgba(148,163,184,0.9)] group-hover:text-[rgba(226,232,240,0.95)] transition-colors">{item.count} items</span>
                    </button>
                  );
                })}
              </div>

              {visibleRecentSearches.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center mb-2 px-2">
                    <span className="text-section-header text-[rgba(148,163,184,0.9)]">Recent Searches</span>
                  </div>
                  {visibleRecentSearches.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleSuggestionClick(item)}
                      className="w-full flex items-center px-4 py-3 rounded-[12px] hover:bg-[rgba(255,255,255,0.05)] transition-colors text-left text-[rgba(203,213,225,0.92)] hover:text-white"
                      type="button"
                    >
                      <span className="text-sm">{item}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="p-3">
                <div className="flex items-center gap-2 mb-2 px-2">
                  <span className="text-section-header text-[rgba(148,163,184,0.9)]">Popular Categories</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularCategoryEntries.map((cat) => (
                    <button
                      key={cat.label}
                      onClick={() => handleSuggestionClick(cat.label)}
                      className="px-3 py-1.5 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] rounded-full text-xs text-[rgba(203,213,225,0.9)] hover:text-white transition-all border-0"
                      type="button"
                    >
                      {cat.label} ({cat.count})
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {onToggleAI && (
          <button
            type="button"
            onClick={onToggleAI}
            className={`group relative w-[43px] h-[43px] flex items-center justify-center rounded-[50px] transition-colors bg-transparent`}
            title="ORINA AI"
          >
            <img src="/flower-static.svg" alt="AI" className={`w-[20px] h-[20px] transition-opacity ${aiActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />
          </button>
        )}
        {!isGuest && <NotificationCenter />}
        <WalletConnectButton onNavigate={setActivePage} />
      </div>
    </nav>
  );
}
